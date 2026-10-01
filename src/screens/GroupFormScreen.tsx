import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { addGroupMember, createGroup, getGroup, removeGroupMember, updateGroupDetails, updateMemberLimit } from '../services/groupService';
import { pickProfileImage, uploadImage } from '../services/imageService';
import { subscribePublicProfiles } from '../services/userService';
import { memberPicker } from '../state/memberPicker';
import type { NotificationPolicy } from '../types/group';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { AppError, toUserMessage } from '../utils/errors';
import { remainingSlots, validateGroupDraft, validateMemberLimit } from '../utils/groupValidation';
import { parseMemberLimit } from '../utils/validators';

const fallback = require('../../assets/icon.png') as number;

const POLICIES: { id: NotificationPolicy; label: string }[] = [
  { id: 'all_group_messages', label: 'Todas as mensagens' },
  { id: 'mentioned_members', label: 'Apenas mencionados' },
  { id: 'direct_messages_only', label: 'Só conversas individuais' },
  { id: 'disabled', label: 'Desativadas' },
];

type Props = NativeStackScreenProps<AppStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation, route }: Props) {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';
  const groupId = route.params.groupId;
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [selectedIds, setSelectedIds] = useState<string[]>([uid]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [ownerId, setOwnerId] = useState(uid);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => memberPicker.subscribe(setSelectedIds), []);

  useEffect(() => subscribePublicProfiles(setProfiles, (failure) => setError(toUserMessage(failure))), []);

  useEffect(() => {
    if (!groupId) {
      memberPicker.replace([uid]);
      return;
    }

    let active = true;
    getGroup(groupId)
      .then((group) => {
        if (!active || !group) {
          if (active) {
            setError('Grupo não encontrado.');
          }
          return;
        }

        if (group.ownerId !== uid) {
          setError('Somente o proprietário pode alterar o grupo.');
        }

        setName(group.name);
        setPhotoUrl(group.photoUrl);
        setLimitText(String(group.memberLimit));
        setPolicy(group.notificationPolicy);
        setOwnerId(group.ownerId);
        memberPicker.replace(group.memberIds);
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
  }, [groupId, uid]);

  const members = useMemo(
    () => selectedIds.map((id) => profiles.find((profile) => profile.uid === id) ?? { uid: id, name: 'Integrante', photoUrl: '' }),
    [profiles, selectedIds],
  );
  const limit = parseMemberLimit(limitText) ?? 0;
  const slots = useMemo(() => remainingSlots(selectedIds.length, limit), [limit, selectedIds.length]);

  async function handlePhoto() {
    try {
      const uri = await pickProfileImage();
      if (uri) {
        setPhotoUri(uri);
      }
    } catch (failure) {
      setError(toUserMessage(failure));
    }
  }

  async function handleSave() {
    const parsedLimit = parseMemberLimit(limitText);
    if (parsedLimit === null) {
      setError('O limite deve ser um número inteiro válido.');
      return;
    }

    const memberIds = [...new Set([ownerId || uid, ...selectedIds])];
    const validation = groupId
      ? validateMemberLimit(parsedLimit, memberIds.length)
      : validateGroupDraft({ name, memberIds, ownerId: uid, memberLimit: parsedLimit });
    if (!name.trim()) {
      setError('Informe o nome do grupo.');
      return;
    }
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const nextPhoto = photoUri ? await uploadImage(photoUri) : photoUrl;
      if (!groupId) {
        const createdId = await createGroup(uid, {
          name,
          photoUrl: nextPhoto,
          memberIds,
          memberLimit: parsedLimit,
          notificationPolicy: policy,
        });
        navigation.replace('Chat', { conversationId: createdId, conversationType: 'group' });
        return;
      }

      if (ownerId !== uid) {
        throw new AppError('Somente o proprietário pode alterar o grupo.');
      }

      const current = await getGroup(groupId);
      if (!current) {
        throw new AppError('Grupo não encontrado.');
      }

      await updateGroupDetails(groupId, uid, { name, photoUrl: nextPhoto, notificationPolicy: policy });
      if (parsedLimit !== current.memberLimit) {
        await updateMemberLimit(groupId, uid, parsedLimit);
      }

      const toAdd = memberIds.filter((id) => !current.memberIds.includes(id));
      const toRemove = current.memberIds.filter((id) => !memberIds.includes(id));
      for (const memberId of toAdd) {
        await addGroupMember(groupId, uid, memberId);
      }
      for (const memberId of toRemove) {
        await removeGroupMember(groupId, uid, memberId);
      }

      navigation.goBack();
    } catch (failure) {
      setError(toUserMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading label="Carregando grupo..." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ErrorMessage message={error} />
      <Pressable style={styles.photo} onPress={() => void handlePhoto()}>
        <Image source={photoUri ? { uri: photoUri } : photoUrl ? { uri: photoUrl } : fallback} style={styles.image} />
        <Text style={styles.photoLabel}>Foto do grupo</Text>
      </Pressable>
      <TextField label="Nome do grupo" value={name} onChangeText={setName} />
      <TextField label="Limite de integrantes" value={limitText} onChangeText={setLimitText} keyboardType="number-pad" />
      <Text style={styles.slots}>
        {selectedIds.length} integrante(s) · {slots} vaga(s) disponível(is)
      </Text>
      <Text style={styles.section}>Política de notificações</Text>
      <View style={styles.policies}>
        {POLICIES.map((item) => (
          <Pressable key={item.id} onPress={() => setPolicy(item.id)} style={[styles.policy, policy === item.id && styles.policyActive]}>
            <Text style={styles.policyText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.section}>Integrantes</Text>
      {members.map((member) => (
        <GroupMemberItem
          key={member.uid}
          name={member.name}
          photoUrl={member.photoUrl}
          owner={member.uid === ownerId}
          actionLabel={member.uid === ownerId ? undefined : 'Remover'}
          onAction={member.uid === ownerId ? undefined : () => memberPicker.toggle(member.uid)}
        />
      ))}
      {slots === 0 ? <Text style={styles.full}>O grupo está sem vagas. Aumente o limite antes de incluir alguém.</Text> : null}
      <PrimaryButton
        label="Escolher integrantes"
        variant="ghost"
        disabled={slots === 0}
        onPress={() => {
          memberPicker.replace(selectedIds);
          navigation.navigate('Users', { purpose: 'pick' });
        }}
      />
      <PrimaryButton label={groupId ? 'Salvar grupo' : 'Criar grupo'} onPress={() => void handleSave()} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  photo: { alignItems: 'center', marginBottom: spacing.md },
  image: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface },
  photoLabel: { color: colors.primary, marginTop: spacing.sm, fontWeight: '700' },
  slots: { color: colors.text, marginTop: spacing.md, fontWeight: '700' },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  policies: { gap: spacing.sm },
  policy: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md },
  policyActive: { borderColor: colors.primary, backgroundColor: colors.badge },
  policyText: { color: colors.text, fontWeight: '600' },
  full: { color: colors.danger, marginTop: spacing.sm },
});
