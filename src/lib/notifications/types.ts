export type NotificationType = "TICKET_CREATED" | "TICKET_UPDATED";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: string;
  ticketNumber: number;
  read: boolean;
  createdAt: string;
}

export interface ListNotificationsResult {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
