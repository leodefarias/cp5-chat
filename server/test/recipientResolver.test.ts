import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAlreadyExists, resolveRecipientIds } from '../src/services/recipientResolver.js';

const members = ['ana', 'bruno', 'carla'];

describe('destinatários do push', () => {
  it('avisa só a outra pessoa na conversa direta e nunca o remetente', () => {
    assert.deepEqual(
      resolveRecipientIds({
        conversationType: 'direct',
        senderId: 'ana',
        participantIds: ['ana', 'bruno'],
        policy: null,
        target: { type: 'conversation' },
        mentionedUserIds: [],
      }),
      ['bruno'],
    );
  });

  it('não notifica quem está fora da conversa', () => {
    assert.deepEqual(
      resolveRecipientIds({
        conversationType: 'direct',
        senderId: 'ana',
        participantIds: ['bruno'],
        policy: null,
        target: { type: 'conversation' },
        mentionedUserIds: [],
      }),
      [],
    );
  });

  it('all_group_messages inclui todos, menos o remetente', () => {
    assert.deepEqual(
      resolveRecipientIds({
        conversationType: 'group',
        senderId: 'ana',
        participantIds: members,
        policy: 'all_group_messages',
        target: { type: 'conversation' },
        mentionedUserIds: [],
      }),
      ['bruno', 'carla'],
    );
  });

  it('mentioned_members só inclui menção ou destinatário que ainda é integrante', () => {
    assert.deepEqual(
      resolveRecipientIds({
        conversationType: 'group',
        senderId: 'ana',
        participantIds: members,
        policy: 'mentioned_members',
        target: { type: 'member', memberId: 'bruno' },
        mentionedUserIds: ['carla', 'ana', 'visitante'],
      }),
      ['carla', 'bruno'],
    );
  });

  it('direct_messages_only e disabled não geram push de grupo', () => {
    for (const policy of ['direct_messages_only', 'disabled'] as const) {
      assert.deepEqual(
        resolveRecipientIds({
          conversationType: 'group',
          senderId: 'ana',
          participantIds: members,
          policy,
          target: { type: 'member', memberId: 'bruno' },
          mentionedUserIds: ['bruno'],
        }),
        [],
      );
    }
  });

  it('reconhece entrega duplicada', () => {
    assert.equal(isAlreadyExists({ code: 6 }), true);
    assert.equal(isAlreadyExists({ code: 'already-exists' }), true);
    assert.equal(isAlreadyExists(new Error('x')), false);
  });
});
