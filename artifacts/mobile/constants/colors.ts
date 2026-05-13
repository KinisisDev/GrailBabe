/**
 * GrailBabe Mobile design tokens.
 *
 * Mirrors artifacts/web/src/index.css — a dark obsidian base with an
 * iridescent neon accent palette (blue / green / yellow / red) and warm
 * bone foreground text. The mobile app is pinned to dark mode in app.json.
 */

const dark = {
  text: "#f4f0e8",
  tint: "#00d4ff",

  background: "#0a0a0f",
  foreground: "#f4f0e8",

  card: "#11111a",
  cardForeground: "#f4f0e8",

  sidebar: "#0d0d14",

  primary: "#00d4ff",
  primaryForeground: "#0a0a0f",

  secondary: "#21222a",
  secondaryForeground: "#f4f0e8",

  muted: "#1d1d24",
  mutedForeground: "#a3a3ac",

  accent: "#fff200",
  accentForeground: "#0a0a0f",

  destructive: "#ff2e63",
  destructiveForeground: "#fbf6ee",

  border: "#262830",
  input: "#21222a",

  // Iridescent neon palette — used for gradient headers, value deltas, badges.
  neonBlue: "#00d4ff",
  neonGreen: "#00ff88",
  neonRed: "#ff2e63",
  neonYellow: "#fff200",
  neonAmber: "#f5b13a",
};

const colors = {
  light: dark,
  dark,
};

export const radius = 12;

export const iridescentGradient = ["#00d4ff", "#00ff88", "#fff200", "#ff2e63", "#00d4ff"] as const;

export default colors;
