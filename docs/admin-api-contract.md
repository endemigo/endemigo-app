# Admin API Contract (Phase 0)

Bu doküman, yeni admin panelin mevcut backend ile birebir uyumu için resmi sözleşmedir.

## 1) Global Kurallar

- Kimlik doğrulama: `Authorization: Bearer <admin_access_token>`
- Admin login endpoint'i: `POST /admin/auth/login`
- Admin token doğrulama: `GET /admin/auth/me`
- Rol kontrolü: `AdminJwtGuard` + `@AdminRoles(...)`
- Zorunlu response standardı (CONVENTIONS.md):
  - Başarılı: `{ code, message, ...data }`
  - Hata: global filter ile
    - `{ success:false, error:{ code, message, statusCode }, timestamp }`

## 2) Admin Roller

- `SUPER_ADMIN`
- `OPERATIONS`
- `FINANCE`
- `SUPPORT`

## 3) Ortak DTO Sözleşmeleri

- `AdminLoginDto`: `{ email, password }`
- `AdminListQueryDto`: `{ page?, limit?, status?, q?, from?, to? }`
- `AdminActionDto`: `{ reason, metadata? }`
- Kategori create/update aksiyonları `AdminActionDto + Partial<Category>` ile çalışır.

## 4) Endpoint Envanteri (Admin)

## 4.1 Auth

- `POST /admin/auth/login`
- `GET /admin/auth/me`

## 4.2 Dashboard / Queue / Generic Admin Ops

- `GET /admin/queues`
- `GET /admin/dashboard/metrics`
- `GET /admin/users`
- `GET /admin/users/:id`
- `GET /admin/sellers`
- `GET /admin/sellers/:id`
- `GET /admin/products`
- `GET /admin/products/:id`
- `GET /admin/categories`
- `GET /admin/categories/:id`
- `GET /admin/auctions`
- `GET /admin/auctions/:id`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `GET /admin/payments`
- `GET /admin/payments/:id`
- `GET /admin/bids`
- `GET /admin/bids/:id`
- `GET /admin/payout-requests`
- `GET /admin/payout-requests/:id`

Aksiyonlar:
- `PATCH /admin/sellers/:id/approve`
- `PATCH /admin/sellers/:id/reject`
- `PATCH /admin/users/:id/restrict`
- `PATCH /admin/users/:id/reactivate`
- `PATCH /admin/products/:id/remove`
- `PATCH /admin/auctions/:id/cancel`
- `PATCH /admin/orders/:id/admin-review`
- `PATCH /admin/payments/:id/admin-review`
- `PATCH /admin/payout-requests/:id/approve`
- `PATCH /admin/payout-requests/:id/reject`

Kategori yönetimi:
- `POST /admin/categories`
- `PATCH /admin/categories/:id`
- `DELETE /admin/categories/:id`

## 4.3 Settings

- `GET /admin/settings`
- `PATCH /admin/settings/:key`

`AdminSettingKey`:
- `COMMISSION_DEFAULT_RATE`
- `ESCROW_AUTO_CONFIRM_HOURS`
- `CARGO_MOCK_ENABLED`
- `NOTIFICATION_TEMPLATE_OVERRIDES`
- `AD_SPONSORED_DENSITY`
- `TRUST_GRACE_DAYS`

## 4.4 Reports

- `GET /admin/reports/:type`
- `GET /admin/reports/:type/export?format=csv|xlsx|pdf`

`ReportType`:
- `ads`, `campaigns`, `membership`, `payouts`, `orders`, `payments`, `trust`

Export response notu:
- Body dosya döner, header:
  - `X-Response-Code`
  - `X-Response-Message`

## 4.5 Audit

- `GET /admin/audit-logs`

Query:
- `actorAdminId?`, `action?`, `targetType?`, `targetId?`, `page?`, `limit?`

## 4.6 Trust

- `POST /admin/trust/flags`
- `PATCH /admin/trust/flags/:id/review`
- `POST /admin/trust/restrictions`
- `PATCH /admin/trust/restrictions/:id/resolve`

## 4.7 Ads

- `GET /admin/ads`
- `GET /admin/ads/slot-calendar`
- `GET /admin/ads/slot-conflicts`
- `PATCH /admin/ads/requests/:id/approve`
- `PATCH /admin/ads/requests/:id/reject`
- `PATCH /admin/ads/requests/:id/publish`

## 4.8 Campaign / Coupon (Admin)

- `POST /admin/campaigns`
- `POST /admin/coupons`

## 4.9 Membership (Admin)

- `POST /admin/membership/packages`
- `PATCH /admin/membership/packages/:id`

## 4.10 Mobile Config (Admin)

- `GET /admin/mobile-config/draft`
- `PATCH /admin/mobile-config/draft`
- `POST /admin/mobile-config/publish`
- `GET /admin/mobile-config/published`

## 4.11 Cart Observability (Admin)

- `GET /admin/carts`
- `GET /admin/carts/items`

## 5) Kritik Enumlar (UI Filter / Badge için)

- `OrderStatus`: `CREATED`, `PAYMENT_PENDING`, `ESCROW_HELD`, `PREPARING_SHIPMENT`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `FAILED`, `ADMIN_REVIEW`
- `PaymentStatus`: `PENDING`, `AUTHORIZED`, `ESCROW_HELD`, `FAILED`, `ADMIN_REVIEW`, `REFUNDED`
- `PayoutRequestStatus`: `REQUESTED`, `ADMIN_REVIEW`, `APPROVED`, `REJECTED`, `PAID`, `CANCELLED`
- `ProductStatus`: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `UNDER_AUCTION`, `SOLD`, `OUT_OF_STOCK`, `ARCHIVED`, `SUSPENDED`
- `AuctionStatus`: `DRAFT`, `PUBLISHED`, `ACTIVE`, `ENDED`, `COMPLETED`, `CANCELLED`, `FAILED`
- `SellerStatus`: `PENDING`, `APPROVED`, `SUSPENDED`, `TERMINATED`

## 6) Uyum Notu (Frontend)

Yeni admin panelde endpoint sözleşmesi tek bir typed client üzerinden kullanılmalı:
- her response için `code` zorunlu kontrol
- hata mesajında `error.code` öncelikli parse
- 401'de token temizleme + login redirect
