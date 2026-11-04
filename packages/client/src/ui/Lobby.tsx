import { FACTION_IDS, FACTIONS } from '@sotobosque/engine';
import { useGame } from '../store';
import { ArtSvg } from './Art';

export function Lobby() {
  const st = useGame();
  const { lobby, role, playerId } = st;
  const isAuthority = role === 'host' || role === 'local';
  const link = lobby && role !== 'local' ? `${location.origin}${location.pathname}?room=${lobby.roomCode}` : '';

  return (
    <div className="menu-screen">
      <div className="menu-card wide">
        <h2>{role === 'local' ? 'Partida local' : `Sala ${lobby?.roomCode ?? '…'}`}</h2>
        <p className="status">
          {st.status}
          {role !== 'local' && ` · ${st.peers} conectado(s)`}
        </p>
        {link && (
          <div className="row">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard?.writeText(link).then(() => st.showToast('Link copiado'))}>Copiar link</button>
          </div>
        )}

        {!lobby && <p>Buscando al host en la sala… (puede tardar unos segundos)</p>}

        {lobby && (
          <div className="seats">
            {lobby.seats.map((s, i) => {
              const def = FACTIONS[s.faction];
              const mine = s.ownerId === playerId;
              return (
                <div key={i} className="seat" style={{ borderColor: def.color }}>
                  <div className="seat-head" style={{ background: def.color }}>
                    Asiento {i + 1}
                  </div>
                  {isAuthority && !lobby.started ? (
                    <select value={s.faction} onChange={(e) => st.setSeatFaction(i, e.target.value as never)}>
                      {FACTION_IDS.map((f) => (
                        <option key={f} value={f}>
                          {FACTIONS[f].name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <b>{def.name}</b>
                  )}
                  <ArtSvg id={`fcard-${s.faction}`} className="seat-card" />
                  {role === 'local' ? (
                    <input value={s.name} placeholder={`Jugador ${i + 1}`} onChange={(e) => st.setSeatName(i, e.target.value)} />
                  ) : (
                    <div className="seat-owner">
                      {s.ownerId ? (
                        <span>
                          {s.name || 'Jugador'} {mine && '(vos)'} {!s.connected && '· desconectado'}
                        </span>
                      ) : (
                        <span className="free">Libre</span>
                      )}
                      {!mine && (!s.ownerId || !s.connected) && <button onClick={() => st.claimSeat(i)}>Sentarme</button>}
                    </div>
                  )}
                  {isAuthority && !lobby.started && lobby.seats.length > 2 && (
                    <button className="link" onClick={() => st.removeSeat(i)}>
                      Quitar asiento
                    </button>
                  )}
                </div>
              );
            })}
            {isAuthority && !lobby.started && lobby.seats.length < 4 && (
              <button className="seat add" onClick={st.addSeat}>
                + Agregar asiento
              </button>
            )}
          </div>
        )}

        <div className="row end">
          <button onClick={st.leave}>Salir</button>
          {isAuthority && (
            <button className="primary" onClick={st.startGame}>
              Empezar partida
            </button>
          )}
          {role === 'peer' && <span className="status">Esperando que el host empiece…</span>}
        </div>
        {role === 'host' && lobby?.seats.some((s) => !s.ownerId) && (
          <p className="fineprint">Los asientos libres se pueden ocupar también con la partida empezada (sirve para reconectar).</p>
        )}
      </div>
    </div>
  );
}
