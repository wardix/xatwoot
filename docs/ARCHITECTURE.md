# Architecture Guide - Chatwoot Clone

## 1. Technology Stack

### Backend
| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| Runtime | Bun v1.1.x+ | JavaScript/TypeScript runtime |
| Framework | Hono | Middleware-based API framework |
| Database Driver | bun:sql | Raw SQL execution tanpa ORM |
| Auth | JWT + Bun.password | Token-based authentication |
| Validation | Zod | Schema validation |

### Frontend
| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| Framework | React 18 | dengan Concurrent Features |
| Build Tool | Vite 5.x | Fast HMR & bundling |
| Styling | Tailwind CSS 3.x | Utility-first CSS |
| State Management | React Query + Zustand | Optimistic Updates & UI state |

### Database
- **PostgreSQL 15+** sebagai database utama
- Multi-tenant architecture dengan `account_id` scoping
- Raw SQL queries untuk kontrol penuh atas query optimization
- **Migrasi Database** dikelola menggunakan `node-pg-migrate`

---

## 2. Data Flow Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Hono API   │───▶│ PostgreSQL DB   │
│   (React)       │    │              │    │  (Raw SQL)      │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                   │
                    ┌─────────▼─────────┐         │
                    │ bun:sql / pg      │◄────────┘
                    │ (Raw Queries)     │
                    └───────────────────┘
```

---

## 3. Multi-Tenant Architecture

Semua tabel utama memiliki `account_id` untuk isolasi data tenant:

### Tenant Isolation Patterns:
1. **Row-level scoping:** Semua query menyertakan `WHERE account_id = ?`
2. **Foreign keys:** Relasi antar tabel melalui `REFERENCES accounts(id)`
3. **Indexes:** Index pada kolom `account_id` untuk performa query

---

## 4. Backend Project Structure

```
src/
├── app.ts                    # Entry point Hono app
├── server.ts                 # Server startup & configuration
├── config/
│   ├── db.ts                # Database connection (bun:sql)
│   └── env.ts               # Environment variables loader
├── middleware/
│   ├── auth.ts              # JWT authentication middleware
│   └── errorHandler.ts      # Error handling middleware
├── routes/
│   ├── api/v1/
│   │   ├── auth.ts          # Login, logout, me endpoints
│   │   ├── conversations.ts # CRUD + messages
│   │   ├── contacts.ts      # Contact management
│   │   └── inboxes.ts       # Channel configuration
├── services/
│   ├── conversationService.ts    # Business logic
│   ├── messageService.ts         # Message handling
│   └── authService.ts            # Auth utilities
├── db/
│   ├── queries/              # Raw SQL query functions
│   │   ├── accountQueries.ts
│   │   ├── conversationQueries.ts
│   │   ├── messageQueries.ts
│   │   └── contactQueries.ts
│   └── migrations/           # SQL migration files
├── utils/
│   ├── validator.ts        # Input validation (Zod)
│   └── serializer.ts       # Response formatting
└── types/
    └── index.d.ts          # TypeScript type definitions
```

---

## 5. Authentication Flow

### Login Process:
1. User mengirim email + password ke `/api/v1/auth/login`
2. Backend verifikasi dengan bcrypt compare
3. Generate JWT token (7 days expiry)
4. Return token + user data

### Protected Routes:
- Middleware mengecek `Authorization: Bearer <token>` header
- Token di-verifikasi dan payload diekstrak ke `c.req.userId`
- Semua query dilakukan dengan `account_id` dari token