# Product Create Wizard Design

**Date:** 2026-05-05
**Status:** Approved
**Surface:** `mobile/app/(tabs)/become-seller.tsx`

## Goal

Teknolojiden anlamayan bir kullanicinin bile mobilde kolayca urun ekleyebilecegi, sade ve modern bir urun ekleme deneyimi tasarlamak.

## Product Intent

- Akis `single long form` yerine `step-by-step wizard` olacak.
- Kullanici her adimda tek bir karar verecek.
- Zorunlu alanlar once, ileri alanlar sonra gosterilecek.
- Backend mevcut kontratlari bozulmayacak.
- Ilk surum `tam yayin akisi` olacak.

## Hard Constraints

### Mobile conventions

- Stil dosyalari component/screen dosyasindan ayri olacak.
- Hardcoded text olmayacak, tum metinler i18n uzerinden gelecek.
- Tema disi renk kullanilmayacak.
- `any` kullanilmayacak.
- Native alert kullanilmayacak, mevcut custom modal/toast duzeni korunacak.

### Backend constraints

- Urun olusturma `POST /products` ile yapiliyor.
- Urun ilk olusumda `DRAFT` status ile kaydediliyor.
- Gorsel yukleme `POST /products/:id/images` ile ayri yapiliyor.
- Urunun yayinlanabilir olmasi icin en az 1 gorsel, gecerli kategori ve yeterli aciklama gerekiyor.
- `listingType` urun tarafinda tutuluyor.
- Muzayede olusturma urunden ayri olarak `POST /auctions` ile yapiliyor.

## Primary UX Direction

Secilen yon: `B - Adim adim sihirbaz`

Bu yon secildi cunku:

- yeni kullanici icin hata oranini dusurur
- ekran kalabaligini azaltir
- `tek urun` ve `muzayede` akisini kontrollu sekilde ayirir
- backend farkli endpoint yapilarini tek bir insan odakli akista birlestirir

## Information Architecture

### Step 1 — Product Basics

Alanlar:

- `listingType` secimi: `Tek Urun` / `Muzayede`
- `title`
- `categoryId`

Kurallar:

- `listingType` alanı `title` alanindan hemen sonra degil, baslik metninden sonra ana karar alanı olarak gosterilir.
- Kategori secimi mevcut kategori modal akisini kullanir.
- Bu adim tamamlanmadan ileri gecilemez.

### Step 2 — Pricing

`Tek Urun` seciminde:

- `price`
- `askPriceEnabled`
- `askPriceMinAmount` sadece `askPriceEnabled=true` ise acilir

`Muzayede` seciminde:

- kullaniciya burada `baslangic fiyat mantigi` gosterilir
- temel fiyat girisi `startPrice` mantigina gore toplanir
- ancak backend urun kaydinda `price` alanina da sayisal bir taban deger gonderilir

Not:

- Mobil katmanda kullanicinin kafasi karismasin diye bu adimda alan ismi duruma gore degisir.
- Backend map katmaninda bu alanlar uygun request shape'e cevrilir.

### Step 3 — Product Details

Alanlar:

- `description`
- `condition`
- `stockQuantity`
- `originCountry`
- `originRegion`

Opsiyonel ileri detaylar:

- `sku`
- `geoIndicationCertNo`
- `geoIndicationRegion`
- `weight`
- `dimensionWidth`
- `dimensionHeight`
- `dimensionDepth`

Kurallar:

- Temel kullanici once sadece gerekli alanlari gorur.
- Ileri alanlar `Daha fazla detay` altinda collapsible olarak acilir.

### Step 4 — Images

Alanlar:

- urun gorselleri

Kurallar:

- En az 1 gorsel zorunlu.
- Gorsel yukleme urun create sonrasi ayri endpoint ile yapilir.
- Ilk gorsel birincil gorsel olarak davranir.

### Step 5 — Review And Publish

Gosterilecekler:

- ozet kartlari
- eksik alan kontrolu
- gorsel sayisi
- secilen kategori
- fiyat modeli

`Tek Urun` icin:

- final aksiyon: urunu yayinla veya yayinlamaya hazir taslak bitir

`Muzayede` icin ek blok:

- `startTime`
- `endTime`
- `minIncrement`
- `auctionType`
- `antiSnipingEnabled`
- `extensionSeconds`
- `maxExtensions`

Final akıs:

1. `POST /products`
2. secilen gorseller icin `POST /products/:id/images`
3. eger `listingType=AUCTION` ise `POST /auctions`
4. urun gerekiyorsa publish akisina hazir hale getirilir

## Backend Mapping

### Direct sale payload

`POST /products`

- `title`
- `description`
- `price`
- `categoryId`
- `stockQuantity`
- `originCountry`
- `originRegion`
- `condition`
- `listingType = DIRECT_SALE`
- `askPriceEnabled`
- `askPriceMinAmount`

### Auction payload sequence

Ilk istek `POST /products`

- `title`
- `description`
- `price`
- `categoryId`
- `stockQuantity`
- `originCountry`
- `originRegion`
- `condition`
- `listingType = AUCTION`

Ikinci istek `POST /auctions`

- `productId`
- `startPrice`
- `minIncrement`
- `startTime`
- `endTime`
- `auctionType`
- `antiSnipingEnabled`
- `extensionSeconds`
- `maxExtensions`

## UX Principles

- Her adim tek bir zihinsel gorev icerecek.
- Kullanici surekli "dogru yolda miyim?" hissi alacak.
- Form dili teknik olmayacak.
- Alan etiketleri backend ismiyle degil kullanici diliyle gosterilecek.
- Yanlis veya eksik veri icin inline yardim kullanilacak.
- Basari ve hata geri bildirimi mevcut custom modal/toast sistemiyle verilecek.

## Visual Direction

- Acik, ferah ve premium gorunum
- buyuk baslik yerine sade adim hiyerarsisi
- yumusak kartlar ve net call-to-action
- renklerde mevcut `Colors` paleti disina cikilmamasi
- tipografide mevcut proje font sistemi korunmasi

## Validation Rules

- Step 1: `title`, `listingType`, `categoryId` zorunlu
- Step 2: fiyat sifirdan buyuk olmali
- Step 3: `description` yayin hedefinde yeterli olmali
- Step 4: en az 1 gorsel zorunlu
- Step 5: muzayede secildiyse zaman ve artim alanlari da zorunlu

## Non-Goals For This Iteration

- Gelismis taslak senkronizasyonu
- Offline urun olusturma
- AI ile otomatik baslik/aciklama onerisi
- Coklu varyant / varyasyon yonetimi

## Implementation Notes

- Mevcut `become-seller` ekranindaki seller onboarding ve urun olusturma bolumu ayrisacak.
- Wizard state'i local state veya ekran seviyesinde reducer ile yonetilebilir.
- API mapping logic UI icinde dagitilmayacak; ayri helper veya hook ile merkezilenecek.
- Smoke test kapsaminda yeni akisin ana string ve endpoint anchorlari korunacak.
