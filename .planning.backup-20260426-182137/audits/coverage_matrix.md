# Contract Coverage Matrix — Endemigo

**Date:** 2026-04-07 | **Contract:** sozlesme.md (566 lines) | **Plan:** 200 requirements across 12 phases

> Legend: ✅ Fully Covered | ⚠️ Under-specified | ❌ Missing | 🔶 Partial

---

## 1. MOBILE APP

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 1.1 | §EK1-M1 | React Native (Expo) iOS + Android | ✅ | STACK.md, Phase 1 | Full | — | Low | TEST-31 |
| 1.2 | §EK1-M1 | Kullanıcı kayıt/giriş | ✅ | AUTH-01..06 | Full | — | Low | TEST-01, TEST-20, TEST-25 |
| 1.3 | §EK1-M1 | Profil yönetimi | ✅ | USER-01..04 | Full | — | Low | TEST-25 |
| 1.4 | §EK1-M1 | Ürün listeleme | ✅ | PROD-01..06 | Full | — | Low | TEST-33 |
| 1.5 | §EK1-M1 | Gelişmiş arama ve filtreleme | ✅ | SRCH-01..09 | Full | — | Low | TEST-33 |
| 1.6 | §EK1-M1 | Favoriler | ✅ | SRCH-09 | Full | — | Low | TEST-25 |
| 1.7 | §EK1-M1 | Sipariş geçmişi | ✅ | ORDR-06 | Full | — | Low | TEST-25 |
| 1.8 | §EK1-M2 | Canlı müzayede ekranı | ✅ | AUCT-01..05, MUIX | Full | — | High | TEST-11, TEST-26 |
| 1.9 | §EK1-M2 | Gerçek zamanlı teklif verme | ✅ | AUCT-02, AUCT-03 | Full | — | High | TEST-26, TEST-43 |
| 1.10 | §EK1-M2 | Geri sayım sayacı | ✅ | AUCT-04, AUCT-14 | Full | Server-authoritative ✅ | Med | TEST-11 |
| 1.11 | §EK1-M2 | Teklif geçmişi | ✅ | AUCT-05 | Full | — | Low | TEST-11 |
| 1.12 | §EK1-M2 | Kazanan bildirimi | ✅ | AUCT-09, NOTF-01 | Full | — | Low | TEST-26 |
| 1.13 | §12 | Profil menüsü yapısı | ✅ | MUIX-01..04 | Full | — | Low | TEST-14 |
| 1.14 | §12 | Hesabım ve Paketim | ✅ | MUIX-01 | Full | "Paketim" detayı yok | Low | TEST-14 |
| 1.15 | §12 | Alışveriş: siparişler, kazanımlar, cüzdan, kuponlar | ✅ | MUIX-01, ORDR-06, WALL-01 | Full | — | Low | TEST-14 |
| 1.16 | §12 | İlanlar ve Satış | ✅ | MUIX-01 | Full | — | Low | TEST-14 |
| 1.17 | §12 | Müzayede | ✅ | MUIX-01 | Full | — | Low | TEST-14 |
| 1.18 | §12 | Favoriler ve Değerlendirmeler | ✅ | MUIX-01, REVW-01..05 | Full | — | Low | TEST-14 |
| 1.19 | §12 | Mesajlar ve Bildirimler | ✅ | MUIX-01, NOTF-01..07 | Full | Mesajlar = Fiyat Sor only | Low | TEST-14 |
| 1.20 | §12 | Yardım ve Ayarlar | ⚠️ | MUIX-01 | Partial | Yardım/SSS içeriği belirsiz | Low | — |
| 1.21 | §12 | Cüzdan detaylı işlem geçmişi | ✅ | WALL-05 | Full | — | Low | TEST-13 |
| 1.22 | §12 | Hızlı aksiyonlar (ilan, müzayede, satıcı olma) | ✅ | MUIX-02 | Full | — | Low | TEST-14 |
| 1.23 | §12 | Nötr ve akış odaklı dil | ✅ | MUIX-03 | Full | Copywriting gerekecek | Low | — |
| 1.24 | §EK1-M3 | Satıcı kaydı ve profil yönetimi | ✅ | USER-02 | Full | — | Low | TEST-06 |
| 1.25 | §EK1-M3 | Satıcı ürün ekleme/düzenleme | ✅ | PROD-01, PROD-02 | Full | — | Low | TEST-27 |
| 1.26 | §EK1-M3 | Satıcı müzayede oluşturma | ✅ | AUCT-01, AUCT-T-01 | Full | — | Med | TEST-27 |
| 1.27 | §EK1-M3 | Satıcı sipariş ve stok takibi | ✅ | PROD-06, ORDR-06 | Full | — | Low | TEST-27 |
| 1.28 | — | Error Boundary (crash prevention) | ✅ | RELY-15 | Full | — | Med | — |
| 1.29 | — | Offline detection | ✅ | RELY-18 | Full | — | Med | — |
| 1.30 | — | Optimistic update rollback | ✅ | RELY-17 | Full | — | Med | — |

---

## 2. BACKEND

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 2.1 | §2-M6 | NestJS modüler mimari | ✅ | STACK.md, Phase 1 | Full | — | Low | — |
| 2.2 | §2-M6 | Swagger/OpenAPI dokümantasyonu | ✅ | INFR-03 | Full | — | Low | TEST-19 |
| 2.3 | §2-M5 | JWT kimlik doğrulama | ✅ | AUTH-05 | Full | — | Low | TEST-01, TEST-20 |
| 2.4 | §2-M5 | Refresh token mekanizması | ✅ | AUTH-04 | Full | — | Low | TEST-01 |
| 2.5 | §2-M5 | RBAC: kullanıcı, satıcı, admin | ✅ | AUTH-06 | Full | — | Low | TEST-01, TEST-40 |
| 2.6 | §2-M13 | PostgreSQL ilişkisel model | ✅ | STACK.md | Full | — | Low | — |
| 2.7 | §2-M13 | Foreign key, transaction yönetimi | ✅ | RELY-01..06 | Full | — | Med | TEST-16, TEST-17 |
| 2.8 | §2-M13 | Referential integrity | ✅ | RELY-01 | Full | — | Low | — |
| 2.9 | §2-M7 | Socket.IO WebSocket altyapısı | ✅ | AUCT-03 | Full | — | High | TEST-44 |
| 2.10 | §2-M7 | Müzayede room mimarisi | ✅ | AUCT-03, AUCT-13 | Full | Katılımcı limiti ✅ | High | TEST-43 |
| 2.11 | §2-M7 | Teklif broadcast, anlık fiyat güncelleme | ✅ | AUCT-03 | Full | — | High | TEST-43 |
| 2.12 | §2-M8 | Redis Pub/Sub yatay ölçekleme | ⚠️ | STACK.md | Partial | "Gerekli görülürse" — karar yok | Med | TEST-44 |
| 2.13 | §2-M9 | Anti-sniping (60sn) | ✅ | AUCT-06, AUCT-11 | Full | Max limit eklendi ✅ | High | TEST-29 |
| 2.14 | §2-M10 | Mesaj kuyruğu (RabbitMQ → BullMQ) | ✅ | STACK.md | Full | BullMQ kararı alındı | Low | RELY-10 |
| 2.15 | §2-M11 | Teklif rekabet koruması (timestamp + lock) | ✅ | AUCT-07, AUCT-14 | Full | DB-level timestamp ✅ | High | TEST-16 |
| 2.16 | §2-M12 | Müzayede durum makinesi | ✅ | AUCT-08, AUCT-15 | Full | No-bid durumu eklendi ✅ | Med | TEST-02, TEST-15 |
| 2.17 | §5-2.satır | Online süreli müzayede | ✅ | AUCT-T-01..04 | Full | 2-3dk → 2dk + max 3 uzatma ✅ | Med | TEST-02 |
| 2.18 | §5-son | Durum geçişleri zaman damgasıyla kayıt | ✅ | AUDT-01 | Full | — | Low | — |
| 2.19 | §5-son | Geçişler geri alınamaz | ✅ | RELY-04 | Full | State machine enforced | Med | TEST-02 |

### 2B. Wallet & Financial

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 2.20 | §4 | Kullanıcı bakiyesi, bloke, kullanılabilir | ✅ | WALL-01..03 | Full | — | Med | TEST-03 |
| 2.21 | §4 | Detaylı işlem geçmişi | ✅ | WALL-05 | Full | — | Low | TEST-13 |
| 2.22 | §4 | Teklif sırasında bakiye blokesi | ✅ | WALL-02, AUCT-10 | Full | — | High | TEST-07 |
| 2.23 | §4 | İşlem sonunda bloke çözümü | ✅ | WALL-03, WALL-11 | Full | Outbid anında çözme ✅ | High | TEST-07 |
| 2.24 | §4 | Banka gölgesi (shadow) tasarım | ✅ | WALL-13 | Full | Audit'te eklendi | Med | — |
| 2.25 | §4 | Escrow ödeme mantığı | ✅ | PAY-02, RELY-03 | Full | — | High | TEST-28 |
| 2.26 | §4 | Kullanıcı onayı veya otomatik onay | ✅ | ORDR-03, ORDR-04 | ⚠️ | Süre değerleri belirsiz | Med | TEST-46 |
| 2.27 | §4 | Satıcı bağımsız bakiye | ✅ | WALL-06 | Full | — | Med | TEST-03 |
| 2.28 | §4 | Satıcı para çekme (manuel onay) | ✅ | WALL-07, WALL-08 | Full | — | Med | — |
| 2.29 | §4 | Komisyon otomatik hesaplama | ✅ | WALL-09, WALL-14 | Full | Admin-configurable ✅ | Med | TEST-10 |
| 2.30 | §4 | Kümülatif bloke (çoklu müzayede) | ✅ | WALL-10 | Full | Audit'te eklendi | High | TEST-07 |
| 2.31 | §4 | Bakiye yetersizliği grace period | ✅ | WALL-12 | Full | 24 saat | Med | — |

### 2C. Order & Fulfillment

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 2.32 | §6 | Sipariş akışı: ödeme→hazırlık→gönderim→teslim→tamamlanma | ✅ | ORDR-01, ORDR-02 | Full | — | Med | TEST-04 |
| 2.33 | §6 | Kullanıcı teslim onayı | ✅ | ORDR-03 | Full | — | Low | TEST-28 |
| 2.34 | §6 | Otomatik onay (süre aşımı) | ✅ | ORDR-04 | ⚠️ | Süre değeri plan'da yok | Med | TEST-46 |
| 2.35 | §6-M17 | Ödeme yapılmazsa sıradaki teklif sahibi | ✅ | ORDR-05 | Full | Admin onaylı | Med | — |
| 2.36 | §6 | Nötr ve akış odaklı dil | ✅ | MUIX-03 | Full | Copywriting | Low | — |

### 2D. Ask Price

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 2.37 | §15 | Fiyat gizleyerek ilan | ✅ | ASKP-01 | Full | — | Low | TEST-30 |
| 2.38 | §15 | Kapalı devre mesajlaşma | ✅ | ASKP-02, ASKP-03 | Full | — | Med | TEST-09 |
| 2.39 | §15 | Mesajlar kayıt + platform dışı yönlendirme tespiti | ✅ | ASKP-04 | ⚠️ | Tespit mekanizması detayı yok | Med | — |
| 2.40 | §15 | Fiyat bildirimi → teklif → onay | ✅ | ASKP-05 | Full | — | Med | TEST-30 |
| 2.41 | §15 | Kabul → escrow otomatik | ✅ | ASKP-06 | Full | — | Med | TEST-30 |
| 2.42 | §15 | Teklif geçerlilik süresi | ✅ | ASKP-07 | Full | — | Low | — |
| 2.43 | §15 | Müzayede + Fiyat Sor eş zamanlı olamaz | ✅ | ASKP-08 | Full | — | Low | — |
| 2.44 | §15 | Ayrı finansal raporlama | ✅ | ASKP-09 | Full | Audit'te eklendi | Low | — |
| 2.45 | §15 | IP/cihaz bazlı ban | ✅ | ASKP-10, ASKP-11 | Full | Audit'te eklendi | Med | — |
| 2.46 | §15 | Müzayede modülünden bağımsız | ✅ | ASKP-08 | Full | — | Low | — |

---

## 3. ADMIN PANEL

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 3.1 | §EK1-M4 | Web tabanlı yönetim paneli | ✅ | Phase 11, STACK | Full | Vue 3 + PrimeVue | Low | TEST-34 |
| 3.2 | §EK1-M4 | Kullanıcı/satıcı yönetimi | ✅ | ADMN-01, ADMN-02 | Full | — | Low | TEST-48 |
| 3.3 | §EK1-M4 | Ürün yönetimi | ✅ | ADMN-03 | Full | — | Low | TEST-48 |
| 3.4 | §EK1-M4 | Müzayede yönetimi | ✅ | ADMN-04 | Full | — | Med | TEST-48 |
| 3.5 | §EK1-M4 | Sipariş/ödeme izleme | ✅ | ADMN-05 | Full | — | Low | TEST-48 |
| 3.6 | §EK1-M4 | Teklif geçmişi yönetimi | ✅ | ADMN-06 | Full | — | Low | — |
| 3.7 | §EK1-M4 | Platform geneli operasyonel ayarlar | ⚠️ | ADMN | Partial | Hangi ayarlar? Detay yok | Low | — |
| 3.8 | §11 | Gerçek zamanlı izleme | ⚠️ | ADMN-09, ADMN-12 | Partial | Real-time dashboard Socket.IO? | Med | — |
| 3.9 | §11 | Admin RBAC | ✅ | ADMN-11 | Full | — | Low | TEST-40 |
| 3.10 | §11 | İşlem hacmi, aktif müzayedeler, gelir grafikleri | ✅ | ADMN-09 | Full | — | Med | TEST-34 |
| 3.11 | §13 | Reklam kampanya yönetimi | ✅ | ADMN-07, ADS-05 | Full | — | Low | — |
| 3.12 | §13 | Reklam raporlama | ✅ | ADMN-07 | Full | — | Low | — |
| 3.13 | §13 | Reklam manuel onay | ✅ | ADS-05 | Full | — | Low | — |
| 3.14 | §14 | Kampanya/indirim yönetimi | ✅ | ADMN-08, CAMP-05 | Full | — | Low | — |
| 3.15 | §14 | Kampanya izleme ve raporlama | ✅ | ADMN-08 | Full | — | Low | — |
| 3.16 | — | Satıcı para çekme onay | ✅ | ADMN-10 | Full | — | Med | — |
| 3.17 | — | Yorum kaldırma | ✅ | REVW-06 | Full | — | Low | — |
| 3.18 | — | Audit log ekranı | ✅ | AUDT-07 | Full | — | Low | — |

---

## 4. INFRASTRUCTURE / DEVOPS

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 4.1 | §EK1-M27 | GitHub private repo | ✅ | §1, INFR | Full | — | Low | — |
| 4.2 | §EK1-M27 | CI/CD pipeline | ✅ | INFR-01 | Full | — | Med | — |
| 4.3 | §EK1-M27 | Staging + production ayrımı | ✅ | INFR-01 | Full | — | Med | — |
| 4.4 | §EK1-M25 | OTA güncelleme (Expo Updates) | ✅ | INFR-04 | Full | — | Low | — |
| 4.5 | §EK1-M26 | Sentry / error tracking | ✅ | INFR-02 | Full | — | Low | — |
| 4.6 | §EK1-M26 | Kritik hatalarda otomatik bildirim | ⚠️ | INFR-02 | Partial | Sentry alert kuralları tanımsız | Low | — |
| 4.7 | §1 | Branch yapısı, commit disiplini | ⚠️ | §1 | Partial | Git flow detayı plan'da yok | Low | — |
| 4.8 | §1 | Issue takibi, PR akışı | ⚠️ | §1 | Partial | İş akışı detayı yok | Low | — |
| 4.9 | — | Docker + Compose | ✅ | STACK.md | Full | — | Low | — |
| 4.10 | — | PM2 process management | ✅ | STACK.md | Full | — | Low | — |
| 4.11 | — | Reverse proxy (Nginx→Caddy) | ✅ | STACK.md | Full | Caddy önerildi | Low | — |
| 4.12 | — | Email servisi | ✅ | INFR-05 | Full | Auth mail için zorunlu | Med | — |

---

## 5. SECURITY / COMPLIANCE

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 5.1 | §16, M23 | HTTPS zorunluluğu | ✅ | SECU-01 | Full | — | Low | — |
| 5.2 | §16, M23 | API rate limiting | ✅ | SECU-02 | Full | NestJS throttler | Low | TEST-39 |
| 5.3 | §16, M23 | Input validation | ✅ | SECU-03 | Full | class-validator | Low | TEST-37 |
| 5.4 | §16, M23 | SQL injection koruması | ✅ | SECU-03 | Full | TypeORM parameterized | Low | TEST-37 |
| 5.5 | §16, M23 | XSS önleme | ✅ | SECU-04 | Full | — | Low | TEST-38 |
| 5.6 | §16, M23 | Hassas veri maskeleme | ✅ | SECU-04 | Full | — | Low | TEST-41 |
| 5.7 | §11 | Backdoor/gizli erişim yasağı | ✅ | SECU-06 | Full | Env vars enforced | Low | — |
| 5.8 | §11 | Hard-coded credential yasağı | ✅ | SECU-06 | Full | Audit'te eklendi | Low | — |
| 5.9 | §11 | Yeni admin/servis hesabı oluşturma yasağı | ⚠️ | — | Not explicit | Plan'da explicit yok | Low | — |
| 5.10 | §11 | Güvenlik açığı bildirimi | ⚠️ | — | Not explicit | Süreç tanımlı değil | Low | — |
| 5.11 | §EK1-M24 | KVKK açık rıza onayı | ✅ | USER-03, SECU-05 | Full | — | Med | — |
| 5.12 | §EK1-M24 | Veri silme/anonimleştirme | ✅ | USER-04 | Full | — | Med | — |
| 5.13 | §EK1-M24 | Veri işleme kaydı | ⚠️ | SECU-05 | Partial | Kayıt mekanizması detayı yok | Med | — |
| 5.14 | §9 | Güven sistemi | ✅ | TRST-01..04 | Full | Multi-account ✅ | Med | — |

---

## 6. INTEGRATIONS

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 6.1 | §EK1-M15 | PayTR veya İyzico entegrasyonu | ✅ | PAY-01 | ⚠️ | Hangisi? Karar verilmedi | Med | TEST-22 |
| 6.2 | §EK1-M15 | Webhook callback | ✅ | PAY-03, RELY-09 | Full | İdempotent ✅ | High | TEST-08, TEST-22 |
| 6.3 | §EK1-M15 | İade mekanizması | ✅ | PAY-05 | Full | — | Med | TEST-22 |
| 6.4 | §EK1-M18 | OneSignal push notification | ✅ | NOTF-01..07 | Full | Retry fallback ✅ | Med | — |
| 6.5 | §EK1-M21 | **Kargo API entegrasyonu** | ❌ | v2 (KARG-01) | **NOT COVERED** | **Kontrat "Var" diyor!** | **HIGH** | — |
| 6.6 | §EK1-M22 | Medya optimizasyon + CDN | ✅ | PROD-03 | ⚠️ | CDN provider seçilmedi | Med | — |
| 6.7 | §EK1-M8 | Redis Pub/Sub | ⚠️ | STACK.md | Partial | "Gerekli görülürse" | Med | TEST-44 |
| 6.8 | — | Email servisi (auth mail) | ✅ | INFR-05 | Full | Provider seçilmedi | Med | — |

---

## 7. TESTING

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 7.1 | §23 | Fonksiyonel testler | ✅ | TEST-28..30 | Full | — | Low | — |
| 7.2 | §23 | Güvenlik testleri | ✅ | TEST-37..41 | Full | — | Med | — |
| 7.3 | §23 | 10.000 eş zamanlı kullanıcı yük testi | ✅ | TEST-42 | Full | k6/Artillery | Med | — |
| 7.4 | §23 | Yük testi sonuçları rapor olarak teslim | ✅ | TEST-42 | Full | — | Low | — |
| 7.5 | §23 | Tüm modüller entegre ve çalışır hâlde | ✅ | Phase 12 SC1 | Full | — | Med | — |
| 7.6 | §17 | Her sprint/faz sonunda demo, test, düzeltme | ⚠️ | — | Not explicit | Sprint demo süreci tanımsız | Low | — |
| 7.7 | §17 | İki haftada bir ilerleme raporu | ⚠️ | — | Not explicit | Proje yönetimi tarafı | Low | — |
| 7.8 | §23 | App Store/Google Play teknik hazırlık | ⚠️ | Phase 12 | Partial | Gizlilik politikası, ekran görüntüleri detayı yok | Low | — |
| 7.9 | — | Unit test coverage hedefi | ✅ | Phase 12 SC5 | Full | Backend %80+, Mobile %70+ | Med | — |

---

## 8. DELIVERY / ACCEPTANCE

| # | Contract Ref | Clause Summary | Covered? | Plan Ref | Spec Level | Missing/Gap | Risk | Test |
|---|-------------|----------------|----------|----------|------------|-------------|------|------|
| 8.1 | §6 | Aşamalı teslim, yazılı onay | ⚠️ | — | Not explicit | Onay mekanizması plan'da yok | Med | — |
| 8.2 | §6 | 5 iş günü inceleme süresi | ⚠️ | — | Not explicit | Plan'da yok | Low | — |
| 8.3 | §4 | 5 dilim ödeme planı | ⚠️ | — | Not explicit | Ödeme-phase eşlemesi yok | Med | — |
| 8.4 | §7 | 15 revizyon hakkı | ⚠️ | — | Not explicit | Revizyon takip mekanizması yok | Low | — |
| 8.5 | §9 | Kaynak kod Müşteri GitHub'ında | ✅ | §1 | Full | — | Low | — |
| 8.6 | §9 | Teslimde tüm erişimler devri | ⚠️ | Phase 12 | Partial | Detay listesi yok | Low | — |
| 8.7 | §22 | API anahtarları, servis hesapları devri | ⚠️ | — | Not explicit | Handoff checklist yok | Med | — |
| 8.8 | §8 | 3 ay ücretsiz bug fix | ⚠️ | — | Not explicit | Bug tracking süreci tanımsız | Low | — |
| 8.9 | §23 | Gizlilik politikası hazırlığı | ⚠️ | — | Partial | Kullanıcı en son halledecek | Low | — |
| 8.10 | §10 | Gizlilik yükümlülüğü 3 yıl | ✅ | §10 | Full | Kontrat maddesi | Low | — |

---

## COVERAGE SUMMARY

| Grup | Toplam Madde | ✅ Full | ⚠️ Partial | ❌ Missing |
|------|-------------|---------|-----------|-----------|
| Mobile App | 30 | 29 | 1 | 0 |
| Backend | 46 | 42 | 4 | 0 |
| Admin Panel | 18 | 16 | 2 | 0 |
| Infrastructure | 12 | 9 | 3 | 0 |
| Security | 14 | 10 | 4 | 0 |
| Integrations | 8 | 5 | 2 | **1** |
| Testing | 9 | 6 | 3 | 0 |
| Delivery | 10 | 2 | 8 | 0 |
| **TOTAL** | **147** | **119 (81%)** | **27 (18%)** | **1 (1%)** |

---

## CRITICAL FINDINGS

### ❌ 1 Missing Item
| ID | Issue | Contract Ref | Action |
|----|-------|-------------|--------|
| 6.5 | **Kargo API Entegrasyonu** | §EK1-M21 ("Var") | Müşteriden yazılı onay al veya v1'e ekle |

### ⚠️ Top 10 Under-specified Items
| ID | Issue | Action Required |
|----|-------|----------------|
| 2.26/2.34 | Escrow otomatik onay **süre değerleri** yok | Somut değer belirle (örn: 5 iş günü) |
| 6.1 | PayTR vs İyzico **kararı** verilmedi | Phase 5 sonuna kadar karar ver |
| 6.6 | CDN provider seçilmedi | R2, S3+CloudFront ya da DO Spaces |
| 8.3 | Ödeme dilimi ↔ phase eşlemesi yok | 5 dilimi 12 faza maple |
| 8.7 | Handoff checklist yok | Teslim madde listesi oluştur |
| 8.8 | Bug fix süreci tanımsız | Issue template + SLA tanımla |
| 4.7 | Git branch stratejisi yok | GitFlow veya trunk-based karar ver |
| 3.8 | Admin real-time dashboard tekniği | Socket.IO mı polling mı? |
| 5.13 | KVKK veri işleme kaydı detayı | VERBİS kayıt formatı |
| 7.7 | Biweekly rapor formatı | Template oluştur |
