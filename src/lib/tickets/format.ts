export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Backend ainda não retorna nome/e-mail do solicitante/responsável nas respostas
// de ticket (só o id da FK) — mostramos um id curto até isso ser adicionado.
export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

// Valor no formato que <input type="datetime-local"> espera (hora local, sem
// timezone) — usado pro agendamento de fechamento automático (PENDING_CLOSURE).
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Prazo de SLA relativo a agora — "vence em 2h" (futuro) ou "estourado há 1h"
// (passado). Só desce a um nível de granularidade (a maior unidade) porque é
// pra um relance rápido num badge, não um cronômetro exato.
export function formatRemaining(dueAtIso: string): string {
  const diffMs = new Date(dueAtIso).getTime() - Date.now();
  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minutes = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / 86_400_000);

  let amount: string;
  if (minutes < 60) amount = `${Math.max(minutes, 1)}min`;
  else if (hours < 24) amount = `${hours}h`;
  else amount = `${days}d`;

  return isPast ? `estourado há ${amount}` : `vence em ${amount}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
