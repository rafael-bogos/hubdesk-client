import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

const NAV = [
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/categories", label: "Categorias" },
  { href: "/admin/dashboard", label: "Dashboard" },
];

// Gate real: getSession() consulta o backend a cada chamada (fonte de
// verdade), não confia em decodificar o cookie. Um AGENT/CUSTOMER que tente
// acessar /admin/* é redirecionado antes de qualquer conteúdo renderizar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/tickets");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-1 border-b pb-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
