import { useFrame } from '@react-three/fiber';
import { FACTIONS, GLADES, type FactionId, type GameView } from '@sotobosque/engine';
import { useMemo, useRef } from 'react';
import { deathProgress, fxTime, groupState, playback, sideOf, startBattle } from '../fx/director';
import * as THREE from 'three';
import { slotOffsets } from '../art/board';
import { CHAR_H, CHAR_W } from '../art/characters';
import { blobShadowTexture, labelTexture, tex } from '../art/textures';
import { useGame } from '../store';
import { BOARD_TOP, faceCamera } from './Board';

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface PieceSpec {
  key: string;
  glade: number;
  faction: FactionId;
  type: 'w' | 'b' | 't';
  kind: string;
  pos: THREE.Vector3;
  phase: number;
}

interface BadgeSpec {
  key: string;
  pos: THREE.Vector3;
  text: string;
}

const CLUSTER: [number, number][] = [
  [0, 0], [0.3, 0.06], [-0.3, 0.06], [0.15, -0.2], [-0.15, -0.2], [0.15, 0.3], [-0.15, 0.3],
];
const ANCHORS: [number, number][][] = [
  [[0, -0.3]],
  [[-0.44, -0.3], [0.44, -0.3]],
  [[-0.5, -0.12], [0.5, -0.12], [0, -0.68]],
  [[-0.52, -0.08], [0.52, -0.08], [-0.26, -0.7], [0.28, -0.7]],
];
const TOKEN_SPOTS: [number, number][] = [[0.82, 0.18], [-0.82, 0.18], [0.72, -0.64], [-0.72, -0.64]];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function layout(view: GameView): { pieces: PieceSpec[]; badges: BadgeSpec[] } {
  const pieces: PieceSpec[] = [];
  const badges: BadgeSpec[] = [];
  for (const g of view.glades) {
    const def = GLADES[g.id];
    const base = new THREE.Vector3(def.x, BOARD_TOP, def.z);
    const slots = slotOffsets(def.slots);
    g.buildings.forEach((b, i) => {
      const [x, z] = slots[i] ?? [0, 0];
      pieces.push({ key: `${g.id}:b${i}:${b.faction}`, glade: g.id, faction: b.faction, type: 'b', kind: b.kind, pos: base.clone().add(new THREE.Vector3(x, 0, z)), phase: 0 });
    });
    g.tokens.forEach((t, i) => {
      const [x, z] = TOKEN_SPOTS[i % TOKEN_SPOTS.length];
      pieces.push({ key: `${g.id}:t${i}:${t.faction}`, glade: g.id, faction: t.faction, type: 't', kind: t.kind, pos: base.clone().add(new THREE.Vector3(x, 0, z)), phase: i });
    });
    const present = view.order.filter((f) => (g.warriors[f] ?? 0) > 0);
    const anchors = ANCHORS[Math.max(0, present.length - 1)];
    present.forEach((f, k) => {
      const n = g.warriors[f]!;
      const [ax, az] = anchors[k];
      const maxShown = present.length === 1 ? 7 : present.length === 2 ? 4 : 2;
      const spread = present.length === 1 ? 1 : 0.8;
      for (let i = 0; i < Math.min(n, maxShown); i++) {
        const [cx, cz] = CLUSTER[i];
        const key = `${g.id}:w:${f}:${i}`;
        pieces.push({
          key,
          glade: g.id,
          faction: f,
          type: 'w',
          kind: 'w',
          pos: base.clone().add(new THREE.Vector3(ax + cx * spread, 0, az + cz * spread)),
          phase: (hash(key) % 628) / 100,
        });
      }
      if (n > 1) badges.push({ key: `${g.id}:${f}`, pos: base.clone().add(new THREE.Vector3(ax, 1.3, az)), text: `×${n}` });
    });
  }
  return { pieces, badges };
}

interface Ghost {
  id: string;
  spec: PieceSpec;
  /** Momento en que la pieza dejó el tablero. */
  born: number;
  /** Seq de la pelea que la mató (si fue en una pelea animada). */
  battle: number | null;
}

interface LayoutResult {
  pieces: PieceSpec[];
  badges: BadgeSpec[];
  origins: Map<string, THREE.Vector3>;
  /** Piezas que acaban de salir del tablero sin ir a otro lado: se animan cayendo. */
  ghosts: Ghost[];
}

/** Centro de las figuras de una facción en un claro (o null si no tiene). */
function anchorOf(pieces: Iterable<PieceSpec>, glade: number, f: FactionId): THREE.Vector3 | null {
  const v = new THREE.Vector3();
  let n = 0;
  for (const p of pieces) if (p.glade === glade && p.faction === f && p.type === 'w') v.add(p.pos), n++;
  if (!n) for (const p of pieces) if (p.glade === glade && p.faction === f) v.add(p.pos), n++;
  return n ? v.divideScalar(n) : null;
}

let ghostSeq = 0;

function computeLayout(view: GameView | null, prev: Map<string, PieceSpec>, prevView: GameView | null, ghosts: Ghost[]): LayoutResult {
  if (!view) return { pieces: [], badges: [], origins: new Map(), ghosts: [] };
  // ¿Pelea nueva? (no se anima la que ya estaba al cargar)
  const b = view.lastBattle;
  const fresh = !!b && !!prevView && b.seq !== prevView.lastBattle?.seq && view.moveCount - b.seq < 2;
  if (fresh) {
    const pv = prev.values();
    const all = [...pv];
    startBattle(b, { attacker: anchorOf(all, b.glade, b.attacker) ?? undefined, defender: anchorOf(all, b.glade, b.defender) ?? undefined });
  }
  const { pieces, badges } = layout(view);
  const now = new Set(pieces.map((p) => p.key));
  // Emparejar piezas que "aparecen" con las que "desaparecen" de la misma facción → animar el viaje.
  const vanished = [...prev.values()].filter((p) => !now.has(p.key));
  const origins = new Map<string, THREE.Vector3>();
  for (const p of pieces) {
    if (prev.has(p.key)) continue;
    const i = vanished.findIndex((v) => v.faction === p.faction && v.type === p.type && v.kind === p.kind);
    if (i >= 0) {
      origins.set(p.key, vanished[i].pos);
      vanished.splice(i, 1);
    }
  }
  const tNow = performance.now();
  const kept = ghosts.filter((g) => tNow - g.born < 6000);
  // sólo si es el siguiente move (no al cargar una partida, reiniciar o deshacer)
  const step = prevView ? view.moveCount - prevView.moveCount : 0;
  if (step >= 1 && step <= 2)
    for (const v of vanished)
    kept.push({ id: `${v.key}#${ghostSeq++}`, spec: v, born: tNow, battle: fresh && v.glade === b!.glade ? b!.seq : null });
  return { pieces, badges, origins, ghosts: kept };
}

export function PiecesLayer() {
  const view = useGame((s) => s.view);
  // Caché por identidad de `view` (idempotente aunque StrictMode renderice dos veces).
  const cache = useRef<{ view: GameView | null; map: Map<string, PieceSpec>; result: LayoutResult } | null>(null);
  if (!cache.current || cache.current.view !== view) {
    const prevMap = cache.current?.map ?? new Map<string, PieceSpec>();
    const result = computeLayout(view, prevMap, cache.current?.view ?? null, cache.current?.result.ghosts ?? []);
    cache.current = { view, map: new Map(result.pieces.map((p) => [p.key, p])), result };
  }
  const { pieces, badges, origins, ghosts } = cache.current.result;
  return (
    <group>
      {pieces.map((p) => (
        <Piece key={p.key} spec={p} origin={origins.get(p.key) ?? null} />
      ))}
      {ghosts.map((g) => (
        <GhostPiece key={g.id} ghost={g} />
      ))}
      {badges.map((b) => (
        <Badge key={b.key} spec={b} />
      ))}
    </group>
  );
}

// ───────────────────────── geometrías / materiales compartidos ─────────────────────────

const STANDEE_H = 1.02;
const standeeGeo = new THREE.PlaneGeometry((STANDEE_H * CHAR_W) / CHAR_H, STANDEE_H).translate(0, STANDEE_H / 2 + 0.035, 0);
const baseGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.04, 20).translate(0, 0.025, 0);
const shadowGeo = new THREE.PlaneGeometry(0.62, 0.32).rotateX(-Math.PI / 2).translate(0, 0.003, 0.03);
const tileGeo = new THREE.BoxGeometry(0.66, 0.05, 0.66).translate(0, 0.025, 0);
const tokenGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 28).translate(0, 0.025, 0);
const glowGeo = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2).translate(0, 0.06, 0);

const matCache = new Map<string, THREE.Material | THREE.Material[]>();
function cachedMat<T extends THREE.Material | THREE.Material[]>(key: string, make: () => T): T {
  let m = matCache.get(key) as T | undefined;
  if (!m) matCache.set(key, (m = make()));
  return m;
}

const shadowMat = () => cachedMat('shadow', () => new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
const charMat = (f: FactionId) =>
  cachedMat(`char:${f}`, () => new THREE.MeshBasicMaterial({ map: tex(`char-${f}`), alphaTest: 0.5, side: THREE.DoubleSide }));
const baseMat = (f: FactionId) => cachedMat(`base:${f}`, () => new THREE.MeshBasicMaterial({ color: FACTIONS[f].color }));
const tileMat = (f: FactionId, kind: string) =>
  cachedMat(`tile:${kind}`, () => {
    const side = new THREE.MeshBasicMaterial({ color: new THREE.Color(FACTIONS[f].color).multiplyScalar(0.7) });
    const top = new THREE.MeshBasicMaterial({ map: tex(`struct-${kind}`) });
    return kind === 'demo' ? [side, top, side] : [side, side, top, side, side, side];
  });
const glowMat = () =>
  cachedMat('glow', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,214,110,0.75)');
    grad.addColorStop(1, 'rgba(255,214,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  });

/** Material del destello (por pieza: su opacidad cambia sólo en las que pelean). */
const flashMat = (f: FactionId) =>
  new THREE.MeshBasicMaterial({ map: tex(`char-${f}`), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** Aplica la pelea en curso a una pieza: devuelve [offset, inclinación, destello] o null si no pelea. */
function battleFx(spec: PieceSpec) {
  const p = playback();
  if (!p || p.battle.glade !== spec.glade) return null;
  const side = sideOf(p, spec.faction);
  const t = fxTime(p);
  if (!side) return { hold: true, t, p, gs: null };
  const gs = groupState(p, side, t);
  // las estructuras no embisten: sólo tiemblan
  if (spec.type !== 'w') gs.offset.set(gs.offset.x * 0.3, 0, gs.offset.z * 0.3);
  return { hold: true, t, p, gs };
}

function Piece({ spec, origin }: { spec: PieceSpec; origin: THREE.Vector3 | null }) {
  const ref = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const anim = useRef({ t: reducedMotion ? 1 : 0, from: origin?.clone() ?? null });
  const base = useRef((origin ?? spec.pos).clone());
  const flash = useMemo(() => (spec.type === 'w' ? flashMat(spec.faction) : null), [spec.type, spec.faction]);

  useFrame(({ camera, clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const fx = battleFx(spec);
    if (card.current) {
      faceCamera(card.current, camera);
      if (!reducedMotion) card.current.rotation.z = Math.sin(clock.elapsedTime * 1.6 + spec.phase) * 0.035 + (fx?.gs?.tilt ?? 0);
    }
    if (glow.current) glow.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3 + spec.phase) * 0.12);
    if (flash) {
      const f = fx?.gs?.flash;
      flash.opacity = f ? f.k : 0;
      if (f) flash.color.set(f.color);
    }
    const a = anim.current;
    const b = base.current;
    if (a.t >= 1) {
      // durante la pelea, las piezas del claro se quedan donde estaban (el reacomodo viene después)
      if (!fx?.hold) b.lerp(spec.pos, Math.min(1, dt * 8));
      g.scale.setScalar(1);
    } else {
      a.t = Math.min(1, a.t + dt * (a.from ? 1.6 : 3));
      const e = 1 - Math.pow(1 - a.t, 3);
      if (a.from) {
        b.lerpVectors(a.from, spec.pos, e);
        b.y += Math.sin(Math.PI * e) * 0.9;
        g.scale.setScalar(1);
      } else {
        b.copy(spec.pos);
        g.scale.setScalar(0.001 + e * (1 + Math.sin(Math.PI * e) * 0.25));
      }
    }
    g.position.copy(b);
    if (fx?.gs) g.position.add(fx.gs.offset);
  });

  return (
    <group ref={ref} position={origin ?? spec.pos} scale={reducedMotion || origin ? 1 : 0.001}>
      {spec.type === 'w' ? (
        <>
          <mesh geometry={shadowGeo} material={shadowMat()} renderOrder={1} />
          <mesh geometry={baseGeo} material={baseMat(spec.faction)} />
          <group ref={card}>
            <mesh geometry={standeeGeo} material={charMat(spec.faction)} />
            {flash && <mesh geometry={standeeGeo} material={flash} renderOrder={3} />}
          </group>
        </>
      ) : (
        <>
          <mesh geometry={spec.kind === 'demo' ? tokenGeo : tileGeo} material={tileMat(spec.faction, spec.kind)} />
          {spec.kind === 'demo' && <mesh ref={glow} geometry={glowGeo} material={glowMat()} renderOrder={4} />}
        </>
      )}
    </group>
  );
}

/**
 * Pieza que salió del tablero (baja en una pelea, edificio destruido, componente usado…).
 * En una pelea animada pelea igual que las demás hasta el paso "casualties" y ahí cae;
 * fuera de una pelea, cae enseguida.
 */
function GhostPiece({ ghost }: { ghost: Ghost }) {
  const { spec } = ghost;
  const ref = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const done = useRef(reducedMotion);
  const mats = useMemo(() => {
    const fade = <T extends THREE.Material>(m: T) => {
      const c = m.clone() as T;
      c.transparent = true;
      c.depthWrite = false;
      return c;
    };
    if (spec.type === 'w') return { char: fade(charMat(spec.faction)), base: fade(baseMat(spec.faction)), shadow: fade(shadowMat()), flash: flashMat(spec.faction) };
    const tile = tileMat(spec.faction, spec.kind);
    return { tile: (Array.isArray(tile) ? tile : [tile]).map(fade) };
  }, [spec]);
  const all = useMemo(() => Object.values(mats).flat() as THREE.Material[], [mats]);
  const dir = useMemo(() => (Math.random() < 0.5 ? -1 : 1), []);

  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g || done.current) {
      if (g) g.visible = false;
      return;
    }
    const p = playback();
    let k: number | null; // progreso de la caída
    let off: THREE.Vector3 | null = null;
    if (p && ghost.battle === p.battle.seq) {
      const t = fxTime(p);
      k = deathProgress(p, t);
      const side = sideOf(p, spec.faction);
      if (side && spec.type === 'w') {
        const gs = groupState(p, side, t);
        off = gs.offset;
        if ('flash' in mats && mats.flash) {
          mats.flash.opacity = gs.flash?.k ?? 0;
          if (gs.flash) mats.flash.color.set(gs.flash.color);
        }
      }
    } else k = Math.min(1, (performance.now() - ghost.born) / 650);
    if (card.current) faceCamera(card.current, camera);
    g.position.copy(spec.pos);
    if (off) g.position.add(off);
    if (k === null) return;
    if (k >= 1) {
      done.current = true;
      g.visible = false;
      return;
    }
    const e = 1 - Math.pow(1 - k, 2);
    const op = 1 - Math.max(0, (k - 0.35) / 0.65);
    for (const m of all) m.opacity = op * ((m as THREE.MeshBasicMaterial).userData.base ?? 1);
    if (spec.type === 'w') {
      // se cae de costado, rebota un poco y se hunde
      if (card.current) card.current.rotation.z = dir * EASE_FALL(k) * 1.45;
      g.position.y += Math.sin(Math.min(1, k * 2.2) * Math.PI) * 0.18 - Math.max(0, k - 0.6) * 0.5;
      g.position.x += dir * e * 0.18;
    } else {
      g.scale.setScalar(1 - e * 0.6);
      g.position.y -= e * 0.12;
      g.rotation.y = e * 0.8 * dir;
    }
  });

  return (
    <group ref={ref} position={spec.pos}>
      {'char' in mats ? (
        <>
          <mesh geometry={shadowGeo} material={mats.shadow} renderOrder={1} />
          <mesh geometry={baseGeo} material={mats.base} />
          <group ref={card}>
            {/* el pivote abajo: la figura cae sobre su base */}
            <mesh geometry={standeeGeo} material={mats.char} />
            <mesh geometry={standeeGeo} material={mats.flash} renderOrder={3} />
          </group>
        </>
      ) : (
        <mesh geometry={spec.kind === 'demo' ? tokenGeo : tileGeo} material={mats.tile} />
      )}
    </group>
  );
}

/** Caída con un rebote al tocar el piso. */
function EASE_FALL(k: number) {
  const x = Math.min(1, k * 1.6);
  return x < 0.75 ? (x / 0.75) ** 2 : 1 - Math.sin(((x - 0.75) / 0.25) * Math.PI) * 0.12;
}

function Badge({ spec }: { spec: BadgeSpec }) {
  const t = useMemo(() => labelTexture(spec.text), [spec.text]);
  return (
    <sprite position={spec.pos} scale={[0.46, 0.21, 1]} renderOrder={10}>
      <spriteMaterial map={t} depthTest={false} transparent />
    </sprite>
  );
}
