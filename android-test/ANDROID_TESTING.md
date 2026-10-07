# Fairshare Android test package

This folder is an isolated Android copy of Fairshare. It contains the compiled
web bundle in `dist/` and the synchronized Capacitor Android project in
`android/`.

## Install the supplied APK

The ready-to-install test APK is available at:

`../mobile-downloads/Fairshare-Android-debug-v0.1.0.apk`

1. Transfer the APK to the Android device using USB, Drive, email, or another
   trusted method.
2. Open the APK from the Files app.
3. If Android asks, allow **Install unknown apps** for the Files app you used.
4. Tap **Install**, then open **Fairshare**.

The APK is a debug-signed testing build for `com.fairshare.app`. It supports
Android 7.0 (API 24) and newer. If another Fairshare build with a different
signature is installed, uninstall it first; uninstalling removes that build's
locally stored demo data.

SHA-256:

`6E77893FF58DF6583514F09BC40C0AB401DEA98C850D6810C871A4B9938BE55E`

## Demo login

This APK was compiled without private Supabase credentials, so use the local
demo account:

- Email: `demo@fairshare.app`
- Password: `Fairshare123`

Google, Apple, and GitHub authentication require a configured Supabase project,
provider credentials, and `com.fairshare.app://auth/callback` in the redirect
allow list. The Android deep-link intent for that callback is already included.

## Rebuild the APK

After installing Android Studio and SDK Platform 36, run from this folder:

```powershell
pnpm install
pnpm build
pnpm exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

The rebuilt APK appears under
`android/app/build/outputs/apk/debug/app-debug.apk`.

This debug APK is for direct device testing. Google Play distribution later
requires a private release signing key and a release Android App Bundle (`.aab`).

