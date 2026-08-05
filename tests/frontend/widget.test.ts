import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Embeddable Chat Widget Bundle (VS-FRONTEND-002)", () => {
  it("compiles widget into standalone dist/widget/widget.js bundle", () => {
    const bundlePath = join(process.cwd(), "dist/widget/widget.js");
    expect(existsSync(bundlePath)).toBe(true);

    const content = readFileSync(bundlePath, "utf-8");
    expect(content).toContain("XatwootWidget");
    expect(content).toContain("xatwoot-widget-container");
  });
});
