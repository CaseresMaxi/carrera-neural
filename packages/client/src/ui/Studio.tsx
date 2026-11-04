import { useEffect, useMemo, useState } from 'react';
import { ASSETS, type Asset, type Category } from '../art/catalog';
import { loadArtFonts } from '../art/ink';
import { cachedSvg, rasterize } from '../art/textures';

const ORDER: Category[] = ['Personajes', 'Cartas de empresa', 'Emblemas', 'Estructuras', 'Ciudad', 'Recursos', 'Cartas', 'Dados', 'Tablero', 'Interfaz'];

function download(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function AssetTile({ a, onOpen }: { a: Asset; onOpen: () => void }) {
  const svg = cachedSvg(a.id);
  const big = a.category === 'Tablero';
  return (
    <figure className={`asset ${big ? 'big' : ''}`}>
      <button className="asset-art" onClick={onOpen} title="Ver en grande" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>
        <b>{a.name}</b>
        <small>
          {a.id} · {a.w}×{a.h}
          {a.note ? ` · ${a.note}` : ''}
        </small>
      </figcaption>
    </figure>
  );
}

export function Studio({ onClose }: { onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const [cat, setCat] = useState<Category | 'Todo'>('Todo');
  const [open, setOpen] = useState<Asset | null>(null);
  useEffect(() => {
    loadArtFonts().then(() => setReady(true));
  }, []);
  const groups = useMemo(() => ORDER.filter((c) => cat === 'Todo' || c === cat).map((c) => [c, ASSETS.filter((a) => a.category === c)] as const), [cat]);

  return (
    <div className="studio">
      <header className="studio-head">
        <h1>Estudio de arte</h1>
        <p>
          Todos los assets del juego, dibujados a mano en código (tinta rough.js + acuarela + papel). La escena 3D usa exactamente estos
          dibujos como texturas. {ASSETS.length} piezas.
        </p>
        <nav>
          {(['Todo', ...ORDER] as const).map((c) => (
            <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
          <button onClick={onClose}>← Volver</button>
        </nav>
      </header>
      {!ready ? (
        <p className="studio-loading">Mojando los pinceles…</p>
      ) : (
        groups.map(([c, list]) => (
          <section key={c}>
            <h2>{c}</h2>
            <div className="asset-grid">
              {list.map((a) => (
                <AssetTile key={a.id} a={a} onOpen={() => setOpen(a)} />
              ))}
            </div>
          </section>
        ))
      )}
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="studio-zoom" onClick={(e) => e.stopPropagation()}>
            <div className="zoom-art" dangerouslySetInnerHTML={{ __html: cachedSvg(open.id) }} />
            <div className="row">
              <b>{open.name}</b>
              <span className="fineprint">{open.id}</span>
              <button onClick={() => download(`${open.id}.svg`, new Blob([cachedSvg(open.id)], { type: 'image/svg+xml' }))}>Descargar SVG</button>
              <button
                onClick={async () => {
                  const k = open.w > 1000 ? 1 : 2;
                  const c = await rasterize(cachedSvg(open.id), open.w * k, open.h * k);
                  c.toBlob((b) => b && download(`${open.id}.png`, b));
                }}
              >
                Descargar PNG
              </button>
              <button onClick={() => setOpen(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
