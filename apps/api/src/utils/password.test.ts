import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";

describe("validatePasswordStrength", () => {
  it("returns an error when password is too short (< 8 chars)", () => {
    expect(validatePasswordStrength("abc123")).toBe(
      "Password must be at least 8 characters"
    );
  });

  it("returns an error when password is exactly 7 chars", () => {
    expect(validatePasswordStrength("1234567")).toBe(
      "Password must be at least 8 characters"
    );
  });

  it("returns null for a password of exactly 8 characters", () => {
    expect(validatePasswordStrength("12345678")).toBeNull();
  });

  it("returns null for a valid password within limits", () => {
    expect(validatePasswordStrength("securePass!1")).toBeNull();
  });

  it("returns an error when password is too long (> 128 chars)", () => {
    expect(validatePasswordStrength("a".repeat(129))).toBe(
      "Password must be at most 128 characters"
    );
  });

  it("returns null for a password of exactly 128 characters", () => {
    expect(validatePasswordStrength("a".repeat(128))).toBeNull();
  });
});

describe("hashPassword and verifyPassword", () => {
  it("hashes a password and verifies the correct password against it", async () => {
    const password = "MySecureP@ssw0rd";
    const hash = await hashPassword(password);
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe(password);
    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("returns false when verifying an incorrect password", async () => {
    const hash = await hashPassword("correctPassword1");
    const valid = await verifyPassword("wrongPassword!", hash);
    expect(valid).toBe(false);
  });

  it("generates different hashes for the same password (random salt)", async () => {
    const password = "samePassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
