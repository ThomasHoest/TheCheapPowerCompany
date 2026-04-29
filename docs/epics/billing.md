# Epics & Tasks: Billing Component
**Version:** 1.0
**Status:** Draft
**Date:** 2026-04-29
**References:** docs/specifications/ADR-001-system-architecture.md (3.3, 6.8, 7.2, 7.4), docs/specifications/customer-onboarding.md (US-05, US-06, US-10, Payment Setup), docs/research/mobilepay-research.md

> **Notice:** A Billing specification does not yet exist. This epic breakdown is derived from ADR-001, the customer-onboarding spec, and the MobilePay research. A Billing spec must be written before implementation of epics E-02 through E-05 begins.

---

## Overview

This component delivers end-to-end billing for The Cheap Power Company: a restart-safe scheduler that drives every billing event, deterministic usage-based charge calculation, MobilePay and Betalingsservice charge collection, webhook reconciliation, dunning, refunds, and customer-facing statements. Critical path runs E-01 (scheduler) → E-02 (calculation) → E-03 (MobilePay) and E-06 (Betalingsservice) in parallel → E-04 (webhooks) → E-05 (dunning), E-07 (refunds), and E-08 (statements). All external API calls (MobilePay, Nets) are made server-side only; client devices never see merchant credentials. Amounts are always represented internally in øre (integer); rounding rules must be defined before any monetary computation lands. Every monetary state transition must be written to an append-only audit log retained for 7 years (Danish bookkeeping rules per onboarding spec NFRs). Idempotency is mandatory on every operation that creates an external charge, refund, or mandate collection. Billing operates against both MobilePay and Betalingsservice from v1; the Betalingsservice path is a v1 deliverable, not v2 (per ADR-001 §6.5).

---

## Epic Index

| # | Epic | Spec References |
|---|---|---|
| E-01 | Billing Scheduler Infrastructure | ADR-001 §3.3, §7.2 |
| E-02 | Usage-Based Charge Calculation | ADR-001 §3.4, §7.4; onboarding US-06 |
| E-03 | MobilePay Charge Creation | ADR-001 §6.4; mobilepay-research (Charge creation) |
| E-04 | Webhook Reconciliation | onboarding §Payment Setup; mobilepay-research (Webhooks) |
| E-05 | Dunning Workflow | ADR-001 §6.8; mobilepay-research (Dunning) |
| E-06 | Betalingsservice Billing Path | ADR-001 §6.5; onboarding US-10 |
| E-07 | Refunds and Adjustments | mobilepay-research (Refunds) |
| E-08 | Billing Statement | ADR-001 §3.4; onboarding US-05 |

---

## E-01 — Billing Scheduler Infrastructure

A reliable, observable, restart-safe job scheduler that is the production engine driving every billing event. No dependencies — foundation epic, can begin immediately, does not require the Billing spec to exist (infrastructure choice and persistence model are independent of business rules). Acceptance: a 24-hour soak test creates 10,000 scheduled jobs, kills the scheduler process at randomised intervals, and at the end every job has been executed exactly once with the correct side effect.

- [ ] **T-0101** Evaluate and select job scheduler library (1 day) — Compare pg-boss, BullMQ, and one alternative against criteria: Postgres-backed persistence, exactly-once or at-least-once semantics, dead-letter queue, scheduled jobs, retry policy, observability hooks. Produce a written decision record.
- [ ] **T-0102** Provision job persistence layer (1 day) — Database schema (or Redis topology) for the chosen scheduler. Migrations in source control. Tested to survive a process kill mid-job.
- [ ] **T-0103** Implement scheduler bootstrap and graceful shutdown (1 day) — Backend service starts the scheduler on boot, drains in-flight jobs on SIGTERM, never loses a queued job across restarts. Verified with a kill-during-job integration test.
- [ ] **T-0104** Define job type registry and dispatch layer (1 day) — Typed job definitions (`charge.create`, `charge.reconcile`, `dunning.advance`, etc.) with a single registration point. Unknown job types route to the dead-letter queue.
- [ ] **T-0105** Implement idempotency-key infrastructure (2 days) — Every job carries an idempotency key (e.g., `customer_id:billing_period_start:job_type`). Handlers check a `processed_jobs` table before performing side effects. Unit-tested with concurrent duplicate dispatches.
- [ ] **T-0106** Dead-letter queue and replay tooling (2 days) — Failed jobs after max retries land in a DLQ table. Admin CLI to inspect, requeue, or discard DLQ entries. Manual replay produces correct idempotent behaviour (no double charge).
- [ ] **T-0107** Missed-job detection and alerting (2 days) — Heartbeat job that runs every 5 minutes; if no heartbeat within 15 minutes, page on-call. Separately, expected-job manifest: every customer billing period should have a `charge.create` job within X hours of period start; absence triggers an alert.
- [ ] **T-0108** Scheduler observability dashboard (1 day) — Metrics emitted: jobs in flight, jobs queued, jobs failed (last hour), DLQ size, oldest queued job age. Surface in the existing observability stack (Grafana/Datadog — confirm with platform team).
- [ ] **T-0109** Runbook for scheduler outage recovery (1 day) — Written runbook covering: scheduler process crashed, DB unreachable, queue backlog growing, DLQ flooded. Reviewed and signed off by on-call.

---

## E-02 — Usage-Based Charge Calculation

A deterministic, auditable function that, given a customer and a billing period, computes the exact øre amount to charge. Output is the single source of truth driving MobilePay and Betalingsservice charge creation. Billing spec must define rounding rules, markup formula, subscription fee policy, and tax treatment before this epic can complete (T-0203 through T-0207 are blocked on the spec). Acceptance: twenty representative customer scenarios (low/medium/high consumption, summer/winter, DK1/DK2, monthly/weekly cadence) produce calculations matching hand-verified expected values to the øre.

- [ ] **T-0201** Billing period boundary calculator (2 days) — Pure function: given customer signup date, billing frequency (`MONTHLY` or `WEEKLY` per onboarding US-06), and a reference date, returns the current and previous closed billing period as `[start, end)` in `Europe/Copenhagen`. Handles month-length variation, DST transitions, and leap days. Unit tests cover edge cases (Feb 29, DST spring-forward, end-of-month signup on 31st).
- [ ] **T-0202** Eloverblik consumption pull for a period (2 days) — Backend job calls `POST /api/meterdata/gettimeseries` for the customer's metering point over the closed billing period. Hourly granularity. Stored idempotently (re-running the pull does not double-write). Handles partial-period gaps with a defined error path (raise to ops, do not silently bill on incomplete data).
- [ ] **T-0203** Per-hour cost calculator (2 days) — *Blocked on Billing spec.* For each hour: `cost = consumption_kWh × (spot_price_DKK_per_kWh + markup_DKK_per_kWh)`. Spot price comes from the local Energi Data Service store (per ADR-001 §3.4). Output kept in fractional øre internally; rounded only at period total.
- [ ] **T-0204** Subscription fee addition (1 day) — *Blocked on Billing spec.* Apply the per-period subscription fee (monthly or pro-rated weekly) to the period total. Configurable per-customer or global, per spec decision.
- [ ] **T-0205** Tax and levy line items (2 days) — *Blocked on Billing spec.* Add elafgift (~1 øre/kWh post-2026 per ADR-001), VAT (25%), and any DSO network tariff lines. Each line is itemised on the statement (E-08). Spec must declare whether tariffs are per-DSO-area (likely yes) and the data source.
- [ ] **T-0206** Rounding rules implementation (1 day) — *Blocked on Billing spec.* Round the final total to whole øre using the spec-defined rule (banker's rounding vs half-up). Property-tested: `sum(rounded line items) == rounded(sum(unrounded line items))` within 1 øre, with the residual booked to a defined adjustment line.
- [ ] **T-0207** Charge calculation orchestrator (2 days) — Composes period boundary → consumption pull → per-hour cost → subscription fee → taxes → rounded total. Returns a `BillingCalculation` record (input snapshot + every intermediate value) that the statement (E-08) and the charge creator (E-03) both consume. Snapshot is immutable once written.
- [ ] **T-0208** Replay-safety test harness (1 day) — Given the same input snapshot, the calculator produces a byte-identical result. Critical for audit and dispute handling.
- [ ] **T-0209** Calculation discrepancy alerting (1 day) — If a period's calculated amount is more than 3× the customer's trailing 6-period average, flag for human review before charging. Threshold configurable per spec.

---

## E-03 — MobilePay Charge Creation

Reliably create exactly one MobilePay charge per customer per billing period, with retry semantics that survive transient failures and never produce a duplicate charge. Depends on E-01 (scheduler) and E-02 (calculation); Billing spec must resolve `suggestMaxAmount` (per ADR-001 §6.4). Acceptance: a simulated month produces exactly one MobilePay charge per customer per period; a forced double-dispatch produces zero duplicate charges in MobilePay's API; an injected 5xx response retries and ultimately succeeds without creating a duplicate.

- [ ] **T-0301** Charge persistence schema (1 day) — `charges` table with `customer_id`, `billing_period_start`, `billing_period_end`, `agreement_id`, `order_id` (unique on customer + period), `amount_ore`, `currency`, `status`, `mobilepay_charge_id`, `due_date`, `retry_days`, timestamps, and a JSON snapshot of the calculation that produced it.
- [ ] **T-0302** Order ID derivation function (1 day) — Deterministic `orderId` from `customer_id` and billing period start (≤64 chars per MobilePay constraints). Two scheduler runs for the same period produce the same `orderId`; MobilePay's own idempotency rejects the duplicate.
- [ ] **T-0303** Charge-creation API client (2 days) — Server-side wrapper for `POST /recurring/v3/agreements/{agreementId}/charges`. Sends `amount`, `currency=DKK`, `description` (e.g., `"El-forbrug {month/week} {YYYY}"`), `due` (≥1 day in the future), `retryDays: 7`, `orderId`. Handles 4xx vs 5xx distinction; 5xx routes to scheduler retry, 4xx routes to DLQ with structured error.
- [ ] **T-0304** `suggestMaxAmount` warning monitor (2 days) — At calculation time, compare the computed amount to the customer's `maxAmount` (read from `GET /recurring/v3/agreements/{id}`). If amount > 80% of maxAmount, write a `maxAmount.approaching_ceiling` event and notify the customer (push) so they can raise the ceiling before the charge is due. Threshold configurable.
- [ ] **T-0305** Charge job orchestrator (2 days) — Scheduler job that, for each customer reaching a billing period boundary, runs E-02 calculation, then creates the charge, then writes the local `charges` row in `PENDING` status. Single transaction boundary defined by the spec; idempotent under double-dispatch.
- [ ] **T-0306** Charge status persistence on webhook (1 day) — `charges` row transitions: `PENDING` → `RESERVED` → `CAPTURED` (success) or `FAILED` (terminal after retries). Status updates only via webhook ingestion (E-04); no client-side or admin-initiated status changes in v1.
- [ ] **T-0307** Charge cancellation flow (1 day) — Pre-capture cancellation via `DELETE /recurring/v3/agreements/{agreementId}/charges/{chargeId}`. Used only by support tooling; not customer-facing in v1. Audited.
- [ ] **T-0308** Pre-charge dry-run mode (1 day) — Operations flag that calculates and persists charges without calling MobilePay. Used during the first production billing cycle for verification; written into the launch runbook.
- [ ] **T-0309** First-charge launch runbook (1 day) — Written procedure for the very first production charge: dry-run → finance verification → enable real charges for canary cohort → monitor → broad rollout. Reviewed by finance and on-call.

---

## E-04 — Webhook Reconciliation

Authoritative ingestion of MobilePay charge and agreement webhooks, with cross-checking that every expected webhook actually arrived. The webhook stream is the canonical source of truth for payment status. Depends on E-03 (charges exist to receive webhooks for); webhook-registration capability already exists in the onboarding spec (§Payment Setup) but may need extension for charge events. Acceptance: synthetic test creates 100 charges, delivers webhooks for 95 of them, reconciliation job correctly resolves the remaining 5 via polling within 24 hours; no charge ever has a `CAPTURED` status without a corresponding `payments` ledger entry.

- [ ] **T-0401** Webhook ingestion endpoint (2 days) — `POST /webhooks/mobilepay` endpoint, signature verified per Vipps MobilePay's webhook signing scheme. Returns 2xx within 5 seconds even if downstream processing is queued. Replays of identical events are no-ops.
- [ ] **T-0402** Webhook event persistence (1 day) — `webhook_events` table: raw payload, signature header, received_at, processed_at, derived `idempotency_key`. Append-only.
- [ ] **T-0403** `recurring.charge-captured.v1` handler (1 day) — Mark the matching `charges` row `CAPTURED`, write a `payments` ledger entry (amount, captured_at, charge_id), close the billing period. Idempotent.
- [ ] **T-0404** `recurring.charge-failed.v1` handler (1 day) — Mark the matching `charges` row `FAILED`, emit a `dunning.start` event (E-05), notify customer via push. Idempotent.
- [ ] **T-0405** `recurring.charge-creation-failed.v1` handler (1 day) — Charge was rejected during async validation by MobilePay. Mark `charges` row as `REJECTED`, page on-call, do not auto-retry (this indicates a data problem, not a transient failure).
- [ ] **T-0406** `recurring.charge-reserved.v1` handler (0.5 days) — Informational state transition; update `charges` row, no further action.
- [ ] **T-0407** `recurring.agreement-stopped.v1` handler (1 day) — Customer cancelled the MobilePay agreement. Mark agreement `STOPPED` on the customer record, suspend the account (no future charges scheduled), trigger customer outreach (E-05 also handles re-activation).
- [ ] **T-0408** `recurring.agreement-expired.v1` handler (0.5 days) — Same handling as `agreement-stopped` but with a different ops category for follow-up.
- [ ] **T-0409** Reconciliation job — expected vs received (3 days) — Daily job: for every `charges` row created more than 24 hours ago that has not received a `charge-captured`, `charge-failed`, or `charge-creation-failed` webhook, fetch `GET /recurring/v3/agreements/{id}/charges/{id}` and either reconcile or alert. Closes the gap when a webhook is silently dropped.
- [ ] **T-0410** Reconciliation alerting (1 day) — If reconciliation must call the polling fallback for >1% of charges in a day, alert. Sustained polling is a webhook-pipeline incident.
- [ ] **T-0411** Webhook replay tool (1 day) — Admin CLI to re-deliver a stored webhook event into the handler chain. Used during incident recovery.

---

## E-05 — Dunning Workflow

A defined state machine that turns a failed charge into either a recovered payment or a clean account suspension, with customer-facing communication at every step. Depends on E-04 (failed-charge events trigger dunning); Billing spec must define the grace-period length, escalation cadence, and final cancellation policy. Acceptance: end-to-end test where a customer enters dunning, MobilePay retries fail across 7 days, grace period elapses, suspension fires; the customer then updates payment, recovers, and is restored to healthy state with no double-charge and full audit trail intact.

- [ ] **T-0501** Dunning state machine definition (1 day) — *Blocked on Billing spec.* Document states (`HEALTHY` → `RETRY_PENDING` → `GRACE_PERIOD` → `SUSPENDED` → `CANCELLED`) and exact transitions, including the MobilePay built-in `retryDays: 7` daily retry and the post-exhaustion 7-day grace period.
- [ ] **T-0502** Dunning state persistence (1 day) — `dunning_states` table per customer with current state, entered_at, last_event, scheduled_next_action_at.
- [ ] **T-0503** MobilePay retry handling (1 day) — While `charges` row is in `FAILED_RETRYING` (within `retryDays`), no TCPC-side retries; MobilePay handles the daily retry. Webhook `recurring.charge-captured.v1` exits dunning. Final `recurring.charge-failed.v1` after `retryDays` advances state.
- [ ] **T-0504** Initial customer push notification (1 day) — On first `charge-failed` webhook (before retries exhausted), send push: "Vi kunne ikke hæve din betaling. MobilePay prøver igen i morgen." Localised Danish copy must be approved by product before shipping.
- [ ] **T-0505** Retry-exhaustion notification (1 day) — On terminal `charge-failed`, send email + push: clear explanation, one-tap link to update payment method or raise `maxAmount`. Copy approved by product.
- [ ] **T-0506** Grace period scheduler (1 day) — On terminal failure, schedule a `dunning.advance` job for `now + 7 days`. If the customer pays (out-of-band MobilePay manual payment, or a successful new charge in a later period) the job is cancelled and state returns to `HEALTHY`.
- [ ] **T-0507** Account suspension job (2 days) — On grace expiry, transition customer to `SUSPENDED`: no new charges scheduled, app shows a suspension banner with payment-update CTA, supply continues per regulatory rules until cancellation is finalised.
- [ ] **T-0508** Cancellation escalation (2 days) — *Blocked on Billing spec for cancellation timing and customer-protection rules.* Suspended account that does not recover within the spec-defined window triggers a contract cancellation (handoff to the Contract & Cancellation spec, which is itself missing per ADR-001 §6.8). At minimum, this epic produces the trigger event and the handoff contract.
- [ ] **T-0509** Customer re-activation flow (2 days) — Customer in `SUSPENDED` updates their payment method (new MobilePay agreement or Betalingsservice mandate). On a successful agreement-accepted webhook, the prior failed charge is re-attempted; on success, state returns to `HEALTHY`. Audit trail records the recovery.
- [ ] **T-0510** Dunning observability (1 day) — Metrics: customers in each dunning state, time-in-state distribution, recovery rate per stage. Surfaced on the admin portal billing dashboard.
- [ ] **T-0511** Dunning runbook (1 day) — Operations playbook for: customer phones support during dunning, payment-method update fails, mass dunning event (e.g., MobilePay outage triggered widespread retries).

---

## E-06 — Betalingsservice Billing Path

Equivalent end-to-end charge collection for customers on the Betalingsservice fallback channel, fronted by a unified payment status model so downstream code (statements, dunning, admin portal) does not branch on payment channel. Depends on E-01 (scheduler) and E-02 (calculation); onboarding spec already creates the Betalingsservice mandate (US-10), this epic owns charging against it; Billing spec must describe whether Betalingsservice has its own dunning policy or shares E-05's state machine. Acceptance: a test customer on Betalingsservice goes through three billing cycles (one successful, one rejected for insufficient funds, one successful after recovery); statements, payment status, and dunning behaviour match the equivalent MobilePay test scenarios.

- [ ] **T-0601** Nets Mandate API client research and decision (1 day) — Confirm exact endpoint(s) for charge collection (Creditor API vs Mandate API per the research file). Document the charge-submission contract (file-based PBS submission vs REST). Resolve before further tasks.
- [ ] **T-0602** Betalingsservice charge persistence (1 day) — Either a unified `charges` table with a `channel` discriminator, or a parallel `bs_charges` table with a shared `payment_events` superclass. Decision recorded; schema migrations land.
- [ ] **T-0603** Betalingsservice charge submission job (3 days) — Scheduler job that, for each customer reaching a billing period boundary, runs E-02 calculation and submits the collection to Nets per the chosen mechanism. Idempotent against re-runs.
- [ ] **T-0604** Submission cut-off scheduling (1 day) — Betalingsservice has fixed monthly cut-off dates set by Nets; charges submitted after the cut-off settle in the next cycle. Scheduler respects these cut-offs and refuses late submissions with a clear error.
- [ ] **T-0605** Settlement callback / file ingestion (3 days) — Receive Nets settlement results (likely via SFTP file drop or callback per Nets contract). Parse into `payment_events`. Match each result back to the originating charge.
- [ ] **T-0606** Unified payment status model (2 days) — Define a channel-agnostic `PaymentStatus` enum and translation layer that maps both MobilePay webhook events and Nets settlement events into the same model. Statements (E-08) and dunning (E-05) consume only the unified model.
- [ ] **T-0607** Betalingsservice failure handling (2 days) — A returned/rejected Betalingsservice collection (insufficient funds, mandate revoked) feeds the E-05 dunning state machine, *or* a separate BS-specific dunning path per spec decision. Either way, the trigger event is emitted from this epic.
- [ ] **T-0608** Mandate revocation handler (1 day) — If Nets reports a mandate was revoked by the customer, suspend the account and trigger customer outreach to set up a new payment method (mirrors `agreement-stopped` handling in E-04).
- [ ] **T-0609** Reconciliation: expected vs received settlements (2 days) — Equivalent of E-04 reconciliation: every submitted Betalingsservice charge must produce a settlement result within the expected window; missing settlements trigger an alert.
- [ ] **T-0610** Channel-failover policy (1 day) — *Blocked on Billing spec.* If a customer's MobilePay agreement is `STOPPED` and they have a Betalingsservice mandate, can charging fail over automatically? Spec must answer; this task implements whatever is decided.

---

## E-07 — Refunds and Adjustments

Operational ability to refund a captured charge (full or partial), with proper accounting, customer notification, and audit trail. Depends on E-03 (charges captured) and E-04 (capture confirmed); Billing spec must define who has refund authority and refund amount limits. Acceptance: a captured charge can be partially refunded twice and then fully exhausted; over-refund attempts are rejected; the customer receives the correct notifications; the statement and payments ledger reconcile to the øre.

- [ ] **T-0701** Refund persistence schema (1 day) — `refunds` table linked to `charges`: `refund_id`, `charge_id`, `amount_ore`, `reason_code`, `reason_text`, `initiated_by` (operator user id), `initiated_at`, `mobilepay_refund_id`, `status`.
- [ ] **T-0702** Refund reason taxonomy (0.5 days) — *Blocked on Billing spec.* Defined enum: `customer_request`, `billing_error`, `service_outage_credit`, `goodwill`, `regulatory_correction`, `other_with_note`. Surfaced in the admin portal refund form.
- [ ] **T-0703** MobilePay refund API client (2 days) — Wrapper for `POST /recurring/v3/agreements/{id}/charges/{id}/refund`. Handles full refund (amount omitted) and partial refund (amount specified, must be ≤ captured amount minus prior refunds).
- [ ] **T-0704** Partial refund handling (1 day) — Persist running total of refunded amount per charge; reject a refund attempt that would exceed the captured amount. Multiple partial refunds against a single charge are supported.
- [ ] **T-0705** Refund webhook handler `recurring.charge-refunded.v1` (1 day) — Update `refunds` row to `COMPLETED`, write to `payments` ledger as a negative entry, recalculate the customer's outstanding-balance view.
- [ ] **T-0706** Betalingsservice refund path (2 days) — Equivalent refund mechanism via Nets (likely a counter-collection). If Nets does not support API-initiated refunds, document the manual ops path and the system-of-record requirement to still write a `refunds` row.
- [ ] **T-0707** Customer refund notification (1 day) — On refund completion, push notification + email: amount, reason, expected settlement time. Copy approved by product.
- [ ] **T-0708** Refund authorisation rules (1 day) — Admin portal enforces: any refund > spec-defined threshold (e.g., 1,000 DKK) requires a second admin approval. Audit log records both actors.
- [ ] **T-0709** Statement adjustment line items (1 day) — A refund is reflected on the next billing statement (E-08) as a separate line, never by mutating the original statement.

---

## E-08 — Billing Statement

A canonical, immutable per-period billing statement record exposed via the backend API for the iOS app and the admin portal. The statement is the customer-facing artefact that explains what they were charged and why. Depends on E-02 (calculation produces the statement inputs); Billing spec must define the visible line items, currency display rules, and PDF requirement (if any). Acceptance: for a customer with three closed billing periods (one paid, one with a partial refund, one currently in dunning), the API returns three statements, the totals reconcile against the payments ledger to the øre, and both the iOS app and the admin portal render the data without further server-side computation.

- [ ] **T-0801** Statement schema (1 day) — `statements` table: `customer_id`, `billing_period_start`, `billing_period_end`, `consumption_kwh`, `spot_cost_ore`, `markup_ore`, `subscription_fee_ore`, `tax_ore` (itemised by levy type), `adjustments_ore`, `total_ore`, `currency`, `created_at`, immutable `calculation_snapshot_id` linking back to the E-02 record. Append-only; corrections create a new statement that supersedes, never an UPDATE.
- [ ] **T-0802** Statement generation job (1 day) — Triggered after E-02 produces a `BillingCalculation` and E-03 / E-06 confirms the charge was created. Writes the statement row. Idempotent.
- [ ] **T-0803** Statement API endpoint — list (1 day) — `GET /api/customers/{id}/statements` returns paginated statement summaries (period, total, status). Authentication: customer's own session, or admin role.
- [ ] **T-0804** Statement API endpoint — detail (1 day) — `GET /api/customers/{id}/statements/{statement_id}` returns the full itemised breakdown. Includes payment status (paid / pending / failed / refunded total) sourced from the unified payment model (E-06 T-0606).
- [ ] **T-0805** iOS app statement view contract (0.5 days) — JSON shape documented and versioned. iOS team consumes from this contract; no breaking changes without an explicit version bump.
- [ ] **T-0806** Admin portal statement view contract (0.5 days) — Same data shape with extended fields (operator-only audit fields, refund history, charge IDs).
- [ ] **T-0807** Refund and adjustment surfacing (1 day) — Statement detail response includes any refunds against the period as separate signed line items.
- [ ] **T-0808** Statement immutability enforcement (1 day) — Database constraint and service-layer guard rails: a statement row cannot be updated. Corrections produce a new statement marked `supersedes: <prior_id>`. Audited.
- [ ] **T-0809** CC BY 4.0 attribution on consumer-visible price data (0.5 days) — Per ADR-001 §3.4, "Energi Data Service / Energinet" attribution must appear wherever spot price data is visible. Statement detail view includes this attribution string in its API response so client surfaces can render it consistently.
- [ ] **T-0810** PDF generation (3 days) — *Blocked on Billing spec; possibly v1.1 if spec defers.* Generate a downloadable PDF copy of any statement, including legal contract reference and customer details, for storage and customer download. Decision needed before this task starts.
- [ ] **T-0811** Statement-availability notification (1 day) — When a new statement is created, push notification to the customer with the total and a deep-link to the detail view. Copy approved by product.

---

## Task Summary

| Epic | Tasks | Notes |
|---|---|---|
| E-01 Billing Scheduler Infrastructure | 9 | Foundation; prerequisite for E-03, E-04, E-05, E-06, E-08. No spec dependency. |
| E-02 Usage-Based Charge Calculation | 9 | Prerequisite for E-03, E-06, E-08. Tasks T-0203 through T-0207 blocked on Billing spec. |
| E-03 MobilePay Charge Creation | 9 | Depends on E-01, E-02. Blocked on Billing spec for `suggestMaxAmount`. Prerequisite for E-04, E-05, E-07. |
| E-04 Webhook Reconciliation | 11 | Depends on E-03. Prerequisite for E-05 and E-07. |
| E-05 Dunning Workflow | 11 | Depends on E-04. Blocked on Billing spec for grace period and cancellation rules. Terminal. |
| E-06 Betalingsservice Billing Path | 10 | Depends on E-01, E-02. Blocked on Billing spec for channel-failover policy. Feeds E-05 (when via BS) and E-08. |
| E-07 Refunds and Adjustments | 9 | Depends on E-03, E-04. Terminal. |
| E-08 Billing Statement | 11 | Depends on E-02 and E-06 (unified payment status). Consumed by iOS app and admin portal specs. |
| **Total** | **79** | |

---

## Open Questions

The following must be answered by the Billing specification (which does not yet exist) before the listed tasks above are unblocked:

1. **`suggestMaxAmount` value** — 3,000 DKK (onboarding) or 5,000 DKK (companion app). Per ADR-001 §6.4, must be resolved before E-03 ships. Owner: Product + Customer Insights.
2. **Rounding rule** — Banker's rounding vs half-up; residual-øre adjustment line policy. Owner: Finance.
3. **Subscription fee structure** — Per-customer or global; pro-rated for partial periods? Owner: Product + Finance.
4. **Tax line itemisation** — Which levies appear as separate lines vs aggregated? Owner: Finance + Regulatory PM.
5. **Network tariff data source** — Per-DSO area; manual configuration or automated sync? Owner: Data engineering. ADR-001 §7.4 flags scheduled sync as a v2 priority.
6. **Grace period length and cancellation cadence** — Spec must define exact days from terminal failure to suspension to contract cancellation. Owner: Product + Legal.
7. **Channel-failover policy** — Can a stopped MobilePay agreement automatically charge against a Betalingsservice mandate, or does it always require explicit customer action? Owner: Product.
8. **Refund authorisation thresholds** — Single-approver vs dual-approval amount and operator role boundaries. Owner: Finance + Compliance.
9. **PDF statement requirement** — Required in v1, or deferred? If required, legal copy and template owner needed. Owner: Product + Legal.
10. **First-charge billing-period semantics** — A customer who signs up mid-period: pro-rate, full period, or first invoice covers a longer initial period? Owner: Product + Finance.
11. **Calculation discrepancy threshold** — Multiple of trailing average that triggers human review before charge submission. Owner: Finance.
12. **Betalingsservice dunning policy** — Shares MobilePay's E-05 state machine, or has its own? Owner: Product + Operations.
