import db from "./client.ts";

async function migrate() {
  console.log("🚀 Running migrations...");

  // Enable extensions
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // Create accounts table
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

  // Create indexes
  await db.unsafe(
    `CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)`
  );
  await db.unsafe(
    `CREATE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain)`
  );

  console.log("✅ Migration completed: accounts table created");
  await db.end?.();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
