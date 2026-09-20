# challengeOrigin
Pequeña plataforma de demo para gestión de usuarios, favoritos y un portafolio de acciones.

Resumen
 - Backend en FastAPI con autenticación JWT, persistencia via SQLAlchemy.
 - Frontend en React (Vite) con componentes para login, favoritos, operaciones de trade/transfer y visualización de series temporales.

Objetivo del sistema
 - Proveer una API y UI para simular compras/ventas de acciones, guardar favoritos y transferir acciones entre usuarios.
 - Servir como base para pruebas técnicas (auth, persistencia, integraciones con API externas y charting).

Guía rápida de uso
 - Levanta la aplicación (docker): `docker compose up -d --build`
 - Accede al frontend en `http://localhost:3000` y al Swagger docs del backend en `http://localhost:8000/docs`.
 - Demo user creado automáticamente: `demo` / `demo` (si no existe ya).

Estructura del repo
 - `Backend/` - FastAPI app, modelos, repositorio, Alembic migrations.
 - `Frontend/` - React + Vite app.

Stack y versiones (aprox.)
 - Python 3.11+
 - FastAPI 0.100.0
 - SQLAlchemy 1.4.x
 - Alembic 1.11.x
 - Node 18+
 - React 18 + Vite

Ejecutar sin Docker (desarrollo local)
1) Backend
```bash
cd Backend
python -m venv .venv
source .venv/bin/activate     # Linux/Mac
.\.venv\Scripts\Activate    # Windows Powershell
pip install -r requirements.txt
python -m app.init_db          # crea tablas y usuario demo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2) Frontend
```bash
cd Frontend
npm install
npm run dev
```

Ejecutar con Docker (recomendado)
```bash
# desde la raíz del repo
docker compose -f docker-compose.yml up -d --build

# aplicar migraciones (si se requiere)
docker compose -f docker-compose.yml exec backend python -m alembic upgrade head

# ver logs
docker compose -f docker-compose.yml logs -f backend
```

Variables de entorno importantes
 - `DATABASE_URL` (p.ej. `postgresql://origin:originpass@db:5432/origindb`) — punto de conexión a la base de datos.
 - `SECRET_KEY` — cambia la clave antes de producción.
 - `FRONTEND_URL` — URL permitida por CORS (frontend en desarrollo).
 - Frontend build args: `VITE_API_URL` apunta al backend cuando se construye la imagen del frontend.
 - `STOCKS_API_KEY` — API key para el proveedor de datos de mercado (p.ej. Twelve Data). Cambia este valor por la clave de tu cuenta antes de ejecutar la aplicación; usada por el backend (`STOCKS_API_KEY`) y opcionalmente por el frontend si lo configuras.
 - `STOCKS_API_URL_BASE` — (opcional) base URL del API de datos si usas un proxy o entorno distinto. Por defecto apunta a la API pública configurada en el código.

Consideraciones
 - El `docker-compose.yml` raíz levanta un servicio `db` PostgreSQL y mapea el `Backend/` y `Frontend/` para desarrollo dentro de contenedores.
 - Si trabajas local sin Docker, usa SQLite por defecto (`Backend/backend.db`). Si usas Docker, la app está configurada para PostgreSQL por `DATABASE_URL`.

Diagrama ER
 - Archivo `er_diagram.mmd` en la raíz contiene el diagrama ER en formato Mermaid.



