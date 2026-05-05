# Roadmap: Endemigo

**Created:** 2026-04-07
**Phases:** 12
**Requirements:** 200 (126 functional + 22 reliability + 3 concurrency + 49 test)
**Granularity:** Fine (kontratın 12 haftalık planına uygun)

## Milestone 1: Endemigo v1 — Hibrit E-Ticaret Platformu

---

### Phase 1: Proje Altyapısı & Authentication
**Goal:** Proje yapısını kurmak, veritabanı mimarisini oluşturmak ve kimlik doğrulama sistemini çalışır hale getirmek.
**UI hint:** yes
**Kontrat Haftası:** Hafta 1

**Requirements:** AUTH-01..06, SECU-01..06, RELY-01, RELY-05..08, RELY-13..16, RELY-18..19, AUDT-01 (audit log altyapısı), INFR-05

**Success Criteria:**
1. NestJS backend projesi modüler yapıda çalışıyor
2. PostgreSQL veritabanı bağlantısı ve migration sistemi hazır (up/down rollback desteği)
3. Redis bağlantısı aktif
4. JWT + refresh token ile kayıt/giriş/çıkış çalışıyor
5. RBAC guard sistemi (kullanıcı/satıcı/admin) aktif
6. React Native (Expo) projesi oluşturulmuş ve navigasyon yapısı hazır
7. Vue.js admin panel projesi oluşturulmuş
8. Swagger/OpenAPI aktif
9. Global exception filter aktif — tüm hatalar yakalanr, loglanır
10. TypeORM transaction wrapper hazır (reusable transaction pattern)
11. Double-entry bookkeeping altyapısı hazır
12. React Native Error Boundary ve API error handling aktif
13. Network connectivity kontrolü ve offline state yönetimi
14. TanStack Query retry config kurulmuş
15. DB connection pool monitoring aktif
16. Graceful shutdown mekanizması çalışıyor

**Depends on:** —

---

### Phase 2: Kullanıcı & Satıcı Yönetimi
**Goal:** Kullanıcı profil yönetimi, satıcı kaydı ve KVKK uyumlu kullanıcı akışlarını tamamlamak.
**UI hint:** yes
**Kontrat Haftası:** Hafta 2-3

**Requirements:** USER-01, USER-02, USER-03, USER-04

**Success Criteria:**
1. Kullanıcı profil bilgilerini düzenleyebilir
2. Kullanıcı satıcı hesabına geçiş yapabilir
3. KVKK onay akışı çalışıyor
4. Hesap silme/anonimleştirme çalışıyor

**Depends on:** Phase 1

---

### Phase 3: Ürün & Kategori Sistemi
**Goal:** Satıcıların ürün ekleyebildiği, görsellerin optimize edildiği ve kategori yapısının kurulduğu tam ürün yönetim sistemini oluşturmak.
**UI hint:** yes
**Kontrat Haftası:** Hafta 3-4

**Requirements:** PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06

**Success Criteria:**
1. Satıcı ürün ekleyebilir (başlık, açıklama, görseller, fiyat, kategori)
2. Ürün görselleri optimize edilerek CDN üzerinden sunuluyor
3. Kategori/alt kategori sistemi çalışıyor
4. Ürün detay sayfası tüm bilgileri gösteriyor
5. Stok takip sistemi çalışıyor

**Depends on:** Phase 2

---

### Phase 4: Arama & Keşif Sistemi
**Goal:** Üç modlu arama sistemi, filtreleme, sıralama ve favoriler sistemi.
**UI hint:** yes
**Kontrat Haftası:** Hafta 4

**Requirements:** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, SRCH-09

**Success Criteria:**
1. Sadece satıştaki ürünlerde arama çalışıyor
2. Sadece müzayedelerde arama çalışıyor (aktif/gelecek/bitmiş)
3. Tüm platformda birleşik arama çalışıyor
4. Fiyat, tarih, favori, kategori, müzayede durumu filtreleme aktif
5. Favorilere ekleme/çıkarma çalışıyor

**Depends on:** Phase 3

---

### Phase 5: Müzayede Motoru
**Goal:** Gerçek zamanlı ve online süreli müzayede motorlarını, anti-sniping mekanizmasını ve teklif rekabet korumasını tam çalışır hale getirmek. Projenin en kritik fazı.
**UI hint:** yes
**Kontrat Haftası:** Hafta 5-6

**Requirements:** AUCT-01..15, AUCT-T-01..04, RELY-02, RELY-10, RELY-11, RELY-17, RELY-20, RELY-22

**Success Criteria:**
1. Gerçek zamanlı müzayede oluşturulabilir ve teklif verilebilir
2. Socket.IO ile tüm teklifler anlık broadcast ediliyor
3. Geri sayım sayacı gerçek zamanlı
4. Anti-sniping: son 60 sn teklif → süre uzar
5. Aynı fiyata teklifler timestamp ile sıralanır (DB transaction lock)
6. Durum makinesi çalışıyor (taslak → yayında → aktif → bitti → tamamlandı → iptal)
7. Online süreli müzayede otomatik kapanıyor
8. Teklif sırasında bakiye bloke ediliyor

**Depends on:** Phase 3, Phase 4

---

### Phase 6: Dijital Cüzdan & Ödeme Sistemi
**Goal:** Dijital cüzdan, escrow ödeme akışı ve PayTR/İyzico entegrasyonu.
**UI hint:** yes
**Kontrat Haftası:** Hafta 6-7

**Requirements:** WALL-01..14, PAY-01..05, RELY-03, RELY-09, RELY-12, RELY-21

**Success Criteria:**
1. Kullanıcı cüzdanında bakiye (toplam, bloke, kullanılabilir) görünür
2. Cüzdana para yükleme çalışıyor
3. Müzayede teklif bakiyesi bloke/çözme çalışıyor
4. PayTR/İyzico webhook ile ödeme onayı alınıyor
5. Escrow mekanizması: ödeme → beklet → onay → satıcıya aktar
6. Satıcı bakiye ve para çekme talebi çalışıyor
7. Platform komisyonu otomatik hesaplanıyor
8. İade mekanizması çalışıyor

**Depends on:** Phase 5

---

### Phase 7: Sipariş Yönetimi
**Goal:** Uçtan uca sipariş akışı, otomatik onay mekanizması ve iade/uyuşmazlık yönetimi.
**UI hint:** yes
**Kontrat Haftası:** Hafta 7

**Requirements:** ORDR-01, ORDR-02, ORDR-03, ORDR-04, ORDR-05, ORDR-06, RELY-04, REVW-01, REVW-02, REVW-03, REVW-04, REVW-05

**Success Criteria:**
1. Müzayede veya doğrudan satış sonrası sipariş oluşuyor
2. Sipariş ödeme → hazırlık → gönderim → teslim → tamamlanma akışı çalışıyor
3. Kullanıcı teslim onayı verebiliyor
4. Otomatik onay (süre aşımı) mekanizması çalışıyor
5. Ödeme yapılmazsa sıradaki teklif sahibine geçiş çalışıyor
6. Alıcı sipariş sonrası ürüne ve satıcıya puan + yorum verebiliyor
7. Değerlendirmeler ürün detay ve satıcı profilinde görünüyor

**Depends on:** Phase 6

---

### Phase 8: Bildirim Sistemi & Mobil UI
**Goal:** OneSignal push bildirim entegrasyonu, uygulama içi bildirimler ve tüm mobil UI ekranlarının tamamlanması.
**UI hint:** yes
**Kontrat Haftası:** Hafta 8

**Requirements:** NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, MUIX-01, MUIX-02, MUIX-03, MUIX-04

**Success Criteria:**
1. Teklifin geçilmesi, müzayede bitişi, sipariş durumu için push bildirim çalışıyor
2. Uygulama içi bildirimler gösteriliyor
3. Bildirim tercih yönetimi çalışıyor
4. Profil menüsü tam (hesabım, siparişler, cüzdan, ilanlar, müzayede, favoriler, mesajlar, ayarlar)
5. Hızlı aksiyonlar profilde görünür

**Depends on:** Phase 7

---

### Phase 9: Fiyat Sor & Kapalı Devre Pazarlık
**Goal:** Fiyat gizleyerek ilan verme, kapalı mesajlaşma, teklif ve otomatik escrow yönlendirme sistemi.
**UI hint:** yes
**Kontrat Haftası:** Hafta 8-9

**Requirements:** ASKP-01, ASKP-02, ASKP-03, ASKP-04, ASKP-05, ASKP-06, ASKP-07, ASKP-08

**Success Criteria:**
1. Satıcı "Fiyat Sor" modunda ilan verebiliyor
2. Alıcı kapalı devre mesajlaşma başlatabiliyor
3. Mesajlar sadece alıcı ve satıcıya görünür
4. Platform dışı yönlendirme tespiti çalışıyor
5. Fiyat teklifi → kabul → escrow otomatik akışı çalışıyor
6. Teklif geçerlilik süresi tanımlanabiliyor

**Depends on:** Phase 6, Phase 8

---

### Phase 10: Kampanya, İndirim & Reklam Sistemi
**Goal:** Satıcı/platform bazlı kampanyalar, kupon sistemi, satıcı reklam paketleri ve güven sistemi.
**UI hint:** yes
**Kontrat Haftası:** Hafta 9

**Requirements:** CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, ADS-01, ADS-02, ADS-03, ADS-04, ADS-05, ADS-06, TRST-01, TRST-02, TRST-03

**Success Criteria:**
1. Satıcı ürünlerine indirim tanımlayabilir
2. Kupon oluşturma ve kullanma çalışıyor
3. Zaman kısıtlı kampanya sistemi çalışıyor
4. Admin platform geneli kampanya oluşturabiliyor
5. Satıcı reklam paketleri (arama, kategori, banner) satın alabiliyor
6. Reklam yayını admin onayına tabi
7. Güven puanlama sistemi aktif

**Depends on:** Phase 6, Phase 8

---

### Phase 11: Admin Panel
**Goal:** Vue.js ile tam kapsamlı yönetim paneli: kullanıcı, satıcı, ürün, müzayede, sipariş, ödeme, reklam, kampanya yönetimi ve dashboard.
**UI hint:** yes
**Kontrat Haftası:** Hafta 9-10

**Requirements:** ADMN-01..12, REVW-06, REVW-07, AUDT-07

**Success Criteria:**
1. Admin dashboard ile işlem hacmi, aktif müzayedeler, gelir grafikleri görünür
2. Kullanıcı/satıcı listeleme, düzenleme, askıya alma çalışıyor
3. Ürün ve müzayede yönetimi (listeleme, iptal, durum değiştirme)
4. Sipariş ve ödeme izleme çalışıyor
5. Reklam kampanya yönetimi ve raporlama
6. Satıcı para çekme talepleri onay akışı
7. RBAC ile admin erişim kontrolü
8. Uygunsuz yorumları kaldırma çalışıyor
9. Audit log görüntüleme ve filtreleme ekranı aktif

**Depends on:** Phase 10

---

### Phase 12: Entegrasyon, Test & Yayın
**Goal:** Frontend-backend tam entegrasyon, kapsamlı test süiti (unit, integration, E2E, security, load), OTA güncelleme, App Store/Google Play hazırlık ve canlıya alma.
**UI hint:** no
**Kontrat Haftası:** Hafta 10-12

**Requirements:** INFR-01, INFR-02, INFR-03, INFR-04, TEST-19..22, TEST-23..24, TEST-25..27, TEST-28..30, TEST-31..34, TEST-37..41, TEST-42..45

**Test Strategy:**

| Test Türü | Kapsam | Araç | Faz |
|-----------|--------|------|-----|
| Unit Test | Service logic, guards, pipes | Jest | Her faz (1-11) |
| Integration Test | Modüller arası veri akışı | Jest + Supertest | Faz 5-10 |
| Component Test | React Native bileşenler | React Native Testing Library | Faz 8 |
| Service Test | NestJS service layer | Jest + TypeORM mock | Faz 5-7 |
| API Test | REST endpoint doğrulama | Supertest + Swagger | Faz 12 |
| Contract Test | Mobile ↔ Backend / Admin ↔ Backend | Pact veya custom | Faz 12 |
| UI Test (E2E) | Uçtan uca ana akışlar | Detox (mobile) / Cypress (admin) | Faz 12 |
| Functional Test | Escrow, anti-sniping, fiyat sor | Jest + Supertest | Faz 12 |
| Smoke Test | Uygulama açılış, giriş, temel işlev | Automated scripts | Faz 12 |
| Regression Test | Önceki fazların bozulmamışlık kontrolü | Jest suite | Her faz (2-12) |
| Security Test | Penetration, injection, XSS, CSRF | OWASP ZAP / custom | Faz 12 |
| Load Test | 10K eş zamanlı kullanıcı | k6 / Artillery | Faz 12 |

**Success Criteria:**
1. Tüm modüller frontend-backend entegre çalışıyor
2. CI/CD pipeline staging + production ayrımı hazır
3. Sentry error tracking aktif
4. OTA güncelleme altyapısı çalışıyor
5. Unit test coverage: backend %80+, mobile kritik bileşenler %70+
6. Integration test: müzayede → cüzdan → ödeme → sipariş akışı end-to-end
7. API test: tüm endpoint'ler Swagger tanımlarına uygun
8. Contract test: Mobile ↔ Backend, Admin ↔ Backend schema uyumu
9. E2E UI test: 3 ana akış (alıcı, satıcı, admin) başarılı
10. Functional test: escrow, anti-sniping, fiyat sor doğrulandı
11. Smoke test: uygulama açılış, giriş, arama, dashboard çalışıyor
12. Security test: SQL injection, XSS, rate limiting, yetki testleri temiz
13. Load test: 10.000 eş zamanlı kullanıcı simülasyonu tamamlandı ve rapor hazır
14. WebSocket stres test: 5K concurrent connection başarılı
15. App Store / Google Play başvuru materyalleri hazır
16. Swagger/OpenAPI dokümantasyonu tamamlandı
17. Test sonuçları rapor olarak teslim edildi
18. Kaynak kod, dokümantasyon ve tüm erişimler teslime hazır

**Depends on:** Phase 11

**Not:** Unit testler (TEST-01..05) ve regression testler (TEST-35..36) her faz içinde yazılır. Phase 12'de toplu API, E2E, security ve load testleri yapılır.

---

## Summary

| # | Phase | Goal | Requirements | Kontrat Haftası |
|---|-------|------|-------------|-----------------|
| 1 | Proje Altyapısı & Auth | Temel yapı + kimlik doğrulama | 11 | H1 |
| 2 | Kullanıcı & Satıcı | Profil + KVKK | 4 | H2-3 |
| 3 | Ürün & Kategori | Ürün yönetimi | 6 | H3-4 |
| 4 | Arama & Keşif | 3 modlu arama | 9 | H4 |
| 5 | Müzayede Motoru | Canlı + süreli müzayede | 19+4 | H5-6 |
| 6 | Cüzdan & Ödeme | Wallet + escrow | 14+5+4 | H6-7 |
| 7 | Sipariş Yönetimi | Order lifecycle + reviews | 6+5+1 | H7 |
| 8 | Bildirim & Mobil UI | Push + UI tamamlama | 11 | H8 |
| 9 | Fiyat Sor & Pazarlık | Kapalı devre negotiation | 11 | H8-9 |
| 10 | Kampanya & Reklam | İndirim + reklam + güven | 16 | H9 |
| 11 | Admin Panel | Vue.js yönetim paneli + audit | 15 | H9-10 |
| 12 | Entegrasyon & Test | CI/CD + tüm test türleri + yayın | 5 + 49 test | H10-12 |

**Total: 12 phases | 200 requirements (126 functional + 25 reliability/concurrency + 49 test) | 100% coverage ✓**

---
*Roadmap created: 2026-04-07*
*Last updated: 2026-04-07 after initial creation*
