# Vertical Slice Tickets - Chatwoot Clone

## Overview
This document defines **vertical slice tickets** that implement features end-to-end, cutting through all layers: database schema, API endpoints, frontend UI, and tests. Each ticket is designed to be completed in one session (2-4 hours of focused work) and demoable independently.

These vertical slices complement the existing WAYFINDER_PLAN.md architectural tickets by decomposing them into feature-focused implementation units that can be delivered incrementally.

---

## Foundation Layer (No Dependencies)

### VS-LABELS-001: Account Creation & Multi-Tenant Setup
**Domain:** account  
**Blocks:** All subsequent vertical slices  
**Maps to WAYFINDER:** TICKET-001, TICKET-003, TICKET-004  

**Scope (Schema + API + Tests):**
- [ ] Database schema: `accounts` table with id, name, email, settings JSONB
- [ ] API: POST `/api/v1/accounts` - create new account
- [ ] Tests: Account creation validation tests
- [ ] Migration script to seed initial account

**Dependencies:** None

---

### VS-LABELS-002: User Authentication System
**Domain:** user  
**Blocks:** All tickets requiring authentication (VS-LABELS-003 through VS-LABELS-018)  
**Maps to WAYFINDER:** TICKET-002, TICKET-004

**Scope (Schema + API + Middleware + Tests):**
- [ ] Database schema: `users` table with id, account_id, email, password_hash, role
- [ ] API: POST `/api/v1/auth/login`, POST `/api/v1/auth/logout`
- [ ] JWT token generation and validation middleware
- [ ] Password hashing with Bun.password (Argon2)
- [ ] Tests: Login flow, invalid credentials, JWT validation

**Dependencies:** VS-LABELS-001 (account must exist)

---

### VS-LABELS-003: Inbox Configuration Model
**Domain:** inbox  
**Blocks:** VS-LABELS-005 (Conversation), VS-LABELS-009 (Chat Widget)  
**Maps to WAYFINDER:** TICKET-001, TICKET-004

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `inboxes` table with id, account_id, name, channel_type
- [ ] API: GET/POST `/api/v1/inboxes` - list and create inboxes
- [ ] UI: Inbox configuration page (admin view)
- [ ] Tests: Inbox CRUD operations

**Dependencies:** VS-LABELS-002 (authentication required)

---

## Core Conversation Flow Layer

### VS-LABELS-004: Contact Management & Profile
**Domain:** contact  
**Blocks:** VS-LABELS-005, VS-LABELS-009  
**Maps to WAYFINDER:** TICKET-001, TICKET-003

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `contacts` table with id, account_id, name, email, phone, custom_fields JSONB
- [ ] API: GET/POST/PUT `/api/v1/contacts` - full CRUD
- [ ] UI: Contact profile page with custom fields editor
- [ ] Tests: Contact creation, custom field persistence

**Dependencies:** VS-LABELS-002 (authentication required)

---

### VS-LABELS-005: Conversation Creation & Assignment
**Domain:** conversation  
**Blocks:** VS-LABELS-006, VS-LABELS-014, VS-LABELS-017  
**Maps to WAYFINDER:** TICKET-003, TICKET-004

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `conversations` table with id, account_id, contact_id, inbox_id, status, assignee_id
- [ ] API: POST `/api/v1/conversations` - create conversation
- [ ] Schema migration for display_id sequence per account
- [ ] UI: Conversation list view (initial implementation)
- [ ] Tests: Conversation creation with valid/invalid data

**Dependencies:** VS-LABELS-002, VS-LABELS-003, VS-LABELS-004 (auth, inbox, contact required)

---

### VS-LABELS-006: Message System Within Conversations
**Domain:** message  
**Blocks:** VS-LABELS-011 (attachments)  
**Maps to WAYFINDER:** TICKET-003, TICKET-004

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `messages` table with id, account_id, conversation_id, sender_type, body, created_at
- [ ] API: GET `/api/v1/conversations/:id/messages`, POST `/api/v1/messages`
- [ ] UI: Message list component rendering messages chronologically
- [ ] Tests: Message creation and retrieval with proper ordering

**Dependencies:** VS-LABELS-005 (conversation must exist)

---

## Feature Enhancement Layer

### VS-LABELS-007: Conversation Labels & Tagging System
**Domain:** label  
**Blocks:** VS-LABELS-019 (conversation filtering)  
**Maps to WAYFINDER:** TICKET-001 (labels table)

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `labels` table + `conversation_labels` junction table
- [ ] API: POST `/api/v1/conversations/:id/labels`, DELETE `/api/v1/conversations/:id/labels/:label_id`
- [ ] UI: Label selector component for conversations
- [ ] Tests: Tag assignment and removal

**Dependencies:** VS-LABELS-002, VS-LABELS-005 (auth + conversation required)

---

### VS-LABELS-008: Real-Time Notifications via WebSocket
**Domain:** websocket  
**Blocks:** VS-LABELS-013, VS-LABELS-014  
**Maps to WAYFINDER:** TICKET-005 (WebSocket Implementation)

**Scope (Server + Client Hook + Tests):**
- [ ] WebSocket server setup with Hono + WebSocket adapter
- [ ] Account-scoped message broadcasting
- [ ] Client-side hook for connecting to WebSocket endpoint
- [ ] Tests: Message broadcast verification in test environment

**Dependencies:** VS-LABELS-002, VS-LABELS-005 (auth and conversations required)

---

### VS-LABELS-009: Chat Widget for Visitors
**Domain:** chat_widget  
**Blocks:** None (standalone feature)  
**Maps to WAYFINDER:** TICKET-006 (Channel Integration pattern)

**Scope (Frontend + API + Tests):**
- [ ] Frontend: Floating chat button component
- [ ] Frontend: Embedded message input form
- [ ] API: GET `/api/v1/contacts/:id/conversations/active` - get/create visitor conversation
- [ ] Tests: Widget renders correctly, API integration test

**Dependencies:** VS-LABELS-002, VS-LABELS-004, VS-LABELS-005 (auth, contact, conversation required)

---

### VS-LABELS-010: Conversation Search Functionality
**Domain:** search  
**Blocks:** None (enhancement to existing feature)  
**Maps to WAYFINDER:** Database optimization from TICKET-001

**Scope (Database + API + UI + Tests):**
- [ ] Database: Trigram index on messages.body for text search
- [ ] API: GET `/api/v1/conversations/search?q=...` - full-text search
- [ ] UI: Search bar in conversation list with results display
- [ ] Tests: Search returns correct matches

**Dependencies:** VS-LABELS-005 (conversations to search)

---

### VS-LABELS-011: File Attachments in Messages
**Domain:** attachment  
**Blocks:** None (standalone enhancement)  
**Maps to WAYFINDER:** TICKET-006 (Channel webhooks with attachments)

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema extension: `attachments` table with id, message_id, url, mime_type
- [ ] API: POST `/api/v1/attachments` - upload endpoint returning URL
- [ ] API: Message creation now accepts attachment URLs
- [ ] UI: Attachment display component in messages list
- [ ] Tests: File upload flow and attachment association

**Dependencies:** VS-LABELS-006 (messages required)

---

### VS-LABELS-012: Team & Agent Assignment System
**Domain:** team  
**Blocks:** None (standalone enhancement)  
**Maps to WAYFINDER:** TICKET-003, TICKET-007 (Component Library for management UI)

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `teams` table + `team_memberships` junction table
- [ ] API: GET/POST `/api/v1/teams`, POST `/api/v1/team-memberships`
- [ ] UI: Team management page with member assignment interface
- [ ] Tests: Team creation and membership assignments

**Dependencies:** VS-LABELS-002 (users required)

---

### VS-LABELS-013: Typing Indicators
**Domain:** typing_indicator  
**Blocks:** None (enhancement for real-time)  
**Maps to WAYFINDER:** TICKET-005 (WebSocket events)

**Scope (WebSocket Events + UI + Tests):**
- [ ] WebSocket event: `typing_start` and `typing_stop` events per conversation
- [ ] Frontend: Typing indicator component showing "User is typing..."
- [ ] Tests: Typing state transitions in WebSocket tests

**Dependencies:** VS-LABELS-008 (WebSocket infrastructure)

---

### VS-LABELS-014: Offline Message Support
**Domain:** offline_message  
**Blocks:** None (standalone feature)  
**Maps to WAYFINDER:** TICKET-006 (Webhook handling for queued messages)

**Scope (API + Schema Extension + UI + Tests):**
- [ ] API: POST `/api/v1/offline-messages` - store message when no agent online
- [ ] Database schema extension: Add `status` field to conversations (open, closed, pending)
- [ ] UI: Offline form submission with success confirmation
- [ ] Tests: Message stored when no active conversation exists

**Dependencies:** VS-LABELS-004, VS-LABELS-005 (contact and conversation required)

---

### VS-LABELS-015: Canned Responses System
**Domain:** canned_response  
**Blocks:** None (standalone feature)  
**Maps to WAYFINDER:** TICKET-003 (Database schema for responses table)

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema: `canned_responses` table with id, account_id, content, shortcut
- [ ] API: GET/POST `/api/v1/canned-responses` - full CRUD for agents
- [ ] UI: Canned response picker in message input area
- [ ] Tests: Response insertion via shortcut

**Dependencies:** VS-LABELS-002 (authentication required)

---

## Analytics & Compliance Layer

### VS-LABELS-016: Audit Logging System
**Domain:** audit_log  
**Blocks:** None (infrastructure feature)  
**Maps to WAYFINDER:** TICKET-007 (Logging all API mutations)

**Scope (Schema + Middleware + API + Tests):**
- [ ] Database schema: `audit_logs` table with id, account_id, user_id, action, metadata JSONB
- [ ] Middleware: Automatic logging of all API mutations
- [ ] API: GET `/api/v1/audit-logs` - list audit events for admin review
- [ ] Tests: Log entry creation on CRUD operations

**Dependencies:** VS-LABELS-002 (users for attribution)

---

### VS-LABELS-017: Basic Analytics Dashboard
**Domain:** analytics  
**Blocks:** None (standalone feature)  
**Maps to WAYFINDER:** TICKET-008 (Component Library with dashboard metrics)

**Scope (API + Database Views + UI + Tests):**
- [ ] API: GET `/api/v1/analytics/summary` - conversation counts, response times
- [ ] Database: Helper views or functions for aggregated metrics
- [ ] UI: Dashboard page with key metrics cards
- [ ] Tests: Aggregation queries return correct values

**Dependencies:** VS-LABELS-005, VS-LABELS-006 (conversations and messages required)

---

### VS-LABELS-018: GDPR Data Export/Deletion
**Domain:** gdpr  
**Blocks:** None (compliance feature)  
**Maps to WAYFINDER:** TICKET-003, TICKET-006 (Data export patterns)

**Scope (API + Tests):**
- [ ] API: GET `/api/v1/gdpr/export` - export all account data as JSON
- [ ] API: DELETE `/api/v1/contacts/:id` - soft delete with anonymization
- [ ] Tests: Export contains all related records, deletion removes PII

**Dependencies:** VS-LABELS-002, VS-LABELS-005, VS-LABELS-006, VS-LABELS-007 (full domain model)

---

## Enhancement Layer (Optional Features)

### VS-LABELS-019: Conversation Filtering by Labels
**Domain:** conversation_filter  
**Blocks:** None (enhancement to existing feature)  
**Maps to WAYFINDER:** TICKET-008 (UI filtering components)

**Scope (API + UI + Tests):**
- [ ] API: GET `/api/v1/conversations?label=...` - filter conversations by label
- [ ] UI: Label-based filtering in conversation list view
- [ ] Tests: Filter returns correct subset of conversations

**Dependencies:** VS-LABELS-007 (labels system)

---

### VS-LABELS-020: Account Branding Configuration
**Domain:** branding  
**Blocks:** None (standalone feature)  
**Maps to WAYFINDER:** TICKET-008 (Component Library for settings UI)

**Scope (Schema + API + UI + Tests):**
- [ ] Database schema extension: Add `branding` JSONB to accounts table
- [ ] API: PUT `/api/v1/accounts/:id/branding` - update colors, logo URL
- [ ] UI: Branding settings page in account preferences
- [ ] Tests: Brand settings persist and apply correctly

**Dependencies:** VS-LABELS-001 (account schema)

---

## Dependency Graph

```
VS-LABELS-001 (Account) ─────────────────────────────────────────────┐
                                                                        │
VS-LABELS-002 (Auth) ───► VS-LABELS-003 (Inbox) ──► VS-LABELS-004 (Contact) ──► VS-LABELS-005 (Conversation)
     │                        │                      │                           │
     └────────────────────────┴──────────────────────┴───────────────────────────┼──► VS-LABELS-006 (Messages)
                                                                                │        │
                                                                                ▼        ▼
                                                                        VS-LABELS-007 (Labels)  VS-LABELS-008 (WebSocket)
                                                                                  │              │
                                                                                  ▼              │
                                                                              VS-LABELS-015,019   │
                                                                                  │                │
                                                                                  ▼                ▼
                                                                            VS-LABELS-009 (Widget) VS-LABELS-010 (Search)
                                                                                  │
                                                                                VS-LABELS-011 (Attachments)

VS-LABELS-002 ──► VS-LABELS-012 (Teams) ◄── VS-LABELS-005 (via assignee_id)

VS-LABELS-008 (WebSocket) ──► VS-LABELS-013, 014

VS-LABELS-002,005,006,007 ──► VS-LABELS-016 (Audit Logs)
     │
     └───────────────────────────────────────► VS-LABELS-017 (Analytics)

VS-LABELS-001 through 007 ──► VS-LABELS-018 (GDPR)

VS-LABELS-001 ──► VS-LABELS-020 (Branding)
```

---

## Execution Order Recommendation

**Phase 1 - Foundation (VS-LABELS-001 to VS-LABELS-005):** Build the core data model and basic CRUD operations.

**Phase 2 - Core Features (VS-LABELS-006 to VS-LABELS-009):** Implement messaging, real-time updates, and visitor experience.

**Phase 3 - Enhancements (VS-LABELS-010 to VS-LABELS-014):** Add search, attachments, teams, typing indicators, offline support.

**Phase 4 - Productivity & Compliance (VS-LABELS-015 to VS-LABELS-018):** Canned responses, audit logs, analytics, GDPR compliance.

**Phase 5 - Polish (VS-LABELS-019 to VS-LABELS-020):** Label filtering and branding customization.

---

## Quick Reference: Domain to WAYFINDER Mapping

| Vertical Slice | Domain Entity | WAYFINDER Tickets |
|----------------|---------------|-------------------|
| VS-LABELS-001 | Account | TICKET-001, 003, 004 |
| VS-LABELS-002 | User/Auth | TICKET-002, 004 |
| VS-LABELS-003 | Inbox | TICKET-001, 004 |
| VS-LABELS-004 | Contact | TICKET-001, 003 |
| VS-LABELS-005 | Conversation | TICKET-003, 004 |
| VS-LABELS-006 | Message | TICKET-003, 004 |
| VS-LABELS-007 | Label | TICKET-001 |
| VS-LABELS-008 | WebSocket | TICKET-005 |
| VS-LABELS-009 | Chat Widget | TICKET-006 |
| VS-LABELS-010 | Search | TICKET-001 (optimization) |
| VS-LABELS-011 | Attachment | TICKET-006 |
| VS-LABELS-012 | Team | TICKET-003, 007 |
| VS-LABELS-013 | Typing Indicator | TICKET-005 |
| VS-LABELS-014 | Offline Message | TICKET-006 |
| VS-LABELS-015 | Canned Response | TICKET-003 |
| VS-LABELS-016 | Audit Log | TICKET-007 |
| VS-LABELS-017 | Analytics | TICKET-008 |
| VS-LABELS-018 | GDPR | TICKET-003, 006 |
| VS-LABELS-019 | Conversation Filter | TICKET-008 |
| VS-LABELS-020 | Branding | TICKET-008 |

---

## Comparison with Existing Tickets.md

The existing `TICKETS.md` organizes work by technical layers:
- Database Schema (Ticket 1)
- Authentication System (Ticket 2)  
- Raw SQL Query Repository (Ticket 3)
- API Endpoints (Tickets 4-5, 6)
- Frontend Setup (Tickets 7-8)

The vertical slices in this document provide an alternative organization that groups all layers together by feature domain. Both approaches can be used:
- Use **vertical slices** for feature delivery and demos
- Use **technical layer tickets** for infrastructure setup