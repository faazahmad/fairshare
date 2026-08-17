# Mobile release path

Fairshare uses one React application for the browser, Android, and iPhone. The
native apps are thin Capacitor shells around the production web bundle, with
native plugins added only where platform capabilities are needed.

## Current foundation

- Responsive phone, tablet, and desktop layouts
- Installable web-app manifest and offline application shell
- Capacitor 8 configuration and Android/iOS packages
- Shared integer-based financial domain layer and persistent local prototype data

The placeholder application ID is `com.fairshare.app`. It must be replaced with
the final reverse-domain identifier before native platforms are generated.

## Generate native projects

After the final name, application ID, icon, and splash artwork are approved:

```powershell
pnpm mobile:add:android
pnpm mobile:add:ios
pnpm mobile:sync
```

Open the Android project on Windows or macOS:

```powershell
pnpm mobile:android
```

Open the iOS project on macOS:

```powershell
pnpm mobile:ios
```

The iOS build and App Store upload require macOS, Xcode, and an Apple Developer
account. Android release signing requires Android Studio, a protected signing
keystore, and a Google Play Console account.

## Work required before store submission

1. Replace the local prototype store with authenticated API synchronization.
2. Add secure token storage, universal/app links, and production error reporting.
3. Generate adaptive Android and iOS icon/splash assets from the final brand.
4. Add camera/photo permissions only if receipt scanning is shipped.
5. Test accessibility, offline conflicts, deep links, and background resume.
6. Prepare privacy policy, support URL, data-safety disclosures, screenshots,
   release notes, content ratings, and account-deletion flow.
7. Run TestFlight and Play closed testing before production review.

Do not generate signed release binaries using the temporary name or application
ID. Store identity choices are difficult to change after publication.

Authentication provider and native callback setup is detailed in
[`AUTH_SETUP.md`](AUTH_SETUP.md).
