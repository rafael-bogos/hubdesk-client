"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiClient } from "@/lib/api-client";
import type { AdminLoginSettings, DefaultLoginMethod } from "@/lib/admin/types";

const settingsSchema = z.object({
  emailPasswordEnabled: z.boolean(),
  defaultMethod: z.enum(["google", "custom", "email"]),

  googleEnabled: z.boolean(),
  googleClientId: z.string(),
  googleClientSecret: z.string(),

  customOAuthEnabled: z.boolean(),
  customOAuthProviderId: z.string(),
  customOAuthProviderName: z.string(),
  customOAuthClientId: z.string(),
  customOAuthClientSecret: z.string(),
  customOAuthAuthorizationUrl: z.string(),
  customOAuthTokenUrl: z.string(),
  customOAuthUserInfoUrl: z.string(),
  customOAuthScopes: z.string(),
  customOAuthIssuer: z.string(),
  customOAuthJwksUrl: z.string(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const DEFAULT_METHOD_LABELS: Record<DefaultLoginMethod, string> = {
  google: "Google",
  custom: "OAuth customizado",
  email: "E-mail e senha",
};

const EMPTY_VALUES: SettingsValues = {
  emailPasswordEnabled: true,
  defaultMethod: "google",
  googleEnabled: false,
  googleClientId: "",
  googleClientSecret: "",
  customOAuthEnabled: false,
  customOAuthProviderId: "",
  customOAuthProviderName: "",
  customOAuthClientId: "",
  customOAuthClientSecret: "",
  customOAuthAuthorizationUrl: "",
  customOAuthTokenUrl: "",
  customOAuthUserInfoUrl: "",
  customOAuthScopes: "",
  customOAuthIssuer: "",
  customOAuthJwksUrl: "",
};

function toFormValues(settings: AdminLoginSettings): SettingsValues {
  return {
    emailPasswordEnabled: settings.emailPasswordEnabled,
    defaultMethod: settings.defaultMethod,
    googleEnabled: settings.googleEnabled,
    googleClientId: settings.googleClientId ?? "",
    googleClientSecret: "",
    customOAuthEnabled: settings.customOAuthEnabled,
    customOAuthProviderId: settings.customOAuthProviderId ?? "",
    customOAuthProviderName: settings.customOAuthProviderName ?? "",
    customOAuthClientId: settings.customOAuthClientId ?? "",
    customOAuthClientSecret: "",
    customOAuthAuthorizationUrl: settings.customOAuthAuthorizationUrl ?? "",
    customOAuthTokenUrl: settings.customOAuthTokenUrl ?? "",
    customOAuthUserInfoUrl: settings.customOAuthUserInfoUrl ?? "",
    customOAuthScopes: settings.customOAuthScopes ?? "",
    customOAuthIssuer: settings.customOAuthIssuer ?? "",
    customOAuthJwksUrl: settings.customOAuthJwksUrl ?? "",
  };
}

export default function AdminLoginSettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["admin-login-settings"],
    queryFn: () => apiClient.get<AdminLoginSettings>("admin/login-settings"),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: EMPTY_VALUES,
  });

  // `reset` (não a prop `values`) pra repopular o form quando os dados da
  // query chegam ou mudam (primeira carga e depois de salvar) — campos
  // registrados via Controller (os Checkbox/Select boolean) não pegavam
  // atualização vindas só da prop `values`.
  useEffect(() => {
    if (query.data) reset(toFormValues(query.data));
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsValues) => {
      const payload: Record<string, unknown> = {
        emailPasswordEnabled: values.emailPasswordEnabled,
        defaultMethod: values.defaultMethod,
        googleEnabled: values.googleEnabled,
        googleClientId: values.googleClientId || undefined,
        customOAuthEnabled: values.customOAuthEnabled,
        customOAuthProviderId: values.customOAuthProviderId || undefined,
        customOAuthProviderName: values.customOAuthProviderName || undefined,
        customOAuthClientId: values.customOAuthClientId || undefined,
        customOAuthAuthorizationUrl: values.customOAuthAuthorizationUrl || undefined,
        customOAuthTokenUrl: values.customOAuthTokenUrl || undefined,
        customOAuthUserInfoUrl: values.customOAuthUserInfoUrl || undefined,
        customOAuthScopes: values.customOAuthScopes || undefined,
        customOAuthIssuer: values.customOAuthIssuer || undefined,
        customOAuthJwksUrl: values.customOAuthJwksUrl || undefined,
      };
      // Secret vazio = manter o já salvo — só manda quando o admin digitou algo.
      if (values.googleClientSecret) payload.googleClientSecret = values.googleClientSecret;
      if (values.customOAuthClientSecret) payload.customOAuthClientSecret = values.customOAuthClientSecret;

      return apiClient.patch<AdminLoginSettings>("admin/login-settings", payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-login-settings"], data);
      reset(toFormValues(data));
      setSaved(true);
    },
    onError: (error) => {
      setSaved(false);
      setError("root", {
        message: error instanceof ApiError ? error.message : "Não foi possível salvar as configurações.",
      });
    },
  });

  const googleEnabled = useWatch({ control, name: "googleEnabled" });
  const customOAuthEnabled = useWatch({ control, name: "customOAuthEnabled" });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">Não foi possível carregar as configurações de login.</p>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit((values) => {
        setSaved(false);
        mutation.mutate(values);
      })}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-muted-foreground">
            Escolha como as pessoas podem entrar no Hubdesk.
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Método em destaque na tela de login</Label>
        <Controller
          name="defaultMethod"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v as DefaultLoginMethod)}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) =>
                    value ? DEFAULT_METHOD_LABELS[value as DefaultLoginMethod] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="custom">OAuth customizado</SelectItem>
                <SelectItem value="email">E-mail e senha</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>E-mail e senha</CardTitle>
          <CardDescription>Login tradicional, com conta criada no próprio Hubdesk.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Controller
              name="emailPasswordEnabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="email-enabled"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="email-enabled" className="font-normal">
              Habilitado
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google</CardTitle>
          <CardDescription>
            Login com uma conta Google (OAuth 2.0). Crie o Client ID e o Client secret em{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              console.cloud.google.com/apis/credentials
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Controller
              name="googleEnabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="google-enabled"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="google-enabled" className="font-normal">
              Habilitado
            </Label>
          </div>

          {googleEnabled && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="google-client-id">Client ID</Label>
                <Input id="google-client-id" {...register("googleClientId")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="google-client-secret">
                  Client secret
                  {query.data.googleClientSecretSet && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      (já configurado — deixe em branco para manter)
                    </span>
                  )}
                </Label>
                <PasswordInput
                  id="google-client-secret"
                  placeholder={query.data.googleClientSecretSet ? "••••••••" : ""}
                  {...register("googleClientSecret")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  URL de callback (cole no Google Cloud Console)
                </Label>
                <code className="w-fit rounded-md bg-muted px-2 py-1 text-xs break-all">
                  {query.data.googleCallbackUrl}
                </code>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth customizado</CardTitle>
          <CardDescription>
            Conecte seu próprio provedor OAuth2/OIDC (Keycloak, Okta, Azure AD, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Controller
              name="customOAuthEnabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="custom-enabled"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="custom-enabled" className="font-normal">
              Habilitado
            </Label>
          </div>

          {customOAuthEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-provider-name">Nome exibido</Label>
                  <Input
                    id="custom-provider-name"
                    placeholder="Ex: Keycloak"
                    {...register("customOAuthProviderName")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-provider-id">Provider ID</Label>
                  <Input
                    id="custom-provider-id"
                    placeholder="ex: keycloak (minúsculas, sem espaço)"
                    {...register("customOAuthProviderId")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-client-id">Client ID</Label>
                  <Input id="custom-client-id" {...register("customOAuthClientId")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-client-secret">Client secret</Label>
                  <PasswordInput
                    id="custom-client-secret"
                    placeholder={query.data.customOAuthClientSecretSet ? "••••••••" : ""}
                    {...register("customOAuthClientSecret")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {query.data.customOAuthClientSecretSet
                      ? "Já configurado — deixe em branco para manter."
                      : "Opcional — deixe em branco se o provedor for público/PKCE-only (ex: Comhub ID)."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-auth-url">URL de autorização</Label>
                <Input
                  id="custom-auth-url"
                  placeholder="https://.../authorize"
                  {...register("customOAuthAuthorizationUrl")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-token-url">URL de token</Label>
                <Input
                  id="custom-token-url"
                  placeholder="https://.../token"
                  {...register("customOAuthTokenUrl")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-userinfo-url">URL de userinfo</Label>
                <Input
                  id="custom-userinfo-url"
                  placeholder="https://.../userinfo"
                  {...register("customOAuthUserInfoUrl")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-scopes">Escopos (separados por espaço)</Label>
                <Input
                  id="custom-scopes"
                  placeholder="openid email profile"
                  {...register("customOAuthScopes")}
                />
              </div>
              {query.data.customOAuthCallbackUrl && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    URL de callback (cole no seu provedor)
                  </Label>
                  <code className="w-fit rounded-md bg-muted px-2 py-1 text-xs break-all">
                    {query.data.customOAuthCallbackUrl}
                  </code>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Back-channel logout (opcional)</p>
                  <p className="text-xs text-muted-foreground">
                    Se o provedor sair, ele avisa o Hubdesk pra derrubar a sessão local também. Preencha o
                    issuer e a URL de JWKS pra habilitar — sem isso, nada é verificado.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="custom-issuer">Issuer</Label>
                    <Input
                      id="custom-issuer"
                      placeholder="https://seu-provedor.com"
                      {...register("customOAuthIssuer")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="custom-jwks-url">URL de JWKS</Label>
                    <Input
                      id="custom-jwks-url"
                      placeholder="https://.../.well-known/jwks.json"
                      {...register("customOAuthJwksUrl")}
                    />
                  </div>
                </div>
                {query.data.customOAuthBackchannelLogoutUrl && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      URL de back-channel logout (cole no seu provedor)
                    </Label>
                    <code className="w-fit rounded-md bg-muted px-2 py-1 text-xs break-all">
                      {query.data.customOAuthBackchannelLogoutUrl}
                    </code>
                  </div>
                )}
              </div>

              <LogoUploader logoUrl={query.data.customOAuthLogoUrl} />
            </>
          )}
        </CardContent>
      </Card>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      {saved && !errors.root && <p className="text-sm text-emerald-600">Configurações salvas.</p>}
    </form>
  );
}

// Logo do botão do OAuth customizado — Google já tem o ícone dele próprio,
// então isso só existe pro provedor customizado. Upload/remoção mexem direto
// no arquivo (fora do form de texto acima), por isso mutations próprias.
function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = (data: AdminLoginSettings) => {
    queryClient.setQueryData(["admin-login-settings"], data);
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<AdminLoginSettings>("admin/login-settings/logo", formData);
    },
    onSuccess: invalidate,
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar a logo.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete<AdminLoginSettings>("admin/login-settings/logo"),
    onSuccess: invalidate,
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover a logo.");
    },
  });

  const isPending = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Logo do botão (opcional)</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem enviada pelo admin, servida pelo backend
            <img src={logoUrl} alt="Logo atual" className="size-full rounded-md object-contain p-1" />
          ) : (
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
          {uploadMutation.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {logoUrl ? "Trocar logo" : "Enviar logo"}
        </Button>
        {logoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <X className="size-3.5" aria-hidden="true" />
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG, até 2 MB.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
