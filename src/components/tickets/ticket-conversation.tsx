"use client";

import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Loader2, Lock, Paperclip, SendHorizontal, Unlock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentChip } from "@/components/tickets/attachment-chip";
import { StagedFilePreview } from "@/components/tickets/staged-file-preview";
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

  // Só anima mensagens que chegam depois da conversa já estar aberta (envio
  // próprio ou "ticket:message" em tempo real) — sem isso, toda a conversa
  // animaria de novo a cada refetch (grupo mudou, toggle de nota interna etc).
  // Capturado uma única vez (estado, não ref — só assim dá pra ler durante o
  // render): quem já existia na primeira renderização nunca anima; quem
  // aparece depois, sim — e só naquela vez, já que o nó do DOM (mesma `key`)
  // não é recriado nos renders seguintes.
  const [initialEntryIds] = useState<Set<string>>(() => new Set(timeline.map((entry) => entry.id)));

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
      apiClient.post<Comment>(`tickets/${ticket.number}/comments`, input),
  });

  const uploadAttachment = useMutation({
    mutationFn: (input: { file: File; commentId?: string; isInternal?: boolean }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.commentId) formData.append("commentId", input.commentId);
      // Sem comentário (arquivo "solto"), não há de onde herdar a visibilidade no
      // backend — manda explícito. Com comentário, deixa o backend herdar dele.
      if (input.isInternal !== undefined) formData.append("isInternal", String(input.isInternal));
      return apiClient.post<Attachment>(`tickets/${ticket.number}/attachments`, formData);
    },
  });

  const toggleCommentInternal = useMutation({
    mutationFn: (input: { commentId: string; isInternal: boolean }) =>
      apiClient.patch<Comment>(`tickets/${ticket.number}/comments/${input.commentId}/internal`, {
        isInternal: input.isInternal,
      }),
    onSuccess: onChange,
  });

  const toggleAttachmentInternal = useMutation({
    mutationFn: (input: { attachmentId: string; isInternal: boolean }) =>
      apiClient.patch<Attachment>(`tickets/${ticket.number}/attachments/${input.attachmentId}/internal`, {
        isInternal: input.isInternal,
      }),
    onSuccess: onChange,
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
        await uploadAttachment.mutateAsync({
          file: stagedFile,
          commentId,
          isInternal: commentId ? undefined : isInternal,
        });
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
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden p-0">
      <CardContent className="flex h-full min-h-0 min-w-0 flex-col gap-0 p-0">
        <div ref={listRef} className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
          {timeline.length === 0 && (
            <p className="m-auto text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Escreva a primeira abaixo.
            </p>
          )}
          {timeline.map((entry, index) => {
            const authorId = entry.kind === "comment" ? entry.comment.authorId : entry.attachment.uploadedById;
            const authorName = resolveAuthorName(authorId, ticket, agents);
            const isOwn = authorId === session.id;
            const createdAt = entry.kind === "comment" ? entry.comment.createdAt : entry.attachment.createdAt;

            // Agrupa mensagens consecutivas do mesmo autor, igual ao WhatsApp: só a
            // primeira da sequência mostra avatar e nome — mesmo que uma delas seja
            // nota interna e outra pública (a cor do balão já diferencia isso).
            const previous = timeline[index - 1];
            const previousAuthorId = previous
              ? previous.kind === "comment"
                ? previous.comment.authorId
                : previous.attachment.uploadedById
              : null;
            const isGrouped = previousAuthorId === authorId;
            const isNew = !initialEntryIds.has(entry.id);

            return (
              <div
                key={entry.id}
                className={cn(
                  "flex min-w-0 gap-2",
                  isOwn && "flex-row-reverse",
                  !isGrouped && index > 0 && "mt-3",
                  // Desliza do lado onde a mensagem aparece (direita se é sua,
                  // esquerda se é da outra pessoa) — sutil, só na chegada.
                  isNew &&
                    (isOwn
                      ? "animate-in fade-in slide-in-from-right-2 duration-300 ease-out"
                      : "animate-in fade-in slide-in-from-left-2 duration-300 ease-out"),
                )}
              >
                {isGrouped ? (
                  <div className="size-7 shrink-0" aria-hidden="true" />
                ) : (
                  <UserAvatar name={authorName} className="mt-0.5 size-7 shrink-0" />
                )}
                <div className={cn("flex min-w-0 max-w-[80%] flex-col gap-1", isOwn && "items-end")}>
                  {!isGrouped && (
                    <span className="text-xs font-medium text-foreground">{authorName}</span>
                  )}

                  {entry.kind === "comment" && entry.comment.body && (
                    <div
                      className={cn(
                        "max-w-full rounded-md px-3 py-2 text-sm",
                        entry.comment.isInternal
                          ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200"
                          : isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                      )}
                    >
                      {/* wrap-anywhere (não só break-words): força a quebra mesmo dentro
                          do cálculo de largura mínima do flexbox — um texto sem espaços
                          (ex: URL longa) só quebra visualmente com break-words, mas ainda
                          empurra os containers pais na hora de medir o tamanho mínimo. */}
                      <p className="wrap-anywhere whitespace-pre-wrap">{entry.comment.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px] leading-none select-none",
                          isOwn && "text-right",
                          entry.comment.isInternal
                            ? "text-amber-950/60 dark:text-amber-200/60"
                            : isOwn
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                        )}
                      >
                        {formatDateTime(createdAt)}
                      </p>
                    </div>
                  )}

                  {entry.kind === "comment" && entry.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.attachments.map((attachment) => (
                        <AttachmentChip
                          key={attachment.id}
                          ticketId={ticket.number}
                          attachment={attachment}
                          canToggleInternal={isAgentOrAdmin && attachment.uploadedById === session.id}
                          isToggling={toggleAttachmentInternal.isPending}
                          isOwn={isOwn}
                          onToggleInternal={(nextIsInternal) =>
                            toggleAttachmentInternal.mutate({ attachmentId: attachment.id, isInternal: nextIsInternal })
                          }
                        />
                      ))}
                    </div>
                  )}

                  {entry.kind === "attachment" && (
                    <AttachmentChip
                      ticketId={ticket.number}
                      attachment={entry.attachment}
                      canToggleInternal={isAgentOrAdmin && entry.attachment.uploadedById === session.id}
                      isToggling={toggleAttachmentInternal.isPending}
                      isOwn={isOwn}
                      onToggleInternal={(nextIsInternal) =>
                        toggleAttachmentInternal.mutate({ attachmentId: entry.attachment.id, isInternal: nextIsInternal })
                      }
                    />
                  )}

                  {isAgentOrAdmin && entry.kind === "comment" && isOwn && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleCommentInternal.mutate({
                          commentId: entry.comment.id,
                          isInternal: !entry.comment.isInternal,
                        })
                      }
                      disabled={toggleCommentInternal.isPending}
                      className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                    >
                      {entry.comment.isInternal ? (
                        <>
                          <Unlock className="size-3" aria-hidden="true" />
                          Tornar pública
                        </>
                      ) : (
                        <>
                          <Lock className="size-3" aria-hidden="true" />
                          Marcar como interna
                        </>
                      )}
                    </button>
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
