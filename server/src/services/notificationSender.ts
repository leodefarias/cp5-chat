import type { PushProvider } from '../types.js';
import { adminMessaging } from './firebaseAdmin.js';

export type PushPayload = {
  token: string;
  provider: PushProvider;
  title: string;
  body: string;
  data: {
    conversationId: string;
    conversationType: string;
  };
};

type ExpoTicket = {
  status?: string;
  details?: { error?: string };
};

function isInvalidFcm(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token';
}

export async function sendPush(input: PushPayload): Promise<'sent' | 'invalid'> {
  if (input.provider === 'fcm') {
    try {
      await adminMessaging().send({
        token: input.token,
        notification: { title: input.title, body: input.body },
        data: input.data,
      });
      return 'sent';
    } catch (error) {
      if (isInvalidFcm(error)) {
        return 'invalid';
      }

      throw error;
    }
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.token,
      title: input.title,
      body: input.body,
      data: input.data,
      sound: 'default',
    }),
  });

  const payload: unknown = await response.json().catch(() => null);
  const tickets = typeof payload === 'object' && payload !== null && 'data' in payload ? payload.data : null;
  const ticket: ExpoTicket | null = Array.isArray(tickets) ? (tickets[0] as ExpoTicket) : null;
  if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
    return 'invalid';
  }

  if (!response.ok) {
    throw new Error('PUSH_FAILED');
  }

  return 'sent';
}
