import db from "../client.ts";

/**
 * getNextRoundRobinAgent — VS-CORE-001
 *
 * Implements a Round-Robin assignment algorithm across online team members.
 * Selects the available online user in the team who has the fewest assigned open conversations.
 */
export async function getNextRoundRobinAgent(
  accountId: number,
  teamId?: number
): Promise<{ id: number; name: string; email: string } | null> {
  // If teamId is specified, check if auto-assign is allowed for that team
  if (teamId) {
    const team = await db.unsafe(
      `SELECT allow_auto_assign FROM teams WHERE id = $1 AND account_id = $2`,
      [teamId, accountId]
    );
    if (team.length > 0 && !team[0].allow_auto_assign) {
      return null; // Auto-assign is disabled for this team
    }
  }

  // Find online agents belonging to the team (or account) sorted by fewest open assigned conversations
  const query = teamId
    ? `SELECT u.id, u.name, u.email, COUNT(c.id) AS assigned_count
       FROM users u
       JOIN team_memberships tm ON tm.user_id = u.id AND tm.team_id = $2
       LEFT JOIN conversations c ON c.assignee_id = u.id AND c.status IN ('open', 'pending')
       WHERE u.account_id = $1 AND u.availability = 'online' AND u.role IN ('admin', 'agent')
       GROUP BY u.id, u.name, u.email
       ORDER BY assigned_count ASC, u.id ASC
       LIMIT 1`
    : `SELECT u.id, u.name, u.email, COUNT(c.id) AS assigned_count
       FROM users u
       LEFT JOIN conversations c ON c.assignee_id = u.id AND c.status IN ('open', 'pending')
       WHERE u.account_id = $1 AND u.availability = 'online' AND u.role IN ('admin', 'agent')
       GROUP BY u.id, u.name, u.email
       ORDER BY assigned_count ASC, u.id ASC
       LIMIT 1`;

  const params = teamId ? [accountId, teamId] : [accountId];
  const rows = await db.unsafe(query, params);

  if (rows.length === 0) return null;
  return {
    id: Number(rows[0].id),
    name: String(rows[0].name ?? rows[0].email),
    email: String(rows[0].email),
  };
}

/**
 * autoAssignConversation — VS-CORE-001
 *
 * Automatically assigns a conversation to the next Round-Robin agent if one is available.
 */
export async function autoAssignConversation(
  conversationId: number,
  accountId: number,
  teamId?: number
): Promise<{ assigned: boolean; assignee_id?: number }> {
  const agent = await getNextRoundRobinAgent(accountId, teamId);
  if (!agent) return { assigned: false };

  await db.unsafe(
    `UPDATE conversations
     SET assignee_id = $1, updated_at = NOW()
     WHERE id = $2 AND account_id = $3`,
    [agent.id, conversationId, accountId]
  );

  return { assigned: true, assignee_id: agent.id };
}

/**
 * toggleTeamAutoAssign — VS-CORE-001
 *
 * Updates team settings to enable/disable auto-assignment.
 */
export async function toggleTeamAutoAssign(
  teamId: number,
  accountId: number,
  allowAutoAssign: boolean
): Promise<{ id: number; allow_auto_assign: boolean }> {
  const updated = await db.unsafe(
    `UPDATE teams
     SET allow_auto_assign = $1, updated_at = NOW()
     WHERE id = $2 AND account_id = $3
     RETURNING id, allow_auto_assign`,
    [allowAutoAssign, teamId, accountId]
  );
  if (updated.length === 0) throw new Error("Team not found");
  return { id: Number(updated[0].id), allow_auto_assign: Boolean(updated[0].allow_auto_assign) };
}
