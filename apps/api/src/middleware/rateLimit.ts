import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: "Too many uploads, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
