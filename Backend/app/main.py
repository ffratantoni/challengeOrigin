from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infrastructure.database import engine, Base
from app.api.routes import auth as auth_router, users as users_router
import os

app = FastAPI(title='Challenge Acciones - Backend')

# CORS configuration
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
origins = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event('startup')
def on_startup():
    # create tables if they don't exist
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router.router)
app.include_router(users_router.router)


@app.get('/')
def root():
    return {"message": "Challenge Acciones API"}
