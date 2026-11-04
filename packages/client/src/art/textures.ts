import * as THREE from 'three';
import { ASSET_BY_ID, ASSETS } from './catalog';
import { loadArtFonts } from './ink';

/** SVG → canvas → THREE.Texture, con caché. Todo se precarga antes de montar la escena. */

const svgCache = new Map<string, string>();
const texCache = new Map<string, THREE.Texture>();

export function cachedSvg(id: string) {
  let s = svgCache.get(id);
  if (!s) svgCache.set(id, (s = ASSET_BY_ID.get(id)!.svg()));
  return s;
}

export async function rasterize(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function makeTexture(id: string, scale = 1) {
  const a = ASSET_BY_ID.get(id)!;
  const c = await rasterize(cachedSvg(id), Math.round(a.w * scale), Math.round(a.h * scale));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (id === 'table') {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
  }
  return t;
}

export function tex(id: string): THREE.Texture {
  const t = texCache.get(id);
  if (!t) throw new Error(`Textura no precargada: ${id}`);
  return t;
}

let loading: Promise<void> | null = null;

/** Precarga todas las texturas de la escena; `onProgress` recibe 0..1. */
export function preloadArt(onProgress?: (k: number) => void) {
  if (!loading) {
    loading = (async () => {
      await loadArtFonts();
      await document.fonts.ready;
      const ids = ASSETS.filter((a) => a.category !== 'Cartas').map((a) => a.id);
      let done = 0;
      // de a tandas para no congelar la UI
      for (let i = 0; i < ids.length; i += 6) {
        await Promise.all(
          ids.slice(i, i + 6).map(async (id) => {
            const scale = id.startsWith('char-') ? 1.5 : id.startsWith('prop-') ? 1.2 : 1;
            texCache.set(id, await makeTexture(id, scale));
            onProgress?.(++done / ids.length);
          }),
        );
      }
    })();
  }
  return loading;
}

/** Etiqueta de texto manuscrita (para badges ×N, etc.). */
const labelCache = new Map<string, THREE.Texture>();
export function labelTexture(text: string, opts: { w?: number; h?: number; size?: number; bg?: string; fg?: string } = {}) {
  const { w = 160, h = 72, size = 46, bg = '#f6ecd2', fg = '#2b2118' } = opts;
  const key = `${text}|${w}|${h}|${size}|${bg}|${fg}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.strokeStyle = '#2b2118';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(10, 8);
  g.quadraticCurveTo(w / 2, 2, w - 10, 10);
  g.quadraticCurveTo(w - 2, h / 2, w - 12, h - 8);
  g.quadraticCurveTo(w / 2, h - 2, 12, h - 10);
  g.quadraticCurveTo(3, h / 2, 10, 8);
  g.fill();
  g.stroke();
  g.fillStyle = fg;
  g.font = `${size}px 'Patrick Hand', cursive`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(key, t);
  return t;
}

export function blobShadowTexture() {
  const key = '__blob';
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(40,28,14,0.55)');
  grad.addColorStop(1, 'rgba(40,28,14,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  labelCache.set(key, t);
  return t;
}
