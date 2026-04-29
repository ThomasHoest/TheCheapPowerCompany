# Epics: Admin Web Portal

This document breaks the Admin Web Portal specification
(`docs/specifications/admin-portal.md`) into eight implementation epics.
Each epic is sized so that all tasks within it can be picked up by one or
two engineers and completed in 1–3 engineering days each.

Authentication, role model, and session policy are governed by ADR-001
section 3.8: email + password + TOTP 2FA, mandatory; sessions expire after
8 hours of inactivity with a hard 24-hour cap; `admin` and `read_only` are
the only roles in v1; role enforcement is server-side.

The portal is a thin client over The Cheap Power Company's backend.
External systems (DataHub, Eloverblik, Energi Data Service, Vipps MobilePay)
are not called from the browser — the backend mediates all of them.

---

## Epic 1 — Project Setup

**Goal:** Stand up the web application skeleton, the authentication
middleware, the routing structure, and the design-token integration so that
all subsequent feature epics have a working chassis to build on.

**Dependencies:** None. This epic must complete before any other.

**Decisions to record at start of epic:**
- Web framework: **Next.js (App Router)** preferred for desktop-first SSR
  with strong TypeScript and middleware support. SvelteKit is a viable
  alternative; pick one and document in an ADR before Task 1.1 starts.
- Component library: headless primitives (Radix or Headless UI) styled with
  the company design tokens. No marketing component kits.

### Task 1.1 — Initialise the web project

**Description:** Create a new web app in the chosen framework (Next.js or
SvelteKit) under `apps/admin-portal/` (or the established repo layout).
Configure TypeScript strict mode, ESLint, Prettier, and a basic build
pipeline. Set up the dev server on a non-default port to avoid colliding
with the marketing site.

**Acceptance criteria checklist:**
- [ ] `npm run dev` (or equivalent) serves a "Hello, admin portal" page on localhost.
- [ ] `npm run build` produces a production bundle without errors.
- [ ] TypeScript strict mode is enabled and passes on a clean tree.
- [ ] ESLint and Prettier configs match the rest of the monorepo (if one exists) or are committed as new defaults.
- [ ] An ADR is filed in `docs/decisions/` recording the framework choice and rationale.

**Definition of done:** PR merged to main with green CI; framework choice
ADR linked from `docs/specifications/admin-portal.md` Technical Context.

**Spec mapping:** Foundation for all user stories — no direct spec story.

---

### Task 1.2 — Authentication middleware (email + password + TOTP)

**Description:** Implement the login flow against the backend session
endpoint. The login screen takes email and password, then prompts for a
6-digit TOTP code. On success the backend returns a session cookie
(HTTP-only, Secure, SameSite=Strict). All non-public routes are guarded
by middleware that redirects unauthenticated requests to `/login`.

**Acceptance criteria checklist:**
- [ ] `/login` page renders email + password fields, then a TOTP field after first-step success.
- [ ] Submitting valid credentials + valid TOTP sets the session cookie and redirects to the dashboard.
- [ ] Submitting invalid credentials shows "Email or password is incorrect" without disclosing which field failed.
- [ ] Five consecutive failed attempts within 10 minutes show "Account locked. Try again in 15 minutes."
- [ ] All non-`/login` routes redirect unauthenticated visitors to `/login`.
- [ ] Logout link in the top-right user menu clears the session cookie and redirects to `/login`.
- [ ] Session cookie has `HttpOnly`, `Secure`, `SameSite=Strict` attributes.

**Definition of done:** End-to-end login + logout works against a backend
stub; middleware integration tested with Playwright; security headers
verified with `curl -I`.

**Spec mapping:** Access Control section of the spec; gating for all user
stories.

---

### Task 1.3 — Session lifetime and inactivity timeout

**Description:** Enforce 8-hour inactivity expiry and 24-hour absolute
session lifetime. The portal must detect an expired session, redirect to
login, and after re-login return the user to the page they were on (without
auto-replaying the action that triggered re-auth).

**Acceptance criteria checklist:**
- [ ] After 8 hours with no request to the backend, the next request returns 401 and the UI redirects to `/login`.
- [ ] After 24 hours from initial login, the session is invalid regardless of activity.
- [ ] The login page accepts a `?return_to=` query parameter and redirects there after successful re-login.
- [ ] Re-login does not re-execute the privileged action that caused the session check to fail.
- [ ] A countdown badge in the user menu shows "Session expires in {hh:mm}".

**Definition of done:** Tests cover both timeout paths and the
return-to-page behaviour; manual QA confirms countdown.

**Spec mapping:** Access Control; Error States row "Employee session
expired during a privileged action".

---

### Task 1.4 — Role-aware routing structure

**Description:** Lay out the page routes used by every feature epic and
add a role-aware navigation shell. Routes that require `admin` are guarded
client-side (UI hide) and the corresponding backend calls enforce the role
server-side (verified by Task 1.2's session). Read-only users see the same
nav with admin-only controls visibly disabled.

**Acceptance criteria checklist:**
- [ ] Top-level routes exist as empty placeholders: `/dashboard`, `/customers`, `/customers/[id]`, `/financials`, `/pricing`, `/payments`, `/audit-log` (admin only), `/settings`.
- [ ] A persistent left or top nav lists all routes the current user may visit.
- [ ] Routes flagged admin-only (e.g., `/audit-log`) are hidden for `read_only` users.
- [ ] Direct navigation to an admin-only route as a `read_only` user shows a 403 page with text "You do not have permission to view this page".
- [ ] The user menu shows the logged-in employee's email and role.

**Definition of done:** Unit tests cover the route guard; manual QA with a
seeded read-only and admin account.

**Spec mapping:** Access Control; foundation for US-07, US-10, US-11.

---

### Task 1.5 — Design token integration (green and light theme)

**Description:** Wire up the company design tokens (colours, typography,
spacing, radii) as CSS custom properties or a Tailwind theme config. Build
a small primitives library (`Button`, `Input`, `Card`, `Table`, `Badge`,
`Modal`, `Toast`) styled with the tokens. No marketing imagery; functional
layout only.

**Acceptance criteria checklist:**
- [ ] A `theme.css` or equivalent token file exposes the green primary, neutral light backgrounds, and accent colours.
- [ ] All primitives render correctly in light mode (the only mode for v1).
- [ ] Storybook (or equivalent) shows each primitive with usage notes.
- [ ] Contrast checks pass WCAG 2.1 AA for body text and primary buttons.
- [ ] No primitive uses inline marketing colours or stock imagery.

**Definition of done:** Storybook or Ladle running in CI; primitives
imported by at least one placeholder page.

**Spec mapping:** Non-Functional Requirements — Design.

---

## Epic 2 — Dashboard

**Goal:** Build the default landing page so employees see business health
at a glance: active customers, MRR, total margin month-to-date, current
DK1/DK2 spot price, and a 24-hour spot price chart.

**Dependencies:** Epic 1.

### Task 2.1 — KPI card components

**Description:** Build a reusable `KpiCard` primitive with optional delta
indicator and stale-data badge. Each card has a title, primary value,
optional secondary line (delta or timestamp), and a status colour.

**Acceptance criteria checklist:**
- [ ] `KpiCard` accepts `title`, `value`, `delta` (optional), `subtext` (optional), `status` (`fresh` | `stale` | `error`).
- [ ] Numbers render with thousand separators and two decimals where applicable.
- [ ] DKK amounts display the `DKK` suffix; øre/kWh values display `øre/kWh`.
- [ ] An error status renders an error icon and an inline retry control.
- [ ] Storybook entry covers all four status states.

**Definition of done:** PR merged with Storybook entry; component used by
at least one card on the dashboard.

**Spec mapping:** US-01 (precondition).

---

### Task 2.2 — Active Customers, MRR, and Total Margin cards

**Description:** Wire the first three KPI cards to backend endpoints.
Active Customers shows count plus 7-day delta. MRR shows current value plus
delta vs. previous full month. Total Margin shows month-to-date margin in DKK.

**Acceptance criteria checklist:**
- [ ] Active Customers card displays an integer with thousand separators and a "+N this week" or "-N this week" delta.
- [ ] MRR card displays DKK with two decimals and a delta vs. previous full month (signed).
- [ ] Total Margin card displays DKK with two decimals for the current calendar month-to-date.
- [ ] Each card calls a single backend endpoint and is independently retryable.
- [ ] Initial render of all three cards completes within 1.5 seconds on a typical office network.

**Definition of done:** Three endpoints stubbed, mocked in tests, and
wired to live cards behind a feature flag.

**Spec mapping:** US-01.

---

### Task 2.3 — Spot price card (DK1 + DK2) and freshness badge

**Description:** Display the current hour's spot price for DK1 and DK2
in øre/kWh, alongside the timestamp of the price hour. Apply a freshness
badge: green (fresh, ≤ 25 hours old), amber ("Stale — last updated
{timestamp}"), red ("Spot price stale — pricing decisions paused" if
older than 25 hours).

**Acceptance criteria checklist:**
- [ ] Card shows DK1 and DK2 prices side by side with the price-hour timestamp in Europe/Copenhagen.
- [ ] Freshness badge colour and text follow the rules above exactly.
- [ ] If the backend returns no cached price at all, the card shows an error state with a retry control.
- [ ] Hovering the timestamp shows the UTC equivalent in a tooltip.

**Definition of done:** Card renders correctly for fresh, stale, and
red-stale fixtures; CC BY 4.0 attribution to "Energi Data Service /
Energinet" is shown in the dashboard footer.

**Spec mapping:** US-01; Error States row "Energi Data Service spot price
fetch fails".

---

### Task 2.4 — 24-hour spot price chart with today/tomorrow toggle

**Description:** Render a line chart of the 24 hourly spot prices for DK1
and DK2 for the current Danish day. X-axis is hour of day (00–23); Y-axis
is øre/kWh. Hover shows the exact price and hour. If next-day prices are
published (after ~13:00 CET), a toggle switches between today and tomorrow.

**Acceptance criteria checklist:**
- [ ] Two lines (DK1, DK2) render with distinct colours that meet contrast guidelines.
- [ ] X-axis labels show 00, 06, 12, 18; tick marks for every hour.
- [ ] Hovering a point shows price and hour in a tooltip.
- [ ] If tomorrow's data is available, a "Today / Tomorrow" toggle is enabled; otherwise the toggle is disabled with a tooltip "Tomorrow's prices not yet published".
- [ ] The chart is keyboard navigable (left/right arrows step through hours).

**Definition of done:** Chart matches the spec's described layout; hover
and keyboard navigation tested manually and via Playwright.

**Spec mapping:** US-02.

---

### Task 2.5 — Refresh control and load performance

**Description:** Add a "Refresh" button on the dashboard that re-issues
all data fetches. Confirm dashboard initial render completes under 3
seconds on a 50 Mbps connection.

**Acceptance criteria checklist:**
- [ ] Refresh control is visible top-right of the dashboard.
- [ ] Clicking refresh triggers all KPI and chart fetches in parallel.
- [ ] During refresh, each card shows a loading skeleton without flashing the whole page.
- [ ] No auto-polling occurs in v1 (verified by absence of background timers in dev tools).
- [ ] A Lighthouse run on a populated dashboard reports time-to-interactive under 3 seconds.

**Definition of done:** Performance budget recorded in CI; manual QA on a
throttled connection.

**Spec mapping:** US-01 (acceptance criterion on auto-refresh and 3-second budget).

---

### Task 2.6 — Dashboard error and partial-data states

**Description:** Implement the dashboard's degraded states: consumption
data partially unavailable banner, stale spot price banner, and per-card
error fallbacks.

**Acceptance criteria checklist:**
- [ ] If any customer has missing consumption data, a banner reads "Consumption data partially unavailable: {N} customers affected".
- [ ] If the cached spot price is older than 25 hours, a red banner reads "Spot price stale — pricing decisions paused".
- [ ] If a single KPI fetch fails, only that card shows the error and retry control; the rest of the dashboard remains functional.
- [ ] Banners are dismissible for the current session but reappear on refresh if the condition persists.

**Definition of done:** All three states reachable via test fixtures; QA
sign-off.

**Spec mapping:** Error States rows for DataHub data unavailability and
stale spot price.

---

## Epic 3 — Customer List

**Goal:** A searchable, filterable, sortable, paginated customer table
that loads the first page in under 2 seconds for 10,000 customers.

**Dependencies:** Epic 1.

### Task 3.1 — Customer table layout and pagination

**Description:** Render the customer list with the spec's default columns:
name, customer ID, metering point ID, status, MobilePay agreement status,
MRR contribution, margin month-to-date, joined date. Pagination of 50 rows
per page with controls at top and bottom.

**Acceptance criteria checklist:**
- [ ] Table renders all eight columns with the correct units (DKK with two decimals; date in Europe/Copenhagen).
- [ ] Pagination controls show "Page X of Y" and "Showing N–M of T".
- [ ] Page size is 50 by default; page-size selector is not required in v1.
- [ ] Clicking a row navigates to `/customers/[id]`.
- [ ] First page of 10,000 customers loads in under 2 seconds against a seeded backend.

**Definition of done:** Manual QA against a 10,000-row seed; pagination
covered by Playwright.

**Spec mapping:** US-03.

---

### Task 3.2 — Free-text search

**Description:** Add a search input above the table. Matches by name,
email, customer ID, or metering point ID. Debounce at 250 ms.

**Acceptance criteria checklist:**
- [ ] Typing in the search input issues a backend query 250 ms after the last keystroke.
- [ ] Results table updates without a full page reload.
- [ ] Empty results show "No customers match {query}".
- [ ] The search query is reflected in the URL (`?q=…`) so refreshes preserve state.

**Definition of done:** Debounce verified by request count in tests; URL
sync covered.

**Spec mapping:** US-03.

---

### Task 3.3 — Column filters

**Description:** Add column filters for status (Active / Pending /
Deactivated), MobilePay agreement status (Active / Pending / Stopped /
Failed), and joined-date range.

**Acceptance criteria checklist:**
- [ ] Status filter is a multi-select; selecting none means "all".
- [ ] MobilePay agreement status filter is a multi-select.
- [ ] Joined-date range uses two date inputs (from / to) with calendar pickers.
- [ ] Active filters appear as removable chips above the table.
- [ ] Filters are reflected in the URL so a filtered view is shareable.

**Definition of done:** All three filters tested with combined queries.

**Spec mapping:** US-03.

---

### Task 3.4 — Column sorting

**Description:** Make every column sortable. Clicking a header toggles
ascending → descending → unsorted.

**Acceptance criteria checklist:**
- [ ] All eight default columns are sortable.
- [ ] Sort state is reflected in the URL (`?sort=mrr&dir=desc`).
- [ ] Sort indicator (arrow) appears on the active column.
- [ ] Sort is applied server-side, not client-side, to support pagination over the full set.

**Definition of done:** Server-side sort verified; manual QA across
columns.

**Spec mapping:** US-03.

---

### Task 3.5 — CSV export hook

**Description:** Add a "Export CSV" button (admin-only in v1) that
triggers a server-side export of the currently filtered, sorted result
set. The button calls a backend endpoint that streams a CSV; the UI shows
progress and surfaces the resulting download.

**Acceptance criteria checklist:**
- [ ] Button visible only to `admin` users; tooltip "Admin role required" for `read_only`.
- [ ] Clicking the button initiates a download named `customers-{ISO timestamp}.csv`.
- [ ] CSV contains the same columns as the table view in the same order.
- [ ] Filters and sort applied to the table are applied to the export.
- [ ] If the export takes longer than 2 seconds, an inline progress indicator is shown.

**Definition of done:** Export tested with a 10,000-row dataset; opens
correctly in Excel and Numbers (UTF-8 BOM where required).

**Spec mapping:** Out of Scope notes CSV export is deferred at the
spec level (Open Question 1), but the **hook** (button + endpoint contract)
is in scope. Default assumption per the spec is to provide CSV export on
the Financials page in v1; mirror that capability here.

---

## Epic 4 — Customer Detail

**Goal:** A single page that shows everything about one customer and hosts
the role-gated support actions.

**Dependencies:** Epic 1; partial overlap with Epic 7 (payment data shapes).

### Task 4.1 — Account, metering point, and current bill sections

**Description:** Render three of the six sections from the spec: Account
(name, email, phone, address, customer ID, status, joined date, deactivated
date if any), Metering Point (metering point ID, grid area DK1/DK2, DSO
name, current consumption month-to-date in kWh, last meter-reading
timestamp), and Current Bill (period, kWh, spot cost, network fees,
subscription fee, our margin, total amount, status).

**Acceptance criteria checklist:**
- [ ] All listed fields render in the order specified, in clearly visually grouped cards.
- [ ] DKK amounts have two decimals; consumption is in kWh with one decimal.
- [ ] If consumption data is unavailable, the consumption field reads "Data unavailable" instead of 0.
- [ ] If consumption data is unavailable, the bill section reads "Bill cannot be calculated until consumption data is restored".
- [ ] Last meter-reading timestamp shows in Europe/Copenhagen with explicit time-zone label.

**Definition of done:** All three sections render against fixtures
covering happy path and missing-consumption case.

**Spec mapping:** US-04.

---

### Task 4.2 — Payment history table

**Description:** Reverse-chronological list of MobilePay charges for the
customer with date, amount, status (Captured / Failed / Refunded /
Cancelled), and `chargeId`. Each row links to the failed-charge queue if
the row is failed.

**Acceptance criteria checklist:**
- [ ] Table renders charges newest first.
- [ ] Status column uses a coloured `Badge` per status (green Captured, red Failed, neutral Refunded, grey Cancelled).
- [ ] Clicking a `chargeId` copies it to the clipboard with a toast confirmation.
- [ ] Failed rows show an inline "Retry" action for `admin` users (delegated to Task 4.4).
- [ ] Pagination of 25 rows; older rows fetched on demand.

**Definition of done:** Table tested with mixed-status fixtures; copy-to-
clipboard confirmed in all supported browsers.

**Spec mapping:** US-04 payment history acceptance criteria.

---

### Task 4.3 — MobilePay agreement state badge and margin section

**Description:** Show the MobilePay subscription block (`agreementId`,
status badge — Pending / Active / Stopped / Expired, variable max amount,
last status-change timestamp) and the per-customer margin block (lifetime,
month-to-date, last month).

**Acceptance criteria checklist:**
- [ ] Agreement status renders as a `Badge` with distinct colours per state.
- [ ] Variable max amount displays in DKK with two decimals.
- [ ] Margin block shows three values; each is a DKK amount with two decimals.
- [ ] If the customer has no agreement, the section reads "No MobilePay agreement on file".

**Definition of done:** All four agreement states covered; margin numbers
reconcile with the per-customer margin endpoint contract.

**Spec mapping:** US-04 MobilePay subscription and margin sections.

---

### Task 4.4 — Support action: Resend onboarding link

**Description:** Add a "Resend onboarding link" button on Customer Detail
visible only for `Pending` customers. Clicking sends an email with a fresh
onboarding link to the registered email address.

**Acceptance criteria checklist:**
- [ ] Button visible for `Pending` customers; disabled with tooltip "Customer is already active" for `Active` customers; hidden for `Deactivated`.
- [ ] On click, the backend endpoint is called and a success toast reads "Onboarding link sent to {email}".
- [ ] On failure, an error toast reads "Could not send onboarding link. Please try again." with no partial state.
- [ ] The action is recorded server-side in the customer's activity log; UI confirms the audit entry on next page load.

**Definition of done:** Happy path and error path covered; audit-log
entry verified in backend.

**Spec mapping:** US-09.

---

### Task 4.5 — Support action: Deactivate account

**Description:** Add a "Deactivate" button on Customer Detail visible only
to `admin` users and only for `Active` customers. Clicking opens a
confirmation modal with the verbatim text from the spec; confirming triggers
the MobilePay agreement stop, the backend account flag, and the DataHub
deregistration enqueue.

**Acceptance criteria checklist:**
- [ ] Button hidden for `read_only` users and for non-`Active` customers.
- [ ] Confirmation modal text reads verbatim: "Deactivate {customer name}? This stops the MobilePay agreement, halts future billing, and initiates DataHub deregistration. This cannot be undone from the portal."
- [ ] Modal includes a required reason field (free text, max 500 characters).
- [ ] Confirming triggers the backend deactivation endpoint; on success the customer's status updates to `Deactivated` immediately.
- [ ] If the backend reports DataHub deregistration is pending or has failed, a banner appears reading "DataHub deregistration pending — operations team notified".
- [ ] Action is logged with timestamp, acting employee, and reason.

**Definition of done:** All three downstream effects (MobilePay stop,
account flag, DataHub enqueue) verified against a backend stub; banner
states tested.

**Spec mapping:** US-10; Error States row for DataHub deregistration
failure.

---

## Epic 5 — Financial Overview

**Goal:** A "Financials" page giving finance employees period-over-period
revenue, broker cost, network fees, subscription, and margin breakdowns
suitable for monthly close, with DK1/DK2 split and a CSV export.

**Dependencies:** Epic 1.

### Task 5.1 — Period selector

**Description:** Build the period selector supporting current month, last
month, last 3 months, last 12 months, and custom range. Selection persists
in the URL.

**Acceptance criteria checklist:**
- [ ] Five preset options plus a custom-range option.
- [ ] Custom range opens two date pickers (from / to); both required.
- [ ] Selecting a period updates the URL as `?period=current_month` or `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- [ ] Page reload restores the selected period from the URL.
- [ ] Default is current month.

**Definition of done:** All presets verified; URL round-trip tested.

**Spec mapping:** US-05.

---

### Task 5.2 — Headline metrics for the selected period

**Description:** Show seven headline metrics for the selected period:
total revenue, total broker cost, total network fees, total subscription
fees, total margin, margin %, and active-during-period customer count.

**Acceptance criteria checklist:**
- [ ] All seven values render in DKK (or as a percentage / integer where applicable) with two decimals.
- [ ] Margin % displays "0%" if total revenue is 0.
- [ ] All seven values come from a single backend endpoint scoped to the selected period.
- [ ] If the backend reports any per-customer reconciliation drift greater than 0.01 DKK, a warning banner appears reading "Margin reconciliation variance detected — finance lead notified".

**Definition of done:** Reconciliation tested with a fixture that
introduces known drift.

**Spec mapping:** US-05 (reconciliation acceptance criterion).

---

### Task 5.3 — Per-month breakdown table

**Description:** A table with one row per calendar month within the
selected range, showing the same metrics as the headline.

**Acceptance criteria checklist:**
- [ ] Rows ordered most-recent month first.
- [ ] Columns match the headline metrics order.
- [ ] Sum of all row values equals the headline value (within 0.01 DKK per customer rounding tolerance).
- [ ] Selecting "current month" shows a single row.
- [ ] Selecting "last 12 months" shows up to 12 rows including the current partial month.

**Definition of done:** Reconciliation across rows and headline verified.

**Spec mapping:** US-05.

---

### Task 5.4 — Revenue/cost/margin chart

**Description:** Stacked or grouped bar chart per month within the
selected range, showing revenue, broker cost, and margin.

**Acceptance criteria checklist:**
- [ ] Chart x-axis is months in the selected range.
- [ ] Three series (revenue, broker cost, margin) with distinct AA-contrast colours.
- [ ] Hovering a bar shows the precise DKK value.
- [ ] Chart updates when the period selector changes.
- [ ] Chart is keyboard navigable across months.

**Definition of done:** Chart renders against fixtures; accessibility
review passed.

**Spec mapping:** US-05 (period chart implied by spec).

---

### Task 5.5 — DK1 / DK2 split tab

**Description:** A second tab on the Financials page that shows the same
headline metrics and per-month breakdown split by price area (DK1 and
DK2). Per spec Open Question 2, default assumption is to provide this as
a tab in v1.

**Acceptance criteria checklist:**
- [ ] Tab labels: "Combined" (default) and "DK1 / DK2 split".
- [ ] Split tab shows two side-by-side columns of metrics, one per price area.
- [ ] Sum of DK1 + DK2 metrics equals the combined view (within rounding tolerance).
- [ ] Per-month breakdown table in the split tab has DK1 and DK2 sub-columns under each metric.

**Definition of done:** Split values reconcile against combined view.

**Spec mapping:** US-05; Open Question 2 default assumption.

---

### Task 5.6 — Top 10 / Bottom 10 customers by margin

**Description:** Two tables on the Financials page showing the top 10
and bottom 10 customers by margin for the selected period. Each row links
to Customer Detail.

**Acceptance criteria checklist:**
- [ ] Top 10 table sorted by margin descending; bottom 10 ascending.
- [ ] Columns: rank, customer name, customer ID, margin (DKK), kWh consumed, revenue.
- [ ] Clicking a row navigates to `/customers/[id]`.
- [ ] If the period contains fewer than 10 customers in either direction, the available rows are shown with a count.

**Definition of done:** Tables verified against the per-customer margin
fixture.

**Spec mapping:** US-05 (Top/Bottom 10 acceptance criterion).

---

### Task 5.7 — CSV export of Financials tables

**Description:** "Export CSV" button (admin-only) that exports the
per-month breakdown and the top/bottom 10 tables as a single CSV (or a
zip of CSVs) for the selected period.

**Acceptance criteria checklist:**
- [ ] Button visible only to `admin`; tooltip "Admin role required" for `read_only`.
- [ ] Export filename is `financials-{period}.csv` or `.zip` containing labelled CSVs.
- [ ] Selected period and DK1/DK2 split state are reflected in the export.
- [ ] CSV opens cleanly in Excel and Numbers (UTF-8 with BOM where needed).

**Definition of done:** Export validated end-to-end; file naming reviewed
with finance.

**Spec mapping:** US-05; Open Question 1 default assumption (CSV export of
Financials tables in v1).

---

## Epic 6 — Pricing Management

**Goal:** Allow employees to view current pricing parameters and (admins
only) update them with audit-logged confirmation.

**Dependencies:** Epic 1.

### Task 6.1 — View current pricing and history

**Description:** A `/pricing` page showing the current per-kWh markup
(øre/kWh) and monthly subscription fee (DKK) with last-changed timestamp
and changing employee. Below, a history table of all previous values with
effective-from and effective-to timestamps.

**Acceptance criteria checklist:**
- [ ] Current values displayed prominently with units (øre/kWh, DKK).
- [ ] "Last changed by {employee} on {timestamp}" line below the current values.
- [ ] History table reverse-chronological with effective-from, effective-to, markup, fee, and changing employee.
- [ ] First entry's effective-to reads "Current".
- [ ] Page accessible to both `admin` and `read_only`.

**Definition of done:** History table tested with multiple historical
entries.

**Spec mapping:** US-06.

---

### Task 6.2 — Edit pricing form (admin-only)

**Description:** An "Edit" button visible only to admins opens a form
with two inputs: new per-kWh markup (decimal, øre/kWh) and new monthly
subscription fee (decimal, DKK). The form does not submit until the user
confirms via the modal in Task 6.3.

**Acceptance criteria checklist:**
- [ ] Edit button hidden for `read_only` users; replaced with a disabled control and tooltip "Admin role required" if visible.
- [ ] Inputs accept decimals; validation rejects negative values and non-numeric input.
- [ ] An "Effective from" field is shown but defaults to "now" and is read-only in v1 (per spec acceptance criterion: "applies to all bills generated after the save timestamp").
- [ ] Form preserves current values as placeholders.

**Definition of done:** Validation tested; role gating tested.

**Spec mapping:** US-07.

---

### Task 6.3 — Confirmation modal with verbatim text

**Description:** Saving the form opens a confirmation modal with the
exact text from the spec, populated with the new values and the affected
customer count. Confirming submits to the backend; cancelling preserves
form state.

**Acceptance criteria checklist:**
- [ ] Modal text reads verbatim: "You are about to change pricing for {N} active customers. New markup: {X} øre/kWh. New subscription fee: {Y} DKK/month. Effective from now. This action is logged."
- [ ] {N}, {X}, {Y} substitution accuracy verified by tests.
- [ ] Confirm button is the primary action; Cancel is secondary.
- [ ] Cancelling returns to the form without losing entered values.
- [ ] Confirming triggers the backend save and shows a success toast "Pricing updated".

**Definition of done:** Verbatim text covered by snapshot test;
substitution tested with edge values.

**Spec mapping:** US-07.

---

### Task 6.4 — Save error handling and audit log linkage

**Description:** Handle backend save failures and ensure the action is
audit-logged on success. On failure, the form remains populated and an
inline error appears.

**Acceptance criteria checklist:**
- [ ] On save failure, inline error reads exactly "Could not save pricing change. The previous values are still in effect. Please try again."
- [ ] Form values are preserved across failure.
- [ ] No audit log entry is written on failure.
- [ ] On success, an audit log entry is created server-side (verified via the audit log viewer in Epic 8).
- [ ] The success path updates the history table without a full page reload.

**Definition of done:** Both paths covered; audit linkage verified.

**Spec mapping:** US-07; Error States row "Pricing update save fails".

---

## Epic 7 — Payment Management

**Goal:** A failed-charge queue with retry action and a MobilePay webhook
event log so support can resolve payment issues within the same business
day.

**Dependencies:** Epic 1; partial overlap with Epic 4 (charge data shape).

### Task 7.1 — Failed-charge queue table

**Description:** A `/payments` page showing all charges in `Failed` state
across all customers, newest first. Columns: customer name, customer ID,
charge amount, due date, failure reason (from MobilePay event payload),
`chargeId`, `agreementId`.

**Acceptance criteria checklist:**
- [ ] Table renders all seven columns in the spec's order.
- [ ] Default sort is by failure timestamp descending.
- [ ] Customer name links to `/customers/[id]`.
- [ ] `chargeId` and `agreementId` columns include copy-to-clipboard buttons.
- [ ] First page loads in under 2 seconds for a 1,000-row failed queue.

**Definition of done:** Table tested with seeded failures; performance
verified.

**Spec mapping:** US-08.

---

### Task 7.2 — Retry action (admin-only)

**Description:** A row-level "Retry" action visible only to `admin` users.
Opens a confirmation modal showing charge amount, customer name, and due
date (today by default). Confirming creates a new MobilePay charge with a
new `orderId` derived from the original.

**Acceptance criteria checklist:**
- [ ] Retry action hidden for `read_only` users.
- [ ] Confirmation modal shows charge amount (DKK), customer name, and due date.
- [ ] Confirming calls the backend retry endpoint; success toast reads "Retry submitted — new charge {chargeId} created".
- [ ] If MobilePay is unreachable, an inline error reads exactly "MobilePay is unreachable. Please retry in a few minutes." and no partial state is written.
- [ ] The new charge appears in the customer's payment history with status `Pending`.
- [ ] Action is logged with original `chargeId`, new `chargeId`, timestamp, and acting employee.

**Definition of done:** Both happy path and unreachable-API path tested.

**Spec mapping:** US-11; Error States row "MobilePay API unavailable when
retrying a charge".

---

### Task 7.3 — Charge status badges

**Description:** A reusable `ChargeStatusBadge` component with consistent
colours and labels across the portal: Pending (amber), Captured (green),
Failed (red), Refunded (neutral), Cancelled (grey).

**Acceptance criteria checklist:**
- [ ] Component accepts a status enum and renders the matching colour and label.
- [ ] Colours meet WCAG 2.1 AA contrast on the portal background.
- [ ] Component used by Customer Detail payment history (Task 4.2), failed-charge queue, and the webhook event log.
- [ ] Storybook entry covers all five states.

**Definition of done:** Component reused across at least three pages.

**Spec mapping:** US-08, US-04 supporting components.

---

### Task 7.4 — MobilePay webhook event log tab

**Description:** A second tab on `/payments` showing raw MobilePay webhook
events: event type, timestamp, customer ID, `agreementId`, `chargeId`, and
JSON payload (collapsed by default, expandable). Filterable by event type
and date range. Last 90 days visible.

**Acceptance criteria checklist:**
- [ ] Tab labels: "Failed charges" (default) and "Webhook events".
- [ ] Webhook table columns: event type, timestamp, customer ID, `agreementId`, `chargeId`, payload (collapsed).
- [ ] Each row has an expand toggle that pretty-prints the JSON payload.
- [ ] Event-type filter is a multi-select (e.g., `recurring.charge-failed.v1`, `recurring.charge-captured.v1`).
- [ ] Date-range filter defaults to the last 7 days; the maximum range visible in UI is 90 days.
- [ ] Backend retains full history beyond 90 days for compliance; UI does not expose it.

**Definition of done:** All filters tested; 90-day boundary respected;
JSON pretty-print verified.

**Spec mapping:** US-08 webhook log; Open Question 7 default assumption
(90 days in UI).

---

### Task 7.5 — Webhook delivery health indicator

**Description:** A banner on the Payments page that warns when no webhook
events have been received in the last hour, and a "Refresh from MobilePay"
button that triggers a backend reconciliation pull.

**Acceptance criteria checklist:**
- [ ] If the most recent webhook event is older than 1 hour, a banner reads exactly "No webhook events received in the last hour — possible delivery issue".
- [ ] A "Refresh from MobilePay" button triggers a backend reconciliation pull and shows a toast on completion.
- [ ] The button is admin-only; tooltip "Admin role required" for `read_only`.
- [ ] The banner clears automatically when a new event arrives.

**Definition of done:** Banner state and reconciliation triggered against
fixtures.

**Spec mapping:** Error States row "MobilePay webhook delivery delayed or
missing".

---

## Epic 8 — Access Control & Security

**Goal:** Harden the portal with role-based route guards, an admin-only
audit log viewer, a TOTP setup flow for newly-provisioned employees, and a
session management UI.

**Dependencies:** Epic 1 (auth middleware).

### Task 8.1 — Role-based route guards (server + client)

**Description:** Implement server-side role checks on all privileged
backend endpoints (this is the source of truth) and matching client-side
UI hides/disables. A `read_only` user calling a privileged endpoint must
receive HTTP 403; the UI displays a fixed error.

**Acceptance criteria checklist:**
- [ ] All privileged endpoints (pricing edit, deactivate, retry charge, resend onboarding link, CSV exports, audit log read) require `admin`.
- [ ] A `read_only` user receiving HTTP 403 sees a toast reading exactly "You do not have permission to perform this action".
- [ ] Direct route navigation as `read_only` to an admin-only page renders the 403 page from Task 1.4.
- [ ] Server-side role check is independent of any UI hiding (verified by direct API calls in tests).

**Definition of done:** End-to-end tests cover both roles against every
privileged endpoint.

**Spec mapping:** Access Control section.

---

### Task 8.2 — Audit log viewer (admin-only)

**Description:** An `/audit-log` page (admin-only) showing audit entries
with timestamp, employee, action, target type, target ID, before/after
snapshots (collapsed JSON), and reason. Filterable by action, target type,
and date range. Retention: 5 years (UI shows up to the configured retention
window; backend stores at least 5 years per Open Question 4 default).

**Acceptance criteria checklist:**
- [ ] Page accessible only to `admin`; `read_only` redirected to the 403 page.
- [ ] Columns: timestamp (Europe/Copenhagen), employee, action, target type, target ID, reason.
- [ ] Each row has an expand toggle showing before/after snapshots as pretty-printed JSON.
- [ ] Filters: action (multi-select enum), target type (multi-select enum), date range.
- [ ] Default date range: last 30 days; maximum: 5 years.
- [ ] Page loads first 50 entries in under 2 seconds.

**Definition of done:** Filters and expand behaviour verified; access
control tested.

**Spec mapping:** Audit log entries data model; Open Question 4 default
assumption.

---

### Task 8.3 — TOTP setup flow for new employees

**Description:** First-login flow for a newly-provisioned employee:
backend marks the account as "TOTP not yet configured"; the portal forces
the user through a setup screen showing a QR code (TOTP URI) and a
recovery code list. The user must enter a valid TOTP code to complete
setup before accessing any other page.

**Acceptance criteria checklist:**
- [ ] On first login, the employee is redirected to `/settings/totp-setup` regardless of the requested URL.
- [ ] The setup screen shows a QR code, a manual-entry secret, and 10 recovery codes.
- [ ] Recovery codes are downloadable as a `.txt` file once and shown only once.
- [ ] Setup completes when the user enters a valid TOTP code generated from the new secret.
- [ ] After setup, the user is redirected to the dashboard and the account is marked TOTP-configured.
- [ ] If the user closes the setup screen before completing it, the next login forces them back through it.

**Definition of done:** Flow tested end-to-end; recovery code download
verified.

**Spec mapping:** Access Control — Authentication subsection
(2FA mandatory, employees provisioned by admin).

---

### Task 8.4 — Session management UI

**Description:** A `/settings/sessions` page showing the current employee's
active sessions (own device list) with last-active timestamp and a "Sign
out" action per session. The current session is labelled "This device".
Admins additionally see a global session management panel that can revoke
any employee's sessions.

**Acceptance criteria checklist:**
- [ ] Page lists all active sessions for the logged-in user with device label, IP, last-active timestamp.
- [ ] "Sign out" per session revokes that session immediately on the backend.
- [ ] Signing out the current session redirects to `/login`.
- [ ] Admins see a "Manage all employees" panel with an employee selector and a "Revoke all sessions" action.
- [ ] All revocation actions are audit-logged.

**Definition of done:** Both self and admin-revocation flows tested;
audit entries verified.

**Spec mapping:** Access Control — session lifetime and admin
responsibilities; supports the 8h / 24h policy by giving employees and
admins a manual override.

---

### Task 8.5 — Failed-login lockout enforcement (UI surface)

**Description:** Surface the backend-enforced 5-failed-attempts-in-10-
minutes lockout in the login UI. After lockout, the login page shows a
clear message and disables the form for 15 minutes.

**Acceptance criteria checklist:**
- [ ] After the backend reports lockout, the login form is disabled and a message reads exactly "Account locked. Try again in 15 minutes."
- [ ] A countdown shows the remaining minutes.
- [ ] The form re-enables automatically after the lockout window without requiring a page reload.
- [ ] Lockout state is per-account, not per-browser-session (verified by attempting from a second device).

**Definition of done:** Lockout flow tested with the backend stub.

**Spec mapping:** Access Control — failed-login lockout policy.

---

### Task 8.6 — Security headers and CSP

**Description:** Configure HTTPS-only delivery, HSTS, a strict
Content-Security-Policy, and the secure cookie attributes called out in
the spec.

**Acceptance criteria checklist:**
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` set on all responses.
- [ ] CSP restricts scripts and styles to the portal's own origin and approved CDNs (no inline scripts).
- [ ] Session cookie has `HttpOnly`, `Secure`, `SameSite=Strict`.
- [ ] CSP report endpoint is wired to the backend logging pipeline.
- [ ] All pages load with no CSP violations in dev tools.

**Definition of done:** Headers verified with `curl -I` and SecurityHeaders.com
scan grade A or better.

**Spec mapping:** Non-Functional Requirements — Security.

---

## Open Items Carried Forward from the Spec

These open questions remain unresolved and influence epic execution:

1. **CSV export scope (Open Question 1).** Default assumption — CSV
   export of Financials in v1; mirrored to the customer list. Implemented
   in Tasks 3.5 and 5.7.
2. **DK1/DK2 separate metrics (Open Question 2).** Default assumption —
   combined primary, split available as a tab. Implemented in Task 5.5.
3. **Roles beyond admin / read-only (Open Question 3).** Default
   assumption — two roles in v1. No further work; revisit in v2.
4. **Audit log retention (Open Question 4).** Default assumption — 5
   years backend retention; admin-only viewer in v1. Implemented in Task 8.2.
5. **Manual charge creation (Open Question 5).** Not in v1. No tasks.
6. **Customer notes (Open Question 6).** Not in v1. No tasks.
7. **Webhook UI retention (Open Question 7).** Default assumption — 90
   days in UI; full history backend-side. Implemented in Task 7.4.
8. **DataHub B2B vs Eloverblik source (Open Question 8).** Backend
   abstracts source; portal is agnostic. No portal-side work required.

Engineers picking up tasks should re-check the corresponding spec section
before starting; if any of the above defaults have been overturned by the
team, the affected task acceptance criteria must be updated in the same
PR that implements them.
