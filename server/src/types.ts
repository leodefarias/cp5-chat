export type ConversationType = 'direct' | 'group';

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type StoredMessage = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type PushProvider = 'fcm' | 'expo';

export type StoredDevice = {
  id: string;
  token: string;
  provider: PushProvider;
  enabled: boolean;
};
