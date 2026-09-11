import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  type AuthTokens,
} from "@/lib/auth-cookies";

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

// O Socket.io é a única coisa que faz o navegador falar direto com o backend
// (fora do proxy /api/backend), então não há cookie httpOnly viajando junto —
// precisa de um access token explícito pro handshake. Essa rota devolve um
// válido, renovando via refresh token quando o da sessão já expirou.
export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const meResponse = accessToken
    ? await fetch(`${process.env.BACKEND_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      })
    : null;

  if (meResponse?.ok) {
    return NextResponse.json({ token: accessToken });
  }

  if (!refreshToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const refreshed = await refreshAccessToken(refreshToken);

  if (!refreshed) {
    const response = NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ token: refreshed.accessToken });
  setAuthCookies(response, refreshed);
  return response;
}
