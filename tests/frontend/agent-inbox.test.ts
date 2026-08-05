import { describe, it, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";

describe("Agent Dashboard Core UI Workflow (VS-FRONTEND-003)", () => {
  it("has 3-column inbox layout page", () => {
    expect(existsSync(join(process.cwd(), "src/pages/AgentInboxPage.tsx"))).toBe(true);
  });

  it("has ConversationList component", () => {
    expect(existsSync(join(process.cwd(), "src/components/inbox/ConversationList.tsx"))).toBe(true);
  });

  it("has ChatArea component with WebSocket integration", () => {
    const chatAreaPath = join(process.cwd(), "src/components/inbox/ChatArea.tsx");
    expect(existsSync(chatAreaPath)).toBe(true);
    const { readFileSync } = require("fs");
    const content = readFileSync(chatAreaPath, "utf-8");
    expect(content).toContain("useWebSocket");
    expect(content).toContain("useQuery");
  });

  it("has CRM panel component", () => {
    expect(existsSync(join(process.cwd(), "src/components/inbox/CrmPanel.tsx"))).toBe(true);
  });

  it("has inbox Zustand store", () => {
    expect(existsSync(join(process.cwd(), "src/store/useInboxStore.ts"))).toBe(true);
  });

  it("has inbox CSS styles", () => {
    const cssPath = join(process.cwd(), "src/inbox.css");
    expect(existsSync(cssPath)).toBe(true);
    const { readFileSync } = require("fs");
    const content = readFileSync(cssPath, "utf-8");
    expect(content).toContain(".inbox-layout");
    expect(content).toContain(".conv-list");
    expect(content).toContain(".chat-area");
    expect(content).toContain(".crm-panel");
  });
});
