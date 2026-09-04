import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/session";
import { SessionProvider } from "@/lib/session-context";

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
    <SessionProvider user={session}>
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b bg-background px-6 py-3">
          <div className="flex items-center gap-6">
            <Logo size={24} />
            <Link href="/tickets" className="text-sm text-muted-foreground hover:text-foreground">
              Chamados
            </Link>
            {session.role === "ADMIN" && (
              <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {session.name} · {ROLE_LABELS[session.role] ?? session.role}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
