import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credential.user;
}

export function watchAuthState(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), listener);
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}
