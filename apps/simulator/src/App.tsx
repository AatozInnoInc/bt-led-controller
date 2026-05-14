import { useCallback, useEffect, useMemo, useState } from 'react';
import { VirtualDevice } from '@bt-led/led-engine';
import type { LedConfig, LedPreset, PatternId, RGB } from '@bt-led/led-types';
import { BleCommandService } from './engine/BleCommandService';
import { generateArduinoCode } from './engine/CodeGenerator';
import { usePatternLoop } from './hooks/usePatternLoop';
import { useHashSync, useInitialHashConfig, usePresets } from './hooks/usePresets';
import { LedStrip } from './components/LedStrip/LedStrip';
import { ColorPicker } from './components/ColorPicker/ColorPicker';
import { PatternPanel } from './components/PatternPanel/PatternPanel';
import { TopBar } from './components/TopBar/TopBar';
import { PresetDrawer } from './components/PresetDrawer/PresetDrawer';
import { CodeExportModal } from './components/CodeExportModal/CodeExportModal';

const LED_COUNT_OPTIONS = [16, 30, 60, 96, 144] as const;

// Patterns that use a colour gradient — show the Color B picker for these.
const PALETTE_PATTERNS = new Set<PatternId>(['rainbow', 'chase', 'wave', 'plasma']);

const DEFAULT_CONFIG: LedConfig = {
  pattern: 'rainbow',
  color: { r: 255, g: 255, b: 255 },
  speed: 50,
  brightness: 200,
  powerMode: 1,
};

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function App() {
  const initialHash = useInitialHashConfig();
  const [ledCount, setLedCount] = useState(16);
  const [config, setConfig] = useState<LedConfig>(() => initialHash ?? DEFAULT_CONFIG);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Each ledCount change rebuilds the device (the pixel buffer is sized on ctor)
  // and reissues the verify→enter handshake.
  const device = useMemo(() => new VirtualDevice({ ledCount }), [ledCount]);
  const ble = useMemo(() => new BleCommandService(device), [device]);
  const { pixels } = usePatternLoop(device);
  const presets = usePresets();

  useHashSync(config);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ownership = await ble.verifyOwnership('simulator-user');
      if (!ownership.success || cancelled)
        return;
      await ble.enterConfigMode();
      if (cancelled)
        return;
      await ble.updatePattern(config.pattern);
      await ble.updateColor(config.color.r, config.color.g, config.color.b);
      if (config.secondaryColor)
        await ble.updateSecondaryColor(config.secondaryColor.r, config.secondaryColor.g, config.secondaryColor.b);
      await ble.updateSpeed(config.speed);
      await ble.updateBrightness(config.brightness);
      await ble.updatePowerMode(config.powerMode);
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally only re-run when the device (and thus BLE) is rebuilt —
    // individual setters below push their own updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ble]);

  const onPattern = useCallback(
    (id: PatternId) => {
      setConfig((c) => ({ ...c, pattern: id }));
      void ble.updatePattern(id);
    },
    [ble],
  );

  const onColor = useCallback(
    (rgb: RGB) => {
      setConfig((c) => ({ ...c, color: rgb }));
      void ble.updateColor(rgb.r, rgb.g, rgb.b);
    },
    [ble],
  );

  const onSecondaryColor = useCallback(
    (rgb: RGB) => {
      setConfig((c) => ({ ...c, secondaryColor: rgb }));
      void ble.updateSecondaryColor(rgb.r, rgb.g, rgb.b);
    },
    [ble],
  );

  const onSpeed = useCallback(
    (value: number) => {
      setConfig((c) => ({ ...c, speed: value }));
      void ble.updateSpeed(value);
    },
    [ble],
  );

  const onBrightness = useCallback(
    (value: number) => {
      setConfig((c) => ({ ...c, brightness: value }));
      void ble.updateBrightness(value);
    },
    [ble],
  );

  const onLedCount = useCallback((value: number) => setLedCount(value), []);

  const applyPreset = useCallback(
    (preset: LedPreset) => {
      setConfig(preset.config);
      void (async () => {
        await ble.updatePattern(preset.config.pattern);
        await ble.updateColor(preset.config.color.r, preset.config.color.g, preset.config.color.b);
        if (preset.config.secondaryColor)
          await ble.updateSecondaryColor(preset.config.secondaryColor.r, preset.config.secondaryColor.g, preset.config.secondaryColor.b);
        await ble.updateSpeed(preset.config.speed);
        await ble.updateBrightness(preset.config.brightness);
        await ble.updatePowerMode(preset.config.powerMode);
        await ble.commitConfig();
      })();
    },
    [ble],
  );

  const savePreset = useCallback(
    (name: string) => {
      const preset: LedPreset = {
        id: newId(),
        name,
        createdAt: new Date().toISOString(),
        version: 1,
        config,
      };
      presets.save(preset);
    },
    [config, presets],
  );

  const generatedCode = useMemo(() => {
    return generateArduinoCode({
      id: 'live',
      name: 'Live preview',
      createdAt: new Date().toISOString(),
      version: 1,
      config,
    });
  }, [config]);

  const fireActive = config.pattern === 'fire';
  const isPalettePattern = PALETTE_PATTERNS.has(config.pattern);

  return (
    <main className="app-shell">
      <TopBar
        ledCount={ledCount}
        brightness={config.brightness}
        ledCountOptions={LED_COUNT_OPTIONS}
        onLedCount={onLedCount}
        onBrightness={onBrightness}
        onPresets={() => setPresetsOpen(true)}
        onExportCode={() => setExportOpen(true)}
      />

      <section className="strip-bg">
        <LedStrip pixels={pixels} />
      </section>

      <section className="body-grid">
        <PatternPanel
          pattern={config.pattern}
          speed={config.speed}
          onPattern={onPattern}
          onSpeed={onSpeed}
        />
        <div className="body-divider" aria-hidden />
        <ColorPicker
          color={config.color}
          disabled={fireActive}
          disabledHint="controlled by heat palette"
          showSecondary={isPalettePattern}
          secondaryColor={config.secondaryColor}
          onChange={onColor}
          onSecondaryChange={onSecondaryColor}
        />
      </section>

      <PresetDrawer
        open={presetsOpen}
        presets={presets.presets}
        currentConfig={config}
        onClose={() => setPresetsOpen(false)}
        onSave={savePreset}
        onLoad={(p) => {
          applyPreset(p);
          setPresetsOpen(false);
        }}
        onRemove={presets.remove}
        onExport={(p) => presets.exportToFile(p, generateArduinoCode(p))}
        onImport={async (file) => {
          try {
            const p = await presets.importFromFile(file);
            presets.save(p);
            applyPreset(p);
          } catch (err) {
            console.warn('preset import failed', err);
          }
        }}
      />

      <CodeExportModal open={exportOpen} code={generatedCode} onClose={() => setExportOpen(false)} />
    </main>
  );
}
