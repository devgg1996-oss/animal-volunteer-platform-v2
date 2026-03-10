import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { NextResponse } from "next/server";
import * as db from "~server/db";
import { getSessionCookieOptionsFromRequest } from "~server/_core/cookies";
import { sdk } from "~server/_core/sdk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "code and state are required" },
      { status: 400 }
    );
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return NextResponse.json(
        { error: "openId missing from user info" },
        { status: 400 }
      );
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptionsFromRequest(request);
    const response = NextResponse.redirect(new URL("/", request.url), 302);
    response.cookies.set(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS / 1000,
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: cookieOptions.secure,
    });

    return response;
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
