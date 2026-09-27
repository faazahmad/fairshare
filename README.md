# Fairshare

Fairshare is an original, clean-room expense-sharing application inspired by the
general workflow of shared-expense products. It is not affiliated with Splitwise
and does not contain Splitwise source code, branding, or private assets.

## Current slice

- Responsive Home, Expenses, Activity, Groups, Pay & Lend preview, and Settings pages
- Add-expense flow with equal, exact, percentage, and share-based splitting
- Full edit/delete flows for expenses and recorded payments, with balance recalculation
- WhatsApp and Instagram reminder handoffs with editable tone-aware messages
- Local Fairshare Smart analysis with live settlement routes and actionable suggestions
- Light/dark/system themes, accent colours, density, privacy mode, and reduced motion
- Mobile account menu plus separate, functional Profile, Notifications, Appearance, and Security panels
- Profile-picture upload, persisted contact details, notification filtering, recovery actions, and device-session controls
- Live local-calendar headings and timezone-safe expense/payment dates
- Group creation, expense details, notifications, profile editing, and settlements
- Deterministic money math in integer minor units
- Debt simplification that preserves every member's net balance
- Local persistence so the prototype is useful before the API is connected
- Installable PWA shell and Capacitor Android/iOS packaging foundation
- Protected login with email/password, Google, Apple, and GitHub auth adapters
- Real web OAuth redirects plus Android/iOS deep-link session handoff (provider credentials required)
- Persisted currency and language choices that update the ledger, dates, and core navigation
- Android & iOS platform projects generated with Capacitor (point at a deployed backend via the `.env` file)

## Configure the deployed backend

All backend URLs are driven by environment variables — no localhost is hard-coded.

1. Copy `.env.example` to `.env` (already created), then fill in:

   ```dotenv
   VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
   ```

2. Configure CORS origins on the backend so the web app and its
   WebSocket channel can reach it from the web AND from the installed Android/iOS builds.
3. The native auth redirect uses `com.fairshare.app://auth/callback` — add
   `com.fairshare.app://**` to your Supabase Auth redirect allow list, and ensure your
   Google OAuth client accepts that callback.

> ⚠️ Vite bakes `.env` values in **at build time** (`pnpm build`), so set
> `VITE_API_BASE_URL` before every mobile build.

## Run on Android / iOS

The Android (`android/`) and iOS (`ios/`) platforms are generated with Capacitor.
Capacitor packages this web app as a native shell — it is not React Native, but it
distributes as real Android/iOS apps.

Prerequisites:

- **Android**: JDK 17+, Android Studio/Android SDK (`ANDROID_HOME` set), a device or
  emulator with developer mode enabled.
- **iOS**: macOS only, Xcode, and an Apple ID for signing (iOS builds require Apple's toolchain).

```powershell
# 1. Point VITE_API_BASE_URL at your backend in `.env` (above).

# 2. Build the web app and copy it into both native projects, then open in an IDE:
pnpm mobile:sync
pnpm mobile:android   # or: pnpm mobile:ios

# 3. Build/install a debug Android build:
pnpm mobile:android:build      # APK via gradlew
pnpm mobile:android:emulator   # install + run on a connected device/emulator
```

Every time you change the web app, re-run `pnpm mobile:sync` so the latest `dist/` is copied into `android/` and `ios/` before rebuilding. See `docs/MOBILE_RELEASE.md` for store requirements and the full native release process.

## Run locally

```powershell
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

## Verification

```powershell
pnpm test
pnpm build
```

The product research and phased roadmap are in [`docs/PRODUCT_BLUEPRINT.md`](docs/PRODUCT_BLUEPRINT.md).
The native release process and remaining store requirements are in [`docs/MOBILE_RELEASE.md`](docs/MOBILE_RELEASE.md).
Real OAuth provider configuration is documented in [`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md).
