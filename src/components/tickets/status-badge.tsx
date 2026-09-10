import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_LABELS, type TicketStatus } from "@/lib/tickets/types";

const STATUS_CLASSES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  WAITING: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</Badge>;
}

const STATUS_DOT_CLASSES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  WAITING: "bg-purple-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-zinc-400",
};

// Indicador compacto pra listas: a cor é só reforço visual, o nome do status
// sempre fica disponível (leitor de tela via sr-only, mouse via tooltip).
export function StatusDot({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("inline-flex", className)}>
            <span
              className={cn("size-2 rounded-full", STATUS_DOT_CLASSES[status])}
              aria-hidden="true"
            />
            <span className="sr-only">{STATUS_LABELS[status]}</span>
          </span>
        }
      />
      <TooltipContent>{STATUS_LABELS[status]}</TooltipContent>
    </Tooltip>
  );
}
