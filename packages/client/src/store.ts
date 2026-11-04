import {
  applyMove,
  createGame,
  FACTION_IDS,
  isUndoable,
  makeSave,
  parseSave,
  playerView,
  type FactionId,
  type GameState,
  type GameView,
  type Move,
  type SaveFile,
} from '@sotobosque/engine';
import { joinRoom, selfId, type Room } from 'trystero';
import { create } from 'zustand';
import { APP_ID, genRoomCode, getPlayerId, type LobbyInfo, type LobbySeat, type ToHost, type ToPeer } from './net/protocol';

export type Screen = 'landing' | 'menu' | 'lobby' | 'game' | 'studio';
export type Role = 'local' | 'host' | 'peer';
export type ActionKind = 'mover' | 'reclutar' | 'construir' | 'encender' | 'especial' | 'batalla' | 'finetune';

export interface UiState {
  action: ActionKind | null;
  from: number | null;
  glade: number | null;
  count: number;
  selectedCards: number[];
  /** Rival elegido (Ayudar del Redditor). */
  target: FactionId | null;
}

const EMPTY_UI: UiState = { action: null, from: null, glade: null, count: 1, selectedCards: [], target: null };

interface Store {
  screen: Screen;
  role: Role | null;
  name: string;
  playerId: string;
  lobby: LobbyInfo | null;
  view: GameView | null;
  mySeat: number | null;
  canUndo: boolean;
  status: string;
  peers: number;
  toast: string | null;
  ui: UiState;
  hotseatCover: boolean;
  hotseatCoverEnabled: boolean;
  topDown: boolean;
  focusGlade: { id: number; n: number } | null;
  /** Tablero de empresa que se muestra al centro (null = el propio / el del turno). */
  boardTab: FactionId | null;
  boardOpen: boolean;
  helpOpen: boolean;
  /** Carta de la mano abierta en el inspector. */
  inspectCard: number | null;

  setName(name: string): void;
  setUi(p: Partial<UiState>): void;
  resetUi(): void;
  showToast(msg: string): void;
  setTopDown(v: boolean): void;
  focus(id: number): void;
  setHotseatCoverEnabled(v: boolean): void;
  uncover(): void;

  startLocalLobby(): void;
  createRoom(): void;
  joinRoomCode(code: string): void;
  setSeatFaction(i: number, f: FactionId): void;
  setSeatName(i: number, name: string): void;
  addSeat(): void;
  removeSeat(i: number): void;
  claimSeat(i: number): void;
  startGame(): void;
  sendMove(m: Move): void;
  undo(): void;
  loadSaveFile(json: string, asRole: 'local' | 'host'): void;
  resumeAutosave(): void;
  exportSave(): void;
  leave(): void;
}

// ───────────────────────── autoridad (host / local) ─────────────────────────

class Authority {
  state: GameState | null = null;
  undoStack: GameState[] = [];
  seq = 0;
  constructor(
    public roomCode: string,
    public seats: LobbySeat[],
  ) {}

  lobby(): LobbyInfo {
    return { roomCode: this.roomCode, seats: this.seats, started: !!this.state };
  }

  seatOf(playerId: string): number | null {
    const i = this.seats.findIndex((s) => s.ownerId === playerId);
    return i < 0 ? null : i;
  }

  start() {
    this.state = createGame({
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      players: this.seats.map((s, i) => ({ faction: s.faction, name: s.name || `Jugador ${i + 1}` })),
    });
    this.undoStack = [];
  }

  apply(seat: number, m: Move): string | null {
    if (!this.state) return 'La partida no empezó';
    const prev = this.state;
    const r = applyMove(prev, seat, m);
    if (!r.ok) return r.error;
    const sameTurn = r.state.turn === prev.turn && r.state.phase === 'dia';
    if (isUndoable(m) && sameTurn) this.undoStack.push(prev);
    else this.undoStack = [];
    this.state = r.state;
    this.seq++;
    this.persist();
    return null;
  }

  canUndo(seat: number | null): boolean {
    if (!this.state || seat === null || !this.undoStack.length) return false;
    return this.state.factions[this.state.order[this.state.current]]!.seat === seat;
  }

  undo(seat: number): string | null {
    if (!this.canUndo(seat)) return 'No se puede deshacer';
    this.state = this.undoStack.pop()!;
    this.seq++;
    this.persist();
    return null;
  }

  currentSeat(): number {
    const s = this.state!;
    return s.factions[s.order[s.current]]!.seat;
  }

  save(): SaveFile {
    return makeSave(this.state!, this.seats.map((s) => ({ name: s.name, playerId: s.ownerId })));
  }

  persist() {
    if (!this.state) return;
    try {
      localStorage.setItem('carrera-neural.autosave', JSON.stringify({ role: role(), roomCode: this.roomCode, save: this.save() }));
    } catch {
      /* cuota llena: ignorar */
    }
  }
}

let authority: Authority | null = null;
let room: Room | null = null;
let send: ((msg: ToHost | ToPeer, target?: string) => void) | null = null;
/** host: peerId → playerId */
const peerPlayers = new Map<string, string>();
/** host: playerId → nombre anunciado */
const playerNames = new Map<string, string>();
let hostPeerId: string | null = null;
let peerSeq = 0;
let lastStateSeq = -1;

const role = () => useGame.getState().role;

function defaultSeats(n: number): LobbySeat[] {
  return FACTION_IDS.slice(0, n).map((f) => ({ faction: f, name: '', ownerId: null, connected: false }));
}

function openRoom(code: string, onMsg: (msg: ToHost | ToPeer, peerId: string) => void) {
  room?.leave();
  room = joinRoom({ appId: APP_ID, password: `carrera-neural:${code}` }, code);
  const action = room.makeAction<string>('msg');
  send = (msg, target) => void action.send(JSON.stringify(msg), target ? { target } : undefined);
  action.onMessage = (data, ctx) => {
    try {
      onMsg(JSON.parse(data), ctx.peerId);
    } catch (e) {
      console.warn('Mensaje inválido', e);
    }
  };
  return room;
}

// ───────────────────────── host ─────────────────────────

function hostSync() {
  const a = authority!;
  const st = useGame.getState();
  const mySeat = a.seatOf(st.playerId);
  useGame.setState({
    lobby: structuredClone(a.lobby()),
    view: a.state ? playerView(a.state, mySeat) : null,
    mySeat,
    canUndo: a.canUndo(mySeat),
    screen: a.state ? 'game' : 'lobby',
  });
  if (!send) return;
  send({ t: 'lobby', lobby: a.lobby() });
  if (a.state) {
    for (const [peerId, pid] of peerPlayers) {
      const seat = a.seatOf(pid);
      send({ t: 'state', view: playerView(a.state, seat), seat, canUndo: a.canUndo(seat), seq: a.seq }, peerId);
    }
  }
}

function hostOnMessage(msg: ToHost | ToPeer, peerId: string) {
  const a = authority!;
  switch (msg.t) {
    case 'hello': {
      peerPlayers.set(peerId, msg.playerId);
      playerNames.set(msg.playerId, String(msg.name || 'Invitado').slice(0, 20));
      const seat = a.seatOf(msg.playerId);
      if (seat !== null) {
        a.seats[seat].connected = true;
        if (!a.state) a.seats[seat].name = playerNames.get(msg.playerId)!;
      }
      break;
    }
    case 'claim': {
      const pid = peerPlayers.get(peerId);
      if (!pid) return;
      const target = a.seats[msg.seat];
      if (!target || (target.ownerId && target.connected && target.ownerId !== pid)) {
        send?.({ t: 'reject', error: 'Ese asiento está ocupado' }, peerId);
        return;
      }
      for (const s of a.seats) if (s.ownerId === pid) Object.assign(s, { ownerId: null, connected: false });
      target.ownerId = pid;
      target.connected = true;
      if (!a.state) target.name = playerNames.get(pid) ?? 'Invitado';
      break;
    }
    case 'intent': {
      const pid = peerPlayers.get(peerId);
      const seat = pid ? a.seatOf(pid) : null;
      if (seat === null) return void send?.({ t: 'reject', error: 'No tenés asiento' }, peerId);
      if (!msg.move || typeof msg.move !== 'object') return;
      const err = a.apply(seat, msg.move);
      if (err) return void send?.({ t: 'reject', error: err }, peerId);
      break;
    }
    case 'undo': {
      const pid = peerPlayers.get(peerId);
      const seat = pid ? a.seatOf(pid) : null;
      const err = seat === null ? 'No tenés asiento' : a.undo(seat);
      if (err) return void send?.({ t: 'reject', error: err }, peerId);
      break;
    }
    default:
      return;
  }
  hostSync();
}

function startHosting(a: Authority) {
  authority = a;
  peerPlayers.clear();
  const r = openRoom(a.roomCode, hostOnMessage);
  r.onPeerJoin = (peerId) => {
    useGame.setState({ peers: Object.keys(r.getPeers()).length });
    send?.({ t: 'lobby', lobby: a.lobby() }, peerId);
  };
  r.onPeerLeave = (peerId) => {
    const pid = peerPlayers.get(peerId);
    peerPlayers.delete(peerId);
    const seat = pid ? a.seatOf(pid) : null;
    if (seat !== null) a.seats[seat].connected = false;
    useGame.setState({ peers: Object.keys(r.getPeers()).length });
    hostSync();
  };
  const url = new URL(location.href);
  url.searchParams.set('room', a.roomCode);
  history.replaceState(null, '', url);
  useGame.setState({ role: 'host', status: 'Hosteando: esperando jugadores' });
  hostSync();
}

// ───────────────────────── local ─────────────────────────

function localSync(coverOnChange = true) {
  const a = authority!;
  const prevSeat = useGame.getState().mySeat;
  const seat = a.state ? a.currentSeat() : null;
  const st = useGame.getState();
  useGame.setState({
    lobby: structuredClone(a.lobby()),
    view: a.state ? playerView(a.state, seat) : null,
    mySeat: seat,
    canUndo: a.canUndo(seat),
    screen: a.state ? 'game' : 'lobby',
    hotseatCover:
      st.hotseatCover ||
      (coverOnChange && st.hotseatCoverEnabled && a.state?.phase !== 'fin' && prevSeat !== null && seat !== prevSeat),
  });
}

// ───────────────────────── store ─────────────────────────

export const useGame = create<Store>((set, get) => ({
  screen: (() => {
    const q = new URLSearchParams(location.search);
    if (q.has('estudio')) return 'studio';
    if (q.has('room') || q.has('jugar')) return 'menu';
    return 'landing';
  })() as Screen,
  role: null,
  name: localStorage.getItem('carrera-neural.name') ?? '',
  playerId: getPlayerId(),
  lobby: null,
  view: null,
  mySeat: null,
  canUndo: false,
  status: '',
  peers: 0,
  toast: null,
  ui: EMPTY_UI,
  hotseatCover: false,
  hotseatCoverEnabled: true,
  topDown: false,
  focusGlade: null,
  boardTab: null,
  boardOpen: true,
  helpOpen: false,
  inspectCard: null,

  setName(name) {
    localStorage.setItem('carrera-neural.name', name);
    set({ name });
  },
  setUi(p) {
    set({ ui: { ...get().ui, ...p } });
  },
  resetUi() {
    set({ ui: EMPTY_UI });
  },
  showToast(msg) {
    set({ toast: msg });
    window.setTimeout(() => get().toast === msg && set({ toast: null }), 3200);
  },
  setTopDown(v) {
    set({ topDown: v });
  },
  focus(id) {
    set({ focusGlade: { id, n: (get().focusGlade?.n ?? 0) + 1 } });
  },
  setHotseatCoverEnabled(v) {
    set({ hotseatCoverEnabled: v, hotseatCover: v && get().hotseatCover });
  },
  uncover() {
    set({ hotseatCover: false });
  },

  startLocalLobby() {
    room?.leave();
    room = null;
    send = null;
    authority = new Authority('LOCAL', defaultSeats(4));
    set({ role: 'local', status: 'Partida local (hotseat)' });
    localSync();
  },

  createRoom() {
    const a = new Authority(genRoomCode(), defaultSeats(4));
    a.seats[0].ownerId = get().playerId;
    a.seats[0].name = get().name || 'Host';
    a.seats[0].connected = true;
    startHosting(a);
  },

  joinRoomCode(code) {
    code = code.trim().toUpperCase();
    if (!code) return;
    authority = null;
    hostPeerId = null;
    lastStateSeq = -1;
    const r = openRoom(code, (msg, peerId) => {
      if (msg.t === 'hello' || msg.t === 'claim' || msg.t === 'intent' || msg.t === 'undo') return;
      if (hostPeerId && peerId !== hostPeerId) return;
      if (msg.t === 'lobby') {
        hostPeerId = peerId;
        set({ lobby: msg.lobby, status: 'Conectado al host', screen: msg.lobby.started ? get().screen : 'lobby' });
      } else if (msg.t === 'state') {
        if (msg.seq < lastStateSeq) return;
        lastStateSeq = msg.seq;
        set({ view: msg.view, mySeat: msg.seat, canUndo: msg.canUndo, screen: 'game' });
        if (get().ui.action) {
          // conservar la selección sólo si sigue siendo nuestro turno
          const v = msg.view;
          if (v.factions[v.order[v.current]]?.seat !== msg.seat) get().resetUi();
        }
      } else if (msg.t === 'reject') {
        get().showToast(msg.error);
      }
    });
    r.onPeerJoin = (peerId) => {
      set({ peers: Object.keys(r.getPeers()).length });
      send?.({ t: 'hello', name: get().name || 'Invitado', playerId: get().playerId }, peerId);
    };
    r.onPeerLeave = (peerId) => {
      set({ peers: Object.keys(r.getPeers()).length });
      if (peerId === hostPeerId) {
        hostPeerId = null;
        set({ status: 'Se desconectó el host. Esperando que vuelva…' });
      }
    };
    const url = new URL(location.href);
    url.searchParams.set('room', code);
    history.replaceState(null, '', url);
    set({ role: 'peer', screen: 'lobby', lobby: null, view: null, status: `Buscando la sala ${code}…` });
  },

  setSeatFaction(i, f) {
    const a = authority;
    if (!a || a.state) return;
    const other = a.seats.findIndex((s) => s.faction === f);
    if (other >= 0) a.seats[other].faction = a.seats[i].faction;
    a.seats[i].faction = f;
    sync();
  },
  setSeatName(i, name) {
    const a = authority;
    if (!a || a.state) return;
    a.seats[i].name = name;
    sync();
  },
  addSeat() {
    const a = authority;
    if (!a || a.state || a.seats.length >= 4) return;
    const free = FACTION_IDS.find((f) => !a.seats.some((s) => s.faction === f))!;
    a.seats.push({ faction: free, name: '', ownerId: null, connected: false });
    sync();
  },
  removeSeat(i) {
    const a = authority;
    if (!a || a.state || a.seats.length <= 2) return;
    a.seats.splice(i, 1);
    sync();
  },
  claimSeat(i) {
    const st = get();
    if (st.role === 'peer') return void send?.({ t: 'claim', seat: i }, hostPeerId ?? undefined);
    const a = authority;
    if (!a) return;
    if (a.seats[i].ownerId && a.seats[i].connected && a.seats[i].ownerId !== st.playerId) return;
    for (const s of a.seats) if (s.ownerId === st.playerId) Object.assign(s, { ownerId: null, connected: false });
    a.seats[i].ownerId = st.playerId;
    a.seats[i].connected = true;
    if (!a.state) a.seats[i].name = st.name || 'Host';
    sync();
  },
  startGame() {
    const a = authority;
    if (!a || a.state) return;
    a.start();
    a.persist();
    set({ ui: EMPTY_UI, hotseatCover: get().role === 'local' && get().hotseatCoverEnabled });
    sync(false);
  },

  sendMove(m) {
    const st = get();
    set({ ui: EMPTY_UI });
    if (st.role === 'peer') {
      send?.({ t: 'intent', move: m, seq: ++peerSeq }, hostPeerId ?? undefined);
      return;
    }
    const a = authority;
    if (!a || st.mySeat === null) return;
    const err = a.apply(st.mySeat, m);
    if (err) st.showToast(err);
    sync();
  },
  undo() {
    const st = get();
    set({ ui: EMPTY_UI });
    if (st.role === 'peer') return void send?.({ t: 'undo' }, hostPeerId ?? undefined);
    const a = authority;
    if (!a || st.mySeat === null) return;
    const err = a.undo(st.mySeat);
    if (err) st.showToast(err);
    sync(false);
  },

  loadSaveFile(json, asRole) {
    let save: SaveFile;
    try {
      save = parseSave(json);
    } catch (e) {
      get().showToast((e as Error).message);
      return;
    }
    const code = asRole === 'local' ? 'LOCAL' : genRoomCode();
    restore(save, code, asRole);
  },

  resumeAutosave() {
    const raw = localStorage.getItem('carrera-neural.autosave');
    if (!raw) return;
    try {
      const { role: r, roomCode, save } = JSON.parse(raw) as { role: Role; roomCode: string; save: SaveFile };
      restore(save, r === 'host' ? roomCode : 'LOCAL', r === 'host' ? 'host' : 'local');
    } catch {
      get().showToast('No se pudo leer el autoguardado');
    }
  },

  exportSave() {
    const a = authority;
    if (!a?.state) return;
    const blob = new Blob([JSON.stringify(a.save(), null, 1)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `carrera-neural-turno${a.state.turn}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  leave() {
    room?.leave();
    room = null;
    send = null;
    authority = null;
    peerPlayers.clear();
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
    set({ screen: 'menu', role: null, lobby: null, view: null, mySeat: null, ui: EMPTY_UI, status: '', peers: 0 });
  },
}));

function restore(save: SaveFile, code: string, asRole: 'local' | 'host') {
  const st = save.state;
  const seats: LobbySeat[] = st.order.map((f, i) => ({
    faction: f,
    name: save.seats[i]?.name || st.factions[f]!.playerName,
    ownerId: save.seats[i]?.playerId ?? null,
    connected: false,
  }));
  const a = new Authority(code, seats);
  a.state = st;
  const me = useGame.getState().playerId;
  if (asRole === 'host') {
    if (a.seatOf(me) === null) seats[0].ownerId = me;
    seats[a.seatOf(me)!].connected = true;
    startHosting(a);
  } else {
    authority = a;
    room?.leave();
    room = null;
    send = null;
    useGame.setState({ role: 'local', status: 'Partida local (hotseat)' });
    localSync(false);
  }
}

function sync(coverOnChange = true) {
  if (role() === 'local') localSync(coverOnChange);
  else hostSync();
}

export const myPeerId = selfId;

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
