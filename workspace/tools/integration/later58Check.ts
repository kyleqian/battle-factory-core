// later58: every later58 fixture through the PRODUCTION live renderer (liveAdapterFramebuffer.ts verifyLiveAdapterFramebuffer: two fresh
// direct-mGBA prep48Probe.py processes per scenario, POKEBENCH_LIVE_PROBE_SHARE=1, digests must agree) plus, from the same probe output, the
// history state the first-body gate stood for, at activation, vs the SAME scenario's first body of the same move and side (or S0):
// registers that differ from S0, scanline header + displayed lines that differ from S0, allocator (palette / tile tags, tile bitmap,
// matrix bitmap, live tasks), BG map digests, the production lend vs the ROM sSpriteOrder, ROM battler x2 vs the production x2 input.
// D4 moves (Mach Punch / Sheer Cold / Extrasensory): the window's measured phase(s) vs liveMoveTimingPolicy.ts and the residual ages
// (selected phase: must be 0 px; other phase: only the documented rows, d4aTimingCheck.ts rule).
//   POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/later58Check.ts <out.json> <fixture.json>...
//   [--live-only]: only whether the production presentation is non-null at age 0 (no probe).
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { liveView, verifyLiveAdapterFramebuffer, type Fixture } from "./liveAdapterFramebuffer.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";
import { LIVE_MOVE_TIMING_POLICY } from "../../src/engine/liveMoveTimingPolicy.ts";

const liveOnly = process.argv.includes("--live-only");
const [out, ...paths] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const S0: Record<string, number> = { dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b, bg1hofs: 0, bg1vofs: 0,
  bg2hofs: 0, bg2vofs: 0, win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, bldcnt: 0, bldalpha: 0, bldy: 0 };
const S0_SCAN_BANK0 = [...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)];
const IDS: Record<string, number> = { SIGNAL_BEAM: 324, SHEER_COLD: 329, MACH_PUNCH: 183, EXTRASENSORY: 326 };
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
type Json = Record<string, any>;
const rows: Json[] = [];
const scratches = new Set<string>();
const presentationAt0 = (f: Fixture) => {
  const view = liveView(f, 0), e = view.effect as Json;
  return { e, presentation: liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input) };
};
for (const path of paths) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & Json;
  const firstBody = !f.precedingBodies?.length;
  const { e, presentation } = presentationAt0(f);
  const base = { fixture: path.split("/").at(-1), move: f.move, side: f.attacker.geometry.side, attacker: f.attacker.species, target: f.target.species,
    firstBody, preceding: (f.precedingBodies ?? []).map((u: Json) => u.statAnimation !== undefined ? `S${u.statAnimation}`
      : u.statusAnimation !== undefined ? `st:${u.statusAnimation}` : `B${u.moveId}${u.side[0]}`).join(" "),
    window: [f.denseWindow!.startFrame, f.denseWindow!.endFrame], live: presentation !== null };
  if (liveOnly) { rows.push(base); continue; }
  const results = verifyLiveAdapterFramebuffer(path, 2);
  const probes = results.map((r) => readFileSync(join(r.scratch as string, "probe.json"), "utf8"));
  const probe = JSON.parse(probes[0]!) as Json;
  const body = (probe.bodies as Json[]).find((b) => b.startFrame === f.denseWindow!.startFrame)!;
  const first = (probe.bodies as Json[]).find((b) => b.label === body.label && b.attacker === body.attacker)!;
  const at = body.at;
  const banks = at.scanline.banks as number[][];
  const notS0 = (bank: number[], ref: number[]) => bank.slice(0, 160).reduce((n, v, i) => n + (v !== ref[i] ? 1 : 0), 0);
  const allocator = (a: Json) => JSON.stringify([a.paletteTags, a.tileTagsSha, a.tileBitmapSha, a.matrixBitmap, a.tasks]);
  const lent = e.spriteOrderInput?.known ? spriteOrderWithOccupiedPrefix({ known: true, free: e.spriteOrderInput.free, pendingDestroyed: [] },
    KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) : null;
  const comparisons = results.map((r) => (JSON.parse(readFileSync(join(r.scratch as string, "live-comparison.json"), "utf8")).comparisons as Json[]));
  const affectedAges = comparisons[0]!.filter((c) => c.residualPixels > 0).map((c) => c.age as number);
  // D4: the policy's phase per parameter (side-scoped entries apply to the attacker side only) vs the fixture's measured phase.
  const id = IDS[f.move]!;
  const parameters = (LIVE_MOVE_TIMING_POLICY[id]?.parameters ?? []).filter((p) => p.side === undefined || p.side === f.attacker.geometry.side);
  const measured: Json = f.timingPhases ?? (f.timingPhase ? { "optional-lag-age": f.timingPhase } : {});
  const selected = parameters.every((p) => measured[p.kind] === p.chosen);
  const documented = (status.faithfulTimingAdapters as Json[]).find((x) => x.id === id)?.alternatePhaseResidual?.ages as number[] | undefined ?? [];
  const residual = results[0]!.residualPixels;
  const verdict = !base.live ? "declined"
    : selected ? (residual === 0 && results[0]!.expectedDuration === results[0]!.rows ? "exact" : "FAIL")
    : (affectedAges.every((a) => documented.includes(a)) ? "other-phase-documented" : "FAIL");
  rows.push({
    ...base, verdict, timing: parameters.length ? { measured, selected } : null,
    runs: results.map((r) => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, expectedDuration: r.expectedDuration, digest: r.digest.slice(0, 16) })),
    affectedAges: affectedAges.length ? `${affectedAges[0]}..${affectedAges.at(-1)} (${affectedAges.length})` : "",
    probeShas: probes.map(sha),
    state: {
      registersNotS0: Object.fromEntries(Object.entries(at.registers as Record<string, number>).filter(([k, v]) => S0[k] !== undefined && S0[k] !== v)),
      registersAsFirstBody: JSON.stringify(at.registers) === JSON.stringify(first.at.registers),
      scanline: { state: at.scanline.state, srcBuffer: at.scanline.srcBuffer, bank0LinesNotS0: notS0(banks[0]!, S0_SCAN_BANK0),
        bank1LinesNotS0: notS0(banks[1]!, Array(160).fill(0)), asFirstBody: JSON.stringify(at.scanline) === JSON.stringify(first.at.scanline) },
      allocatorAsFirstBody: allocator(at) === allocator(first.at), bgMapsAsFirstBody: JSON.stringify(at.bgMapSha) === JSON.stringify(first.at.bgMapSha),
      lentOrderEqualsRom: lent === null ? null : JSON.stringify(lent) === JSON.stringify(at.spriteOrder),
      romX2: (at.battlerSprites as Json[]).map((b) => [b.x2, b.y2]), trackedX2: e.battlerX2Input ?? null,
    },
  });
  for (const r of results) scratches.add(r.scratch as string);
  const last = rows.at(-1)!;
  process.stderr.write(`${last.fixture}: ${last.verdict} live ${last.live} ${last.runs.map((r: Json) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" | ")} ages ${last.affectedAges} order ${last.state.lentOrderEqualsRom}\n`);
}
for (const s of scratches) rmSync(s, { recursive: true, force: true });
writeFileSync(out!, JSON.stringify({ schema: "later58-check/v1", rows }, null, 1) + "\n");
