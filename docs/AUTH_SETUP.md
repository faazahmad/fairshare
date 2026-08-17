# Authentication setup

Fairshare supports two authentication modes:

- **Demo mode** activates automatically when no Supabase environment variables
  exist. Email login and sign-up work locally with the displayed demo account.
  Google, Apple, and GitHub deliberately do not simulate a successful identity;
  they show a configuration error until a real provider is connected.
- **Production mode** activates when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` are provided. It uses Supabase Auth for
  password sessions, OAuth redirects, token refresh, and sign-out.

## 1. Add the public project configuration

Copy `.env.example` to `.env.local` and fill in the values from the Supabase
project's Connect dialog:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:4173/
VITE_NATIVE_AUTH_REDIRECT_URL=com.fairshare.app://auth/callback
```

The publishable key is designed for browser use. Never put a service-role key,
Google client secret, Apple private key, or GitHub client secret in a `VITE_`
variable. Those values belong only in provider and Supabase dashboards.

Add every development and production callback URL to **Authentication → URL
Configuration → Redirect URLs** in Supabase. Set the production Site URL before
launch.

## 2. Enable password authentication

Email/password sign-in uses `signInWithPassword`, sign-up uses `signUp`, and the
forgot-password screen uses `resetPasswordForEmail`. Decide whether new users
must confirm email in the Supabase Email provider settings. Configure branded
confirmation and reset email templates before launch.

## 3. Enable Google

1. Create a Web OAuth client in Google Auth Platform.
2. Add the deployed Fairshare origin and the local development origin to the
   authorized JavaScript origins.
3. Add the Supabase callback URL shown on the Google provider page as an
   authorized redirect URI.
4. Add Google's client ID and secret to the Supabase Google provider.
5. Keep scopes limited to `openid`, email, and profile unless additional access
   is genuinely required.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google

## 4. Enable Apple

1. Create an Apple App ID and enable Sign in with Apple.
2. Create a Services ID for the website and associate it with the App ID.
3. Register the production domain and Supabase callback URL with the Services ID.
4. Create an Apple signing key and configure the Apple provider in Supabase.
5. Schedule rotation of the Apple OAuth secret every six months. Missing a
   rotation will break web-based Apple sign-in.

Apple supplies a person's name only during initial authorization and the web
OAuth flow may not return it. Fairshare therefore supports collecting a missing
name during onboarding.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-apple

## 5. Enable GitHub

Create a GitHub OAuth App, set its authorization callback URL to the callback
shown by Supabase, and enter its client ID and secret in the Supabase GitHub
provider.

Reference: https://supabase.com/docs/guides/auth/social-login

## 6. Native Android and iOS handoff

The installed app uses Capacitor Browser to open the provider and Capacitor App
to receive `com.fairshare.app://auth/callback`. The callback handler validates the
returned token pair, gives it to Supabase, closes the authorization browser, and
lets the shared auth-state listener enter the app.

Add `com.fairshare.app://**` to **Authentication → URL Configuration → Redirect
URLs** in Supabase. After generating the native projects, register the same
scheme on both platforms:

- Android: add an `android.intent.action.VIEW` intent filter for the
  `com.fairshare.app` scheme inside the main activity.
- iOS: add `com.fairshare.app` to `CFBundleURLSchemes` in `Info.plist`.

Run `pnpm mobile:sync` after installing or changing Capacitor plugins. A final
production release should move to a verified HTTPS app/universal link when the
public Fairshare domain is approved.

For the best iPhone experience, the final native build should use Apple's native
Authentication Services capability and pass its ID token to Supabase. The web
OAuth button remains a compatible fallback.

## Security checklist

- Enable Row Level Security on every user-owned table before connecting data.
- Never authorize data by email alone; use the authenticated user's UUID.
- Require HTTPS outside local development.
- Keep OAuth scopes minimal and configure provider consent-screen branding.
- Add rate limits, abuse monitoring, account deletion, and session revocation.
- Test sign-out, token refresh, password recovery, revoked provider access, and
  OAuth callbacks on each deployment origin.
