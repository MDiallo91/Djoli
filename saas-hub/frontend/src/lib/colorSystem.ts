/**
 * lib/colorSystem.ts
 * Génère une palette de couleurs 50-900 à partir d'une couleur hex admin.
 * L'input est traité comme le shade 600 (couleur de bouton typique).
 * Injecte les CSS custom properties dans <head> pour Tailwind.
 */

// ─── Conversions ───────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgbTriple(hex: string): string {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ].join(' ');
}

// ─── Génération de palette ─────────────────────────────────────

// Offsets de lightness par rapport au shade 600 (l'input admin)
// Saturation réduite pour les teintes très claires
const SHADE_CONFIG: Array<[number, number, number]> = [
  // [shade, deltaL, satScale (0→1)]
  [50,  62, 0.12],
  [100, 57, 0.22],
  [200, 47, 0.42],
  [300, 33, 0.65],
  [400, 19, 0.85],
  [500, 9,  0.95],
  [600, 0,  1.00],
  [700, -9, 1.00],
  [800, -17, 0.92],
  [900, -23, 0.80],
];

export function generatePalette(hex: string): Record<number, string> {
  const [h, s, l] = hexToHsl(hex);
  const palette: Record<number, string> = {};
  for (const [shade, deltaL, satScale] of SHADE_CONFIG) {
    const targetL = Math.min(97, Math.max(3, l + deltaL));
    const targetS = Math.min(100, Math.round(s * satScale));
    palette[shade] = hslToHex(h, targetS, targetL);
  }
  return palette;
}

// ─── Injection CSS ─────────────────────────────────────────────

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function injectTheme(primaryHex: string, secondaryHex: string, dark: boolean): void {
  const primary   = generatePalette(primaryHex);
  const secondary = generatePalette(secondaryHex);

  const paletteVars = SHADES.flatMap(s => [
    `--primary-${s}: ${primary[s]};`,
    `--primary-${s}-rgb: ${hexToRgbTriple(primary[s])};`,
    `--secondary-${s}: ${secondary[s]};`,
    `--secondary-${s}-rgb: ${hexToRgbTriple(secondary[s])};`,
  ]).join('\n  ');

  const lightTokens = `
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border-color: #e2e8f0;
  --text-default: #0f172a;
  --text-muted: #64748b;`;

  const darkTokens = `
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #334155;
  --border-color: #334155;
  --text-default: #f1f5f9;
  --text-muted: #94a3b8;`;

  let el = document.getElementById('djoli-theme') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'djoli-theme';
    document.head.appendChild(el);
  }

  el.textContent = `:root {\n  ${paletteVars}\n${dark ? darkTokens : lightTokens}\n}`;
  document.documentElement.classList.toggle('dark', dark);
}
