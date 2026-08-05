import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createTeamSchema, addTeamMemberSchema } from "@/schemas/teamSchema.ts";
import {
  createTeam,
  findTeamByName,
  findTeamById,
  listTeamsByAccount,
  addTeamMember,
  listTeamMembers,
} from "@/db/queries/teamQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type TeamVariables = { user: User; userId: number; accountId: number };
const teamRoutes = new Hono<{ Variables: TeamVariables }>();

teamRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// GET /api/v1/teams — list all teams in account
teamRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const { data, total } = await listTeamsByAccount(accountId);
  return c.json({ data, meta: { total, page: 1, per_page: 50 } });
});

// POST /api/v1/teams — create a team
teamRoutes.post(
  "/",
  zValidator("json", createTeamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const existing = await findTeamByName(body.name, accountId);
    if (existing) {
      return c.json(
        { error: "Validation Failed", details: { name: ["Team name already exists"] } },
        422
      );
    }

    const team = await createTeam({ ...body, account_id: accountId });
    return c.json(team, 201);
  }
);

// GET /api/v1/teams/:id/memberships — list team members
teamRoutes.get("/:id/memberships", async (c) => {
  const accountId = c.get("accountId");
  const teamId = Number(c.req.param("id"));
  if (isNaN(teamId)) {
    return c.json({ error: "Not Found", message: "Team not found" }, 404);
  }

  const team = await findTeamById(teamId, accountId);
  if (!team) {
    return c.json({ error: "Not Found", message: "Team not found" }, 404);
  }

  const members = await listTeamMembers(teamId, accountId);
  return c.json(members);
});

// POST /api/v1/teams/:id/memberships — add user to team
teamRoutes.post(
  "/:id/memberships",
  zValidator("json", addTeamMemberSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const teamId = Number(c.req.param("id"));
    if (isNaN(teamId)) {
      return c.json({ error: "Not Found", message: "Team not found" }, 404);
    }

    const team = await findTeamById(teamId, accountId);
    if (!team) {
      return c.json({ error: "Not Found", message: "Team not found" }, 404);
    }

    const body = c.req.valid("json");
    const membership = await addTeamMember({
      team_id: teamId,
      user_id: body.user_id,
      account_id: accountId,
      role: body.role,
    });

    return c.json(membership, 201);
  }
);

export { teamRoutes };
