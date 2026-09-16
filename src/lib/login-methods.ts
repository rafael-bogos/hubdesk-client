export type DefaultLoginMethod = "google" | "custom" | "email";

export type LoginMethods = {
  emailPasswordEnabled: boolean;
  googleEnabled: boolean;
  customOAuthEnabled: boolean;
  customOAuthProviderId: string | null;
  customOAuthProviderName: string | null;
  customOAuthLogoUrl: string | null;
  defaultMethod: DefaultLoginMethod;
};

const FALLBACK: LoginMethods = {
  emailPasswordEnabled: true,
  googleEnabled: false,
  customOAuthEnabled: false,
  customOAuthProviderId: null,
  customOAuthProviderName: null,
  customOAuthLogoUrl: null,
  defaultMethod: "email",
};

// Endpoint público (sem cookie/token) — consultado antes do login pra saber
// quais botões mostrar. Se o backend estiver fora do ar, cai pro e-mail/senha
// (nunca deixa a tela de login sem nenhuma forma de entrar).
export async function getLoginMethods(): Promise<LoginMethods> {
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/auth/login-methods`, {
      cache: "no-store",
    });

    if (!response.ok) return FALLBACK;

    return (await response.json()) as LoginMethods;
  } catch {
    return FALLBACK;
  }
}
