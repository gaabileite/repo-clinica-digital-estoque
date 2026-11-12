export const NOTIFICATIONS_ADAPTER = Symbol('NOTIFICATIONS_ADAPTER');

export type NotificationChannel = 'app' | 'email' | 'whatsapp';

/** An alert category that Stock registers in the platform (contract D-12). */
export interface NotificationCategory {
  id: string; // e.g. 'stock.critical-level'
  name: string;
  /** Channels enabled by default for this category. */
  defaultChannels: NotificationChannel[];
}

/** One alert to deliver (contract D-13). */
export interface SendNotificationInput {
  categoryId: string;
  clinicId: string;
  /** Stock decides who receives it (using the IAM adapter) and sends the user ids. */
  recipientUserIds: string[];
  title: string;
  body: string;
  /** Alerts with the same groupKey can be bundled into one summary by the platform. */
  groupKey: string;
  /** Same dedupeKey = same alert: the platform must not deliver it twice. */
  dedupeKey: string;
}

export interface NotificationsAdapter {
  /** D-12: registers (or updates) one alert category. */
  registerCategory(category: NotificationCategory): Promise<void>;

  /** D-13: sends an alert. `deduplicated` is true when this dedupeKey was already sent. */
  send(input: SendNotificationInput): Promise<{ notificationId: string; deduplicated: boolean }>;
}