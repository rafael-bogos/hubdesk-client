import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Gate real: getSession() consulta o backend a cada chamada (fonte de
// verdade), não confia em decodificar o cookie. Um AGENT/CUSTOMER que tente
// acessar /admin/* é redirecionado antes de qualquer conteúdo renderizar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/tickets");
  }

  return <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>;
}
