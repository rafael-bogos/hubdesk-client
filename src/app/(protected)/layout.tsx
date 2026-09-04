import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/session";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  AGENT: "Atendente",
  CUSTOMER: "Solicitante",
};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <span className="text-sm font-medium">Plataforma de Chamados</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {session.name} · {ROLE_LABELS[session.role] ?? session.role}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
