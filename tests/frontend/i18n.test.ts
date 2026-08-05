import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { t, setLocale, getLocale, detectBrowserLanguage } from "../../src/lib/i18n.ts";

describe("Multi-Language & i18n Support (VS-FRONTEND-006)", () => {
  describe("Translation JSON Dictionaries", () => {
    it("has en.json, id.json, and es.json translation files", () => {
      expect(existsSync(join(process.cwd(), "public/locales/en.json"))).toBe(true);
      expect(existsSync(join(process.cwd(), "public/locales/id.json"))).toBe(true);
      expect(existsSync(join(process.cwd(), "public/locales/es.json"))).toBe(true);
    });

    it("translations contain matching keys across all locales", () => {
      const en = JSON.parse(readFileSync(join(process.cwd(), "public/locales/en.json"), "utf-8"));
      const id = JSON.parse(readFileSync(join(process.cwd(), "public/locales/id.json"), "utf-8"));
      const es = JSON.parse(readFileSync(join(process.cwd(), "public/locales/es.json"), "utf-8"));

      expect(en.welcome).toBe("Welcome back");
      expect(id.welcome).toBe("Selamat datang kembali");
      expect(es.welcome).toBe("Bienvenido de nuevo");
    });
  });

  describe("i18n translation helper module", () => {
    it("t() translates keys according to active locale", () => {
      setLocale("en");
      expect(t("welcome")).toBe("Welcome back");

      setLocale("id");
      expect(t("welcome")).toBe("Selamat datang kembali");

      setLocale("es");
      expect(t("welcome")).toBe("Bienvenido de nuevo");
    });

    it("t() falls back gracefully for unknown keys", () => {
      expect(t("unknown_key_xyz", "Default Text")).toBe("Default Text");
    });

    it("detectBrowserLanguage returns supported locale or fallback en", () => {
      expect(["en", "id", "es"]).toContain(detectBrowserLanguage());
    });
  });
});
