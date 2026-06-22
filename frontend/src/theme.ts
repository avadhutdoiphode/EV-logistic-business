export const colors = {
  bg: "#F9F9F6",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EFEA",
  primary: "#0B3B24",
  primaryDark: "#082A19",
  secondary: "#111827",
  accent: "#D4FF00",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#111827",
  success: "#0B3B24",
  warning: "#D97706",
  danger: "#B91C1C",
  mapBg: "#E8EDE6",
  mapRoad: "#D5DCC9",
  shadow: "rgba(17,24,39,0.06)",
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.textPrimary },
  bodyBold: { fontSize: 15, fontWeight: "600" as const, color: colors.textPrimary },
  small: { fontSize: 12, fontWeight: "400" as const, color: colors.textSecondary },
  smallBold: { fontSize: 12, fontWeight: "700" as const, color: colors.textPrimary },
  number: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
};
