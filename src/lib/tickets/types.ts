export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "PENDING_CLOSURE" | "RESOLVED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "PENDING_CLOSURE",
  "RESOLVED",
];

// Pra filtrar a fila principal (ver tickets/page.tsx): fechado tem aba
// própria, não aparece como opção de filtro de status ali.
export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "PENDING_CLOSURE"];

export const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export type SlaState = "ok" | "near_breach" | "breached";

export interface TicketSlaSummary {
  dueAt: string;
  state: SlaState;
  percentConsumed: number;
  // Enquanto o chamado estiver em WAITING (relógio de SLA congelado) — null
  // fora disso.
  pausedAt: string | null;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando",
  PENDING_CLOSURE: "Pendente de fechamento",
  RESOLVED: "Fechado",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeIds: string[];
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Só não-null enquanto status === "PENDING_CLOSURE".
  scheduledClosureAt: string | null;
  // Presentes em GET /tickets e GET /tickets/:id; ausentes nas respostas de
  // mutações (status/assign), que devolvem o ticket "cru" do repositório.
  requester?: UserSummary | null;
  assignees?: UserSummary[];
  category?: CategorySummary | null;
  sla?: TicketSlaSummary;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  commentId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ListTicketsResult {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TicketDetail {
  ticket: Ticket;
  comments: Comment[];
  attachments: Attachment[];
}
