import { buildDeck, FACTION_IDS, FACTIONS, ITEM_KINDS, ITEMS, TERRAIN_NAMES, type FactionId, type Terrain } from '@sotobosque/engine';
import { drawBoard, MAP_H, MAP_W } from './board';
import { CARD_H, CARD_W, drawCard, drawCardBack, drawDieFace } from './cards';
import { CHAR_H, CHAR_W, CHARACTER_DRAWERS, CHARACTER_NAMES } from './characters';
import { FCARD_H, FCARD_W, drawFactionCard } from './factionCard';
import { PARCHMENT, Pen, shade, svgDoc } from './ink';
import {
  drawAntenna,
  drawBench,
  drawCables,
  drawCluster,
  drawCoffee,
  drawDatacenter,
  drawDemoToken,
  drawItem,
  drawLab,
  drawPlant,
  drawRepo,
  drawScribbleRing,
  drawServerRack,
  drawSuitIcon,
  drawTower,
} from './world';

export type Category = 'Personajes' | 'Cartas de empresa' | 'Emblemas' | 'Estructuras' | 'Ciudad' | 'Recursos' | 'Componentes' | 'Cartas' | 'Dados' | 'Tablero' | 'Interfaz';

export interface Asset {
  id: string;
  name: string;
  category: Category;
  w: number;
  h: number;
  svg: () => string;
  note?: string;
}

function doc(w: number, h: number, draw: (p: Pen) => void, seed = 1, opts: { viewBox?: string; grain?: boolean } = {}) {
  return () => {
    const p = new Pen(seed);
    draw(p);
    return svgDoc(w, h, p.toString(), opts);
  };
}

const STRUCT: Record<string, (p: Pen, c: string) => void> = {
  datacenter: drawDatacenter,
  repo: drawRepo,
  laboratorio: drawLab,
  demo: drawDemoToken,
  cluster: drawCluster,
};

const assets: Asset[] = [];

for (const f of FACTION_IDS) {
  const def = FACTIONS[f];
  assets.push({
    id: `char-${f}`,
    name: CHARACTER_NAMES[f],
    category: 'Personajes',
    w: CHAR_W,
    h: CHAR_H,
    svg: doc(CHAR_W, CHAR_H, (p) => CHARACTER_DRAWERS[f](p, def.color), 11 + f.length),
    note: def.name,
  });
}
for (const f of FACTION_IDS) {
  assets.push({
    id: `fcard-${f}`,
    name: FACTIONS[f].name,
    category: 'Cartas de empresa',
    w: FCARD_W,
    h: FCARD_H,
    svg: doc(FCARD_W, FCARD_H, (p) => drawFactionCard(p, f), 31 + f.length),
    note: 'Carta de personaje',
  });
}
for (const f of FACTION_IDS) {
  const def = FACTIONS[f];
  assets.push({
    id: `emblem-${f}`,
    name: `Emblema ${def.short}`,
    category: 'Emblemas',
    w: 128,
    h: 128,
    svg: doc(
      128,
      128,
      (p) => {
        p.circle(120, 130, 150, { fill: shade(def.color, 1.5), sw: 4 });
        CHARACTER_DRAWERS[f](p, def.color);
      },
      11 + f.length,
      { viewBox: '44 54 152 152' },
    ),
  });
}
for (const f of FACTION_IDS) {
  const def = FACTIONS[f];
  const piece = def.building ?? def.token;
  if (!piece) continue;
  const { kind, name: label } = piece;
  assets.push({ id: `struct-${kind}`, name: label, category: 'Estructuras', w: 256, h: 256, svg: doc(256, 256, (p) => STRUCT[kind](p, def.color), 5), note: def.short });
}
assets.push(
  { id: 'prop-tower', name: 'Torre de oficinas', category: 'Ciudad', w: 200, h: 300, svg: doc(200, 300, (p) => drawTower(p, 1), 3) },
  { id: 'prop-tower2', name: 'Edificio bajo', category: 'Ciudad', w: 200, h: 300, svg: doc(200, 300, (p) => drawTower(p, 2), 8) },
  { id: 'prop-rack', name: 'Rack de servidores', category: 'Ciudad', w: 200, h: 300, svg: doc(200, 300, (p) => drawServerRack(p), 4) },
  { id: 'prop-antenna', name: 'Antena', category: 'Ciudad', w: 200, h: 300, svg: doc(200, 300, (p) => drawAntenna(p), 12) },
  { id: 'prop-plant', name: 'Planta de oficina', category: 'Ciudad', w: 200, h: 150, svg: doc(200, 150, (p) => drawPlant(p, 3), 6) },
  { id: 'prop-bench', name: 'Banco', category: 'Ciudad', w: 160, h: 120, svg: doc(160, 120, (p) => drawBench(p), 7) },
  { id: 'prop-coffee', name: 'Café', category: 'Ciudad', w: 144, h: 160, svg: doc(144, 160, (p) => drawCoffee(p), 9) },
  { id: 'prop-cables', name: 'Cables', category: 'Ciudad', w: 120, h: 200, svg: doc(120, 200, (p) => drawCables(p), 10) },
);
for (const s of ['datos', 'computo', 'talento', 'hype'] as (Terrain | 'hype')[]) {
  assets.push({ id: `suit-${s}`, name: TERRAIN_NAMES[s], category: 'Recursos', w: 128, h: 128, svg: doc(128, 128, (p) => drawSuitIcon(p, s), 2) });
}
for (const k of ITEM_KINDS) {
  assets.push({ id: `item-${k}`, name: ITEMS[k].name, category: 'Componentes', w: 128, h: 128, svg: doc(128, 128, (p) => drawItem(p, k), 13), note: `${ITEMS[k].verb} (Redditor)` });
}
const seen = new Set<string>();
for (const c of buildDeck()) {
  if (seen.has(c.name)) continue;
  seen.add(c.name);
  assets.push({ id: `card-${c.name}`, name: c.name, category: 'Cartas', w: CARD_W, h: CARD_H, svg: doc(CARD_W, CARD_H, (p) => drawCard(p, c), c.id), note: c.suit });
}
assets.push({ id: 'card-back', name: 'Dorso', category: 'Cartas', w: CARD_W, h: CARD_H, svg: doc(CARD_W, CARD_H, drawCardBack, 3) });
for (const f of FACTION_IDS) {
  for (const v of [1, 2, 3, 4, 5, 6]) {
    assets.push({ id: `die-${f}-${v}`, name: `${FACTIONS[f].short} ${v}`, category: 'Dados', w: 128, h: 128, svg: doc(128, 128, (p) => drawDieFace(p, v, FACTIONS[f].color), v * 7) });
  }
}
assets.push(
  { id: 'board', name: 'El Ecosistema', category: 'Tablero', w: MAP_W, h: MAP_H, svg: doc(MAP_W, MAP_H, drawBoard, 21), note: 'Mapa completo' },
  {
    id: 'table',
    name: 'Escritorio de madera',
    category: 'Tablero',
    w: 512,
    h: 512,
    svg: doc(512, 512, (p) => {
      p.rect(0, 0, 512, 512, { fill: '#9a6b42', stroke: 'none', flat: true });
      for (let i = 0; i < 4; i++) {
        p.rect(0, i * 128, 512, 128, { fill: shade('#9a6b42', 0.9 + (i % 2) * 0.12), sw: 2.2 });
        for (let k = 0; k < 5; k++) {
          const y = i * 128 + 16 + k * 22;
          p.curve([[0, y], [140, y + 6], [300, y - 4], [512, y + 3]], { stroke: '#6e4a2a', sw: 1.2, single: true, rough: 1.4 });
        }
      }
      p.ellipse(300, 70, 30, 14, { stroke: '#5a3a20', sw: 1.6 });
      p.ellipse(120, 330, 24, 12, { stroke: '#5a3a20', sw: 1.6 });
    }, 5, { grain: true }),
  },
  {
    id: 'ring',
    name: 'Anillo de selección',
    category: 'Interfaz',
    w: 256,
    h: 256,
    svg: doc(256, 256, drawScribbleRing, 4, { grain: false }),
    note: 'Se tiñe en Three.js',
  },
  {
    id: 'score-cell',
    name: 'Casilla de puntaje',
    category: 'Interfaz',
    w: 96,
    h: 96,
    svg: doc(96, 96, (p) => p.rect(6, 6, 84, 84, { fill: PARCHMENT, sw: 2.4 }), 6),
  },
);

export const ASSETS = assets;
export const ASSET_BY_ID = new Map(assets.map((a) => [a.id, a]));

export function assetSvg(id: string): string {
  const a = ASSET_BY_ID.get(id);
  if (!a) throw new Error(`Asset desconocido: ${id}`);
  return a.svg();
}

export const FACTION_STRUCTURE: Partial<Record<FactionId, string>> = {
  google: 'struct-datacenter',
  meta: 'struct-repo',
  anthropic: 'struct-laboratorio',
  openai: 'struct-demo',
  deepseek: 'struct-cluster',
};
