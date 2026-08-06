import { describe, it, expect } from "bun:test";
import { parseInboundEmail, sendEmailReplySMTP } from "../../src/lib/emailChannel.ts";

describe("Email Channel Integration (IMAP / SMTP) — VS-OMNICHANNEL-003", () => {
  describe("Inbound Email Parsing", () => {
    it("parses raw IMAP email payload into structured message", () => {
      const rawEmail = {
        from: "Alice Smith <alice@company.com>",
        subject: "Need help with invoice #1004",
        text: "Hi support team, I could not download my invoice.",
        messageId: "<msg-98765@mail.company.com>",
      };

      const parsed = parseInboundEmail(rawEmail);
      expect(parsed).not.toBeNull();
      expect(parsed?.fromName).toBe("Alice Smith");
      expect(parsed?.fromAddress).toBe("alice@company.com");
      expect(parsed?.subject).toBe("Need help with invoice #1004");
      expect(parsed?.body).toContain("download my invoice");
    });
  });

  describe("Outbound SMTP Transport", () => {
    it("sends email reply via SMTP transport helper", async () => {
      const config = {
        imap_host: "imap.example.com",
        imap_user: "support@example.com",
        smtp_host: "smtp.example.com",
        smtp_port: 587,
        smtp_user: "support@example.com",
        smtp_password: "secretpassword",
      };

      const success = await sendEmailReplySMTP(config, "alice@company.com", "Re: Need help with invoice #1004", "Here is your invoice attachment.");
      expect(success).toBe(true);
    });
  });
});
