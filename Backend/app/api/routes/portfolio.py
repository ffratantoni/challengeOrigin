from fastapi import APIRouter, Depends, HTTPException, Body
from app.core import schemas as core_schemas
from sqlalchemy.orm import Session
from app.infrastructure import repository
from app.api.deps import get_current_user
from app.core import schemas as core_schemas
from app.infrastructure.repository import get_user_by_username_sync
from fastapi import Body
from app.infrastructure import models

router = APIRouter(prefix="/me/portfolio", tags=["portfolio"])


@router.get('/', summary='List portfolio for current user')
def list_portfolio(db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    user = current_user
    holdings = repository.get_user_portfolio(db, user.id)
    return [{'symbol': h.symbol, 'quantity': h.quantity} for h in holdings]


@router.post('/trade', summary='Execute a trade (buy/sell)')
def trade(payload: core_schemas.TradeRequest = Body(...), db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    user = current_user
    symbol = payload.symbol
    quantity = int(payload.quantity)
    buy = bool(payload.buy)
    delta = quantity if buy else -quantity
    try:
        holding = repository.add_or_update_holding(db, user.id, symbol, delta)
        repository.remove_holding_if_zero(db, user.id, symbol)
        return {'symbol': holding.symbol, 'quantity': holding.quantity}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post('/transfer', summary='Transferir efectivo entre usuarios')
def transfer(payload: core_schemas.TransferRequest = Body(...), db: Session = Depends(repository.get_db_sync), current_user=Depends(get_current_user)):
    # simple transfer: from current_user to payload.to_username amount
    amount = float(payload.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail='amount must be > 0')
    to_user = get_user_by_username_sync(
        next(repository.get_db_sync()), payload.to_username)
    if not to_user:
        raise HTTPException(status_code=404, detail='destino no encontrado')
    # For this prototype, support optional symbol (transfer linked to a symbol)
    symbol = payload.symbol
    if symbol:
        qty = int(amount)
        if qty <= 0:
            raise HTTPException(
                status_code=400, detail='cantidad invalida para transferencia de acciones')
        try:
            # fetch sender holding
            sender = db.query(models.Portfolio).filter(models.Portfolio.user_id ==
                                                       current_user.id, models.Portfolio.symbol == symbol).with_for_update().first()
            sender_qty = int(getattr(sender, 'quantity') or 0) if sender else 0
            if sender_qty < qty:
                raise HTTPException(
                    status_code=400, detail=f'Insufficient shares to transfer (have {sender_qty})')
            # deduct from sender
            new_sender_qty = sender_qty - qty
            if sender:
                if new_sender_qty <= 0:
                    db.delete(sender)
                else:
                    setattr(sender, 'quantity', new_sender_qty)
            # add to recipient
            recipient = db.query(models.Portfolio).filter(
                models.Portfolio.user_id == to_user.id, models.Portfolio.symbol == symbol).with_for_update().first()
            if recipient:
                new_rec_qty = int(getattr(recipient, 'quantity') or 0) + qty
                setattr(recipient, 'quantity', new_rec_qty)
            else:
                recipient = models.Portfolio(
                    user_id=to_user.id, symbol=symbol, quantity=qty)
                db.add(recipient)
            db.commit()
            return {'_from': current_user.username, 'to': payload.to_username, 'amount': amount, 'symbol': symbol}
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500, detail='Error processing symbol transfer')

    # cash transfer (no symbol): prototype, no balance handling
    return {'_from': current_user.username, 'to': payload.to_username, 'amount': amount}
