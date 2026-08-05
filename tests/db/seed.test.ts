import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import db from "../../src/db/client.ts";
import { runSeed } from "../../src/db/seed.ts";

describe("Database Seeding Script (VS-DB-001)", () => {
  it("populates database with account, users, inboxes, teams, contacts, conversations, and messages", async () => {
    const result = await runSeed();
    expect(result).toBeDefined();
    expect(result.accountId).toBeGreaterThan(0);
    expect(result.usersCount).toBeGreaterThanOrEqual(2);
    expect(result.inboxesCount).toBeGreaterThanOrEqual(1);
    expect(result.teamsCount).toBeGreaterThanOrEqual(1);
    expect(result.contactsCount).toBeGreaterThanOrEqual(2);
    expect(result.conversationsCount).toBeGreaterThanOrEqual(3);
    expect(result.messagesCount).toBeGreaterThan(0);

    // Verify records exist in database
    const accounts = await db.unsafe(`SELECT * FROM accounts WHERE id = $1`, [result.accountId]);
    expect(accounts.length).toBe(1);

    const users = await db.unsafe(`SELECT * FROM users WHERE account_id = $1`, [result.accountId]);
    expect(users.length).toBeGreaterThanOrEqual(2);

    const conversations = await db.unsafe(`SELECT * FROM conversations WHERE account_id = $1`, [result.accountId]);
    expect(conversations.length).toBeGreaterThanOrEqual(3);
  });
});
