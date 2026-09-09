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
