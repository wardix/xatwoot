import db from "../client.ts";
import type { User } from "./userQueries.ts";

/**
 * findOrCreateSSOUser — VS-AUTH-001
 * Maps external OAuth / SAML identity to a Xatwoot user, bypassing standard password creation.
 */
export async function findOrCreateSSOUser(params: {
  email: string;
  name?: string;
  provider: "google" | "saml" | "github";
  uid: string;
  accountId?: number;
}): Promise<User> {
  const existing = await db.unsafe(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [params.email]
  );

  if (existing.length > 0) {
    // Update SSO provider details if not already set
    const user = existing[0];
    if (!user.provider || !user.uid) {
      await db.unsafe(
        `UPDATE users
         SET provider = $1, uid = $2, updated_at = NOW()
         WHERE id = $3`,
        [params.provider, params.uid, user.id]
      );
    }
    return user as User;
  }

  // Determine target account ID (use default account 1 if not specified)
  const targetAccountId = params.accountId ?? 1;

  // Create new SSO user with dummy random password hash (bypasses password logins)
  const dummyHash = await Bun.password.hash(`sso_${params.provider}_${Date.now()}_${Math.random()}`, { algorithm: "argon2id" });

  const created = await db.unsafe(
    `INSERT INTO users (account_id, email, password_hash, name, role, provider, uid)
     VALUES ($1, $2, $3, $4, 'agent', $5, $6)
     RETURNING *`,
    [targetAccountId, params.email, dummyHash, params.name ?? params.email, params.provider, params.uid]
  );

  return created[0] as User;
}
