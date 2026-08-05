# 💬 Xatwoot — Open-Source Customer Engagement Platform

Xatwoot is a multi-tenant customer messaging and support platform built with **Bun**, **Hono**, **PostgreSQL**, and **React**.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Bun](https://bun.sh) (v1.2+)
- PostgreSQL database

### Installation & Run

```bash
# 1. Install dependencies
bun install

# 2. Copy environment file
cp .env.example .env

# 3. Run database migrations & seed
bun run migrate
bun run seed

# 4. Start backend server
bun run dev
```

The server will start on `http://localhost:3000`.

---

## 🐳 Deployment with Docker Compose

To deploy Xatwoot with PostgreSQL containerized via Docker:

```bash
# Start Xatwoot app & PostgreSQL database
docker-compose up -d --build
```

Access the application at `http://localhost:3000` and Swagger UI API documentation at `http://localhost:3000/api/docs`.

---

## 📚 API Documentation

Interactive OpenAPI / Swagger UI documentation is available at:
- **UI:** `http://localhost:3000/api/docs`
- **OpenAPI 3.0 Spec:** `http://localhost:3000/api/docs/openapi.json`
