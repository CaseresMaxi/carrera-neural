import { useFrame } from '@react-three/fiber';
import { FACTIONS, GLADES, type FactionId, type GameView } from '@sotobosque/engine';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { slotOffsets } from '../art/board';
import { CHAR_H, CHAR_W } from '../art/characters';
import { blobShadowTexture, labelTexture, tex } from '../art/textures';
import { useGame } from '../store';
import { BOARD_TOP, faceCamera } from './Board';

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface PieceSpec {
  key: string;
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
      pieces.push({ key: `${g.id}:b${i}:${b.faction}`, faction: b.faction, type: 'b', kind: b.kind, pos: base.clone().add(new THREE.Vector3(x, 0, z)), phase: 0 });
    });
    g.tokens.forEach((t, i) => {
      const [x, z] = TOKEN_SPOTS[i % TOKEN_SPOTS.length];
      pieces.push({ key: `${g.id}:t${i}:${t.faction}`, faction: t.faction, type: 't', kind: t.kind, pos: base.clone().add(new THREE.Vector3(x, 0, z)), phase: i });
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

interface LayoutResult {
  pieces: PieceSpec[];
  badges: BadgeSpec[];
  origins: Map<string, THREE.Vector3>;
}

function computeLayout(view: GameView | null, prev: Map<string, PieceSpec>): LayoutResult {
  if (!view) return { pieces: [], badges: [], origins: new Map() };
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
  return { pieces, badges, origins };
}

export function PiecesLayer() {
  const view = useGame((s) => s.view);
  // Caché por identidad de `view` (idempotente aunque StrictMode renderice dos veces).
  const cache = useRef<{ view: GameView | null; map: Map<string, PieceSpec>; result: LayoutResult } | null>(null);
  if (!cache.current || cache.current.view !== view) {
    const prevMap = cache.current?.map ?? new Map<string, PieceSpec>();
    const result = computeLayout(view, prevMap);
    cache.current = { view, map: new Map(result.pieces.map((p) => [p.key, p])), result };
  }
  const { pieces, badges, origins } = cache.current.result;
  return (
    <group>
      {pieces.map((p) => (
        <Piece key={p.key} spec={p} origin={origins.get(p.key) ?? null} />
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

function Piece({ spec, origin }: { spec: PieceSpec; origin: THREE.Vector3 | null }) {
  const ref = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const anim = useRef({ t: reducedMotion ? 1 : 0, from: origin?.clone() ?? null });

  useFrame(({ camera, clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    if (card.current) {
      faceCamera(card.current, camera);
      if (!reducedMotion) card.current.rotation.z = Math.sin(clock.elapsedTime * 1.6 + spec.phase) * 0.035;
    }
    if (glow.current) glow.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3 + spec.phase) * 0.12);
    const a = anim.current;
    if (a.t >= 1) {
      g.position.lerp(spec.pos, Math.min(1, dt * 8));
      g.scale.setScalar(1);
      return;
    }
    a.t = Math.min(1, a.t + dt * (a.from ? 1.6 : 3));
    const e = 1 - Math.pow(1 - a.t, 3);
    if (a.from) {
      g.position.lerpVectors(a.from, spec.pos, e);
      g.position.y += Math.sin(Math.PI * e) * 0.9;
      g.scale.setScalar(1);
    } else {
      g.position.copy(spec.pos);
      g.scale.setScalar(0.001 + e * (1 + Math.sin(Math.PI * e) * 0.25));
    }
  });

  return (
    <group ref={ref} position={origin ?? spec.pos} scale={reducedMotion || origin ? 1 : 0.001}>
      {spec.type === 'w' ? (
        <>
          <mesh geometry={shadowGeo} material={shadowMat()} renderOrder={1} />
          <mesh geometry={baseGeo} material={baseMat(spec.faction)} />
          <group ref={card}>
            <mesh geometry={standeeGeo} material={charMat(spec.faction)} />
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

function Badge({ spec }: { spec: BadgeSpec }) {
  const t = useMemo(() => labelTexture(spec.text), [spec.text]);
  return (
    <sprite position={spec.pos} scale={[0.46, 0.21, 1]} renderOrder={10}>
      <spriteMaterial map={t} depthTest={false} transparent />
    </sprite>
  );
}
