import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("Auth utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password consistently", async () => {
      const password = "testpassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(password);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it("should produce different hashes for different passwords", async () => {
      const hash1 = await hashPassword("password1");
      const hash2 = await hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for correct password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongpassword", hash);

      expect(isValid).toBe(false);
    });

    it("should return false for empty password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });
  });
});
