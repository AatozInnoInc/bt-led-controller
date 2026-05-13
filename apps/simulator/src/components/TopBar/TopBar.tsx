interface Props {
  ledCount: number;
  brightness: number;
  ledCountOptions: ReadonlyArray<number>;
  onLedCount(value: number): void;
  onBrightness(value: number): void;
  onPresets(): void;
  onExportCode(): void;
}

export function TopBar({
  ledCount,
  brightness,
  ledCountOptions,
  onLedCount,
  onBrightness,
  onPresets,
  onExportCode,
}: Props) {
  return (
    <header className="top-bar">
      <div className="top-brand">
        <span className="top-title">LED Simulator</span>
        <span className="top-subtitle">bt-led-controller</span>
      </div>

      <div className="top-actions">
        <label className="brightness-row">
          <span className="panel-label">Brightness</span>
          <input
            type="range"
            min={0}
            max={255}
            value={brightness}
            onChange={(e) => onBrightness(Number(e.target.value))}
            aria-label="Master brightness"
          />
          <span className="brightness-value">{Math.round((brightness / 255) * 100)}%</span>
        </label>

        <div className="led-count-row" role="radiogroup" aria-label="LED count">
          <span className="panel-label">LEDs</span>
          <div className="led-count-chips">
            {ledCountOptions.map((n) => {
              const selected = n === ledCount;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`led-count-chip${selected ? ' is-selected' : ''}`}
                  onClick={() => onLedCount(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn-secondary" type="button" onClick={onPresets}>
          Presets
        </button>
        <button className="btn-primary" type="button" onClick={onExportCode}>
          Export code
        </button>
      </div>
    </header>
  );
}
