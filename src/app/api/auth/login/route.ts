import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { NextResponse } from "next/server";
import * as db from "~server/db";
import { getSessionCookieOptionsFromRequest } from "~server/_core/cookies";
import { sdk } from "~server/_core/sdk";

const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "1234";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email !== TEST_EMAIL || password !== TEST_PASSWORD) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const openId = `email:${email}`;
  const name = "테스트 사용자";
  let user: Awaited<ReturnType<typeof db.getUserByOpenId>> = undefined;
  try {
    user = await db.getUserByOpenId(openId);
  } catch {
    try {
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(openId);
    } catch {
      // DB 실패 시에도 세션만 발급 (테스트용)
    }
  }

  const token = await sdk.createSessionToken(openId, {
    name: user?.name ?? name,
    expiresInMs: ONE_YEAR_MS,
  });

  const options = getSessionCookieOptionsFromRequest(request);
  const maxAge = Math.floor(ONE_YEAR_MS / 1000);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user?.id ?? 0,
      name: user?.name ?? name,
      email: user?.email ?? email,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    path: options.path ?? "/",
    maxAge,
    httpOnly: options.httpOnly ?? true,
    sameSite: options.sameSite ?? "lax",
    secure: options.secure ?? false,
  });

  return response;
}
