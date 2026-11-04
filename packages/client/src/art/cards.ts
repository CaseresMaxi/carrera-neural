import type { Card, Terrain } from '@sotobosque/engine';
import { INK, PAPER, Pen, shade } from './ink';
import { SUIT_COLORS, drawSuitIcon } from './world';

export const CARD_W = 200;
export const CARD_H = 280;

/** Viñetas originales: una por nombre de carta (centro 100,130; ~150×110). */
const VIGNETTES: Record<string, (p: Pen) => void> = {
  'Dataset Curado': (p) => {
    for (const [x, y] of [[54, 150], [84, 140], [114, 130]] as const) {
      p.rect(x, y - 40, 50, 60, { fill: '#fffaf0', sw: 1.8 });
      for (let k = 0; k < 4; k++) p.line(x + 8, y - 30 + k * 12, x + 42, y - 30 + k * 12, { sw: 1.2, single: true });
    }
    p.path('M128 104 L138 116 L156 92', { stroke: '#3f9a3a', sw: 5 });
  },
  'Web Scrapeada': (p) => {
    p.circle(100, 124, 100, { fill: '#a9cde6', hachure: '#3f8fc4', gap: 8 });
    p.ellipse(100, 124, 44, 100, { sw: 1.6 });
    p.line(50, 124, 150, 124, { sw: 1.6 }).line(58, 100, 142, 100, { sw: 1.2, single: true }).line(58, 148, 142, 148, { sw: 1.2, single: true });
    p.path('M128 160 L150 186 M142 160 L164 176', { stroke: '#7a4e2a', sw: 4 });
    p.circle(124, 156, 14, { fill: '#c9cdd2', sw: 1.6 });
  },
  'Datos Sintéticos': (p) => {
    p.path('M78 70 L78 110 L52 170 Q48 182 62 182 L138 182 Q152 182 148 170 L122 110 L122 70 Z', { fill: '#fffaf0', sw: 2.2 });
    p.path('M64 150 L136 150 L146 172 Q148 180 138 180 L62 180 Q52 180 54 172 Z', { fill: '#a9cde6', stroke: 'none' });
    for (const [x, y, t] of [[84, 168, '1'], [104, 160, '0'], [120, 170, '1'], [96, 130, '0']] as const) p.text(x, y, t, { size: 18, font: 'hand', color: '#3f8fc4' });
  },
  'Feedback de Usuarios': (p) => {
    p.path('M40 80 L130 80 Q140 80 140 90 L140 128 Q140 138 130 138 L74 138 L56 156 L60 138 L50 138 Q40 138 40 128 Z', { fill: '#fffaf0', sw: 2 });
    for (const x of [58, 80, 102]) p.poly([[x, 98], [x + 5, 108], [x + 16, 108], [x + 7, 115], [x + 10, 126], [x, 119], [x - 10, 126], [x - 7, 115], [x - 16, 108], [x - 5, 108]], { fill: '#f2c14e', sw: 1 });
    p.path('M96 150 L166 150 Q174 150 174 158 L174 180 Q174 188 166 188 L156 188 L160 200 L144 188 L96 188 Q88 188 88 180 L88 158 Q88 150 96 150 Z', { fill: '#a9cde6', sw: 2 });
    p.path('M116 168 l8 8 l16 -16', { stroke: '#3f9a3a', sw: 3 });
  },
  'Clúster de GPUs': (p) => {
    for (const [x, y] of [[46, 74], [104, 74], [46, 132], [104, 132]] as const) {
      p.rect(x, y, 52, 50, { fill: '#5a606a', hachure: '#33373d', gap: 6, sw: 2 });
      p.circle(x + 18, y + 25, 22, { fill: '#c9cdd2', sw: 1.4 });
      p.circle(x + 18, y + 25, 6, { fill: '#33373d', sw: 1 });
      p.circle(x + 42, y + 10, 5, { fill: '#7be07b', stroke: 'none', flat: true });
    }
  },
  'Chip a Medida': (p) => {
    p.rect(60, 80, 80, 80, { fill: '#8a8f98', hachure: '#555a62', gap: 6, sw: 2.4 });
    p.rect(80, 100, 40, 40, { fill: '#e2c46a', sw: 1.8 });
    for (const k of [70, 90, 110, 130]) {
      p.line(k, 80, k, 64, { sw: 2.4, single: true }).line(k, 160, k, 176, { sw: 2.4, single: true });
      p.line(60, k + 10, 44, k + 10, { sw: 2.4, single: true }).line(140, k + 10, 156, k + 10, { sw: 2.4, single: true });
    }
  },
  'Créditos de Nube': (p) => {
    p.path('M50 140 Q40 110 66 104 Q70 74 100 78 Q122 60 140 86 Q168 86 160 116 Q174 140 146 146 L62 146 Q48 146 50 140 Z', { fill: '#fffaf0', sw: 2.4 });
    for (const [x, y] of [[74, 170], [100, 178], [126, 170]] as const) {
      p.ellipse(x, y, 34, 14, { fill: '#e2c46a', sw: 1.6 });
      p.text(x, y + 5, '$', { size: 14, font: 'hand' });
    }
  },
  Supercomputadora: (p) => {
    for (const x of [36, 70, 104, 138]) {
      p.rect(x, 70, 28, 116, { fill: '#3a3f47', sw: 2 });
      for (let y = 80; y < 180; y += 14) p.circle(x + 20, y, 4, { fill: (x + y) % 3 ? '#7fd6ff' : '#7be07b', stroke: 'none', flat: true });
    }
    p.line(30, 188, 172, 188, { sw: 2.4 });
  },
  'Investigadora Estrella': (p) => {
    p.circle(100, 100, 52, { fill: '#e8b88a', sw: 2 });
    p.path('M70 92 Q72 60 100 58 Q130 60 130 92 Q120 76 100 78 Q80 76 70 92 Z', { fill: '#4a3020', sw: 1.8 });
    p.circle(88, 100, 14, { stroke: INK, sw: 2 }).circle(112, 100, 14, { stroke: INK, sw: 2 }).line(95, 100, 105, 100, { sw: 1.6 });
    p.path('M60 186 Q62 138 100 132 Q138 138 140 186 Z', { fill: '#fffaf0', sw: 2 });
    p.poly([[150, 70], [156, 84], [170, 84], [158, 92], [163, 106], [150, 98], [137, 106], [142, 92], [130, 84], [144, 84]], { fill: '#f2c14e', sw: 1.4 });
  },
  'Paper Viral': (p) => {
    p.rect(58, 66, 84, 116, { fill: '#fffaf0', sw: 2 });
    p.line(70, 82, 130, 82, { sw: 3, single: true });
    for (let k = 0; k < 6; k++) p.line(70, 100 + k * 12, k === 5 ? 104 : 130, 100 + k * 12, { sw: 1.2, single: true });
    p.path('M140 110 Q170 80 158 54 M150 70 l8 -16 l10 14', { stroke: '#e46f5a', sw: 3 });
    p.text(152, 172, '×1000', { size: 18, font: 'hand', color: '#e46f5a' });
  },
  Hackatón: (p) => {
    p.rect(44, 120, 112, 54, { fill: '#2e3238', sw: 2.2 });
    p.text(100, 152, '{ ; }', { size: 24, font: 'hand', color: '#9df07a' });
    p.path('M44 174 L156 174 L170 190 L30 190 Z', { fill: '#c9cdd2', sw: 2 });
    p.path('M142 78 L174 78 L170 110 L146 110 Z', { fill: '#fffaf0', sw: 2 });
    for (const x of [152, 162]) p.curve([[x, 72], [x + 4, 62], [x, 52]], { stroke: '#9a9488', sw: 2, single: true });
    p.path('M70 80 Q70 60 90 60 Q110 60 110 80', { sw: 2 }).text(90, 104, '24h', { size: 22 });
  },
  Becarios: (p) => {
    for (const [x, c] of [[64, '#e0913a'], [100, '#3f8fc4'], [136, '#3f9a3a']] as const) {
      p.circle(x, 104, 30, { fill: '#e8b88a', sw: 1.8 });
      p.path(`M${x - 24} 184 Q${x - 22} 132 ${x} 128 Q${x + 22} 132 ${x + 24} 184 Z`, { fill: c, sw: 1.8 });
      p.poly([[x - 22, 88], [x, 78], [x + 22, 88], [x, 96]], { fill: INK, sw: 1 });
    }
  },
  'Demo en Vivo': (p) => {
    p.rect(40, 70, 120, 84, { fill: '#2e3238', sw: 2.4 });
    p.rect(50, 80, 100, 64, { fill: '#7fd6ff', sw: 1.4 });
    p.poly([[90, 96], [118, 112], [90, 128]], { fill: '#fffaf0', sw: 2 });
    p.circle(140, 90, 10, { fill: '#e4473a', stroke: 'none', flat: true });
    p.line(100, 154, 100, 180, { sw: 3 }).line(70, 184, 130, 184, { sw: 3 });
  },
  'Ronda Serie A': (p) => {
    p.path('M70 100 Q60 80 82 76 L118 76 Q140 80 130 100 Q170 130 150 176 Q100 196 50 176 Q30 130 70 100 Z', { fill: '#c9a24a', hachure: '#8a6a24', gap: 7 });
    p.path('M78 76 Q100 56 122 76', { sw: 2.4 });
    p.text(100, 156, '$', { size: 48, color: '#fffaf0' });
  },
  Keynote: (p) => {
    p.rect(30, 66, 140, 74, { fill: '#fffaf0', sw: 2 });
    p.path('M44 124 L76 104 L100 116 L150 80', { stroke: '#d94f8a', sw: 4 });
    p.circle(100, 170, 20, { fill: '#e8b88a', sw: 1.8 });
    p.path('M78 200 Q80 184 100 182 Q120 184 122 200 Z', { fill: INK, sw: 1.4 });
    p.washEllipse(100, 160, 50, 30, '#fff1a8', 0.5);
  },
  'Tendencia Viral': (p) => {
    p.line(40, 180, 160, 180, { sw: 2 }).line(40, 180, 40, 70, { sw: 2 });
    p.path('M48 170 L80 150 L104 158 L150 80', { stroke: '#d94f8a', sw: 5 });
    p.poly([[150, 80], [134, 84], [148, 96]], { fill: '#d94f8a', sw: 1.6 });
    for (const [x, y] of [[70, 96], [120, 120], [92, 80]] as const) p.path(`M${x} ${y} q-10 -12 0 -18 q10 6 0 18 Z`, { fill: '#e4473a', sw: 1.2 });
  },
};

const SUIT_NAMES: Record<Terrain | 'hype', string> = { datos: 'Datos', computo: 'Cómputo', talento: 'Talento', hype: 'Hype · comodín' };

export function drawCard(p: Pen, card: Pick<Card, 'name' | 'suit'>) {
  const c = SUIT_COLORS[card.suit];
  p.rect(6, 6, 188, 268, { fill: PAPER, sw: 3 });
  p.rect(16, 16, 168, 168, { fill: shade(c, 1.55), sw: 1.8 });
  p.washEllipse(100, 110, 70, 50, shade(c, 1.2), 0.45);
  VIGNETTES[card.name]?.(p);
  drawSuitIcon(p, card.suit, 30, 30, 0.34);
  p.path('M14 196 L186 196 L180 222 L186 248 L14 248 L20 222 Z', { fill: c, sw: 2 });
  p.text(100, 232, card.name, { size: card.name.length > 14 ? 22 : card.name.length > 11 ? 26 : 29, color: '#fffaf0' });
  p.text(100, 268, SUIT_NAMES[card.suit], { size: 16, font: 'hand', color: shade(c, 0.55) });
}

export function drawCardBack(p: Pen) {
  p.rect(6, 6, 188, 268, { fill: '#2e3a56', hachure: '#1f2740', gap: 10, sw: 3 });
  p.rect(18, 18, 164, 244, { stroke: '#e9d9a8', sw: 2 });
  // red neuronal dibujada a mano
  const layers = [[70, 110, 150], [90, 130], [70, 110, 150]];
  const nodes = layers.flatMap((ys, i) => ys.map((y) => [56 + i * 44, y] as [number, number]));
  for (let i = 0; i < layers.length - 1; i++)
    for (const y1 of layers[i]) for (const y2 of layers[i + 1]) p.line(56 + i * 44, y1, 100 + i * 44, y2, { stroke: '#7fd6ff', sw: 1.4, single: true, opacity: 0.8 });
  for (const [x, y] of nodes) p.circle(x, y, 18, { fill: '#e9d9a8', sw: 1.8 });
  p.text(100, 220, 'Carrera', { size: 30, color: '#f4ead2' });
  p.text(100, 250, 'Neural', { size: 30, color: '#f2c14e' });
}

// ───────────────────────── dados (128×128) ─────────────────────────

const PIPS: Record<number, [number, number][]> = {
  1: [[64, 64]],
  2: [[38, 38], [90, 90]],
  3: [[36, 36], [64, 64], [92, 92]],
  4: [[38, 38], [90, 38], [38, 90], [90, 90]],
  5: [[38, 38], [90, 38], [64, 64], [38, 90], [90, 90]],
  6: [[38, 34], [90, 34], [38, 64], [90, 64], [38, 94], [90, 94]],
};

export function drawDieFace(p: Pen, value: number, color: string) {
  p.rect(4, 4, 120, 120, { fill: shade(color, 1.6), hachure: shade(color, 1.1), gap: 12, sw: 3 });
  if (value >= 4) p.circle(64, 64, 112, { stroke: shade(color, 0.7), sw: 2.4, rough: 1.6 });
  for (const [x, y] of PIPS[value]) p.circle(x, y, 18, { fill: INK, sw: 1.4 });
}
