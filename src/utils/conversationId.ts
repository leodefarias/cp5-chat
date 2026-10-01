export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('SELF_CHAT');
  }

  return [uidA, uidB].sort().join('_');
}

export function buildPairId(uidA: string, uidB: string): string {
  return buildDirectConversationId(uidA, uidB);
}
