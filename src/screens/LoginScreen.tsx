import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorMessage } from '../components/ErrorMessage';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types/navigation';
import { colors, spacing } from '../theme/colors';
import { toUserMessage } from '../utils/errors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (failure) {
      setError(toUserMessage(failure));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>FIAP</Text>
        <Text style={styles.title}>Entrar no chat</Text>
        <Text style={styles.subtitle}>Use o e-mail e a senha da sua conta.</Text>
        {!configured ? (
          <ErrorMessage message="Preencha o firebaseConfig.json com o app Web do projeto cp5-chat antes de entrar." />
        ) : null}
        <ErrorMessage message={error} />
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <PrimaryButton label="Entrar" onPress={() => void handleLogin()} loading={loading} disabled={!configured} />
        <View style={styles.gap} />
        <PrimaryButton label="Criar conta" variant="ghost" onPress={() => navigation.navigate('Register')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  kicker: { color: colors.primary, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
  subtitle: { color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.lg },
  gap: { height: spacing.sm },
});
