"use client";

import { FileIcon, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { isImageMimeType, isVideoMimeType } from "@/lib/tickets/attachments";
import { formatBytes } from "@/lib/tickets/format";

// Preview do arquivo escolhido antes de enviar: thumbnail para imagens/vídeos
// (object URL local, sem round-trip ao servidor), ícone genérico para o resto.
export function StagedFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = isImageMimeType(file.type);
  const isVideo = isVideoMimeType(file.type);
  const previewUrl = useMemo(
    () => (isImage || isVideo ? URL.createObjectURL(file) : null),
    [file, isImage, isVideo],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="relative flex w-fit items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pr-8 pl-1.5">
      {previewUrl && isImage ? (
        // alt="" porque o nome do arquivo já é mostrado como texto ao lado —
        // evita anunciar a mesma informação duas vezes para leitores de tela.
        // eslint-disable-next-line @next/next/no-img-element -- object URL local, não um asset estático
        <img src={previewUrl} alt="" className="size-9 rounded object-cover" />
      ) : previewUrl && isVideo ? (
        <video src={previewUrl} muted className="size-9 rounded object-cover" />
      ) : (
        <div className="flex size-9 items-center justify-center rounded bg-muted">
          <FileIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <p className="max-w-[160px] truncate text-xs font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1 right-1"
        onClick={onRemove}
        aria-label="Remover anexo"
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
