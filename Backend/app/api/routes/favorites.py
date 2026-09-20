from fastapi import APIRouter, Depends, HTTPException, Request
import uuid
from typing import List
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.infrastructure import repository
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/favorites", tags=["favorites"])


@router.get('/', summary='List current user favorites')
def list_favs(db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    user = current_user

    favs = repository.list_user_favorites(db, user.id)

    # return simple list of symbols
    return [f.symbol for f in favs]


@router.post('/', summary='Add favorite for current user')
def add_fav(request: Request, symbol: dict, db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    user = current_user

    s = symbol.get('symbol') if isinstance(symbol, dict) else None

    req_id = str(uuid.uuid4())[:8]

    if not s:
        raise HTTPException(status_code=400, detail='symbol required')
    fav = repository.add_user_favorite(db, user.id, s)

    return {'symbol': fav.symbol}


@router.delete('/{symbol}', summary='Remove favorite for current user')
def delete_fav(symbol: str, db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    user = current_user

    repository.remove_user_favorite(db, user.id, symbol)

    return {'deleted': True}
