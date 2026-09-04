import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackToTicketsLink() {
  return (
    <Link
      href="/tickets"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Voltar para chamados
    </Link>
  );
}
