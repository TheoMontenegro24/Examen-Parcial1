import uuid
import boto3
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from config import settings
from database import Base, engine, get_db
from auth import hash_password, verify_password, create_token, current_user
import models

Base.metadata.create_all(engine)
app = FastAPI(title="Video Platform API")
app.add_middleware(CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_methods=["*"], allow_headers=["*"])

s3 = boto3.client("s3", region_name=settings.AWS_REGION)

def s3_url(bucket, key):
    return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

def upload(file: UploadFile, bucket: str, allowed: dict, max_mb: int):
    if file.content_type not in allowed:
        raise HTTPException(400, f"Formato no permitido: {file.content_type}")
    file.file.seek(0, 2); size = file.file.tell(); file.file.seek(0)
    if size > max_mb * 1024 * 1024:
        raise HTTPException(400, f"Máximo {max_mb} MB")
    key = f"{uuid.uuid4()}.{allowed[file.content_type]}"
    s3.upload_fileobj(file.file, bucket, key,
                      ExtraArgs={"ContentType": file.content_type})
    return key

def delete_key(bucket, url):
    s3.delete_object(Bucket=bucket, Key=url.rsplit("/", 1)[-1])

VIDEO_TYPES = {"video/mp4": "mp4"}
IMG_TYPES = {"image/jpeg": "jpg", "image/png": "png"}

def video_out(v: models.Video):
    return {"id": v.id, "title": v.title, "description": v.description,
            "video_url": v.video_url, "thumbnail_url": v.thumbnail_url,
            "views": v.views, "created_at": v.created_at,
            "user": {"id": v.user.id, "name": v.user.name}}

class UserIn(BaseModel):
    name: str; email: EmailStr; password: str

class LoginIn(BaseModel):
    email: EmailStr; password: str

@app.post("/users", status_code=201)
def register(data: UserIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(400, "El correo ya está registrado")
    u = models.User(name=data.name, email=data.email,
                    password_hash=hash_password(data.password))
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id, "name": u.name, "email": u.email}

@app.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter_by(email=data.email).first()
    if not u or not verify_password(data.password, u.password_hash):
        raise HTTPException(401, "Credenciales incorrectas")
    return {"access_token": create_token(u.id),
            "user": {"id": u.id, "name": u.name, "email": u.email}}

@app.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, id)
    if not u: raise HTTPException(404, "No encontrado")
    return {"id": u.id, "name": u.name, "email": u.email,
            "video_count": len(u.videos),
            "videos": [video_out(v) for v in u.videos]}

# ---------- Videos ----------
@app.post("/videos", status_code=201)
def create_video(title: str = Form(...), description: str = Form(""),
                 video: UploadFile = File(...), thumbnail: UploadFile = File(...),
                 db: Session = Depends(get_db), user=Depends(current_user)):
    vk = upload(video, settings.S3_VIDEOS_BUCKET, VIDEO_TYPES, 100)
    tk = upload(thumbnail, settings.S3_THUMBS_BUCKET, IMG_TYPES, 5)
    v = models.Video(title=title, description=description, user_id=user.id,
                     video_url=s3_url(settings.S3_VIDEOS_BUCKET, vk),
                     thumbnail_url=s3_url(settings.S3_THUMBS_BUCKET, tk))
    db.add(v); db.commit(); db.refresh(v)
    return video_out(v)

@app.get("/videos")
def list_videos(exclude: int | None = None, limit: int = 50,
                user_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Video)
    if exclude: q = q.filter(models.Video.id != exclude)
    if user_id: q = q.filter(models.Video.user_id == user_id)
    return [video_out(v) for v in
            q.order_by(models.Video.created_at.desc()).limit(limit)]

@app.get("/videos/{id}")
def get_video(id: int, db: Session = Depends(get_db)):
    v = db.get(models.Video, id)
    if not v: raise HTTPException(404, "No encontrado")
    v.views += 1; db.commit(); db.refresh(v)
    return video_out(v)

class VideoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

@app.put("/videos/{id}")
def update_video(id: int, data: VideoUpdate, db: Session = Depends(get_db),
                 user=Depends(current_user)):
    v = db.get(models.Video, id)
    if not v: raise HTTPException(404, "No encontrado")
    if v.user_id != user.id: raise HTTPException(403, "No es tu video")
    if data.title is not None: v.title = data.title
    if data.description is not None: v.description = data.description
    db.commit(); db.refresh(v)
    return video_out(v)

@app.delete("/videos/{id}", status_code=204)
def delete_video(id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    v = db.get(models.Video, id)
    if not v: raise HTTPException(404, "No encontrado")
    if v.user_id != user.id: raise HTTPException(403, "No es tu video")
    delete_key(settings.S3_VIDEOS_BUCKET, v.video_url)
    delete_key(settings.S3_THUMBS_BUCKET, v.thumbnail_url)
    db.delete(v); db.commit()

class CommentIn(BaseModel):
    content: str

@app.post("/videos/{id}/comments", status_code=201)
def add_comment(id: int, data: CommentIn, db: Session = Depends(get_db),
                user=Depends(current_user)):
    if not db.get(models.Video, id): raise HTTPException(404, "Video no existe")
    c = models.Comment(content=data.content, user_id=user.id, video_id=id)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "content": c.content, "created_at": c.created_at,
            "user": {"id": user.id, "name": user.name}}

@app.get("/videos/{id}/comments")
def get_comments(id: int, db: Session = Depends(get_db)):
    cs = (db.query(models.Comment).filter_by(video_id=id)
          .order_by(models.Comment.created_at.desc()).all())
    return [{"id": c.id, "content": c.content, "created_at": c.created_at,
             "user": {"id": c.user.id, "name": c.user.name}} for c in cs]