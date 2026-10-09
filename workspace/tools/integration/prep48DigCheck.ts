// prep48: every Dig / Return body of the prep48 scenarios through the PRODUCTION live renderer (liveAdapterFramebuffer.ts:
// verifyLiveAdapterFramebuffer, two fresh direct-mGBA probe processes per scenario, POKEBENCH_LIVE_PROBE_SHARE=1) plus the protected
// history state at activation read from the same probe output (prep48Probe.py `at` / `pre`): every register that differs from S0, the
// body's monbg layer BGxCNT vs S0, the scanline header / retained lines vs S0, the matrix bitmap / sprite palette + tile tags vs the battle's first body of the same move,
// and the production lend (spriteOrderWithOccupiedPrefix of the lent free order) vs the ROM sSpriteOrder at activation.
//   [--live-only] POKEBENCH_LIVE_PROBE_SHARE=1 POKEBENCH_LIVE_ORDER_HIT=damaging node --experimental-strip-types tools/integration/prep48DigCheck.ts <fixture-dir> <out.json>
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { liveView, verifyLiveAdapterFramebuffer, type Fixture } from "./liveAdapterFramebuffer.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";

const [dir, out] = process.argv.slice(2) as [string, string];
// --live-only: only whether the PRODUCTION presentation is non-null at age 0 for each fixture (no probe; the before-patch control).
const liveOnly = process.argv.includes("--live-only");
/** The first-body register state S0 (liveOamMoves.ts S0_REGISTERS; the probe reads these 16 of its fields). */
const S0: Record<string, number> = { dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b, bg1hofs: 0, bg1vofs: 0,
  bg2hofs: 0, bg2vofs: 0, win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, bldcnt: 0, bldalpha: 0, bldy: 0 };
const S0_SCAN_BANK0 = [...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)];
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
type Json = Record<string, any>;
const rows: Json[] = [];
const probeShas = new Map<string, string[]>();
const scratches = new Set<string>();
for (const name of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
  const path = join(dir, name);
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & Json;
  if (liveOnly) {
    const view = liveView(f, 0), e = view.effect as Json;
    rows.push({ fixture: name, firstBody: !f.precedingBodies?.length, live: liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput,
      e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng, e.battlerX2Input) !== null });
    continue;
  }
  const results = verifyLiveAdapterFramebuffer(path, 2);
  const probes = results.map((r) => readFileSync(join(r.scratch as string, "probe.json"), "utf8"));
  probeShas.set(f.scenario, probes.map(sha));
  const probe = JSON.parse(probes[0]!) as Json;
  const body = (probe.bodies as Json[]).find((b) => b.startFrame === f.denseWindow!.startFrame)!;
  const firstDig = (probe.bodies as Json[]).find((b) => b.label === body.label && b.attacker === body.attacker)!;
  const view = liveView(f, 0), e = view.effect as Json;
  const presentation = liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input);
  const lent = e.spriteOrderInput?.known ? spriteOrderWithOccupiedPrefix({ known: true, free: e.spriteOrderInput.free, pendingDestroyed: [] },
    KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) : null;
  const at = body.at, side = f.attacker.geometry.side;
  // The body's monbg layer: Dig copies the ATTACKER (player bg2 / opponent bg1), Return the TARGET (opponent target bg1 / player bg2).
  const monbgSide = f.move === "DIG" ? side : f.target.geometry.side;
  const layer = monbgSide === "player" ? "bg2cnt" : "bg1cnt", s0Cnt = S0[layer]!;
  const banks = at.scanline.banks as number[][];
  const differsFromS0 = (bank: number[], ref: number[]) => bank.slice(0, 160).reduce((n, v, i) => n + (v !== ref[i] ? 1 : 0), 0);
  rows.push({
    fixture: name, body: f.requestFields?.turn === 1 ? "unleash" : "setup", side, attacker: f.attacker.species, target: f.target.species,
    firstBody: !f.precedingBodies?.length, preceding: (f.precedingBodies ?? []).map((u: Json) => u.statAnimation !== undefined ? `S${u.statAnimation}` : `B${u.moveId}${u.side[0]}`).join(" "),
    window: [f.denseWindow!.startFrame, f.denseWindow!.endFrame], live: presentation !== null,
    runs: results.map((r) => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest.slice(0, 16) })),
    state: {
      monbgCnt: at.registers[layer], monbgCntS0: s0Cnt, monbgCntIsS0: at.registers[layer] === s0Cnt,
      otherCnt: at.registers[layer === "bg2cnt" ? "bg1cnt" : "bg2cnt"], dispcnt: at.registers.dispcnt,
      registersNotS0: Object.fromEntries(Object.entries(at.registers as Record<string, number>).filter(([k, v]) => S0[k] !== v)),
      scanline: { state: at.scanline.state, srcBuffer: at.scanline.srcBuffer, dmaDest: at.scanline.dmaDest, dmaControl: at.scanline.dmaControl,
        bank0LinesNotS0: differsFromS0(banks[0]!, S0_SCAN_BANK0), bank1LinesNotS0: differsFromS0(banks[1]!, Array(160).fill(0)) },
      matrixBitmap: at.matrixBitmap, allocatorAsFirstDig: JSON.stringify([at.paletteTags, at.tileTagsSha, at.tileBitmapSha, at.matrixBitmap, at.tasks])
        === JSON.stringify([firstDig.at.paletteTags, firstDig.at.tileTagsSha, firstDig.at.tileBitmapSha, firstDig.at.matrixBitmap, firstDig.at.tasks]),
      bgMapsAsFirstDig: JSON.stringify(at.bgMapSha) === JSON.stringify(firstDig.at.bgMapSha),
      lentOrderEqualsRom: lent === null ? null : JSON.stringify(lent) === JSON.stringify(at.spriteOrder),
      // ROM battler sprite x2/y2 at activation (player, opponent) vs the production x2 tracker's input (zeroed sides; else the species rest).
      romX2: (at.battlerSprites as Json[]).map((b) => [b.x2, b.y2]), trackedX2: e.battlerX2Input ?? null,
    },
  });
  for (const r of results) scratches.add(r.scratch as string);
  const last = rows.at(-1)!;
  process.stderr.write(`${name}: live ${last.live} ${last.runs.map((r: Json) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" | ")} order ${last.state.lentOrderEqualsRom}\n`);
}
const probeDeterminism = [...probeShas].map(([scenario, s]) => ({ scenario: scenario.split("/").at(-1), r1: s[0], r2: s[1], same: s[0] === s[1] }));
for (const s of scratches) rmSync(s, { recursive: true, force: true });
writeFileSync(out, JSON.stringify({ schema: "prep48-dig-check/v1", probeDeterminism, rows }, null, 1) + "\n");
