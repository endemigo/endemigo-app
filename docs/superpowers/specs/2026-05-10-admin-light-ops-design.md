# Admin UI-SPEC: Light Ops Console

Date: 2026-05-10

## Scope

Sıfırdan, legacy referans almayan özgün admin görsel sistemi.

## Core Decisions

- Theme: `Light-only`
- Visual direction: `Graphite + Emerald`
- Density: `Compact` (yüksek veri yoğunluğu)
- Navigation: `260px sabit sol sidebar + üst global action bar`
- Typography:
  - Heading: `Manrope`
  - Body/UI: `IBM Plex Sans`

## Information Architecture

- Dashboard
- Operations
- Catalog
- Finance
- Growth
- Risk
- Settings

## Layout Rules

1. Sidebar sabit, grup başlıklı modül navigasyonu.
2. Topbar sticky: global arama + hızlı aksiyonlar.
3. İçerik alanı table-first yaklaşım.
4. Detay/aksiyonlar sağ drawer ile in-place yönetilir.

## Data UI Standards

- Tablo başlıkları sticky.
- Filtreler üstte compact toolbar içinde.
- Durumlar badge ile normalize edilir (`success/warning/danger`).
- Kritik aksiyonlar net ton ayrımıyla sunulur.

## Motion

- Sadece anlamlı animasyon: sidebar aç/kapa, drawer, row hover.
- Genel geçişler kısa ve düşük dikkat dağıtıcı.

## Accessibility

- Yüksek kontrast metin tonu.
- Focus ring zorunlu (`brand` tabanlı).
- Minimum hit area: 34px.

## Delivery Note

Bu spec, `admin/src/layouts/AdminLayout.vue` ve `admin/src/styles.css` ile uygulanan skeleton için kaynak tasarım sözleşmesidir.
