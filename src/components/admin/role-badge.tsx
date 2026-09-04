import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/roles";

const ROLE_CLASSES: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  AGENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  CUSTOMER: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge className={ROLE_CLASSES[role]}>{ROLE_LABELS[role]}</Badge>;
}
