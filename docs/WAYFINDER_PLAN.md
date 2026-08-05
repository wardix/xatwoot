# Wayfinder Plan - Chatwoot Clone Implementation

**Destination:** A production-ready Chatwoot clone with multi-tenant architecture, real-time messaging, and channel integrations.

---

## Notes

Technical Requirements:
- Use Bun runtime + Hono framework for backend (no ORM, raw SQL)
- PostgreSQL database with multi-tenant account_id scoping
- React 18 + TypeScript + Vite for frontend
- WebSocket/ActionCable replacement for real-time updates
- Webhooks for WhatsApp, Facebook Messenger channels

---

## Overview

This wayfinder plan outlines the implementation roadmap for building a Chatwoot clone using modern web technologies. The architecture follows a clean separation of concerns with:

- **Backend**: Bun runtime + Hono framework (middleware-based), PostgreSQL with raw SQL queries
- **Frontend**: React 18 + TypeScript + Vite build system
- **Real-time**: Native WebSocket implementation replacing ActionCable
- **Channels**: Webhook endpoints for WhatsApp and Facebook Messenger integrations

---

## Tickets (Major Implementation Decisions)

### TICKET-001: Database Schema Design - All Table Structures and Relationships

**Type:** Architecture  
**Status:** Pending  
**Description:** Define comprehensive database schema including all 10+ core tables with proper relationships, indexes, constraints, and multi-tenant account_id scoping. Tables include: accounts, users, contacts, conversations, messages, inboxes, teams, team_memberships, labels, conversation_labels, audit_logs.

**Deliverable:** Complete `DATABASE_SCHEMA.sql` file with CREATE TABLE statements, foreign key relationships, and indexing strategy for multi-tenant performance.

**Blocking:** None (foundation layer)  
**Blocked by:** None  
**Blocks:** TICKET-003 (Raw SQL queries depend on schema), TICKET-004 (API routes need entity definitions)

---

### TICKET-002: Authentication System - JWT Setup with Bun Crypto

**Type:** Security  
**Status:** Pending  
**Description:** Implement secure authentication using JSON Web Tokens with password hashing via Bun.password (Argon2). Design token payload structure, expiration strategy, and refresh mechanism. Utilize Bun's built-in crypto capabilities for cryptographic operations.

**Deliverable:** `authService.ts` with login/register/password reset functions, JWT middleware for protecting routes, token verification utilities.

**Blocking:** TICKET-004 (API route protection), User management endpoints  
**Blocked by:** None  
**Blocks:** TICKET-004 (Protected API routes)

---

### TICKET-003: Raw SQL Query Architecture - Organizing Queries Without ORM

**Type:** Data Access Layer  
**Status:** Pending  
**Description:** Establish repository pattern for raw SQL queries. Create organized query structure separating data access from business logic. Implement connection pooling, prepared statements for performance, and consistent error handling.

**Deliverable:** `src/db/queries/` directory with modular query files (accountQueries.ts, userQueries.ts, conversationQueries.ts, messageQueries.ts, etc.) following repository pattern conventions.

**Blocking:** Most backend endpoints depend on clean query organization  
**Blocked by:** TICKET-001 (Schema required for queries)  
**Blocks:** TICKET-004 (API handlers need data access layer), TICKET-005 (Message persistence)

---

### TICKET-004: API Route Structure - Hono Middleware Patterns

**Type:** Backend Architecture  
**Status:** Pending  
**Description:** Design RESTful API route organization using Hono's middleware system. Implement authentication middleware, validation with Zod schemas, error handling patterns, and versioning strategy. Organize routes by resource (auth, conversations, messages, contacts, inboxes).

**Deliverable:** Complete `src/routes/` structure with `/api/v1/auth`, `/api/v1/conversations`, `/api/v1/messages`, etc., including proper middleware chains for auth/validation/error handling.

**Blocking:** Channel webhook handlers need API structure  
**Blocked by:** TICKET-002 (Authentication), TICKET-003 (Query Architecture)  
**Blocks:** TICKET-005, TICKET-006

---

### TICKET-005: Real-time Messaging - WebSocket Implementation Approach

**Type:** Realtime Infrastructure  
**Status:** Pending  
**Description:** Implement WebSocket server for real-time message delivery. Choose between native WebSocket API or Socket.IO. Design pub/sub pattern for multi-tenant message broadcasting, connection management per account/workspace, and integration with Hono server.

**Deliverable:** WebSocket server implementation integrated with Hono backend, client-side React hook/composable for subscribing to messages, tenant-aware message routing.

**Blocking:** Frontend real-time features  
**Blocked by:** TICKET-004 (API routes must expose message endpoints)  
**Blocks:** Frontend chat interface, agent notification system

---

### TICKET-006: Channel Webhook Handlers - WhatsApp/Facebook Integration Patterns

**Type:** Integration  
**Status:** Pending  
**Description:** Build webhook infrastructure for external messaging channels. Implement signature verification (HMAC-SHA256) for WhatsApp Business API and Facebook Messenger webhooks. Design payload parsing, deduplication logic using `external_id`, and automatic contact/conversation creation from incoming messages.

**Deliverable:** Webhook endpoints at `/webhooks/whatsapp` and `/webhooks/facebook-messenger` with proper verification, message processing pipeline, and error handling with retry logic.

**Blocking:** External channel integrations  
**Blocked by:** TICKET-004 (API routes), TICKET-005 (message endpoints for real-time delivery)  
**Blocks:** Multi-channel support feature

---

### TICKET-007: Frontend State Management - React Query + Zustand Setup

**Type:** Architecture Decision  
**Status:** Pending  
**Description:** Implement React Query (TanStack Query) for handling server states, data fetching, caching, and optimistic UI updates. Use Zustand purely for global UI state management (e.g., theme, sidebar toggles).

**Deliverable:** Decision document recommending one approach with rationale, plus initial store/slices setup for user auth, conversations, messages, and contacts state.

**Blocking:** Frontend component development  
**Blocked by:** Understanding of frontend requirements from API endpoints  
**Blocks:** TICKET-008 (Component implementation depends on state management)

---

### TICKET-008: Component Library Design - Reusable UI Components Structure

**Type:** Frontend Architecture  
**Status:** Pending  
**Description:** Design and implement reusable component library for the React frontend. Create atomic components (Button, Input, Avatar), molecule components (MessageList, ConversationHeader), and organism components (ChatWidget, ConversationView). Establish consistent styling with Tailwind CSS and theming system.

**Deliverable:** Component library structure under `frontend/src/components/` with Storybook or similar documentation, following design tokens from DESIGN_SYSTEM.md.

**Blocking:** UI feature development  
**Blocked by:** TICKET-007 (State management decision), understanding of data structures  
**Blocks:** Dashboard implementation, chat interface features

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │  DESTINATION: Chatwoot Clone        │
                    │  Multi-tenant + Real-time + Channels│
                    └─────────────────────────────────────┘
                                    ▲
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    │  TICKET-001: DB Schema        │  TICKET-002: Auth System      │
    │  (Foundation)                │  (Security)                   │
    │                               │                               │
    └─────────────┬─────────────────┼────────────────┬──────────────┘
                  │                 │                │
                  ▼                 ▼                ▼
        ┌─────────────────────────────────────────────────┐
        │  TICKET-003: Raw SQL Query Architecture         │
        │  (Data Access Layer)                            │
        └──────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │  TICKET-004: API Route Structure                │
        │  (Hono Middleware Patterns)                     │
        └────────────────────┬───────────────┬────────────┘
                             │               │
              ┌──────────────┴─┐    ┌────────┴─────────────┐
              │                │    │                      │
              ▼                ▼  ▼                      ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ TICKET-005:           │ │ TICKET-006:           │ │                       │
│ WebSocket             │ │ Channel Webhooks      │ │                       │
│ (Real-time)           │ │ (WhatsApp/Facebook)   │ │                       │
└───────────────────────┘ └───────────────────────┘ │                       │
                                                    ▼                       │
                              ┌─────────────────────────────────────────┐  │
                              │  TICKET-007: Frontend State Management    │  │
                              │  (React Query + Zustand)                 │──┘
                              └────────────────────┬────────────────────┘
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │  TICKET-008: Component Library Design    │
                              │  (Reusable UI Components)                │
                              └─────────────────────────────────────────┘
```

---

## Implementation Order (Based on Dependencies)

1. **TICKET-001** → Database Schema Design  
   Create all table structures with proper multi-tenant scoping and indexes

2. **TICKET-003** ←→ TICKET-002 (can proceed in parallel after schema)  
   - Raw SQL Query Architecture  
   - Authentication System  
   These can be developed concurrently once schema is defined

3. **TICKET-004** → API Route Structure  
   Build on top of auth and query layers

4. **Parallel Development:**
   - TICKET-005 → WebSocket Implementation (depends on API)
   - TICKET-006 → Channel Webhooks (depends on API + messages endpoint)
   - TICKET-007 → State Management Decision (can start once frontend requirements clearer)

5. **TICKET-008** → Component Library Design  
   Final frontend layer, depends on state management and understanding of data structures

---

## File Structure After Implementation

```
project/
├── backend/
│   ├── src/
│   │   ├── app.ts                    # Hono entry point
│   │   ├── server.ts                 # Server configuration
│   │   ├── config/
│   │   │   └── db.ts                 # Database connection
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT middleware
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   └── api/v1/
│   │   │       ├── auth.ts
│   │   │       ├── conversations.ts
│   │   │       ├── messages.ts
│   │   │       ├── contacts.ts
│   │   │       ├── inboxes.ts
│   │   │       └── webhooks/
│   │   │           ├── whatsapp.ts
│   │   │           └── facebook-messenger.ts
│   │   ├── services/
│   │   ├── db/queries/              # Raw SQL queries
│   │   └── utils/
│   └── migrations/                  # SQL migration files
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI library
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   └── organisms/
│   │   ├── hooks/                   # WebSocket hooks
│   │   ├── lib/                     # API client, auth utils
│   │   ├── stores/                  # Zustand stores (UI State)
│   │   └── types/
│   └── vite.config.ts
└── docs/
    ├── WAYFINDER_PLAN.md            # This file
    ├── DATABASE_SCHEMA.sql
    └── DESIGN_SYSTEM.md
```

---

## Next Actions

1. **Start with TICKET-001** - Create `backend/migrations/` directory and begin defining CREATE TABLE statements for all entities
2. **Setup Bun project structure** following the architecture in ARCHITECTURE.md  
3. **Create initial database connection** using bun:sql or @neondatabase/serverless

---

## Success Criteria

Each ticket will be considered complete when:
- Code is written and follows established patterns
- TypeScript types are properly defined
- Basic tests or manual verification passes
- Documentation/comments explain design decisions
- Dependencies are met for downstream tickets