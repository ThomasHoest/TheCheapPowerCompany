# ADR-001: System Architecture — The Cheap Power Company

**Status:** PROPOSED  
**Date:** 2026-04-29  
**Author:** Architect review gate prior to implementation  
**Supersedes:** n/a  
**Affected specs:** All five component specifications and three research files

---

## 1. Status

PROPOSED

---

## 2. Context

The Cheap Power Company (TCPC) is a Danish residential electricity brokerage launching in the post-1-January-2026 regulatory environment where the elafgift reduction to approximately 1 øre/kWh makes a transparent spot-indexed product commercially viable for the first time. The system must:

**Business requirements**
- Sell and bill electricity to Danish private residential customers on a spot-indexed, usage-based model with a per-kWh markup and a recurring subscription fee.
- Achieve a sub-5-minute signup path from a public marketing site through verified identity, payment authorisation, and DataHub supplier-switch registration.
- Surface a real-time all-in øre/kWh price and a running bill on a native iPhone app.
- Provide employees with an internal portal for operations, finance, and support.

**Danish regulatory environment**
- TCPC must be a registered elleverandør in Energinet's DataHub before onboarding any production customer. Required artefacts: DataHub registration; DKK 1,000,000 cash deposit (figure from the 2021 Terms of Access PDF, to be re-confirmed with Energinet); test and production digital certificates; a BRP agreement; a Standard Agreement with each netselskab where TCPC has customers.
- All retail electricity transactions — supplier switches and settlement — flow through the Energinet DataHub B2B channel using ebIX XML over certificate-authenticated connections (BRS-H1 for customer switching, BRS-H3 for wholesale settlement — the latter out of scope for v1).
- Customer identity verification must use a certified MitID broker. Direct MitID integration is legally forbidden for private companies by Digitaliseringsstyrelsen.
- Energi Data Service (the Energinet open data portal) is the only free publicly available source of day-ahead Elspot prices; it is REST/JSON and publishes once daily after the Nord Pool day-ahead auction at approximately 12:45 CET.
- Customer meter data is accessed via the Eloverblik third-party API, requiring explicit customer consent, a platform-held 1-year refresh token, and exchange for 24-hour data access tokens.
- GDPR applies to CPR processing; CPR Match via a certified broker returns confirm/deny only; raw CPR is never returned to private service providers.
- Forsyningstilsynet (DUR) consumer-protection rules apply continuously.

**Target platforms**
- iOS 15+ native iPhone app (SwiftUI).
- Public marketing website (responsive, SSR/static web).
- Internal admin portal (desktop-first web).
- Backend/API service layer (server-side; implementation language and framework deferred to Backend/API spec).

**Key platform constraints**
- MitID on iOS requires `ASWebAuthenticationSession` or `SFSafariViewController`; `WKWebView` and `UIWebView` are explicitly forbidden by all certified MitID brokers because they break the app-switch mechanism.
- Vipps MobilePay Recurring `pricing.type=VARIABLE` is required for usage-based power billing; the old MobilePay Subscriptions API has been end-of-life since March 2024.
- Eloverblik refresh tokens have a 1-year validity; 24-hour data access tokens must never be exposed to client devices.
- CPR Match returns confirm/deny only; no raw CPR value is returned to private service providers.
- DataHub B2B is certificate-authenticated ebIX XML; no REST alternative exists for retail supplier operations.

---

## 3. Decision

The architecture described collectively across all five component specifications is a **backend-mediated hub-and-spoke architecture**. The following decisions are recorded as binding.

**3.1 Backend mediation (universal)**  
All client surfaces — the iOS app, the marketing site, the admin portal, and the onboarding web flow — call only TCPC's own backend. The backend is the sole runtime caller of Energinet (DataHub B2B, Energi Data Service, Eloverblik), Signicat (token exchange), and Vipps MobilePay (agreement and charge management). Client devices never hold Eloverblik tokens, MobilePay merchant credentials, or DataHub certificates.

**3.2 Customer identity: OIDC Authorization Code + PKCE via Signicat**  
Customer authentication is exclusively MitID brokered by Signicat, using OIDC Authorization Code Flow with PKCE (S256). Two Signicat OIDC clients are registered: one confidential client for the web backend (client secret), one public client for the iOS app (PKCE only, no secret). On iOS the flow runs inside `ASWebAuthenticationSession` with `idp_params` carrying `enable_app_switch:true` and `app_switch_os:"ios"` to trigger the MitID app switch. Scopes are `openid profile nin` at signup (to enable CPR Match); `openid profile` on all subsequent logins. ID tokens are validated server-side against Signicat's JWKS and discarded after claim extraction; TCPC issues its own signed session JWTs.

**3.3 Payment: Vipps MobilePay Recurring API v3, VARIABLE pricing type**  
Primary recurring billing uses `POST /recurring/v3/agreements` with `pricing.type=VARIABLE`. Billing intervals are monthly or weekly per customer choice (`interval.unit=MONTH` or `WEEK`, `count=1`). Charge state is managed through webhooks ingested by the backend and forwarded to the app via APNs. Betalingsservice via the Nets Mandate API is the contracted fallback channel for customers without MobilePay or whose MobilePay flow rejects or times out.

**3.4 Spot price data: Energi Data Service REST polling**  
A daily cron job at 13:15 Europe/Copenhagen issues a single HTTP GET to `https://api.energidataservice.dk/dataset/Elspotprices`, fetches all 24-hour records for DK1 and DK2, and upserts into local storage. All consumer reads (app, marketing site, admin portal) are served from local storage only. CC BY 4.0 attribution to "Energi Data Service / Energinet" is displayed wherever the data appears.

**3.5 Customer meter data: Eloverblik third-party API with explicit customer consent**  
Customer consumption data is accessed via `https://api.eloverblik.dk/thirdpartyapi/`. The backend holds 1-year refresh tokens and exchanges them for 24-hour data access tokens on demand. Calls are to `POST /api/meterdata/gettimeseries` and `POST /api/meterdata/getcharges`. Client devices never see Eloverblik tokens. The consent flow runs inside `ASWebAuthenticationSession` on iOS.

**3.6 Supplier operations: Energinet DataHub B2B via ebIX XML**  
BRS-H1 supplier-switch requests are submitted as ebIX-standard XML over the certificate-authenticated DataHub B2B channel. Responses arrive asynchronously. BRS-H3 wholesale settlement is out of scope for v1. Production certificates are stored in a secrets store, never in source control.

**3.7 iOS: SwiftUI, ASWebAuthenticationSession, Universal Links, AppAuth-iOS**  
The iPhone app is native SwiftUI targeting iOS 15+. All OIDC flows use `ASWebAuthenticationSession`. AppAuth-iOS handles PKCE and token exchange. TCPC session tokens (JWT) and OAuth refresh tokens are stored in the iOS Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. `WKWebView` is forbidden for any step that involves MitID.

**3.8 Employee authentication: email + password + TOTP 2FA**  
The admin portal uses email/password with mandatory TOTP 2FA against a company IdP. MitID is never used for staff. Sessions expire after 8 hours of inactivity with a hard 24-hour cap. Role enforcement is server-side; `admin` and `read_only` are the only roles in v1.

---

## 4. Options Considered

### 4.1 MitID broker selection

| Option | Assessment |
|---|---|
| **Signicat (chosen)** | Best English documentation; free self-serve sandbox; OIDC-native; won the Denmark digital ID wallet and mDL contract December 2025; most complete iOS app-switch guide in English. |
| Signaturgruppen / Nets eID Broker | Technically capable; GitHub-hosted demo repos; more enterprise/bank-oriented; harder to navigate for a startup. Valid second-source if Signicat contract terms are unacceptable. |
| Idura (formerly Criipto) | Public pricing visible; solid product; smaller ecosystem and fewer references for Danish power-sector use. |
| Direct MitID integration | Legally forbidden for private companies by Digitaliseringsstyrelsen. Not viable. |

### 4.2 Payment channel

| Option | Assessment |
|---|---|
| **Vipps MobilePay Recurring v3 VARIABLE + Betalingsservice fallback (chosen)** | MobilePay covers ~76–92% of Danish adults; VARIABLE type is mandatory for usage-based bills; Betalingsservice covers the remainder and is the industry-standard utility direct debit in Denmark. Dual-channel achieves near-universal coverage. |
| MobilePay only | Leaves 8–24% of the addressable population unserved; commercially unacceptable for a mass-market utility. |
| Betalingsservice only | Loses the digital-first, app-centric conversion path that defines the product's market positioning. |
| Stripe | DKK-capable; card-only; no native MobilePay; higher per-transaction cost; does not fit Danish market expectations for utility billing. |

### 4.3 Spot price data source

| Option | Assessment |
|---|---|
| **Energi Data Service REST polling (chosen)** | Free; unauthenticated; CC BY 4.0; once-daily publication aligns with the day-ahead pricing model. No streaming interface exists. |
| Nord Pool direct commercial API | Requires a paid commercial subscription; adds cost and vendor dependency; equivalent data for day-ahead use case. |
| Third-party price aggregator | Adds cost and third-party dependency with no technical benefit over the free official source. |

### 4.4 Customer meter data access

| Option | Assessment |
|---|---|
| **Eloverblik third-party API with explicit consent (chosen for v1)** | Documented, available, does not require DataHub supplier registration to be complete before development begins. Lower-risk v1 path. |
| DataHub B2B direct supplier access | May be available once TCPC is a registered supplier; needs direct validation with Energinet; deferred to v2 investigation. |
| No meter data in v1 | Removes the core consumption-vs-price feature from the companion app; commercially unacceptable. |

### 4.5 iOS OAuth in-app browser

| Option | Assessment |
|---|---|
| **ASWebAuthenticationSession (chosen)** | Supported by AppAuth-iOS; provides per-session cookie isolation; compliant with Signicat MitID requirements. |
| SFSafariViewController | Also permitted by broker guidance; shares the full Safari cookie store (less isolation); not chosen by the specs. |
| WKWebView / UIWebView | Explicitly and categorically forbidden by all certified MitID brokers. Must never be used in the authentication path. |

### 4.6 Client architecture

| Option | Assessment |
|---|---|
| **Backend-mediated (chosen)** | Keeps all API secrets, certificates, and Eloverblik tokens server-side; enables shared caching of Energi Data Service data; simplifies client code; enables server-side webhook ingestion before APNs forwarding. Required by Eloverblik token policy. |
| Direct API calls from clients | Exposes merchant credentials in the app binary; Eloverblik tokens on-device would be a GDPR exposure; MobilePay merchant credentials in a client app are a security violation. Not viable. |

---

## 5. Platform Constraint Validation

### 5.1 iOS: MitID requires ASWebAuthenticationSession or SFSafariViewController

**Status: PASS with a documentation note.**

The customer-onboarding spec, companion app spec, and system overview all specify `ASWebAuthenticationSession` and explicitly prohibit `WKWebView`. Consistent and correct across all specs.

Note: mitid-research.md's Summary section phrases the requirement as `SFSafariViewController` specifically, which could be read as prescriptive. The companion app's Resolved Decisions table correctly disambiguates that `ASWebAuthenticationSession` was chosen. The specs govern; the research file phrasing is a maintenance liability only.

### 5.2 iOS: Minimum iOS 15

**Status: PASS — consistent across all specs.**

### 5.3 MobilePay: VARIABLE agreement type

**Status: PASS on type; CONFLICT on suggestMaxAmount.**

`pricing.type=VARIABLE` is specified consistently across all specs. However:
- customer-onboarding.md (US-05): `pricing.suggestMaxAmount = 300000` (3,000 DKK in øre)
- companion-app.md (Open Question 9): default assumption is 5,000 DKK

The onboarding spec owns agreement creation and its 3,000 DKK value is what will be implemented if unresolved. The companion app's reasoning — that winter bills can exceed 3,000 DKK — is supported by the research recommendation of 3,000–5,000 DKK. **This conflict must be resolved before the agreement-creation endpoint is implemented** to avoid a silent `charge-failed` churn risk in winter.

### 5.4 DataHub: ebIX XML B2B requirement

**Status: PASS on architecture; CRITICAL OWNERSHIP GAP on BRS-H1 implementation.**

All specs correctly identify the DataHub B2B channel as ebIX XML. However, the power-broker-integration spec explicitly states BRS-H1 is "out of scope for this version" (Section 3 and Section 7.4), while the customer-onboarding spec calls BRS-H1 as an established backend capability at step 11 of the signup flow. No component spec owns BRS-H1 as a deliverable. This is a critical gap.

### 5.5 Eloverblik: JWT token lifecycle (1-year refresh, 24-hour access)

**Status: PASS — consistently and correctly handled across all specs.**

### 5.6 MitID CPR Match: confirm/deny only for private companies

**Status: PASS on general posture; FLAG on BRS-H1 CPR supply problem.**

No spec claims raw CPR is returned or stored. However, the onboarding spec states the backend queues a BRS-H1 message "containing the customer's CPR (or its DataHub-recognised reference)." If TCPC does not persist raw CPR (only a salted hash), the backend has no raw CPR when composing BRS-H1, which may be sent minutes after the CPR Match step. Whether DataHub accepts an alternative identifier needs direct validation with Energinet.

### 5.7 Regulatory: DataHub registration launch gates

**Status: FLAG — multiple product capabilities are blocked until DataHub registration is complete.**

- BRS-H1 supplier-switch submission: non-functional until DataHub production certificates are obtained and validated.
- Billing via Engrosmodellen: TCPC cannot invoice customers without DataHub registration.
- Accurate all-in price calculation: network tariffs must be manually configured per DSO area before the consumer price formula produces correct results.

No production customer can be onboarded until the full registration stack is in place. Estimated lead time: 6–12 weeks from company registration, run in parallel with software development against the DataHub test environment.

---

## 6. Conflicts and Gaps

### 6.1 MitID scope inconsistency — companion app spec

**Severity: HIGH**

The companion app spec US-01 and section 6 specify `scope=openid profile nin` without distinguishing first-time from returning users. An iOS implementer following the companion app spec alone would request `nin` on every login. This is incorrect: CPR Match is only needed at signup. Requesting `nin` on every returning login is unnecessary and likely incurs additional Signicat broker cost.

**Action:** Revise companion-app.md US-01 and section 6 step 4 to use `scope=openid profile` for returning-user flows.

### 6.2 BRS-H1 implementation ownership gap

**Severity: CRITICAL**

BRS-H1 is referenced in the onboarding spec as a backend capability but placed out of scope in the power-broker-integration spec. No component spec owns BRS-H1 as a deliverable. Without BRS-H1, no customer can receive electricity from TCPC.

**Action:** Either amend power-broker-integration.md to include BRS-H1 in scope, or create a dedicated DataHub B2B Integration spec.

### 6.3 Backend/API component is implied but unspecified

**Severity: HIGH**

All five component specs call backend endpoints without those endpoints being formally specified. The backend owns the customer database schema, session store, pricing engine, billing scheduler, webhook ingestion, APNs forwarding, and all credentialed calls to external systems.

**Action:** Write a Backend/API specification before implementation begins.

### 6.4 suggestMaxAmount conflict

**Severity: MEDIUM**

customer-onboarding.md specifies 3,000 DKK; companion-app.md open question assumes 5,000 DKK.

**Action:** Agree a single value and write it into the onboarding spec before the agreement-creation endpoint is implemented.

### 6.5 Betalingsservice fallback scope inconsistency

**Severity: MEDIUM**

The onboarding spec and system overview treat Betalingsservice as a v1 fallback. The companion app spec Out of Scope list states "Betalingsservice fallback is deferred to v2." The intended meaning is likely that the native-app Betalingsservice management UI is deferred, not the payment channel itself. This distinction is not explicit.

**Action:** Revise companion-app.md Out of Scope item to clarify that the Betalingsservice payment channel is live in v1 but native in-app management UI is deferred to v2.

### 6.6 CPR re-supply problem for BRS-H1

**Severity: MEDIUM**

The backend needs raw CPR to compose the BRS-H1 message, but does not persist raw CPR (only a salted hash). Three resolution options: (a) hold raw CPR in a short-lived encrypted store through BRS-H1 submission, (b) have the customer re-supply CPR at submission time, (c) confirm with Energinet that an alternative identifier is acceptable.

**Action:** Resolve in the DataHub B2B Integration specification, with DPO sign-off on any short-lived CPR storage window.

### 6.7 GDPR legal basis for CPR processing

**Severity: MEDIUM — launch blocker, not a development blocker.**

All relevant specs note that Art. 6(1)(b) legal basis is "pending legal review." Legal sign-off must be obtained before any code that handles CPR ships to production.

### 6.8 Missing specifications required before implementation begins

The following documents do not exist and must be written:

1. **Backend/API specification** — endpoint contracts, customer database schema, session management, billing scheduler, webhook handling, APNs integration, audit log schema.
2. **DataHub B2B Integration specification** — BRS-H1 ebIX message structure, async accept/reject handling, certificate management, retry and escalation logic, CPR handling through the submission pipeline.
3. **Billing specification** — billing period boundary calculation, per-kWh charge computation, MobilePay charge creation, Betalingsservice collection, webhook reconciliation, failed-payment dunning, refund handling.
4. **Account Management specification** — referenced by companion-app.md and onboarding spec; does not exist.
5. **Contract and Cancellation specification** — referenced by onboarding spec; does not exist.

---

## 7. Consequences

### 7.1 Positive consequences

- Backend mediation keeps all API keys, certificates, and Eloverblik tokens server-side — never in client binaries or on devices.
- Centralised caching of Energi Data Service data. One daily ingestion job serves all consumers from a single local store.
- Single source of truth for billing state. Webhooks flow into the backend before APNs forwarding.
- Signicat free sandbox reduces time-to-first-integration. Development can begin before the production contract is signed.
- Dual payment channel achieves near-universal Danish coverage. MobilePay (76–92%) + Betalingsservice (95%+ for utilities).
- VARIABLE pricing type is architecturally correct for usage-based electricity billing.

### 7.2 Negative consequences and risks

- **Backend is a single point of failure.** The 99.9% availability target requires active investment in redundancy and graceful degradation, neither of which is yet specified.
- **Merchant-initiated charging requires a reliable internal billing scheduler.** A scheduler failure means charges are not created and revenue is lost. No redundancy is described in any current spec.
- **`charge-failed` risk from an undersized `suggestMaxAmount`.** Winter bills can exceed a 3,000 DKK ceiling, triggering silent payment failure and churn. The unresolved spec conflict makes this worse.
- **Certificate pinning rotation risk.** A missed yearly rotation breaks the app for all users until an app update ships. The rotation process must be documented and rehearsed before launch.
- **Email unverified in v1.** The onboarding spec does not require email confirmation. Billing notifications may not reach customers with mistyped addresses.

### 7.3 Regulatory gates (all block production customer onboarding)

| Gate | Owner | Lead time estimate |
|---|---|---|
| Company registered as Danish legal entity (ApS or A/S) | Founders / Legal | Days |
| DataHub registration with Energinet | Regulatory PM + Energinet | 4–8 weeks |
| DKK 1,000,000 cash deposit paid to Energinet | Finance | Concurrent with DataHub registration |
| DataHub test environment certificate obtained | Engineering | Concurrent with DataHub registration |
| DataHub test environment validation completed | Engineering + Energinet | 2–4 weeks after cert obtained |
| DataHub production certificate obtained | Engineering | After test validation passes |
| BRP agreement signed with an existing Danish BRP | Commercial / CEO | 2–6 weeks (parallel track) |
| Standard Agreement signed with at least one netselskab | Commercial / Regulatory PM | 2–6 weeks per DSO (parallel track) |
| Master data submitted to DataHub (supplier record) | Engineering | After production cert obtained |
| Network tariff configuration for at least one DSO area populated | Data engineering | Before first customer onboarding |
| Signicat production broker contract signed | Commercial / CEO | Independent; free sandbox available immediately |
| Vipps MobilePay Recurring API merchant onboarding approved | Commercial | 1–2 weeks |
| Nets Betalingsservice PBS creditor number issued | Commercial | 1–2 weeks |
| GDPR legal review for CPR processing signed off | External counsel + DPO | Parallel; must complete before production launch |

**Total estimated lead time before first production customer: 6–12 weeks from company registration, assuming all tracks run in parallel.**

### 7.4 Technical debt risks

- **ebIX XML B2B interface deprecation.** Energinet is migrating DataHub to the Green Energy Hub platform. The current ebIX B2B channel may be deprecated during TCPC's first operating year and could require significant re-implementation of the BRS-H1 pipeline.
- **Manual netselskab tariff configuration.** Tariffs differ per DSO area, vary by time-of-use, and change annually. Misconfiguration directly affects every customer's all-in price and bill. A scheduled tariff sync capability should be prioritised in v2.
- **No billing specification.** The billing scheduler is the revenue engine. Its absence as a formal specification is the single largest unmitigated technical risk at this architecture review.
- **Email unverified in v1.** Should be remedied in v1.1.

---

## 8. Verdict

### REVISE SPEC FIRST

The core architectural choices — backend-mediated hub-and-spoke, Signicat OIDC, Vipps MobilePay VARIABLE, Energi Data Service polling, Eloverblik third-party API, ebIX XML DataHub B2B, `ASWebAuthenticationSession` on iOS — are sound, well-researched, and mutually consistent. No fundamental platform constraint violations were found.

**Must be resolved before any implementation begins:**

1. **Write a Backend/API specification.** Endpoint contracts, customer database schema, session management, billing scheduler, webhook handling, APNs integration, and audit log schema must be formally specified. This is the single most important missing document.

2. **Assign BRS-H1 implementation ownership and specify it.** Either amend power-broker-integration.md to include BRS-H1 in scope, or create a dedicated DataHub B2B Integration spec. The onboarding flow cannot be implemented without this.

3. **Write a Billing specification.** MobilePay charge creation, Betalingsservice collection, webhook reconciliation, failed-payment dunning, and refund handling are unspecified. The billing scheduler is production-critical.

4. **Resolve the `suggestMaxAmount` conflict.** A single value must be written into the onboarding spec (customer-onboarding.md US-05) before the agreement-creation endpoint is implemented. Close companion-app.md Open Question 9 as a resolved decision.

5. **Correct the MitID scope in companion-app.md.** US-01 and section 6 must use `scope=openid profile` (without `nin`) for returning-user logins.

**Must be resolved before production launch (not blocking development start in test environments):**

6. **Resolve the BRS-H1 CPR supply problem.** Specify how raw CPR flows from CPR Match to BRS-H1 submission; obtain DPO sign-off on any short-lived encrypted CPR storage window.

7. **Reconcile the Betalingsservice v1 scope.** companion-app.md must explicitly state it is only the native-app management UI that is deferred to v2 — not the payment channel itself.

8. **Complete GDPR legal review for CPR processing.** Hard launch gate; obtain external counsel and DPO sign-off before any CPR-handling code ships to production.

Subject to these conditions, this architecture is approved to proceed once the mandatory revisions are complete.

---

## Related files

| File | Role |
|---|---|
| `docs/specifications/system-overview.md` | System component map and data flow overview |
| `docs/specifications/power-broker-integration.md` | Energi Data Service ingestion + Eloverblik + DataHub context |
| `docs/specifications/customer-onboarding.md` | Signup, MitID, MobilePay agreement creation |
| `docs/specifications/companion-app.md` | iOS app screens and authentication flow |
| `docs/specifications/admin-portal.md` | Internal employee portal |
| `docs/specifications/marketing-site.md` | Public marketing and conversion site |
| `docs/research/power-broker-research.md` | Energi Data Service API and Danish regulatory research |
| `docs/research/mitid-research.md` | MitID broker, OIDC, iOS integration research |
| `docs/research/mobilepay-research.md` | Vipps MobilePay Recurring API v3 research |
