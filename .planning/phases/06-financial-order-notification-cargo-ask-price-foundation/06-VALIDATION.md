---
phase: 06
slug: financial-order-notification-cargo-ask-price-foundation
status: validated
nyquist_compliant: true
wave_0_complete: true
revision_status: implemented_and_validated
created: 2026-04-26
validated: 2026-04-27
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Revision note:** Phase 06 implementation is complete. Wave 0 specs now exist with concrete executable assertions and no skipped blocks. Full build, unit suite, and E2E suite passed on 2026-04-27.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest `^30.0.0` with `ts-jest ^29.2.5` |
| **Config file** | Unit config in `backend/package.json`; E2E config in `backend/test/jest-e2e.json` |
| **Quick run command** | `cd backend && npm test -- ledger.service.spec.ts payment.service.spec.ts order.service.spec.ts cargo.service.spec.ts notification.service.spec.ts --runInBand --watchman=false` |
| **Full suite command** | `cd backend && npm run build && npm test -- --runInBand --watchman=false && npm run test:e2e -- --runInBand --watchman=false --forceExit` |
| **Estimated runtime** | ~12 seconds unit-only; E2E depends on local Postgres/Redis |

## Last Validation Run

| Check | Command | Result |
|-------|---------|--------|
| Build | `cd backend && npm run build` | passed |
| Unit suite | `cd backend && npm test -- --runInBand --watchman=false` | passed: 13 suites, 128 tests |
| E2E suite | `cd backend && npm run test:e2e -- --runInBand --watchman=false --forceExit` | passed: 2 suites, 54 tests |
| Skip scan | `rg "describe\\.skip|it\\.skip|test\\.skip|xdescribe|xit" ...` | passed: no matches |

---

## Sampling Rate

- **After every task commit:** Run the smallest affected service spec plus shared enum/response-code tests when touched.
- **After every plan wave:** Run `cd backend && npm test -- --runInBand --watchman=false`.
- **Before `$gsd-verify-work`:** Full unit suite and Phase 6 E2E flow must be green.
- **Max feedback latency:** 120 seconds for unit-only feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | shared financial contracts | T-06-01 | Dependencies, response codes, and financial/payment/order enums exist. | unit | `cd backend && npm test -- --runInBand --watchman=false` | Yes | passed |
| 06-10-01 | 10 | 0 | KARG/NOTF contracts | T-06-10 | Cargo/notification enums are exported. | unit | `cd backend && npm test -- --runInBand --watchman=false` | Yes | passed |
| 06-09-01 | 09 | 1 | all Phase 6 reqs | T-06-09 | Executable Wave 0 unit specs exist with concrete assertions and no skipped blocks; implementation plans make them pass. | unit scaffold | `test -f backend/src/modules/ledger/ledger.service.spec.ts && test -f backend/src/modules/payment/payment.service.spec.ts && test -f backend/src/modules/order/order.service.spec.ts && test -f backend/src/modules/cargo/cargo.service.spec.ts && test -f backend/src/modules/cargo/cargo.processor.spec.ts && test -f backend/src/modules/notification/notification.service.spec.ts && test -f backend/src/modules/notification/notification.processor.spec.ts && grep -R "expect(" backend/src/modules/ledger/ledger.service.spec.ts backend/src/modules/payment/payment.service.spec.ts backend/src/modules/order/order.service.spec.ts backend/src/modules/cargo/cargo.service.spec.ts backend/src/modules/cargo/cargo.processor.spec.ts backend/src/modules/notification/notification.service.spec.ts backend/src/modules/notification/notification.processor.spec.ts && ! grep -R "describe\\.skip\\|it\\.skip\\|test\\.skip\\|xdescribe\\|xit" backend/src/modules/ledger backend/src/modules/payment backend/src/modules/order backend/src/modules/cargo backend/src/modules/notification` | Yes | passed |
| 06-09-02 | 09 | 1 | all Phase 6 reqs | T-06-09 | Executable Phase 6 E2E scaffold exists with concrete response-code assertions and no skipped blocks; 06-08 makes it pass. | e2e scaffold | `test -f backend/test/phase6-transaction.e2e-spec.ts && grep -q "expect(res.body.code" backend/test/phase6-transaction.e2e-spec.ts && grep -q "expect(res.body.message" backend/test/phase6-transaction.e2e-spec.ts && ! grep -E "describe\\.skip|it\\.skip|test\\.skip|xdescribe|xit" backend/test/phase6-transaction.e2e-spec.ts` | Yes | passed |
| 06-02-01 | 02 | 2 | WALL-01..04, WALL-07..08 | T-06-02 | Wallet summary is derived from committed ledger movement. | unit | `cd backend && npm test -- ledger.service.spec.ts wallet.service.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-06-01 | 06 | 2 | NOTF-01..07 | T-06-06 | Durable notifications, preferences, and push retry/fallback are idempotent. | unit | `cd backend && npm test -- notification.service.spec.ts notification.processor.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-03-01 | 03 | 3 | PAY-01..04 | T-06-03 | Iyzico webhook requires signature/idempotency guard before state mutation. | unit + e2e | `cd backend && npm test -- payment.service.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-11-01 | 11 | 3 | WALL-05..06 | T-06-11 | Seller payout request persists and requires manual admin approval hooks. | unit + e2e | `cd backend && npm test -- wallet.service.spec.ts ledger.service.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-04-01 | 04 | 4 | ORDR-01..06 | T-06-04 | Only valid order transitions are accepted and audited. | unit + e2e | `cd backend && npm test -- order.service.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-05-01 | 05 | 5 | KARG-01..04 | T-06-05 | Cargo mock transitions are idempotent and order-bound. | unit | `cd backend && npm test -- cargo.service.spec.ts cargo.processor.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-07-01 | 07 | 6 | ASKP hooks | T-06-07 | Ask Price can only enter escrow through explicit source hooks. | unit | `cd backend && npm test -- order.service.spec.ts product.service.spec.ts --runInBand --watchman=false` | Yes | passed |
| 06-08-01 | 08 | 7 | WALL/PAY/ORDR/KARG/NOTF | T-06-08 | Auction/direct-sale transaction flow is E2E idempotent. | e2e | `cd backend && npm run test:e2e -- --runInBand --watchman=false --forceExit` | Yes | passed |

---

## Wave 0 Requirements

- [x] `backend/src/modules/ledger/ledger.service.spec.ts` — covers balanced journal entries and wallet cache invariants.
- [x] `backend/src/modules/payment/payment.service.spec.ts` — covers Iyzico initialize/retrieve/webhook idempotency/refund edge cases with fake provider.
- [x] `backend/src/modules/order/order.service.spec.ts` — covers auction/direct-sale order creation, lifecycle transitions, delivery confirm, auto-confirm, admin review.
- [x] `backend/src/modules/cargo/cargo.service.spec.ts` — covers mock tracking number generation and cargo status transitions.
- [x] `backend/src/modules/cargo/cargo.processor.spec.ts` — covers delayed mock cargo transition job behavior.
- [x] `backend/src/modules/notification/notification.service.spec.ts` — covers durable in-app records and event type mapping.
- [x] `backend/src/modules/notification/notification.processor.spec.ts` — covers OneSignal retry/fallback/idempotency behavior with fake provider.
- [x] `backend/test/phase6-transaction.e2e-spec.ts` — covers auction/direct-sale to payment, escrow, cargo, delivery confirmation/auto-confirm, seller payout request flow.
- [x] No Wave 0 or implementation spec contains `describe.skip`, `it.skip`, `test.skip`, `xdescribe`, or `xit`.
- [x] Wave 0 scaffolds contain concrete executable assertions (`expect(...)` / Supertest response assertions) and pass after implementation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Iyzico sandbox payment | PAY-01..04 | Requires external sandbox credentials and webhook V3 enablement. | Configure env keys, run a sandbox payment, confirm webhook event is stored once and order state advances once. |
| Live OneSignal push delivery | NOTF-04..07 | Requires external OneSignal app/API key and device subscription. | Configure env keys, trigger one notification, confirm push delivery status and durable in-app fallback row. |

## Validation Audit 2026-04-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Automated rows covered | 13 |
| Resolved by existing tests | 13 |
| Escalated/manual-only | 2 |

## Validation Audit 2026-04-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Automated rows covered | 13 |
| Resolved by existing tests | 13 |
| Escalated/manual-only | 2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 120s for unit-only loops.
- [x] `nyquist_compliant: true` set in frontmatter after Wave 0 tests exist, contain concrete executable assertions, and contain no skipped blocks; full suite pass is confirmed.

**Approval:** passed for automated validation. Live Iyzico sandbox and live OneSignal delivery remain manual-only external provider checks.
