"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, User as UserIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { ApiError, apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";
import type { NotificationPreferences, UserProfile } from "@/lib/settings/types";

type MeResponse = NotificationPreferences & UserProfile;

export default function SettingsPage() {
  const session = useSession();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<MeResponse>("auth/me"),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      apiClient.patch<NotificationPreferences>("users/me/notification-preferences", patch),
    onMutate: async (patch) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: ["me"] });
      const previous = queryClient.getQueryData<MeResponse>(["me"]);
      queryClient.setQueryData<MeResponse>(["me"], (current) =>
        current ? { ...current, ...patch } : current,
      );
      return { previous };
    },
    onError: (err, _patch, context) => {
      // Volta ao valor anterior — o switch já tinha mudado visualmente (update
      // otimista em onMutate) antes da resposta do servidor chegar.
      if (context?.previous) {
        queryClient.setQueryData(["me"], context.previous);
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a preferência.");
    },
    onSuccess: (data) => {
      queryClient.setQueryData<MeResponse>(["me"], (current) => (current ? { ...current, ...data } : current));
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
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Sua foto de perfil, exibida na barra lateral e nos chamados.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : query.isError || !query.data ? (
            <p className="text-sm text-destructive">Não foi possível carregar seu perfil.</p>
          ) : (
            <AvatarUploader name={query.data.name} avatarUrl={query.data.avatarUrl} />
          )}
        </CardContent>
      </Card>

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

function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const setAvatarUrl = (nextAvatarUrl: string | null) => {
    queryClient.setQueryData<MeResponse>(["me"], (current) =>
      current ? { ...current, avatarUrl: nextAvatarUrl } : current,
    );
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<{ avatarUrl: string | null }>("users/me/avatar", formData);
    },
    onSuccess: (data) => setAvatarUrl(data.avatarUrl),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar a foto.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete<{ avatarUrl: string | null }>("users/me/avatar"),
    onSuccess: (data) => setAvatarUrl(data.avatarUrl),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover a foto.");
    },
  });

  const isPending = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <UserAvatar name={name} imageUrl={avatarUrl} className="size-16" />
          {avatarUrl && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => deleteMutation.mutate()}
              aria-label="Remover foto de perfil"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground ring-2 ring-background disabled:opacity-50"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setError(null);
              uploadMutation.mutate(file);
            }
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <UserIcon className="size-3.5" aria-hidden="true" />
          )}
          {avatarUrl ? "Trocar foto" : "Enviar foto"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPEG ou WebP, até 3 MB.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
