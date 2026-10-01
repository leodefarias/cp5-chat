import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import type { ChatGroup, GroupDraft, NotificationPolicy } from '../types/group';
import {
  applyMemberAddition,
  applyMemberRemoval,
  GroupLimitError,
  validateGroupDraft,
  validateMemberLimit,
} from '../utils/groupValidation';
import { createConversationAccess, grantMemberAccess, revokeMemberAccess, updateAccessLimit } from './accessService';
import { getFirestoreDb } from './firebase';
import { ensureGroupPeer, linkGroupPeers, unlinkGroupPeer } from './userService';

const POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && POLICIES.some((policy) => policy === value);
}

function parseGroup(id: string, value: unknown): ChatGroup | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (
    typeof data.name !== 'string' ||
    typeof data.photoUrl !== 'string' ||
    typeof data.ownerId !== 'string' ||
    !Array.isArray(data.memberIds) ||
    !data.memberIds.every((item) => typeof item === 'string') ||
    typeof data.memberLimit !== 'number' ||
    !isPolicy(data.notificationPolicy) ||
    typeof data.createdAt !== 'number' ||
    typeof data.updatedAt !== 'number'
  ) {
    return null;
  }

  return {
    id,
    name: data.name,
    photoUrl: data.photoUrl,
    ownerId: data.ownerId,
    memberIds: [...data.memberIds],
    memberLimit: data.memberLimit,
    notificationPolicy: data.notificationPolicy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function requireGroup(groupId: string): Promise<ChatGroup> {
  const snapshot = await getDoc(doc(getFirestoreDb(), 'groups', groupId));
  const group = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
  if (!group) {
    throw new Error('GROUP_NOT_FOUND');
  }

  return group;
}

function assertOwner(group: ChatGroup, actorId: string): void {
  if (group.ownerId !== actorId) {
    throw new Error('NOT_OWNER');
  }
}

export async function createGroup(ownerId: string, draft: GroupDraft): Promise<string> {
  const memberIds = [...new Set([ownerId, ...draft.memberIds])];
  const validation = validateGroupDraft({
    name: draft.name,
    memberIds,
    ownerId,
    memberLimit: draft.memberLimit,
  });
  if (validation) {
    throw new GroupLimitError(validation);
  }

  const db = getFirestoreDb();
  const ref = doc(collection(db, 'groups'));
  const now = Date.now();
  const group: Omit<ChatGroup, 'id'> = {
    name: draft.name.trim(),
    photoUrl: draft.photoUrl,
    ownerId,
    memberIds,
    memberLimit: draft.memberLimit,
    notificationPolicy: draft.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, group);
  try {
    await createConversationAccess({
      conversationId: ref.id,
      type: 'group',
      ownerId,
      memberIds,
      memberLimit: draft.memberLimit,
    });
    await linkGroupPeers(memberIds, ref.id, ownerId);
  } catch (error) {
    await deleteDoc(ref);
    throw error;
  }

  return ref.id;
}

export async function getGroup(groupId: string): Promise<ChatGroup | null> {
  try {
    return await requireGroup(groupId);
  } catch (error) {
    if (error instanceof Error && error.message === 'GROUP_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}

export function subscribeMyGroups(
  uid: string,
  onChange: (groups: ChatGroup[]) => void,
  onError: (error: unknown) => void,
): () => void {
  const groupsQuery = query(collection(getFirestoreDb(), 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((document) => parseGroup(document.id, document.data()))
        .filter((group): group is ChatGroup => group !== null);
      onChange(groups);
    },
    onError,
  );
}

export async function updateGroupDetails(
  groupId: string,
  actorId: string,
  input: { name: string; photoUrl: string; notificationPolicy: NotificationPolicy },
): Promise<void> {
  const db = getFirestoreDb();
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'groups', groupId);
    const snapshot = await transaction.get(ref);
    const group = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
    if (!group) {
      throw new Error('GROUP_NOT_FOUND');
    }

    assertOwner(group, actorId);
    if (!input.name.trim()) {
      throw new GroupLimitError('Informe o nome do grupo.');
    }

    transaction.update(ref, {
      name: input.name.trim(),
      photoUrl: input.photoUrl,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    });
  });
}

export async function updateMemberLimit(groupId: string, actorId: string, memberLimit: number): Promise<void> {
  const db = getFirestoreDb();
  let memberCount = 0;
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'groups', groupId);
    const snapshot = await transaction.get(ref);
    const group = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
    if (!group) {
      throw new Error('GROUP_NOT_FOUND');
    }

    assertOwner(group, actorId);
    const reason = validateMemberLimit(memberLimit, group.memberIds.length);
    if (reason) {
      throw new GroupLimitError(reason);
    }

    memberCount = group.memberIds.length;
    transaction.update(ref, { memberLimit, updatedAt: Date.now() });
  });

  await updateAccessLimit(groupId, memberLimit, memberCount);
}

export async function addGroupMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  const db = getFirestoreDb();
  let memberLimit = 0;
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'groups', groupId);
    const snapshot = await transaction.get(ref);
    const group = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
    if (!group) {
      throw new Error('GROUP_NOT_FOUND');
    }

    assertOwner(group, actorId);
    const nextMembers = applyMemberAddition(group.memberIds, group.memberLimit, memberId);
    memberLimit = group.memberLimit;
    transaction.update(ref, { memberIds: nextMembers, updatedAt: Date.now() });
  });

  try {
    await grantMemberAccess(groupId, memberId, memberLimit);
    const group = await requireGroup(groupId);
    for (const currentId of group.memberIds) {
      if (currentId !== memberId) {
        await ensureGroupPeer(currentId, memberId, groupId, group.ownerId);
      }
    }
  } catch (error) {
    await revokeMemberAccess(groupId, memberId).catch(() => undefined);
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, 'groups', groupId);
      const snapshot = await transaction.get(ref);
      const group = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
      if (!group) {
        return;
      }

      transaction.update(ref, {
        memberIds: group.memberIds.filter((id) => id !== memberId),
        updatedAt: Date.now(),
      });
    });
    throw error;
  }
}

export async function removeGroupMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  const group = await requireGroup(groupId);
  assertOwner(group, actorId);
  applyMemberRemoval(group.memberIds, memberId, group.ownerId);

  const db = getFirestoreDb();
  let remaining: string[] = [];
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'groups', groupId);
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists() ? parseGroup(groupId, snapshot.data()) : null;
    if (!current) {
      throw new Error('GROUP_NOT_FOUND');
    }

    assertOwner(current, actorId);
    const nextMembers = applyMemberRemoval(current.memberIds, memberId, current.ownerId);
    remaining = nextMembers;
    transaction.update(ref, {
      memberIds: nextMembers,
      updatedAt: Date.now(),
    });
  });

  await revokeMemberAccess(groupId, memberId);
  for (const currentId of remaining) {
    await unlinkGroupPeer(currentId, memberId, groupId);
  }
}
