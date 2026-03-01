# School Routine (Timetable) Generator Dashboard

A full-stack Next.js admin dashboard to configure teachers, classes, subjects, schedule rules, and generate weekly routines (Sunday–Friday) for Grade 1–10 with multiple sections. No authentication — direct access to the dashboard.

## Tech Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** for UI
- **Prisma ORM** with **PostgreSQL** (cloud: Neon, Vercel Postgres, or Supabase — no Docker required)
- **Zod** for server-side validation
- **SheetJS (xlsx)** for Excel export
- **pdf-lib** for PDF export

## Prerequisites

- **Node.js 18+**
- A **cloud PostgreSQL** database (free tier on Neon, Vercel Postgres, or Supabase — no Docker or local DB needed)

## Setup (no Docker)

### 1. Create a cloud database

Pick one and create a free Postgres database:

| Provider | Steps |
|----------|--------|
| **[Neon](https://neon.tech)** | Sign up → New Project → copy the connection string from the dashboard |
| **Vercel Postgres** | [Vercel](https://vercel.com) → your project → Storage → Create Database → Postgres (uses Neon) → copy `POSTGRES_URL` or `DATABASE_URL` |
| **[Supabase](https://supabase.com)** | New project → Settings → Database → Connection string → URI |

The URL will look like:
`postgresql://user:password@host/database?sslmode=require`

### 2. Clone and install

```bash
git clone <your-repo-url> routine-generator && cd routine-generator
npm install
```

### 3. Set environment variable

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your **cloud Postgres connection string** (paste the URL from step 1).

### 4. Apply schema and seed

```bash
npx prisma db push
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to **/dashboard**.

## Dashboard Pages

- **/dashboard** — Overview: stats, “Generate New Routine”, “View Published Routine”, “Manage Data”
- **/dashboard/school-settings** — School name, academic year, first-period class teacher priority
- **/dashboard/schedule-config** — Periods per day, duration, breaks, assembly (LOWER = Grade 1–3, HIGHER = Grade 4–10)
- **/dashboard/grades-classes** — Grades 1–10, sections per grade, classes (Grade + Section)
- **/dashboard/subjects** — Subjects with type (THEORY/PRACTICAL/ECA), optional resource
- **/dashboard/resources** — Science Lab, Computer Lab, Library, ECA Room (capacity 1)
- **/dashboard/teachers** — Full-time/part-time, max workload per week/day
- **/dashboard/availability** — Per-teacher grid (Sun–Fri × periods): AVAILABLE / BLOCKED / LEAVE
- **/dashboard/assignments** — Class teacher per class, subject teachers per class+subject, grade mode (Grade System vs Subject System)
- **/dashboard/requirements** — Subject requirements per grade or class: periods/week, double period, max/day
- **/dashboard/routine** — List routine versions (DRAFT/PUBLISHED/ARCHIVED), generate new, duplicate, archive
- **/dashboard/routine/[versionId]** — Timetable grid (class / teacher / resource view), edit slots, publish, archive, export Excel/PDF

## API Routes

All under `app/api/`:

- `GET/POST /api/school-settings`
- `GET/POST /api/schedule-config`
- `GET/POST /api/grades`, `DELETE /api/grades/[id]`
- `GET/POST /api/sections`, `DELETE /api/sections/[id]`
- `GET/POST /api/classes`, `DELETE /api/classes/[id]`
- `GET/POST /api/subjects`, `PATCH/DELETE /api/subjects/[id]`
- `GET/POST /api/resources`, `DELETE /api/resources/[id]`
- `GET/POST /api/teachers`, `PATCH/DELETE /api/teachers/[id]`
- `GET/POST/PUT /api/availability`
- `GET/POST /api/class-teacher`
- `GET/POST/DELETE /api/assignments`
- `GET/POST /api/grade-modes`
- `GET/POST /api/requirements`, `PATCH/DELETE /api/requirements/[id]`
- `GET /api/routine`, `POST /api/routine/generate`
- `GET /api/routine/[versionId]`, `POST /api/routine/[versionId]` (publish/archive/duplicate)
- `POST /api/routine/[versionId]/publish`, `POST /api/routine/[versionId]/archive`
- `PATCH /api/routine/slot/[slotId]`
- `GET /api/export/excel?versionId=...`, `GET /api/export/pdf?versionId=...`

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to DB (no migrations)
- `npm run db:migrate` — Run migrations
- `npm run db:seed` — Seed demo data

## No authentication

The app has no login or auth. The dashboard is open at `/dashboard`. Use only on trusted networks or behind your own auth (e.g. reverse proxy).

---

## Hosting / Deployment

### Deploy on Vercel (recommended)

Uses **cloud Postgres** only — no Docker or local database.

**1. Create cloud Postgres** (if you don’t have one)

- **[Neon](https://neon.tech)** — New Project → copy connection string.
- **Vercel Postgres** — Vercel project → Storage → Create Database → Postgres → copy `DATABASE_URL`.
- **[Supabase](https://supabase.com)** — New project → Settings → Database → connection string (URI).

**2. Deploy to Vercel**

- Push code to **GitHub** → [vercel.com](https://vercel.com) → **Add New Project** → import repo.
- **Settings → Environment Variables** → add `DATABASE_URL` = your cloud Postgres URL.
- Deploy (Vercel runs `npm run build`; Prisma generate runs in `postinstall`).

**3. Apply schema once**

On your machine (with the same `DATABASE_URL` in `.env`):

```bash
npx prisma db push
npm run db:seed   # optional
```

Then open **https://your-project.vercel.app** → `/dashboard`.

**Notes:** No auth by default — consider [Vercel Password Protection](https://vercel.com/docs/security/secure-your-deployments#password-protection). For large schools, generation may need Vercel **Pro** (longer timeouts).

---

### Other hosting

**Manual server (Node + cloud Postgres)**  
On a VPS with Node 20+: clone repo, set `DATABASE_URL` to your cloud Postgres, then `npm ci`, `npx prisma db push`, `npm run db:seed`, `npm run build`, `npm run start`. Use PM2 to keep it running.

**Optional: Docker (local Postgres)**  
If you prefer running Postgres in Docker instead of cloud, see `docker-compose.yml`. Run `docker-compose up -d db`, then set `DATABASE_URL=postgresql://postgres:password@localhost:5432/routine_generator` and continue with `prisma db push` and `db:seed`.

<details>
<summary>Docker Compose (app + Postgres on one server)</summary>

### Option 1: Docker Compose

Runs the Next.js app and MySQL in containers on one machine.

**1. On your server**, clone the repo and set environment variables:

```bash
git clone <your-repo-url> routine-generator && cd routine-generator
```

Create a `.env` file (or export variables):

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
APP_PORT=3000
POSTGRES_PORT=5432
```

**2. Build and start** (app + Postgres):

```bash
docker-compose --profile app up -d --build
```

**3. Apply database schema and seed** (first time only):

```bash
docker-compose exec app npx prisma db push
docker-compose exec app npm run db:seed
```

**4. Open** `http://YOUR_SERVER_IP:3000` → you’ll be redirected to `/dashboard`.

To **update** after code changes:

```bash
docker-compose --profile app up -d --build
```

To **stop**:

```bash
docker-compose --profile app down
```

</details>

---

### Option 2: Manual server (Node + cloud Postgres)

Use a VPS with Node.js; database stays in the cloud (Neon, Supabase, etc.).

**1. Server setup**

- Install **Node.js 20+**.
- Use the same **cloud Postgres** URL as in Setup (no DB to install on the server).

**2. Deploy the app**

```bash
cd /path/to/routine-generator
npm ci
cp .env.example .env
# Edit .env: set DATABASE_URL to your cloud Postgres URL
npx prisma generate
npx prisma db push
npm run db:seed   # optional
npm run build
npm run start
```

**3. Keep it running** (e.g. with PM2):

```bash
npm install -g pm2
pm2 start npm --name "routine-generator" -- start
pm2 save && pm2 startup
```

**4. Reverse proxy (optional but recommended)**  
Put **nginx** (or Caddy) in front and add HTTPS (e.g. Let’s Encrypt):

- Nginx: proxy `http://localhost:3000` to your domain.
- Caddy: `your-domain.com { reverse_proxy localhost:3000 }`

Then open `https://your-domain.com` → `/dashboard`.

---

### Summary

| Method              | Best for                    | Notes |
|---------------------|----------------------------|-------|
| **Vercel + cloud Postgres** | No Docker, global CDN | Create DB at Neon/Vercel/Supabase → set `DATABASE_URL` → deploy. Run `prisma db push` + `db:seed` once. |
| **Manual server**   | VPS + cloud Postgres | Set `DATABASE_URL`, then `npm run build && npm run start` (or PM2). |
| **Docker** (optional) | Local or self-hosted Postgres | `docker-compose --profile app up -d --build` if you want Postgres in Docker. |

Use a **strong database password** and, if the app is on the internet, put it behind **HTTPS** and consider **auth** (e.g. basic auth in nginx or a separate login layer).

## License

MIT
