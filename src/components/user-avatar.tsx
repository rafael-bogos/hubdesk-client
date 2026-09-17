"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return initials.toUpperCase();
}

export function UserAvatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [trackedImageUrl, setTrackedImageUrl] = useState(imageUrl);

  // Reseta o estado de erro quando a URL muda (ex: troca de foto) — senão uma
  // falha antiga (ou de outro usuário, em listas) gruda pro resto da sessão.
  if (imageUrl !== trackedImageUrl) {
    setTrackedImageUrl(imageUrl);
    setImageFailed(false);
  }

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Avatar className={className}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de perfil (própria ou do provedor OAuth), não otimizável pelo next/image por vir de domínio externo/dinâmico
        <img
          src={imageUrl ?? undefined}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="aspect-square size-full rounded-full object-cover"
        />
      ) : (
        <AvatarFallback className="bg-[#1F2A44] text-[#F4F3EF] font-medium">
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
