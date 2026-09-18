from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core import schemas
from app.infrastructure import repository
from app.services.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post('/register', response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(repository.get_db_sync)):
    existing = repository.get_user_by_username_sync(db, user_in.username)
    if existing:
        raise HTTPException(
            status_code=400, detail="Username already registered")
    user = repository.create_user_sync(db, user_in)
    return user


@router.post('/login', response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(repository.get_db_sync)):
    user = repository.authenticate_user_sync(
        db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password")
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
