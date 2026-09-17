"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ApiError, apiClient } from "@/lib/api-client";
import type { AdminSlaSettings } from "@/lib/admin/types";

const settingsSchema = z.object({
  lowPriorityHours: z.number().int().positive(),
  mediumPriorityHours: z.number().int().positive(),
  highPriorityHours: z.number().int().positive(),
  urgentPriorityHours: z.number().int().positive(),
  warningThresholdPercent: z.number().int().min(1).max(99),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const EMPTY_VALUES: SettingsValues = {
  lowPriorityHours: 72,
  mediumPriorityHours: 24,
  highPriorityHours: 8,
  urgentPriorityHours: 4,
  warningThresholdPercent: 80,
};

export default function AdminSlaSettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["admin-sla-settings"],
    queryFn: () => apiClient.get<AdminSlaSettings>("admin/sla-settings"),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsValues) => apiClient.patch<AdminSlaSettings>("admin/sla-settings", values),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-sla-settings"], data);
      reset(data);
      setSaved(true);
    },
    onError: (error) => {
      setSaved(false);
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível salvar as configurações.",
      });
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Não foi possível carregar as configurações de SLA.</p>;
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit((values) => {
        setSaved(false);
        mutation.mutate(values);
      })}
    >
      <div className="sticky top-0 z-10 -mx-6 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">SLA</h1>
            <p className="text-sm text-muted-foreground">
              Prazo de resolução por prioridade e limiar do aviso de risco.
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        {errors.root && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}
        {saved && !errors.root && <p className="mt-2 text-sm text-emerald-600">Configurações salvas.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prazo por prioridade</CardTitle>
          <CardDescription>
            Quantas horas depois da abertura um chamado de cada prioridade deve ser resolvido. O relógio
            pausa enquanto o chamado está &ldquo;Aguardando&rdquo; (esperando resposta do solicitante).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="urgent-hours">Urgente (horas)</Label>
            <Input
              id="urgent-hours"
              type="number"
              min={1}
              {...register("urgentPriorityHours", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="high-hours">Alta (horas)</Label>
            <Input id="high-hours" type="number" min={1} {...register("highPriorityHours", { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="medium-hours">Média (horas)</Label>
            <Input
              id="medium-hours"
              type="number"
              min={1}
              {...register("mediumPriorityHours", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="low-hours">Baixa (horas)</Label>
            <Input id="low-hours" type="number" min={1} {...register("lowPriorityHours", { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aviso de risco</CardTitle>
          <CardDescription>
            A partir de quantos % do prazo consumido um chamado é sinalizado como &ldquo;perto de estourar&rdquo; —
            dispara o indicativo na tela e uma notificação pro(s) responsável(is) e admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-40 flex-col gap-1.5">
            <Label htmlFor="warning-threshold">Limiar de aviso (%)</Label>
            <Input
              id="warning-threshold"
              type="number"
              min={1}
              max={99}
              {...register("warningThresholdPercent", { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
