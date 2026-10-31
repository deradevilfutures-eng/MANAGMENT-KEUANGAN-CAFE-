# Racik — Phase 1 Architecture

## Scope
This phase establishes the backend and database foundation. It does not yet replace the current browser-only application or enable live customer ordering.

## Deployment topology
- Frontend: GitHub Pages (static site).
- API: Node.js service on a separate application host.
- Database: managed PostgreSQL, independent of Supabase.
- Realtime: WebSocket layer added when order/POS workflows are implemented.
- Secrets: backend environment variables only. Never put database credentials, signing keys, or payment secrets in frontend code or Git.

## Tenancy and access model
Every operational record belongs to a branch through `branch_id`. The owner role can access all branches. A branch manager/cashier can access only branches explicitly assigned in `user_branch_access`. Authorization must be enforced by the API on every request; hiding a menu item in the UI is not security.

Roles planned:
- `owner`: organization-wide access and branch administration.
- `manager`: operational access to assigned branch(es).
- `cashier`: orders, payments, and cash sessions at assigned branch(es).
- `staff`: limited operational access as later defined.

## Ordering channels
- `dine_in`: a server-issued QR token resolves to a branch and table.
- `takeaway`: customer chooses a branch and pickup flow.
The API must validate the QR token; a table number supplied by the browser is never trusted by itself.

## Security baseline
- Passwords are stored as Argon2id hashes; plaintext passwords are never stored.
- Use short-lived access tokens and rotating, revocable refresh sessions.
- Validate request bodies and parameters; use parameterized SQL.
- Apply rate limits to login and other sensitive endpoints.
- Restrict CORS to configured frontend origins.
- Use HTTPS in production and secure, HttpOnly, SameSite cookies for refresh sessions.
- Keep audit events for sensitive administrative changes.
- Never expose stack traces, SQL errors, secrets, or internal identifiers to public clients.

## Initial database entities
Organizations, branches, users, roles, branch access, dining tables, QR tokens, menu categories, products, product variants, orders, order items, payments, ingredients, recipes, stock movements, employees, shifts, expenses, and cash sessions.

## Environment configuration
See `backend/.env.example`. Production values must be configured in the backend host's secret manager, not committed to Git.

## Delivery boundaries
The repository can contain the frontend, backend source, and SQL migrations. GitHub Pages cannot run Node.js or host PostgreSQL. A separate API host and PostgreSQL provider must be selected before a live deployment. No production credentials or payment integration are included in this foundation commit.
