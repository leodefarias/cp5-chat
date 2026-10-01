import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { getGroup } from '../services/groupService';
import { subscribePublicProfiles } from '../services/userService';
import type { ChatGroup } from '../types/group';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { remainingSlots } from '../utils/groupValidation';
import { toUserMessage } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ navigation, route }: Props) {
  const { firebaseUser } = useAuth();
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribePublicProfiles(setProfiles, () => undefined), []);

  useEffect(() => {
    let active = true;
    getGroup(route.params.groupId)
      .then((next) => {
        if (!active) {
          return;
        }

        if (!next) {
          setError('Grupo não encontrado.');
          return;
        }

        setGroup(next);
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(toUserMessage(failure));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [route.params.groupId]);

  const members = useMemo(() => {
    const byUid = new Map(profiles.map((profile) => [profile.uid, profile]));
    return (group?.memberIds ?? []).map((id) => byUid.get(id) ?? { uid: id, name: 'Integrante', photoUrl: '' });
  }, [group, profiles]);

  if (loading) {
    return <Loading label="Carregando integrantes..." />;
  }

  const slots = group ? remainingSlots(group.memberIds.length, group.memberLimit) : 0;

  return (
    <View style={styles.screen}>
      <ErrorMessage message={error} />
      {group ? (
        <Text style={styles.slots}>
          {group.memberIds.length} de {group.memberLimit} integrantes · {slots} vaga(s)
        </Text>
      ) : null}
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={<EmptyState title="Sem integrantes" description="Não foi possível listar o grupo." />}
        renderItem={({ item }) => (
          <GroupMemberItem
            name={item.name}
            photoUrl={item.photoUrl}
            owner={item.uid === group?.ownerId}
            onPress={() => navigation.navigate('Profile', { uid: item.uid })}
          />
        )}
      />
      {group && firebaseUser?.uid === group.ownerId ? (
        <Pressable style={styles.edit} onPress={() => navigation.navigate('GroupForm', { groupId: group.id })}>
          <Text style={styles.editText}>Gerenciar grupo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  slots: { color: colors.muted, marginBottom: spacing.md },
  edit: { backgroundColor: colors.primary, borderRadius: 14, padding: spacing.md, alignItems: 'center' },
  editText: { color: colors.text, fontWeight: '800' },
});
