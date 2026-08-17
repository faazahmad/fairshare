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
