# AGENTS: ORDER 2025 System

This repository is a static Alpine.js frontend plus a Cloudflare Workers API.
Use this guide to stay aligned with existing workflow and code style.

## Quick Context
- Frontend is static HTML/JS with Alpine.js; no build step required.
- Backend API runs on Cloudflare Workers with a D1 database.
- The project uses ES modules (`"type": "module"` in `package.json`).
- There is no dedicated lint/test framework configured.

## Architecture Overview
- `index.html` hosts Alpine templates and layout; JS lives in `src/app.js`.
- `src/app.js` manages state, routing (hash-based), and API calls.
- `workers/src/index.js` is the Workers router; handlers live in `workers/src/handlers`.
- D1 schema and seed data live in `database/schema.sql`.
- Frontend must call the Cloudflare Workers API directly (no `localStorage` caching).

## Commands

### Frontend (root)
- Install dependencies: `npm install`
- Dev server (static): `npm run dev`
  - Equivalent: `npx serve . -p 3000 -s`
- Preview build output: `npm run preview`
- Build: `npm run build` (prints a message; no build output is created)

### Workers (Cloudflare)
- Deploy API: `npx wrangler deploy` (run from `workers/`)
- Create D1 DB: `npx wrangler d1 create order-2025-db` (run from `workers/`)
- Apply schema: `npx wrangler d1 execute order-2025-db --file=../database/schema.sql --remote`
- Health check: `curl https://<your-workers-url>/health`

### Tests/Lint
- No automated tests or lint scripts are configured.
- There is no single-test command available.
- If you add tests, document the new commands here.

### Troubleshooting Local
- CORS or API errors: verify `API_BASE_URL` in `src/app.js`.
- Auth errors: ensure JWT secret and D1 schema are applied.
- Offline handling: API must be reachable; no local fallback storage.

## File Layout
- `index.html`: Main UI with Alpine templates
- `src/app.js`: Alpine app state and UI logic
- `src/alpine.js`: Local Alpine build
- `src/tailwind.js`: Local Tailwind build
- `src/assets/main.css`: Custom styles
- `src/api/*`: Fetch helpers for UI modules
- `src/utils/*`: Formatting helpers (date/number parsing)
- `workers/src/index.js`: Worker entry point
- `workers/src/handlers/*`: API handlers
- `workers/src/middleware/*`: Auth helpers (when present)
- `workers/migrations`: D1 migration history
- `database/schema.sql`: D1 schema

## Code Style: Frontend (`index.html`, `src/`)

### Formatting
- Indentation: 2 spaces
- Strings: double quotes
- Semicolons: used consistently
- Trailing commas: commonly used in objects/arrays
- Prefer explicit objects over deep mutation where possible

### Naming
- Functions and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Boolean getters: `isX` or `canX`
- Keep Alpine component state keys explicit (avoid dynamic/hidden state)

### Imports/Modules
- Frontend uses global scripts; avoid new module loaders.
- Keep browser-compatible APIs (no Node.js-only globals).

### Data Handling
- Use helper methods to normalize API payloads (`normalizePaket`, `ensureOrderExtras`).
- Prefer defensive parsing for JSON stored as strings (`parseJsonValue`).
- Do not use `localStorage` for caching; always call the Workers API.

### Error Handling
- Wrap API calls in `try/catch` and surface feedback via `showToast`.
- Do not add demo/offline fallbacks that bypass the API.
- Prefer early returns when validation fails.

### UI Behavior
- Keep navigation state in `currentPage` and hash routing.
- Reset form state when navigating to `/new` routes.
- Always keep Alpine reactivity in mind when replacing large objects.
- Keep modal states isolated (`showOrderModal`, `showDeleteModal`).

## Code Style: Workers (`workers/src`)

### Formatting
- Indentation: 2 spaces
- Strings: single quotes
- Semicolons: omitted
- Object/array literals: trailing commas are uncommon

### Naming
- Functions and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Handler exports: `handleX` in `handlers/*.js`

### Imports/Modules
- Use ES module imports with explicit `.js` extensions.
- Keep `workers/src/index.js` as routing entry point only.

### API Responses
- Always return JSON with `Content-Type: application/json`.
- Use appropriate HTTP status codes (`200`, `400`, `401`, `404`, `500`).
- Include CORS headers in all responses (see `workers/src/index.js`).

### Database Access
- Use `env.order_2025_db.prepare(...).bind(...).run()` or `.all()`.
- Keep SQL injection protections (validate sort fields, bind params).
- Normalize optional columns (e.g., `subkegiatan_id` vs `subkegitan_id`).

### Error Handling
- Wrap handler logic in `try/catch` and return a JSON error message.
- Log server errors with `console.error` for visibility.

## Shared Conventions
- Prefer small helper functions for normalization and validation.
- Keep changes minimal; avoid reformatting unrelated lines.
- Avoid introducing TypeScript or build tools unless explicitly requested.
- Keep API payloads JSON-serializable; avoid circular refs.
- Use explicit default objects when adding optional fields.

## Frontend Patterns
- Alpine state lives in `app()`; avoid global mutable state.
- Keep form models in `orderForm`, `vendorForm`, `userForm`, `subkegiatanForm`.
- Use `showToast(title, message, type)` for user-facing feedback.
- Avoid any demo/offline local storage fallbacks; always call the API.
- Prefer `formatNumber`, `formatDate`, `formatDateTime` helpers for display.

## Backend Patterns
- Guard endpoints with `verifyToken` unless explicitly public.
- Use `console.log` for request context and `console.error` for failures.
- Return structured JSON `{ message: "..." }` on errors.
- Keep SQL inlined with bound params; avoid string interpolation.
- Use `resolveOrderColumns` when schema may vary.

## Order Data Flow
- Form state lives in `orderForm` with nested `paket`, `kontrak`, `invoice`, `ba`.
- `saveOrder()` validates required fields then normalizes payload.
- `normalizePaket()` ensures `id_paket` and `no_surat_pesanan` stay consistent.
- `ensureOrderExtras()` merges defaults and parses JSON strings from API.
- API path: `POST /api/v1/orders` (create) or `PUT /api/v1/orders/:id` (update).
- Worker handler in `workers/src/handlers/orders.js` handles CRUD and stats.

## Deploy & Config
- Set `API_BASE_URL` in `src/app.js` to Workers URL.
- `JWT_SECRET` should be set in Workers environment for production.
- D1 binding name is `order_2025_db` in Workers.
- Apply schema before API use: `npx wrangler d1 execute order-2025-db --file=../database/schema.sql --remote`.
- Restrict CORS origin in `workers/src/index.js` for production.

## Offline Handling
- Do not use `localStorage` for data caching or offline mode.
- All reads/writes must call the Cloudflare Workers API directly.
- If the API is unavailable, surface an error and stop the action.

## Cloudflare Notes
- Update `const API_BASE_URL` in `src/app.js` when deploying.
- Set `JWT_SECRET` in Workers for production.
- CORS origin can be restricted in `workers/src/index.js`.

## When Adding New Work
- Update this file with new commands or rules.
- Keep new code consistent with the existing quoting style per folder.
- Add documentation only when requested.
