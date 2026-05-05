# Phase 1: Proje Altyapısı & Authentication — Research

**Date:** 2026-04-07
**Status:** RESEARCH COMPLETE

---

## 1. NestJS 11 — Key Findings

### New in v11 (January 2025)
- **Faster startup:** Dynamic module metadata no longer uses hashing → object-reference approach
- **Logger:** Native JSON logging support (ideal for Docker/Sentry)
- **Express v5 support:** Path wildcards changed (`/*` → `/*splat`)
- **`IntrinsicException`:** Exceptions that bypass automatic framework logging
- **`ParseDatePipe`:** Built-in date validation
- **ConfigService:** Improved env override support
- **Lifecycle hooks:** Termination hook order changed — more reliable shutdown

### Project Layout (recommended)
```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── decorators/          # @Roles(), @Public(), @Auditable()
│   │   ├── filters/             # GlobalExceptionFilter
│   │   ├── guards/              # JwtAuthGuard, RolesGuard
│   │   ├── interceptors/        # AuditInterceptor
│   │   ├── pipes/               # CustomValidationPipe
│   │   └── entities/            # BaseEntity (abstract)
│   ├── config/
│   │   ├── database.config.ts   # TypeORM DataSource config
│   │   ├── redis.config.ts      # ioredis config
│   │   └── app.config.ts        # ConfigModule registration
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/      # jwt.strategy.ts, local.strategy.ts
│   │   │   ├── guards/          # jwt-auth.guard.ts
│   │   │   ├── dto/             # login.dto.ts, register.dto.ts
│   │   │   └── entities/        # session.entity.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   └── entities/        # user.entity.ts
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   ├── audit/
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.service.ts
│   │   │   └── entities/        # audit-log.entity.ts
│   │   └── ledger/
│   │       ├── ledger.module.ts
│   │       └── entities/        # ledger-account.entity.ts, journal-entry.entity.ts, journal-line.entity.ts
│   ├── database/
│   │   ├── datasource.ts        # Standalone DataSource for CLI
│   │   └── migrations/          # Date-prefixed migration files
│   └── shared/
│       ├── types/               # Role enum, base response types
│       └── utils/               # Transaction helper
├── test/
│   ├── auth.e2e-spec.ts
│   └── health.e2e-spec.ts
├── docker-compose.yml
├── .env.example
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### TypeORM 0.3 Setup Rules
1. **Separate DataSource file** (`src/database/datasource.ts`) for CLI migrations
2. **`autoLoadEntities: true`** in `TypeOrmModule.forRootAsync` — no manual entity listing
3. **`synchronize: false`** always — migrations only
4. **QueryRunner** for manual transactions (not `@Transaction()` decorator — deprecated in 0.3)
5. **Decimal precision:** `{ type: 'decimal', precision: 12, scale: 2 }` for money fields

### Transaction Pattern
```typescript
// src/shared/utils/transaction.helper.ts
export async function withTransaction<T>(
  dataSource: DataSource, 
  work: (manager: EntityManager) => Promise<T>
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const result = await work(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

## 2. JWT Authentication — Best Practices

### Token Strategy
- Access: JWT signed, 15min expiry, payload: `{ sub, role, iat, exp }`
- Refresh: UUID stored hashed (bcrypt) in `sessions` table
- **Rotation:** Every refresh issues new pair, old refresh invalidated
- **Reuse detection:** If a used refresh token is presented → revoke ALL sessions for that user

### Session Entity (TypeORM)
```typescript
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() hashedRefreshToken: string; // bcrypt hash
  @Column() expiresAt: Date;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) userAgent: string;
  @CreateDateColumn() createdAt: Date;
}
```

### Auth Endpoints
| Method | Path | Public? | Description |
|--------|------|---------|-------------|
| POST | /auth/register | ✅ | Email + password registration |
| POST | /auth/login | ✅ | Returns access + refresh tokens |
| POST | /auth/refresh | ✅ | Refresh token rotation |
| POST | /auth/logout | ❌ | Invalidate session |
| POST | /auth/forgot-password | ✅ | Send reset email |
| POST | /auth/reset-password | ✅ | Reset with token |
| GET | /auth/verify-email/:token | ✅ | Email verification |

### RBAC Guard Pattern
```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

---

## 3. Expo SDK 55 + Router v4 — Key Findings

### Project Creation
```bash
npx create-expo-app@latest ./ -e with-router
```

### Router v4 Breaking Change
- `router.navigate()` now behaves like `router.push()` (always adds to stack)
- Use `router.dismissTo()` for old navigate behavior

### Project Structure
```
mobile/
├── src/
│   ├── app/
│   │   ├── _layout.tsx          # Root layout (providers)
│   │   ├── index.tsx            # Entry redirect
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── verify-email.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx        # Home
│   │       ├── search.tsx
│   │       ├── auctions.tsx
│   │       ├── profile.tsx
│   │       └── notifications.tsx
│   ├── components/              # Shared UI components
│   ├── hooks/                   # useAuth, useApi, useNetworkStatus
│   ├── lib/
│   │   ├── api.ts               # Axios client + interceptors
│   │   ├── queryClient.ts       # TanStack Query config
│   │   └── storage.ts           # MMKV wrapper
│   ├── store/
│   │   └── authStore.ts         # Zustand auth state
│   └── constants/
│       ├── colors.ts
│       └── config.ts
├── assets/
├── app.json
├── package.json
└── tsconfig.json
```

### API Client Pattern
```typescript
// src/lib/api.ts
const api = axios.create({ baseURL: config.API_URL });

api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

### TanStack Query Config
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 3, retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000) },
    mutations: { retry: 1 },
  },
});
```

---

## 4. Vue 3 Admin Panel — Setup

### Project Creation
```bash
npm create vite@latest ./ -- --template vue-ts
npm install primevue @primeuix/themes primeicons
npm install vue-router pinia axios
```

### PrimeVue 4 Config
```typescript
// src/main.ts
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

app.use(PrimeVue, { theme: { preset: Aura } });
```

### Admin Structure (scaffold only)
```
admin/
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── router/index.ts
│   ├── stores/auth.ts           # Pinia auth store
│   ├── layouts/
│   │   ├── AppLayout.vue        # Sidebar + topbar + content
│   │   └── AuthLayout.vue       # Login page layout
│   ├── views/
│   │   ├── LoginView.vue
│   │   └── DashboardView.vue    # Placeholder
│   ├── components/
│   └── lib/
│       └── api.ts               # Axios client
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Recommendation: Use PrimeTek Sakai template
Free, open-source admin template for PrimeVue. Pre-configured layout, responsive sidebar.
- BUT: we scaffold from scratch to keep control and reduce dependencies.

---

## 5. Double-Entry Ledger — Entity Design

### Three Core Entities
1. **LedgerAccount** — The "buckets" (USER_WALLET, SELLER_WALLET, ESCROW, PLATFORM_COMMISSION, PAYMENT_PROVIDER)
2. **JournalEntry** — The business event (referenceType + referenceId link to domain)
3. **JournalLine** — Atomic CR/DR line items

### Critical Rules
- **Immutable:** Never UPDATE/DELETE journal lines — use reversing entries
- **Balanced:** SUM(debits) = SUM(credits) per JournalEntry — enforce in app + DB constraint
- **Precision:** `decimal(12,2)` for TRY — never float
- **Denormalized balance:** Keep `LedgerAccount.balance` field updated on each entry for fast reads
- **Phase 1 scope:** Entity + migration ONLY — business logic deferred to Phase 6

---

## 6. Docker Compose (Dev Environment)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: endemigo
      POSTGRES_USER: endemigo
      POSTGRES_PASSWORD: endemigo_dev
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --requirepass redis_dev

volumes:
  postgres_data:
```

---

## 7. Pitfalls & Gotchas

| Risk | Mitigation |
|------|-----------|
| TypeORM `synchronize: true` in production | Set `synchronize: false` in ALL environments, use migrations |
| Express v5 wildcard breaking change | Use named wildcards: `/*splat` instead of `/*` |
| refresh token not hashed in DB | Always bcrypt hash before storing |
| MMKV not available in Expo Go | Use `expo-dev-client` for development builds |
| PrimeVue 4 breaking changes from v3 | Use `@primeuix/themes` not `primevue/themes` |
| race condition on token refresh | Queue concurrent 401 responses, only refresh once |
| Decimal precision floating point | Always use `decimal(12,2)` in PostgreSQL, never `float` |

---

## 8. Dependency Versions (Pinned)

### Backend
```json
{
  "@nestjs/core": "^11.0.0",
  "@nestjs/platform-express": "^11.0.0",
  "@nestjs/typeorm": "^11.0.0",
  "@nestjs/passport": "^11.0.0",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/swagger": "^8.0.0",
  "@nestjs/throttler": "^6.0.0",
  "@nestjs/schedule": "^5.0.0",
  "typeorm": "^0.3.28",
  "pg": "^8.13.0",
  "ioredis": "^5.4.0",
  "bullmq": "^5.0.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "helmet": "^8.0.0",
  "@sentry/nestjs": "^8.0.0"
}
```

### Mobile
```json
{
  "expo": "~55.0.0",
  "expo-router": "~4.0.0",
  "react-native": "0.83.x",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^5.0.0",
  "react-native-mmkv": "^3.0.0",
  "axios": "^1.7.0",
  "@react-native-community/netinfo": "^11.0.0"
}
```

### Admin
```json
{
  "vue": "^3.5.0",
  "vite": "^8.0.0",
  "primevue": "^4.0.0",
  "@primeuix/themes": "^1.0.0",
  "primeicons": "^7.0.0",
  "pinia": "^2.2.0",
  "vue-router": "^4.4.0",
  "axios": "^1.7.0"
}
```

---

## RESEARCH COMPLETE

All technical aspects of Phase 1 have been investigated. Key findings:
1. NestJS 11 has lifecycle hook order changes — important for graceful shutdown
2. TypeORM 0.3 requires separate DataSource file for CLI
3. Expo Router v4 has navigate() breaking change
4. PrimeVue 4 uses new theme system (`@primeuix/themes`)
5. Double-entry ledger entities are well-defined patterns
6. Refresh token rotation with reuse detection is the security standard
