# Specification: Customer Onboarding and Authentication

## Overview

The Customer Onboarding component is the single end-to-end flow by which a new private (residential) Danish customer signs up for The Cheap Power Company's electricity service. It is the conversion-critical path: it begins from a marketing-site call to action, performs a verified identity check via MitID (CPR Match), creates a customer account, sets up a recurring payment authorization (preferably MobilePay Recurring with Betalingsservice as a fallback), and registers the customer's metering point with Energinet's DataHub so that supply switching can begin. Re-authentication for returning users is handled by the same MitID flow — there are no passwords. This specification covers private (B2C) customers only; business (CVR-linked) onboarding is out of scope for v1.

## Goals

- Complete a happy-path signup (marketing site → service active) in under 5 minutes of customer wall-clock time.
- Achieve a >70% conversion rate from "Start signup" CTA to a `PENDING` DataHub switch request.
- Eliminate passwords — MitID is the sole identity factor for both first-time signup and returning user login.
- Verify Danish residency and identity to a level sufficient to sign a binding electricity supply contract (CPR Match via MitID broker).
- Capture a recurring payment authorization before the contract is finalized, so the first invoice cycle has a guaranteed collection channel.
- Submit DataHub master-data registration (BRS-H1 supplier-switch process) automatically and asynchronously after the customer completes the visible steps.
- Comply with GDPR for any CPR-adjacent processing and produce an auditable record of consent for both contract and recurring payment.
- Operate on iOS (15+) and modern web browsers; the same OIDC client model serves both surfaces.

## Out of Scope (this version)

- Business customers (MitID Erhverv, CVR-based companies). Targets v2.
- Family/multi-occupant accounts where a non-account-holder needs read access. Targets v2.
- Card payments (Visa/Mastercard via Stripe or otherwise). Reconsidered post-launch.
- Self-service supplier-switch reversal or "undo" beyond the standard 14-day Danish consumer cancellation right (which is supported but covered in a separate Contract & Cancellation spec).
- Native Android client. Web (responsive) is the non-iOS surface in v1.
- Eloverblik third-party consent / metering data pull-back. Targets a separate Companion App spec; not required to begin supply.
- Marketing pages, pricing copy, and SEO content. The Marketing Site spec owns those; this spec only owns the entry handoff contract.
- Multi-metering-point households or holiday-home secondary addresses. v1 supports exactly one metering point per customer.

## Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| Identity broker | Signicat (MitID certified broker) | Best English docs, free sandbox, OIDC-native, already won the DK digital ID wallet contract (Dec 2025). Direct MitID integration is forbidden — a broker is mandatory. |
| Auth protocol | OIDC Authorization Code Flow + PKCE | Required by all MitID brokers. PKCE protects the public iOS client. |
| OIDC scopes | `openid profile nin` | Returns `sub`, `given_name`, `family_name`, `birthdate`, `nin` (CPR-style ID), `mitid.uuid`, `mitid.has_cpr`. |
| Identity verification add-on | Signicat CPR Match API | MitID OIDC alone does not return CPR to private SPs. CPR Match returns a confirm/deny only — we never store raw CPR unless legal review explicitly approves it. |
| iOS auth surface | `ASWebAuthenticationSession` + Universal Links + `idp_params` app-switch flag | WKWebView is forbidden by MitID. App-switch back to MitID app is mandatory on iOS. |
| iOS OIDC library | AppAuth-iOS | Standard, maintained, handles PKCE + token exchange. |
| Web auth surface | Server-side OIDC redirect with HttpOnly session cookie | Token exchange happens on our backend; the browser never sees access/ID tokens directly. |
| Token storage (iOS) | iOS Keychain (refresh token only); access tokens kept in memory | Avoids leaking tokens through backups; refresh token is the only persistent credential. |
| Token storage (web) | HttpOnly + Secure + SameSite=Lax session cookie referencing a server-side session record | Browser never holds OIDC tokens. |
| Session lifetime | 30 days sliding (refresh on activity); hard cap 90 days | Balances "no passwords" UX with revocation control. |
| Payment — primary | Vipps MobilePay Recurring API v3, `pricing.type=VARIABLE` | Variable bills (usage-based) require VARIABLE; ~76% of Danish adults already have MobilePay. |
| Payment — fallback | Betalingsservice via Nets Mandate API | Industry standard for DK utilities; required to acquire customers without MobilePay (older demographics). |
| Payment fee model | Pass-through invoice (no signup fee) | Conversion priority. |
| DataHub registration | BRS-H1 supplier-switch ebIX message via certificate-authenticated B2B channel | Required by Engrosmodellen. We are the supplier of record after switch settles. |
| DataHub identifier | Customer-supplied 18-digit metering point ID (Målepunkts-ID) | Customer copies it from their existing power bill or Eloverblik account. |
| Supported price areas | DK1 and DK2 | Both Denmark zones covered from launch. |
| Supported platforms | iOS 15+ (iPhone 6S or newer) and current desktop/mobile web (last 2 versions of Safari, Chrome, Firefox, Edge) | MitID app-switch requires iOS 15+; web is the cross-device fallback. |
| GDPR posture | We process CPR-adjacent identifiers under "performance of a contract" (GDPR Art. 6(1)(b)). Legal review pending. | CPR processing must have a documented legal basis before launch. |

## User Stories with Acceptance Criteria

**US-01 — Start signup from marketing site**
> As a prospective customer browsing the marketing site, I want to click a single "Bliv kunde" CTA and immediately enter the signup flow so that I do not lose momentum.

**Acceptance criteria:**
- Clicking the "Bliv kunde" CTA on any marketing page navigates to the signup entry URL within 1 second on a standard home network.
- The signup entry URL accepts a `referrer` query parameter capturing which marketing page the click originated from; the value is recorded against the eventual customer record.
- The signup entry URL is publicly reachable without prior authentication.
- On iOS, if the user already has the The Cheap Power Company app installed, the marketing CTA opens the app via Universal Link and lands on the in-app signup entry screen; otherwise it opens the web flow.
- The signup entry screen displays the steps the customer is about to complete (MitID, payment, address) before any external redirect occurs.

**US-02 — Verify identity with MitID**
> As a new customer, I want to prove who I am with my MitID so that I do not have to fill in name, address, or date of birth manually.

**Acceptance criteria:**
- The signup flow initiates an OIDC Authorization Code + PKCE request to the configured Signicat tenant with scopes `openid profile nin`.
- On iOS, the authorization request is launched in `ASWebAuthenticationSession` and includes the `idp_params` query parameter with `mitid.enable_app_switch=true`, `mitid.app_switch_os=ios`, and the registered Universal Link in `mitid.app_switch_url`.
- WKWebView is never used for any part of the MitID flow (verifiable by code review and runtime audit).
- After successful MitID authentication, the OIDC ID token contains `sub`, `given_name`, `family_name`, `birthdate`, `nin`, and `mitid.uuid` claims; absence of any of these aborts signup with the error in US-09.
- The application does not display the user's CPR or `nin` value back to the user at any point during signup.
- Identity verification completes (MitID flow start to ID token received on our backend) in under 90 seconds wall-clock for the median user.

**US-03 — CPR Match confirmation**
> As The Cheap Power Company, I want to confirm that the MitID-authenticated person matches the CPR they claim, so that the contract is legally enforceable.

**Acceptance criteria:**
- After MitID authentication succeeds, the customer is shown a CPR entry field (10 digits, format `DDMMYY-XXXX`) and asked to enter their CPR number.
- The entered CPR is sent to the Signicat CPR Match endpoint along with the MitID session reference; the raw CPR is not persisted in our application database.
- A "match" response advances the flow to account creation (US-04).
- A "no match" response shows the error message in the Error States table and offers a single retry; a second "no match" terminates the signup attempt and instructs the user to contact support.
- The CPR Match call has a 10-second timeout; on timeout the customer sees the "MitID temporarily unavailable" error.

**US-04 — Account creation**
> As a new customer, I want my account created from the verified MitID claims without re-typing my name and date of birth, so that signup feels fast.

**Acceptance criteria:**
- On a successful CPR Match, a customer record is created with `given_name`, `family_name`, `birthdate`, `mitid.uuid`, and `sub` populated from the OIDC claims.
- The customer's CPR is stored only as a one-way salted hash unless legal review explicitly authorises plaintext storage; the hash is sufficient to detect a duplicate signup attempt.
- The `mitid.uuid` is the immutable customer foreign key for all future MitID logins.
- The customer is then prompted for: supply address (street, house number, floor/door, postal code, city), 18-digit metering point ID, and email address. Phone number is captured during the MobilePay step (US-05) and copied onto the customer record afterward.
- Address fields are validated against the Danish postal code list (4-digit numeric, must resolve to a known city). An invalid postcode shows an inline validation error.
- Metering point ID is validated as 18 numeric digits; non-conforming input shows an inline validation error before the customer can proceed.
- Email address is validated for syntactic correctness (RFC 5322 compatible regex) but is not verified by confirmation link in v1.

**US-05 — Set up MobilePay subscription**
> As a new customer, I want to authorize ongoing payment via MobilePay so that I do not have to manually pay each invoice.

**Acceptance criteria:**
- After the address step, the customer is offered "MobilePay" as the primary payment option and "Betalingsservice" as a secondary link labelled "Har du ikke MobilePay?".
- Choosing MobilePay creates a draft agreement via `POST /recurring/v3/agreements` with `productName = "El-abonnement"`, `pricing.type = "VARIABLE"`, `pricing.suggestMaxAmount = 300000` (3,000 DKK in øre, configurable by ops), `pricing.currency = "DKK"`, and `interval` set per the customer's billing-frequency choice (US-06).
- The `merchantAgreementUrl` and `merchantRedirectUrl` returned in the request are HTTPS URLs on our domain; `merchantRedirectUrl` resolves back into the open signup session.
- The customer is redirected/deep-linked to the returned `vippsConfirmationUrl`.
- The customer's phone number entered (or pre-filled) in the MobilePay app is captured via the agreement-accepted webhook and stored on the customer record.
- The signup session waits for `recurring.agreement-accepted.v1` for up to 10 minutes; on receipt, the agreement transitions to `ACTIVE` in our system and the customer continues to confirmation.
- If the agreement-accepted webhook is not received within 10 minutes, the flow polls `GET /recurring/v3/agreements/{agreementId}` once at the 10-minute mark; if status is still `PENDING`, the customer sees the "MobilePay setup not completed" error and is offered Betalingsservice as a fallback.
- A `recurring.agreement-rejected.v1` webhook surfaces the error in the Error States table and offers Betalingsservice as a fallback.

**US-06 — Choose billing frequency**
> As a new customer, I want to choose between weekly and monthly billing so that the cadence matches my budgeting style.

**Acceptance criteria:**
- Before the MobilePay redirect, the customer chooses one of two options: "Månedlig" (default) or "Ugentlig".
- The choice is reflected on the agreement: monthly creates `interval = { unit: "MONTH", count: 1 }`; weekly creates `interval = { unit: "WEEK", count: 1 }`.
- The choice is stored on the customer record; charge creation in production uses the same cadence.
- The customer can change billing frequency post-signup via account settings (covered in a separate Account Management spec); v1 only enforces that the initial choice is respected.

**US-07 — Signup confirmation**
> As a new customer, I want a clear confirmation that I am signed up and what happens next so that I know my service will start.

**Acceptance criteria:**
- After payment authorization succeeds, the customer sees a confirmation screen showing: their full name, supply address, billing frequency, the masked MobilePay phone number (e.g., `+45 ** ** ** 23`), and the expected supply-start date.
- The expected supply-start date is calculated as the next valid Danish supplier-switch date per BRS-H1 (typically 6 working days after the switch is registered).
- A confirmation email is sent to the registered email address within 60 seconds of reaching the confirmation screen, containing the same information plus a copy of the contract terms.
- The DataHub BRS-H1 switch message is queued for asynchronous submission; the customer does not have to wait for it on the confirmation screen.
- The confirmation screen offers a "Hent appen" CTA linking to the App Store; on iOS native it offers a "Færdig" button returning to the app home.

**US-08 — Returning user login (password-free)**
> As a returning customer, I want to log back in with MitID without remembering a password so that authentication is as effortless as signup.

**Acceptance criteria:**
- The login screen presents a single "Log ind med MitID" button — there are no email or password fields.
- Tapping/clicking it initiates the same OIDC Authorization Code + PKCE flow as signup, with scopes `openid profile`.
- On a successful token exchange, the user is matched to an existing customer by `mitid.uuid`; if no match exists, the user is offered to start a new signup.
- A successful login establishes a session per the Session Management section.
- A login attempt that completes MitID successfully but does not match any customer record does not create an account silently — explicit signup is always required.

**US-09 — MitID authentication failure**
> As a customer who could not complete MitID for any reason, I want a clear message and a way to retry so that I can try again or seek help.

**Acceptance criteria:**
- Any OIDC error (`error=access_denied`, timeout, broker 5xx, invalid state) leads to the "MitID-login mislykkedes" error screen.
- The error screen offers "Prøv igen" (restart the OIDC flow) and "Få hjælp" (link to support contact).
- Three consecutive failures from the same browser session within 15 minutes trigger a soft rate-limit message: "Vi har problemer lige nu — prøv igen om et øjeblik."
- The exact OIDC `error` parameter and broker correlation ID are logged server-side for support investigation but are not shown to the customer.

**US-10 — MobilePay setup decline / fallback to Betalingsservice**
> As a customer who declined or could not complete MobilePay, I want to be offered Betalingsservice so that I can still sign up.

**Acceptance criteria:**
- A `recurring.agreement-rejected.v1` event, an explicit "Tilbage" tap, or a polling timeout (US-05) all route to a screen offering Betalingsservice signup.
- Choosing Betalingsservice initiates the Nets Mandate API flow with our PBS creditor number and the customer's bank registration/account number entry (or BS-App-based SCA where available).
- A successful mandate creates a record on the customer with `payment_method = BETALINGSSERVICE` and the mandate ID.
- The remainder of the signup flow (confirmation, DataHub registration) proceeds identically regardless of which payment method succeeded.
- The customer can decline both payment methods and exit signup; in that case no customer record is created (the partial record from US-04 is rolled back if no payment method was authorized within the session lifetime).

**US-11 — Existing customer detection**
> As an existing customer who clicks "Bliv kunde" by mistake, I want the system to recognise me and route me to login or my account, so that I do not create a duplicate.

**Acceptance criteria:**
- After MitID authentication during signup, the system checks for an existing customer record matching `mitid.uuid`.
- If a match is found and the existing record is `ACTIVE`, the customer sees: "Du er allerede kunde hos os" and a "Gå til min konto" CTA.
- If a match is found and the existing record is `PENDING` (an interrupted prior signup), the customer is resumed at the next incomplete step (address, payment, or DataHub).
- If a match is found and the existing record is `CANCELLED` (former customer), the customer is offered to start a fresh signup — this creates a new customer record linked to the prior one for audit, not a reactivation.
- Duplicate detection by hashed CPR is also performed as a defence-in-depth check; a hashed-CPR match without a `mitid.uuid` match is escalated to support rather than auto-merged.

## Signup Flow

The signup flow is one logical session. Each step has a defined screen/state and the system advances on success or shows the matching Error State on failure. The session has a 60-minute idle timeout.

1. **Entry from marketing CTA.** Customer clicks "Bliv kunde". On iOS with app installed, the Universal Link opens the app to step 2; otherwise the web entry URL loads.
2. **Pre-flight screen.** A single screen explains the three steps the customer is about to complete (MitID, payment, address & meter). Customer taps "Start". A signup session token is created server-side.
3. **MitID authorization.** The system constructs the OIDC authorization URL (`response_type=code`, `code_challenge_method=S256`, `scope=openid profile nin`, `state` bound to the signup session, `idp_params` set per US-02 on iOS). Customer is sent to Signicat → MitID app or MitID web → returns to our `redirect_uri` with `code`.
4. **Token exchange and claim parsing.** Backend exchanges `code` for tokens, validates ID token signature and `nonce`, extracts claims. If `nin` or `mitid.uuid` is missing, abort with US-09.
5. **Existing customer detection (US-11).** Look up `mitid.uuid` in the customer table. ACTIVE → redirect to logged-in account home; PENDING → resume at next incomplete step; CANCELLED → continue to step 6.
6. **CPR Match.** Show the CPR entry screen. Submit to Signicat CPR Match. On match, continue. On no match, allow one retry per US-03.
7. **Address & metering point.** Collect supply address and the 18-digit metering point ID. Inline-validate.
8. **Billing frequency.** Customer chooses "Månedlig" or "Ugentlig".
9. **Payment authorization.**
   - 9a. Customer chooses MobilePay. Backend calls `POST /recurring/v3/agreements` with VARIABLE pricing and the chosen interval. Customer is redirected/deep-linked to `vippsConfirmationUrl`.
   - 9b. Customer approves in the MobilePay app. We receive `recurring.agreement-accepted.v1`. Phone number is recorded.
   - 9c. **If the customer's MobilePay app already has an active agreement with us** (e.g., a previous abandoned signup that left a stale draft), the new draft is created independently — the old one is patched to `STOPPED` after the new one becomes ACTIVE, so the customer always ends with exactly one active agreement.
   - 9d. **If the customer is a returning former customer with a still-`ACTIVE` legacy agreement**, the existing agreement is reused (PATCH to update `productName`, interval, and `suggestMaxAmount` if needed). No new agreement is created.
   - 9e. On rejection or timeout, route to step 9f.
   - 9f. Betalingsservice fallback (US-10). Nets Mandate API flow. On success, mandate is recorded.
10. **Confirmation screen (US-07).** Show summary and start date. Send confirmation email.
11. **Asynchronous DataHub registration.** Backend queues a BRS-H1 supplier-switch ebIX message containing the customer's CPR (or its DataHub-recognised reference), metering point ID, and our supplier ID. The customer is not blocked on this submission.
12. **DataHub acceptance event.** When DataHub returns acceptance (asynchronously, typically within minutes to hours), the customer's record transitions from `PENDING` to `SCHEDULED` with a confirmed switch-effective date. A second email is sent confirming the start date.
13. **DataHub rejection event.** A rejection (e.g., metering point ID does not exist or is not held by the customer's CPR) triggers the error in the Error States table and an outbound support ticket to recover the customer.

## Authentication Architecture

**Protocol:** OpenID Connect 1.0 Authorization Code Flow with PKCE (RFC 7636), per Signicat's MitID OIDC profile. The PKCE `code_challenge_method` is `S256`. PKCE is mandatory on the iOS public client and used on the web confidential client as defence-in-depth.

**Broker integration:**
- Discovery URL: `https://<our-tenant>.signicat.com/auth/open/.well-known/openid-configuration`. Endpoints (authorize, token, jwks) are loaded from discovery at server startup and refreshed every 24 hours.
- Two OIDC clients are registered in the Signicat dashboard: one confidential client for the web backend (client secret), one public client for the iOS app (PKCE only, no secret).
- Redirect URIs registered: `https://app.thecheappowercompany.dk/auth/callback` (web) and `dk.thecheappowercompany.app:/oauth/callback` (iOS Universal Link bound).
- Allowed scopes: `openid`, `profile`, `nin`. Scope `nin` is requested only at signup (returns `nin` claim used for CPR Match) and not on subsequent logins.

**iOS specifics:**
- Authentication runs in `ASWebAuthenticationSession`. The completion handler receives the `redirect_uri` deep link.
- `idp_params` is URL-encoded and appended to the authorize URL: `idp_params={"mitid":{"enable_app_switch":true,"app_switch_os":"ios","app_switch_url":"https://app.thecheappowercompany.dk/auth/return"}}`.
- AppAuth-iOS performs the token exchange against the Signicat token endpoint using PKCE.
- Refresh tokens are stored in iOS Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. Access tokens are kept in memory and discarded on app suspension.

**Web specifics:**
- The user-agent is redirected to the authorize endpoint via a 302. After return, the backend exchanges the code for tokens over a server-to-server TLS call using the confidential-client secret.
- Tokens never reach the browser. The backend creates a session row keyed by an opaque session ID and sets a `Secure; HttpOnly; SameSite=Lax; Path=/` cookie containing only that ID.

**Token storage:**
- Access tokens (web): server-side session cache, TTL = access token lifetime (typically 1 hour for Signicat).
- Refresh tokens (web): encrypted at rest with KMS-managed key; only the auth service can decrypt.
- Access tokens (iOS): in-memory only.
- Refresh tokens (iOS): Keychain, device-bound.
- ID tokens are validated and discarded; we do not retain them after claim extraction.

**Session management:**
- Web sessions: 30-day sliding window, hard cap 90 days. Re-auth is required after 90 days regardless of activity.
- iOS sessions: refresh-token-based. If the refresh token is rejected by Signicat (revoked, expired, or user revoked MitID consent), the user is forced through MitID authentication again.
- Logout: deletes the server-side session row and clears the cookie (web) or wipes Keychain entries (iOS). End-session at the broker is offered but not forced — users typically have other Signicat-mediated sessions.
- A revocation endpoint allows ops/support to invalidate any customer's sessions on demand.

**Security:**
- All OIDC `state` values are cryptographically random, single-use, and bound to the originating signup session.
- All ID tokens are validated against Signicat's JWKS (signature, `iss`, `aud`, `exp`, `nbf`, `nonce`).
- Redirect URIs are exact-match (not prefix-match).
- TLS 1.2+ enforced on all auth endpoints.

## Payment Setup

**Primary channel — Vipps MobilePay Recurring API v3:**

- Agreement creation: `POST /recurring/v3/agreements`. Required fields:
  - `productName`: `"El-abonnement"`
  - `productDescription`: `"Strøm til kostpris hver {uge|måned}"` based on US-06 choice
  - `merchantAgreementUrl`: `https://app.thecheappowercompany.dk/account/payment` (where the customer manages the agreement post-signup)
  - `merchantRedirectUrl`: `https://app.thecheappowercompany.dk/signup/return?session={signupSessionId}` (web) or the iOS Universal Link variant
  - `pricing.type`: `"VARIABLE"`
  - `pricing.suggestMaxAmount`: `300000` (3,000 DKK in øre, default; configurable by ops via a single environment value)
  - `pricing.currency`: `"DKK"`
  - `interval.unit`: `"MONTH"` or `"WEEK"` per US-06
  - `interval.count`: `1`
  - `phoneNumber`: optional; we omit it and let the MobilePay app pre-fill from the user's logged-in identity.

- The `suggestMaxAmount` of 3,000 DKK is sized to cover an above-average winter monthly bill. Ops may revise this based on observed customer rejection rates; any change applies only to new agreements.

- Webhook subscriptions (registered once per environment via the Webhooks API): `recurring.agreement-accepted.v1`, `recurring.agreement-rejected.v1`, `recurring.agreement-stopped.v1`, `recurring.charge-failed.v1`, `recurring.charge-creation-failed.v1`. Charge-related events are owned by the Billing component, not signup, but the agreement-stopped event must trigger a customer re-engagement flow.

- The signup flow does not create any charges. The first charge is created by the Billing component on the customer's first invoice cycle.

**Fallback channel — Betalingsservice:**

- Initiated only after a MobilePay rejection or timeout, or when the customer explicitly clicks "Har du ikke MobilePay?".
- Uses the Nets Mandate API. The mandate is created against our Nets-issued PBS creditor number.
- The customer's CPR is required for the mandate (Betalingsservice mandates are CPR-keyed). Mandate creation is the only step that requires us to send raw CPR to a third party; we do not store it after submission.
- A successful mandate returns a mandate ID, which is stored against the customer with `payment_method = BETALINGSSERVICE`.
- Betalingsservice is also the contracted billing channel for any customer flagged by Billing as "MobilePay-incompatible" post-launch (e.g., recurring `charge-failed` events).

**Audit trail:**
- Every payment-method authorization (MobilePay or Betalingsservice) writes an immutable record: customer ID, method, external agreement/mandate ID, timestamp, IP/user-agent, signup session ID. This record is the legal evidence of consent.

## DataHub Integration

DataHub registration is the act that makes The Cheap Power Company the customer's supplier of record. It is performed via the BRS-H1 supplier-switch business process defined by Energinet.

**What we submit to DataHub:**

| Field | Source | Notes |
|---|---|---|
| Supplier GLN/EIC | Our own (constant) | Issued by Energinet upon DataHub registration. |
| Customer CPR | The signed-up customer | Required by the BRS-H1 message. Sent over the certificate-authenticated B2B channel; not stored in our application database in plaintext (see GDPR posture in Technical Context). |
| Metering point ID | Customer-entered (US-04) | 18-digit Målepunkts-ID. |
| Effective date | Calculated | Next valid switch date per BRS-H1; typically 6 working days from submission. |
| Customer name | OIDC `given_name` + `family_name` | Verified via MitID. |
| Customer supply address | Customer-entered (US-04) | Validated against postal-code list. |

**Mechanics:**
- Messages are ebIX-standard XML, signed and transmitted over the DataHub B2B channel using our production digital certificate.
- The submission is asynchronous and queued. Retries are exponential (1m, 5m, 30m, 2h, 12h) up to 24 hours; after that the case is escalated to ops.
- DataHub responses (accept, reject, withdraw) arrive on an inbound channel and are matched to the originating customer record by the message correlation ID we assigned at submission.
- A successful acceptance flips the customer to `SCHEDULED`. The actual supply start happens when DataHub publishes the change-of-supplier on the effective date.

**What we do NOT submit at signup:**
- Eloverblik third-party consent. That is a separate optional flow handled by the Companion App (out of scope here) so the customer can see their own consumption data.
- Tariff data, BRP relationship, or balance schedules. Those are operational concerns of the Billing and Trading components.

## Error States

| Scenario | Expected Behaviour |
|---|---|
| Marketing CTA clicked but signup entry URL is unreachable (network) | Marketing site shows: "Vi kunne ikke åbne tilmeldingen lige nu. Prøv igen om lidt." with a "Prøv igen" button. |
| MitID broker (Signicat) returns 5xx or times out (>30s) | Show: "MitID er midlertidigt utilgængeligt. Vi prøver igen automatisk om lidt." with auto-retry once after 15s; if still failing, offer "Prøv igen" button and log a `signup.mitid_broker_unavailable` event. |
| MitID `error=access_denied` (user cancelled) | Return to pre-flight screen with non-blocking notice: "Du afbrød MitID-login. Du kan prøve igen, når du er klar." |
| MitID `error=invalid_request` or other OIDC protocol error | Show: "Der opstod en fejl med MitID-login. Prøv venligst igen." Log full error parameters server-side. |
| ID token missing required claim (`nin`, `mitid.uuid`, `given_name`, `family_name`, `birthdate`) | Show: "Vi kunne ikke modtage de nødvendige oplysninger fra MitID. Kontakt support hvis problemet fortsætter." Log `signup.missing_oidc_claims` with the list of missing fields. |
| CPR Match returns "no match" | First attempt: "Det CPR-nummer du indtastede matcher ikke din MitID. Prøv igen." Second attempt: "Vi kan stadig ikke bekræfte dit CPR. Kontakt support på [link]." Terminate signup. |
| CPR Match endpoint timeout (>10s) | Treat as broker unavailable (see above). |
| Postal code does not resolve to a Danish city | Inline: "Postnummeret blev ikke genkendt." Submit button stays disabled. |
| Metering point ID is not 18 digits | Inline: "Målepunkts-ID skal være 18 cifre. Du finder det på din nuværende elregning." |
| Existing ACTIVE customer detected (US-11) | Show: "Du er allerede kunde hos os." with "Gå til min konto" CTA leading to logged-in account home. |
| Existing PENDING customer detected (interrupted prior signup) | Resume the customer at the next incomplete step. Banner: "Vi fortsætter, hvor du slap." |
| Hashed-CPR match without `mitid.uuid` match | Halt signup. Show: "Vi har brug for at verificere din identitet manuelt. Vi har sendt dig en e-mail." Ops gets a ticket. |
| MobilePay agreement creation API returns 4xx (our request is invalid) | Show generic "Vi kunne ikke oprette MobilePay-aftalen lige nu" and route to Betalingsservice fallback. Log error for engineering. |
| MobilePay agreement creation API returns 5xx | Show: "MobilePay svarer ikke lige nu. Prøv igen om lidt eller vælg Betalingsservice." Offer retry and fallback. |
| MobilePay user explicitly rejects the agreement (`recurring.agreement-rejected.v1`) | Show: "Du afviste MobilePay-aftalen. Du kan prøve igen eller vælge Betalingsservice i stedet." Offer both options. |
| MobilePay agreement still `PENDING` after 10 minutes (US-05) | Show: "Vi modtog ikke bekræftelse fra MobilePay. Prøv igen, eller vælg Betalingsservice." Offer both options. The pending agreement is patched to `STOPPED`. |
| Betalingsservice mandate creation fails | Show: "Vi kunne ikke oprette Betalingsservice-aftalen. Tjek dine bankoplysninger og prøv igen." with "Prøv MobilePay i stedet" link. |
| Confirmation email send fails | Confirmation screen still displays. A background retry runs for 24 hours. The customer is not blocked. |
| DataHub BRS-H1 submission rejected (metering point not held by this CPR) | Customer status is set to `DATAHUB_REJECTED`. Customer receives an email: "Vi kunne ikke overtage din strømmåler. Vi ringer til dig inden for 1 hverdag." Ops ticket opened immediately. The customer's MobilePay/Betalingsservice authorization is left intact but no charges are created. |
| DataHub BRS-H1 submission times out (24h retry exhausted) | Same handling as rejection but with a different ops ticket category (`datahub_unavailable`). |
| Session idle timeout (60 minutes) reached mid-flow | Show: "Din tilmelding udløb. Vi gemte ikke dine oplysninger. Start forfra med MitID." Any partial customer record without a confirmed payment authorization is purged. |

## Non-Functional Requirements

- **Latency:** Signup happy path (CTA click → confirmation screen) under 5 minutes wall-clock at the median, including external MitID and MobilePay redirects. The portion under our control (excluding MitID and MobilePay app interaction time) must be under 10 seconds total.
- **Backend response times:** P95 < 500 ms for any signup endpoint not waiting on a third party. P95 < 2 s for endpoints that call Signicat or Vipps MobilePay synchronously.
- **Availability:** Signup and login endpoints target 99.9% monthly availability. Planned maintenance is communicated on the marketing site at least 48 hours in advance.
- **Concurrency:** Support 50 concurrent signups in v1 without degradation. (Sized for projected launch volume.)
- **Accessibility:** All signup screens meet WCAG 2.1 AA. Keyboard navigation works end-to-end on web; iOS screens support VoiceOver labels and Dynamic Type.
- **Localization:** Danish only in v1. All user-facing copy is in Danish.
- **Privacy:** No analytics SDKs that exfiltrate identifying data are loaded before MitID consent. Marketing-page analytics tracks only anonymous funnel events. CPR is never logged, never sent to analytics, and never displayed back to the user.
- **Audit logging:** Every state transition in a customer record (created, MitID verified, CPR matched, payment authorized, DataHub submitted, DataHub accepted, DataHub rejected) is recorded with timestamp, actor, and signup session ID. Logs are retained for 7 years per Danish bookkeeping rules.
- **Encryption:** All data at rest is encrypted with AES-256; KMS-managed keys. All data in transit uses TLS 1.2 minimum, TLS 1.3 preferred.
- **Mobile:** iOS app must support iPhone 6S and newer running iOS 15+. The web flow must work on the last two major versions of Safari, Chrome, Firefox, and Edge on both desktop and mobile screen sizes.
- **No SMS or email OTP:** MitID is the sole second factor. The system never falls back to OTP for authentication.

## Open Questions

1. **Signicat broker pricing** — Owner: Commercial / CEO. Default assumption: budget for 0.28 DKK MitID state fee + a per-authentication broker fee in the 0.50–2.00 DKK range, plus a low monthly platform fee. Final figure must be confirmed in the Signicat sales contract before launch.
2. **CPR storage GDPR legal review** — Owner: External counsel + DPO. Default assumption (until reviewed): we store CPR only as a salted hash, and we send raw CPR to Signicat (CPR Match) and Nets (Betalingsservice mandate) but do not retain it ourselves. Legal review must confirm this is a defensible posture and document the legal basis (likely Art. 6(1)(b) — performance of a contract).
3. **Eloverblik delegation flow** — Owner: Product + Engineering. Default assumption: Eloverblik third-party consent is a separate, optional, post-signup flow handled by the Companion App and not part of v1 onboarding. If sales/marketing decides we must show a consumption preview during signup, scope changes materially.
4. **Business customer support** — Owner: Product. Default assumption: out of scope for v1; CVR-keyed customers (small businesses, landlords, housing cooperatives) wait for v2.
5. **`suggestMaxAmount` ceiling** — Owner: Product + Customer Insights. Default assumption: 3,000 DKK. Should be revisited after the first winter of operation to balance friction against churn from `charge-failed` events.
6. **Whether DataHub accepts our supplier ID before launch** — Owner: Engineering / regulatory PM. Default assumption: we have a fully provisioned DataHub production certificate and BRP agreement before this spec ships to implementation. Without this, the entire signup flow is non-functional.
7. **Phone number capture before MobilePay** — Owner: Product. Default assumption: we do not collect phone number explicitly; we accept the one MobilePay returns with the agreement. If marketing or support wants a phone number for non-MobilePay customers, the address step (US-04) must add a phone field.
8. **Retention period for abandoned signup sessions** — Owner: DPO + Engineering. Default assumption: 60-minute idle timeout, full purge of partial customer records that never reached payment authorization. Confirm this aligns with GDPR data-minimization expectations.
9. **Single metering point assumption** — Owner: Product. Default assumption: one metering point per customer in v1. Customers with summer houses or two homes will be held until v2.
10. **iOS app vs. web parity** — Owner: Product. Default assumption: the web flow is the canonical surface; the iOS app launches the same web flow inside `ASWebAuthenticationSession` for steps 3 and 9 only, with native UI for steps 2, 4, 6, 7, 8, 10. Confirm before iOS implementation begins.

## Resolved Decisions

| Question | Decision |
|---|---|
| Direct vs. broker integration with MitID? | Broker (mandatory by law). Signicat selected as primary. |
| Which OIDC flow? | Authorization Code + PKCE on both surfaces. |
| Are passwords required as a second option? | No. MitID is the sole authentication factor. |
| MobilePay product name? | Vipps MobilePay Recurring API v3 (the v1/v2 "Subscriptions" product is end-of-life). |
| Fixed or variable pricing on the MobilePay agreement? | `VARIABLE`. Power bills fluctuate with usage. |
| Primary fallback payment method? | Betalingsservice via Nets Mandate API. Card payments are out of scope for v1. |
| Where does identity verification happen — at first invoice or at signup? | At signup (CPR Match). The contract is binding only after identity is verified. |
| Do we store raw CPR in our database? | No. Hashed only, pending legal review's final word. |
| Is the BRS-H1 DataHub submission synchronous with the signup screen? | No. It is queued and asynchronous; the customer sees the confirmation screen immediately. |
| Multiple metering points per customer in v1? | No. Single metering point only. |
| Business / CVR customers in v1? | No. v2. |
| Email confirmation link required? | No. Email is captured but not verified by link in v1. |
| Marketing page localisation? | Danish only in v1. |
| iOS WKWebView for any auth step? | Forbidden. `ASWebAuthenticationSession` only. |
