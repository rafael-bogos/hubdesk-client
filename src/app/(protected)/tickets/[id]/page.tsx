"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
import { formatBytes, formatDateTime, shortId } from "@/lib/tickets/format";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  type Attachment,
  type Comment,
  type Ticket,
  type TicketDetail,
  type TicketStatus,
  type UserSummary,
} from "@/lib/tickets/types";

const UNASSIGNED = "UNASSIGNED";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const queryClient = useQueryClient();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";

  const query = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => apiClient.get<TicketDetail>(`tickets/${id}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ticket", id] });

  if (query.isLoading) {
    return <p className="mx-auto max-w-3xl px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <p className="mx-auto max-w-3xl px-6 py-8 text-sm text-destructive">
        Chamado não encontrado ou você não tem acesso a ele.
      </p>
    );
  }

  const { ticket, comments, attachments } = query.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <TicketHeader ticket={ticket} isAgentOrAdmin={isAgentOrAdmin} onChange={invalidate} />
      <CommentsSection
        ticketId={ticket.id}
        comments={comments}
        isAgentOrAdmin={isAgentOrAdmin}
        onChange={invalidate}
      />
      <AttachmentsSection ticketId={ticket.id} attachments={attachments} onChange={invalidate} />
    </div>
  );
}

function TicketHeader({
  ticket,
  isAgentOrAdmin,
  onChange,
}: {
  ticket: Ticket;
  isAgentOrAdmin: boolean;
  onChange: () => void;
}) {
  const session = useSession();

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient.get<UserSummary[]>("users/agents"),
    enabled: isAgentOrAdmin,
  });

  const updateStatus = useMutation({
    mutationFn: (status: TicketStatus) =>
      apiClient.patch<Ticket>(`tickets/${ticket.id}/status`, { status }),
    onSuccess: onChange,
  });

  const assign = useMutation({
    mutationFn: (targetAssigneeId: string) =>
      apiClient.patch<Ticket>(`tickets/${ticket.id}/assign`, { assigneeId: targetAssigneeId }),
    onSuccess: onChange,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{ticket.title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Aberto em {formatDateTime(ticket.createdAt)} · Solicitante{" "}
              {ticket.requester?.name ?? shortId(ticket.requesterId)}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>

        {isAgentOrAdmin && (
          <>
            <Separator />
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateStatus.mutate(value as TicketStatus)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
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
                <Label htmlFor="assignee-select">Responsável</Label>
                <div className="flex gap-2">
                  <Select
                    value={ticket.assigneeId ?? UNASSIGNED}
                    onValueChange={(value) => {
                      if (value && value !== UNASSIGNED) assign.mutate(value);
                    }}
                  >
                    <SelectTrigger id="assignee-select" className="w-56">
                      <SelectValue placeholder="Ninguém atribuído" />
                    </SelectTrigger>
                    <SelectContent>
                      {(agentsQuery.data ?? []).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={assign.isPending || ticket.assigneeId === session.id}
                    onClick={() => assign.mutate(session.id)}
                  >
                    Atribuir a mim
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommentsSection({
  ticketId,
  comments,
  isAgentOrAdmin,
  onChange,
}: {
  ticketId: string;
  comments: Comment[];
  isAgentOrAdmin: boolean;
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const addComment = useMutation({
    mutationFn: () =>
      apiClient.post<Comment>(`tickets/${ticketId}/comments`, {
        body,
        ...(isAgentOrAdmin ? { isInternal } : {}),
      }),
    onSuccess: () => {
      onChange();
      setBody("");
      setIsInternal(false);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comentários</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {shortId(comment.authorId)} · {formatDateTime(comment.createdAt)}
              </span>
              {comment.isInternal && <Badge variant="secondary">Nota interna</Badge>}
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
          </div>
        ))}

        <Separator />

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) addComment.mutate();
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
          />
          <div className="flex items-center justify-between">
            {isAgentOrAdmin ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(v === true)} />
                Nota interna (não visível ao solicitante)
              </label>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!body.trim() || addComment.isPending}>
              {addComment.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </div>
          {addComment.isError && (
            <p className="text-sm text-destructive">
              {addComment.error instanceof ApiError
                ? addComment.error.message
                : "Não foi possível enviar o comentário."}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function AttachmentsSection({
  ticketId,
  attachments,
  onChange,
}: {
  ticketId: string;
  attachments: Attachment[];
  onChange: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<Attachment>(`tickets/${ticketId}/attachments`, formData);
    },
    onSuccess: () => {
      onChange();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anexos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {attachments.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
        )}
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between text-sm">
              <a
                href={`/api/backend/tickets/${ticketId}/attachments/${attachment.id}`}
                className="text-primary hover:underline"
              >
                {attachment.filename}
              </a>
              <span className="text-xs text-muted-foreground">
                {formatBytes(attachment.size)} · {formatDateTime(attachment.createdAt)}
              </span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
            }}
            className="text-sm"
          />
          {upload.isPending && <span className="text-xs text-muted-foreground">Enviando...</span>}
        </div>
        {upload.isError && (
          <p className="text-sm text-destructive">
            {upload.error instanceof ApiError
              ? upload.error.message
              : "Não foi possível enviar o anexo."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
