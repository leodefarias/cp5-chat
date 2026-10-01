type Listener = (ids: string[]) => void;

let selectedIds: string[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = [...selectedIds];
  listeners.forEach((listener) => listener(snapshot));
}

export const memberPicker = {
  get(): string[] {
    return [...selectedIds];
  },
  replace(ids: readonly string[]): void {
    selectedIds = [...ids];
    emit();
  },
  toggle(uid: string): void {
    selectedIds = selectedIds.includes(uid)
      ? selectedIds.filter((item) => item !== uid)
      : [...selectedIds, uid];
    emit();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
