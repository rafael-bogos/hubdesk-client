"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/session";

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

// Só é usado dentro do grupo (protected), onde a sessão já foi garantida no layout server-side.
export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) {
    throw new Error("useSession deve ser usado dentro do layout protegido");
  }
  return user;
}
