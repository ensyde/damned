import { Request, Response, NextFunction } from "express";
import { authenticate, optionalAuth, AuthRequest } from "./auth";
import * as jwtUtils from "../utils/jwt";

function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(authHeader?: string): AuthRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as AuthRequest;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── authenticate ─────────────────────────────────────────────────────────────

describe("authenticate", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = makeReq();
    const res = makeRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with 'Bearer '", () => {
    const req = makeReq("Basic somebase64value");
    const res = makeRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is invalid", () => {
    const req = makeReq("Bearer invalidtoken");
    const res = makeRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and sets req.user when the token is valid", () => {
    const payload = {
      sub: "user-123",
      username: "alice",
      permissions: ["forum.post"],
    };
    jest.spyOn(jwtUtils, "verifyAccessToken").mockReturnValueOnce(payload);

    const req = makeReq("Bearer validtoken");
    const res = makeRes();

    authenticate(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── optionalAuth ─────────────────────────────────────────────────────────────

describe("optionalAuth", () => {
  it("calls next without setting req.user when no Authorization header is present", () => {
    const req = makeReq();
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("calls next without setting req.user when the token is invalid", () => {
    const req = makeReq("Bearer badtoken");
    const res = makeRes();

    jest.spyOn(jwtUtils, "verifyAccessToken").mockImplementationOnce(() => {
      throw new Error("invalid token");
    });

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("calls next and sets req.user when the token is valid", () => {
    const payload = {
      sub: "user-456",
      username: "bob",
      permissions: ["messages.send"],
    };
    jest.spyOn(jwtUtils, "verifyAccessToken").mockReturnValueOnce(payload);

    const req = makeReq("Bearer validtoken");
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
  });

  it("calls next without an error even when the header does not start with 'Bearer '", () => {
    const req = makeReq("Token sometokenvalue");
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
