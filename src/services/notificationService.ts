import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import type { DevicePlatform, DeviceRegistrationStatus, NotificationNavigation, PushProvider } from '../types/notification';
import { getFirestoreDb } from './firebase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function platformOf(): DevicePlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS;
  }

  return 'web';
}

function projectId(): string {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '';
  if (fromEnv.trim()) {
    return fromEnv.trim();
  }

  const extra: unknown = Constants.expoConfig?.extra;
  if (typeof extra === 'object' && extra !== null && 'eas' in extra) {
    const eas: unknown = extra.eas;
    if (typeof eas === 'object' && eas !== null && 'projectId' in eas && typeof eas.projectId === 'string') {
      return eas.projectId;
    }
  }

  return Constants.easConfig?.projectId ?? '';
}

async function readPushToken(): Promise<{ token: string; provider: PushProvider } | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
    });

    try {
      const native = await Notifications.getDevicePushTokenAsync();
      if (native.type === 'android' && typeof native.data === 'string' && native.data.length > 0) {
        return { token: native.data, provider: 'fcm' };
      }
    } catch {
      // O token da Expo ainda pode existir neste aparelho.
    }
  }

  const id = projectId();
  if (!id) {
    return null;
  }

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: id });
  if (!expoToken.data) {
    return null;
  }

  return { token: expoToken.data, provider: 'expo' };
}

export async function registerDevice(uid: string): Promise<DeviceRegistrationStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return { state: 'unavailable' };
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return { state: 'permission-denied' };
  }

  try {
    const push = await readPushToken();
    if (!push) {
      return { state: 'unavailable' };
    }

    await setDoc(doc(getFirestoreDb(), 'users', uid, 'devices', push.provider), {
      token: push.token,
      provider: push.provider,
      platform: platformOf(),
      enabled: true,
      updatedAt: Date.now(),
    });

    return { state: 'ready', provider: push.provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/network/i.test(message)) {
      return { state: 'failed', message: 'Sem conexão com a internet.' };
    }

    return { state: 'failed', message: 'Não foi possível registrar este dispositivo para notificações.' };
  }
}

export function parseNotificationData(value: unknown): NotificationNavigation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const conversationId = data.conversationId;
  const conversationType = data.conversationType;
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    return null;
  }

  if (conversationType !== 'direct' && conversationType !== 'group') {
    return null;
  }

  return { conversationId, conversationType };
}

export function listenNotificationOpens(onOpen: (navigation: NotificationNavigation) => void): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const navigation = parseNotificationData(response.notification.request.content.data);
    if (navigation) {
      onOpen(navigation);
    }
  });

  return () => subscription.remove();
}

export async function consumeInitialNotification(): Promise<NotificationNavigation | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return null;
  }

  return parseNotificationData(response.notification.request.content.data);
}
