// Aceita os mesmos tipos que o backend permite (ver ALLOWED_MIME_TYPES em
// ticket-routes.ts) — o `accept` só melhora a UX do seletor nativo, a
// validação de verdade continua sendo feita no servidor.
export const ACCEPTED_FILE_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.zip,.mp4,.webm,.mov";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function attachmentDownloadUrl(ticketId: string, attachmentId: string): string {
  return `/api/backend/tickets/${ticketId}/attachments/${attachmentId}`;
}
