# Implementation Tickets - Chatwoot Clone

## Ticket 01 — Database Schema Setup with Multi-Tenant Structure

**What to build:** Complete PostgreSQL database schema with all core tables (accounts, users, contacts, conversations, messages) properly configured for multi-tenant architecture. Each table includes account_id foreign key and appropriate indexes for query performance.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Create accounts table with id, name, email, settings JSONB fields
- [ ] Create users table with JWT authentication support (password_hash, role, availability)
- [ ] Create contacts table with email/phone uniqueness constraints and trigram indexes
- [ ] Create conversations table with status/priority enums and custom display_id sequence
- [ ] Create messages table with polymorphic sender_type and external_id deduplication
- [ ] Add account_id foreign keys to all tables for multi-tenant isolation
- [ ] Create indexes on all account_id columns for query performance

---

## Ticket 02 — Authentication System Implementation (JWT + bcrypt)

**What to build:** Complete authentication system allowing users to login with email/password and receive JWT tokens, plus middleware to protect API routes. Tokens should include user info and account scoping.

**Blocked by:** Ticket 01 (Database Schema Setup)

**Status:** ready-for-agent

- [ ] Implement bcrypt password hashing for new user registration
- [ ] Create login endpoint that validates credentials and returns JWT token
- [ ] Build JWT middleware to verify tokens on protected routes
- [ ] Add token payload with userId, accountId for request scoping
- [ ] Implement "get current user" endpoint (/api/v1/auth/me)
- [ ] Write tests for authentication flow including invalid credentials

---

## Ticket 03 — Raw SQL Query Repository Layer

**What to build:** Organized repository layer with raw SQL queries for all database operations, following clean separation between data access and business logic. Each entity has its own query file.

**Blocked by:** Ticket 01 (Database Schema Setup)

**Status:** ready-for-agent

- [ ] Create src/db/queries/accountQueries.ts with CRUD operations
- [ ] Create userQueries.ts for authentication-related queries
- [ ] Build conversationQueries.ts with display_id generation logic
- [ ] Implement messageQueries.ts with sender polymorphic handling
- [ ] Add contactQueries.ts with email/phone search using trigram indexes
- [ ] Write tests verifying query results match expected data structures

---

## Ticket 04 — Core Conversation API Endpoints

**What to build:** RESTful API endpoints for conversations including listing, creating, updating status, and retrieving conversation details with messages. All endpoints properly scoped to authenticated user's account.

**Blocked by:** Tickets 02 (Authentication), 03 (Query Repository)

**Status:** ready-for-agent

- [ ] GET /api/v1/conversations - List conversations with pagination/filtering
- [ ] POST /api/v1/conversations - Create new conversation with contact/inbox
- [ ] GET /api/v1/conversations/:id - Get details including all messages
- [ ] PUT /api/v1/conversations/:id - Update status and assignee
- [ ] DELETE /api/v1/conversations/:id - Close conversation
- [ ] Add Zod validation for request bodies

---

## Ticket 05 — Message API with Real-time Support

**What to build:** Complete message CRUD operations including sending messages through the API, retrieving message history, and integrating WebSocket events for real-time delivery.

**Blocked by:** Tickets 02 (Authentication), 03 (Query Repository)

**Status:** ready-for-agent

- [ ] POST /api/v1/conversations/:id/messages - Send new message
- [ ] GET /api/v1/conversations/:id/messages - List all messages in conversation
- [ ] Implement sender_type polymorphic handling for user/contact
- [ ] Add status tracking (sending, sent, delivered, read)
- [ ] Create WebSocket event emission on message creation

---

## Ticket 06 — Authentication Middleware & Route Structure

**What to build:** Complete Hono route structure with authentication middleware protecting all API endpoints. Routes organized by resource type with proper error handling and validation chains.

**Blocked by:** Ticket 02 (Authentication System)

**Status:** ready-for-agent

- [ ] Create src/routes/api/v1/auth.ts with login/me endpoints
- [ ] Build conversation routes with auth protection middleware
- [ ] Add message routes connected to conversations
- [ ] Implement contact management routes
- [ ] Setup error handling middleware for consistent responses
- [ ] Write integration tests for protected route access

---

## Ticket 07 — Frontend Project Setup (React + Vite)

**What to build:** Complete frontend development environment with React 18, TypeScript, Vite bundler, and Tailwind CSS configured. Basic project structure ready for component development.

**Blocked by:** None — can start immediately  

**Status:** ready-for-agent

- [ ] Initialize Vite project with React + TypeScript template
- [ ] Install dependencies (axios, socket.io-client, zustand)
- [ ] Configure Tailwind CSS with custom color palette
- [ ] Setup TypeScript interfaces for API responses
- [ ] Create basic App component with routing placeholder
- [ ] Verify development server runs on port 5173

---

## Ticket 08 — Chat Widget Component (Embeddable UI)

**What to build:** Embeddable chat widget that can be dropped into any website. Shows conversation list, message display area, and input form with WebSocket connection for real-time updates.

**Blocked by:** Tickets 04 (Conversation API), 05 (Message API), 07 (Frontend Setup)

**Status:** ready-for-agent

- [ ] Create ChatWidget.tsx component structure
- [ ] Implement conversation list display with status badges
- [ ] Build message bubble rendering with user/contact differentiation
- [ ] Add message input form with send functionality
- [ ] Connect WebSocket for real-time new message notifications
- [ ] Style widget to be embeddable on external websites

---

## Ticket 09 — Contact Management API & UI

**What to build:** Complete contact CRUD operations allowing creation, updating, and searching of customer profiles. Includes frontend components for viewing/editing contacts in the dashboard.

**Blocked by:** Tickets 01 (Database), 03 (Queries)

**Status:** ready-for-agent

- [ ] GET /api/v1/contacts - Searchable contact list with pagination
- [ ] POST /api/v1/contacts - Create new contact profile
- [ ] PUT /api/v1/contacts/:id - Update contact information
- [ ] Add custom_attributes JSONB support for extensibility
- [ ] Implement frontend ContactList component
- [ ] Build ContactDetail/Edit form component

---

## Ticket 10 — Webhook Infrastructure (WhatsApp/Facebook)

**What to build:** Secure webhook endpoints that receive messages from external channels, verify signatures, parse payloads, and create internal conversations/messages. Handles deduplication using external_id.

**Blocked by:** Tickets 04 (Conversation API), 05 (Message API)

**Status:** ready-for-agent

- [ ] POST /webhooks/whatsapp - WhatsApp Business API receiver
- [ ] Implement HMAC signature verification for security
- [ ] Parse WhatsApp message payload into internal format
- [ ] Create contact automatically from incoming messages
- [ ] Build similar endpoint for Facebook Messenger webhook
- [ ] Add deduplication logic using external_id uniqueness