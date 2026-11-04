import {
  closingScore,
  FACTIONS,
  GLADES,
  HAND_LIMIT,
  ITEMS,
  LANTERN_VP,
  MAX_ITEMS,
  REFRESH_ITEMS,
  SUIT_ITEM,
  FINETUNE_VP,
  TERRAIN_NAMES,
  VICTORY_VP,
  freshCount,
  pawnGlade,
  ruler,
  type FactionId,
  type GameView,
  type ItemKind,
  type Move,
} from '@sotobosque/engine';
import { useState, type ReactNode } from 'react';
import { useGame, type ActionKind, type UiState } from '../store';
import { ArtSvg, SuitIcon } from './Art';
import { CardView } from './Hand';
import { cardUses } from './CardInspector';
import { aidRivals, battleMovesFor, cardMovesFor, isMyTurn, myFaction, optionCount, startAction } from './interaction';

type StepKind = ActionKind | 'scrapear';

/** Pasos sugeridos del sprint, en orden, con un consejo propio de cada empresa. */
const GUIDE: Record<FactionId, { kind: StepKind; tip: string }[]> = {
  google: [
    { kind: 'mover', tip: 'Expandite: liderar mercados te deja construir.' },
    { kind: 'construir', tip: 'Cada datacenter da PV y te suma ingenieros en el Planning.' },
    { kind: 'especial', tip: 'Comprá un agente rival donde liderás.' },
    { kind: 'batalla', tip: 'Tirá estructuras rivales: +1 PV cada una.' },
  ],
  meta: [
    { kind: 'mover', tip: 'Llegás hasta 2 conexiones de un salto.' },
    { kind: 'construir', tip: 'Repositorios: PV ahora y estrellas en el Cierre.' },
    { kind: 'reclutar', tip: '+2 contribuidores junto a un repositorio.' },
    { kind: 'especial', tip: 'Forkeá junto a una estructura rival: +1 PV.' },
    { kind: 'batalla', tip: 'Disputá mercados para poder construir.' },
  ],
  anthropic: [
    { kind: 'batalla', tip: 'El primero es gratis y cada agente eliminado da +1 PV.' },
    { kind: 'mover', tip: 'Liderá mercados para poner laboratorios.' },
    { kind: 'construir', tip: 'Laboratorios: PV y Constitución en el Cierre.' },
    { kind: 'reclutar', tip: '+2 auditores junto a un laboratorio.' },
  ],
  openai: [
    { kind: 'encender', tip: 'Cada lanzamiento sube tus PV de Cierre.' },
    { kind: 'mover', tip: 'Podés desplegar sin liderar: buscá mercados nuevos.' },
    { kind: 'reclutar', tip: '+1 investigador junto a un lanzamiento.' },
    { kind: 'batalla', tip: 'Sólo 2 dados: elegí bien la pelea.' },
  ],
  deepseek: [
    { kind: 'mover', tip: 'Los mercados disputados te dan PV en el Cierre.' },
    { kind: 'construir', tip: 'Clústers: PV y donde contratar. Pagás con cualquier carta.' },
    { kind: 'reclutar', tip: '+2 ingenieros junto a un clúster.' },
    { kind: 'batalla', tip: 'Defendé tus clústers.' },
  ],
  redditor: [
    { kind: 'mover', tip: 'Andá a mercados con rivales: drama = PV al Cierre.' },
    { kind: 'finetune', tip: 'Pagá una carta del mercado: +1 componente y +2 PV.' },
    { kind: 'especial', tip: 'Regalá una carta a un rival en tu mercado: +2 PV.' },
    { kind: 'scrapear', tip: 'Robá una carta para fine-tunear después.' },
    { kind: 'batalla', tip: 'Tirá estructuras rivales: 1 dado por GPU.' },
  ],
};

const STEP_ITEM: Partial<Record<StepKind, ItemKind>> = { mover: 'cafe', finetune: 'teclado', scrapear: 'dataset', batalla: 'gpu' };

export function stepLabel(f: FactionId, k: StepKind): string {
  const def = FACTIONS[f];
  if (k === 'especial') return def.special?.name ?? 'Especial';
  if (def.nomad && STEP_ITEM[k]) return ITEMS[STEP_ITEM[k]!].verb;
  return { mover: 'Desplegar', reclutar: 'Contratar', construir: 'Construir', encender: 'Lanzar', batalla: 'Benchmark', finetune: 'Fine-tunear', scrapear: 'Scrapear' }[k];
}

export function stepIcon(f: FactionId, k: StepKind): ReactNode {
  const def = FACTIONS[f];
  if (def.nomad && STEP_ITEM[k]) return <ArtSvg id={`item-${STEP_ITEM[k]}`} className="act-art" />;
  switch (k) {
    case 'reclutar':
      return <ArtSvg id={`emblem-${f}`} className="act-art" />;
    case 'construir':
      return <ArtSvg id={`struct-${def.building!.kind}`} className="act-art" />;
    case 'encender':
      return <ArtSvg id="struct-demo" className="act-art" />;
    case 'batalla':
      return <ArtSvg id={`die-${f}-6`} className="act-art" />;
    case 'especial':
      return <span className="act-emoji">★</span>;
    default:
      return <span className="act-emoji">➜</span>;
  }
}

function stepCost(v: GameView, f: FactionId, k: StepKind): string {
  const def = FACTIONS[f];
  if (def.nomad) {
    if (k === 'especial') return 'quema 1 componente + 1 carta';
    const it = STEP_ITEM[k]!;
    return `quema 1 ${ITEMS[it].name}${k === 'finetune' ? ' + carta' : ''}`;
  }
  if (k === 'batalla') return v.freeBattle ? 'gratis (auditoría)' : '1 acción';
  if (k === 'mover') return '1 acción';
  if (k === 'especial') return '1 acción + carta · 1/turno';
  return '1 acción + carta';
}

/** Estado de un paso: cuántas opciones hay o por qué no se puede. */
function stepStatus(v: GameView, seat: number, f: FactionId, k: StepKind, ui: UiState): { ok: boolean; text: string } {
  const def = FACTIONS[f];
  const fs = v.factions[f]!;
  if (k === 'scrapear') {
    const ok = freshCount(fs, 'dataset') > 0;
    return { ok, text: ok ? 'Robás 1 carta' : 'Sin Datasets sin quemar' };
  }
  if (def.nomad) {
    if (k === 'especial') {
      if (v.specialUsed) return { ok: false, text: 'Ya ayudaste este turno' };
      if (!(fs.items ?? []).some((i) => !i.exhausted)) return { ok: false, text: 'Todo quemado' };
    } else if (freshCount(fs, STEP_ITEM[k]!) === 0) return { ok: false, text: `Sin ${ITEMS[STEP_ITEM[k]!].name} sin quemar` };
  } else {
    if (v.actionsLeft <= 0 && !(k === 'batalla' && v.freeBattle)) return { ok: false, text: 'Sin acciones' };
    if (k === 'especial' && v.specialUsed) return { ok: false, text: 'Ya la usaste' };
  }
  const n = optionCount(v, seat, k, ui.selectedCards);
  if (n === 0) {
    const why: Partial<Record<StepKind, string>> = {
      mover: def.nomad ? 'Ningún destino' : 'Necesitás liderar origen o destino',
      construir: 'Liderá un mercado con lugar y pagá su recurso',
      reclutar: `Necesitás una carta del mercado con tu ${def.building?.name.toLowerCase() ?? 'lanzamiento'}`,
      encender: 'Sin mercado válido para lanzar',
      batalla: 'No compartís mercado con rivales',
      especial: def.nomad ? 'No hay rivales en tu mercado' : 'Ningún mercado válido',
      finetune: 'Necesitás una carta del recurso de tu mercado',
    };
    return { ok: false, text: why[k] ?? 'Ningún mercado válido' };
  }
  if (def.nomad) return { ok: true, text: 'Disponible' };
  if (k === 'mover') return { ok: true, text: `${n} origen${n > 1 ? 'es' : ''} posible${n > 1 ? 's' : ''}` };
  return { ok: true, text: `${n} mercado${n > 1 ? 's' : ''} posible${n > 1 ? 's' : ''}` };
}

function planningText(v: GameView, f: FactionId): string {
  const def = FACTIONS[f];
  if (f === 'google') {
    const n = v.glades.filter((g) => g.buildings.some((b) => b.faction === f)).length;
    return `Autoescalado: +1 ingeniero en cada datacenter (${n}).`;
  }
  if (def.nomad) return `Dormir: recupera ${REFRESH_ITEMS} componentes quemados.`;
  return 'Sin efecto automático: arrancás con todas tus acciones.';
}

function hasMoves(v: GameView, f: FactionId): boolean {
  const def = FACTIONS[f];
  if (def.nomad) return (v.factions[f]!.items ?? []).some((i) => !i.exhausted);
  return v.actionsLeft > 0 || v.freeBattle;
}

// ───────────────────────── componente principal ─────────────────────────

export function PlayerBoard() {
  const st = useGame();
  const v = st.view!;
  const me = myFaction(v, st.mySeat);
  const cur = v.order[v.current];
  const shown = st.boardTab && v.factions[st.boardTab] ? st.boardTab : (me ?? cur);
  const def = FACTIONS[shown];
  const fs = v.factions[shown]!;
  const mine = shown === me;
  const active = mine && isMyTurn(v, st.mySeat);
  // en celular el tablero muestra una sección por vez
  const [sec, setSec] = useState<'acciones' | 'recursos' | 'mano'>('acciones');

  if (v.phase === 'fin') return null;
  const hand = v.handCounts[shown] ?? 0;

  return (
    <div className={`pboard ${st.boardOpen ? '' : 'closed'}`} style={{ ['--fc' as string]: def.color }}>
      <div className="pb-tabs">
        {v.order.map((f) => (
          <button
            key={f}
            className={`pb-tab ${f === shown ? 'on' : ''} ${f === cur ? 'is-turn' : ''}`}
            style={{ ['--tc' as string]: FACTIONS[f].color }}
            onClick={() => useGame.setState({ boardTab: f === me ? null : f, boardOpen: true })}
            title={f === cur ? 'Juega ahora' : ''}
          >
            <ArtSvg id={`emblem-${f}`} className="emblem" />
            {f === me ? 'Tu tablero' : FACTIONS[f].short}
            <small>{v.factions[f]!.vp} PV</small>
            {f === cur && <span className="pb-now">● turno</span>}
          </button>
        ))}
        <button className="pb-toggle" onClick={() => useGame.setState({ boardOpen: !st.boardOpen })}>
          {st.boardOpen ? '▾' : '▴'}
          <span className="lbl">{st.boardOpen ? ' Ocultar tablero' : ' Mostrar tablero'}</span>
        </button>
      </div>

      {st.boardOpen && (
        <div className={`pb-body ${def.nomad ? 'nomad' : ''} sec-${sec}`}>
          <nav className="pb-secnav">
            {(
              [
                ['acciones', '▶ Acciones'],
                ['recursos', def.nomad ? '🎒 Inventario' : '🏗 Recursos'],
                ['mano', `🃏 Mano (${hand})`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}>
                {label}
              </button>
            ))}
          </nav>
          <section className="pb-id">
            <div className="pb-portrait">
              <ArtSvg id={`char-${shown}`} />
            </div>
            <div className="pb-name">{def.name}</div>
            <div className="pb-player">
              {fs.playerName} {mine && <em>(vos)</em>}
            </div>
            <div className="pb-vp" title={`Gana quien llega a ${VICTORY_VP} PV`}>
              <div style={{ width: `${Math.min(100, (fs.vp / VICTORY_VP) * 100)}%` }} />
              <span>
                {fs.vp} / {VICTORY_VP} PV
              </span>
            </div>
          </section>

          <section className="pb-guide">
            <PhaseTrack v={v} f={shown} isTurn={shown === cur} />
            <Coach v={v} f={shown} me={me} active={active} />
            {active && v.phase === 'dia' && (
              <div className="row end">
                <button disabled={!st.canUndo} onClick={st.undo} title="Deshacer el último movimiento sin azar de este turno">
                  ↶ Deshacer
                </button>
                <button className={`primary ${hasMoves(v, shown) ? '' : 'pulse'}`} onClick={() => st.sendMove({ type: 'terminarDia' })}>
                  Cerrar sprint →
                </button>
              </div>
            )}
          </section>

          <section className="pb-actions">
            <Steps v={v} f={shown} active={active} />
          </section>

          <section className="pb-res">
            <Resources v={v} f={shown} />
          </section>

          <section className="pb-hand">
            <HandArea v={v} f={shown} mine={mine} />
          </section>
        </div>
      )}
    </div>
  );
}

function PhaseTrack({ v, f, isTurn }: { v: GameView; f: FactionId; isTurn: boolean }) {
  const now = !isTurn ? -1 : v.phase === 'descarte' ? 2 : 1;
  const def = FACTIONS[f];
  const phases = [
    { name: 'Planning', hint: planningText(v, f) },
    { name: 'Sprint', hint: def.nomad ? 'Cada acción quema un componente.' : `${def.actions} acciones${def.freeBattle ? ' + 1 benchmark gratis' : ''}.` },
    { name: 'Cierre', hint: 'Sumás PV de tu empresa, robás 1 carta (máx. 5).' },
  ];
  return (
    <ol className="phases">
      {phases.map((p, i) => (
        <li key={p.name} className={i < now ? 'done' : i === now ? 'now' : ''} title={p.hint}>
          <b>
            {i + 1}. {p.name}
          </b>
          <small>{p.hint}</small>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────── coach: qué hacer ahora ─────────────────────────

function Coach({ v, f, me, active }: { v: GameView; f: FactionId; me: FactionId | null; active: boolean }) {
  const ui = useGame((s) => s.ui);
  const seat = useGame((s) => s.mySeat);
  const cur = v.order[v.current];
  const def = FACTIONS[f];
  let title: string;
  let body: ReactNode;
  let tone = 'info';

  if (!active) {
    if (f === cur) {
      title = `Juega ${v.factions[cur]!.playerName}`;
      body = me ? 'Mirá su jugada en el mapa y en el registro. Cuando sea tu turno, este cuadro te va guiando paso a paso.' : 'Estás mirando como espectador.';
    } else if (f === me) {
      title = 'Esperá tu turno';
      body = (
        <>
          Ahora juega <b style={{ color: FACTIONS[cur].color }}>{v.factions[cur]!.playerName}</b>. Mientras tanto, planeá: revisá tu mano y qué vas a sumar en el Cierre.
        </>
      );
    } else {
      title = `Tablero de ${def.short}`;
      body = 'Así está esta empresa: su reserva, lo que suma en el Cierre y sus pasos de sprint. Tocá «Tu tablero» para volver.';
    }
    return <CoachBox title={title} body={body} tone="idle" />;
  }

  if (v.phase === 'descarte') {
    const need = v.factions[f]!.hand.length - HAND_LIMIT;
    return <CoachBox tone="warn" title={`Descartá ${need} carta${need > 1 ? 's' : ''}`} body={`Tenés más de ${HAND_LIMIT} cartas. Tocá en tu mano las que querés tirar y confirmá con «Descartar».`} />;
  }

  if (ui.action) {
    const where = ui.glade !== null ? GLADES[ui.glade] : null;
    if (ui.action === 'mover') {
      title = ui.from === null ? 'Paso 1 de 2 · origen' : 'Paso 2 de 2 · destino';
      body =
        ui.from === null
          ? `Tocá en el mapa un mercado que brille: de ahí salen tus ${def.warriorName}.`
          : def.nomad
            ? 'Tocá el mercado vecino que brille a donde querés ir.'
            : 'Elegí cuántos con − / + y tocá el mercado destino que brille.';
    } else if (ui.action === 'batalla') {
      title = where ? 'Paso 2 de 2 · rival' : 'Paso 1 de 2 · mercado';
      body = where ? `Elegí contra quién competís en ${where.name}. Se tiran dados: 4 o más es un punto.` : 'Tocá un mercado que brille, donde tengas agentes y haya rivales.';
    } else {
      title = where ? 'Paso 2 de 2 · carta' : 'Paso 1 de 2 · mercado';
      body = where
        ? ui.action === 'especial' && def.nomad
          ? 'Elegí a qué rival ayudás y qué carta le regalás.'
          : `Elegí qué carta pagás: tiene que ser de ${TERRAIN_NAMES[where.terrain]}${def.anyCard ? ' (o cualquiera: Eficiencia)' : ''} o Hype.`
        : 'Tocá un mercado que brille en el mapa.';
    }
    return <CoachBox title={title} body={body} tone="step" />;
  }

  if (!hasMoves(v, f)) {
    const pts = closingScore(v, f).reduce((n, r) => n + r.vp, 0);
    tone = 'done';
    return (
      <CoachBox
        tone={tone}
        title={def.nomad ? 'Componentes agotados' : 'Te quedaste sin acciones'}
        body={
          <>
            Tocá <b>«Cerrar sprint»</b>: sumás <b>+{pts} PV</b> en el Cierre y robás una carta.
            {v.factions[f]!.hand.some((c) => c.suit === 'hype') && !v.effortUsed && ' (O hacé Crunch con una carta de Hype.)'}
          </>
        }
      />
    );
  }

  const next = GUIDE[f].find((s) => stepStatus(v, seat!, f, s.kind, ui).ok);
  const left = def.nomad ? (v.factions[f]!.items ?? []).filter((i) => !i.exhausted).length : v.actionsLeft;
  return (
    <CoachBox
      tone="go"
      title={def.nomad ? `Te quedan ${left} componente${left === 1 ? '' : 's'} sin quemar` : `Te quedan ${left} ${left === 1 ? 'acción' : 'acciones'}${v.freeBattle ? ' + 1 gratis' : ''}`}
      body={
        next ? (
          <>
            Elegí una acción de la lista. <b>Sugerido: {stepLabel(f, next.kind)}</b> — {next.tip}
          </>
        ) : (
          'No hay jugadas útiles ahora: podés cerrar el sprint.'
        )
      }
    />
  );
}

function CoachBox({ title, body, tone }: { title: string; body: ReactNode; tone: string }) {
  return (
    <div className={`coach ${tone}`}>
      <b>{title}</b>
      <p>{body}</p>
    </div>
  );
}

// ───────────────────────── pasos del sprint ─────────────────────────

function Steps({ v, f, active }: { v: GameView; f: FactionId; active: boolean }) {
  const st = useGame();
  const ui = st.ui;
  const def = FACTIONS[f];
  const hand = v.factions[f]!.hand;

  if (active && v.phase === 'descarte') {
    const need = hand.length - HAND_LIMIT;
    const ok = ui.selectedCards.length === need;
    return (
      <div className="pb-discard">
        <h4>Cierre: descarte</h4>
        <p>Marcá {need} carta(s) en tu mano.</p>
        <button className="primary" disabled={!ok} onClick={() => st.sendMove({ type: 'descartar', cards: ui.selectedCards })}>
          Descartar ({ui.selectedCards.length}/{need})
        </button>
      </div>
    );
  }

  if (active && ui.action) {
    return (
      <div className="detail-wrap">
        <div className="detail-head">
          <b>{stepLabel(f, ui.action)}</b>
          <button className="link" onClick={() => st.setUi({ action: null, from: null, glade: null, target: null })}>
            ← Volver
          </button>
        </div>
        <ActionDetail />
      </div>
    );
  }

  const hype = hand.find((c) => c.suit === 'hype' && (!ui.selectedCards.length || ui.selectedCards.includes(c.id)));
  const canCrunch = !!hype && !v.effortUsed && (!def.nomad || (v.factions[f]!.items ?? []).some((i) => i.exhausted));
  const steps = GUIDE[f];
  let suggested = false;
  return (
    <>
      <h4 className="pb-h">Pasos del sprint {!active && <small>(referencia)</small>}</h4>
      <div className="act-grid">
        {steps.map((s, i) => {
          const status = active ? stepStatus(v, st.mySeat!, f, s.kind, ui) : { ok: false, text: s.tip };
          const isSuggested = active && status.ok && !suggested;
          if (isSuggested) suggested = true;
          return (
            <button
              key={s.kind}
              className={`act ${s.kind === 'especial' ? 'special' : ''} ${isSuggested ? 'suggested' : ''} ${active ? '' : 'ref'}`}
              disabled={!active || !status.ok}
              title={s.tip}
              onClick={() => (s.kind === 'scrapear' ? st.sendMove({ type: 'scrapear' }) : startAction(s.kind))}
            >
              <span className="act-n">{i + 1}</span>
              <span className="act-icon">{stepIcon(f, s.kind)}</span>
              <span className="act-text">
                <b>{stepLabel(f, s.kind)}</b>
                <small>{stepCost(v, f, s.kind)}</small>
                <em>{status.text}</em>
              </span>
            </button>
          );
        })}
        <button
          className={`act crunch ${active ? '' : 'ref'}`}
          disabled={!active || !canCrunch}
          title="Quemá una carta de Hype (1 vez por turno)"
          onClick={() => hype && st.sendMove({ type: 'esfuerzo', card: hype.id })}
        >
          <span className="act-n">+</span>
          <span className="act-icon">
            <SuitIcon suit="hype" />
          </span>
          <span className="act-text">
            <b>Crunch</b>
            <small>{def.nomad ? '1 Hype → recupera 1 componente' : '1 Hype → +1 acción'}</small>
            <em>{!active ? 'Una vez por turno' : v.effortUsed ? 'Ya hiciste crunch' : hype ? (canCrunch ? 'Disponible' : 'Nada quemado') : 'Sin cartas de Hype'}</em>
          </span>
        </button>
      </div>
    </>
  );
}

function ActionDetail() {
  const st = useGame();
  const v = st.view!;
  const seat = st.mySeat!;
  const ui = st.ui;
  const f = myFaction(v, seat)!;
  const def = FACTIONS[f];

  if (ui.action === 'mover' && ui.from !== null) {
    const max = v.glades[ui.from].warriors[f] ?? 0;
    return (
      <div className="detail">
        Desde <b>{GLADES[ui.from].name}</b>
        {!def.nomad && (
          <>
            : ¿cuántos?
            <span className="stepper">
              <button onClick={() => st.setUi({ count: Math.max(1, ui.count - 1) })}>−</button>
              <b>{ui.count}</b>
              <button onClick={() => st.setUi({ count: Math.min(max, ui.count + 1) })}>+</button>
            </span>
          </>
        )}
        <div className="fineprint">👉 Tocá en el mapa el destino que brilla.</div>
      </div>
    );
  }

  if (ui.glade !== null && ui.action === 'batalla') {
    const ms = battleMovesFor(v, seat, ui.glade) as Extract<Move, { type: 'batalla' }>[];
    return (
      <div className="detail">
        <div>¿Contra quién en {GLADES[ui.glade].name}?</div>
        <div className="row">
          {ms.map((m) => (
            <button key={m.target} className="rival" style={{ borderColor: FACTIONS[m.target].color }} onClick={() => st.sendMove(m)}>
              <ArtSvg id={`emblem-${m.target}`} className="emblem" /> {FACTIONS[m.target].short}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (ui.glade !== null && ui.action) {
    const rivals = ui.action === 'especial' && def.nomad ? aidRivals(v, f, ui.glade) : [];
    const target = ui.target ?? rivals[0] ?? null;
    const ms = cardMovesFor(v, seat, { ...ui, target }, ui.glade) as Extract<Move, { card: number }>[];
    const hand = v.factions[f]!.hand;
    return (
      <div className="detail">
        {rivals.length > 0 && (
          <div className="row">
            Ayudar a:
            {rivals.map((o) => (
              <button
                key={o}
                className={`rival ${o === target ? 'on' : ''}`}
                style={{ borderColor: FACTIONS[o].color }}
                onClick={() => st.setUi({ target: o })}
              >
                <ArtSvg id={`emblem-${o}`} className="emblem" /> {FACTIONS[o].short}
              </button>
            ))}
          </div>
        )}
        <div>
          {rivals.length ? 'Carta a regalar:' : `Carta a pagar en ${GLADES[ui.glade].name} (${TERRAIN_NAMES[GLADES[ui.glade].terrain]}):`}
        </div>
        <div className="row cards-row">
          {ms.map((m) => (
            <CardView key={m.card} small card={hand.find((c) => c.id === m.card)!} onClick={() => st.sendMove(m)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="detail">
      <div className="fineprint">👉 Tocá en el mapa un mercado que brille.</div>
      {ui.selectedCards.length > 0 && <div className="fineprint">Usando sólo la carta seleccionada.</div>}
    </div>
  );
}

// ───────────────────────── recursos e inventario ─────────────────────────

function Resources({ v, f }: { v: GameView; f: FactionId }) {
  const def = FACTIONS[f];
  const fs = v.factions[f]!;
  const closing = closingScore(v, f);
  const total = closing.reduce((n, r) => n + r.vp, 0);

  let track: ReactNode = null;
  if (def.nomad) {
    const items = fs.items ?? [];
    const at = pawnGlade(v, f);
    track = (
      <>
        <h4 className="pb-h">
          Inventario <small>{items.length}/{MAX_ITEMS}</small>
        </h4>
        <div className="inv">
          {items.map((it, i) => (
            <div key={i} className={`inv-item ${it.exhausted ? 'burnt' : ''}`} title={`${ITEMS[it.kind].name}: ${ITEMS[it.kind].hint}${it.exhausted ? ' (quemado)' : ''}`}>
              <ArtSvg id={`item-${it.kind}`} />
              <small>{it.exhausted ? 'quemado' : ITEMS[it.kind].verb}</small>
            </div>
          ))}
          {Array.from({ length: Math.max(0, MAX_ITEMS - items.length) }, (_, i) => (
            <div key={`e${i}`} className="inv-item empty" title="Lugar libre: se llena al fine-tunear" />
          ))}
        </div>
        <div className="pb-line">📍 Está en {at >= 0 ? GLADES[at].name : '—'}</div>
        <div className="howto">
          <b>¿Cómo consigo componentes?</b>
          <div className="howto-row" title="Fine-tunear: quemá un Teclado y pagá una carta del recurso de tu mercado">
            <span>Fine-tunear con:</span>
            {(['datos', 'computo', 'talento', 'hype'] as const).map((su) => (
              <span key={su} className="howto-pair">
                <SuitIcon suit={su} />→<ArtSvg id={`item-${SUIT_ITEM[su]}`} />
              </span>
            ))}
          </div>
          <small>
            Nuevo: <b>Fine-tunear</b> (carta del recurso de tu mercado + 1 Teclado, +{FINETUNE_VP} PV).
            Recuperar quemados: <b>Dormir</b> en el Planning ({REFRESH_ITEMS}) o <b>Crunch</b> con Hype (1).
          </small>
        </div>
      </>
    );
  } else if (def.building) {
    const b = def.building;
    const built = b.count - fs.buildingsSupply;
    track = (
      <>
        <h4 className="pb-h">
          {b.name}s <small>al construir: PV</small>
        </h4>
        <div className="track">
          {b.vp.map((vp, i) => (
            <div key={i} className={`slot ${i < built ? 'built' : i === built ? 'next' : ''}`} title={i < built ? 'Ya en el mapa' : `Construir este: +${vp} PV`}>
              {i < built ? <span className="slot-done">✓</span> : <ArtSvg id={`struct-${b.kind}`} />}
              <small>+{vp}</small>
            </div>
          ))}
        </div>
      </>
    );
  } else if (def.token) {
    const placed = def.token.count - fs.tokensSupply;
    track = (
      <>
        <h4 className="pb-h">
          Lanzamientos <small>PV en cada Cierre</small>
        </h4>
        <div className="track">
          {Array.from({ length: def.token.count }, (_, i) => (
            <div key={i} className={`slot small ${i < placed ? 'built' : i === placed ? 'next' : ''}`} title={`Con ${i + 1} lanzamientos: ${LANTERN_VP[i + 1]} PV por Cierre`}>
              {i < placed ? <span className="slot-done">✓</span> : <ArtSvg id="struct-demo" />}
              <small>{LANTERN_VP[i + 1]}</small>
            </div>
          ))}
        </div>
      </>
    );
  }

  const howto = def.building
    ? `Para poner uno: Construir (1 acción + 1 carta del recurso) en un mercado que liderás y con lugar libre. Te quedan ${fs.buildingsSupply}.`
    : def.token
      ? `Para poner uno: Lanzar (1 acción + 1 carta del recurso) donde tengas un investigador o junto a otro lanzamiento. Te quedan ${fs.tokensSupply}.`
      : null;
  return (
    <>
      {track}
      {howto && <small className="fineprint howto-line">{howto}</small>}
      {!def.nomad && (
        <div className="pb-line" title={`${def.warriorName} que todavía no entraron al mapa`}>
          🤖 Reserva: <b>{fs.warriorsSupply}</b> {def.warriorName}
          <span className="bar">
            <span style={{ width: `${(fs.warriorsSupply / def.warriors) * 100}%` }} />
          </span>
        </div>
      )}
      <div className="closing" title="Lo que sumarías si el Cierre fuera ahora">
        <b>Si cerrás ahora: +{total} PV</b>
        {closing.length === 0 && <small>Esta empresa no puntúa en el Cierre: suma al construir y competir.</small>}
        {closing.map((r, i) => (
          <small key={i} className={r.vp ? 'yes' : ''}>
            +{r.vp} · {r.why}
          </small>
        ))}
      </div>
    </>
  );
}

function HandArea({ v, f, mine }: { v: GameView; f: FactionId; mine: boolean }) {
  const st = useGame();
  const covered = st.role === 'local' && st.hotseatCover;
  const count = v.handCounts[f] ?? 0;
  if (!mine || covered) {
    return (
      <>
        <h4 className="pb-h">Mano</h4>
        <div className="hand-backs">
          {Array.from({ length: count }, (_, i) => (
            <ArtSvg key={i} id="card-back" className="back" />
          ))}
        </div>
        <small className="fineprint">{count} carta(s) ocultas</small>
      </>
    );
  }
  const hand = v.factions[f]!.hand;
  const myTurn = isMyTurn(v, st.mySeat);
  const toggle = (id: number) => {
    const sel = st.ui.selectedCards;
    st.setUi({ selectedCards: sel.includes(id) ? sel.filter((x) => x !== id) : v.phase === 'descarte' || !myTurn ? [...sel, id] : [id] });
  };
  return (
    <>
      <h4 className="pb-h">
        Tu mano <small>{hand.length}/{HAND_LIMIT}</small>
      </h4>
      <div className="pb-cards">
        {hand.map((c) => {
          const discarding = v.phase === 'descarte' && myTurn;
          const n = discarding ? 0 : cardUses(v, st.mySeat!, f, c).reduce((k, u) => k + u.moves.length, 0);
          return (
            <div key={c.id} className="pb-card">
              <CardView
                small
                card={c}
                selected={st.ui.selectedCards.includes(c.id)}
                onClick={() => (discarding ? toggle(c.id) : useGame.setState({ inspectCard: c.id }))}
              />
              {!discarding && (
                <span className={`pb-card-tag ${n ? 'ok' : ''}`} title="Tocá la carta para ver qué hace y jugarla">
                  {n ? `▶ ${n}` : '🔍'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <small className="fineprint">
        {v.phase === 'descarte' && myTurn
          ? 'Tocá las que querés descartar.'
          : `🔍 Tocá una carta para ver qué hace, cuánto cuesta y jugarla. Conseguís 1 en cada Cierre${FACTIONS[f].nomad ? ' y 1 al Scrapear' : ''}.`}
      </small>
    </>
  );
}

/** Detalle del mercado tocado (flotante, a la derecha). */
export function GladeInfo() {
  const st = useGame();
  const v = st.view!;
  const id = st.ui.glade;
  if (id === null || st.ui.action) return null;
  const def = GLADES[id];
  const g = v.glades[id];
  const r = ruler(v, id);
  return (
    <div className="glade-info glade-float">
      <button className="link close" onClick={() => st.setUi({ glade: null })}>
        ✕
      </button>
      <h4>
        <SuitIcon suit={def.terrain} /> {def.name}{' '}
        <small>
          ({TERRAIN_NAMES[def.terrain]}, {def.slots} lugar{def.slots > 1 ? 'es' : ''})
        </small>
      </h4>
      <div>Lidera: {r ? <b style={{ color: FACTIONS[r].color }}>{FACTIONS[r].short}</b> : 'nadie'}</div>
      <ul>
        {v.order
          .filter((f) => (g.warriors[f] ?? 0) > 0 || g.buildings.some((b) => b.faction === f) || g.tokens.some((t) => t.faction === f))
          .map((f) => (
            <li key={f} style={{ color: FACTIONS[f].color }}>
              {FACTIONS[f].short}: {g.warriors[f] ?? 0} {FACTIONS[f].warriorName}
              {g.buildings.filter((b) => b.faction === f).length > 0 && `, ${g.buildings.filter((b) => b.faction === f).length} estructura(s)`}
              {g.tokens.filter((t) => t.faction === f).length > 0 && `, ${g.tokens.filter((t) => t.faction === f).length} lanzamiento`}
            </li>
          ))}
      </ul>
    </div>
  );
}
