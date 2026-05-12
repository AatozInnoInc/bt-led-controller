import type { PatternId } from '@bt-led/led-types';

// Inlined Tabler icon SVG paths (MIT-licensed). Phase 2 keeps zero new deps; if
// the icon set grows past ~10 a future agent should consider @tabler/icons-react.

const PATHS: Record<PatternId, string> = {
  off: 'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z',
  solid:
    'M12 19a1 1 0 0 1 1 1v1a1 1 0 0 1 -2 0v-1a1 1 0 0 1 1 -1zm0 -16a1 1 0 0 1 1 1v1a1 1 0 0 1 -2 0v-1a1 1 0 0 1 1 -1zm9 9a1 1 0 0 1 0 2h-1a1 1 0 0 1 0 -2h1zM4 11a1 1 0 0 1 0 2h-1a1 1 0 0 1 0 -2h1zm12.95 -6.36a1 1 0 0 1 1.41 1.41l-.7 .7a1 1 0 1 1 -1.41 -1.41l.7 -.7zM5.64 16.95a1 1 0 1 1 1.41 1.41l-.7 .7a1 1 0 0 1 -1.41 -1.41l.7 -.7zm12.72 0l.7 .7a1 1 0 0 1 -1.41 1.41l-.7 -.7a1 1 0 0 1 1.41 -1.41zM6.34 4.64l.7 .7a1 1 0 1 1 -1.41 1.41l-.7 -.7a1 1 0 1 1 1.41 -1.41zM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0 -10z',
  rainbow:
    'M22 17h-2a8 8 0 1 0 -16 0h-2a10 10 0 1 1 20 0zm-4 0h-2a4 4 0 1 0 -8 0h-2a6 6 0 1 1 12 0zm-4 0h-4a2 2 0 1 1 4 0z',
  pulse: 'M3 12h4l3 8l4 -16l3 8h4',
  fade: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 3v18M3 12h18',
  chase: 'M5 12l14 0M13 18l6 -6M13 6l6 6',
  twinkle:
    'M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z',
  wave: 'M3 12c1.333 -4 2.667 -4 4 0s2.667 4 4 0s2.667 -4 4 0s2.667 4 4 0',
  breath:
    'M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24M3 12h14.5a2.5 2.5 0 1 1 -2.34 3.24M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24',
  strobe: 'M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11',
  fire: 'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z',
};

const COLORS: Record<PatternId, string> = {
  off: 'rgba(255,255,255,0.35)',
  solid: 'rgba(255,220,130,0.70)',
  rainbow: 'rgba(127,119,221,0.80)',
  pulse: 'rgba(93,202,165,0.80)',
  fade: 'rgba(255,255,255,0.45)',
  chase: 'rgba(255,255,255,0.50)',
  twinkle: 'rgba(250,199,117,0.80)',
  wave: 'rgba(133,183,235,0.80)',
  breath: 'rgba(180,180,180,0.60)',
  strobe: 'rgba(226,75,74,0.80)',
  fire: '#FAC775',
};

interface Props {
  id: PatternId;
  size?: number;
}

export function PatternIcon({ id, size = 18 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS[id]}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[id]} />
    </svg>
  );
}

export const PATTERN_ICON_COLOR = COLORS;
