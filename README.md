# Endemigo Proje Durum Raporu

Guncelleme tarihi: 13 Mayis 2026

## Hızlı Durum (13 Mayis 2026)

- Backend unit test: `37/37 suite`, `280/280 test` gecti.
- P0 kritikleri tamamlandi:
  - Yeni wallet default bakiyesi `0` yapildi (service + entity + migration).
  - Payment webhook signature dogrulamasi zorunlu hale getirildi.
  - Order transition'da bulunamayan order artik `ORDER_NOT_FOUND` donuyor.
  - `releaseAllHoldsForAuction` tek transaction kapsaminda calisiyor.
- P1 test kapsaminda acik kalan service/processor spec bosluklari kapatildi.
- P2 icin backend/admin/mobile tarafinda opsiyonel Sentry init akisi eklendi
  (paket kuruluysa init edilir, kurulu degilse uygulama bozulmaz).

> Not: Asagidaki faz ozeti tarihsel rapordur; bu ust blok guncel snapshot'tur.

Bu dosya, mevcut `main` branch uzerindeki proje durumunu, tamamlanan isleri, test sonuclarini ve siradaki urun fazlarini ozetler.

## Tamamlanan Isler

### Phase 1: Proje altyapisi ve authentication

Tamamlanan basliklar:

- NestJS backend altyapisi kuruldu.
- Expo/React Native mobil uygulama iskeleti kuruldu.
- JWT tabanli authentication akisi eklendi.
- Refresh token akisi eklendi.
- RBAC guard ve public route decorator yapisi eklendi.
- Global exception filter eklendi.
- Mobile auth ekranlari ve auth store yapisi eklendi.
- Error boundary eklendi.
- Kritik security fixleri uygulandi.

Onemli fixler:

- Refresh token endpoint rate limit eklendi.
- Verification token hashleme SHA-256 ile guvenli hale getirildi.
- Production CORS fail-safe yapildi.
- TC kimlik no AES-256-GCM ile encrypt edildi.
- Null user storage davranisi duzeltildi.

### Phase 2: Kullanici ve satici yonetimi

Tamamlanan basliklar:

- Kullanici profil guncelleme akisi eklendi.
- Satici basvuru ve satici profili backend modeli eklendi.
- KVKK consent kayitlari eklendi.
- Hesap silme ve reactivation akisi eklendi.
- Mobile tarafinda profil, ayarlar, satici olma ve KVKK ekranlari hazirlandi.

Onemli fixler:

- Hesap silmede tum refresh tokenlar revoke ediliyor.
- IBAN AES-256-GCM ile encrypt ediliyor.
- Satici basvurusu transaction icine alindi.
- Email verification zorunlulugu eklendi.
- Reactivation endpoint user enumeration riskine karsi guclendirildi.
- Avatar URL, vergi numarasi ve IBAN validasyonlari eklendi.

### Phase 3: Urun ve kategori sistemi

Tamamlanan basliklar:

- Product entity ve DTO yapilari eklendi.
- Category entity ve kategori agaci yapisi eklendi.
- Product image modeli ve storage servisleri eklendi.
- Product CRUD endpointleri eklendi.
- Saticinin kendi urunlerini listeleme akisi eklendi.
- Mobile urun detay ve ilgili urun ekranlari hazirlandi.

Onemli fixler:

- Kategori seed endpoint admin ile sinirlandi.
- Image upload tarafinda path traversal savunmasi eklendi.
- Image buffer validasyonu eklendi.
- Product title max length validasyonu eklendi.
- Silinen gorsellerde DB kaydi hard delete ediliyor.

### Phase 4: Arama ve kesif sistemi

Tamamlanan basliklar:

- Search module eklendi.
- Product search eklendi.
- Auction search eklendi.
- Unified search eklendi.
- Favorites sistemi eklendi.
- Public listeleme ve filtreleme akislari guclendirildi.

Onemli fixler:

- ILIKE wildcard injection/DoS riski kapatildi.
- Favorites toggle race condition optimistic insert ile giderildi.
- Pagination clamp eklendi.
- Bos query guard eklendi.
- Unified search rate limit eklendi.

### Phase 5: Muzayede motoru

Tamamlanan basliklar:

- Auction entity ve Bid entity eklendi.
- Auction CRUD refactor tamamlandi.
- Socket.IO gateway eklendi.
- Redis adapter entegrasyonu eklendi.
- BullMQ tabanli auction finalize processor eklendi.
- LOT bazli auction akisi guclendirildi.
- Transaction lock ve advisory lock kullanildi.
- Anti-sniping davranisi eklendi.
- Bid lifecycle ve gateway eventleri eklendi.
- Mobile auction list, detail, bid ve result ekranlari eklendi.
- Mobile socket hooklari eklendi.
- Wallet hold entegrasyonu eklendi.

Onemli fixler:

- WebSocket CORS wildcard kaldirildi.
- Viewer count cleanup metodu eklendi.
- LOT advisory lock eklendi.
- Finalize akisi transaction icine alindi.
- ProductId guard eklendi.
- Pagination clamp ve enum validation eklendi.
- Bid rate limit sikilastirildi.

Durum: Phase 5 tamamlandi. Git gecmisinde `phase 5 completed` commitleri mevcut.

## Mevcut Modul Yapisi

Backend modulleri:

- `auth`
- `user`
- `product`
- `search`
- `auction`
- `wallet`
- `health`

Mobile ana ekranlari:

- Auth: login, register
- Tabs: home, explore, auctions, categories, cart, profile, settings, become-seller, edit-profile
- Detail: product detail, auction detail, auction result
- Ortak UI: product card, banner carousel, blog card, modal, countdown timer

## Test Ortami

Backend E2E icin izole servis dosyasi:

```bash
cd backend
npm run test:e2e:services
```

Bu komut `docker-compose.test.yml` ile su servisleri acar:

- Postgres test DB: `localhost:55432`
- Redis test servisi: `localhost:56379`

E2E testleri lokal servislerle calistirma:

```bash
cd backend
npm run test:e2e:local
```

Servisleri kapatma:

```bash
cd backend
npm run test:e2e:services:down
```

`test:e2e:local` komutu gerekli test environment degerlerini komut icinde verir:

- `NODE_ENV=development`
- `DATABASE_URL=postgres://endemigo:endemigo_test@localhost:55432/endemigo_test`
- `REDIS_HOST=localhost`
- `REDIS_PORT=56379`
- `JWT_SECRET=e2e_test_secret`

## Test Sonuclari

Testler 26 Nisan 2026 tarihinde lokal ortamda calistirildi.

### Backend build

Komut:

```bash
cd backend
npm run build
```

Sonuc:

- Basarili.
- `webpack 5.105.4 compiled successfully`

### Backend unit test

Komut:

```bash
cd backend
npm test -- --runInBand --watchman=false
```

Sonuc:

- Test Suites: 6 passed, 6 total
- Tests: 107 passed, 107 total
- Snapshots: 0 total
- Sonuc: Basarili

### Backend E2E test

Onceki dogrudan kosumda E2E suite uygulama baslamadan Redis/Postgres baglantisinda dustu. Bu nedenle test ortami ayrildi ve `test:e2e:services` + `test:e2e:local` komutlari eklendi.

Son bilinen dogrudan kosum sonucu:

- Test Suites: 1 failed, 1 total
- Tests: 49 failed, 49 total
- Kok neden: sandbox icinde `127.0.0.1:6379` ve `::1:6379` Redis baglantilari `EPERM` ile engellendi.

Yeni dogrulama komutu:

```bash
cd backend
npm run test:e2e:services
npm run test:e2e:local
```

Bu oturumdaki servis dogrulama notu:

- `docker compose -f docker-compose.test.yml config` komutu denenmistir.
- Lokal makinede `docker` CLI bulunmadigi icin servisler bu oturumda ayaga kaldirilamamistir.
- Docker kurulu ortamda yukaridaki komutlarla E2E tekrar kosulmalidir.

### Mobile lint

Komut:

```bash
cd mobile
npm run lint
```

Sonuc:

- 0 error
- 0 warning
- Sonuc: Basarili

### Mobile TypeScript

Komut:

```bash
cd mobile
npx tsc --noEmit
```

Sonuc:

- Basarili.
- TypeScript hata raporlamadi.

## Yapilacaklar

### 1. Phase 6: Dijital cuzdan ve odeme

Mevcut wallet modulu var, ancak odeme ve muhasebe akisi daha netlestirilmeli.

Yapilacak ana basliklar:

- Wallet balance hareketleri icin ledger mantigi.
- Hold, release, capture akislarinin kesinlestirilmesi.
- Odeme saglayici entegrasyonu icin servis soyutlamasi.
- Iade/refund akisi.
- Satici payout akisi.
- Idempotency key destegi.
- Finansal audit trail.
- Wallet ekranlarinin mobile tarafinda tamamlanmasi.

### 2. Phase 7: Siparis yonetimi

Yapilacak ana basliklar:

- Order entity ve order item yapisi.
- Kazanilan auction sonucundan order olusturma.
- Adres secimi ve teslimat bilgileri.
- Checkout akisi.
- Siparis durumlari.
- Iade/iptal talepleri.
- Alici ve satici siparis ekranlari.
- Review/degerlendirme akisi.

### 3. Phase 8: Bildirim ve mobil UI guclendirme

Yapilacak ana basliklar:

- Push notification altyapisi.
- Auction event bildirimleri.
- Order status bildirimleri.
- Wallet/payment bildirimleri.
- Notification preference ekranlari.
- Bos/loading/error state standardizasyonu.

### 4. Admin panel

Yapilacak ana basliklar:

- Kullanici yonetimi.
- Satici basvuru onayi.
- Urun/kategori moderasyonu.
- Auction izleme ve mudahale.
- Finansal hareket izleme.
- Audit log goruntuleme.
- Raporlama ekranlari.
