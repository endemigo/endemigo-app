# Endemigo Backend

Guncelleme tarihi: 13 Mayis 2026

## Hızlı Komutlar

```bash
cd backend
npm install
npm run build
npm run test -- --runInBand --watchman=false
```

## Geliştirme

```bash
cd backend
npm run start:dev
```

## E2E Test Ortamı

```bash
cd backend
npm run test:e2e:services
npm run test:e2e:local
npm run test:e2e:services:down
```

`test:e2e:local` komutu su env degerleri ile calisir:

- `NODE_ENV=development`
- `DATABASE_URL=postgres://endemigo:endemigo_test@localhost:55432/endemigo_test`
- `REDIS_HOST=localhost`
- `REDIS_PORT=56379`
- `JWT_SECRET=e2e_test_secret`

## Veritabanı Migration

```bash
cd backend
npm run migration:run
```

P0 kapsaminda eklenen migration:

- `1747700000000-Phase22WalletDefaultBalanceZero.ts`

## Modüller (özet)

- `auth`, `user`, `product`, `search`, `auction`, `wallet`, `order`, `payment`, `cargo`, `notification`
- `admin-auth`, `admin-operations`, `admin-settings`, `admin-audit`, `reports`, `mobile-config`
- `campaign`, `membership`, `trust`, `cart`, `ledger`, `health`

## Monitoring

- Config dosyalari:
  - `backend/src/common/monitoring/monitoring.config.ts`
  - `backend/src/common/monitoring/sentry-bootstrap.ts`
- Sentry paketi kuruluysa bootstrap sirasinda init edilir.
- Paket kurulu degilse uygulama calismaya devam eder ve init skip edilir.
