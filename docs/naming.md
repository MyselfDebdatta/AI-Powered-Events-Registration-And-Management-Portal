# Naming clarification — two different "register" endpoints

**Status:** Frozen for S0 · 2026-11-21

The repository has two endpoints whose names look similar but whose audiences, authentication and data are different. This note exists so no later stage merges them, renames one by accident or documents the wrong one.

## `POST /api/register` — public participant intake

- **Audience:** the public, from the in-site React form on `/register`.
- **Authentication:** none.
- **Payload:** multipart form data with the participant fields, photo and consent defined in `docs/contracts/registration-v1.md`.
- **Effect:** creates or links a participant registration for the active event; never creates a staff account.
- **Status:** endpoint does not exist yet; it is implemented in **S4**.
- **Frozen client:** `frontend/src/lib/registration.js` and `frontend/src/hooks/useRegistrationForm.js` already post to `/api/register`.

## `POST /api/auth/register` — staff-account creation

- **Audience:** an authenticated admin.
- **Authentication:** admin JWT (`get_current_admin`).
- **Payload:** JSON `{email, password, name, role}`.
- **Effect:** creates a staff user (admin or volunteer) in the `users` table; never creates a participant.
- **Status:** exists today. Keep it working. An optional alias such as `/api/auth/users` may be added later, but the existing path must not be removed or repurposed in S0.

## Rules

1. Do not rename either endpoint in S0. The frontend contract for `/api/register` is frozen; `/api/auth/register` is used by admin flows.
2. `/register/assisted` is **not** a staff-account endpoint. It reuses the public registration form with `source=WALK_IN` and staff present; it still calls `POST /api/register`.
3. Documentation and PR text must say "public registration intake" for `/api/register` and "staff account creation" for `/api/auth/register`.
4. If an alias is introduced later, both paths must share one handler and one authorization rule, and the alias must be documented in `docs/route-matrix.md` in the same change.
