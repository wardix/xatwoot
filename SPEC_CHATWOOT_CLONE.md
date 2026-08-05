# Specification: Chatwoot Clone Implementation

## Problem Statement

The user needs to build a production-ready customer support platform that replicates Chatwoot's core functionality but with modern, performant technology stack. The existing solution (Chatwoot) uses Ruby on Rails + Vue.js which can be resource-intensive for smaller deployments. There's also a need for more control over database queries and better performance through Bun runtime.

## Solution

Build a Chatwoot clone using:
- **Bun + Hono** backend with raw SQL queries (no ORM)
- **PostgreSQL** with multi-tenant account_id scoping  
- **React 18 + TypeScript + Vite** frontend
- Optional **Astryx design system** for UI components
- WebSocket for real-time messaging

This provides better performance, smaller bundle sizes, and full control over database queries while maintaining all core Chatwoot features.

---

## User Stories

1. As a **customer support manager**, I want to create multiple accounts/tenants, so that I can manage separate clients with isolated data.

2. As an **agent**, I want to receive real-time notifications when new messages arrive, so that I can respond quickly to customer inquiries.

3. As a **visitor on website**, I want to see a customizable chat widget, so that I can easily contact support without leaving the page.

4. As an **admin**, I want to configure multiple channels (email, WhatsApp, Facebook), so that customers can reach us through their preferred method.

5. As a **customer**, I want to have persistent conversation history across sessions, so that I don't need to repeat my issue when returning.

6. As a **support agent**, I want to assign conversations to team members, so that workload is distributed fairly.

7. As an **admin**, I want to set up automated rules for common queries, so that repetitive work is minimized.

8. As a **manager**, I want to see analytics on response times and conversation volume, so that I can measure support team performance.

9. As a **customer**, I want to search previous conversations, so that I can find relevant past interactions quickly.

10. As an **agent**, I want keyboard shortcuts for common actions, so that I can work more efficiently.

11. As a **customer**, I want to attach images/files in chat, so that I can show screenshots of issues.

12. As an **admin**, I want to configure custom fields on contacts, so that we can track additional customer information.

13. As a **support agent**, I want to see typing indicators, so that customers know their message is being read.

14. As a **customer**, I want to leave messages when agents are offline, so that support can respond later.

15. As an **admin**, I want GDPR compliance features (data export/deletion), so that we meet legal requirements.

16. As a **support agent**, I want to tag conversations with labels, so that we can categorize and filter tickets.

17. As a **manager**, I want to set SLA policies for response times, so that we maintain quality standards.

18. As an **agent**, I want canned responses for common questions, so that I can reply faster.

19. As a **customer**, I want multi-language support in chat widget, so that international customers are accommodated.

20. As an **admin**, I want to configure custom branding (colors, logo), so that the chat matches our brand identity.

---

## Implementation Decisions

### Backend Architecture
- **Runtime:** Bun v1.1.x+ as JavaScript/TypeScript runtime for better performance
- **Framework:** Hono - middleware-based framework ideal for API-first applications
- **Database Access:** Raw SQL queries using bun:sql / @neondatabase/serverless (NO ORM)
- **Authentication:** JWT tokens with Bun.password hashing (Argon2)

### Multi-Tenant Design
- All tables include `account_id` foreign key for data isolation
- Custom display_id sequence per account for user-friendly conversation numbers
- Account-based query scoping enforced at database layer

### Database Schema (Core Tables)
1. **accounts** - Organization records with settings and limits
2. **users** - Agents/administrators with role-based access control
3. **contacts** - Customer profiles with custom attributes
4. **conversations** - Support ticket threads linking contacts, inboxes, agents
5. **messages** - Individual messages with polymorphic sender (user/contact)
6. **inboxes** - Channel configurations (web_widget, email, whatsapp, facebook)
7. **teams** & **team_memberships** - Agent grouping structure
8. **labels** & **conversation_labels** - Tagging system for categorization
9. **audit_logs** - Security compliance and activity tracking

### Frontend Architecture  
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5.x for fast HMR and bundling
- **Styling Options:** Tailwind CSS OR Astryx design system (Meta's open-source)
- **State Management:** React Query (TanStack Query) untuk Server State, Zustand untuk UI State

### Real-time Communication
- WebSocket implementation replacing ActionCable from original Chatwoot
- Tenant-aware message broadcasting through account scoping
- Socket connection management per conversation/channel

### Channel Integrations
- Webhook infrastructure for WhatsApp Business API and Facebook Messenger
- HMAC signature verification for webhook security
- External_id deduplication to prevent duplicate messages

---

## Testing Decisions

### Test Strategy
Tests should focus on **external behavior** rather than implementation details:

1. **API Integration Tests:** Test full request/response cycles including authentication, validation, and database persistence
2. **Component Tests:** Test React components render correctly with various props and states
3. **Database Query Tests:** Verify raw SQL queries return expected data structures
4. **Webhook Handler Tests:** Mock external service payloads to verify parsing logic

### Modules to Test
- Authentication middleware (login/logout flow)
- Conversation CRUD operations
- Message creation and retrieval  
- Webhook signature verification
- Role-based access control enforcement

### Prior Art
The existing documentation provides comprehensive API endpoint examples with expected request/response formats that can guide test case design.

---

## Out of Scope

1. **Native mobile apps** - Web application only, responsive design for mobile browsers
2. **Advanced AI features beyond basic suggestions** - No built-in natural language processing beyond simple keyword matching
3. **Voice/video calling support** - Text-based chat only (though audio file attachments supported)
4. **Enterprise SSO integration beyond basic OAuth** - JWT authentication with role management
5. **Built-in email sending service** - Relies on external SMTP configuration
6. **Multi-language UI translation system** - English-focused, extensible for future localization

---

## Further Notes

### Performance Considerations
- Raw SQL queries allow fine-grained optimization without ORM overhead
- Prepared statements for frequently executed queries
- Proper indexing strategy (account_id foreign keys, trigram indexes for search)

### Deployment Architecture
- Bun runtime provides faster startup and smaller memory footprint than Node.js/Rails
- Hono's lightweight middleware pattern reduces request handling overhead
- PostgreSQL with proper connection pooling handles multi-tenant workloads

### Documentation Files Created
The implementation is supported by comprehensive documentation in the `docs/` directory:
- ARCHITECTURE.md - Technical architecture and data flow
- DATABASE_SCHEMA.sql - Complete database schema with indexes
- API_REFERENCE.md - All REST API endpoints documented
- IMPLEMENTATION_PLAN.md - 16-week roadmap with phase breakdown
- FRONTEND_GUIDE.md - React component structure and patterns
- DESIGN_SYSTEM.md - Color palette, typography, spacing tokens
- WAYFINDER_PLAN.md - Structured ticket system for implementation tracking
- ASTRYX_INTEGRATION.md - Meta's Astryx design system integration guide