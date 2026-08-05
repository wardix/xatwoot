import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Mobile PWA & Responsive Dashboard (VS-FRONTEND-005)", () => {
  it("has public/manifest.json web app manifest", () => {
    const manifestPath = join(process.cwd(), "public/manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.short_name).toBe("Xatwoot");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("index.html includes manifest link and mobile viewport meta tags", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf-8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.json"');
    expect(html).toContain("theme-color");
    expect(html).toContain("apple-mobile-web-app-capable");
  });

  it("src/inbox.css includes mobile responsive media queries and 44px touch targets", () => {
    const css = readFileSync(join(process.cwd(), "src/inbox.css"), "utf-8");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 1024px)");
    expect(css).toContain("min-height: 44px");
  });
});
