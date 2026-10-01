import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorMessage } from '../components/ErrorMessage';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { pickProfileImage } from '../services/imageService';
import type { AuthStackParamList } from '../types/navigation';
import { colors, spacing } from '../theme/colors';
import { toUserMessage } from '../utils/errors';

const fallback = require('../../assets/icon.png') as number;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register, configured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePickPhoto() {
    setError('');
    try {
      const uri = await pickProfileImage();
      if (uri) {
        setPhotoUri(uri);
      }
    } catch (failure) {
      setError(toUserMessage(failure));
    }
  }

  async function handleRegister() {
    setLoading(true);
    setError('');
    try {
      await register({ name, email, password, confirmPassword, phoneNumber, birthDate, photoUri });
    } catch (failure) {
      setError(toUserMessage(failure));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Criar conta</Text>
        <ErrorMessage message={error} />
        {!configured ? <ErrorMessage message="O Firebase ainda não está configurado neste projeto." /> : null}
        <Pressable style={styles.photo} onPress={() => void handlePickPhoto()}>
          <Image source={photoUri ? { uri: photoUri } : fallback} style={styles.image} />
          <Text style={styles.photoLabel}>Escolher foto de perfil</Text>
        </Pressable>
        <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <TextField label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
        <TextField label="Celular" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="11999999999" />
        <TextField label="Data de nascimento" value={birthDate} onChangeText={setBirthDate} placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" />
        <PrimaryButton label="Cadastrar" onPress={() => void handleRegister()} loading={loading} disabled={!configured} />
        <PrimaryButton label="Já tenho conta" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md },
  photo: { alignItems: 'center', marginBottom: spacing.md },
  image: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface },
  photoLabel: { color: colors.primary, marginTop: spacing.sm, fontWeight: '700' },
});
