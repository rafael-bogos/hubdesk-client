"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useSession } from "@/lib/session-context";
import { PRIORITY_LABELS, type TicketPriority } from "@/lib/tickets/types";

interface TicketCreatedEvent {
  id: string;
  number: number;
  title: string;
  priority: TicketPriority;
  requesterId: string;
}

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

// Monta a conexão em tempo real com o backend (só pra agent/admin — a mesma
// regra de quem entra na sala "agents" no servidor). Fica escutando
// "ticket:created" a vida toda enquanto a pessoa estiver logada, em qualquer
// tela — por isso vive no layout protegido, não numa página específica.
export function TicketNotifications() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";

  useEffect(() => {
    if (!isAgentOrAdmin) return;

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

    socket.on("ticket:created", (event: TicketCreatedEvent) => {
      console.log("ticket:created", event);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });

      toast.info(`Novo chamado #${event.number}`, {
        description: `${event.title} · Prioridade ${PRIORITY_LABELS[event.priority]}`,
        action: {
          label: "Ver chamado",
          onClick: () => router.push(`/tickets/${event.number}`),
        },
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAgentOrAdmin, queryClient, router]);

  return null;
}
