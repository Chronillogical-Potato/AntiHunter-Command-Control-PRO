import { create } from 'zustand';

const STORAGE_KEY = 'ahcc:chatKey';
const GLOBAL_KEY = 'global';

type ChatKeyState = {
  keys: Record<string, string>;
  setKey: (key: string) => void;
  getKey: () => string | undefined;
  clearKey: () => void;
};

const loadKeys = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
};

export const useChatKeyStore = create<ChatKeyState>((set, _get) => ({
  keys: loadKeys(),
  setKey: (key) => {
    set(() => {
      const next = { [GLOBAL_KEY]: key };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return { keys: next };
    });
  },
  getKey: () => _get().keys[GLOBAL_KEY],
  clearKey: () => {
    set(() => {
      const next: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return { keys: next };
    });
  },
}));
