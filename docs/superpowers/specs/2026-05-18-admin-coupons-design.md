# Admin Coupons UI Design

Date: 2026-05-18

## Scope

Admin panelde mevcut `Kampanyalar` ekranı korunur ve aynı yüzeye `Kuponlar` sekmesi eklenir. Amaç, kampanya ve kupon yönetimini aynı monetization alanında tutarken veri modeli farkını UI seviyesinde netleştirmektir.

## Core Decisions

- Yeni ayrı route açılmayacak.
- `Kampanyalar` ekranı iki sekmeli olacak: `Kampanyalar | Kuponlar`
- Varsayılan sekme `Kampanyalar` olarak kalacak.
- Kupon sekmesi admin için listeleme + oluşturma ile başlayacak.
- Kupon ekranı `platform` ve `seller` kuponlarını aynı tabloda gösterecek.

## Data Model Fit

Kuponlar kampanyadan ayrı ele alınır çünkü:

- kod bazlıdır
- `maxUses` ve `perUserLimit` alanlarına sahiptir
- backend tarafında ayrı endpoint ile yönetilir

Bu yüzden kampanya formuna kupon alanı eklemek yerine aynı ekran içinde ayrı sekme kullanılır.

## UI Behavior

`Kampanyalar` sekmesi:

- mevcut listeleme davranışı korunur
- mevcut platform kampanyası oluşturma drawer'ı korunur

`Kuponlar` sekmesi:

- tablo kolonları: `code`, `sellerId`, `status`, `discountType`, `discountValue`, `maxUses`, `perUserLimit`, `startsAt`, `endsAt`
- filtreler: `status`, `sellerId`
- üst aksiyon: `Platform Kuponu`
- create drawer alanları: `code`, `discountType`, `discountValue`, `scopeType`, `scopeId`, `startsAt`, `endsAt`, `minAmount`, `maxUses`, `perUserLimit`

## API Contract

- listeleme: mevcut admin related veri veya rapor yerine doğrudan admin coupon endpoint kullanılmalı
- oluşturma: `POST /admin/coupons`

Eğer liste endpoint'i eksikse, admin UI ile uyumlu bir `GET /admin/coupons` endpoint eklenmelidir.

## Testing

- admin route smoke testi sekmeli coupon anchor'larını doğrulamalı
- coupon sekmesi açıldığında liste çağrısı yapılmalı
- platform coupon create akışı başarılı response ile drawer kapanmalı ve liste yenilenmeli

## Delivery Note

Bu iş, yeni ekran açmadan mevcut monetization bilgi mimarisini korur ve admin coupon yönetimini gerçek bir yüzeye taşır.
