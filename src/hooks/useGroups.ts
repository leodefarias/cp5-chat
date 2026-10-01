import { useEffect, useState } from 'react';
import { subscribeMyGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { toUserMessage } from '../utils/errors';

export function useGroups(uid: string | null) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeMyGroups(
      uid,
      (next) => {
        setGroups(next);
        setLoading(false);
      },
      (failure) => {
        setError(toUserMessage(failure));
        setLoading(false);
      },
    );
  }, [uid]);

  return { groups, loading, error };
}
