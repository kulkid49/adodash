# Azure DevOps Productivity Dashboard

Enterprise-grade, real-time dashboard that aggregates Azure DevOps productivity signals across all projects in an Azure DevOps organization.

## Features

- Organization-wide project discovery (all projects)
- Daily productivity metrics per employee (cross-project aggregation)
  - Tasks created/updated/closed today
  - Original Estimate / Completed Work / Remaining Work
  - Efficiency % = (Estimated / Actual) × 100
  - Daily utilization (< 8 underutilized, = 8 optimal, > 8 overutilized)
- Highlights employees below 8 hours (row-level color coding)
- 5-minute polling refresh
- Microsoft OAuth login (Azure AD) for application access
- PAT support for Azure DevOps data access (admin-configured)
- RBAC (Admin / Project Manager / Team Lead / Employee)
  - Project Manager can be restricted to assigned projects
  - Employee sees only their own rows
- Exports: Excel + PDF

## Tech Stack

- Frontend: React + TypeScript, Vite, Tailwind CSS, Material UI, Recharts
- Backend: Node.js + Express (TypeScript), Azure DevOps REST APIs
- Database: PostgreSQL + Prisma ORM
- Deploy: Docker + docker-compose, Kubernetes manifests

## Setup (Local Dev)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Azure AD App Registration (for OAuth login)
- Azure DevOps PAT (recommended for organization-wide aggregation)

### 1) Configure environment variables

Copy and fill:

```bash
copy .env.example .env
```

Required:

- `DATABASE_URL`
- `ENCRYPTION_KEY_BASE64` (32-byte key, Base64 encoded)
- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_ID`
- `VITE_AZURE_AD_TENANT_ID`
- `VITE_AZURE_AD_CLIENT_ID`

### 2) Install dependencies

```bash
cd apps/api
npm install

cd ../web
npm install
```

### 3) Generate Prisma client

```bash
cd apps/api
npm run prisma:generate
```

### 3b) Apply migrations

```bash
cd apps/api
npm run prisma:migrate
```

### 4) Run the apps

Backend:

```bash
cd apps/api
set PORT=4000
npm run dev
```

Frontend:

```bash
cd apps/web
npm run dev
```

Open:

- Web: http://localhost:5173
- API health: http://localhost:4000/api/health

## Azure AD App Registration

Create an Azure AD App Registration for the dashboard UI:

- Platform: Single-page application (SPA)
- Redirect URI (dev): `http://localhost:5173`
- Expose your app: ensure the ID token includes standard claims (email / preferred_username / name)

Backend validates ID tokens using:

- Issuer: `https://login.microsoftonline.com/{TENANT_ID}/v2.0`
- Audience: `{CLIENT_ID}`

## Azure DevOps Connection

The first user who signs in is automatically promoted to **Admin** (bootstrap) so you can configure the org connection and assign roles.

After logging in as an Admin:

1. Open **Settings**
2. Configure:
   - Organization Name: `myorg` (the `{org}` in `https://dev.azure.com/{org}`)
   - Organization URL: `https://dev.azure.com/myorg`
   - PAT: recommended for org-wide data access
3. Click **Save & Sync Now**

For production, run sync on a schedule using a platform scheduler (for example, Vercel Cron) and keep the Admin “Sync Now” button for manual runs.

## API Endpoints

All endpoints are prefixed with `/api` and require a Microsoft bearer token (ID token).

- `GET /api/projects`
- `GET /api/employees`
- `GET /api/productivity/daily`
- `GET /api/productivity/employee/:id`
- `GET /api/productivity/project/:id`
- `GET /api/tasks/today`
- `GET /api/dashboard/summary`
- `POST /api/sync/azure-devops` (Admin)

Admin RBAC:

- `GET /api/admin/users`
- `POST /api/admin/users/:id/role`
- `POST /api/admin/users/:id/projects`

## Productivity Logic Notes

- Daily “Actual Hours Logged” is computed using `CompletedWork - baselineCompletedWork`, where `baselineCompletedWork` is captured once per day per work item.
- If the system is offline at midnight, the first sync sets the baseline at first run of the day; this may undercount earlier same-day changes.
- Closed-today is approximated as items that are in a closed state and were changed today.

## Docker

```bash
docker compose up --build
```

## Kubernetes

Sample manifests are in `k8s/`:

- `k8s/config.yaml`
- `k8s/api.yaml`
- `k8s/web.yaml`

Provide your own images and secrets before deploying.
