import type { Role } from "@/lib/session";

export const ROLES: Role[] = ["ADMIN", "AGENT", "CUSTOMER"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  AGENT: "Atendente",
  CUSTOMER: "Solicitante",
};
