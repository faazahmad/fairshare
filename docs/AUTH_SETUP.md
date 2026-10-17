# Authentication setup

Fairshare uses the Spring Boot backend for email/password login and OAuth.
Provider secrets must never be added to the Vite frontend.

## Frontend environment

Copy `.env.example` to `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_NATIVE_AUTH_REDIRECT_URL=com.fairshare.app://auth/callback
```

Use a reachable HTTPS API URL for installed-device and production builds.
`localhost` inside a physical phone points to the phone, not this computer.

## Backend environment

Configure these values in the backend `.env` file:

```dotenv
FRONTEND_URL=http://localhost:5173
NATIVE_AUTH_REDIRECT_URL=com.fairshare.app://auth/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/github/callback
```

For deployment, replace the backend callback URLs with the public HTTPS API
domain and register those exact URLs in the Google and GitHub provider consoles.
The providers return only to the backend. The backend then selects one of two
fixed destinations:

- Browser: `FRONTEND_URL/auth/callback`
- Installed app: `NATIVE_AUTH_REDIRECT_URL`

The client cannot supply an arbitrary redirect URL.

## Native Android and iOS handoff

Android registers `com.fairshare.app://auth/callback` in
`android/app/src/main/AndroidManifest.xml`. iOS registers the same scheme in
`ios/App/App/Info.plist`.

The app opens Google or GitHub in Capacitor Browser. When the provider returns
to the backend, the backend places the Fairshare access and refresh tokens in
the custom callback fragment. Capacitor App receives the deep link, closes the
sign-in sheet, stores the session, and loads the current backend profile.

Run `pnpm mobile:sync` after changing the callback or Capacitor plugins.

## Apple status

The Apple logo is present in the login UI, but the button intentionally remains
disabled and labelled coming soon. Shipping Apple login requires Apple
Authentication Services, an App ID and Services ID, signing credentials, and a
backend endpoint that verifies the Apple identity token.

## Verification

```powershell
pnpm test
pnpm build
pnpm mobile:sync
```

Backend OAuth controller tests run in the Maven container and verify both web
and native redirects. A real provider sign-in additionally requires valid
provider credentials and matching callback URLs.

## Security checklist

- Use HTTPS for every non-local API and callback URL.
- Keep Google and GitHub client secrets only in the backend environment.
- Store mobile tokens with a secure native storage plugin before production.
- Keep OAuth scopes limited to identity, email, and basic profile.
- Add rate limits, account deletion, session revocation, and audit monitoring.
- Test sign-out, token refresh, denied consent, revoked provider access, and
  callbacks on Android, iOS, and every deployed web origin.
