"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/brand/logo";
import { GoogleIcon } from "@/components/icons/google-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import type { LoginMethods } from "@/lib/login-methods";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function OAuthButton({
  provider,
  label,
  icon,
}: {
  provider: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      nativeButton={false}
      // Sem filhos no <a> aqui de propósito: os filhos do Button (ícone +
      // label, abaixo) são injetados nele — um <a> com filho próprio
      // sobrescreveria e o ícone sumiria.
      render={<a href={`/api/auth/oauth/${provider}`} />}
    >
      {icon}
      {label}
    </Button>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Não foi possível entrar com esse provedor. Tente novamente.",
  session_expired: "Sua sessão expirou. Entre novamente.",
};

export function LoginForm({ loginMethods }: { loginMethods: LoginMethods }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const oauthError = searchParams.get("error");
  const errorMessage = serverError ?? (oauthError ? ERROR_MESSAGES[oauthError] : null);

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setServerError(data?.error ?? "Não foi possível entrar. Tente novamente.");
      return;
    }

    router.push("/tickets");
    router.refresh();
  }

  const oauthButtons: React.ReactNode[] = [];
  if (loginMethods.googleEnabled) {
    oauthButtons.push(
      <OAuthButton key="google" provider="google" label="Continuar com Google" icon={<GoogleIcon />} />,
    );
  }
  if (loginMethods.customOAuthEnabled && loginMethods.customOAuthProviderId && loginMethods.customOAuthProviderName) {
    oauthButtons.push(
      <OAuthButton
        key="custom"
        provider={loginMethods.customOAuthProviderId}
        label={`Continuar com ${loginMethods.customOAuthProviderName}`}
        icon={
          loginMethods.customOAuthLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo enviada pelo admin, não um asset estático do app
            <img src={loginMethods.customOAuthLogoUrl} alt="" className="size-4 object-contain" />
          ) : (
            <Building2 className="size-4" aria-hidden="true" />
          )
        }
      />,
    );
  }
  // Google é escolhido primeiro quando é o método padrão, senão mantém a
  // ordem natural (Google, depois o customizado).
  if (loginMethods.defaultMethod === "custom") oauthButtons.reverse();

  const emailFormNode = loginMethods.emailPasswordEnabled && (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            className="pl-8"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          startIcon={
            <Lock
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
          }
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} size="lg" className="mt-2">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );

  // Ordem das seções segue o método padrão escolhido pelo admin — o que for
  // padrão aparece primeiro na tela.
  const showEmailFirst = loginMethods.defaultMethod === "email" || oauthButtons.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-6 dark:bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,#0E7C66,transparent_88%),transparent),radial-gradient(45%_40%_at_85%_100%,color-mix(in_oklch,#1F2A44,transparent_90%),transparent)]"
      />
      <ThemeToggle className="absolute top-4 right-4" />

      <div className="flex w-full max-w-sm flex-col items-center gap-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <Logo size={36} />

        <Card className="w-full border-none py-8 shadow-xl shadow-black/5 ring-1 ring-foreground/[0.08] dark:shadow-black/40">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
            <CardDescription>Entre com sua conta para continuar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}

            {showEmailFirst ? (
              <>
                {emailFormNode}
                {emailFormNode && oauthButtons.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <Separator className="flex-1" />
                  </div>
                )}
                <div className="flex flex-col gap-2">{oauthButtons}</div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">{oauthButtons}</div>
                {emailFormNode && oauthButtons.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <Separator className="flex-1" />
                  </div>
                )}
                {emailFormNode}
              </>
            )}
          </CardContent>
        </Card>

        {loginMethods.emailPasswordEnabled && (
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
