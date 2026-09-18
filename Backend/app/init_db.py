from .infrastructure.database import engine, Base, SessionLocal
from .infrastructure import models
from .infrastructure import repository
from .core import schemas


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(
            models.User.username == 'demo').first()
        if not existing:
            user_in = schemas.UserCreate(username='demo', password='demo')
            repository.create_user_sync(db, user_in, is_superuser=True)
            print('Created demo user: demo / demo')
        else:
            print('Demo user already exists')
    finally:
        db.close()


if __name__ == '__main__':
    init_db()
