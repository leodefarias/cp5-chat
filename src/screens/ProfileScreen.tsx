import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { getProfile } from '../services/userService';
import type { AppStackParamList } from '../types/navigation';
import type { ChatUser } from '../types/user';
import { colors, spacing } from '../theme/colors';
import { toUserMessage } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value.trim() ? value : 'Não informado'}</Text>
    </View>
  );
}

export function ProfileScreen({ route }: Props) {
  const { profile: mine } = useAuth();
  const [profile, setProfile] = useState<ChatUser | null>(route.params.uid === mine?.uid ? mine : null);
  const [loading, setLoading] = useState(route.params.uid !== mine?.uid);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params.uid === mine?.uid && mine) {
      setProfile(mine);
      setLoading(false);
      return;
    }

    let active = true;
    getProfile(route.params.uid)
      .then((next) => {
        if (!active) {
          return;
        }

        if (!next) {
          setError('Perfil indisponível.');
          return;
        }

        setProfile(next);
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
  }, [mine, route.params.uid]);

  if (loading) {
    return <Loading label="Carregando perfil..." />;
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <ErrorMessage message={error || 'Este perfil só pode ser visto por quem compartilha uma conversa com você.'} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ErrorMessage message={error} />
      <View style={styles.hero}>
        <Avatar uri={profile.photoUrl} name={profile.name} size={104} />
        <Text style={styles.name}>{profile.name || 'Não informado'}</Text>
      </View>
      <Field label="E-mail" value={profile.email} />
      <Field label="Celular" value={profile.phoneNumber} />
      <Field label="Data de nascimento" value={profile.birthDate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  field: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.muted, marginBottom: 4 },
  value: { color: colors.text, fontSize: 16 },
});
