import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="flex flex-col gap-2 px-6 py-8">
      <h1 className="text-xl font-semibold">Logado como {session?.name}</h1>
      <p className="text-muted-foreground">
        Papel: {session?.role} · E-mail: {session?.email}
      </p>
    </div>
  );
}
