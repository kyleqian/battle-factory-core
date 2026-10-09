// prep48: every Dig body of the prep48 Dig scenarios through the PRODUCTION live renderer (liveAdapterFramebuffer.ts:
// verifyLiveAdapterFramebuffer, two fresh direct-mGBA probe processes per scenario, POKEBENCH_LIVE_PROBE_SHARE=1) plus the protected
// history state at activation read from the same probe output (prep48Probe.py `at` / `pre`): the monbg layer's BGxCNT vs the first-body
// constant S0, the scanline header / retained lines vs S0, the matrix bitmap / sprite palette + tile tags vs the battle's first Dig body,
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
  const firstDig = (probe.bodies as Json[]).find((b) => b.label === "Move_DIG" && b.attacker === body.attacker)!;
  const view = liveView(f, 0), e = view.effect as Json;
  const presentation = liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input);
  const lent = e.spriteOrderInput?.known ? spriteOrderWithOccupiedPrefix({ known: true, free: e.spriteOrderInput.free, pendingDestroyed: [] },
    KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) : null;
  const at = body.at, side = f.attacker.geometry.side, layer = side === "player" ? "bg2cnt" : "bg1cnt";
  const s0Cnt = side === "player" ? 0x5e00 : 0x9c00;
  const banks = at.scanline.banks as number[][];
  const differsFromS0 = (bank: number[], ref: number[]) => bank.slice(0, 160).reduce((n, v, i) => n + (v !== ref[i] ? 1 : 0), 0);
  rows.push({
    fixture: name, body: f.requestFields?.turn === 1 ? "unleash" : "setup", side, attacker: f.attacker.species, target: f.target.species,
    firstBody: !f.precedingBodies?.length, preceding: (f.precedingBodies ?? []).map((u: Json) => u.statAnimation !== undefined ? `S${u.statAnimation}` : `B${u.moveId}${u.side[0]}`).join(" "),
    window: [f.denseWindow!.startFrame, f.denseWindow!.endFrame], live: presentation !== null,
    runs: results.map((r) => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest.slice(0, 16) })),
    state: {
      monbgCnt: at.registers[layer], monbgCntS0: s0Cnt, monbgCntIsS0: at.registers[layer] === s0Cnt,
      otherCnt: at.registers[side === "player" ? "bg1cnt" : "bg2cnt"], dispcnt: at.registers.dispcnt,
      scanline: { state: at.scanline.state, srcBuffer: at.scanline.srcBuffer, dmaDest: at.scanline.dmaDest, dmaControl: at.scanline.dmaControl,
        bank0LinesNotS0: differsFromS0(banks[0]!, S0_SCAN_BANK0), bank1LinesNotS0: differsFromS0(banks[1]!, Array(160).fill(0)) },
      matrixBitmap: at.matrixBitmap, allocatorAsFirstDig: JSON.stringify([at.paletteTags, at.tileTagsSha, at.tileBitmapSha, at.matrixBitmap, at.tasks])
        === JSON.stringify([firstDig.at.paletteTags, firstDig.at.tileTagsSha, firstDig.at.tileBitmapSha, firstDig.at.matrixBitmap, firstDig.at.tasks]),
      bgMapsAsFirstDig: JSON.stringify(at.bgMapSha) === JSON.stringify(firstDig.at.bgMapSha),
      lentOrderEqualsRom: lent === null ? null : JSON.stringify(lent) === JSON.stringify(at.spriteOrder),
    },
  });
  for (const r of results) scratches.add(r.scratch as string);
  const last = rows.at(-1)!;
  process.stderr.write(`${name}: live ${last.live} ${last.runs.map((r: Json) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" | ")} order ${last.state.lentOrderEqualsRom}\n`);
}
const probeDeterminism = [...probeShas].map(([scenario, s]) => ({ scenario: scenario.split("/").at(-1), r1: s[0], r2: s[1], same: s[0] === s[1] }));
for (const s of scratches) rmSync(s, { recursive: true, force: true });
writeFileSync(out, JSON.stringify({ schema: "prep48-dig-check/v1", probeDeterminism, rows }, null, 1) + "\n");
