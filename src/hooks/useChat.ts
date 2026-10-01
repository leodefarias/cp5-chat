import { useCallback, useEffect, useMemo, useState } from 'react';
import { listenMessages, sendMessage } from '../services/chatService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { toUserMessage } from '../utils/errors';

export function useChat(conversationId: string, conversationType: ConversationType, senderId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    const unsubscribe = listenMessages(
      conversationId,
      (next) => {
        setMessages(next);
        setLoading(false);
      },
      (failure) => {
        setError(toUserMessage(failure));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [conversationId]);

  const ordered = useMemo(
    () => [...messages].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)),
    [messages],
  );

  const send = useCallback(
    async (text: string, target: MessageTarget, mentionedUserIds: readonly string[]) => {
      setSending(true);
      setError('');
      try {
        const result = await sendMessage({
          conversationId,
          conversationType,
          senderId,
          text,
          target,
          mentionedUserIds,
        });
        if (!result.notified) {
          setError('Mensagem enviada, mas a notificação não pôde ser disparada.');
        }
      } catch (failure) {
        setError(toUserMessage(failure));
        throw failure;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, senderId],
  );

  return { messages: ordered, loading, error, sending, send };
}
