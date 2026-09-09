# Fairshare iPhone 12 test package

This folder is an isolated copy of the Fairshare project. Its web bundle has
already been compiled into `dist/`, and a Capacitor 8 Xcode project has been
generated in `ios/App/`. The original project one directory above is not used
by the iOS source after this folder is moved to a Mac and its dependencies are
installed.

## What is ready

- Responsive React application and production web bundle
- Capacitor iOS container using bundle ID `com.fairshare.app`
- iOS callback scheme `com.fairshare.app://auth/callback` for native OAuth
- Native App and Browser plugins needed for Google, Apple, and GitHub handoff
- Safe-area CSS and mobile navigation for notched iPhones such as iPhone 12

## Run the compiled web app on the iPhone today

On this Windows computer, start the isolated preview from this folder:

```powershell
pnpm exec vite preview --host 0.0.0.0 --port 4174
```

Connect the computer and iPhone to the same Wi-Fi network, find the computer's
IPv4 address with `ipconfig`, and open `http://COMPUTER_IP:4174` in Safari on
the iPhone. This exercises the responsive app, but not native-only OAuth or
App Store packaging.

## Install the native app on an iPhone 12

Apple's iOS toolchain requires macOS and Xcode, so complete these steps on a
Mac:

1. Copy this entire `iphone12-test` folder to the Mac.
2. Install Node.js 22 or newer and pnpm.
3. From this folder, run:

   ```bash
   pnpm install
   pnpm build
   pnpm exec cap sync ios
   pnpm exec cap open ios
   ```

4. In Xcode, select the **App** target, open **Signing & Capabilities**, choose
   your Apple team, and keep **Automatically manage signing** enabled.
5. Connect the iPhone 12 by cable, tap **Trust** if prompted, enable Developer
   Mode on the phone if Xcode requests it, and choose that iPhone as the run
   destination.
6. Click **Run** in Xcode. Xcode will register the connected device and create
   a development provisioning profile when automatic signing is available.

The same Xcode project can also run in an iPhone simulator, but final behavior
and performance should be checked on the physical phone.

## Enable real social login in the native test

Copy `.env.example` to `.env`, enter the public Supabase project URL and
publishable key, enable Google/Apple/GitHub in Supabase Auth, and add both of
these redirect patterns to the Supabase allow list:

- the web preview URL you use during development
- `com.fairshare.app://**`

Provider dashboards also need their own client IDs, secrets, and callback URLs.
Do not commit provider secrets to this folder. The URL scheme is already added
to `ios/App/App/Info.plist`.

## Current product boundary

The Pay & Lend page is an interactive preview. Wallet, UPI, debit-card, and
credit-card choices do not move real money until a regulated payment provider,
server-side verification, webhooks, fraud controls, refunds, and store
disclosures are implemented.

## Official references

- Capacitor iOS: https://capacitorjs.com/docs/ios
- Capacitor environment requirements: https://capacitorjs.com/docs/getting-started/environment-setup
- Apple device testing: https://developer.apple.com/documentation/Xcode/running-your-app-on-simulated-or-physical-devices

