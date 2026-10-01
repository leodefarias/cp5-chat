import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTarget(value: unknown): MessageTarget | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'conversation') {
    return { type: 'conversation' };
  }

  if (value.type === 'member' && typeof value.memberId === 'string' && value.memberId.length > 0) {
    return { type: 'member', memberId: value.memberId };
  }

  return null;
}

function parseMentionedIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return null;
  }

  return [...value];
}

function parseConversationType(value: unknown): ConversationType | null {
  if (value === 'direct' || value === 'group') {
    return value;
  }

  return null;
}

export function parseChatMessage(id: string, conversationId: string, value: unknown): ChatMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  const conversationType = parseConversationType(value.conversationType);
  const target = parseTarget(value.target);
  const mentionedUserIds = value.mentionedUserIds == null ? [] : parseMentionedIds(value.mentionedUserIds);

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
    id,
    conversationId,
    conversationType,
    senderId: value.senderId,
    text: value.text,
    target,
    mentionedUserIds,
    createdAt: value.createdAt,
  };
}

export function parseMessageMap(conversationId: string, value: unknown): ChatMessage[] {
  if (!isRecord(value)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  for (const [id, raw] of Object.entries(value)) {
    const message = parseChatMessage(id, conversationId, raw);
    if (message) {
      messages.push(message);
    }
  }

  return messages;
}
