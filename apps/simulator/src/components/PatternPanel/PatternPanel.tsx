import type { PatternId } from '@bt-led/led-types';
import { PATTERN_IDS } from '@bt-led/led-types';
import { PatternIcon } from './icons';
import { PatternThumb } from './PatternThumb';

const LABELS: Record<PatternId, string> = {
  off: 'Off',
  solid: 'Solid',
  rainbow: 'Rainbow',
  pulse: 'Pulse',
  fade: 'Color Fade',
  chase: 'Chase',
  twinkle: 'Twinkle',
  wave: 'Wave',
  breath: 'Breath',
  strobe: 'Strobe',
  fire: 'Fire',
  meteor: 'Meteor',
  colorwipe: 'Color Wipe',
  plasma: 'Plasma',
  larson: 'Larson',
  confetti: 'Confetti',
  glitter: 'Glitter',
  fairy: 'Fairy',
  sparkle_plus: 'Sparkle+',
  pacifica: 'Pacifica',
  aurora: 'Aurora',
  sunrise: 'Sunrise',
  gradient: 'Gradient',
  lighthouse: 'Lighthouse',
  icu: 'ICU',
  chase_rainbow: 'Chase Rainbow',
  running_saw: 'Running Saw',
  railway: 'Railway',
  bpm: 'BPM',
  perlin_move: 'Perlin Move',
  distortion_waves: 'Distortion Waves',
  lightning: 'Lightning',
  rain: 'Rain',
  fireworks: 'Fireworks',
  candle: 'Candle',
  bouncing_balls: 'Bouncing Balls',
  dissolve: 'Dissolve',
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
              <span className="pattern-card-header">
                <PatternIcon id={id} />
                <span className="pattern-label">{LABELS[id]}</span>
              </span>
              <PatternThumb id={id} />
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
