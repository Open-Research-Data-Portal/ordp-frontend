## Summary

Sets up the ordp-frontend foundation: Vite + React (JavaScript) scaffold,
feature-based folder structure mirroring the backend's six modules, and core
tooling decisions (axios for API calls, ESLint for linting, Context API for
auth/session state instead of Redux).

## SRS / WBS reference

WBS 1.0 (Foundation & Design) — Django/React scaffolding, Figma wireframes
for core screens

## Type of change

- [x] New feature
- [ ] Bug fix
- [ ] Refactor (no functional change)
- [ ] Styling / UI only
- [ ] Tests only
- [ ] Docs / config

## What's included

- Vite + React scaffold (JavaScript)
- Folder structure under `src/`:
  - `api/` — centralized axios client
  - `features/{accounts,datasets,metadata,search,sharing,adminPanel}/` —
    mirrors backend `apps/`, matching SRS FR ranges
  - `components/`, `layouts/`, `routes/`, `context/`, `hooks/`, `utils/`
- axios installed and configured (`src/api/client.js`) with
  `VITE_API_BASE_URL` from env
- ESLint configured (Vite default) — 
- `.env.example` documenting required env vars
- `.github/PULL_REQUEST_TEMPLATE.md` for this repo
- Confirmed connectivity to the Dockerized Django backend (fetch test against
  `/admin/` returns 200, no CORS errors)

## Checklist (Definition of Done — PMP 10.4)

- [ ] Reviewed by at least one other team member
- [ ] Unit and/or integration tests written and passing
- [x] Component/hook props, new routes, or env vars documented
- [x] Verified end-to-end against a running backend (not mocked data only)
- [x] No secrets or credentials committed (checked against `.env.example`)
- [x] No console errors/warnings in the browser
- [ ] Checked in at least two browsers OR noted which one was tested

## How to test

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`
2. `npm install`
3. `npm run dev` — should start cleanly on `http://localhost:5173`
4. Confirm the default Vite/React page loads with no console errors
5. With the backend running (`docker compose up -d` in `ordp-backend`), open
   the browser console and run:
   `fetch("http://localhost:8000/admin/").then(r => console.log(r.status))`
   — should log `200`, no CORS errors

## Notes for reviewer
- No actual pages/components built yet — this PR is scaffold only.

  