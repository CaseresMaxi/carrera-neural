import { FACTIONS, GLADES, type BattleResult, type FactionId } from '@sotobosque/engine';
import * as THREE from 'three';
import { BOARD_TOP } from '../scene/Board';
import { battleClip, clipDuration, EASE, stepApplies, type FxClip, type FxColor, type FxSide, type FxStep, type FxWho } from './clips';

/**
 * Director de la pelea en curso: guarda qué pelea se está reproduciendo y, para cualquier instante,
 * calcula dónde va cada bando (embestida, temblor, destello) y cuándo caen las bajas.
 * Es estado de módulo (no de React) porque lo leen los useFrame de muchas piezas en cada frame.
 */

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** px del tablero 2D de mesa → unidades del mundo 3D. */
export const PX = 0.006;
/** Fundido al final del clip (ms). */
export const OUTRO = 350;

export interface Playback {
  battle: BattleResult;
  clip: FxClip;
  steps: FxStep[];
  start: number;
  end: number;
  /** Centro de cada bando en el claro (antes de la pelea) y centro del claro. */
  anchors: Record<FxSide, THREE.Vector3>;
  center: THREE.Vector3;
}

let current: Playback | null = null;
let speed = 1;
const listeners = new Set<() => void>();

export function setFxSpeed(v: number) {
  speed = v;
}

export function startBattle(battle: BattleResult, anchors: Partial<Record<FxSide, THREE.Vector3>>) {
  if (reducedMotion) return;
  const g = GLADES[battle.glade];
  const center = new THREE.Vector3(g.x, BOARD_TOP, g.z);
  const clip = battleClip(battle.attacker);
  const steps = clip.steps.filter((s) => stepApplies(s.when, battle));
  const a = anchors.attacker ?? center.clone().add(new THREE.Vector3(-0.45, 0, -0.3));
  const d = anchors.defender ?? center.clone().add(new THREE.Vector3(0.45, 0, -0.3));
  // si los dos quedaron encima (ej. el defensor no tenía guerreros), separarlos un poco
  if (a.distanceTo(d) < 0.4) d.copy(a).add(new THREE.Vector3(0.6, 0, 0));
  current = { battle, clip, steps, start: performance.now(), end: clipDuration(clip) + OUTRO, anchors: { attacker: a, defender: d }, center };
  listeners.forEach((l) => l());
}

/** La pelea que se está reproduciendo (null si no hay o ya terminó). */
export function playback(): Playback | null {
  if (current && fxTime(current) > current.end) current = null;
  return current;
}

export function onBattleStart(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** ms del clip transcurridos. */
export function fxTime(p: Playback): number {
  return (performance.now() - p.start) * speed;
}

export function sideOf(p: Playback, f: FactionId): FxSide | null {
  return f === p.battle.attacker ? 'attacker' : f === p.battle.defender ? 'defender' : null;
}

export function colorOf(p: Playback, c: FxColor): string {
  if (c === 'attacker') return FACTIONS[p.battle.attacker].color;
  if (c === 'defender') return FACTIONS[p.battle.defender].color;
  return c;
}

/** Punto de un bando (o del claro) a la altura del pecho de las figuras. */
export function pointOf(p: Playback, who: FxWho, y = 0.55): THREE.Vector3 {
  const v = who === 'node' ? p.center.clone() : p.anchors[who].clone();
  v.y += y;
  return v;
}

export const local = (s: FxStep, t: number) => (t - s.at) / s.dur;
export const clamp = (v: number) => Math.max(0, Math.min(1, v));

export interface GroupState {
  offset: THREE.Vector3;
  /** Inclinación (rad) por el temblor. */
  tilt: number;
  /** Destello: color y fuerza 0..1. */
  flash: { color: string; k: number } | null;
}

/** Cómo se mueve un bando en el instante t: embestidas hacia el rival, temblores y destellos. */
export function groupState(p: Playback, side: FxSide, t: number): GroupState {
  const out: GroupState = { offset: new THREE.Vector3(), tilt: 0, flash: null };
  const other: FxSide = side === 'attacker' ? 'defender' : 'attacker';
  const dir = p.anchors[other].clone().sub(p.anchors[side]).setY(0).normalize();
  p.steps.forEach((s, i) => {
    const l = local(s, t);
    if (l < 0 || l > 1) return;
    const raw = clamp(l);
    if (s.fx === 'lunge' && s.who === side) {
      const e = clamp(EASE[s.ease](raw));
      out.offset.addScaledVector(dir, s.dist * PX * Math.sin(Math.PI * e));
      out.offset.y += 0.12 * Math.sin(Math.PI * raw);
    } else if (s.fx === 'shake' && (s.who === side || s.who === 'node')) {
      const k = s.amp * PX * (1 - raw);
      out.offset.x += k * Math.sin(raw * 55 + i);
      out.offset.z += k * 0.6 * Math.cos(raw * 43 + i);
      out.tilt += k * 2.5 * Math.sin(raw * 37);
    } else if (s.fx === 'flash' && (s.who === side || s.who === 'node')) {
      out.flash = { color: colorOf(p, s.color), k: Math.sin(Math.PI * raw) };
    }
  });
  return out;
}

/** Progreso de las bajas: null si todavía no empiezan, 0..1 mientras caen. */
export function deathProgress(p: Playback, t: number): number | null {
  const s = p.steps.find((x) => x.fx === 'casualties');
  if (!s) return t >= 0 ? clamp(t / 400) : null;
  const l = local(s, t);
  return l < 0 ? null : clamp(l);
}

if (import.meta.env.DEV) Object.assign(window, { __fx: { setFxSpeed, playback } });
