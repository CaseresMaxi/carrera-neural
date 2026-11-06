import { useFrame } from '@react-three/fiber';
import { FACTIONS, GLADES, type BattleResult, type FactionId } from '@sotobosque/engine';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGame } from '../store';
import { BOARD_TOP } from './Board';
import { labelTexture, tex } from '../art/textures';
import { playback } from '../fx/director';

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Orden de materiales de BoxGeometry: +x, -x, +y, -y, +z, -z
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
// Rotación que deja la cara `v` mirando hacia arriba (+y).
const FACE_UP: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
};
const DIE = 0.34;
const geo = new THREE.BoxGeometry(DIE, DIE, DIE);

function Die({ value, faction, pos, delay, rate = 1.1 }: { value: number; faction: FactionId; pos: THREE.Vector3; delay: number; rate?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mats = useMemo(
    () => FACE_VALUES.map((v) => new THREE.MeshBasicMaterial({ map: tex(`die-${faction}-${v}`) })),
    [faction],
  );
  const target = useMemo(() => {
    const yaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0));
    return yaw.multiply(new THREE.Quaternion().setFromEuler(FACE_UP[value]));
  }, [value]);
  const spin = useMemo(() => new THREE.Vector3(Math.random() * 14 + 6, Math.random() * 10, Math.random() * 14 + 6), []);
  const t = useRef(reducedMotion ? 1 : -delay);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    t.current = Math.min(1, t.current + dt * rate);
    const k = Math.max(0, t.current);
    if (k >= 1) {
      m.quaternion.copy(target);
      m.position.copy(pos);
      return;
    }
    const e = 1 - Math.pow(1 - k, 3);
    const bounce = Math.abs(Math.sin(e * Math.PI * 2.5)) * (1 - e) * 1.4;
    m.position.set(pos.x - (1 - e) * 1.5, pos.y + bounce + (1 - e) * 0.6, pos.z + (1 - e) * 0.4);
    const free = new THREE.Quaternion().setFromEuler(new THREE.Euler(spin.x * (1 - e), spin.y * (1 - e), spin.z * (1 - e)));
    m.quaternion.copy(free).slerp(target, e);
  });

  return <mesh ref={ref} geometry={geo} material={mats} position={pos} />;
}

function HitsLabel({ text, pos, seq }: { text: string; pos: THREE.Vector3; seq: number }) {
  const t = useMemo(() => labelTexture(text, { w: 520, h: 84, size: 46 }), [text]);
  const ref = useRef<THREE.Sprite>(null);
  // mientras corre la animación de la pelea, el resultado lo cuenta el clip; el cartel queda al final
  useFrame(() => {
    if (ref.current) ref.current.visible = playback()?.battle.seq !== seq;
  });
  return (
    <sprite ref={ref} position={pos} scale={[2.3, 0.37, 1]} renderOrder={11}>
      <spriteMaterial map={t} depthTest={false} transparent />
    </sprite>
  );
}

export function DiceTray() {
  const battle = useGame((s) => s.view?.lastBattle ?? null);
  const [shown, setShown] = useState<BattleResult | null>(null);
  const firstSeq = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    // No animar la batalla que ya estaba al cargar la vista.
    if (firstSeq.current === undefined) {
      firstSeq.current = battle?.seq ?? null;
      return;
    }
    if (!battle || battle.seq === shown?.seq) return;
    setShown(battle);
    const id = window.setTimeout(() => setShown((b) => (b?.seq === battle.seq ? null : b)), 10000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.seq]);

  if (!shown) return null;
  // si hay una animación de pelea, los dados entran cuando lo dice el clip (paso "dice")
  const p = playback();
  const step = p && p.battle.seq === shown.seq ? p.steps.find((s) => s.fx === 'dice') : undefined;
  const d0 = step ? step.at / 1000 : 0;
  const rate = step ? 1000 / (step.dur * 0.8) : 1.1;
  const g = GLADES[shown.glade];
  const base = new THREE.Vector3(g.x, BOARD_TOP + DIE / 2 + 0.08, g.z + 1.55);
  return (
    <group key={shown.seq}>
      {shown.attackerRolls.map((v, i) => (
        <Die key={`a${i}`} value={v} faction={shown.attacker} pos={base.clone().add(new THREE.Vector3(-0.95 + i * 0.36, 0, 0))} delay={d0 + i * 0.08} rate={rate} />
      ))}
      {shown.defenderRolls.map((v, i) => (
        <Die key={`d${i}`} value={v} faction={shown.defender} pos={base.clone().add(new THREE.Vector3(0.35 + i * 0.36, 0, 0))} delay={d0 + 0.15 + i * 0.08} rate={rate} />
      ))}
      <HitsLabel
        text={`${FACTIONS[shown.attacker].short} ${shown.attackerHits} ⚔ ${shown.defenderHits} ${FACTIONS[shown.defender].short}`}
        pos={base.clone().add(new THREE.Vector3(0, 0.75, 0))}
        seq={shown.seq}
      />
    </group>
  );
}
