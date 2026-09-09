# Co-opServe

Co-opServe is a transparent, worker-owned cooperative service marketplace featuring **role-based authentication (RBAC)**, database-backed one-click demo login, live worker matching, active booking tracking, and bilingual AI assistance.

FastAPI Swagger Documentation: `http://localhost:8000/docs`

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (v3.9+)
- PostgreSQL (optional, defaults to SQLite `sqlite+aiosqlite:///./coopserve.db` for instant local execution)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure the key variables are configured:
```ini
API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
DATABASE_URL=sqlite+aiosqlite:///./coopserve.db
DATABASE_URL_SYNC=sqlite:///./coopserve.db
JWT_SECRET=coopserve-secure-jwt-secret-key-2026-sih
DEMO_PASSWORD=demo123
```

### 3. Start Backend (FastAPI)
```bash
# Setup Python virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
uvicorn backend.app.main:app --reload --port 8000
```
On startup, the backend automatically creates tables and seeds the database with canonical demo accounts, services, bookings, invoices, and cooperatives.

To reset or reseed demo data:
```bash
python3 -m backend.scripts.reset_demo
```

### 4. Start Frontend (Next.js)
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Authentication & Role-Based Access Control (RBAC)

Co-opServe implements strict role-based access control with secure bcrypt password hashing and JWT authentication.

### Supported User Roles
1. **Customer**: Bookings, live tracking, payments, invoices, ratings, bilingual AI assistant.
2. **Gig Worker**: Job requests, availability status, active job progression, ratings, welfare & micro-credit.
3. **Cooperative Admin**: Worker verification queue, member governance, demand forecasting, real-time analytics.

### Authentication Endpoints
- `POST /api/auth/register`: Role-specific self-registration (workers initialized with `PENDING` verification).
- `POST /api/auth/login`: Dual-identifier login via **Email** or **Mobile Number** + Password.
- `POST /api/auth/demo-login`: Authentic 1-click SIH Demo Login returning real JWT tokens.
- `GET /api/auth/me`: Fetches authenticated user profile and attached customer/worker metadata.
- `GET /api/workers/me`: Retrieves authenticated worker profile, verification status, and ratings.
- `POST /api/auth/logout`: Clears session token and resets auth state.

---

## Demo Accounts & SIH Presentation Login

For presentation and evaluation, the login screen provides visible, authentic **1-Click Demo Login** buttons that perform real backend authentication and populate realistic sample data:

| Role | Demo Email | Mobile | Documented Demo Password | Preloaded Demo Data |
| --- | --- | --- | --- | --- |
| **Customer** | `demo.customer@coopserve.test` | `9000000001` | `demo123` | Active booking, service history, invoices, notifications |
| **Gig Worker** | `demo.worker@coopserve.test` | `9000000003` | `demo123` | Verified master plumber, ratings (4.9), certifications, earnings |
| **Cooperative Admin** | `demo.admin@coopserve.test` | `9000000002` | `demo123` | Worker verification queue, demand forecast, coop analytics |

*(Legacy test aliases `customer@coopserve.demo`, `worker1@coopserve.demo`, and `admin@coopserve.demo` are also preserved for backwards compatibility).*

---

## Running Automated Tests

Run the complete backend test suite:
```bash
PYTHONPATH=. backend/venv/bin/pytest backend/tests/
```

Run frontend typecheck and production build:
```bash
npx tsc --noEmit
npx next build --webpack
```

