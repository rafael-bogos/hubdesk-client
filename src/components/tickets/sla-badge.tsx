import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatRemaining } from "@/lib/tickets/format";
import type { SlaState, TicketSlaSummary } from "@/lib/tickets/types";

const SLA_CLASSES: Record<SlaState, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  near_breach: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  breached: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const SLA_LABELS: Record<SlaState, string> = {
  ok: "SLA em dia",
  near_breach: "SLA perto de estourar",
  breached: "SLA estourado",
};

export function SlaBadge({ sla }: { sla: TicketSlaSummary }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge className={SLA_CLASSES[sla.state]}>{formatRemaining(sla.dueAt)}</Badge>
        }
      />
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          <span>{SLA_LABELS[sla.state]}</span>
          <span>Prazo: {formatDateTime(sla.dueAt)}</span>
          {sla.pausedAt && <span>Pausado (aguardando solicitante)</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
