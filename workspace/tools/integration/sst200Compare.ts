// sst200 (docs/sst200-second-stat-rows.md): the ROM's stat-chain print rows (sst200RomRows.py receipt) vs production's command timeline for the same
// staged scenario (PRIMEAPE vs ONIX, every ONIX slot Tackle), both scenes. Production rows come from lsd194Production.ts (real kernel + projectBattleResolutionCommands).
//   python3 tools/integration/sst200RomRows.py tools/integration/fixtures/sst200/rom/*-r1.json > tools/integration/fixtures/sst200/rom-rows.json
//   node --experimental-strip-types --no-warnings tools/integration/sst200Compare.ts tools/integration/fixtures/sst200/rom-rows.json tools/integration/fixtures/sst200/production-vs-rom.json
import { readFileSync, writeFileSync } from "node:fs";
import { MONS, lsd194Production } from "./lsd194Production.ts";

// parity-mac: `playerSelf` -- the PLAYER's move menu sends a non-Ghost Curse with the user as its target (HandleInputChooseMove,
// battle_controller_player.c:486-501); the opponent's Curse keeps the foe (docs/parity-mac/curse-player-target.md).
export const SST200_MOVES: Record<string, { id: number; self: boolean; playerSelf?: boolean }> = {
  tickle: { id: 321, self: false }, memento: { id: 262, self: false }, superpower: { id: 276, self: false }, "silver-wind": { id: 318, self: false },
  "ancient-power": { id: 246, self: false }, "calm-mind": { id: 347, self: true }, "dragon-dance": { id: 349, self: true },
  "cosmic-power": { id: 322, self: true }, curse: { id: 174, self: false, playerSelf: true },
};

type Row = { type: string; start: number; dur: number; lines: string[] | null; timing: { minimumFrames?: number; holdFrames?: number } | null };

// The chain = the first run of `message` commands that are each directly preceded by a `stat` command (a stat print); `next` = the next message after it.
export function chainOf(rows: readonly Row[]) {
  const chain: number[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i]!.type === "message" && rows[i - 1]!.type === "stat") chain.push(i);
    else if (chain.length > 0 && rows[i]!.type !== "stat" && rows[i]!.type !== "message") break;
    else if (chain.length > 0 && rows[i]!.type === "message" && rows[i - 1]!.type !== "stat") break;
  }
  const last = chain[chain.length - 1]!;
  const next = rows.findIndex((r, i) => i > last && r.type === "message");
  return { chain, next };
}

export function productionFor(move: string, scene: "on" | "off", wanted: number, from = 1, foe = false) {
  const m = SST200_MOVES[move]!;
  for (let seed = from; seed <= 800; seed += 1) {
    let rows: Row[];
    try { rows = lsd194Production({ scene, seed, player: MONS.PRIMEAPE, opponent: MONS.ONIX, pMove: foe ? 33 : m.id, oMove: foe ? m.id : 33, pSelf: foe ? false : (m.playerSelf ?? m.self), oSelf: foe ? m.self : false }).rows as Row[]; } catch { continue; }
    const c = chainOf(rows);
    if (c.chain.length === wanted) return { seed, rows, ...c };
  }
  throw new Error(`no production seed with a ${wanted}-print chain for ${move}`);
}

if (process.argv[1]?.endsWith("sst200Compare.ts")) {
  const rom = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Record<string, { move: string; foe?: boolean; chain: { F: number; first: number; last: number }[]; next: { kind: string; F: number; label: string } | null }>;
  const out: any[] = [];
  let nonzero = 0;
  for (const [file, r] of Object.entries(rom)) {
    const scene = file.includes("-on-r1") ? "on" as const : "off" as const;
    const p = productionFor(r.move, scene, r.chain.length, 1, r.foe === true);
    const start = (i: number) => p.rows[i]!.start;
    const gaps = r.chain.slice(1).map((c, k) => {
      const romGap = c.F - r.chain[k]!.F, prodGap = start(p.chain[k + 1]!) - start(p.chain[k]!);
      return { print: k + 2, rom: romGap, production: prodGap, residual: prodGap - romGap, stat: p.rows[p.chain[k + 1]! - 1]!.dur, lines: p.rows[p.chain[k + 1]!]!.lines };
    });
    const lastRom = r.chain[r.chain.length - 1]!;
    const nextRow = !r.foe && p.next >= 0 ? p.rows[p.next]! : null;
    const nextGap = nextRow && r.next ? { rom: r.next.F - lastRom.F, production: nextRow.start - start(p.chain[p.chain.length - 1]!), kind: r.next.kind, romLabel: r.next.label, lines: nextRow.lines } : null;
    const nextResidual = nextGap ? nextGap.production - nextGap.rom : null;
    const row = { move: r.move, scene, productionSeed: p.seed, gaps, next: nextGap && { ...nextGap, residual: nextResidual } };
    nonzero += gaps.filter((g) => g.residual !== 0).length + (nextGap !== null && nextResidual !== 0 ? 1 : 0);
    out.push(row);
    console.log((r.foe ? "foe-" : "") + r.move.padEnd(14), scene, "seed", String(p.seed).padStart(3), "gaps rom/prod/res", gaps.map((g) => `${g.rom}/${g.production}/${g.residual}`).join(" "), "| next", nextGap ? `${nextGap.rom}/${nextGap.production}/${nextResidual}` : "none", JSON.stringify(nextRow?.lines ?? null));
  }
  writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
  console.log("cases", out.length, "nonzero residuals", nonzero);
}
