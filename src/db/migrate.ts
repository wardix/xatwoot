import db from "./client.ts";

async function migrate() {
  console.log("🚀 Running migrations...");

  // Enable extensions
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // accounts table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS accounts (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone_number VARCHAR(50),
      domain VARCHAR(255),
      support_email VARCHAR(255),
      locale VARCHAR(10) DEFAULT 'en',
      settings JSONB DEFAULT '{}',
      branding JSONB DEFAULT '{}',
      limits JSONB DEFAULT '{"conversations": 1000}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain)`);
  console.log("✅ accounts table ready");

  // users table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
      availability VARCHAR(10) DEFAULT 'offline' CHECK (availability IN ('online', 'away', 'offline')),
      otp_secret VARCHAR(255),
      provider VARCHAR(50),
      uid VARCHAR(255),
      pubsub_token VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  console.log("✅ users table ready");

  // inboxes table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS inboxes (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      channel_type VARCHAR(50) CHECK (channel_type IN ('web_widget','email','whatsapp','facebook','telegram')),
      integration_config JSONB DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      greeting_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_inboxes_account ON inboxes(account_id)`);
  console.log("✅ inboxes table ready");

  // contacts table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS contacts (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255),
      email VARCHAR(255),
      phone_number VARCHAR(50),
      avatar_url TEXT,
      additional_attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (account_id, email),
      UNIQUE (account_id, phone_number)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm ON contacts USING gin (email gin_trgm_ops)`);
  console.log("✅ contacts table ready");

  // conversations table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGSERIAL PRIMARY KEY,
      display_id BIGINT NOT NULL,
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
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, display_id)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_conversations_account ON conversations(account_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON conversations(assignee_id)`);
  console.log("✅ conversations table ready");

  // messages table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
      sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'contact', 'bot')),
      sender_id BIGINT,
      body TEXT,
      message_type VARCHAR(10) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
      status VARCHAR(10) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
      private BOOLEAN DEFAULT false,
      media_url TEXT,
      external_id VARCHAR(255) UNIQUE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_body_trgm ON messages USING gin (body gin_trgm_ops)`);
  console.log("✅ messages table ready");

  // labels table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS labels (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, name)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_labels_account ON labels(account_id)`);
  console.log("✅ labels table ready");

  // conversation_labels table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS conversation_labels (
      conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
      label_id BIGINT REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, label_id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_conv_labels_label ON conversation_labels(label_id)`);
  console.log("✅ conversation_labels table ready");

  // attachments table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS attachments (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      file_type VARCHAR(50) DEFAULT 'file',
      mime_type VARCHAR(100),
      file_size BIGINT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_attachments_account ON attachments(account_id)`);
  console.log("✅ attachments table ready");

  // teams table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS teams (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      allow_auto_assign BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, name)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_teams_account ON teams(account_id)`);
  console.log("✅ teams table ready");

  // team_memberships table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS team_memberships (
      id BIGSERIAL PRIMARY KEY,
      team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(team_id, user_id)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON team_memberships(user_id)`);
  console.log("✅ team_memberships table ready");

  // canned_responses table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS canned_responses (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      shortcut VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, shortcut)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_canned_responses_account ON canned_responses(account_id)`);
  console.log("✅ canned_responses table ready");

  // audit_logs table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON audit_logs(account_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  console.log("✅ audit_logs table ready");

  // push_subscriptions table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      keys JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`);
  // automation_rules table
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      event_type VARCHAR(50) DEFAULT 'conversation_created' CHECK (event_type IN ('conversation_created', 'message_created')),
      conditions JSONB NOT NULL DEFAULT '[]',
      actions JSONB NOT NULL DEFAULT '[]',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_automation_rules_account ON automation_rules(account_id)`);
  console.log("✅ automation_rules table ready");

  console.log("✅ All migrations completed");
  await db.end?.();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
