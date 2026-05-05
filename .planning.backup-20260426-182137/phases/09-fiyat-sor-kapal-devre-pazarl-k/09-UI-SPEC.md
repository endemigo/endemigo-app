---
phase: 9
slug: fiyat-sor-kapal-devre-pazarl-k
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-21
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for Fiyat Sor & Kapalı Devre Pazarlık screens.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | React Native (Expo) |
| Preset | Endemigo Premium Design System (existing) |
| Component library | Custom components (existing pattern) |
| Icon library | Ionicons |
| Font | Inter (body), PlusJakartaSans (headings) |

> **Note:** All values below inherit from `mobile/constants/theme.ts`. No new design tokens introduced.

---

## Spacing Scale (Inherited)

| Token | Value | Usage in Phase 9 |
|-------|-------|-------------------|
| xs | 4px | Teklif kart iç boşluk |
| sm | 8px | Mesaj balonu padding |
| md | 12px | Form elemanları arası |
| base | 16px | Ekran kenar padding |
| lg | 20px | Konuşma listesi item arası |
| xl | 24px | Bölüm başlıkları üst boşluk |
| xxl | 32px | Ekran üst/alt boşluk |

---

## Typography (Phase 9 Specific Usage)

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Konuşma başlığı | PlusJakartaSans | 18px (subheading) | Bold | Ürün adı konuşma listesinde |
| Teklif tutarı | Inter | 20px (titleSm) | Bold | Teklif kartlarındaki fiyat |
| Mesaj metni | Inter | 14px (body) | Regular | Kullanıcı mesajları |
| Durum etiketi | Inter | 11px (sm) | SemiBold | OFFER_PENDING, ACCEPTED vb. |
| Zaman damgası | Inter | 10px (xs) | Regular | Mesaj/teklif zamanı |
| Süre sayacı | Inter | 12px (caption) | SemiBold | Teklif geçerlilik geri sayımı |
| Form etiketi | Inter | 13px (meta) | Medium | Miktar, not alanı etiketleri |
| Boş durum | Inter | 15px (bodyLg) | Medium | "Henüz konuşma yok" |

---

## Color (Phase 9 Specific Usage)

| Role | Value | Usage |
|------|-------|-------|
| Fiyat Sor butonu | `#0097D8` (primary) | Ürün kartı ve detay sayfasındaki CTA |
| Teklif gönder butonu | `#0097D8` (primary) | Teklif formu gönder aksiyonu |
| Kabul Et butonu | `#36A936` (secondary/green) | Teklifi kabul et aksiyonu |
| Reddet butonu | `#BA1A1A` (error) | Teklifi reddet aksiyonu |
| Karşı Teklif butonu | `#F26838` (accent/orange) | Karşı teklif gönder aksiyonu |
| Süre dolmak üzere | `#F26838` (accent) | Son 2 saat uyarı rengi |
| Süre dolmuş | `#BA1A1A` (error) | Expired teklif kartı arka planı |
| Satıcı balonu | `#C9E6FF` (primaryFixed) | Satıcı mesaj/teklif arka planı |
| Alıcı balonu | `#E7E8E9` (surfaceContainerHigh) | Alıcı mesaj arka planı |
| İhlal uyarısı | `#FFDAD6` (errorContainer) | Platform dışı yönlendirme uyarı kartı |
| Konuşma badge | `#0097D8` (primary) | Okunmamış mesaj sayacı |

Accent reserved for: Karşı Teklif butonu, süre dolmak üzere uyarısı.

---

## Screen Inventory

### S-01: Konuşma Listesi (Mesajlarım)
- **Konum:** Profil → Mesajlarım (mevcut placeholder değiştirilecek)
- **Yapı:** Ürün bazlı gruplandırılmış FlashList
- **Her item:** Ürün görseli (48x48, borderRadius: lg) + ürün başlığı + son teklif durumu + zaman + okunmamış badge
- **Boş durum:** İkon + "Henüz konuşma yok" + "Ürünlere göz atarak satıcılarla iletişime geçin" + "Ürünleri Keşfet" butonu
- **Pull-to-refresh:** Aktif
- **Skeleton:** 4 adet konuşma placeholder

### S-02: Fiyat Sor Formu (Bottom Sheet)
- **Tetikleme:** Ürün detay sayfasında "Fiyat Sor" butonuna basınca
- **Yapı:** Bottom sheet (60% ekran yüksekliği)
- **Alanlar:** Miktar input (numeric, varsayılan 1), Not alanı (opsiyonel, max 200 karakter)
- **CTA:** "Gönder" butonu (primary, full-width)

### S-03: Konuşma Detay Ekranı
- **Yapı:** Üstte ürün bilgi kartı (kompakt) + ortada teklif akışı listesi + altta aksiyon alanı
- **Teklif akışı:** Kronolojik FlashList, satıcı teklifleri sağ hizalı (primaryFixed), alıcı teklifleri sol hizalı (surfaceContainerHigh)
- **Aksiyon alanı:** Satıcı: "Fiyat Teklif Et", Alıcı: "Kabul Et"/"Reddet"/"Karşı Teklif", her iki taraf: "Görüşmeyi Kapat"

### S-04: Teklif Gönder Bottom Sheet
- **Alanlar:** Tutar input (numeric, ₺ prefix), Geçerlilik süresi seçici (12h/24h/48h/72h chip group, varsayılan 48h)
- **CTA:** "Teklif Gönder" (primary, full-width)

### S-05: Karşı Teklif Bottom Sheet
- Satıcının teklifi (read-only), Karşı teklif tutar input
- **CTA:** "Karşı Teklif Gönder" (accent renk, full-width)

### S-06: Ürün Kartı (Fiyat Sor Modu)
- Fiyat alanı gizli, yerine "Fiyat Sor" butonu (primary renk, compact)

---

## Copywriting Contract

| Element | Copy (TR) |
|---------|-----------|
| Fiyat Sor butonu | "Fiyat Sor" |
| Teklif gönder CTA | "Teklif Gönder" |
| Karşı teklif CTA | "Karşı Teklif Gönder" |
| Kabul et CTA | "Kabul Et" |
| Reddet CTA | "Reddet" |
| Ödemeye git CTA | "Ödemeye Git" |
| Görüşmeyi kapat | "Görüşmeyi Kapat" |
| Boş durum başlık | "Henüz konuşma yok" |
| Boş durum açıklama | "Ürünlere göz atarak satıcılarla iletişime geçin" |
| Platform dışı uyarı | "Platform dışı iletişim bilgisi paylaşılamaz" |
| Teklif süresi doldu | "Teklifin süresi doldu" |
| Ürün satıldı | "Bu ürün satıldı, görüşme kapatıldı" |
| Onay: görüşme kapat | "Bu görüşmeyi kapatmak istediğinize emin misiniz?" |

---

## Durum Etiketleri (State Badge)

| State | Renk | Arka plan | Metin |
|-------|------|-----------|-------|
| OPEN | primary | primaryFixed | Açık |
| NEGOTIATING | accent | #FFF3E0 | Pazarlık |
| OFFER_PENDING | primary | primaryFixed | Teklif Bekliyor |
| ACCEPTED | secondary | #E8F5E9 | Kabul Edildi |
| PAYMENT_PENDING | accent | #FFF3E0 | Ödeme Bekleniyor |
| COMPLETED | secondary | secondaryContainer | Tamamlandı |
| REJECTED | error | errorContainer | Reddedildi |
| EXPIRED | slate500 | slate100 | Süresi Doldu |
| CANCELLED | slate500 | slate100 | İptal Edildi |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-21
