import { useEffect, useMemo, useState } from 'react';
import { useGroups } from './useGroups';
import { subscribeDirectConversations, listenMessages } from '../services/chatService';
import { subscribePublicProfiles } from '../services/userService';
import type { ConversationSummary, DirectConversation } from '../types/chat';
import type { PublicProfile } from '../types/user';
import { toUserMessage } from '../utils/errors';

type Preview = {
  text: string;
  createdAt: number;
};

export function useConversations(uid: string | null) {
  const { groups, loading: groupsLoading, error: groupsError } = useGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [loadingLists, setLoadingLists] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setDirects([]);
      setProfiles([]);
      setLoadingLists(false);
      return;
    }

    let directReady = false;
    let profileReady = false;
    const finish = () => {
      if (directReady && profileReady) {
        setLoadingLists(false);
      }
    };

    const unsubscribeDirects = subscribeDirectConversations(
      uid,
      (next) => {
        setDirects(next);
        directReady = true;
        finish();
      },
      (failure) => {
        setError(toUserMessage(failure));
        setLoadingLists(false);
      },
    );
    const unsubscribeProfiles = subscribePublicProfiles(
      (next) => {
        setProfiles(next);
        profileReady = true;
        finish();
      },
      (failure) => {
        setError(toUserMessage(failure));
        setLoadingLists(false);
      },
    );

    return () => {
      unsubscribeDirects();
      unsubscribeProfiles();
    };
  }, [uid]);

  const conversationKey = useMemo(
    () => [...groups.map((group) => group.id), ...directs.map((conversation) => conversation.id)].join('|'),
    [groups, directs],
  );

  useEffect(() => {
    const ids = conversationKey ? conversationKey.split('|') : [];
    const unsubscribers = ids.map((id) =>
      listenMessages(
        id,
        (messages) => {
          const last = [...messages].sort((left, right) => left.createdAt - right.createdAt).at(-1);
          setPreviews((current) => {
            const next = { text: last?.text ?? '', createdAt: last?.createdAt ?? 0 };
            if (current[id]?.text === next.text && current[id]?.createdAt === next.createdAt) {
              return current;
            }

            return { ...current, [id]: next };
          });
        },
        () => undefined,
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [conversationKey]);

  const conversations = useMemo(() => {
    const byUid = new Map(profiles.map((profile) => [profile.uid, profile]));
    const directItems: ConversationSummary[] = directs.map((conversation) => {
      const otherId = conversation.participants.find((participant) => participant !== uid) ?? '';
      const other = byUid.get(otherId);
      const preview = previews[conversation.id];
      return {
        id: conversation.id,
        type: 'direct',
        title: other?.name || 'Conversa individual',
        photoUrl: other?.photoUrl ?? '',
        createdAt: conversation.createdAt,
        preview: preview?.text ?? '',
        previewAt: preview?.createdAt ?? conversation.createdAt,
      };
    });
    const groupItems: ConversationSummary[] = groups.map((group) => {
      const preview = previews[group.id];
      return {
        id: group.id,
        type: 'group',
        title: group.name,
        photoUrl: group.photoUrl,
        createdAt: group.createdAt,
        preview: preview?.text ?? '',
        previewAt: preview?.createdAt ?? group.updatedAt,
      };
    });

    return [...directItems, ...groupItems].sort((left, right) => right.previewAt - left.previewAt);
  }, [directs, groups, previews, profiles, uid]);

  return {
    conversations,
    profiles,
    loading: groupsLoading || loadingLists,
    error: error || groupsError,
  };
}
