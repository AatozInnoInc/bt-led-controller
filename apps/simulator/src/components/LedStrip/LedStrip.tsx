import type { RGB } from '@bt-led/led-types';

interface Props {
  pixels: ReadonlyArray<RGB>;
}

// Three-DOM-element-per-LED render per Handoff "LED strip rendering":
//   .led-halo absolute inset 0 with rgba(R,G,B, α×0.22)
//   .led-core 14×14 with rgb(R,G,B)
// Halo opacity scales with the brightest channel. Cores below ~5 render as a
// dim white instead of pure black so the strip never looks dead.
export function LedStrip({ pixels }: Props) {
  return (
    <div className="led-strip" role="img" aria-label="LED strip preview">
      {pixels.map((p, i) => {
        const max = Math.max(p.r, p.g, p.b);
        const haloAlpha = (max / 255) * 0.22;
        const core =
          max < 5 ? 'rgba(255,255,255,0.04)' : `rgb(${p.r}, ${p.g}, ${p.b})`;
        return (
          <span key={i} className="led" aria-hidden>
            <span
              className="led-halo"
              style={{ background: `rgba(${p.r}, ${p.g}, ${p.b}, ${haloAlpha})` }}
            />
            <span className="led-core" style={{ background: core }} />
          </span>
        );
      })}
    </div>
  );
}
