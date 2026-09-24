"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiClient } from "@/lib/api-client";
import {
  CUSTOM_FIELD_TYPE_LABELS,
  CUSTOM_FIELD_TYPES,
  type Category,
  type CategoryCustomField,
  type CustomFieldType,
} from "@/lib/admin/types";

const fieldSchema = z
  .object({
    label: z.string().min(1, "Nome do campo é obrigatório"),
    type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT", "ATTACHMENT"]),
    required: z.boolean(),
    options: z.array(z.object({ value: z.string() })),
  })
  .refine(
    (data) =>
      data.type !== "SELECT" ||
      (data.options.length >= 2 && data.options.every((option) => option.value.trim().length > 0)),
    { message: "Informe ao menos duas opções preenchidas", path: ["options"] },
  );

type FieldValues = z.infer<typeof fieldSchema>;

export function CategoryFieldsDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ListChecks className="size-4" aria-hidden="true" />
            Campos personalizados
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campos personalizados — {category.name}</DialogTitle>
        </DialogHeader>
        {/* Só monta a query/form quando o diálogo está de fato aberto. */}
        {open && <CategoryFieldsManager categoryId={category.id} />}
      </DialogContent>
    </Dialog>
  );
}

function CategoryFieldsManager({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<CategoryCustomField | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queryKey = ["admin-category-fields", categoryId];
  const query = useQuery({
    queryKey,
    queryFn: () => apiClient.get<CategoryCustomField[]>(`admin/categories/${categoryId}/fields`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const fields = query.data ?? [];

  const toggleActiveMutation = useMutation({
    mutationFn: (field: CategoryCustomField) =>
      apiClient.patch(`admin/categories/${categoryId}/fields/${field.id}`, { active: !field.active }),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ fieldId, order }: { fieldId: string; order: number }) =>
      apiClient.patch(`admin/categories/${categoryId}/fields/${fieldId}`, { order }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (field: CategoryCustomField) =>
      apiClient.delete(`admin/categories/${categoryId}/fields/${field.id}`),
    onSuccess: invalidate,
    onError: (error) => {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir o campo.",
      );
    },
  });

  // Reatribui a posição (0..n-1) de todos os campos após uma troca — evita
  // depender do `order` atual (todos nascem com 0) e mantém a ordenação sem
  // empates dali em diante.
  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    reordered.forEach((field, position) => {
      if (field.order !== position) {
        reorderMutation.mutate({ fieldId: field.id, order: position });
      }
    });
  };

  const handleDelete = (field: CategoryCustomField) => {
    setActionError(null);
    if (!window.confirm(`Excluir o campo "${field.label}"?`)) return;
    deleteMutation.mutate(field);
  };

  if (isCreating || editingField) {
    return (
      <CategoryFieldForm
        categoryId={categoryId}
        field={editingField ?? undefined}
        onDone={() => {
          setIsCreating(false);
          setEditingField(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os campos.</p>
      )}

      {query.data && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum campo personalizado.
                  </TableCell>
                </TableRow>
              )}
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">
                    <span className="block max-w-[180px] truncate" title={field.label}>
                      {field.label}
                    </span>
                  </TableCell>
                  <TableCell>{CUSTOM_FIELD_TYPE_LABELS[field.type]}</TableCell>
                  <TableCell>{field.required ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    {field.active ? (
                      <Badge variant="secondary">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => moveField(index, -1)}
                        title="Mover para cima"
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleActiveMutation.mutate(field)}
                        title={field.active ? "Desativar" : "Ativar"}
                      >
                        {field.active ? (
                          <EyeOff className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Eye className="size-3.5" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingField(field)}
                        title="Editar"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(field)}
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <Button type="button" variant="outline" className="w-fit" onClick={() => setIsCreating(true)}>
        Novo campo
      </Button>
    </div>
  );
}

function CategoryFieldForm({
  categoryId,
  field,
  onDone,
}: {
  categoryId: string;
  field?: CategoryCustomField;
  onDone: () => void;
}) {
  const isEdit = Boolean(field);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field?.label ?? "",
      type: field?.type ?? "TEXT",
      required: field?.required ?? false,
      options: field?.options?.map((value) => ({ value })) ?? [],
    },
  });

  const type = watch("type");
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control, name: "options" });

  // Ao escolher "Seleção" sem nenhuma opção ainda (campo novo, ou trocando de
  // outro tipo), já começa com duas linhas em branco pro admin preencher —
  // é o mínimo exigido mesmo.
  useEffect(() => {
    if (type === "SELECT" && optionFields.length === 0) {
      appendOption([{ value: "" }, { value: "" }]);
    }
  }, [type, optionFields.length, appendOption]);

  const mutation = useMutation({
    mutationFn: (values: FieldValues) => {
      const payload = {
        label: values.label,
        type: values.type,
        required: values.required,
        options:
          values.type === "SELECT"
            ? values.options.map((option) => option.value.trim()).filter(Boolean)
            : undefined,
      };

      return isEdit
        ? apiClient.patch<CategoryCustomField>(`admin/categories/${categoryId}/fields/${field!.id}`, payload)
        : apiClient.post<CategoryCustomField>(`admin/categories/${categoryId}/fields`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-category-fields", categoryId] });
      onDone();
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível salvar o campo.",
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-label">Nome do campo</Label>
        <Input id="field-label" {...register("label")} />
        {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-type">Tipo</Label>
        <Controller
          name="type"
          control={control}
          render={({ field: controllerField }) => (
            <Select value={controllerField.value} onValueChange={controllerField.onChange}>
              <SelectTrigger id="field-type" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    value ? CUSTOM_FIELD_TYPE_LABELS[value as CustomFieldType] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_FIELD_TYPES.map((fieldType) => (
                  <SelectItem key={fieldType} value={fieldType}>
                    {CUSTOM_FIELD_TYPE_LABELS[fieldType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {type === "SELECT" && (
        <div className="flex flex-col gap-1.5">
          <Label>Opções</Label>
          <div className="flex flex-col gap-2">
            {optionFields.map((optionField, index) => (
              <div key={optionField.id} className="flex items-center gap-2">
                <Input
                  {...register(`options.${index}.value` as const)}
                  placeholder={`Opção ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={optionFields.length <= 2}
                  onClick={() => removeOption(index)}
                  title="Remover opção"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Remover opção</span>
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => appendOption({ value: "" })}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Adicionar opção
          </Button>
          {errors.options && (
            <p className="text-sm text-destructive">{errors.options.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Controller
          name="required"
          control={control}
          render={({ field: controllerField }) => (
            <Checkbox
              id="field-required"
              checked={controllerField.value}
              onCheckedChange={(v) => controllerField.onChange(v === true)}
            />
          )}
        />
        <Label htmlFor="field-required" className="font-normal">
          Campo obrigatório
        </Label>
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar campo"}
        </Button>
      </div>
    </form>
  );
}
