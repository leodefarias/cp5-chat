import { get, ref, remove, runTransaction, set, update } from 'firebase/database';
import type { ConversationType } from '../types/chat';
import { getRealtimeDb } from './firebase';

type ConversationMeta = {
  type: ConversationType;
  ownerId: string;
  memberLimit: number;
  memberCount: number;
  members: Record<string, true>;
};

function isMeta(value: unknown): value is ConversationMeta {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.type === 'direct' || record.type === 'group') &&
    typeof record.ownerId === 'string' &&
    typeof record.memberLimit === 'number' &&
    typeof record.memberCount === 'number' &&
    typeof record.members === 'object' &&
    record.members !== null
  );
}

function memberMap(uids: readonly string[]): Record<string, true> {
  return Object.fromEntries(uids.map((uid) => [uid, true as const]));
}

export async function createConversationAccess(input: {
  conversationId: string;
  type: ConversationType;
  ownerId: string;
  memberIds: readonly string[];
  memberLimit: number;
}): Promise<void> {
  const database = getRealtimeDb();
  const metaRef = ref(database, `conversationMeta/${input.conversationId}`);
  const meta = {
    type: input.type,
    ownerId: input.ownerId,
    memberLimit: input.memberLimit,
    memberCount: input.memberIds.length,
    members: memberMap(input.memberIds),
  };

  try {
    await set(metaRef, meta);
  } catch (error) {
    const existing = await get(metaRef).catch(() => null);
    if (!existing?.exists()) {
      throw error;
    }
  }

  const grants: Record<string, true> = {};
  for (const uid of input.memberIds) {
    grants[`conversationAccess/${input.conversationId}/${uid}`] = true;
  }

  await update(ref(database), grants);
}

export async function grantMemberAccess(conversationId: string, uid: string, memberLimit: number): Promise<void> {
  const database = getRealtimeDb();
  const result = await runTransaction(ref(database, `conversationMeta/${conversationId}`), (current) => {
    if (!isMeta(current)) {
      return;
    }

    if (current.members[uid]) {
      return current;
    }

    if (current.memberCount >= memberLimit || current.memberCount >= current.memberLimit) {
      return;
    }

    return {
      ...current,
      memberLimit,
      memberCount: current.memberCount + 1,
      members: { ...current.members, [uid]: true },
    };
  });

  if (!result.committed) {
    throw new Error('GROUP_FULL');
  }

  await update(ref(database), {
    [`conversationAccess/${conversationId}/${uid}`]: true,
  });
}

export async function revokeMemberAccess(conversationId: string, uid: string): Promise<void> {
  const database = getRealtimeDb();
  await runTransaction(ref(database, `conversationMeta/${conversationId}`), (current) => {
    if (!isMeta(current) || !current.members[uid]) {
      return current === null ? undefined : current;
    }

    const members = { ...current.members };
    delete members[uid];
    return {
      ...current,
      memberCount: Math.max(0, current.memberCount - 1),
      members,
    };
  });

  await remove(ref(database, `conversationAccess/${conversationId}/${uid}`));
}

export async function updateAccessLimit(conversationId: string, memberLimit: number, memberCount: number): Promise<void> {
  const database = getRealtimeDb();
  await runTransaction(ref(database, `conversationMeta/${conversationId}`), (current) => {
    if (!isMeta(current)) {
      return;
    }

    if (memberLimit < current.memberCount) {
      return;
    }

    return {
      ...current,
      memberLimit,
      memberCount,
    };
  });
}
