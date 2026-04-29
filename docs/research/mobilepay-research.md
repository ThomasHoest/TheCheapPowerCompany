# Research: MobilePay Subscriptions

## Summary

MobilePay's recurring payment product has been fully migrated to the unified Vipps MobilePay platform. The old "MobilePay Subscriptions" product is end-of-life; the current product is the **Vipps MobilePay Recurring API (v3)**. It fully supports variable-amount billing (critical for electricity bills that fluctuate by usage) and flexible billing intervals including weekly and monthly. With over 4.4 million Danish users (~76% of the population), it is the dominant payment method in Denmark and a strong primary billing channel for a Danish power startup.

---

## Current Product Landscape (post-Vipps merger)

- Vipps (Norway) and MobilePay (Denmark/Finland) merged in 2022 to form Vipps MobilePay.
- The old **MobilePay Subscriptions** API (`developer.mobilepay.dk/docs/subscriptions`) is deprecated and has a migration guide pointing merchants to the new Recurring API.
- The migration deadline was **March 12, 2024**; all new agreements since December 3, 2024 are on the new platform.
- The current product name is: **Vipps MobilePay Recurring** (sometimes called "Recurring API").
- It operates across Denmark, Norway, and Finland. DKK is a supported currency.
- Coverage: 4.5 million Danish users, ~92% monthly activity; 99% of Danes aged 20–39 use MobilePay.

Sources:
- [Introduction to the Recurring API](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/)
- [MobilePay Subscriptions migration notice](https://developer.mobilepay.dk/docs/subscriptions/transition-to-one-platform)

---

## Subscription API

### API Reference and Documentation

| Resource | URL |
|---|---|
| API Reference (OpenAPI) | `https://developer.vippsmobilepay.com/api/recurring/` |
| Developer Guide | `https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/` |
| Quick Start | `https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/` |
| FAQ | `https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/` |

All endpoints are versioned at `/recurring/v3/`.

### Creating and Managing Agreements

The API has two core objects: **Agreement** (the subscription contract) and **Charge** (individual billing events).

**Create a draft agreement:**
```
POST /recurring/v3/agreements
```

Key request body fields:

| Field | Description |
|---|---|
| `productName` | Displayed in app (e.g., "El-abonnement") |
| `productDescription` | Optional description |
| `merchantAgreementUrl` | URL where customer manages their subscription on merchant side (required) |
| `merchantRedirectUrl` | Redirect URL after customer approves |
| `phoneNumber` | Customer's Danish phone number (pre-fills app) |
| `pricing.type` | `"LEGACY"` (fixed) or `"VARIABLE"` (variable amount) |
| `pricing.amount` | Amount in øre (e.g., 10000 = 100 DKK) — for LEGACY/fixed |
| `pricing.currency` | `"DKK"` |
| `interval.unit` | `"YEAR"` \| `"MONTH"` \| `"WEEK"` \| `"DAY"` |
| `interval.count` | Integer 1–31 |

Response includes `agreementId` and a `vippsConfirmationUrl` to redirect/deep-link the customer into the MobilePay app.

**Agreement lifecycle states:** `PENDING` → `ACTIVE` → `STOPPED` (terminal; cannot be reactivated).

**Retrieve agreement:**
```
GET /recurring/v3/agreements/{agreementId}
```

**Update agreement:**
```
PATCH /recurring/v3/agreements/{agreementId}
```
Can update `status`, `pricing`, `interval`, and descriptions.

**List all agreements for a merchant:**
```
GET /recurring/v3/agreements
```

**Stop (cancel) agreement:**
```
PATCH /recurring/v3/agreements/{agreementId}
```
with body `{ "status": "STOPPED" }`

### Creating Charges

```
POST /recurring/v3/agreements/{agreementId}/charges
```

| Field | Description |
|---|---|
| `amount` | Actual bill in øre — varies each billing period for variable billing |
| `currency` | `"DKK"` |
| `description` | Shown to customer (e.g., "El-forbrug marts 2025") |
| `due` | ISO 8601 date of when to charge (must be at least 1 day in the future) |
| `retryDays` | 0–14 days; retried once daily at ~07:00 and 15:00 UTC |
| `orderId` | Merchant-defined unique ID (up to 64 characters) |

**Retrieve a charge:**
```
GET /recurring/v3/agreements/{agreementId}/charges/{chargeId}
```

**Cancel a charge:**
```
DELETE /recurring/v3/agreements/{agreementId}/charges/{chargeId}
```

**List charges for an agreement:**
```
GET /recurring/v3/agreements/{agreementId}/charges
```

**Refund a charge:**
```
POST /recurring/v3/agreements/{agreementId}/charges/{chargeId}/refund
```

### Variable Amount Billing

Fully supported — the recommended approach for power companies with usage-based billing.

- Set `pricing.type = "VARIABLE"` when creating the agreement.
- Set `pricing.suggestMaxAmount` — the pre-selected suggested ceiling shown to the customer in the app.
- The customer chooses their `maxAmount` (monthly ceiling) during agreement setup and can update it later.
- Each charge can be any amount up to the customer's `maxAmount`.
- If a charge exceeds the customer's `maxAmount` (but is at or below `suggestMaxAmount`), the customer gets a push notification to increase their limit. If they do not, the charge fails after `due + retryDays`.

Source: [How Recurring works with variable amount](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/recurring-api-variable-howitworks/)

### Billing Frequency Options

| Interval | Config |
|---|---|
| Weekly | `{ "unit": "WEEK", "count": 1 }` |
| Monthly | `{ "unit": "MONTH", "count": 1 }` |
| Daily | `{ "unit": "DAY", "count": 1 }` |
| Annual | `{ "unit": "YEAR", "count": 1 }` |
| Flexible (no fixed cadence) | Omit `interval` entirely |

**Important:** The interval is informational and displayed to the customer. Vipps does not auto-charge — the merchant must call `POST /charges` for each billing period.

### Webhook Events

Webhooks are managed via the Webhooks API: `https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/`

**Agreement events:**

| Event | Trigger |
|---|---|
| `recurring.agreement-accepted.v1` | Customer approved in app |
| `recurring.agreement-rejected.v1` | Customer declined |
| `recurring.agreement-stopped.v1` | Agreement stopped |
| `recurring.agreement-expired.v1` | Agreement expired |

**Charge events:**

| Event | Trigger |
|---|---|
| `recurring.charge-reserved.v1` | Charge authorized |
| `recurring.charge-captured.v1` | Charge successfully collected |
| `recurring.charge-cancelled.v1` | Charge cancelled |
| `recurring.charge-failed.v1` | Charge failed (all retries exhausted) |
| `recurring.charge-creation-failed.v1` | Charge request rejected during async validation |
| `recurring.charge-refunded.v1` | Refund processed |

Up to 25 webhook registrations per event type per merchant serial number (MSN).

Source: [Webhooks API Event types](https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events/)

---

## Customer Flow

1. Merchant creates draft agreement via `POST /recurring/v3/agreements`, receives `vippsConfirmationUrl`.
2. Customer is redirected into the MobilePay app (deep-link on mobile, landing page on desktop).
3. Customer reviews: product name, billing frequency, and (for VARIABLE) selects their max amount ceiling.
4. Customer authenticates in the MobilePay app using biometrics or PIN (PSD2 SCA-compliant).
5. Customer approves or rejects. Vipps redirects to `merchantRedirectUrl`.
6. Merchant polls or receives webhook to confirm status is `ACTIVE`.
7. Merchant creates a charge before each billing date via `POST /charges` with the actual amount due.
8. Customer receives push notification in the MobilePay app for each charge and can view history.
9. On failure: customer receives push notification to fix payment details or increase max amount.

---

## Merchant Fees

- **~1.49% + 1 DKK per transaction** (online/recurring channel, cited from third-party summaries of MobilePay Danish merchant pricing)
- **Monthly platform fee:** Starting at ~195 DKK/month

> **Caveat:** Vipps MobilePay does not publish a dedicated recurring pricing page. Exact terms depend on merchant volume and contract; large-volume power companies typically negotiate custom rates. Pricing must be confirmed directly with a Vipps MobilePay merchant account manager.

Source: [Apply for services](https://developer.vippsmobilepay.com/docs/knowledge-base/applying-for-services/)

---

## Limitations and Alternatives

### MobilePay Recurring Limitations

1. **Merchant-initiated charging only:** The merchant must create a charge request for every billing period — requires a reliable internal scheduler.
2. **Max amount friction for variable billing:** If a customer's bill exceeds their `maxAmount`, payment fails and requires customer action. High-usage winter months could cause churn.
3. **~76% Danish population coverage:** Not universal. Older demographics (60+) have lower adoption. A fallback payment method is required.
4. **Merchant approval required:** Access to Recurring API requires onboarding approval by Vipps MobilePay (~1–2 weeks).

### Alternatives

**Betalingsservice (PBS/Nets Direct Debit)** — Recommended as primary fallback
- Used by 95%+ of Danes for utility bills. The industry standard for Danish electricity billing.
- Operated by Nets (Nexi group).
- APIs: [Betalingsservice Creditor API](https://www.nets.eu/developer/BetalingsserviceAPI) and [Mandate API](https://www.nets.eu/developer/bs-mandate-api)
- Mandate API uses BS App for SCA — similar UX to MobilePay.
- Must sign a Creditor Agreement with Nets (issued a PBS number). Process ~1–2 weeks.
- Typically lower per-transaction cost than card/wallet payments.

**GoCardless**
- Supports Denmark via Betalingsservice as underlying scheme. Simplifies Nets/BS merchant onboarding.
- Suitable if direct Nets integration is too complex.

**Stripe Billing**
- Available in Denmark (DKK). Supports variable recurring via `usage_type=metered`.
- No native MobilePay support — card only (Visa/Mastercard). Higher per-transaction fees.
- Best as a card-based tertiary fallback channel.

---

## Recommended Approach

**Dual-channel billing strategy:**

**Primary: Vipps MobilePay Recurring API (VARIABLE)**
- Use `pricing.type = "VARIABLE"` with `suggestMaxAmount` set to a generous ceiling (e.g., 3,000–5,000 DKK to cover winter usage spikes).
- Create charges monthly (or weekly for prepaid products) with the exact usage-based amount.
- Use `retryDays: 7` to handle transient failures.
- Handle `recurring.charge-failed.v1` and `recurring.agreement-stopped.v1` webhooks for dunning workflows.

**Fallback: Betalingsservice via Nets Mandate API or GoCardless**
- Offer for customers without MobilePay (older demographics, business accounts).
- Required for acquiring customers from incumbent providers already using Betalingsservice.
- Direct bank debit has lower transaction costs.

---

## Open Questions

1. Exact merchant pricing — requires a sales conversation with Vipps MobilePay.
2. Practical `maxAmount` ceiling: what value prevents friction for high-usage winter months?
3. Exact minimum lead time for charge creation (1 calendar day vs. 24 hours).
4. Betalingsservice onboarding timeline — factor into launch planning.
5. Vipps MobilePay Recurring API access application requirements and timeline for Danish companies.

---

## Sources

- [Introduction to the Recurring API](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/)
- [Recurring API Guide](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/)
- [Recurring Payments Merchant API (OpenAPI)](https://developer.vippsmobilepay.com/api/recurring/)
- [How Recurring works with variable amount](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/recurring-api-variable-howitworks/)
- [Webhooks API Event types](https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events/)
- [Recurring API FAQ](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/)
- [MobilePay Subscriptions migration notice](https://developer.mobilepay.dk/docs/subscriptions/transition-to-one-platform)
- [Betalingsservice Creditor API — Nets](https://www.nets.eu/developer/BetalingsserviceAPI)
- [Betalingsservice Mandate API — Nets](https://www.nets.eu/developer/bs-mandate-api)
- [What is Betalingsservice — GoCardless](https://gocardless.com/guides/betalingsservice/introduction/)
- [Quick start for the Recurring API](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/)
