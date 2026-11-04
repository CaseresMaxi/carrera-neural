import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  FACTIONS,
  GLADES,
  playerView,
  ruler,
  validateMove,
  VICTORY_VP,
  type GameState,
  type Move,
} from '../src';

const four = () =>
  createGame({
    seed: 42,
    players: [
      { faction: 'google', name: 'A' },
      { faction: 'meta', name: 'B' },
      { faction: 'anthropic', name: 'C' },
      { faction: 'openai', name: 'D' },
    ],
  });

function play(s: GameState, seat: number, m: Move): GameState {
  const r = applyMove(s, seat, m);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

describe('setup', () => {
  it('es determinista con la misma semilla', () => {
    expect(four()).toEqual(four());
  });

  it('reparte 3 cartas y coloca piezas en las esquinas', () => {
    const s = four();
    for (const f of s.order) expect(s.factions[f]!.hand).toHaveLength(3);
    expect(s.deck.length + s.order.length * 3).toBe(40);
    expect(s.glades[0].buildings).toEqual([{ faction: 'google', kind: 'datacenter' }]);
    expect(s.glades[9].warriors.meta).toBe(4);
    expect(s.glades[6].tokens[0].kind).toBe('demo');
  });

  it('Google recibe ingenieros en el planning de su primer turno', () => {
    const s = four();
    // 3 iniciales + 1 por alba en el datacenter
    expect(s.glades[0].warriors.google).toBe(4);
    expect(s.actionsLeft).toBe(FACTIONS.google.actions);
  });

  it('rechaza facciones repetidas', () => {
    expect(() =>
      createGame({ seed: 1, players: [{ faction: 'meta', name: 'a' }, { faction: 'meta', name: 'b' }] }),
    ).toThrow();
  });
});

describe('turnos y validación', () => {
  it('rechaza moves fuera de turno', () => {
    const s = four();
    expect(validateMove(s, 1, { type: 'terminarDia' })).toBe('No es tu turno');
  });

  it('mover exige adyacencia y gobierno', () => {
    const s = four();
    expect(validateMove(s, 0, { type: 'mover', from: 0, to: 9, count: 1 })).toMatch(/alcance/);
    expect(validateMove(s, 0, { type: 'mover', from: 0, to: 1, count: 2 })).toBeNull();
    const s2 = play(s, 0, { type: 'mover', from: 0, to: 1, count: 2 });
    expect(s2.glades[1].warriors.google).toBe(3);
    expect(s2.actionsLeft).toBe(2);
  });

  it('Meta despliega hasta 2 conexiones', () => {
    let s = four();
    s = play(s, 0, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 0, { type: 'descartar', cards: [s.factions.google!.hand[0].id] });
    expect(validateMove(s, 1, { type: 'mover', from: 9, to: 4, count: 1 })).toBeNull();
    expect(validateMove(s, 1, { type: 'mover', from: 9, to: 0, count: 1 })).toMatch(/alcance/);
  });

  it('construir requiere carta del terreno, gobierno y slot libre', () => {
    const s = four();
    const fs = s.factions.google!;
    fs.hand = [{ id: 900, suit: 'computo', name: 'x' }, { id: 901, suit: 'datos', name: 'y' }];
    // Mercado 0 es datos, 2 slots, ya hay un datacenter
    expect(validateMove(s, 0, { type: 'construir', glade: 0, card: 900 })).toMatch(/recurso/);
    const s2 = play(s, 0, { type: 'construir', glade: 0, card: 901 });
    expect(s2.glades[0].buildings).toHaveLength(2);
    expect(s2.factions.google!.vp).toBe(2); // segundo datacenter → 2 PV
    s2.factions.google!.hand.push({ id: 902, suit: 'hype', name: 'z' });
    expect(validateMove(s2, 0, { type: 'construir', glade: 0, card: 902 })).toMatch(/espacio/);
  });

  it('crunch: un Hype da +1 acción, una vez por turno', () => {
    const s = four();
    s.factions.google!.hand = [{ id: 1, suit: 'hype', name: 'a' }, { id: 2, suit: 'hype', name: 'b' }];
    const s2 = play(s, 0, { type: 'esfuerzo', card: 1 });
    expect(s2.actionsLeft).toBe(4);
    expect(validateMove(s2, 0, { type: 'esfuerzo', card: 2 })).toMatch(/Ya hiciste/);
  });

  it('descarte obligatorio sobre el límite de mano', () => {
    let s = four();
    s.factions.google!.hand.push(...s.deck.splice(0, 3)); // 6 cartas
    s = play(s, 0, { type: 'terminarDia' });
    expect(s.phase).toBe('descarte');
    const hand = s.factions.google!.hand;
    expect(validateMove(s, 0, { type: 'descartar', cards: [hand[0].id] })).toMatch(/exactamente 2/);
    s = play(s, 0, { type: 'descartar', cards: [hand[0].id, hand[1].id] });
    expect(s.factions.google!.hand).toHaveLength(5);
    expect(s.order[s.current]).toBe('meta');
  });
});

describe('batalla', () => {
  it('quita piezas y da PV por estructuras', () => {
    const s = four();
    // Preparar: google atacan un claro con sólo un farol de openai (indefenso)
    s.glades[3].tokens.push({ faction: 'openai', kind: 'demo' });
    s.glades[3].warriors.google = 2;
    const s2 = play(s, 0, { type: 'batalla', glade: 3, target: 'openai' });
    expect(s2.lastBattle?.defenderRolls).toEqual([]);
    expect(s2.lastBattle!.attackerHits).toBeGreaterThanOrEqual(1);
    expect(s2.glades[3].tokens).toHaveLength(0);
    expect(s2.factions.google!.vp).toBe(1);
  });

  it('Anthropic defiende con red team y su primer benchmark es gratis', () => {
    let s = four();
    s = play(s, 0, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 0, { type: 'descartar', cards: [s.factions.google!.hand[0].id] });
    s = play(s, 1, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 1, { type: 'descartar', cards: [s.factions.meta!.hand[0].id] });
    expect(s.order[s.current]).toBe('anthropic');
    s.glades[2].warriors.meta = 3;
    const s2 = play(s, 2, { type: 'batalla', glade: 2, target: 'meta' });
    expect(s2.actionsLeft).toBe(3);
    expect(s2.freeBattle).toBe(false);
    // meta defendiendo no tienen bonus
    const b = s2.lastBattle!;
    expect(b.defenderHits).toBe(b.defenderRolls.filter((r) => r >= 4).length);
  });
});

describe('habilidades especiales', () => {
  it('Google adquiere un agente del rival más fuerte, 1 vez por turno', () => {
    const s = four();
    s.glades[0].warriors.meta = 2;
    s.glades[0].warriors.openai = 1;
    s.factions.google!.hand = [{ id: 1, suit: 'datos', name: 'a' }, { id: 2, suit: 'hype', name: 'b' }];
    const s2 = play(s, 0, { type: 'especial', glade: 0, card: 1 });
    expect(s2.glades[0].warriors.meta).toBe(1);
    expect(s2.glades[0].warriors.google).toBe(5);
    expect(s2.actionsLeft).toBe(2);
    expect(validateMove(s2, 0, { type: 'especial', glade: 0, card: 2 })).toMatch(/Ya usaste/);
  });

  it('Google no adquiere donde no lidera', () => {
    const s = four();
    s.glades[3].warriors = { google: 1, meta: 3 };
    s.factions.google!.hand = [{ id: 1, suit: 'hype', name: 'a' }];
    expect(validateMove(s, 0, { type: 'especial', glade: 3, card: 1 })).toMatch(/liderar/);
  });

  it('Meta forkea junto a una estructura rival: +1 PV', () => {
    let s = four();
    s = play(s, 0, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 0, { type: 'descartar', cards: [s.factions.google!.hand[0].id] });
    s.glades[0].warriors.meta = 1;
    s.factions.meta!.hand = [{ id: 1, suit: 'datos', name: 'a' }];
    const s2 = play(s, 1, { type: 'especial', glade: 0, card: 1 });
    expect(s2.factions.meta!.vp).toBe(1);
    expect(s2.actionsLeft).toBe(2);
  });

  it('DeepSeek paga con cualquier carta (Eficiencia)', () => {
    const s = createGame({ seed: 5, players: [{ faction: 'deepseek', name: 'a' }, { faction: 'google', name: 'b' }] });
    // Mercado 0 es de datos; una carta de cómputo igual sirve para construir
    s.factions.deepseek!.hand = [{ id: 1, suit: 'computo', name: 'x' }];
    expect(validateMove(s, 0, { type: 'construir', glade: 0, card: 1 })).toBeNull();
  });

  it('Anthropic y OpenAI no tienen especial', () => {
    expect(FACTIONS.anthropic.special).toBeNull();
    expect(FACTIONS.openai.special).toBeNull();
  });
});

describe('El Redditor', () => {
  const rd = () =>
    createGame({ seed: 5, players: [{ faction: 'redditor', name: 'R' }, { faction: 'google', name: 'G' }] });

  it('arranca con un solo peón en el centro y 5 componentes, sin liderar', () => {
    const s = rd();
    expect(s.glades[4].warriors.redditor).toBe(1);
    expect(s.factions.redditor!.items).toHaveLength(5);
    expect(ruler(s, 4)).toBe(null);
  });

  it('moverse quema un café y sólo a mercados vecinos', () => {
    let s = rd();
    expect(validateMove(s, 0, { type: 'mover', from: 4, to: 9, count: 1 })).toMatch(/alcance/);
    s = play(s, 0, { type: 'mover', from: 4, to: 5, count: 1 });
    s = play(s, 0, { type: 'mover', from: 5, to: 8, count: 1 });
    expect(s.glades[8].warriors.redditor).toBe(1);
    expect(validateMove(s, 0, { type: 'mover', from: 8, to: 9, count: 1 })).toMatch(/Café/);
  });

  it('fine-tunear paga carta del mercado: componente nuevo y PV', () => {
    let s = rd();
    s.factions.redditor!.hand = [{ id: 900, suit: 'computo', name: 'X' }];
    s = play(s, 0, { type: 'finetune', glade: 4, card: 900 });
    expect(s.factions.redditor!.items!.filter((i) => i.kind === 'gpu')).toHaveLength(2);
    expect(s.factions.redditor!.vp).toBe(2);
    expect(validateMove(s, 0, { type: 'finetune', glade: 4, card: s.factions.redditor!.hand[0]?.id ?? -1 })).not.toBe(null);
  });

  it('ayudar regala la carta a un rival presente, 1 vez por turno', () => {
    let s = rd();
    s.glades[4].warriors.google = 2;
    const card = s.factions.redditor!.hand[0].id;
    const before = s.factions.google!.hand.length;
    s = play(s, 0, { type: 'especial', glade: 4, card, target: 'google' });
    expect(s.factions.google!.hand).toHaveLength(before + 1);
    expect(s.factions.redditor!.vp).toBeGreaterThan(0);
    expect(validateMove(s, 0, { type: 'especial', glade: 4, card: s.factions.redditor!.hand[0].id })).toMatch(/Ya ayudaste/);
  });

  it('los golpes queman componentes y el peón no muere; Dormir recupera 3', () => {
    let s = rd();
    s.glades[4].warriors.google = 3;
    s = play(s, 0, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 0, { type: 'descartar', cards: [s.factions.redditor!.hand[0].id] });
    let tries = 0;
    while (s.factions.redditor!.items!.every((i) => !i.exhausted) && tries++ < 20) {
      const r = applyMove(s, 1, { type: 'batalla', glade: 4, target: 'redditor' });
      if (!r.ok) break;
      s = r.state;
    }
    expect(s.glades[4].warriors.redditor).toBe(1);
    expect(s.factions.redditor!.items!.some((i) => i.exhausted)).toBe(true);
    s = play(s, 1, { type: 'terminarDia' });
    if (s.phase === 'descarte') s = play(s, 1, { type: 'descartar', cards: s.factions.google!.hand.slice(5).map((c) => c.id) });
    const ex = s.factions.redditor!.items!.filter((i) => i.exhausted).length;
    expect(ex).toBeLessThanOrEqual(2);
  });

  it('las otras facciones no pueden scrapear ni fine-tunear', () => {
    const s = four();
    expect(validateMove(s, 0, { type: 'scrapear' })).toMatch(/Redditor/);
  });
});

describe('victoria y scoring', () => {
  it('gana al llegar a 20 PV', () => {
    const s = four();
    s.factions.google!.vp = VICTORY_VP - 1;
    s.factions.google!.hand = [{ id: 1, suit: 'datos', name: 'a' }];
    const s2 = play(s, 0, { type: 'construir', glade: 0, card: 1 });
    expect(s2.winner).toBe('google');
    expect(s2.phase).toBe('fin');
    expect(validateMove(s2, 0, { type: 'terminarDia' })).toMatch(/terminó/);
  });

  it('ruler: empate = nadie gobierna', () => {
    const s = four();
    s.glades[4].warriors = { google: 2, meta: 2 };
    expect(ruler(s, 4)).toBeNull();
    s.glades[4].warriors.meta = 3;
    expect(ruler(s, 4)).toBe('meta');
  });
});

describe('playerView', () => {
  it('no filtra manos ajenas, mazo ni RNG', () => {
    const s = four();
    const v = playerView(s, 1);
    expect(v.factions.meta!.hand).toHaveLength(3);
    expect(v.factions.google!.hand).toHaveLength(0);
    expect(v.handCounts.google).toBe(3);
    expect(v.deck).toEqual([]);
    expect(v.deckCount).toBe(s.deck.length);
    expect(v.rng).toBe(0);
    const wire = JSON.stringify(v);
    for (const c of s.factions.google!.hand) expect(wire).not.toContain(`"id":${c.id},`);
  });
});

describe('simulación aleatoria', () => {
  it('60 partidas con moves legales al azar no rompen invariantes', () => {
    for (let seed = 1; seed <= 60; seed++) {
      let s = createGame({
        seed,
        players: [
          { faction: 'google', name: 'a' },
          { faction: 'meta', name: 'b' },
          { faction: 'anthropic', name: 'c' },
          { faction: 'openai', name: 'd' },
        ].map((p, i) => (i === seed % 4 && seed % 2 ? { ...p, faction: seed % 4 === 0 ? 'redditor' : seed % 3 ? 'deepseek' : 'redditor' } : p))
          .slice(0, 2 + (seed % 3)) as never,
      });
      let r = seed * 7919;
      const rand = (n: number) => ((r = (r * 1103515245 + 12345) & 0x7fffffff) % n);
      for (let step = 0; step < 600 && s.phase !== 'fin'; step++) {
        const f = s.order[s.current];
        const seat = s.factions[f]!.seat;
        const moves = candidateMoves(s);
        const legal = moves.filter((m) => validateMove(s, seat, m) === null);
        expect(legal.length).toBeGreaterThan(0);
        const pick = rand(4) === 0 ? legal[legal.length - 1] : legal[rand(legal.length)];
        s = play(s, seat, pick);
        checkInvariants(s);
      }
    }
  }, 60_000);
});

function candidateMoves(s: GameState): Move[] {
  const f = s.order[s.current];
  const hand = s.factions[f]!.hand;
  const ms: Move[] = [{ type: 'terminarDia' }];
  if (s.phase === 'descarte') return [{ type: 'descartar', cards: hand.slice(0, hand.length - 5).map((c) => c.id) }];
  for (const g of GLADES) {
    for (const t of GLADES) if (t.id !== g.id) ms.push({ type: 'mover', from: g.id, to: t.id, count: 1 });
    for (const c of hand) {
      ms.push({ type: 'finetune', glade: g.id, card: c.id });
      for (const o of s.order) ms.push({ type: 'especial', glade: g.id, card: c.id, target: o });
      ms.push({ type: 'reclutar', glade: g.id, card: c.id });
      ms.push({ type: 'construir', glade: g.id, card: c.id });
      ms.push({ type: 'encender', glade: g.id, card: c.id });
      ms.push({ type: 'especial', glade: g.id, card: c.id });
    }
    for (const o of s.order) ms.push({ type: 'batalla', glade: g.id, target: o });
  }
  for (const c of hand) ms.push({ type: 'esfuerzo', card: c.id });
  ms.push({ type: 'scrapear' });
  return ms;
}

function checkInvariants(s: GameState) {
  for (const f of s.order) {
    const def = FACTIONS[f];
    const fs = s.factions[f]!;
    const onMap = s.glades.reduce((n, g) => n + (g.warriors[f] ?? 0), 0);
    expect(onMap + fs.warriorsSupply).toBe(def.warriors);
    const b = s.glades.reduce((n, g) => n + g.buildings.filter((x) => x.faction === f).length, 0);
    expect(b + fs.buildingsSupply).toBe(def.building?.count ?? 0);
    const t = s.glades.reduce((n, g) => n + g.tokens.filter((x) => x.faction === f).length, 0);
    expect(t + fs.tokensSupply).toBe(def.token?.count ?? 0);
  }
  for (const g of s.glades) expect(g.buildings.length).toBeLessThanOrEqual(GLADES[g.id].slots);
  const cards = s.deck.length + s.discard.length + s.order.reduce((n, f) => n + s.factions[f]!.hand.length, 0);
  expect(cards).toBe(40);
}
