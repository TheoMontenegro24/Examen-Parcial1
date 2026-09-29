from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    S3_VIDEOS_BUCKET: str
    S3_THUMBS_BUCKET: str
    AWS_REGION: str = "us-east-2"
    CORS_ORIGINS: str = "http://localhost:5173"
    class Config:
        env_file = ".env"

settings = Settings()