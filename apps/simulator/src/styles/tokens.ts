// Color tokens for the simulator.
//
// Findings from the companion RN app (src/utils/theme.ts):
//   The RN app exposes an iOS-style dark/light palette (background, surface,
//   primary #007AFF, secondary #5856D6, gradientStart/End, success/warning/error).
//   It does NOT publish a tokens module, and its dark surface (#1C1C1E) is lighter
//   than what the simulator mockup calls for. So we adopt the approved Phase 2 UI
//   spec values from Handoff.md verbatim, and re-export the RN accent palette
//   alongside for shared semantics (success/warning/error toasts, etc.).

export const simulatorTokens = {
  app: '#0d0d0f',
  stripCanvas: '#060608',
  divider: 'rgba(255,255,255,0.07)',
  borderSubtle: '0.5px solid rgba(255,255,255,0.07)',
  panelLabel: 'rgba(255,255,255,0.28)',

  primary: {
    bg: '#3C3489',
    border: '#534AB7',
    text: '#CECBF6',
    tintBg: 'rgba(83,74,183,0.18)',
    tintBorder: 'rgba(83,74,183,0.50)',
  },
  secondary: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    text: 'rgba(255,255,255,0.60)',
  },
  card: {
    bg: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.07)',
  },
} as const;

// Accent palette mirrored from src/utils/theme.ts (dark theme).
export const accent = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
} as const;
