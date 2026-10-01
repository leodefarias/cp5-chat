import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { ChatUser, RegisterInput } from '../types/user';
import { loginWithEmail, logout as logoutService, registerWithEmail, watchAuthState } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { uploadImage } from '../services/imageService';
import { createProfile, getProfile } from '../services/userService';
import { AppError } from '../utils/errors';
import { validateBirthDate, validateEmail, validateName, validatePassword, validatePhone } from '../utils/validators';

type AuthContextValue = {
  firebaseUser: User | null;
  profile: ChatUser | null;
  loading: boolean;
  authenticating: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setFirebaseUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = watchAuthState((user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      getProfile(user.uid)
        .then((next) => setProfile(next))
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    });

    return unsubscribe;
  }, [configured]);

  const login = useCallback(async (email: string, password: string) => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      throw new AppError(emailError ?? passwordError ?? 'Dados inválidos.');
    }

    await loginWithEmail(email, password);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const validation =
      validateName(input.name) ??
      validateEmail(input.email) ??
      validatePassword(input.password) ??
      (input.password !== input.confirmPassword ? 'A confirmação de senha não confere.' : null) ??
      validatePhone(input.phoneNumber) ??
      validateBirthDate(input.birthDate);

    if (validation) {
      throw new AppError(validation);
    }

    setAuthenticating(true);
    try {
      const user = await registerWithEmail(input.email, input.password);
      const photoUrl = input.photoUri ? await uploadImage(input.photoUri) : '';
      const profileData: ChatUser = {
        uid: user.uid,
        name: input.name.trim(),
        email: input.email.trim(),
        phoneNumber: input.phoneNumber.trim(),
        birthDate: input.birthDate.trim(),
        photoUrl,
        createdAt: Date.now(),
      };
      await createProfile(profileData);
      setProfile(profileData);
    } catch (error) {
      await logoutService().catch(() => undefined);
      setFirebaseUser(null);
      setProfile(null);
      throw error;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setProfile(null);
    setFirebaseUser(null);
    await logoutService();
  }, []);

  const value = useMemo(
    () => ({ firebaseUser, profile, loading, authenticating, configured, login, register, logout }),
    [firebaseUser, profile, loading, authenticating, configured, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth deve ser usado dentro do AuthProvider.');
  }

  return value;
}
