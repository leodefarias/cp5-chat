export class GroupLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GroupLimitError';
  }
}

export function remainingSlots(memberCount: number, memberLimit: number): number {
  if (!Number.isInteger(memberCount) || !Number.isInteger(memberLimit)) {
    return 0;
  }

  return Math.max(0, memberLimit - memberCount);
}

export function validateMemberLimit(memberLimit: number, memberCount: number): string | null {
  if (!Number.isInteger(memberLimit) || memberLimit < 2) {
    return 'O limite deve ser um número inteiro maior ou igual a 2.';
  }

  if (memberLimit < memberCount) {
    return 'O limite não pode ser menor que a quantidade atual de integrantes.';
  }

  return null;
}

export function validateMemberAddition(
  memberIds: readonly string[],
  memberLimit: number,
  uid: string,
): string | null {
  if (!uid.trim()) {
    return 'Selecione um integrante válido.';
  }

  if (memberIds.includes(uid)) {
    return 'Este usuário já participa do grupo.';
  }

  const limitError = validateMemberLimit(memberLimit, memberIds.length);
  if (limitError && memberLimit < memberIds.length) {
    return limitError;
  }

  if (!Number.isInteger(memberLimit) || memberLimit < 2) {
    return 'O limite deve ser um número inteiro maior ou igual a 2.';
  }

  if (memberIds.length >= memberLimit) {
    return 'O grupo não tem vagas disponíveis.';
  }

  return null;
}

export function applyMemberAddition(
  memberIds: readonly string[],
  memberLimit: number,
  uid: string,
): string[] {
  const reason = validateMemberAddition(memberIds, memberLimit, uid);
  if (reason) {
    throw new GroupLimitError(reason);
  }

  return [...memberIds, uid];
}

export function applyMemberRemoval(memberIds: readonly string[], uid: string, ownerId: string): string[] {
  if (uid === ownerId) {
    throw new GroupLimitError('O proprietário não pode ser removido do grupo.');
  }

  if (!memberIds.includes(uid)) {
    throw new GroupLimitError('Este usuário não participa do grupo.');
  }

  const next = memberIds.filter((memberId) => memberId !== uid);
  if (next.length < 2) {
    throw new GroupLimitError('O grupo precisa manter pelo menos dois integrantes.');
  }

  return next;
}

export function validateGroupDraft(input: {
  name: string;
  memberIds: readonly string[];
  ownerId: string;
  memberLimit: number;
}): string | null {
  if (!input.name.trim()) {
    return 'Informe o nome do grupo.';
  }

  if (!input.memberIds.includes(input.ownerId)) {
    return 'O proprietário precisa continuar no grupo.';
  }

  if (input.memberIds.length < 2) {
    return 'O grupo precisa de pelo menos dois integrantes.';
  }

  return validateMemberLimit(input.memberLimit, input.memberIds.length);
}
