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
  // ti-meteor: falling streak with a trailing tail
  meteor:
    'M21 3l-5 5M19 13l2 -2M13 19l-2 2M14.929 14.929l3.536 3.536M11 5l3 3M5.5 13.5l5 5M3 21c3.949 -.625 7.5 -2.5 9 -4s3.375 -5.051 4 -9c-3.949 .625 -7.5 2.5 -9 4s-3.375 5.051 -4 9z',
  // ti-color-swatch / brush: stylised colour-wipe brushstroke
  colorwipe:
    'M19 3h-4a2 2 0 0 0 -2 2v12a4 4 0 0 0 8 0v-12a2 2 0 0 0 -2 -2M13 7.35l-2 -2a2 2 0 0 0 -2.828 0l-2.828 2.828a2 2 0 0 0 0 2.828l9 9M7.3 13h-2.3a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h12M17 17v.01',
  // ti-circles-relation: overlapping circles — reads as plasma blobs
  plasma:
    'M9 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M15 15m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
  // ti-eye: eye + iris — reads as the Cylon scanner eye
  larson:
    'M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6z',
  // ti-sparkles: three stars — reads as random glitter/confetti
  confetti:
    'M16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M4 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M10.5 10.5l1 -1M16.5 4.5l1 -1M7.5 16.5l1 -1M4.5 4.5l1 1M16.5 16.5l1 1M10 14h-2M12 6v-2M18 12h2',
};

const COLORS: Record<PatternId, string> = {
  off: 'rgba(255,255,255,0.35)',
  solid: 'rgba(255,220,130,0.70)',
  rainbow: 'rgba(127,119,221,0.80)',
  pulse: 'rgba(93,202,165,0.80)',
  fade: 'rgba(160,220,255,0.80)',
  chase: 'rgba(255,255,255,0.50)',
  twinkle: 'rgba(250,199,117,0.80)',
  wave: 'rgba(133,183,235,0.80)',
  breath: 'rgba(180,180,180,0.60)',
  strobe: 'rgba(226,75,74,0.80)',
  fire: '#FAC775',
  meteor: 'rgba(167,196,255,0.85)',
  colorwipe: 'rgba(228,162,255,0.80)',
  plasma: 'rgba(141,222,217,0.85)',
  larson: 'rgba(255,80,80,0.90)',
  confetti: 'rgba(255,220,255,0.85)',
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
