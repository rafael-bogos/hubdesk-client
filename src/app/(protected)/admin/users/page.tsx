"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { RoleBadge } from "@/components/admin/role-badge";
import { UserAvatar } from "@/components/user-avatar";
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
import type { AdminUser, ListUsersResult } from "@/lib/admin/types";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { formatDateTime } from "@/lib/tickets/format";

const ALL = "ALL";
const PAGE_SIZE = 20;

const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  role: z.enum(["ADMIN", "AGENT", "CUSTOMER"]),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["ADMIN", "AGENT", "CUSTOMER"]),
  active: z.boolean(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type UpdateUserValues = z.infer<typeof updateUserSchema>;

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const roleFilter = searchParams.get("role") ?? ALL;
  const activeFilter = searchParams.get("active") ?? ALL;
  const page = Number(searchParams.get("page") ?? "1");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const query = useQuery({
    queryKey: ["admin-users", { roleFilter, activeFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (roleFilter !== ALL) params.set("role", roleFilter);
      if (activeFilter !== ALL) params.set("active", activeFilter);
      return apiClient.get<ListUsersResult>(`admin/users?${params.toString()}`);
    },
  });

  function updateFilter(key: "role" | "active", value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/admin/users?${params.toString()}`);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold">Usuários</h1>
          {query.data && (
            <Badge variant="secondary" className="rounded-full">
              {query.data.total}
            </Badge>
          )}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button>Novo usuário</Button>} />
          <DialogContent>
            <CreateUserForm
              onSuccess={() => {
                setCreateOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={roleFilter} onValueChange={(value) => updateFilter("role", value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Role">
              {(value: string | null) =>
                !value || value === ALL ? "Todas as roles" : ROLE_LABELS[value as (typeof ROLES)[number]]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={(value) => updateFilter("active", value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status">
              {(value: string | null) => {
                if (!value || value === ALL) return "Todos os status";
                return value === "true" ? "Ativos" : "Inativos";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os usuários.</p>
      )}

      {query.data && (
        <>
          <div className="overflow-x-auto rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <UsersIcon className="size-8" />
                        <p className="text-sm">Nenhum usuário encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {query.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} className="size-8 shrink-0" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{user.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge variant="secondary">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {query.data.page} de {totalPages} · {query.data.total} usuário(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(page - 1));
                  router.push(`/admin/users?${params.toString()}`);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(page + 1));
                  router.push(`/admin/users?${params.toString()}`);
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSuccess={() => {
                setEditingUser(null);
                invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "CUSTOMER" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateUserValues) => apiClient.post<AdminUser>("admin/users", values),
    onSuccess,
    onError: (error) => {
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível criar o usuário.",
      });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-name">Nome</Label>
          <Input id="new-name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-email">E-mail</Label>
          <Input id="new-email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">Senha</Label>
          <Input id="new-password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-role">Role</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? ROLE_LABELS[value as (typeof ROLES)[number]] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar usuário"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function EditUserForm({ user, onSuccess }: { user: AdminUser; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    },
  });

  useEffect(() => {
    reset({ name: user.name, email: user.email, role: user.role, active: user.active });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: UpdateUserValues) =>
      apiClient.patch<AdminUser>(`admin/users/${user.id}`, values),
    onSuccess,
    onError: (error) => {
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível salvar as alterações.",
      });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar usuário</DialogTitle>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Nome</Label>
          <Input id="edit-name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-email">E-mail</Label>
          <Input id="edit-email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-role">Role</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? ROLE_LABELS[value as (typeof ROLES)[number]] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="edit-active"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="edit-active" className="font-normal">
            Usuário ativo
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Alterar a role ou o status deste usuário invalida imediatamente as sessões ativas dele.
        </p>
        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
