import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";

export type Role = "ADMIN" | "AGENT" | "CUSTOMER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Fonte de verdade real da sessão: consulta o backend a cada chamada em vez de
// confiar em decodificar o JWT no lado do servidor Next.js.
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) return null;

  const response = await fetch(`${process.env.BACKEND_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  return (await response.json()) as SessionUser;
}
