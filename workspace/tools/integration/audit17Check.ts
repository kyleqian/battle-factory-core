// Live audit 17: audit16Check.ts (unchanged method: the production hosts fed AS THE ORCHESTRATOR DOES TODAY, CHAIN + ENTRY lends, two
// FRESH direct-mGBA prep48Probe.py processes per scenario, r1 == r2 per-row digests) with the species ids read from species-stats.json
// (any Factory species: the dt60 grid) instead of audit 16's fixed map. Master 6e533d4b6 (src d7f24b03).
// fly63: the view also carries production's presentation-only semi-invulnerable hide (battleResolutionPresentationRender.ts
// applyLiveSemiInvulnerableCommand, fed one move-animation command per MOVE_ANIMATION of the history before the consumer: a Fly / Bounce
// charge body hides its attacker until that battler's next body) as visibility.<side>.sprite = false. audit16Check.ts's view never hides
// a battler; set AUDIT17_NO_HIDE=1 to render that way (the checker-artifact control).
//   node --experimental-strip-types --no-warnings tools/integration/audit17Check.ts <fixture-dir> <scenario-name> <out.json>
// Live audit 16: every consumer fixture of ONE scenario (audit16Fixtures.py) through the production hosts AS THE ORCHESTRATOR FEEDS THEM
// TODAY, compared row by row with two FRESH direct-mGBA prep48Probe.py processes of that scenario (r1 == r2 per-row digests required).
// The lend replay follows factoryRoundBattleOrchestrator.ts (master 8f2a2974f): beginLiveSpriteOrderTurn per action prompt,
// advanceLiveSpriteOrderHost before / after each event WITH the geometry-plan callback (liveSpriteOrderBodyPlanAt ->
// liveMoveGeometrySpriteOrderPlanText at the displayed species), prepareLiveMoveSpriteAllocator per body, and the allocator invalidated
// ONLY by a status animation outside LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS (alloc50 / alloc52) or a general animation that is not
// liveSpriteAllocatorAnimationNetZero (aud56). postkoHostReplay.ts (the audit-15 harness) still invalidates on EVERY status animation and
// passes no geometry callback, so it is recorded only as `harnessAllocator` (its stale decision) and never rendered.
// Each window is rendered twice per probe run: CHAIN (the full history) and ENTRY (the history cut to the consumer body alone: the
// entry-lend sensitivity control). The view is liveAdapterFramebuffer.ts's liveView (field, healthboxes + status icons, message box, x2
// history from the same precedingTurns) with ONLY the order / allocator lends replaced.
//   node --experimental-strip-types --no-warnings tools/integration/audit16Check.ts <fixture-dir> <scenario-name> <out.json>
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { applyLiveSemiInvulnerableCommand, LIVE_SEMI_INVULNERABLE_NONE } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { liveMoveAnimationPresentation, liveMoveHiddenSides, liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS, liveSpriteAllocatorAnimationNetZero, prepareLiveMoveSpriteAllocator,
} from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import { advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder } from "../../src/engine/liveSpriteOrderHost.ts";
import { spriteOrderStatusAnimationName } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { replayPostKoTurnsThroughHost } from "./postkoHostReplay.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

type Json = Record<string, any>;
const SPECIES: Record<string, number> = Object.fromEntries(speciesStats.species.map((s) => [s.name.replace(/^SPECIES_/, ""), s.id]));
const [dir, scenario, out] = process.argv.slice(2) as [string, string, string];
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
  const entryFixture = { ...f, precedingTurns: [{ events: [f.precedingTurns!.at(-1)!.events.at(-1)!] }] } as Fixture & Json;
  const make = (fx: Fixture & Json) => {
    const { lend, host, invalidatedBy } = lendOf(fx, fx.precedingTurns as Json[]);
    let hidden = LIVE_SEMI_INVULNERABLE_NONE;
    // A strike with NO body (missed: e.g. the target's Double Team evasion) still makes the ROM sprite visible again
    // (MOVEEND_ATTACKER_VISIBLE -> the controller's sprite-visibility receipt, which the orchestrator feeds as a "sprite-visibility"
    // command). The fixture history has no event for it, so it is inferred: a hidden battler's opponent playing a SECOND body before
    // the hidden battler's next body means the forced strike played none in between.
    const otherBodies = [0, 0];
    const all = (fx.precedingTurns as Json[]).flatMap((t) => t.events as Json[]);
    all.forEach((p, i) => {
      if (p.animationId !== "MOVE_ANIMATION") return;
      const other = 1 - p.battler;
      if (hidden[other] && ++otherBodies[other]! >= 2) {
        hidden = applyLiveSemiInvulnerableCommand(hidden, { type: "sprite-visibility", battler: other } as never);
      }
      if (i === all.length - 1) return;
      const before = hidden[p.battler];
      hidden = applyLiveSemiInvulnerableCommand(hidden, { type: "move-animation", battler: p.battler,
        animation: battleMoveAnimationRequest(p.battler, p.target, p.arguments) } as never);
      if (!before && hidden[p.battler]) otherBodies[p.battler] = 0;
    });
    if (process.env.AUDIT17_NO_HIDE === "1") hidden = LIVE_SEMI_INVULNERABLE_NONE;
    const view = (age: number) => {
      const v = liveView(fx, age) as Json;
      const visibility = { player: { ...v.visibility.player, sprite: v.visibility.player.sprite && !hidden[0] },
        opponent: { ...v.visibility.opponent, sprite: v.visibility.opponent.sprite && !hidden[1] } };
      return { ...v, visibility, effect: { ...v.effect, ...lend } };
    };
    const v0 = view(0).effect;
    // hide66: renderBattleResolutionLiveView's own decision, incl. the hidden-target gate (liveMoveHiddenSides of the view).
    const live = liveMoveAnimationPresentation(v0.request, view(0).field, 0, v0.paletteInput, v0.spriteAllocatorInput, v0.spriteOrderInput,
      v0.presentationRng, v0.battlerX2Input, liveMoveHiddenSides(view(0).visibility, v0.request)) !== null;
    return { view, live, orderKnown: (lend.spriteOrderInput as Json | undefined)?.known === true,
      orderInvalid: host.tracker?.invalidReason ?? null, allocatorInput: lend.spriteAllocatorInput !== undefined,
      firstBody: (lend.spriteOrderInput as Json | undefined)?.firstBody === true, x2: v0.battlerX2Input ?? null, invalidatedBy, hidden: [...hidden] };
  };
  let harnessAllocator: boolean | null = null;
  try { harnessAllocator = replayPostKoTurnsThroughHost(f.precedingTurns as never).spriteAllocatorInput !== undefined; } catch { /* recorded as null */ }
  return { name, f, chain: make(f), entry: make(entryFixture), harnessAllocator };
});

const runs: Json[] = [];
for (let run = 0; run < 2; run++) {
  const tmp = mkdtempSync(join(tmpdir(), "audit17-"));
  const r = spawnSync("python3", ["tools/run-mgba-probe.py", join(tmp, "p.json"), "--", `${process.env.POKEBENCH_VENDOR_DIR ?? "../../vendor"}/mgba-venv/bin/python`,
    "tools/integration/prep48Probe.py", fixtures[0]!.f.scenario, join(tmp, "p.json"), join(tmp, "rgb")], { encoding: "utf8",
    env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH ?? `${process.env.POKEBENCH_VENDOR_DIR ?? "../../vendor"}/libmgba-py` } });
  const probe = JSON.parse(readFileSync(join(tmp, "p.json"), "utf8")) as Json;
  const perFixture: Json = {};
  for (const v of variants) {
    const w = v.f.denseWindow!;
    const body = (probe.bodies as Json[]).find((b) => b.startFrame === w.startFrame && b.endFrame === w.endFrame);
    const res: Json = { sameWindow: body !== undefined };
    for (const kind of ["chain", "entry"] as const) {
      const rows: number[][] = [];
      const detail: Json[] = [];
      for (let frame = w.startFrame; frame <= w.endFrame; frame++) {
        const rgb = readFileSync(join(tmp, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
        const rgba = new Uint8Array(240 * 160 * 4);
        const age = frame - w.startFrame + (w.ageOffset ?? 0);
        renderBattleResolutionLiveView(rgba, v[kind].view(age) as never);
        let px = 0, x0 = 240, x1 = -1, y0 = 160, y1 = -1, sample = "";
        for (let p = 0; p < 240 * 160; p++) {
          if (rgb[p * 3] === rgba[p * 4] && rgb[p * 3 + 1] === rgba[p * 4 + 1] && rgb[p * 3 + 2] === rgba[p * 4 + 2]) continue;
          px++;
          const x = p % 240, y = (p / 240) | 0;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          if (!sample) {
            const hex = (a: ArrayLike<number>, o: number) => [0, 1, 2].map((c) => a[o + c]!.toString(16).padStart(2, "0")).join("");
            sample = `${x},${y} rom ${hex(rgb, p * 3)} live ${hex(rgba, p * 4)}`;
          }
        }
        rows.push([age, px]);
        if (px > 0 && detail.length < 6) detail.push({ age, px, bbox: [x0, x1, y0, y1], sample });
      }
      res[kind] = { digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16), rows: rows.length,
        exactRows: rows.filter((x) => x[1] === 0).length, px: rows.reduce((a, x) => a + x[1]!, 0),
        residualRows: rows.filter((x) => x[1]! > 0), detail };
    }
    perFixture[v.name] = res;
  }
  rmSync(tmp, { recursive: true, force: true });
  runs.push({ exit: r.status, perFixture });
}

const rows = variants.map((v) => {
  const [a, b] = runs.map((r) => r.perFixture[v.name] as Json);
  const pick = (k: "chain" | "entry") => ({ live: v[k].live, orderKnown: v[k].orderKnown, orderInvalid: v[k].orderInvalid,
    allocatorInput: v[k].allocatorInput, firstBody: v[k].firstBody, hidden: v[k].hidden, invalidatedBy: v[k].invalidatedBy, rows: a![k].rows, exactRows: a![k].exactRows, px: a![k].px,
    digests: [a![k].digest, b![k].digest], residualRows: a![k].residualRows.slice(0, 40), detail: a![k].detail });
  return { fixture: v.name, move: v.f.move, side: v.f.attacker.geometry.side, species: `${v.f.attacker.species}/${v.f.target.species}`,
    units: (v.f.precedingTurns as Json[]).flatMap((t) => t.events).length - 1,
    history: (v.f.precedingTurns as Json[]).map((t) => (t.events as Json[]).map((e) => e.kind === "status-animation"
      ? `status:${spriteOrderStatusAnimationName(e.isStatus2 !== 0, e.status)}@${e.battler}` : e.animationId === "MOVE_ANIMATION"
      ? `${e.arguments[0]}@${e.battler}` : `${e.animationId}@${e.battler}`).join(" ")),
    window: v.f.denseWindow, sameWindow: [a!.sameWindow, b!.sameWindow], harnessAllocator: v.harnessAllocator, x2: v.chain.x2,
    chain: pick("chain"), entry: pick("entry") };
});
writeFileSync(out, `${JSON.stringify({ schema: "audit17-chain-check/v1", scenario, probeExit: runs.map((r) => r.exit), rows }, null, 1)}\n`);
for (const r of rows) {
  console.log(r.fixture, JSON.stringify({ live: r.chain.live, order: r.chain.orderKnown, alloc: r.chain.allocatorInput, harnessAlloc: r.harnessAllocator,
    rows: r.chain.rows, px: r.chain.px, same: r.chain.digests[0] === r.chain.digests[1], entryLive: r.entry.live, entryPx: r.entry.px,
    entrySame: r.entry.digests[0] === r.entry.digests[1] }));
}
