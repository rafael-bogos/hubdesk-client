"use client";

import { cn } from "cn";
import { Download, FileIcon, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { attachmentDownloadUrl, isImageMimeType, isVideoMimeType } from "@/lib/tickets/attachments";
import { formatBytes, formatDateTime } from "@/lib/tickets/format";
import type { Attachment } from "@/lib/tickets/types";

// Anexo já enviado: preview inline para imagens/vídeos (clicável, expande num
// lightbox), chip com ícone para os demais tipos. O download força
// "Content-Disposition: attachment" no backend, então só <img>/<video> (que
// ignoram esse header) conseguem exibir a mídia inline — um <a> comum
// dispararia o download em vez de navegar.
export function AttachmentChip({
  ticketId,
  attachment,
  canToggleInternal,
  onToggleInternal,
  isToggling,
  isOwn,
}: {
  ticketId: string;
  attachment: Attachment;
  canToggleInternal?: boolean;
  onToggleInternal?: (nextIsInternal: boolean) => void;
  isToggling?: boolean;
  isOwn?: boolean;
}) {
  const href = attachmentDownloadUrl(ticketId, attachment.id);
  const isImage = isImageMimeType(attachment.mimeType);
  const isVideo = isVideoMimeType(attachment.mimeType);
  const [isExpanded, setIsExpanded] = useState(false);

  // Mesmo esquema de cor da bolha de texto, pra anexo e mensagem parecerem a
  // mesma "espécie" de elemento na conversa.
  const bubbleClasses = attachment.isInternal
    ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200"
    : isOwn
      ? "bg-primary text-primary-foreground"
      : "bg-muted";

  const timestampClasses = cn(
    "text-[10px] leading-none select-none",
    isOwn && "text-right",
    attachment.isInternal
      ? "text-amber-950/60 dark:text-amber-200/60"
      : isOwn
        ? "text-primary-foreground/70"
        : "text-muted-foreground",
  );

  const toggleButton = canToggleInternal && onToggleInternal && (
    <button
      type="button"
      onClick={() => onToggleInternal(!attachment.isInternal)}
      disabled={isToggling}
      className={cn(
        "flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50",
        isOwn && "self-end",
      )}
    >
      {attachment.isInternal ? (
        <>
          <Unlock className="size-3" aria-hidden="true" />
          Tornar público
        </>
      ) : (
        <>
          <Lock className="size-3" aria-hidden="true" />
          Marcar como interno
        </>
      )}
    </button>
  );

  if (isImage || isVideo) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex max-w-[240px] flex-col overflow-hidden rounded-md text-left transition-opacity hover:opacity-90",
            bubbleClasses,
          )}
        >
          {/* h-40 fixo (em vez de max-h) reserva o espaço antes da mídia carregar,
              evitando que o layout do chat pule quando o tamanho real chega. */}
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- arquivo autenticado via cookie, não um asset estático
            <img
              src={href}
              alt={attachment.filename}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
          ) : (
            <video src={href} muted playsInline className="h-40 w-full object-cover" />
          )}
          <span className="flex flex-col gap-1 px-3 py-2 text-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{attachment.filename}</span>
              <span className="shrink-0 text-xs opacity-70">{formatBytes(attachment.size)}</span>
            </span>
            <span className={timestampClasses}>{formatDateTime(attachment.createdAt)}</span>
          </span>
        </button>
        {toggleButton}

        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="flex max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-3xl">
            <DialogTitle className="sr-only">{attachment.filename}</DialogTitle>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- arquivo autenticado via cookie, não um asset estático
              <img
                src={href}
                alt={attachment.filename}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            ) : (
              <video src={href} controls autoPlay className="max-h-[80vh] w-full rounded-lg" />
            )}
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">
                {attachment.filename} · {formatBytes(attachment.size)}
              </span>
              <a
                href={href}
                className="flex shrink-0 items-center gap-1.5 hover:text-foreground"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Baixar
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <a
        href={href}
        className={cn(
          "flex max-w-[280px] flex-col gap-1 rounded-md px-3 py-2 text-sm transition-opacity hover:opacity-90",
          bubbleClasses,
        )}
      >
        <span className="flex items-center gap-2">
          <FileIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium">{attachment.filename}</span>
          <span className="shrink-0 text-xs opacity-70">{formatBytes(attachment.size)}</span>
          <Download className="size-3.5 shrink-0" aria-hidden="true" />
        </span>
        <span className={timestampClasses}>{formatDateTime(attachment.createdAt)}</span>
      </a>
      {toggleButton}
    </div>
  );
}
