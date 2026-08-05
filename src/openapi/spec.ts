export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Xatwoot REST API",
    version: "1.0.0",
    description: "OpenAPI specification & interactive API documentation for Xatwoot Customer Engagement Platform.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/api/v1/auth/register": {
      post: {
        summary: "Register new user",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "account_id"],
                properties: {
                  email: { type: "string", example: "agent@example.com" },
                  password: { type: "string", example: "Password123!" },
                  account_id: { type: "number", example: 1 },
                  name: { type: "string", example: "Agent Smith" },
                  role: { type: "string", enum: ["admin", "agent", "viewer"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User registered successfully" },
          "422": { description: "Validation error or email in use" },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        summary: "User authentication",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "agent@example.com" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "JWT authentication token returned" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/accounts": {
      get: {
        summary: "List accounts",
        responses: { "200": { description: "Accounts array" } },
      },
      post: {
        summary: "Create new account",
        responses: { "201": { description: "Account created" } },
      },
    },
    "/api/v1/inboxes": {
      get: {
        summary: "List inboxes for account",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Inboxes array" } },
      },
    },
    "/api/v1/contacts": {
      get: {
        summary: "List contacts for account",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Contacts array" } },
      },
      post: {
        summary: "Create new contact",
        security: [{ BearerAuth: [] }],
        responses: { "201": { description: "Contact created" } },
      },
    },
    "/api/v1/conversations": {
      get: {
        summary: "List conversations (supports label, status, inbox_id, assignee_id filters)",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Conversations array" } },
      },
      post: {
        summary: "Create new conversation",
        security: [{ BearerAuth: [] }],
        responses: { "201": { description: "Conversation created" } },
      },
    },
    "/api/v1/conversations/{id}/messages": {
      get: {
        summary: "List messages in conversation",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Messages array" } },
      },
      post: {
        summary: "Send message in conversation",
        security: [{ BearerAuth: [] }],
        responses: { "201": { description: "Message created" } },
      },
    },
    "/api/v1/teams": {
      get: {
        summary: "List teams for account",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Teams array" } },
      },
    },
    "/api/v1/canned-responses": {
      get: {
        summary: "List canned responses",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Canned responses array" } },
      },
    },
    "/api/v1/analytics/summary": {
      get: {
        summary: "Fetch dashboard analytics summary",
        security: [{ BearerAuth: [] }],
        responses: { "200": { description: "Analytics metrics object" } },
      },
    },
  },
};
