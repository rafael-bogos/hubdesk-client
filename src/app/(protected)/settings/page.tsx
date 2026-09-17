"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
import type { NotificationPreferences } from "@/lib/settings/types";

export default function SettingsPage() {
  const session = useSession();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => apiClient.get<NotificationPreferences>("auth/me"),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      apiClient.patch<NotificationPreferences>("users/me/notification-preferences", patch),
    onMutate: async (patch) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = queryClient.getQueryData<NotificationPreferences>(["notification-preferences"]);
      queryClient.setQueryData<NotificationPreferences>(["notification-preferences"], (current) =>
        current ? { ...current, ...patch } : current,
      );
      return { previous };
    },
    onError: (err, _patch, context) => {
      // Volta ao valor anterior — o switch já tinha mudado visualmente (update
      // otimista em onMutate) antes da resposta do servidor chegar.
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences"], context.previous);
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a preferência.");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-preferences"], data);
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas preferências pessoais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Escolha quais avisos de atividade nos seus chamados você também quer receber por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : query.isError || !query.data ? (
            <p className="text-sm text-destructive">Não foi possível carregar suas preferências.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="email-ticket-updated" className="font-normal">
                    Atualização de chamado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Avisos de mudança de status, prioridade ou responsável.
                  </p>
                </div>
                <Switch
                  id="email-ticket-updated"
                  checked={query.data.emailOnTicketUpdated}
                  onCheckedChange={(checked) => mutation.mutate({ emailOnTicketUpdated: checked })}
                  disabled={mutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="email-ticket-closed" className="font-normal">
                    Chamado fechado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aviso quando um dos seus chamados for fechado.
                  </p>
                </div>
                <Switch
                  id="email-ticket-closed"
                  checked={query.data.emailOnTicketClosed}
                  onCheckedChange={(checked) => mutation.mutate({ emailOnTicketClosed: checked })}
                  disabled={mutation.isPending}
                />
              </div>

              {isAgentOrAdmin && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="email-sla-warning" className="font-normal">
                      Aviso de SLA
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Aviso quando um chamado atribuído a você estiver perto de estourar o prazo de SLA.
                    </p>
                  </div>
                  <Switch
                    id="email-sla-warning"
                    checked={query.data.emailOnSlaWarning}
                    onCheckedChange={(checked) => mutation.mutate({ emailOnSlaWarning: checked })}
                    disabled={mutation.isPending}
                  />
                </div>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
