import type { Card, Terrain } from '@sotobosque/engine';
import { memo } from 'react';
import { CARD_H, CARD_W, drawCard } from '../art/cards';
import { Pen, svgDoc } from '../art/ink';
import { cachedSvg } from '../art/textures';

/** SVG de un asset del catálogo, inline (usa las tipografías de la página). */
export const ArtSvg = memo(function ArtSvg({ id, className }: { id: string; className?: string }) {
  return <span className={`art ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: cachedSvg(id) }} />;
});

export function SuitIcon({ suit, size = 18 }: { suit: Terrain | 'hype'; size?: number }) {
  return <ArtSvg id={`suit-${suit}`} className="suit" key={size} />;
}

const cardCache = new Map<string, string>();
export const CardArt = memo(function CardArt({ card }: { card: Pick<Card, 'name' | 'suit' | 'id'> }) {
  let svg = cardCache.get(card.name);
  if (!svg) {
    const p = new Pen(card.id);
    drawCard(p, card);
    svg = svgDoc(CARD_W, CARD_H, p.toString());
    cardCache.set(card.name, svg);
  }
  return <span className="art card-art" dangerouslySetInnerHTML={{ __html: svg }} />;
});
