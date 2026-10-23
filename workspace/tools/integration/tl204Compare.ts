// tl204 (docs/tl204-zero-tail-rows.md): the ROM's Scene ON rows around the live body of the 0-frame-tail no-hit moves (tl204RomRows.py receipt) vs production's
// command timeline for the same staged scenario (PRIMEAPE vs ONIX, every ONIX slot Tackle; lsd194Production.ts = real kernel + projectBattleResolutionCommands, Scene ON).
// Gaps are start-to-start in production and first-glyph-to-first-glyph in the ROM (every print involved types its first glyph on run row 1, so the offsets cancel):
//   used->print = the "<MON> used <MOVE>!" print to the stat / weather / screen / seed print that follows the body; print->next = that print (chain end) to the foe's "used TACKLE!".
//   python3 tools/integration/tl204RomRows.py tools/integration/fixtures/tl204/rom/*-r1.json > tools/integration/fixtures/tl204/rom-rows.json
//   node --experimental-strip-types --no-warnings tools/integration/tl204Compare.ts tools/integration/fixtures/tl204/rom-rows.json tools/integration/fixtures/tl204/production-vs-rom.json
import { readFileSync, writeFileSync } from "node:fs";
import { MONS, lsd194Production } from "./lsd194Production.ts";

export const TL204_MOVES: Record<string, { id: number; self: boolean }> = {
  "double-team": { id: 104, self: true }, "rain-dance": { id: 240, self: true }, "scary-face": { id: 184, self: false }, "light-screen": { id: 113, self: true },
  "calm-mind": { id: 347, self: true }, "sunny-day": { id: 241, self: true }, charm: { id: 204, self: false }, "fake-tears": { id: 313, self: false },
  "leech-seed": { id: 73, self: false }, hail: { id: 258, self: true },
};

type Row = { type: string; start: number; dur: number; lines: string[] | null; timing: { minimumFrames?: number; holdFrames?: number; scriptTailRows?: number } | null };
type Rom = { move: string; usedF: number; usedRunStart: number; usedRunEnd: number; printF: number; printRunStart: number; printRunEnd: number; chainF: number[]; nextF: number; segments: { kind: string; label: string; start: number; end: number; len: number }[] };

const isPrint = (r: Row) => r.type === "message" && r.timing?.holdFrames === 64;
const FAILED = /failed|missed|But/;

export function productionFor(move: string, chain: number) {
  const m = TL204_MOVES[move]!;
  for (let seed = 1; seed <= 400; seed += 1) {
    let rows: Row[];
    try { rows = lsd194Production({ scene: "on", seed, player: MONS.PRIMEAPE, opponent: MONS.ONIX, pMove: m.id, oMove: 33, pSelf: m.self }).rows as Row[]; } catch { continue; }
    const used = rows[0]!;
    const p = rows.findIndex(isPrint);
    if (used.type !== "message" || p < 0 || FAILED.test((rows[p]!.lines ?? []).join(" "))) continue;
    const prints = [p];
    while (rows.slice(prints[prints.length - 1]! + 1).findIndex((r) => r.type !== "stat" && r.type !== "message" && r.type !== "stats-change") > 0 || false) break;
    for (let i = p + 1, last = p; i < rows.length; i += 1) {
      if (isPrint(rows[i]!) && rows.slice(last + 1, i).every((r) => r.type === "stat" || r.type === "stats-change")) { prints.push(i); last = i; } else if (isPrint(rows[i]!) || rows[i]!.type === "move-animation") break;
    }
    if (prints.length !== chain) continue;
    const nxt = rows.findIndex((r, i) => i > prints[prints.length - 1]! && r.type === "message" && (r.lines ?? [])[0]?.startsWith("Foe ONIX used"));
    if (nxt < 0) continue;
    return { seed, rows, p, prints, nxt };
  }
  throw new Error(`no production seed for ${move}`);
}

if (process.argv[1]?.endsWith("tl204Compare.ts")) {
  const rom = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Record<string, Rom>;
  const out: any[] = [];
  let nonzero = 0;
  for (const [file, r] of Object.entries(rom)) {
    const p = productionFor(r.move, r.chainF.length);
    const used = p.rows[0]!, first = p.rows[p.p]!, last = p.rows[p.prints[p.prints.length - 1]!]!, nxt = p.rows[p.nxt]!;
    const windows = r.segments.filter((s) => s.kind === "window");
    const body = p.rows.slice(1, p.p).find((x) => x.type === "move-animation" || x.type === "stats-change")!;
    const bodyRows = p.rows.slice(1, p.p).filter((x) => x.type === "move-animation" || x.type === "stats-change");
    const romChain = r.chainF.map((f, i) => (i ? f - r.chainF[i - 1]! : f - r.usedF));
    const prodChain = p.prints.map((idx, i) => p.rows[idx]!.start - (i ? p.rows[p.prints[i - 1]!]!.start : used.start));
    const row = {
      move: r.move, productionSeed: p.seed, firstPrint: first.lines, tailRows: bodyRows[0]?.timing?.scriptTailRows ?? null,
      usedToPrint: { rom: r.printF - r.usedF, production: first.start - used.start, residual: first.start - used.start - (r.printF - r.usedF) },
      printToNext: { rom: r.nextF - r.chainF[r.chainF.length - 1]!, production: nxt.start - last.start, residual: nxt.start - last.start - (r.nextF - r.chainF[r.chainF.length - 1]!) },
      chainGaps: { rom: romChain, production: prodChain },
      decomposition: {
        usedPrint: { rom: r.usedRunEnd - r.usedRunStart, production: used.dur },
        preBody: { rom: windows[0]!.start - r.usedRunEnd, production: body.start - (used.start + used.dur) },
        bodyToPrint: { rom: r.printRunStart - windows[0]!.start, production: first.start - body.start },
        romSegments: r.segments.map((s) => `${s.kind}:${s.label.replace("BattleScript_", "")}:${s.len}`),
        productionCommands: p.rows.slice(0, p.p + 1).map((x) => `${x.type}:${x.dur}`),
      },
      romRelease: { releaseRow: r.segments.filter((s) => s.kind === "window").slice(-1)[0]!.end, printRunStart: r.printRunStart },
    };
    nonzero += (row.usedToPrint.residual !== 0 ? 1 : 0) + (row.printToNext.residual !== 0 ? 1 : 0);
    out.push(row);
    console.log(r.move.padEnd(13), "seed", String(p.seed).padStart(3), "used->print rom/prod/res", `${row.usedToPrint.rom}/${row.usedToPrint.production}/${row.usedToPrint.residual}`, "| print->next", `${row.printToNext.rom}/${row.printToNext.production}/${row.printToNext.residual}`, "| pre", `${row.decomposition.preBody.rom}/${row.decomposition.preBody.production}`, "body->print", `${row.decomposition.bodyToPrint.rom}/${row.decomposition.bodyToPrint.production}`, JSON.stringify(first.lines));
  }
  writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
  console.log("cases", out.length, "nonzero residuals", nonzero);
}
