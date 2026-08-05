import db from "../client.ts";

export interface Team {
  id: number;
  account_id: number;
  name: string;
  description: string | null;
  allow_auto_assign: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMembership {
  id: number;
  team_id: number;
  user_id: number;
  account_id: number;
  role: "admin" | "member";
  created_at: Date;
  updated_at: Date;
}

export interface CreateTeamInput {
  account_id: number;
  name: string;
  description?: string;
  allow_auto_assign?: boolean;
}

export interface AddTeamMemberInput {
  team_id: number;
  user_id: number;
  account_id: number;
  role?: "admin" | "member";
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { account_id, name, description = null, allow_auto_assign = true } = input;

  const rows = await db.unsafe(
    `INSERT INTO teams (account_id, name, description, allow_auto_assign)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [account_id, name, description, allow_auto_assign]
  );
  return rows[0] as Team;
}

export async function findTeamByName(name: string, account_id: number): Promise<Team | null> {
  const rows = await db.unsafe(
    `SELECT * FROM teams WHERE name = $1 AND account_id = $2 LIMIT 1`,
    [name, account_id]
  );
  return (rows[0] as Team) ?? null;
}

export async function findTeamById(id: number, account_id: number): Promise<Team | null> {
  const rows = await db.unsafe(
    `SELECT * FROM teams WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Team) ?? null;
}

export async function listTeamsByAccount(
  account_id: number,
  limit = 50,
  offset = 0
): Promise<{ data: Team[]; total: number }> {
  const [rows, countRows] = await Promise.all([
    db.unsafe(`SELECT * FROM teams WHERE account_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3`, [
      account_id,
      limit,
      offset,
    ]),
    db.unsafe(`SELECT COUNT(*)::int AS total FROM teams WHERE account_id = $1`, [account_id]),
  ]);
  return {
    data: rows as Team[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function addTeamMember(input: AddTeamMemberInput): Promise<TeamMembership> {
  const { team_id, user_id, account_id, role = "member" } = input;

  const rows = await db.unsafe(
    `INSERT INTO team_memberships (team_id, user_id, account_id, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
     RETURNING *`,
    [team_id, user_id, account_id, role]
  );
  return rows[0] as TeamMembership;
}

export async function listTeamMembers(team_id: number, account_id: number): Promise<TeamMembership[]> {
  const rows = await db.unsafe(
    `SELECT tm.*, u.name as user_name, u.email as user_email
     FROM team_memberships tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 AND tm.account_id = $2
     ORDER BY tm.created_at ASC`,
    [team_id, account_id]
  );
  return rows as TeamMembership[];
}
