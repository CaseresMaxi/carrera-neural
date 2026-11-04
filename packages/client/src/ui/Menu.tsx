import { useRef, useState } from 'react';
import { useGame } from '../store';

export function Menu() {
  const { name, setName, startLocalLobby, createRoom, joinRoomCode, loadSaveFile, resumeAutosave } = useGame();
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room') ?? '');
  const [loadAs, setLoadAs] = useState<'local' | 'host'>('local');
  const file = useRef<HTMLInputElement>(null);
  const hasAutosave = !!localStorage.getItem('carrera-neural.autosave');

  return (
    <div className="menu-screen">
      <div className="menu-card">
        <h1>
          <span className="leaf">🧠</span> Carrera Neural <small>3D</small>
        </h1>
        <p className="tagline">Google, Meta, Anthropic, OpenAI y DeepSeek compiten por dominar los mercados de la IA… y un Redditor con su modelo local se mete en el medio.</p>

        <label className="field">
          Tu nombre
          <input value={name} maxLength={20} placeholder="Ej: Maxi" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="menu-grid">
          <section>
            <h3>Online (P2P)</h3>
            <button className="primary" onClick={createRoom}>
              Crear sala y hostear
            </button>
            <div className="row">
              <input
                value={code}
                placeholder="CÓDIGO"
                maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinRoomCode(code)}
              />
              <button onClick={() => joinRoomCode(code)} disabled={!code.trim()}>
                Unirse
              </button>
            </div>
          </section>
          <section>
            <h3>En esta compu</h3>
            <button onClick={startLocalLobby}>Partida local (hotseat)</button>
            {hasAutosave && <button onClick={resumeAutosave}>Continuar autoguardado</button>}
            <div className="row">
              <select value={loadAs} onChange={(e) => setLoadAs(e.target.value as 'local' | 'host')}>
                <option value="local">como local</option>
                <option value="host">y hostear</option>
              </select>
              <button onClick={() => file.current?.click()}>Cargar .json</button>
            </div>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) loadSaveFile(await f.text(), loadAs);
                e.target.value = '';
              }}
            />
          </section>
        </div>

        <div className="row">
          <button className="studio-link" onClick={() => useGame.setState({ screen: 'landing' })}>
            ← Conocé el juego
          </button>
          <button className="studio-link" onClick={() => useGame.setState({ screen: 'studio' })}>
            🎨 Abrir el Estudio de arte
          </button>
        </div>

        <details className="rules">
          <summary>Reglas rápidas</summary>
          <ul>
            <li>Cada turno: <b>Planning</b> (efectos de empresa) → <b>Sprint</b> (3 acciones) → <b>Cierre</b> (puntos, robar 1, mano máx. 5).</li>
            <li><b>Liderás</b> un mercado si tenés más agentes + estructuras que nadie (empate: nadie).</li>
            <li><b>Desplegar</b>: mover agentes por una conexión; tenés que liderar origen o destino (OpenAI pivota sin esa restricción).</li>
            <li><b>Contratar / Construir / Lanzar / Especial</b>: pagás una carta del recurso del mercado (📊 Datos, 🔲 Cómputo, 💡 Talento). 🚀 Hype es comodín.</li>
            <li><b>Crunch</b>: quemá una carta de Hype para ganar +1 acción (1 vez por turno).</li>
            <li><b>Benchmark</b>: cada lado tira 1 d6 por agente (máx. 3); 4+ es un punto y cada punto saca un agente rival. Si el rival no tiene agentes ahí = +1 punto. Tirar una estructura da 1 PV.</li>
            <li>Gana la primera empresa en llegar a <b>20 PV</b> (Puntos de Valuación).</li>
          </ul>
        </details>

        <p className="fineprint">
          Parodia de fans sin fines de lucro. No está afiliada ni respaldada por Google, Meta, Anthropic, OpenAI, DeepSeek ni Reddit; los nombres son marcas de sus dueños y los personajes son caricaturas originales, sin logos oficiales. El online es P2P vía WebRTC: si no conecta (NAT estricta), probá que hostee
          otra persona o usar un hotspot.
        </p>
      </div>
    </div>
  );
}
