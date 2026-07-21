# POP API Documentation — Phase 1

Base URL: `http://localhost:5000/api` (dev) — all responses follow:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors follow the same shape with `"success": false` and no `data`, plus a
`details` array for validation errors.

---

## Health

### `GET /health`
No auth. Returns `{ success: true, message: "POP API is running" }`.

---

## Auth

### `POST /auth/login`
Rate limited (10 req / 15 min per IP).

Request body:
```json
{ "email": "admin@example.com", "password": "ChangeMe!123", "rememberMe": false }
```

Response `200`:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "userId": 1,
      "fullName": "System Administrator",
      "email": "admin@example.com",
      "role": "Admin",
      "permissions": ["dashboard.view", "orders.view", "..."],
      "mustChangePassword": true
    }
  }
}
```
Also sets an httpOnly `pop_refresh_token` cookie (path `/api/auth`).

Errors: `401` invalid credentials, `403` account locked (5+ failed attempts).

---

### `POST /auth/refresh`
No `Authorization` header needed — reads the `pop_refresh_token` cookie.
Rotates the refresh token and returns a new access token in the same shape
as `/login`. Called automatically by the frontend's axios interceptor
whenever a request returns `401`.

---

### `POST /auth/logout`
Requires `Authorization: Bearer <accessToken>`. Revokes the current refresh
token and clears the cookie.

---

### `POST /auth/forgot-password`
Rate limited. Body: `{ "email": "user@example.com" }`.
Always returns `200` with a generic message — does not reveal whether the
email exists. If it does, an email with a reset link is sent.

---

### `POST /auth/reset-password`
Rate limited. Body:
```json
{ "userId": 1, "token": "<from email link>", "newPassword": "NewPass123" }
```
On success, all of that user's refresh tokens (i.e. all logged-in sessions)
are revoked, forcing re-login everywhere.

---

### `GET /auth/me`
Requires `Authorization: Bearer <accessToken>`. Returns the current user's
profile (no permissions array — call `/auth/refresh` or re-login to refresh
that list after a role change).

---

## Permission codes (Phase 1 seed data)

| Code | Module |
|---|---|
| dashboard.view | Dashboard |
| customers.view / customers.manage | Customers |
| orders.view / orders.manage | Orders |
| whatsapp.view / whatsapp.send / whatsapp.schedule / whatsapp.assign | WhatsApp |
| reports.view | Reports |
| settings.manage | Settings |
| users.manage | Users |
| audit.view | Audit |

Use `requirePermission('code')` middleware on any future route:
```js
router.get('/orders', authenticate, requirePermission('orders.view'), controller.list);
```
