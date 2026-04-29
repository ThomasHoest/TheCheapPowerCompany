# Specification: Admin Web Portal

## Overview

The Admin Web Portal is the internal employee tool for The Cheap Power Company.
It is used by company staff (operations, finance, customer support) to monitor
the customer base, observe live business metrics (revenue, broker costs,
margin), manage pricing parameters, and resolve customer-facing issues such as
failed MobilePay payments. It is **not** customer-facing — it is authenticated
with employee credentials (not MitID), runs in a web browser, and is intended
for use on desktop screens. Visual design follows the company brand: green and
light, functional, no marketing flourishes.

This specification covers the v1 portal. Customer self-service, public website
content, and the customer mobile/web experience are specified separately.

## Goals

- Give employees a single dashboard view of the health of the business: how
  many active customers, monthly recurring revenue (MRR), total margin, and
  the current spot price for both Danish price areas (DK1, DK2).
- Allow any employee to find a specific customer in seconds and view their
  account, billing history, MobilePay subscription status, and per-customer
  margin.
- Surface failed payments and stuck MobilePay agreements so support can act
  on them within the same business day.
- Provide finance employees with period-over-period revenue, broker cost, and
  margin breakdowns suitable for monthly close.
- Allow authorised employees to adjust the company-wide markup (per-kWh
  margin) and subscription fee, with the change recorded in an audit log.
- Provide minimal, safe support actions: resend onboarding link, deactivate
  account, retry failed charge.

## Out of Scope (this version)

- Customer-facing portal or app (separate spec).
- MitID-based authentication (employees do not authenticate with MitID).
- Per-customer custom pricing (a single company-wide markup and subscription
  fee apply to all customers in v1).
- Automated dunning workflows beyond MobilePay's built-in retries (manual
  retry only in v1).
- Direct DataHub B2B (ebIX) integration UI — DataHub onboarding flows for
  new customers (BRS-H1) are operated by backend services and are not part
  of the portal UI in v1.
- CSV export and accounting system integration (see Open Questions).
- Multi-employee chat, ticketing, or CRM features.
- Internationalisation — Danish + English UI strings only, no other locales.

## Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| Platform | Web (responsive, desktop-first) | Internal tool used at desks; no native app needed |
| Authentication | Employee login (email + password + TOTP 2FA), backed by company IdP | MitID is for customers, not staff; 2FA required for any system handling customer financial data |
| Customer record store | The Cheap Power Company's own backend database | Source of truth for customer account, contract, billing |
| Metering / consumption data | Energinet DataHub via Eloverblik third-party API (or DataHub B2B once onboarded as a supplier) | Per power-broker research, this is the only source of meter readings |
| Spot price data | Energi Data Service `Elspotprices` dataset (DK1 + DK2), polled daily after Nord Pool publishes | Free, unauthenticated REST/JSON; once-daily update cadence |
| Payment data | Vipps MobilePay Recurring API v3 (variable-amount agreements) | Per MobilePay research; primary billing channel |
| Margin formula | `customer bill − broker cost − network fees` (see Data Model) | Defined for v1; broker cost = spot × kWh consumed |
| Currency / display | DKK; amounts shown in DKK with two decimals; spot prices shown in øre/kWh | Danish market convention |
| Time zone | Europe/Copenhagen for all UI displays; UTC stored in DB | Matches `HourDK` field in Energi Data Service |
| Browser support | Latest two versions of Chrome, Firefox, Safari, Edge | Internal tool, controlled environment |

## User Stories with Acceptance Criteria

### Dashboard

**US-01 — Live business dashboard**
> As an employee, I want a single dashboard showing total active customers,
> total MRR, total margin, and the current DK1/DK2 spot price, so that I can
> see the health of the business at a glance when I log in.

**Acceptance criteria:**
- The dashboard is the default landing page after employee login.
- It displays four primary KPI cards: (a) Active Customers (integer count),
  (b) Monthly Recurring Revenue (DKK, sum of subscription fee × active
  customers, displayed with two decimals and thousand separators), (c) Total
  Margin Month-to-Date (DKK), (d) Current Spot Price for DK1 and DK2, both
  in øre/kWh with the timestamp of the price hour.
- The Active Customers card shows a delta vs. 7 days ago (e.g., "+12 this
  week").
- The MRR card shows a delta vs. previous full month.
- The spot price card shows the price for the current hour (Europe/Copenhagen)
  and indicates whether the data is fresh (≤ 25 hours old) or stale.
- The dashboard refreshes data on page load and via a manual "Refresh" control;
  no auto-polling required in v1.
- Loading the dashboard with all four KPIs populated completes in under
  3 seconds on a typical office network.

**US-02 — Spot price trend at a glance**
> As an employee, I want to see today's hourly spot price curve for DK1 and DK2
> on the dashboard, so I can sense-check current pricing.

**Acceptance criteria:**
- A line chart on the dashboard shows the 24 hourly spot prices for the
  current Danish day, with separate lines for DK1 and DK2.
- The X-axis is hour of day (00–23), Y-axis is øre/kWh.
- Hovering a point shows the exact price and hour.
- If next-day prices are already published (after ~13:00 CET), a toggle lets
  the user switch between today and tomorrow.

### Customer List

**US-03 — Searchable customer list**
> As an employee, I want a paginated, searchable, filterable table of all
> customers, so I can locate a specific customer or segment quickly.

**Acceptance criteria:**
- The customer list is reachable from the main navigation.
- Default view shows: name, customer ID, metering point ID, status (Active /
  Pending / Deactivated), MobilePay agreement status (Active / Pending /
  Stopped / Failed), MRR contribution (DKK), margin month-to-date (DKK),
  joined date.
- Free-text search box filters by name, email, customer ID, or metering point
  ID and matches as the user types (debounced 250 ms).
- Column filters: status, MobilePay agreement status, joined-date range.
- Columns are sortable.
- Page size 50 by default; pagination controls at top and bottom.
- Clicking a row navigates to the Customer Detail page for that customer.
- A list of 10,000 customers loads the first page in under 2 seconds.

### Customer Detail

**US-04 — View an individual customer**
> As an employee, I want a single page showing everything about one customer,
> so I can answer support questions or investigate billing issues.

**Acceptance criteria:**
- The page shows, in clearly grouped sections:
  - **Account:** name, email, phone, address, customer ID, status, joined
    date, deactivated date (if any).
  - **Metering point:** metering point ID, grid area (DK1 or DK2), DSO
    (netselskab) name, current consumption month-to-date in kWh, last meter
    reading timestamp.
  - **Current bill:** billing period, kWh consumed, spot cost, network fees,
    subscription fee, our margin, total amount, status (Pending / Charged /
    Failed).
  - **Payment history:** reverse-chronological list of MobilePay charges with
    date, amount, status (Captured / Failed / Refunded / Cancelled),
    `chargeId`.
  - **MobilePay subscription:** `agreementId`, status (Pending / Active /
    Stopped / Expired), variable max amount, last status-change timestamp.
  - **Margin on this customer:** lifetime margin, month-to-date margin,
    last-month margin.
- All amounts in DKK with two decimals; consumption in kWh with one decimal.
- If consumption data is unavailable for the period, the consumption field
  displays "Data unavailable" rather than 0.
- The page links to support actions (US-09, US-10, US-11) gated by role.

### Financial Overview

**US-05 — Period financial overview**
> As a finance employee, I want a financial summary by period showing total
> revenue, total broker cost, and total margin, so I can produce monthly
> reports.

**Acceptance criteria:**
- A "Financials" page shows, for a user-selected period (default: current
  month):
  - Total revenue (sum of customer bills charged, DKK).
  - Total broker cost (sum across customers of spot price × kWh consumed in
    period, DKK).
  - Total network fees passed through (DKK).
  - Total subscription fees collected (DKK).
  - Total margin (revenue − broker cost − network fees, DKK).
  - Margin as a percentage of revenue.
  - Customer count active during the period.
- Period selector supports: current month, last month, last 3 months, last
  12 months, custom range.
- A breakdown table shows the same metrics per calendar month within the
  selected range.
- A "Top 10 customers by margin" and "Bottom 10 customers by margin" table
  is shown for the selected period; rows link to Customer Detail.
- All figures reconcile: sum of per-customer margins for the period equals
  the displayed total margin (within rounding tolerance of 0.01 DKK per
  customer).

### Price / Margin Management

**US-06 — View current pricing parameters**
> As an employee, I want to see the current company-wide per-kWh markup and
> subscription fee, so I know what we are charging customers today.

**Acceptance criteria:**
- A "Pricing" page displays the current per-kWh markup (in øre/kWh) and
  monthly subscription fee (in DKK), each with the timestamp of when it
  was last changed and the employee who changed it.
- A history table shows all previous values with effective-from and
  effective-to timestamps.

**US-07 — Update pricing parameters**
> As an admin employee, I want to update the per-kWh markup and the
> subscription fee, so the company can adjust pricing.

**Acceptance criteria:**
- The Pricing page has an "Edit" control visible only to employees with the
  `admin` role.
- The form accepts a new per-kWh markup (decimal, øre/kWh) and a new
  monthly subscription fee (decimal, DKK).
- Saving requires a confirmation step that displays the new values and the
  number of customers affected.
- Confirmation dialog text reads verbatim: "You are about to change pricing
  for {N} active customers. New markup: {X} øre/kWh. New subscription fee:
  {Y} DKK/month. Effective from now. This action is logged."
- On save, the change is recorded with timestamp and acting employee, and
  applies to all bills generated after the save timestamp.
- Bills already issued are not retroactively recalculated.
- A read-only employee attempting to edit sees a disabled control and a
  tooltip "Admin role required".

### Payment Management

**US-08 — Failed payments queue**
> As a support employee, I want to see all failed MobilePay charges in one
> place, so I can investigate and resolve them.

**Acceptance criteria:**
- A "Payments" page lists all charges in `Failed` state across all customers,
  newest first.
- Columns: customer name, customer ID, charge amount, due date, failure
  reason (from MobilePay event payload), `chargeId`, `agreementId`.
- A row action "Retry" is available to admin employees and triggers a manual
  re-attempt via the MobilePay Recurring API.
- A row action "Open customer" navigates to the Customer Detail page.
- A separate tab on the same page shows the **MobilePay webhook event log**:
  raw event type (e.g., `recurring.charge-failed.v1`), timestamp, customer
  ID, `agreementId`, `chargeId`, and the JSON payload (collapsed by default,
  expandable). Filterable by event type and date range. Last 90 days visible
  by default.

### Customer Support Actions

**US-09 — Resend onboarding link**
> As a support employee, I want to resend the customer onboarding link, so a
> customer who lost the original email can complete sign-up.

**Acceptance criteria:**
- On the Customer Detail page, a "Resend onboarding link" button is shown
  for customers in `Pending` status only.
- Clicking the button sends an email with a fresh onboarding link to the
  customer's registered email address.
- A success toast displays "Onboarding link sent to {email}".
- The action is recorded in the customer's activity log with timestamp and
  acting employee.
- The button is disabled and shows a tooltip "Customer is already active"
  for active customers.

**US-10 — Deactivate account**
> As an admin employee, I want to deactivate a customer account, so we can
> stop billing a customer who has churned or requested closure.

**Acceptance criteria:**
- A "Deactivate" button on Customer Detail is visible only to admin
  employees and only for `Active` customers.
- Clicking it opens a confirmation modal with text verbatim: "Deactivate
  {customer name}? This stops the MobilePay agreement, halts future billing,
  and initiates DataHub deregistration. This cannot be undone from the
  portal."
- Confirming triggers: (a) `PATCH agreement → STOPPED` on MobilePay,
  (b) flag account as `Deactivated` in the backend, (c) enqueue DataHub
  deregistration job.
- The customer's status changes immediately to `Deactivated` in the UI.
- The action is logged with timestamp, acting employee, and reason field
  (free text, required, max 500 characters).
- Already-billed charges are not refunded automatically.

**US-11 — Retry a failed charge**
> As an admin employee, I want to manually retry a failed charge, so I can
> recover payment after the MobilePay automatic retries have all failed.

**Acceptance criteria:**
- The "Retry" action (from US-08 or from Customer Detail payment history)
  creates a new MobilePay charge with the same amount and a new `orderId`
  derived from the original.
- A confirmation modal shows: charge amount, customer name, due date (today
  by default).
- After submission, the new charge appears in the customer's payment history
  with status `Pending`.
- The action is logged with the original `chargeId`, the new `chargeId`,
  timestamp, and acting employee.

## Data Model

The portal does not own the source data; it reads from the company backend,
which aggregates and persists data from DataHub, MobilePay, and Energi Data
Service.

**Per-customer margin (for a given period):**

```
margin_customer = revenue_customer − broker_cost_customer − network_fees_customer

where:
  revenue_customer    = sum of captured MobilePay charge amounts for the period
                        (DKK, ex-VAT for internal reporting)
  broker_cost_customer = Σ (hourly_kWh × spot_price_hour_priceArea)
                        summed over every hour the customer consumed in the period
  network_fees_customer = pass-through DSO + Energinet tariffs for the period
                          (sourced from Eloverblik `getcharges`)
```

The customer's `priceArea` (DK1 or DK2) is determined by their metering
point's grid area.

**Total business metrics (aggregations):**

| Metric | Definition |
|---|---|
| Active Customers | Count of customers with `status = Active` and an `agreementStatus = ACTIVE` MobilePay agreement |
| MRR | Σ (current monthly subscription fee) over all Active Customers |
| Total Revenue (period) | Σ revenue_customer over all customers for the period |
| Total Broker Cost (period) | Σ broker_cost_customer over all customers for the period |
| Total Network Fees (period) | Σ network_fees_customer over all customers for the period |
| Total Margin (period) | Total Revenue − Total Broker Cost − Total Network Fees |
| Margin % | Total Margin / Total Revenue (display 0% if Total Revenue = 0) |

**Notes:**
- elafgift (electricity tax) drops to ~1 øre/kWh from 1 January 2026 — the
  margin calculation does not include taxes (they are pass-through to the
  state and outside our P&L).
- VAT (25%) is collected from the customer and remitted; not part of margin.
- Rounding: store all monetary values in øre (integer); display in DKK with
  two decimals.

**Audit log entries** (written for every privileged action):

| Field | Description |
|---|---|
| `timestamp` | UTC ISO 8601 |
| `employeeId` | Acting employee |
| `action` | Enum (e.g., `pricing.update`, `customer.deactivate`, `charge.retry`) |
| `targetType` | e.g., `customer`, `pricing`, `charge` |
| `targetId` | ID of the affected entity |
| `before` | Snapshot of relevant prior state |
| `after` | Snapshot of new state |
| `reason` | Free-text reason (where applicable) |

## Access Control

Two roles in v1:

| Role | Permissions |
|---|---|
| `read_only` | View dashboard, customer list, customer detail, financial overview, payment lists, pricing page (read), webhook event log |
| `admin` | All `read_only` permissions, plus: edit pricing, deactivate account, retry charge, resend onboarding link |

**Authentication:**
- Email + password + TOTP 2FA (mandatory).
- Sessions expire after 8 hours of inactivity; absolute session lifetime
  24 hours.
- Logout is available from a top-right user menu on every page.
- Failed-login lockout after 5 consecutive failed attempts within 10 minutes
  (account locked for 15 minutes).
- Employees cannot self-register; an existing admin provisions accounts.

**Role enforcement:**
- Role checks are enforced on the backend (UI hiding alone is not sufficient).
- A `read_only` user calling a privileged endpoint receives HTTP 403 and the
  UI displays "You do not have permission to perform this action".

## Error States

| Scenario | Expected Behaviour |
|---|---|
| DataHub / Eloverblik data unavailable for a customer's metering point | Customer Detail consumption fields display "Data unavailable — last successful sync: {timestamp}". The bill section flags "Bill cannot be calculated until consumption data is restored". Dashboard aggregates exclude affected customers and a banner reads "Consumption data partially unavailable: {N} customers affected". |
| Energi Data Service spot price fetch fails | Dashboard spot price card displays the most recent cached price with an amber "Stale — last updated {timestamp}" badge. If the cached price is older than 25 hours, the badge is red and reads "Spot price stale — pricing decisions paused". |
| MobilePay API unavailable when retrying a charge | The retry attempt fails fast with an inline error: "MobilePay is unreachable. Please retry in a few minutes." No partial state is written. The original failed charge remains in the failed queue. |
| MobilePay webhook delivery delayed or missing | Charge status in the portal may lag actual MobilePay state. A "Refresh from MobilePay" button on the Payments page triggers a backend reconciliation pull. Webhook event log shows last received event timestamp; if older than 1 hour, a banner reads "No webhook events received in the last hour — possible delivery issue". |
| Pricing update save fails (backend error) | Form remains populated, an inline error reads "Could not save pricing change. The previous values are still in effect. Please try again." No audit log entry is written. |
| Employee session expired during a privileged action | The action is rejected with HTTP 401, the UI redirects to the login page, and after re-login the employee returns to the page they were on (action is **not** auto-replayed). |
| Customer not found by ID in a deep link | The Customer Detail page shows a 404-style empty state with text "Customer not found. They may have been deleted or the link is incorrect." and a link back to the customer list. |
| DataHub deregistration job fails after deactivation | The customer remains `Deactivated` in the portal but a banner on Customer Detail reads "DataHub deregistration pending — operations team notified". The job is retried automatically and the banner clears on success. |

## Non-Functional Requirements

- **Latency:** Dashboard initial render under 3 seconds on a 50 Mbps office
  network. Customer list first page under 2 seconds for 10,000 customers.
  Customer Detail page under 2 seconds.
- **Availability:** Internal tool — target 99.5% during Danish business hours
  (08:00–18:00 Europe/Copenhagen, weekdays). Outside hours, best-effort.
- **Browser support:** Latest two versions of Chrome, Firefox, Safari, Edge.
  No support required for IE or mobile browsers in v1.
- **Accessibility:** WCAG 2.1 AA for keyboard navigation, contrast, and form
  labels. Screen-reader compatibility is desirable but not blocking for v1.
- **Security:** All traffic over HTTPS. CSP, HSTS, secure cookies, SameSite
  strict for the session cookie. 2FA mandatory. No customer payment card or
  full bank details ever displayed (MobilePay handles credentials).
- **Privacy:** Employee actions on customer records are audit-logged. The
  audit log retention is at least 5 years (regulatory baseline; confirm
  with legal — see Open Questions).
- **Data freshness:** Spot prices refreshed daily within 30 minutes of Nord
  Pool publication (~13:00–13:30 CET). Consumption data refreshed at least
  daily per customer. MobilePay webhook events processed within 60 seconds
  of receipt.
- **Localisation:** UI strings in Danish; English available as a per-employee
  preference. All amounts in DKK; spot prices in øre/kWh; consumption in
  kWh; timestamps in Europe/Copenhagen with explicit time-zone display.
- **Design:** Brand-aligned green and light theme, functional layout. No
  marketing imagery in the portal.

## Open Questions

1. **Export to CSV / accounting integration** — The spec does not define an
   export feature. Finance will need monthly numbers in their accounting
   system (e.g., Dinero, e-conomic, or Microsoft Dynamics). Owner: Finance
   lead. Default assumption if unresolved: provide CSV export of the
   Financials page tables in v1, and defer accounting-system integration
   to a later version.
2. **Multi-region treatment (DK1 vs DK2)** — Should the dashboard and
   financial overview surface DK1 and DK2 metrics separately as well as
   combined? Margin can vary materially between price areas. Owner: Product
   + Finance. Default assumption: show combined totals primarily, with a
   DK1/DK2 breakdown available as a tab in v1.
3. **Role definitions beyond admin / read-only** — Do we need a distinct
   "support" role with deactivation rights but not pricing-edit rights, or
   a "finance" role with financials access only? Owner: COO. Default
   assumption: two roles (`admin`, `read_only`) in v1; expand if needed.
4. **Audit log retention period and access** — How long must audit logs be
   retained, and which roles may read them? Owner: Legal / Compliance.
   Default assumption: 5 years retention, viewable by `admin` only via a
   future admin tool (no UI in v1 portal).
5. **Manual charge creation (off-cycle billing)** — Should admins be able to
   create a one-off MobilePay charge for arbitrary amounts (e.g., to bill a
   missed period)? Currently only retry of a failed charge is in scope.
   Owner: Product. Default assumption: not in v1.
6. **Customer note-taking / activity feed** — Should support employees be
   able to add free-text notes to a customer record? Owner: Product. Default
   assumption: not in v1; the audit log is the only record.
7. **Webhook event retention** — How long is the MobilePay webhook event log
   retained for browsing in the UI? Default assumption: 90 days in UI; full
   history retained in backend storage.
8. **DataHub B2B vs Eloverblik third-party API** — Once registered as a
   supplier, do we read meter data via DataHub B2B (ebIX) directly, or
   continue via Eloverblik third-party API? Owner: Engineering / Energinet
   liaison. Default assumption: portal is agnostic to source — backend
   abstracts it; flagged here because it affects data-freshness SLAs.

## Resolved Decisions

| Question | Decision |
|---|---|
| Authentication for employees | Email + password + TOTP 2FA, mandatory. Not MitID. |
| Pricing model | Single company-wide per-kWh markup and monthly subscription fee in v1. No per-customer custom pricing. |
| Currency | DKK. Spot price in øre/kWh; bill amounts in DKK with two decimals. |
| Time zone | Europe/Copenhagen for display; UTC stored. |
| Default landing page | Dashboard. |
| Spot price source | Energi Data Service `Elspotprices` dataset (DK1 + DK2). Daily polling at ~13:15 CET. |
| Payment provider | Vipps MobilePay Recurring API v3 with VARIABLE pricing. |
| Margin formula | `revenue − broker_cost − network_fees`. Taxes (elafgift, VAT) are pass-through and excluded from margin. |
| Roles in v1 | `admin` and `read_only`. |
| Manual retry availability | Admin only; creates a new charge with a derived `orderId`. |
| Pricing change effect | Forward-only; existing bills not retroactively recalculated. |
| Browser support | Latest two versions of Chrome, Firefox, Safari, Edge. |
