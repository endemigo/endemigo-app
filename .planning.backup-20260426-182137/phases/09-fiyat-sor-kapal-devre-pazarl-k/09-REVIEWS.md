---
phase: 9
reviewers: [internal-adversarial]
reviewed_at: 2026-04-21T22:40:00+03:00
plans_reviewed: [09-01-PLAN.md, 09-02-PLAN.md, 09-03-PLAN.md, 09-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 9

> Internal adversarial review — security, race conditions, edge cases.

---

## Internal Adversarial Review

### Concerns (HIGH)
1. **Race condition on acceptOffer** — Two buyers accepting simultaneously could create duplicate orders. Fix: SELECT FOR UPDATE on product row.
2. **Content moderation Unicode bypass** — Attackers use homoglyphs (e.g., "0⁵³²"). Fix: Unicode normalization + Turkish number words.
3. **Missing Order.source backfill** — Existing auction orders stay DIRECT_SALE. Fix: Data migration backfill.

### Concerns (MEDIUM)
4. **Socket.IO JWT refresh** — Token expiry during conversation causes disconnect.
5. **Missing pagination on offer timeline** — Long conversations could load hundreds of items.
6. **No rate limiting on offer creation** — Spam protection needed. Fix: @Throttle(5, 60).
7. **isPriceHidden independent of listingType** — Could be set on DIRECT_SALE between waves.
8. **BullMQ job deduplication** — Network retry could create duplicate expire jobs. Fix: jobId based on offer ID.

### Risk Assessment: MEDIUM
Architecture is sound. Main risks are race conditions (fixable with locking) and moderation bypass (hardened iteratively).

### Action Items
1. Plan 09-02 Task 3: Add pessimistic lock on product row in acceptOffer
2. Plan 09-02 Task 2: Add Unicode normalization
3. Plan 09-04 Task 1: Add backfill migration for auction orders
4. Plan 09-02 Task 4: Add @Throttle on offer endpoints
5. Plan 09-02 Task 6: Use jobId for BullMQ deduplication
