# POP — Phase 1 Architecture Notes

## Layered backend design

```
Routes → Validators → Controllers → Services → Repositories → mssql (parameterized SQL)
                                        ↓
                                  ApiError / ApiResponse (consistent shape)
```

- **Repositories** are the only layer allowed to touch SQL. Every query is
  parameterized (`.input(...)`) — no string concatenation, ever.
- **Services** hold business rules (lockout thresholds, token rotation,
  "don't leak which emails exist" logic). Controllers stay thin.
- **Controllers** only translate HTTP ↔ service calls; no business logic.
- This separation is what lets Phase 2 swap the Customers/Orders repository
  queries to match the real PUB5 schema without touching controllers, routes,
  or the frontend at all.

## Auth flow

```
Login ─▶ verify password ─▶ issue short-lived JWT access token (15m, in memory on client)
                         └▶ issue long-lived opaque refresh token (7d / 30d "remember me"),
                            stored as SHA-256 hash in RefreshTokens, sent to client as
                            httpOnly cookie (not accessible to JS — mitigates XSS token theft)

Access token expires ─▶ client calls /auth/refresh ─▶ server validates cookie's hash
                      ─▶ rotates refresh token (old one revoked, new one issued)
                      ─▶ issues new access token

Password reset ─▶ single-use token (hashed, 30 min expiry) ─▶ emailed link
               ─▶ on success, ALL existing refresh tokens for that user are revoked
                  (a stolen session token becomes worthless the moment the
                  password changes)
```

## ER overview (Phase 1 tables)

```
Roles ──< RolePermissions >── Permissions
  │
  └──< Users >── Departments
        │  │
        │  └──< RefreshTokens
        │  └──< PasswordResetTokens
        │
        └──< AuditLogs
        └──< ActivityLogs
        └──< Notifications

Customers ──< Orders ──< Attachments
    │
    └──< Messages ──< Attachments
    └──< ScheduledMessages ──< Attachments

Settings (standalone key/value)
```

Full column-level definitions are in `database/schema.sql`. `Customers` and
`Orders` are intentionally a realistic placeholder — see the README section
"What's real vs. placeholder in Phase 1".

## Security choices worth knowing about

- Login and password-reset endpoints share a *stricter* rate limiter than the
  rest of the API (`authLimiter` vs `generalLimiter`), independent of PM2
  cluster instance count.
- Failed logins increment a per-user counter; 5 failures locks the account
  for 15 minutes — this is enforced in the service layer, not just the UI.
- Refresh tokens are **opaque random strings**, not JWTs — this lets the
  server revoke them individually (a JWT refresh token can't be "un-issued"
  without a blocklist).
- `helmet`, a CORS allow-list (only `CLIENT_URL`), and `express-rate-limit`
  are applied globally in `app.js` before any route is reached.
