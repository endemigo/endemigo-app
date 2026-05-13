# Admin Rewrite Parity Plan (Phase 0)

Amaç: Eski paneldeki feature kapsamını, yeni admin UI + mevcut backend ile kontrollü şekilde taşımak.

## 1) Mevcut Durum Özeti

- Eski panel taraması: 68 normalize ekran/route (legacy ASPX)
- Yeni backend admin hazır kapsamı:
  - Auth, dashboard/queues
  - users/sellers/products/categories/auctions/orders/payments/bids/payouts
  - ads, campaigns, membership
  - trust, settings, reports, mobile-config, audit, admin carts

## 2) Parity Gap (Legacy -> New Backend)

## 2.1 Doğrudan Karşılananlar

- Yönetim liste/detay/aksiyon akışları (users/sellers/products/orders/payments/...)
- Dashboard metrik/queue
- Audit ve raporlama
- Ayarlar (admin settings keys)
- Reklam / kampanya / üyelik / trust / mobile config

## 2.2 Kısmi Karşılananlar

- Sipariş: legacy'deki durum sekmeleri birebir değil, yeni enum modeline map gerekir.
- Ödeme/payout: legacy ekran dili farklı, yeni domain terminolojisi ile UI adaptation gerekir.

## 2.3 Backend Geliştirme Gerektirenler (Legacy'de var, backend'de yok)

- CMS: `Contents`, `News`, `Blogs`, `Faq`, `Discover`, `MenuManagement`
- Pazarlama içerikleri: `Banners`, `Popups`, `Polls`, `EBulletin`
- Katalog ek modülleri: `Brands`, `Variants`, `ProductsComments`, `ProductsCombines`
- Finans konfigurasyonları: `BankAccount`, `installment`, `VatTerms`, `Currency`
- Operasyon talepleri: `TransferNotify`, `GiveInfo`, `RequestProduct`, `MReferences`, `SuppliersComments`
- Destek/mesajlaşma: legacy support/contact akışlarının yeni modele endpoint bazında taşınması

## 3) Uygulama Stratejisi

1. Contract-first: sadece [admin-api-contract.md](./admin-api-contract.md) üzerinden geliştirme.
2. Anti-corruption adapter: legacy UI terimlerini backend DTO/enum'a mapleyen UI katmanı.
3. Fazlı teslimat:
   - Faz 1: Auth + Dashboard + Operations list/detail/action
   - Faz 2: Reports + Audit + Settings
   - Faz 3: Ads/Campaign/Membership/Trust
   - Faz 4: Mobile Config + Cart observability
   - Faz 5: Legacy gap modülleri için backend endpoint tasarımı + implementasyon
4. Her fazda parity checklist doğrulaması: liste/filtre/detay/aksiyon/export.

## 4) Definition of Done

- Endpoint sözleşmesi ihlali yok (`code/message` standardı dahil)
- Rol guard testleri geçti
- Admin kritik akışları e2e geçti
- Legacy parity checklist'teki ilgili faz maddeleri tamamlandı
