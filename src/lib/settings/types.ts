export interface NotificationPreferences {
  emailOnTicketUpdated: boolean;
  emailOnTicketClosed: boolean;
  emailOnSlaWarning: boolean;
}

export interface UserProfile {
  name: string;
  avatarUrl: string | null;
}
