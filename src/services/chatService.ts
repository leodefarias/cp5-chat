import { get, onValue, push, ref, set } from 'firebase/database';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { ChatMessage, ConversationType, DirectConversation, MessageTarget } from '../types/chat';
import { buildDirectConversationId } from '../utils/conversationId';
import { parseMessageMap } from '../utils/messages';
import { getApiBaseUrl, postJson } from './apiClient';
import { createConversationAccess } from './accessService';
import { getFirestoreDb, getRealtimeDb } from './firebase';
import { ensureDirectPeer } from './userService';

type NotifyResponse = {
  delivered?: boolean;
  duplicate?: boolean;
};

function parseDirect(id: string, value: unknown): DirectConversation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.participantIds) || data.participantIds.length !== 2 || typeof data.createdAt !== 'number') {
    return null;
  }

  const first = data.participantIds[0];
  const second = data.participantIds[1];
  if (typeof first !== 'string' || typeof second !== 'string' || first === second) {
    return null;
  }

  const participants: [string, string] = first < second ? [first, second] : [second, first];
  return { id, type: 'direct', participants, createdAt: data.createdAt };
}

async function hasDirectAccess(conversationId: string, uid: string): Promise<boolean> {
  try {
    const snapshot = await get(ref(getRealtimeDb(), `conversationAccess/${conversationId}/${uid}`));
    return snapshot.val() === true;
  } catch {
    return false;
  }
}

export async function openDirectConversation(currentUid: string, otherUid: string): Promise<string> {
  const conversationId = buildDirectConversationId(currentUid, otherUid);
  const participants: [string, string] = currentUid < otherUid ? [currentUid, otherUid] : [otherUid, currentUid];
  const db = getFirestoreDb();
  const conversationRef = doc(db, 'directConversations', conversationId);
  const [existing, alreadyMember] = await Promise.all([
    getDoc(conversationRef),
    hasDirectAccess(conversationId, currentUid),
  ]);

  if (existing.exists() && alreadyMember) {
    return conversationId;
  }

  if (!existing.exists()) {
    try {
      await setDoc(conversationRef, {
        type: 'direct',
        participantIds: participants,
        createdAt: Date.now(),
      });
    } catch (error) {
      const created = await getDoc(conversationRef);
      if (!created.exists()) {
        throw error;
      }
    }
  }

  await Promise.all([
    createConversationAccess({
      conversationId,
      type: 'direct',
      ownerId: currentUid,
      memberIds: participants,
      memberLimit: 2,
    }),
    ensureDirectPeer(participants[0], participants[1], conversationId),
  ]);
  return conversationId;
}

export async function getDirectConversation(conversationId: string): Promise<DirectConversation | null> {
  const snapshot = await getDoc(doc(getFirestoreDb(), 'directConversations', conversationId));
  if (!snapshot.exists()) {
    return null;
  }

  return parseDirect(conversationId, snapshot.data());
}

export function subscribeDirectConversations(
  uid: string,
  onChange: (conversations: DirectConversation[]) => void,
  onError: (error: unknown) => void,
): () => void {
  const conversationsQuery = query(
    collection(getFirestoreDb(), 'directConversations'),
    where('participantIds', 'array-contains', uid),
  );

  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((document) => parseDirect(document.id, document.data()))
        .filter((conversation): conversation is DirectConversation => conversation !== null);
      onChange(conversations);
    },
    onError,
  );
}

export function listenMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: unknown) => void,
): () => void {
  return onValue(
    ref(getRealtimeDb(), `messages/${conversationId}`),
    (snapshot) => {
      onChange(parseMessageMap(conversationId, snapshot.val()));
    },
    (error) => {
      onError(error);
    },
  );
}

export async function sendMessage(input: {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: readonly string[];
}): Promise<{ messageId: string; notified: boolean }> {
  const text = input.text.trim();
  if (!text) {
    throw new Error('EMPTY_MESSAGE');
  }

  if (text.length > 2000) {
    throw new Error('MESSAGE_TOO_LONG');
  }

  const database = getRealtimeDb();
  const messageRef = push(ref(database, `messages/${input.conversationId}`));
  const messageId = messageRef.key;
  if (!messageId) {
    throw new Error('MESSAGE_NOT_CREATED');
  }

  const mentionedUserIds = [...new Set(input.mentionedUserIds)];
  await set(messageRef, {
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId: input.senderId,
    text,
    target: input.target,
    mentionedUserIds,
    createdAt: Date.now(),
  });

  if (!getApiBaseUrl()) {
    return { messageId, notified: true };
  }

  try {
    await postJson<NotifyResponse>('/notifications/messages', {
      conversationId: input.conversationId,
      messageId,
    });
    return { messageId, notified: true };
  } catch {
    return { messageId, notified: false };
  }
}
