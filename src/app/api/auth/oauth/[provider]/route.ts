import { NextRequest, NextResponse } from "next/server";

// Chamado a partir de um <a href> (navegação de página inteira). Redireciona
// o navegador DIRETO pro backend (`/auth/oauth/start`), sem passar por um
// fetch server-to-server aqui: o better-auth grava um cookie de state/PKCE na
// resposta daquela rota, e o navegador precisa recebê-lo de verdade — um
// fetch feito pelo servidor do Next.js não repassa esse cookie pro navegador,
// o que causava "state_mismatch" no callback do Google.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  return NextResponse.redirect(
    `${process.env.BACKEND_API_URL}/auth/oauth/start?provider=${encodeURIComponent(provider)}`,
  );
}
