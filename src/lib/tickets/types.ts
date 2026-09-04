export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
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
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeId: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Presentes em GET /tickets e GET /tickets/:id; ausentes nas respostas de
  // mutações (status/assign), que devolvem o ticket "cru" do repositório.
  requester?: UserSummary | null;
  assignee?: UserSummary | null;
  category?: CategorySummary | null;
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
