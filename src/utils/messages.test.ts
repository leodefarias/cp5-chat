import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseChatMessage, parseMessageMap } from './messages';

describe('mensagens', () => {
  it('aceita uma mensagem completa e ignora campos inválidos', () => {
    const message = parseChatMessage('m1', 'c1', {
      conversationType: 'group',
      senderId: 'u1',
      text: 'oi',
      target: { type: 'member', memberId: 'u2' },
      mentionedUserIds: ['u2'],
      createdAt: 10,
    });

    assert.equal(message?.target.type, 'member');
    assert.equal(parseChatMessage('m2', 'c1', { text: 'incompleta' }), null);
  });

  it('lê o mapa do Realtime Database sem mutar a origem', () => {
    const raw = {
      b: {
        conversationType: 'direct',
        senderId: 'u2',
        text: 'depois',
        target: { type: 'conversation' },
        mentionedUserIds: [],
        createdAt: 2,
      },
      a: {
        conversationType: 'direct',
        senderId: 'u1',
        text: 'antes',
        target: { type: 'conversation' },
        mentionedUserIds: [],
        createdAt: 1,
      },
    };

    const messages = parseMessageMap('c1', raw);
    assert.equal(messages.length, 2);
    assert.equal(Object.keys(raw).join(','), 'b,a');
  });
});
