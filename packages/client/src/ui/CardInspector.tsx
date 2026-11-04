import {
  AID_VP,
  FACTIONS,
  FINETUNE_VP,
  GLADES,
  HAND_LIMIT,
  ITEMS,
  SUIT_ITEM,
  TERRAIN_NAMES,
  pawnGlade,
  validateMove,
  type Card,
  type FactionId,
  type GameView,
  type Move,
} from '@sotobosque/engine';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store';
import { ArtSvg, CardArt, SuitIcon } from './Art';
import { aidRivals, isMyTurn, myFaction } from './interaction';
import { stepIcon, stepLabel } from './PlayerBoard';

interface Use {
  key: string;
  icon: ReactNode;
  title: string;
  effect: ReactNode;
  cost: string;
  need: string;
  moves: { label: string; move: Move }[];
  reason: string | null;
}

/** Mercados donde una carta sirve para pagar. */
export function payMarkets(f: FactionId | null, card: Pick<Card, 'suit'>, strict = false): string {
  if (card.suit === 'hype') return 'cualquier mercado (comodín)';
  if (!strict && f && FACTIONS[f].anyCard) return 'cualquier mercado (Eficiencia de DeepSeek)';
  return GLADES.filter((g) => g.terrain === card.suit)
    .map((g) => g.name)
    .join(', ');
}

/** Qué se puede hacer con una carta: cada uso, su efecto, su costo y las jugadas posibles ahora. */
export function cardUses(v: GameView, seat: number, f: FactionId, card: Card): Use[] {
  const def = FACTIONS[f];
  const fs = v.factions[f]!;
  const myTurn = isMyTurn(v, seat);
  const uses: Use[] = [];

  const collect = (key: string, mk: (g: number) => Move[]): Pick<Use, 'moves' | 'reason'> => {
    const moves: Use['moves'] = [];
    const errors = new Map<string, number>();
    const at = def.nomad ? pawnGlade(v, f) : -1;
    for (const g of def.nomad ? GLADES.filter((x) => x.id === at) : GLADES) {
      for (const m of mk(g.id)) {
        const err = validateMove(v, seat, m);
        if (err === null) {
          const t = 'target' in m && m.target && m.type === 'especial' ? ` → ${FACTIONS[m.target].short}` : '';
          moves.push({ label: `${g.name}${t}`, move: m });
        } else errors.set(err, (errors.get(err) ?? 0) + 1);
      }
    }
    let reason: string | null = null;
    if (!myTurn) reason = 'Se usa en tu turno';
    else if (v.phase !== 'dia') reason = 'Se usa durante el sprint';
    else if (!moves.length) {
      // el motivo más repetido, ignorando el genérico de recurso si hay uno más útil
      const sorted = [...errors.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e);
      reason = sorted.find((e) => !e.includes('no coincide')) ?? sorted[0] ?? (key === 'ayudar' ? 'no hay rivales en tu mercado' : 'No disponible ahora');
      if (reason.includes('no coincide'))
        reason = def.nomad
          ? `estás en ${GLADES[at].name}, que es de ${TERRAIN_NAMES[GLADES[at].terrain]}: esta carta no paga ahí`
          : 'en los mercados donde paga no cumplís el requisito';
    }
    return { moves, reason: moves.length ? null : reason };
  };
  const simple = (type: 'construir' | 'reclutar' | 'encender' | 'finetune') => (g: number) => [{ type, glade: g, card: card.id } as Move];

  if (def.nomad) {
    const item = SUIT_ITEM[card.suit];
    uses.push({
      key: 'finetune',
      icon: stepIcon(f, 'finetune'),
      title: 'Fine-tunear',
      effect: (
        <>
          Ganás un componente nuevo: <ArtSvg id={`item-${item}`} className="ci-mini" /> <b>{ITEMS[item].name}</b> ({ITEMS[item].verb}) y{' '}
          <b>+{FINETUNE_VP} PV</b>.
        </>
      ),
      cost: 'esta carta + quemar 1 Teclado',
      need: `Estar en un mercado de ${card.suit === 'hype' ? 'cualquier recurso' : `${TERRAIN_NAMES[card.suit]} (${payMarkets(f, card, true)})`} · estás en ${GLADES[pawnGlade(v, f)]?.name ?? '—'}`,
      ...collect('finetune', simple('finetune')),
    });
    uses.push({
      key: 'ayudar',
      icon: stepIcon(f, 'especial'),
      title: 'Ayudar',
      effect: (
        <>
          Le regalás la carta a un rival de tu mercado: <b>+{AID_VP} PV</b> de karma.
        </>
      ),
      cost: 'esta carta + quemar 1 componente cualquiera · 1 vez por turno',
      need: 'Un rival en tu mercado (sirve cualquier carta)',
      ...collect('ayudar', (g) => aidRivals(v, f, g).map((t) => ({ type: 'especial', glade: g, card: card.id, target: t }) as Move)),
    });
  } else {
    if (def.building) {
      const built = def.building.count - fs.buildingsSupply;
      const vp = def.building.vp[built];
      uses.push({
        key: 'construir',
        icon: stepIcon(f, 'construir'),
        title: `Construir ${def.building.name}`,
        effect: vp !== undefined ? <>Ponés tu {def.building.name.toLowerCase()} n.º {built + 1}: <b>+{vp} PV</b> en el acto.</> : 'Ya construiste todas.',
        cost: '1 acción + esta carta',
        need: 'Liderar el mercado y que tenga un lugar libre',
        ...collect('construir', simple('construir')),
      });
    }
    if (def.recruit > 0) {
      uses.push({
        key: 'reclutar',
        icon: stepIcon(f, 'reclutar'),
        title: 'Contratar',
        effect: (
          <>
            Sumás <b>+{def.recruit}</b> {def.recruit > 1 ? def.warriorName : def.warriorSingular} de tu reserva al mercado.
          </>
        ),
        cost: '1 acción + esta carta',
        need: f === 'openai' ? 'Un lanzamiento tuyo en el mercado' : `Un ${def.building!.name.toLowerCase()} tuyo en el mercado`,
        ...collect('reclutar', simple('reclutar')),
      });
    }
    if (def.token) {
      uses.push({
        key: 'encender',
        icon: stepIcon(f, 'encender'),
        title: 'Lanzar producto',
        effect: 'Ponés un lanzamiento: suben tus PV en cada Cierre.',
        cost: '1 acción + esta carta',
        need: 'Un investigador ahí o un lanzamiento vecino',
        ...collect('encender', simple('encender')),
      });
    }
    if (def.special) {
      uses.push({
        key: 'especial',
        icon: stepIcon(f, 'especial'),
        title: stepLabel(f, 'especial'),
        effect: def.special.hint,
        cost: '1 acción + esta carta · 1 vez por turno',
        need: 'Agentes tuyos en el mercado',
        ...collect('especial', (g) => [{ type: 'especial', glade: g, card: card.id } as Move]),
      });
    }
  }

  if (card.suit === 'hype') {
    const m: Move = { type: 'esfuerzo', card: card.id };
    const err = !myTurn ? 'Se usa en tu turno' : validateMove(v, seat, m);
    uses.push({
      key: 'crunch',
      icon: <span className="act-emoji">⚡</span>,
      title: 'Crunch',
      effect: def.nomad ? 'Recuperás 1 componente quemado.' : <>Ganás <b>+1 acción</b> este turno.</>,
      cost: 'sólo esta carta · 1 vez por turno',
      need: 'Sólo cartas de Hype',
      moves: err ? [] : [{ label: 'Hacer Crunch', move: m }],
      reason: err,
    });
  }
  return uses;
}

export function CardInspector() {
  const st = useGame();
  const v = st.view;
  const id = st.inspectCard;
  if (!v || id === null || st.mySeat === null) return null;
  const f = myFaction(v, st.mySeat);
  const hand = f ? v.factions[f]!.hand : [];
  const idx = hand.findIndex((c) => c.id === id);
  if (!f || idx < 0) return null;
  const card = hand[idx];
  const def = FACTIONS[f];
  const close = () => useGame.setState({ inspectCard: null });
  const go = (d: number) => useGame.setState({ inspectCard: hand[(idx + d + hand.length) % hand.length].id });
  const uses = cardUses(v, st.mySeat, f, card);
  const hype = card.suit === 'hype';

  return createPortal(
    <div className="modal" onClick={close}>
      <div className="modal-card ci" style={{ borderColor: def.color }} onClick={(e) => e.stopPropagation()}>
        <button className="link close" onClick={close} title="Cerrar">
          ✕
        </button>
        <div className="ci-left">
          <div className="ci-card">
            <CardArt card={card} />
          </div>
          {hand.length > 1 && (
            <div className="ci-nav">
              <button onClick={() => go(-1)}>◀</button>
              <small>
                {idx + 1} / {hand.length}
              </small>
              <button onClick={() => go(1)}>▶</button>
            </div>
          )}
        </div>
        <div className="ci-right">
          <h2>{card.name}</h2>
          <div className="ci-suit">
            <SuitIcon suit={card.suit} /> Carta de <b>{TERRAIN_NAMES[card.suit]}</b>
            {hype && <span className="ci-tag">comodín</span>}
          </div>
          <p className="ci-what">
            Las cartas son <b>la plata del juego</b>: no tienen efecto propio, se <b>gastan</b> para pagar una acción. Cada acción con carta
            cuesta <b>1 carta</b> del recurso del mercado donde la hacés.
          </p>
          <div className="ci-pays">
            <b>Paga en:</b> {payMarkets(f, card)}
          </div>

          <h3>Qué podés hacer con ella</h3>
          <div className="ci-uses">
            {uses.map((u) => (
              <div key={u.key} className={`ci-use ${u.moves.length ? 'ok' : ''}`}>
                <div className="ci-use-icon">{u.icon}</div>
                <div className="ci-use-body">
                  <div className="ci-use-title">
                    <b>{u.title}</b> <small>· cuesta {u.cost}</small>
                  </div>
                  <div>{u.effect}</div>
                  <small className="ci-need">Requisito: {u.need}</small>
                  {u.moves.length > 0 ? (
                    <div className="ci-moves">
                      {u.moves.map((m) => (
                        <button
                          key={m.label}
                          className="primary"
                          onClick={() => {
                            close();
                            st.sendMove(m.move);
                          }}
                        >
                          ▶ {m.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <small className="ci-why">✗ Ahora no: {u.reason}</small>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="ci-get">
            <b>¿Cómo se consiguen cartas?</b> Gratis: robás <b>1 en cada Cierre</b>
            {def.nomad && (
              <>
                {' '}
                y <b>1 más cada vez que Scrapeás</b> (quema un Dataset)
              </>
            )}
            . Máximo {HAND_LIMIT} en mano: si te pasás, descartás.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
