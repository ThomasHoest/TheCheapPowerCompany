# Epics: Power Broker Integration

**Status:** Draft
**Owner:** Platform engineering (Architect)
**Last updated:** 2026-04-29
**Source spec:** `docs/specifications/power-broker-integration.md`
**Source architecture:** `docs/specifications/ADR-001-system-architecture.md` (sections 3.4, 3.5, 3.6, 7.4)

---

## Overview

The Power Broker Integration component is the backend boundary between The Cheap Power Company and the Danish electricity market. It delivers (a) a daily Energi Data Service ingestion job that mirrors DK1 and DK2 day-ahead Elspot prices into local storage, (b) a date-versioned tariff and tax configuration plus a calculation engine that produces the all-in øre/kWh consumer price, (c) Eloverblik third-party API integration for customer-consented meter data access, (d) the regulatory artefact tracking required to operate as a registered elleverandør in DataHub, and (e) an internal REST endpoint that serves current, forecast, and historical prices to the iOS app, marketing site, and admin portal. The critical path runs Epic 1 → Epic 2 → Epic 5 in parallel with Epic 3 (Eloverblik) and Epic 4 (DataHub registration ops, which gates production launch but not development). BRS-H1 supplier-switch ebIX integration is explicitly out of scope here per the spec; ADR-001 section 6.2 flags this as a separate critical deliverable to be owned elsewhere.

---

## Epic 1: Energi Data Service Ingestion

**Goal:** Deliver a reliable scheduled job that fetches DK1 and DK2 day-ahead Elspot prices from `api.energidataservice.dk` once daily, upserts them into local storage, retries on failure, alerts on sustained failure, and exposes ingestion health to the admin portal. By the end of this epic, local storage holds 24 DK1 and 24 DK2 hourly records for D+1 by 13:30 CET on every normal day.

**Dependencies:**
- Backend service runtime and local storage exist (per Backend/API specification — flagged in ADR-001 section 6.3 as a prerequisite document).
- Logging and alerting infrastructure available.
- Time zone library configured for Europe/Copenhagen.

### Task 1.1 — Spot price storage schema and upsert primitive

**Description:** Implement the `spot_price` table/collection per spec section 6.1, with a unique natural key on (`hourUTC`, `priceArea`). Provide a repository function that performs an upsert keyed on the natural key and returns counts of inserted vs. updated rows.

**Acceptance criteria:**
- [ ] Schema includes `hourUTC`, `hourDK`, `priceArea`, `spotPriceDKK`, `spotPriceEUR`, `ingestedAt`, `source` with the types stated in spec section 6.1.
- [ ] `priceArea` is constrained to the values `DK1` or `DK2`.
- [ ] An attempt to insert two rows with the same (`hourUTC`, `priceArea`) updates the existing row instead of failing or duplicating.
- [ ] Upsert returns a structured result containing inserted count, updated count, and unchanged count.
- [ ] Inserting a row with `priceArea` outside the enum is rejected with a domain error.
- [ ] Negative `spotPriceDKK` values are accepted and persisted as-is.

**Definition of done:** Migration committed and applied to test environment, repository function unit-tested with at least the cases above, code review approved.

**Satisfies:** US-01, US-02, US-04 (immutability constraint enforced at task 1.5).

### Task 1.2 — Energi Data Service HTTP client

**Description:** Build a thin HTTP client wrapper for `https://api.energidataservice.dk/dataset/Elspotprices`. Compose query parameters per spec section 7.1: `filter={"PriceArea":["DK1","DK2"]}`, `start=StartOfDay`, `end=StartOfDay+P2D`, `limit=96`, `timezone=dk`, `sort=HourDK desc`. Parse the JSON response into a typed record set. Treat 200 with empty `records` as a failure (spec section 9).

**Acceptance criteria:**
- [ ] Client issues a single GET with the documented query parameters.
- [ ] Response is parsed into typed records with `HourUTC`, `HourDK`, `PriceArea`, `SpotPriceDKK`, `SpotPriceEUR`.
- [ ] HTTP non-2xx responses raise a typed `EdsHttpError` carrying status, request URL, and response body.
- [ ] A 200 response with an empty `records` array raises a typed `EdsEmptyResultError`.
- [ ] Network/timeout failures raise a typed `EdsTransportError`.
- [ ] No retry logic lives in this client; it is fail-fast (retry policy lives in the scheduler — task 1.4).
- [ ] Request timeout is configurable; default 30 seconds.

**Definition of done:** Unit tests cover happy path, 4xx, 5xx, empty array, and timeout using a stubbed transport. Deployed to test environment.

**Satisfies:** US-01.

### Task 1.3 — Daily ingestion job (happy path)

**Description:** Compose the storage repository (1.1) and HTTP client (1.2) into an `IngestSpotPricesJob` that fetches today and tomorrow for DK1+DK2 and upserts results. Emit a structured log entry capturing timestamp, request URL, HTTP status, records persisted, and run duration per US-01.

**Acceptance criteria:**
- [ ] On a successful run, all returned hourly records are upserted in a single transaction (or equivalent atomic operation).
- [ ] After the run, the database contains 24 DK1 and 24 DK2 hourly records for D+1.
- [ ] A structured log entry at INFO level is emitted with fields: `timestamp`, `requestUrl`, `httpStatus`, `recordsPersisted`, `durationMs`, `runId`.
- [ ] The job records the run outcome (success/failure + reason) in an `ingestion_run_log` table for the health dashboard (used in task 5.4).
- [ ] Records that already exist are not duplicated and not (by default) overwritten — see task 1.5 for the immutability guarantee.

**Definition of done:** Integration test against a stubbed Energi Data Service exercises a full run end to end; deployed to test environment; manual run verified to populate D+1.

**Satisfies:** US-01.

### Task 1.4 — Scheduling, retry, and alerting

**Description:** Schedule `IngestSpotPricesJob` to run daily at 13:15 Europe/Copenhagen. Add exponential-backoff retries at 5, 15, 30, 60 minutes per US-08 and spec section 9. After 4 hours of sustained failure, raise an alert to the on-call engineer. For 4xx responses (excluding the empty-records case which is treated as transient), do not retry automatically and alert within 15 minutes.

**Acceptance criteria:**
- [ ] Job runs at 13:15 Europe/Copenhagen; verified in both winter (CET, UTC+1) and summer (CEST, UTC+2) settings.
- [ ] Transient failure (5xx, transport, empty array) triggers retries at +5, +15, +30, +60 minutes from the last attempt.
- [ ] After all retries within a 4-hour window are exhausted, an on-call alert is raised with a payload identifying the run and the most recent error.
- [ ] A 4xx non-empty response raises an on-call alert within 15 minutes and does not retry.
- [ ] A successful retry cancels any pending alert and logs the recovery.
- [ ] Concurrency: a second scheduled trigger while the first run is still in flight does not start a parallel run.

**Definition of done:** Retry/alert logic unit-tested with a virtual clock; integration test simulates a 5xx-then-200 sequence; alert delivery verified to the on-call channel in test environment.

**Satisfies:** US-01, US-08.

### Task 1.5 — Historical immutability and `force` flag

**Description:** Per US-04 acceptance criterion 4, historical records must be immutable. Modify the upsert to leave existing rows untouched by default for any `hourUTC` whose `hourDK` date is in the past (relative to Europe/Copenhagen "today"). Add a `--force` invocation flag that explicitly permits overwrite, used only by manual administrative re-ingestion.

**Acceptance criteria:**
- [ ] A normal scheduled run for D and D+1 does not modify any row whose `hourDK` date is < D.
- [ ] An attempt to upsert a row matching an existing past row produces an `unchanged` result rather than `updated`.
- [ ] When the job is invoked with `force=true`, past rows are overwritten and the run logs an explicit `forceOverwrite=true` field.
- [ ] The default scheduled invocation always runs with `force=false`.
- [ ] Empty-result responses never overwrite existing data (per spec section 9).

**Definition of done:** Unit tests cover both default and force modes for past-date rows. Deployed to test environment.

**Satisfies:** US-04.

### Task 1.6 — Weekly backfill job for gaps in last 90 days

**Description:** Implement a once-weekly backfill job (per spec section 7.1) that scans the last 90 days for missing (`hourUTC`, `priceArea`) entries (expecting 24 rows per area per day) and re-fetches just the missing days from Energi Data Service. Honours immutability: only fills gaps; never overwrites.

**Acceptance criteria:**
- [ ] Job runs once weekly at a configurable time (default Sunday 03:00 Europe/Copenhagen).
- [ ] Job identifies any day in the last 90 days where DK1 or DK2 has fewer than 24 hourly rows.
- [ ] For each such day, job issues a targeted GET to Energi Data Service for that single day and upserts the missing rows.
- [ ] Existing rows are not modified.
- [ ] If the source still does not return data for a known gap, the gap is logged and an alert is raised after two consecutive weekly failures for the same gap.
- [ ] A run summary is logged with: days scanned, gaps detected, gaps filled, gaps still open.

**Definition of done:** Unit and integration tests cover the no-gap, gap-filled, and gap-still-open cases. Deployed to test environment with a manual trigger entry point.

**Satisfies:** US-01, US-04 (gap detection), US-08 indirectly.

### Task 1.7 — CC BY 4.0 attribution metadata in the API contract

**Description:** Per spec section 10 and ADR-001 section 3.4, every API response that exposes Elspot data must carry attribution metadata so that downstream consumers (iOS app, marketing site, admin portal) can render "Energi Data Service / Energinet (CC BY 4.0)". Add an `attribution` field to the price API response payload and document it in the API contract.

**Acceptance criteria:**
- [ ] Every response from the price API (Epic 5) includes a top-level `attribution` object with `source: "Energi Data Service / Energinet"`, `licence: "CC BY 4.0"`, and `licenceUrl: "https://creativecommons.org/licenses/by/4.0/"`.
- [ ] The attribution string is centralised in one constant; consumers do not hard-code it.
- [ ] API documentation states the attribution requirement and that downstream UI must display it.
- [ ] The same attribution is logged in the ingestion run record for traceability.

**Definition of done:** Contract test asserts presence of attribution on every endpoint variant; API docs updated; reviewed by Architect.

**Satisfies:** US-01 supporting requirement; spec section 10 (NFR: Attribution).

---

## Epic 2: Consumer Price Calculation Engine

**Goal:** Provide a date-versioned tariff and tax configuration store and a deterministic calculation engine that, given an `hourUTC` and a `priceArea` (and optionally a `dsoAreaCode`), returns the all-in consumer price in øre/kWh broken down into its components, including handling the 1 January 2026 elafgift transition and time-of-use network tariffs.

**Dependencies:**
- Epic 1 Task 1.1 (spot price storage) for the spot input.
- Backend/API specification (decisions on configuration access control) — flagged in ADR-001 section 6.3.

### Task 2.1 — Tariff and tax configuration schema

**Description:** Implement the versioned configuration table per spec section 6.2. Each row carries a `componentType`, optional `priceArea`, optional `dsoAreaCode`, `validFrom`, optional `validTo`, `value` in øre/kWh excluding VAT, and optional `hourOfDayPattern` for time-of-use network tariffs.

**Acceptance criteria:**
- [ ] Schema includes all fields named in spec section 6.2 with the types stated.
- [ ] `componentType` is constrained to the enum: `supplier_margin`, `network_tariff`, `energinet_system`, `energinet_balancing`, `elafgift`.
- [ ] A constraint or validation rule prevents two overlapping rows for the same (`componentType`, `priceArea`, `dsoAreaCode`) where `[validFrom, validTo)` intervals overlap.
- [ ] `validFrom` is inclusive; `validTo` is exclusive; null `validTo` means open-ended.
- [ ] `value` precision supports at least 4 decimal places.
- [ ] An admin-API write path exists (auth-gated) to insert and update configuration rows; a read path exists for the calculation engine.

**Definition of done:** Migration applied; CRUD repository unit-tested including overlap rejection; deployed to test environment.

**Satisfies:** US-07.

### Task 2.2 — Configuration lookup function

**Description:** Implement a lookup `getActiveComponent(componentType, priceArea, dsoAreaCode, hourUTC)` that returns the configured value valid at the given hour, or null if no configuration covers that hour. For time-of-use network tariffs, the lookup must apply `hourOfDayPattern` to pick the correct band.

**Acceptance criteria:**
- [ ] For a given (`componentType`, `priceArea`, `dsoAreaCode`), the function returns the row whose `[validFrom, validTo)` interval contains the queried `hourUTC` (converted to Europe/Copenhagen for date comparison).
- [ ] When two valid rows would otherwise match, the constraint from 2.1 prevents this; the function may assume at most one match.
- [ ] When no row matches, the function returns null and the caller must decide how to handle it (per task 2.4).
- [ ] When `hourOfDayPattern` is present, the lookup interprets the pattern (specification of pattern syntax below) and returns the value for the relevant hour band.
- [ ] Pattern syntax is documented and supports at least: peak/off-peak split by hour-of-day-DK, weekend vs weekday distinction.

**Definition of done:** Pattern syntax documented in `/docs/architecture/tariff-pattern-syntax.md` (or equivalent existing location). Unit tests cover boundary cases at `validFrom`, at `validTo - 1 hour`, daylight-saving transitions, and time-of-use band changes.

**Satisfies:** US-07.

### Task 2.3 — All-in consumer price calculation

**Description:** Implement the calculation engine per spec section 6.4. Inputs: `hourUTC`, `priceArea`, optional `dsoAreaCode`. Output: a structured result containing `spotOreKwh`, `supplierMargin`, `energyPrice` (= spot + margin), `networkTariff`, `energinetSystem`, `energinetBalancing`, `elafgift`, `subtotalExVat`, `vat`, `finalConsumerPrice`. Apply the formula `final = (energy + network + system + balancing + elafgift) × 1.25`.

**Acceptance criteria:**
- [ ] Spot conversion uses `øre/kWh = SpotPriceDKK / 10`.
- [ ] Supplier margin is added algebraically; negative spot prices are preserved (not floored).
- [ ] All intermediate values are exposed in the result so that a UI can render the breakdown.
- [ ] VAT (25%) is applied to the sum, never to each component individually.
- [ ] Numerical precision is maintained at ≥ 4 decimal places throughout; rounding for display is the consumer's responsibility.
- [ ] When the supplier margin is missing from configuration, the calculation returns an error with code `SUPPLIER_MARGIN_NOT_CONFIGURED` (this is an operational invariant — there must always be exactly one active supplier margin).
- [ ] Unit tests verify the full formula against at least three hand-computed examples covering positive spot, near-zero spot, and negative spot.

**Definition of done:** Unit tests as above; calculation function is pure (no I/O other than configuration and spot lookup); deployed to test environment.

**Satisfies:** US-03, US-07.

### Task 2.4 — Missing-network-tariff error path

**Description:** Per spec section 9 and US-07, when `network_tariff` is missing for the consumer's DSO area, the all-in calculation must fail with an explicit error while the energy-only price (spot + margin) remains computable.

**Acceptance criteria:**
- [ ] Calling the all-in calculation for an `(hourUTC, priceArea, dsoAreaCode)` whose network tariff is unconfigured returns an error with code `NETWORK_TARIFF_NOT_CONFIGURED` and a payload identifying the missing area code and the queried hour.
- [ ] A separate `calculateEnergyPrice(hourUTC, priceArea)` function exists that returns spot + margin without requiring DSO configuration and without VAT. This is used by the price API when DSO is unknown (e.g. on the marketing site).
- [ ] The error payload is suitable for direct rendering by the iOS app (per spec section 9: "Cannot compute total price for your area — please contact support").
- [ ] Unit tests cover both the all-in failure case and the energy-only success case.

**Definition of done:** Unit tests pass; error code documented in the API contract.

**Satisfies:** US-07, spec section 9 row "Network tariff for the consumer's DSO area is missing".

### Task 2.5 — Date-versioned elafgift transition (1 January 2026)

**Description:** Per spec section 6.2 and Open Question 5, configure the elafgift values such that the pre-2026 rate applies to all hours where `hourDK` < 2026-01-01 and the reduced rate (~1 øre/kWh, exact figure to be confirmed by Finance) applies from 2026-01-01 onward. Verify the calculation engine returns historically correct figures across the boundary.

**Acceptance criteria:**
- [ ] Two `elafgift` configuration rows exist: one with `validFrom` < 2026-01-01 and `validTo = 2026-01-01`, one with `validFrom = 2026-01-01` and `validTo` null.
- [ ] A unit test computes the all-in price for an hour at 2025-12-31 23:00 DK and 2026-01-01 00:00 DK and asserts the elafgift component differs between them.
- [ ] Re-running the calculation for any pre-2026 hour after the configuration is in place yields the same value as before the transition row was added.
- [ ] An admin-portal-visible report lists the active elafgift value for any given date.

**Definition of done:** Configuration rows present in test environment with the placeholder values; unit tests pass; figure confirmation tracked as an open question (see Open Question 5 in the source spec).

**Satisfies:** US-07 (date-versioning criterion).

### Task 2.6 — Supplier margin admin endpoint

**Description:** Provide an authenticated admin-only API endpoint to read and update the active `supplier_margin` configuration row, including creating a new dated row that supersedes the previous one without overwriting it.

**Acceptance criteria:**
- [ ] `GET /admin/pricing/supplier-margin` returns the currently active row and the next scheduled row (if any).
- [ ] `POST /admin/pricing/supplier-margin` accepts a `validFrom` (must be in the future or today) and `value`, and inserts a new row that closes the previous open-ended row by setting its `validTo` to the new `validFrom`.
- [ ] The endpoint is gated by an admin role (per ADR-001 section 3.8).
- [ ] An attempt to insert a row with `validFrom` in the past is rejected with a `MARGIN_HISTORICAL_WRITE_FORBIDDEN` error.
- [ ] All writes are recorded in the audit log with actor, before/after values, and timestamp.

**Definition of done:** Endpoint deployed to test environment; protected by admin auth; audit log entries verified; OpenAPI/contract docs updated.

**Satisfies:** US-03 (markup configuration), spec section 10 (Auditability).

---

## Epic 3: Eloverblik Third-Party Integration

**Goal:** Enable customers to grant The Cheap Power Company access to their consumption data via Eloverblik's third-party API and let the platform retrieve metering point metadata, hourly time-series, and charge breakdowns. By the end of this epic, an authenticated customer can complete the consent flow, the platform can fetch their hourly consumption and charges, and consent withdrawal is detected and handled gracefully.

**Dependencies:**
- Eloverblik third-party registration completed (a regulatory/ops prerequisite — tracked separately).
- Customer authentication in place (per ADR-001 section 3.2 — Signicat OIDC).
- Secrets store available for the 1-year refresh token (per ADR-001 section 3.5: "Client devices never see Eloverblik tokens").

### Task 3.1 — Refresh-token storage and operational tooling

**Description:** Provide encrypted-at-rest storage for the 1-year Eloverblik refresh token and admin tooling to rotate it. The token must never be readable by any client device.

**Acceptance criteria:**
- [ ] Refresh token stored encrypted at rest in the secrets store referenced by ADR-001 section 3.6.
- [ ] An admin CLI/endpoint exists to install a new refresh token; old token is overwritten only after the new one is verified to mint an access token.
- [ ] An automated check warns the on-call engineer at least 30 days before the refresh token expires.
- [ ] Token retrieval is access-logged with the calling subsystem.
- [ ] Unit/integration tests verify that no public endpoint exposes the refresh token in any form.

**Definition of done:** Token storage deployed to test environment with a sandbox refresh token; rotation procedure documented in `/docs/runbooks/eloverblik-token-rotation.md`; security review approved.

**Satisfies:** US-05, spec section 10 (Privacy).

### Task 3.2 — Data access token exchange and caching

**Description:** Implement the refresh-token-to-access-token exchange against Eloverblik. Cache the resulting 24-hour access token in memory (or short-lived secret store) and reuse it until expiry. Refresh proactively when within 1 hour of expiry. Never persist access tokens beyond their natural lifetime.

**Acceptance criteria:**
- [ ] On first use, the platform exchanges the refresh token for a data access token via the Eloverblik token endpoint.
- [ ] The access token is reused for subsequent calls until it is within 1 hour of expiry, at which point a new exchange is performed.
- [ ] If the access token is rejected with 401 (per spec section 9), the platform attempts exactly one re-exchange from the refresh token; if that also fails, the refresh token is treated as expired (handled in 3.7).
- [ ] Access tokens are not logged in clear text.
- [ ] Concurrent callers do not trigger multiple parallel exchanges (single-flight or equivalent).
- [ ] Unit tests cover happy path, single 401 retry, double 401 escalation, and concurrent caller behaviour.

**Definition of done:** Tested against the Eloverblik sandbox using a sandbox refresh token; deployed to test environment.

**Satisfies:** US-05.

### Task 3.3 — Customer consent flow (initiation and confirmation)

**Description:** Implement the consent flow per spec section 7.3. The customer initiates "connect my meter" in the iOS app; the backend produces a redirect URL to Eloverblik for the customer to authenticate with MitID and grant consent for the chosen metering point and time window. After the customer returns to the app, the backend polls Eloverblik to confirm the consent and stores metering point metadata.

**Acceptance criteria:**
- [ ] `POST /customers/{id}/eloverblik/consent-start` returns a redirect URL to Eloverblik scoped to the third-party app and the customer's selected metering point/window.
- [ ] After the customer returns, `POST /customers/{id}/eloverblik/consent-confirm` triggers a call to `GET /api/meteringpoints/meteringpoints` and persists `meteringPointId`, `address`, `gridArea`, `meterType`, `consentValidFrom`, `consentValidTo`, and `consentStatus = granted` (per spec section 6.5).
- [ ] If the polled metering points list does not include a newly-consented point within a configurable window (default 5 minutes), the confirmation endpoint returns a `CONSENT_NOT_VISIBLE_YET` error and the iOS app may retry.
- [ ] All Eloverblik API calls use the data access token from task 3.2 as a Bearer token in the `Authorization` header.
- [ ] The consent flow runs in `ASWebAuthenticationSession` on iOS (per ADR-001 section 3.5); the backend never embeds Eloverblik credentials in the redirect.
- [ ] Audit log entries are written for consent-start and consent-confirm with the customer ID, metering point ID, and result.

**Definition of done:** End-to-end test against Eloverblik sandbox covers the round-trip; deployed to test environment; iOS and backend contract documented.

**Satisfies:** US-05.

### Task 3.4 — Hourly time-series fetch

**Description:** Implement a service function and scheduled job that calls `POST /api/meterdata/gettimeseries/{dateFrom}/{dateTo}/Hour` for granted metering points, parses the hourly consumption (kWh), and persists records per spec section 6.6.

**Acceptance criteria:**
- [ ] Function accepts a `meteringPointId`, `dateFrom`, `dateTo` and returns the parsed hourly records.
- [ ] Records are upserted into `eloverblik_consumption` keyed on (`meteringPointId`, `hourUTC`); existing values are not silently overwritten unless re-fetch is explicitly requested.
- [ ] A scheduled job runs daily per customer to refetch the previous 7 days of consumption (per spec section 7.2 default TTL).
- [ ] On 5xx, the job retries with exponential backoff up to 1 hour (per spec section 9).
- [ ] On 403 for a metering point, the metering point's `consentStatus` is set to `withdrawn` and scheduled fetches stop (handled in 3.6).
- [ ] On any failure, the customer-facing app surfaces a "consumption data may be delayed" notice via a flag in the price API response (touch point with Epic 5).

**Definition of done:** Sandbox-tested for happy path, 5xx retry, and 403 handling; deployed to test environment.

**Satisfies:** US-05.

### Task 3.5 — Charge breakdown fetch

**Description:** Implement a service function that calls `POST /api/meterdata/getcharges` for granted metering points and parses the charge breakdown (tariff, subscription, fee). Persist the result and expose it for use by the price calculation engine (Epic 2) when configured network tariffs are unavailable for a DSO area.

**Acceptance criteria:**
- [ ] Function returns the parsed charges with their effective windows and unit values.
- [ ] Charges are persisted with provenance (`source = eloverblik:getcharges`) and `fetchedAt` timestamp.
- [ ] Stored charges can be queried by metering point and effective date.
- [ ] If `getcharges` fails with 5xx, the function returns the most recently cached payload along with a `stale: true` indicator and `lastSuccess` timestamp.
- [ ] Charge data ingestion runs at most once per metering point per day under normal operation.

**Definition of done:** Sandbox-tested; persisted records observable in test environment; unit-tested.

**Satisfies:** US-05.

### Task 3.6 — Consent revocation handling

**Description:** When Eloverblik returns 403 or the metering point disappears from the metering-points list, mark the metering point as `consentStatus = withdrawn`, stop scheduled fetches, and notify the customer that consent appears to have been revoked.

**Acceptance criteria:**
- [ ] A 403 response from any metering-point-scoped Eloverblik call sets `consentStatus = withdrawn` for that metering point.
- [ ] No further scheduled fetches are issued for a withdrawn metering point until consent is re-granted (re-running the consent flow from task 3.3 reactivates fetches).
- [ ] A notification is generated for the customer via the standard notification channel; the iOS app surfaces this on the next launch.
- [ ] The state transition is recorded in the audit log with timestamp and triggering API response.
- [ ] Unit and integration tests cover withdrawal-then-regrant lifecycle.

**Definition of done:** Lifecycle test passes against the sandbox; deployed to test environment.

**Satisfies:** US-05, spec section 9 ("Eloverblik returns 403").

### Task 3.7 — Refresh-token expiry detection and recovery

**Description:** Per spec section 9, when the refresh token is detected as expired (either by direct error from the token exchange or after two consecutive 401s on access-token exchange — see task 3.2), all dependent metering points are marked `needs reconsent`, all scheduled fetches are paused, and an alert is raised so an operator can install a new refresh token via task 3.1's tooling.

**Acceptance criteria:**
- [ ] Expiry is detected within one failed exchange cycle.
- [ ] All metering points whose customers depend on this refresh token are marked `needs reconsent` (consent state machine: `granted` → `needs_reconsent`).
- [ ] An alert is raised to the on-call engineer with severity HIGH.
- [ ] Customers receive a notification prompting them to re-grant consent.
- [ ] After a new refresh token is installed via task 3.1, scheduled fetches resume on next cycle without requiring code changes.

**Definition of done:** Failure-injection test verifies the lifecycle; deployed to test environment with a runbook entry in `/docs/runbooks/eloverblik-token-rotation.md`.

**Satisfies:** US-05, spec section 9 ("Eloverblik refresh token expired").

---

## Epic 4: DataHub Supplier Registration (Operations)

**Goal:** Complete the non-software regulatory steps required to operate as a registered elleverandør in Energinet's DataHub. By the end of this epic, The Cheap Power Company holds a production DataHub registration, has paid the required deposit, holds valid test and production certificates, has signed a BRP agreement, and has signed a Standard Agreement with at least one netselskab. This epic also covers a thin software deliverable: the registration-status tracker referenced by US-06.

**Dependencies:**
- Company is registered as a Danish legal entity (ApS or A/S) — gate listed in ADR-001 section 7.3.
- Finance is able to make a DKK 1,000,000 transfer.
- Engineering owns certificate generation and storage (interfaces with the secrets store from ADR-001 section 3.6).

**Note:** Tasks in this epic that are non-software carry an `Owner category` and `Lead time estimate` instead of the normal acceptance-criteria checklist. Software-supporting tasks (4.7) follow the standard format.

### Task 4.1 — Submit DataHub registration application to Energinet

**Description:** Prepare and submit the formal DataHub registration application to Energinet per the Energinet Terms of Access for Suppliers.
**Owner category:** Regulatory PM + Founders.
**Lead time estimate:** 4–8 weeks (per ADR-001 section 7.3).
**Acceptance criteria:**
- [ ] Application acknowledged by Energinet with a reference number.
- [ ] Application reference number recorded in the registration tracker (task 4.7).
- [ ] All required corporate documents (CVR, articles, signatory authority) attached.
- [ ] Energinet's response timeline is communicated to engineering and product.

**Definition of done:** Application submitted; reference number on file; status `in progress` in the tracker.

**Satisfies:** US-06.

### Task 4.2 — Pay the DKK 1,000,000 cash deposit to Energinet

**Description:** Execute the deposit payment to Energinet per the Terms of Access. Confirm the figure in writing with Energinet before transferring (per source spec Open Question 2).
**Owner category:** Finance + Founders.
**Lead time estimate:** Concurrent with 4.1; transfer executed within 1 week of figure confirmation.
**Acceptance criteria:**
- [ ] Energinet confirms the current deposit figure in writing.
- [ ] Transfer executed and Energinet confirms receipt.
- [ ] Receipt and confirmation stored in the company document store and linked from the registration tracker.
- [ ] Tracker shows `complete` for the deposit artefact with the transfer date.
- [ ] A separate calendar reminder exists for the post-deregistration return (6 months after deregistration, per spec section 8).

**Definition of done:** Deposit confirmed received; tracker updated; documentation linked.

**Satisfies:** US-06; closes source spec Open Question 2.

### Task 4.3 — Obtain DataHub test environment certificate

**Description:** Generate a CSR, obtain the test environment certificate from Energinet, and install it in the secrets store.
**Owner category:** Engineering (Platform).
**Lead time estimate:** Concurrent with 4.1; 1–2 weeks after Energinet acknowledges the application.
**Acceptance criteria:**
- [ ] CSR generated using a key pair held only in the secrets store; private key never leaves the store.
- [ ] Test certificate received from Energinet and installed in the test-environment secrets store.
- [ ] Certificate fingerprint and expiry date recorded in the tracker.
- [ ] Test connectivity to DataHub test environment verified by establishing a TLS handshake (no business message yet).
- [ ] An expiry alert is configured to fire 30 days before expiry (per US-06).

**Definition of done:** Test certificate installed; connectivity verified; tracker updated.

**Satisfies:** US-06.

### Task 4.4 — Validate test environment connectivity with Energinet

**Description:** Complete the Energinet test environment validation procedure as required for production certificate issuance. This is the engineering acceptance step Energinet runs before issuing a production certificate.
**Owner category:** Engineering (Platform) + Energinet.
**Lead time estimate:** 2–4 weeks after the test certificate is installed (per ADR-001 section 7.3).
**Acceptance criteria:**
- [ ] All Energinet-mandated test scenarios are executed and pass against the test environment.
- [ ] Test logs are retained as evidence and stored in the document store.
- [ ] Energinet confirms the validation passed and authorises issuance of a production certificate.
- [ ] Tracker updated to `complete` for the test validation artefact.

**Definition of done:** Energinet's confirmation of successful validation is on file.

**Satisfies:** US-06.

### Task 4.5 — Obtain DataHub production certificate

**Description:** Generate a production CSR, receive the production certificate from Energinet, and install it in the production secrets store. The production certificate is never copied to the test environment and never committed to source control (per ADR-001 section 3.6).
**Owner category:** Engineering (Platform).
**Lead time estimate:** Immediately after task 4.4 passes.
**Acceptance criteria:**
- [ ] Production CSR generated with a fresh key pair held only in the production secrets store.
- [ ] Production certificate received from Energinet and installed.
- [ ] Certificate fingerprint and expiry date recorded in the tracker.
- [ ] Expiry alert configured 30 days before expiry.
- [ ] Production secrets-store access is restricted to a documented short list of engineers.

**Definition of done:** Production certificate installed; tracker updated; access list documented.

**Satisfies:** US-06.

### Task 4.6 — Sign BRP agreement with a Danish Balance Responsible Party

**Description:** Negotiate and sign a contract with one of the ~40 active Danish BRPs to perform Nord Pool portfolio trading on TCPC's behalf (per spec section 8 item 4).
**Owner category:** Commercial / CEO.
**Lead time estimate:** 2–6 weeks (parallel track per ADR-001 section 7.3).
**Acceptance criteria:**
- [ ] BRP selected and contract signed.
- [ ] Contract effective date and contract expiry/renewal date recorded in the tracker.
- [ ] BRP's operational contacts (technical, commercial, escalation) recorded.
- [ ] Internal handoff documentation explains the BRP relationship and any operational expectations on TCPC's side.

**Definition of done:** Signed contract on file; tracker updated with effective and expiry dates.

**Satisfies:** US-06.

### Task 4.7 — Sign Standard Agreement with at least one netselskab

**Description:** Sign the Green Power Denmark Standard Agreement with each DSO (netselskab) where TCPC will have customers. At least one signed agreement is required before any production customer onboarding in that area.
**Owner category:** Commercial / Regulatory PM.
**Lead time estimate:** 2–6 weeks per DSO (parallel track).
**Acceptance criteria:**
- [ ] At least one Standard Agreement signed with a DSO whose service area includes TCPC's launch region.
- [ ] For each agreement: DSO name, effective date, area code(s) covered are recorded in the tracker.
- [ ] Each DSO's published version of the Standard Agreement (as approved by Forsyningstilsynet) is filed in the document store.
- [ ] A backlog entry exists for each additional DSO area planned for launch.

**Definition of done:** At least one signed agreement on file; tracker updated; remaining DSOs planned.

**Satisfies:** US-06.

### Task 4.8 — Registration-status tracker (software)

**Description:** Implement the software side of US-06: a small admin-portal-visible tracker for each required registration artefact with status values `not started`, `in progress`, `complete`, `expires on <date>`. Includes certificate expiry alerts (30 days), BRP renewal tracking, and per-DSO Standard Agreement tracking.

**Acceptance criteria:**
- [ ] A `registration_artefact` table stores: `artefactType`, `name`, `status`, `effectiveDate`, `expiryDate`, `notes`, `lastUpdatedBy`, `lastUpdatedAt`.
- [ ] Artefact types include at minimum: `datahub_registration`, `deposit`, `test_certificate`, `production_certificate`, `brp_agreement`, `standard_agreement_per_dso`, `master_data_submission`.
- [ ] Admin-portal endpoints exist to read all artefacts and to update status.
- [ ] A daily job emits an alert for any artefact whose `expiryDate` is within 30 days.
- [ ] The DataHub master data submission status is trackable per supplier and per metering point (per US-06 acceptance criterion 5).
- [ ] Updates are recorded in the audit log.

**Definition of done:** Endpoints deployed to test environment; daily expiry job verified; admin-portal contract documented; reviewed by Architect.

**Satisfies:** US-06.

---

## Epic 5: Price API Endpoint

**Goal:** Provide an internal REST API that serves current, forecast, and historical øre/kWh prices to the iOS app, marketing site, and admin portal. All reads are served from local storage (per ADR-001 section 3.4); the API never calls Energi Data Service synchronously. Includes appropriate cache headers, the `stale: true` flag when data is older than 26 hours, the historical-gap reporting from US-04, and the attribution metadata from task 1.7.

**Dependencies:**
- Epic 1 (spot price storage and ingestion) for the data.
- Epic 2 (calculation engine) for the all-in price.
- Backend/API specification (auth model for internal endpoints) — flagged in ADR-001 section 6.3.

### Task 5.1 — Current and next-day price endpoint

**Description:** Implement `GET /prices/current?priceArea={DK1|DK2}&dsoAreaCode={optional}` returning the price for the current hour and the remaining hours of today plus all of tomorrow if available. Response includes per-hour `spotOreKwh`, `energyPrice` (spot + margin), and `finalConsumerPrice` when DSO is supplied; energy-only otherwise (per task 2.4).

**Acceptance criteria:**
- [ ] `priceArea` is required; missing or invalid values return HTTP 400 with code `PRICE_AREA_REQUIRED` or `PRICE_AREA_INVALID` (per US-02).
- [ ] When `dsoAreaCode` is omitted, the response contains energy-only prices (no `finalConsumerPrice`); when supplied, the response contains the full breakdown per task 2.3.
- [ ] Response includes the attribution object from task 1.7.
- [ ] Each hour is returned with at least 4 decimal places of precision (per US-03).
- [ ] Rows include both raw spot and spot+margin, per US-03 acceptance criterion 3.
- [ ] Negative spot prices are returned as-is (per US-03).
- [ ] Response p95 latency under 200 ms for a warmed cache against local storage (per spec section 10).

**Definition of done:** Endpoint deployed to test environment; contract test passes; latency budget verified under representative load.

**Satisfies:** US-02, US-03, US-07, US-08 (stale flag added in 5.3).

### Task 5.2 — Historical price endpoint

**Description:** Implement `GET /prices/history?priceArea={DK1|DK2}&from={iso}&to={iso}&page={n}` returning hourly records from local storage for the requested range. Pages of at most 1000 records when the range exceeds 31 days. Explicitly lists missing hours rather than silently omitting them.

**Acceptance criteria:**
- [ ] Required parameters: `priceArea`, `from`, `to`. Missing or invalid → HTTP 400.
- [ ] When the range exceeds 31 days, the response is paginated; default page size is 1000 records; response contains `nextPageToken` when more data exists.
- [ ] When any hour in the requested range is missing from local storage, the response includes a `gaps` array listing each missing `hourUTC`.
- [ ] Records are returned ordered ascending by `hourUTC` within a page.
- [ ] Response includes the attribution object.
- [ ] An `Authorization`-gated variant (or a separate parameter) controls whether the all-in calculation is included; for unauthenticated marketing-site reads only the spot+margin energy price is returned.

**Definition of done:** Endpoint deployed to test environment; pagination, gap reporting, and ordering covered by integration tests.

**Satisfies:** US-04.

### Task 5.3 — Stale-data flag and freshness handling

**Description:** Per US-08 and spec section 9, every price API response must include a `stale: true` flag whenever the most recent persisted record for the requested area is older than 26 hours. When stale, the response also includes `lastIngestedAt` so the iOS app can render "Live prices temporarily unavailable — last updated [timestamp]".

**Acceptance criteria:**
- [ ] All price endpoints (5.1, 5.2, 5.4) compute and return `stale` and `lastIngestedAt` fields.
- [ ] `stale = true` if and only if `now - lastIngestedAt > 26 hours` for the requested `priceArea`.
- [ ] The API never silently substitutes a default, average, or extrapolated value for a missing hour (per US-08 acceptance criterion 3).
- [ ] Integration tests cover three cases: fresh, exactly-at-threshold, and stale.
- [ ] When stale, no HTTP error is returned — the caller still receives whatever data is available, with the flag.

**Definition of done:** Flag verified across all endpoints; iOS and marketing-site contract teams notified; documentation updated.

**Satisfies:** US-08.

### Task 5.4 — Cache headers and CDN compatibility

**Description:** Set HTTP cache headers appropriate for each endpoint. Current-day prices should be cached briefly (allowing for stale-while-revalidate). Historical immutable ranges may be cached aggressively. Clients (iOS, marketing site) and any intermediate CDN should be able to honour the headers without showing stale data past the SLO.

**Acceptance criteria:**
- [ ] `GET /prices/current` returns `Cache-Control: public, max-age=300, stale-while-revalidate=600` (or equivalent values agreed with Architect) and an `ETag`.
- [ ] `GET /prices/history` returns `Cache-Control: public, max-age=3600, immutable` for ranges entirely in the past, and `max-age=300` for ranges that include today.
- [ ] Responses honour `If-None-Match` and return 304 when the `ETag` matches.
- [ ] When `stale: true` is set, `Cache-Control` is reduced to `max-age=60` so a clearing of the upstream issue propagates quickly.
- [ ] `Vary: Accept-Encoding` (and any locale header used) is set correctly.

**Definition of done:** Headers verified by integration tests; CDN configuration documented; deployed to test environment.

**Satisfies:** US-08, spec section 10 (Latency).

### Task 5.5 — Health endpoint and ingestion freshness dashboard

**Description:** Per US-08, an admin-visible health dashboard must show the timestamp of the latest successful ingestion per price area. Implement `GET /admin/health/spot-ingestion` and a small admin-portal page that consumes it.

**Acceptance criteria:**
- [ ] `GET /admin/health/spot-ingestion` returns, for each of DK1 and DK2: `lastIngestedAt`, `lastSuccessfulRunId`, `lastFailureAt` (if any), `lastFailureReason` (if any), and `currentlyStale` (boolean).
- [ ] Endpoint is gated by an admin role.
- [ ] The data is sourced from the `ingestion_run_log` populated in task 1.3.
- [ ] Admin-portal page renders the values and a green/amber/red indicator (green = fresh, amber = > 22 hours, red = > 26 hours / stale).
- [ ] Manual trigger for an out-of-band ingestion run is exposed (per task 1.3) and gated by the admin role.

**Definition of done:** Endpoint and dashboard deployed to test environment; reviewed by operations.

**Satisfies:** US-08.

### Task 5.6 — Error response contract

**Description:** Define and implement a consistent error response envelope across all price API endpoints, covering: missing/invalid `priceArea` (US-02), unknown DSO (per task 2.4), historical range out of bounds, and internal errors. Each error has a stable `code`, a human-readable `message`, and a `correlationId` for log lookup.

**Acceptance criteria:**
- [ ] Error envelope: `{ "code": "...", "message": "...", "correlationId": "..." }` returned with appropriate HTTP status codes (400 for client error, 404 for not-found, 500 for internal).
- [ ] All known error codes are documented in the API contract: `PRICE_AREA_REQUIRED`, `PRICE_AREA_INVALID`, `NETWORK_TARIFF_NOT_CONFIGURED`, `SUPPLIER_MARGIN_NOT_CONFIGURED`, `DATE_RANGE_INVALID`, `PAGE_TOKEN_INVALID`, `INTERNAL_ERROR`.
- [ ] `correlationId` matches the value in the server logs for the same request, so on-call can join logs to user reports.
- [ ] The API never leaks stack traces or internal table names to clients.
- [ ] Contract tests cover each documented error path.

**Definition of done:** Error envelope merged into the OpenAPI/contract document; reviewed by Architect; deployed to test environment.

**Satisfies:** US-02, US-07, spec section 9.

---

## Cross-cutting notes

- **Time zones.** All scheduling and customer-facing display use `Europe/Copenhagen` per spec section 10. Internal storage uses UTC for `hourUTC`. Be especially careful at daylight-saving boundaries in tasks 1.4, 2.2, and 5.1.
- **Attribution.** Every API response that exposes Elspot data must carry the `attribution` block from task 1.7. iOS app, marketing site, and admin portal all need to render this somewhere visible.
- **Out of scope here, in scope elsewhere.** BRS-H1 supplier-switch ebIX integration is required for production customer onboarding but is owned by a separate DataHub B2B Integration component (per ADR-001 section 6.2). This epic must not block waiting for it.
- **Auditability.** Per spec section 10, every ingestion run (Epic 1), every Eloverblik token exchange (Epic 3), and every consent state change (Epic 3) must be logged with sufficient detail to reconstruct the event.
- **Open questions still tracked in the source spec** (do not resolve in this epic plan): DataHub Green Energy Hub migration timing, DKK 1M deposit confirmation, intraday price needs, netselskab tariff variability automation, elafgift 1 Jan 2026 figure confirmation, direct supplier access via DataHub B2B.
