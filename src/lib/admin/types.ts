import type { Role } from "@/lib/session";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResult {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTicketCount {
  agentId: string;
  agentName: string;
  count: number;
}

export interface DashboardStats {
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  openTicketsByAgent: AgentTicketCount[];
  usersByRole: Record<string, number>;
}
