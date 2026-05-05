# Stack Research — Endemigo Hibrit E-Ticaret Platformu

## Mobile App (React Native / Expo)

| Technology | Version | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Expo SDK | 52+ | Production standard, EAS CI/CD, OTA updates | ✅ High |
| Expo Router | v4 | File-based navigation, deep linking | ✅ High |
| React Native Reanimated 3 | 3.x | Native thread animations (geri sayım, teklif) | ✅ High |
| FlashList (Shopify) | 1.x | Performant list rendering | ✅ High |
| TanStack Query | 5.x | Server state, caching, background sync | ✅ High |
| Zustand | 5.x | Lightweight client state | ✅ High |
| Socket.IO Client | 4.x | Real-time auction bidding | ✅ High |
| OneSignal | - | Push notifications | ✅ High |
| React Native MMKV | 3.x | Fast local storage | ✅ High |
| Expo Image | 2.x | Optimized image loading | ✅ High |

### NOT to use:
- **Redux** — Zustand + TanStack Query yeterli
- **FlatList** — FlashList daha performanslı
- **AsyncStorage** — MMKV çok daha hızlı

## Backend (NestJS)

| Technology | Version | Rationale | Confidence |
|-----------|---------|-----------|------------|
| NestJS | 11.x | Modular, TypeScript-native, Swagger | ✅ High |
| TypeORM | 0.3.x | PostgreSQL ORM, migration, relations | ✅ High |
| Passport.js + JWT | - | Auth + refresh token | ✅ High |
| Socket.IO Server | 4.x | WebSocket müzayede | ✅ High |
| Redis (ioredis) | 5.x | Cache, PubSub, session | ✅ High |
| BullMQ | 5.x | Job queues (Redis-based, RabbitMQ alternatifi) | ✅ High |
| class-validator | - | DTO validation | ✅ High |
| @nestjs/throttler | - | Rate limiting | ✅ High |
| Helmet | - | Security headers | ✅ High |
| Sentry | - | Error tracking | ✅ High |
| Multer + Sharp | - | Image upload/optimization | ✅ High |

### BullMQ vs RabbitMQ Kararı
Redis zaten altyapıda var → BullMQ ek altyapı maliyeti getirmez. 10K kullanıcı ölçeğinde yeterli.

### NOT to use:
- **Prisma** — TypeORM NestJS ekosistemine daha uyumlu
- **RabbitMQ** — BullMQ Redis üzerinden çalışır, ek maliyet yok

## Database

| Technology | Version | Rationale | Confidence |
|-----------|---------|-----------|------------|
| PostgreSQL | 16.x | İlişkisel bütünlük, JSONB, transaction lock | ✅ High |
| Redis | 7.x | Cache, PubSub, queue backend | ✅ High |

## Admin Panel (Vue.js)

| Technology | Version | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Vue 3 | 3.5+ | Composition API | ✅ High |
| Vite | 6.x | Fast dev server | ✅ High |
| Pinia | 2.x | State management | ✅ High |
| Vue Router | 4.x | Routing | ✅ High |
| PrimeVue | 4.x | Rich UI components (tables, charts) | 🔶 Medium |
| ApexCharts | - | Dashboard grafikleri | ✅ High |
| Axios | 1.x | HTTP client | ✅ High |
| Socket.IO Client | 4.x | Real-time dashboard | ✅ High |

## DevOps

| Technology | Rationale | Confidence |
|-----------|-----------|------------|
| Docker + Compose | Dev/staging ortamı | ✅ High |
| GitHub Actions | CI/CD pipeline | ✅ High |
| EAS | Mobile builds, OTA | ✅ High |
| Caddy | Reverse proxy (otomatik SSL, zero-config WebSocket) | ✅ High |
| PM2 | Process management | ✅ High |
| k6 / Artillery | Load testing (10K users) | ✅ High |

## Finalized Decisions

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Ödeme sistemi | **İyzico** | Marketplace escrow native desteği, iyi API | 2026-04-07 |
| Escrow otomatik onay süresi | **14 gün** | Teslimattan itibaren, sektör standardı | 2026-04-07 |
| CDN / Object Storage | **CloudFlare R2** | Egress ücretsiz, global edge cache | 2026-04-07 |
| Redis Pub/Sub | **Baştan kurulacak** | 10K concurrent user + multi-instance zorunlu | 2026-04-07 |
| Git stratejisi | **Trunk-based** | Solo developer, hızlı iterasyon | 2026-04-07 |
| Reverse proxy | **Caddy** | Otomatik SSL, basit config, WebSocket native | 2026-04-07 |
| Mesaj kuyruğu | **BullMQ** | Redis üzerinden, ek altyapı maliyeti yok | 2026-04-07 |
| Email servisi | **TBD** (SendGrid/Resend/SES) | Auth doğrulama + şifre sıfırlama için | 2026-04-07 |
| Admin dashboard real-time | **Socket.IO** | Backend zaten Socket.IO kullanıyor | 2026-04-07 |
| Platform dışı yönlendirme tespiti | **Keyword/URL/IBAN pattern matching** | Regex-based filtre | 2026-04-07 |

### NOT to use:
- **Nginx** — Caddy daha basit, otomatik SSL, bu ölçekte performans eşit
- **PayTR** — İyzico marketplace desteği daha güçlü
- **GitFlow** — Solo developer için gereksiz karmaşıklık
