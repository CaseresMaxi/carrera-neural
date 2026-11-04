import rough from 'roughjs';
import type { Drawable, Options } from 'roughjs/bin/core';
import caveatUrl from '@fontsource/caveat/files/caveat-latin-700-normal.woff2?url';
import patrickUrl from '@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2?url';

/**
 * Kit de ilustración "a mano": rough.js para el trazo tembloroso de tinta,
 * un filtro de desplazamiento para que los rellenos parezcan acuarela y
 * un grano de papel encima. Todo es SVG determinista (semillado).
 */

export const INK = '#2b2118';
export const PAPER = '#f4ead2';
export const PARCHMENT = '#ecdcb4';

const gen = rough.generator();

export interface Style {
  fill?: string;
  stroke?: string;
  sw?: number;
  rough?: number;
  bow?: number;
  /** Color del sombreado con trama (hachure). */
  hachure?: string;
  gap?: number;
  angle?: number;
  hw?: number;
  opacity?: number;
  /** Sin doble trazo (líneas finas / detalles). */
  single?: boolean;
  /** Relleno sin efecto acuarela. */
  flat?: boolean;
}

export class Pen {
  private parts: string[] = [];
  constructor(private seed = 1) {}

  private base(s: Style): Options {
    return {
      seed: (this.seed = (this.seed * 48271) % 2147483647),
      roughness: s.rough ?? 1.1,
      bowing: s.bow ?? 1,
      disableMultiStroke: s.single ?? false,
      preserveVertices: false,
    };
  }

  private emit(d: Drawable, s: Style, kind: 'fill' | 'hatch' | 'stroke') {
    const op = s.opacity !== undefined ? ` opacity="${s.opacity}"` : '';
    for (const p of gen.toPaths(d)) {
      const fill = p.fill && p.fill !== 'none' ? p.fill : 'none';
      const attrs = `d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"`;
      if (kind === 'fill' && !s.flat) this.parts.push(`<path ${attrs} filter="url(#wc)"${op}/>`);
      else this.parts.push(`<path ${attrs}${op}/>`);
    }
  }

  private draw(make: (o: Options) => Drawable, s: Style) {
    if (s.fill) this.emit(make({ ...this.base(s), stroke: 'none', fill: s.fill, fillStyle: 'solid' }), s, 'fill');
    if (s.hachure)
      this.emit(
        make({
          ...this.base(s),
          stroke: 'none',
          fill: s.hachure,
          fillStyle: 'hachure',
          hachureGap: s.gap ?? 7,
          hachureAngle: s.angle ?? -41,
          fillWeight: s.hw ?? 1.3,
        }),
        { ...s, opacity: s.opacity ?? 0.55 },
        'hatch',
      );
    if (s.stroke !== 'none') this.emit(make({ ...this.base(s), stroke: s.stroke ?? INK, strokeWidth: s.sw ?? 2.4 }), s, 'stroke');
  }

  ellipse(cx: number, cy: number, w: number, h: number, s: Style = {}) {
    this.draw((o) => gen.ellipse(cx, cy, w, h, o), s);
    return this;
  }
  circle(cx: number, cy: number, d: number, s: Style = {}) {
    this.draw((o) => gen.circle(cx, cy, d, o), s);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, s: Style = {}) {
    this.draw((o) => gen.rectangle(x, y, w, h, o), s);
    return this;
  }
  path(d: string, s: Style = {}) {
    this.draw((o) => gen.path(d, o), s);
    return this;
  }
  poly(points: [number, number][], s: Style = {}) {
    this.draw((o) => gen.polygon(points, o), s);
    return this;
  }
  line(x1: number, y1: number, x2: number, y2: number, s: Style = {}) {
    this.draw((o) => gen.line(x1, y1, x2, y2, o), { ...s, fill: undefined });
    return this;
  }
  curve(points: [number, number][], s: Style = {}) {
    this.draw((o) => gen.curve(points, o), { ...s, fill: undefined });
    return this;
  }
  /** Mancha de acuarela sin contorno. */
  wash(d: string, color: string, opacity = 0.5) {
    this.parts.push(`<path d="${d}" fill="${color}" opacity="${opacity}" filter="url(#wc2)"/>`);
    return this;
  }
  washEllipse(cx: number, cy: number, rx: number, ry: number, color: string, opacity = 0.5) {
    this.parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" filter="url(#wc2)"/>`);
    return this;
  }
  text(x: number, y: number, t: string, o: { size?: number; font?: 'title' | 'hand'; anchor?: 'start' | 'middle' | 'end'; color?: string; rotate?: number } = {}) {
    const fam = o.font === 'hand' ? "'Patrick Hand', 'Comic Sans MS', cursive" : "'Caveat', 'Comic Sans MS', cursive";
    const rot = o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : '';
    this.parts.push(
      `<text x="${x}" y="${y}" font-family="${fam}" font-weight="${o.font === 'hand' ? 400 : 700}" font-size="${o.size ?? 28}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? 'middle'}"${rot}>${escapeXml(t)}</text>`,
    );
    return this;
  }
  raw(svg: string) {
    this.parts.push(svg);
    return this;
  }
  g(transform: string, fn: (p: Pen) => void) {
    this.parts.push(`<g transform="${transform}">`);
    fn(this);
    this.parts.push('</g>');
    return this;
  }
  toString() {
    return this.parts.join('');
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
}

// ───────────────────────── documento SVG ─────────────────────────

let fontCss = '';

/** Embebe las tipografías como data-URI para que el SVG rasterizado (en <img>) las use. */
export async function loadArtFonts() {
  if (fontCss) return;
  const toData = async (url: string) => {
    const buf = await (await fetch(url)).arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:font/woff2;base64,${btoa(bin)}`;
  };
  const [c, p] = await Promise.all([toData(caveatUrl), toData(patrickUrl)]);
  fontCss =
    `@font-face{font-family:'Caveat';font-weight:700;src:url(${c}) format('woff2');}` +
    `@font-face{font-family:'Patrick Hand';font-weight:400;src:url(${p}) format('woff2');}`;
}

const DEFS = `
<filter id="wc" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="2" result="t2"/>
  <feColorMatrix in="t2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.25" result="m"/>
  <feComposite in="d" in2="m" operator="arithmetic" k1="0" k2="0.82" k3="0.18" k4="0" result="v"/>
  <feComposite in="v" in2="d" operator="in"/>
</filter>
<filter id="wc2" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="4" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="14" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="1.2"/>
</filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 -1.4 0.82" result="na"/>
  <feComposite in="na" in2="SourceGraphic" operator="in" result="g"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge>
</filter>`;

export function svgDoc(w: number, h: number, body: string, opts: { viewBox?: string; grain?: boolean } = {}) {
  const vb = opts.viewBox ?? `0 0 ${w} ${h}`;
  const grain = opts.grain ?? true;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">` +
    `<defs><style>${fontCss}</style>${DEFS}</defs>` +
    (grain ? `<g filter="url(#grain)">${body}</g>` : body) +
    `</svg>`
  );
}

/** PRNG chico para ubicar detalles de forma determinista. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
