"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RotateCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusDot } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  ACTIVE_TICKET_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type CategorySummary,
  type ListTicketsResult,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
  type UserSummary,
} from "@/lib/tickets/types";

const PAGE_SIZE = 20;
const ALL = "ALL";
const UNASSIGNED = "UNASSIGNED";

type TicketView = "active" | "resolved";

type FilterKey = "status" | "priority" | "categoryId" | "assigneeId" | "search";

interface BulkUpdatePayload {
  ticketNumbers: number[];
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeIds?: string[];
}

interface BulkUpdateResult {
  updated: Ticket[];
  failed: { ticketNumber: number; reason: string }[];
}

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useSession();
  const isAdmin = session.role === "ADMIN";
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const view: TicketView = searchParams.get("view") === "resolved" ? "resolved" : "active";
  const status = searchParams.get("status") ?? ALL;
  const priority = searchParams.get("priority") ?? ALL;
  const categoryId = searchParams.get("categoryId") ?? ALL;
  const assigneeId = searchParams.get("assigneeId") ?? ALL;
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const hasActiveFilters =
    status !== ALL || priority !== ALL || categoryId !== ALL || assigneeId !== ALL || search !== "";

  // Campo de busca fica com estado próprio e só reflete na URL (e dispara a
  // busca) depois de parar de digitar — senão cada tecla vira uma navegação.
  const [searchInput, setSearchInput] = useState(search);
  // Quando a URL muda por fora (ex: botão "Limpar"), reflete no campo — ajuste
  // feito durante o render (padrão recomendado pelo React), não num effect.
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchInput(search);
  }

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;

    const timeout = setTimeout(() => {
      updateFilter("search", trimmed || null);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve rodar quando o texto digitado muda
  }, [searchInput]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategorySummary[]>("categories"),
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient.get<UserSummary[]>("users/agents"),
    enabled: isAgentOrAdmin,
  });

  const query = useQuery({
    queryKey: ["tickets", { view, status, priority, categoryId, assigneeId, search, page }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        resolved: String(view === "resolved"),
      });
      if (status !== ALL) params.set("status", status);
      if (priority !== ALL) params.set("priority", priority);
      if (categoryId !== ALL) params.set("categoryId", categoryId);
      if (assigneeId !== ALL) params.set("assigneeId", assigneeId);
      if (search) params.set("search", search);
      return apiClient.get<ListTicketsResult>(`tickets?${params.toString()}`);
    },
  });

  // Seleção pra edição em lote: guarda o ticket inteiro (não só o id) porque
  // o endpoint de bulk precisa do `number`, e o item pode não estar mais em
  // `query.data` depois de mudar de página/filtro.
  const [selected, setSelected] = useState<Map<string, Ticket>>(new Map());
  const selectionScopeKey = JSON.stringify({ view, status, priority, categoryId, assigneeId, search, page });
  const [syncedSelectionScopeKey, setSyncedSelectionScopeKey] = useState(selectionScopeKey);
  if (selectionScopeKey !== syncedSelectionScopeKey) {
    setSyncedSelectionScopeKey(selectionScopeKey);
    setSelected(new Map());
  }

  const [bulkStatus, setBulkStatus] = useState(ALL);
  const [bulkPriority, setBulkPriority] = useState(ALL);
  const [bulkAssigneeId, setBulkAssigneeId] = useState(ALL);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: BulkUpdatePayload) => apiClient.patch<BulkUpdateResult>("tickets/bulk", payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelected(new Map());
      setBulkStatus(ALL);
      setBulkPriority(ALL);
      setBulkAssigneeId(ALL);
      setBulkFeedback(
        result.failed.length > 0
          ? `${result.updated.length} atualizado(s), ${result.failed.length} não puderam ser atualizados.`
          : null,
      );
    },
  });

  function toggleSelected(ticket: Ticket, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(ticket.id, ticket);
      else next.delete(ticket.id);
      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!query.data) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const ticket of query.data.items) {
        if (checked) next.set(ticket.id, ticket);
        else next.delete(ticket.id);
      }
      return next;
    });
  }

  function applyBulkUpdate() {
    if (selected.size === 0) return;
    const payload: BulkUpdatePayload = { ticketNumbers: [...selected.values()].map((t) => t.number) };
    if (bulkStatus !== ALL) payload.status = bulkStatus as TicketStatus;
    if (bulkPriority !== ALL) payload.priority = bulkPriority as TicketPriority;
    if (bulkAssigneeId !== ALL) payload.assigneeIds = bulkAssigneeId === UNASSIGNED ? [] : [bulkAssigneeId];
    if (!payload.status && !payload.priority && !payload.assigneeIds) return;
    setBulkFeedback(null);
    bulkUpdateMutation.mutate(payload);
  }

  const allOnPageSelected =
    !!query.data && query.data.items.length > 0 && query.data.items.every((t) => selected.has(t.id));
  const hasBulkChange = bulkStatus !== ALL || bulkPriority !== ALL || bulkAssigneeId !== ALL;

  function updateFilter(key: FilterKey, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/tickets?${params.toString()}`);
  }

  // Resolvido tem aba própria — trocar de aba zera o filtro de status (a
  // "Resolvidos" nem mostra esse filtro) e a página, mas mantém prioridade,
  // categoria, responsável e busca.
  function switchView(nextView: TicketView) {
    const params = new URLSearchParams(searchParams);
    if (nextView === "active") params.delete("view");
    else params.set("view", nextView);
    params.delete("status");
    params.delete("page");
    router.push(`/tickets?${params.toString()}`);
  }

  function clearFilters() {
    router.push(view === "resolved" ? "/tickets?view=resolved" : "/tickets");
    setIsFiltersOpen(false);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    router.push(`/tickets?${params.toString()}`);
  }

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col px-6 py-8">
      <div className="mb-4 flex shrink-0 items-center justify-between">
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

      <div className="mb-6 flex shrink-0 gap-1 border-b">
        <button
          type="button"
          onClick={() => switchView("active")}
          className={cn(
            "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
            view === "active"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Ativos
        </button>
        <button
          type="button"
          onClick={() => switchView("resolved")}
          className={cn(
            "-mb-px ml-4 border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
            view === "resolved"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Resolvidos
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isAgentOrAdmin && selected.size > 0 ? (
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selected.size} selecionado(s)</span>

              <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value ?? ALL)}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Status">
                    {(value: string | null) =>
                      !value || value === ALL ? "Alterar status" : STATUS_LABELS[value as TicketStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alterar status</SelectItem>
                  {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bulkPriority} onValueChange={(value) => setBulkPriority(value ?? ALL)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Prioridade">
                    {(value: string | null) =>
                      !value || value === ALL ? "Alterar prioridade" : PRIORITY_LABELS[value as TicketPriority]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alterar prioridade</SelectItem>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bulkAssigneeId} onValueChange={(value) => setBulkAssigneeId(value ?? ALL)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Responsável" className="min-w-0">
                    {(value: string | null) => {
                      if (!value || value === ALL) return "Alterar responsável";
                      if (value === UNASSIGNED) return "Ninguém atribuído";
                      return (
                        <span className="min-w-0 truncate">
                          {agentsQuery.data?.find((a) => a.id === value)?.name ?? null}
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alterar responsável</SelectItem>
                  <SelectItem value={UNASSIGNED}>Ninguém atribuído</SelectItem>
                  {(agentsQuery.data ?? []).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="h-8"
                disabled={!hasBulkChange || bulkUpdateMutation.isPending}
                onClick={applyBulkUpdate}
              >
                {bulkUpdateMutation.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                Aplicar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setSelected(new Map())}
                disabled={bulkUpdateMutation.isPending}
              >
                Limpar seleção
              </Button>

              {bulkFeedback && <span className="text-xs text-muted-foreground">{bulkFeedback}</span>}
            </div>
          ) : (
            bulkFeedback && (
              <div className="mb-4 flex shrink-0 items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>{bulkFeedback}</span>
                <Button variant="ghost" size="sm" className="h-6" onClick={() => setBulkFeedback(null)}>
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            )
          )}

          <div className="relative mb-4 shrink-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Buscar por título ou número (#1234)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 pl-8"
              aria-label="Buscar chamados"
            />
          </div>

          {query.isLoading && (
            <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border bg-background">
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-md border bg-background py-16 text-center">
              <p className="text-sm text-destructive">Não foi possível carregar os chamados.</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          )}

          {query.data && (
            <>
              <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border bg-background">
                {isAgentOrAdmin && query.data.items.length > 0 && (
                  <div className="flex items-center gap-3 bg-muted/30 px-4 py-2">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(checked) => toggleSelectAllOnPage(checked === true)}
                      aria-label="Selecionar todos os chamados desta página"
                    />
                    <span className="text-xs text-muted-foreground">
                      Selecionar todos desta página
                    </span>
                  </div>
                )}
                {query.data.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
                    <Inbox className="size-9" aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        {view === "resolved"
                          ? "Nenhum chamado resolvido"
                          : "Nenhum chamado encontrado"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "Tente ajustar ou limpar os filtros."
                          : view === "resolved"
                            ? "Chamados resolvidos aparecem aqui."
                            : "Quando um chamado for aberto, ele aparece aqui."}
                      </p>
                    </div>
                    {!hasActiveFilters && view === "active" && (
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
                    <div
                      key={ticket.id}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      {isAgentOrAdmin && (
                        <Checkbox
                          className="mt-1.5"
                          checked={selected.has(ticket.id)}
                          onCheckedChange={(checked) => toggleSelected(ticket, checked === true)}
                          aria-label={`Selecionar chamado #${ticket.number}`}
                        />
                      )}
                      <Link
                        href={`/tickets/${ticket.number}`}
                        className="flex min-w-0 flex-1 items-start gap-3"
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
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex shrink-0 items-center justify-between text-sm text-muted-foreground">
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

        <aside className="hidden w-64 shrink-0 overflow-y-auto lg:block">
          <TicketFilters
            view={view}
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
              view={view}
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
  view,
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
  view: TicketView;
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

      {view === "active" && (
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => onChange("status", value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status">
                {(value: string | null) =>
                  !value || value === ALL
                    ? "Todos os status"
                    : STATUS_LABELS[value as TicketStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {ACTIVE_TICKET_STATUSES.map((s: TicketStatus) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
