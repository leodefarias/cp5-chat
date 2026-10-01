import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value === 'CONFIGURAR_APENAS_NA_HOSPEDAGEM') {
    throw new Error('ADMIN_NOT_CONFIGURED');
  }

  return value;
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
    databaseURL: requireEnv('FIREBASE_DATABASE_URL'),
  });
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminDatabase(): Database {
  return getDatabase(getAdminApp());
}

export function adminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}
