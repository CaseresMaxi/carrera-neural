import type { Terrain } from './types';

export interface GladeDef {
  id: number;
  name: string;
  terrain: Terrain;
  slots: number;
  /** Posición en el tablero (unidades de escena, plano XZ). */
  x: number;
  z: number;
  corner: boolean;
}

/** Mapa "El Ecosistema": 10 mercados, 16 conexiones. */
export const GLADES: GladeDef[] = [
  { id: 0, name: 'Salud', terrain: 'datos', slots: 2, x: -6.2, z: -4.2, corner: true },
  { id: 1, name: 'Finanzas', terrain: 'computo', slots: 1, x: -1.2, z: -5.0, corner: false },
  { id: 2, name: 'Educación', terrain: 'talento', slots: 2, x: 5.4, z: -4.6, corner: true },
  { id: 3, name: 'Legal', terrain: 'datos', slots: 1, x: -4.4, z: 0.2, corner: false },
  { id: 4, name: 'Investigación', terrain: 'computo', slots: 2, x: 0.6, z: -0.6, corner: false },
  { id: 5, name: 'Medios', terrain: 'talento', slots: 1, x: 5.8, z: 0.4, corner: false },
  { id: 6, name: 'Videojuegos', terrain: 'talento', slots: 2, x: -6.0, z: 4.6, corner: true },
  { id: 7, name: 'Retail', terrain: 'datos', slots: 1, x: -1.4, z: 4.2, corner: false },
  { id: 8, name: 'Logística', terrain: 'computo', slots: 1, x: 2.8, z: 3.4, corner: false },
  { id: 9, name: 'Robótica', terrain: 'datos', slots: 2, x: 6.4, z: 5.0, corner: true },
];

export const PATHS: [number, number][] = [
  [0, 1], [0, 3], [1, 2], [1, 4], [2, 5], [3, 4], [3, 6], [4, 5],
  [4, 7], [4, 8], [5, 8], [5, 9], [6, 7], [7, 8], [8, 9], [1, 3],
];

/** Orden en que se asignan las esquinas de inicio según asiento. */
export const START_CORNERS = [0, 9, 2, 6];

const ADJ: number[][] = GLADES.map(() => []);
for (const [a, b] of PATHS) {
  ADJ[a].push(b);
  ADJ[b].push(a);
}

export function neighbors(glade: number): number[] {
  return ADJ[glade];
}

export function isAdjacent(a: number, b: number): boolean {
  return ADJ[a].includes(b);
}

/** Distancia en senderos (BFS). */
export function distance(a: number, b: number): number {
  if (a === b) return 0;
  const seen = new Set([a]);
  let frontier = [a];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: number[] = [];
    for (const g of frontier) {
      for (const n of ADJ[g]) {
        if (n === b) return d;
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

export const TERRAIN_NAMES: Record<Terrain | 'hype', string> = {
  datos: 'Datos',
  computo: 'Cómputo',
  talento: 'Talento',
  hype: 'Hype',
};
