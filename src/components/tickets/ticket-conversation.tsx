"use client";

import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Loader2, Paperclip, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentChip } from "@/components/tickets/attachment-chip";
import { StagedFilePreview } from "@/components/tickets/staged-file-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { apiClient, ApiError } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
import { ACCEPTED_FILE_TYPES } from "@/lib/tickets/attachments";
import { formatDateTime, shortId } from "@/lib/tickets/format";
import type { Attachment, Comment, Ticket, UserSummary } from "@/lib/tickets/types";

type ConversationEntry =
  | { kind: "comment"; id: string; createdAt: string; comment: Comment; attachments: Attachment[] }
  | { kind: "attachment"; id: string; createdAt: string; attachment: Attachment };

// Comentários e anexos são recursos separados na API (um anexo pode ou não
// pertencer a um comentário). Para renderizar como um chat único, juntamos os
// dois numa linha do tempo: anexos com commentId viram parte da bolha do
// comentário; anexos "soltos" (enviados sem texto) viram sua própria bolha.
function buildTimeline(comments: Comment[], attachments: Attachment[]): ConversationEntry[] {
  const byComment = new Map<string, Attachment[]>();
  const standalone: Attachment[] = [];

  for (const attachment of attachments) {
    if (attachment.commentId) {
      const list = byComment.get(attachment.commentId) ?? [];
      list.push(attachment);
      byComment.set(attachment.commentId, list);
    } else {
      standalone.push(attachment);
    }
  }

  const entries: ConversationEntry[] = [
    ...comments.map((comment) => ({
      kind: "comment" as const,
      id: comment.id,
      createdAt: comment.createdAt,
      comment,
      attachments: byComment.get(comment.id) ?? [],
    })),
    ...standalone.map((attachment) => ({
      kind: "attachment" as const,
      id: attachment.id,
      createdAt: attachment.createdAt,
      attachment,
    })),
  ];

  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// A API não devolve nome/e-mail do autor do comentário (só o id). Resolvemos
// pelos participantes que já conhecemos (solicitante, responsável e, para
// agentes/admins, a lista de agentes) antes de cair no fallback de id curto.
function resolveAuthorName(
  authorId: string,
  ticket: Ticket,
  agents: UserSummary[] | undefined,
): string {
  if (ticket.requester?.id === authorId) return ticket.requester.name;
  const assignee = ticket.assignees?.find((candidate) => candidate.id === authorId);
  if (assignee) return assignee.name;
  const agent = agents?.find((candidate) => candidate.id === authorId);
  if (agent) return agent.name;
  return `Usuário ${shortId(authorId)}`;
}

export function TicketConversation({
  ticket,
  comments,
  attachments,
  isAgentOrAdmin,
  agents,
  onChange,
}: {
  ticket: Ticket;
  comments: Comment[];
  attachments: Attachment[];
  isAgentOrAdmin: boolean;
  agents: UserSummary[] | undefined;
  onChange: () => void;
}) {
  const session = useSession();
  const timeline = buildTimeline(comments, attachments);

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // scrollTop = scrollHeight (em vez de scrollIntoView num sentinel) chega ao
  // fim de verdade, incluindo o padding inferior do container.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [timeline.length]);

  // Cresce junto com o conteúdo (até o teto de max-h-32 do className, quando o
  // scroll interno assume) — `rows`/CSS sozinhos não acompanham quebras de linha.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  const addComment = useMutation({
    mutationFn: (input: { body: string; isInternal: boolean }) =>
      apiClient.post<Comment>(`tickets/${ticket.id}/comments`, input),
  });

  const uploadAttachment = useMutation({
    mutationFn: (input: { file: File; commentId?: string }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.commentId) formData.append("commentId", input.commentId);
      return apiClient.post<Attachment>(`tickets/${ticket.id}/attachments`, formData);
    },
  });

  const isSending = addComment.isPending || uploadAttachment.isPending;
  const sendError = addComment.error ?? uploadAttachment.error;
  const canSend = (body.trim().length > 0 || stagedFile !== null) && !isSending;

  const clearStagedFile = () => {
    setStagedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (isSending) return;
    const trimmedBody = body.trim();
    if (!trimmedBody && !stagedFile) return;

    try {
      let commentId: string | undefined;
      if (trimmedBody) {
        const comment = await addComment.mutateAsync({ body: trimmedBody, isInternal });
        commentId = comment.id;
      }
      if (stagedFile) {
        await uploadAttachment.mutateAsync({ file: stagedFile, commentId });
      }
      setBody("");
      setIsInternal(false);
      clearStagedFile();
      onChange();
    } catch {
      // erro já exposto abaixo via addComment.error / uploadAttachment.error
    }
  };

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
      <CardContent className="flex h-full min-h-0 flex-col gap-0 p-0">
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {timeline.length === 0 && (
            <p className="m-auto text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Escreva a primeira abaixo.
            </p>
          )}
          {timeline.map((entry) => {
            const authorId = entry.kind === "comment" ? entry.comment.authorId : entry.attachment.uploadedById;
            const authorName = resolveAuthorName(authorId, ticket, agents);
            const isOwn = authorId === session.id;
            const createdAt = entry.kind === "comment" ? entry.comment.createdAt : entry.attachment.createdAt;
            const isInternalNote = entry.kind === "comment" && entry.comment.isInternal;

            return (
              <div key={entry.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                <UserAvatar name={authorName} className="mt-0.5 size-7 shrink-0" />
                <div className={cn("flex min-w-0 max-w-[80%] flex-col gap-1", isOwn && "items-end")}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{authorName}</span>
                    <span>{formatDateTime(createdAt)}</span>
                    {isInternalNote && <Badge variant="secondary">Nota interna</Badge>}
                  </div>

                  {entry.kind === "comment" && entry.comment.body && (
                    <div
                      className={cn(
                        "max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                        entry.comment.isInternal
                          ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200"
                          : isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                      )}
                    >
                      {entry.comment.body}
                    </div>
                  )}

                  {entry.kind === "comment" && entry.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.attachments.map((attachment) => (
                        <AttachmentChip key={attachment.id} ticketId={ticket.id} attachment={attachment} />
                      ))}
                    </div>
                  )}

                  {entry.kind === "attachment" && (
                    <AttachmentChip ticketId={ticket.id} attachment={entry.attachment} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t p-3">
          {stagedFile && <StagedFilePreview file={stagedFile} onRemove={clearStagedFile} />}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setStagedFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Anexar arquivo"
            >
              <Paperclip className="size-4" aria-hidden="true" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escreva uma mensagem..."
              rows={1}
              className="max-h-32 min-h-9 flex-1 resize-none py-2"
            />

            <Button
              type="button"
              size="icon-lg"
              disabled={!canSend}
              onClick={handleSend}
              aria-label={isSending ? "Enviando mensagem…" : "Enviar mensagem"}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <SendHorizontal className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            {isAgentOrAdmin ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(v === true)} />
                Nota interna (não visível ao solicitante)
              </label>
            ) : (
              <span />
            )}
            {sendError && (
              <p role="alert" className="text-xs text-destructive">
                {sendError instanceof ApiError ? sendError.message : "Não foi possível enviar."}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
