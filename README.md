# Publisher Operations Portal (POP)

Internal operations portal for the publishing company — unifies PUB5 (read-only),
Tally, and official WhatsApp Business API (via Message India) into one system.

This repository is being built in phases. **This delivery is Phase 1.**

## Phase Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project scaffold, PublisherOperations DB schema, JWT auth (login/refresh/forgot/reset), RBAC, security middleware, PM2/Docker/Nginx config | ✅ Done |
| 2 | Customers & Orders modules (search, profile, order history, books purchased, WhatsApp history placeholder), global search, order status/dispatch updates | ✅ This delivery |
| 2.5 | Swap placeholder Customers/Orders queries to real PUB5 read-only connection | ⏳ Waiting on PUB5 credentials/schema |
| 3a | WhatsApp module: send/receive text + attachments via Meta Cloud API, live chat UI, Socket.IO real-time updates, incoming webhook | ✅ This delivery |
| 3b | Message scheduler (BullMQ/Redis), chat assignment/transfer, internal notes, typing indicators | ⏳ Next |
| 4 | Dashboard stats, Reports, Notifications, Settings, Audit Log viewer | ⏳ Planned |
| 4 | Dashboard, Reports, Notifications, Audit Log viewer, Settings | ⏳ Planned |
| 5 | Hardening: automated tests, deployment guide, load testing | ⏳ Planned |

## Why phased delivery

This is an enterprise system with 12+ functional modules (real-time chat, external
API integrations, schedulers, reporting, RBAC, audit trails). Building it well —
with working code, not placeholders — means each phase has to be complete and
testable before the next one builds on top of it. Phase 1 gives you a real,
running authentication system and database, which every later module depends on.

## What's real vs. placeholder in Phase 1

- **Real and functional:** Express app, JWT auth (access + refresh tokens),
  bcrypt password hashing, forgot/reset password flow with emailed tokens,
  RBAC middleware, rate limiting, Helmet/CORS, Winston logging, SQL Server
  schema + seed data, a working React login/dashboard-shell that talks to
  the real API.
- **Real and functional (Phase 2):** Customer search/profile, order
  list/detail with line items, books-purchased aggregation, order
  status/dispatch updates (with audit logging), and global search across
  customers/orders/books/messages. All wired to real endpoints, real
  frontend pages, real permission checks.
- **Placeholder / to remap once PUB5 access exists:** The `Customers`,
  `Orders`, `Books`, and `OrderItems` tables hold a realistic placeholder
  dataset in the app's own database, not live PUB5 data. `database/sample_data.sql`
  seeds a few example customers/orders/books so you can test the UI today.
  When real PUB5 credentials and schema are available, only the queries in
  `backend/src/repositories/customer.repository.js` and
  `order.repository.js` need to change (swap `getPopPool` for `getPub5Pool`
  and match real column names) — nothing in services, controllers, routes,
  or the frontend needs to change, by design.

## Project Structure

```
pop/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── config/       # env, db pool, logger
│       ├── middleware/   # auth, rbac, error handling, rate limiting
│       ├── utils/        # ApiError, ApiResponse, token/password helpers
│       ├── repositories/ # raw parameterized SQL access (repository pattern)
│       ├── services/     # business logic
│       ├── controllers/  # HTTP layer
│       ├── routes/       # route definitions
│       ├── validators/   # request validation
│       ├── sockets/      # (Phase 3) Socket.IO handlers
│       └── workers/      # (Phase 3) BullMQ workers
├── frontend/         # React (JavaScript, Material UI)
│   └── src/
│       ├── api/          # axios client
│       ├── context/      # AuthContext
│       ├── pages/        # Login, ForgotPassword, ResetPassword, Dashboard shell
│       └── components/   # ProtectedRoute etc.
├── database/         # SQL Server schema + seed scripts
├── nginx/            # reverse proxy config
├── docs/             # architecture notes, ER diagram description
├── ecosystem.config.js  # PM2 process config
└── docker-compose.yml
```

## Setup

### 1. Database

Run against your SQL Server instance (the *new* dedicated instance/database —
never PUB5 directly):

```bash
sqlcmd -S <server> -U <user> -P <password> -i database/schema.sql
sqlcmd -S <server> -U <user> -P <password> -i database/seed.sql
sqlcmd -S <server> -U <user> -P <password> -i database/migrations/002_phase2_books_orderitems.sql
```

Optional, for testing Customers/Orders locally before real PUB5 access exists:
```bash
sqlcmd -S <server> -U <user> -P <password> -i database/sample_data.sql
```

This creates the `PublisherOperations` database and seeds default roles,
permissions, departments, and one admin user
(`admin@example.com` / temp password `ChangeMe!123` NavAdmin@2026, forced reset on first login).

### 2. Backend

```bash
cd backend
cp .env.example .env    # fill in real values
npm install
npm run dev              # nodemon, dev
# or
pm2 start ../ecosystem.config.js --only pop-backend
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

### 4. Docker (optional, dev convenience)

```bash
docker compose up --build
```

`docker-compose.yml` runs the backend + Redis (needed from Phase 3 onward for
BullMQ). SQL Server is **not** containerized here on purpose — in production
this app should point at your real SQL Server instance, on the same host as
PUB5 or a dedicated one; use the optional `sqlserver` profile only for local
dev if you don't have an instance handy.

## Security notes (Phase 1)

- Passwords hashed with bcrypt (cost factor 12).
- JWT access tokens (15 min) + rotating refresh tokens (7 days, stored hashed
  in `RefreshTokens` table, revocable).
- Forgot-password tokens are single-use, hashed at rest, 30-minute expiry.
- Helmet, CORS allow-list, and a global + auth-specific rate limiter are wired
  in `app.js`.
- All SQL is parameterized via the `mssql` package — no string-concatenated
  queries anywhere.
