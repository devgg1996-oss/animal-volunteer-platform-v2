import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { AppUser } from "@shared/types";
import { sdk } from "./sdk";
import {
  getSessionCookieOptionsFromRequest,
  buildClearSessionCookieHeader,
} from "./cookies";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: AppUser | null;
  clearSessionCookie: () => void;
};

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  const { req, resHeaders } = opts;
  let user: AppUser | null = null;

  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    user = null;
  }

  function clearSessionCookie() {
    const options = getSessionCookieOptionsFromRequest(req);
    const headerValue = buildClearSessionCookieHeader(options);
    resHeaders.append("Set-Cookie", headerValue);
  }

  return {
    req,
    resHeaders,
    user,
    clearSessionCookie,
  };
}
