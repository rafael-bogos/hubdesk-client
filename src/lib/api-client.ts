// Wrapper de fetch usado pelo lado do cliente. Sempre chama a mesma origem
// (/api/backend/...), nunca o backend diretamente — os cookies httpOnly de
// sessão são enviados automaticamente pelo navegador.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    // Sessão inválida (expirou, ou foi revogada em algum outro lugar — logout
    // manual, back-channel logout do provedor OAuth, etc.) — a rota de
    // /api/backend já tentou renovar via refresh token e não conseguiu, e já
    // limpou os cookies. Sem isso, cada card/lista da página falhava sozinho
    // com seu próprio "não foi possível carregar", deixando a tela toda
    // (sidebar, header) de pé como se a sessão ainda existisse — confuso e,
    // com várias queries falhando ao mesmo tempo, quebrava o layout. Redireciona
    // pra tela de login de uma vez, igual a qualquer outra sessão expirada.
    if (typeof window !== "undefined") {
      // Recarregamento de página inteira de propósito (não router.push) — zera
      // todo estado de client (cache do react-query incluso) que dependia da
      // sessão que acabou de cair.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login?error=session_expired";
    }
    // Nunca resolve: a navegação acima já tira esta página do ar, então não
    // há motivo pra deixar o caller renderizar um estado de erro por uma
    // fração de segundo antes do redirect completar.
    return new Promise<T>(() => {});
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.error ?? "Erro ao comunicar com o servidor", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
