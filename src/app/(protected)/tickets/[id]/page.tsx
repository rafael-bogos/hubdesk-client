"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Check, Copy, PanelRightOpen, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackToTicketsLink } from "@/components/tickets/back-to-tickets-link";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { SlaBadge } from "@/components/tickets/sla-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { TicketConversation } from "@/components/tickets/ticket-conversation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
import { attachmentDownloadUrl } from "@/lib/tickets/attachments";
import { formatDateTime, shortId, toDatetimeLocalValue } from "@/lib/tickets/format";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  type Ticket,
  type TicketCustomFieldValue,
  type TicketDetail,
  type TicketStatus,
  type UserSummary,
} from "@/lib/tickets/types";

function formatCustomFieldValue(ticketNumber: number, value: TicketCustomFieldValue) {
  if (value.field.type === "ATTACHMENT") {
    if (!value.attachment) return "—";
    return (
      <a
        href={attachmentDownloadUrl(ticketNumber, value.attachment.id)}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {value.attachment.filename}
      </a>
    );
  }

  if (value.field.type === "BOOLEAN") {
    return value.value === "true" ? "Sim" : "Não";
  }

  return value.value || "—";
}

// Texto puro correspondente ao que formatCustomFieldValue renderiza — usado
// no title (tooltip) do valor truncado e no botão de copiar.
function customFieldValueText(value: TicketCustomFieldValue): string {
  if (value.field.type === "ATTACHMENT") return value.attachment?.filename ?? "";
  if (value.field.type === "BOOLEAN") return value.value === "true" ? "Sim" : "Não";
  return value.value ?? "";
}

function CopyValueButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex: contexto não seguro); sem feedback de erro por ora.
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="shrink-0"
      onClick={copy}
      title="Copiar valor"
    >
      {isCopied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span className="sr-only">Copiar valor</span>
    </Button>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const queryClient = useQueryClient();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyTicketNumber = async (ticketNumber: number) => {
    try {
      await navigator.clipboard.writeText(String(ticketNumber));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex: contexto não seguro); sem feedback de erro por ora.
    }
  };

  const query = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => apiClient.get<TicketDetail>(`tickets/${id}`),
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient.get<UserSummary[]>("users/agents"),
    enabled: isAgentOrAdmin,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ticket", id] });

  if (query.isLoading) {
    return <TicketDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6 lg:py-8">
        <BackToTicketsLink />
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl px-4 py-20 text-center ring-1 ring-foreground/10"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <SearchX className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-base font-medium">Chamado não encontrado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              O número #{id} não existe ou você não tem acesso a ele. Confira se o link está
              correto.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            nativeButton={false}
            render={<Link href="/tickets">Ver todos os chamados</Link>}
          />
        </div>
      </div>
    );
  }

  const { ticket, comments, attachments, customFieldValues } = query.data;

  return (
    <div className="flex h-full min-h-0">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-4xl flex-1 flex-col gap-4 px-6 py-6 lg:py-8">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackToTicketsLink />
            <button
              type="button"
              onClick={() => copyTicketNumber(ticket.number)}
              className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              title="Copiar número do chamado"
            >
              #{ticket.number}
              {isCopied ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">Copiar número do chamado</span>
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsDetailsOpen(true)}
          >
            <PanelRightOpen className="size-4" aria-hidden="true" />
            Detalhes
          </Button>
        </div>
        <TicketConversation
          ticket={ticket}
          comments={comments}
          attachments={attachments}
          isAgentOrAdmin={isAgentOrAdmin}
          agents={agentsQuery.data}
          onChange={invalidate}
        />
      </div>

      <aside className="hidden w-80 min-w-0 shrink-0 flex-col overflow-y-auto border-l lg:flex xl:w-96">
        <TicketDetailsPanel
          ticket={ticket}
          customFieldValues={customFieldValues}
          isAgentOrAdmin={isAgentOrAdmin}
          agents={agentsQuery.data}
          onChange={invalidate}
        />
      </aside>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-sm">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Detalhes do chamado</SheetTitle>
          </SheetHeader>
          <TicketDetailsPanel
            ticket={ticket}
            customFieldValues={customFieldValues}
            isAgentOrAdmin={isAgentOrAdmin}
            agents={agentsQuery.data}
            onChange={invalidate}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TicketDetailsPanel({
  ticket,
  customFieldValues,
  isAgentOrAdmin,
  agents,
  onChange,
}: {
  ticket: Ticket;
  customFieldValues: TicketCustomFieldValue[];
  isAgentOrAdmin: boolean;
  agents: UserSummary[] | undefined;
  onChange: () => void;
}) {
  const session = useSession();
  // Não-null enquanto o usuário está escolhendo a data/hora do fechamento
  // automático (só existe entre selecionar "Pendente de fechamento" e
  // confirmar ou cancelar) — guarda o valor cru do <input type="datetime-local">.
  const [closureDraft, setClosureDraft] = useState<string | null>(null);

  const updateStatus = useMutation({
    mutationFn: ({ status, scheduledClosureAt }: { status: TicketStatus; scheduledClosureAt?: string }) =>
      apiClient.patch<Ticket>(`tickets/${ticket.number}/status`, { status, scheduledClosureAt }),
    onSuccess: () => {
      setClosureDraft(null);
      onChange();
    },
  });

  const assign = useMutation({
    mutationFn: (assigneeIds: string[]) =>
      apiClient.patch<Ticket>(`tickets/${ticket.number}/assign`, { assigneeIds }),
    onSuccess: onChange,
  });

  return (
    <div className="flex min-w-0 flex-col gap-5 p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-xs text-muted-foreground">Chamado #{ticket.number}</span>
        <h2 className="font-heading text-base leading-snug font-medium break-words">{ticket.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.sla && ticket.status !== "RESOLVED" && <SlaBadge sla={ticket.sla} />}
        </div>
      </div>

      <dl className="flex min-w-0 flex-col gap-3 text-sm">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Solicitante</dt>
          <dd className="break-words">{ticket.requester?.name ?? shortId(ticket.requesterId)}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Aberto em</dt>
          <dd className="break-words">{formatDateTime(ticket.createdAt)}</dd>
        </div>
        {ticket.sla && ticket.status !== "RESOLVED" && (
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Prazo de SLA</dt>
            <dd className="break-words">
              {formatDateTime(ticket.sla.dueAt)}
              {ticket.sla.pausedAt && " · pausado (aguardando solicitante)"}
            </dd>
          </div>
        )}
        {ticket.category && (
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Categoria</dt>
            <dd className="break-words">{ticket.category.name}</dd>
          </div>
        )}
        {customFieldValues.map((value) => {
          const text = customFieldValueText(value);
          return (
            <div key={value.id} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground break-words">{value.field.label}</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 flex-1 truncate" title={text || undefined}>
                  {formatCustomFieldValue(ticket.number, value)}
                </span>
                {text && value.field.type !== "ATTACHMENT" && <CopyValueButton value={text} />}
              </dd>
            </div>
          );
        })}
      </dl>

      {isAgentOrAdmin && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={closureDraft !== null ? "PENDING_CLOSURE" : ticket.status}
                onValueChange={(value) => {
                  const status = value as TicketStatus;
                  if (status === "PENDING_CLOSURE") {
                    // Data futura padrão: daqui a 24h, só pra já vir com algo
                    // preenchido — o usuário ajusta antes de confirmar.
                    setClosureDraft(toDatetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
                    return;
                  }
                  setClosureDraft(null);
                  updateStatus.mutate({ status });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => (value ? STATUS_LABELS[value as TicketStatus] : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {closureDraft !== null ? (
                <div className="flex flex-col gap-2 rounded-lg border p-2.5">
                  <Label htmlFor="closure-datetime" className="text-xs text-muted-foreground">
                    Fecha automaticamente em
                  </Label>
                  <Input
                    id="closure-datetime"
                    type="datetime-local"
                    value={closureDraft}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setClosureDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={!closureDraft || updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({
                          status: "PENDING_CLOSURE",
                          scheduledClosureAt: new Date(closureDraft).toISOString(),
                        })
                      }
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => setClosureDraft(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                ticket.status === "PENDING_CLOSURE" &&
                ticket.scheduledClosureAt && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Fecha em {formatDateTime(ticket.scheduledClosureAt)}</span>
                    <button
                      type="button"
                      className="cursor-pointer font-medium text-foreground hover:underline"
                      onClick={() => setClosureDraft(toDatetimeLocalValue(new Date(ticket.scheduledClosureAt!)))}
                    >
                      Alterar
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignees-select">Responsáveis</Label>
              <Select
                multiple
                value={ticket.assigneeIds}
                onValueChange={(value) => assign.mutate(value)}
              >
                <SelectTrigger id="assignees-select" className="w-full">
                  <SelectValue placeholder="Ninguém atribuído">
                    {(value: string[]) =>
                      value.length > 0
                        ? value
                            .map((id) => agents?.find((agent) => agent.id === id)?.name ?? shortId(id))
                            .join(", ")
                        : "Ninguém atribuído"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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

              {ticket.assigneeIds.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {ticket.assigneeIds.map((assigneeId) => {
                    const assignedAgent = agents?.find((agent) => agent.id === assigneeId);
                    const name = assignedAgent?.name ?? shortId(assigneeId);
                    return (
                      <li
                        key={assigneeId}
                        className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
                      >
                        <UserAvatar name={name} imageUrl={assignedAgent?.avatarUrl} className="size-6 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0"
                          disabled={assign.isPending}
                          onClick={() =>
                            assign.mutate(ticket.assigneeIds.filter((id) => id !== assigneeId))
                          }
                          aria-label={`Remover ${name} do chamado`}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Button
                type="button"
                variant="outline"
                className="mt-1"
                disabled={assign.isPending || ticket.assigneeIds.includes(session.id)}
                onClick={() => assign.mutate([...ticket.assigneeIds, session.id])}
              >
                Atribuir a mim
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Espelha o layout final (conversa + painel lateral, mesma altura fixa) para
// não haver salto de layout quando os dados chegam — só o conteúdo troca.
function TicketDetailSkeleton() {
  return (
    <div className="flex h-full min-h-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando chamado…</span>
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-4xl flex-1 flex-col gap-4 px-6 py-6 lg:py-8">
        <div className="shrink-0">
          <BackToTicketsLink />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl p-4 ring-1 ring-foreground/10">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("flex gap-2", i === 1 && "flex-row-reverse")}>
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className={cn("h-10 rounded-2xl", i === 1 ? "w-40" : "w-56")} />
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 border-t pt-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="size-9 shrink-0 rounded-lg" />
          </div>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col gap-5 border-l p-5 lg:flex xl:w-96">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </aside>
    </div>
  );
}
