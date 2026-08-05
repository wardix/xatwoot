import db from "./client.ts";

export interface SeedResult {
  accountId: number;
  usersCount: number;
  inboxesCount: number;
  teamsCount: number;
  contactsCount: number;
  conversationsCount: number;
  messagesCount: number;
}

export async function runSeed(): Promise<SeedResult> {
  console.log("🌱 Running comprehensive database seeder...");

  const ts = Date.now();
  const accountEmail = `demo-account-${ts}@xatwoot.local`;

  // 1. Account
  const accountRows = await db.unsafe(
    `INSERT INTO accounts (name, email, support_email, locale, settings, limits, branding)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
     RETURNING id`,
    [
      `Xatwoot Demo (${ts})`,
      accountEmail,
      `support-${ts}@xatwoot.local`,
      "en",
      JSON.stringify({ notifications: true }),
      JSON.stringify({ conversations: 5000 }),
      JSON.stringify({ primary_color: "#1f93ff", company_name: "Xatwoot Demo" }),
    ]
  );
  const accountId = Number(accountRows[0].id);

  // 2. Users (Admin + Agent)
  const passwordHash = await Bun.password.hash("Password123!", { algorithm: "argon2id" });
  const user1 = await db.unsafe(
    `INSERT INTO users (account_id, email, password_hash, name, role, availability)
     VALUES ($1, $2, $3, 'Admin User', 'admin', 'online')
     RETURNING id`,
    [accountId, `admin-${ts}@xatwoot.local`, passwordHash]
  );
  const user2 = await db.unsafe(
    `INSERT INTO users (account_id, email, password_hash, name, role, availability)
     VALUES ($1, $2, $3, 'Agent Sarah', 'agent', 'online')
     RETURNING id`,
    [accountId, `agent-${ts}@xatwoot.local`, passwordHash]
  );

  const adminUserId = Number(user1[0].id);
  const agentUserId = Number(user2[0].id);

  // 3. Inboxes
  const inboxRows = await db.unsafe(
    `INSERT INTO inboxes (account_id, name, channel_type, greeting_enabled)
     VALUES ($1, 'Website Support Widget', 'web_widget', true)
     RETURNING id`,
    [accountId]
  );
  const inboxId = Number(inboxRows[0].id);

  // 4. Teams & Membership
  const teamRows = await db.unsafe(
    `INSERT INTO teams (account_id, name, description, allow_auto_assign)
     VALUES ($1, 'Customer Support Team', 'Tier 1 Support Team', true)
     RETURNING id`,
    [accountId]
  );
  const teamId = Number(teamRows[0].id);

  await db.unsafe(
    `INSERT INTO team_memberships (team_id, user_id, account_id, role)
     VALUES ($1, $2, $3, 'admin')`,
    [teamId, adminUserId, accountId]
  );
  await db.unsafe(
    `INSERT INTO team_memberships (team_id, user_id, account_id, role)
     VALUES ($1, $2, $3, 'member')`,
    [teamId, agentUserId, accountId]
  );

  // 5. Contacts
  const contact1 = await db.unsafe(
    `INSERT INTO contacts (account_id, name, email, phone_number)
     VALUES ($1, 'Alice Johnson', $2, '+15550199')
     RETURNING id`,
    [accountId, `alice-${ts}@example.com`]
  );
  const contact2 = await db.unsafe(
    `INSERT INTO contacts (account_id, name, email, phone_number)
     VALUES ($1, 'Bob Smith', $2, '+15550288')
     RETURNING id`,
    [accountId, `bob-${ts}@example.com`]
  );

  const contactId1 = Number(contact1[0].id);
  const contactId2 = Number(contact2[0].id);

  // 6. Conversations
  const conv1 = await db.unsafe(
    `INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, assignee_id, status, priority, subject)
     VALUES (1, $1, $2, $3, $4, 'open', 'high', 'Need help with billing invoice')
     RETURNING id`,
    [accountId, inboxId, contactId1, agentUserId]
  );
  const conv2 = await db.unsafe(
    `INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, assignee_id, status, priority, subject)
     VALUES (2, $1, $2, $3, $4, 'resolved', 'low', 'Question about subscription plan')
     RETURNING id`,
    [accountId, inboxId, contactId2, adminUserId]
  );
  const conv3 = await db.unsafe(
    `INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, status, priority, subject)
     VALUES (3, $1, $2, $3, 'pending', 'low', 'Offline inquiry during weekend')
     RETURNING id`,
    [accountId, inboxId, contactId1]
  );

  const convId1 = Number(conv1[0].id);
  const convId2 = Number(conv2[0].id);
  const convId3 = Number(conv3[0].id);

  // 7. Messages
  const msgBodies = [
    { conv: convId1, type: "contact", id: contactId1, text: "Hello! I noticed a discrepancy in my last invoice." },
    { conv: convId1, type: "user", id: agentUserId, text: "Hi Alice, I can certainly check that for you right away!" },
    { conv: convId1, type: "contact", id: contactId1, text: "Thank you, line item 3 shows an extra charge." },
    { conv: convId2, type: "contact", id: contactId2, text: "What features are included in the Pro Plan?" },
    { conv: convId2, type: "user", id: adminUserId, text: "The Pro plan includes unlimited inboxes, team assignments, and real-time WebSocket notifications." },
    { conv: convId3, type: "contact", id: contactId1, text: "Please send me your product catalog when someone is online." },
  ];

  let messagesCount = 0;
  for (const m of msgBodies) {
    await db.unsafe(
      `INSERT INTO messages (account_id, conversation_id, sender_type, sender_id, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [Number(accountId), Number(m.conv), String(m.type), Number(m.id), String(m.text)]
    );
    messagesCount++;
  }

  // 8. Canned Responses
  await db.unsafe(
    `INSERT INTO canned_responses (account_id, shortcut, content)
     VALUES ($1, 'greeting', 'Hello! How can I help you today?')`,
    [Number(accountId)]
  );
  await db.unsafe(
    `INSERT INTO canned_responses (account_id, shortcut, content)
     VALUES ($1, 'pricing', 'You can find full pricing details at https://example.com/pricing')`,
    [Number(accountId)]
  );

  console.log("✅ Comprehensive database seeding finished successfully.");

  return {
    accountId,
    usersCount: 2,
    inboxesCount: 1,
    teamsCount: 1,
    contactsCount: 2,
    conversationsCount: 3,
    messagesCount,
  };
}

// Execute if run directly
if (import.meta.main) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
