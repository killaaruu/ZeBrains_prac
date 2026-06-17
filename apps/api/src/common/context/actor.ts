import type { Request } from "express";
import type { ActorContext } from "./request-context.types";

export function resolveActor(req: Request): ActorContext {
  // AuthGuard sets req.user for authenticated users.
  const user = (req as Request & { user?: unknown }).user;

  if (!user || typeof user !== "object") {
    return { kind: "system", id: null, label: "system" };
  }

  const u = user as Record<string, unknown>;
  const id = typeof u.id === "string" ? u.id : null;
  const email = typeof u.email === "string" && u.email.length > 0 ? u.email : null;
  const fullName = `${typeof u.firstName === "string" ? u.firstName : ""} ${
    typeof u.lastName === "string" ? u.lastName : ""
  }`.trim();
  const label = email ?? (fullName.length > 0 ? fullName : "user");

  return { kind: "admin", id, label };
}

// Loose IPv4 / IPv6 check — guards against attacker-controlled X-Forwarded-For
// values (arbitrary strings, scripts) being persisted to the audit log.
const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]+)$/;

function sanitizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  return IP_PATTERN.test(value) ? value : null;
}

export function extractIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const value = Array.isArray(xff) ? xff[0] : xff;
    const first = value.split(",")[0]?.trim();
    const sanitized = sanitizeIp(first);
    if (sanitized) return sanitized;
  }
  return sanitizeIp(req.ip);
}
