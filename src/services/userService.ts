import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { ChatUser, PublicProfile } from '../types/user';
import { buildPairId } from '../utils/conversationId';
import { getFirestoreDb } from './firebase';

type PeerDoc = {
  participantIds: [string, string];
  sources: string[];
  managedBy: string[];
  groupId?: string;
};

function sortedPair(uidA: string, uidB: string): [string, string] {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseProfile(uid: string, value: unknown): ChatUser | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (
    typeof data.name !== 'string' ||
    typeof data.email !== 'string' ||
    typeof data.phoneNumber !== 'string' ||
    typeof data.birthDate !== 'string' ||
    typeof data.photoUrl !== 'string' ||
    typeof data.createdAt !== 'number'
  ) {
    return null;
  }

  return {
    uid,
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber,
    birthDate: data.birthDate,
    photoUrl: data.photoUrl,
    createdAt: data.createdAt,
  };
}

export async function createProfile(user: ChatUser): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(db, 'users', user.uid), {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    birthDate: user.birthDate,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
  });
  await setDoc(doc(db, 'publicProfiles', user.uid), {
    name: user.name,
    photoUrl: user.photoUrl,
  });
}

export async function updatePublicPhoto(uid: string, photoUrl: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, 'users', uid), { photoUrl });
  await updateDoc(doc(db, 'publicProfiles', uid), { photoUrl });
}

export async function getProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(getFirestoreDb(), 'users', uid));
  if (!snapshot.exists()) {
    return null;
  }

  return parseProfile(uid, snapshot.data());
}

export function subscribePublicProfiles(onChange: (profiles: PublicProfile[]) => void, onError: (error: unknown) => void): () => void {
  return onSnapshot(
    collection(getFirestoreDb(), 'publicProfiles'),
    (snapshot) => {
      const profiles = snapshot.docs
        .map((document) => {
          const data: unknown = document.data();
          if (typeof data !== 'object' || data === null) {
            return null;
          }

          const record = data as Record<string, unknown>;
          if (typeof record.name !== 'string' || typeof record.photoUrl !== 'string') {
            return null;
          }

          return { uid: document.id, name: record.name, photoUrl: record.photoUrl };
        })
        .filter((profile): profile is PublicProfile => profile !== null)
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

      onChange(profiles);
    },
    onError,
  );
}

async function readPeer(uidA: string, uidB: string): Promise<PeerDoc | null> {
  const snapshot = await getDoc(doc(getFirestoreDb(), 'peers', buildPairId(uidA, uidB)));
  if (!snapshot.exists()) {
    return null;
  }

  const data: unknown = snapshot.data();
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  if (!isStringArray(record.participantIds) || record.participantIds.length !== 2 || !isStringArray(record.sources) || !isStringArray(record.managedBy)) {
    return null;
  }

  const pair = sortedPair(record.participantIds[0] ?? '', record.participantIds[1] ?? '');
  return {
    participantIds: pair,
    sources: [...record.sources],
    managedBy: [...record.managedBy],
    groupId: typeof record.groupId === 'string' ? record.groupId : undefined,
  };
}

export async function ensureDirectPeer(uidA: string, uidB: string, conversationId: string): Promise<void> {
  const db = getFirestoreDb();
  const pair = sortedPair(uidA, uidB);
  const ref = doc(db, 'peers', buildPairId(uidA, uidB));
  const source = `direct:${conversationId}`;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      transaction.set(ref, {
        participantIds: pair,
        sources: [source],
        managedBy: pair,
      });
      return;
    }

    const current = snapshot.data() as Record<string, unknown>;
    const sources = isStringArray(current.sources) ? current.sources : [];
    const managedBy = isStringArray(current.managedBy) ? current.managedBy : [];
    transaction.update(ref, {
      sources: sources.includes(source) ? sources : [...sources, source],
      managedBy: [...new Set([...managedBy, ...pair])],
    });
  });
}

export async function ensureGroupPeer(uidA: string, uidB: string, groupId: string, ownerId: string): Promise<void> {
  const db = getFirestoreDb();
  const pair = sortedPair(uidA, uidB);
  const ref = doc(db, 'peers', buildPairId(uidA, uidB));
  const source = `group:${groupId}`;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      transaction.set(ref, {
        participantIds: pair,
        sources: [source],
        managedBy: [ownerId],
        groupId,
      });
      return;
    }

    const current = snapshot.data() as Record<string, unknown>;
    const sources = isStringArray(current.sources) ? current.sources : [];
    const managedBy = isStringArray(current.managedBy) ? current.managedBy : [];
    transaction.update(ref, {
      sources: sources.includes(source) ? sources : [...sources, source],
      managedBy: managedBy.includes(ownerId) ? managedBy : [...managedBy, ownerId],
      groupId,
    });
  });
}

export async function unlinkGroupPeer(uidA: string, uidB: string, groupId: string): Promise<void> {
  const peer = await readPeer(uidA, uidB);
  if (!peer) {
    return;
  }

  const source = `group:${groupId}`;
  const sources = peer.sources.filter((item) => item !== source);
  const ref = doc(getFirestoreDb(), 'peers', buildPairId(uidA, uidB));

  if (sources.length === 0) {
    await deleteDoc(ref);
    return;
  }

  await updateDoc(ref, { sources, groupId });
}

export async function linkGroupPeers(memberIds: readonly string[], groupId: string, ownerId: string): Promise<void> {
  for (let index = 0; index < memberIds.length; index += 1) {
    for (let other = index + 1; other < memberIds.length; other += 1) {
      const left = memberIds[index];
      const right = memberIds[other];
      if (left && right) {
        await ensureGroupPeer(left, right, groupId, ownerId);
      }
    }
  }
}
