import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { NextResponse } from "next/server";
import * as db from "~server/db";
import { getSessionCookieOptionsFromRequest } from "~server/_core/cookies";
import { sdk } from "~server/_core/sdk";

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

  if (!email || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const openId = `email:${email}`;
  const user = await db.getUserAuthByOpenId(openId);

  // 가입된 이메일이 아닌 경우
  if (!user) {
    return NextResponse.json(
      { error: "가입되지 않은 이메일입니다. 회원가입을 먼저 진행해 주세요." },
      { status: 401 }
    );
  }

  // 비밀번호 검증 (해시 사용)
  const ok = await db.verifyPassword(password, user.password ?? null);
  if (!ok) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const token = await sdk.createSessionToken(openId, {
    name: user.name ?? email,
    expiresInMs: ONE_YEAR_MS,
  });

  const options = getSessionCookieOptionsFromRequest(request);
  const maxAge = Math.floor(ONE_YEAR_MS / 1000);

  const response = NextResponse.json({
    success: true,
    user: {
      id: Number(user.id),
      name: user.name ?? email,
      email: user.email ?? email,
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
