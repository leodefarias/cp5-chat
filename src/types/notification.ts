import type { ConversationType } from './chat';
import type { NotificationPolicy } from './group';

export type PushProvider = 'fcm' | 'expo';

export type DevicePlatform = 'ios' | 'android' | 'web';

export type DeviceToken = {
  token: string;
  provider: PushProvider;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type NotificationNavigation = {
  conversationId: string;
  conversationType: ConversationType;
};

export type DeviceRegistrationStatus =
  | { state: 'ready'; provider: PushProvider }
  | { state: 'permission-denied' }
  | { state: 'unavailable' }
  | { state: 'failed'; message: string };
