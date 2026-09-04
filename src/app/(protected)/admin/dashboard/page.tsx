"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/admin/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/tickets/types";
import { ROLE_LABELS } from "@/lib/roles";

export default function AdminDashboardPage() {
  const query = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiClient.get<DashboardStats>("admin/dashboard"),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Não foi possível carregar o dashboard.</p>;
  }

  const stats = query.data;
  const totalTickets = Object.values(stats.ticketsByStatus).reduce((sum, n) => sum + n, 0);
  const totalUsers = Object.values(stats.usersByRole).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total de chamados" value={totalTickets} />
        <StatTile label="Total de usuários" value={totalUsers} />
        <StatTile label="Aberto" value={stats.ticketsByStatus.OPEN ?? 0} />
        <StatTile label="Urgentes" value={stats.ticketsByPriority.URGENT ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="Chamados por status"
          entries={Object.entries(stats.ticketsByStatus)}
          labels={STATUS_LABELS as Record<string, string>}
        />
        <BreakdownCard
          title="Chamados por prioridade"
          entries={Object.entries(stats.ticketsByPriority)}
          labels={PRIORITY_LABELS as Record<string, string>}
        />
        <BreakdownCard
          title="Usuários por role"
          entries={Object.entries(stats.usersByRole)}
          labels={ROLE_LABELS as Record<string, string>}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chamados abertos por agente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.openTicketsByAgent.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado aberto atribuído.</p>
            )}
            {stats.openTicketsByAgent.map((agent) => (
              <div key={agent.agentId} className="flex items-center justify-between text-sm">
                <span>{agent.agentName}</span>
                <span className="font-medium">{agent.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-4">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  entries,
  labels,
}: {
  title: string;
  entries: [string, number][];
  labels: Record<string, string>;
}) {
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {entries.map(([key, count]) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>{labels[key] ?? key}</span>
              <span className="font-medium">{count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
