# Chatwoot Clone Implementation Plan

**Tanggal:** Agustus 2026  
**Status:** Rencana Implementasi dengan Bun + Hono + Raw SQL

---

## Quick Start

Chatwoot clone menggunakan arsitektur modern:
- **Backend:** Bun v1.1.x+ + Hono framework
- **Database:** PostgreSQL 15+ (Raw SQL queries - NO ORM)
- **Frontend:** React 18 + TypeScript + Vite

---

## 📁 Struktur File Dokumen

| File | Isi |
|------|-----|
| `README.md` | Ini file - overview dan quick start |
| `ARCHITECTURE.md` | Tech stack, diagrams, data flow |
| `DATABASE_SCHEMA.sql` | Semua CREATE TABLE statements lengkap |
| `API_REFERENCE.md` | Endpoint API dengan contoh request/response |
| `IMPLEMENTATION_PLAN.md` | Timeline fase-fase implementasi |
| `FRONTEND_GUIDE.md` | Struktur React frontend & komponen |
| `DESIGN_SYSTEM.md` | Color palette, typography, komponen UI |
| `WAYFINDER_PLAN.md` | Sistem tiket terstruktur dengan 8 keputusan utama ✨ |
| `ASTRYX_INTEGRATION.md` | Panduan integrasi Astryx design system ✨ BARU! |
| `SPEC_CHATWOOT_CLONE.md` | Specification document (PRD) untuk implementasi ✨ BARU! |
| `TICKETS.md` | 10 ticket teknis dengan blocking relationships ✨ |
| `VERTICAL_SLICES.md` | 20 vertical slice tickets terstruktur ✓ ✨ |

**Lokasi:** `./docs/`

---

## Technology Stack

### Backend
- **Runtime:** Bun v1.1.x+
- **Framework:** Hono (middleware-based)
- **Database Driver:** bun:sql / @neondatabase/serverless
- **Auth:** JWT + Bun.password
- **Validation:** Zod

### Frontend  
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5.x
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Query (Server) + Zustand (UI)

---

## Development Setup

### Backend (Bun)
```bash
bun install hono bun:sql jsonwebtoken zod node-pg-migrate
cp .env.example .env
bun dev    # Server di port 3000
```

### Frontend (React + Vite)
```bash
cd frontend  
npm create vite@latest . --template react-ts
npm install axios socket.io-client tailwindcss
npm run dev    # Dev server di port 5173
```

---

## Resources

- [Bun Documentation](https://bun.sh/docs/) - Runtime & SQL
- [Hono Documentation](https://hono.dev/docs/) - Web framework  
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - Database
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## File yang Telah Dibuat di ./docs/

1. **README.md** - Overview proyek
2. **ARCHITECTURE.md** - Arsitektur & teknologi
3. **DATABASE_SCHEMA.sql** - Skema database lengkap
4. **API_REFERENCE.md** - Dokumentasi API endpoints  
5. **IMPLEMENTATION_PLAN.md** - Roadmap implementasi 16 minggu
6. **FRONTEND_GUIDE.md** - Panduan komponen React
7. **DESIGN_SYSTEM.md** - Design system lengkap (warna, tipografi, komponen)

---

## Catatan Penting

- Menggunakan **RAW SQL queries** (TANPA ORM) untuk kontrol penuh atas database
- Multi-tenant architecture dengan `account_id` scoping
- Frontend menggunakan React + TypeScript + Vite (bukan Vue.js)
