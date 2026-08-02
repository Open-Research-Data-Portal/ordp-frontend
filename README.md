# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.






# ORDP Frontend Pages — Register, Login, Forgot Password, Check Email, Profile

Built to match the five Figma screenshots, with the Profile page's fields, dropdown
options, and required/optional flags implemented exactly per the written field spec
(which is more complete than the screenshot, so it's the source of truth for that page).

## Where these files go

Drop the entire `frontend/src/` tree here into your cloned frontend repo, merging
folder-by-folder (don't overwrite `src/api/client.js` or an existing `AuthContext.jsx`
if PR #36 already created them — see "Before this runs" below).

```
frontend/src/
├── api/
│   └── authApi.js
├── assets/
│   └── logo-placeholder.svg
├── components/
│   ├── auth/
│   │   ├── AuthFooter.jsx
│   │   ├── AuthLayout.jsx
│   │   └── TopNav.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── MultiSelectTags.jsx
│       ├── Select.jsx
│       ├── TextArea.jsx
│       ├── TextInput.jsx
│       └── Toggle.jsx
├── context/
│   └── AuthContext.jsx
├── layouts/
│   ├── Sidebar.jsx
│   └── TopBar.jsx
└── pages/
    ├── ForgotPassword/
    │   ├── CheckEmailPage.jsx
    │   └── ForgotPasswordPage.jsx
    ├── Login/
    │   └── LoginPage.jsx          (updated design: "Email or Username" field)
    ├── Profile/
    │   ├── ProfilePage.jsx
    │   ├── ProfilePage.test.jsx
    │   └── constants.js           (all dropdown option lists)
    └── Register/
        └── RegisterPage.jsx
```

## Suggested routes (add to your router)

```jsx
<Route path="/register" element={<RegisterPage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/check-email" element={<CheckEmailPage />} />
<Route path="/profile" element={<ProfilePage />} />  {/* wrap in your auth-protected route */}
```

## Before this runs — check these first

1. **`src/api/client.js`** — `authApi.js` imports a shared, pre-configured axios
   instance from here (from PR #36). This isn't included; point the import at
   whatever it's actually named in your scaffold.
2. **`AuthContext.jsx`** — if PR #36 already created one, use the existing one
   instead of this file, as long as it exposes `login`, `logout`, `user`,
   `accessToken`, `isAuthenticated`, `loading`.
3. **Dependencies**: `react-router-dom`, `lucide-react`, and for the test file,
   `vitest` + `@testing-library/react` + `@testing-library/user-event` (swap for
   Jest equivalents if that's what the scaffold uses instead).
4. **`logo-placeholder.svg`** is a stand-in for the real AASTU logo asset —
   swap the file, the import paths don't need to change.

## What's intentionally left as a TODO, not silently built

- **Registration endpoint call** (`RegisterPage.jsx`) — that's Redeat's backend
  task per the Auth Phase Task Breakdown, not built here. The form is fully
  wired up to submit; the actual `fetch`/`axios` call is commented with a
  `TODO(Redeat/backend)` marker showing exactly what to uncomment once the
  endpoint exists.
- **Username-availability check** — same page, stubbed with a fake check
  (rejects "admin"/"test"/"researcher" as already-taken) so the spinner/checkmark
  UI is fully working and demoable; swap in the real endpoint call when it exists.
- **Password reset endpoints** (`ForgotPasswordPage.jsx`, `CheckEmailPage.jsx`) —
  per Rebika's API reference, there's no backend for this yet at all. Both pages
  are fully built and navigable (Forgot Password → Check Email → Back to Login),
  just not wired to a real API call yet.
- **Profile save** — wired to a fake delay so the "Profile changes saved" banner
  and loading state are demoable; the real `PATCH` call is commented in with a
  `TODO(backend)` noting that the *documented* profile endpoint currently only
  covers `first_name`/`last_name` — the academic/research fields in this form
  need either an extended endpoint or a second one. Worth raising with Rebika.

## Two design/backend mismatches flagged, not silently resolved

1. **Login field says "Email or Username,"** but the documented `/api/accounts/login/`
   endpoint only accepts `email`. If someone types a username, login will fail
   until the backend adds username lookup. Flagged inline in `LoginPage.jsx`.
2. **"Stay logged in for 30 days"** vs. the documented refresh token's actual
   7-day lifetime — same issue noted in the previous Login-only delivery,
   unchanged here since it hasn't been resolved with the team yet.

## Tests included

`ProfilePage.test.jsx` — 8 tests: Email/Username render read-only and reject
edits, the masked read-only Password field with its Change Password action,
required vs. optional labeling on specific fields, adding/removing a Research
Interest tag, the Bio field's 300-character hard limit with live counter, the
Email Notifications toggle, the Affiliation default value, and the Save
Changes confirmation banner.

## Suggested branch + commits

```
git checkout -b feature/user-mgmt-auth-and-profile-ui
git add src/pages/Register src/pages/Login src/pages/ForgotPassword src/pages/Profile \
        src/components/auth src/components/ui src/layouts src/api/authApi.js src/context/AuthContext.jsx
git commit -m "feat(user-mgmt): build Register, Login, Forgot Password, Check Email pages"
git commit -m "feat(user-mgmt): build editable Profile page with all field sections"
git commit -m "test(user-mgmt): add component tests for Profile page"
```
