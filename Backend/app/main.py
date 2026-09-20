from fastapi import Request
import os
from app.api.routes import auth as auth_router, users as users_router, stocks as stocks_router, favorites as favorites_router
from app.infrastructure.database import engine, Base
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# configure root logging so route logs are visible in console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)

# Configure basic logging so route/repo logger.info/debug appear on console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)

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


# HTTP middleware to log incoming requests and responses


@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_logger = logging.getLogger('app.request')
    client = request.client.host if request.client else None
    # also print to stdout to ensure visibility even if logging is configured elsewhere
    print(f"[REQUEST] {request.method} {request.url.path} from {client}")
    req_logger.info('Incoming request %s %s from %s',
                    request.method, request.url.path, client)
    try:
        response = await call_next(request)
    except Exception as e:
        print(
            f"[REQUEST ERROR] {request.method} {request.url.path} error: {e}")
        req_logger.exception('Error handling request %s %s: %s',
                             request.method, request.url.path, e)
        raise
    print(
        f"[RESPONSE] {request.method} {request.url.path} status={response.status_code}")
    req_logger.info('Completed request %s %s status=%s',
                    request.method, request.url.path, response.status_code)
    return response


@app.on_event('startup')
def on_startup():
    # create tables if they don't exist
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(stocks_router.router)
app.include_router(favorites_router.router)


@app.get('/')
def root():
    return {"message": "Challenge Acciones API"}
