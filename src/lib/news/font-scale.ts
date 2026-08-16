import type { FontSize } from "./settings";

/** html font-size em px. Médio = leitor normal; Pequeno ~90%; Grande 125%. */
export const FONT_HTML_PX = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 20,
} as const;

export const FONT_STEPS: { id: Exclude<FontSize, "xl">; label: string }[] = [
  { id: "sm", label: "Pequeno" },
  { id: "md", label: "Médio" },
  { id: "lg", label: "Grande" },
];

export function normalizeFontSize(value: unknown): FontSize {
  if (value === "sm" || value === "lg") return value;
  if (value === "xl") return "lg";
  return "md";
}
