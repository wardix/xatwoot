import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Dockerization & Deployment Setup (VS-DEVOPS-001)", () => {
  it("provides valid Dockerfile, docker-compose.yml, and .env.example configuration files", () => {
    const dockerfilePath = join(process.cwd(), "Dockerfile");
    const dockerComposePath = join(process.cwd(), "docker-compose.yml");
    const envExamplePath = join(process.cwd(), ".env.example");
    const readmePath = join(process.cwd(), "README.md");

    expect(existsSync(dockerfilePath)).toBe(true);
    expect(existsSync(dockerComposePath)).toBe(true);
    expect(existsSync(envExamplePath)).toBe(true);
    expect(existsSync(readmePath)).toBe(true);

    const dockerfileContent = readFileSync(dockerfilePath, "utf-8");
    expect(dockerfileContent).toContain("oven/bun");
    expect(dockerfileContent).toContain("EXPOSE 3000");

    const composeContent = readFileSync(dockerComposePath, "utf-8");
    expect(composeContent).toContain("postgres:16-alpine");
    expect(composeContent).toContain("DATABASE_URL");
  });
});
