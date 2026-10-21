# Authentication setup

Fairshare delegates authentication to the Spring Boot backend. Provider secrets, SMS credentials, SMTP credentials, and Apple private keys must never be added to the Vite application.

## Frontend

Copy `.env.example` to `.env` and set:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_NATIVE_AUTH_REDIRECT_URL=com.fairshare.app://auth/callback
```

The installed Android and iOS apps open the provider authorization session and receive the completed Fairshare session through `com.fairshare.app://auth/callback`. Browser builds return to `/auth/callback`.

## Backend providers

Configure provider callback URLs on the backend, never in the frontend:

- Google: `${PUBLIC_API_URL}/api/v1/auth/oauth/google/callback`
- Apple: `${PUBLIC_API_URL}/api/v1/auth/oauth/apple/callback`

Sign in with Apple requires a Services ID, Team ID, Key ID, and the associated private key. Apple requires a registered HTTPS return URL for web authentication; `localhost` is not accepted as an Apple return URL.

Phone OTP delivery is provider-backed in production and exposes a code only when the explicit development flag is enabled. Email verification uses SMTP in production and records a single-use, expiring token before delivery.

See the backend `.env.example` for the complete environment contract.

## Security checklist

- Use HTTPS for every non-local API and callback URL.
- Keep OAuth, SMS, SMTP, JWT, and Apple private-key values in the deployment secret store.
- Disable development OTP and email-link exposure outside the `dev` profile.
- Register the native deep-link scheme in both mobile projects.
- Make every provider callback match its configured backend URL exactly.
