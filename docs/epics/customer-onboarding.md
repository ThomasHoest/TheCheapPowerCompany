# Epics: Customer Onboarding and Authentication

**Component:** Customer Onboarding and Authentication
**Source spec:** `docs/specifications/customer-onboarding.md`
**Architecture reference:** `docs/specifications/ADR-001-system-architecture.md` (sections 3.2, 3.3, 6.2, 6.6)
**Owner:** Architect
**Status:** Ready for sprint planning

---

## Epic legend

Each task carries:
- **Description** — what the task delivers.
- **Acceptance criteria** — checklist of testable observable outcomes.
- **Definition of done (DoD)** — engineering baseline (tests, docs, review, deployable).
- **Spec story coverage** — which user story or error row in `customer-onboarding.md` the task satisfies.

**Standing DoD (applies to every task unless overridden):**
- [ ] Code merged to `main` via reviewed PR (at least one approval).
- [ ] Unit tests added/updated; CI green.
- [ ] Integration test or end-to-end smoke test exercises the new path.
- [ ] No CPR, `nin`, ID token, access token, or refresh token in any log line (asserted by a log-redaction unit test where applicable).
- [ ] Audit-log row written for any state transition the task introduces.
- [ ] Updated technical README/runbook entry for any new ops procedure.
- [ ] Deployed to a non-production environment and verified by the engineer.

---

## Epic 1 — Signicat MitID Broker Setup

**Goal:** Stand up a working Signicat tenant with both the web confidential client and iOS public client registered, redirect URIs whitelisted, sandbox identities provisioned, and the production contract initiated. After this epic, every other onboarding epic has a real OIDC endpoint to call.

**Dependencies:** None (this is a launch prerequisite for all auth epics).

**Resolved decisions referenced:** Broker = Signicat; protocol = OIDC Authorization Code + PKCE; scopes = `openid profile nin` at signup, `openid profile` on login.

### Tasks

#### 1.1 — Create Signicat sandbox tenant and capture discovery metadata

- **Description:** Register a Signicat self-serve sandbox account for The Cheap Power Company, record the tenant URL, fetch the OIDC discovery document, and commit a redacted copy of the discovery JSON for reference.
- **Acceptance criteria:**
  - [ ] Sandbox tenant exists at `https://<tenant>.signicat.com`.
  - [ ] Discovery URL `https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration` returns 200 with all required endpoints (authorize, token, jwks, end_session).
  - [ ] Tenant URL stored in the team's secret-manager entry `signicat/sandbox/issuer`.
  - [ ] Reference copy of the discovery JSON committed under `docs/integration-notes/signicat-discovery-sandbox.json`.
- **DoD:** Standing DoD plus the tenant credentials are accessible to the on-call engineer through the secrets vault.
- **Spec story coverage:** Enables US-02, US-08; supporting infrastructure for the entire flow.

#### 1.2 — Register web confidential OIDC client

- **Description:** Register the backend-side confidential client in the Signicat dashboard with client secret, redirect URI, allowed scopes, and grant types.
- **Acceptance criteria:**
  - [ ] Client `client_id` and `client_secret` issued and stored in `signicat/sandbox/web-client/*`.
  - [ ] Redirect URI `https://app.thecheappowercompany.dk/auth/callback` registered as exact match (not prefix).
  - [ ] Allowed scopes include `openid`, `profile`, `nin`.
  - [ ] Grant types restricted to `authorization_code` and `refresh_token`.
  - [ ] `code_challenge_method=S256` accepted by the authorize endpoint (verified by a manual curl).
  - [ ] Token endpoint authentication method is `client_secret_basic` (recorded in setup notes).
- **DoD:** Standing DoD plus the client config is exported as JSON and committed under `docs/integration-notes/signicat-web-client.json` (with secrets redacted).
- **Spec story coverage:** US-02, US-08.

#### 1.3 — Register iOS public OIDC client (PKCE only)

- **Description:** Register the iOS public client with PKCE-only authentication (no secret), Universal Link redirect URI, and the same allowed scopes.
- **Acceptance criteria:**
  - [ ] Public client `client_id` issued; no secret generated.
  - [ ] Redirect URI `dk.thecheappowercompany.app:/oauth/callback` registered.
  - [ ] PKCE is required; the dashboard rejects auth requests without `code_challenge`.
  - [ ] Allowed scopes include `openid`, `profile`, `nin`.
  - [ ] `idp_params` is enabled at the tenant level (verified by a test authorize call).
- **DoD:** Standing DoD plus the iOS client config is committed under `docs/integration-notes/signicat-ios-client.json`.
- **Spec story coverage:** US-02, US-08, US-09; required for Epic 6.

#### 1.4 — Provision MitID Pre-Production (PP) test identities

- **Description:** Create a documented set of MitID PP test users (happy path, no CPR Match, broker timeout simulator) using the MitID PP test tool linked from the Signicat sandbox.
- **Acceptance criteria:**
  - [ ] At least three named PP test identities exist: `tcpc.test.happy`, `tcpc.test.no-cpr-match`, `tcpc.test.minor` (under-18 trigger).
  - [ ] Each identity's username, password, and expected behaviour is documented in `docs/integration-notes/mitid-test-users.md` (vault-only — never committed to a public repo).
  - [ ] Each identity has been used end-to-end against the sandbox web client at least once and produces the documented behaviour.
- **DoD:** Standing DoD plus QA has confirmed the identities work.
- **Spec story coverage:** US-02, US-03, US-09, US-11; enables QA across the whole component.

#### 1.5 — Initiate Signicat production contract (Commercial-owned)

- **Description:** Tracked task with **owner: Commercial / CEO**. Drive the Signicat production broker contract from quote to signature so production credentials are ready ahead of launch. Engineering provides the technical input (expected volume, scopes, environments) but does not own the close.
- **Acceptance criteria:**
  - [ ] Quote received from Signicat covering the per-authentication broker fee, MitID 0.28 DKK state fee, monthly platform fee.
  - [ ] Contract reviewed by legal.
  - [ ] Contract signed; Signicat production tenant provisioning request submitted.
  - [ ] Production tenant URL captured in `signicat/prod/issuer` once issued.
  - [ ] Status visible on the launch readiness tracker.
- **DoD (overrides standing DoD):** Contract executed, production tenant request submitted to Signicat, launch readiness tracker updated. No code DoD applies.
- **Spec story coverage:** Open Question 1 in the spec (Signicat broker pricing). Hard gate on production launch (ADR section 7.3).

---

## Epic 2 — Web Signup Flow

**Goal:** Build the end-to-end web signup experience that walks a customer from the marketing-site CTA through MitID auth, CPR Match, address/meter capture, billing-frequency selection, and into the payment epic. This epic owns the screen-by-screen 13-step flow defined in section "Signup Flow" of the spec, excluding payment (Epic 3) and confirmation (Epic 4).

**Dependencies:** Epic 1 (Signicat sandbox + web client), Backend/API spec (per ADR section 6.3 — required before implementation begins).

### Tasks

#### 2.1 — Marketing CTA handoff and signup entry URL

- **Description:** Implement the public signup entry URL that the marketing-site "Bliv kunde" CTA links to, including referrer capture and the iOS Universal Link variant.
- **Acceptance criteria:**
  - [ ] `GET /signup` is publicly reachable without auth and renders within 1 s on a standard home network.
  - [ ] The URL accepts `?referrer=<page>` and stores the value on the eventual customer record.
  - [ ] The page is registered as the target for the marketing CTA's Universal Link on iOS.
  - [ ] If the request comes from an iOS device with the app installed, the Universal Link opens the app instead of loading the web page (verified by a manual device test).
- **DoD:** Standing DoD plus a Lighthouse run on the page scores >= 90 on Performance and Accessibility.
- **Spec story coverage:** US-01.

#### 2.2 — Pre-flight screen ("3 steps you're about to complete")

- **Description:** Build the pre-flight screen that lists the three steps (MitID, payment, address & meter) before any external redirect, and creates a server-side signup session on "Start".
- **Acceptance criteria:**
  - [ ] Screen lists exactly the three steps in Danish: "MitID", "Betaling", "Adresse og målepunkt".
  - [ ] "Start" button creates a signup session row server-side and returns a session ID bound to an HttpOnly cookie.
  - [ ] Session row stores `created_at`, `referrer`, and a `state` machine column initialised to `STARTED`.
  - [ ] Session has a 60-minute idle timeout (verified by a backend unit test).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-01 ac3; supports session model used by all later steps.

#### 2.3 — Backend OIDC authorize URL builder (web confidential client)

- **Description:** Build the backend service that constructs a valid Signicat authorize URL with `response_type=code`, PKCE `S256` challenge, cryptographically random `state` and `nonce` bound to the signup session, and `scope=openid profile nin`.
- **Acceptance criteria:**
  - [ ] `state` and `nonce` are 32+ bytes from a CSPRNG, single-use, and stored against the signup session.
  - [ ] `code_challenge` is the base64url-encoded SHA-256 of a server-stored `code_verifier`.
  - [ ] Authorize URL passes manual inspection against the OIDC spec.
  - [ ] Discovery is loaded once at startup and refreshed every 24 h (verified by log).
  - [ ] Unit test exercises a tampered `state` and asserts rejection.
- **DoD:** Standing DoD.
- **Spec story coverage:** US-02 ac1, US-02 ac3, Authentication Architecture section.

#### 2.4 — Backend OIDC callback and token exchange (web)

- **Description:** Implement `GET /auth/callback` that validates `state`, exchanges `code` for tokens against the Signicat token endpoint using the confidential-client secret, validates the ID token (signature against JWKS, `iss`, `aud`, `exp`, `nbf`, `nonce`), and extracts claims.
- **Acceptance criteria:**
  - [ ] Invalid or replayed `state` returns the OIDC protocol error path (US-09 wording).
  - [ ] ID token signature validated against Signicat JWKS (rotated keys handled).
  - [ ] All of `sub`, `given_name`, `family_name`, `birthdate`, `nin`, `mitid.uuid` are extracted; missing claims trigger the "missing OIDC claims" error row.
  - [ ] Tokens are stored in the server-side session cache; the browser receives only an HttpOnly session cookie.
  - [ ] Refresh token is encrypted at rest with a KMS-managed key.
  - [ ] ID token is discarded after claim extraction.
- **DoD:** Standing DoD plus a unit test asserts no token value is logged.
- **Spec story coverage:** US-02, error rows "MitID broker 5xx/timeout", "OIDC protocol error", "ID token missing required claim".

#### 2.5 — CPR Match screen and backend call

- **Description:** Build the CPR entry screen and the backend integration with Signicat's CPR Match endpoint, with retry behaviour per US-03.
- **Acceptance criteria:**
  - [ ] Screen accepts a 10-digit CPR in `DDMMYY-XXXX` format with input masking.
  - [ ] CPR is sent server-side only; never logged or echoed back to the user.
  - [ ] On "match", the flow advances to the address screen.
  - [ ] On "no match" (first attempt), the user sees: "Det CPR-nummer du indtastede matcher ikke din MitID. Prøv igen."
  - [ ] On "no match" (second attempt), the user sees: "Vi kan stadig ikke bekræfte dit CPR. Kontakt support på [link]." and the signup session is terminated.
  - [ ] CPR Match call has a 10-second timeout; on timeout the user sees the "MitID temporarily unavailable" copy.
  - [ ] Raw CPR is salted-hashed and stored against the session record only after a successful match (preparing for Epic 4 account creation).
- **DoD:** Standing DoD plus a security review confirms the CPR is not persisted in plaintext anywhere.
- **Spec story coverage:** US-03; error rows "CPR Match returns no match", "CPR Match endpoint timeout".

#### 2.6 — Address and metering point screen with validation

- **Description:** Build the screen capturing supply street, house number, floor/door, postal code, city, and 18-digit metering point ID, with inline validation per US-04.
- **Acceptance criteria:**
  - [ ] Postal code field validates against the Danish postal-code list (4 digits, must resolve to a known city); invalid value disables the submit button and shows: "Postnummeret blev ikke genkendt."
  - [ ] City field auto-fills from the postal code when valid.
  - [ ] Metering point ID validates as exactly 18 numeric digits; non-conforming input shows: "Målepunkts-ID skal være 18 cifre. Du finder det på din nuværende elregning."
  - [ ] All values are persisted on the signup session row on submit.
  - [ ] Screen meets WCAG 2.1 AA (verified by automated axe scan, no critical issues).
- **DoD:** Standing DoD plus the postal-code dataset source and refresh cadence are documented in the runbook.
- **Spec story coverage:** US-04 ac4–ac6; error rows "Postal code does not resolve", "Metering point ID is not 18 digits".

#### 2.7 — Email capture screen with syntactic validation

- **Description:** Capture the customer's email address with RFC-5322-compatible regex validation. No confirmation link in v1.
- **Acceptance criteria:**
  - [ ] Email field uses an RFC-5322-compatible regex; invalid syntax disables the submit button.
  - [ ] Email is persisted on the signup session row.
  - [ ] No verification email or confirmation link is sent during signup (verified by absence of an outbound mail call).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-04 ac7.

#### 2.8 — Billing frequency selection screen

- **Description:** Build the "Månedlig" / "Ugentlig" choice screen with "Månedlig" preselected.
- **Acceptance criteria:**
  - [ ] Two options shown; "Månedlig" is the default selection on screen load.
  - [ ] Selection is persisted on the signup session row as `billing_frequency` enum (`MONTHLY` or `WEEKLY`).
  - [ ] Selected value is read by Epic 3 when it builds the MobilePay agreement (`interval.unit = MONTH | WEEK`, `count = 1`).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-06.

#### 2.9 — Step orchestration and resume-on-interrupt

- **Description:** Wire the 13-step state machine on the backend so each completed step advances the session and a returning browser cookie resumes at the next incomplete step (within the 60-minute idle window).
- **Acceptance criteria:**
  - [ ] Session row has an explicit `current_step` enum that progresses linearly.
  - [ ] Re-loading the signup URL with a valid session cookie lands on the current step's screen, not the start.
  - [ ] Session idle for >60 minutes is purged (background job verified by integration test) and any subsequent visit shows: "Din tilmelding udløb. Vi gemte ikke dine oplysninger. Start forfra med MitID." (Epic 7 owns the purge job; this task hooks the read-side check.)
  - [ ] State transitions are written to the audit log.
- **DoD:** Standing DoD plus a state-machine diagram added to `docs/integration-notes/signup-state-machine.md`.
- **Spec story coverage:** US-11 ac3 (resume PENDING); error row "Session idle timeout".

---

## Epic 3 — MobilePay Agreement Setup

**Goal:** Implement the primary recurring-payment authorization via Vipps MobilePay Recurring API v3 with `pricing.type=VARIABLE`, plus the Betalingsservice fallback via the Nets Mandate API. After this epic, a customer can bind an ongoing payment authorization to their signup session.

**Dependencies:** Epic 2 (signup session and billing frequency are required inputs); Vipps MobilePay merchant onboarding (operations task within this epic); Nets Betalingsservice PBS creditor number issued (operations task within this epic).

### Tasks

#### 3.1 — Vipps MobilePay merchant onboarding (Ops-owned)

- **Description:** Tracked task with **owner: Commercial / Operations**. Complete the Vipps MobilePay merchant application for the Recurring API v3, obtain merchant credentials (client ID, client secret, subscription key, MSN), and request webhook subscription provisioning.
- **Acceptance criteria:**
  - [ ] Merchant application submitted with company registration documents.
  - [ ] MSN issued and stored in `mobilepay/prod/msn` (sandbox MSN in `mobilepay/test/msn` already available for engineering work).
  - [ ] Client credentials stored in the secrets vault.
  - [ ] Webhook URL placeholders agreed: `https://api.thecheappowercompany.dk/webhooks/mobilepay/recurring`.
- **DoD (overrides standing DoD):** Credentials present in the vault; entry on the launch readiness tracker.
- **Spec story coverage:** Enables US-05; ADR section 7.3 launch gate.

#### 3.2 — Nets Betalingsservice PBS creditor number provisioning (Ops-owned)

- **Description:** Tracked task with **owner: Commercial / Operations**. Apply for a Nets-issued PBS creditor number and Mandate API access.
- **Acceptance criteria:**
  - [ ] PBS creditor number issued and stored in `nets/prod/pbs-creditor`.
  - [ ] Mandate API credentials stored in the secrets vault.
  - [ ] Test environment access verified by Engineering with a single test mandate creation.
- **DoD (overrides standing DoD):** Credentials present and a test mandate has been created end-to-end.
- **Spec story coverage:** Enables US-10; ADR section 7.3 launch gate.

#### 3.3 — MobilePay agreement creation endpoint

- **Description:** Build the backend endpoint that takes a signup session ID and issues `POST /recurring/v3/agreements` with the spec-defined fields, then returns the `vippsConfirmationUrl` to the client.
- **Acceptance criteria:**
  - [ ] Request body contains: `productName="El-abonnement"`, `productDescription="Strøm til kostpris hver {uge|måned}"`, `pricing.type="VARIABLE"`, `pricing.suggestMaxAmount=300000` (configurable via env var `MOBILEPAY_SUGGEST_MAX_AMOUNT_ORE`), `pricing.currency="DKK"`, `interval` per the session's billing frequency.
  - [ ] `merchantAgreementUrl` is `https://app.thecheappowercompany.dk/account/payment`.
  - [ ] `merchantRedirectUrl` is `https://app.thecheappowercompany.dk/signup/return?session={signupSessionId}` and resolves into the open signup session.
  - [ ] On 4xx response, the user is shown: "Vi kunne ikke oprette MobilePay-aftalen lige nu" and routed to the Betalingsservice fallback.
  - [ ] On 5xx response, the user is shown: "MobilePay svarer ikke lige nu. Prøv igen om lidt eller vælg Betalingsservice." with retry and fallback options.
  - [ ] Agreement ID returned by Vipps MobilePay is persisted on the session row.
  - [ ] No `phoneNumber` is sent in the request body (let MobilePay pre-fill).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-05 ac2, ac3, ac4; error rows "MobilePay agreement creation 4xx" and "5xx".

#### 3.4 — MobilePay redirect handling and session re-entry

- **Description:** Implement `GET /signup/return` to receive the redirect from MobilePay, look up the signup session by the query parameter, and route to the next screen based on agreement status.
- **Acceptance criteria:**
  - [ ] Endpoint validates the `session` query parameter against a live signup session.
  - [ ] If the session has already received `recurring.agreement-accepted.v1`, the user proceeds to the confirmation screen (Epic 4).
  - [ ] If still `PENDING`, the user sees an interim "Vent venligst — vi tjekker MobilePay" screen that polls every 3 s for up to 60 s.
  - [ ] If status flips to ACTIVE while waiting, advance to confirmation; otherwise route to the polling/timeout flow in Task 3.6.
- **DoD:** Standing DoD.
- **Spec story coverage:** US-05 ac3, ac5; signup-flow step 9.

#### 3.5 — MobilePay webhook receiver and state updates

- **Description:** Implement the webhook endpoint for MobilePay recurring events with signature verification, idempotency, and agreement-state machine updates.
- **Acceptance criteria:**
  - [ ] Endpoint subscribes to `recurring.agreement-accepted.v1`, `recurring.agreement-rejected.v1`, `recurring.agreement-stopped.v1` (the charge-related events are listed but ownership is the Billing component — verify routing only).
  - [ ] Webhook signature is verified per Vipps MobilePay docs; unverified payloads return 401 and are not processed.
  - [ ] Duplicate event delivery is idempotent (verified by a unit test replaying the same event twice).
  - [ ] On `agreement-accepted`, the session's payment state moves to `ACTIVE`, the customer's phone number from the event is captured on the customer record, and the signup session is advanced.
  - [ ] On `agreement-rejected`, the user is shown: "Du afviste MobilePay-aftalen. Du kan prøve igen eller vælge Betalingsservice i stedet." with both options.
  - [ ] All webhook events are written to the audit log with the event ID for traceability.
- **DoD:** Standing DoD plus a runbook entry on how to replay a missed webhook from the MobilePay dashboard.
- **Spec story coverage:** US-05 ac4, ac5, ac7; error row "MobilePay user explicitly rejects".

#### 3.6 — Agreement status polling and 10-minute timeout

- **Description:** Implement the 10-minute timer on the signup session that polls `GET /recurring/v3/agreements/{agreementId}` once at the 10-minute mark if no webhook has arrived.
- **Acceptance criteria:**
  - [ ] If `recurring.agreement-accepted.v1` arrives before 10 minutes, the timer is cancelled.
  - [ ] At 10 minutes with no webhook, a single `GET` is issued; ACTIVE status advances the flow as if the webhook had been received.
  - [ ] Still `PENDING` at 10 minutes shows: "Vi modtog ikke bekræftelse fra MobilePay. Prøv igen, eller vælg Betalingsservice." and the pending agreement is patched to `STOPPED`.
  - [ ] Timer survives a backend restart (persisted job, not in-memory).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-05 ac6; error row "MobilePay agreement still PENDING after 10 minutes".

#### 3.7 — Stale-agreement reconciliation (interrupted prior signup)

- **Description:** When creating a new MobilePay agreement, detect any prior `PENDING` agreement linked to the same `mitid.uuid` and patch it to `STOPPED` after the new agreement reaches ACTIVE so the customer ends with exactly one active agreement.
- **Acceptance criteria:**
  - [ ] On agreement creation, the system queries for prior agreements linked to the same `mitid.uuid` and `STOPPED`s them once the new one is `ACTIVE` (not before).
  - [ ] Action is logged in the audit trail.
  - [ ] If the customer is a returning former customer with an `ACTIVE` legacy agreement (different lifecycle), no new agreement is created — the existing one is PATCHed for `productName`, `interval`, and `suggestMaxAmount` only.
  - [ ] Integration test reproduces both scenarios (stale-PENDING and reused-ACTIVE).
- **DoD:** Standing DoD.
- **Spec story coverage:** Signup-flow steps 9c and 9d.

#### 3.8 — Betalingsservice mandate fallback flow

- **Description:** Build the Betalingsservice fallback screen and Nets Mandate API integration, triggered by MobilePay rejection, timeout, or explicit "Har du ikke MobilePay?" tap.
- **Acceptance criteria:**
  - [ ] Fallback screen accepts bank registration number and account number (or initiates BS-App SCA where supported).
  - [ ] Backend issues a Nets Mandate API request against our PBS creditor number, sending the customer's CPR (this is the only outbound use of raw CPR; not stored after submission).
  - [ ] On success, the customer record stores `payment_method = BETALINGSSERVICE` and the mandate ID; flow proceeds to Epic 4 confirmation.
  - [ ] On failure, the user sees: "Vi kunne ikke oprette Betalingsservice-aftalen. Tjek dine bankoplysninger og prøv igen." with a "Prøv MobilePay i stedet" link.
  - [ ] If the customer declines both methods, the partial customer record is rolled back per Epic 7 cleanup.
- **DoD:** Standing DoD plus DPO sign-off recorded that raw CPR is sent to Nets but not retained by us.
- **Spec story coverage:** US-10; error row "Betalingsservice mandate creation fails".

#### 3.9 — Webhook subscription registration script

- **Description:** Provide a one-shot script (run once per environment) that registers the MobilePay webhook subscriptions via the Webhooks API.
- **Acceptance criteria:**
  - [ ] Script registers subscriptions for `recurring.agreement-accepted.v1`, `recurring.agreement-rejected.v1`, `recurring.agreement-stopped.v1`.
  - [ ] Script is idempotent (re-running does not duplicate subscriptions).
  - [ ] Script output records subscription IDs which are stored as a runbook reference.
- **DoD:** Standing DoD plus runbook entry on how to re-run the script after a credential rotation.
- **Spec story coverage:** Payment Setup section, "Webhook subscriptions".

---

## Epic 4 — Session and Account Creation

**Goal:** When MitID + payment authorization both succeed, mint a TCPC-issued signed session JWT, persist a durable customer account, run duplicate-account checks, and show the customer the confirmation screen and email.

**Dependencies:** Epic 2 (signup session and OIDC claims), Epic 3 (payment authorization is captured).

### Tasks

#### 4.1 — Customer account record creation

- **Description:** On successful payment authorization, write the durable customer record from the signup session: `given_name`, `family_name`, `birthdate`, `mitid.uuid`, `sub`, supply address, metering point ID, email, billing frequency, payment method + external agreement/mandate ID, salted-hashed CPR.
- **Acceptance criteria:**
  - [ ] `mitid.uuid` is the immutable customer foreign key (column has a unique constraint).
  - [ ] CPR is stored only as a salted hash; raw CPR from the signup session is purged in the same transaction (subject to Epic 7 short-lived storage decision per ADR 6.6).
  - [ ] Customer record is created in state `PENDING` (DataHub registration not yet complete).
  - [ ] All seven OIDC-derived fields are populated; absent fields fail the transaction.
  - [ ] Audit log records the creation event with signup session ID and timestamp.
- **DoD:** Standing DoD plus a database migration is committed for the schema (referencing the Backend/API spec once it exists).
- **Spec story coverage:** US-04 ac1, ac2, ac3.

#### 4.2 — Duplicate account detection

- **Description:** Before creating a record, check for an existing customer by `mitid.uuid` and (defence-in-depth) by hashed CPR.
- **Acceptance criteria:**
  - [ ] `mitid.uuid` ACTIVE match → user sees: "Du er allerede kunde hos os." and a "Gå til min konto" CTA leading to logged-in account home.
  - [ ] `mitid.uuid` PENDING match → user is resumed at the next incomplete step with banner: "Vi fortsætter, hvor du slap."
  - [ ] `mitid.uuid` CANCELLED match → fresh signup proceeds; new record is linked to the prior one via a `prior_customer_id` foreign key for audit.
  - [ ] Hashed-CPR match without a `mitid.uuid` match → halts signup, shows: "Vi har brug for at verificere din identitet manuelt. Vi har sendt dig en e-mail." and creates an ops ticket.
- **DoD:** Standing DoD plus the ops ticketing target documented.
- **Spec story coverage:** US-11; error rows "Existing ACTIVE/PENDING/Hashed-CPR mismatch".

#### 4.3 — TCPC session JWT issuance

- **Description:** On successful payment + account creation, issue a TCPC-signed JWT representing the authenticated session (per ADR 3.2: "TCPC issues its own signed session JWTs").
- **Acceptance criteria:**
  - [ ] JWT is signed with an asymmetric key (RS256 or ES256) whose private key is held only by the auth service.
  - [ ] Claims include `sub` (TCPC customer ID), `mitid_uuid`, `iat`, `exp` (30-day sliding window from issuance).
  - [ ] Web sets the JWT inside an HttpOnly + Secure + SameSite=Lax cookie; iOS receives it in the response body for Keychain storage.
  - [ ] The Signicat ID token is discarded after claim extraction (not retained alongside the TCPC JWT).
  - [ ] Hard cap of 90 days from initial issuance is enforced regardless of refresh activity.
- **DoD:** Standing DoD plus the JWKS endpoint for the TCPC signing key is reachable at `https://api.thecheappowercompany.dk/.well-known/jwks.json`.
- **Spec story coverage:** Authentication Architecture section; US-08 ac4.

#### 4.4 — Confirmation screen

- **Description:** Build the post-success confirmation screen showing full name, supply address, billing frequency, masked MobilePay phone number, expected supply-start date, and a "Hent appen" CTA.
- **Acceptance criteria:**
  - [ ] Screen shows: full name, supply address, billing frequency in Danish, masked MobilePay phone number formatted as `+45 ** ** ** 23` (last two digits visible).
  - [ ] Expected supply-start date is the next valid Danish supplier-switch date (typically 6 working days from submission).
  - [ ] "Hent appen" CTA links to the App Store; on iOS native it is a "Færdig" button returning to the app home.
  - [ ] Screen is reachable only with a valid TCPC session JWT (no anonymous access).
- **DoD:** Standing DoD plus the supplier-switch date calculation has unit tests covering weekend/holiday rollover.
- **Spec story coverage:** US-07 ac1, ac2, ac5.

#### 4.5 — Confirmation email

- **Description:** Send a confirmation email within 60 s of reaching the confirmation screen, containing the same information plus a copy of the contract terms (PDF attachment or hosted link).
- **Acceptance criteria:**
  - [ ] Email is dispatched within 60 s of the confirmation screen rendering for the customer.
  - [ ] Subject line and body are in Danish; email contains all confirmation fields plus contract terms.
  - [ ] If the email-send fails, the confirmation screen still renders and a background retry runs for up to 24 h (verified by an integration test that fails the first send).
  - [ ] Successful sends are recorded in the audit log; failures alert the on-call channel after the 24-h retry window expires.
- **DoD:** Standing DoD plus the email template and contract terms PDF are reviewed by Legal.
- **Spec story coverage:** US-07 ac3; error row "Confirmation email send fails".

#### 4.6 — DataHub BRS-H1 submission queueing (interface only)

- **Description:** On confirmation, enqueue an asynchronous BRS-H1 submission job referencing the customer record. **This task creates the queue interface only**; the BRS-H1 message construction and B2B transmission are owned by the separate DataHub B2B Integration spec (ADR section 6.2 — currently a critical ownership gap).
- **Acceptance criteria:**
  - [ ] On reaching the confirmation screen, a job row is enqueued with the customer ID, metering point ID, supplier ID, and a placeholder for the CPR reference.
  - [ ] Customer is not blocked on this submission — confirmation renders immediately.
  - [ ] Job consumer is stubbed; the audit log records "BRS-H1 queued" with a correlation ID.
  - [ ] Stub is clearly marked TODO with a reference to the DataHub B2B Integration spec when written.
- **DoD:** Standing DoD plus an open ticket on the architecture board referencing ADR section 6.2 ownership gap.
- **Spec story coverage:** US-07 ac4; signup-flow step 11. **Note:** full DataHub integration is out of scope for this epic; see "Open Concerns" at the bottom of this document.

---

## Epic 5 — Returning User Authentication

**Goal:** Implement the password-free MitID login flow for returning users, plus session refresh, logout, and session expiry handling.

**Dependencies:** Epic 1 (Signicat clients), Epic 4 (TCPC session JWT issuance).

### Tasks

#### 5.1 — Login screen and OIDC initiation (web)

- **Description:** Build the web login screen with a single "Log ind med MitID" button that initiates OIDC Authorization Code + PKCE with `scope=openid profile` (no `nin`).
- **Acceptance criteria:**
  - [ ] Screen has no email or password fields.
  - [ ] Clicking "Log ind med MitID" issues an authorize request with exactly `scope=openid profile`.
  - [ ] PKCE `S256` is used as defence-in-depth on the confidential client.
  - [ ] OIDC `state` and `nonce` are bound to the login attempt.
- **DoD:** Standing DoD plus a unit test asserts `nin` is absent from the scope parameter on login (vs present on signup).
- **Spec story coverage:** US-08 ac1, ac2.

#### 5.2 — Login callback, customer match, and session establishment

- **Description:** Implement the login-side callback that exchanges the code, validates the ID token, looks up the customer by `mitid.uuid`, and establishes a TCPC session — without ever silently creating an account.
- **Acceptance criteria:**
  - [ ] Successful match issues a TCPC session JWT per Epic 4 Task 4.3.
  - [ ] No `mitid.uuid` match → user is shown an explicit "Det ser ud til at du ikke er kunde endnu — start en tilmelding" screen with a CTA to the signup entry URL. **No customer record is created silently.**
  - [ ] All ID tokens are validated against JWKS and discarded after claim extraction.
- **DoD:** Standing DoD.
- **Spec story coverage:** US-08 ac3, ac4, ac5.

#### 5.3 — Session refresh on activity

- **Description:** Implement sliding-window session refresh: on any authenticated request after the halfway point of the session lifetime, issue a new session JWT extending the window — bounded by the 90-day hard cap.
- **Acceptance criteria:**
  - [ ] Session JWT lifetime starts at 30 days; activity within the second half of the window extends the JWT to a fresh 30 days from now.
  - [ ] At 90 days from initial issuance, the customer is forced through MitID re-auth regardless of activity.
  - [ ] Refresh-token rejection by Signicat (revoked, expired, user revoked consent) forces MitID re-auth.
- **DoD:** Standing DoD.
- **Spec story coverage:** Authentication Architecture session-management requirements.

#### 5.4 — Logout

- **Description:** Implement logout: web clears the session cookie and deletes the server-side session row; iOS wipes Keychain entries. End-session at the broker is offered but not forced.
- **Acceptance criteria:**
  - [ ] `POST /auth/logout` (web) deletes the session row and clears the cookie with `Max-Age=0`.
  - [ ] iOS logout method removes refresh token and any cached access tokens from the Keychain.
  - [ ] An optional "Log out at MitID too" link calls Signicat's end-session endpoint; default action is local logout only.
  - [ ] Audit log records the logout event.
- **DoD:** Standing DoD.
- **Spec story coverage:** Authentication Architecture logout requirements.

#### 5.5 — Ops session-revocation endpoint

- **Description:** Provide an internal admin-only endpoint to invalidate any customer's sessions on demand (per ADR / Authentication Architecture).
- **Acceptance criteria:**
  - [ ] `POST /admin/customers/{id}/sessions/revoke` requires admin auth (per admin-portal spec) and deletes all session rows for that customer.
  - [ ] On the next authenticated request, the customer is forced to log in.
  - [ ] Audit log records actor, target, and reason.
- **DoD:** Standing DoD.
- **Spec story coverage:** Authentication Architecture session-management requirements.

---

## Epic 6 — iOS Onboarding Flow

**Goal:** Deliver the iOS-native screens for the 13-step signup flow, with `ASWebAuthenticationSession` + Universal Links + `idp_params` app-switch for MitID, AppAuth-iOS for OIDC, and Keychain for token storage. Native UI for the steps the spec marks native (per Open Question 10 default: native for steps 2, 4, 6, 7, 8, 10; web-flow-in-`ASWebAuthenticationSession` for steps 3 and 9).

**Dependencies:** Epic 1 (iOS public OIDC client + Universal Link redirect), Epic 2 (web flow exists for steps 3 and 9 to reuse), Epic 3 (MobilePay deep-link handling), Epic 4 (TCPC session JWT issuance), Epic 5 (login flow). **Resolution of Open Question 10 in the spec** is required before this epic starts to confirm the native-vs-web split.

### Tasks

#### 6.1 — AppAuth-iOS integration and OIDC config bootstrap

- **Description:** Add AppAuth-iOS to the SwiftUI app, load the Signicat discovery document at app start, and configure the public OIDC client with PKCE.
- **Acceptance criteria:**
  - [ ] AppAuth-iOS is added via Swift Package Manager.
  - [ ] App fetches discovery from `https://<tenant>.signicat.com/auth/open/.well-known/openid-configuration` and caches it.
  - [ ] `OIDServiceConfiguration` is constructed with the cached endpoints.
  - [ ] Client ID and redirect URI for the iOS public client are read from a build-time configuration (no secrets in the binary, but no secret needed for a public client).
- **DoD:** Standing DoD.
- **Spec story coverage:** US-02 (iOS specifics).

#### 6.2 — `ASWebAuthenticationSession` MitID flow with `idp_params` app-switch

- **Description:** Implement the iOS MitID flow using `ASWebAuthenticationSession`, embedding the `idp_params` JSON to trigger the MitID app switch on iOS.
- **Acceptance criteria:**
  - [ ] Authorize URL includes the URL-encoded `idp_params={"mitid":{"enable_app_switch":true,"app_switch_os":"ios","app_switch_url":"https://app.thecheappowercompany.dk/auth/return"}}`.
  - [ ] Flow is launched in `ASWebAuthenticationSession`; `WKWebView` and `UIWebView` are absent from the entire auth path (verified by a runtime audit and code review).
  - [ ] On a device with the MitID app installed, the test flow successfully app-switches to the MitID app.
  - [ ] On a device without the MitID app, the flow falls back to the MitID web experience inside `ASWebAuthenticationSession`.
  - [ ] Completion handler receives the redirect URI with `code` and `state`.
- **DoD:** Standing DoD plus a test report from a real iPhone running iOS 15 and a current iPhone running iOS 17+.
- **Spec story coverage:** US-02 ac2, ac3.

#### 6.3 — Token exchange and Keychain storage

- **Description:** Implement the AppAuth-iOS token exchange and store the refresh token in the iOS Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- **Acceptance criteria:**
  - [ ] Token exchange uses PKCE; access tokens are kept in memory only.
  - [ ] Refresh token is written to Keychain with the device-bound accessibility attribute.
  - [ ] Access token is discarded on app suspension.
  - [ ] On app cold-start, the refresh token is read and used to obtain a fresh access token without user interaction (when valid).
- **DoD:** Standing DoD plus a manual test confirms the refresh token does not appear in iCloud/iTunes backups (device-only attribute).
- **Spec story coverage:** Authentication Architecture iOS specifics.

#### 6.4 — Native pre-flight, address, billing-frequency, payment-choice screens

- **Description:** Build SwiftUI screens for steps 2 (pre-flight), 4 (claim review/address), 6 (CPR — note: per Open Question 10 default this is native; revisit on resolution), 7 (address & meter), 8 (billing frequency), 10 (confirmation) of the signup flow. (Steps 3 — MitID — and 9 — MobilePay redirect — are web-launched.)
- **Acceptance criteria:**
  - [ ] All copy is in Danish and matches the wording in the spec acceptance criteria.
  - [ ] Address validation calls the same backend endpoint as the web flow (Task 2.6's validation rules).
  - [ ] Metering point ID input is restricted to 18 numeric digits with on-screen keyboard set to numeric.
  - [ ] Billing frequency is a segmented control with "Månedlig" preselected.
  - [ ] Each screen supports VoiceOver labels and Dynamic Type per the Non-Functional Requirements.
- **DoD:** Standing DoD plus an accessibility audit on each screen (VoiceOver pass + largest Dynamic Type pass).
- **Spec story coverage:** US-04, US-06, US-07; signup-flow steps 2, 4, 6, 7, 8, 10.

#### 6.5 — MobilePay deep-link redirect and return handling on iOS

- **Description:** Hook the MobilePay flow on iOS: open the `vippsConfirmationUrl` via `ASWebAuthenticationSession` (or system browser as MobilePay docs require), then handle the Universal Link return into the app to advance the signup session.
- **Acceptance criteria:**
  - [ ] `vippsConfirmationUrl` opens the MobilePay app on iOS when installed; otherwise falls back to the MobilePay web confirmation page.
  - [ ] The Universal Link return into the TCPC app deep-links to the "checking MobilePay" screen with the signup session ID.
  - [ ] App polls the backend for agreement status using the same logic as Task 3.4.
  - [ ] On ACTIVE, the app advances to the native confirmation screen (Task 6.4); on rejection or timeout, the app navigates to the Betalingsservice fallback screen.
- **DoD:** Standing DoD plus a test report on a real iPhone with MobilePay installed.
- **Spec story coverage:** US-05 (iOS surface); signup-flow step 9.

#### 6.6 — Universal Links registration and entitlements

- **Description:** Configure Associated Domains, the apple-app-site-association file at `https://app.thecheappowercompany.dk/.well-known/apple-app-site-association`, and entitlements for both the OIDC redirect (`/auth/return`) and the marketing-CTA handoff.
- **Acceptance criteria:**
  - [ ] AASA file lists both paths (`/auth/return*`, `/signup*`) and the correct app team ID + bundle ID.
  - [ ] Associated Domains entitlement includes `applinks:app.thecheappowercompany.dk`.
  - [ ] Tapping the marketing CTA on a device with the app installed opens the app to the in-app signup entry; without the app installed, it loads the web flow.
  - [ ] OIDC redirect URI returns to the app via Universal Link, not via custom scheme alone.
- **DoD:** Standing DoD plus an Apple validator pass on the AASA file.
- **Spec story coverage:** US-01 ac4; US-02 ac2.

#### 6.7 — Login screen on iOS

- **Description:** Build the iOS login screen that mirrors the web login: a single "Log ind med MitID" button initiating the OIDC flow with `scope=openid profile`.
- **Acceptance criteria:**
  - [ ] No email/password fields.
  - [ ] Initiates `ASWebAuthenticationSession` with the public client and `scope=openid profile` (no `nin`).
  - [ ] On successful match, the TCPC session JWT is returned to the app and stored in Keychain.
  - [ ] On no match, navigates to the in-app signup entry.
- **DoD:** Standing DoD.
- **Spec story coverage:** US-08 (iOS surface).

---

## Epic 7 — Error and Edge-Case Handling

**Goal:** Cover every row of the spec's Error States table not already implemented inline in earlier epics, plus the cross-cutting cleanup jobs: 60-minute idle session purge, abandoned-session rollback, soft rate-limiting on repeated MitID failures, and ops escalation paths.

**Dependencies:** Epics 2, 3, 4 must be in place before most of this epic's tests can run end-to-end.

### Tasks

#### 7.1 — MitID broker unavailability auto-retry and surfacing

- **Description:** Implement the auto-retry behaviour for Signicat 5xx and >30 s timeouts at the OIDC initiation step, plus the user-visible message and the structured event log.
- **Acceptance criteria:**
  - [ ] On a 5xx or >30 s timeout, the user sees: "MitID er midlertidigt utilgængeligt. Vi prøver igen automatisk om lidt."
  - [ ] One auto-retry runs after 15 s; if still failing, the user sees a "Prøv igen" button.
  - [ ] A `signup.mitid_broker_unavailable` event is logged server-side with the broker correlation ID.
  - [ ] Same handling is reused if the CPR Match endpoint times out (>10 s).
- **DoD:** Standing DoD.
- **Spec story coverage:** Error rows "MitID broker 5xx/timeout" and "CPR Match endpoint timeout".

#### 7.2 — Soft rate-limit on repeated MitID failures

- **Description:** Implement the rate-limit check that triggers after three consecutive failures from the same browser session within 15 minutes.
- **Acceptance criteria:**
  - [ ] After 3 failures within 15 minutes from a given signup session (or browser fingerprint for unauthenticated retries), the user sees: "Vi har problemer lige nu — prøv igen om et øjeblik."
  - [ ] The lockout lasts 5 minutes (verifiable in code; not user-visible).
  - [ ] Counter resets after a successful auth or after 15 minutes of inactivity.
- **DoD:** Standing DoD.
- **Spec story coverage:** US-09 ac3.

#### 7.3 — User-cancelled MitID flow handling

- **Description:** Handle the `error=access_denied` (user-cancelled) case as a non-blocking notice, separate from a hard failure.
- **Acceptance criteria:**
  - [ ] On `error=access_denied`, the user is returned to the pre-flight screen with notice: "Du afbrød MitID-login. Du kan prøve igen, når du er klar."
  - [ ] Notice is non-blocking (user can immediately retry without dismissing a modal).
  - [ ] Cancellation is logged server-side but does not contribute to the rate-limit counter.
- **DoD:** Standing DoD.
- **Spec story coverage:** Error row "MitID error=access_denied (user cancelled)".

#### 7.4 — Missing OIDC claim handling

- **Description:** When the ID token is missing any required claim, abort signup with the spec-defined message and log the missing claim list.
- **Acceptance criteria:**
  - [ ] If any of `sub`, `given_name`, `family_name`, `birthdate`, `nin`, `mitid.uuid` is absent, the user sees: "Vi kunne ikke modtage de nødvendige oplysninger fra MitID. Kontakt support hvis problemet fortsætter."
  - [ ] Server logs `signup.missing_oidc_claims` with the array of missing fields.
  - [ ] The signup session is terminated; the user must restart from the pre-flight screen.
- **DoD:** Standing DoD.
- **Spec story coverage:** Error row "ID token missing required claim".

#### 7.5 — Abandoned-session 60-minute idle purge job

- **Description:** Background job that purges signup sessions and any partial customer records that have not reached payment authorization within 60 minutes of last activity.
- **Acceptance criteria:**
  - [ ] Job runs every 5 minutes and selects sessions with `last_activity_at < now() - 60 minutes` and `payment_state != ACTIVE`.
  - [ ] Selected sessions and any associated partial records are hard-deleted (no soft-delete) to satisfy GDPR data minimisation.
  - [ ] Salted-hashed CPR copies in the session table are deleted with the session row.
  - [ ] Job runs are logged with a count of purged sessions; metric is exposed for monitoring.
  - [ ] Integration test creates a session, advances time 61 minutes via injected clock, and asserts the session is gone.
- **DoD:** Standing DoD plus DPO sign-off on the 60-minute window (Open Question 8 in the spec).
- **Spec story coverage:** Error row "Session idle timeout"; US-10 ac5 (rollback when neither payment method succeeds).

#### 7.6 — DataHub rejection / timeout customer-facing handling

- **Description:** When the DataHub B2B Integration component publishes a rejection or 24-h-retry-exhausted event for a queued submission, transition the customer to `DATAHUB_REJECTED`, send the customer email, and open an ops ticket.
- **Acceptance criteria:**
  - [ ] On rejection event, customer state moves to `DATAHUB_REJECTED`.
  - [ ] Customer receives an email: "Vi kunne ikke overtage din strømmåler. Vi ringer til dig inden for 1 hverdag."
  - [ ] Ops ticket is opened with category `datahub_rejected` (rejection) or `datahub_unavailable` (timeout).
  - [ ] Existing MobilePay/Betalingsservice authorization is left intact; no charges are created.
  - [ ] **This task depends on the DataHub B2B Integration spec being written and the rejection event format being defined** (ADR section 6.2 — currently a critical ownership gap). Until then, this task is a stub that subscribes to a placeholder event topic.
- **DoD:** Standing DoD plus the dependency on the DataHub B2B Integration spec is recorded.
- **Spec story coverage:** Error rows "DataHub BRS-H1 submission rejected" and "DataHub BRS-H1 submission times out".

#### 7.7 — Marketing CTA unreachable graceful degradation

- **Description:** Coordinate with the Marketing Site spec owner to ensure the CTA shows a graceful error when the signup entry URL is unreachable.
- **Acceptance criteria:**
  - [ ] Marketing site has a documented error display: "Vi kunne ikke åbne tilmeldingen lige nu. Prøv igen om lidt." with a "Prøv igen" button.
  - [ ] Onboarding component exposes a lightweight health endpoint the marketing site can hit before redirect.
  - [ ] Ownership note added to the marketing-site spec.
- **DoD:** Standing DoD plus the marketing-site spec owner has acknowledged the contract.
- **Spec story coverage:** Error row "Marketing CTA clicked but signup entry URL is unreachable".

#### 7.8 — Audit log for state transitions

- **Description:** Implement the audit log writer that records every customer-record state transition (created, MitID verified, CPR matched, payment authorized, DataHub submitted, DataHub accepted, DataHub rejected, cancelled).
- **Acceptance criteria:**
  - [ ] Audit log row contains: customer ID, transition type, timestamp, actor (system/user/admin), signup session ID, source IP/user-agent where applicable.
  - [ ] Log is append-only (no UPDATE or DELETE permitted at the database level).
  - [ ] Log is retained for 7 years per Danish bookkeeping rules.
  - [ ] CPR, `nin`, tokens, and bank account numbers are never written to the log.
- **DoD:** Standing DoD plus a redaction unit test that asserts no sensitive value is in any log row written by signup code paths.
- **Spec story coverage:** Non-Functional Requirements "Audit logging".

---

## Open concerns surfaced to product / architecture

These are known unresolved issues from the spec and ADR that gate or shape this work but cannot be resolved by Engineering alone. Listed for visibility on the team backlog:

1. **ADR section 6.2 — BRS-H1 ownership gap (CRITICAL).** No component spec currently owns BRS-H1 implementation. Epic 4 Task 4.6 and Epic 7 Task 7.6 are stubbed against a not-yet-written DataHub B2B Integration spec. **Owner:** Architect / Product. **Impact if unresolved:** No customer can receive electricity from TCPC.

2. **ADR section 6.6 — CPR re-supply for BRS-H1 (MEDIUM).** Backend needs raw CPR to compose BRS-H1; Epic 4 stores hashed CPR only. Three options: short-lived encrypted store, customer re-supply, alternate identifier accepted by Energinet. **Owner:** DataHub B2B Integration spec author + DPO. **Default until resolved:** Epic 4 deletes raw CPR from the session table the moment the customer record is created.

3. **Spec Open Question 1 — Signicat production contract pricing.** Tracked as Epic 1 Task 1.5. **Owner:** Commercial / CEO.

4. **Spec Open Question 2 — CPR storage GDPR legal review.** Hard launch gate. **Owner:** External counsel + DPO. **Default until resolved:** salted hash only; raw CPR sent only outbound to Signicat (CPR Match) and Nets (Mandate API), never persisted by us.

5. **Spec Open Question 5 — `suggestMaxAmount` ceiling.** ADR section 5.3 flags a conflict between this spec (3,000 DKK) and companion-app.md (5,000 DKK). Epic 3 Task 3.3 implements 3,000 DKK as a configurable env var. **Owner:** Product + Customer Insights. **Resolution must precede Epic 3 implementation.**

6. **Spec Open Question 7 — Phone number capture before MobilePay.** Affects whether Epic 2 Task 2.7 (email capture) needs an adjacent phone field. Default: no — accept the number MobilePay returns. **Owner:** Product.

7. **Spec Open Question 8 — Abandoned-session retention.** Epic 7 Task 7.5 implements the 60-minute purge as default. **Owner:** DPO + Engineering.

8. **Spec Open Question 10 — iOS app vs web parity.** Determines exactly which signup steps are native iOS UI vs web-in-`ASWebAuthenticationSession`. Default split (steps 2, 4, 6, 7, 8, 10 native; steps 3, 9 web-launched) is encoded into Epic 6. **Owner:** Product. **Resolution must precede Epic 6 sprint planning.**

9. **ADR section 6.3 — Backend/API specification missing.** Epic 4 in particular references an as-yet-unwritten Backend/API spec for the customer database schema, session store, and audit log schema. **Owner:** Architect. **Default until written:** Epics 2 and 4 use schemas described inline in the customer-onboarding spec; final schema is owned by the Backend/API spec.
