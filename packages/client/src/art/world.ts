import type { ItemKind, Terrain } from '@sotobosque/engine';
import { INK, PARCHMENT, Pen, rng, shade } from './ink';

// ───────────────────────── íconos de recurso (128×128) ─────────────────────────

export const SUIT_COLORS: Record<Terrain | 'hype', string> = {
  datos: '#3f8fc4',
  computo: '#8a8f98',
  talento: '#e0913a',
  hype: '#d94f8a',
};

function cylinder(p: Pen, cx: number, top: number, w: number, h: number, fill: string) {
  p.path(`M${cx - w / 2} ${top} L${cx - w / 2} ${top + h} A${w / 2} ${w / 6} 0 0 0 ${cx + w / 2} ${top + h} L${cx + w / 2} ${top} Z`, { fill, hachure: shade(fill, 0.6), gap: 6 });
  p.ellipse(cx, top, w, w / 3, { fill: shade(fill, 1.3), sw: 2 });
}

export function drawSuitIcon(p: Pen, suit: Terrain | 'hype', cx = 64, cy = 64, s = 1) {
  p.g(`translate(${cx - 64 * s} ${cy - 64 * s}) scale(${s})`, () => {
    p.circle(64, 64, 112, { fill: '#fbf3dc', sw: 3 });
    switch (suit) {
      case 'datos':
        // base de datos: cilindro apilado
        cylinder(p, 64, 30, 60, 60, SUIT_COLORS.datos);
        for (const y of [50, 70]) p.curve([[34, y], [64, y + 10], [94, y]], { sw: 1.8 });
        p.circle(80, 82, 6, { fill: '#9df07a', sw: 1 });
        break;
      case 'computo':
        // chip con patitas
        p.rect(36, 36, 56, 56, { fill: SUIT_COLORS.computo, hachure: '#555a62', gap: 6, sw: 2.4 });
        p.rect(50, 50, 28, 28, { fill: '#3a3f47', sw: 1.8 });
        for (const k of [44, 58, 72, 84]) {
          p.line(k, 36, k, 24, { sw: 2.4, single: true }).line(k, 92, k, 104, { sw: 2.4, single: true });
          p.line(36, k, 24, k, { sw: 2.4, single: true }).line(92, k, 104, k, { sw: 2.4, single: true });
        }
        break;
      case 'talento':
        // cabeza con lamparita de idea
        p.path('M38 104 Q30 70 46 50 Q62 32 84 40 Q100 48 98 70 L104 82 L96 84 L96 96 L80 98 L78 104 Z', { fill: SUIT_COLORS.talento, hachure: '#9a5a1e', gap: 6 });
        p.circle(70, 30, 22, { fill: '#fff0a6', sw: 1.8 });
        for (const a of [-1.2, -0.6, 0, 0.6, 1.2]) p.line(70 + Math.sin(a) * 15, 30 - Math.cos(a) * 15, 70 + Math.sin(a) * 23, 30 - Math.cos(a) * 23, { stroke: '#d9a43a', sw: 2, single: true });
        break;
      case 'hype':
        // cohete
        p.path('M64 18 Q88 38 84 80 L44 80 Q40 38 64 18 Z', { fill: '#fffaf0', sw: 2.4 });
        p.circle(64, 50, 16, { fill: SUIT_COLORS.hype, sw: 1.8 });
        p.poly([[44, 70], [30, 92], [46, 86]], { fill: SUIT_COLORS.hype, sw: 1.8 });
        p.poly([[84, 70], [98, 92], [82, 86]], { fill: SUIT_COLORS.hype, sw: 1.8 });
        p.path('M50 82 Q64 116 78 82 Z', { fill: '#ffb34a', sw: 1.6 });
        break;
    }
  });
}

// ───────────────────────── ciudad (figuras de cartón) ─────────────────────────

export function drawTower(p: Pen, seed = 1) {
  const r = rng(seed);
  const c = shade(seed % 2 ? '#8fa9c4' : '#b8a48a', 0.9 + r() * 0.2);
  const top = seed % 2 ? 30 : 80;
  p.rect(48, top, 104, 292 - top, { fill: c, hachure: shade(c, 0.6), gap: 10, angle: 80, sw: 2.6 });
  for (let y = top + 18; y < 270; y += 28)
    for (const x of [62, 90, 118]) p.rect(x, y, 20, 16, { fill: r() < 0.35 ? '#ffe08a' : '#dfeaf2', sw: 1.4, single: true });
  p.rect(84, 262, 32, 30, { fill: '#5a4636', sw: 1.8 });
  if (seed % 2) {
    p.line(100, top, 100, top - 24, { sw: 2.4 });
    p.circle(100, top - 26, 8, { fill: '#e46f5a', sw: 1.2 });
  } else p.rect(40, top - 12, 120, 14, { fill: shade(c, 0.75), sw: 2 });
}

export function drawServerRack(p: Pen) {
  p.rect(44, 60, 112, 232, { fill: '#3a3f47', hachure: '#22262b', gap: 8, sw: 2.6 });
  for (let y = 76; y < 276; y += 26) {
    p.rect(56, y, 88, 18, { fill: '#5a606a', sw: 1.4, single: true });
    p.circle(130, y + 9, 6, { fill: y % 52 ? '#7be07b' : '#7fd6ff', stroke: 'none', flat: true });
    p.line(64, y + 9, 108, y + 9, { stroke: '#22262b', sw: 1.6, single: true });
  }
}

export function drawAntenna(p: Pen) {
  p.poly([[100, 40], [62, 292], [138, 292]], { stroke: INK, sw: 2.6 });
  for (const y of [100, 160, 220]) {
    const w = ((y - 40) / 252) * 38;
    p.line(100 - w, y, 100 + w, y, { sw: 2 });
    p.line(100 - w, y, 100 + w * 1.2, y + 60, { sw: 1.4, single: true });
  }
  p.circle(100, 40, 14, { fill: '#e46f5a', sw: 1.6 });
  for (const k of [1, 2]) p.curve([[100 - 22 * k, 40 - 14 * k], [100, 40 - 24 * k], [100 + 22 * k, 40 - 14 * k]], { stroke: '#7fd6ff', sw: 2.4, single: true });
}

export function drawPlant(p: Pen, seed = 3) {
  const r = rng(seed);
  p.path('M64 110 L136 110 L126 148 L74 148 Z', { fill: '#c46a3a', hachure: '#8a4220', gap: 6 });
  const c = shade('#5b9442', 0.85 + r() * 0.25);
  for (const [x, y, d] of [[70, 80, 56], [104, 64, 70], [134, 82, 54], [100, 94, 60]] as const) p.circle(x, y, d, { fill: c, hachure: shade(c, 0.6), gap: 8 });
}

export function drawBench(p: Pen) {
  p.rect(20, 50, 120, 14, { fill: '#a9784a', sw: 2 });
  p.rect(20, 70, 120, 12, { fill: '#a9784a', sw: 2 });
  p.line(32, 82, 30, 110, { sw: 4 }).line(128, 82, 130, 110, { sw: 4 });
}

export function drawCoffee(p: Pen) {
  p.path('M36 50 L108 50 L98 150 L46 150 Z', { fill: '#fffaf0', sw: 2.4 });
  p.rect(32, 40, 80, 14, { fill: '#5a3a20', sw: 2 });
  p.rect(40, 84, 64, 28, { fill: '#8a5a32', sw: 1.6 });
  for (const x of [56, 72, 88]) p.curve([[x, 30], [x + 6, 18], [x, 6]], { stroke: '#9a9488', sw: 2, single: true });
}

export function drawCables(p: Pen) {
  for (const [c, dy] of [['#3f8fc4', 0], ['#e46f5a', 14], ['#f2c14e', 28]] as const)
    p.curve([[10, 120 + dy], [40, 60 + dy], [80, 150 + dy], [110, 80 + dy]], { stroke: c, sw: 5 });
  p.rect(92, 60, 26, 40, { fill: '#3a3f47', sw: 2 });
}

// ───────────────────────── estructuras (losetas 256×256) ─────────────────────────

function tile(p: Pen, color: string, round = false) {
  if (round) {
    p.circle(128, 128, 236, { fill: color, sw: 3.5 });
    p.circle(128, 128, 196, { fill: PARCHMENT, sw: 2 });
  } else {
    p.rect(12, 12, 232, 232, { fill: color, sw: 3.5 });
    p.rect(30, 30, 196, 196, { fill: PARCHMENT, sw: 2 });
  }
}

export function drawDatacenter(p: Pen, color: string) {
  tile(p, color);
  p.rect(44, 92, 168, 108, { fill: '#5a606a', hachure: '#33373d', gap: 7, sw: 2.6 });
  p.poly([[44, 92], [128, 56], [212, 92]], { fill: '#8a8f98', sw: 2.4 });
  for (const x of [60, 104, 148]) {
    p.rect(x, 108, 36, 76, { fill: '#2e3238', sw: 1.6 });
    for (let y = 116; y < 180; y += 14) p.circle(x + 28, y, 5, { fill: y % 28 ? '#7be07b' : '#7fd6ff', stroke: 'none', flat: true });
  }
  for (const x of [80, 176]) {
    p.circle(x, 74, 22, { fill: '#d9dde2', sw: 1.6 });
    p.line(x - 9, 74, x + 9, 74, { sw: 1.4, single: true }).line(x, 65, x, 83, { sw: 1.4, single: true });
  }
  p.line(36, 204, 220, 204, { sw: 2 });
}

export function drawRepo(p: Pen, color: string) {
  tile(p, color);
  p.path('M44 76 L104 76 L118 92 L212 92 L212 204 L44 204 Z', { fill: '#f2c14e', hachure: '#b98a24', gap: 8 });
  // árbol de ramas
  p.line(92, 116, 92, 190, { stroke: color, sw: 6 });
  p.curve([[92, 168], [92, 140], [150, 136], [150, 116]], { stroke: color, sw: 6 });
  for (const [x, y] of [[92, 116], [92, 190], [150, 116], [92, 150]] as const) p.circle(x, y, 20, { fill: '#fffaf0', sw: 2.4 });
  p.poly([[176, 150], [182, 164], [196, 164], [184, 172], [190, 186], [176, 178], [162, 186], [168, 172], [156, 164], [170, 164]], { fill: '#fffaf0', sw: 1.8 });
}

export function drawLab(p: Pen, color: string) {
  tile(p, color);
  // escudo
  p.path('M128 42 L204 66 Q204 168 128 214 Q52 168 52 66 Z', { fill: '#efe3c8', hachure: shade('#efe3c8', 0.7), gap: 8, sw: 2.6 });
  // matraz
  p.path('M114 84 L114 120 L86 176 Q82 190 96 190 L160 190 Q174 190 170 176 L142 120 L142 84 Z', { fill: '#fffaf0', sw: 2.4 });
  p.path('M98 160 L158 160 L170 178 Q172 188 160 188 L96 188 Q84 188 86 178 Z', { fill: '#7be07b', stroke: 'none' });
  p.rect(108, 76, 40, 10, { fill: color, sw: 1.8 });
  for (const [x, y, d] of [[120, 172, 10], [140, 166, 7], [130, 146, 6]] as const) p.circle(x, y, d, { fill: '#fffaf0', sw: 1.2 });
}

export function drawDemoToken(p: Pen, color: string) {
  tile(p, color, true);
  p.washEllipse(128, 128, 76, 70, '#ffe26a', 0.6);
  // laptop con "play"
  p.rect(70, 72, 116, 80, { fill: '#2e3238', sw: 2.6 });
  p.rect(80, 82, 96, 60, { fill: '#7fd6ff', sw: 1.4 });
  p.poly([[116, 96], [146, 112], [116, 128]], { fill: '#fffaf0', sw: 2 });
  p.poly([[58, 152], [198, 152], [210, 172], [46, 172]], { fill: '#c9cdd2', sw: 2.4 });
  for (const [x, y] of [[66, 56], [192, 60], [70, 196], [186, 192]] as const) p.path(`M${x} ${y - 9} L${x} ${y + 9} M${x - 9} ${y} L${x + 9} ${y}`, { stroke: '#d94f8a', sw: 2.4 });
}

export function drawCluster(p: Pen, color: string) {
  tile(p, color);
  // racks compactos y eficientes
  for (const [x, y] of [[50, 70], [130, 70], [50, 142], [130, 142]] as const) {
    p.rect(x, y, 76, 60, { fill: '#3a3f47', hachure: '#22262b', gap: 7, sw: 2 });
    for (let k = 0; k < 3; k++) p.rect(x + 8, y + 8 + k * 16, 44, 10, { fill: '#5a606a', sw: 1, single: true });
    p.circle(x + 64, y + 14, 6, { fill: '#7be07b', stroke: 'none', flat: true });
  }
  p.path('M118 118 Q134 100 150 108 Q140 128 118 118 Z', { fill: '#7be07b', sw: 1.6 });
}

// ───────────────────────── detalles de mercado (para el tablero) ─────────────────────────

export const TERRAIN_FILL: Record<Terrain, string> = {
  datos: '#a9cde6',
  computo: '#c6c9cf',
  talento: '#f2cf99',
};

export function drawGladeDecor(p: Pen, terrain: Terrain, cx: number, cy: number, r: number, seed: number) {
  const rand = rng(seed);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = r * (0.45 + rand() * 0.45);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    if (terrain === 'datos') p.text(x, y, rand() < 0.5 ? '0' : '1', { size: 22 + rand() * 10, font: 'hand', color: shade('#3f8fc4', 0.8 + rand() * 0.3) });
    else if (terrain === 'computo') {
      const s = 10 + rand() * 10;
      p.rect(x - s / 2, y - s / 2, s, s, { stroke: shade('#6a6f78', 0.9 + rand() * 0.2), sw: 1.6, single: true });
    } else p.circle(x, y, 6 + rand() * 6, { fill: shade('#e0913a', 0.8 + rand() * 0.3), stroke: 'none' });
  }
}

export function drawScribbleRing(p: Pen) {
  for (let i = 0; i < 3; i++) p.circle(128, 128, 226 - i * 6, { stroke: '#ffffff', sw: 7 - i * 1.5, rough: 1.8, single: true });
}

// ───────────────────────── componentes del Redditor (fichas 128×128) ─────────────────────────

export function drawItem(p: Pen, kind: ItemKind) {
  p.rect(8, 8, 112, 112, { fill: '#fbf3dc', sw: 3 });
  switch (kind) {
    case 'cafe':
      p.path('M38 46 L86 46 L80 104 L44 104 Z', { fill: '#fffaf0', sw: 2.4 });
      p.path('M86 56 Q104 58 100 78 Q96 88 82 86', { sw: 2.4, single: true });
      p.rect(42, 64, 40, 18, { fill: '#8a5a32', sw: 1.4 });
      for (const x of [50, 62, 74]) p.curve([[x, 38], [x + 5, 28], [x, 18]], { stroke: '#9a9488', sw: 2, single: true });
      break;
    case 'gpu':
      p.rect(18, 40, 92, 48, { fill: '#3a3f47', sw: 2.4 });
      p.circle(46, 64, 32, { fill: '#59606b', sw: 2 }).circle(82, 64, 32, { fill: '#59606b', sw: 2 });
      for (const cx of [46, 82]) for (const a of [0, 60, 120]) {
        const r = (a * Math.PI) / 180;
        p.line(cx - 13 * Math.cos(r), 64 - 13 * Math.sin(r), cx + 13 * Math.cos(r), 64 + 13 * Math.sin(r), { sw: 1.6, single: true, stroke: '#c9cdd2' });
      }
      p.rect(26, 88, 60, 10, { fill: '#e2c46a', sw: 1.4 });
      p.line(20, 44, 108, 44, { stroke: '#ff5a7a', sw: 2, single: true });
      break;
    case 'dataset':
      p.rect(28, 22, 72, 84, { fill: '#3f8fc4', sw: 2.4 });
      p.rect(42, 22, 44, 30, { fill: '#e8eef2', sw: 1.8 });
      p.rect(70, 28, 10, 18, { fill: '#3a3f47', stroke: 'none', flat: true });
      p.rect(38, 66, 52, 34, { fill: '#fffaf0', sw: 1.6 });
      p.text(64, 90, '01', { size: 20, font: 'hand' });
      break;
    case 'teclado':
      p.path('M14 58 L114 52 L118 96 L10 100 Z', { fill: '#59606b', sw: 2.4 });
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 6; c++)
          p.rect(20 + c * 15 + r * 2, 60 + r * 12, 12, 9, { fill: ['#ff9ac2', '#9ad8ff', '#fff0a0'][(r + c) % 3], sw: 1 });
      p.curve([[64, 52], [60, 36], [76, 24], [70, 10]], { stroke: '#2b2118', sw: 2.2, single: true });
      break;
  }
}
