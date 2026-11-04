import { useFrame } from '@react-three/fiber';
import { FACTIONS, GLADES, ruler } from '@sotobosque/engine';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOARD_UNITS_D, BOARD_UNITS_W, GLADE_R_UNITS, isForest } from '../art/board';
import { ASSET_BY_ID } from '../art/catalog';
import { blobShadowTexture, labelTexture, tex } from '../art/textures';
import { useGame } from '../store';
import { useInteraction } from '../ui/interaction';

export const BOARD_W = BOARD_UNITS_W;
export const BOARD_D = BOARD_UNITS_D;
export const BOARD_TOP = 0.12;
export const GLADE_R = GLADE_R_UNITS;

export { slotOffsets as slotPositions } from '../art/board';

const tmpV = new THREE.Vector3();

/** Yaw para que una figura de papel mire a la cámara (sólo rota en Y). */
export function faceCamera(obj: THREE.Object3D, camera: THREE.Camera) {
  obj.getWorldPosition(tmpV);
  obj.rotation.y = Math.atan2(camera.position.x - tmpV.x, camera.position.z - tmpV.z);
}

export function Table() {
  const t = tex('table');
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial map={t} />
    </mesh>
  );
}

export function BoardBase() {
  const mats = useMemo(() => {
    const side = new THREE.MeshBasicMaterial({ color: '#4a3420' });
    const top = new THREE.MeshBasicMaterial({ map: tex('board') });
    return [side, side, top, side, side, side];
  }, []);
  return (
    <mesh position-y={BOARD_TOP / 2} material={mats}>
      <boxGeometry args={[BOARD_W, BOARD_TOP, BOARD_D]} />
    </mesh>
  );
}

// ───────────────────────── ciudad de cartón ─────────────────────────

const STANDEE_KINDS = [
  { id: 'prop-tower', h: 1.35 },
  { id: 'prop-tower2', h: 1.0 },
  { id: 'prop-rack', h: 0.95 },
  { id: 'prop-plant', h: 0.42 },
] as const;

function standeeGeometry(id: string, h: number) {
  const a = ASSET_BY_ID.get(id)!;
  const w = (h * a.w) / a.h;
  return new THREE.PlaneGeometry(w, h).translate(0, h / 2 - 0.02, 0);
}

export function Forest() {
  const layout = useMemo(() => {
    let s = 98765;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const lists: { x: number; z: number; sc: number }[][] = STANDEE_KINDS.map(() => []);
    let total = 0;
    for (let i = 0; i < 4000 && total < 64; i++) {
      const x = (r() - 0.5) * (BOARD_W - 1.4);
      const z = (r() - 0.5) * (BOARD_D - 1.4);
      if (!isForest(x, z, 0.5)) continue;
      // evitar que se amontonen
      if (lists.some((l) => l.some((p) => Math.hypot(p.x - x, p.z - z) < 0.75))) continue;
      const k = r() < 0.32 ? 0 : r() < 0.4 ? 1 : r() < 0.55 ? 2 : 3;
      lists[k].push({ x, z, sc: 0.8 + r() * 0.4 });
      total++;
    }
    return lists;
  }, []);

  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const shadowRef = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(() => STANDEE_KINDS.map((k) => standeeGeometry(k.id, k.h)), []);
  const mats = useMemo(
    () => STANDEE_KINDS.map((k) => new THREE.MeshBasicMaterial({ map: tex(k.id), alphaTest: 0.5, side: THREE.DoubleSide })),
    [],
  );
  const all = layout.flat();
  const shadowGeo = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    all.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, BOARD_TOP + 0.003, p.z + 0.05), new THREE.Quaternion(), new THREE.Vector3(0.9 * p.sc, 1, 0.5 * p.sc));
      shadowRef.current?.setMatrixAt(i, m);
    });
    if (shadowRef.current) shadowRef.current.instanceMatrix.needsUpdate = true;
  }, [all]);

  const lastCam = useRef(new THREE.Vector3(Infinity, 0, 0));
  useFrame(({ camera }) => {
    if (camera.position.distanceToSquared(lastCam.current) < 1e-6) return;
    lastCam.current.copy(camera.position);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    layout.forEach((list, k) => {
      const mesh = refs.current[k];
      if (!mesh) return;
      list.forEach((p, i) => {
        q.setFromAxisAngle(up, Math.atan2(camera.position.x - p.x, camera.position.z - p.z));
        m.compose(new THREE.Vector3(p.x, BOARD_TOP, p.z), q, new THREE.Vector3(p.sc, p.sc, p.sc));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  });

  return (
    <group>
      <instancedMesh ref={shadowRef} args={[shadowGeo, shadowMat, all.length]} renderOrder={1} />
      {layout.map((list, k) => (
        <instancedMesh
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          args={[geos[k], mats[k], list.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

// ───────────────────────── mercados interactivos ─────────────────────────

const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

function Glade({ id }: { id: number }) {
  const def = GLADES[id];
  const view = useGame((s) => s.view);
  const { highlight, selected, onGlade } = useInteraction();
  const focus = useGame((s) => s.focus);
  const [hover, setHover] = useState(false);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const isLegal = highlight.has(id);
  const isSel = selected === id;
  const rule = view ? ruler(view, id) : null;
  const ringTex = tex('ring');

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    ring.current.opacity = isSel ? 1 : isLegal ? 0.45 + pulse * 0.55 : hover ? 0.6 : 0;
  });

  return (
    <group position={[def.x, BOARD_TOP, def.z]}>
      <mesh
        material={hitMat}
        position-y={0.05}
        onClick={(e) => {
          e.stopPropagation();
          onGlade(id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          focus(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        <cylinderGeometry args={[GLADE_R, GLADE_R, 0.1, 32]} />
      </mesh>
      {/* gobierno: anillo garabateado del color de la facción */}
      {rule && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.004} renderOrder={2}>
          <planeGeometry args={[GLADE_R * 2.18, GLADE_R * 2.18]} />
          <meshBasicMaterial map={ringTex} color={FACTIONS[rule].color} transparent depthWrite={false} />
        </mesh>
      )}
      {/* resaltado legal / selección */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.008} renderOrder={3}>
        <planeGeometry args={[GLADE_R * 2.42, GLADE_R * 2.42]} />
        <meshBasicMaterial ref={ring} map={ringTex} color={isSel ? '#2fb4e8' : '#ffc21a'} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Glades() {
  return (
    <group>
      {GLADES.map((g) => (
        <Glade key={g.id} id={g.id} />
      ))}
    </group>
  );
}

// ───────────────────────── pista de puntos ─────────────────────────

export function ScoreTrack() {
  const view = useGame((s) => s.view);
  const cellTex = tex('score-cell');
  const z = BOARD_D / 2 + 0.85;
  const step = 0.8;
  const x0 = -10 * step;
  const markers = view
    ? view.order.map((f, k) => {
        const vp = Math.min(20, view.factions[f]!.vp);
        const stack = view.order.slice(0, k).filter((o) => Math.min(20, view.factions[o]!.vp) === vp).length;
        return { f, vp, stack };
      })
    : [];
  return (
    <group>
      {Array.from({ length: 21 }, (_, i) => (
        <group key={i} position={[x0 + i * step, 0, z]}>
          <mesh rotation-x={-Math.PI / 2} rotation-z={(i % 3) * 0.03 - 0.03}>
            <planeGeometry args={[0.72, 0.72]} />
            <meshBasicMaterial map={cellTex} transparent />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
            <planeGeometry args={[0.5, 0.25]} />
            <meshBasicMaterial map={labelTexture(String(i), { w: 96, h: 48, size: 40, bg: 'rgba(0,0,0,0)' })} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
      {markers.map(({ f, vp, stack }) => (
        <ScoreMarker key={f} faction={f} x={x0 + vp * step} y={0.05 + stack * 0.09} z={z} />
      ))}
    </group>
  );
}

function ScoreMarker({ faction, x, y, z }: { faction: keyof typeof FACTIONS; x: number; y: number; z: number }) {
  const ref = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const side = new THREE.MeshBasicMaterial({ color: FACTIONS[faction].color });
    const top = new THREE.MeshBasicMaterial({ map: tex(`emblem-${faction}`) });
    return [side, top, side];
  }, [faction]);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += (x - g.position.x) * Math.min(1, dt * 6);
    g.position.y += (y - g.position.y) * Math.min(1, dt * 6);
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh material={mats} rotation-y={-Math.PI / 2}>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 28]} />
      </mesh>
    </group>
  );
}
