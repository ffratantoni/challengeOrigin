from sqlalchemy.orm import Session
from app.infrastructure import models
from app.core import schemas
from app.services.security import get_password_hash, verify_password
from typing import List, Optional


def get_db_sync():
    from app.infrastructure.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_by_username_sync(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user_sync(db: Session, user: schemas.UserCreate, is_superuser: bool = False) -> models.User:
    hashed = get_password_hash(user.password)
    db_user = models.User(username=user.username, email=user.email,
                          hashed_password=hashed, is_superuser=is_superuser)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user_sync(db: Session, username: str, password: str) -> Optional[models.User]:
    user = get_user_by_username_sync(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_sync(db: Session, db_user: models.User, data: dict) -> models.User:
    for key, value in data.items():
        if hasattr(db_user, key) and key != 'id':
            setattr(db_user, key, value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user_sync(db: Session, db_user: models.User) -> None:
    db.delete(db_user)
    db.commit()
