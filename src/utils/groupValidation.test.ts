import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyMemberAddition,
  applyMemberRemoval,
  GroupLimitError,
  remainingSlots,
  validateGroupDraft,
  validateMemberLimit,
} from './groupValidation';

describe('limite do grupo', () => {
  it('calcula as vagas restantes', () => {
    assert.equal(remainingSlots(3, 5), 2);
    assert.equal(remainingSlots(5, 5), 0);
    assert.equal(remainingSlots(6, 5), 0);
  });

  it('impede reduzir o limite abaixo da quantidade atual', () => {
    assert.equal(
      validateMemberLimit(3, 4),
      'O limite não pode ser menor que a quantidade atual de integrantes.',
    );
    assert.equal(validateMemberLimit(4, 4), null);
  });

  it('rejeita limite que não é inteiro válido', () => {
    assert.ok(validateMemberLimit(1.5, 1));
    assert.ok(validateMemberLimit(1, 1));
  });

  it('bloqueia a segunda inclusão quando só existe uma vaga', () => {
    const members = ['owner', 'a', 'b', 'c'];
    const limit = 5;
    const first = applyMemberAddition(members, limit, 'd');
    assert.deepEqual(first, ['owner', 'a', 'b', 'c', 'd']);
    assert.throws(() => applyMemberAddition(first, limit, 'e'), GroupLimitError);
  });

  it('não altera o array original ao incluir integrante', () => {
    const members = ['owner', 'a'];
    applyMemberAddition(members, 4, 'b');
    assert.deepEqual(members, ['owner', 'a']);
  });

  it('impede remover o proprietário ou deixar o grupo com uma pessoa', () => {
    assert.throws(() => applyMemberRemoval(['owner', 'a'], 'owner', 'owner'), GroupLimitError);
    assert.throws(() => applyMemberRemoval(['owner', 'a'], 'a', 'owner'), GroupLimitError);
    assert.deepEqual(applyMemberRemoval(['owner', 'a', 'b'], 'b', 'owner'), ['owner', 'a']);
  });

  it('valida o rascunho do grupo', () => {
    assert.equal(
      validateGroupDraft({
        name: 'Turma',
        memberIds: ['owner'],
        ownerId: 'owner',
        memberLimit: 5,
      }),
      'O grupo precisa de pelo menos dois integrantes.',
    );
    assert.equal(
      validateGroupDraft({
        name: 'Turma',
        memberIds: ['owner', 'a', 'b'],
        ownerId: 'owner',
        memberLimit: 2,
      }),
      'O limite não pode ser menor que a quantidade atual de integrantes.',
    );
  });
});
