import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // ignore
    }
  }
  next();
}
