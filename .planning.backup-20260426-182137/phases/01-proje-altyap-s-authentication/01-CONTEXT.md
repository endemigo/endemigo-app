# Phase 1: Proje Altyapısı & Authentication - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Audit artifacts (REQUIREMENTS.md, IMPLEMENTATION_TASKS.md, EXECUTION_ORDER.md, FULL_AUDIT.md)

<domain>
## Phase Boundary

Phase 1 delivers the entire project foundation: monorepo structure, backend scaffold (NestJS), mobile scaffold (React Native/Expo), admin scaffold (Vue.js), database setup (PostgreSQL + Redis), authentication system (JWT + refresh token + RBAC), and all cross-cutting infrastructure (error handling, security headers, rate limiting, logging, graceful shutdown). This phase is the sole blocker for all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- Ayrı dizinler: `backend/`, `mobile/`, `admin/`
- Ortak tipler için `shared/` dizini (WS events, DTOs — Phase 5'te doldurulacak)
- Her biri bağımsız package.json ile yönetilir

### Backend (NestJS)
- NestJS 11.x, TypeScript strict mode
- Modüler yapı: `src/modules/auth/`, `src/modules/user/`, `src/common/`
- TypeORM 0.3.x ile PostgreSQL 16 bağlantısı
- ioredis 5.x ile Redis 7 bağlantısı (retry strategy: exponential backoff, max 5s)
- BullMQ 5.x queue altyapısı (sadece config, joblar Phase 5+'da)
- Swagger/OpenAPI otomatik dokümantasyon
- Global exception filter: HttpException + unknown → structured JSON response + Sentry log
- Custom exception sınıfları: BusinessException, InsufficientBalanceException, InvalidTransitionException
- Transaction wrapper: reusable `withTransaction(callback)` pattern
- Health check endpoints: `/health`, `/health/db`, `/health/redis`
- DB connection pool monitoring (RELY-13): pool size = 20, alarm at %90
- Graceful shutdown (RELY-14): SIGTERM → drain connections → close WS → exit

### Authentication
- Passport.js + JWT strategy
- Access token: 15 dakika, refresh token: 7 gün
- Refresh token rotation: her kullanımda yeni token, eski invalidate
- Token blacklisting: Redis SET ile logout/invalidation
- Şifre: bcrypt, salt rounds = 12
- Email doğrulama: magic link (24h expiry)
- Şifre sıfırlama: token-based link (1h expiry)
- RBAC: 3 rol — `user`, `seller`, `admin`
- Guard decorator pattern: `@Roles(Role.ADMIN)`, `@Public()`
- Rate limiting: auth endpoints 5 req/dk (SECU-10)

### Database
- PostgreSQL 16.x
- TypeORM entity pattern: abstract BaseEntity (id, createdAt, updatedAt, deletedAt)
- Migration strategy: date-prefixed, up/down destekli
- Soft delete: `@DeleteDateColumn()` ile (RELY-06)
- UUID primary keys (v4)

### Redis
- Redis 7.x
- Kullanım: token blacklist, rate limit counter, health check
- Connection config: retry strategy, ready check, reconnect on error
- Bağlantı kopması durumu: alert + degraded mode (TASK-21)

### Security
- Helmet.js: security headers (X-Frame-Options, CSP, etc.)
- @nestjs/throttler: global rate limit + endpoint-specific overrides
- class-validator: tüm DTO'larda validation
- CORS: mobile app origin only (production'da)
- HTTPS only (Caddy reverse proxy — production)
- Hard-coded credential yok (SECU-06)
- SSH key only prod erişim (SECU-07, sadece dokümantasyon)

### Mobile (React Native / Expo)
- Expo SDK 55, Expo Router v4
- Zustand 5.x: auth state (token, user, isLoggedIn)
- TanStack Query 5.x: API client, retry config (3x exponential)
- MMKV 3.x: token storage (fast, encrypted)
- API client: Axios interceptor (auto attach JWT, auto refresh on 401)
- Error Boundary: crash → user-friendly error screen (RELY-15)
- API error handling: 4xx/5xx → Türkçe toast mesajı (RELY-16)
- Network connectivity: NetInfo listener → offline banner (RELY-18)
- Login, Register, Forgot Password, Email Verification ekranları

### Admin Panel (Vue.js)
- Vue 3.5+ Composition API, Vite 8.x
- PrimeVue 4.x UI framework 
- Pinia 2.x state management
- Vue Router 4.x
- Axios 1.x HTTP client
- Sadece scaffold: login ekranı + layout (tüm CRUD Phase 11'de)

### Audit Log Altyapısı
- AuditLog entity: `action`, `actorId`, `actorRole`, `targetType`, `targetId`, `metadata` (JSONB), `timestamp`
- AuditService: injectable, tüm modüllerden çağrılabilir
- Dekoratör: `@Auditable('USER_LOGIN')` gibi method-level (optional)

### DevOps & Process
- TASK-20: `.env.example` tüm değişkenler dokümante
- Docker Compose: PostgreSQL + Redis (local dev)
- TASK-17: CONTRIBUTING.md, conventional commits
- TASK-18: Security incident process doc
- Sentry integration: `@sentry/nestjs`
- Email provider: Resend veya SendGrid (env variable ile configurable)

### Double-Entry Bookkeeping Altyapısı
- LedgerAccount entity: type (enum), ownerId, balance
- JournalEntry entity: referenceType, referenceId, timestamp, description
- JournalLine entity: entryId, accountId, type (DEBIT/CREDIT), amount
- AccountType enum: USER_WALLET, SELLER_WALLET, PLATFORM_COMMISSION, ESCROW_HOLDING, PAYMENT_PROVIDER
- Sadece entity + migration bu fazda — iş mantığı Phase 6'da

### Agent's Discretion
- Email provider seçimi (Resend vs SendGrid) — her ikisi de env variable ile configurable olacak
- Sentry DSN setup detayları
- Docker Compose port numaraları
- Swagger UI customization (renk, logo)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Finalized project decisions, payment phases, handoff checklist
- `.planning/REQUIREMENTS.md` — 222 requirements, traceability matrix

### Technical Stack
- `.planning/research/STACK.md` — Finalized tech stack (NestJS, TypeORM, Expo, Vue, Caddy)
- `.planning/research/ARCHITECTURE.md` — 3-tier architecture, module structure

### Implementation Tasks
- `.planning/IMPLEMENTATION_TASKS.md` — 22 concrete tasks with TypeScript code snippets
  - TASK-16: Sprint demo & biweekly report templates
  - TASK-17: Git conventions & workflow
  - TASK-18: Security incident reporting
  - TASK-20: Environment separation strategy
  - TASK-21: Redis connection loss handling

### Audit
- `.planning/FULL_AUDIT.md` — 11-step adversarial audit, Definition of Done for Phase 1
- `.planning/TEST_MATRIX.md` — Per-requirement test scenarios with acceptance criteria

### Execution
- `.planning/EXECUTION_ORDER.md` — Build order, dependency graph, critical path

</canonical_refs>

<specifics>
## Specific Ideas

- Auth endpoint'leri: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, POST /auth/forgot-password, POST /auth/reset-password, GET /auth/verify-email/:token
- User entity: id, email, passwordHash, firstName, lastName, role, isVerified, isActive, createdAt, updatedAt, deletedAt
- JWT payload: { sub: userId, role: Role, iat, exp }
- Swagger tags: Auth, Health
- NestJS module yapısı:
  - AppModule → AuthModule, UserModule, CommonModule, HealthModule
  - CommonModule → AuditLogModule, LedgerModule (entity only)

</specifics>

<deferred>
## Deferred Ideas

- Socket.IO gateway (Phase 5)
- BullMQ jobs (Phase 5+)
- Admin panel CRUD screens (Phase 11)
- CI/CD pipeline (Phase 12)
- OTA updates (Phase 12)
- İyzico integration (Phase 6)
- OneSignal integration (Phase 8)
- CloudFlare R2 integration (Phase 3)

</deferred>

---

*Phase: 01-proje-altyap-s-authentication*
*Context gathered: 2026-04-07 from existing audit artifacts*
