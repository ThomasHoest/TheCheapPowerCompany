# Epics & Tasks: Backend / API
**Version:** 1.0
**Status:** Draft
**Date:** 2026-04-29
**References:** ADR-001 (sections 3.1, 6.3, 7.1, 7.2, 8); cross-references in `marketing-site.md`, `customer-onboarding.md`, `companion-app.md`, `admin-portal.md`, `power-broker-integration.md`, `system-overview.md`

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

---

## Overview

This component delivers the backend service that mediates every external system call (DataHub, Energi Data Service, Eloverblik, Signicat, Vipps MobilePay, Nets) and serves the marketing site, companion app, and admin portal. It is the critical-path dependency for almost every other component: customer onboarding, companion app account/consumption views, admin portal, and the power-broker integration all rely on its endpoints, schema, auth, and webhook handling. Cross-cutting assumptions inherited from ADR-001 and the component specs include backend-mediated hub-and-spoke architecture (ADR-001 §3.1), PostgreSQL persistence, EU-region hosting under a Danish DPA, UTC storage with Europe/Copenhagen display, DKK currency with spot prices in øre/kWh, AES-256-at-rest with KMS-managed keys, TLS 1.2 minimum (1.3 preferred), 7-year customer-state and ≥5-year employee audit log retention, and the precondition that Backend/API, DataHub B2B Integration, and Billing specifications exist in draft before implementation begins (ADR-001 §8).

---

## Epic Index

| # | Epic | Spec References |
|---|---|---|
| E-01 | Project Setup & Infrastructure | ADR-001 §7.3 |
| E-02 | Customer Database Schema | customer-onboarding.md US-04, system-overview.md §4.5, companion-app.md §7 |
| E-03 | Authentication Middleware | ADR-001 §3.2, §3.8; customer-onboarding.md §"Authentication Architecture" |
| E-04 | Price API | companion-app.md US-04, US-05; system-overview.md §4.1, §5 |
| E-05 | Customer Account API | companion-app.md US-09, US-10, US-11; customer-onboarding.md |
| E-06 | Consumption API | ADR-001 §3.5; companion-app.md US-07, US-08, §7 |
| E-07 | Webhook Ingestion | customer-onboarding.md US-05, US-10; companion-app.md US-11, US-14, US-15; system-overview.md OQ#13 |
| E-08 | Admin API | ADR-001 §3.8; system-overview.md §4.5; companion-app.md US-15 |
| E-09 | Health, Observability & Security | customer-onboarding.md NFRs; companion-app.md §10 |

---

## E-01 — Project Setup & Infrastructure

A buildable, deployable backend service skeleton with environment separation, a secrets store, and a CI/CD pipeline; no business logic, just the foundation every later epic builds on. Precondition for every other epic.

- [ ] **T-0101** Choose runtime, language, and framework — decide between Node/TypeScript and one alternative (e.g., Go, Kotlin/Spring) based on the team's existing skill set and the Eloverblik/DataHub library ecosystem; document the choice and rationale as a short ADR (1 day)
- [ ] **T-0102** Initialise the repository skeleton — create the project layout, linter configuration, formatter, type-check (where applicable), and unit-test runner; add a `Makefile` or equivalent task runner (1 day)
- [ ] **T-0103** Set up the PostgreSQL development database — provision a local PostgreSQL instance via Docker Compose, pick a migration tool (e.g., `node-pg-migrate`, `knex`, `Flyway`), commit an empty initial migration (1 day)
- [ ] **T-0104** Define environment configuration — implement `dev`, `staging`, and `prod` environment loading (12-factor `.env` model); document every required environment variable in a single `ENVIRONMENT.md` or equivalent (1 day)
- [ ] **T-0105** Choose and provision a secrets store — pick a secrets manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) capable of storing DataHub production certificates (private key + cert chain) and Eloverblik refresh tokens (per-customer encrypted blobs); document rotation policy (2 days)
- [ ] **T-0106** Set up the CI pipeline — build, lint, type-check, and unit-test on every push; block merge on red CI (1 day)
- [ ] **T-0107** Set up the CD pipeline to staging — on merge to `main`, deploy to a staging environment connected to Signicat sandbox, MobilePay test, and DataHub test (2 days)
- [ ] **T-0108** Set up the CD pipeline to production (gated) — manual-approval promotion from staging; production deploys are gated behind the regulatory readiness checklist (ADR-001 §7.3) (2 days)
- [ ] **T-0109** Document local development setup — a new engineer can clone the repo and have a working local stack (DB + backend) in under 30 minutes (1 day)

---

## E-02 — Customer Database Schema

The persistent data model that every other epic reads from and writes to: customers table, audit log, session/token store, and idempotency support. Depends on E-01.

- [ ] **T-0201** Design and write the `customers` table migration — columns required per `customer-onboarding.md` US-04 and §"Authentication Architecture": `id` (UUID), `mitid_uuid` (unique), `cpr_hash` (salted hash, unique), `given_name`, `family_name`, `birthdate`, `email`, `phone_number` (nullable, populated by MobilePay), `supply_address_*` fields, `metering_point_id` (18 digits), `dso_area`, `price_area` (DK1/DK2), `billing_frequency` (`MONTH`/`WEEK`), `payment_method` (`MOBILEPAY`/`BETALINGSSERVICE`), `mobilepay_agreement_id` (nullable), `betalingsservice_mandate_id` (nullable), `account_status` (`PENDING`/`SCHEDULED`/`ACTIVE`/`CANCELLED`/`DATAHUB_REJECTED`), `referrer`, `created_at`, `updated_at` (2 days)
- [ ] **T-0202** Design and write the `customer_audit_log` table migration — per `system-overview.md` §4.5: `timestamp`, `actor_type` (`SYSTEM`/`CUSTOMER`/`EMPLOYEE`), `actor_id`, `action`, `target_type`, `target_id`, `before` (JSONB), `after` (JSONB), `reason`, `correlation_id`; append-only enforcement at the database level (revoke `UPDATE`/`DELETE` on the application role) (2 days)
- [ ] **T-0203** Design and write the `sessions` table migration — per `customer-onboarding.md` §"Authentication Architecture": opaque session ID, customer ID, issued-at, last-activity, hard-cap expiry, user-agent, IP; web sessions and iOS sessions share the same store (1 day)
- [ ] **T-0204** Design and write the `oauth_refresh_tokens` table migration — encrypted-at-rest refresh tokens issued by Signicat (per customer), with the encryption key stored in the secrets store from T-0105 (1 day)
- [ ] **T-0205** Design and write the `idempotency_keys` table migration — used by signup endpoints, charge creation, and any non-idempotent webhook handler; records request hash + response payload + expiry (1 day)
- [ ] **T-0206** Design and write the `signup_sessions` table migration — a short-lived store for in-flight signup state (per `customer-onboarding.md` §"Signup Flow", 60-minute idle timeout); holds OIDC `state`, PKCE verifier (encrypted), and partial customer data prior to commit (1 day)
- [ ] **T-0207** Design and write the `customer_consent` table migration — per `customer-onboarding.md` §"Audit trail" and `companion-app.md` §7 (Eloverblik consent); records every contract acceptance and consent grant: customer ID, consent type, granted-at, IP, user-agent, signup session ID; append-only (1 day)
- [ ] **T-0208** Write seed and fixture data — reproducible seed data for local development (10 fictitious customers across DK1 and DK2, varying account statuses) (1 day)
- [ ] **T-0209** Document the schema — ER diagram + per-table column reference in `docs/specifications/` (1 day)

---

## E-03 — Authentication Middleware

Validate Signicat-issued ID tokens, issue and validate TCPC session JWTs, manage session lifecycle, and enforce role-based access control across customer and employee endpoints. Depends on E-01, E-02.

- [ ] **T-0301** Implement Signicat OIDC discovery + JWKS caching — load the discovery document (`https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration`) at startup; cache and refresh JWKS every 24 hours; refresh on signature-validation failure (key rotation) (1 day)
- [ ] **T-0302** Implement Signicat ID token validation — validate signature, `iss`, `aud`, `exp`, `nbf`, and `nonce`; reject tokens missing `mitid.uuid`; per ADR-001 §3.2 discard ID tokens after claim extraction (2 days)
- [ ] **T-0303** Implement OIDC Authorization Code + PKCE token exchange — two client configurations: confidential web client (with secret) and public iOS client (PKCE only) (2 days)
- [ ] **T-0304** Implement TCPC session JWT issuance — signed with a backend-held private key (RS256 or EdDSA); claims: `sub` (customer ID), `iat`, `exp`, `role` (`customer`), `session_id` (1 day)
- [ ] **T-0305** Implement TCPC session JWT validation middleware — reject expired, malformed, or unknown-signed-by tokens; surface a consistent 401 response shape (1 day)
- [ ] **T-0306** Implement refresh-token rotation — on every successful refresh, invalidate the prior refresh token and issue a new one (defence against replay) (2 days)
- [ ] **T-0307** Implement session lifecycle — 30-day sliding window; 90-day hard cap (`customer-onboarding.md` §"Session management"); inactivity timeout enforced at validation time (1 day)
- [ ] **T-0308** Implement employee authentication (email + password + TOTP) — per ADR-001 §3.8: bcrypt/argon2 password hashing, TOTP via standard RFC 6238, 8-hour inactivity expiry, 24-hour hard cap (3 days)
- [ ] **T-0309** Implement role-based access control middleware — roles: `customer`, `admin`, `read_only`; enforce server-side per route; forbidden requests return 403 without leaking which routes exist (1 day)
- [ ] **T-0310** Implement session revocation endpoint — ops/support can invalidate any customer's sessions on demand (`customer-onboarding.md` §"Session management") (1 day)
- [ ] **T-0311** Implement logout endpoints — `POST /v1/auth/logout` for customers (revokes refresh token, clears session); employee logout symmetrical (1 day)

---

## E-04 — Price API

Serve current, forecast, and historical electricity prices (øre/kWh, all-in including markup) to the marketing site, companion app, and admin portal; read-only from local store. Daily ingestion is owned by the Power Broker Integration epics. Depends on E-01, E-02; assumes a `spot_prices` and `tariffs` schema exists from the Power Broker Integration component (out of scope for this epic).

- [ ] **T-0401** Define the all-in price calculation service — pure function taking spot price + supplier margin + network tariff + Energinet system + balancing tariff + elafgift, returning øre/kWh with VAT applied; date-versioned tariff inputs (system-overview §4.1) (2 days)
- [ ] **T-0402** Implement `GET /v1/prices/current` — returns the current hour's all-in price for both DK1 and DK2 (or the customer's price area if authenticated); cache headers `Cache-Control: public, max-age=60` (1 day)
- [ ] **T-0403** Implement `GET /v1/prices/today` and `GET /v1/prices/tomorrow` — per `companion-app.md` US-05: 24 hourly records each; `tomorrow` returns 404 (or empty + flag) before ~13:00 CET publication (1 day)
- [ ] **T-0404** Implement `GET /v1/prices/forecast` — next 24 hours from now, spanning the today/tomorrow boundary; used by the companion app's Home tile (1 day)
- [ ] **T-0405** Implement `GET /v1/prices/history` — 30-day rolling history, hourly granularity, per price area; used by admin portal financials and trend display (2 days)
- [ ] **T-0406** Implement stale-data detection — per system-overview §4.1, if the latest persisted record is more than 26 hours old every response includes `stale: true` and the calling surface displays a "Live prices temporarily unavailable" notice; per `companion-app.md` US-04, 90-minute threshold for the Home tile caption (1 day)
- [ ] **T-0407** Implement CC BY 4.0 attribution metadata — every price response includes an `attribution` field referencing "Energi Data Service / Energinet" (0.5 days)
- [ ] **T-0408** Add public-endpoint rate limiting — `GET /v1/prices/*` is public (no auth) for the marketing site; rate limit per source IP and per origin (1 day; depends on T-0905)
- [ ] **T-0409** Write integration tests against a seeded price store — cover the all-in calculation across the elafgift cutover (system-overview §5 and companion-app OQ#6) and stale-data behaviour (2 days)

---

## E-05 — Customer Account API

Account read/write endpoints used by the companion app and onboarding flow; excludes consumption (E-06) and billing/subscription mechanics owned by a future Billing spec. Depends on E-01, E-02, E-03.

- [ ] **T-0501** Implement `GET /v1/customer` (also `GET /v1/account`) — returns the authenticated customer's master data per `companion-app.md` US-09: name, address, anonymised metering point ID, price area, account status, account creation date, payment method, billing frequency, Eloverblik consent state (1 day)
- [ ] **T-0502** Implement `PATCH /v1/account` (billing frequency) — per `companion-app.md` US-10: `PATCH /v1/subscription/interval` updates the customer record and downstream patches the MobilePay agreement via the Vipps Recurring API; new interval applies from next billing period; current period finalises under the previous interval (2 days)
- [ ] **T-0503** Implement `GET /v1/subscription` — returns MobilePay agreement state (status, `maxAmount`, `suggestMaxAmount`, billing frequency); backend caches Vipps `GET /recurring/v3/agreements/{id}` for 60 seconds, refreshed on webhook events (2 days)
- [ ] **T-0504** Implement `PATCH /v1/subscription` (stop) — per `companion-app.md` US-11: patches the Vipps agreement to `STOPPED`; source of truth flips to `STOPPED` only on webhook arrival, not on the request response (1 day)
- [ ] **T-0505** Implement `DELETE /v1/account` (cancellation) — per the Out-of-Scope referenced "Contract & Cancellation" spec (`customer-onboarding.md`): supports the Danish 14-day cancellation right and post-launch cancellation; marks the customer `CANCELLED`, stops the MobilePay agreement, queues a BRS-H1 reverse-switch (or no-op if not yet switched), and writes the audit record; the reverse-switch BRS-H1 mechanics are owned by the DataHub B2B Integration spec (out of scope here) (2 days)
- [ ] **T-0506** Implement `GET /v1/charges` (charge history) — per `companion-app.md` §7: lists past charge events for the authenticated customer; pagination (2 days)
- [ ] **T-0507** Implement `POST /v1/devices` (APNs token registration) — per `companion-app.md` §7: app posts its APNs device token; backend stores it against the customer for push delivery; re-posted on token rotation (1 day)
- [ ] **T-0508** Implement Universal Link / deep-link return endpoints — used by signup return URLs (MobilePay confirmation, Signicat OIDC callback); the endpoints resume the open signup session and route the client correctly (2 days)
- [ ] **T-0509** Write integration tests for the account-state machine — cover every documented transition (`PENDING` → `SCHEDULED` → `ACTIVE` → `CANCELLED`; `PENDING` → `DATAHUB_REJECTED`) and the audit log entries each transition produces (2 days)

---

## E-06 — Consumption API

Mediate Eloverblik third-party API calls so consumption data reaches the companion app and admin portal without exposing Eloverblik tokens to client devices; manage 1-year refresh tokens and 24-hour access tokens server-side. Depends on E-01, E-02, E-03, E-05 (for `customer_consent`).

- [ ] **T-0601** Implement Eloverblik refresh-token storage — per ADR-001 §3.5: refresh tokens are 1-year, encrypted at rest, never exposed to clients; schema migration if E-02 did not already cover it (1 day)
- [ ] **T-0602** Implement the access-token exchange service — trade refresh token for a 24-hour data access token via the Eloverblik token endpoint; cache by customer for the lifetime of the access token; refresh on demand (2 days)
- [ ] **T-0603** Implement Eloverblik consent capture — once the customer completes consent at `eloverblik.dk` (inside `ASWebAuthenticationSession`), the backend receives the refresh token (mechanism per the Eloverblik third-party flow — to be confirmed in the Backend/API spec) and persists it (2 days)
- [ ] **T-0604** Implement `GET /v1/consumption?from=&to=` — per `companion-app.md` US-07: fetches `POST /api/meterdata/gettimeseries/{from}/{to}/Hour` from Eloverblik and returns hourly kWh per the customer's metering point; multiplies each hour's kWh by the all-in price for that hour to produce the running cost breakdown (3 days)
- [ ] **T-0605** Implement consumption caching layer — hourly Eloverblik data for a given customer/period is cached in the backend (Eloverblik publishes with up to a 24-hour delay; refetching on every app open is wasteful); cache invalidation: TTL + write-through on a refresh webhook (if/when available) (2 days)
- [ ] **T-0606** Implement consent-revoked detection — when Eloverblik returns an auth error on token refresh, mark the customer's consent as revoked; surface `consentRevoked: true` in `GET /v1/customer` per `companion-app.md` Error States (1 day)
- [ ] **T-0607** Implement `getcharges` integration — per `companion-app.md` §7: `POST /api/meterdata/getcharges` returns the cost-component breakdown per metering point; embed in `GET /v1/consumption` response for the US-07 cost-breakdown bar (2 days)
- [ ] **T-0608** Implement empty-state response — when no consent exists, return a documented empty-state payload so `companion-app.md` US-08 can render its "Vi mangler adgang til dit forbrug" screen (0.5 days)
- [ ] **T-0609** Write integration tests with a mock Eloverblik server — cover successful fetch, expired access token (auto-refresh), revoked refresh token (consent flag), and Eloverblik 5xx (graceful degradation) (2 days)

---

## E-07 — Webhook Ingestion

Receive, verify, and route webhooks from Vipps MobilePay, forward relevant events to mobile devices via APNs, and reconcile charge/agreement state in the local store; provide a daily reconciliation backstop against missed webhooks. Depends on E-01, E-02, E-05, E-09 T-0904 (structured logging).

- [ ] **T-0701** Implement the webhook receiver endpoint — a single HTTPS endpoint per provider (`POST /v1/webhooks/mobilepay`); always returns 200 OK after authenticating the request, even on application-level failure (provider retries are expensive); the failure is queued for internal retry (1 day)
- [ ] **T-0702** Implement MobilePay webhook signature verification — per Vipps Recurring API docs (research file): HMAC verification using a shared secret stored in the secrets store; reject any unsigned or invalid-signature request before any side-effect (2 days)
- [ ] **T-0703** Implement webhook idempotency — a given webhook event ID is processed exactly once; use the `idempotency_keys` table from T-0205 (1 day)
- [ ] **T-0704** Implement event routing for `recurring.agreement-accepted.v1` — per `customer-onboarding.md` US-05: transitions the customer's agreement to `ACTIVE`, captures the phone number from the payload, unblocks the signup confirmation screen (1 day)
- [ ] **T-0705** Implement event routing for `recurring.agreement-rejected.v1` — per `customer-onboarding.md` US-10: surfaces the Betalingsservice fallback path on the open signup session (1 day)
- [ ] **T-0706** Implement event routing for `recurring.agreement-stopped.v1` — per `companion-app.md` US-11 and Error States: marks the customer's agreement `STOPPED`, suspends the account, sends an APNs notification ("Dit abonnement er stoppet — kontakt os for at genstarte") (1 day)
- [ ] **T-0707** Implement event routing for `recurring.charge-captured.v1` — per `companion-app.md` US-14: records the payment in the charges table, sends APNs notification ("Betaling gennemført"); updates the failed-payments queue if the charge clears a previous failure (2 days)
- [ ] **T-0708** Implement event routing for `recurring.charge-failed.v1` — per `companion-app.md` US-15: records the failure, sends APNs notification ("Betaling mislykkedes"), writes to the admin Failed Payments queue; triggers the dunning workflow (mechanism owned by the future Billing spec; this epic only emits the event) (2 days)
- [ ] **T-0709** Implement event routing for `recurring.charge-creation-failed.v1` — per `customer-onboarding.md` §"Payment Setup" webhook subscriptions: records the failure, alerts ops (1 day)
- [ ] **T-0710** Implement APNs forwarding — send push notifications via Apple's HTTP/2 APNs API; token-based authentication; retry on delivery failure with exponential backoff (2 days)
- [ ] **T-0711** Implement the daily MobilePay reconciliation job — per `system-overview.md` Open Question 13: pull `GET /recurring/v3/agreements/{id}` and `GET /recurring/v3/agreements/{id}/charges` for every active customer once daily and reconcile against the local store; alert if any divergence is found (3 days)
- [ ] **T-0712** Implement the missing-webhook alarm — if no webhook event has been received in 1 hour during business hours, emit an alert per `system-overview.md` Open Question 13 default assumption (1 day)
- [ ] **T-0713** Write integration tests with replayed webhook payloads — use recorded sample payloads from MobilePay sandbox; cover signature-failure, duplicate delivery, out-of-order delivery, and unknown-event-type cases (2 days)

---

## E-08 — Admin API

Read-only and privileged-write endpoints used by the admin portal; all endpoints role-gated to `admin` or `read_only` per ADR-001 §3.8 and `system-overview.md` §4.5. Depends on E-01, E-02, E-03 (T-0308 employee auth and T-0309 RBAC).

- [ ] **T-0801** Implement `GET /v1/admin/customers` — search and list customers by name, email, metering point ID, hashed-CPR match, and account status; paginated; role: `admin` or `read_only` (2 days)
- [ ] **T-0802** Implement `GET /v1/admin/customers/:id` — per `system-overview.md` §4.5 customer-detail page: master data, account status, payment method, recent charges, recent failed payments, audit log excerpt (2 days)
- [ ] **T-0803** Implement `GET /v1/admin/financials` — per `system-overview.md` §4.5: aggregate KPIs (Active Customers, MRR, Total Margin Month-to-Date, current DK1/DK2 spot price); backed by aggregate queries against the customer, charges, and price stores (3 days)
- [ ] **T-0804** Implement `GET /v1/admin/payments/failed` — failed-payments queue per `system-overview.md` §4.5 and `companion-app.md` US-15; fields per row: customer, amount, failed-at, reason, retry status, next-retry timestamp (2 days)
- [ ] **T-0805** Implement `POST /v1/admin/payments/:id/retry` — privileged action: re-create a failed charge against the customer's agreement; writes an audit log entry; role: `admin` only (2 days)
- [ ] **T-0806** Implement `POST /v1/admin/pricing` (markup update) — per `system-overview.md` §4.5: update supplier margin / markup; date-versioned (effective-from timestamp); never retroactively changes historical prices; writes an audit entry; role: `admin` only (2 days)
- [ ] **T-0807** Implement `POST /v1/admin/customers/:id/deactivate` — privileged customer suspension (e.g., fraud, manual cancellation); writes an audit entry; role: `admin` only (1 day)
- [ ] **T-0808** Implement `GET /v1/admin/audit-log` — per `system-overview.md` §4.5: time-ordered, filterable by employee, action, target type, target ID; read-only; role: `admin` or `read_only` (2 days)
- [ ] **T-0809** Implement `POST /v1/admin/customers/:id/sessions/revoke` — force-logout a specific customer; writes an audit entry; role: `admin` (1 day)
- [ ] **T-0810** Implement `POST /v1/admin/mobilepay/refresh` — manual on-demand pull from MobilePay to bypass webhook lag (per `system-overview.md` Open Question 13 admin portal "Refresh from MobilePay" fallback) (1 day)
- [ ] **T-0811** Write authorization tests for every admin endpoint — verify that `customer` role, anonymous, and (where applicable) `read_only` role receive 403 on privileged routes; UI-hiding alone is insufficient per `system-overview.md` §4.5 (2 days)

---

## E-09 — Health, Observability & Security

Production-readiness primitives that every other epic relies on for safe operation: liveness/readiness probes, structured logging, error tracking, rate limiting, HTTPS enforcement, and dependency hygiene. Depends on E-01; should be in place before E-04 onwards ships to staging.

- [ ] **T-0901** Implement `GET /health` — liveness probe: returns 200 if the process is up; no dependency checks (0.5 days)
- [ ] **T-0902** Implement `GET /ready` — readiness probe: returns 200 only if database connectivity and secrets-store connectivity are confirmed; returns 503 with a structured body listing failing dependencies (1 day)
- [ ] **T-0903** Implement startup self-check — on boot, validate that all required environment variables and secrets are present; refuse to start if any are missing (1 day)
- [ ] **T-0904** Implement structured JSON logging — every request gets a correlation ID propagated via `X-Correlation-ID` header; log levels DEBUG/INFO/WARN/ERROR; CPR, raw OAuth tokens, and Eloverblik tokens are never logged (per `customer-onboarding.md` Non-Functional Requirements); add a unit test asserting these never appear in log output (2 days)
- [ ] **T-0905** Implement rate limiting — per-route, per-IP, with separate buckets for public endpoints (price API, marketing widget) and authenticated endpoints; sliding window or token bucket (2 days)
- [ ] **T-0906** Implement HTTPS enforcement — reject HTTP requests at the edge; HSTS header on every response; TLS 1.2 minimum, 1.3 preferred (1 day)
- [ ] **T-0907** Implement security headers — `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy` (where it applies) (1 day)
- [ ] **T-0908** Implement error-tracking integration — pick a provider (Sentry, Bugsnag, Honeybadger); scrub PII before submission (no CPR, no email, no MitID UUID); per `companion-app.md` §10 the iOS app uses on-device MetricKit only — the backend has more latitude but PII scrubbing is mandatory (2 days)
- [ ] **T-0909** Add dependency-version pinning and vulnerability scanning — lockfile committed; CI runs a vulnerability scanner (`npm audit`, `pip-audit`, `cargo audit`, etc.) and fails on HIGH/CRITICAL (1 day)
- [ ] **T-0910** Implement request body size limits — default 1 MB; per-route override where webhook payloads are larger; reject oversized requests with 413 (0.5 days)
- [ ] **T-0911** Implement metrics emission — per-endpoint p50/p95/p99 latency, error rate, and request rate; per `customer-onboarding.md` Non-Functional Requirements: P95 < 500 ms for non-third-party endpoints, P95 < 2 s for endpoints calling Signicat or MobilePay (2 days)
- [ ] **T-0912** Document runbooks for each health-state failure — "What to do when `/ready` returns 503", "What to do when no MobilePay webhook has arrived in 1 hour", "What to do when the daily price ingestion fails" (2 days)

---

## Task Summary

| Epic | Tasks | Notes |
|---|---|---|
| E-01 Project Setup & Infrastructure | 9 | Precondition for every other epic |
| E-02 Customer Database Schema | 9 | Prerequisite for E-03, E-05, E-06, E-07, E-08 |
| E-03 Authentication Middleware | 11 | Gates every authenticated endpoint |
| E-04 Price API | 9 | Public; can ship to marketing site ahead of onboarding |
| E-05 Customer Account API | 9 | Depends on E-03; consumed by companion app + onboarding |
| E-06 Consumption API | 9 | Mediates Eloverblik; never exposes tokens to clients |
| E-07 Webhook Ingestion | 13 | Source of truth for charge/agreement state |
| E-08 Admin API | 11 | Depends on stable schemas + event flows from E-02/E-05/E-07 |
| E-09 Health, Observability & Security | 12 | T-0901–T-0906 required before staging; remainder before production launch |
| **Total** | **92** | |

**Sequencing recommendation:** (1) E-01 (foundation) — must complete before any other epic. (2) E-02 (schema) and E-09 (observability) in parallel. (3) E-03 (auth) — gates every authenticated endpoint. (4) E-04 (price API) — public, can ship to the marketing site ahead of customer onboarding. (5) E-05 (account API), E-06 (consumption), and E-07 (webhooks) in parallel — each touches different external systems. (6) E-08 (admin) — depends on E-02, E-03, E-05, E-07 having stable schemas and event flows. E-09 tasks T-0901–T-0906 are required before staging; T-0907–T-0912 can land iteratively but must complete before production launch.

---

## Open Questions

These are unresolved decisions the Backend/API spec must close before implementation of the dependent epics can begin. Owners follow the existing Open Question conventions in the component specs.

1. **Runtime, language, and framework choice.** Owner: Backend lead. Default assumption: Node.js + TypeScript (matches the project's web-leaning footprint and the broadest available libraries for Eloverblik/DataHub/MobilePay), with framework deferred to backend lead's preference. Drives every other technical choice in E-01.
2. **Database choice — confirm PostgreSQL.** Owner: Backend lead. Default assumption: PostgreSQL. Drives E-02 in full.
3. **Secrets store choice.** Owner: Platform engineering. Default assumption: AWS Secrets Manager if hosting on AWS, otherwise HashiCorp Vault. Drives T-0105 and the entire DataHub certificate handling track in the future DataHub B2B Integration spec.
4. **Hosting jurisdiction.** Owner: Founders + Engineering (mirrors `system-overview.md` Open Question 5). Default assumption: EU-region hosting, Danish DPA. Affects every infrastructure procurement.
5. **`suggestMaxAmount` for new MobilePay agreements.** Owner: Product + Finance (mirrors ADR-001 §6.4). Default assumption: 3,000 DKK per `customer-onboarding.md` US-05 (binding pending resolution). Affects E-05 (subscription endpoints) and E-07 (charge-failed handling).
6. **CPR re-supply mechanism for BRS-H1.** Owner: DataHub B2B Integration spec (mirrors ADR-001 §6.6). Default assumption: TBD. Affects whether the customer table needs a short-lived encrypted CPR column (E-02).
7. **Webhook signature secret rotation policy.** Owner: Platform engineering. Default assumption: rotate annually with a 30-day overlap window. Affects T-0702.
8. **APNs key rotation policy.** Owner: Platform engineering. Default assumption: yearly with documented runbook. Affects T-0710.
9. **Read-only vs admin role split.** Owner: Operations + Engineering. Default assumption: per ADR-001 §3.8 only `admin` and `read_only` exist; `read_only` covers customer search, financials, and audit log; all writes are `admin`. Affects every admin endpoint role-gate.
10. **Internal billing scheduler ownership.** Owner: Platform engineering (mirrors ADR-001 §6.8 and §7.2). Default assumption: out of scope for this Backend/API epic breakdown — owned by the forthcoming Billing spec. The webhook ingestion in E-07 emits events the scheduler will consume but does not implement scheduling itself.

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
