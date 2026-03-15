import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildTokenHint(token: string): string {
  const visible = token.slice(-6);
  return `••••••${visible}`;
}
