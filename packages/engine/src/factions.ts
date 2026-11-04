import type { FactionId, ItemKind, Suit } from './types';

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  /** Arquetipo de empresa (flavor). */
  tagline: string;
  color: string;
  warriors: number;
  warriorName: string;
  warriorSingular: string;
  building: { kind: string; name: string; count: number; vp: number[] } | null;
  token: { kind: string; name: string; count: number } | null;
  actions: number;
  /** Agentes que se colocan al contratar (0 = no puede contratar). */
  recruit: number;
  maxDice: number;
  moveRange: number;
  /** Si desplegar exige liderar el mercado de origen o destino. */
  moveNeedsRule: boolean;
  freeBattle: boolean;
  /** Puntos extra al defender si tiene agentes en el mercado. */
  defenseBonus: number;
  /** PV por cada agente rival eliminado. */
  vpPerWarriorKill: number;
  /** Eficiencia: cualquier carta sirve para cualquier mercado. */
  anyCard?: boolean;
  /** Habilidad especial de facción (1 vez por turno, cuesta acción + carta del mercado). */
  special: { name: string; hint: string } | null;
  /** Nómade: un solo peón que no lidera ni muere; actúa quemando componentes. */
  nomad?: boolean;
  summary: string[];
}

/**
 * Parodia de fans: las empresas reales aparecen como caricaturas de su arquetipo público.
 * Sin logos oficiales ni afiliación; los nombres son marcas de sus respectivos dueños.
 */
export const FACTIONS: Record<FactionId, FactionDef> = {
  google: {
    id: 'google',
    name: 'Google DeepMind',
    short: 'Google',
    tagline: 'La megacorporación: escala, nube propia y billetera infinita.',
    color: '#e0a82e',
    warriors: 20,
    warriorName: 'ingenieros',
    warriorSingular: 'ingeniero',
    building: { kind: 'datacenter', name: 'Datacenter', count: 6, vp: [1, 2, 2, 3, 3, 4] },
    token: null,
    actions: 3,
    recruit: 0,
    maxDice: 3,
    moveRange: 1,
    moveNeedsRule: true,
    freeBattle: false,
    defenseBonus: 0,
    vpPerWarriorKill: 0,
    special: {
      name: 'Adquirir',
      hint: 'Elegí un mercado que lideres con ingenieros y rivales: comprás 1 agente del rival más fuerte.',
    },
    summary: [
      'Planning — Autoescalado: +1 ingeniero en cada mercado con datacenter.',
      'No contrata: crece sola desde sus datacenters.',
      'Construir datacenters da PV (1·2·2·3·3·4).',
      'Adquirir (1/turno): en un mercado que lidera, cambia 1 agente rival por uno propio.',
      'Cierre — Monopolio: +1 PV cada 3 mercados que lidera.',
    ],
  },
  meta: {
    id: 'meta',
    name: 'Meta AI',
    short: 'Meta',
    tagline: 'Pesos abiertos para todos: que la comunidad haga el resto.',
    color: '#3b6fb6',
    warriors: 12,
    warriorName: 'contribuidores',
    warriorSingular: 'contribuidor',
    building: { kind: 'repo', name: 'Repositorio', count: 3, vp: [1, 2, 2] },
    token: null,
    actions: 3,
    recruit: 2,
    maxDice: 3,
    moveRange: 2,
    moveNeedsRule: true,
    freeBattle: false,
    defenseBonus: 0,
    vpPerWarriorKill: 0,
    special: {
      name: 'Forkear',
      hint: 'Elegí un mercado con un contribuidor tuyo y una estructura o lanzamiento rival: +1 PV.',
    },
    summary: [
      'Viral: despliega hasta 2 conexiones por acción.',
      'Contratar: +2 contribuidores en un mercado con repositorio.',
      'Construir repositorios da PV (1·2·2).',
      'Forkear (1/turno): junto a una estructura o lanzamiento rival, +1 PV.',
      'Cierre — Estrellas: +1 PV por repositorio en mercado que lidera.',
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    short: 'Anthropic',
    tagline: 'Seguridad primero: red teaming, auditorías y constitución.',
    color: '#c4532b',
    warriors: 12,
    warriorName: 'auditores',
    warriorSingular: 'auditor',
    building: { kind: 'laboratorio', name: 'Laboratorio', count: 4, vp: [1, 2, 2, 3] },
    token: null,
    actions: 3,
    recruit: 2,
    maxDice: 3,
    moveRange: 1,
    moveNeedsRule: true,
    freeBattle: true,
    defenseBonus: 1,
    vpPerWarriorKill: 1,
    special: null,
    summary: [
      'Red team: al defender con auditores, +1 punto de benchmark.',
      'Auditoría: un benchmark gratis por turno.',
      'Hallazgo: +1 PV por agente rival eliminado. Cierre: +1 PV si ganó un benchmark.',
      'Contratar: +2 auditores en mercado con laboratorio (PV 1·2·2·3).',
      'Cierre — Constitución: +1 PV si lidera 3+ mercados con laboratorio.',
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    short: 'OpenAI',
    tagline: 'Lanzar primero, iterar después: demos, hype y velocidad.',
    color: '#10a37f',
    warriors: 8,
    warriorName: 'investigadores',
    warriorSingular: 'investigador',
    building: null,
    token: { kind: 'demo', name: 'Lanzamiento', count: 8 },
    actions: 3,
    recruit: 1,
    maxDice: 2,
    moveRange: 1,
    moveNeedsRule: false,
    freeBattle: false,
    defenseBonus: 0,
    vpPerWarriorKill: 0,
    special: null,
    summary: [
      'Pivotar: despliega sin necesitar liderar.',
      'Lanzar: en un mercado con investigador o vecino a un lanzamiento (boca a boca).',
      'Contratar: +1 investigador en un mercado con lanzamiento.',
      'Cierre — Usuarios activos: PV según lanzamientos (0·1·2·2·3·3·4·5·6).',
      'Equipo enfocado: compite con máximo 2 dados.',
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    short: 'DeepSeek',
    tagline: 'Los laboratorios chinos: hacen más con mucho menos.',
    color: '#6a5acd',
    warriors: 14,
    warriorName: 'ingenieros',
    warriorSingular: 'ingeniero',
    building: { kind: 'cluster', name: 'Clúster', count: 4, vp: [1, 1, 2, 2] },
    token: null,
    actions: 3,
    recruit: 2,
    maxDice: 3,
    moveRange: 1,
    moveNeedsRule: true,
    freeBattle: false,
    defenseBonus: 0,
    vpPerWarriorKill: 0,
    anyCard: true,
    special: null,
    summary: [
      'Eficiencia: cualquier carta paga en cualquier mercado.',
      'Contratar: +2 ingenieros en un mercado con clúster.',
      'Construir clústers da PV (1·1·2·2).',
      'Cierre — Precio bajo: +1 PV cada 3 mercados disputados con rivales y +1 por clúster en mercado que lidera.',
    ],
  },
  redditor: {
    id: 'redditor',
    name: 'El Redditor',
    short: 'Redditor',
    tagline: 'Un freaki de foro con un modelo local que entrenó en su sótano.',
    color: '#c2448f',
    warriors: 1,
    warriorName: 'modelo local',
    warriorSingular: 'modelo local',
    building: null,
    token: null,
    actions: 0,
    recruit: 0,
    maxDice: 3,
    moveRange: 1,
    moveNeedsRule: false,
    freeBattle: false,
    defenseBonus: 0,
    vpPerWarriorKill: 0,
    nomad: true,
    special: {
      name: 'Ayudar',
      hint: 'Regalá una carta a un rival que esté en tu mercado: +2 PV de karma (quema un componente).',
    },
    summary: [
      'Lobo solitario: un solo peón. No lidera mercados y no se lo puede eliminar.',
      'Cada acción quema un componente: Café mueve, GPU compite, Dataset scrapea (roba carta), Teclado fine-tunea.',
      'Fine-tunear: pagá una carta del mercado → componente nuevo y +2 PV.',
      'Ayudar (1/turno): regalá una carta a un rival en tu mercado, +2 PV de karma.',
      'Planning — Dormir: recupera 3. Cierre — Drama: +1 PV por rival en su mercado.',
    ],
  },
};

export const FACTION_IDS: FactionId[] = ['google', 'meta', 'anthropic', 'openai', 'deepseek', 'redditor'];

export const ITEM_KINDS: ItemKind[] = ['cafe', 'gpu', 'dataset', 'teclado'];

export const ITEMS: Record<ItemKind, { name: string; verb: string; hint: string }> = {
  cafe: { name: 'Café', verb: 'Moverse', hint: 'Mové tu modelo local a un mercado vecino.' },
  gpu: { name: 'GPU usada', verb: 'Benchmark', hint: 'Competí contra un rival en tu mercado (1 dado por GPU, máx. 3).' },
  dataset: { name: 'Dataset', verb: 'Scrapear', hint: 'Robá una carta del mazo.' },
  teclado: { name: 'Teclado mecánico', verb: 'Fine-tunear', hint: 'Pagá una carta del mercado: +1 componente y +2 PV.' },
};

/** Componente que se obtiene al fine-tunear con una carta de ese palo. */
export const SUIT_ITEM: Record<Suit, ItemKind> = { datos: 'dataset', computo: 'gpu', talento: 'teclado', hype: 'cafe' };

export const START_ITEMS: ItemKind[] = ['cafe', 'cafe', 'gpu', 'dataset', 'teclado'];
export const MAX_ITEMS = 8;
export const REFRESH_ITEMS = 3;
export const FINETUNE_VP = 2;
export const AID_VP = 2;
