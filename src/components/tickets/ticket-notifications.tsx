"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "@/lib/session-context";
import type { AppNotification } from "@/lib/notifications/types";

async function fetchSocketToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/socket-token");
    if (!response.ok) return null;
    const data = await response.json();
    return data.token ?? null;
  } catch {
    // Rede fora do ar etc. — devolve null pra sempre chamar o callback do
    // socket.io (senão a tentativa de conexão fica pendurada pra sempre).
    return null;
  }
}

// Monta a conexão em tempo real com o backend pra qualquer papel — o servidor
// decide quem recebe o quê por sala (ver socket-server.ts), aqui só reflete a
// notificação que chegar na área de notificações (sino, ver notification-bell.tsx)
// e atualiza a tela do chamado se estiver aberta. Sem toast de propósito.
// Fica escutando a vida toda enquanto a pessoa estiver logada, em qualquer
// tela — por isso vive no layout protegido, não numa página específica.
export function TicketNotifications() {
  const session = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (!backendUrl) {
      console.error("NEXT_PUBLIC_BACKEND_WS_URL não configurada — notificações em tempo real desativadas.");
      return;
    }

    const socket: Socket = io(backendUrl, {
      // Reavaliado a cada tentativa de conexão (incluindo reconexões), então
      // um token vencido é renovado automaticamente sem precisar recarregar a página.
      auth: async (callback) => {
        const token = await fetchSocketToken();
        callback({ token: token ?? "" });
      },
    });

    socket.on("notification:new", (notification: AppNotification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", String(notification.ticketNumber)] });
    });

    // Mensagem nova (comentário/anexo) não gera notificação persistida — só
    // atualiza a conversa na hora se a pessoa estiver com aquele chamado aberto.
    socket.on("ticket:message", (payload: { ticketNumber: number }) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", String(payload.ticketNumber)] });
    });

    return () => {
      socket.disconnect();
    };
  }, [session.id, queryClient]);

  return null;
}
