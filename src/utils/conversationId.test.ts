import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDirectConversationId } from './conversationId';

describe('conversa direta', () => {
  it('gera o mesmo id para o mesmo par, independente da ordem', () => {
    assert.equal(buildDirectConversationId('bbb', 'aaa'), buildDirectConversationId('aaa', 'bbb'));
    assert.equal(buildDirectConversationId('bbb', 'aaa'), 'aaa_bbb');
  });

  it('não permite conversar consigo mesmo', () => {
    assert.throws(() => buildDirectConversationId('abc', 'abc'), /SELF_CHAT/);
  });
});
