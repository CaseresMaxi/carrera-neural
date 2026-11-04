import { FACTIONS, type FactionId } from '@sotobosque/engine';
import { CHARACTER_DRAWERS } from './characters';
import { PAPER, Pen, shade } from './ink';
import { drawCluster, drawDatacenter, drawDemoToken, drawItem, drawLab, drawRepo } from './world';

export const FCARD_W = 320;
export const FCARD_H = 540;

const STRUCT_DRAW: Record<string, (p: Pen, c: string) => void> = {
  datacenter: drawDatacenter,
  repo: drawRepo,
  laboratorio: drawLab,
  demo: drawDemoToken,
  cluster: drawCluster,
};

/** Parte un texto en líneas de ~max caracteres (corte por palabras). */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (line && (line + ' ' + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

/** Carta de empresa: retrato, datos clave y habilidades. */
export function drawFactionCard(p: Pen, f: FactionId) {
  const def = FACTIONS[f];
  const c = def.color;
  // marco
  p.rect(6, 6, FCARD_W - 12, FCARD_H - 12, { fill: c, sw: 3.4 });
  p.rect(16, 16, FCARD_W - 32, FCARD_H - 32, { fill: PAPER, sw: 2 });
  // cinta con el nombre
  p.path(`M10 30 L${FCARD_W - 10} 30 L${FCARD_W - 22} 52 L${FCARD_W - 10} 74 L10 74 L22 52 Z`, { fill: c, sw: 2.4 });
  p.text(FCARD_W / 2, 64, def.name, { size: def.name.length > 12 ? 32 : 38, color: '#fffaf0' });

  // retrato
  p.rect(28, 88, 150, 170, { fill: shade(c, 1.55), sw: 2 });
  p.washEllipse(103, 180, 60, 70, shade(c, 1.25), 0.5);
  p.g('translate(43 94) scale(0.5)', () => CHARACTER_DRAWERS[f](p, c));

  // datos clave
  const stat = (y: number, label: string, value: string) => {
    p.text(194, y, label, { size: 15, font: 'hand', anchor: 'start', color: shade(c, 0.55) });
    p.text(194, y + 26, value, { size: 26, anchor: 'start' });
  };
  stat(104, def.warriorName, String(def.warriors));
  stat(160, 'acciones', def.nomad ? 'por ítem' : `${def.actions}${def.freeBattle ? ' +1' : ''}`);
  const piece = def.building ?? def.token;
  if (piece) {
    p.text(194, 216, piece.name, { size: 15, font: 'hand', anchor: 'start', color: shade(c, 0.55) });
    p.g('translate(196 222) scale(0.17)', () => STRUCT_DRAW[piece.kind](p, c));
    p.text(246, 250, `×${piece.count}`, { size: 24, anchor: 'start' });
  } else {
    p.text(194, 216, 'componentes', { size: 15, font: 'hand', anchor: 'start', color: shade(c, 0.55) });
    (['cafe', 'gpu', 'dataset', 'teclado'] as const).forEach((k, i) => p.g(`translate(${194 + i * 25} 224) scale(0.19)`, () => drawItem(p, k)));
  }

  // lema
  wrap(def.tagline, 40).forEach((l, i) => p.text(FCARD_W / 2, 282 + i * 18, l, { size: 15, font: 'hand', color: shade(c, 0.5) }));

  // habilidades
  const top = 316;
  p.rect(26, top, FCARD_W - 52, FCARD_H - top - 30, { fill: shade(c, 1.7), sw: 1.8 });
  let y = top + 20;
  for (const line of def.summary) {
    const parts = wrap(line, 40);
    p.circle(38, y - 5, 7, { fill: c, stroke: 'none', flat: true });
    for (const l of parts) {
      if (y > FCARD_H - 36) break;
      p.text(48, y, l, { size: 13.5, font: 'hand', anchor: 'start' });
      y += 15;
    }
    y += 4;
  }
}
