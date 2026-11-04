import { CameraControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { GLADES } from '@sotobosque/engine';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { preloadArt } from '../art/textures';
import { useGame } from '../store';
import { BoardBase, Forest, Glades, ScoreTrack, Table } from './Board';
import { DiceTray } from './Dice';
import { PiecesLayer } from './Pieces';

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME: [number, number, number, number, number, number] = [0, 13.5, 14.5, 0, 0, 0.8];

/** En pantallas angostas (celular vertical) alejamos la cámara para que entre el tablero a lo ancho. */
function zoomFor(aspect: number): number {
  return aspect >= 1.25 ? 1 : Math.min(2.4, 1.4 / aspect);
}
function homeFor(aspect: number): typeof HOME {
  const k = zoomFor(aspect);
  return [HOME[0], HOME[1] * k, HOME[2] * k, HOME[3], HOME[4], HOME[5]];
}

function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const topDown = useGame((s) => s.topDown);
  const focusGlade = useGame((s) => s.focusGlade);
  const battleSeq = useGame((s) => s.view?.lastBattle?.seq);
  const battleGlade = useGame((s) => s.view?.lastBattle?.glade);
  const first = useRef(true);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const zoom = Math.round(zoomFor(aspect) * 10) / 10;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-10, -1, -8), new THREE.Vector3(10, 3, 9)));
    c.minDistance = 3.5;
    c.maxDistance = 48;
    c.maxPolarAngle = 1.32;
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (topDown) void c.setLookAt(0, 22 * zoom, 0.8, 0, 0, 0.6, !reducedMotion);
    else void c.setLookAt(...homeFor(zoom === 1 ? 2 : 1.4 / zoom), !reducedMotion);
  }, [topDown, zoom]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !focusGlade) return;
    const g = GLADES[focusGlade.id];
    const k = Math.min(1.6, zoom);
    void c.setLookAt(g.x, 4.2 * k, g.z + 4.6 * k, g.x, 0.3, g.z, !reducedMotion);
  }, [focusGlade]);

  // Corte de cámara corto a la batalla.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const c = ref.current;
    if (!c || battleGlade === undefined || reducedMotion || useGame.getState().topDown) return;
    const g = GLADES[battleGlade];
    void c.setLookAt(g.x, 4.6, g.z + 5.6, g.x, 0.3, g.z + 0.8, true);
  }, [battleSeq, battleGlade]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.35} />;
}

function DebugExpose() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera });
  return null;
}

export function Scene() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    preloadArt((k) => alive && setProgress(k)).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!ready)
    return (
      <div className="art-loading">
        <p>Pintando el bosque…</p>
        <div className="bar">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    );

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [HOME[0], HOME[1], HOME[2]], fov: 40, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      onPointerMissed={() => useGame.getState().ui.action === null && useGame.getState().setUi({ glade: null })}
    >
      <color attach="background" args={['#2a1f15']} />
      <fog attach="fog" args={['#2a1f15', 28, 60]} />
      <Table />
      <BoardBase />
      <Glades />
      <Forest />
      <PiecesLayer />
      <DiceTray />
      <ScoreTrack />
      <CameraRig />
      <DebugExpose />
    </Canvas>
  );
}
