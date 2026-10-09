// Live audit 15: every consumer fixture (audit15Fixtures.py) through the PRODUCTION path: the recorded semantic history replayed through
// liveSpriteOrderHost + the allocator seam (postkoHostReplay.ts via the harness's `precedingTurns`) -> lend -> live adapter -> live view
// (renderBattleResolutionLiveView), compared row by row with two FRESH direct-mGBA prep48Probe.py processes per scenario
// (verifyLiveAdapterFramebuffer, POKEBENCH_LIVE_PROBE_SHARE=1; the harness throws unless both runs give identical per-row digests).
// First reports whether the production host lends KNOWN at the consumer and whether the adapter is live at age 0 (a declined /
// fallback row is recorded, not pixel-claimed).
// AUDIT15_ENTRY_LEND=1: sensitivity control — the same window with the history cut to the consumer body alone (production's first-body
// order / allocator / x2 lends instead of the chain's); a chain row whose entry-lend control is also 0 px does not discriminate the lend.
//   POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/audit15Check.ts <fixture-dir> <out.json> [name-filter]
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { liveView, verifyLiveAdapterFramebuffer, type Fixture } from "./liveAdapterFramebuffer.ts";
import { replayPostKoTurnsThroughHost } from "./postkoHostReplay.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";

type Json = Record<string, any>;
const [dir, out, filter] = process.argv.slice(2) as [string, string, string | undefined];
const rows: Json[] = [];
for (const name of readdirSync(dir).filter((n) => n.endsWith(".json") && (!filter || n.startsWith(filter))).sort()) {
  let path = join(dir, name);
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & Json;
  if (process.env.AUDIT15_ENTRY_LEND === "1") {
    f.precedingTurns = [{ events: [f.precedingTurns.at(-1).events.at(-1)] }];
    path = join(mkdtempSync(join(tmpdir(), "audit15-entry-")), name);
    writeFileSync(path, JSON.stringify(f));
  }
  const lend = replayPostKoTurnsThroughHost(f.precedingTurns);
  const view = liveView(f, 0), e = view.effect as Json;
  const live = liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input) !== null;
  const host = lend.host as Json;
  const row: Json = { fixture: name, move: f.move, side: f.attacker.geometry.side, units: f.precedingTurns.flatMap((t: Json) => t.events).length - 1,
    window: f.denseWindow, live, orderKnown: (lend.spriteOrderInput as Json | undefined)?.known === true,
    orderInvalid: host.tracker?.invalidReason ?? null, allocatorInput: lend.spriteAllocatorInput !== undefined,
    firstBody: (lend.spriteOrderInput as Json | undefined)?.firstBody === true, x2: e.battlerX2Input ?? null };
  try {
    const results = verifyLiveAdapterFramebuffer(path, 2);
    const cmp = results.map((r) => JSON.parse(readFileSync(join(r.scratch as string, "live-comparison.json"), "utf8")) as Json);
    for (const r of results) rmSync(join(r.scratch as string, "live-comparison.json"), { force: true });
    Object.assign(row, { rows: results[0]!.rows, expectedDuration: results[0]!.expectedDuration, exactRows: results[0]!.exactRows,
      residualPixels: results[0]!.residualPixels, digests: results.map((r) => r.digest),
      residualRows: (cmp[0]!.comparisons as Json[]).filter((c) => c.residualPixels > 0).map((c) => [c.age, c.residualPixels, c.regions.field, c.regions.chrome]) });
  } catch (err) {
    row.error = String((err as Error).message).slice(0, 400);
  }
  rows.push(row);
  console.log(name, JSON.stringify({ live: row.live, orderKnown: row.orderKnown, alloc: row.allocatorInput, rows: row.rows, exp: row.expectedDuration,
    exact: row.exactRows, px: row.residualPixels, same: row.digests ? row.digests[0] === row.digests[1] : null, err: row.error }));
}
writeFileSync(out, `${JSON.stringify({ schema: "audit15-chain-check/v1", rows }, null, 1)}\n`);
