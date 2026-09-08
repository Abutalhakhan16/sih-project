# Co-opServe

Co-opServe is a cooperative service marketplace with a preserved Next.js UI and a FastAPI/PostgreSQL backend. The API exposes Swagger documentation at `http://localhost:8000/docs`.

## Run locally

1. Copy `.env.example` to `.env` and set a unique `JWT_SECRET_KEY`.
2. Start PostgreSQL/PostGIS, Redis, and the API: `docker compose up --build`.
3. In a second terminal, run `npm install && npm run dev`.

The frontend reads `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8000/api`.

Demo records are visibly marked `[DEMO]`. In development, the API seeds 36 workers, 19 customers, services, bookings, certifications, notifications, and cooperative data on first startup.

| Account | Email | Password |
| --- | --- | --- |
| Customer demo | customer@coopserve.demo | `demo123` |
| Worker demo | worker1@coopserve.demo | `demo123` |
| Admin demo | admin@coopserve.demo | `admin123` |

To reset a local development database: `python -m backend.scripts.reset_demo`. This command drops all data in the configured database, so do not run it against production.

## Architecture

- `backend/app/main.py`: documented FastAPI REST endpoints and RBAC
- `backend/app/services/booking_service.py`: controlled booking state transitions, notifications, invoices
- `backend/app/matching/engine.py`: explainable worker matching with geo distance, skills, verification, availability, workload, and rating
- `backend/migrations`: Alembic initial schema migration; PostgreSQL enables PostGIS
- `lib/api/client.ts`: the frontend’s single API boundary

Production deployments must use managed secrets and run `alembic upgrade head` before serving traffic.
