import {
  FACTIONS,
  GLADES,
  legalGlades,
  validateMove,
  type Card,
  type FactionId,
  type GameView,
  type Move,
} from '@sotobosque/engine';
import { useGame, type UiState } from '../store';

export function currentSeat(view: GameView): number {
  return view.factions[view.order[view.current]]!.seat;
}

export function myFaction(view: GameView | null, seat: number | null): FactionId | null {
  if (!view || seat === null) return null;
  return view.order.find((f) => view.factions[f]!.seat === seat) ?? null;
}

export function isMyTurn(view: GameView | null, seat: number | null): boolean {
  return !!view && seat !== null && view.phase !== 'fin' && currentSeat(view) === seat;
}

function usableCards(view: GameView, seat: number, ui: UiState): Card[] {
  const f = myFaction(view, seat)!;
  const hand = view.factions[f]!.hand;
  return ui.selectedCards.length ? hand.filter((c) => ui.selectedCards.includes(c.id)) : hand;
}

export function cardMovesFor(view: GameView, seat: number, ui: UiState, glade: number): Move[] {
  if (ui.action !== 'reclutar' && ui.action !== 'construir' && ui.action !== 'encender' && ui.action !== 'especial' && ui.action !== 'finetune') return [];
  const type = ui.action;
  const target = type === 'especial' && ui.target ? { target: ui.target } : {};
  return usableCards(view, seat, ui)
    .map((c) => ({ type, glade, card: c.id, ...target }) as Move)
    .filter((m) => validateMove(view, seat, m) === null);
}

export function battleMovesFor(view: GameView, seat: number, glade: number): Move[] {
  return view.order
    .map((o) => ({ type: 'batalla', glade, target: o }) as Move)
    .filter((m) => validateMove(view, seat, m) === null);
}

export function computeHighlight(view: GameView | null, seat: number | null, ui: UiState): Set<number> {
  if (!view || seat === null || !isMyTurn(view, seat) || view.phase !== 'dia' || !ui.action) return new Set();
  switch (ui.action) {
    case 'mover':
      if (ui.from === null)
        return new Set(legalGlades(view, seat, (g) => GLADES.map((t) => ({ type: 'mover', from: g, to: t.id, count: 1 }))));
      return new Set(legalGlades(view, seat, (t) => ({ type: 'mover', from: ui.from!, to: t, count: ui.count })));
    case 'batalla':
      return new Set(GLADES.map((g) => g.id).filter((g) => battleMovesFor(view, seat, g).length > 0));
    default:
      return new Set(GLADES.map((g) => g.id).filter((g) => cardMovesFor(view, seat, ui, g).length > 0));
  }
}

let memo: { view: GameView | null; seat: number | null; ui: UiState; result: Set<number> } | null = null;
function highlightFor(view: GameView | null, seat: number | null, ui: UiState) {
  if (!memo || memo.view !== view || memo.seat !== seat || memo.ui !== ui) {
    memo = { view, seat, ui, result: computeHighlight(view, seat, ui) };
  }
  return memo.result;
}

export function onGladeClick(id: number) {
  const st = useGame.getState();
  const { view, mySeat: seat, ui } = st;
  if (!view || seat === null) return;
  if (!ui.action) {
    st.setUi({ glade: ui.glade === id ? null : id });
    return;
  }
  const hl = highlightFor(view, seat, ui);
  if (ui.action === 'mover' && ui.from === id) {
    st.setUi({ from: null });
    return;
  }
  if (!hl.has(id)) {
    st.showToast('Ese mercado no es válido para esa acción');
    return;
  }
  switch (ui.action) {
    case 'mover': {
      if (ui.from === null) {
        const n = view.glades[id].warriors[myFaction(view, seat)!] ?? 1;
        st.setUi({ from: id, count: n });
      } else {
        st.sendMove({ type: 'mover', from: ui.from, to: id, count: ui.count });
      }
      return;
    }
    case 'batalla': {
      const ms = battleMovesFor(view, seat, id);
      if (ms.length === 1) st.sendMove(ms[0]);
      else st.setUi({ glade: id });
      return;
    }
    default: {
      const ms = cardMovesFor(view, seat, ui, id);
      const f = myFaction(view, seat)!;
      // Ayudar: si hay más de un rival para elegir, no se envía solo
      const choose = ui.action === 'especial' && FACTIONS[f].nomad && aidRivals(view, f, id).length > 1 && !ui.target;
      if (ms.length === 1 && !choose) st.sendMove(ms[0]);
      else st.setUi({ glade: id });
    }
  }
}

export function useInteraction() {
  const view = useGame((s) => s.view);
  const seat = useGame((s) => s.mySeat);
  const ui = useGame((s) => s.ui);
  return {
    highlight: highlightFor(view, seat, ui),
    selected: ui.action === 'mover' ? ui.from : ui.glade,
    onGlade: onGladeClick,
  };
}

/** Cuántos mercados permiten iniciar esa acción ahora (para el panel de acciones). */
export function optionCount(view: GameView, seat: number, kind: UiState['action'], selectedCards: number[]): number {
  if (!kind) return 0;
  return computeHighlight(view, seat, { action: kind, from: null, glade: null, count: 1, selectedCards, target: null }).size;
}

/** Rivales con piezas en un mercado (a quién puede ayudar el Redditor). */
export function aidRivals(view: GameView, f: FactionId, glade: number): FactionId[] {
  const g = view.glades[glade];
  return view.order.filter(
    (o) => o !== f && ((g.warriors[o] ?? 0) > 0 || g.buildings.some((b) => b.faction === o) || g.tokens.some((t) => t.faction === o)),
  );
}

/**
 * Empieza una acción desde el tablero. Si hay un solo mercado posible, lo elige solo
 * (y si además hay una sola carta posible, la juega), para ahorrar clics.
 */
export function startAction(kind: UiState['action']) {
  const st = useGame.getState();
  const { view, mySeat: seat } = st;
  if (!view || seat === null || !kind) return;
  st.setUi({ action: kind, from: null, glade: null, target: null });
  const hl = computeHighlight(view, seat, useGame.getState().ui);
  if (hl.size === 1) onGladeClick([...hl][0]);
}
