"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RotateCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusDot } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
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
  type UserSummary,
} from "@/lib/tickets/types";

const PAGE_SIZE = 20;
const ALL = "ALL";

type FilterKey = "status" | "priority" | "categoryId" | "assigneeId";

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const isAdmin = session.role === "ADMIN";
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const status = searchParams.get("status") ?? ALL;
  const priority = searchParams.get("priority") ?? ALL;
  const categoryId = searchParams.get("categoryId") ?? ALL;
  const assigneeId = searchParams.get("assigneeId") ?? ALL;
  const page = Number(searchParams.get("page") ?? "1");
  const hasActiveFilters =
    status !== ALL || priority !== ALL || categoryId !== ALL || assigneeId !== ALL;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategorySummary[]>("categories"),
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient.get<UserSummary[]>("users/agents"),
    enabled: isAdmin,
  });

  const query = useQuery({
    queryKey: ["tickets", { status, priority, categoryId, assigneeId, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status !== ALL) params.set("status", status);
      if (priority !== ALL) params.set("priority", priority);
      if (categoryId !== ALL) params.set("categoryId", categoryId);
      if (assigneeId !== ALL) params.set("assigneeId", assigneeId);
      return apiClient.get<ListTicketsResult>(`tickets?${params.toString()}`);
    },
  });

  function updateFilter(key: FilterKey, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/tickets?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/tickets");
    setIsFiltersOpen(false);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    router.push(`/tickets?${params.toString()}`);
  }

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold">Chamados</h1>
          {query.data && (
            <Badge variant="secondary" className="rounded-full">
              {query.data.total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="lg:hidden"
            onClick={() => setIsFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="rounded-full px-1.5">
                {[status, priority, categoryId, assigneeId].filter((f) => f !== ALL).length}
              </Badge>
            )}
          </Button>
          <Button nativeButton={false} render={<Link href="/tickets/new">Novo chamado</Link>} />
        </div>
      </div>

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          {query.isLoading && (
            <div className="divide-y rounded-md border bg-background">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-72" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.isError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-background py-16 text-center">
              <p className="text-sm text-destructive">Não foi possível carregar os chamados.</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          )}

          {query.data && (
            <>
              <div className="divide-y rounded-md border bg-background">
                {query.data.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
                    <Inbox className="size-9" aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        Nenhum chamado encontrado
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "Tente ajustar ou limpar os filtros."
                          : "Quando um chamado for aberto, ele aparece aqui."}
                      </p>
                    </div>
                    {!hasActiveFilters && (
                      <Button
                        size="sm"
                        className="mt-1"
                        nativeButton={false}
                        render={<Link href="/tickets/new">Criar o primeiro chamado</Link>}
                      />
                    )}
                  </div>
                )}
                {query.data.items.map((ticket) => {
                  const assigneeText = ticket.assignees?.length
                    ? ticket.assignees[0].name +
                      (ticket.assignees.length > 1 ? ` +${ticket.assignees.length - 1}` : "")
                    : "Ninguém atribuído";

                  return (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.number}`}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <StatusDot status={ticket.status} className="mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate">
                            <span className="text-muted-foreground">#{ticket.number}</span>{" "}
                            <span className="font-medium">{ticket.title}</span>
                          </span>
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">
                            {ticket.requester?.name ?? "Desconhecido"}
                          </span>
                          <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{assigneeText}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">{formatDateTime(ticket.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
                    <ChevronLeft className="size-3.5" aria-hidden="true" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    Próxima
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <aside className="hidden w-64 shrink-0 lg:sticky lg:top-8 lg:block">
          <TicketFilters
            status={status}
            priority={priority}
            categoryId={categoryId}
            assigneeId={assigneeId}
            isAdmin={isAdmin}
            categories={categoriesQuery.data}
            agents={agentsQuery.data}
            hasActiveFilters={hasActiveFilters}
            onChange={updateFilter}
            onClear={clearFilters}
          />
        </aside>
      </div>

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <TicketFilters
              status={status}
              priority={priority}
              categoryId={categoryId}
              assigneeId={assigneeId}
              isAdmin={isAdmin}
              categories={categoriesQuery.data}
              agents={agentsQuery.data}
              hasActiveFilters={hasActiveFilters}
              showHeading={false}
              onChange={(key, value) => {
                updateFilter(key, value);
              }}
              onClear={clearFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TicketFilters({
  status,
  priority,
  categoryId,
  assigneeId,
  isAdmin,
  categories,
  agents,
  hasActiveFilters,
  showHeading = true,
  onChange,
  onClear,
}: {
  status: string;
  priority: string;
  categoryId: string;
  assigneeId: string;
  isAdmin: boolean;
  categories: CategorySummary[] | undefined;
  agents: UserSummary[] | undefined;
  hasActiveFilters: boolean;
  showHeading?: boolean;
  onChange: (key: FilterKey, value: string | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {showHeading ? (
          <h2 className="text-sm font-medium text-foreground">Filtros</h2>
        ) : (
          <span />
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5" aria-hidden="true" />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => onChange("status", value)}>
          <SelectTrigger className="w-full">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Prioridade</Label>
        <Select value={priority} onValueChange={(value) => onChange("priority", value)}>
          <SelectTrigger className="w-full">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Categoria</Label>
        <Select value={categoryId} onValueChange={(value) => onChange("categoryId", value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoria">
              {(value: string | null) => {
                if (!value || value === ALL) return "Todas as categorias";
                return categories?.find((c) => c.id === value)?.name ?? null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categories?.length === 0 ? (
              <div className="px-1.5 py-1 text-sm text-muted-foreground">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              (categories ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <Label>Responsável</Label>
          <Select value={assigneeId} onValueChange={(value) => onChange("assigneeId", value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Responsável" className="min-w-0">
                {(value: string | null) => {
                  const text =
                    !value || value === ALL
                      ? "Todos os responsáveis"
                      : (agents?.find((a) => a.id === value)?.name ?? null);
                  return text && <span className="min-w-0 truncate">{text}</span>;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
              {agents?.length === 0 ? (
                <div className="px-1.5 py-1 text-sm text-muted-foreground">
                  Nenhum agente disponível.
                </div>
              ) : (
                (agents ?? []).map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
