"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/api-client";
import { formatDateTime } from "@/lib/tickets/format";
import type { AppNotification, ListNotificationsResult } from "@/lib/notifications/types";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<ListNotificationsResult>("notifications"),
  });

  const unreadCount = query.data?.unreadCount ?? 0;

  const markRead = (id: string) => {
    apiClient.patch<AppNotification>(`notifications/${id}/read`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  };

  const markAllRead = () => {
    apiClient.patch("notifications/read-all").then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notificações">
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={markAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.isLoading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Carregando…</p>
          )}

          {query.data && query.data.items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-muted-foreground">
              <Inbox className="size-6" aria-hidden="true" />
              <p className="text-sm">Nenhuma notificação ainda.</p>
            </div>
          )}

          {query.data?.items.map((notification) => (
            <Link
              key={notification.id}
              href={`/tickets/${notification.ticketNumber}`}
              onClick={() => {
                setIsOpen(false);
                if (!notification.read) markRead(notification.id);
              }}
              className="flex gap-2.5 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-primary"}`}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{notification.title}</span>
                <span className="truncate text-xs text-muted-foreground">{notification.body}</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(notification.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
