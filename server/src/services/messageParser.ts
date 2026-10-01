import type { ConversationType, MessageTarget, NotificationPolicy, StoredDevice, StoredMessage } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTarget(value: unknown): MessageTarget | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.type === 'conversation') {
    return { type: 'conversation' };
  }

  if (value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }

  return null;
}

export function parseStoredMessage(conversationId: string, value: unknown): StoredMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const conversationType = value.conversationType === 'direct' || value.conversationType === 'group' ? value.conversationType : null;
  const target = parseTarget(value.target);
  const mentionedUserIds = value.mentionedUserIds == null
    ? []
    : Array.isArray(value.mentionedUserIds) && value.mentionedUserIds.every((item) => typeof item === 'string')
      ? [...value.mentionedUserIds]
      : null;

  if (
    !conversationType ||
    !target ||
    !mentionedUserIds ||
    typeof value.senderId !== 'string' ||
    typeof value.text !== 'string' ||
    typeof value.createdAt !== 'number'
  ) {
    return null;
  }

  return {
    conversationId,
    conversationType,
    senderId: value.senderId,
    text: value.text,
    target,
    mentionedUserIds,
    createdAt: value.createdAt,
  };
}

export function parseStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return null;
  }

  return [...value];
}

export function parsePolicy(value: unknown): NotificationPolicy | null {
  if (
    value === 'all_group_messages' ||
    value === 'mentioned_members' ||
    value === 'direct_messages_only' ||
    value === 'disabled'
  ) {
    return value;
  }

  return null;
}

export function parseDevice(id: string, value: unknown): StoredDevice | null {
  if (!isRecord(value) || typeof value.token !== 'string' || value.enabled !== true) {
    return null;
  }

  const provider = value.provider === 'fcm' || value.provider === 'expo' ? value.provider : null;
  if (!provider) {
    return null;
  }

  return { id, token: value.token, provider, enabled: true };
}

export function conversationLabel(type: ConversationType, name: string): string {
  if (type === 'group' && name.trim()) {
    return name.trim();
  }

  return 'Conversa';
}
