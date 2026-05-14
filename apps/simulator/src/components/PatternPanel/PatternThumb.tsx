import type { PatternId } from '@bt-led/led-types';
import { thumbnailFor } from './thumbnail';

interface Props {
  id: PatternId;
  ledCount?: number;
}

// Static 8-LED snapshot rendered inside each pattern-card. Mirrors the live
// strip's halo+core look at miniature scale; dim pixels fall back to a faint
// white so the row never looks dead.
export function PatternThumb({ id, ledCount = 8 }: Props) {
  const pixels = thumbnailFor(id, ledCount);
  return (
    <span className="pattern-thumb" aria-hidden>
      {pixels.map((p, i) => {
        const max = Math.max(p.r, p.g, p.b);
        const bg =
          max < 5 ? 'rgba(255,255,255,0.06)' : `rgb(${p.r}, ${p.g}, ${p.b})`;
        return <span key={i} className="pattern-thumb-dot" style={{ background: bg }} />;
      })}
    </span>
  );
}
