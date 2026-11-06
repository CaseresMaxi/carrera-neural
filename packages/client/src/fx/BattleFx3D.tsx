import { useFrame, useThree } from '@react-three/fiber';
import { FACTIONS } from '@sotobosque/engine';
import { useMemo } from 'react';
import * as THREE from 'three';
import { labelTexture } from '../art/textures';
import { EASE, lossCount } from './clips';
import { clamp, colorOf, fxTime, local, OUTRO, playback, pointOf, PX, type Playback } from './director';

/**
 * Efectos de la pelea que no son las piezas: proyectiles, partículas, ondas y textos.
 * Usa un pool fijo de sprites y anillos que se actualizan en cada frame (nada de montar/desmontar).
 */

const POOL = 90;
const RINGS = 4;

// ───────────── texturas dibujadas en canvas (cacheadas por forma y color) ─────────────

const texCache = new Map<string, THREE.Texture>();
function fxTex(kind: 'orb' | 'bolt' | 'arrow' | 'star' | 'spark', color: string): THREE.Texture {
  const key = `${kind}|${color}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.translate(S / 2, S / 2);
  g.lineJoin = 'round';
  g.strokeStyle = '#2b2118';
  g.lineWidth = 5;
  const glow = (r: number, a: number) => {
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a;
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  };
  g.fillStyle = color;
  switch (kind) {
    case 'orb':
      glow(62, 0.55);
      g.beginPath();
      g.arc(0, 0, 26, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath();
      g.arc(-8, -9, 8, 0, Math.PI * 2);
      g.fill();
      break;
    case 'spark':
      glow(60, 0.9);
      g.fillStyle = '#fff8e4';
      g.beginPath();
      g.arc(0, 0, 10, 0, Math.PI * 2);
      g.fill();
      break;
    case 'bolt': {
      glow(60, 0.45);
      const r = 30;
      g.beginPath();
      g.moveTo(-r * 1.9, -r * 0.35);
      g.lineTo(r * 0.2, -r * 0.5);
      g.lineTo(-r * 0.1, -r * 0.1);
      g.lineTo(r * 1.9, 0);
      g.lineTo(-r * 0.2, r * 0.5);
      g.lineTo(0, r * 0.1);
      g.closePath();
      g.fill();
      g.stroke();
      break;
    }
    case 'arrow':
      g.beginPath();
      g.moveTo(-54, 0);
      g.lineTo(30, 0);
      g.stroke();
      g.beginPath();
      g.moveTo(54, 0);
      g.lineTo(22, -16);
      g.lineTo(22, 16);
      g.closePath();
      g.fill();
      g.stroke();
      break;
    case 'star': {
      glow(62, 0.4);
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rr = k % 2 ? 17 : 40;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
      break;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

function hash(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) {
    h ^= x | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}

interface Spr {
  map: THREE.Texture;
  pos: THREE.Vector3;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  additive?: boolean;
}
interface Ring {
  pos: THREE.Vector3;
  r: number;
  color: string;
  opacity: number;
}

function fill(p: Playback, t: number, camera: THREE.Camera, sprites: Spr[], rings: Ring[]) {
  const b = p.battle;
  const screenAngle = (from: THREE.Vector3, to: THREE.Vector3) => {
    const a = from.clone().project(camera);
    const z = to.clone().project(camera);
    return Math.atan2(z.y - a.y, z.x - a.x);
  };
  const vars: Record<string, string | number> = {
    attacker: FACTIONS[b.attacker].short,
    defender: FACTIONS[b.defender].short,
    ah: b.attackerHits,
    dh: b.defenderHits,
    aLoss: lossCount(b.attackerLosses),
    dLoss: lossCount(b.defenderLosses),
    node: '',
  };
  const label = (text: string, color: string, size: number, pos: THREE.Vector3, opacity: number, scale: number) => {
    const w = Math.max(160, Math.round(text.length * size * 0.62 + 50));
    const h = Math.round(size * 1.7);
    sprites.push({ map: labelTexture(text, { w, h, size, fg: color }), pos, w: w * 0.0042 * scale, h: h * 0.0042 * scale, rot: 0, opacity });
  };

  p.steps.forEach((s, i) => {
    const l = local(s, t);
    const raw = clamp(l);
    const active = l >= 0 && l <= 1;
    switch (s.fx) {
      case 'projectile': {
        const to = s.from === 'attacker' ? 'defender' : 'attacker';
        const a = pointOf(p, s.from);
        const z = pointOf(p, to);
        const fly = s.dur * 0.6;
        const stagger = s.count > 1 ? (s.dur - fly) / (s.count - 1) : 0;
        const tex = fxTex(s.shape, colorOf(p, s.color));
        for (let k = 0; k < s.count; k++) {
          const q = (t - s.at - k * stagger) / fly;
          if (q < 0 || q > 1) continue;
          const e = EASE[s.ease](q);
          const jx = (hash(b.seq, i, k) - 0.5) * 0.35;
          const jz = (hash(b.seq, i, k, 5) - 0.5) * 0.35;
          const mid = a.clone().lerp(z, 0.5).add(new THREE.Vector3(jx, s.arc * PX * 2 + 0.2, jz));
          const pos = new THREE.Vector3()
            .addScaledVector(a, (1 - e) ** 2)
            .addScaledVector(mid, 2 * (1 - e) * e)
            .addScaledVector(z, e * e);
          const ahead = new THREE.Vector3()
            .addScaledVector(a, (1 - e - 0.02) ** 2)
            .addScaledVector(mid, 2 * (1 - e - 0.02) * (e + 0.02))
            .addScaledVector(z, (e + 0.02) ** 2);
          const size = s.size * PX * 2.4;
          const rot = s.shape === 'star' ? q * Math.PI * 4 : s.shape === 'orb' ? 0 : screenAngle(pos, ahead);
          sprites.push({ map: tex, pos, w: size * (s.shape === 'bolt' || s.shape === 'arrow' ? 1.6 : 1), h: size * (s.shape === 'bolt' || s.shape === 'arrow' ? 1.6 : 1), rot, opacity: q > 0.92 ? (1 - q) / 0.08 : 1 });
          // estela
          if (s.shape !== 'arrow')
            for (let j = 1; j <= 3; j++) {
              const back = new THREE.Vector3()
                .addScaledVector(a, (1 - e + j * 0.04) ** 2)
                .addScaledVector(mid, 2 * (1 - e + j * 0.04) * Math.max(0, e - j * 0.04))
                .addScaledVector(z, Math.max(0, e - j * 0.04) ** 2);
              sprites.push({ map: fxTex('spark', colorOf(p, s.color)), pos: back, w: size * (0.7 - j * 0.15), h: size * (0.7 - j * 0.15), rot: 0, opacity: 0.6 - j * 0.15, additive: true });
            }
        }
        break;
      }
      case 'burst': {
        if (!active) break;
        const c = pointOf(p, s.who, 0.5);
        const e = EASE.out(raw);
        const tex = fxTex('spark', colorOf(p, s.color));
        for (let k = 0; k < s.count; k++) {
          const ang = hash(b.seq, i, k, 1) * Math.PI * 2;
          const up = 0.3 + hash(b.seq, i, k, 4) * 0.9;
          const dist = s.radius * PX * (0.5 + hash(b.seq, i, k, 2));
          const pos = c.clone().add(new THREE.Vector3(Math.cos(ang) * dist * e, up * dist * e - 0.9 * raw * raw, Math.sin(ang) * dist * e));
          const sz = (0.12 + 0.14 * hash(b.seq, i, k, 3)) * (1 - raw * 0.6);
          sprites.push({ map: tex, pos, w: sz, h: sz, rot: 0, opacity: 1 - raw, additive: true });
        }
        break;
      }
      case 'ring': {
        if (!active) break;
        const c = pointOf(p, s.who, 0);
        c.y += 0.02;
        rings.push({ pos: c, r: Math.max(0.01, s.radius * PX * 1.4 * EASE.out(raw)), color: colorOf(p, s.color), opacity: 1 - raw });
        break;
      }
      case 'casualties': {
        if (!active) break;
        for (const side of ['attacker', 'defender'] as const) {
          const n = lossCount(side === 'attacker' ? b.attackerLosses : b.defenderLosses);
          if (!n) continue;
          label(`-${n}`, '#b0281c', 52, pointOf(p, side, 1.05 + 0.3 * EASE.out(raw)), raw < 0.8 ? 1 : (1 - raw) / 0.2, 0.7 + 0.3 * EASE.back(clamp(raw * 3)));
        }
        break;
      }
      case 'text': {
        if (!active) break;
        const txt = s.text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
        // el texto del claro va adelante (hacia la cámara) para no tapar los "-N" de cada bando
        const pos = s.who === 'node' ? pointOf(p, 'node', 0.95).add(new THREE.Vector3(0, 0, 0.85)) : pointOf(p, s.who, 1.2);
        label(txt, colorOf(p, s.color), s.size, pos, raw < 0.15 ? raw / 0.15 : raw > 0.8 ? (1 - raw) / 0.2 : 1, EASE.back(clamp(raw / 0.3)));
        break;
      }
    }
  });
  // fundido final
  const end = p.end - OUTRO;
  if (t > end) for (const s of sprites) s.opacity *= clamp(1 - (t - end) / OUTRO);
}

export function BattleFx3D() {
  const camera = useThree((s) => s.camera);
  const { group, pool, rings } = useMemo(() => {
    const group = new THREE.Group();
    const pool = Array.from({ length: POOL }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
      s.renderOrder = 12;
      s.visible = false;
      group.add(s);
      return s;
    });
    const ringGeo = new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2);
    const rings = Array.from({ length: RINGS }, () => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 5;
      m.visible = false;
      group.add(m);
      return m;
    });
    return { group, pool, rings };
  }, []);

  useFrame(() => {
    const p = playback();
    const sprites: Spr[] = [];
    const rs: Ring[] = [];
    if (p) fill(p, fxTime(p), camera, sprites, rs);
    pool.forEach((s, k) => {
      const d = sprites[k];
      if (!d) return void (s.visible = false);
      const m = s.material;
      if (m.map !== d.map) (m.map = d.map), (m.needsUpdate = true);
      const blend = d.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      if (m.blending !== blend) (m.blending = blend), (m.needsUpdate = true);
      m.opacity = d.opacity;
      m.rotation = d.rot;
      s.position.copy(d.pos);
      s.scale.set(d.w, d.h, 1);
      s.visible = d.opacity > 0.01;
    });
    rings.forEach((r, k) => {
      const d = rs[k];
      if (!d) return void (r.visible = false);
      r.position.copy(d.pos);
      r.scale.setScalar(d.r);
      (r.material as THREE.MeshBasicMaterial).color.set(d.color);
      (r.material as THREE.MeshBasicMaterial).opacity = d.opacity * 0.9;
      r.visible = true;
    });
  });

  return <primitive object={group} />;
}
