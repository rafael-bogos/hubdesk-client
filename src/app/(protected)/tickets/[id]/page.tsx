"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { PanelRightOpen, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackToTicketsLink } from "@/components/tickets/back-to-tickets-link";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { TicketConversation } from "@/components/tickets/ticket-conversation";
import { Button } from "@/components/ui/button";
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
import { formatDateTime, shortId } from "@/lib/tickets/format";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  type Ticket,
  type TicketDetail,
  type TicketStatus,
  type UserSummary,
} from "@/lib/tickets/types";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const queryClient = useQueryClient();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
      <div className="mx-auto max-w-3xl px-6 py-8">
        <BackToTicketsLink />
        <p role="alert" className="text-sm text-destructive">
          Chamado não encontrado ou você não tem acesso a ele.
        </p>
      </div>
    );
  }

  const { ticket, comments, attachments } = query.data;

  return (
    <div className="flex h-full min-h-0">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-4xl flex-1 flex-col gap-4 px-6 py-6 lg:py-8">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <BackToTicketsLink />
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

      <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l lg:flex xl:w-96">
        <TicketDetailsPanel
          ticket={ticket}
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
  isAgentOrAdmin,
  agents,
  onChange,
}: {
  ticket: Ticket;
  isAgentOrAdmin: boolean;
  agents: UserSummary[] | undefined;
  onChange: () => void;
}) {
  const session = useSession();

  const updateStatus = useMutation({
    mutationFn: (status: TicketStatus) =>
      apiClient.patch<Ticket>(`tickets/${ticket.id}/status`, { status }),
    onSuccess: onChange,
  });

  const assign = useMutation({
    mutationFn: (assigneeIds: string[]) =>
      apiClient.patch<Ticket>(`tickets/${ticket.id}/assign`, { assigneeIds }),
    onSuccess: onChange,
  });

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base leading-snug font-medium">{ticket.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Solicitante</dt>
          <dd>{ticket.requester?.name ?? shortId(ticket.requesterId)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Aberto em</dt>
          <dd>{formatDateTime(ticket.createdAt)}</dd>
        </div>
        {ticket.category && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Categoria</dt>
            <dd>{ticket.category.name}</dd>
          </div>
        )}
      </dl>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">Descrição</h3>
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
      </div>

      {isAgentOrAdmin && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateStatus.mutate(value as TicketStatus)}
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
                    const name = agents?.find((agent) => agent.id === assigneeId)?.name ?? shortId(assigneeId);
                    return (
                      <li
                        key={assigneeId}
                        className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
                      >
                        <UserAvatar name={name} className="size-6 shrink-0" />
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
