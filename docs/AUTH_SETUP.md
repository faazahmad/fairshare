# Authentication setup

Fairshare uses a Spring Boot backend API (`fairshare_be`) for authentication and session management:

- **Spring Boot Backend**: Provides `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, and OAuth2 flows (`/oauth/google`, `/oauth/github`). Tokens are stored in JWT format with Redis/in-memory session backing.
- **Local Demo Mode**: Seamless fallback in the frontend for offline testing and development when credentials match the demo profile or the API is unreachable.

## 1. Configure the Frontend

Set the backend API base URL in `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 2. Register GitHub OAuth App

1. Go to [GitHub Developer Settings → OAuth Apps → New OAuth App](https://github.com/settings/applications/new).
2. Fill in the fields:
   - **Application name**: `Fairshare` (or any recognizable name)
   - **Homepage URL**: `http://localhost:5173` (or production frontend URL)
   - **Application description**: `Fairshare Expense Sharing App`
   - **Authorization callback URL**: `http://localhost:8080/api/v1/auth/oauth/github/callback` (or your deployed backend URL)
3. Click **Register application**.
4. Generate a new Client Secret.
5. Copy the **Client ID** and **Client Secret** into your backend `.env` file:
   ```dotenv
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/github/callback
   ```

## 3. Register Google OAuth Client

1. In Google Cloud Console, navigate to **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized redirect URIs** to:
   - `http://localhost:8080/api/v1/auth/oauth/google/callback`
4. Add credentials to backend `.env`:
   ```dotenv
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/google/callback
   ```

## 4. Native Android and iOS handoff

The installed app uses Capacitor Browser to open the backend OAuth endpoint and receives deep-links via `com.fairshare.app://auth/callback`.

## Security checklist

- Enable Row Level Security on every user-owned table before connecting data.
- Never authorize data by email alone; use the authenticated user's UUID.
- Require HTTPS outside local development.
- Keep OAuth scopes minimal and configure provider consent-screen branding.
- Add rate limits, abuse monitoring, account deletion, and session revocation.
- Test sign-out, token refresh, password recovery, revoked provider access, and
  OAuth callbacks on each deployment origin.
