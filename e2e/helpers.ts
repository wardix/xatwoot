import { test, expect, type Page } from "@playwright/test";

/**
 * E2E Test Helpers — VS-QA-001
 */

const API_URL = "http://localhost:3000";

/** Register a fresh test account, inbox, and agent user for isolation */
export async function createTestFixtures(timestamp: number) {
  // Create account via API
  const accountRes = await fetch(`${API_URL}/api/v1/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `E2E Account ${timestamp}`,
      email: `e2e-account-${timestamp}@test.com`,
      support_email: `support-${timestamp}@test.com`,
    }),
  });
  const account = await accountRes.json();
  const accountId: number = account.id;

  // Register agent user
  const agentRes = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `agent-${timestamp}@test.com`,
      password: "Password123!",
      name: `E2E Agent ${timestamp}`,
      account_id: accountId,
      role: "agent",
    }),
  });
  const agentData = await agentRes.json();
  const agentToken: string = agentData.token;

  // Create inbox
  const inboxRes = await fetch(`${API_URL}/api/v1/inboxes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${agentToken}`,
    },
    body: JSON.stringify({
      name: `E2E Inbox ${timestamp}`,
      channel_type: "web_widget",
    }),
  });
  const inbox = await inboxRes.json();
  const inboxId: number = inbox.id;

  return { accountId, agentToken, inboxId };
}

/** Fill and submit the offline message form as a visitor */
export async function submitVisitorMessage(page: Page, message: string) {
  // The offline form / widget form on the public widget page
  await page.fill('[data-testid="visitor-name"]', "E2E Visitor");
  await page.fill('[data-testid="visitor-email"]', "visitor@e2e.test");
  await page.fill('[data-testid="visitor-message"]', message);
  await page.click('[data-testid="submit-message"]');
}
