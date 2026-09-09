"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BackToTicketsLink } from "@/components/tickets/back-to-tickets-link";
import { StagedFilePreview } from "@/components/tickets/staged-file-preview";
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
import { useSession } from "@/lib/session-context";
import { ACCEPTED_FILE_TYPES } from "@/lib/tickets/attachments";
import { shortId } from "@/lib/tickets/format";
import {
  PRIORITY_LABELS,
  TICKET_PRIORITIES,
  type CategorySummary,
  type Ticket,
  type UserSummary,
} from "@/lib/tickets/types";

const createTicketSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
  description: z.string().min(1, "Descrição é obrigatória"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  categoryId: z.string(),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export default function NewTicketPage() {
  const router = useRouter();
  const session = useSession();
  const isAgentOrAdmin = session.role === "AGENT" || session.role === "ADMIN";

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategorySummary[]>("categories"),
  });
  const hasCategories = (categoriesQuery.data?.length ?? 0) > 0;
  const categoryPlaceholder = categoriesQuery.isLoading
    ? "Carregando categorias..."
    : hasCategories
      ? "Selecione uma categoria"
      : "Nenhuma categoria cadastrada";

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiClient.get<UserSummary[]>("users/agents"),
    enabled: isAgentOrAdmin,
  });

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: "MEDIUM", categoryId: "" },
  });

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStagedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFileAt = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (values: CreateTicketValues) => {
      const ticket = await apiClient.post<Ticket>("tickets", {
        ...values,
        categoryId: values.categoryId || undefined,
      });

      // Responsáveis e anexos são passos secundários: o chamado já foi criado
      // nesse ponto, então uma falha aqui não deve impedir a navegação — dá
      // pra ajustar depois pela tela de detalhes.
      if (isAgentOrAdmin && assigneeIds.length > 0) {
        try {
          await apiClient.patch(`tickets/${ticket.id}/assign`, { assigneeIds });
        } catch {
          // ignorado de propósito, ver comentário acima
        }
      }

      for (const file of stagedFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          await apiClient.post(`tickets/${ticket.id}/attachments`, formData);
        } catch {
          // ignorado de propósito, ver comentário acima
        }
      }

      return ticket;
    },
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
            onSubmit={handleSubmit((values) => {
              if (hasCategories && !values.categoryId) {
                setError("categoryId", { message: "Categoria é obrigatória" });
                return;
              }
              mutation.mutate(values);
            })}
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!categoriesQuery.isLoading && !hasCategories}
                  >
                    <SelectTrigger id="categoryId" className="w-full">
                      <SelectValue placeholder={categoryPlaceholder}>
                        {(value: string | null) =>
                          (value && categoriesQuery.data?.find((c) => c.id === value)?.name) ||
                          categoryPlaceholder
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesQuery.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            {isAgentOrAdmin && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignees-select">Responsáveis</Label>
                <Select multiple value={assigneeIds} onValueChange={setAssigneeIds}>
                  <SelectTrigger id="assignees-select" className="w-full">
                    <SelectValue placeholder="Ninguém atribuído">
                      {(value: string[]) =>
                        value.length > 0
                          ? value
                              .map(
                                (id) => agentsQuery.data?.find((agent) => agent.id === id)?.name ?? shortId(id),
                              )
                              .join(", ")
                          : "Ninguém atribuído"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {agentsQuery.data?.length === 0 ? (
                      <div className="px-1.5 py-1 text-sm text-muted-foreground">
                        Nenhum agente disponível.
                      </div>
                    ) : (
                      (agentsQuery.data ?? []).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Anexos</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" aria-hidden="true" />
                Anexar arquivo
              </Button>
              {stagedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stagedFiles.map((file, index) => (
                    <StagedFilePreview
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      onRemove={() => removeFileAt(index)}
                    />
                  ))}
                </div>
              )}
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
