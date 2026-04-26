---
phase: 06-financial-order-notification-cargo-ask-price-foundation
plan: 02
subsystem: payments
tags: [ledger, wallet, typeorm, postgres, tdd]
requires:
  - phase: 06-01
    provides: Shared financial response codes and ledger enum contracts
  - phase: 06-09
    provides: Executable Phase 6 ledger and wallet test scaffolds
provides:
  - Double-entry ledger entities and posting service
  - Authenticated ledger history endpoint
  - Ledger-backed wallet hold, release, capture, and history methods
  - Pessimistic wallet/hold locking with idempotency keys
affects: [wallet, ledger, auction, payment, order, payout]
tech-stack:
  added: []
  patterns: [double-entry-ledger, queryrunner-transaction, pessimistic-write-locks, tdd-red-green]
key-files:
  created:
    - backend/src/modules/ledger/entities/ledger-account.entity.ts
    - backend/src/modules/ledger/entities/journal-entry.entity.ts
    - backend/src/modules/ledger/entities/journal-line.entity.ts
    - backend/src/modules/ledger/ledger.service.ts
    - backend/src/modules/ledger/ledger.controller.ts
    - backend/src/modules/ledger/ledger.module.ts
  modified:
    - backend/src/modules/ledger/ledger.service.spec.ts
    - backend/src/modules/wallet/entities/wallet-hold.entity.ts
    - backend/src/modules/wallet/wallet.service.ts
    - backend/src/modules/wallet/wallet.controller.ts
    - backend/src/modules/wallet/wallet.module.ts
    - backend/src/modules/wallet/wallet.service.spec.ts
key-decisions:
  - "Wallet summary fields remain a cache updated inside the same transaction as ledger-backed hold operations."
  - "Wallet history delegates to LedgerService so ledger is the source of truth for transaction display."
patterns-established:
  - "LedgerService.postEntry validates debit/credit balance before transactional persistence."
  - "WalletService hold, release, and capture acquire pessimistic locks before writing wallet cache fields."
requirements-completed: [WALL-01, WALL-02, WALL-03, WALL-04, WALL-07, WALL-08]
duration: 18min
completed: 2026-04-26
---

# Phase 6 Plan 02: Ledger-Backed Wallet Summary

**Double-entry ledger posting and wallet hold/capture/release now run through transactional ledger-backed accounting.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-26T20:27:00Z
- **Completed:** 2026-04-26T20:45:36Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added ledger account, journal entry, and journal line entities with PostgreSQL enum columns.
- Implemented balanced, idempotent ledger posting plus wallet-scoped history payloads.
- Upgraded wallet hold, release, capture, and history paths to use LedgerService with transaction locks.

## Task Commits

1. **Task 1 RED: Ledger service contract tests** - `9791905` (test)
2. **Task 1 GREEN: Ledger posting service** - `59ea57b` (feat)
3. **Task 2 RED: Wallet ledger integration tests** - `b9b5b61` (test)
4. **Task 2 GREEN: Wallet ledger-backed holds** - `aa9cad0` (feat)

## Files Created/Modified

- `backend/src/modules/ledger/entities/ledger-account.entity.ts` - Ledger account categories for buyer, seller, escrow, platform fee, and payout reserve.
- `backend/src/modules/ledger/entities/journal-entry.entity.ts` - Immutable journal entry metadata, reference, status, and idempotency key.
- `backend/src/modules/ledger/entities/journal-line.entity.ts` - Debit/credit journal lines scoped to users and accounts.
- `backend/src/modules/ledger/ledger.service.ts` - Balanced posting, account creation, idempotency, and wallet history.
- `backend/src/modules/ledger/ledger.controller.ts` - Authenticated `GET /ledger/history`.
- `backend/src/modules/ledger/ledger.module.ts` - Ledger TypeORM/service/controller wiring.
- `backend/src/modules/wallet/entities/wallet-hold.entity.ts` - Hold idempotency key.
- `backend/src/modules/wallet/wallet.service.ts` - Ledger-backed hold, release, capture, balance, and history.
- `backend/src/modules/wallet/wallet.controller.ts` - Wallet history endpoint.
- `backend/src/modules/wallet/wallet.module.ts` - LedgerModule integration.
- `backend/src/modules/ledger/ledger.service.spec.ts` - Ledger happy/error/edge unit tests.
- `backend/src/modules/wallet/wallet.service.spec.ts` - Wallet ledger integration happy/error/edge unit tests.

## Decisions Made

- Used `LedgerReferenceType.AUCTION_HOLD` for current wallet hold movements because the shared enum contract does not define a separate wallet-hold reference type.
- Kept payout request APIs out of scope; only seller/platform ledger account categories are prepared for 06-11.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git staging/commit required escalated repository index access; commits were completed with explicit escalation.

## User Setup Required

None.

## Verification

- `cd backend && npm test -- ledger.service.spec.ts wallet.service.spec.ts --runInBand --watchman=false` - passed, 10 tests.
- Acceptance greps passed for `LedgerService`, `assertBalanced`, `LEDGER_UNBALANCED`, enum journal line column, `@Get('history')`, `LedgerService`, `postEntry`, `pessimistic_write`, `getTransactionHistory`, and no skipped ledger/wallet tests.

## Known Stubs

None.

## Next Phase Readiness

Payment, order, escrow, and payout plans can call `LedgerService.postEntry` and wallet history without treating wallet cache fields as accounting authority.

## Self-Check: PASSED

---
*Phase: 06-financial-order-notification-cargo-ask-price-foundation*
*Completed: 2026-04-26*
