# Phase 9: Fiyat Sor & Kapalı Devre Pazarlık — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers the **complete "Ask Price" and private negotiation system**:
- Satıcı "Fiyat Sor" modunda ilan verebilme (fiyat gizli, referans fiyat dahili)
- Alıcı "Fiyat Sor" butonuyla kapalı devre pazarlık başlatma (kısa form → konuşma)
- Teklif odaklı yapılandırılmış mesajlaşma (serbest pazarlık, sınırsız tur)
- Teklif geçerlilik süresi yönetimi (satıcı belirler)
- Kabul edilen teklif → anında escrow (Phase 6 D-05 akışına bağlanır)
- Platform dışı yönlendirme tespiti ve engelleme (genişletilmiş pattern set)
- Konuşma state machine (6 durumlu)
- Bildirim entegrasyonu (Phase 8 push altyapısı)
- Fiyat Sor satışları raporlama altyapısı (Order entity source alanı)

**Kapsam dışı (diğer fazlara ait):**
- Kampanya/indirim sistemi (Phase 10)
- Admin panel Fiyat Sor yönetim ekranı (Phase 11 — admin konuşma izleme dahil)
- Görsel/dosya paylaşımı mesajlaşmada (v2)
- Otomatik ban sistemi (v2 — şimdilik admin manuel karar)

</domain>

<decisions>
## Implementation Decisions

### Mesajlaşma Arayüzü
- **D-01:** Teklif odaklı form yapısı — serbest mesaj alanı minimal, yapılandırılmış teklif/kabul/red/karşı teklif butonlarıyla kontrollü akış. WhatsApp tarzı serbest chat değil.
- **D-02:** Alıcı "Fiyat Sor" butonuna basınca kısa form doldurur (ilgilendiği miktar + opsiyonel not). Form gönderilince konuşma thread'i açılır ve satıcıya bildirim gider. Satıcı bağlamı bilerek gelir.
- **D-03:** Konuşma listesi ürün bazlı gruplanır. Her konuşma ilgili ürün görseli + başlığıyla listelenir. Aynı ürüne birden fazla alıcı yazmışsa satıcı tarafında alt liste olarak görünür.
- **D-04:** Dosya/görsel paylaşımı YOK — sadece metin + yapılandırılmış teklif kartları. Platform dışı yönlendirme kontrolünü kolaylaştırır. Görseller zaten ürün ilanında mevcut. v2'ye ertelendi.
- **D-05:** Hibrit gerçek zamanlılık — konuşma ekranı açıkken Socket.IO (`/negotiation` namespace) ile anlık mesaj/teklif iletimi. Ekran kapalıyken Phase 8 push bildirim sistemiyle haberdar etme. Full-time socket bağlantısı gereksiz.

### Teklif & Pazarlık Akışı
- **D-06:** Serbest pazarlık (sınırsız tur) — alıcı ve satıcı birbirine istediği kadar teklif gönderebilir. Son kabul edilen teklif escrow'a yönlendirilir.
- **D-07:** Teklif geçerlilik süresi satıcı tarafından belirlenir — her teklif gönderilirken süre seçilir (12h / 24h / 48h / 72h). Süre dolunca teklif otomatik iptal olur (BullMQ delayed job). Alıcı yeni fiyat talep edebilir. ASKP-07 karşılanır.
- **D-08:** Teklif kabul edildiğinde anında escrow — alıcı "Kabul Et" butonuna basınca direkt İyzico ödeme formuna yönlendirilir. Ödeme başarılı → sipariş oluşur. Phase 6 D-05 escrow akışına direkt bağlanır. Sepete ekleme yok.
- **D-09:** Çoklu alıcı bağımsız pazarlık — aynı ürüne birden fazla alıcı "Fiyat Sor" gönderirse satıcı hepsine ayrı fiyat verebilir. Birisi kabul edip öderse ürün otomatik satılır, diğer konuşmalar "Ürün satıldı" mesajıyla kapanır. Race condition Phase 6 escrow transaction'ı ile yönetilir.
- **D-10:** 6 durumlu detaylı state machine:
  ```
  OPEN → NEGOTIATING → OFFER_PENDING → ACCEPTED → PAYMENT_PENDING → COMPLETED
                                   ↘ COUNTER_OFFERED (→ NEGOTIATING'e döner)
                                   ↘ REJECTED / EXPIRED / CANCELLED
  ```
  Serbest pazarlık turlarını takip eder, ödeme aşamasını ayrı state olarak izler. ASKP-09 raporlama için detaylı state machine avantajlı.

### Platform Dışı Yönlendirme Kontrolü
- **D-11:** Engelle + uyar — yasaklı pattern tespit edildiğinde mesaj gönderilmez. Kullanıcıya "Platform dışı iletişim bilgisi paylaşılamaz" Türkçe uyarı gösterilir. Gönderim denemesi loglanır (admin raporlama için). ASKP-04 karşılanır.
- **D-12:** Genişletilmiş pattern seti:
  - URL (http/https/www)
  - Telefon numarası (05xx, +90, boşluklu/noktalı varyasyonlar: 0 5 3 2, 05.32)
  - IBAN (TR + 24 hane)
  - Email adresi
  - Sosyal medya kullanıcı adı (@username)
  - Platform isimleri: "WhatsApp", "Telegram", "Instagram", "Facebook", "Signal"
- **D-13:** Yumuşak yaptırım politikası — otomatik ban YOK. İhlal denemeleri loglanır ve admin dashboard'da raporlanır. Admin manuel karar ile sınırlandırma/ban uygular. IP + cihaz ID kaydı tutulur ama otomatik engelleme yerine admin bilgilendirme amaçlı. ASKP-10 admin-tetiklemeli olarak karşılanır. ASKP-11 admin ban kararı sonrası IP/cihaz kontrolüyle uygulanır.
- **D-14:** Çift taraflı kontrol — client'ta mesaj yazılırken regex ile anlık UX feedback (gönder butonu pasif), backend'de kesin kontrol (400 hata). Client bypass edilse bile backend yakalar.

### Ürün İlanı & Eşzamanlılık
- **D-15:** Ürün kartında fiyat alanı tamamen gizli, yerine "Fiyat Sor" butonu gösterilir. Hem ürün kartında (compact) hem detay sayfasında (prominent). Kullanıcılar bu pattern'i tanır (sahibinden.com benzeri).
- **D-16:** Çakışma kontrolü iki katmanlı:
  1. İlan oluşturma/düzenleme anında engel — ürünün aktif müzayedesi varsa ASK_PRICE seçilemez (ve tersi). Hata mesajı: "Bu ürün aktif müzayedede, Fiyat Sor modu açılamaz".
  2. ListingType değiştirme — satıcı ürünün satış tipini değiştirebilir ama sadece aktif müzayede/konuşma YOKSA. Aktif işlem varsa tip değiştirme kilitli.
  ASKP-08 karşılanır.
- **D-17:** `isPriceHidden: boolean` flag'i Product entity'ye eklenir. Satıcı referans fiyatı girer ama `isPriceHidden = true` ise alıcıya gösterilmez. `ListingType.ASK_PRICE` seçildiğinde otomatik `true` set edilir. Satıcı pazarlıkta bu referans fiyatı alt sınır olarak kullanabilir. Mevcut `price` column nullable yapılmaz.
- **D-18:** `ListingType` enum'a `ASK_PRICE = 'ASK_PRICE'` eklenir. Shared types'ta güncellenir.
- **D-19:** Order entity'ye `source: 'DIRECT_SALE' | 'AUCTION' | 'ASK_PRICE'` alanı eklenir. Fiyat Sor satışları raporlarda ayrı filtre olarak kullanılır. Ayrı dashboard Phase 11'e. ASKP-09 karşılanır.

### Bildirim Entegrasyonu
- **D-20:** Genişletilmiş push bildirim event seti:
  - Yeni fiyat talebi geldi (satıcıya)
  - Yeni teklif geldi (alıcıya/satıcıya — karşı teklif dahil)
  - Teklif kabul edildi (alıcıya)
  - Teklif reddedildi (alıcıya/satıcıya)
  - Teklif süresi dolmak üzere — son 2 saat (alıcıya hatırlatma, BullMQ delayed job)
  - Teklif süresi doldu (her iki tarafa)
  - Ürün satıldı, konuşma kapandı (bekleyen diğer alıcılara)
  Phase 8 OneSignal + BullMQ altyapısı kullanılır.

### Konuşma Yaşam Döngüsü
- **D-21:** Her iki taraf konuşmayı iptal edebilir — "Görüşmeyi Kapat" butonu ile. Ortada aktif (süresi dolmamış) teklif varsa önce teklif iptal edilir sonra konuşma kapatılır. Karşı tarafa bildirim gider.
- **D-22:** 7 gün inaktiflikle otomatik arşivleme — mesaj/teklif gelmezse konuşma otomatik arşivlenir (BullMQ delayed job). Kullanıcı isterse tekrar "Fiyat Sor" ile yeni konuşma açar.

### Cayma Hakkı
- **D-23:** Fiyat Sor satışlarında 14 gün cayma hakkı geçerlidir — marketplace kategorisinde değerlendirilir. 6502 sayılı kanun kapsamında mesafeli satış sözleşmesi uygulanır. Müzayede istisnası (madde 17/4-c) Fiyat Sor için geçerli değildir (açık artırma unsuru yok). Phase 7 sipariş akışındaki cayma hakkı mekanizması reuse edilir.

### Admin İzleme
- **D-24:** Şikayet bazlı admin erişimi — admin normalde konuşma içeriğini göremez (KVKK veri minimizasyonu). Kullanıcı "Şikayet Et" butonuyla bildirim yaparsa veya sistem platform dışı yönlendirme flag'lerse sadece o konuşma admin'e açılır. Admin panelde "Şikayet/Flag'li Konuşmalar" listesi olacak (Phase 11).

### Agent's Discretion
- Negotiation entity yapısı (Conversation, Offer, Message tabloları)
- Socket.IO `/negotiation` namespace konfigürasyonu
- Content moderation regex pattern detayları
- BullMQ queue isimlendirmesi ve job yapısı
- Konuşma arşivleme stratejisi (soft delete vs separate table)
- "Fiyat Sor" butonu tasarım detayları (renk, boyut, animasyon)
- Kısa form alanları (miktar input tipi, not karakter limiti)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proje Dökümanları
- `.planning/REQUIREMENTS.md` — ASKP-01..11 fiyat sor ve kapalı devre pazarlık gereksinimleri
- `.planning/ROADMAP.md` §Phase 9 — Fiyat Sor & Kapalı Devre Pazarlık scope ve timeline
- `.planning/PROJECT.md` §Key Decisions — İyzico marketplace escrow, genel platform kararları

### Önceki Faz Context'leri
- `.planning/phases/06-dijital-cuzdan-odeme/06-CONTEXT.md` — D-04 İyzico sub-merchant, D-05 5 adımlı escrow akışı (kabul edilen teklifler buraya bağlanır), D-08 KDV dahil fiyat
- `.planning/phases/07-siparis-yonetimi/07-CONTEXT.md` — Cayma hakkı kuralları (marketplace 14 gün, müzayede yok), sipariş oluşturma akışı, mesafeli satış sözleşmesi
- `.planning/phases/08-bildirim-mobil-ui/08-CONTEXT.md` — D-01..D-04 push bildirim stratejisi, D-05 bildirim merkezi, D-09 profil menüsü (Mesajlarım placeholder), OneSignal + BullMQ altyapısı
- `.planning/phases/05-muzayede-motoru/05-CONTEXT.md` — Socket.IO `/auction` namespace pattern, AuctionGateway WebSocket event yapısı

### Mevcut Kod
- `backend/src/modules/auction/auction.gateway.ts` — Socket.IO gateway pattern (negotiation gateway için referans)
- `mobile/services/socket.ts` — Socket.IO client bağlantı pattern'i (negotiation namespace için referans)
- `shared-types/enums/listing-type.enum.ts` — ListingType enum (ASK_PRICE eklenecek)
- `backend/src/modules/product/entities/product.entity.ts` — Product entity (isPriceHidden flag eklenecek)
- `mobile/app/(tabs)/profile.tsx` — Profil ekranı (Mesajlarım menü öğesi mevcut — boş ekran)
- `backend/src/modules/wallet/wallet.service.ts` — WalletService (escrow bağlantısı)

### Yasal Referanslar
- 6502 sayılı Kanun madde 17/4-c — Müzayede cayma hakkı istisnası (Fiyat Sor için geçerli DEĞİL)
- 6502 sayılı Kanun — Mesafeli satış sözleşmesi, 14 gün cayma hakkı (Fiyat Sor satışlarına uygulanır)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuctionGateway` — Socket.IO WebSocket gateway pattern. `/negotiation` namespace için aynı yapı reuse edilecek.
- `mobile/services/socket.ts` — Socket.IO client bağlantı pattern'i. Negotiation socket servisi aynı pattern'le oluşturulacak.
- `BullMQ auction queue` — Phase 5'te kullanılan queue pattern. Teklif süresi, inaktiflik arşivleme job'ları için negotiation queue eklenecek.
- `Zustand authStore` — Store pattern. negotiationStore oluşturulacak.
- `TanStack Query hooks` — useWallet, useProducts pattern'i. useNegotiations, useConversation hook'ları aynı pattern.
- `Phase 8 notification module` — Push bildirim gönderim altyapısı. Fiyat Sor event'leri bu modüle bağlanacak.
- `i18n` — Türkçe çeviri altyapısı mevcut. Fiyat Sor metinleri eklenecek.

### Established Patterns
- TypeORM entity + repository pattern
- Transaction wrapper: `queryRunner.startTransaction()` (Phase 5 AuctionService'te)
- PostgreSQL ENUM — UPPERCASE convention (NegotiationStatus, OfferStatus)
- Swagger/OpenAPI dekoratörleri tüm controller'larda
- Expo Router file-based routing
- Component + styles ayrı dosya pattern

### Integration Points
- `ListingType` enum → `ASK_PRICE` değeri eklenmesi (shared-types)
- `Product` entity → `isPriceHidden` flag eklenmesi
- `Order` entity → `source` alanı eklenmesi (DIRECT_SALE | AUCTION | ASK_PRICE)
- `AppModule` → NegotiationModule register
- Phase 8 NotificationModule → Fiyat Sor event tetikleyicileri bağlama
- Phase 6 EscrowService → Teklif kabul sonrası ödeme başlatma
- Profil menüsü → Mesajlarım ekranı (boş placeholder → gerçek konuşma listesi)

</code_context>

<specifics>
## Specific Ideas

- Teklif odaklı form yaklaşımı sahibinden.com "Fiyat Sor" pattern'ine benzer — kullanıcılar tanıyor
- Platform dışı yönlendirme kontrolünde "WhatsApp" gibi platform isimleri de yakalanmalı — sadece URL/telefon yetmez
- Satıcı referans fiyatı (isPriceHidden ile gizli) pazarlıkta minimum kabul fiyatı olarak kullanılabilir — ama bu zorunlu değil, agent discretion
- Socket.IO `/auction` namespace pattern'i birebir reuse edilebilir — ayrı `/negotiation` namespace ile
- 7 gün inaktiflik arşivleme Phase 6'daki 48 saat grace period BullMQ delayed job pattern'iyle aynı mekanizma

</specifics>

<deferred>
## Deferred Ideas

- Görsel/dosya paylaşımı mesajlaşmada — v2
- Otomatik ban sistemi (ASKP-10/11 tam otomasyonu) — v2 (şimdilik admin manuel)
- Admin panelde Fiyat Sor yönetim ekranı — Phase 11
- Fiyat Sor dönüşüm oranı dashboard — Phase 11
- Sesli mesaj desteği — v2
- Karşı teklif tur limiti — gerekirse ileride eklenebilir
- Satıcı minimum kabul fiyatı otomatik red — agent discretion veya v2

</deferred>

---

*Phase: 09-fiyat-sor-kapal-devre-pazarl-k*
*Context gathered: 2026-04-21*
