# Implementation Plan - Chatwoot Clone

## Timeline Overview (16 Minggu)

| Fase | Durasi | Person-Days | Fokus Utama |
|------|--------|-------------|-------------|
| Phase 1: Foundation | Minggu 1-4 | 80 PD | Backend core, auth, DB queries |
| Phase 2: Channels & Webhooks | Minggu 5-8 | 80 PD | Email + WhatsApp integrations |
| Phase 3: Frontend React | Minggu 9-12 | 80 PD | UI/UX chat interface |
| Phase 4: AI & Automation | Minggu 13-16 | 80 PD | Rules engine, Copilot |

---

## Phase 1: Foundation (Minggu 1-4) - 80 Person-Days

### Week 1: Project Setup & Bun Environment
**Target:** Backend skeleton dengan Hono + database connection

**Tasks:**
- [ ] Initialize Bun project (`bun init`)
- [ ] Install dependencies: hono, bun:sql, jsonwebtoken, zod, node-pg-migrate
- [ ] Setup TypeScript configuration (`tsconfig.json`)
- [ ] Create basic file structure
- [ ] Configure environment variables loader

**Deliverable:** `src/` directory dengan struktur dasar + server running di port 3000

### Week 2: Database Schema & Raw Queries
**Target:** Semua tabel + query functions untuk CRUD operasi dasar

**Tasks:**
- [ ] Create PostgreSQL database
- [ ] Run migrations (semua CREATE TABLE statements)
- [ ] Implement accountQueries.ts - accounts CRUD
- [ ] Implement userQueries.ts - users CRUD  
- [ ] Setup database migration folder dengan `node-pg-migrate` di `config/db.ts`

**Deliverable:** Semua tabel dibuat + query functions berhasil menghasilkan data

### Week 3: Authentication System
**Target:** JWT authentication yang aman

**Tasks:**
- [ ] Implement authService.ts dengan login/register
- [ ] Buat middleware auth.ts untuk proteksi routes
- [ ] Setup password hashing (Bun.password)
- [ ] Test token expiry & refresh logic
- [ ] Add rate limiting untuk endpoint login

**Deliverable:** Endpoint `/api/v1/auth/login` berfungsi + protected routes dapat diakses

### Week 4: Core API Endpoints
**Target:** CRUD operations untuk conversations, messages, contacts

**Tasks:**
- [ ] Create routes/api/v1/conversations.ts
- [ ] Implement conversationService.ts dengan business logic
- [ ] Add validation menggunakan Zod schema
- [ ] Setup error handling middleware
- [ ] Write unit tests (Bun test)

**Deliverable:** API lengkap untuk:
- CRUD conversations
- CRUD messages  
- CRUD contacts
- Semua endpoints protected dengan JWT

---

## Phase 2: Channels & Webhooks (Minggu 5-8) - 80 Person-Days

### Week 5-6: Email Channel Integration
**Target:** Email-to-ticket automation via ActionMailbox alternative

**Tasks:**
- [ ] Setup IMAP/POP3 listener service
- [ ] Parse email format ke dalam message structure
- [ ] Auto-create contact jika belum ada
- [ ] Generate conversation dari email
- [ ] Handle attachments dengan Bun's file API

**Deliverable:** 
- Endpoint `/api/v1/inboxes/email/webhook` menerima email
- Email otomatis menjadi conversation baru

### Week 7-8: Webhook Infrastructure (WhatsApp, Facebook)
**Target:** Integrasi external messaging channels

**Tasks WhatsApp:**
- [ ] Setup webhook endpoint di `/webhooks/whatsapp`
- [ ] Implement signature verification (HMAC-SHA256)
- [ ] Parse WhatsApp Business API payload
- [ ] Deduplication dengan `external_id` uniqueness

**Tasks Facebook Messenger:**
- [ ] Verify webhook challenge (GET request handler)
- [ ] Parse messaging events
- [ ] Handle text + media messages

**Deliverable:**
- WhatsApp & Facebook Messenger dapat mengirim pesan ke sistem
- Webhook delivery dengan retry logic

---

## Phase 3: Frontend React (Minggu 9-12) - 80 Person-Days

### Week 9-10: Core UI Components
**Target:** Chat widget + conversation interface

**Tasks:**
- [ ] Setup Vite project (`npm create vite@latest`)
- [ ] Install dependencies: React, Tailwind CSS, Socket.IO client
- [ ] Buat komponen utama:
  - `ChatWidget.tsx` - Embeddable chat widget
  - `ConversationList.tsx` - List conversations
  - `MessageList.tsx` - Display messages
  - `MessageInput.tsx` - Form input pesan

**Deliverable:** UI dasar dapat menampilkan conversation dan mengirim pesan

### Week 11-12: Dashboard & Admin Panel
**Target:** Full admin interface

**Tasks:**
- [ ] Implement routing dengan React Router
- [ ] Buat dashboard statistik (conversations, agents, response time)
- [ ] User/team management UI
- [ ] Channel configuration forms
- [ ] Setup state management (React Query + Zustand)

**Deliverable:** Dashboard lengkap untuk admin mengelola semua komponen

---

## Phase 4: AI & Automation (Minggu 13-16) - 80 Person-Days

### Week 13-14: Rules Engine
**Target:** Automasi berbasis rules

**Tasks:**
- [ ] Create `automation_rules` table di database
- [ ] Buat Condition Evaluator class
- [ ] Implement Actions executor (assign, tag, send_reply)
- [ ] UI untuk rule management di admin panel

**Deliverable:** Sistem dapat menjalankan rules otomatis berdasarkan conditions

### Week 15-16: Copilot/AI Assistant
**Target:** AI assistant untuk balasan otomatis

**Tasks:**
- [ ] Setup OpenAI/Anthropic API client
- [ ] Buat thread management system (`copilot_threads`, `copilot_messages`)
- [ ] Implement streaming response handling
- [ ] Context building dari conversation history
- [ ] Tool calling untuk aksi internal (assign, tag)

**Deliverable:** AI assistant dapat memberikan suggestion dan balasan otomatis

---

## Technical Debt & Considerations

### Database Optimization
- Gunakan prepared statements untuk query yang sering dipanggil
- Index strategis pada `account_id` semua tabel utama
- Consider partitioning di mesin produksi dengan volume tinggi

### Performance
- Connection pooling untuk PostgreSQL (PgBouncer)
- Redis untuk session storage & caching
- CDN untuk static assets frontend

### Security
- Rate limiting API endpoints
- Input validation ketat dengan Zod
- CORS configuration yang tepat
- Audit logging untuk semua aksi penting

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | < 200ms | Load testing dengan k6 |
| Database Queries | < 5 per request | Logging + monitoring |
| Uptime | 99.9% | Health check endpoint |
| User Authentication | JWT works | Integration tests |

---

## Rollback Plan

Jika ada masalah serius:
1. **Database:** Gunakan backup yang dibuat tiap hari
2. **API:** Deploy versi sebelumnya via CI/CD rollback
3. **Frontend:** CDN cache version lama tetap tersedia