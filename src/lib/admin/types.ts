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

export type DefaultLoginMethod = "google" | "custom" | "email";

export interface AdminLoginSettings {
  emailPasswordEnabled: boolean;

  googleEnabled: boolean;
  googleClientId: string | null;
  googleClientSecretSet: boolean;
  googleCallbackUrl: string;

  customOAuthEnabled: boolean;
  customOAuthProviderId: string | null;
  customOAuthProviderName: string | null;
  customOAuthClientId: string | null;
  customOAuthClientSecretSet: boolean;
  customOAuthAuthorizationUrl: string | null;
  customOAuthTokenUrl: string | null;
  customOAuthUserInfoUrl: string | null;
  customOAuthScopes: string | null;
  customOAuthCallbackUrl: string | null;
  customOAuthLogoUrl: string | null;

  defaultMethod: DefaultLoginMethod;
}
