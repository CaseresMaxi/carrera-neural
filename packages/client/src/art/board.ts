import { GLADES, PATHS } from '@sotobosque/engine';
import { INK, PARCHMENT, Pen, rng, shade } from './ink';
import { TERRAIN_FILL, drawGladeDecor, drawSuitIcon } from './world';

/** Escala del mapa pintado: píxeles por unidad de escena. */
export const BOARD_PX = 120;
export const BOARD_UNITS_W = 17.5;
export const BOARD_UNITS_D = 13.6;
export const MAP_W = Math.round(BOARD_UNITS_W * BOARD_PX);
export const MAP_H = Math.round(BOARD_UNITS_D * BOARD_PX);
export const GLADE_R_UNITS = 1.15;

export const RIVER: [number, number][] = [
  [-8.8, -2.3], [-6.2, -2.1], [-3.6, -2.4], [-1.0, -2.9], [1.8, -2.7], [3.8, -2.2], [6.2, -2.1], [8.8, -1.7],
];

const px = (x: number) => (x + BOARD_UNITS_W / 2) * BOARD_PX;
const pz = (z: number) => (z + BOARD_UNITS_D / 2) * BOARD_PX;

export function slotOffsets(n: number): [number, number][] {
  return n === 1 ? [[0, 0.55]] : [[-0.4, 0.55], [0.4, 0.55]];
}

function catmull(points: [number, number][], steps = 16): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export const riverSamples = catmull(RIVER);

export function distToRiver(x: number, z: number) {
  let d = Infinity;
  for (const [rx, rz] of riverSamples) d = Math.min(d, Math.hypot(rx - x, rz - z));
  return d;
}

export function distToSegment(px_: number, pz_: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px_ - ax) * dx + (pz_ - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px_ - (ax + t * dx), pz_ - (az + t * dz));
}

export function isForest(x: number, z: number, margin = 0.45) {
  if (GLADES.some((g) => Math.hypot(g.x - x, g.z - z) < GLADE_R_UNITS + margin)) return false;
  if (PATHS.some(([a, b]) => distToSegment(x, z, GLADES[a].x, GLADES[a].z, GLADES[b].x, GLADES[b].z) < 0.42)) return false;
  return distToRiver(x, z) > 0.62;
}

/** Puntos de cruce sendero/río (para puentes). */
export function bridges() {
  const out: { x: number; z: number; angle: number }[] = [];
  for (const [a, b] of PATHS) {
    const A = GLADES[a];
    const B = GLADES[b];
    let best = 0.35;
    let hit: { x: number; z: number } | null = null;
    for (let t = 0.15; t <= 0.85; t += 0.02) {
      const x = A.x + (B.x - A.x) * t;
      const z = A.z + (B.z - A.z) * t;
      const d = distToRiver(x, z);
      if (d < best) {
        best = d;
        hit = { x, z };
      }
    }
    if (hit) out.push({ ...hit, angle: Math.atan2(B.z - A.z, B.x - A.x) });
  }
  return out;
}

/** Mapa completo dibujado a mano: barrios vistos desde arriba, corriente de datos, cables, mercados y rótulos. */
export function drawBoard(p: Pen) {
  const W = MAP_W;
  const H = MAP_H;
  const rand = rng(77);
  p.rect(0, 0, W, H, { fill: PARCHMENT, stroke: 'none', flat: true });
  p.rect(40, 40, W - 80, H - 80, { fill: '#e7dcc0', sw: 3 });
  p.wash(`M60 60 H${W - 60} V${H - 60} H60 Z`, '#d8cba8', 0.45);

  // cuadrícula de papel milimetrado
  for (let x = 60; x < W - 60; x += 60) p.line(x, 60, x, H - 60, { stroke: '#cdbf9c', sw: 1, single: true, rough: 0.4 });
  for (let y = 60; y < H - 60; y += 60) p.line(60, y, W - 60, y, { stroke: '#cdbf9c', sw: 1, single: true, rough: 0.4 });

  // barrios (techos vistos desde arriba) y alguna plaza verde
  for (let i = 0; i < 3200; i++) {
    const ux = (rand() - 0.5) * (BOARD_UNITS_W - 1.1);
    const uz = (rand() - 0.5) * (BOARD_UNITS_D - 1.1);
    if (!isForest(ux, uz, 0.36)) continue;
    if (rand() > 0.12) continue;
    const w = 34 + rand() * 30;
    const h = 30 + rand() * 30;
    if (rand() < 0.22) {
      const c = shade('#6a9a4a', 0.85 + rand() * 0.3);
      p.circle(px(ux), pz(uz), w * 0.8, { fill: c, hachure: shade(c, 0.6), gap: 6, sw: 1.4, rough: 1.4 });
    } else {
      const c = shade(rand() < 0.5 ? '#a9b4c2' : '#c9b393', 0.85 + rand() * 0.3);
      p.rect(px(ux) - w / 2, pz(uz) - h / 2, w, h, { fill: c, hachure: shade(c, 0.6), gap: 7, sw: 1.6, rough: 1.2 });
      if (rand() < 0.4) p.rect(px(ux) - 6, pz(uz) - 6, 12, 12, { fill: shade(c, 0.7), sw: 1, single: true });
    }
  }

  // río
  const rpts = riverSamples.map(([x, z]) => [px(x), pz(z)] as [number, number]);
  const rd = `M${rpts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}`;
  p.raw(`<path d="${rd}" stroke="#5f9fd0" stroke-width="104" fill="none" stroke-linecap="round" filter="url(#wc2)" opacity="0.95"/>`);
  p.raw(`<path d="${rd}" stroke="#a8d8f0" stroke-width="44" fill="none" stroke-linecap="round" filter="url(#wc2)" opacity="0.7"/>`);
  const offset = (k: number) =>
    rpts.map(([x, y], i) => {
      const [nx, ny] = rpts[Math.min(rpts.length - 1, i + 1)];
      const [ox, oy] = rpts[Math.max(0, i - 1)];
      const dx = nx - ox;
      const dy = ny - oy;
      const l = Math.hypot(dx, dy) || 1;
      return [x - (dy / l) * k, y + (dx / l) * k] as [number, number];
    });
  p.curve(offset(50).filter((_, i) => i % 3 === 0), { sw: 2.4, rough: 1.4 });
  p.curve(offset(-50).filter((_, i) => i % 3 === 0), { sw: 2.4, rough: 1.4 });
  for (let i = 3; i < rpts.length - 3; i += 5) {
    const [x, y] = rpts[i];
    p.text(x + (rand() - 0.5) * 30, y + 8 + (rand() - 0.5) * 30, rand() < 0.5 ? '0' : '1', { size: 26, font: 'hand', color: '#ffffff' });
  }

  // senderos
  for (const [a, b] of PATHS) {
    const A = GLADES[a];
    const B = GLADES[b];
    const ax = px(A.x);
    const ay = pz(A.z);
    const bx = px(B.x);
    const by = pz(B.z);
    p.raw(`<path d="M${ax} ${ay} L${bx} ${by}" stroke="#8a8f98" stroke-width="30" stroke-linecap="round" filter="url(#wc2)"/>`);
    p.raw(`<path d="M${ax} ${ay} L${bx} ${by}" stroke="#f2c14e" stroke-width="8" stroke-linecap="round" opacity="0.9"/>`);
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.floor(len / 26);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const dx = ((bx - ax) / len) * 7;
      const dy = ((by - ay) / len) * 7;
      if (k % 3 === 0) p.circle(x, y, 9, { fill: '#7fd6ff', sw: 1.2, single: true });
      else p.line(x - dx, y - dy, x + dx, y + dy, { stroke: '#4a4f58', sw: 2, single: true, rough: 0.5 });
    }
  }

  // puentes
  for (const br of bridges()) {
    p.g(`translate(${px(br.x)} ${pz(br.z)}) rotate(${(br.angle * 180) / Math.PI})`, () => {
      p.rect(-58, -26, 116, 52, { fill: '#5a606a', hachure: '#33373d', gap: 6, angle: 0, sw: 2.2 });
      for (const x of [-34, -12, 10, 32]) p.circle(x, 0, 9, { fill: x % 4 ? '#7be07b' : '#7fd6ff', stroke: 'none', flat: true });
      p.line(-60, -30, 60, -30, { sw: 3 }).line(-60, 30, 60, 30, { sw: 3 });
    });
  }

  // mercados
  const R = GLADE_R_UNITS * BOARD_PX;
  for (const g of GLADES) {
    const cx = px(g.x);
    const cy = pz(g.z);
    p.circle(cx + 6, cy + 8, R * 2.08, { fill: 'rgba(40,30,15,0.35)', stroke: 'none' });
    p.circle(cx, cy, R * 2, { fill: TERRAIN_FILL[g.terrain], sw: 3.4 });
    drawGladeDecor(p, g.terrain, cx, cy, R, g.id * 13 + 5);
    p.circle(cx, cy, R * 2 - 22, { stroke: shade(TERRAIN_FILL[g.terrain], 0.6), sw: 1.6, single: true, rough: 1.6 });
    for (const [ox, oz] of slotOffsets(g.slots)) {
      const sx = cx + ox * BOARD_PX;
      const sy = cy + oz * BOARD_PX;
      p.rect(sx - 38, sy - 38, 76, 76, { fill: 'rgba(250,240,214,0.75)', sw: 2, rough: 1.3 });
    }
    // cartel con el nombre
    const by = cy - R - 30;
    p.path(`M${cx - 120} ${by - 22} L${cx + 120} ${by - 22} L${cx + 106} ${by} L${cx + 120} ${by + 22} L${cx - 120} ${by + 22} L${cx - 106} ${by} Z`, { fill: '#f6ecd2', sw: 2.4 });
    drawSuitIcon(p, g.terrain, cx - 88, by, 0.3);
    p.text(cx + 14, by + 11, g.name, { size: 34 });
  }

  // leyenda: router con antenitas
  p.g(`translate(${W - 160} ${H - 140})`, () => {
    p.rect(-62, -20, 124, 50, { fill: '#3a3f47', sw: 2.4 });
    for (const x of [-36, -12, 12, 36]) p.circle(x, 6, 10, { fill: x < 0 ? '#7be07b' : '#7fd6ff', stroke: 'none', flat: true });
    p.line(-40, -20, -52, -64, { sw: 3 }).line(40, -20, 52, -64, { sw: 3 });
    for (const k of [1, 2]) p.curve([[-22 * k, -60 - 10 * k], [0, -70 - 16 * k], [22 * k, -60 - 10 * k]], { stroke: '#7fd6ff', sw: 2.4, single: true });
  });
  p.text(W / 2, H - 58, 'El Ecosistema', { size: 50, rotate: -1 });

  // marco
  p.rect(18, 18, W - 36, H - 36, { stroke: INK, sw: 4 });
  p.rect(30, 30, W - 60, H - 60, { stroke: shade('#8a6b3c', 0.9), sw: 2 });
}

export function toMapPx(x: number, z: number): [number, number] {
  return [px(x), pz(z)];
}
