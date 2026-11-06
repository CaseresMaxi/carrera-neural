import type { BattleResult, FactionId } from '@sotobosque/engine';

/**
 * Animaciones de pelea definidas con datos: mismo formato que `animations.json` del motor mesa
 * (github.com/CaseresMaxi/mesa). Un clip es una línea de tiempo de efectos; cada paso puede correr
 * sólo con ciertos resultados (`when`). El clip lo elige la facción atacante.
 */

export type FxWho = 'attacker' | 'defender' | 'node';
export type FxSide = 'attacker' | 'defender';
export type FxWhen = 'always' | 'attackerWins' | 'defenderWins' | 'draw' | 'undefended' | 'attackerLost' | 'defenderLost' | 'noLosses';
export type FxEase = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'bounce';
/** Color `#rrggbb` o el de la facción de un bando. */
export type FxColor = string | 'attacker' | 'defender';

interface Base {
  at: number;
  dur: number;
  when: FxWhen;
  ease: FxEase;
}
export type FxStep = Base &
  (
    | { fx: 'lunge'; who: FxSide; dist: number }
    | { fx: 'shake'; who: FxWho; amp: number }
    | { fx: 'flash'; who: FxWho; color: FxColor }
    | { fx: 'projectile'; from: FxSide; shape: 'orb' | 'bolt' | 'arrow' | 'star'; color: FxColor; count: number; size: number; arc: number }
    | { fx: 'burst'; who: FxWho; color: FxColor; count: number; radius: number }
    | { fx: 'ring'; who: FxWho; color: FxColor; radius: number }
    | { fx: 'dice'; size: number }
    | { fx: 'casualties' }
    | { fx: 'text'; who: FxWho; text: string; color: FxColor; size: number }
  );
export interface FxClip {
  description: string;
  steps: FxStep[];
}

type RawStep = { fx: FxStep['fx'] } & Partial<Record<string, unknown>>;

/** Valores por defecto de cada efecto (los mismos que el esquema de mesa). Las distancias están en px del tablero 2D de mesa. */
const DEFAULTS: Record<FxStep['fx'], Record<string, unknown>> = {
  lunge: { who: 'attacker', dist: 60 },
  shake: { who: 'defender', amp: 10 },
  flash: { who: 'defender', color: '#ffffff' },
  projectile: { from: 'attacker', shape: 'orb', color: 'attacker', count: 3, size: 22, arc: 60 },
  burst: { who: 'defender', color: '#ffcf4a', count: 16, radius: 90 },
  ring: { who: 'node', color: '#ffffff', radius: 140 },
  dice: { size: 46 },
  casualties: {},
  text: { who: 'node', text: '', color: '#2b2118', size: 44 },
};

function clip(description: string, steps: RawStep[]): FxClip {
  return { description, steps: steps.map((s) => ({ at: 0, dur: 400, when: 'always', ease: 'inOut', ...DEFAULTS[s.fx], ...s }) as FxStep) };
}

export const CLIPS: Record<string, FxClip> = {
  clasico: clip('Embestida, dados, impacto y bajas. Sirve para cualquier facción.', [
    { fx: 'lunge', at: 0, dur: 450, who: 'attacker', dist: 70, ease: 'back' },
    { fx: 'dice', at: 150, dur: 900 },
    { fx: 'shake', at: 450, dur: 350, who: 'defender', amp: 12, when: 'attackerWins' },
    { fx: 'flash', at: 450, dur: 250, who: 'defender', color: '#ffffff' },
    { fx: 'burst', at: 450, dur: 600, who: 'defender', color: 'attacker', count: 14 },
    { fx: 'lunge', at: 700, dur: 400, who: 'defender', dist: 40, when: 'attackerLost' },
    { fx: 'flash', at: 900, dur: 250, who: 'attacker', color: '#ffffff', when: 'attackerLost' },
    { fx: 'casualties', at: 1050, dur: 900 },
    { fx: 'text', at: 1100, dur: 900, text: '{ah} – {dh}', size: 48 },
  ]),
  disparo: clip('A distancia: ráfaga de proyectiles con el color del atacante.', [
    { fx: 'dice', at: 0, dur: 800 },
    { fx: 'projectile', at: 200, dur: 550, from: 'attacker', shape: 'bolt', count: 4, arc: 30 },
    { fx: 'ring', at: 700, dur: 500, who: 'defender', color: 'attacker', radius: 110 },
    { fx: 'shake', at: 700, dur: 300, who: 'defender', amp: 10 },
    { fx: 'projectile', at: 800, dur: 500, from: 'defender', shape: 'orb', count: 2, arc: 50, when: 'attackerLost' },
    { fx: 'casualties', at: 1150, dur: 900 },
    { fx: 'text', at: 1200, dur: 800, text: '{ah} – {dh}', size: 44 },
  ]),
  emboscada: clip('Golpe rápido contra un lugar sin defensa.', [
    { fx: 'lunge', at: 0, dur: 350, who: 'attacker', dist: 110, ease: 'in' },
    { fx: 'ring', at: 300, dur: 450, who: 'node', color: 'attacker', radius: 170 },
    { fx: 'burst', at: 300, dur: 700, who: 'node', color: 'attacker', count: 24, radius: 130 },
    { fx: 'casualties', at: 500, dur: 800 },
    { fx: 'text', at: 500, dur: 900, text: '¡Emboscada!', size: 46, color: 'attacker' },
  ]),
  // ── propios de Carrera Neural (packs/carrera-neural/animations.json en mesa) ──
  benchmark: clip('Los modelos se miden: ráfaga de tokens, dados y el resultado del benchmark.', [
    { fx: 'text', at: 0, dur: 700, text: 'BENCHMARK', size: 40, color: 'attacker' },
    { fx: 'dice', at: 100, dur: 900 },
    { fx: 'lunge', at: 200, dur: 400, who: 'attacker', dist: 50, ease: 'back' },
    { fx: 'projectile', at: 300, dur: 600, from: 'attacker', shape: 'bolt', count: 5, arc: 40 },
    { fx: 'ring', at: 750, dur: 450, who: 'defender', color: 'attacker', radius: 120 },
    { fx: 'shake', at: 750, dur: 350, who: 'defender', amp: 12, when: 'defenderLost' },
    { fx: 'projectile', at: 800, dur: 500, from: 'defender', shape: 'orb', count: 2, arc: 60, when: 'attackerLost' },
    { fx: 'flash', at: 1150, dur: 250, who: 'attacker', color: '#ffffff', when: 'attackerLost' },
    { fx: 'casualties', at: 1200, dur: 900 },
    { fx: 'text', at: 1250, dur: 900, text: '{ah} – {dh}', size: 48 },
  ]),
  trolleo: clip('El Redditor no pelea limpio: lluvia de estrellitas y burla.', [
    { fx: 'dice', at: 0, dur: 800 },
    { fx: 'projectile', at: 150, dur: 700, from: 'attacker', shape: 'star', count: 6, arc: 90, color: 'attacker' },
    { fx: 'burst', at: 650, dur: 600, who: 'defender', color: 'attacker', count: 20 },
    { fx: 'casualties', at: 1000, dur: 900 },
    { fx: 'text', at: 1000, dur: 900, text: 'jaja', size: 52, color: 'attacker', who: 'attacker', when: 'attackerWins' },
    { fx: 'text', at: 1000, dur: 900, text: '{ah} – {dh}', size: 48, when: 'attackerLost' },
  ]),
};

/** Qué clip usa cada pelea: por defecto y según la facción atacante. */
export const BATTLE: { default: string; byAttacker: Partial<Record<FactionId, string>> } = {
  default: 'benchmark',
  byAttacker: { redditor: 'trolleo' },
};

export function battleClip(attacker: FactionId): FxClip {
  return CLIPS[BATTLE.byAttacker[attacker] ?? BATTLE.default] ?? CLIPS.clasico;
}

export function clipDuration(c: FxClip): number {
  return c.steps.reduce((m, s) => Math.max(m, s.at + s.dur), 0);
}

/** Todo lo que perdió un bando: guerreros, estructuras y componentes (nómade). */
export const lossCount = (l: BattleResult['attackerLosses']) => l.warriors + l.structures + (l.items ?? 0);

export function stepApplies(when: FxWhen, b: BattleResult): boolean {
  const aLoss = lossCount(b.attackerLosses);
  const dLoss = lossCount(b.defenderLosses);
  switch (when) {
    case 'always':
      return true;
    case 'attackerWins':
      return dLoss > aLoss;
    case 'defenderWins':
      return aLoss > dLoss;
    case 'draw':
      return aLoss === dLoss;
    case 'undefended':
      return b.defenderWarriors === 0;
    case 'attackerLost':
      return aLoss > 0;
    case 'defenderLost':
      return dLoss > 0;
    case 'noLosses':
      return aLoss + dLoss === 0;
  }
}

export const EASE: Record<FxEase, (p: number) => number> = {
  linear: (p) => p,
  in: (p) => p * p * p,
  out: (p) => 1 - (1 - p) ** 3,
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  back: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
  bounce: (p) => {
    const n = 7.5625;
    const d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  },
};
