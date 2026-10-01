import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { navigationRef } from '../navigation/navigationRef';
import { consumeInitialNotification, listenNotificationOpens, registerDevice } from '../services/notificationService';
import type { DeviceRegistrationStatus, NotificationNavigation } from '../types/notification';

export function useNotifications(enabled: boolean): DeviceRegistrationStatus | null {
  const { firebaseUser } = useAuth();
  const [status, setStatus] = useState<DeviceRegistrationStatus | null>(null);

  useEffect(() => {
    if (!enabled || !firebaseUser) {
      return;
    }

    let active = true;
    registerDevice(firebaseUser.uid)
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (active) {
          setStatus({ state: 'failed', message: 'Não foi possível registrar este dispositivo para notificações.' });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, firebaseUser]);

  const openConversation = useCallback((navigation: NotificationNavigation) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Chat', navigation);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = listenNotificationOpens(openConversation);
    consumeInitialNotification()
      .then((initial) => {
        if (initial) {
          openConversation(initial);
        }
      })
      .catch(() => undefined);

    return unsubscribe;
  }, [enabled, openConversation]);

  return status;
}
