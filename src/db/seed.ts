import db from "./client.ts";

async function seed() {
  console.log("🌱 Seeding initial data...");

  // Check if account already exists
  const existing = await db.unsafe(
    `SELECT id FROM accounts WHERE email = 'admin@xatwoot.local' LIMIT 1`
  );

  if (existing.length > 0) {
    console.log("⚠️  Initial account already exists, skipping seed.");
    await db.end?.();
    return;
  }

  await db.unsafe(`
    INSERT INTO accounts (name, email, support_email, locale, settings, limits)
    VALUES (
      'Xatwoot Default',
      'admin@xatwoot.local',
      'support@xatwoot.local',
      'en',
      '{"notifications": true}',
      '{"conversations": 1000}'
    )
  `);

  console.log("✅ Seed completed: initial account created");
  await db.end?.();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
