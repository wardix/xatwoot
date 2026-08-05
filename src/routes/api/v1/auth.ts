import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { registerSchema, loginSchema } from "@/schemas/authSchema.ts";
import {
  type User,
  createUser,
  findUserByEmail,
  findUserById,
} from "@/db/queries/userQueries.ts";
import { signToken } from "@/lib/jwt.ts";
import { authMiddleware } from "@/middleware/auth.ts";

// Typed Hono context with user variable
type AuthVariables = { user: User; userId: number; accountId: number };
const authRoutes = new Hono<{ Variables: AuthVariables }>();

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

function safeUser(user: User) {
  const { password_hash: _omit, ...safe } = user;
  return safe;
}

// POST /api/v1/auth/register
authRoutes.post(
  "/register",
  zValidator("json", registerSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const { email, password, name, account_id, role } = c.req.valid("json");

    const existing = await findUserByEmail(email);
    if (existing) {
      return c.json(
        { error: "Validation Failed", details: { email: ["Email already registered"] } },
        422
      );
    }

    const password_hash = await Bun.password.hash(password, { algorithm: "argon2id" });
    const user = await createUser({ account_id, email, password_hash, name, role });

    return c.json(safeUser(user), 201);
  }
);

// POST /api/v1/auth/login
authRoutes.post(
  "/login",
  zValidator("json", loginSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const user = await findUserByEmail(email);
    if (!user) {
      return c.json({ error: "Unauthorized", message: "Invalid email or password" }, 401);
    }

    const valid = await Bun.password.verify(password, user.password_hash);
    if (!valid) {
      return c.json({ error: "Unauthorized", message: "Invalid email or password" }, 401);
    }

    const token = signToken({
      userId: user.id,
      accountId: user.account_id,
      email: user.email,
      role: user.role,
    });

    return c.json({ token, user: safeUser(user) }, 200);
  }
);

// GET /api/v1/auth/me — protected
authRoutes.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json(safeUser(user));
});

// POST /api/v1/auth/sso/google — Handle Google OAuth / SSO callback
authRoutes.post("/sso/google", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email;
  const name = body.name ?? email;
  const uid = body.uid ?? body.google_id ?? `g_${Date.now()}`;

  if (!email) {
    return c.json({ error: "Validation Failed", details: { email: ["Email is required for Google SSO"] } }, 422);
  }

  const { findOrCreateSSOUser } = await import("@/db/queries/ssoQueries.ts");
  const user = await findOrCreateSSOUser({
    email,
    name,
    provider: "google",
    uid,
    accountId: body.account_id ? Number(body.account_id) : undefined,
  });

  const token = signToken({
    userId: user.id,
    accountId: user.account_id,
    email: user.email,
    role: user.role,
  });

  return c.json({ token, user: safeUser(user) }, 200);
});

// POST /api/v1/auth/sso/saml — Handle SAML enterprise authentication
authRoutes.post("/sso/saml", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email;
  const name = body.name ?? email;
  const uid = body.saml_name_id ?? body.uid ?? `saml_${Date.now()}`;

  if (!email) {
    return c.json({ error: "Validation Failed", details: { email: ["Email is required for SAML SSO"] } }, 422);
  }

  const { findOrCreateSSOUser } = await import("@/db/queries/ssoQueries.ts");
  const user = await findOrCreateSSOUser({
    email,
    name,
    provider: "saml",
    uid,
    accountId: body.account_id ? Number(body.account_id) : undefined,
  });

  const token = signToken({
    userId: user.id,
    accountId: user.account_id,
    email: user.email,
    role: user.role,
  });

  return c.json({ token, user: safeUser(user) }, 200);
});

export { authRoutes };
