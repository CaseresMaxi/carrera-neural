import { FACTIONS, VICTORY_VP, type FactionId } from '@sotobosque/engine';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store';
import { ArtSvg } from './Art';
import { currentSeat, myFaction } from './interaction';

export function TopBar() {
  const st = useGame();
  const v = st.view!;
  const cur = v.order[v.current];
  const def = FACTIONS[cur];
  const link = st.role !== 'local' && st.lobby ? `${location.origin}${location.pathname}?room=${st.lobby.roomCode}` : null;
  return (
    <div className="topbar">
      <div className="brand">Carrera Neural</div>
      <div className="turn">
        Turno {v.turn} · <span className="dot" style={{ background: def.color }} /> <b>{v.factions[cur]!.playerName}</b> ({def.short}) ·{' '}
        {v.phase === 'dia' ? (def.nomad ? `Sprint — ${(v.factions[cur]!.items ?? []).filter((i) => !i.exhausted).length} componente(s) sin quemar` : `Sprint — ${v.actionsLeft} acción(es)${v.freeBattle ? ' + auditoría gratis' : ''}`) : v.phase === 'descarte' ? 'Cierre — descarte' : 'Fin'}
      </div>
      <div className="tools">
        {link && (
          <button title="Copiar link de la sala" onClick={() => navigator.clipboard?.writeText(link).then(() => st.showToast('Link copiado'))}>
            Sala {st.lobby!.roomCode} · {st.peers}👥
          </button>
        )}
        <button className="help-btn" onClick={() => useGame.setState({ helpOpen: true })}>
          ❓ Cómo se juega
        </button>
        <button onClick={() => st.setTopDown(!st.topDown)}>{st.topDown ? 'Vista 3D' : 'Vista superior'}</button>
        {st.role !== 'peer' && <button onClick={st.exportSave}>Guardar .json</button>}
        {st.role === 'local' && (
          <label className="check" title="Tapar la mano al cambiar de turno">
            <input type="checkbox" checked={st.hotseatCoverEnabled} onChange={(e) => st.setHotseatCoverEnabled(e.target.checked)} /> Pase
          </label>
        )}
        <button onClick={() => confirm('¿Salir de la partida? (queda autoguardada si sos host/local)') && st.leave()}>Salir</button>
      </div>
      {st.role === 'peer' && /desconect/i.test(st.status) && <div className="netstatus">{st.status}</div>}
    </div>
  );
}

export function FactionPanels() {
  const st = useGame();
  const v = st.view!;
  const me = myFaction(v, st.mySeat);
  const cur = currentSeat(v);
  const [card, setCard] = useState<FactionId | null>(null);
  return (
    <div className="factions">
      {card &&
        createPortal(
          <div className="modal" onClick={() => setCard(null)}>
            <div className="fcard-modal">
              <ArtSvg id={`fcard-${card}`} className="fcard-big" />
              <p className="fineprint">Tocá para cerrar</p>
            </div>
          </div>,
          document.body,
        )}
      {v.order.map((f) => {
        const def = FACTIONS[f];
        const fs = v.factions[f]!;
        const seatInfo = st.lobby?.seats[fs.seat];
        const nextVp = def.building ? def.building.vp[def.building.count - fs.buildingsSupply] : undefined;
        return (
          <div
            key={f}
            className={`fpanel ${fs.seat === cur ? 'active' : ''}`}
            style={{ borderColor: def.color }}
            title="Tocá para ver su tablero"
            onClick={() => useGame.setState({ boardTab: f === me ? null : f, boardOpen: true })}
          >
            <div className="fhead" style={{ background: def.color }}>
              <ArtSvg id={`emblem-${f}`} className="emblem" />
              <span className="fname">{def.short}</span>
              <span className="vp">
                {fs.vp}
                <small>/{VICTORY_VP}</small>
              </span>
            </div>
            <div className="fbody">
              <div className="tagline">{def.tagline}</div>
              <div className="pname">
                {fs.playerName} {f === me && <em>(vos)</em>}
                {st.role !== 'local' && seatInfo && !seatInfo.connected && <span className="off"> · desconectado</span>}
              </div>
              <div className="stats">
                {!def.nomad && <span title={`${def.warriorName} en reserva`}>🤖 {fs.warriorsSupply}</span>}
                {def.building && (
                  <span title={`${def.building.name}s en reserva${nextVp !== undefined ? ` (próximo: ${nextVp} PV)` : ''}`}>
                    🏢 {fs.buildingsSupply}
                    {nextVp !== undefined && <small> +{nextVp}</small>}
                  </span>
                )}
                {def.token && <span title="Lanzamientos en reserva">🚀 {fs.tokensSupply}</span>}
                {def.nomad && (
                  <span title="Componentes sin quemar / total">
                    🔧 {(fs.items ?? []).filter((i) => !i.exhausted).length}/{(fs.items ?? []).length}
                  </span>
                )}
                <span title="Cartas en mano">🂠 {v.handCounts[f]}</span>
              </div>
              <button
                className="link"
                onClick={(e) => {
                  e.stopPropagation();
                  setCard(f);
                }}
              >
                Ver carta de empresa
              </button>
              {st.role !== 'local' && st.mySeat === null && seatInfo && (!seatInfo.ownerId || !seatInfo.connected) && (
                <button onClick={() => st.claimSeat(fs.seat)}>Tomar este asiento</button>
              )}
            </div>
          </div>
        );
      })}
      <div className="deckinfo">
        Mazo {v.deckCount} · Descarte {v.discard.length}
      </div>
    </div>
  );
}

export function HelpModal() {
  const open = useGame((s) => s.helpOpen);
  if (!open) return null;
  const close = () => useGame.setState({ helpOpen: false });
  return createPortal(
    <div className="modal" onClick={close}>
      <div className="modal-card help" onClick={(e) => e.stopPropagation()}>
        <h2>Cómo se juega</h2>
        <p>
          Gana la primera empresa en llegar a <b>{VICTORY_VP} Puntos de Valuación (PV)</b>. Cada turno tiene tres fases:
        </p>
        <ol className="help-phases">
          <li>
            <b>Planning</b> — automático. Algunas empresas reciben algo (Google suma ingenieros, el Redditor recupera componentes).
          </li>
          <li>
            <b>Sprint</b> — tu parte. Hacé acciones: cada empresa tiene 3 (el Redditor quema componentes). El tablero de abajo te muestra los
            pasos sugeridos, cuáles se pueden hacer ahora y por qué no los otros.
          </li>
          <li>
            <b>Cierre</b> — tocás «Cerrar sprint»: sumás los PV de tu empresa (lo ves en «Si cerrás ahora»), robás una carta y pasa el turno.
          </li>
        </ol>
        <h3>Conceptos</h3>
        <dl className="help-terms">
          <dt>Liderar</dt>
          <dd>Tener más agentes + estructuras que nadie en un mercado. Hace falta para construir y (casi siempre) para desplegar.</dd>
          <dt>Cartas</dt>
          <dd>
            Son la plata del juego: no tienen efecto propio, se gastan para pagar acciones. Cada acción con carta cuesta 1 carta del recurso
            del mercado donde la hacés (Datos, Cómputo o Talento); Hype es comodín y además sirve para Crunch. Se consiguen gratis: 1 en cada
            Cierre (el Redditor también Scrapeando). Tocá una carta de tu mano para inspeccionarla: te dice qué podés hacer con ella y dónde,
            y la jugás desde ahí.
          </dd>
          <dt>Componentes (Redditor)</dt>
          <dd>
            Cada acción del Redditor quema un componente: Café para moverse, GPU para Benchmark, Dataset para Scrapear, Teclado para
            Fine-tunear. Componentes nuevos sólo se ganan Fine-tuneando: Datos → Dataset, Cómputo → GPU, Talento → Teclado, Hype → Café. Los
            quemados se recuperan al Dormir (Planning, 3) o con Crunch (1).
          </dd>
          <dt>Estructuras</dt>
          <dd>Se ponen con Construir (o Lanzar, OpenAI): 1 acción + 1 carta, en un mercado que cumpla el requisito. Dan PV al ponerlas.</dd>
          <dt>Benchmark</dt>
          <dd>Pelea con dados: cada 4+ es un punto y saca una pieza rival. Tirar una estructura da +1 PV.</dd>
          <dt>Crunch</dt>
          <dd>Una vez por turno, quemá una carta de Hype para ganar +1 acción.</dd>
          <dt>Mapa</dt>
          <dd>Durante una acción, los mercados válidos brillan: tocalos. Tocá un mercado sin acción para ver quién está ahí.</dd>
        </dl>
        <button className="primary" onClick={close}>
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function GameLog() {
  const log = useGame((s) => s.view!.log);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [log.length]);
  return (
    <div className="log" ref={ref}>
      {log.slice(-80).map((e) => (
        <div key={e.seq} className="entry" style={{ borderLeftColor: e.faction ? FACTIONS[e.faction].color : '#777' }}>
          {e.text}
        </div>
      ))}
    </div>
  );
}

export function WinnerModal() {
  const st = useGame();
  const v = st.view!;
  if (!v.winner) return null;
  const def = FACTIONS[v.winner];
  return (
    <div className="modal">
      <div className="modal-card" style={{ borderColor: def.color }}>
        <h2>🏆 ¡{def.name} gana!</h2>
        <p>
          {v.factions[v.winner]!.playerName} llegó a {v.factions[v.winner]!.vp} PV en el turno {v.turn}.
        </p>
        <ol>
          {[...v.order]
            .sort((a, b) => v.factions[b]!.vp - v.factions[a]!.vp)
            .map((f) => (
              <li key={f}>
                {FACTIONS[f].short} — {v.factions[f]!.vp} PV
              </li>
            ))}
        </ol>
        <button onClick={st.leave}>Volver al menú</button>
      </div>
    </div>
  );
}

export function HotseatCover() {
  const st = useGame();
  if (st.role !== 'local' || !st.hotseatCover || !st.view) return null;
  const v = st.view;
  const f = v.order[v.current];
  return (
    <div className="modal cover" onClick={st.uncover}>
      <div className="modal-card" style={{ borderColor: FACTIONS[f].color }}>
        <h2>
          Turno de {v.factions[f]!.playerName} <small>({FACTIONS[f].short})</small>
        </h2>
        <p>Pasale el dispositivo. Tocá para mostrar la mano.</p>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useGame((s) => s.toast);
  return toast ? <div className="toast">{toast}</div> : null;
}
