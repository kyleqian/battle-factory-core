// prep34: the accepted Memento reducer (src/animation/memento.ts, unchanged) fed ONLY production-derivable inputs, checked field by
// field against complete direct-mGBA windows (activation .. first inactive row). The activation scanline state is the production
// FIRST_BODY_SCANLINE constant (src/engine/liveOamMoves.ts:822: srcBuffer 1, bank 0 = 80 x +2 / 80 x -2 / 160 x 0, bank 1 zero) —
// never the captured RAM. Scanline buffers are compared both ABSOLUTELY and RELATIVE to srcBuffer (bank relabeling: [buffers[src],
// buffers[src ^ 1]] and src XOR src(row 0)), because the renderer reads only buffers[srcBuffer] (battleScene.ts:29387).
// usage: vite-node prep34MementoCheck.ts <probe.json> ... [--scanline=first-body|captured|swapped|zero] [--neg=top|bgx] [--out=receipt.json]
import { readFileSync, writeFileSync } from "node:fs";
import { reduceMemento, type MementoBattlerConfig, type MementoConfig, type MementoState } from "../../src/animation/memento.ts";
import { battlerConfig, FIRST_BODY, neg, productionConfig, same, scanlineMode, type Row } from "./prep34MementoLib.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const out = flag("out");
const probes = args.filter((a) => !a.startsWith("--"));

function source(row: Row, config: MementoConfig) {
  const task = row.tasks[0] ? { name: row.tasks[0].func.symbol, data: row.tasks[0].data } : null;
  const bgOf = (c: MementoBattlerConfig) => c.bg === "BG1"
    ? row.battleBg.gBattle_BG1_X === c.bgX && row.battleBg.gBattle_BG1_Y === c.bgY
    : row.battleBg.gBattle_BG2_X === c.bgX && row.battleBg.gBattle_BG2_Y === c.bgY;
  return {
    active: row.gAnimScriptActive, scriptOffset: row.scriptOffset, visualTaskCount: row.visualTaskCount, task,
    scanline: { srcBuffer: row.scanline.srcBuffer, state: row.scanline.state, dmaDest: row.scanline.dmaDest, dmaControl: row.scanline.dmaControl,
      setFirstScanlineReg: row.scanline.setFirstScanlineReg, buffers: row.scanlineBuffers },
    battleBg: { bg1X: row.battleBg.gBattle_BG1_X, bg1Y: row.battleBg.gBattle_BG1_Y, bg2X: row.battleBg.gBattle_BG2_X, bg2Y: row.battleBg.gBattle_BG2_Y,
      win0h: row.battleBg.gBattle_WIN0H, win0v: row.battleBg.gBattle_WIN0V },
    monbg: { attacker: bgOf(config.attacker), target: bgOf(config.target) },
    registers: { win0h: row.registers.win0h, win0v: row.registers.win0v, winin: row.registers.winin, winout: row.registers.winout,
      bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha },
    battlerPriority: { attacker: (row.battlerSprites.attacker.attr[2] >>> 10) & 3, target: (row.battlerSprites.target.attr[2] >>> 10) & 3 },
    blackBgPaletteIds: [8, 9].filter((id) => row.unfadedPalette.slice(id * 16, id * 16 + 16).every((v: number) => v === 0)),
  };
}
const relative = (s: { srcBuffer: number; buffers: number[][] }, src0: number) =>
  ({ parity: s.srcBuffer ^ src0, current: s.buffers[s.srcBuffer], other: s.buffers[s.srcBuffer ^ 1] });

const windows = [];
for (const probe of probes) {
  const data = JSON.parse(readFileSync(probe, "utf8")) as { frames: Row[] };
  const first = data.frames[0]!;
  const config = productionConfig(first);
  const reduced: readonly MementoState[] = reduceMemento(config);
  const fields: Record<string, { ok: number; total: number; first: unknown[] }> = {};
  const check = (field: string, row: number, expected: unknown, actual: unknown) => {
    const f = (fields[field] ??= { ok: 0, total: 0, first: [] }); f.total += 1;
    // compact receipts: large values (scanline banks) are recorded as a 200-char prefix of their JSON.
    const brief = (v: unknown) => { const j = JSON.stringify(v) ?? "null"; return j.length > 200 ? `${j.slice(0, 200)}...` : v; };
    if (same(expected, actual)) f.ok += 1; else if (f.first.length < 4) f.first.push({ row, expected: brief(expected), actual: brief(actual) });
  };
  const rows = Math.max(reduced.length, data.frames.length);
  for (let row = 0; row < rows; row += 1) {
    const r = data.frames[row]; const m = reduced[row];
    if (!r || !m) { check("windowLength", row, m ? "reducer row" : null, r ? "rom row" : null); continue; }
    const s = source(r, config);
    for (const key of ["active", "scriptOffset", "visualTaskCount", "task", "battleBg", "monbg", "registers", "battlerPriority", "blackBgPaletteIds"] as const) {
      check(key, row, (m as any)[key], (s as any)[key]);
    }
    const { buffers: mb, srcBuffer: msrc, ...mScan } = m.scanline;
    const { buffers: sb, srcBuffer: ssrc, ...sScan } = s.scanline;
    check("scanlineRegs", row, mScan, sScan);
    check("scanlineAbsolute", row, { srcBuffer: msrc, buffers: mb }, { srcBuffer: ssrc, buffers: sb });
    const mr = relative({ srcBuffer: msrc, buffers: mb as number[][] }, config.initialScanlineSourceBuffer);
    const sr = relative({ srcBuffer: ssrc, buffers: sb }, first.scanline.srcBuffer);
    check("scanlineRelative", row, mr, sr);
    // what reaches the display: the current bank's scanlines 0..159 (HBlank DMA source) while the effect runs.
    check("scanlineDisplayed", row, m.scanline.state === 0 ? null : mr.current!.slice(0, 160), s.scanline.state === 0 ? null : sr.current.slice(0, 160));
  }
  const relevant = Object.entries(fields).filter(([k]) => k !== "scanlineAbsolute");
  const a = battlerConfig(first, "attacker"); const t = battlerConfig(first, "target");
  windows.push({
    probe: probe.split("/").pop(), attacker: `${a.species} ${a.side}`, target: `${t.species} ${t.side}`, rows: data.frames.length, reducerRows: reduced.length,
    activationScanline: { srcBuffer: first.scanline.srcBuffer, state: first.scanline.state, dmaDest: first.scanline.dmaDest,
      relativeToFirstBody: same(first.scanlineBuffers[first.scanline.srcBuffer], FIRST_BODY.buffers[FIRST_BODY.srcBuffer])
        && same(first.scanlineBuffers[first.scanline.srcBuffer ^ 1], FIRST_BODY.buffers[FIRST_BODY.srcBuffer ^ 1]),
      absoluteFirstBody: first.scanline.srcBuffer === 1 && same(first.scanlineBuffers, FIRST_BODY.buffers) },
    inputs: { attacker: a, target: t },
    fieldRows: `${relevant.reduce((x, [, f]) => x + f.ok, 0)}/${relevant.reduce((x, [, f]) => x + f.total, 0)} (excluding scanlineAbsolute)`,
    fields,
  });
}
const receipt = { schema: "prep34-memento-check/v1", scanline: scanlineMode, neg: neg ?? null, windows };
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
for (const w of windows) {
  console.log(`${w.probe} ${w.attacker} -> ${w.target}: rows ${w.rows}/${w.reducerRows} ${w.fieldRows}; entry rel ${w.activationScanline.relativeToFirstBody} abs ${w.activationScanline.absoluteFirstBody}`);
  for (const [k, f] of Object.entries(w.fields)) if (f.ok !== f.total) console.log(`  ${k} ${f.ok}/${f.total} first row ${JSON.stringify((f.first[0] as any)?.row)}`);
}
