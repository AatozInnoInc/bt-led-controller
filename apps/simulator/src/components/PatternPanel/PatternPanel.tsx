import type { PatternId } from '@bt-led/led-types';
import { PATTERN_IDS } from '@bt-led/led-types';
import { PatternIcon } from './icons';

const LABELS: Record<PatternId, string> = {
  off: 'Off',
  solid: 'Solid',
  rainbow: 'Rainbow',
  pulse: 'Pulse',
  fade: 'Fade',
  chase: 'Chase',
  twinkle: 'Twinkle',
  wave: 'Wave',
  breath: 'Breath',
  strobe: 'Strobe',
  fire: 'Fire',
};

interface Props {
  pattern: PatternId;
  speed: number;
  onPattern(id: PatternId): void;
  onSpeed(value: number): void;
}

export function PatternPanel({ pattern, speed, onPattern, onSpeed }: Props) {
  return (
    <section className="pattern-panel">
      <header className="panel-header">
        <span className="panel-label">Pattern</span>
      </header>

      <div className="pattern-grid" role="radiogroup" aria-label="LED pattern">
        {PATTERN_IDS.map((id) => {
          const selected = pattern === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`pattern-card${selected ? ' is-selected' : ''}`}
              onClick={() => onPattern(id)}
            >
              <PatternIcon id={id} />
              <span className="pattern-label">{LABELS[id]}</span>
            </button>
          );
        })}
      </div>

      <label className="speed-row">
        <span className="panel-label">Speed</span>
        <input
          type="range"
          min={0}
          max={100}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          aria-label="Pattern speed"
        />
        <span className="speed-value">{speed}</span>
      </label>
    </section>
  );
}
