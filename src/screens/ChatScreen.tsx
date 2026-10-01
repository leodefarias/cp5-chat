import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { getDirectConversation } from '../services/chatService';
import { getGroup } from '../services/groupService';
import { subscribePublicProfiles } from '../services/userService';
import type { MessageTarget } from '../types/chat';
import type { ChatGroup } from '../types/group';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { toUserMessage } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationType } = route.params;
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';
  const { messages, loading, error, sending, send } = useChat(conversationId, conversationType, uid);
  const [draft, setDraft] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [otherId, setOtherId] = useState('');
  const [target, setTarget] = useState<MessageTarget>({ type: 'conversation' });
  const [mentionOpen, setMentionOpen] = useState(false);
  const [headerError, setHeaderError] = useState('');
  const listRef = useRef<FlatList<(typeof messages)[number]>>(null);

  useEffect(() => subscribePublicProfiles(setProfiles, () => undefined), []);

  useEffect(() => {
    let active = true;
    const load = conversationType === 'group'
      ? getGroup(conversationId).then((next) => {
          if (active) {
            setGroup(next);
          }
        })
      : getDirectConversation(conversationId).then((next) => {
          if (!active || !next) {
            return;
          }

          setOtherId(next.participants.find((participant) => participant !== uid) ?? '');
        });

    load.catch((failure: unknown) => {
      if (active) {
        setHeaderError(toUserMessage(failure));
      }
    });

    return () => {
      active = false;
    };
  }, [conversationId, conversationType, uid]);

  const names = useMemo(() => new Map(profiles.map((profile) => [profile.uid, profile])), [profiles]);
  const title = conversationType === 'group' ? group?.name || 'Grupo' : names.get(otherId)?.name || 'Conversa';
  const photoUrl = conversationType === 'group' ? group?.photoUrl || '' : names.get(otherId)?.photoUrl || '';
  const mentionId = target.type === 'member' ? target.memberId : '';
  const mentionLabel = mentionId ? names.get(mentionId)?.name || 'Integrante' : '';

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  function openHeader() {
    if (conversationType === 'group') {
      navigation.navigate('GroupMembers', { groupId: conversationId });
      return;
    }

    if (otherId) {
      navigation.navigate('Profile', { uid: otherId });
    }
  }

  async function handleSend() {
    const mentionedUserIds = target.type === 'member' ? [target.memberId] : [];
    try {
      await send(draft, target, mentionedUserIds);
      setDraft('');
      setTarget({ type: 'conversation' });
    } catch {
      // O hook já publicou a mensagem de erro e o texto permanece no campo.
    }
  }

  if (loading) {
    return <Loading label="Carregando mensagens..." />;
  }

  return (
    <View style={styles.screen}>
      <Pressable style={styles.header} onPress={openHeader}>
        <Avatar uri={photoUrl} name={title} size={40} onPress={openHeader} />
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerHint}>{conversationType === 'group' ? 'Ver integrantes' : 'Ver perfil'}</Text>
        </View>
      </Pressable>
      <ErrorMessage message={headerError || error} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length === 0 ? styles.empty : styles.messages}
        ListEmptyComponent={<EmptyState title="Nenhuma mensagem" description="Envie a primeira mensagem desta conversa." />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            mine={item.senderId === uid}
            showAuthor={conversationType === 'group'}
            authorName={names.get(item.senderId)?.name || 'Integrante'}
            targetName={item.target.type === 'member' ? names.get(item.target.memberId)?.name || 'Integrante' : ''}
          />
        )}
        />
      <ChatInput
        value={draft}
        onChangeText={setDraft}
        onSend={() => void handleSend()}
        sending={sending}
        mentionLabel={mentionLabel}
        onMention={conversationType === 'group' ? () => setMentionOpen(true) : null}
        onClearMention={() => setTarget({ type: 'conversation' })}
      />
      <Modal visible={mentionOpen} transparent animationType="slide" onRequestClose={() => setMentionOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Mencionar integrante</Text>
            {(group?.memberIds ?? [])
              .filter((memberId) => memberId !== uid)
              .map((memberId) => (
                <GroupMemberItem
                  key={memberId}
                  name={names.get(memberId)?.name || 'Integrante'}
                  photoUrl={names.get(memberId)?.photoUrl || ''}
                  owner={memberId === group?.ownerId}
                  onPress={() => {
                    setTarget({ type: 'member', memberId });
                    setMentionOpen(false);
                  }}
                />
              ))}
            <Pressable onPress={() => setMentionOpen(false)}>
              <Text style={styles.close}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  headerHint: { color: colors.muted, fontSize: 12 },
  messages: { paddingVertical: spacing.md },
  empty: { flexGrow: 1, justifyContent: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.surface, padding: spacing.md, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  close: { color: colors.primary, textAlign: 'center', fontWeight: '700', padding: spacing.md },
});
