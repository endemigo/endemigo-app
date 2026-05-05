# Endemigo — Hibrit E-Ticaret Süper Uygulama

## What This Is

Endemigo, çok satıcılı pazar yeri ve gerçek zamanlı müzayede iş modelini tek bir mobil uygulama içinde birleştiren hibrit e-ticaret platformudur. Satıcılar ürünlerini listeleyebilir, müzayedeye çıkarabilir veya "fiyat sor" modunda kapalı devre pazarlık yapabilir. Platform; mobil uygulama (React Native/Expo), backend servisleri (NestJS/PostgreSQL) ve web tabanlı yönetim panelinden (Vue.js) oluşur.

## Core Value

Kullanıcılar güvenli bir şekilde gerçek zamanlı müzayedeye katılabilmeli, ürün satın alabilmeli ve escrow korumalı ödeme sistemiyle güvenle alışveriş yapabilmelidir.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Mobil Uygulama**
- [ ] React Native (Expo) ile iOS ve Android platformları
- [ ] Kullanıcı kayıt/giriş, profil yönetimi
- [ ] Ürün listeleme, gelişmiş arama ve filtreleme
- [ ] Favoriler, sipariş geçmişi
- [ ] Canlı müzayede ekranı, gerçek zamanlı teklif verme
- [ ] Online süreli müzayede (canlı yayınsız)
- [ ] Geri sayım sayacı, teklif geçmişi, kazanan bildirimi
- [ ] Satıcı paneli (ürün ekleme/düzenleme, müzayede oluşturma)
- [ ] Dijital cüzdan (bakiye, bloke bakiye, işlem geçmişi)
- [ ] Ödeme ekranları (escrow akışı)
- [ ] Fiyat sor / kapalı devre pazarlık
- [ ] Kampanya/indirim ekranları, kupon sistemi
- [ ] Push bildirim (OneSignal)
- [ ] Profil menüsü (hesabım, siparişler, cüzdan, ilanlar, müzayede, favoriler, mesajlar, ayarlar)
- [ ] OTA güncelleme (Expo Updates)

**Backend**
- [ ] NestJS modüler mimari
- [ ] JWT/refresh token, RBAC (kullanıcı, satıcı, admin)
- [ ] Kullanıcı, satıcı, ürün, sipariş modülleri
- [ ] PostgreSQL veritabanı (ilişkisel model, transaction yönetimi)
- [ ] Müzayede motoru — durum makinesi (taslak → yayında → aktif → bitti → tamamlandı → iptal)
- [ ] Socket.IO WebSocket (gerçek zamanlı müzayede)
- [ ] Anti-sniping mekanizması (son 60 saniye uzatma)
- [ ] Teklif rekabet koruması (timestamp + kuyruk sırası, DB transaction lock)
- [ ] Online süreli müzayede motoru (zaman bazlı otomatik kapanış + süre uzatma)
- [ ] Dijital cüzdan ve finansal sistem (bakiye blokesi, escrow, satıcı bakiyesi)
- [ ] Ödeme sistemi (İyzico escrow webhook, iade mekanizması)
- [ ] Sipariş akışı (ödeme → hazırlık → gönderim → teslim → tamamlanma + otomatik onay)
- [ ] İade ve uyuşmazlık akışı (admin onaylı, sıradaki teklif sahibine geçiş)
- [ ] Bildirim sistemi (OneSignal push + uygulama içi)
- [ ] Arama motoru (3 mod: satış, müzayede, tümü + filtreleme/sıralama)
- [ ] Kullanıcı güven sistemi (davranış analizi, şüpheli aktivite tespiti)
- [ ] Medya yönetimi (görsel optimizasyon, CloudFlare R2 CDN)
- [ ] Satıcı reklam sistemi (öne çıkarma paketleri, cüzdandan ödeme)
- [ ] Kampanya ve indirim yönetimi (satıcı/platform bazlı, kupon, toplu indirim)
- [ ] Fiyat sor ve kapalı devre pazarlık (mesajlaşma, teklif, escrow yönlendirme)
- [ ] Redis (session cache, Pub/Sub WebSocket ölçekleme — baştan kurulacak)
- [ ] Swagger/OpenAPI dokümantasyonu
- [ ] Güvenlik (HTTPS, rate limiting, input validation, SQL injection, XSS koruması)
- [ ] KVKK uyumluluğu (açık rıza, veri silme/anonimleştirme)
- [ ] Hata yönetimi (Sentry entegrasyonu)
- [ ] CI/CD pipeline (staging + production)

**Admin Panel (Vue.js)**
- [ ] Kullanıcı, satıcı, ürün, müzayede yönetimi
- [ ] Sipariş, ödeme ve teklif geçmişi yönetimi
- [ ] Reklam kampanya yönetimi ve raporlama
- [ ] Kampanya ve indirim yönetimi
- [ ] Platform geneli operasyonel ayarlar
- [ ] İşlem hacmi, aktif müzayedeler, ödeme akışları izleme
- [ ] Kullanıcı hareketleri ve sistem hataları izleme
- [ ] Rol bazlı erişim kontrolü (RBAC)
- [ ] Satıcı para çekme talepleri (manuel onay)
- [ ] Reklam onay sistemi

### Out of Scope

- Kargo firması API entegrasyonu — sonraki aşamada yapılacak
- RabbitMQ mesaj kuyruğu — gerekli görülürse eklenecek, şu an Redis yeterli
- Canlı yayın müzayedesi — kontrat kapsamı dışı, sadece süreli müzayede ve gerçek zamanlı teklif var
- Mobil dışı native uygulama (masaüstü) — kontrat kapsamı dışı
- Muhasebe yazılımı entegrasyonu — kontrat kapsamı dışı, ileride değerlendirilecek

## Context

- Endemigo Teknoloji A.Ş. ile Fatih Kartal (Geliştirici) arasında resmi sözleşme var
- Toplam iş bedeli: 350.000 TL, 5 dilim ödeme
- Süre: 12 hafta ana + 2 hafta tampon
- endemigo.com mevcut web sitesi olarak aktif (referans amaçlı)
- Elle çizilmiş UI taslakları mevcut
- Figma tasarımları sıfırdan yapılacak
- 15 revizyon hakkı mevcut
- Canlıya almadan sonra 3 ay ücretsiz bug fix desteği
- Tüm kaynak kod müşteri GitHub hesabında barındırılacak
- 10.000 eş zamanlı kullanıcı yük testi gerekli
- Ödeme sistemi: İyzico (marketplace escrow desteği)
- CDN: CloudFlare R2 (egress ücretsiz)
- Reverse proxy: Caddy (çözüm: otomatik SSL + WebSocket native)
- Git stratejisi: Trunk-based (solo developer, hızlı iterasyon)
- Escrow otomatik onay: 14 gün
- Redis Pub/Sub: Baştan kurulacak (10K concurrent user zorunluluğu)

### Ödeme Dilimi ↔ Phase Eşlemesi

| Dilim | Tutar | Hafta | Eşleşen Fazlar | Tetikleyici |
|-------|-------|-------|----------------|-------------|
| 1 (%15) | 52.500 TL | H1 | Phase 1 | Proje başlatıldı, repo + mimari hazır |
| 2 (%15) | 52.500 TL | H5 | Phase 1-4 | Auth + ürün + arama çalışır |
| 3 (%20) | 70.000 TL | H8 | Phase 5-8 | Müzayede + cüzdan + sipariş + bildirim çalışır |
| 4 (%25) | 87.500 TL | H12 | Phase 9-12 | Tüm sistem canlı, testler tamamlandı |
| 5 (%25) | 87.500 TL | H13+ | Stabilizasyon | 1 hafta canlı, stabil, devir tamamlandı |

### Teslim ve Kabul Süreci

- Her faz sonunda demo + test + düzeltme
- Müşteri 5 iş günü içinde yazılı kabul/ret bildirir
- Red durumunda gerekçe yazılı iletilir
- 2 haftada bir ilerleme raporu sunulur
- 15 revizyon hakkı (bug fix hariç)
- Canlıya almadan sonra 3 ay bug fix desteği
- Bug takip: GitHub Issues (critical: 48h SLA, normal: 5 iş günü)

### Handoff Checklist (Teslim Materyalleri)

- [ ] Kaynak kod (GitHub repo, tüm branch'lar)
- [ ] Swagger/OpenAPI dokümantasyonu
- [ ] Environment variables referans belgesi
- [ ] Admin hesap bilgileri (super admin credentials)
- [ ] İyzico merchant bilgileri + API keys
- [ ] OneSignal app keys
- [ ] Sentry proje erişimi
- [ ] CloudFlare R2 bucket erişimi
- [ ] EAS proje erişimi
- [ ] GitHub Actions secrets listesi
- [ ] PM2 ecosystem config
- [ ] Caddy config dosyaları

## Constraints

- **Teknoloji**: Mobile — React Native (Expo), Backend — NestJS + PostgreSQL + Redis, Admin Panel — Vue.js
- **Süre**: 12 hafta + 2 hafta tampon
- **Bütçe**: 350.000 TL sabit fiyat
- **Platform**: iOS + Android (tek codebase)
- **Güvenlik**: KVKK uyumlu, HTTPS zorunlu, backdoor/gizli erişim yasak
- **Performans**: 10.000 eş zamanlı kullanıcı hedefi
- **Test**: Fonksiyonel + güvenlik + yük testi zorunlu
- **Teslim**: Kaynak kod + dokümantasyon + tüm erişimler müşteriye devir
- **Kapsam Dışı Maliyetler**: Sunucu, hosting, domain, App Store/Google Play hesapları, 3. parti servis abonelikleri müşteri tarafından karşılanır

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native (Expo) mobil | iOS + Android tek codebase, hızlı geliştirme, OTA güncelleme | ✅ Confirmed |
| NestJS backend | Modüler mimari, TypeScript uyumu, Swagger desteği | ✅ Confirmed |
| Vue.js admin panel | Web tabanlı yönetim paneli, hızlı geliştirme | ✅ Confirmed |
| PostgreSQL veritabanı | İlişkisel model bütünlüğü, transaction yönetimi | ✅ Confirmed |
| Redis Pub/Sub baştan kurulacak | 10K concurrent user multi-instance zorunlu kılıyor | ✅ Decided 2026-04-07 |
| BullMQ (RabbitMQ yerine) | Redis üzerinden çalışır, ek altyapı yok | ✅ Confirmed |
| Socket.IO WebSocket | Gerçek zamanlı müzayede teklif akışı | ✅ Confirmed |
| İyzico (ödeme) | Marketplace escrow native desteği, iyi API | ✅ Decided 2026-04-07 |
| Caddy (reverse proxy) | Otomatik SSL, WebSocket zero-config, basit yönetim | ✅ Decided 2026-04-07 |
| CloudFlare R2 (CDN) | Egress ücretsiz, global edge cache | ✅ Decided 2026-04-07 |
| Escrow 14 gün otomatik onay | Sektör standardı, teslimattan itibaren | ✅ Decided 2026-04-07 |
| Trunk-based git stratejisi | Solo developer, hızlı iterasyon | ✅ Decided 2026-04-07 |
| Kargo entegrasyonu ertelenmiş | Müşteri kararıyla sonraki aşamada yapılacak | ⚠️ Yazılı onay gerekli |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 after initialization*
