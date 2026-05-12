// Explicit vitest project list. Without this, vitest auto-discovers all npm
// workspaces (including the root RN/Expo app, which uses Jest, not Vitest)
// and tries to load its Jest-only test files.
export default ['apps/simulator', 'packages/led-engine'];
