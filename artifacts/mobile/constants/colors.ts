/**
 * GrailBabe Mobile design tokens.
 *
 * Synced from artifacts/web/src/index.css (HSL -> hex). The web app is
 * dark-only with an editorial navy + champagne palette, so the mobile app
 * mirrors that aesthetic by storing dark values under `light` and pinning
 * the app to dark mode in app.json (userInterfaceStyle: "dark").
 */

const dark = {
  text: "#f4f0e8",
  tint: "#1f8aff",

  background: "#0a0a0f",
  foreground: "#f4f0e8",

  card: "#11111a",
  cardForeground: "#f4f0e8",

  primary: "#1f8aff",
  primaryForeground: "#0e0e16",

  secondary: "#21222a",
  secondaryForeground: "#f4f0e8",

  muted: "#1d1d24",
  mutedForeground: "#a3a3ac",

  accent: "#f5b13a",
  accentForeground: "#0e0e16",

  destructive: "#e84141",
  destructiveForeground: "#fbf6ee",

  border: "#262830",
  input: "#21222a",
};

const colors = {
  light: dark,
  dark,
};

export const radius = 12;

export default colors;
