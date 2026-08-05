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

  console.log("✅ All migrations completed");
  await db.end?.();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
