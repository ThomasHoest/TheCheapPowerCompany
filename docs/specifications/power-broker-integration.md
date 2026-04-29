# Specification: Power Broker Integration

**Status:** Draft
**Owner:** Platform engineering
**Last updated:** 2026-04-29

---

## 1. Overview

The Power Broker Integration is the backend component that connects The Cheap Power Company to Danish electricity market infrastructure. It is responsible for two distinct but related capabilities: (a) ingesting day-ahead Elspot prices for DK1 and DK2 from Energinet's open data service so that the consumer app and marketing site can display live, accurate prices; and (b) providing the integration scaffolding required to operate as a registered supplier in DataHub and pull individual customer meter data via Eloverblik. This component does not handle physical power trading — that is delegated to a contracted Balance Responsible Party (BRP). It is the system boundary between The Cheap Power Company and the regulated Danish electricity market.

This document specifies the functional behaviour. Implementation language, framework, and storage technology are deferred to the architecture document.

---

## 2. Goals

- Fetch day-ahead Elspot prices for both DK1 and DK2 from Energi Data Service every business day, after the day-ahead auction publishes.
- Persist a complete, queryable history of hourly spot prices for both price areas.
- Serve current and next-day prices to the consumer app and marketing site as a stable internal API, expressed in øre/kWh including the company markup.
- Compute the full consumer-facing price (spot + supplier margin + network tariff + Energinet tariffs + elafgift + VAT) for any given hour and price area.
- Allow customers to grant consent and pull their own metering point data from Eloverblik via the third-party API.
- Document and track the regulatory artefacts (DataHub registration, deposit, certificates, BRP and netselskab agreements) required to operate as a licensed supplier.
- Degrade gracefully when upstream services are unavailable, never showing stale or misleading prices to consumers without an explicit indicator.

---

## 3. Out of Scope (this version)

- **Physical power trading on Nord Pool.** This is performed by the contracted BRP. No order placement, bidding, or trading interface is built.
- **Intraday / real-time price feeds (Elbas / XBID).** Energi Data Service is day-ahead only; intraday data requires a commercial Nord Pool subscription and is deferred.
- **Production DataHub B2B message exchange (BRS-H1, BRS-H3).** The full ebIX message implementation for customer switching and wholesale settlement is a subsequent component. This specification covers only the price feed and Eloverblik consent-based meter data access.
- **Automated netselskab tariff ingestion.** Network tariffs vary by DSO and time-of-use; for v1 they are configured manually per supported area.
- **Invoicing and billing.** Out of scope for this component.
- **Customer onboarding / supplier switching flow.** Covered by the customer onboarding component.
- **PSO-tarif handling.** Abolished 1 January 2022; not modelled.

---

## 4. Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| Spot price API base URL | `https://api.energidataservice.dk/dataset/` | Official Energinet open data endpoint |
| Primary dataset | `Elspotprices` | Day-ahead hourly prices for DK1 and DK2 |
| Spot API authentication | None | Open and free, CC BY 4.0 |
| Spot API rate limit | None published | Daily polling well within tolerance |
| Data format | JSON over REST (HTTP GET) | No streaming/WebSocket interface exists |
| Update frequency | Once daily, by ~13:00 CET | Nord Pool publishes ~12:45 CET; we poll at 13:15 CET |
| Licence | CC BY 4.0 | Attribution required: "Energi Data Service / Energinet" |
| Customer meter data API | `https://api.eloverblik.dk/thirdpartyapi/` | Eloverblik third-party API |
| Eloverblik auth | JWT Bearer; refresh token (1 yr) → data access token (24 hr) | Per Eloverblik docs |
| TSO / DataHub operator | Energinet | Mandatory B2B hub for retail electricity transactions |
| Market regulator | Forsyningstilsynet (DUR) | Consumer protection oversight |
| Policy body | Energistyrelsen (DEA) | Legislation |
| Required registrations | DataHub registration + DKK 1,000,000 cash deposit + digital certificate (test + prod) + BRP agreement + Standard Agreement with netselskaber | Per Energinet Terms of Access for Suppliers |
| Price areas covered | DK1 (West Denmark), DK2 (East Denmark) | Standard Danish Elspot zones |
| Display unit | øre/kWh | Source data is DKK/MWh; converted on read |
| Currency | DKK | Internal storage may also persist EUR for audit |

---

## 5. User Stories with Acceptance Criteria

### US-01 — Daily ingestion of day-ahead Elspot prices

> As the platform, I want to fetch tomorrow's hourly Elspot prices for DK1 and DK2 every afternoon so that the app can show consumers tomorrow's prices as soon as they are available.

**Acceptance criteria:**
- A scheduled job runs every day at 13:15 CET (Europe/Copenhagen).
- The job issues a single HTTP GET request to `https://api.energidataservice.dk/dataset/Elspotprices` filtered by `PriceArea` for `["DK1","DK2"]`, covering today and tomorrow (start = `StartOfDay`, end = `StartOfDay+P2D`), with `timezone=dk`.
- All returned hourly records (`HourUTC`, `HourDK`, `PriceArea`, `SpotPriceDKK`, `SpotPriceEUR`) are persisted to local storage. Records that already exist (same `HourUTC` + `PriceArea`) are upserted, not duplicated.
- For a successful run on day D, the database contains 24 DK1 and 24 DK2 hourly records for day D+1 by 13:30 CET.
- Job execution emits a structured log entry recording: timestamp, request URL, HTTP status, number of records persisted, and run duration.

### US-02 — Distinct DK1 and DK2 area handling

> As a consumer in either West or East Denmark, I want to see the price for my own price area so that the figures shown match my actual bill.

**Acceptance criteria:**
- Every persisted price record is tagged with its `PriceArea` (`DK1` or `DK2`).
- The internal price API requires a `priceArea` parameter and rejects requests where this is missing or has any value other than `DK1` or `DK2`.
- A single response never mixes prices from both areas without explicit area labels per row.
- A consumer's home price area is stored on their account and used as the default when the app requests prices.

### US-03 — Display price in øre/kWh including supplier markup

> As a consumer, I want to see prices in øre/kWh that already include The Cheap Power Company's markup so that the number on screen reflects what I will be charged for energy (before tariffs and tax).

**Acceptance criteria:**
- The internal price API converts `SpotPriceDKK` (DKK/MWh) to øre/kWh using the formula `øre/kWh = SpotPriceDKK / 10`.
- The configured supplier margin (per-kWh markup, in øre/kWh) is added to the converted spot price.
- The response includes both the raw spot price and the spot+margin price as separate fields, so the app can show the breakdown if required.
- Negative spot prices are preserved (not floored at zero); markup is added algebraically.
- Numerical values are returned with at least 4 decimal places of precision; rounding for display is performed by the consumer of the API.

### US-04 — Historical price access

> As a consumer or analyst, I want to query historical hourly prices for any past date so that I can review past costs and trends.

**Acceptance criteria:**
- The internal price API accepts a date range (`from`, `to`) and a price area, and returns all hourly records for that range from local storage.
- Queries that span more than 31 days return data in pages of at most 1000 records.
- If a requested historical date is missing from local storage (gap), the response explicitly lists the missing hours rather than silently omitting them.
- Historical records are immutable once persisted: a re-run of ingestion for a past day must not overwrite existing data unless an explicit `force` flag is set on the ingestion job.

### US-05 — Customer meter data access via Eloverblik

> As a customer, I want to grant The Cheap Power Company access to my consumption data so that the app can show me how much I have used and what it cost me hour by hour.

**Acceptance criteria:**
- The platform is registered as a third party in the Eloverblik portal and holds a valid refresh token (valid 1 year).
- A workflow exists to exchange the refresh token for a data access token (JWT, valid 24 hours) and to refresh the access token automatically when expired.
- The customer is presented with a clear consent step that links them to Eloverblik to grant access for their metering point and a defined time window.
- After consent, the platform calls `GET /api/meteringpoints/meteringpoints` and persists the metering point ID, address, grid area, and meter type for the customer.
- The platform calls `POST /api/meterdata/gettimeseries/{dateFrom}/{dateTo}/Hour` to retrieve hourly consumption (kWh) for a granted metering point and date range.
- The platform calls `POST /api/meterdata/getcharges` to retrieve the breakdown of charges (tariff, subscription, fee) per metering point.
- All Eloverblik calls use the data access token as a Bearer token in the `Authorization` header.
- If the customer revokes consent in Eloverblik, subsequent calls return an authorization error and the platform marks the metering point as "consent withdrawn" and stops attempting further requests until re-granted.

### US-06 — DataHub registration and supplier readiness

> As The Cheap Power Company, I need a documented and tracked process for becoming a registered electricity supplier in DataHub so that we can operate legally and onboard customers.

**Acceptance criteria:**
- The system tracks the status of each required registration artefact (DataHub registration, DKK 1,000,000 deposit, test certificate, production certificate, BRP agreement, Standard Agreement per netselskab) with status values at minimum: `not started`, `in progress`, `complete`, `expires on <date>`.
- Certificate expiry dates are tracked and an alert is raised at least 30 days before expiry.
- The BRP relationship is recorded with the BRP's name, contract effective date, and contract expiry/renewal date.
- For each netselskab the company is contracted with, the Standard Agreement effective date and the area code(s) covered are recorded.
- The DataHub master data submission status is tracked per supplier and per metering point.

### US-07 — Final consumer price calculation

> As a consumer, I want to see the full price per kWh including all fees, tariffs and tax so that I understand what each kWh actually costs me.

**Acceptance criteria:**
- The platform exposes a calculation that, given an hour and a price area, returns the all-in consumer price in øre/kWh.
- The calculation is `final = (spot + supplier_margin + network_tariff + energinet_system_tariff + energinet_balancing_tariff + elafgift) × 1.25` (25% VAT).
- Each input component is separately retrievable, so a UI can render the full breakdown.
- The configured tariff and tax values are dated: changing the elafgift on 1 January 2026 must not retroactively alter prices computed for hours before that date.
- The calculation must support time-of-use network tariffs (different `network_tariff` value depending on hour-of-day for the metering point's DSO).

### US-08 — Price unavailability fallback

> As the platform, I want to behave predictably when upstream prices are not available so that consumers are never shown stale or misleading data without warning.

**Acceptance criteria:**
- If the daily ingestion job fails, it retries with exponential backoff at 5, 15, 30, 60 minutes; a sustained failure beyond 4 hours triggers an alert to the on-call engineer.
- If, at the time of a price API request, the most recent persisted record for the requested area is more than 26 hours old, the API response includes a `stale: true` flag and the consumer app surfaces a visible "Live prices temporarily unavailable" notice.
- The price API never silently substitutes a default, average, or extrapolated value for a missing hour.
- An admin-visible health dashboard shows the timestamp of the latest successful ingestion per price area.

---

## 6. Data Model

### 6.1 Spot price record (mirrors `Elspotprices` dataset)

| Field | Type | Source | Notes |
|---|---|---|---|
| `hourUTC` | datetime (UTC) | `HourUTC` from API | Primary part of natural key |
| `hourDK` | datetime (Europe/Copenhagen) | `HourDK` from API | Stored for display convenience |
| `priceArea` | enum (`DK1`, `DK2`) | `PriceArea` from API | Other part of natural key |
| `spotPriceDKK` | decimal (DKK/MWh) | `SpotPriceDKK` from API | Source unit, store as-is |
| `spotPriceEUR` | decimal (EUR/MWh) | `SpotPriceEUR` from API | Audit / cross-check |
| `ingestedAt` | datetime (UTC) | system clock | When this row was persisted |
| `source` | string | constant `"energi-data-service:Elspotprices"` | Provenance |

**Natural key:** (`hourUTC`, `priceArea`). Inserts are upserts on this key.

### 6.2 Tariff and tax configuration (versioned)

| Field | Type | Notes |
|---|---|---|
| `componentType` | enum (`supplier_margin`, `network_tariff`, `energinet_system`, `energinet_balancing`, `elafgift`) | |
| `priceArea` | enum (`DK1`, `DK2`) or null | Null for components that apply nationally |
| `dsoAreaCode` | string or null | Required for `network_tariff` |
| `validFrom` | date | Inclusive |
| `validTo` | date or null | Exclusive; null for open-ended |
| `value` | decimal (øre/kWh, excluding VAT) | |
| `hourOfDayPattern` | optional string | For time-of-use network tariffs |

### 6.3 Markup application

The configured supplier margin is a per-kWh value in øre/kWh, stored in tariff configuration with `componentType = supplier_margin`. It is added to the spot price after unit conversion:

```
spot_ore_kwh   = spotPriceDKK / 10                         # DKK/MWh -> øre/kWh
margin_ore_kwh = configured supplier_margin (øre/kWh)
energy_price   = spot_ore_kwh + margin_ore_kwh
```

### 6.4 Final consumer price formula

```
subtotal_ex_vat = energy_price
                + network_tariff
                + energinet_system_tariff
                + energinet_balancing_tariff
                + elafgift

final_consumer_price = subtotal_ex_vat × 1.25            # 25% VAT
```

All component values are in øre/kWh. The 25% VAT is applied to the sum, not to each component individually. The subscription fee (monthly/weekly) is a separate billing line and is not part of the per-kWh price.

### 6.5 Eloverblik metering point record

| Field | Type | Notes |
|---|---|---|
| `meteringPointId` | string | From Eloverblik |
| `customerId` | foreign key | Internal customer ID |
| `address` | string | From Eloverblik |
| `gridArea` | string | DSO area code |
| `meterType` | string | e.g. smart, traditional |
| `consentStatus` | enum (`granted`, `withdrawn`, `expired`) | |
| `consentValidFrom` | date | |
| `consentValidTo` | date | |

### 6.6 Eloverblik consumption record

| Field | Type | Notes |
|---|---|---|
| `meteringPointId` | string | |
| `hourUTC` | datetime | |
| `consumptionKWh` | decimal | |
| `fetchedAt` | datetime | |

---

## 7. Integration Architecture

### 7.1 Daily polling schedule

- A cron-style scheduled job runs at **13:15 Europe/Copenhagen time**, every day.
- The job's request:
  ```
  GET https://api.energidataservice.dk/dataset/Elspotprices
      ?filter={"PriceArea":["DK1","DK2"]}
      &start=StartOfDay
      &end=StartOfDay+P2D
      &limit=96
      &timezone=dk
      &sort=HourDK desc
  ```
- The job upserts results into the spot price store keyed on (`hourUTC`, `priceArea`).
- A secondary backfill job runs once weekly to detect and refetch any gaps in the last 90 days.

### 7.2 Local storage strategy

- All Elspot data is mirrored locally. The consumer app and marketing site read only from local storage, never directly from `api.energidataservice.dk`.
- Historical data is retained indefinitely for audit and analytics. (Retention policy may be revisited if storage cost becomes material.)
- Eloverblik consumption data is cached locally with a configurable TTL (default: refetch each customer's data daily for the previous 7 days) to limit Eloverblik API load.

### 7.3 Eloverblik consent flow

1. Customer initiates "connect my meter" in the app.
2. Platform redirects customer to Eloverblik to authenticate with MitID and grant consent for the third-party app for the chosen metering point and time window.
3. Customer returns to the app; platform polls Eloverblik metering points endpoint to confirm the new consent.
4. Platform stores the metering point and consent metadata. Future data fetches are scheduled.
5. Refresh tokens (1-year validity) are stored encrypted at rest. Data access tokens (24-hour validity) are obtained on demand and not persisted.

### 7.4 DataHub B2B channel (forward-looking scaffolding)

- DataHub communication uses ebIX-standard XML messages over a certificate-authenticated B2B channel.
- The current scope is to record certificates and registration status. Full implementation of BRS processes (BRS-H1 customer switching, BRS-H3 wholesale settlement) is a separate component and out of scope for this version.
- Production and test certificates are stored in a secure secrets store (not source control).

---

## 8. Regulatory Requirements

To operate as an electricity supplier (elleverandør) in Denmark and use this integration in production, the following must be in place:

1. **DataHub registration** with Energinet — mandatory for all retail electricity transactions, customer switching, meter data, and Engrosmodellen invoicing.
2. **Cash deposit of DKK 1,000,000** to Energinet, per legal entity. Returned 6 months after deregistration. (See Open Question 2 — confirm current figure.)
3. **Digital certificates** — one for the DataHub test environment, one for production. Used for all B2B message authentication.
4. **Balance Responsible Party (BRP) agreement** — contract with one of the ~40 active Danish BRPs. The BRP handles Nord Pool portfolio trading. The Cheap Power Company will not be its own BRP in v1.
5. **Standard Agreement with netselskaber (DSOs)** — the Green Power Denmark Standard Agreement governs supplier-DSO cooperation, signed per DSO area where the company has customers. Each DSO submits its version to Forsyningstilsynet for approval.
6. **Master data in DataHub** — supplier master data plus customer-level data (CPR/CVR, metering point associations) submitted and maintained.

Operational compliance:

- Forsyningstilsynet (DUR) market conduct and consumer protection rules apply on an ongoing basis.
- All consumer-facing price and fee disclosures must be accurate and up to date, particularly across the 1 January 2026 elafgift change.
- CC BY 4.0 attribution to "Energi Data Service / Energinet" must be visible wherever Elspot data is published.

Reference document: [Energinet Terms of Access for Suppliers](https://en.energinet.dk/media/juml3hty/terms-of-access-to-and-use-of-the-datahub-supplier.pdf).

---

## 9. Error States

| Scenario | Expected Behaviour |
|---|---|
| Energi Data Service returns 5xx | Retry with exponential backoff (5, 15, 30, 60 min). Existing data remains usable. After 4 hours of sustained failure, alert on-call. |
| Energi Data Service returns 4xx | Log full request and response. Do not retry automatically. Alert on-call within 15 minutes. |
| Energi Data Service returns 200 but with empty `records` array | Treat as failure. Retry per backoff schedule. Do not overwrite existing data with empty set. |
| Energi Data Service returns partial day (some hours missing) | Persist what was returned; flag the gap. Backfill job will attempt to fill it on its next pass. |
| Latest persisted record older than 26 hours | API responses include `stale: true`. App displays "Live prices temporarily unavailable — last updated [timestamp]". Marketing site displays the same notice in place of the live ticker. |
| Eloverblik refresh token expired | Log the expiry; mark all dependent metering points as "needs reconsent"; surface a notification to the customer to re-grant consent. |
| Eloverblik data access token rejected (401) | Attempt one refresh from refresh token; if that also fails, treat as refresh-token-expired (above). |
| Eloverblik returns 403 for a metering point | Mark consent as `withdrawn`. Stop scheduled fetches. Notify the customer that consent appears to have been revoked. |
| Eloverblik returns 5xx | Retry with exponential backoff up to 1 hour. Customer-facing app shows last-known data with a "consumption data may be delayed" notice. |
| Network tariff for the consumer's DSO area is missing from configuration | Final consumer price calculation returns an explicit error and the app displays "Cannot compute total price for your area — please contact support". The energy-only price (spot + margin) is still shown. |
| Negative spot price | Stored and displayed as-is. Markup is added algebraically. UI may render in a distinct colour but the value is not floored. |
| Price area mismatch (DK1/DK2 vs customer's DSO area) | Data ingestion is unaffected. The app uses the customer's configured price area; if that is missing, the app prompts the customer to confirm their region. |

---

## 10. Non-Functional Requirements

- **Latency:** Internal price API responses for current-day prices must return in under 200 ms at the 95th percentile, served from local storage.
- **Availability:** The price API targets 99.5% monthly availability. The ingestion job is allowed to fail for individual runs as long as the freshness SLO (data no older than 26 hours) is maintained.
- **Freshness:** For a normal day, tomorrow's prices are visible in the app no later than 13:30 CET.
- **Attribution:** Wherever Elspot data is shown to end users, attribution to "Energi Data Service / Energinet (CC BY 4.0)" is visible.
- **Privacy:** Eloverblik refresh tokens, customer metering data, and CPR numbers are encrypted at rest and access-logged. Only authenticated customers can read their own metering data.
- **Auditability:** Every ingestion run, every Eloverblik token exchange, and every consent state change is logged with sufficient detail to reconstruct the event.
- **Time zone:** All scheduling and customer-facing display use Europe/Copenhagen. Internal storage uses UTC for `hourUTC` fields.

---

## 11. Open Questions

1. **DataHub API migration to Green Energy Hub.** Energinet is modernising DataHub (open source on GitHub at `github.com/Energinet-DataHub`). Owner: platform engineering lead, in consultation with Energinet. Default assumption: build against the current ebIX B2B channel and revisit before production cutover.
2. **DKK 1,000,000 deposit confirmation.** Figure is from the 2021 Terms of Access PDF. Owner: company founder / finance. Default assumption: budget DKK 1,000,000 until confirmed in writing by Energinet.
3. **Intraday / real-time price needs.** Not available from Energi Data Service. Owner: product. Default assumption: day-ahead is sufficient for v1; revisit if EV-charging optimisation features are prioritised.
4. **Netselskab tariff variability.** Tariffs differ per DSO area, vary by time of use, and change annually. Owner: data engineering. Default assumption: manually configured per supported DSO area in v1; build a scheduled tariff sync (per DSO published schedule or aggregator) in v2.
5. **Elafgift 1 January 2026 change.** Reduction to ~1 øre/kWh is a major policy shift. Owner: product + finance. Default assumption: tariff configuration is date-versioned (per Section 6.2); pricing models, marketing copy, and forecasting must be reviewed for both the pre- and post-2026 regimes.
6. **Direct supplier access to own customer meter data via DataHub.** Whether a registered supplier can pull its own customers' metering data directly via DataHub B2B (bypassing Eloverblik third-party consent) needs validation with Energinet. Owner: platform engineering. Default assumption: use Eloverblik third-party API with explicit consent in v1.

---

## 12. Resolved Decisions

| Question | Decision |
|---|---|
| Should we poll Energi Data Service or use a streaming feed? | Poll. No streaming/WebSocket interface exists. |
| Auth model for Energi Data Service? | None. API is open and free. |
| Polling cadence? | Once daily at 13:15 Europe/Copenhagen, after the ~12:45 CET Nord Pool publication. |
| Which price areas are in scope? | DK1 and DK2 only — both are required from day one. |
| Storage strategy for spot prices? | Mirror locally; serve all consumer reads from the local store. |
| Display unit? | øre/kWh, including supplier markup, with a separate field exposing the raw spot price. |
| Customer meter data access path for v1? | Eloverblik third-party API with explicit consent flow. DataHub B2B direct supplier access deferred. |
| BRP strategy for v1? | Contract with an existing BRP. Do not become our own BRP. |
| PSO-tarif handling? | Not modelled — abolished 1 January 2022. |
| Attribution requirement? | Required per CC BY 4.0: "Energi Data Service / Energinet" wherever data is shown. |
