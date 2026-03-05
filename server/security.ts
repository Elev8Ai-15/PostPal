import { TRPCError } from "@trpc/server";
import type { Request, Response, NextFunction } from "express";

/**
 * Security utilities for SaaS application
 * Implements OWASP security best practices
 */

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter middleware
 * Prevents brute force and DoS attacks
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientIdentifier(req);
    const now = Date.now();
    const record = rateLimitStore.get(clientId);

    if (!record || now > record.resetTime) {
      // Create new record
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      next();
      return;
    }

    if (record.count >= config.maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        message: "Please try again later",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Use combination of IP and user agent for better identification
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  return `${ip}-${hashString(userAgent)}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitize string input - remove potential XSS vectors
   */
  string(input: string): string {
    if (typeof input !== "string") return "";
    return input
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .replace(/data:/gi, "") // Remove data: protocol
      .trim();
  },

  /**
   * Sanitize HTML content - escape special characters
   */
  html(input: string): string {
    if (typeof input !== "string") return "";
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  },

  /**
   * Sanitize SQL-like input - prevent SQL injection
   */
  sql(input: string): string {
    if (typeof input !== "string") return "";
    return input
      .replace(/['";\\]/g, "") // Remove quotes and backslashes
      .replace(/--/g, "") // Remove SQL comments
      .replace(/\/\*/g, "") // Remove block comments
      .replace(/\*\//g, "")
      .trim();
  },

  /**
   * Sanitize email
   */
  email(input: string): string {
    if (typeof input !== "string") return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = input.toLowerCase().trim();
    return emailRegex.test(cleaned) ? cleaned : "";
  },

  /**
   * Sanitize URL
   */
  url(input: string): string {
    if (typeof input !== "string") return "";
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }
      return url.toString();
    } catch {
      return "";
    }
  },
};

/**
 * Input validation utilities
 */
export const validate = {
  /**
   * Validate string length
   */
  length(input: string, min: number, max: number): boolean {
    return typeof input === "string" && input.length >= min && input.length <= max;
  },

  /**
   * Validate email format
   */
  email(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof input === "string" && emailRegex.test(input);
  },

  /**
   * Validate URL format
   */
  url(input: string): boolean {
    try {
      const url = new URL(input);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validate alphanumeric string
   */
  alphanumeric(input: string): boolean {
    return typeof input === "string" && /^[a-zA-Z0-9]+$/.test(input);
  },

  /**
   * Validate UUID format
   */
  uuid(input: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof input === "string" && uuidRegex.test(input);
  },

  /**
   * Validate password strength
   */
  password(input: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (input.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(input)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(input)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(input)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(input)) {
      errors.push("Password must contain at least one special character");
    }

    return { valid: errors.length === 0, errors };
  },
};

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React
      "style-src 'self' 'unsafe-inline'", // Required for inline styles
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // HTTP Strict Transport Security
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy, but still useful)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );

  next();
}

/**
 * CSRF token generation and validation
 */
export const csrf = {
  /**
   * Generate CSRF token
   */
  generateToken(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback using Node.js crypto module
      try {
        const nodeCrypto = require("crypto");
        const bytes = nodeCrypto.randomBytes(32);
        array.set(bytes);
      } catch {
        throw new Error("No cryptographically secure random number generator available");
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  },

  /**
   * Validate CSRF token
   */
  validateToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    if (token.length !== storedToken.length) return false;
    
    // Constant-time comparison to prevent timing attacks
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    return result === 0;
  },
};

/**
 * Audit logging for security events
 */
export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success: boolean;
}

const auditLogs: AuditLogEntry[] = [];

export const auditLog = {
  /**
   * Log a security event
   */
  log(entry: Omit<AuditLogEntry, "timestamp">): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    
    auditLogs.push(logEntry);
    
    // Keep only last 10000 entries in memory
    if (auditLogs.length > 10000) {
      auditLogs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[AUDIT]", JSON.stringify(logEntry));
    }
  },

  /**
   * Get recent audit logs
   */
  getRecent(count: number = 100): AuditLogEntry[] {
    return auditLogs.slice(-count);
  },

  /**
   * Get logs for a specific user
   */
  getByUser(userId: string, count: number = 100): AuditLogEntry[] {
    return auditLogs
      .filter((log) => log.userId === userId)
      .slice(-count);
  },
};

/**
 * Session security utilities
 */
export const session = {
  /**
   * Generate secure session ID
   */
  generateId(): string {
    return csrf.generateToken();
  },

  /**
   * Validate session age
   */
  isExpired(createdAt: Date, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    return Date.now() - createdAt.getTime() > maxAgeMs;
  },

  /**
   * Check if session needs refresh
   */
  needsRefresh(lastActivity: Date, refreshThresholdMs: number = 15 * 60 * 1000): boolean {
    return Date.now() - lastActivity.getTime() > refreshThresholdMs;
  },
};

/**
 * Data encryption utilities (using built-in crypto)
 */
export const encryption = {
  /**
   * Hash sensitive data (one-way)
   */
  async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    
    // Fallback simple hash
    return hashString(data);
  },

  /**
   * Mask sensitive data for display
   */
  mask(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return "*".repeat(data.length);
    }
    return "*".repeat(data.length - visibleChars) + data.slice(-visibleChars);
  },

  /**
   * Mask email for display
   */
  maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return this.mask(email);
    
    const maskedLocal = local.length > 2
      ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
      : "*".repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  },
};

/**
 * tRPC middleware for security
 */
export function createSecurityMiddleware() {
  return async ({ ctx, next, path }: { ctx: any; next: () => Promise<any>; path: string }) => {
    const startTime = Date.now();
    
    try {
      const result = await next();
      
      // Log successful API calls
      auditLog.log({
        userId: ctx.user?.id,
        action: "api_call",
        resource: path,
        success: true,
        details: { duration: Date.now() - startTime },
      });
      
      return result;
    } catch (error) {
      // Log failed API calls
      auditLog.log({
        userId: ctx.user?.id,
        action: "api_call",
        resource: path,
        success: false,
        details: {
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      
      throw error;
    }
  };
}
