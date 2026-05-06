import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const userPerms = req.user.permissions ?? [];
    const hasAll = permissions.every((p) => userPerms.includes(p));

    if (!hasAll) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const userPerms = req.user.permissions ?? [];
    const hasAny = permissions.some((p) => userPerms.includes(p));

    if (!hasAny) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    next();
  };
}
