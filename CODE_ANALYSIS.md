# Endemigo Kod Analiz Raporu

> Güncelleme tarihi: 13 Mayis 2026

## 13 Mayis 2026 Notu (Durum Guncellemesi)

Bu dosya 28 Nisan snapshot'i uzerinden yazilmisti. Asagidaki kritik maddeler
guncel kodda kapatildi:

- Wallet default bakiye `10000` degil, `0` oldu.
- Payment webhook signature kontrolu zorunlu oldu.
- Order transition'da bulunamayan order icin basarili donus kaldirildi.
- `releaseAllHoldsForAuction` tek transaction kapsaminda calisacak sekilde guncellendi.
- `useAuctionSocket` tarafinda `Alert.alert` kullanimi kaldirildi (custom modal).

Bu nedenle bu dokumandaki bazi satirlar tarihsel referans olarak kalmistir.

---

## KRİTİK Sorunlar

| # | Kategori | Dosya | Satır | Sorun |
|---|----------|-------|-------|-------|
| 1 | **Güvenlik** | `backend/src/modules/wallet/wallet.service.ts` | 52, 417 | Yeni cüzdana **10.000 TL** default bakiye veriliyor. Production'da her yeni kullanıcı ücretsiz 10.000 TL almış olur. |
| 2 | **Güvenlik** | `backend/src/modules/payment/payment.service.ts` | 107-118 | Webhook signature doğrulaması sadece `providerEventRepository` VE `iyzicoProvider` mevcutsa yapılıyor. Eksikse tamamen atlanıyor. |
| 3 | **Mantık** | `backend/src/modules/auction/auction.service.ts` | 781 | `emitBidLost` kazanan kullanıcıya (`winningBid.bidderId`) gönderiliyor. Kazanana hem `emitBidWinner` hem `emitBidLost` gidiyor. |
| 4 | **Mantık** | `backend/src/modules/order/order.service.ts` | 148-165 | `order` null ise (bulunamadıysa) `OrderStatus.CREATED` fallback ile "Order transitioned" başarılı yanıtı dönüyor. |

---

## YÜKSEK ÖNCELİK Sorunlar

| # | Kategori | Dosya | Satır | Sorun |
|---|----------|-------|-------|-------|
| 5 | Güvenlik | `backend/src/modules/payment/payment.service.ts` | 29, 271-278 | In-memory `Set<string>` ile webhook idempotency kontrolü. Restart'ta kaybolur, cluster'da tutarsız, memory leak oluşturur. |
| 6 | Mantık | `backend/src/modules/wallet/wallet.service.ts` | 314-326 | `releaseAllHoldsForAuction` döngüsünde her hold için ayrı transaction açılıyor. İlk başarılı, ikinci başarısız olursa tutarsız durum. |
| 7 | Bug | `mobile/hooks/useAuctionSocket.ts` | 80-83, 113, 142 | `Alert.alert()` kullanımı. CONVENTIONS.md Madde 11 ihlali: Native Alert KESİNLİKLE KULLANILMAYACAKTIR. |
| 8 | Bug | `mobile/app/auction/[id].tsx` | 53-58 | `currentPrice` her değiştiğinde kullanıcının girdiği teklif miktarı sıfırlanıyor. |
| 9 | Bug | `mobile/app/(tabs)/notification-preferences.tsx` | 41-43 | `push` her zaman `inApp`'in tersine set ediliyor. Kullanıcı ikisini ayrı ayrı kontrol edemiyor. |
| 10 | Bug | `mobile/app/(tabs)/index.tsx` | 183-197 | "Hemen Al" tile'ı tamamen işlevsiz. Dış `TouchableOpacity`'a `onPress` verilmemiş, iç butonun da `onPress`'i yok. |

---

## ORTA ÖNCELİK Sorunlar

### Duplication (Tekrar Eden Kod)

| # | Dosya | Satır | Sorun |
|---|-------|-------|-------|
| 11 | `backend/src/modules/auth/auth.service.ts` | 78-90, 120-132, 178-190 | User response objesi `register`, `login`, `refresh` metodlarında 3 kez tekrar ediyor. |
| 12 | `backend/src/modules/product/product.service.ts` + `backend/src/modules/search/search.service.ts` | 347-389, 243-268 | Aynı product response mapping iki dosyada bağımsız tanımlı. |
| 13 | `mobile/app/(tabs)/index.tsx` + `mobile/app/(tabs)/categories.tsx` | 14-27, 10-28 | `getCategoryIcon` fonksiyonu ve `CATEGORY_ICONS` map'i iki dosyada duplicate. |

### Bug

| # | Dosya | Satır | Sorun |
|---|-------|-------|-------|
| 14 | `backend/src/modules/auth/auth.service.ts` | 310, 323, 332, 366 | Hardcoded response code (`'EMAIL_VERIFIED'`, `'RESET_EMAIL_SENT'`, `'PASSWORD_RESET'`). `RC` objesi kullanılmalı. |
| 15 | `backend/src/modules/product/product.service.ts` | 129 | Hardcoded `'PUBLISHED', 'ACTIVE'` string'leri. `AuctionStatus` enum'u varken kullanılmıyor. |
| 16 | `backend/src/modules/cargo/cargo.service.ts` | 125-128 | Hata durumunda `RC.CARGO_STATUS_TRANSITIONED` (başarılı kodu) kullanılıyor. |
| 17 | `mobile/hooks/useProducts.ts` | 60, 71 | `data.items || data` inconsistent response handling. Tip güvenliğini bozar. |
| 18 | `mobile/hooks/useAuctions.ts` | 120 | Hardcoded `['wallet']` query key invalidation. `WALLET_QUERY_KEYS` import edilmemiş. |

### Performans

| # | Dosya | Satır | Sorun |
|---|-------|-------|-------|
| 19 | `backend/src/modules/auction/auction.service.ts` | 304-563 | Tek bir `placeBid` işlemi için 10+ DB sorgusu. Wallet iki kez sorgulanıyor (satır 371 ve 384). |
| 20 | `backend/src/modules/search/search.service.ts` | 76-83 | Favoriler için N+1 query. `In()` operatörü kullanılmalı. |
| 21 | `mobile/hooks/useNotifications.ts` | 174-178 | `Promise.all` ile 50 okunmamış bildirim = 50 paralel PATCH isteği. Rate limiting riski. |
| 22 | `mobile/app/(tabs)/index.tsx` | 403-436 | Her render'da tüm ürünler her kategori için filtreleniyor. `O(categories × products)`. `useMemo` ile optimize edilmeli. |
| 23 | `mobile/hooks/useAuctions.ts` | 67-68, 80-81 | Mock modda bile her 5 saniye polling. Socket.IO zaten real-time sağlıyor. |

---

## DÜŞÜK ÖNCELİK / CONVENTIONS İhlalleri

### i18n İhlali (Madde 9 — Hardcoded Türkçe String'ler)

| Dosya | Satır | Hardcoded String |
|-------|-------|-----------------|
| `mobile/app/(tabs)/index.tsx` | 353 | `"Editörün Seçimi"` |
| `mobile/app/(tabs)/index.tsx` | 361 | `"Güncel Kampanyalar"` |
| `mobile/app/auction/[id].tsx` | 82 | `"Minimum teklif: ₺..."` |
| `mobile/app/auction/[id].tsx` | 90-91 | `"Başarılı! 🎉"`, `"...teklifiniz kabul edildi."` |
| `mobile/app/auction/[id].tsx` | 95 | `'Teklif verilemedi'` |
| `mobile/app/auction/[id].tsx` | 165-166 | `"Alıcı Primi (%...)"` |
| `mobile/app/auction/[id].tsx` | 187 | `"Müzayede Bitti"` |
| `mobile/app/auction/[id].tsx` | 233 | `"Bakiye: ...₺"` |
| `mobile/app/auction/[id].tsx` | 272 | `"Alıcı primi dahil toplam: ₺..."` |
| `mobile/app/auction/[id].tsx` | 285-297 | `"Tebrikler!"`, `"Müzayedeyi ... ile kazandınız!"` |
| `mobile/app/product/[id].tsx` | 75 | `'Bilinmiyor'` |
| `mobile/components/auction/CountdownTimer.tsx` | 89 | `'⚡ Son saniyeler!'`, `'Kalan Süre'` |
| `mobile/hooks/useAuctionSocket.ts` | 81 | `'⚠️ Teklifiniz Geçildi!'` |
| `mobile/hooks/useAuctionSocket.ts` | 113 | `'⏱ Süre Uzatıldı!'` |
| `mobile/hooks/useAuctionSocket.ts` | 142 | `'Müzayede İptal'` |
| `mobile/hooks/useAuctions.ts` | 135 | `"Müzayede oluşturma mock'ta desteklenmiyor"` |

### Style Separation İhlali (Madde 1)

| Dosya | Satır | Sorun |
|-------|-------|-------|
| `mobile/components/ui/HorizontalProductGrid.tsx` | 45-57 | `StyleSheet.create` component dosyasının içinde. Ayrılmamış. |

### Type Safety İhlali (Madde 10 — `any` Kullanımı)

| Dosya | Satır | Kullanım |
|-------|-------|---------|
| `mobile/app/auction/[id].tsx` | 94 | `catch (err: any)` |
| `mobile/lib/storage.ts` | 29 | `getUser(): Promise<any \| null>` |
| `mobile/lib/mockService.ts` | 215 | `Record<string, any[]>` |

### Dead Code / Anlamsız Kod

| Dosya | Satır | Sorun |
|-------|-------|-------|
| `mobile/app/(tabs)/orders.tsx` | 33 | `ESCROW_HELD` filter label tanımlı ama `STATUS_FILTERS` dizisinde yok, asla render edilmez. |
| `mobile/app/(tabs)/index.tsx` | 170 | `editable={false}` search bar. Tamamen dekoratif, tıklanamaz, yazılamaz. |
| `mobile/app/(tabs)/index.tsx` | 457 | `console.log('Blog pressed', blog.id)` — Debug kodu production'da. Blog kartı işlevsiz. |
| `backend/src/modules/notification/notification.service.ts` | 220-229 | Tüm `NotificationEventType` değerleri için channels oluşturuluyor, kullanıcının hiç almayacağı event'ler dahil. |
| `backend/src/modules/order/order.service.ts` | 151 | `order` null ise `OrderStatus.CREATED` fallback ile sanki yeni oluşturulmuş gibi transition kontrolü yapılıyor. |

---

## Düzeltme Önceliği

```
1.  wallet.service.ts       → balance: 0 yap (KRİTİK)
2.  auction.service.ts      → emitBidLost kazanana gitmemeli
3.  order.service.ts         → order bulunamazsa hata dön
4.  payment.service.ts       → signature kontrol zorunlu olmalı
5.  useAuctionSocket.ts      → Alert.alert → showModal
6.  auction/[id].tsx         → input overwrite fix
7.  index.tsx                → shop tile onPress ekle
8.  i18n                     → hardcoded string'leri tr.json'a taşı
9.  search.service.ts        → N+1 query fix (In operatörü)
10. auction.service.ts       → duplicate wallet query fix
11. auth.service.ts          → user response helper'a çıkar
12. HorizontalProductGrid.tsx → style ayrılmalı
13. storage.ts               → any → User tipi
14. useNotifications.ts      → bulk endpoint veya batch
15. index.tsx                → kategori filtreleme useMemo
```

---

## Özet

| Kategori | Sayı |
|----------|------|
| KRİTİK | 4 |
| YÜKSEK | 6 |
| ORTA | 13 |
| DÜŞÜK | 20+ |
| **TOPLAM** | **43+** |

Kritik sorunlar (özellikle 10.000 TL default bakiye ve webhook signature atlanması) production'a çıkmadan önce mutlaka düzeltilmeli.
