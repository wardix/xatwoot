import db from "../client.ts";

export interface Role {
  id: number;
  account_id: number;
  name: string;
  description?: string;
  permissions: string[];
  created_at?: string;
}

/**
 * createCustomRole — VS-CORE-002
 */
export async function createCustomRole(params: {
  accountId: number;
  name: string;
  description?: string;
  permissions: string[];
}): Promise<Role> {
  const roleRows = await db.unsafe(
    `INSERT INTO roles (account_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING id, account_id, name, description, created_at`,
    [params.accountId, params.name, params.description ?? null]
  );
  const role = roleRows[0];

  for (const perm of params.permissions) {
    await db.unsafe(
      `INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [role.id, perm]
    );
  }

  return {
    id: Number(role.id),
    account_id: Number(role.account_id),
    name: String(role.name),
    description: role.description,
    permissions: params.permissions,
  };
}

/**
 * listAccountRoles — VS-CORE-002
 */
export async function listAccountRoles(accountId: number): Promise<Role[]> {
  const roles = await db.unsafe(
    `SELECT r.id, r.account_id, r.name, r.description,
            COALESCE(JSON_AGG(rp.permission) FILTER (WHERE rp.permission IS NOT NULL), '[]'::json) AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     WHERE r.account_id = $1
     GROUP BY r.id, r.account_id, r.name, r.description
     ORDER BY r.name ASC`,
    [accountId]
  );
  return roles.map((r: any) => ({
    id: Number(r.id),
    account_id: Number(r.account_id),
    name: String(r.name),
    description: r.description,
    permissions: typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions,
  }));
}

/**
 * deleteCustomRole — VS-CORE-002
 */
export async function deleteCustomRole(roleId: number, accountId: number): Promise<boolean> {
  const res = await db.unsafe(
    `DELETE FROM roles WHERE id = $1 AND account_id = $2 RETURNING id`,
    [roleId, accountId]
  );
  return res.length > 0;
}

/**
 * checkUserPermission — VS-CORE-002
 * Checks if a user possesses a specific permission flag. Admin role bypasses all checks.
 */
export async function checkUserPermission(userId: number, accountId: number, requiredPermission: string): Promise<boolean> {
  // 1. Admin bypasses all permission checks
  const user = await db.unsafe(
    `SELECT role FROM users WHERE id = $1`,
    [userId]
  );
  if (user.length > 0 && user[0].role === "admin") {
    return true;
  }

  // 2. Check if user's custom role contains the required permission
  const permMatch = await db.unsafe(
    `SELECT rp.id
     FROM users u
     JOIN roles r ON r.name = u.role AND r.account_id = u.account_id
     JOIN role_permissions rp ON rp.role_id = r.id
     WHERE u.id = $1 AND u.account_id = $2 AND rp.permission = $3
     LIMIT 1`,
    [userId, accountId, requiredPermission]
  );

  return permMatch.length > 0;
}
