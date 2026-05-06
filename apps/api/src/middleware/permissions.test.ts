import { Response, NextFunction } from "express";
import { requirePermission, requireAnyPermission } from "./permissions";
import { AuthRequest } from "./auth";

function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function makeReqWithUser(permissions: string[]): AuthRequest {
  return {
    user: { sub: "user-1", username: "alice", permissions },
  } as AuthRequest;
}

function makeReqNoUser(): AuthRequest {
  return {} as AuthRequest;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── requirePermission ────────────────────────────────────────────────────────

describe("requirePermission", () => {
  it("returns 401 when there is no authenticated user", () => {
    const req = makeReqNoUser();
    const res = makeRes();

    requirePermission("forum.post")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user lacks the required permission", () => {
    const req = makeReqWithUser(["messages.send"]);
    const res = makeRes();

    requirePermission("forum.post")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when the user has the required permission", () => {
    const req = makeReqWithUser(["forum.post"]);
    const res = makeRes();

    requirePermission("forum.post")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next when the user has all of multiple required permissions", () => {
    const req = makeReqWithUser(["forum.post", "forum.moderate", "admin.panel"]);
    const res = makeRes();

    requirePermission("forum.post", "forum.moderate")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 403 when the user is missing one of multiple required permissions", () => {
    const req = makeReqWithUser(["forum.post"]);
    const res = makeRes();

    requirePermission("forum.post", "forum.moderate")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("handles a user with an empty permissions array", () => {
    const req = makeReqWithUser([]);
    const res = makeRes();

    requirePermission("forum.post")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireAnyPermission ─────────────────────────────────────────────────────

describe("requireAnyPermission", () => {
  it("returns 401 when there is no authenticated user", () => {
    const req = makeReqNoUser();
    const res = makeRes();

    requireAnyPermission("forum.post")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has none of the required permissions", () => {
    const req = makeReqWithUser(["messages.send"]);
    const res = makeRes();

    requireAnyPermission("forum.post", "forum.moderate")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when the user has at least one of the required permissions", () => {
    const req = makeReqWithUser(["forum.post"]);
    const res = makeRes();

    requireAnyPermission("forum.post", "forum.moderate")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next when the user has all of the listed permissions", () => {
    const req = makeReqWithUser(["forum.post", "forum.moderate"]);
    const res = makeRes();

    requireAnyPermission("forum.post", "forum.moderate")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("handles a user with an empty permissions array", () => {
    const req = makeReqWithUser([]);
    const res = makeRes();

    requireAnyPermission("forum.post")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
