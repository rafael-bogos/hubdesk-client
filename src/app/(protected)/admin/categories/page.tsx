"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiClient } from "@/lib/api-client";
import type { Category } from "@/lib/admin/types";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  active: z.boolean(),
});

type CategoryValues = z.infer<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.get<Category[]>("admin/categories"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button>Nova categoria</Button>} />
          <DialogContent>
            <CategoryForm
              onSuccess={() => {
                setCreateOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar as categorias.</p>
      )}

      {query.data && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma categoria cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {query.data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    {category.active ? (
                      <Badge variant="secondary">Ativa</Badge>
                    ) : (
                      <Badge variant="outline">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditingCategory(category)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              onSuccess={() => {
                setEditingCategory(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({
  category,
  onSuccess,
}: {
  category?: Category;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", active: category?.active ?? true },
  });

  useEffect(() => {
    if (category) reset({ name: category.name, active: category.active });
  }, [category, reset]);

  const mutation = useMutation({
    mutationFn: (values: CategoryValues) =>
      isEdit
        ? apiClient.patch<Category>(`admin/categories/${category!.id}`, values)
        : apiClient.post<Category>("admin/categories", values),
    onSuccess,
    onError: (error) => {
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível salvar a categoria.",
      });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-name">Nome</Label>
          <Input id="category-name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="category-active"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="category-active" className="font-normal">
            Categoria ativa
          </Label>
        </div>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar categoria"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
