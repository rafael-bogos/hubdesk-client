"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { formatDateTime } from "@/lib/tickets/format";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type CategorySummary,
  type ListTicketsResult,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets/types";

const PAGE_SIZE = 20;
const ALL = "ALL";

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? ALL;
  const priority = searchParams.get("priority") ?? ALL;
  const categoryId = searchParams.get("categoryId") ?? ALL;
  const page = Number(searchParams.get("page") ?? "1");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategorySummary[]>("categories"),
  });

  const query = useQuery({
    queryKey: ["tickets", { status, priority, categoryId, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== ALL) params.set("status", status);
      if (priority !== ALL) params.set("priority", priority);
      if (categoryId !== ALL) params.set("categoryId", categoryId);
      return apiClient.get<ListTicketsResult>(`tickets?${params.toString()}`);
    },
  });

  function updateFilter(key: "status" | "priority" | "categoryId", value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/tickets?${params.toString()}`);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    router.push(`/tickets?${params.toString()}`);
  }

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold">Chamados</h1>
          {query.data && (
            <Badge variant="secondary" className="rounded-full">
              {query.data.total}
            </Badge>
          )}
        </div>
        <Button nativeButton={false} render={<Link href="/tickets/new">Novo chamado</Link>} />
      </div>

      <div className="mb-4 flex gap-3">
        <Select value={status} onValueChange={(value) => updateFilter("status", value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status">
              {(value: string | null) =>
                !value || value === ALL ? "Todos os status" : STATUS_LABELS[value as TicketStatus]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {TICKET_STATUSES.map((s: TicketStatus) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(value) => updateFilter("priority", value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Prioridade">
              {(value: string | null) =>
                !value || value === ALL
                  ? "Todas as prioridades"
                  : PRIORITY_LABELS[value as TicketPriority]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as prioridades</SelectItem>
            {TICKET_PRIORITIES.map((p: TicketPriority) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={(value) => updateFilter("categoryId", value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria">
              {(value: string | null) => {
                if (!value || value === ALL) return "Todas as categorias";
                return categoriesQuery.data?.find((c) => c.id === value)?.name ?? null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {(categoriesQuery.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os chamados.</p>
      )}

      {query.data && (
        <>
          <div className="overflow-x-auto rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Inbox className="size-8" />
                        <p className="text-sm">Nenhum chamado encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {query.data.items.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.requester?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.assignee?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(ticket.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {query.data.page} de {totalPages} · {query.data.total} chamado(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
