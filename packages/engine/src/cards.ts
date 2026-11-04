import type { Card, Suit } from './types';

const NAMES: Record<Suit, string[]> = {
  datos: ['Dataset Curado', 'Web Scrapeada', 'Datos Sintéticos', 'Feedback de Usuarios'],
  computo: ['Clúster de GPUs', 'Chip a Medida', 'Créditos de Nube', 'Supercomputadora'],
  talento: ['Investigadora Estrella', 'Paper Viral', 'Hackatón', 'Becarios'],
  hype: ['Demo en Vivo', 'Ronda Serie A', 'Keynote', 'Tendencia Viral'],
};

/** Mazo: 12 de cada recurso + 4 Hype (comodín) = 40 cartas. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  let id = 1;
  for (const suit of ['datos', 'computo', 'talento'] as const) {
    for (let i = 0; i < 12; i++) deck.push({ id: id++, suit, name: NAMES[suit][i % 4] });
  }
  for (let i = 0; i < 4; i++) deck.push({ id: id++, suit: 'hype', name: NAMES.hype[i] });
  return deck;
}
