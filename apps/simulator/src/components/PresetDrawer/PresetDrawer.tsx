import { useRef, useState } from 'react';
import type { LedConfig, LedPreset } from '@bt-led/led-types';

interface Props {
  open: boolean;
  presets: LedPreset[];
  currentConfig: LedConfig;
  onClose(): void;
  onSave(name: string): void;
  onLoad(preset: LedPreset): void;
  onRemove(id: string): void;
  onExport(preset: LedPreset): void;
  onImport(file: File): void;
}

export function PresetDrawer({
  open,
  presets,
  currentConfig,
  onClose,
  onSave,
  onLoad,
  onRemove,
  onExport,
  onImport,
}: Props) {
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  return (
    <>
      <div
        className={`drawer-scrim${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`drawer${open ? ' is-open' : ''}`} aria-label="Presets" aria-hidden={!open}>
        <header className="drawer-header">
          <h2 className="drawer-title">Presets</h2>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="drawer-section" onSubmit={submit}>
          <span className="panel-label">Save current</span>
          <div className="drawer-row">
            <input
              className="drawer-input"
              placeholder="My preset"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={!name.trim()}>
              Save
            </button>
          </div>
          <p className="drawer-hint">
            Current: <code>{currentConfig.pattern}</code> · speed {currentConfig.speed} · brightness {currentConfig.brightness}
          </p>
        </form>

        <div className="drawer-section">
          <span className="panel-label">Library</span>
          {presets.length === 0 ? (
            <p className="drawer-hint">No saved presets yet.</p>
          ) : (
            <ul className="preset-list">
              {presets
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((p) => (
                  <li key={p.id} className="preset-row">
                    <button className="preset-load" type="button" onClick={() => onLoad(p)}>
                      <span className="preset-name">{p.name}</span>
                      <span className="preset-meta">
                        {p.config.pattern} · #{p.config.color.r.toString(16).padStart(2, '0')}
                        {p.config.color.g.toString(16).padStart(2, '0')}
                        {p.config.color.b.toString(16).padStart(2, '0')}
                      </span>
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => onExport(p)}>
                      Export
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="drawer-section">
          <span className="panel-label">Import</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
          <button className="btn-secondary" type="button" onClick={() => fileRef.current?.click()}>
            Import preset JSON…
          </button>
        </div>
      </aside>
    </>
  );
}
