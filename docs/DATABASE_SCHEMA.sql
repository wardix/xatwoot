-- Chatwoot Clone Database Schema
-- PostgreSQL 15+ with Raw SQL (No ORM)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

=============================================================================
-- ACCOUNTS TABLE - Multi-tenant organization records
=============================================================================
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(50),
    domain VARCHAR(255),
    support_email VARCHAR(255),
    locale VARCHAR(10) DEFAULT 'en',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"conversations": 1000}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for accounts
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_domain ON accounts(domain);

=============================================================================
-- USERS TABLE - Agents and administrators
=============================================================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
    availability VARCHAR(10) DEFAULT 'offline' CHECK (availability IN ('online', 'away', 'offline')),
    otp_secret VARCHAR(255),              -- MFA support
    provider VARCHAR(50),                 -- SSO provider
    uid VARCHAR(255),                     -- SSO user ID
    pubsub_token VARCHAR(255),            -- Real-time notifications token
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_account ON users(account_id);
CREATE INDEX idx_users_email ON users(email);

=============================================================================
-- CONTACTS TABLE - Customer/visitor profiles
=============================================================================
CREATE TABLE contacts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    additional_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for contacts (with trigram for fuzzy search)
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_email_trgm ON contacts USING gin (email gin_trgm_ops);

=============================================================================
-- INBOXES TABLE - Communication channels configuration
=============================================================================
CREATE TABLE inboxes (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) CHECK (channel_type IN ('web_widget', 'email', 'whatsapp', 'facebook', 'telegram')),
    integration_config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    greeting_enabled BOOLEAN DEFAULT false,
    group_assignment_id BIGINT REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for inboxes
CREATE INDEX idx_inboxes_account ON inboxes(account_id);

=============================================================================
-- CONVERSATIONS TABLE - Support ticket threads
=============================================================================
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    display_id BIGINT NOT NULL,              -- Custom sequence per account
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    inbox_id BIGINT REFERENCES inboxes(id),
    contact_id BIGINT REFERENCES contacts(id),
    assignee_id BIGINT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'snoozed')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    waiting_since TIMESTAMP,
    last_activity_at TIMESTAMP,
    subject TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX idx_conversations_account ON conversations(account_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assignee ON conversations(assignee_id);

=============================================================================
-- MESSAGES TABLE - Individual message records
=============================================================================
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'contact')),
    sender_id BIGINT,                       -- Polymorphic: user ID or contact ID
    body TEXT,
    message_type VARCHAR(10) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
    status VARCHAR(10) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
    private BOOLEAN DEFAULT false,          -- Internal notes
    media_url TEXT,                         -- Attachment URL
    external_id VARCHAR(255) UNIQUE,        -- Deduplication for webhooks
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

=============================================================================
-- TEAMS TABLE - Agent grouping structure
=============================================================================
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for teams
CREATE INDEX idx_teams_account ON teams(account_id);

CREATE TABLE team_memberships (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for team_memberships
CREATE INDEX idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user ON team_memberships(user_id);

=============================================================================
-- LABELS TABLE - Categorization tags
=============================================================================
CREATE TABLE labels (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),                       -- Hex color code #RRGGBB
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for labels
CREATE INDEX idx_labels_account ON labels(account_id);

CREATE TABLE conversation_labels (
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    label_id BIGINT REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, label_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for conversation_labels
CREATE INDEX idx_conv_labels_label ON conversation_labels(label_id);

=============================================================================
-- AUDIT_LOGS TABLE - Security & compliance logging
=============================================================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,      -- e.g., 'conversation_created'
    item_type VARCHAR(50),                  -- e.g., 'Conversation', 'Message'
    item_id BIGINT,
    details JSONB DEFAULT '{}',             -- Additional context data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_account ON audit_logs(account_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);

=============================================================================
-- CUSTOM SEQUENCE FOR DISPLAY_ID (per account)
=============================================================================
-- This function ensures unique display_id per account
CREATE OR REPLACE FUNCTION generate_conversation_display_id(p_account_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
    next_display_id BIGINT;
BEGIN
    SELECT COALESCE(MAX(display_id), 0) + 1 INTO next_display_id
    FROM conversations
    WHERE accountId = p_account_id;

    RETURN next_display_id;
END;
$$ LANGUAGE plpgsql;