# challengeOrigin
Repositorio para el desarrollo de la aplicación requerida por el challenge técnico de la empresa Origin Solutions

Requisitos:
- Docker & Docker Compose (o `docker compose` integrado)
- Opcional: Node 18+ y npm para desarrollo frontend local

Pasos para ejecutar la aplicación (contenedorizada):

1) Construir y levantar los servicios (Postgres, backend, frontend):

```bash
docker compose build --no-cache
docker compose up -d
```

2) Verificar logs del backend y la API (Ejemplo):

```bash
docker compose logs backend --follow
```

3) (Opcional) Ejecutar migraciones Alembic desde el contenedor backend:

```bash
docker compose run --rm backend alembic revision --autogenerate -m "init"
docker compose run --rm backend alembic upgrade head
```

4) Acceder a la aplicación:
- Frontend: http://localhost:3000
- Backend (Docs): http://localhost:8000/docs

Credenciales demo:
- Usuario: `demo`
- Clave: `demo`

Desarrollo frontend sin Docker (opcional):

```bash
cd Frontend
npm install
npm run dev
```

Notas de seguridad:
- Cambia `SECRET_KEY` (variable de entorno) antes de desplegar en producción.
- Revisa `Backend/requirements.txt` y `docker-compose.yml` para ajustes de entorno.

