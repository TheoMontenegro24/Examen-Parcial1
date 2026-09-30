from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from config import settings
from database import get_db
import models

pwd = CryptContext(schemes=["bcrypt"])
bearer = HTTPBearer()

def hash_password(p): return pwd.hash(p)
def verify_password(p, h): return pwd.verify(p, h)

def create_token(user_id: int):
    exp = datetime.utcnow() + timedelta(hours=12)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.SECRET_KEY, "HS256")

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer),
                 db: Session = Depends(get_db)):
    try:
        uid = int(jwt.decode(cred.credentials, settings.SECRET_KEY, ["HS256"])["sub"])
    except (JWTError, ValueError):
        raise HTTPException(401, "Token inválido")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    return user
