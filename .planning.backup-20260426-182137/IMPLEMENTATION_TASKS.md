# Implementation Tasks — Audit Gap Closure

**Source:** strict_audit.md (42 gaps) + FULL_AUDIT.md (Steps 3-11)
**Date:** 2026-04-07

---

## CRITICAL PRIORITY

### TASK-01: Auction State Machine Transition Table
**System:** Backend
**Source:** F3, D3, R3
**Dependencies:** None (design task)
**Phase:** Must complete before Phase 5

**Implementation Steps:**
1. Create `docs/auction-state-machine.md` with Mermaid diagram
2. Define 6 states: `draft → published → active → ended → completed → cancelled`
3. For each transition define:
   - **Guard condition:** Who can trigger? What conditions must be true?
   - **Action:** What happens on transition?
   - **Audit log entry:** What gets recorded?
4. Specific transitions:
   - `draft → published`: Seller action, requires: title, startPrice, minIncrement, duration set
   - `published → active`: Scheduled job (BullMQ) at startTime, requires: ≥0 participants
   - `active → ended`: Timer expiry OR admin cancel, requires: duration elapsed OR admin override
   - `ended → completed`: Payment received from winner within 24h grace
   - `ended → cancelled`: No bids (AUCT-15) OR admin cancel
   - `completed → cancelled`: NOT ALLOWED (immutable)
   - `any → cancelled`: Admin only, requires: reason text, triggers refund if bids exist
5. Implement as TypeScript enum + guard functions:
```typescript
// auction-state.guard.ts
canTransition(from: AuctionState, to: AuctionState, actor: Actor): boolean
getRequiredConditions(from: AuctionState, to: AuctionState): Condition[]
```
6. Add error state handling: `active` auction with server crash → on restart, check all `active` auctions, resume timers

**Test:** AUCT-08 unit tests — every valid transition returns true, every invalid returns false. 100% state pair coverage.

---

### TASK-02: Bid Idempotency Key
**System:** Backend + Mobile
**Source:** R4, CONC-04, Step 6 "retry unsafe mutation"
**Dependencies:** TASK-01
**Phase:** Phase 5

**Implementation Steps:**
1. **Mobile:** Generate UUID v4 `idempotencyKey` per bid attempt:
```typescript
// useBid.ts
const placeBid = (auctionId: string, amount: number) => {
  const idempotencyKey = uuid.v4();
  return api.post('/bids', { auctionId, amount, idempotencyKey });
};
```
2. **Backend:** Add `idempotency_key` column to `bids` table with UNIQUE constraint
3. **Backend:** In `BidService.placeBid()`:
   - Check `WHERE idempotency_key = :key` before INSERT
   - If exists → return existing bid (200 OK, not 201)
   - If not → proceed with normal bid flow
4. **Backend:** Redis cache idempotency key for 5 minutes (fast check before DB):
```typescript
const cached = await redis.get(`bid:idem:${key}`);
if (cached) return JSON.parse(cached);
```
5. **Mobile:** On retry (TanStack Query), reuse same `idempotencyKey`

**Test:** CONC-04 — Send same bid 2x with same key → 1 bid in DB. Send with different keys → 2 bids.

---

### TASK-03: Distributed Lock for Auction End
**System:** Backend
**Source:** R5, CONC-06, Step 6 "distributed event timing"
**Dependencies:** Redis setup (Phase 1)
**Phase:** Phase 5

**Implementation Steps:**
1. Install `redlock` package (or implement manual SETNX):
```bash
npm install redlock
```
2. In `AuctionSchedulerService.endAuction(auctionId)`:
```typescript
const lock = await redlock.acquire([`auction:end:${auctionId}`], 30000);
try {
  const auction = await this.auctionRepo.findOne({ id: auctionId });
  if (auction.status !== AuctionState.ACTIVE) return; // already ended
  await this.finalizeAuction(auction);
} finally {
  await lock.release();
}
```
3. BullMQ `auction-end` job: Configure `removeOnComplete: true`, `removeOnFail: false`
4. Add health check: On server startup, scan all `active` auctions where `endTime < now`, schedule immediate end job

**Test:** CONC-06 — Simulate 2 workers processing same auction-end event. Assert: only 1 finalize call, 1 winner, 1 order.

---

### TASK-04: Double-Entry Ledger Schema
**System:** Backend (Database)
**Source:** F7, R2, Step 5 "transaction ledger"
**Dependencies:** Wallet module base
**Phase:** Phase 6

**Implementation Steps:**
1. Create TypeORM entities:
```typescript
// ledger-account.entity.ts
@Entity()
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: AccountType }) type: AccountType;
  // AccountType: USER_WALLET | SELLER_WALLET | PLATFORM_COMMISSION | ESCROW_HOLDING | PAYMENT_PROVIDER
  @Column() ownerId: string; // userId or 'PLATFORM'
  @Column({ type: 'decimal', precision: 12, scale: 2 }) balance: number;
}

// journal-entry.entity.ts
@Entity()
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() referenceType: string; // 'BID' | 'PAYMENT' | 'ESCROW' | 'REFUND' | 'WITHDRAWAL' | 'COMMISSION'
  @Column() referenceId: string;
  @Column({ type: 'timestamp' }) timestamp: Date;
  @Column() description: string;
  @OneToMany(() => JournalLine, line => line.entry) lines: JournalLine[];
}

// journal-line.entity.ts
@Entity()
export class JournalLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => JournalEntry) entry: JournalEntry;
  @ManyToOne(() => LedgerAccount) account: LedgerAccount;
  @Column({ type: 'enum', enum: ['DEBIT', 'CREDIT'] }) type: 'DEBIT' | 'CREDIT';
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
}
```
2. Every financial operation creates a JournalEntry with balanced lines:
   - Bid hold: DEBIT user_available, CREDIT user_held
   - Outbid release: DEBIT user_held, CREDIT user_available
   - Win capture: DEBIT user_held, CREDIT escrow
   - Delivery confirm: DEBIT escrow, CREDIT seller_wallet + CREDIT platform_commission
   - Refund: DEBIT escrow, CREDIT user_available
3. Add DB constraint: trigger or app-level check that `SUM(DEBIT) = SUM(CREDIT)` per JournalEntry
4. Add reconciliation service:
```typescript
async reconcile(): Promise<ReconciliationResult> {
  const totalDebits = await this.journalLineRepo.sum('amount', { type: 'DEBIT' });
  const totalCredits = await this.journalLineRepo.sum('amount', { type: 'CREDIT' });
  return { balanced: totalDebits === totalCredits, diff: totalDebits - totalCredits };
}
```

**Test:** RELY-05 — After 100 random transactions, `reconcile()` returns `balanced: true`. Any single missing line → `balanced: false`.

---

### TASK-05: Order Creation Unique Constraint
**System:** Backend (Database)
**Source:** CONC-03, Step 6 "order creation race"
**Dependencies:** Order entity
**Phase:** Phase 7

**Implementation Steps:**
1. Add unique constraint to `orders` table:
```typescript
@Entity()
@Unique(['auctionId', 'type'], { where: "type = 'AUCTION'" })
export class Order {
  @Column({ nullable: true }) auctionId: string;
}
```
2. In `OrderService.createFromAuction()`:
```typescript
try {
  await this.orderRepo.save(order);
} catch (e) {
  if (e.code === '23505') { // PostgreSQL unique violation
    return this.orderRepo.findOne({ auctionId });
  }
  throw e;
}
```

**Test:** CONC-03 — 2 concurrent `createFromAuction(sameAuctionId)` → exactly 1 order in DB.

---

### TASK-06: Double-Spend Prevention (Bid + Purchase)
**System:** Backend
**Source:** CONC "double spending", Step 6
**Dependencies:** TASK-04 (ledger)
**Phase:** Phase 6

**Implementation Steps:**
1. All wallet mutations go through `WalletService.executeTransaction()` with row-level lock:
```typescript
async executeTransaction(userId: string, operation: () => Promise<void>) {
  return this.dataSource.transaction(async (manager) => {
    // Lock wallet row for update
    const wallet = await manager
      .createQueryBuilder(Wallet, 'w')
      .setLock('pessimistic_write')
      .where('w.userId = :userId', { userId })
      .getOne();
    
    await operation(wallet, manager);
  });
}
```
2. Both `BidService.placeBid()` and `OrderService.directPurchase()` use same `executeTransaction()`
3. Available balance check inside lock: `if (wallet.available < amount) throw InsufficientBalance`
4. Single point of truth: no balance check outside transaction

**Test:** CONC-02 — 10 concurrent deductions totaling more than balance → some fail, balance never negative.

---

## HIGH PRIORITY

### TASK-07: WebSocket Event Type Enumeration
**System:** Backend + Mobile
**Source:** Step 4 "event flow", "bid message schema"
**Dependencies:** Socket.IO setup
**Phase:** Phase 5

**Implementation Steps:**
1. Create shared types (npm workspace or copy):
```typescript
// shared/ws-events.ts
export enum WsEvent {
  // Client → Server
  JOIN_AUCTION = 'auction:join',
  LEAVE_AUCTION = 'auction:leave',
  PLACE_BID = 'auction:bid',
  
  // Server → Client
  AUCTION_STATE = 'auction:state',
  BID_PLACED = 'auction:bid_placed',
  BID_OUTBID = 'auction:bid_outbid',
  AUCTION_EXTENDED = 'auction:extended',
  AUCTION_ENDING_SOON = 'auction:ending_soon', // 60s warning
  AUCTION_ENDED = 'auction:ended',
  PARTICIPANT_COUNT = 'auction:participants',
  ERROR = 'auction:error',
}

export interface BidMessage {
  auctionId: string;
  amount: number;
  idempotencyKey: string;
}

export interface BidPlacedEvent {
  auctionId: string;
  bidId: string;
  userId: string;
  username: string; // masked: "fat***"
  amount: number;
  timestamp: string; // ISO 8601
  sequenceNumber: number;
  currentPrice: number;
  remainingTime: number; // seconds
}

export interface AuctionEndedEvent {
  auctionId: string;
  winnerId: string | null;
  winnerUsername: string | null;
  finalPrice: number;
  totalBids: number;
}
```
2. Backend gateway:
```typescript
@WebSocketGateway({ namespace: '/auction' })
export class AuctionGateway {
  @SubscribeMessage(WsEvent.JOIN_AUCTION)
  handleJoin(client: Socket, payload: { auctionId: string }) { ... }
  
  @SubscribeMessage(WsEvent.PLACE_BID)
  handleBid(client: Socket, payload: BidMessage) { ... }
}
```
3. Mobile client:
```typescript
socket.on(WsEvent.BID_PLACED, (data: BidPlacedEvent) => { ... });
```

**Test:** Contract test — Mobile sends `BidMessage`, Backend emits `BidPlacedEvent` with correct schema.

---

### TASK-08: Win → Capture → Escrow Flow
**System:** Backend
**Source:** Step 5 "capture logic", "win→capture flow"
**Dependencies:** TASK-04 (ledger), TASK-01 (state machine)
**Phase:** Phase 6

**Implementation Steps:**
1. Define flow as BullMQ job chain:
```
auction:ended → auction:create-order → order:await-payment → order:payment-captured → order:escrow-hold
```
2. Step-by-step:
   - **auction:ended** → Determine winner (highest bid, earliest timestamp)
   - **auction:create-order** → Create Order entity, status=`awaiting_payment`
   - **order:await-payment** → Winner has 24h to confirm. BullMQ delayed job at 24h
   - If winner wallet has held balance ≥ finalPrice:
     - **order:payment-captured** → JournalEntry: DEBIT winner_held → CREDIT escrow
     - Order status = `paid`
   - If winner wallet insufficient (held < finalPrice):
     - Grace period 24h → If still insufficient → cancel, move to next bidder
   - **order:escrow-hold** → Escrow timer starts (14 days). BullMQ delayed job.
3. Seller ships → buyer confirms OR 14 days auto:
   - **escrow:release** → JournalEntry: DEBIT escrow → CREDIT seller_wallet + CREDIT platform_commission
   - Commission calculated: `finalPrice × commissionRate`
   - Seller balance += `finalPrice - commission`
   - Platform commission account += `commission`

**Test:** PAY-02 E2E — Full flow from auction end to seller receiving payment. Assert all ledger entries balanced.

---

### TASK-09: Refund Trigger Rules
**System:** Backend
**Source:** Step 5 "refund logic", B3
**Dependencies:** TASK-08
**Phase:** Phase 6

**Implementation Steps:**
1. Define refund event types:
```typescript
enum RefundTrigger {
  ADMIN_CANCEL = 'admin_cancel',        // Admin cancels order
  SELLER_NO_SHIP = 'seller_no_ship',    // Seller doesn't ship in 7 days
  BUYER_DISPUTE = 'buyer_dispute',      // Buyer opens dispute (admin approves)
  AUCTION_CANCEL = 'auction_cancel',    // Admin cancels auction with bids
  PAYMENT_FAIL = 'payment_fail',        // İyzico payment fails after capture
}
```
2. Refund service:
```typescript
async processRefund(orderId: string, trigger: RefundTrigger, amount?: number) {
  // Full refund (default) or partial refund (if amount provided)
  const refundAmount = amount ?? order.totalAmount;
  
  // Journal: DEBIT escrow → CREDIT buyer_wallet
  await this.ledgerService.createEntry({
    referenceType: 'REFUND',
    referenceId: orderId,
    lines: [
      { account: escrowAccount, type: 'DEBIT', amount: refundAmount },
      { account: buyerAccount, type: 'CREDIT', amount: refundAmount },
    ]
  });
  
  // İyzico refund API call
  await this.iyzicoService.refund(order.paymentId, refundAmount);
  
  // Audit log
  await this.auditService.log('REFUND', { orderId, trigger, amount: refundAmount });
}
```
3. **Partial refund:** Supported. Admin specifies amount. Minimum: 1 TL.
4. **Dispute timeline:** Buyer has 14 days after delivery to open dispute. After that, auto-close.

**Test:** PAY-05 — Each RefundTrigger type → correct refund amount, ledger balanced, İyzico API called.

---

### TASK-10: Reconciliation Cron Job
**System:** Backend
**Source:** Step 5 "reconciliation", TEST-49
**Dependencies:** TASK-04
**Phase:** Phase 6

**Implementation Steps:**
1. Create `ReconciliationService`:
```typescript
@Injectable()
export class ReconciliationService {
  @Cron('0 2 * * *') // Daily at 02:00
  async dailyReconciliation() {
    // 1. Check ledger balance
    const { balanced, diff } = await this.checkLedgerBalance();
    
    // 2. Check wallet balances match ledger
    const walletMismatches = await this.checkWalletConsistency();
    
    // 3. Check escrow balances match pending orders
    const escrowMismatches = await this.checkEscrowConsistency();
    
    // 4. Check İyzico balance matches our records
    const iyzicoBalance = await this.iyzicoService.getBalance();
    const ourBalance = await this.getTotalPlatformBalance();
    
    // 5. Generate report
    const report = { balanced, diff, walletMismatches, escrowMismatches, iyzicoBalance, ourBalance };
    
    // 6. Alert if any mismatch
    if (!balanced || walletMismatches.length > 0) {
      await this.alertService.sendCritical('RECONCILIATION_MISMATCH', report);
    }
    
    // 7. Save report
    await this.reconciliationRepo.save(report);
  }
}
```
2. Add to `app.module.ts` with `@nestjs/schedule`
3. Admin panel: reconciliation report view page

**Test:** TEST-49 — After 1000 random transactions, reconciliation returns `balanced: true`.

---

### TASK-11: Trust Scoring Algorithm
**System:** Backend
**Source:** F1, D1, R1
**Dependencies:** User, Order, Wallet modules
**Phase:** Phase 10

**Implementation Steps:**
1. Define concrete scoring rules:
```typescript
interface TrustScore {
  score: number;        // 0-100
  level: 'low' | 'medium' | 'high' | 'verified';
  restrictions: string[];
}

const RULES = {
  // Positive signals
  completedOrders: { weight: 2, max: 20 },       // +2 per completed order, max 20
  onTimePayments: { weight: 1, max: 10 },         // +1 per on-time payment, max 10
  accountAge: { weight: 0.5, perMonth: true, max: 6 }, // +0.5 per month, max 6
  profileComplete: { weight: 5, once: true },      // +5 if profile 100% complete
  emailVerified: { weight: 5, once: true },        // +5 if email verified
  positiveReviews: { weight: 1, max: 15 },         // +1 per 4+ star review, max 15
  
  // Negative signals
  cancelledOrders: { weight: -3, each: true },     // -3 per cancelled order
  latePayments: { weight: -5, each: true },        // -5 per late payment
  disputesLost: { weight: -10, each: true },       // -10 per lost dispute
  reportedByUsers: { weight: -2, each: true },     // -2 per report
  
  // Restrictions
  bidLimit: { threshold: 30, limit: 3 },     // score < 30 → max 3 active bids
  auctionBan: { threshold: 15 },             // score < 15 → cannot bid
  accountSuspend: { threshold: 5 },          // score < 5 → auto-suspend
};
```
2. `TrustService.calculateScore(userId)`:
   - Query all metrics from DB
   - Apply weights
   - Clamp to 0-100
   - Determine level and restrictions
3. Trigger recalculation: After order complete, payment, review, report, dispute
4. Admin override: Admin can manually set score floor/ceiling

**Test:** TEST-52 — Given 10 user profiles with known metrics → score matches expected values. Restriction thresholds enforced.

---

### TASK-12: Personalized Search Sorting
**System:** Backend + Mobile
**Source:** B4, R6
**Dependencies:** Search module, User activity tracking
**Phase:** Phase 4

**Implementation Steps:**
1. Track user activity (lightweight):
```typescript
// user-activity.entity.ts
@Entity()
export class UserActivity {
  @Column() userId: string;
  @Column() productId: string;
  @Column() activityType: 'VIEW' | 'FAVORITE' | 'BID' | 'PURCHASE';
  @Column() categoryId: string;
  @CreateDateColumn() createdAt: Date;
}
```
2. Personalized sort algorithm (rule-based, not ML):
```typescript
async getPersonalizedSort(userId: string, products: Product[]): Product[] {
  // 1. Get user's top 3 categories (by activity count)
  const topCategories = await this.getTopCategories(userId, 3);
  
  // 2. Get user's favorited product IDs
  const favoriteIds = await this.getFavoriteIds(userId);
  
  // 3. Score each product
  return products.map(p => ({
    ...p,
    personalScore: 
      (topCategories.includes(p.categoryId) ? 10 : 0) +
      (favoriteIds.includes(p.id) ? 5 : 0) +
      (p.favoriteCount * 0.1) +
      (p.isNew ? 3 : 0)
  })).sort((a, b) => b.personalScore - a.personalScore);
}
```
3. Search API: Add `?sort=personalized` option
4. Mobile: Default sort = personalized for logged-in users

**Test:** Given user who viewed Category A 10 times → `?sort=personalized` returns Category A products first.

---

### TASK-13: Membership Tier Definitions
**System:** Backend + Admin
**Source:** B2, B8, E8
**Dependencies:** İyzico recurring, Wallet
**Phase:** Phase 10

**Implementation Steps:**
1. Define tiers:
```typescript
const MEMBERSHIP_TIERS = {
  FREE: {
    price: 0,
    maxListings: 5,
    commissionRate: 0.10,     // 10%
    featuredListings: 0,
    prioritySupport: false,
    badge: null,
  },
  PREMIUM: {
    price: 99,                 // TL/month
    maxListings: 50,
    commissionRate: 0.07,      // 7%
    featuredListings: 3,       // 3 free featured per month
    prioritySupport: true,
    badge: 'premium',
  },
  BUSINESS: {
    price: 299,                // TL/month
    maxListings: -1,           // unlimited
    commissionRate: 0.05,      // 5%
    featuredListings: 10,
    prioritySupport: true,
    badge: 'business',
  },
};
```
2. DB: `membership_plans` table (admin-configurable)
3. DB: `user_subscriptions` table (userId, planId, status, startDate, endDate, iyzicoSubscriptionId)
4. İyzico recurring payment integration:
```typescript
async createSubscription(userId: string, planId: string) {
  const plan = await this.planRepo.findOne(planId);
  const iyzicoSub = await this.iyzicoService.createSubscription({
    pricingPlanReferenceCode: plan.iyzicoRefCode,
    customerReferenceCode: userId,
  });
  await this.subscriptionRepo.save({ userId, planId, iyzicoSubscriptionId: iyzicoSub.id, status: 'active' });
}
```
5. Commission calculation: Use user's active plan rate instead of default
6. Admin panel: Plan CRUD page

**Test:** TEST-50 — Create subscription, verify İyzico callback, verify commission rate changes, cancel → downgrade to FREE.

---

## MEDIUM PRIORITY

### TASK-14: Room Cleanup & Crash Recovery
**System:** Backend
**Source:** Step 4 "room cleanup", "crash recovery"
**Dependencies:** TASK-03
**Phase:** Phase 5

**Implementation Steps:**
1. **Room cleanup:** Socket.IO adapter `on('disconnect')`:
```typescript
handleDisconnect(client: Socket) {
  const rooms = this.getRoomsForClient(client);
  rooms.forEach(room => {
    this.server.to(room).emit(WsEvent.PARTICIPANT_COUNT, this.getParticipantCount(room));
  });
  // If room has 0 participants AND auction ended → destroy room after 5min
}
```
2. **Crash recovery:** On server startup:
```typescript
async onApplicationBootstrap() {
  const activeAuctions = await this.auctionRepo.find({ status: In([AuctionState.ACTIVE]) });
  for (const auction of activeAuctions) {
    if (auction.endTime < new Date()) {
      // Missed end → finalize now
      await this.auctionScheduler.endAuction(auction.id);
    } else {
      // Reschedule end job
      const delay = auction.endTime.getTime() - Date.now();
      await this.auctionQueue.add('end', { auctionId: auction.id }, { delay });
    }
  }
}
```

**Test:** Kill server mid-auction → restart → auction resumes correctly, winner determined.

---

### TASK-15: Admin Override Capabilities
**System:** Backend + Admin
**Source:** Step 4 "admin override", B3
**Dependencies:** TASK-01
**Phase:** Phase 11

**Implementation Steps:**
1. Admin auction actions:
   - **Cancel auction** (any state except completed): Refund all held balances, notify participants
   - **Extend auction time**: Add N minutes, only if status=active
   - **Suspend auction**: Pause bidding temporarily, state=suspended (new state)
   - **Override winner**: Admin selects different winner (edge case)
2. Admin order actions:
   - **Force refund**: Full or partial, any order state
   - **Force complete**: Skip delivery confirmation
   - **Reassign to next bidder**: Cancel current winner, move to #2
3. Every action requires: `reason` text field, logged in AUDT

**Test:** Admin cancels active auction with 5 bids → 5 wallet unblocks, 5 notifications, audit log entry.

---

### TASK-16: Sprint Demo & Biweekly Report
**System:** Process
**Source:** A3, A4, R8, R9
**Dependencies:** None
**Phase:** Phase 1 (define process)

**Implementation Steps:**
1. Create `.planning/templates/biweekly-report.md`:
```markdown
# İlerleme Raporu — Hafta X-Y

## Tamamlanan İş Paketleri
- [ ] Phase X: [açıklama]

## Devam Eden İşler
- [ ] [açıklama] — %progress

## Riskler ve Sorunlar
| Risk | Etki | Aksiyon |
|------|------|---------|

## Sonraki 2 Hafta Planı
- [ ] [açıklama]

## Notlar / İhtiyaçlar
- [müşteriden ihtiyaç duyulan kararlar]
```
2. Create `.planning/templates/demo-checklist.md`:
```markdown
# Faz Demo Checklist

**Tarih:** [tarih]
**Katılımcılar:** Geliştirici + Müşteri
**Ortam:** Staging (https://staging.endemigo.com)

## Demo Senaryoları
- [ ] [senaryo 1]
- [ ] [senaryo 2]

## Bilinen Kısıtlamalar
- [liste]

## Müşteri Geri Bildirimi
- [ ] Kabul / Red (5 iş günü içinde yazılı)
```
3. Demo flow: Her faz sonunda → staging deploy → demo → 5 iş günü yazılı kabul
4. Rapor teslim kanalı: Email + GitHub issue

**Test:** N/A (process document)

---

### TASK-17: Git Conventions & Workflow
**System:** DevOps
**Source:** A2
**Dependencies:** None
**Phase:** Phase 1

**Implementation Steps:**
1. Create `CONTRIBUTING.md`:
```markdown
## Branch Naming
- feature/PHASE-X-description
- fix/PHASE-X-description
- hotfix/description

## Commit Message Format
feat(module): description
fix(module): description
docs(module): description
test(module): description

## PR Process (trunk-based)
1. Create feature branch from main
2. Keep branches short-lived (<2 days)
3. Self-review before merge (solo developer)
4. Squash merge to main
```
2. Create `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`
3. Create `.github/pull_request_template.md`
4. Set up branch protection on `main`: require passing CI

**Test:** CI pipeline rejects commits without conventional format (commitlint).

---

### TASK-18: Security Incident Reporting
**System:** Process + Backend
**Source:** A5, A6, SECU-09
**Dependencies:** None
**Phase:** Phase 1

**Implementation Steps:**
1. Create `docs/security-incident-process.md`:
```markdown
## Güvenlik Olayı Bildirimi

### Bildirim Kanalı
- Email: security@endemigo.com (müşteri email)
- Acil: Telefon (sözleşmedeki telefon numarası)

### Bildirim Süresi
- Kritik (veri sızıntısı, yetkisiz erişim): 2 saat içinde
- Yüksek (güvenlik açığı tespiti): 24 saat içinde
- Normal (şüpheli aktivite): 48 saat içinde

### Bildirim İçeriği
- Ne oldu
- Ne zaman tespit edildi
- Etki analizi
- Alınan aksiyonlar
- Önerilen aksiyonlar
```
2. Backend: Sentry alert rules:
   - 5xx spike (>10/min) → Slack + email alert
   - Auth failure spike (>50/min) → Security alert
   - Payment failure → Immediate alert
3. No service account creation: Add to onboarding checklist, code review check

**Test:** SECU-09 — Document exists, Sentry alerts configured, test alert fires.

---

### TASK-19: App Store Preparation
**System:** Mobile + Process
**Source:** B13
**Dependencies:** All other phases complete
**Phase:** Phase 12

**Implementation Steps:**
1. **Privacy policy** (gizlilik politikası):
   - Turkish + English versions
   - KVKK compliant content
   - Host at `endemigo.com/privacy`
2. **App description** (uygulama açıklaması):
   - Turkish (primary) + English
   - Feature list, screenshots
   - Keywords for ASO
3. **Screenshots:**
   - 6.7" (iPhone 15 Pro Max) — 5 screenshots
   - 6.1" (iPhone 15) — 5 screenshots
   - Android Phone — 5 screenshots
   - Tablet (iPad) — 5 screenshots
4. **Age/content rating:** 12+ (financial transactions)
5. **EAS Submit config:**
```json
{
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./google-sa.json" }
    }
  }
}
```

**Test:** App Store Connect test submission passes validation.

---

### TASK-20: Environment Separation Strategy
**System:** DevOps
**Source:** Step 8 "staging vs prod"
**Dependencies:** Docker setup
**Phase:** Phase 1

**Implementation Steps:**
1. Create `docker-compose.dev.yml`, `docker-compose.staging.yml`, `docker-compose.prod.yml`
2. Environment config:
```
.env.development   → local DB, İyzico sandbox, fake email
.env.staging        → staging DB, İyzico sandbox, real email
.env.production     → prod DB, İyzico production, real email
```
3. Create `.env.example` with all required variables documented:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/endemigo
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# İyzico
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# OneSignal
ONESIGNAL_APP_ID=
ONESIGNAL_API_KEY=

# CloudFlare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Sentry
SENTRY_DSN=

# Email
EMAIL_PROVIDER=  # sendgrid | resend | ses
EMAIL_API_KEY=
EMAIL_FROM=noreply@endemigo.com
```
4. GitHub Actions: Separate staging and production workflows with different secret sets
5. Staging URL: `staging-api.endemigo.com` / `staging-admin.endemigo.com`

**Test:** Staging deploy works independently from production.

---

### TASK-21: Redis Connection Loss Handling
**System:** Backend
**Source:** Step 8 "backend ↔ Redis"
**Dependencies:** Redis setup
**Phase:** Phase 1

**Implementation Steps:**
1. ioredis config with retry:
```typescript
const redis = new Redis({
  retryStrategy: (times) => Math.min(times * 200, 5000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => err.message.includes('READONLY'),
});
```
2. Health check endpoint:
```typescript
@Get('health/redis')
async redisHealth() {
  try {
    await this.redis.ping();
    return { status: 'ok' };
  } catch {
    throw new ServiceUnavailableException('Redis down');
  }
}
```
3. Graceful degradation: If Redis down → auction bidding paused, cached data stale-while-revalidate
4. Alert: Sentry notification on Redis disconnect

**Test:** Kill Redis → API returns 503 for bid endpoints, health check fails, Sentry alert fires. Restart Redis → auto-recovery.

---

### TASK-22: R2 Upload Failure Handling
**System:** Backend
**Source:** Step 8 "backend ↔ CloudFlare R2"
**Dependencies:** R2 setup
**Phase:** Phase 3

**Implementation Steps:**
1. Upload service with retry:
```typescript
async uploadImage(file: Buffer, key: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: 'image/webp',
      }));
      return `${this.cdnUrl}/${key}`;
    } catch (e) {
      if (i === retries - 1) throw new ServiceUnavailableException('Image upload failed');
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // backoff
    }
  }
}
```
2. If 3 retries fail → save to local disk + enqueue BullMQ retry job
3. Product creation doesn't fail if image upload fails — images flagged as `pending_upload`

**Test:** Mock R2 failure → 3 retries → BullMQ job created → eventual upload succeeds.

---

## SUMMARY TABLE

| Task | System | Priority | Phase | Dependencies | Test |
|------|--------|----------|-------|-------------|------|
| TASK-01 | Backend | 🔴 Critical | Pre-5 | None | AUCT-08 |
| TASK-02 | Backend+Mobile | 🔴 Critical | 5 | TASK-01 | CONC-04 |
| TASK-03 | Backend | 🔴 Critical | 5 | Redis | CONC-06 |
| TASK-04 | Backend | 🔴 Critical | 6 | Wallet base | RELY-05, TEST-49 |
| TASK-05 | Backend | 🔴 Critical | 7 | Order entity | CONC-03 |
| TASK-06 | Backend | 🔴 Critical | 6 | TASK-04 | CONC-02 |
| TASK-07 | Backend+Mobile | 🟡 High | 5 | Socket.IO | Contract test |
| TASK-08 | Backend | 🟡 High | 6 | TASK-04, TASK-01 | PAY-02 |
| TASK-09 | Backend | 🟡 High | 6 | TASK-08 | PAY-05 |
| TASK-10 | Backend | 🟡 High | 6 | TASK-04 | TEST-49 |
| TASK-11 | Backend | 🟡 High | 10 | User, Order, Wallet | TEST-52 |
| TASK-12 | Backend+Mobile | 🟡 High | 4 | Activity tracking | Personalization test |
| TASK-13 | Backend+Admin | 🟡 High | 10 | İyzico, Wallet | TEST-50 |
| TASK-14 | Backend | 🔵 Medium | 5 | TASK-03 | Crash recovery test |
| TASK-15 | Backend+Admin | 🔵 Medium | 11 | TASK-01 | Admin E2E |
| TASK-16 | Process | 🔵 Medium | 1 | None | N/A |
| TASK-17 | DevOps | 🔵 Medium | 1 | None | CI |
| TASK-18 | Process+Backend | 🔵 Medium | 1 | None | SECU-09 |
| TASK-19 | Mobile+Process | 🔵 Medium | 12 | All phases | Store validation |
| TASK-20 | DevOps | 🔵 Medium | 1 | Docker | Staging deploy |
| TASK-21 | Backend | 🔵 Medium | 1 | Redis | Health check |
| TASK-22 | Backend | 🔵 Medium | 3 | R2 | Upload retry |

**Total: 22 implementation tasks**
- 🔴 Critical: 6 (concurrency, financial integrity)
- 🟡 High: 7 (features, business logic)
- 🔵 Medium: 9 (process, infra, error handling)

---
*Created: 2026-04-07*
*All 42 audit gaps → 22 concrete implementation tasks*
*Zero abstract items remaining*
