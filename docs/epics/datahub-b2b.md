# Epics & Tasks: DataHub B2B Integration (BRS-H1 Supplier Switching)
**Version:** 1.0
**Status:** Draft
**Date:** 2026-04-29
**References:** ADR-001 (sections 3.6, 5.4, 6.2, 6.6, 7.4); customer-onboarding.md (DataHub Integration section, US-04, US-07, signup-flow steps 11–13); power-broker research (DataHub/Eloverblik Integration)

---

> **Status note.** A DataHub B2B Integration specification does not yet exist.
> This epic breakdown is derived from ADR-001 (sections 3.6, 5.4, 6.2, 6.6,
> 7.4), the customer-onboarding spec (DataHub Integration section and Signup
> Flow step 11), and the power-broker research (DataHub/Eloverblik
> Integration). **A full DataHub B2B spec must be written before
> implementation of epics E-03–E-05 begins.** Epics E-01 and E-02 (regulatory
> registration and generic XML/transport infrastructure) can begin in
> parallel with that spec being written; their tasks do not depend on
> BRS-H1 message-level decisions still under discussion.

---

## Overview

This component delivers TCPC's regulated integration with Energinet DataHub for BRS-H1 supplier switching, comprising regulatory registration and certificate management, a reusable ebIX XML transport layer, BRS-H1 message composition and async response handling, and metering-point validation. Component owner is Backend / Platform Engineering (with Regulatory PM for E-01). Upstream dependencies: ADR-001 (PROPOSED) and customer-onboarding.md (US-04, US-07, signup-flow steps 11–13). Downstream consumers: customer onboarding (BRS-H1 submission queueing) and Billing (supplier-of-record gate). External counterpart: Energinet DataHub (test and production) and Energinet ebIX-channel operations. Identified gaps from ADR-001: §6.2 (ownership gap), §6.6 (CPR re-supply problem), §7.4 (ebIX deprecation risk). Epics E-03–E-05 are gated on a written DataHub B2B specification; E-01 and E-02 may proceed in parallel.

---

## Epic Index

| # | Epic | Spec References |
|---|---|---|
| E-01 | DataHub Registration & Certificate Management | ADR-001 §3.6, §7.3; onboarding signup-flow step 11 |
| E-02 | ebIX XML Message Infrastructure | ADR-001 §3.6; onboarding DataHub Integration |
| E-03 | BRS-H1 Supplier Switch — Message Composition | onboarding US-07, DataHub Integration, signup-flow step 11; ADR-001 §6.6 |
| E-04 | BRS-H1 Supplier Switch — Async Response Handling | onboarding US-07, signup-flow steps 12–13, Error States |
| E-05 | Metering Point Validation | onboarding signup-flow step 7, Error States; ADR-001 §4.4 |

---

## E-01 — DataHub Registration & Certificate Management

Regulatory and operations work (no application code) that makes TCPC a registered DataHub supplier with a valid production certificate stored in the secrets store and a documented rotation procedure. Outcome blocks every other epic in this document, customer onboarding signup-flow step 11, and all production billing. Lead time 6–12 weeks from company registration (per ADR-001 §7.3); parallelisable with E-02.

- [ ] **T-0101** Confirm current DKK deposit figure with Energinet (re-validate the 2021 Terms of Access PDF figure of DKK 1,000,000). Owner: Regulatory PM. Lead time 1 week. DoD: written confirmation from Energinet on file.
- [ ] **T-0102** Open Energinet account and submit DataHub supplier registration application. Owner: Regulatory PM. Lead time 1 week to submit; 4–8 weeks to approval. DoD: application submitted with all annexes; tracking number recorded.
- [ ] **T-0103** Pay the DKK cash deposit to Energinet. Owner: Finance. Lead time 1–2 weeks (concurrent with T-0102). DoD: wire confirmed; receipt filed.
- [ ] **T-0104** Apply for DataHub test environment access and request a test certificate. Owner: Regulatory PM (with Engineering on technical fields). Lead time 1–2 weeks after T-0102 submitted. DoD: test access credentials and test certificate (PFX/P12) received.
- [ ] **T-0105** Define the secrets-store layout for DataHub certificates (KMS-encrypted bucket / vault path naming, IAM policy, environment separation test/prod). Owner: Engineering. Lead time 1 day. DoD: vault paths created; IAM policy reviewed by security.
- [ ] **T-0106** Import the test certificate into the secrets store (test environment only). Owner: Engineering. Lead time 0.5 day. DoD: test cert retrievable by the backend test runtime via the secrets-store SDK; not present in source control or CI logs.
- [ ] **T-0107** Complete Energinet acceptance testing in the DataHub test environment (BRS-H1 submission, accept response, reject response — using E-02 + E-03 stubs). Owner: Engineering + Regulatory PM. Lead time 2–4 weeks after T-0106. DoD: Energinet sign-off email confirming acceptance; results filed against the tracking number from T-0102.
- [ ] **T-0108** Apply for the production DataHub certificate. Owner: Regulatory PM. Lead time 1 week after T-0107 sign-off. DoD: production certificate issued.
- [ ] **T-0109** Import the production certificate into the secrets store (production environment) and verify retrieval from production runtime only. Owner: Engineering. Lead time 0.5 day. DoD: cert retrievable in prod runtime; access denied from test runtime; CloudTrail/audit log entry confirmed.
- [ ] **T-0110** Submit TCPC supplier master data to DataHub (GLN/EIC, name, contact). Owner: Engineering + Regulatory PM. Lead time 0.5 day. DoD: supplier record live in DataHub production.
- [ ] **T-0111** Document the certificate rotation procedure (annual cadence, dry-run steps, rollback, downtime window, who is on the call). Owner: Engineering. Lead time 1 day. DoD: runbook in `docs/runbooks/datahub-cert-rotation.md`; reviewed by on-call and ops; rehearsal scheduled within first 90 days post-launch.
- [ ] **T-0112** Schedule the first dry-run rotation in the test environment. Owner: Engineering. Lead time 0.5 day. DoD: calendar invite for a date no later than 6 months before production cert expiry.

---

## E-02 — ebIX XML Message Infrastructure

A reusable, certificate-authenticated, audited transport layer capable of submitting any ebIX XML message to DataHub and receiving any inbound ebIX message, independent of BRS-H1 specifics. Outcome blocks E-03, E-04, E-05. Pre-req: T-0106 (test cert imported) for the first end-to-end smoke test; T-0201–T-0204 do not need a real cert.

- [ ] **T-0201** Select an ebIX-capable XML library (parser + serialiser + XSD validation) for the backend stack and document the choice in an ADR. Estimate 2 days. DoD: ADR `docs/decisions/ADR-002-ebix-xml-library.md` accepted; library added to the backend dependency manifest with a pinned version.
- [ ] **T-0202** Implement an XSD-validating XML parser/serialiser wrapper with explicit namespace handling for ebIX. Estimate 2 days. DoD: round-trip parse/serialise unit tests pass on at least three example BRS-H1 messages from Energinet's published samples.
- [ ] **T-0203** Implement XML digital signing (XMLDsig per Energinet's signing profile) using a certificate fetched from the secrets store at runtime. Estimate 3 days. DoD: a signed message validates with `xmlsec1` against the signing cert; the cert is loaded only via the secrets-store SDK, never from disk paths or env vars.
- [ ] **T-0204** Implement signature verification for inbound messages against Energinet's published signing certificate. Estimate 2 days. DoD: verifier rejects tampered messages in unit tests; accepts known-good Energinet samples.
- [ ] **T-0205** Implement the certificate-authenticated HTTPS client targeting the DataHub B2B endpoint (mTLS, the test cert from E-01). Estimate 2 days. DoD: smoke test — client opens an mTLS connection to the DataHub test endpoint and a non-XML probe returns the expected protocol-level response code.
- [ ] **T-0206** Implement the outbound submission service: accept a serialised+signed ebIX envelope, POST to DataHub, capture and persist response headers, body, and TCPC-assigned correlation ID. Estimate 3 days. DoD: a test submission round-trips end to end against DataHub test environment, with the request, response, and correlation ID written to the audit log table (per T-0207).
- [ ] **T-0207** Define and implement the audit log schema for every outbound and inbound DataHub message: `correlation_id`, `direction`, `business_process` (e.g. `BRS-H1`), `customer_id` (nullable for non-customer messages), `xml_payload` (encrypted at rest), `status`, `submitted_at`, `responded_at`, `actor`. Estimate 2 days. DoD: migration applied; every call from T-0206 produces exactly one outbound row; encryption confirmed by inspecting raw storage. Retention: 7 years (matches the onboarding spec's audit retention NFR).
- [ ] **T-0208** Implement retry with exponential backoff for transient transport errors (network, 5xx). Schedule per onboarding spec: 1m, 5m, 30m, 2h, 12h, then dead-letter at 24h. Estimate 2 days. DoD: retries are scheduled by a queue worker, idempotent, and visible in the audit log as separate attempts sharing one `correlation_id`.
- [ ] **T-0209** Implement a dead-letter queue for messages that exhaust retries. DLQ entries are visible in the admin portal (read-only in v1) and trigger an ops alert. Estimate 2 days. DoD: a forced-failure integration test lands in the DLQ; the alert (PagerDuty / Slack / email per ops convention) fires once per DLQ entry, not per retry.
- [ ] **T-0210** Implement a structured-logging wrapper that redacts CPR, certificate material, and any PII before logs leave the application process. Estimate 1 day. DoD: unit tests assert that representative payloads with CPR are emitted as `[REDACTED]` to the log sink; an end-to-end test confirms no CPR appears in the log aggregator.
- [ ] **T-0211** Implement an inbound message ingestion endpoint or poller (decision deferred to spec — see cross-cutting Q3); a stub interface is sufficient for v1 of this epic. Estimate 2 days. DoD: a handler accepts a verified inbound XML message, writes the audit log row (`direction = INBOUND`), and dispatches by `business_process` to a registered handler. Default handler logs and acknowledges.

---

## E-03 — BRS-H1 Supplier Switch — Message Composition

> **Gated.** Requires a written DataHub B2B specification covering BRS-H1 message structure and resolving cross-cutting Q2 (CPR handling). E-02 tasks T-0201–T-0207 must be complete. Owns the resolution of ADR-001 §6.6 (CPR re-supply problem) within the chosen approach.

From a `customer_id` and the data captured in onboarding, compose a valid, signed BRS-H1 ebIX XML supplier-switch request and hand it to the E-02 transport.

- [ ] **T-0301** Define the BRS-H1 input contract: a typed object containing `customer_id`, supplier GLN/EIC, metering point ID (18 digits), CPR or DataHub-recognised reference, customer name, supply address, requested effective date. Estimate 1 day. DoD: TypeScript/Go/etc. type and validation rules merged; aligns 1:1 with the fields enumerated in customer-onboarding.md DataHub Integration section.
- [ ] **T-0302** Implement the next-valid-switch-date calculator (typically 6 working days from submission per onboarding spec US-07; respect Danish public holiday calendar). Estimate 2 days. DoD: unit tests cover normal weekdays, weekends, and a public-holiday boundary; calendar source is documented and updateable without a code change.
- [ ] **T-0303** Implement the BRS-H1 ebIX XML composer (input contract → ebIX envelope) using the E-02 XML library. Estimate 3 days. DoD: composer output validates against Energinet's BRS-H1 XSD locally (T-0305) for a representative happy-path input.
- [ ] **T-0304** CPR handling pipeline — implement the option chosen by the spec (default: short-lived encrypted CPR store with a TTL bounded to the BRS-H1 submission window). Includes: write at signup, read at submission, hard-delete on success / on TTL expiry / on rejection. Estimate 3 days. DoD: encrypted store uses a KMS-managed key distinct from general application data; no CPR appears in any log; DPO sign-off recorded; TTL-expiry sweeper runs and is observable.
- [ ] **T-0305** Vendor in (or fetch at build time from Energinet) the BRS-H1 XSD and wire it to T-0202's validator. Composition fails closed if XSD validation fails. Estimate 1 day. DoD: a malformed input causes `compose()` to throw a typed validation error before any network call; the error is logged with the failing field path.
- [ ] **T-0306** Implement the message-correlation-ID generator (UUID v4 or Energinet-required format; spec-driven). Estimate 0.5 day. DoD: generator is collision-safe and deterministic in tests; correlation ID is the join key between E-03 (composition) and E-04 (response handling).
- [ ] **T-0307** Wire composer + signer (T-0203) + transport (T-0206) into a single `submitSupplierSwitch(customer_id)` backend operation, idempotent on `customer_id` (re-submission for the same customer returns the existing correlation ID rather than creating a duplicate). Estimate 2 days. DoD: calling twice for the same customer in the same `PENDING_DATAHUB` state yields one DataHub submission, one audit row, one correlation ID.
- [ ] **T-0308** Integrate `submitSupplierSwitch` with the onboarding queue (signup-flow step 11) so customer confirmation is not blocked on DataHub. Estimate 1 day. DoD: after the confirmation screen renders (US-07), a queued job runs `submitSupplierSwitch` within 60 seconds; failure of the queue job does not affect the confirmation screen.
- [ ] **T-0309** End-to-end test against the DataHub test environment using a synthetic test customer. Estimate 2 days. DoD: a test customer with a valid test metering point produces a successful submission; correlation ID, audit row, and DataHub-acknowledged receipt all recorded.

---

## E-04 — BRS-H1 Supplier Switch — Async Response Handling

> **Gated.** Requires E-02 task T-0211 (inbound dispatcher), E-03 task T-0306 (correlation ID), and the DataHub B2B spec resolving cross-cutting Q3 (push vs pull).

Receive accept / reject responses from DataHub for a previously submitted BRS-H1 message, update the customer record, and escalate failures.

- [ ] **T-0401** Implement the BRS-H1 response parser (accept message → typed object; reject message → typed object with reason code + reason text). Estimate 2 days. DoD: parser handles all reject reason codes documented by Energinet for BRS-H1; unknown reason codes are preserved verbatim and logged at WARN.
- [ ] **T-0402** Implement the correlation-ID lookup: given an inbound BRS-H1 response, find the originating customer record via the audit-log correlation ID. Estimate 1 day. DoD: lookup returns the customer row in O(1); a response whose correlation ID does not match any open submission lands on a manual-review queue.
- [ ] **T-0403** On accept: transition customer from `PENDING_DATAHUB` → `SCHEDULED` and store the confirmed effective date returned by DataHub. Trigger the second confirmation email defined in onboarding signup-flow step 12. Estimate 2 days. DoD: customer lifecycle event written; the confirmation email contains the DataHub-confirmed effective date, not the originally calculated one. CPR (if held under T-0304 short-lived store) is hard-deleted at this point.
- [ ] **T-0404** On reject: transition customer to `DATAHUB_REJECTED`, hold account in `PENDING` for ops review, send the customer-facing email defined in onboarding Error States ("Vi kunne ikke overtage din strømmåler. Vi ringer til dig inden for 1 hverdag."), and open a support ticket with the reject reason code attached. Estimate 2 days. DoD: customer record reflects rejection; ticket created in the support system with the audit-log correlation ID linked; payment authorisation is **not** revoked (per onboarding Error States).
- [ ] **T-0405** Implement the 48-hour-no-response timeout watcher. If DataHub has not responded within 48 hours of submission, transition to `DATAHUB_TIMEOUT`, alert ops, and apply the same `datahub_unavailable` ops-ticket category as the 24-hour transport-retry exhaustion case. Estimate 2 days. DoD: watcher runs at most once per submission; alert is idempotent; an integration test simulates the timeout and verifies the lifecycle transition and ticket creation.
- [ ] **T-0406** Customer-state-machine reference: `PENDING_PAYMENT` → `PENDING_DATAHUB` → (`SCHEDULED` \| `DATAHUB_REJECTED` \| `DATAHUB_TIMEOUT`). Make this enum and its allowed transitions a single source of truth used by E-03, E-04, and the onboarding component. Estimate 1 day. DoD: enum defined in shared types; illegal transitions throw at runtime; states match those referenced in onboarding Error States and signup-flow step 13.
- [ ] **T-0407** Admin-portal read-only view of any customer's BRS-H1 submissions, responses, audit-log entries, and current state. (Write actions deferred — manual ops actions like `datahub_unavailable` retry remain a v1.1 scope item.) Estimate 2 days. DoD: an admin user with `read_only` role can open a customer page and see the full DataHub message timeline.
- [ ] **T-0408** End-to-end test of accept and reject flows against the DataHub test environment. Estimate 2 days. DoD: one synthetic customer flows through accept; a second flows through reject; both produce the correct emails, lifecycle events, and audit entries.

---

## E-05 — Metering Point Validation

> **Gated.** Requires the DataHub B2B spec to confirm which DataHub call (likely an ebIX request-for-master-data business process) returns metering-point details to a registered supplier (cross-cutting Q1). ADR-001 §4.4 records that direct DataHub-supplier metering-data access is "deferred to v2 investigation" for the *consumption* use case (Eloverblik covers v1 there). Master-data lookup of a single metering point for *validation* before submission is a different, narrower call and is in scope for this epic. The spec must confirm this narrower call is available to a registered supplier in v1; if not, this epic is downgraded to "validate format only and rely on BRS-H1 reject" — see fallback in T-0506.

Before a BRS-H1 is queued for submission, validate that the customer-supplied 18-digit metering point ID exists in DataHub and is associated with the customer's supply address, so invalid metering points are rejected during onboarding rather than after a BRS-H1 reject round-trip.

- [ ] **T-0501** Confirm with Energinet (via the regulatory PM) which DataHub call returns metering-point master data (address, GSRN, current supplier, status) to a registered supplier in v1, and document the answer in the DataHub B2B spec. Owner: Regulatory PM. Lead time 1 week. DoD: answer recorded in the spec; sample request/response on file.
- [ ] **T-0502** Implement the metering-point lookup composer + parser (ebIX or REST per T-0501's answer) reusing E-02 transport. Estimate 2 days. DoD: lookup of a known test metering point returns address fields and the current supplier ID.
- [ ] **T-0503** Implement the validation rule: the DataHub-returned address must match the customer-entered supply address (street, house number, postcode) within an agreed normalisation tolerance (case, whitespace, Danish letter folding). Estimate 2 days. DoD: mismatch produces a typed validation error with the specific field that disagrees; the customer sees an inline error during signup, not a post-confirmation rejection.
- [ ] **T-0504** Wire validation into the onboarding flow at signup-flow step 7 (Address & metering point), before the customer reaches step 8 (Billing frequency). Estimate 1 day. DoD: a customer who enters a non-existent or address-mismatched metering point cannot proceed past step 7; copy reuses (or extends) onboarding Error States entries for metering-point validation.
- [ ] **T-0505** Add error-state copy to the onboarding spec's Error States table for: "metering point not found", "metering point address does not match supply address", "metering point already held by TCPC". Owner: Product copywriting. Estimate 0.5 day. DoD: strings drafted and reviewed by Product; merged into customer-onboarding.md by the spec owner (cross-spec change tracked in the DataHub B2B spec change log).
- [ ] **T-0506** Fallback path if T-0501 reveals no v1 supplier-side master-data call exists: implement format-only validation (18 numeric digits + Luhn-style checksum if defined by Energinet), and document that address validation happens via BRS-H1 reject only. Estimate 1 day. DoD: either T-0502–T-0505 are delivered, or T-0506 is delivered with a tracked v1.1 ticket to revisit once the call is available.
- [ ] **T-0507** End-to-end test against the DataHub test environment: a valid metering point passes; a malformed one is rejected at step 7; a real-but-mismatched-address one is rejected at step 7. Estimate 1 day. DoD: all three cases produce the correct user-facing outcome and the correct audit entries.

---

## Sequencing Summary

```
E-01 (regulatory) ───────────────────────────────────────────────► production launch gate
       │
       └─► T-0106 (test cert) ─┐
                                │
E-02 (ebIX infra)  ─────────────┴─► T-0206 (transport smoke test)
       │
       ├─► E-03 (BRS-H1 composition)  ──┐
       │                                 ├─► T-0107 (Energinet acceptance testing)
       ├─► E-04 (async responses)  ──────┤
       │                                 │
       └─► E-05 (metering-point validation, narrower)
                                         │
                                         └─► T-0108 (production cert) ─► v1 launch
```

---

## Out of Scope for v1 (this component)

- BRS-H3 wholesale settlement (ADR-001 §3.6 confirms out of scope).
- Direct DataHub-mediated *consumption* meter data (Eloverblik covers this in v1; ADR-001 §4.4).
- BRS-H1 customer-initiated cancellation / withdraw (covered by the Contract & Cancellation spec — does not exist yet).
- ebIX → Green Energy Hub migration (ADR-001 §7.4 — separate v2 epic, opens when Energinet publishes a cutover date).
- Admin-portal write actions on DataHub messages (manual retry, manual withdraw); v1 is read-only.
- Bulk operations (multi-customer batched switching) — v1 is one customer per submission.

---

## Task Summary

| Epic | Tasks | Notes |
|---|---|---|
| E-01 DataHub Registration & Certificate Management | 12 | Regulatory / ops; prerequisite for all other epics; T-0106 unblocks E-02 smoke test, T-0108 gates v1 launch. |
| E-02 ebIX XML Message Infrastructure | 11 | Reusable transport; prerequisite for E-03, E-04, E-05; can run in parallel with E-01. |
| E-03 BRS-H1 Supplier Switch — Message Composition | 9 | Gated on DataHub B2B spec and cross-cutting Q2 (CPR handling); requires T-0201–T-0207. |
| E-04 BRS-H1 Supplier Switch — Async Response Handling | 8 | Gated on DataHub B2B spec and cross-cutting Q3 (push vs pull); requires T-0211 and T-0306. |
| E-05 Metering Point Validation | 7 | Gated on DataHub B2B spec resolving cross-cutting Q1; T-0506 is the fallback path if no v1 supplier-side master-data call exists. |
| **Total** | **47** | |

---

## Open Questions

### Cross-cutting questions for the spec author

These must be answered in the DataHub B2B spec before E-03–E-05 start. They are surfaced here so the spec author has a checklist; they are **not** to be resolved in this epic document.

1. Which BRS-H1 ebIX schema version (and which Energinet release wave) does v1 target? Owner: Regulatory PM + Engineering. Default: latest production-active version on the DataHub test environment at the time the test certificate is issued.
2. CPR handling through the submission pipeline (ADR-001 §6.6). Three options on the table: (a) short-lived encrypted store through BRS-H1 submission, (b) re-prompt customer at submission time, (c) DataHub-recognised alternative identifier. Owner: DPO + Regulatory PM. Default: option (a) with maximum 72-hour TTL.
3. What is the inbound channel for DataHub asynchronous responses — pull (poll) or push (callback to a TCPC-hosted endpoint)? Owner: Engineering, after Energinet onboarding handoff.
4. ebIX → Green Energy Hub migration timeline (ADR-001 §7.4). Owner: Regulatory PM. Default: v1 builds on ebIX; a v2 migration epic is opened once Energinet publishes a cutover date.
5. Does v1 support BRS-H1 withdraw / cancellation messages, or only initial submission and accept/reject? Owner: Product. Default: v1 covers initial submission + accept/reject + manual ops-driven withdraw.

### Questions specific to this epic breakdown

These differ from the cross-cutting questions above in that they are about how this epic *plan* is executed, not what the spec says.

1. **Owning team for T-0107 (Energinet acceptance testing).** Is this a Regulatory PM-led activity with engineering support, or engineering-led with Regulatory PM oversight? Owner: Engineering Manager + Regulatory PM. Default: Regulatory PM owns the relationship and timeline, Engineering owns the technical execution; both are jointly accountable for sign-off.
2. **Whether E-05 (metering-point validation) ships in v1 at all** if cross-cutting Q1 (master-data call availability) returns "not available to v1 suppliers". Owner: Product. Default: yes, ship the format-only fallback (T-0506); the address-match validation lands in v1.1.
3. **Whether the short-lived encrypted CPR store (T-0304) needs DPIA before code starts** or can run concurrently with implementation under DPO advisement. Owner: DPO. Default: DPIA runs concurrently; production deploy is gated on DPIA sign-off.

---

## Resolved Decisions (from ADR-001 and the onboarding spec)

| Question | Decision | Source |
|---|---|---|
| Channel for BRS-H1? | ebIX XML over certificate-authenticated DataHub B2B. | ADR-001 §3.6 |
| Is BRS-H1 submission synchronous with the signup screen? | No. Asynchronous, queued. | customer-onboarding.md, US-07 / signup-flow step 11 |
| Where do certificates live? | Secrets store. Never in source control. | ADR-001 §3.6 |
| Retry cadence for transport failures? | 1m, 5m, 30m, 2h, 12h up to 24h, then escalate. | customer-onboarding.md, DataHub Integration |
| Audit log retention? | 7 years (Danish bookkeeping rules). | customer-onboarding.md, NFRs |
| Are raw CPR values logged anywhere? | No, ever. | customer-onboarding.md, NFRs |
| Is BRS-H3 wholesale settlement in scope for v1? | No. | ADR-001 §3.6 |
