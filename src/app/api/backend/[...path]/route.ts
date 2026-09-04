import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  type AuthTokens,
} from "@/lib/auth-cookies";

type RouteContext = { params: Promise<{ path: string[] }> };

async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  const response = await fetch(`${process.env.BACKEND_API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetUrl = `${process.env.BACKEND_API_URL}/${path.join("/")}${request.nextUrl.search}`;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const forward = (token: string | undefined) => {
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(targetUrl, { method: request.method, headers, body: bodyBuffer });
  };

  let backendResponse = await forward(accessToken);
  let refreshedTokens: AuthTokens | null = null;

  if (backendResponse.status === 401 && refreshToken) {
    refreshedTokens = await refreshAccessToken(refreshToken);
    if (refreshedTokens) {
      accessToken = refreshedTokens.accessToken;
      backendResponse = await forward(accessToken);
    }
  }

  const responseBody = await backendResponse.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshedTokens) {
    setAuthCookies(response, refreshedTokens);
  } else if (backendResponse.status === 401) {
    clearAuthCookies(response);
  }

  return response;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
