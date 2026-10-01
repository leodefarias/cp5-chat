import type { MessageTarget, NotificationPolicy } from '../types.js';

export type RecipientInput = {
  conversationType: 'direct' | 'group';
  senderId: string;
  participantIds: readonly string[];
  policy: NotificationPolicy | null;
  target: MessageTarget;
  mentionedUserIds: readonly string[];
};

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function resolveRecipientIds(input: RecipientInput): string[] {
  const participants = new Set(input.participantIds);
  if (!participants.has(input.senderId)) {
    return [];
  }

  if (input.conversationType === 'direct') {
    return input.participantIds.filter((id) => id !== input.senderId);
  }

  if (input.policy === 'disabled' || input.policy === 'direct_messages_only' || input.policy === null) {
    return [];
  }

  if (input.policy === 'all_group_messages') {
    return unique(input.participantIds.filter((id) => id !== input.senderId));
  }

  if (input.policy === 'mentioned_members') {
    const selected = [...input.mentionedUserIds];
    if (input.target.type === 'member') {
      selected.push(input.target.memberId);
    }

    return unique(selected.filter((id) => id !== input.senderId && participants.has(id)));
  }

  return [];
}

export function isAlreadyExists(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const { code } = error;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
}
