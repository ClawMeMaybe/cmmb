import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/auth";

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

  describe("validatePasswordStrength", () => {
    it("should return valid for a strong password", () => {
      const result = validatePasswordStrength("StrongPass123!");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid for password shorter than 8 characters", () => {
      const result = validatePasswordStrength("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should return invalid for password without uppercase letter", () => {
      const result = validatePasswordStrength("lowercase123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should return invalid for password without lowercase letter", () => {
      const result = validatePasswordStrength("UPPERCASE123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should return invalid for password without number", () => {
      const result = validatePasswordStrength("NoNumbers!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should return invalid for password without special character", () => {
      const result = validatePasswordStrength("NoSpecial123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should return multiple errors for very weak password", () => {
      const result = validatePasswordStrength("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it("should accept various special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];

      for (const char of specialChars) {
        const result = validatePasswordStrength(`StrongPass123${char}`);
        expect(result.valid).toBe(true);
      }
    });
  });
});
