# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A diet-plan assistant web app with three modules under one repo:

| Module | Stack | Port | Start command |
|--------|-------|------|---------------|
| `backend/` | Express.js + MySQL (raw SQL via `mysql2/promise`) | 8888 | `cd backend && node app.js` |
| `frontend/` | Vanilla HTML/CSS/JS (no framework) | hosted by backend | none — backend serves `frontend/` as static |
| `admin-frontend/` | Vue 3 + Vite + Element Plus + Pinia | 5173 | `cd admin-frontend && npx vite` |

The backend **must** start before either frontend. MySQL must be running on `localhost:3306` with database `diet_plan` (credentials in `backend/.env`).

## Commands

```bash
# Backend
cd backend && node app.js                  # start (port 8888)
cd backend && npx nodemon app.js           # dev with auto-reload
cd backend && npm test                     # run all Jest tests
cd backend && npx jest --testPathPattern=api.test.js --testTimeout=30000  # integration tests only

# Admin frontend
cd admin-frontend && npx vite              # dev server (port 5173, proxies /api → localhost:8888)
cd admin-frontend && npx vite build        # production build → dist/
```

## Architecture

### Backend: no ORM, raw parameterized SQL

All database access goes through **model objects** in `backend/models/` that export functions running raw SQL via `mysql2/promise`. No ORM layer. Controllers call models directly — there is no service layer.

**Request flow**: `routes/` → `controllers/` → `models/` → MySQL

**Middleware** (`middleware/auth.js`):
- `authMiddleware` — validates JWT Bearer token, sets `req.userId` and `req.userRole`
- `adminMiddleware` — checks `req.userRole === 1` (admin role)

**AI features** (`controllers/aiController.js`):
- Dual-model: DeepSeek for text chat, Qwen-VL-Max for food-image recognition
- `callAI()` wraps fetch to the AI provider with `AbortSignal.timeout()`
- `fuzzyMatchFood()` does 4-level matching against the `food_items` table (exact → LIKE → reverse LIKE → prefix token match)
- Fallback suggestions are generated locally when AI API is unavailable

**Backend hardcodes port 8888** in `app.js` despite `.env` having `PORT=8080`. The app-level constant takes precedence.

### Frontend: single global `APP` namespace

All shared logic lives in `frontend/js/main.js` under a single `window.APP` object. Each page adds its own inline `<script>` or page-specific JS file (`frontend/js/*.js`).

**`APP` structure**:
- `APP.API_BASE` = `'http://localhost:8888/api'` (hardcoded)
- `APP.api.get/post/put/delete(url)` — thin fetch wrappers, auto-attach JWT, auto-redirect on 401
- `APP.auth` — localStorage-based token/user CRUD; `isLoggedIn()`, `getUser()`, `requireAuth()`
- `APP.toast(message, type)`, `APP.modal.show/close()`, `APP.escapeHtml(str)`
- `APP.initPage(pageName)` — renders header + sidebar; call in every page's `DOMContentLoaded`
- Constants: `APP.mealTypes`, `APP.goals`, `APP.categories`, `APP.categoryIcons`, `APP.weekDays`

Pages use Chart.js (loaded from CDN) for charts. The index page has a 600+ line inline script for the dashboard.

### Admin-frontend: standard Vue 3 SPA

- Pinia store (`stores/user.js`) for auth state
- Vue Router with `beforeEach` guard checks `store.isAdmin`
- Element Plus components globally registered
- Axios instance at `api/index.js` with interceptors mirroring the vanilla frontend's auth pattern
- Vite proxy sends `/api` requests to `localhost:8888`

### Database

12 tables covering users, foods, diet plans, meal records, weight history, water logs, favorites, admin logs, announcements, and system config. 200+ preset food items across 10 categories. SQL files for init and migrations live in `database/`.

Key relationships:
- `diet_plans` → `plan_foods` (CASCADE delete) → `food_items`
- `meal_records` → `users`, `food_items` (CASCADE delete), `diet_plans` (SET NULL)
- `favorite_foods` has unique constraint on (user_id, food_id)

## Common pitfalls

- **URL mismatch**: Backend routes mounted at `/api/reports` with `router.get('/')` means the full endpoint is `/api/reports`, not `/api/reports/weekly`. Always cross-check frontend `APP.api.get()` paths against the route mount prefix + route path.
- **401 on new endpoint**: Most routes use `authMiddleware`. If a page redirects to login, the endpoint likely isn't excluding auth.
- **Hardcoded localhost**: Both `frontend/js/main.js` (`API_BASE`) and `backend/app.js` (port) hardcode `localhost:8888`. Changing the backend port requires updating both.
- **Cascade behavior**: Deleting a `food_item` that's referenced in `meal_records` will delete those meal records. Deleting a `diet_plan` cascade-deletes its `plan_foods`.
- **AI API failure**: The report controller silently falls back to a local suggestion generator. AI timeouts won't break the response — check `aiSuggestion` length to distinguish AI vs fallback.
