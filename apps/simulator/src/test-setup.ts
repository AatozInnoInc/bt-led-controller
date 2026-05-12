import '@testing-library/jest-dom/vitest';

// Node 25 ships a built-in `localStorage` global that shadows jsdom's implementation
// but is missing methods we need (clear, removeItem). Replace with a Map-backed stub
// so the simulator tests behave consistently across Node versions.
const memory = new Map<string, string>();
const stub: Storage = {
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
  getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
  key: (index: number) => Array.from(memory.keys())[index] ?? null,
  removeItem: (key: string) => {
    memory.delete(key);
  },
  setItem: (key: string, value: string) => {
    memory.set(key, String(value));
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: stub, configurable: true });
}
