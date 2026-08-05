import { test, expect } from "@playwright/test";

test.describe("VS-QA-001: End-to-End Chat & Agent Workflow", () => {
  const API_HOST = "http://localhost:3000";

  test("Agent can log in and view dashboard", async ({ page }) => {
    // 1. Visit Login Page
    await page.goto("/login");
    await expect(page).toHaveTitle(/Xatwoot/i);

    // 2. Perform Login via UI
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // 3. Verify redirected to dashboard / inbox
    await expect(page).toHaveURL(/.*(dashboard|inbox)/);
  });

  test("Visitor sends message via widget and Agent receives it", async ({ page, browser }) => {
    const ts = Date.now();
    const visitorEmail = `visitor-${ts}@example.com`;
    const visitorMessage = `Hello from E2E test ${ts}`;

    // Context 1: Agent Dashboard
    const agentContext = await browser.newContext();
    const agentPage = await agentContext.newPage();

    // Agent Login
    await agentPage.goto("/login");
    await agentPage.fill('input[type="email"]', "admin@example.com");
    await agentPage.fill('input[type="password"]', "Password123!");
    await agentPage.click('button[type="submit"]');
    await agentPage.waitForURL(/.*(dashboard|inbox)/);

    // Context 2: Visitor sending offline message / chat widget
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();

    // Direct POST offline message to trigger new conversation & message
    const res = await visitorPage.request.post(`${API_HOST}/api/v1/offline-messages`, {
      data: {
        inbox_id: 1,
        name: "E2E Visitor",
        email: visitorEmail,
        message: visitorMessage,
      },
    });
    expect(res.ok()).toBeTruthy();

    // Agent navigates to Agent Inbox
    await agentPage.goto("/inbox");

    // Verify conversation appears in agent conversation list
    await expect(agentPage.locator(".conv-list")).toContainText("E2E Visitor");

    // Click on conversation to open chat area
    await agentPage.click('.conv-item:has-text("E2E Visitor")');

    // Verify message text appears in ChatArea
    await expect(agentPage.locator(".chat-area__messages")).toContainText(visitorMessage);

    // Agent sends reply
    const replyText = `Hello visitor, I got your message ${ts}!`;
    await agentPage.fill(".chat-area__input", replyText);
    await agentPage.click(".chat-area__send-btn");

    // Verify reply appears in chat messages list
    await expect(agentPage.locator(".chat-area__messages")).toContainText(replyText);

    await agentContext.close();
    await visitorContext.close();
  });
});
