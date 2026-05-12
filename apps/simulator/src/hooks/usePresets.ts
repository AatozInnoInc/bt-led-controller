import { useCallback, useEffect, useState } from 'react';
import type { ExportEnvelope, LedConfig, LedPreset } from '@bt-led/led-types';

const STORAGE_KEY = 'led-simulator-presets-v1';
const SCHEMA = 'led-simulator-preset-v1' as const;

// base64url helpers — avoid `+/=` so the hash stays URL-clean.
const toB64Url = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  const binary = String.fromCharCode(...Array.from(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function encodeConfigToHash(cfg: LedConfig): string {
  return toB64Url(JSON.stringify(cfg));
}

export function decodeConfigFromHash(hash: string): LedConfig | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromB64Url(raw)) as LedConfig;
    if (!parsed || typeof parsed !== 'object' || !parsed.pattern || !parsed.color) return null;
    return parsed;
  } catch {
    return null;
  }
}

const readStorage = (): LedPreset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return [];
    const parsed = JSON.parse(raw) as LedPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (presets: LedPreset[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // quota or private-mode — fail silently
  }
};

export interface UsePresets {
  presets: LedPreset[];
  save(preset: LedPreset): void;
  remove(id: string): void;
  exportToFile(preset: LedPreset, generatedCode?: string): void;
  importFromFile(file: File): Promise<LedPreset>;
}

export function usePresets(): UsePresets {
  const [presets, setPresets] = useState<LedPreset[]>(() => readStorage());

  const save = useCallback((preset: LedPreset) => {
    setPresets((prev) => {
      const next = [...prev.filter((p) => p.id !== preset.id), preset];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const exportToFile = useCallback((preset: LedPreset, generatedCode?: string) => {
    const envelope: ExportEnvelope = { schema: SCHEMA, preset, generatedCode };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^a-z0-9-_]+/gi, '_') || 'preset'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importFromFile = useCallback((file: File): Promise<LedPreset> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.onload = () => {
        try {
          const envelope = JSON.parse(String(reader.result)) as Partial<ExportEnvelope>;
          if (envelope?.schema !== SCHEMA || !envelope.preset) {
            throw new Error('not a led-simulator-preset-v1 envelope');
          }
          resolve(envelope.preset);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('invalid preset file'));
        }
      };
      reader.readAsText(file);
    });
  }, []);

  return { presets, save, remove, exportToFile, importFromFile };
}

// Re-export so App.tsx can apply a hash on mount without re-implementing the codec.
export const PRESETS_HASH = { encode: encodeConfigToHash, decode: decodeConfigFromHash };

// Convenience hook for reading the initial hash exactly once.
export function useInitialHashConfig(): LedConfig | null {
  const [cfg] = useState<LedConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    return decodeConfigFromHash(window.location.hash);
  });
  return cfg;
}

// Side-effect writer: keep window.location.hash in sync with a LedConfig.
export function useHashSync(cfg: LedConfig | null): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!cfg) return;
    const next = `#${encodeConfigToHash(cfg)}`;
    if (window.location.hash !== next) {
      // history.replaceState avoids polluting browser history every slider tick
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [cfg]);
}
