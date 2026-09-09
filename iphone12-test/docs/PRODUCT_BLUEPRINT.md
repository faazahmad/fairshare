# Fairshare product blueprint

## Clean-room boundary

Fairshare will reproduce common expense-sharing behavior through original code,
copy, branding, and visual design. Splitwise's private source code is neither
available nor required. Public product documentation and API shapes are used only
to understand user-visible behavior and interoperability concepts.

## Publicly verified parity target

Research completed on 2026-08-09 from Splitwise's public website, help center,
and developer documentation:

- The core loop is: create a group or friendship, add an expense, calculate
  balances, and record a settlement.
- Expenses can be divided equally, by exact amounts, percentages, shares,
  adjustments, reimbursements, or itemization.
- Each participant has both a paid share and an owed share. The difference is
  their net balance for an expense.
- Groups may simplify debts without changing any participant's total balance.
- Multiple currencies are tracked independently unless an explicit conversion is
  performed.
- Recurrences include weekly, fortnightly, monthly, and yearly intervals.
- Collaboration includes invitations, comments, edit history, and an activity
  feed.
- Advanced capabilities include search, charts, default splits, transaction
  import, receipt scanning/itemization, and currency conversion.

Primary references:

- https://www.splitwise.com/
- https://kb.splitwise.com/getting-started/how-do-i-use-splitwise
- https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense
- https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts
- https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses
- https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-a-friendship-or-group-with-multiple-currencies
- https://dev.splitwise.com/

## Product surfaces

1. Authentication and onboarding
   - Email/social login, profile, locale, default currency
   - Invite acceptance and placeholder members
2. Dashboard
   - Overall owed/owing summary, groups, friends, recent activity
3. Groups
   - Home, trip, couple, or custom group types
   - Members, expenses, balances, simplify-debts preference
4. Expenses
   - Multiple payers; equal, exact, percentage, and shares in phase one
   - Category, date, notes, receipt, recurrence, comments, audit trail
5. Settlements
   - Cash/external transfer records first; payment providers later
6. Intelligence
   - Search, filters, spending reports, budgets, reminders, receipt extraction

## Domain model

Amounts are stored as integers in the currency's minor unit. A financial entry
contains immutable participant allocations; edits create an audit event. The main
entities are:

- `User`, `Friendship`, `Group`, `GroupMember`, `Invitation`
- `Expense`, `ExpenseShare`, `Payment`, `RecurringRule`
- `Category`, `Receipt`, `Comment`, `ActivityEvent`, `Notification`

An expense is valid only when:

- the sum of all `paid` amounts equals the expense total; and
- the sum of all `owed` amounts equals the expense total.

Balances are derived, not manually edited:

`member balance = sum(paid) - sum(owed)`

Positive means the member should receive money; negative means they owe money.

## Architecture

The first slice is a React + TypeScript PWA with a pure domain layer and local
persistence. The production target is:

- React web/PWA client and optional React Native client
- TypeScript API service with schema validation
- PostgreSQL for transactional data
- Object storage for receipts and avatars
- Background jobs for recurrence, reminders, notifications, and receipt OCR
- WebSocket or server-sent events for collaborative updates

The client never uses floating-point arithmetic for stored money. API commands
are idempotent and use optimistic concurrency to prevent silent overwrites.

## Delivery roadmap

### Phase 1 — runnable product core

- Responsive authenticated-shell prototype
- Groups, expenses, split editor, balances, debt simplification, settlements
- Local persistence and unit-tested financial algorithms

### Phase 2 — production backend

- PostgreSQL schema and migrations
- Authentication, invitations, authorization, audit log
- CRUD API and real-time synchronization

### Phase 3 — collaboration and polish

- Activity, comments, notifications, recurring jobs, offline queue
- Search, filters, CSV import/export, accessibility and localization

### Phase 4 — differentiators

- Smart receipt itemization, budget insights, settle-up suggestions
- User-selected payment integrations and native mobile packaging

## Decisions still owned by the product team

- Final name and visual identity
- Initial countries/currencies and payment providers
- Free/paid packaging
- The user's custom differentiating features and their priority
