# Pitfalls Research — Endemigo

## Critical Pitfalls

### 1. Müzayede Race Conditions ⚠️ CRITICAL
**Problem**: İki kullanıcı aynı anda aynı fiyata teklif verirse
**Prevention**: PostgreSQL `SELECT FOR UPDATE`, server-side timestamp, transaction SERIALIZABLE
**Phase**: 5 (Auction Engine)

### 2. Anti-Sniping Abuse ⚠️ HIGH
**Problem**: Son saniye uzatma süresiz müzayedeye dönüşebilir
**Prevention**: Max uzatma limiti, kademeli azaltma, rate limiting, bot detection
**Phase**: 5 (Auction Engine)

### 3. Escrow Deadlock ⚠️ HIGH
**Problem**: Ne alıcı onay verir ne satıcı gönderir → para sonsuza kadar bloke
**Prevention**: Süre bazlı otomatik onay, admin müdahale, escalation flow
**Phase**: 6-7 (Payment & Order)

### 4. WebSocket Scaling ⚠️ MEDIUM
**Problem**: Tek instance 10K kullanıcıyı kaldıramaz
**Prevention**: Redis adapter, connection pooling, heartbeat, sticky sessions
**Phase**: 5 (Auction Engine)

### 5. Payment Webhook Idempotency ⚠️ HIGH
**Problem**: Aynı webhook birden fazla gelir → duplicate order
**Prevention**: Idempotency key, unique constraint on payment ref, state machine
**Phase**: 6 (Payment)

### 6. Cüzdan Bakiye Tutarsızlığı ⚠️ HIGH
**Problem**: Bloke bakiye düzgün çözülmez
**Prevention**: Double-entry bookkeeping, DB transactions, reconciliation cron, audit log
**Phase**: 6 (Wallet)

### 7. Image Upload Vulnerability ⚠️ MEDIUM
**Problem**: Büyük/kötü amaçlı dosya upload
**Prevention**: Size limit, magic bytes validation, image processing pipeline, CDN serve
**Phase**: 3 (Product)

### 8. "Fiyat Sor" Platform Bypass ⚠️ MEDIUM
**Problem**: Kullanıcılar platform dışında anlaşır
**Prevention**: Content filtering (tel/email/URL), otomatik uyarı, hesap kısıtlama
**Phase**: 9 (Fiyat Sor)

### 9. Mobile Performance ⚠️ MEDIUM
**Problem**: Büyük liste render, animasyon kasması
**Prevention**: FlashList, image lazy loading, memoization, pagination
**Phase**: Tüm mobile fazlar

### 10. KVKK Compliance ⚠️ MEDIUM
**Problem**: Açık rıza eksikliği, veri silme çalışmaz
**Prevention**: Zorunlu onay checkbox, silme/anonimleştirme API, privacy policy
**Phase**: 1-2 (Auth & User)

## Risk Matrix

| Phase | Risk | Key Pitfalls |
|-------|------|-------------|
| 1-2 | Low | KVKK, token mgmt |
| 3 | Medium | Image security |
| 4 | Low | Query perf |
| 5 | **CRITICAL** | Race conditions, anti-sniping, WebSocket |
| 6 | **HIGH** | Escrow, webhook, balance |
| 7 | High | State machine, timeouts |
| 8 | Low | Push delivery |
| 9 | Medium | Platform bypass |
| 10 | Medium | Commission calc |
| 11 | Low | Large dataset perf |
| 12 | High | Load test, store approval |
