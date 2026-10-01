import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { type Database, getDatabase } from 'firebase/database';
import { type Firestore, getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebaseConfig.json';
import type { FirebaseClientConfig } from '../types/firebaseConfig';

const firebaseConfig = firebaseConfigJson as FirebaseClientConfig;

export function isFirebaseConfigured(): boolean {
  return [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.databaseURL,
    firebaseConfig.projectId,
    firebaseConfig.storageBucket,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId,
  ].every((value) => value.trim().length > 0);
}

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }

  if (app) {
    return app;
  }

  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getRealtimeDb(): Database {
  return getDatabase(getFirebaseApp());
}
