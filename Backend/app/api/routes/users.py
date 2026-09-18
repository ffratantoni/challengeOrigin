from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core import schemas
from app.infrastructure import repository
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get('/me', response_model=schemas.UserOut)
def read_my_profile(db: Session = Depends(repository.get_db_sync), current=Depends(get_current_user)):
    user = repository.get_user_by_username_sync(db, current.username)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


@router.get('/', response_model=List[schemas.UserOut])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(repository.get_db_sync), current=Depends(get_current_user)):
    return repository.get_users(db, skip=skip, limit=limit)


@router.get('/{user_id}', response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(repository.get_db_sync), current=Depends(get_current_user)):
    user = repository.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


@router.put('/{user_id}', response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserBase, db: Session = Depends(repository.get_db_sync), current=Depends(get_current_user)):
    user = repository.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return repository.update_user_sync(db, user, payload.dict())


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(repository.get_db_sync), current=Depends(get_current_user)):
    user = repository.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    repository.delete_user_sync(db, user)
    return None
