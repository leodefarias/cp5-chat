import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { adminDatabase, adminFirestore } from '../services/firebaseAdmin.js';
import { conversationLabel, parseDevice, parsePolicy, parseStoredMessage, parseStringList } from '../services/messageParser.js';
import { sendPush } from '../services/notificationSender.js';
import { isAlreadyExists, resolveRecipientIds } from '../services/recipientResolver.js';
import type { NotificationPolicy } from '../types.js';

export const notificationsRouter = Router();

notificationsRouter.post('/notifications/messages', authenticate, async (req, res) => {
  const body: unknown = req.body;
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  const conversationId = record.conversationId;
  const messageId = record.messageId;
  const uid = req.uid;
  if (typeof conversationId !== 'string' || typeof messageId !== 'string' || !uid) {
    res.status(400).json({ error: 'Informe a conversa e a mensagem.' });
    return;
  }

  try {
    const messageSnap = await adminDatabase().ref(`messages/${conversationId}/${messageId}`).get();
    const message = parseStoredMessage(conversationId, messageSnap.val());
    if (!message) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }

    if (message.senderId !== uid) {
      res.status(403).json({ error: 'Você não enviou esta mensagem.' });
      return;
    }

    const firestore = adminFirestore();
    let participantIds: string[] = [];
    let policy: NotificationPolicy | null = null;
    let title = 'Conversa';

    if (message.conversationType === 'direct') {
      const conversation = await firestore.collection('directConversations').doc(conversationId).get();
      const data: unknown = conversation.data();
      const ids = typeof data === 'object' && data !== null && 'participantIds' in data
        ? parseStringList(data.participantIds)
        : null;
      if (!ids || !ids.includes(uid)) {
        res.status(403).json({ error: 'Você não participa desta conversa.' });
        return;
      }

      participantIds = ids;
      title = conversationLabel('direct', '');
    } else {
      const group = await firestore.collection('groups').doc(conversationId).get();
      const data: unknown = group.data();
      if (typeof data !== 'object' || data === null) {
        res.status(404).json({ error: 'Grupo não encontrado.' });
        return;
      }

      const ids = 'memberIds' in data ? parseStringList(data.memberIds) : null;
      policy = 'notificationPolicy' in data ? parsePolicy(data.notificationPolicy) : null;
      const name = 'name' in data && typeof data.name === 'string' ? data.name : '';
      if (!ids || !ids.includes(uid)) {
        res.status(403).json({ error: 'Você não participa deste grupo.' });
        return;
      }

      participantIds = ids;
      title = conversationLabel('group', name);
    }

    const recipients = resolveRecipientIds({
      conversationType: message.conversationType,
      senderId: uid,
      participantIds,
      policy,
      target: message.target,
      mentionedUserIds: message.mentionedUserIds,
    });

    const deliveryRef = firestore.collection('notificationDeliveries').doc(messageId);
    try {
      await deliveryRef.create({
        conversationId,
        senderId: uid,
        createdAt: Date.now(),
        status: 'sending',
      });
    } catch (error) {
      if (isAlreadyExists(error)) {
        res.json({ delivered: false, duplicate: true });
        return;
      }

      throw error;
    }

    let sent = 0;
    for (const recipientId of recipients) {
      const devices = await firestore.collection('users').doc(recipientId).collection('devices').get();
      for (const device of devices.docs) {
        const parsed = parseDevice(device.id, device.data());
        if (!parsed) {
          continue;
        }

        const result = await sendPush({
          token: parsed.token,
          provider: parsed.provider,
          title,
          body: 'Nova mensagem',
          data: {
            conversationId,
            conversationType: message.conversationType,
          },
        });

        if (result === 'invalid') {
          await device.ref.set({ enabled: false, updatedAt: Date.now() }, { merge: true });
          continue;
        }

        sent += 1;
      }
    }

    await deliveryRef.set({ status: 'sent', sent, updatedAt: Date.now() }, { merge: true });
    res.json({ delivered: sent > 0, duplicate: false });
  } catch (error) {
    const unavailable = error instanceof Error && error.message === 'ADMIN_NOT_CONFIGURED';
    res.status(unavailable ? 503 : 500).json({
      error: unavailable ? 'A API ainda não recebeu as credenciais administrativas.' : 'Não foi possível enviar as notificações.',
    });
  }
});
