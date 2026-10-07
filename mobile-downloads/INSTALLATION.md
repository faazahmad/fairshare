# Fairshare mobile test downloads

## Android: installable now

Download `Fairshare-Android-debug-v0.1.0.apk` to an Android 7.0 or newer device.
Open it from Files, allow **Install unknown apps** for that Files app if Android
asks, and tap **Install**.

- Package: `com.fairshare.app`
- Version: `1.0` (`versionCode` 1)
- Minimum Android: 7.0 / API 24
- Target SDK: API 36
- Signature: Android debug certificate, APK Signature Scheme v2
- SHA-256: `6E77893FF58DF6583514F09BC40C0AB401DEA98C850D6810C871A4B9938BE55E`

This build uses local demo authentication because no Supabase secrets were
embedded. Sign in with `demo@fairshare.app` and `Fairshare123`.

If Android reports that the app conflicts with an existing Fairshare install,
uninstall the old testing build first. That removes its locally stored data.

## iPhone/iOS: Xcode package

`Fairshare-iOS-Xcode-project-v0.1.0.zip` is the complete Capacitor/Xcode project,
not an installable `.ipa`. Apple requires the native app to be compiled and
signed on macOS with Xcode and an Apple development team.

ZIP SHA-256: `33E575F90E1C8F00B69BF96297F0C6D4E2BE8F87C7B2C85DAFDCAAF741DDF4A8`

On a Mac:

1. Extract the ZIP.
2. Install Node.js 22+, pnpm, and Xcode 26+.
3. In the extracted folder run:

   ```bash
   pnpm install
   pnpm build
   pnpm exec cap sync ios
   pnpm exec cap open ios
   ```

4. In Xcode select the **App** target, choose your Apple team under
   **Signing & Capabilities**, and keep automatic signing enabled.
5. Connect and trust the iPhone, enable Developer Mode if requested, select the
   phone as the run destination, and click **Run**.

An `.ipa` cannot be generated or signed on this Windows computer. The ZIP is
ready for that final Mac/Xcode signing step and already includes the native OAuth
URL scheme.

## Important testing boundary

The Pay & Lend screen is an interactive preview; it does not transfer real
money. WhatsApp opens a prepared message, while Instagram copies the message
and opens the share sheet/inbox for user confirmation.
