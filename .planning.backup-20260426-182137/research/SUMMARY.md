# Research Summary — Endemigo

## Key Findings

### Stack
- **Mobile**: Expo SDK 52+, Expo Router, FlashList, TanStack Query, Zustand, Reanimated 3
- **Backend**: NestJS 11, TypeORM, PostgreSQL 16, Redis 7, BullMQ, Socket.IO
- **Admin**: Vue 3, Vite, Pinia, PrimeVue, ApexCharts
- **DevOps**: Docker, GitHub Actions, EAS, Nginx, PM2, k6

### Table Stakes
- Auth (JWT + refresh + RBAC), ürün CRUD, kategori, arama/filtreleme
- Gerçek zamanlı müzayede, escrow ödeme, dijital cüzdan
- Sipariş akışı, push bildirimler, seller tools, admin panel

### Differentiators
- **Fiyat Sor & Kapalı Devre Pazarlık** — rakiplerde yok, unique feature
- **İki türlü müzayede** — gerçek zamanlı + online süreli
- **Satıcı reklam sistemi** — platform gelir modeli
- **Kullanıcı güven sistemi** — davranış analizi

### Watch Out For
1. **Müzayede race conditions** — PostgreSQL transaction lock ZORUNLU
2. **Anti-sniping abuse** — max uzatma limiti koy
3. **Escrow deadlock** — otomatik timeout mekanizması gerekli
4. **WebSocket scaling** — Redis adapter kullan (10K users)
5. **Payment webhook idempotency** — duplicate order engelle
6. **Cüzdan bakiye tutarsızlığı** — double-entry bookkeeping

### Architecture
- Monolithic NestJS (modüler, microservice'e geçilebilir)
- 15+ NestJS module (auth, user, seller, product, auction, bid, order, payment, wallet, notification, search, campaign, ads, ask-price, trust, admin)
- Redis: cache + WebSocket adapter + job queue backend
- CDN for media serving

### Build Order Recommendation
12 faz — kontratın 12 haftalık planına paralel, dependency chain'e uygun
