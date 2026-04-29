# Research: Power Broker Integration

## Summary

Energinet's open data portal (energidataservice.dk) exposes a free, unauthenticated REST/JSON API for Elspot day-ahead spot prices (dataset `Elspotprices`) covering DK1 and DK2. The data is hourly, updated once per day after Nord Pool publishes at ~12:45 CET, and is licensed CC BY 4.0 with no rate limits. Separately, becoming a power supplier in Denmark requires DataHub registration with Energinet, a DKK 1,000,000 cash deposit, a digital certificate for B2B messaging, and agreement with a Balance Responsible Party (BRP) and the relevant grid company (netselskab). Customer meter data is accessed via a separate Eloverblik API with JWT token auth. The total consumer price of electricity comprises: spot price + supplier margin + network tariff (netselskab) + Energinet system/transmission tariff + elafgift (reduced to ~1 øre/kWh from Jan 2026) + 25% VAT.

---

## energinet.dk / Energi Data Service API

### Endpoints and Data

**Base URL:** `https://api.energidataservice.dk/dataset/`

**Primary dataset:** `Elspotprices`

Full example request:
```
GET https://api.energidataservice.dk/dataset/Elspotprices?start=now-P1D&end=now&filter={"PriceArea":["DK1","DK2"]}&sort=HourDK desc&limit=48&timezone=dk
```

**Dataset fields:**

| Field | Type | Description |
|---|---|---|
| `HourUTC` | datetime | Hour in UTC |
| `HourDK` | datetime | Hour in Danish local time |
| `PriceArea` | string | `"DK1"` (West Denmark) or `"DK2"` (East Denmark) |
| `SpotPriceDKK` | float | Spot price in DKK/MWh |
| `SpotPriceEUR` | float | Spot price in EUR/MWh |

**Supported query parameters:**

| Parameter | Description |
|---|---|
| `start` | Start of period. Absolute (`2024-01-01T00:00`) or dynamic (`now-P1D`, `StartOfDay-PT1H`) |
| `end` | End of period |
| `filter` | JSON object, e.g. `{"PriceArea":"DK1"}` or `{"PriceArea":["DK1","DK2"]}` |
| `sort` | Column + direction, e.g. `HourDK desc` |
| `limit` | Max rows returned |
| `offset` | Rows to skip (pagination) |
| `timezone` | `"dk"` for Danish local time, `"UTC"` for UTC |

**Other relevant datasets:**
- `CO2Emis` — real-time CO2 emissions per price area
- `ProductionConsumptionSettlement` — settlement data
- Full catalogue: `https://www.energidataservice.dk/datasets`

### Authentication and Rate Limits

- **Authentication:** None required. Fully open and free.
- **Rate limits:** No hard limits published. Poll no more frequently than the dataset update interval.
- **License:** CC BY 4.0 — freely reusable with attribution to Energi Data Service / Energinet.
- **Terms of use:** `https://www.energidataservice.dk/terms-and-conditions`

### Update Frequency and Data Format

- **Format:** JSON (REST, synchronous HTTP GET). No WebSocket or streaming interface.
- **Elspotprices update cadence:** Once per day. Nord Pool publishes day-ahead prices at approximately 12:45 CET. The dataset is populated shortly after — next-day prices for all 24 hours are available by ~13:00 CET.
- **Historical data:** Deep history available (years of hourly data).
- **Real-time / intraday:** Elspot is day-ahead only. No real-time intraday prices available from this API. Intraday market (Elbas/XBID) data requires a separate Nord Pool commercial subscription.
- **Polling recommendation:** Cron job firing at ~13:15 CET daily. One call fetches both DK1+DK2 for the next day.

---

## Danish Power Reselling Framework

### Regulatory Requirements

**Governing bodies:**

| Body | Role |
|---|---|
| Forsyningstilsynet (DUR) | Market conduct oversight, consumer protection |
| Energistyrelsen (DEA) | Legislation and policy |
| Energinet | TSO — owns and operates DataHub; mandatory B2B hub |

**To operate as an electricity supplier (elleverandør) in Denmark, a company must:**

1. **Register in DataHub** — Energinet's DataHub is mandatory for all retail electricity market transactions. Without registration, a company cannot switch customers, receive meter data, or invoice through the Engrosmodellen (Wholesale Model).

2. **Pay a DKK 1,000,000 cash deposit** to Energinet. Mandatory per legal entity. Returned 6 months after deregistration.

3. **Obtain a digital certificate** — one for the DataHub test environment and one for production. Used for all B2B message exchange.

4. **Sign an agreement with a Balance Responsible Party (BRP)** — a startup supplier must contract with an existing BRP (~40 active BRPs in Denmark) who handles Nord Pool portfolio trading. Do not attempt to become your own BRP initially.

5. **Sign the Standard Agreement with grid companies (netselskaber)** — the Green Power Denmark Standard Agreement governs supplier-DSO cooperation. Each DSO submits its version to Forsyningstilsynet for approval.

6. **Submit and maintain master data in DataHub** — customer CPR/CVR numbers, metering point associations, and supplier master data are mandatory.

**Market entry barriers:** Described by Forsyningstilsynet as "rather low" — approximately 40 active retailers in 2023/2024. No specific government ministry licence is required beyond DataHub registration and the financial deposit.

**Terms of access:** `https://en.energinet.dk/media/juml3hty/terms-of-access-to-and-use-of-the-datahub-supplier.pdf`

### DataHub / Eloverblik Integration

**DataHub (supplier B2B channel):**
- Suppliers communicate via ebIX-standard XML messages over a certificate-authenticated B2B channel.
- Business processes are defined in Energinet's BRS documents (BRS-H1 for customer switching, BRS-H3 for wholesale settlement).
- BRS documentation: `https://energinet.dk/media/2nqdysv3/brs-forretningsprocesser-for-det-danske-elmarked.pdf`
- Energinet open-source DataHub code: `https://github.com/Energinet-DataHub`

**Eloverblik (customer/third-party data access):**
Eloverblik (`www.eloverblik.dk`) is the consumer-facing portal built on DataHub. It exposes a REST API for authorized third parties.

| API | Base URL |
|---|---|
| Customer API | `https://api.eloverblik.dk/customerapi/` |
| Third-Party API | `https://api.eloverblik.dk/thirdpartyapi/` |
| Swagger UI | `https://api.eloverblik.dk/thirdpartyapi/index.html` |
| Docs portal | `https://docs.eloverblik.dk/docs/api/thirdparty` |

**Authentication flow (Eloverblik third-party API):**
1. Register as a third party in the Eloverblik portal.
2. Customer grants consent for a specific metering point and time period.
3. Third party creates a **refresh token** (valid 1 year) via the Eloverblik portal.
4. Exchange refresh token for a **data access token** (JWT, valid 24 hours) from the token endpoint.
5. Use data access token as Bearer token in all subsequent API calls.

**Key Eloverblik third-party API endpoints:**

| Endpoint | Description |
|---|---|
| `GET /api/meteringpoints/meteringpoints` | List of metering points for which consent was granted |
| `POST /api/meterdata/gettimeseries/{dateFrom}/{dateTo}/{aggregation}` | Hourly/daily consumption time series |
| `POST /api/meterdata/getmeterreadings/{dateFrom}/{dateTo}` | Meter readings |
| `POST /api/meterdata/getcharges` | Breakdown of charges (tariff, subscription, fee) |

**Data available per metering point:**
- Hourly (and quarter-hourly for smart meters) consumption in kWh
- Historical data going back years
- Metering point address, grid area, meter type
- Associated charges, tariffs, and subscriptions

### Cost Structure and Fees

Consumer electricity bill components in Denmark:

| Component | Notes |
|---|---|
| **Elspot / Nord Pool spot price** | Variable, hourly. DK1 or DK2 area price in EUR/MWh. Bought via BRP. |
| **Balancing / imbalance costs** | Passed through from BRP if portfolio deviates from schedule. |
| **Network tariff — netselskab (DSO)** | ~30–60 øre/kWh depending on area and time. Time-of-Use structure common. |
| **Energinet system tariff (transmissionstarif)** | ~12.5 øre/kWh incl. VAT (2025) |
| **Energinet balancing tariff (systemtarif)** | ~2–5 øre/kWh |
| **Elafgift (electricity consumption tax)** | 2025: ~90 øre/kWh incl. VAT. **From 1 Jan 2026: ~1 øre/kWh incl. VAT** (major policy change) |
| **PSO-tarif** | Abolished 1 January 2022 — no longer applicable |
| **VAT (moms)** | 25% on all components |

**Rough consumer price composition (2025, before elafgift reduction):**
- Spot + margin: ~25–35% of total
- Network (netselskab + Energinet): ~10–15%
- Taxes (elafgift + VAT): ~50–55%

**After 1 January 2026**, with elafgift near zero, the spot price becomes the dominant share of the bill. This is the structural shift that makes a transparent, spot-indexed product commercially attractive.

---

## Recommended Approach

### Energi Data Service API (live prices)

Use `https://api.energidataservice.dk/dataset/Elspotprices` with a daily cron job at ~13:15 CET. Fetch both DK1 and DK2 in one call:

```
GET /dataset/Elspotprices?filter={"PriceArea":["DK1","DK2"]}&start=StartOfDay&end=StartOfDay%2BP2D&limit=96&timezone=dk
```

No API key required. Store results in a local database to serve the app. No WebSocket exists — REST polling is the only option and is appropriate given the once-daily update cadence.

### Market Entry (regulatory path)

The fastest viable path for a startup:
1. Register a Danish company (ApS or A/S).
2. Contract with an existing BRP — they handle Nord Pool trading. Do not attempt to become your own BRP initially.
3. Negotiate the Standard Agreement with the relevant netselskaber in target areas.
4. Apply to Energinet for DataHub access: pay the DKK 1,000,000 deposit, obtain certificates, complete test environment validation.
5. Register in DataHub production and begin onboarding customers via the H1 switching process.

### Meter Data and Customer App Features

Use the Eloverblik third-party API (`https://api.eloverblik.dk/thirdpartyapi/`) with customer consent flows to pull hourly consumption data. This enables consumption-vs-price overlays, cost breakdowns, and optimization features in the companion app.

---

## Open Questions

1. **DataHub API migration:** Energinet is modernising DataHub (Green Energy Hub on GitHub). Verify current B2B interface documentation directly with Energinet before finalising integration architecture.
2. **DKK 1M deposit confirmation:** The figure comes from the official Terms of Access PDF (2021 version). Confirm with Energinet that it has not changed.
3. **Eloverblik vs. DataHub supplier access:** Whether a registered supplier can access their own customer metering data directly via DataHub B2B (bypassing Eloverblik third-party flows) needs validation with Energinet.
4. **Intraday / real-time price signal:** No public real-time API exists. If intraday signals are needed (e.g., EV charging optimization), a Nord Pool commercial data subscription or third-party aggregator would be required.
5. **Netselskab tariff variability:** Tariffs differ significantly by DSO area and change annually. A production system will need an integration with each DSO's published tariff schedule or a third-party aggregator.
6. **elafgift January 2026 change:** The near-elimination of the electricity consumption tax is a very recent policy change. All pricing models and marketing copy must account for this.

---

## Sources

- [Energi Data Service — Elspotprices Dataset](https://www.energidataservice.dk/tso-electricity/elspotprices)
- [Energi Data Service — API Guide](https://www.energidataservice.dk/guides/api-guides)
- [Energi Data Service — Terms and Conditions](https://www.energidataservice.dk/terms-and-conditions)
- [Energi Data Service — Datasets Overview](https://www.energidataservice.dk/datasets)
- [Nord Pool — Day-ahead Market](https://www.nordpoolgroup.com/en/the-power-market/Day-ahead-market/)
- [Energinet — What is DataHub?](https://en.energinet.dk/energy-data/datahub/)
- [Energinet — Terms of Access for Electricity Suppliers (PDF)](https://en.energinet.dk/media/juml3hty/terms-of-access-to-and-use-of-the-datahub-supplier.pdf)
- [Energinet — Become a BRP](https://en.energinet.dk/electricity/electricity-market/new-player/opportunities-in-the-danish-balancing-market/become-a-brp/)
- [Energinet — BRS Business Processes PDF](https://energinet.dk/media/2nqdysv3/brs-forretningsprocesser-for-det-danske-elmarked.pdf)
- [Eloverblik Third-Party API — Swagger UI](https://api.eloverblik.dk/thirdpartyapi/index.html)
- [Eloverblik — Third Party API Docs](https://docs.eloverblik.dk/docs/api/thirdparty)
- [Energinet — Customer and Third Party API Technical Description (PDF)](https://energinet.dk/media/2l1lmb2z/customer-and-third-party-api-for-datahub-eloverblik-technical-description.pdf)
- [Forsyningstilsynet — National Report 2024 (PDF)](https://forsyningstilsynet.dk/Media/638924853153921019/2025%20National%20Report%20.pdf)
- [Nordic Energy Research — Chapter 5: Denmark](https://pub.norden.org/nordicenergyresearch2024-01/chapter-5-denmark.html)
- [Energinet — Introduction to DataHub and Engrosmodellen (PDF)](https://energinet.dk/media/cp5bcuf3/introduktion-til-datahub-og-engrosmodellen.pdf)
- [Elafgift 2026 — elberegner.dk](https://elberegner.dk/guides/elafgift/)
- [GitHub — MTrab/energidataservice](https://github.com/MTrab/energidataservice)
- [GitHub — Energinet-DataHub](https://github.com/Energinet-DataHub)
