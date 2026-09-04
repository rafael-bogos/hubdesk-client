"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BackToTicketsLink } from "@/components/tickets/back-to-tickets-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiClient } from "@/lib/api-client";
import {
  PRIORITY_LABELS,
  TICKET_PRIORITIES,
  type CategorySummary,
  type Ticket,
} from "@/lib/tickets/types";

const NO_CATEGORY = "NONE";

const createTicketSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
  description: z.string().min(1, "Descrição é obrigatória"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  categoryId: z.string(),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export default function NewTicketPage() {
  const router = useRouter();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategorySummary[]>("categories"),
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: "MEDIUM", categoryId: NO_CATEGORY },
  });

  const mutation = useMutation({
    mutationFn: ({ categoryId, ...values }: CreateTicketValues) =>
      apiClient.post<Ticket>("tickets", {
        ...values,
        categoryId: categoryId === NO_CATEGORY ? undefined : categoryId,
      }),
    onSuccess: (ticket) => {
      router.push(`/tickets/${ticket.id}`);
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível criar o chamado.",
      });
    },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <BackToTicketsLink />
      <Card>
        <CardHeader>
          <CardTitle>Novo chamado</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={5} {...register("description")} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value ? PRIORITY_LABELS[value as (typeof TICKET_PRIORITIES)[number]] : null
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Categoria</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="categoryId" className="w-full">
                      <SelectValue placeholder="Sem categoria">
                        {(value: string | null) => {
                          if (!value || value === NO_CATEGORY) return "Sem categoria";
                          return categoriesQuery.data?.find((c) => c.id === value)?.name ?? null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                      {categoriesQuery.data?.length === 0 ? (
                        <div className="px-1.5 py-1 text-sm text-muted-foreground">
                          Nenhuma categoria cadastrada.
                        </div>
                      ) : (
                        (categoriesQuery.data ?? []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Criando..." : "Criar chamado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
