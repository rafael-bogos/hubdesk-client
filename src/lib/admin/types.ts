import type { Role } from "@/lib/session";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Só relevante pra role AGENT — vazio significa sem restrição (vê/pode se
  // atribuir a chamado sem responsável de qualquer categoria).
  categoryIds: string[];
  avatarUrl: string | null;
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

export type CustomFieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT" | "ATTACHMENT";

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "SELECT",
  "ATTACHMENT",
];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  BOOLEAN: "Sim/Não",
  DATE: "Data",
  SELECT: "Seleção",
  ATTACHMENT: "Anexo",
};

export interface CategoryCustomField {
  id: string;
  categoryId: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  // Só relevante quando type = "SELECT".
  options: string[] | null;
  active: boolean;
  order: number;
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
  customOAuthIssuer: string | null;
  customOAuthJwksUrl: string | null;
  customOAuthCallbackUrl: string | null;
  customOAuthBackchannelLogoutUrl: string | null;
  customOAuthLogoUrl: string | null;

  defaultMethod: DefaultLoginMethod;
}

export interface AdminSlaSettings {
  lowPriorityHours: number;
  mediumPriorityHours: number;
  highPriorityHours: number;
  urgentPriorityHours: number;
  warningThresholdPercent: number;
}
