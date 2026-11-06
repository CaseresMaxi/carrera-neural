import { buildDeck } from './cards';
import { AID_VP, FACTIONS, FINETUNE_VP, ITEMS, MAX_ITEMS, REFRESH_ITEMS, START_ITEMS, SUIT_ITEM } from './factions';
import { GLADES, START_CORNERS, distance, isAdjacent, neighbors } from './map';
import { rngOf } from './rng';
import type {
  BattleResult,
  Card,
  FactionId,
  FactionState,
  GameConfig,
  GameState,
  GameView,
  GladeState,
  ItemKind,
  Move,
  MoveResult,
  Piece,
  Suit,
} from './types';

export const VICTORY_VP = 20;
export const HAND_LIMIT = 5;
export const STARTING_HAND = 3;
/** PV de cierre de OpenAI según lanzamientos activos (0..8). */
export const LANTERN_VP = [0, 1, 2, 2, 3, 3, 4, 5, 6];

// ───────────────────────── helpers de consulta ─────────────────────────

export function currentFaction(s: GameState): FactionId {
  return s.order[s.current];
}

export function warriorsAt(g: GladeState, f: FactionId): number {
  return g.warriors[f] ?? 0;
}

export function presence(g: GladeState, f: FactionId): number {
  if (FACTIONS[f].nomad) return 0; // el Redditor nunca lidera
  return warriorsAt(g, f) + g.buildings.filter((b) => b.faction === f).length;
}

/** Facción que gobierna el claro (máxima presencia estricta) o null. */
export function ruler(s: GameState, glade: number): FactionId | null {
  const g = s.glades[glade];
  let best: FactionId | null = null;
  let bestN = 0;
  let tie = false;
  for (const f of s.order) {
    const n = presence(g, f);
    if (n > bestN) {
      best = f;
      bestN = n;
      tie = false;
    } else if (n === bestN && n > 0) {
      tie = true;
    }
  }
  return tie ? null : best;
}

/** Si la carta sirve para pagar en ese mercado (DeepSeek: Eficiencia, cualquier carta). */
export function cardPays(f: FactionId, card: Suit, glade: number): boolean {
  return !!FACTIONS[f].anyCard || suitMatches(card, glade);
}

export function suitMatches(card: Suit, glade: number): boolean {
  return card === 'hype' || card === GLADES[glade].terrain;
}

function hasAnyPieces(g: GladeState, f: FactionId): boolean {
  return (
    warriorsAt(g, f) > 0 ||
    g.buildings.some((b) => b.faction === f) ||
    g.tokens.some((t) => t.faction === f)
  );
}

function findCard(fs: FactionState, cardId: number): Card | undefined {
  return fs.hand.find((c) => c.id === cardId);
}

function validGlade(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < GLADES.length;
}

// ───────────────────────── Redditor (inventario) ─────────────────────────

/** Mercado donde está el peón del nómade (o -1). */
export function pawnGlade(s: GameState, f: FactionId): number {
  return s.glades.findIndex((g) => warriorsAt(g, f) > 0);
}

export function freshCount(fs: FactionState, kind: ItemKind): number {
  return (fs.items ?? []).filter((i) => i.kind === kind && !i.exhausted).length;
}

function exhaust(fs: FactionState, kind: ItemKind) {
  const it = fs.items!.find((i) => i.kind === kind && !i.exhausted)!;
  it.exhausted = true;
}

/** Orden en que se queman componentes cuando el jugador no elige (Ayudar, golpes). */
const BURN_ORDER: ItemKind[] = ['dataset', 'cafe', 'teclado', 'gpu'];
/** Orden en que se recuperan componentes. */
const REFRESH_ORDER: ItemKind[] = ['cafe', 'gpu', 'teclado', 'dataset'];

function burnAny(fs: FactionState): ItemKind | null {
  for (const k of BURN_ORDER) if (freshCount(fs, k) > 0) return exhaust(fs, k), k;
  return null;
}

function refreshItems(fs: FactionState, n: number): number {
  let done = 0;
  for (let round = 0; round < n; round++) {
    const it = REFRESH_ORDER.map((k) => fs.items!.find((i) => i.kind === k && i.exhausted)).find(Boolean);
    if (!it) break;
    it.exhausted = false;
    done++;
  }
  return done;
}

/** Rival que recibe la ayuda por defecto: el de más piezas en el mercado. */
export function aidTarget(s: GameState, glade: number, f: FactionId): FactionId | null {
  const g = s.glades[glade];
  const count = (o: FactionId) => warriorsAt(g, o) + g.buildings.filter((b) => b.faction === o).length + g.tokens.filter((t) => t.faction === o).length;
  let best: FactionId | null = null;
  for (const o of s.order) if (o !== f && count(o) > 0 && (!best || count(o) > count(best))) best = o;
  return best;
}

/** Rival con más agentes en el mercado (empate: orden de turno), para Adquirir. */
export function acquireTarget(s: GameState, glade: number, f: FactionId): FactionId | null {
  const g = s.glades[glade];
  let best: FactionId | null = null;
  for (const o of s.order) if (o !== f && !FACTIONS[o].nomad && warriorsAt(g, o) > 0 && (!best || warriorsAt(g, o) > warriorsAt(g, best))) best = o;
  return best;
}

// ───────────────────────── setup ─────────────────────────

export function createGame(config: GameConfig): GameState {
  const { players } = config;
  if (players.length < 2 || players.length > 4) throw new Error('Se necesitan de 2 a 4 jugadores');
  const ids = new Set(players.map((p) => p.faction));
  if (ids.size !== players.length) throw new Error('Facciones repetidas');

  const s: GameState = {
    version: 1,
    seed: config.seed >>> 0,
    rng: config.seed >>> 0,
    turn: 1,
    current: 0,
    phase: 'dia',
    actionsLeft: 0,
    freeBattle: false,
    effortUsed: false,
    specialUsed: false,
    battlesWon: 0,
    order: players.map((p) => p.faction),
    factions: {},
    glades: GLADES.map((g) => ({ id: g.id, warriors: {}, buildings: [], tokens: [] })),
    deck: [],
    discard: [],
    log: [],
    lastBattle: null,
    winner: null,
    moveCount: 0,
  };
  const rng = rngOf(s);
  s.deck = rng.shuffle(buildDeck());

  players.forEach((p, seat) => {
    const def = FACTIONS[p.faction];
    s.factions[p.faction] = {
      id: p.faction,
      seat,
      playerName: p.name,
      vp: 0,
      hand: [],
      warriorsSupply: def.warriors,
      buildingsSupply: def.building?.count ?? 0,
      tokensSupply: def.token?.count ?? 0,
      ...(def.nomad ? { items: START_ITEMS.map((kind) => ({ kind, exhausted: false })) } : {}),
    };
  });

  // Setup de facciones en sus esquinas.
  players.forEach((p, seat) => {
    const corner = START_CORNERS[seat];
    const fs = s.factions[p.faction]!;
    const def = FACTIONS[p.faction];
    const place = (glade: number, n: number) => {
      const k = Math.min(n, fs.warriorsSupply);
      s.glades[glade].warriors[p.faction] = warriorsAt(s.glades[glade], p.faction) + k;
      fs.warriorsSupply -= k;
    };
    switch (p.faction) {
      case 'google':
        place(corner, 3);
        for (const n of neighbors(corner)) place(n, 1);
        break;
      case 'meta':
      case 'anthropic':
      case 'deepseek':
        place(corner, 4);
        break;
      case 'openai':
        place(corner, 2);
        break;
      case 'redditor':
        place(4, 1); // arranca en el centro del mapa
        break;
    }
    if (def.building) {
      s.glades[corner].buildings.push({ faction: p.faction, kind: def.building.kind });
      fs.buildingsSupply--;
    }
    if (def.token) {
      s.glades[corner].tokens.push({ faction: p.faction, kind: def.token.kind });
      fs.tokensSupply--;
    }
  });

  for (const f of s.order) for (let i = 0; i < STARTING_HAND; i++) drawCard(s, f);

  log(s, null, `Comienza la partida (semilla ${s.seed}).`);
  startTurn(s);
  return s;
}

// ───────────────────────── mutadores internos ─────────────────────────

function log(s: GameState, faction: FactionId | null, text: string) {
  s.log.push({ seq: s.log.length, turn: s.turn, faction, text });
  if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
}

function drawCard(s: GameState, f: FactionId) {
  if (s.deck.length === 0) {
    if (s.discard.length === 0) return;
    s.deck = rngOf(s).shuffle(s.discard);
    s.discard = [];
    log(s, null, 'El mazo se rebaraja con el descarte.');
  }
  const c = s.deck.pop()!;
  s.factions[f]!.hand.push(c);
}

function spendCard(s: GameState, f: FactionId, cardId: number): Card {
  const fs = s.factions[f]!;
  const i = fs.hand.findIndex((c) => c.id === cardId);
  const [c] = fs.hand.splice(i, 1);
  s.discard.push(c);
  return c;
}

function gainVp(s: GameState, f: FactionId, n: number, why: string) {
  if (n <= 0 || s.winner) return;
  const fs = s.factions[f]!;
  fs.vp += n;
  log(s, f, `+${n} PV (${why}). Total ${fs.vp}.`);
  if (fs.vp >= VICTORY_VP) {
    s.winner = f;
    s.phase = 'fin';
    log(s, f, `¡${FACTIONS[f].name} gana la partida con ${fs.vp} PV!`);
  }
}

function startTurn(s: GameState) {
  const f = currentFaction(s);
  const def = FACTIONS[f];
  const fs = s.factions[f]!;
  s.phase = 'dia';
  s.actionsLeft = def.actions;
  s.freeBattle = def.freeBattle;
  s.effortUsed = false;
  s.specialUsed = false;
  s.battlesWon = 0;
  log(s, f, `Turno ${s.turn}: ${fs.playerName} (${def.short}).`);

  // Planning
  if (f === 'google') {
    let added = 0;
    for (const g of s.glades) {
      if (fs.warriorsSupply <= 0) break;
      if (g.buildings.some((b) => b.faction === f)) {
        g.warriors[f] = warriorsAt(g, f) + 1;
        fs.warriorsSupply--;
        added++;
      }
    }
    if (added) log(s, f, `Planning — Autoescalado: +${added} ingenieros en los datacenters.`);
  }
  if (def.nomad) {
    const n = refreshItems(fs, REFRESH_ITEMS);
    if (n) log(s, f, `Planning — Dormir: recupera ${n} componente(s).`);
  }
}

/** PV que suma la facción en el Cierre si cerrara ahora. */
export function closingScore(s: GameState, f: FactionId): { vp: number; why: string }[] {
  const out: { vp: number; why: string }[] = [];
  const add = (vp: number, why: string) => out.push({ vp, why });
  if (f === 'meta') {
    const n = s.glades.filter((g) => ruler(s, g.id) === f && g.buildings.some((b) => b.faction === f)).length;
    add(n, `${n} repositorios con estrellas`);
  } else if (f === 'anthropic') {
    add(s.battlesWon > 0 ? 1 : 0, 'benchmark ganado este turno');
    const safe = s.glades.filter((g) => ruler(s, g.id) === f && g.buildings.some((b) => b.faction === f)).length;
    add(Math.floor(safe / 3), `${safe} laboratorios en mercados seguros (1 PV cada 3)`);
  } else if (f === 'openai') {
    const lanterns = s.glades.filter((g) => g.tokens.some((t) => t.faction === f)).length;
    add(LANTERN_VP[Math.min(lanterns, LANTERN_VP.length - 1)], `${lanterns} lanzamientos con usuarios`);
  } else if (f === 'google') {
    const ruled = s.glades.filter((g) => ruler(s, g.id) === f).length;
    add(Math.floor(ruled / 3), `monopolio en ${ruled} mercados (1 PV cada 3)`);
  } else if (f === 'deepseek') {
    const contested = s.glades.filter((g) => warriorsAt(g, f) > 0 && s.order.some((o) => o !== f && hasAnyPieces(g, o))).length;
    const led = s.glades.filter((g) => ruler(s, g.id) === f && g.buildings.some((b) => b.faction === f)).length;
    add(Math.floor(contested / 3), `${contested} mercados disputados (1 PV cada 3)`);
    add(led, `${led} clústers en mercados que lidera`);
  } else if (FACTIONS[f].nomad) {
    const at = pawnGlade(s, f);
    const n = at < 0 ? 0 : s.order.filter((o) => o !== f && hasAnyPieces(s.glades[at], o)).length;
    add(n, `drama en el hilo: ${n} rival(es) en su mercado`);
  }
  return out;
}

function endDay(s: GameState) {
  const f = currentFaction(s);
  // Cierre del trimestre: puntuación de facción
  for (const r of closingScore(s, f)) gainVp(s, f, r.vp, r.why);
  if (s.winner) return;
  drawCard(s, f);
  if (s.factions[f]!.hand.length > HAND_LIMIT) {
    s.phase = 'descarte';
    log(s, f, `Cierre: debe descartar hasta ${HAND_LIMIT} cartas.`);
    return;
  }
  nextTurn(s);
}

function nextTurn(s: GameState) {
  s.current = (s.current + 1) % s.order.length;
  s.turn++;
  startTurn(s);
}

function removePieces(
  s: GameState,
  glade: GladeState,
  victim: FactionId,
  hits: number,
  by: FactionId,
): { warriors: number; structures: number; items?: number } {
  const vs = s.factions[victim]!;
  let warriors = 0;
  let structures = 0;
  if (FACTIONS[victim].nomad) {
    // El modelo local no muere: cada golpe quema un componente; si no hay frescos, se pierde uno quemado.
    let burned = 0;
    let lost = 0;
    for (; hits > 0; hits--) {
      if (burnAny(vs)) burned++;
      else if (vs.items!.length) vs.items!.pop(), lost++;
    }
    if (burned + lost) log(s, victim, `Recibe golpes: ${burned} componente(s) quemado(s)${lost ? `, ${lost} perdido(s)` : ''}.`);
    return { warriors: 0, structures: 0, items: burned + lost };
  }
  while (hits > 0 && warriorsAt(glade, victim) > 0) {
    glade.warriors[victim] = warriorsAt(glade, victim) - 1;
    vs.warriorsSupply++;
    warriors++;
    hits--;
  }
  const take = (list: Piece[], back: () => void) => {
    while (hits > 0) {
      const i = list.findIndex((p) => p.faction === victim);
      if (i < 0) break;
      list.splice(i, 1);
      back();
      structures++;
      hits--;
    }
  };
  take(glade.buildings, () => vs.buildingsSupply++);
  take(glade.tokens, () => vs.tokensSupply++);
  if (warriorsAt(glade, victim) === 0) delete glade.warriors[victim];
  const killVp = warriors * FACTIONS[by].vpPerWarriorKill;
  if (structures) gainVp(s, by, structures, 'estructuras rivales caídas');
  if (killVp) gainVp(s, by, killVp, 'hallazgos de auditoría');
  return { warriors, structures };
}

function resolveBattle(s: GameState, gladeId: number, att: FactionId, def: FactionId) {
  const g = s.glades[gladeId];
  const rng = rngOf(s);
  const attW = warriorsAt(g, att);
  const defW = warriorsAt(g, def);
  const dice = (f: FactionId, w: number) =>
    FACTIONS[f].nomad ? Math.min(3, (s.factions[f]!.items ?? []).filter((i) => i.kind === 'gpu').length) : Math.min(w, FACTIONS[f].maxDice);
  const attackerRolls = Array.from({ length: dice(att, attW) }, () => rng.int(1, 6));
  const defenderRolls = Array.from({ length: dice(def, defW) }, () => rng.int(1, 6));
  let attackerHits = attackerRolls.filter((r) => r >= 4).length;
  let defenderHits = defenderRolls.filter((r) => r >= 4).length;
  if (defW === 0) attackerHits += 1; // indefenso
  if (defW > 0) defenderHits += FACTIONS[def].defenseBonus;

  const battle: BattleResult = {
    seq: s.moveCount,
    glade: gladeId,
    attacker: att,
    defender: def,
    attackerRolls,
    defenderRolls,
    attackerHits,
    defenderHits,
    attackerWarriors: attW,
    defenderWarriors: defW,
    attackerLosses: { warriors: 0, structures: 0 },
    defenderLosses: { warriors: 0, structures: 0 },
  };
  s.lastBattle = battle;
  log(
    s,
    att,
    `Benchmark en ${GLADES[gladeId].name} contra ${FACTIONS[def].short}: ` +
      `[${attackerRolls.join(', ')}] vs [${defenderRolls.join(', ') || '—'}] → ` +
      `${attackerHits} a ${defenderHits}.`,
  );
  // Impactos simultáneos
  const dealt = removePieces(s, g, def, attackerHits, att);
  const taken = removePieces(s, g, att, defenderHits, def);
  battle.defenderLosses = dealt;
  battle.attackerLosses = taken;
  if (dealt.warriors + dealt.structures > taken.warriors + taken.structures) s.battlesWon++;
}

// ───────────────────────── validación ─────────────────────────

/** Devuelve null si el move es legal para ese asiento, o un mensaje de error. */
export function validateMove(s: GameState, seat: number, m: Move): string | null {
  if (s.phase === 'fin') return 'La partida terminó';
  const f = currentFaction(s);
  const fs = s.factions[f]!;
  if (fs.seat !== seat) return 'No es tu turno';
  const def = FACTIONS[f];

  if (s.phase === 'descarte') {
    if (m.type !== 'descartar') return 'Tenés que descartar';
    const need = fs.hand.length - HAND_LIMIT;
    if (!Array.isArray(m.cards) || new Set(m.cards).size !== m.cards.length) return 'Selección inválida';
    if (m.cards.length !== need) return `Descartá exactamente ${need}`;
    if (!m.cards.every((id) => findCard(fs, id))) return 'Carta inexistente';
    return null;
  }

  if (def.nomad) return validateNomad(s, f, fs, m);

  // fase 'dia'
  switch (m.type) {
    case 'descartar':
      return 'No hay que descartar ahora';
    case 'terminarDia':
      return null;
    case 'esfuerzo': {
      if (s.effortUsed) return 'Ya hiciste Crunch este turno';
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (c.suit !== 'hype') return 'Crunch requiere una carta de Hype';
      return null;
    }
  }

  if (m.type === 'scrapear') return 'Sólo el Redditor puede hacer eso';
  if (m.type !== 'mover' && !validGlade(m.glade)) return 'Mercado inválido';

  switch (m.type) {
    case 'mover': {
      if (s.actionsLeft <= 0) return 'Sin acciones';
      if (!validGlade(m.from) || !validGlade(m.to)) return 'Mercado inválido';
      if (m.from === m.to) return 'Origen y destino iguales';
      const have = warriorsAt(s.glades[m.from], f);
      if (!Number.isInteger(m.count) || m.count < 1 || m.count > have) return 'Cantidad inválida';
      const d = def.moveRange === 1 ? (isAdjacent(m.from, m.to) ? 1 : Infinity) : distance(m.from, m.to);
      if (d > def.moveRange) return 'Destino fuera de alcance';
      if (def.moveNeedsRule && ruler(s, m.from) !== f && ruler(s, m.to) !== f)
        return 'Tenés que liderar el origen o el destino';
      return null;
    }
    case 'reclutar': {
      if (s.actionsLeft <= 0) return 'Sin acciones';
      if (def.recruit <= 0) return `${def.short} no contrata`;
      if (fs.warriorsSupply <= 0) return 'No quedan agentes en la reserva';
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (!cardPays(f, c.suit, m.glade)) return 'La carta no coincide con el recurso del mercado';
      const g = s.glades[m.glade];
      const ok =
        f === 'openai'
          ? g.tokens.some((t) => t.faction === f)
          : g.buildings.some((b) => b.faction === f);
      if (!ok) return f === 'openai' ? 'Necesitás un lanzamiento en el mercado' : 'Necesitás una estructura propia en el mercado';
      return null;
    }
    case 'construir': {
      if (s.actionsLeft <= 0) return 'Sin acciones';
      if (!def.building) return `${def.short} no construye`;
      if (fs.buildingsSupply <= 0) return 'No quedan estructuras';
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (!cardPays(f, c.suit, m.glade)) return 'La carta no coincide con el recurso del mercado';
      if (ruler(s, m.glade) !== f) return 'Tenés que liderar el mercado';
      if (s.glades[m.glade].buildings.length >= GLADES[m.glade].slots) return 'No hay espacio libre';
      return null;
    }
    case 'encender': {
      if (s.actionsLeft <= 0) return 'Sin acciones';
      if (!def.token) return 'Sólo OpenAI hace lanzamientos';
      if (fs.tokensSupply <= 0) return 'No quedan lanzamientos';
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (!cardPays(f, c.suit, m.glade)) return 'La carta no coincide con el recurso del mercado';
      const g = s.glades[m.glade];
      if (g.tokens.some((t) => t.faction === f)) return 'Ya hay un lanzamiento en ese mercado';
      const near =
        warriorsAt(g, f) > 0 ||
        neighbors(m.glade).some((n) => s.glades[n].tokens.some((t) => t.faction === f));
      if (!near) return 'Necesitás un investigador ahí o un lanzamiento vecino';
      return null;
    }
    case 'especial': {
      if (s.actionsLeft <= 0) return 'Sin acciones';
      if (!def.special) return `${def.short} no tiene habilidad especial`;
      if (s.specialUsed) return `Ya usaste ${def.special.name} este turno`;
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (!cardPays(f, c.suit, m.glade)) return 'La carta no coincide con el recurso del mercado';
      const g = s.glades[m.glade];
      if (warriorsAt(g, f) <= 0) return 'Necesitás agentes en el mercado';
      if (f === 'google') {
        if (ruler(s, m.glade) !== f) return 'Tenés que liderar el mercado';
        if (fs.warriorsSupply <= 0) return 'No quedan ingenieros en la reserva';
        if (!acquireTarget(s, m.glade, f)) return 'No hay agentes rivales para adquirir';
        return null;
      }
      if (f === 'meta') {
        const rival = g.buildings.some((b) => b.faction !== f) || g.tokens.some((t) => t.faction !== f);
        if (!rival) return 'Necesitás una estructura o lanzamiento rival en el mercado';
        return null;
      }
      return 'Habilidad desconocida';
    }
    // scrapear: filtrado arriba
    case 'finetune':
      return 'Sólo el Redditor puede hacer eso';
    case 'batalla': {
      if (s.actionsLeft <= 0 && !s.freeBattle) return 'Sin acciones';
      if (m.target === f) return 'No podés competir contra vos';
      if (!s.factions[m.target]) return 'Facción inexistente';
      const g = s.glades[m.glade];
      if (warriorsAt(g, f) <= 0) return 'Necesitás agentes en el mercado';
      if (!hasAnyPieces(g, m.target)) return 'El objetivo no tiene piezas ahí';
      return null;
    }
  }
  return 'Move desconocido';
}

function validateNomad(s: GameState, f: FactionId, fs: FactionState, m: Move): string | null {
  const at = pawnGlade(s, f);
  const need = (k: ItemKind) => (freshCount(fs, k) > 0 ? null : `Necesitás un ${ITEMS[k].name} sin quemar`);
  switch (m.type) {
    case 'descartar':
      return 'No hay que descartar ahora';
    case 'terminarDia':
      return null;
    case 'esfuerzo': {
      if (s.effortUsed) return 'Ya hiciste Crunch este turno';
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (c.suit !== 'hype') return 'Crunch requiere una carta de Hype';
      if (!fs.items!.some((i) => i.exhausted)) return 'No tenés componentes quemados';
      return null;
    }
    case 'mover': {
      if (!validGlade(m.from) || !validGlade(m.to)) return 'Mercado inválido';
      if (m.from !== at) return 'Tu modelo local no está ahí';
      if (m.count !== 1) return 'Cantidad inválida';
      if (!isAdjacent(m.from, m.to)) return 'Destino fuera de alcance';
      return need('cafe');
    }
    case 'batalla': {
      if (!validGlade(m.glade) || m.glade !== at) return 'Tenés que estar en ese mercado';
      if (m.target === f) return 'No podés competir contra vos';
      if (!s.factions[m.target]) return 'Facción inexistente';
      if (!hasAnyPieces(s.glades[m.glade], m.target)) return 'El objetivo no tiene piezas ahí';
      return need('gpu');
    }
    case 'scrapear':
      return need('dataset');
    case 'finetune': {
      if (!validGlade(m.glade) || m.glade !== at) return 'Tenés que estar en ese mercado';
      if (fs.items!.length >= MAX_ITEMS) return `Ya tenés ${MAX_ITEMS} componentes`;
      const c = findCard(fs, m.card);
      if (!c) return 'Carta inexistente';
      if (!suitMatches(c.suit, m.glade)) return 'La carta no coincide con el recurso del mercado';
      return need('teclado');
    }
    case 'especial': {
      if (!validGlade(m.glade) || m.glade !== at) return 'Tenés que estar en ese mercado';
      if (s.specialUsed) return 'Ya ayudaste este turno';
      if (!findCard(fs, m.card)) return 'Carta inexistente';
      if (!fs.items!.some((i) => !i.exhausted)) return 'No te quedan componentes sin quemar';
      const t = m.target ?? aidTarget(s, m.glade, f);
      if (!t || t === f || !s.factions[t]) return 'No hay rivales en tu mercado';
      if (!hasAnyPieces(s.glades[m.glade], t)) return 'Ese rival no está en tu mercado';
      return null;
    }
  }
  return 'Acción no disponible para el Redditor';
}

function applyNomad(s: GameState, f: FactionId, fs: FactionState, m: Move) {
  switch (m.type) {
    case 'mover': {
      exhaust(fs, 'cafe');
      delete s.glades[m.from].warriors[f];
      s.glades[m.to].warriors[f] = 1;
      log(s, f, `Toma un café y se muda a ${GLADES[m.to].name}.`);
      return;
    }
    case 'batalla':
      exhaust(fs, 'gpu');
      resolveBattle(s, m.glade, f, m.target);
      return;
    case 'scrapear':
      exhaust(fs, 'dataset');
      drawCard(s, f);
      log(s, f, 'Scrapea un dataset: roba 1 carta.');
      return;
    case 'finetune': {
      exhaust(fs, 'teclado');
      const c = spendCard(s, f, m.card);
      const kind = SUIT_ITEM[c.suit];
      fs.items!.push({ kind, exhausted: false });
      log(s, f, `Fine-tunea su modelo con ${c.name}: nuevo componente (${ITEMS[kind].name}).`);
      gainVp(s, f, FINETUNE_VP, 'fine-tune publicado');
      return;
    }
    case 'especial': {
      const t = m.target ?? aidTarget(s, m.glade, f)!;
      const burned = burnAny(fs)!;
      const i = fs.hand.findIndex((c) => c.id === m.card);
      const [c] = fs.hand.splice(i, 1);
      s.factions[t]!.hand.push(c);
      s.specialUsed = true;
      log(s, f, `Ayuda a ${FACTIONS[t].short} en el foro: le regala una carta (quema ${ITEMS[burned].name}).`);
      gainVp(s, f, AID_VP, 'karma');
      return;
    }
    case 'esfuerzo': {
      spendCard(s, f, m.card);
      refreshItems(fs, 1);
      s.effortUsed = true;
      log(s, f, 'Crunch: quema una carta de Hype y recupera 1 componente.');
      return;
    }
  }
}

// ───────────────────────── aplicación ─────────────────────────

export function applyMove(state: GameState, seat: number, m: Move): MoveResult {
  const err = validateMove(state, seat, m);
  if (err) return { ok: false, error: err };
  const s: GameState = structuredClone(state);
  const f = currentFaction(s);
  const fs = s.factions[f]!;
  const def = FACTIONS[f];
  s.moveCount++;

  if (def.nomad && m.type !== 'terminarDia' && m.type !== 'descartar') {
    applyNomad(s, f, fs, m);
    return { ok: true, state: s };
  }

  switch (m.type) {
    case 'mover': {
      const from = s.glades[m.from];
      const to = s.glades[m.to];
      from.warriors[f] = warriorsAt(from, f) - m.count;
      if (from.warriors[f] === 0) delete from.warriors[f];
      to.warriors[f] = warriorsAt(to, f) + m.count;
      s.actionsLeft--;
      log(s, f, `Despliega ${m.count} ${m.count === 1 ? def.warriorSingular : def.warriorName} de ${GLADES[m.from].name} a ${GLADES[m.to].name}.`);
      break;
    }
    case 'reclutar': {
      spendCard(s, f, m.card);
      const n = Math.min(def.recruit, fs.warriorsSupply);
      const g = s.glades[m.glade];
      g.warriors[f] = warriorsAt(g, f) + n;
      fs.warriorsSupply -= n;
      s.actionsLeft--;
      log(s, f, `Contrata ${n} ${n === 1 ? def.warriorSingular : def.warriorName} en ${GLADES[m.glade].name}.`);
      break;
    }
    case 'construir': {
      spendCard(s, f, m.card);
      const b = def.building!;
      const idx = b.count - fs.buildingsSupply;
      s.glades[m.glade].buildings.push({ faction: f, kind: b.kind });
      fs.buildingsSupply--;
      s.actionsLeft--;
      log(s, f, `Construye un ${b.name.toLowerCase()} en ${GLADES[m.glade].name}.`);
      gainVp(s, f, b.vp[Math.min(idx, b.vp.length - 1)], b.name.toLowerCase());
      break;
    }
    case 'encender': {
      spendCard(s, f, m.card);
      s.glades[m.glade].tokens.push({ faction: f, kind: def.token!.kind });
      fs.tokensSupply--;
      s.actionsLeft--;
      log(s, f, `Lanza un producto en ${GLADES[m.glade].name}.`);
      break;
    }
    case 'especial': {
      spendCard(s, f, m.card);
      s.actionsLeft--;
      s.specialUsed = true;
      const g = s.glades[m.glade];
      if (f === 'google') {
        const victim = acquireTarget(s, m.glade, f)!;
        g.warriors[victim] = warriorsAt(g, victim) - 1;
        if (g.warriors[victim] === 0) delete g.warriors[victim];
        s.factions[victim]!.warriorsSupply++;
        g.warriors[f] = warriorsAt(g, f) + 1;
        fs.warriorsSupply--;
        log(s, f, `Adquirir: compra un agente de ${FACTIONS[victim].short} en ${GLADES[m.glade].name}.`);
      } else {
        log(s, f, `Forkear: forkea el trabajo rival en ${GLADES[m.glade].name}.`);
        gainVp(s, f, 1, 'fork');
      }
      break;
    }
    case 'batalla': {
      if (s.freeBattle) s.freeBattle = false;
      else s.actionsLeft--;
      resolveBattle(s, m.glade, f, m.target);
      break;
    }
    case 'esfuerzo': {
      spendCard(s, f, m.card);
      s.actionsLeft++;
      s.effortUsed = true;
      log(s, f, 'Crunch: quema una carta de Hype y gana 1 acción.');
      break;
    }
    case 'terminarDia': {
      log(s, f, 'Cierra el sprint.');
      endDay(s);
      break;
    }
    case 'descartar': {
      for (const id of m.cards) spendCard(s, f, id);
      log(s, f, `Descarta ${m.cards.length} carta(s).`);
      nextTurn(s);
      break;
    }
  }
  return { ok: true, state: s };
}

/** Moves sin RNG ni información nueva: se pueden deshacer dentro del turno. */
export function isUndoable(m: Move): boolean {
  return m.type === 'mover' || m.type === 'reclutar' || m.type === 'construir' || m.type === 'encender' || m.type === 'especial' || m.type === 'esfuerzo' || m.type === 'finetune';
}

// ───────────────────────── vista por jugador ─────────────────────────

/** Filtra la info oculta. `seat = null` → espectador (no ve ninguna mano). */
export function playerView(s: GameState, seat: number | null): GameView {
  const v = structuredClone(s) as GameView;
  v.deckCount = s.deck.length;
  v.deck = [];
  v.rng = 0;
  v.seed = 0;
  v.viewer = seat;
  v.handCounts = {};
  for (const f of s.order) {
    const fs = v.factions[f]!;
    v.handCounts[f] = fs.hand.length;
    if (fs.seat !== seat) fs.hand = [];
  }
  return v;
}

/** Glades donde un move parcial sería legal (para resaltar en la UI). */
export function legalGlades(
  s: GameState,
  seat: number,
  build: (glade: number) => Move | Move[],
): number[] {
  return GLADES.map((g) => g.id).filter((id) => {
    const ms = build(id);
    return (Array.isArray(ms) ? ms : [ms]).some((m) => validateMove(s, seat, m) === null);
  });
}
