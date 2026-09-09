"use client";

import { Download, FileIcon } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { attachmentDownloadUrl, isImageMimeType, isVideoMimeType } from "@/lib/tickets/attachments";
import { formatBytes } from "@/lib/tickets/format";
import type { Attachment } from "@/lib/tickets/types";

// Anexo já enviado: preview inline para imagens/vídeos (clicável, expande num
// lightbox), chip com ícone para os demais tipos. O download força
// "Content-Disposition: attachment" no backend, então só <img>/<video> (que
// ignoram esse header) conseguem exibir a mídia inline — um <a> comum
// dispararia o download em vez de navegar.
export function AttachmentChip({
  ticketId,
  attachment,
}: {
  ticketId: string;
  attachment: Attachment;
}) {
  const href = attachmentDownloadUrl(ticketId, attachment.id);
  const isImage = isImageMimeType(attachment.mimeType);
  const isVideo = isVideoMimeType(attachment.mimeType);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isImage || isVideo) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="block w-fit max-w-[240px] overflow-hidden rounded-lg border bg-muted/30 text-left transition-opacity hover:opacity-90"
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
          <span className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted-foreground">
            <span className="truncate">{attachment.filename}</span>
            <span className="shrink-0">{formatBytes(attachment.size)}</span>
          </span>
        </button>

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
      </>
    );
  }

  return (
    <a
      href={href}
      className="flex w-fit max-w-[240px] items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2 text-xs hover:bg-muted"
    >
      <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{attachment.filename}</span>
      <span className="shrink-0 text-muted-foreground">{formatBytes(attachment.size)}</span>
      <Download className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}
