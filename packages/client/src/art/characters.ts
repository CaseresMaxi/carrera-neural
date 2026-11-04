import type { FactionId } from '@sotobosque/engine';
import { INK, Pen, shade } from './ink';

/**
 * Mascotas originales caricaturescas de cada empresa (sin logos oficiales), figuras para recortar
 * dibujadas de frente en un lienzo 240×300. Los pies quedan en y≈292.
 */
export const CHAR_W = 240;
export const CHAR_H = 300;

const WHITE = '#fffaf0';
const BLUSH = '#f08a7a';
const STEEL = '#c9cdd2';
const SCREEN = '#1f2a33';

/** Ojo de pantalla LED: un óvalo brillante con reflejo. */
function ledEye(p: Pen, x: number, y: number, w: number, h: number, color: string) {
  p.ellipse(x, y, w, h, { fill: color, stroke: 'none', flat: true });
  p.ellipse(x - w * 0.18, y - h * 0.2, w * 0.3, h * 0.3, { fill: WHITE, stroke: 'none', flat: true });
}

function smile(p: Pen, x: number, y: number, w: number, color: string) {
  p.curve([[x - w / 2, y], [x, y + w * 0.32], [x + w / 2, y]], { stroke: color, sw: 3, single: true });
}

/** Google DeepMind: robot corporativo de traje, corbata y maletín. */
export function drawGoogleBot(p: Pen, color = '#3b6fb6') {
  const dark = shade(color, 0.62);
  // piernas y zapatos
  p.rect(92, 248, 20, 36, { fill: '#2e3440', sw: 2 });
  p.rect(128, 248, 20, 36, { fill: '#2e3440', sw: 2 });
  p.ellipse(98, 288, 36, 12, { fill: INK, sw: 1.6 });
  p.ellipse(142, 288, 36, 12, { fill: INK, sw: 1.6 });
  // maletín
  p.rect(170, 222, 52, 40, { fill: '#7a4e2a', hachure: '#4a2e18', gap: 6, sw: 2.2 });
  p.path('M186 222 L186 212 L206 212 L206 222', { sw: 2.4 });
  p.line(170, 238, 222, 238, { sw: 1.6, single: true });
  p.rect(192, 234, 8, 8, { fill: '#e2c46a', sw: 1.2 });
  // torso: saco
  p.path('M66 170 Q120 152 174 170 L170 254 L70 254 Z', { fill: color, hachure: dark, gap: 8, angle: 30 });
  p.poly([[104, 164], [120, 214], [136, 164]], { fill: WHITE, sw: 2 });
  p.poly([[114, 172], [126, 172], [130, 222], [120, 236], [110, 222]], { fill: '#d6453a', sw: 1.8 });
  p.path('M104 164 L96 200 L120 214', { sw: 2 });
  p.path('M136 164 L144 200 L120 214', { sw: 2 });
  // credencial
  p.rect(140, 206, 22, 28, { fill: WHITE, sw: 1.6 });
  p.rect(144, 210, 14, 9, { fill: color, stroke: 'none', flat: true });
  p.line(144, 226, 158, 226, { sw: 1.2, single: true });
  // brazos
  p.line(70, 180, 52, 236, { stroke: color, sw: 13 });
  p.circle(52, 240, 18, { fill: STEEL, sw: 1.8 });
  p.line(170, 180, 192, 214, { stroke: color, sw: 13 });
  p.circle(194, 214, 18, { fill: STEEL, sw: 1.8 });
  // cuello
  p.rect(108, 146, 24, 16, { fill: STEEL, sw: 1.8 });
  // cabeza monitor
  p.rect(58, 54, 124, 96, { fill: STEEL, hachure: shade(STEEL, 0.7), gap: 9, sw: 2.6 });
  p.rect(70, 66, 100, 70, { fill: SCREEN, sw: 2 });
  ledEye(p, 98, 96, 22, 26, '#7fd6ff');
  ledEye(p, 142, 96, 22, 26, '#7fd6ff');
  smile(p, 120, 116, 30, '#7fd6ff');
  // antena con nube
  p.line(120, 54, 120, 30, { sw: 3 });
  p.path('M100 26 Q100 10 116 12 Q124 0 136 10 Q150 8 148 24 Q150 34 136 32 L106 32 Q96 32 100 26 Z', { fill: WHITE, sw: 2 });
  // orejas
  p.rect(46, 84, 12, 34, { fill: color, sw: 1.8 });
  p.rect(182, 84, 12, 34, { fill: color, sw: 1.8 });
}

/** Meta AI: dron-abeja comunitario de cabeza hexagonal, buzo con capucha y laptop con stickers. */
export function drawMetaBot(p: Pen, color = '#3f9a3a') {
  const dark = shade(color, 0.62);
  const honey = '#f2c14e';
  // alas
  p.ellipse(56, 170, 70, 40, { fill: 'rgba(210,236,250,0.85)', sw: 1.8 });
  p.ellipse(184, 170, 70, 40, { fill: 'rgba(210,236,250,0.85)', sw: 1.8 });
  p.ellipse(64, 196, 50, 28, { fill: 'rgba(210,236,250,0.85)', sw: 1.6 });
  p.ellipse(176, 196, 50, 28, { fill: 'rgba(210,236,250,0.85)', sw: 1.6 });
  // piernas
  p.line(102, 250, 96, 284, { stroke: INK, sw: 6 });
  p.line(138, 250, 144, 284, { stroke: INK, sw: 6 });
  p.ellipse(92, 288, 30, 12, { fill: honey, sw: 1.6 });
  p.ellipse(148, 288, 30, 12, { fill: honey, sw: 1.6 });
  // buzo
  p.path('M72 176 Q120 156 168 176 L172 256 L68 256 Z', { fill: color, hachure: dark, gap: 8, angle: 60 });
  p.path('M96 164 Q120 186 144 164', { sw: 2.4 });
  p.line(112, 178, 110, 206, { sw: 1.6, single: true });
  p.line(128, 178, 130, 206, { sw: 1.6, single: true });
  // laptop con stickers
  p.poly([[70, 214], [170, 214], [182, 250], [58, 250]], { fill: '#d9dde2', sw: 2.2 });
  p.rect(74, 220, 92, 24, { fill: '#b8bec6', sw: 1.4 });
  p.circle(96, 232, 14, { fill: honey, sw: 1.2 });
  p.poly([[128, 224], [140, 224], [146, 234], [140, 244], [128, 244], [122, 234]], { fill: '#e46f5a', sw: 1.2 });
  p.text(152, 238, '</>', { size: 14, font: 'hand' });
  // manos
  p.circle(64, 232, 18, { fill: honey, sw: 1.8 });
  p.circle(176, 232, 18, { fill: honey, sw: 1.8 });
  // cabeza hexagonal
  const hex = (cx: number, cy: number, r: number): [number, number][] =>
    Array.from({ length: 6 }, (_, i) => [cx + Math.cos((Math.PI / 3) * i + Math.PI / 6) * r, cy + Math.sin((Math.PI / 3) * i + Math.PI / 6) * r]);
  p.poly(hex(120, 104, 70), { fill: honey, hachure: shade(honey, 0.7), gap: 9, angle: 30, sw: 2.6 });
  p.poly(hex(120, 104, 52), { fill: '#3a2e1c', sw: 2 });
  ledEye(p, 100, 100, 22, 24, '#9df07a');
  ledEye(p, 140, 100, 22, 24, '#9df07a');
  smile(p, 120, 118, 26, '#9df07a');
  // antenas
  p.curve([[100, 40], [92, 22], [78, 14]], { sw: 2.6 });
  p.curve([[140, 40], [148, 22], [162, 14]], { sw: 2.6 });
  p.circle(78, 14, 12, { fill: color, sw: 1.6 });
  p.circle(162, 14, 12, { fill: color, sw: 1.6 });
}

/** Anthropic: robot de seguridad con casco-cúpula, un gran lente y escudo con tilde. */
export function drawAnthropicBot(p: Pen, color = '#c4532b') {
  const dark = shade(color, 0.62);
  const cream = '#efe3c8';
  // piernas tipo oruga
  p.rect(78, 262, 84, 26, { fill: '#4a4a4a', hachure: '#222', gap: 6, angle: 90, sw: 2.2 });
  for (const x of [90, 120, 150]) p.circle(x, 275, 14, { fill: STEEL, sw: 1.4 });
  // cuerpo
  p.rect(74, 164, 92, 100, { fill: color, hachure: dark, gap: 8, angle: -30, sw: 2.6 });
  p.rect(92, 184, 56, 40, { fill: SCREEN, sw: 2 });
  for (const [x, h] of [[100, 14], [110, 26], [120, 18], [130, 30], [140, 10]] as const)
    p.line(x, 216, x, 216 - h, { stroke: '#ffb36b', sw: 4, single: true });
  p.circle(104, 244, 10, { fill: '#7be07b', sw: 1.4 });
  p.circle(126, 244, 10, { fill: '#f2c14e', sw: 1.4 });
  // escudo con tilde
  p.path('M20 170 L62 156 L104 170 Q104 230 62 252 Q20 230 20 170 Z', { fill: cream, hachure: shade(cream, 0.7), gap: 7, sw: 2.6 });
  p.path('M40 202 L58 222 L88 184', { stroke: '#3f9a3a', sw: 7 });
  // lupa
  p.line(176, 196, 214, 250, { stroke: '#7a4e2a', sw: 9 });
  p.circle(170, 186, 44, { fill: 'rgba(200,235,250,0.7)', sw: 3.4 });
  p.curve([[156, 178], [162, 170], [172, 168]], { stroke: WHITE, sw: 2.4, single: true });
  // cabeza cúpula
  p.rect(104, 146, 32, 20, { fill: STEEL, sw: 1.8 });
  p.path('M58 150 Q58 52 120 50 Q182 52 182 150 Z', { fill: cream, hachure: shade(cream, 0.72), gap: 8, sw: 2.6 });
  p.path('M58 116 L182 116', { sw: 2 });
  p.rect(52, 140, 136, 14, { fill: color, sw: 2 });
  // gran lente
  p.circle(120, 104, 64, { fill: SCREEN, sw: 3 });
  p.circle(120, 104, 40, { fill: '#ff7a4a', stroke: 'none', flat: true });
  p.circle(120, 104, 18, { fill: '#ffd36b', stroke: 'none', flat: true });
  p.circle(110, 94, 8, { fill: WHITE, stroke: 'none', flat: true });
  // baliza
  p.rect(110, 34, 20, 18, { fill: '#ff5a3a', sw: 2 });
  for (const a of [-0.7, 0, 0.7]) p.line(120 + Math.sin(a) * 18, 30 - Math.cos(a) * 6, 120 + Math.sin(a) * 30, 22 - Math.cos(a) * 12, { stroke: '#ff9a3a', sw: 2.4, single: true });
  p.washEllipse(70, 132, 9, 5, BLUSH, 0.5).washEllipse(170, 132, 9, 5, BLUSH, 0.5);
}

/** OpenAI: robotito de cabeza-lamparita sobre una patineta, con un cohete de juguete. */
export function drawOpenaiBot(p: Pen, color = '#9b7fc9') {
  const dark = shade(color, 0.62);
  const bulb = '#fff0a6';
  // patineta
  p.path('M52 272 Q50 262 62 262 L178 262 Q190 262 188 272 Z', { fill: '#e46f5a', sw: 2.2 });
  p.circle(76, 284, 16, { fill: INK, sw: 1.4 });
  p.circle(164, 284, 16, { fill: INK, sw: 1.4 });
  // piernas
  p.line(106, 236, 100, 262, { stroke: STEEL, sw: 8 });
  p.line(134, 236, 140, 262, { stroke: STEEL, sw: 8 });
  // buzo con capucha
  p.path('M78 170 Q120 150 162 170 L166 242 L74 242 Z', { fill: color, hachure: dark, gap: 8, angle: 45 });
  p.rect(98, 206, 44, 20, { fill: shade(color, 0.8), sw: 1.6 });
  p.path('M112 186 L106 194 L114 194 L108 204', { stroke: '#ffd84a', sw: 3, single: true });
  // brazo con cohete
  p.line(160, 182, 190, 150, { stroke: color, sw: 12 });
  p.circle(192, 148, 15, { fill: STEEL, sw: 1.6 });
  p.path('M190 136 Q196 96 214 82 Q218 104 202 140 Z', { fill: WHITE, sw: 2 });
  p.circle(206, 104, 7, { fill: '#7fd6ff', sw: 1.2 });
  p.path('M192 136 L184 148 L198 142 Z', { fill: '#e46f5a', sw: 1.4 });
  p.washEllipse(186, 158, 10, 8, '#ffb34a', 0.7);
  // otro brazo con celular
  p.line(80, 182, 58, 214, { stroke: color, sw: 12 });
  p.rect(40, 196, 24, 38, { fill: SCREEN, sw: 2 });
  p.circle(52, 216, 10, { fill: '#ff5a8a', stroke: 'none', flat: true });
  // cuello + rosca de la lamparita
  for (const y of [150, 158, 166]) p.rect(102, y, 36, 8, { fill: STEEL, sw: 1.4 });
  // cabeza lamparita
  p.washEllipse(120, 92, 82, 76, '#ffe26a', 0.45);
  p.path('M78 128 Q50 96 66 62 Q86 26 120 26 Q154 26 174 62 Q190 96 162 128 Q150 140 148 150 L92 150 Q90 140 78 128 Z', { fill: bulb, sw: 2.6 });
  p.path('M104 150 L108 118 L120 128 L132 118 L136 150', { stroke: '#d9a43a', sw: 2, single: true });
  p.ellipse(100, 86, 18, 26, { fill: INK, stroke: 'none', flat: true }).circle(96, 78, 6, { fill: WHITE, stroke: 'none', flat: true });
  p.ellipse(140, 86, 18, 26, { fill: INK, stroke: 'none', flat: true }).circle(136, 78, 6, { fill: WHITE, stroke: 'none', flat: true });
  smile(p, 120, 108, 24, INK);
  p.washEllipse(84, 106, 9, 5, BLUSH, 0.6).washEllipse(156, 106, 9, 5, BLUSH, 0.6);
  // chispas
  for (const [x, y] of [[56, 40], [188, 36], [44, 92]] as const)
    p.path(`M${x} ${y - 10} L${x} ${y + 10} M${x - 10} ${y} L${x + 10} ${y}`, { stroke: '#e9b040', sw: 2.6, single: true });
}

/** DeepSeek: robot cápsula compacto en modo ahorro, con un chip chiquito y una batería que casi no se gasta. */
export function drawDeepseek(p: Pen, color = '#6a5acd') {
  const dark = shade(color, 0.62);
  // ruedita
  p.circle(120, 276, 30, { fill: INK, sw: 1.6 });
  p.circle(120, 276, 12, { fill: STEEL, sw: 1.2 });
  p.rect(108, 236, 24, 26, { fill: STEEL, sw: 1.8 });
  // cuerpo cápsula
  p.path('M70 150 Q70 120 120 120 Q170 120 170 150 L170 220 Q170 248 120 248 Q70 248 70 220 Z', { fill: color, hachure: dark, gap: 8, angle: 20, sw: 2.6 });
  // batería casi llena en el pecho
  p.rect(96, 166, 48, 26, { fill: WHITE, sw: 2 });
  p.rect(144, 173, 6, 12, { fill: WHITE, sw: 1.4 });
  for (const x of [100, 111, 122, 133]) p.rect(x, 170, 8, 18, { fill: '#7be07b', stroke: 'none', flat: true });
  p.text(120, 222, 'eco', { size: 18, font: 'hand', color: WHITE });
  // brazo con chip chiquito
  p.line(166, 172, 196, 196, { stroke: color, sw: 11 });
  p.rect(186, 194, 26, 26, { fill: '#8a8f98', sw: 1.8 });
  p.rect(193, 201, 12, 12, { fill: '#e2c46a', sw: 1 });
  for (const k of [190, 199, 208]) p.line(k, 194, k, 188, { sw: 1.6, single: true }).line(k, 220, k, 226, { sw: 1.6, single: true });
  // otro brazo saludando
  p.line(74, 172, 46, 146, { stroke: color, sw: 11 });
  p.circle(44, 142, 16, { fill: STEEL, sw: 1.6 });
  // cabeza con visor
  p.rect(108, 108, 24, 14, { fill: STEEL, sw: 1.6 });
  p.ellipse(120, 76, 124, 82, { fill: shade(color, 1.35), hachure: color, gap: 9, sw: 2.6 });
  p.path('M70 70 Q120 52 170 70 L166 94 Q120 108 74 94 Z', { fill: SCREEN, sw: 2 });
  ledEye(p, 100, 80, 20, 14, '#9df0ff');
  ledEye(p, 140, 80, 20, 14, '#9df0ff');
  // antena con hojita (eficiencia)
  p.line(120, 36, 120, 18, { sw: 2.6 });
  p.path('M120 18 Q136 2 148 10 Q138 26 120 18 Z', { fill: '#7be07b', sw: 1.6 });
  p.washEllipse(78, 104, 8, 5, BLUSH, 0.5).washEllipse(162, 104, 8, 5, BLUSH, 0.5);
}

/** El Redditor: un humano en buzo con capucha, auriculares y su torre con la IA local que entrenó. */
export function drawRedditor(p: Pen, color = '#c2448f') {
  const dark = shade(color, 0.6);
  const skin = '#f2c8a0';
  // pantuflas
  p.ellipse(92, 286, 46, 16, { fill: '#8a6a4a', sw: 2 });
  p.ellipse(150, 286, 46, 16, { fill: '#8a6a4a', sw: 2 });
  // jogging
  p.path('M84 220 L80 282 L106 282 L118 236 L126 236 L136 282 L162 282 L158 220 Z', { fill: '#59606b', hachure: '#3e434b', gap: 7, angle: -30, sw: 2.4 });
  // buzo con capucha
  p.path('M64 228 Q58 150 90 126 L152 126 Q184 150 178 228 Z', { fill: color, hachure: dark, gap: 8, angle: 30, sw: 2.6 });
  p.path('M100 196 L142 196 L138 222 L104 222 Z', { fill: shade(color, 0.85), sw: 1.8 });
  p.line(110, 132, 106, 168, { sw: 1.8, single: true }).line(132, 132, 136, 168, { sw: 1.8, single: true });
  p.circle(106, 170, 6, { fill: WHITE, sw: 1.2 }).circle(136, 170, 6, { fill: WHITE, sw: 1.2 });
  // brazo sosteniendo la torre
  p.line(170, 160, 186, 198, { stroke: color, sw: 16 });
  // torre de PC con la IA local en la pantallita
  p.rect(166, 150, 56, 96, { fill: '#3a3f47', sw: 2.4 });
  p.rect(174, 160, 40, 30, { fill: SCREEN, sw: 1.6 });
  p.circle(186, 174, 7, { fill: '#7cff9a', stroke: 'none', flat: true }).circle(202, 174, 7, { fill: '#7cff9a', stroke: 'none', flat: true });
  p.path('M184 184 Q194 190 204 184', { stroke: '#7cff9a', sw: 1.6, single: true });
  for (const [y, c] of [[204, '#ff5a7a'], [214, '#ffd35a'], [224, '#5ad1ff'], [234, '#9a7bff']] as [number, string][])
    p.line(174, y, 214, y, { stroke: c, sw: 3, single: true });
  p.circle(194, 152 - 8, 4, { fill: '#7cff9a', sw: 1 });
  p.ellipse(190, 206, 22, 14, { fill: skin, sw: 1.6 });
  // otro brazo con una taza
  p.line(72, 160, 52, 198, { stroke: color, sw: 16 });
  p.rect(30, 188, 28, 30, { fill: WHITE, sw: 2 });
  p.path('M58 194 Q70 196 66 210 Q62 214 58 212', { sw: 1.8, single: true });
  p.curve([[38, 180], [42, 172], [38, 164]], { sw: 1.4, single: true, stroke: '#9a8a7a' });
  p.curve([[48, 180], [52, 170], [48, 162]], { sw: 1.4, single: true, stroke: '#9a8a7a' });
  // capucha detrás de la cabeza
  p.ellipse(120, 118, 104, 40, { fill: dark, sw: 2 });
  // cabeza
  p.ellipse(120, 82, 86, 92, { fill: skin, sw: 2.4 });
  // barba de tres días
  p.path('M82 92 Q86 128 120 130 Q154 128 158 92 Q150 112 120 114 Q90 112 82 92 Z', { fill: '#8a6a4a', hachure: '#6a4e34', gap: 4, angle: 60, sw: 1.6 });
  // gorrito
  p.path('M74 70 Q76 26 120 24 Q164 26 166 70 Z', { fill: '#3f7f6a', hachure: '#2c5c4c', gap: 6, angle: 90, sw: 2.4 });
  p.rect(72, 62, 96, 14, { fill: '#2c5c4c', sw: 2 });
  p.circle(120, 22, 16, { fill: '#e8d8b8', sw: 1.6 });
  // anteojos grandes
  p.circle(102, 88, 28, { fill: '#dff3ff', sw: 2.6 }).circle(140, 88, 28, { fill: '#dff3ff', sw: 2.6 });
  p.line(116, 88, 126, 88, { sw: 2.2 });
  p.circle(104, 90, 7, { fill: INK, stroke: 'none', flat: true }).circle(142, 90, 7, { fill: INK, stroke: 'none', flat: true });
  p.circle(101, 86, 2.6, { fill: WHITE, stroke: 'none', flat: true }).circle(139, 86, 2.6, { fill: WHITE, stroke: 'none', flat: true });
  // sonrisa canchera
  p.path('M110 108 Q122 116 134 106', { sw: 2, single: true });
  // auriculares
  p.path('M72 84 Q70 40 120 36 Q170 40 168 84', { stroke: '#2b2118', sw: 4, single: true });
  p.rect(62, 78, 16, 26, { fill: '#2b2118', sw: 1.4 });
  p.rect(162, 78, 16, 26, { fill: '#2b2118', sw: 1.4 });
  p.line(70, 104, 92, 116, { sw: 2, single: true });
  p.circle(94, 117, 5, { fill: '#2b2118', stroke: 'none', flat: true });
}

export const CHARACTER_DRAWERS: Record<FactionId, (p: Pen, color?: string) => void> = {
  google: drawGoogleBot,
  meta: drawMetaBot,
  anthropic: drawAnthropicBot,
  openai: drawOpenaiBot,
  deepseek: drawDeepseek,
  redditor: drawRedditor,
};

export const CHARACTER_NAMES: Record<FactionId, string> = {
  google: 'Ingeniero de Google',
  meta: 'Contribuidor de Meta',
  anthropic: 'Auditor de Anthropic',
  openai: 'Investigador de OpenAI',
  deepseek: 'Ingeniero de DeepSeek',
  redditor: 'El Redditor y su modelo local',
};
