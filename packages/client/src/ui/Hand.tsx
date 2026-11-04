import { TERRAIN_NAMES, type Card } from '@sotobosque/engine';
import { CardArt } from './Art';

export function CardView({ card, selected, onClick, small }: { card: Card; selected?: boolean; onClick?: () => void; small?: boolean }) {
  return (
    <button
      className={`card ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      onClick={onClick}
      title={`${card.name} — ${TERRAIN_NAMES[card.suit]}${card.suit === 'hype' ? ' (comodín)' : ''}`}
    >
      <CardArt card={card} />
    </button>
  );
}
