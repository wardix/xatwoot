# Chatwoot Clone - Implementation Guide

**Tanggal:** Agustus 2026  
**Status:** Rencana Implementasi dengan Bun + Hono + Raw SQL

---

## Quick Start

Chatwoot clone menggunakan arsitektur modern:
- **Backend:** Bun v1.1.x+ + Hono framework
- **Database:** PostgreSQL 15+ (Raw SQL queries - NO ORM)
- **Frontend:** React 18 + TypeScript + Vite

---

## Struktur File Dokumen

| File | Isi |
|------|-----|
| `README.md` | Ini file - overview dan quick start |
| `ARCHITECTURE.md` | Tech stack, diagrams, data flow |
| `DATABASE_SCHEMA.sql` | Semua CREATE TABLE statements lengkap |
| `API_REFERENCE.md` | Endpoint API dengan contoh request/response |
| `IMPLEMENTATION_PLAN.md` | Timeline fase-fase implementasi |
| `FRONTEND_GUIDE.md` | Struktur React frontend & komponen |

---

## Development Setup

### Backend (Bun)
```bash
# Install dependencies
bun install hono bun:sql jsonwebtoken zod node-pg-migrate

# Environment setup
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, dll

# Run migrations
bun run migrate:up

# Start server
bun dev    # Port 3000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev    # Port 5173
```

---

## Quick Reference Links

- [Bun Documentation](https://bun.sh/docs/) - Runtime & SQL
- [Hono Documentation](https://hono.dev/docs/) - Web framework  
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - Database
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## Teknologi Utama

| Komponen | Pilihan |
|----------|---------|
| Backend Runtime | Bun v1.1.x+ |
| Web Framework | Hono (middleware-based) |
| Database | PostgreSQL 15+ |
| SQL Client | bun:sql / @neondatabase/serverless |
| Auth | JWT + Bun.password |
| Frontend | React 18 + TypeScript + Vite |