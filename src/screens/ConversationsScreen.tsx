import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useNotifications } from '../hooks/useNotifications';
import type { AppStackParamList } from '../types/navigation';
import { colors, spacing } from '../theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Conversations'>;

function notificationHint(state: ReturnType<typeof useNotifications>): string {
  if (!state) {
    return '';
  }

  if (state.state === 'permission-denied') {
    return 'Permissão de notificação negada. Você continua recebendo as mensagens no chat.';
  }

  if (state.state === 'unavailable') {
    return 'Este dispositivo não entregou um token de push. Use um aparelho físico ou um development build.';
  }

  if (state.state === 'failed') {
    return state.message;
  }

  return '';
}

export function ConversationsScreen({ navigation }: Props) {
  const { firebaseUser, logout } = useAuth();
  const uid = firebaseUser?.uid ?? null;
  const { conversations, loading, error } = useConversations(uid);
  const notificationStatus = useNotifications(Boolean(uid));
  const hint = notificationHint(notificationStatus);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  if (loading) {
    return <Loading label="Carregando conversas..." />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.actions}>
        <PrimaryButton label="Nova conversa" onPress={() => navigation.navigate('Users', { purpose: 'direct' })} />
        <PrimaryButton label="Novo grupo" variant="ghost" onPress={() => navigation.navigate('GroupForm', {})} />
        <PrimaryButton label="Sair" variant="ghost" onPress={handleLogout} />
      </View>
      <ErrorMessage message={error} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={conversations.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={<EmptyState title="Nenhuma conversa" description="Comece uma conversa individual ou crie um grupo." />}
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  actions: { paddingTop: spacing.sm },
  list: { paddingBottom: spacing.xl },
  empty: { flexGrow: 1, justifyContent: 'center' },
  hint: { color: colors.muted, marginBottom: spacing.sm, lineHeight: 20 },
});
