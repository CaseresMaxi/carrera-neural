import { expect, it } from 'vitest';
import { applyMove, createGame, GLADES, validateMove, type Move } from '../src';
// Bot codicioso simple: construir/encender > batallar > reclutar > mover > terminar.
// Rota los asientos para no sesgar por posición. Guarda contra regresiones de balance groseras.
it('balance: ninguna facción gana <10% ni >45% con bots heurísticos', () => {
  const wins: Record<string, number> = {}; let turns = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const all = ['google', 'meta', 'anthropic', 'openai', 'deepseek', 'redditor'] as const;
    // 4 de las 6 facciones (15 combinaciones), rotando quiénes quedan afuera y el orden de asientos
    const combos: number[][] = [];
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) combos.push([a, b]);
    const out = combos[seed % 15];
    const four = all.filter((_, i) => !out.includes(i));
    const rot = [...four.slice(seed % 4), ...four.slice(0, seed % 4)];
    let s = createGame({ seed, players: rot.map(f => ({ faction: f, name: f })) });
    let r = seed;
    const rand = (k: number) => ((r = (r * 1103515245 + 12345) & 0x7fffffff) % k);
    for (let i = 0; i < 3000 && s.phase !== 'fin'; i++) {
      const f = s.order[s.current]; const seat = s.factions[f]!.seat; const hand = s.factions[f]!.hand;
      const tiers: Move[][] = [[], [], [], [], []];
      if (s.phase === 'descarte') { s = (applyMove(s, seat, { type: 'descartar', cards: hand.slice(5).map(c => c.id) }) as any).state; continue; }
      for (const g of GLADES) {
        const nomad = f === 'redditor';
        for (const c of hand) { tiers[0].push({ type: 'construir', glade: g.id, card: c.id }, { type: 'encender', glade: g.id, card: c.id }, { type: 'especial', glade: g.id, card: c.id }, { type: 'finetune', glade: g.id, card: c.id }); tiers[2].push({ type: 'reclutar', glade: g.id, card: c.id }); }
        for (const o of s.order) if ((s.glades[g.id].warriors[f] ?? 0) >= (nomad ? 1 : 2)) tiers[1].push({ type: 'batalla', glade: g.id, target: o });
        for (const t of GLADES) { const w = s.glades[g.id].warriors[f] ?? 0; if (w > (nomad ? 0 : 1)) tiers[3].push({ type: 'mover', from: g.id, to: t.id, count: Math.ceil(w / 2) }); }
      }
      tiers[2].push({ type: 'scrapear' });
      let pick: Move = { type: 'terminarDia' };
      for (const t of tiers) { const legal = t.filter(m => validateMove(s, seat, m) === null); if (legal.length && rand(3) > 0) { pick = legal[rand(legal.length)]; break; } }
      s = (applyMove(s, seat, pick) as any).state;
    }
    const w = s.winner ?? 'none'; wins[w] = (wins[w] ?? 0) + 1; if (s.winner) { turns += s.turn; n++; }
  }
  // cada facción juega 200 de las 300 partidas (50 victorias = 25% de base)
  if ((globalThis as { process?: { env: Record<string, string> } }).process?.env.BALANCE_DEBUG) console.log(JSON.stringify(wins), turns / n);
  for (const f of ['google', 'meta', 'anthropic', 'openai', 'deepseek', 'redditor']) {
    expect(wins[f] ?? 0).toBeGreaterThan(20);
    expect(wins[f] ?? 0).toBeLessThan(95);
  }
  expect(turns / n).toBeLessThan(60);
}, 120000);
