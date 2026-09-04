import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "hubdesk_access_token";
export const REFRESH_TOKEN_COOKIE = "hubdesk_refresh_token";

// Deve bater com JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN do hubdesk-server.
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    baseCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    baseCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}
