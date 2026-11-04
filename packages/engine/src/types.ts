export type Terrain = 'datos' | 'computo' | 'talento';
/** 'hype' es comodín: sirve como cualquier recurso. */
export type Suit = Terrain | 'hype';
export type FactionId = 'google' | 'meta' | 'anthropic' | 'openai' | 'deepseek' | 'redditor';

/** Componentes del Redditor (inventario). */
export type ItemKind = 'cafe' | 'gpu' | 'dataset' | 'teclado';

export interface Item {
  kind: ItemKind;
  /** Quemado: ya se usó y no sirve hasta recuperarse. */
  exhausted: boolean;
}

export interface Card {
  id: number;
  suit: Suit;
  name: string;
}

export interface Piece {
  faction: FactionId;
  kind: string;
}

export interface GladeState {
  id: number;
  warriors: Partial<Record<FactionId, number>>;
  /** Estructuras: ocupan slots y cuentan para el control. */
  buildings: Piece[];
  /** Fichas: no ocupan slots y no cuentan para el control. */
  tokens: Piece[];
}

export interface FactionState {
  id: FactionId;
  seat: number;
  playerName: string;
  vp: number;
  hand: Card[];
  warriorsSupply: number;
  buildingsSupply: number;
  tokensSupply: number;
  /** Inventario (sólo el Redditor). */
  items?: Item[];
}

export type Phase = 'dia' | 'descarte' | 'fin';

export interface BattleResult {
  seq: number;
  glade: number;
  attacker: FactionId;
  defender: FactionId;
  attackerRolls: number[];
  defenderRolls: number[];
  attackerHits: number;
  defenderHits: number;
}

export interface LogEntry {
  seq: number;
  turn: number;
  faction: FactionId | null;
  text: string;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  /** Número de turno global (1-based). */
  turn: number;
  /** Índice en `order` de la facción que juega. */
  current: number;
  phase: Phase;
  actionsLeft: number;
  freeBattle: boolean;
  effortUsed: boolean;
  /** Habilidad especial de facción usada este turno. */
  specialUsed: boolean;
  /** Batallas del turno actual en que el atacante quitó más piezas que las que perdió. */
  battlesWon: number;
  order: FactionId[];
  factions: Partial<Record<FactionId, FactionState>>;
  glades: GladeState[];
  deck: Card[];
  discard: Card[];
  log: LogEntry[];
  lastBattle: BattleResult | null;
  winner: FactionId | null;
  moveCount: number;
}

/** Vista filtrada que recibe cada jugador (sin manos ajenas, mazo ni RNG). */
export interface GameView extends GameState {
  deckCount: number;
  handCounts: Partial<Record<FactionId, number>>;
  viewer: number | null;
}

export type Move =
  | { type: 'mover'; from: number; to: number; count: number }
  | { type: 'reclutar'; glade: number; card: number }
  | { type: 'construir'; glade: number; card: number }
  | { type: 'encender'; glade: number; card: number }
  | { type: 'batalla'; glade: number; target: FactionId }
  | { type: 'especial'; glade: number; card: number; target?: FactionId }
  | { type: 'scrapear' }
  | { type: 'finetune'; glade: number; card: number }
  | { type: 'esfuerzo'; card: number }
  | { type: 'terminarDia' }
  | { type: 'descartar'; cards: number[] };

export interface PlayerConfig {
  faction: FactionId;
  name: string;
}

export interface GameConfig {
  seed: number;
  players: PlayerConfig[];
}

export type MoveResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
