/**
 * Pocket card color presets (chips only, no RGB/HEX input).
 * Warm, Pastel, Dark palettes.
 */

export const POCKET_COLOR_PALETTES = {
  warm: [
    '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b',
    '#f97316', '#ea580c', '#dc2626', '#fecaca', '#fca5a5',
  ],
  pastel: [
    '#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e',
    '#a5f3fc', '#67e8f9', '#22d3ee', '#e9d5ff', '#d8b4fe',
    '#fce7f3', '#fbcfe8', '#fda4af', '#fb7185',
  ],
  dark: [
    '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8',
    '#0f172a', '#1c1917', '#292524', '#44403c', '#57534e',
  ],
} as const

export type PaletteKey = keyof typeof POCKET_COLOR_PALETTES

export const DEFAULT_POCKET_COLOR = '#e2e8f0' // slate-200

export function getPaletteColors(key: PaletteKey): string[] {
  return [...POCKET_COLOR_PALETTES[key]]
}

export function getAllPresetColors(): string[] {
  return [
    ...POCKET_COLOR_PALETTES.warm,
    ...POCKET_COLOR_PALETTES.pastel,
    ...POCKET_COLOR_PALETTES.dark,
  ]
}

/** Relative luminance (0–1). Used to decide light vs dark text on colored backgrounds. */
export function luminance(hex: string): number {
  const h = hex.replace(/^#/, '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h.slice(0, 6), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** True when background is dark; use white text for contrast. */
export function isDarkColor(hex: string): boolean {
  return luminance(hex || DEFAULT_POCKET_COLOR) < 0.4
}
