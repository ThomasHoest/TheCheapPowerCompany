# Backend / API — Epic Breakdown

> **Note:** A Backend/API functional specification does not yet exist.
> This epic breakdown is derived from ADR-001 (sections 3.1, 6.3, 7.1, 7.2, 8)
> and cross-references in the component specs (`marketing-site.md`,
> `customer-onboarding.md`, `companion-app.md`, `admin-portal.md`,
> `power-broker-integration.md`). A Backend/API spec must be written before
> implementation of these epics begins. ADR-001 §6.3 flags the absence of
> this spec as a HIGH-severity gap and §8 lists it as the single most
> important missing document.
>
> The breakdown below is intended to scope and sequence work; precise
> contract details (request/response shapes, error codes, validation rules)
> are deferred to the forthcoming Backend/API specification. Each task is
> sized to be completable in 1–3 engineering days.

**Status:** Draft v1
**Owner:** Architect / Platform engineering
**Last updated:** 2026-04-29
**Audience:** Backend engineering lead, platform engineering, tech lead

---

## Cross-cutting assumptions

These assumptions are inherited from ADR-001 and the component specs and
apply to every epic below. They are not re-stated per task.

- **Architecture:** Backend-mediated hub-and-spoke (ADR-001 §3.1). All
  external system calls (DataHub, Energi Data Service, Eloverblik,
  Signicat, Vipps MobilePay, Nets) originate from the backend; client
  devices never hold third-party credentials.
- **Database:** PostgreSQL (assumed; to be confirmed in the Backend/API
  spec). Migrations versioned in source control.
- **Hosting jurisdiction:** EU-region with Danish data-processing
  agreements (system-overview Open Question 5; default assumption).
- **Time zones:** Internal storage in UTC; customer-facing display in
  Europe/Copenhagen.
- **Currency:** DKK; spot prices stored in øre/kWh.
- **Encryption:** AES-256 at rest with KMS-managed keys; TLS 1.2 minimum
  in transit (1.3 preferred).
- **Audit log retention:** Customer state transitions 7 years (Danish
  bookkeeping rules); employee audit logs ≥5 years.
- **Spec dependency:** A Backend/API specification, a DataHub B2B
  Integration specification, and a Billing specification must exist in
  draft before implementation begins. ADR-001 §8 lists these as
  preconditions.

---

## Epic 1 — Project Setup & Infrastructure

**Goal:** A buildable, deployable backend service skeleton with
environment separation, a secrets store, and a CI/CD pipeline. No business
logic; just the foundation every later epic builds on.

**Dependencies:** None. This epic is a precondition for every other epic.

### Tasks

- **1.1 Choose runtime, language, and framework.** Decide between
  Node/TypeScript and one alternative (e.g., Go, Kotlin/Spring) based on
  the team's existing skill set and the Eloverblik/DataHub library
  ecosystem. Document the choice and rationale as a short ADR. *(1 day)*
- **1.2 Initialise the repository skeleton.** Create the project layout,
  linter configuration, formatter, type-check (where applicable), and
  unit-test runner. Add a `Makefile` or equivalent task runner. *(1 day)*
- **1.3 Set up the PostgreSQL development database.** Provision a local
  PostgreSQL instance (Docker Compose), pick a migration tool (e.g.,
  `node-pg-migrate`, `knex`, `Flyway`), commit an empty initial
  migration. *(1 day)*
- **1.4 Define environment configuration.** Implement `dev`, `staging`,
  and `prod` environment loading (12-factor `.env` model). Document
  every required environment variable in a single `ENVIRONMENT.md` or
  equivalent. *(1 day)*
- **1.5 Choose and provision a secrets store.** Pick a secrets manager
  (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) capable of
  storing DataHub production certificates (private key + cert chain) and
  Eloverblik refresh tokens (per-customer encrypted blobs). Document
  rotation policy. *(2 days)*
- **1.6 Set up the CI pipeline.** Build, lint, type-check, and unit-test
  on every push. Block merge on red CI. *(1 day)*
- **1.7 Set up the CD pipeline to staging.** On merge to `main`, deploy
  to a staging environment connected to Signicat sandbox, MobilePay
  test, and DataHub test. *(2 days)*
- **1.8 Set up the CD pipeline to production (gated).** Manual-approval
  promotion from staging. Production deploys are gated behind the
  regulatory readiness checklist (ADR-001 §7.3). *(2 days)*
- **1.9 Document local development setup.** A new engineer can clone the
  repo and have a working local stack (DB + backend) in under 30 minutes.
  *(1 day)*

---

## Epic 2 — Customer Database Schema

**Goal:** The persistent data model that every other epic reads from and
writes to. Includes the customers table, audit log, session/token store,
and idempotency support.

**Dependencies:** Epic 1.

### Tasks

- **2.1 Design and write the `customers` table migration.** Columns
  required (per `customer-onboarding.md` US-04 and §"Authentication
  Architecture"): `id` (UUID), `mitid_uuid` (unique), `cpr_hash` (salted
  hash, unique), `given_name`, `family_name`, `birthdate`, `email`,
  `phone_number` (nullable, populated by MobilePay), `supply_address_*`
  fields, `metering_point_id` (18 digits), `dso_area`, `price_area`
  (DK1/DK2), `billing_frequency` (`MONTH`/`WEEK`), `payment_method`
  (`MOBILEPAY`/`BETALINGSSERVICE`), `mobilepay_agreement_id` (nullable),
  `betalingsservice_mandate_id` (nullable), `account_status` (`PENDING`
  / `SCHEDULED` / `ACTIVE` / `CANCELLED` / `DATAHUB_REJECTED`),
  `referrer`, `created_at`, `updated_at`. *(2 days)*
- **2.2 Design and write the `customer_audit_log` table migration.**
  Per `system-overview.md` §4.5: `timestamp`, `actor_type` (`SYSTEM` /
  `CUSTOMER` / `EMPLOYEE`), `actor_id`, `action`, `target_type`,
  `target_id`, `before` (JSONB), `after` (JSONB), `reason`, `correlation_id`.
  Append-only enforcement at the database level (revoke `UPDATE`/`DELETE`
  on the application role). *(2 days)*
- **2.3 Design and write the `sessions` table migration.** Per
  `customer-onboarding.md` §"Authentication Architecture": opaque
  session ID, customer ID, issued-at, last-activity, hard-cap expiry,
  user-agent, IP. Web sessions and iOS sessions share the same store.
  *(1 day)*
- **2.4 Design and write the `oauth_refresh_tokens` table migration.**
  Encrypted-at-rest refresh tokens issued by Signicat (per customer),
  with the encryption key stored in the secrets store from task 1.5.
  *(1 day)*
- **2.5 Design and write the `idempotency_keys` table migration.** Used
  by signup endpoints, charge creation, and any non-idempotent webhook
  handler. Records request hash + response payload + expiry. *(1 day)*
- **2.6 Design and write the `signup_sessions` table migration.** A
  short-lived store for in-flight signup state (per
  `customer-onboarding.md` §"Signup Flow" — 60-minute idle timeout).
  Holds OIDC `state`, PKCE verifier (encrypted), and partial customer
  data prior to commit. *(1 day)*
- **2.7 Design and write the `customer_consent` table migration.** Per
  `customer-onboarding.md` §"Audit trail" and `companion-app.md` §7
  (Eloverblik consent). Records every contract acceptance and consent
  grant: customer ID, consent type, granted-at, IP, user-agent, signup
  session ID. Append-only. *(1 day)*
- **2.8 Write seed and fixture data.** Reproducible seed data for local
  development (10 fictitious customers across DK1 and DK2, varying
  account statuses). *(1 day)*
- **2.9 Document the schema.** ER diagram + per-table column reference
  in `docs/specifications/`. *(1 day)*

---

## Epic 3 — Authentication Middleware

**Goal:** Validate Signicat-issued ID tokens, issue and validate TCPC
session JWTs, manage session lifecycle, and enforce role-based access
control across customer and employee endpoints.

**Dependencies:** Epic 1, Epic 2.

### Tasks

- **3.1 Implement Signicat OIDC discovery + JWKS caching.** Load the
  discovery document (`https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration`)
  at startup; cache and refresh JWKS every 24 hours; refresh on
  signature-validation failure (key rotation). *(1 day)*
- **3.2 Implement Signicat ID token validation.** Validate signature,
  `iss`, `aud`, `exp`, `nbf`, and `nonce`. Reject tokens missing
  `mitid.uuid`. Per ADR-001 §3.2: discard ID tokens after claim
  extraction. *(2 days)*
- **3.3 Implement OIDC Authorization Code + PKCE token exchange.** Two
  client configurations: confidential web client (with secret) and
  public iOS client (PKCE only). *(2 days)*
- **3.4 Implement TCPC session JWT issuance.** Signed with a backend-held
  private key (RS256 or EdDSA). Claims: `sub` (customer ID), `iat`,
  `exp`, `role` (`customer`), `session_id`. *(1 day)*
- **3.5 Implement TCPC session JWT validation middleware.** Reject
  expired, malformed, or unknown-signed-by tokens. Surface a
  consistent 401 response shape. *(1 day)*
- **3.6 Implement refresh-token rotation.** On every successful refresh,
  invalidate the prior refresh token and issue a new one (defence
  against replay). *(2 days)*
- **3.7 Implement session lifecycle.** 30-day sliding window; 90-day
  hard cap (`customer-onboarding.md` §"Session management"). Inactivity
  timeout enforced at validation time. *(1 day)*
- **3.8 Implement employee authentication (email + password + TOTP).**
  Per ADR-001 §3.8: bcrypt/argon2 password hashing, TOTP via standard
  RFC 6238, 8-hour inactivity expiry, 24-hour hard cap. *(3 days)*
- **3.9 Implement role-based access control middleware.** Roles:
  `customer`, `admin`, `read_only`. Enforce server-side per route;
  forbidden requests return 403 without leaking which routes exist.
  *(1 day)*
- **3.10 Implement session revocation endpoint.** Ops/support can
  invalidate any customer's sessions on demand
  (`customer-onboarding.md` §"Session management"). *(1 day)*
- **3.11 Implement logout endpoints.** `POST /v1/auth/logout` for
  customers (revokes refresh token, clears session). Employee logout
  symmetrical. *(1 day)*

---

## Epic 4 — Price API

**Goal:** Serve current, forecast, and historical electricity prices
(øre/kWh, all-in including markup) to the marketing site, companion app,
and admin portal. Read-only from local store; daily ingestion is owned
by the Power Broker Integration epics.

**Dependencies:** Epic 1, Epic 2. Assumes a `spot_prices` and
`tariffs` schema exists from the Power Broker Integration component
(out of scope for this epic).

### Tasks

- **4.1 Define the all-in price calculation service.** Pure function
  taking spot price + supplier margin + network tariff +
  Energinet system + balancing tariff + elafgift, returning øre/kWh
  with VAT applied. Date-versioned tariff inputs (system-overview §4.1).
  *(2 days)*
- **4.2 Implement `GET /v1/prices/current`.** Returns the current hour's
  all-in price for both DK1 and DK2 (or the customer's price area if
  authenticated). Cache headers: `Cache-Control: public, max-age=60`.
  *(1 day)*
- **4.3 Implement `GET /v1/prices/today` and `GET /v1/prices/tomorrow`.**
  Per `companion-app.md` US-05: 24 hourly records each. `tomorrow`
  returns 404 (or empty + flag) before ~13:00 CET publication. *(1 day)*
- **4.4 Implement `GET /v1/prices/forecast`.** Next 24 hours from now,
  spanning the today/tomorrow boundary. Used by the companion app's
  Home tile. *(1 day)*
- **4.5 Implement `GET /v1/prices/history`.** 30-day rolling history,
  hourly granularity, per price area. Used by admin portal financials
  and trend display. *(2 days)*
- **4.6 Implement stale-data detection.** Per system-overview §4.1: if
  the latest persisted record is more than 26 hours old, every response
  includes `stale: true` and the calling surface displays a "Live
  prices temporarily unavailable" notice. Per `companion-app.md` US-04:
  90-minute threshold for the Home tile caption. *(1 day)*
- **4.7 Implement CC BY 4.0 attribution metadata.** Every price
  response includes an `attribution` field referencing
  "Energi Data Service / Energinet". *(0.5 days)*
- **4.8 Add public-endpoint rate limiting.** `GET /v1/prices/*` is
  public (no auth) for the marketing site. Rate limit per source IP and
  per origin. *(1 day; depends on Epic 9 task 9.5)*
- **4.9 Write integration tests against a seeded price store.** Cover
  the all-in calculation across the elafgift cutover (system-overview
  §5 and companion-app OQ#6) and stale-data behaviour. *(2 days)*

---

## Epic 5 — Customer Account API

**Goal:** Account read/write endpoints used by the companion app and
onboarding flow. Excludes consumption (Epic 6) and billing/subscription
mechanics that are owned by a future Billing spec.

**Dependencies:** Epic 1, Epic 2, Epic 3.

### Tasks

- **5.1 Implement `GET /v1/customer` (also `GET /v1/account`).** Returns
  the authenticated customer's master data per `companion-app.md` US-09:
  name, address, anonymised metering point ID, price area, account
  status, account creation date, payment method, billing frequency,
  Eloverblik consent state. *(1 day)*
- **5.2 Implement `PATCH /v1/account` (billing frequency).** Per
  `companion-app.md` US-10: `PATCH /v1/subscription/interval` updates
  the customer record and downstream patches the MobilePay agreement
  via the Vipps Recurring API. New interval applies from next billing
  period; current period finalises under the previous interval.
  *(2 days)*
- **5.3 Implement `GET /v1/subscription`.** Returns MobilePay agreement
  state (status, `maxAmount`, `suggestMaxAmount`, billing frequency).
  Backend caches Vipps `GET /recurring/v3/agreements/{id}` for 60
  seconds; refreshed on webhook events. *(2 days)*
- **5.4 Implement `PATCH /v1/subscription` (stop).** Per
  `companion-app.md` US-11: patches the Vipps agreement to `STOPPED`.
  Source of truth flips to `STOPPED` only on webhook arrival, not on the
  request response. *(1 day)*
- **5.5 Implement `DELETE /v1/account` (cancellation).** Per the
  Out-of-Scope referenced "Contract & Cancellation" spec
  (`customer-onboarding.md`): supports the Danish 14-day cancellation
  right and post-launch cancellation. Marks the customer `CANCELLED`,
  stops the MobilePay agreement, queues a BRS-H1 reverse-switch (or
  no-op if not yet switched), and writes the audit record. The
  reverse-switch BRS-H1 mechanics are owned by the DataHub B2B
  Integration spec (out of scope here). *(2 days)*
- **5.6 Implement `GET /v1/charges` (charge history).** Per
  `companion-app.md` §7. Lists past charge events for the authenticated
  customer; pagination. *(2 days)*
- **5.7 Implement `POST /v1/devices` (APNs token registration).** Per
  `companion-app.md` §7: app posts its APNs device token; backend
  stores it against the customer for push delivery. Re-posted on token
  rotation. *(1 day)*
- **5.8 Implement Universal Link / deep-link return endpoints.** Used
  by signup return URLs (MobilePay confirmation, Signicat OIDC
  callback). The endpoints resume the open signup session and route
  the client correctly. *(2 days)*
- **5.9 Write integration tests for the account-state machine.** Cover
  every documented transition (`PENDING` → `SCHEDULED` → `ACTIVE` →
  `CANCELLED`; `PENDING` → `DATAHUB_REJECTED`) and the audit log
  entries each transition produces. *(2 days)*

---

## Epic 6 — Consumption API

**Goal:** Mediate Eloverblik third-party API calls so consumption data
reaches the companion app and admin portal without exposing Eloverblik
tokens to client devices. Manage 1-year refresh tokens and 24-hour
access tokens server-side.

**Dependencies:** Epic 1, Epic 2, Epic 3, Epic 5 (for `customer_consent`).

### Tasks

- **6.1 Implement Eloverblik refresh-token storage.** Per ADR-001 §3.5:
  refresh tokens are 1-year, encrypted at rest, never exposed to
  clients. Schema migration if Epic 2 did not already cover it. *(1
  day)*
- **6.2 Implement the access-token exchange service.** Trade refresh
  token for a 24-hour data access token via the Eloverblik token
  endpoint; cache by customer for the lifetime of the access token;
  refresh on demand. *(2 days)*
- **6.3 Implement Eloverblik consent capture.** Once the customer
  completes consent at `eloverblik.dk` (inside
  `ASWebAuthenticationSession`), the backend receives the refresh
  token (mechanism per the Eloverblik third-party flow — to be
  confirmed in the Backend/API spec) and persists it. *(2 days)*
- **6.4 Implement `GET /v1/consumption?from=&to=`.** Per
  `companion-app.md` US-07. Fetches `POST /api/meterdata/gettimeseries/{from}/{to}/Hour`
  from Eloverblik and returns hourly kWh per the customer's metering
  point. Multiplies each hour's kWh by the all-in price for that hour
  to produce the running cost breakdown. *(3 days)*
- **6.5 Implement consumption caching layer.** Hourly Eloverblik data
  for a given customer/period is cached in the backend (Eloverblik
  publishes with up to a 24-hour delay; refetching on every app open is
  wasteful). Cache invalidation: TTL + write-through on a refresh
  webhook (if/when available). *(2 days)*
- **6.6 Implement consent-revoked detection.** When Eloverblik returns
  an auth error on token refresh, mark the customer's consent as
  revoked; surface `consentRevoked: true` in `GET /v1/customer` per
  `companion-app.md` Error States. *(1 day)*
- **6.7 Implement `getcharges` integration.** Per `companion-app.md` §7:
  `POST /api/meterdata/getcharges` returns the cost-component breakdown
  per metering point. Embed in `GET /v1/consumption` response for the
  US-07 cost-breakdown bar. *(2 days)*
- **6.8 Implement empty-state response.** When no consent exists,
  return a documented empty-state payload so `companion-app.md` US-08
  can render its "Vi mangler adgang til dit forbrug" screen. *(0.5
  days)*
- **6.9 Write integration tests with a mock Eloverblik server.** Cover
  successful fetch, expired access token (auto-refresh), revoked
  refresh token (consent flag), and Eloverblik 5xx (graceful
  degradation). *(2 days)*

---

## Epic 7 — Webhook Ingestion

**Goal:** Receive, verify, and route webhooks from Vipps MobilePay,
forward relevant events to mobile devices via APNs, and reconcile
charge/agreement state in the local store. Provide a daily
reconciliation backstop against missed webhooks.

**Dependencies:** Epic 1, Epic 2, Epic 5, Epic 9 task 9.4 (structured
logging).

### Tasks

- **7.1 Implement the webhook receiver endpoint.** A single HTTPS
  endpoint per provider (`POST /v1/webhooks/mobilepay`). Always returns
  200 OK after authenticating the request, even on application-level
  failure (provider retries are expensive); the failure is queued for
  internal retry. *(1 day)*
- **7.2 Implement MobilePay webhook signature verification.** Per
  Vipps Recurring API docs (research file): HMAC verification using a
  shared secret stored in the secrets store. Reject any unsigned or
  invalid-signature request before any side-effect. *(2 days)*
- **7.3 Implement webhook idempotency.** A given webhook event ID is
  processed exactly once. Use the `idempotency_keys` table from Epic 2
  task 2.5. *(1 day)*
- **7.4 Implement event routing for `recurring.agreement-accepted.v1`.**
  Per `customer-onboarding.md` US-05: transitions the customer's
  agreement to `ACTIVE`, captures the phone number from the payload,
  unblocks the signup confirmation screen. *(1 day)*
- **7.5 Implement event routing for `recurring.agreement-rejected.v1`.**
  Per `customer-onboarding.md` US-10: surfaces the Betalingsservice
  fallback path on the open signup session. *(1 day)*
- **7.6 Implement event routing for `recurring.agreement-stopped.v1`.**
  Per `companion-app.md` US-11 and Error States: marks the customer's
  agreement `STOPPED`, suspends the account, sends an APNs notification
  ("Dit abonnement er stoppet — kontakt os for at genstarte"). *(1
  day)*
- **7.7 Implement event routing for `recurring.charge-captured.v1`.**
  Per `companion-app.md` US-14: records the payment in the charges
  table, sends APNs notification ("Betaling gennemført"). Updates the
  failed-payments queue if the charge clears a previous failure. *(2
  days)*
- **7.8 Implement event routing for `recurring.charge-failed.v1`.** Per
  `companion-app.md` US-15: records the failure, sends APNs
  notification ("Betaling mislykkedes"), writes to the admin Failed
  Payments queue. Triggers the dunning workflow (mechanism owned by
  the future Billing spec; this epic only emits the event). *(2 days)*
- **7.9 Implement event routing for `recurring.charge-creation-failed.v1`.**
  Per `customer-onboarding.md` §"Payment Setup" webhook subscriptions.
  Records the failure, alerts ops. *(1 day)*
- **7.10 Implement APNs forwarding.** Send push notifications via
  Apple's HTTP/2 APNs API. Token-based authentication. Retry on
  delivery failure with exponential backoff. *(2 days)*
- **7.11 Implement the daily MobilePay reconciliation job.** Per
  `system-overview.md` Open Question 13: pull `GET /recurring/v3/agreements/{id}`
  and `GET /recurring/v3/agreements/{id}/charges` for every active
  customer once daily and reconcile against the local store. Alert if
  any divergence is found. *(3 days)*
- **7.12 Implement the missing-webhook alarm.** If no webhook event has
  been received in 1 hour during business hours, emit an alert per
  `system-overview.md` Open Question 13 default assumption. *(1 day)*
- **7.13 Write integration tests with replayed webhook payloads.** Use
  recorded sample payloads from MobilePay sandbox. Cover
  signature-failure, duplicate delivery, out-of-order delivery, and
  unknown-event-type cases. *(2 days)*

---

## Epic 8 — Admin API

**Goal:** Read-only and privileged-write endpoints used by the admin
portal. All endpoints role-gated to `admin` or `read_only` per ADR-001
§3.8 and `system-overview.md` §4.5.

**Dependencies:** Epic 1, Epic 2, Epic 3 (task 3.8 employee auth and
task 3.9 RBAC).

### Tasks

- **8.1 Implement `GET /v1/admin/customers`.** Search and list customers
  by name, email, metering point ID, hashed-CPR match, and account
  status. Paginated. Role: `admin` or `read_only`. *(2 days)*
- **8.2 Implement `GET /v1/admin/customers/:id`.** Per
  `system-overview.md` §4.5 customer-detail page: master data, account
  status, payment method, recent charges, recent failed payments,
  audit log excerpt. *(2 days)*
- **8.3 Implement `GET /v1/admin/financials`.** Per `system-overview.md`
  §4.5: aggregate KPIs (Active Customers, MRR, Total Margin
  Month-to-Date, current DK1/DK2 spot price). Backed by aggregate
  queries against the customer, charges, and price stores. *(3 days)*
- **8.4 Implement `GET /v1/admin/payments/failed`.** Failed-payments
  queue per `system-overview.md` §4.5 and `companion-app.md` US-15.
  Fields per row: customer, amount, failed-at, reason, retry status,
  next-retry timestamp. *(2 days)*
- **8.5 Implement `POST /v1/admin/payments/:id/retry`.** Privileged
  action: re-create a failed charge against the customer's agreement.
  Writes an audit log entry. Role: `admin` only. *(2 days)*
- **8.6 Implement `POST /v1/admin/pricing` (markup update).** Per
  `system-overview.md` §4.5: update supplier margin / markup.
  Date-versioned (effective-from timestamp); never retroactively
  changes historical prices. Writes an audit entry. Role: `admin` only.
  *(2 days)*
- **8.7 Implement `POST /v1/admin/customers/:id/deactivate`.**
  Privileged customer suspension (e.g., fraud, manual cancellation).
  Writes an audit entry. Role: `admin` only. *(1 day)*
- **8.8 Implement `GET /v1/admin/audit-log`.** Per
  `system-overview.md` §4.5: time-ordered, filterable by employee,
  action, target type, target ID. Read-only. Role: `admin` or
  `read_only`. *(2 days)*
- **8.9 Implement `POST /v1/admin/customers/:id/sessions/revoke`.**
  Force-logout a specific customer. Writes an audit entry. Role:
  `admin`. *(1 day)*
- **8.10 Implement `POST /v1/admin/mobilepay/refresh`.** Manual
  on-demand pull from MobilePay to bypass webhook lag (per
  `system-overview.md` Open Question 13 admin portal "Refresh from
  MobilePay" fallback). *(1 day)*
- **8.11 Write authorization tests for every admin endpoint.** Verify
  that `customer` role, anonymous, and (where applicable) `read_only`
  role receive 403 on privileged routes. UI-hiding alone is insufficient
  per `system-overview.md` §4.5. *(2 days)*

---

## Epic 9 — Health, Observability & Security

**Goal:** Production-readiness primitives that every other epic relies
on for safe operation. Liveness/readiness probes, structured logging,
error tracking, rate limiting, HTTPS enforcement, and dependency
hygiene.

**Dependencies:** Epic 1. Should be in place before Epic 4 onwards
ships to staging.

### Tasks

- **9.1 Implement `GET /health`.** Liveness probe: returns 200 if the
  process is up. No dependency checks. *(0.5 days)*
- **9.2 Implement `GET /ready`.** Readiness probe: returns 200 only if
  database connectivity and secrets-store connectivity are confirmed.
  Returns 503 with a structured body listing failing dependencies.
  *(1 day)*
- **9.3 Implement startup self-check.** On boot, validate that all
  required environment variables and secrets are present; refuse to
  start if any are missing. *(1 day)*
- **9.4 Implement structured JSON logging.** Every request gets a
  correlation ID propagated via `X-Correlation-ID` header. Log levels:
  DEBUG/INFO/WARN/ERROR. CPR, raw OAuth tokens, and Eloverblik tokens
  are *never* logged (per `customer-onboarding.md` Non-Functional
  Requirements). Add a unit test asserting these never appear in log
  output. *(2 days)*
- **9.5 Implement rate limiting.** Per-route, per-IP, with separate
  buckets for public endpoints (price API, marketing widget) and
  authenticated endpoints. Sliding window or token bucket. *(2 days)*
- **9.6 Implement HTTPS enforcement.** Reject HTTP requests at the
  edge; HSTS header on every response. TLS 1.2 minimum, 1.3 preferred.
  *(1 day)*
- **9.7 Implement security headers.** `Strict-Transport-Security`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`
  (where it applies). *(1 day)*
- **9.8 Implement error-tracking integration.** Pick a provider
  (Sentry, Bugsnag, Honeybadger). Scrub PII before submission (no CPR,
  no email, no MitID UUID). Per `companion-app.md` §10 the iOS app uses
  on-device MetricKit only — the backend has more latitude but PII
  scrubbing is mandatory. *(2 days)*
- **9.9 Add dependency-version pinning and vulnerability scanning.**
  Lockfile committed; CI runs a vulnerability scanner (`npm audit`,
  `pip-audit`, `cargo audit`, etc.) and fails on HIGH/CRITICAL. *(1
  day)*
- **9.10 Implement request body size limits.** Default 1 MB; per-route
  override where webhook payloads are larger. Reject oversized
  requests with 413. *(0.5 days)*
- **9.11 Implement metrics emission.** Per-endpoint p50/p95/p99
  latency, error rate, and request rate. Per
  `customer-onboarding.md` Non-Functional Requirements: P95 < 500 ms
  for non-third-party endpoints; P95 < 2 s for endpoints calling
  Signicat or MobilePay. *(2 days)*
- **9.12 Document runbooks for each health-state failure.** "What to
  do when `/ready` returns 503", "What to do when no MobilePay webhook
  has arrived in 1 hour", "What to do when the daily price ingestion
  fails". *(2 days)*

---

## Open Questions for the Backend/API specification

These are unresolved decisions the Backend/API spec must close before
implementation of the dependent epics can begin. Owners follow the
existing Open Question conventions in the component specs.

1. **Runtime, language, and framework choice.** Owner: Backend lead.
   Default assumption: Node.js + TypeScript (matches the project's
   web-leaning footprint and the broadest available libraries for
   Eloverblik/DataHub/MobilePay), with framework deferred to backend
   lead's preference. Drives every other technical choice in Epic 1.
2. **Database choice — confirm PostgreSQL.** Owner: Backend lead.
   Default assumption: PostgreSQL. Drives Epic 2 in full.
3. **Secrets store choice.** Owner: Platform engineering. Default
   assumption: AWS Secrets Manager if hosting on AWS, otherwise
   HashiCorp Vault. Drives task 1.5 and the entire DataHub certificate
   handling track in the future DataHub B2B Integration spec.
4. **Hosting jurisdiction.** Owner: Founders + Engineering (mirrors
   `system-overview.md` Open Question 5). Default assumption: EU-region
   hosting, Danish DPA. Affects every infrastructure procurement.
5. **`suggestMaxAmount` for new MobilePay agreements.** Owner: Product
   + Finance (mirrors ADR-001 §6.4). Default assumption: 3,000 DKK per
   `customer-onboarding.md` US-05 (binding pending resolution). Affects
   Epic 5 (subscription endpoints) and Epic 7 (charge-failed handling).
6. **CPR re-supply mechanism for BRS-H1.** Owner: DataHub B2B
   Integration spec (mirrors ADR-001 §6.6). Default assumption: TBD.
   Affects whether the customer table needs a short-lived encrypted
   CPR column (Epic 2).
7. **Webhook signature secret rotation policy.** Owner: Platform
   engineering. Default assumption: rotate annually with a 30-day
   overlap window. Affects Epic 7 task 7.2.
8. **APNs key rotation policy.** Owner: Platform engineering. Default
   assumption: yearly with documented runbook. Affects Epic 7 task
   7.10.
9. **Read-only vs admin role split.** Owner: Operations + Engineering.
   Default assumption: per ADR-001 §3.8 only `admin` and `read_only`
   exist; `read_only` covers customer search, financials, and audit
   log; all writes are `admin`. Affects every admin endpoint
   role-gate.
10. **Internal billing scheduler ownership.** Owner: Platform
    engineering (mirrors ADR-001 §6.8 and §7.2). Default assumption:
    out of scope for this Backend/API epic breakdown — owned by the
    forthcoming Billing spec. The webhook ingestion in Epic 7 emits
    events the scheduler will consume but does not implement
    scheduling itself.

---

## Resolved Decisions

| Question | Decision | Source |
|---|---|---|
| Architectural pattern | Backend-mediated hub-and-spoke | ADR-001 §3.1 |
| Customer authentication protocol | OIDC Authorization Code + PKCE via Signicat | ADR-001 §3.2 |
| Recurring billing API | Vipps MobilePay Recurring v3, `pricing.type=VARIABLE` | ADR-001 §3.3 |
| Spot price source | Energi Data Service polling | ADR-001 §3.4 |
| Customer meter data source | Eloverblik third-party API | ADR-001 §3.5 |
| Supplier-switch protocol | Energinet DataHub B2B ebIX XML (BRS-H1) | ADR-001 §3.6 |
| Employee authentication | Email + password + TOTP 2FA, never MitID | ADR-001 §3.8 |
| Roles supported in v1 | `admin` and `read_only` only | ADR-001 §3.8 |
| Client devices receive third-party tokens | No, never (Eloverblik tokens, MobilePay merchant credentials, DataHub certificates) | ADR-001 §3.1, §3.5 |
| TCPC issues its own session JWTs (independent of Signicat) | Yes | ADR-001 §3.2 |
| ID tokens persisted | No — discarded after claim extraction | ADR-001 §3.2 |
| Webhook source of truth | Yes — webhooks are the source of truth for charge state; the app never polls billing status | system-overview §5 |
| Audit log retention | 7 years for customer state transitions; ≥5 years for employee actions | system-overview §5 + §4.5 |
| Time zone in storage / display | UTC stored / Europe/Copenhagen displayed | system-overview §5 |

---

## Sequencing recommendation

A sane execution order, given the dependency graph:

1. **Epic 1** (foundation) — must complete before any other epic.
2. **Epic 2** (schema) and **Epic 9** (observability) in parallel.
3. **Epic 3** (auth) — gates every authenticated endpoint.
4. **Epic 4** (price API) — public, can ship to the marketing site
   ahead of customer onboarding.
5. **Epic 5** (account API), **Epic 6** (consumption), **Epic 7**
   (webhooks) in parallel — each touches different external systems.
6. **Epic 8** (admin) — depends on Epics 2, 3, 5, 7 having stable
   schemas and event flows.

Epic 9 tasks 9.1–9.6 are required-before-staging. Epic 9 tasks 9.7–9.12
can land iteratively but must complete before production launch.
