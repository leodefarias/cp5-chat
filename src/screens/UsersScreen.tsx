import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { openDirectConversation } from '../services/chatService';
import { subscribePublicProfiles } from '../services/userService';
import { memberPicker } from '../state/memberPicker';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { toUserMessage } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

export function UsersScreen({ navigation, route }: Props) {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';
  const picking = route.params.purpose === 'pick';
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [selected, setSelected] = useState<string[]>(() => memberPicker.get());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');

  useEffect(() => subscribePublicProfiles(
    (next) => {
      setProfiles(next);
      setLoading(false);
    },
    (failure) => {
      setError(toUserMessage(failure));
      setLoading(false);
    },
  ), []);

  useEffect(() => memberPicker.subscribe(setSelected), []);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return profiles.filter((profile) => {
      if (profile.uid === uid) {
        return false;
      }

      if (!term) {
        return true;
      }

      return profile.name.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [profiles, query, uid]);

  async function startDirect(profile: PublicProfile) {
    if (profile.uid === uid) {
      return;
    }

    setOpening(profile.uid);
    setError('');
    try {
      const conversationId = await openDirectConversation(uid, profile.uid);
      navigation.replace('Chat', { conversationId, conversationType: 'direct' });
    } catch (failure) {
      setError(toUserMessage(failure));
    } finally {
      setOpening('');
    }
  }

  if (loading) {
    return <Loading label="Carregando usuários..." />;
  }

  return (
    <View style={styles.screen}>
      <TextField label="Buscar" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Nome" />
      <ErrorMessage message={error} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={visible.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum usuário"
            description={query.trim() ? 'Ninguém encontrado com esse nome.' : 'Ainda não há outras pessoas cadastradas.'}
          />
        }
        renderItem={({ item }) => (
          <GroupMemberItem
            name={item.name}
            photoUrl={item.photoUrl}
            owner={false}
            selected={picking && selected.includes(item.uid)}
            disabled={opening === item.uid}
            actionLabel={opening === item.uid ? 'Abrindo...' : undefined}
            onPress={() => {
              if (item.uid === uid) {
                return;
              }

              if (picking) {
                memberPicker.toggle(item.uid);
                return;
              }

              void startDirect(item);
            }}
          />
        )}
      />
      {picking ? <PrimaryButton label="Confirmar integrantes" onPress={() => navigation.goBack()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  empty: { flexGrow: 1, justifyContent: 'center' },
});
