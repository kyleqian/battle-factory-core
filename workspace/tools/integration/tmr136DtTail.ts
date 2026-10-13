// tmr136 (ISSUES #166 (A)): the live Double Team window's stats-change tail. Every dt60 consumer fixture of ONE scenario (dt60Check.ts's lend
// replay, the production hosts as the orchestrator feeds them) rendered through the production live view at EVERY age -1 .. D - 1
// (D = liveMoveAnimationDuration, 239 on the final tree) and compared row by row with the dense frames of two FRESH direct-mGBA
// tmr136Probe.py runs (tmr136Probes.sh; frame = window.startFrame + age - window.ageOffset). Reports per window: the body rows (-1 .. 229),
// the added tail rows (230 .. D - 1 = the General_StatsChange's rel 69 .. 77), and the ROM's next-message glyph row: the first age after the
// tail whose ROM frame differs from the last tail row (expected D = rel 78), with the changed box (must lie inside the message box) and
// whether the earlier tail rows already differ there (they must not).
//   node --experimental-strip-types --no-warnings tools/integration/tmr136DtTail.ts <fixture-dir> <scenario-name> <probe-out-dir> <out.json>
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS, liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS, liveSpriteAllocatorAnimationNetZero, prepareLiveMoveSpriteAllocator,
} from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import { advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder } from "../../src/engine/liveSpriteOrderHost.ts";
import { spriteOrderStatusAnimationName } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Json = Record<string, any>;
const SPECIES: Record<string, number> = { CHANSEY: 113, SNORLAX: 143, ARBOK: 24, CATERPIE: 10, ONIX: 95, GROVYLE: 278, DRAGONITE: 149, EXEGGCUTE: 102,
  UMBREON: 197, SCYTHER: 123, WALREIN: 343, GARDEVOIR: 394, CLEFABLE: 36, METAGROSS: 400, DUSCLOPS: 362, SHUCKLE: 213, DRAGONAIR: 148 };
const [dir, scenario, probeDir, out] = process.argv.slice(2) as [string, string, string, string];
const fixtures = readdirSync(dir).filter((n) => n.startsWith(`${scenario}-c`) && n.endsWith(".json")).sort()
  .map((n) => ({ name: n, f: JSON.parse(readFileSync(join(dir, n), "utf8")) as Fixture & Json }));
if (fixtures.length === 0) throw new Error(`no fixtures for ${scenario}`);

function lendOf(f: Fixture & Json, turns: Json[]) {
  const side = f.attacker.geometry.side as "player" | "opponent";
  const geometry = { playerSpecies: SPECIES[side === "player" ? f.attacker.species : f.target.species]!,
    opponentSpecies: SPECIES[side === "opponent" ? f.attacker.species : f.target.species]! };
  const planAt = (_s: number, _q: number, moveId: number, attackerSide: "player" | "opponent") =>
    liveMoveGeometrySpriteOrderPlanText(moveId, attackerSide, geometry) ?? undefined;
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let allocator = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove;
  let sequence = 0;
  let lend: Json = {};
  const invalidatedBy: string[] = [];
  turns.forEach((turn, t) => {
    const events = (turn.events as Json[]).map((payload) => Object.freeze({ sequence: sequence++, payload, provenance: undefined }) as unknown as BattleKernelSemanticEvent);
    const resolution = { resolutionId: { requestId: t + 1 }, segmentIndex: 0, segments: [{ events }] };
    host = beginLiveSpriteOrderTurn(host, t + 1, true);
    events.forEach((event, i) => {
      const p = event.payload as unknown as Json;
      const last = t === turns.length - 1 && i === events.length - 1;
      const req = p.animationId === "MOVE_ANIMATION" ? battleMoveAnimationRequest(p.battler, p.target, p.arguments) : null;
      if (last) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        lend = { spriteOrderInput: lendLiveSpriteOrder(host, req!.moveId), spriteAllocatorInput: prepareLiveMoveSpriteAllocator(allocator, req!).input };
        const order = lend.spriteOrderInput as Json | undefined;
        if (process.env.DT60_VARIANT === "swap34" && order?.known === true && Array.isArray(order.free)) {
          lend.spriteOrderInput = { ...order, free: (order.free as number[]).map((s) => (s === 3 ? 4 : s === 4 ? 3 : s)) };
        }
        return;
      }
      if (req) allocator = prepareLiveMoveSpriteAllocator(allocator, req).next;
      else if (p.kind === "status-animation") {
        const unit = spriteOrderStatusAnimationName(p.isStatus2 !== 0, p.status) ?? "";
        if (!LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS.has(unit)) { allocator = invalidateLiveSpriteAllocatorHost(allocator); invalidatedBy.push(unit); }
      } else if (p.kind === "animation" && !liveSpriteAllocatorAnimationNetZero(p as never)) {
        allocator = invalidateLiveSpriteAllocatorHost(allocator); invalidatedBy.push(p.animationId);
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, false, planAt);
    });
  });
  return { lend, host: host as Json, invalidatedBy };
}


const variants = fixtures.map(({ name, f }) => {
  const { lend, host } = lendOf(f, f.precedingTurns as Json[]);
  const view = (age: number) => { const v = liveView(f, age) as Json; return { ...v, effect: { ...v.effect, ...lend } }; };
  const v0 = view(0).effect;
  const live = liveMoveAnimationPresentation(v0.request, view(0).field, 0, v0.paletteInput, v0.spriteAllocatorInput, v0.spriteOrderInput,
    v0.presentationRng, v0.battlerX2Input) !== null;
  return { name, f, view, live, orderInvalid: (host as Json).tracker?.invalidReason ?? null,
    duration: liveMoveAnimationDuration(v0.request, view(0).field) };
});

const BODY_LAST_AGE = 229;
const runs: Json[] = [];
for (const run of ["r1", "r2"]) {
  const rgbDir = join(probeDir, run, scenario, "rgb");
  const frameOf = (w: Json, age: number) => w.startFrame + age - (w.ageOffset ?? 0);
  const read = (frame: number) => readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  const perFixture: Json = {};
  for (const v of variants) {
    const w = v.f.denseWindow!;
    const duration = v.duration!;
    const rows: number[][] = [];
    for (let age = -1; age < duration; age++) {
      const rgb = read(frameOf(w, age));
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, v.view(age) as never);
      let px = 0;
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) px++;
      }
      rows.push([age, px]);
    }
    // The ROM's glyph row: the first age >= the tail start whose frame differs from the previous ROM frame, after the banner is gone.
    const diff = (a: Buffer, b: Buffer) => {
      let n = 0, x0 = 240, x1 = -1, y0 = 160, y1 = -1;
      for (let p = 0; p < 240 * 160; p++) {
        if (a[p * 3] === b[p * 3] && a[p * 3 + 1] === b[p * 3 + 1] && a[p * 3 + 2] === b[p * 3 + 2]) continue;
        n++; const x = p % 240, y = (p / 240) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      return { px: n, bbox: [x0, x1, y0, y1] };
    };
    const changes: Json[] = [];
    let glyphAge: number | null = null, glyphBox: Json = null;
    for (let age = BODY_LAST_AGE + 1; age <= BODY_LAST_AGE + 1 + LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS + 2; age++) {
      const d = diff(read(frameOf(w, age - 1)), read(frameOf(w, age)));
      if (d.px > 0) changes.push({ age, ...d });
      if (d.px > 0 && glyphAge === null) { glyphAge = age; glyphBox = d; }
    }
    const sum = (r: number[][]) => r.reduce((a, x) => a + x[1]!, 0);
    const bodyRows = rows.filter((x) => x[0]! <= BODY_LAST_AGE), tailRows = rows.filter((x) => x[0]! > BODY_LAST_AGE);
    perFixture[v.name] = { digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16),
      rows: rows.length, bodyRows: bodyRows.length, bodyPx: sum(bodyRows), bodyResidual: bodyRows.filter((x) => x[1]! > 0).slice(0, 20),
      tailRows: tailRows.length, tailPx: sum(tailRows), tailPerRow: tailRows, romGlyphAge: glyphAge, romGlyphBox: glyphBox, romChanges: changes };
  }
  runs.push({ run, perFixture });
}

const rows = variants.map((v) => {
  const [a, b] = runs.map((r) => r.perFixture[v.name] as Json);
  return { fixture: v.name, side: v.f.attacker.geometry.side, species: `${v.f.attacker.species}/${v.f.target.species}`, live: v.live,
    orderInvalid: v.orderInvalid, window: v.f.denseWindow, duration: v.duration, digests: [a!.digest, b!.digest], same: a!.digest === b!.digest
      && a!.romGlyphAge === b!.romGlyphAge, ...a, romGlyphAgeR2: b!.romGlyphAge };
});
writeFileSync(out, `${JSON.stringify({ schema: "tmr136-dt-tail/v1", scenario, rows }, null, 1)}\n`);
for (const r of rows) {
  console.log(r.fixture, JSON.stringify({ live: r.live, duration: r.duration, rows: r.rows, bodyPx: r.bodyPx, tailRows: r.tailRows, tailPx: r.tailPx,
    romGlyphAge: r.romGlyphAge, glyphBox: r.romGlyphBox?.bbox, same: r.same }));
}
