import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("CI/CD Pipeline via GitHub Actions (VS-DEVOPS-002)", () => {
  const ciPath = join(process.cwd(), ".github/workflows/ci.yml");

  it("has a GitHub Actions CI workflow file", () => {
    expect(existsSync(ciPath)).toBe(true);
  });

  it("workflow triggers on pull_request to master/main", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("pull_request");
    expect(content).toContain("master");
  });

  it("workflow installs dependencies with bun install", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("bun install");
  });

  it("workflow runs bun test", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("bun test");
  });

  it("workflow runs build:widget", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("build:widget");
  });

  it("workflow includes PostgreSQL service for database tests", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("postgres:");
    expect(content).toContain("DATABASE_URL");
  });

  it("workflow includes TypeScript type check step", () => {
    const content = readFileSync(ciPath, "utf-8");
    expect(content).toContain("tsc");
  });
});
