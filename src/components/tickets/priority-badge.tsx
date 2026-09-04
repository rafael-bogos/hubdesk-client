import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type TicketPriority } from "@/lib/tickets/types";

const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  LOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge className={PRIORITY_CLASSES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
