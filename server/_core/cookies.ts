import { COOKIE_NAME } from "@shared/const";

export type SessionCookieOptions = {
  domain?: string;
  httpOnly?: boolean;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
};

function isSecureRequestFromUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSessionCookieOptionsFromRequest(
  request: Request
): SessionCookieOptions {
  const secure = isSecureRequestFromUrl(request.url);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

/** Build Set-Cookie header value to set the session cookie. */
export function buildSetSessionCookieHeader(
  token: string,
  options: SessionCookieOptions,
  maxAgeSeconds: number
): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=" + (options.path ?? "/"),
    "Max-Age=" + maxAgeSeconds,
    "HttpOnly",
    "SameSite=" + (options.sameSite ?? "lax"),
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Build Set-Cookie header value to clear the session cookie. */
export function buildClearSessionCookieHeader(
  options: Pick<SessionCookieOptions, "path" | "sameSite" | "secure">
): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=" + (options.path ?? "/"),
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=" + (options.sameSite ?? "none"),
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}
