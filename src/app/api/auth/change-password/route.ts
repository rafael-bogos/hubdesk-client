import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, setAuthCookies } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const backendResponse = await fetch(`${process.env.BACKEND_API_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  // A troca de senha invalida o token antigo no backend (tokenVersion++), mas
  // já devolve um par novo — atualizamos os cookies aqui pra manter a sessão
  // ativa em vez de forçar um novo login.
  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  return response;
}
