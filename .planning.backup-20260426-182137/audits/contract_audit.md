# Contract vs Plan — Critical Audit

**Date:** 2026-04-07
**Auditor:** Self-audit before Phase 1
**Method:** Line-by-line comparison of `sozlesme.md` (566 lines) against `REQUIREMENTS.md` (177 requirements) and `ROADMAP.md` (12 phases)

> [!IMPORTANT]
> Legend: 🔴 MISSING — not in plan at all | 🟡 UNDER-SPECIFIED — exists but lacks detail | 🟠 RISK — covered but has implementation risk

---

## 1. Real-Time Auction System

### 🟡 AUCT-06: Anti-sniping lacks max extension limit
**Contract §5:** "Müzayede bitimine 60 saniye veya daha az kala gelen tekliflerde süre otomatik uzatılır"
**Plan says:** "son 60 saniye kala teklif verilirse süre uzar"
**Gap:** No cap on extensions. A bot could extend indefinitely.
**Fix:** Add `AUCT-11: Anti-sniping maximum uzatma sayısı limiti (örn: max 10 uzatma, her uzatma 60→45→30sn kademeli azalma)`

### 🟡 AUCT-T-03: "2-3 dakika" extension is vague
**Contract §5:** "Süre sonunda hızlı üst üste ve çok pey verilmesi halinde süre otomatik olarak 2-3 dakika arttırılabilir"
**Plan says:** "Süre sonunda hızlı üst üste teklif gelirse süre 2-3 dakika uzar"
**Gap:** Same vague language as contract. Need exact rules: how many bids in what time window triggers the extension? Is it 2 or 3 minutes? Can it extend more than once?
**Fix:** Define concrete trigger: e.g., `≥3 bids within final 60 seconds → extend 2 minutes, max 3 extensions`

### 🔴 MISSING: Minimum bid increment validation
**Contract §5:** Implies structured bidding
**Plan says:** AUCT-01 mentions "min artış" but no validation requirement
**Fix:** Add `AUCT-12: Minimum teklif artış miktarı system-enforced (satıcı tanımlar, sistem kontrol eder)`

### 🔴 MISSING: Auction room capacity / participant limit
**Contract:** Not mentioned but critical at scale
**Gap:** With 10K concurrent users, what happens if 5000 users join one auction room?
**Fix:** Add `AUCT-13: Müzayede odası katılımcı kapasitesi tanımlanır ve izlenir`

### 🟡 UNDER-SPECIFIED: Server-authoritative time
**Contract §5:** "zaman damgası" referenced
**Plan:** PITFALLS.md mentions it but no formal requirement
**Fix:** Add `AUCT-14: Tüm müzayede zamanlama server-side — client timestamp asla kullanılmaz`

### 🟡 UNDER-SPECIFIED: What happens when auction ends with no bids?
**Contract:** Not specified
**Plan:** No requirement
**Fix:** Add `AUCT-15: Müzayede teklif almadan biterse otomatik "tamamlanamamış" durumuna geçer`

---

## 2. Wallet & Escrow Logic

### 🟡 WALL-02/03: Bloke/çözme edge cases under-specified
**Contract §4:** "Teklif sırasında bakiye blokesi, işlem sonunda otomatik çözüm"
**Gap:** What if user has multiple active bids? What if outbid — does block release immediately or after auction ends? What if user wins but has insufficent balance (already spent elsewhere)?
**Fix:** Add:
- `WALL-10: Kullanıcı aynı anda birden fazla müzayedede bloke bakiye tutabilir (kümülatif bloke)`
- `WALL-11: Teklif aşıldığında (outbid) bloke bakiye derhal çözülür`
- `WALL-12: Kazanan kullanıcının bakiyesi satın alma anında yetersizse 24 saat süre verilir; aksi halde sıradaki teklif sahibine geçilir`

### 🔴 MISSING: Wallet "shadow of bank" design
**Contract §4:** "Sistem banka onayı yani bankaya geçen para üzerinden çalışır. Banka hesap hareketinin kullanıcı açısından gölgesi niteliğindedir. O sebeple banka entegrasyonu öncesinde tasarımı yapılmalıdır."
**Plan:** No mention of this bank-shadow (gölge) architecture
**Fix:** Add `WALL-13: Cüzdan sistemi banka hesap hareketinin gölgesi olarak tasarlanır — her cüzdan işlemi bir banka işlemini yansıtır`

### 🟡 UNDER-SPECIFIED: Revenue model details
**Contract §4:** "Satış komisyonları, işlem kesintileri, reklam-üyelik ödemeleri vb."
**Plan:** WALL-09 says "Platform komisyonu otomatik hesaplanır" but no detail
**Gap:** Commission rate configurable? Per-category? Fixed vs percentage? Admin-adjustable?
**Fix:** Add `WALL-14: Komisyon oranları admin panelinden kategori/satıcı bazlı yapılandırılabilir (sabit/yüzde/karma)`

### 🟡 UNDER-SPECIFIED: Escrow timing
**Contract §6:** "Belirlenen süre içinde onay verilmezse sistem otomatik onay"
**Plan:** ORDR-04 says "otomatik onaylar" but no time values
**Fix:** Specify concrete defaults: `Ödeme 24h, gönderim 3 gün, teslim onayı 5 gün` — admin-adjustable

### 🔴 MISSING: "Fiyat Sor" revenue tracking as separate category
**Contract §15:** "Fiyat Sor modu ile gerçekleşen satışlar, sipariş ve finansal raporlamalarda ayrı bir kategori altında izlenebilir"
**Plan:** No specific requirement for separate financial tracking
**Fix:** Add `ASKP-09: Fiyat Sor satışları, sipariş ve finansal raporlarda ayrı kategori olarak izlenir`

---

## 3. Concurrency & Race Conditions

### 🟡 UNDER-SPECIFIED: Transaction isolation level
**Plan:** RELY-01 says "TypeORM transaction" but no isolation level
**Gap:** Default PostgreSQL isolation is READ COMMITTED. For bid processing, need SERIALIZABLE or explicit SELECT FOR UPDATE.
**Fix:** Specify: `RELY-01 ek: Müzayede teklif transaction'ları SERIALIZABLE isolation veya SELECT FOR UPDATE pattern ile çalışır`

### 🔴 MISSING: Concurrent wallet operations
**Gap:** User wins two auctions at ~same time. Both try to deduct from wallet. Without proper locking, balance could go negative.
**Fix:** Add `RELY-21: Cüzdan bakiye işlemleri row-level lock ile serialize edilir — concurrent deductions yarış koşuluna girmez`

### 🟡 UNDER-SPECIFIED: WebSocket message ordering
**Gap:** Under high load, bid updates may arrive out of order on client
**Fix:** Add `RELY-22: Broadcast mesajları sequence number içerir; client tarafında out-of-order mesajlar düzeltilir`

### 🔴 MISSING: Bid sequence guarantee
**Contract §5:** "İlk gelen kazanır (timestamp + kuyruk sırası)"
**Plan:** AUCT-07 mentions this but no implementation guarantee
**Gap:** How is "first" determined across multiple server instances?
**Fix:** Ensure RELY-02 specifies: `Teklif sırası PostgreSQL transaction anında aldığı timestamp ile belirlenir (application-level timestamp değil DB-level)`

---

## 4. Security Requirements

### 🔴 MISSING: "Fiyat Sor" IP/user ban mechanism
**Contract §15:** "kullanıcıların kurallara uymadığı tespit edildiğinde üyelikleri ip check, kullanıcı bilgileri vb benzeri yöntemler üzerinden iptal edilir"
**Plan:** ASKP-04 mentions "tespiti" but no enforcement mechanism
**Fix:** Add:
- `ASKP-10: Kural ihlali tespit edilen kullanıcılar IP + cihaz ID bazlı otomatik sınırlandırılır`
- `ASKP-11: Ban edilen kullanıcının yeni hesap açması IP/cihaz kontrolü ile engellenir`

### 🔴 MISSING: Hard-coded credentials prohibition
**Contract §11:** "bilerek backdoor, gizli erişim, hard-coded credential, kötü amaçlı kod... eklemeyecektir"
**Plan:** No specific requirement
**Fix:** Add `SECU-06: Kaynak kodda hard-coded credential, API key, secret bulunmaz — tümü environment variable ile yönetilir`

### 🔴 MISSING: Multi-account detection
**Contract §9 (Trust):** "çoklu hesap kullanımı" detection
**Plan:** TRST-03 mentions "şüpheli davranış" but multi-account not explicit
**Fix:** Add `TRST-04: Aynı IP/cihaz/telefon numarasından birden fazla hesap tespit edilir ve işaretlenir`

### 🟡 UNDER-SPECIFIED: Admin action authorization
**Contract §11:** "Proje sahibinin hesabı veya projeye bağlı hizmetlerde yeni yönetici/servis hesapları oluşturmayacaktır"
**Plan:** ADMN-11 says "RBAC" but doesn't specify admin creation flow
**Fix:** Clarify: super admin can create admin accounts, regular admins cannot

---

## 5. Integration Points

### 🔴 MISSING: Kargo API in v1 scope ambiguity
**Contract Module 21:** "Kargo API entegrasyonu. Sipariş bazlı takip numarası üretimi, kullanıcıya anlık kargo durumu bildirimi" — Status: "Var"
**Plan:** Moved to v2 (KARG-01)
**Gap:** Contract marks it as "Var" (required), but user decision was to defer. This is a contractual risk.
**Fix:** Get written confirmation from client that kargo is deferred. Otherwise it's a breach.

> [!WARNING]
> Contract Module 21 explicitly lists Kargo Entegrasyonu as "Var" (included). Moving it to v2 without written client agreement could be considered a scope reduction.

### 🟡 UNDER-SPECIFIED: PayTR vs İyzico decision timing
**Contract Module 15:** "PayTR veya İyzico"
**Plan:** Says "TBD"
**Gap:** This decision affects Phase 6 development. Need to decide before Phase 5 ends.
**Fix:** Add decision milestone: `Phase 5 sonunda PayTR/İyzico kararı verilir`

### 🔴 MISSING: OneSignal error handling
**Plan:** Uses OneSignal for push but no fallback or failure handling
**Fix:** Already partially covered by RELY-12 (circuit breaker). Add: `NOTF-07: Push bildirim gönderim başarısızlığında retry ve fallback (in-app bildirim)`

### 🟡 UNDER-SPECIFIED: CDN provider not specified
**Contract §10:** "CDN tabanlı dağıtım altyapısı"
**Plan:** PROD-03 says "CDN üzerinden sunulur" but which CDN?
**Fix:** Decision needed: CloudFlare R2, AWS S3+CloudFront, or DigitalOcean Spaces

### 🔴 MISSING: Email service for verification/password reset
**Plan:** AUTH-02 and AUTH-03 require email but no email service integration specified
**Fix:** Add `INFR-05: Email servisi entegrasyonu (SendGrid, Resend, veya AWS SES) — doğrulama ve şifre sıfırlama için`

---

## 6. Testing Requirements

### 🟡 UNDER-SPECIFIED: Concurrent bid stress test details
**Plan:** TEST-43 says "yoğun teklif trafiği stres testi" but no numbers
**Fix:** Specify: `1000 concurrent bids in 10 seconds on single auction — all processed correctly, no duplicates, no lost bids`

### 🔴 MISSING: Escrow timeout test
**Gap:** No test for auto-approval timer
**Fix:** Add `TEST-46: Escrow otomatik onay zamanlayıcısı testi — süre dolunca ödeme satıcıya aktarılır`

### 🔴 MISSING: Multi-device session test
**Gap:** User logged in on 2 devices, bids from both — consistency?
**Fix:** Add `TEST-47: Aynı kullanıcının birden fazla cihazdan eş zamanlı teklif verme testi`

### 🟡 UNDER-SPECIFIED: Admin panel doesn't have E2E test
**Plan:** TEST-25-27 only covers mobile E2E
**Fix:** Add `TEST-48: Admin panel E2E — giriş → kullanıcı yönetimi → müzayede yönetimi → sipariş izleme akışı`

### 🔴 MISSING: Wallet reconciliation test
**Gap:** Critical for financial integrity
**Fix:** Add `TEST-49: Cüzdan bakiye tutarlılık testi — tüm debit/credit toplamları sıfıra eşit (double-entry doğrulama)`

### 🟡 UNDER-SPECIFIED: Biweekly progress report mechanism
**Contract §17:** "Her iki haftada bir Müşteri'ye ilerleme raporu sunulur"
**Plan:** No tracking mechanism
**Fix:** Not a code requirement but add to project management process

---

## Summary Table

| Area | 🔴 Missing | 🟡 Under-specified | 🟠 Risk | Total |
|------|-----------|-------------------|---------|-------|
| Real-Time Auction | 3 | 3 | 0 | **6** |
| Wallet & Escrow | 3 | 3 | 0 | **6** |
| Concurrency | 2 | 2 | 0 | **4** |
| Security | 3 | 1 | 0 | **4** |
| Integration Points | 3 | 2 | 0 | **5** |
| Testing | 3 | 3 | 0 | **6** |
| **Total** | **17** | **14** | **0** | **31** |

---

## Recommended New Requirements

If all gaps are addressed, the following requirements should be added:

| ID | Description | Phase |
|----|-------------|-------|
| AUCT-11 | Anti-sniping max uzatma limiti | 5 |
| AUCT-12 | Min teklif artış validation (system-enforced) | 5 |
| AUCT-13 | Müzayede odası katılımcı kapasitesi | 5 |
| AUCT-14 | Server-authoritative timestamp | 5 |
| AUCT-15 | Teklif almayan müzayede durumu | 5 |
| WALL-10 | Kümülatif bloke bakiye (çoklu müzayede) | 6 |
| WALL-11 | Outbid anında bloke çözme | 6 |
| WALL-12 | Kazanan bakiye yetersizliği grace period | 6 |
| WALL-13 | Banka gölgesi (shadow) cüzdan tasarımı | 6 |
| WALL-14 | Komisyon oranları admin-configurable | 6 |
| ASKP-09 | Fiyat Sor ayrı finansal raporlama | 9 |
| ASKP-10 | IP/cihaz bazlı ban mekanizması | 9 |
| ASKP-11 | Ban edilen kullanıcı yeni hesap engeli | 9 |
| SECU-06 | Hard-coded credential yasağı (env vars) | 1 |
| TRST-04 | Çoklu hesap tespiti (IP/cihaz/telefon) | 10 |
| RELY-21 | Cüzdan row-level lock | 6 |
| RELY-22 | WebSocket mesaj sıralama (sequence number) | 5 |
| NOTF-07 | Push bildirim retry + fallback | 8 |
| INFR-05 | Email servisi entegrasyonu | 1 |
| TEST-46 | Escrow otomatik onay timer testi | 12 |
| TEST-47 | Multi-device concurrent bid testi | 12 |
| TEST-48 | Admin panel E2E testi | 12 |
| TEST-49 | Cüzdan bakiye reconciliation testi | 12 |

> [!CAUTION]
> **Kargo Entegrasyonu (Module 21)**: Contract marks it as "Var" (included in scope). Our plan defers it to v2. This is the **single biggest contractual risk**. Get written confirmation from client ASAP.

**If all 23 new requirements are added: 177 + 23 = 200 total requirements**
