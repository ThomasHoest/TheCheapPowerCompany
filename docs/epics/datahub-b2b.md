# Epic Breakdown: DataHub B2B Integration (BRS-H1 Supplier Switching)

> **Status note.** A DataHub B2B Integration specification does not yet exist.
> This epic breakdown is derived from ADR-001 (sections 3.6, 5.4, 6.2, 6.6,
> 7.4), the customer-onboarding spec (DataHub Integration section and Signup
> Flow step 11), and the power-broker research (DataHub/Eloverblik
> Integration). **A full DataHub B2B spec must be written before
> implementation of epics 3–5 begins.** Epics 1 and 2 (regulatory
> registration and generic XML/transport infrastructure) can begin in
> parallel with that spec being written; their tasks do not depend on
> BRS-H1 message-level decisions still under discussion.

## Component context

| Item | Value |
|---|---|
| Component name | DataHub B2B Integration |
| Owning team | Backend / Platform Engineering (with Regulatory PM for epic 1) |
| Upstream dependency | ADR-001 (PROPOSED); customer-onboarding.md US-04, US-07, signup-flow steps 11–13 |
| Downstream consumer | Customer onboarding (BRS-H1 submission queueing), Billing (supplier-of-record gate) |
| External counterpart | Energinet DataHub (test and production), Energinet ebIX-channel operations |
| Identified gaps from ADR-001 | 6.2 (ownership gap), 6.6 (CPR re-supply problem), 7.4 (ebIX deprecation risk) |

## Cross-cutting open questions for the spec author

These must be answered in the DataHub B2B spec before epics 3–5 start. They are surfaced here so the spec author has a checklist; they are **not** to be resolved in this epic document.

1. Which BRS-H1 ebIX schema version (and which Energinet release wave) does v1 target? Owner: Regulatory PM + Engineering. Default: latest production-active version on the DataHub test environment at the time the test certificate is issued.
2. CPR handling through the submission pipeline (ADR-001 §6.6). Three options on the table: (a) short-lived encrypted store through BRS-H1 submission, (b) re-prompt customer at submission time, (c) DataHub-recognised alternative identifier. Owner: DPO + Regulatory PM. Default: option (a) with maximum 72-hour TTL.
3. What is the inbound channel for DataHub asynchronous responses — pull (poll) or push (callback to a TCPC-hosted endpoint)? Owner: Engineering, after Energinet onboarding handoff.
4. ebIX → Green Energy Hub migration timeline (ADR-001 §7.4). Owner: Regulatory PM. Default: v1 builds on ebIX; a v2 migration epic is opened once Energinet publishes a cutover date.
5. Does v1 support BRS-H1 withdraw / cancellation messages, or only initial submission and accept/reject? Owner: Product. Default: v1 covers initial submission + accept/reject + manual ops-driven withdraw.

---

## Epic 1 — DataHub Registration & Certificate Management

**Type:** Regulatory / Operations (no application code).
**Goal:** TCPC is a registered DataHub supplier with a valid production certificate stored in the secrets store, and a documented rotation procedure.
**Outcome blocks:** every other epic in this document, customer onboarding signup-flow step 11, all production billing.
**Lead time:** 6–12 weeks from company registration (per ADR-001 §7.3), parallelisable with epic 2.

| # | Task | Owner category | Lead time | Definition of done |
|---|---|---|---|---|
| 1.1 | Confirm current DKK deposit figure with Energinet (re-validate the 2021 Terms of Access PDF figure of DKK 1,000,000) | Regulatory PM | 1 week | Written confirmation from Energinet on file. |
| 1.2 | Open Energinet account and submit DataHub supplier registration application | Regulatory PM | 1 week to submit; 4–8 weeks to approval | Application submitted with all annexes; tracking number recorded. |
| 1.3 | Pay the DKK cash deposit to Energinet | Finance | 1–2 weeks (concurrent with 1.2) | Wire confirmed; receipt filed. |
| 1.4 | Apply for DataHub **test environment** access and request a test certificate | Regulatory PM (with Engineering on technical fields) | 1–2 weeks after 1.2 submitted | Test access credentials and test certificate (PFX/P12) received. |
| 1.5 | Define the secrets-store layout for DataHub certificates (KMS-encrypted bucket / vault path naming, IAM policy, environment separation test/prod) | Engineering | 1 day | Vault paths created; IAM policy reviewed by security. |
| 1.6 | Import the test certificate into the secrets store (test environment only) | Engineering | 0.5 day | Test cert retrievable by the backend test runtime via the secrets-store SDK; not present in source control or CI logs. |
| 1.7 | Complete Energinet acceptance testing in the DataHub test environment (BRS-H1 submission, accept response, reject response — using epic 2 + epic 3 stubs) | Engineering + Regulatory PM | 2–4 weeks after 1.6 | Energinet sign-off email confirming acceptance; results filed against the tracking number from 1.2. |
| 1.8 | Apply for the **production** DataHub certificate | Regulatory PM | 1 week after 1.7 sign-off | Production certificate issued. |
| 1.9 | Import the production certificate into the secrets store (production environment) and verify retrieval from production runtime only | Engineering | 0.5 day | Cert retrievable in prod runtime; access denied from test runtime; CloudTrail/audit log entry confirmed. |
| 1.10 | Submit TCPC supplier master data to DataHub (GLN/EIC, name, contact) | Engineering + Regulatory PM | 0.5 day | Supplier record live in DataHub production. |
| 1.11 | Document the certificate rotation procedure (annual cadence, dry-run steps, rollback, downtime window, who is on the call) | Engineering | 1 day | Runbook in `docs/runbooks/datahub-cert-rotation.md`; reviewed by on-call and ops; rehearsal scheduled within first 90 days post-launch. |
| 1.12 | Schedule the first dry-run rotation in the test environment | Engineering | 0.5 day | Calendar invite for a date no later than 6 months before production cert expiry. |

---

## Epic 2 — ebIX XML Message Infrastructure

**Type:** Software (backend platform).
**Goal:** A reusable, certificate-authenticated, audited transport layer capable of submitting any ebIX XML message to DataHub and receiving any inbound ebIX message, independent of BRS-H1 specifics.
**Outcome blocks:** epics 3, 4, 5.
**Pre-req:** Epic 1 task 1.6 (test cert imported) for first end-to-end smoke test. Tasks 2.1–2.4 do not need a real cert.

| # | Task | Estimate | Definition of done |
|---|---|---|---|
| 2.1 | Select an ebIX-capable XML library (parser + serialiser + XSD validation) for the backend stack and document the choice in an ADR | 2 days | ADR `docs/decisions/ADR-002-ebix-xml-library.md` accepted; library added to the backend dependency manifest with a pinned version. |
| 2.2 | Implement an XSD-validating XML parser/serialiser wrapper with explicit namespace handling for ebIX | 2 days | Round-trip parse/serialise unit tests pass on at least three example BRS-H1 messages from Energinet's published samples. |
| 2.3 | Implement XML digital signing (XMLDsig per Energinet's signing profile) using a certificate fetched from the secrets store at runtime | 3 days | A signed message validates with `xmlsec1` against the signing cert; the cert is loaded only via the secrets-store SDK, never from disk paths or env vars. |
| 2.4 | Implement signature verification for inbound messages against Energinet's published signing certificate | 2 days | Verifier rejects tampered messages in unit tests; accepts known-good Energinet samples. |
| 2.5 | Implement the certificate-authenticated HTTPS client targeting the DataHub B2B endpoint (mTLS, the test cert from epic 1) | 2 days | Smoke test: client opens an mTLS connection to the DataHub test endpoint and a non-XML probe returns the expected protocol-level response code. |
| 2.6 | Implement the outbound submission service: accept a serialised+signed ebIX envelope, POST to DataHub, capture and persist response headers, body, and TCPC-assigned correlation ID | 3 days | A test submission round-trips end to end against DataHub test environment, with the request, response, and correlation ID written to the audit log table (per task 2.7). |
| 2.7 | Define and implement the audit log schema for every outbound and inbound DataHub message: `correlation_id`, `direction`, `business_process` (e.g. `BRS-H1`), `customer_id` (nullable for non-customer messages), `xml_payload` (encrypted at rest), `status`, `submitted_at`, `responded_at`, `actor` | 2 days | Migration applied; every call from task 2.6 produces exactly one outbound row; encryption confirmed by inspecting raw storage. Retention: 7 years (matches the onboarding spec's audit retention NFR). |
| 2.8 | Implement retry with exponential backoff for transient transport errors (network, 5xx). Schedule per onboarding spec: 1m, 5m, 30m, 2h, 12h, then dead-letter at 24h | 2 days | Retries are scheduled by a queue worker, idempotent, and visible in the audit log as separate attempts sharing one `correlation_id`. |
| 2.9 | Implement a dead-letter queue for messages that exhaust retries. DLQ entries are visible in the admin portal (read-only in v1) and trigger an ops alert | 2 days | A forced-failure integration test lands in the DLQ; the alert (PagerDuty / Slack / email per ops convention) fires once per DLQ entry, not per retry. |
| 2.10 | Implement a structured-logging wrapper that redacts CPR, certificate material, and any PII before logs leave the application process | 1 day | Unit tests assert that representative payloads with CPR are emitted as `[REDACTED]` to the log sink; an end-to-end test confirms no CPR appears in the log aggregator. |
| 2.11 | Implement an inbound message ingestion endpoint or poller (decision deferred to spec — see cross-cutting Q3) — stub interface is sufficient for v1 of this epic | 2 days | A handler accepts a verified inbound XML message, writes the audit log row (direction = `INBOUND`), and dispatches by `business_process` to a registered handler. Default handler logs and acknowledges. |

---

## Epic 3 — BRS-H1 Supplier Switch — Message Composition

**Type:** Software (BRS-H1 specific).
**Goal:** From a `customer_id` and the data captured in onboarding, compose a valid, signed BRS-H1 ebIX XML supplier-switch request and hand it to the epic 2 transport.
**Pre-req:** A written DataHub B2B specification covering BRS-H1 message structure and resolving cross-cutting Q2 (CPR handling). Epic 2 tasks 2.1–2.7 complete.
**Owns:** Resolution of ADR-001 §6.6 (CPR re-supply problem) within the chosen approach.

| # | Task | Estimate | Definition of done |
|---|---|---|---|
| 3.1 | Define the BRS-H1 input contract: a typed object containing `customer_id`, supplier GLN/EIC, metering point ID (18 digits), CPR or DataHub-recognised reference, customer name, supply address, requested effective date | 1 day | TypeScript/Go/etc. type and validation rules merged; aligns 1:1 with the fields enumerated in customer-onboarding.md DataHub Integration section. |
| 3.2 | Implement the next-valid-switch-date calculator (typically 6 working days from submission per onboarding spec US-07; respect Danish public holiday calendar) | 2 days | Unit tests cover normal weekdays, weekends, and a public-holiday boundary; calendar source is documented and updateable without a code change. |
| 3.3 | Implement the BRS-H1 ebIX XML composer (input contract → ebIX envelope) using the epic 2 XML library | 3 days | Composer output validates against Energinet's BRS-H1 XSD locally (task 3.5) for a representative happy-path input. |
| 3.4 | **CPR handling pipeline** — implement the option chosen by the spec (default: short-lived encrypted CPR store with a TTL bounded to the BRS-H1 submission window). Includes: write at signup, read at submission, hard-delete on success / on TTL expiry / on rejection | 3 days | Encrypted store uses a KMS-managed key distinct from general application data; no CPR appears in any log; DPO sign-off recorded; TTL-expiry sweeper runs and is observable. |
| 3.5 | Vendor in (or fetch at build time from Energinet) the BRS-H1 XSD and wire it to task 2.2's validator. Composition fails closed if XSD validation fails | 1 day | A malformed input causes `compose()` to throw a typed validation error before any network call; the error is logged with the failing field path. |
| 3.6 | Implement the message-correlation-ID generator (UUID v4 or Energinet-required format; spec-driven) | 0.5 day | Generator is collision-safe and deterministic in tests; correlation ID is the join key between epic 3 (composition) and epic 4 (response handling). |
| 3.7 | Wire composer + signer (epic 2 task 2.3) + transport (epic 2 task 2.6) into a single `submitSupplierSwitch(customer_id)` backend operation, idempotent on `customer_id` (re-submission for the same customer returns the existing correlation ID rather than creating a duplicate) | 2 days | Calling twice for the same customer in the same `PENDING_DATAHUB` state yields one DataHub submission, one audit row, one correlation ID. |
| 3.8 | Integrate `submitSupplierSwitch` with the onboarding queue (signup-flow step 11) so customer confirmation is not blocked on DataHub | 1 day | After confirmation screen renders (US-07), a queued job runs `submitSupplierSwitch` within 60 seconds; failure of the queue job does not affect the confirmation screen. |
| 3.9 | End-to-end test against the DataHub test environment using a synthetic test customer | 2 days | A test customer with a valid test metering point produces a successful submission; correlation ID, audit row, and DataHub-acknowledged receipt all recorded. |

---

## Epic 4 — BRS-H1 Supplier Switch — Async Response Handling

**Type:** Software (BRS-H1 specific).
**Goal:** Receive accept / reject responses from DataHub for a previously submitted BRS-H1 message, update the customer record, and escalate failures.
**Pre-req:** Epic 2 task 2.11 (inbound dispatcher), epic 3 task 3.6 (correlation ID), DataHub B2B spec resolves cross-cutting Q3 (push vs pull).

| # | Task | Estimate | Definition of done |
|---|---|---|---|
| 4.1 | Implement the BRS-H1 response parser (accept message → typed object; reject message → typed object with reason code + reason text) | 2 days | Parser handles all reject reason codes documented by Energinet for BRS-H1; unknown reason codes are preserved verbatim and logged at WARN. |
| 4.2 | Implement the correlation-ID lookup: given an inbound BRS-H1 response, find the originating customer record via the audit-log correlation ID | 1 day | Lookup returns the customer row in O(1); a response whose correlation ID does not match any open submission lands on a manual-review queue. |
| 4.3 | On accept: transition customer from `PENDING_DATAHUB` → `SCHEDULED` and store the confirmed effective date returned by DataHub. Trigger the second confirmation email defined in onboarding signup-flow step 12 | 2 days | Customer lifecycle event written; the confirmation email contains the DataHub-confirmed effective date, not the originally calculated one. CPR (if held under task 3.4 short-lived store) is hard-deleted at this point. |
| 4.4 | On reject: transition customer to `DATAHUB_REJECTED`, hold account in `PENDING` for ops review, send the customer-facing email defined in onboarding Error States ("Vi kunne ikke overtage din strømmåler. Vi ringer til dig inden for 1 hverdag."), and open a support ticket with the reject reason code attached | 2 days | Customer record reflects rejection; ticket created in the support system with the audit-log correlation ID linked; payment authorisation is **not** revoked (per onboarding Error States). |
| 4.5 | Implement the 48-hour-no-response timeout watcher. If DataHub has not responded within 48 hours of submission, transition to `DATAHUB_TIMEOUT`, alert ops, and apply the same `datahub_unavailable` ops-ticket category as the 24-hour transport-retry exhaustion case | 2 days | Watcher runs at most once per submission; alert is idempotent; an integration test simulates the timeout and verifies the lifecycle transition and ticket creation. |
| 4.6 | Customer-state-machine reference: `PENDING_PAYMENT` → `PENDING_DATAHUB` → (`SCHEDULED` \| `DATAHUB_REJECTED` \| `DATAHUB_TIMEOUT`). Make this enum and its allowed transitions a single source of truth used by epics 3, 4, and the onboarding component | 1 day | Enum defined in shared types; illegal transitions throw at runtime; states match those referenced in onboarding Error States and signup-flow step 13. |
| 4.7 | Admin-portal read-only view of any customer's BRS-H1 submissions, responses, audit-log entries, and current state. (Write actions deferred — manual ops actions like `datahub_unavailable` retry remain a v1.1 scope item) | 2 days | Admin user with `read_only` role can open a customer page and see the full DataHub message timeline. |
| 4.8 | End-to-end test of accept and reject flows against the DataHub test environment | 2 days | One synthetic customer flows through accept; a second flows through reject; both produce the correct emails, lifecycle events, and audit entries. |

---

## Epic 5 — Metering Point Validation

**Type:** Software (BRS-H1 specific).
**Goal:** Before a BRS-H1 is queued for submission, validate that the customer-supplied 18-digit metering point ID exists in DataHub and is associated with the customer's supply address. Reject invalid metering points during onboarding rather than after a BRS-H1 reject round-trip.
**Pre-req:** DataHub B2B spec confirms which DataHub call (likely an ebIX request-for-master-data business process) returns metering-point details to a registered supplier; cross-cutting Q1 of this document.
**Note:** ADR-001 §4.4 records that direct DataHub-supplier metering-data access is "deferred to v2 investigation" for the *consumption* use case (Eloverblik covers v1 there). Master-data lookup of a single metering point for *validation* before submission is a different, narrower call and is in scope for this epic. The spec must confirm this narrower call is available to a registered supplier in v1; if not, this epic is downgraded to "validate format only and rely on BRS-H1 reject" — see fallback in task 5.6.

| # | Task | Estimate | Definition of done |
|---|---|---|---|
| 5.1 | Confirm with Energinet (via the regulatory PM) which DataHub call returns metering-point master data (address, GSRN, current supplier, status) to a registered supplier in v1, and document the answer in the DataHub B2B spec | Regulatory PM, 1 week lead time | Answer recorded in the spec; sample request/response on file. |
| 5.2 | Implement the metering-point lookup composer + parser (ebIX or REST per 5.1's answer) reusing epic 2 transport | 2 days | Lookup of a known test metering point returns address fields and the current supplier ID. |
| 5.3 | Implement the validation rule: the DataHub-returned address must match the customer-entered supply address (street, house number, postcode) within an agreed normalisation tolerance (case, whitespace, Danish letter folding) | 2 days | Mismatch produces a typed validation error with the specific field that disagrees; the customer sees an inline error during signup, not a post-confirmation rejection. |
| 5.4 | Wire validation into the onboarding flow at signup-flow step 7 (Address & metering point), before the customer reaches step 8 (Billing frequency) | 1 day | A customer who enters a non-existent or address-mismatched metering point cannot proceed past step 7; copy reuses (or extends) onboarding Error States entries for metering-point validation. |
| 5.5 | Add error-state copy to the onboarding spec's Error States table for: "metering point not found", "metering point address does not match supply address", "metering point already held by TCPC" | Product copywriting, 0.5 day | Strings drafted and reviewed by Product; merged into customer-onboarding.md by the spec owner (cross-spec change tracked in the DataHub B2B spec change log). |
| 5.6 | **Fallback path** if 5.1 reveals no v1 supplier-side master-data call exists: implement format-only validation (18 numeric digits + Luhn-style checksum if defined by Energinet), and document that address validation happens via BRS-H1 reject only | 1 day | Either 5.2–5.5 are delivered, or 5.6 is delivered with a tracked v1.1 ticket to revisit once the call is available. |
| 5.7 | End-to-end test against the DataHub test environment: a valid metering point passes; a malformed one is rejected at step 7; a real-but-mismatched-address one is rejected at step 7 | 1 day | All three cases produce the correct user-facing outcome and the correct audit entries. |

---

## Sequencing summary

```
Epic 1 (regulatory) ────────────────────────────────────────────────────► production launch gate
       │
       └─► task 1.6 (test cert) ─┐
                                 │
Epic 2 (ebIX infra)  ────────────┴─► task 2.6 (transport smoke test)
       │
       ├─► Epic 3 (BRS-H1 composition)  ──┐
       │                                  ├─► task 1.7 (Energinet acceptance testing)
       ├─► Epic 4 (async responses)  ─────┤
       │                                  │
       └─► Epic 5 (metering-point validation, narrower)
                                          │
                                          └─► task 1.8 (production cert) ─► v1 launch
```

## Out of scope for v1 (this component)

- BRS-H3 wholesale settlement (ADR-001 §3.6 confirms out of scope).
- Direct DataHub-mediated *consumption* meter data (Eloverblik covers this in v1; ADR-001 §4.4).
- BRS-H1 customer-initiated cancellation / withdraw (covered by the Contract & Cancellation spec — does not exist yet).
- ebIX → Green Energy Hub migration (ADR-001 §7.4 — separate v2 epic, opens when Energinet publishes a cutover date).
- Admin-portal write actions on DataHub messages (manual retry, manual withdraw); v1 is read-only.
- Bulk operations (multi-customer batched switching) — v1 is one customer per submission.

## Open questions specific to this epic breakdown

These differ from the cross-cutting questions at the top in that they are about how this epic *plan* is executed, not what the spec says.

1. **Owning team for epic 1 task 1.7 (Energinet acceptance testing).** Is this a Regulatory PM-led activity with engineering support, or engineering-led with Regulatory PM oversight? Owner: Engineering Manager + Regulatory PM. Default: Regulatory PM owns the relationship and timeline, Engineering owns the technical execution; both are jointly accountable for sign-off.
2. **Whether epic 5 (metering-point validation) ships in v1 at all** if cross-cutting Q1 (master-data call availability) returns "not available to v1 suppliers". Owner: Product. Default: yes, ship the format-only fallback (task 5.6); the address-match validation lands in v1.1.
3. **Whether the short-lived encrypted CPR store (task 3.4) needs DPIA before code starts** or can run concurrently with implementation under DPO advisement. Owner: DPO. Default: DPIA runs concurrently; production deploy is gated on DPIA sign-off.

## Resolved decisions (from ADR-001 and the onboarding spec)

| Question | Decision | Source |
|---|---|---|
| Channel for BRS-H1? | ebIX XML over certificate-authenticated DataHub B2B. | ADR-001 §3.6 |
| Is BRS-H1 submission synchronous with the signup screen? | No. Asynchronous, queued. | customer-onboarding.md, US-07 / signup-flow step 11 |
| Where do certificates live? | Secrets store. Never in source control. | ADR-001 §3.6 |
| Retry cadence for transport failures? | 1m, 5m, 30m, 2h, 12h up to 24h, then escalate. | customer-onboarding.md, DataHub Integration |
| Audit log retention? | 7 years (Danish bookkeeping rules). | customer-onboarding.md, NFRs |
| Are raw CPR values logged anywhere? | No, ever. | customer-onboarding.md, NFRs |
| Is BRS-H3 wholesale settlement in scope for v1? | No. | ADR-001 §3.6 |
