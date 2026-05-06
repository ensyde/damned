import jwt from "jsonwebtoken";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  getRefreshExpiresAt,
  getTokenExpiresAt,
  AccessTokenPayload,
} from "./jwt";

const samplePayload: AccessTokenPayload = {
  sub: "user-id-123",
  username: "testuser",
  permissions: ["forum.post", "messages.send"],
};

describe("signAccessToken / verifyAccessToken", () => {
  it("signs and verifies a valid access token", () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe("string");

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(samplePayload.sub);
    expect(decoded.username).toBe(samplePayload.username);
    expect(decoded.permissions).toEqual(samplePayload.permissions);
  });

  it("throws when verifying a token signed with the wrong secret", () => {
    const badToken = jwt.sign(samplePayload, "wrong_secret", {
      expiresIn: "15m",
    });
    expect(() => verifyAccessToken(badToken)).toThrow();
  });

  it("throws when verifying a malformed token", () => {
    expect(() => verifyAccessToken("not.a.valid.token")).toThrow();
  });

  it("throws when verifying an expired token", () => {
    const expired = jwt.sign(samplePayload, process.env.JWT_ACCESS_SECRET ?? "access_secret", {
      expiresIn: 0,
    });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  it("signs and verifies a valid refresh token", () => {
    const token = signRefreshToken({ sub: "user-id-456" });
    expect(typeof token).toBe("string");

    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe("user-id-456");
  });

  it("throws when verifying a refresh token signed with the wrong secret", () => {
    const badToken = jwt.sign({ sub: "user-id" }, "wrong_secret", {
      expiresIn: "7d",
    });
    expect(() => verifyRefreshToken(badToken)).toThrow();
  });

  it("throws when verifying a malformed refresh token", () => {
    expect(() => verifyRefreshToken("not.a.token")).toThrow();
  });
});

describe("generateSecureToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateSecureToken();
    expect(typeof token).toBe("string");
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens on each call", () => {
    const t1 = generateSecureToken();
    const t2 = generateSecureToken();
    expect(t1).not.toBe(t2);
  });
});

describe("getRefreshExpiresAt", () => {
  it("returns a date approximately 7 days in the future", () => {
    const before = Date.now();
    const result = getRefreshExpiresAt();
    const after = Date.now();

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(result.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getTokenExpiresAt", () => {
  it("returns a date the specified number of minutes in the future", () => {
    const minutes = 60;
    const before = Date.now();
    const result = getTokenExpiresAt(minutes);
    const after = Date.now();

    const expectedMs = minutes * 60 * 1000;
    expect(result.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + expectedMs + 1000);
  });

  it("handles 0 minutes (expires immediately)", () => {
    const before = Date.now();
    const result = getTokenExpiresAt(0);
    const after = Date.now();

    expect(result.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 1000);
  });
});
