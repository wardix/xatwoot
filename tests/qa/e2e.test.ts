import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("E2E Testing with Playwright (VS-QA-001)", () => {
  it("has playwright.config.ts configuration file", () => {
    expect(existsSync(join(process.cwd(), "playwright.config.ts"))).toBe(true);
  });

  it("has e2e test suite file", () => {
    expect(existsSync(join(process.cwd(), "e2e/chat-workflow.spec.ts"))).toBe(true);
  });

  it("package.json includes test:e2e script", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["test:e2e"]).toBeDefined();
  });

  it("e2e spec tests visitor sending message and agent responding", () => {
    const content = readFileSync(join(process.cwd(), "e2e/chat-workflow.spec.ts"), "utf-8");
    expect(content).toContain("Agent can log in");
    expect(content).toContain("Visitor sends message");
    expect(content).toContain("chat-area");
  });
});
