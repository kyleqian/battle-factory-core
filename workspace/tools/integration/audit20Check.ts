// Live audit 20 = audit19Check.ts (below) on master c68111480 (src d73cf1af) + the ALLOCATOR comparison: per window the production
// spriteAllocatorInput (liveMoveSpriteAllocator.ts: wall + sparkle slots, from the allocator host the history left) vs the ROM's
// (audit20Probe.py: the slots CreateSprite gave the body, in creation order, and the inUse / OAM matrix / palette tag / tile state on the
// frame before activation vs the battle's entry state); rows carry `alloc`. AUDIT20_ALLOC_ONLY=1: no probes, one JSON line per window
// (allocator input vs ROM, order lend vs ROM). Env names AUDIT20_* replace AUDIT20_*.
//   node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts <fixture-dir> <scenario-name> <out.json>
// Live audit 19: audit18Check.ts (the production hosts fed AS THE ORCHESTRATOR DOES: turns from the ROM's battleTurnCounter with
// beginLiveSpriteOrderTurn(promptShown = !playerLocked), every body marked as the orchestrator marks it, the orchestrator's plan
// callback with the displayed field + lent order, production's hide in view.visibility vs the ROM's invisible flags; CHAIN + ENTRY lends;
// two FRESH direct-mGBA probe processes per scenario, r1 == r2 per-row digests) on master dc173666b (src e6f98bf9), extended to today's
// later folds:
//  - EVERY history body with a production Random2 plan (Ice Ball 301, Mud-Slap 189, Rain Dance 240, Dive 291, Water Pulse 352, ...)
//    records its words in a presentation host pinned at the RAM gRng2Value of its own activation (fixture pinnedRng2; prep65's method;
//    audit 18 pinned Dive only); a RAIN_CONTINUES general animation records GENERAL_RAIN_RANDOM2_PLAN under its general key the same way
//    (fixture pinnedGeneral; liveAdapterFramebuffer.ts wordsChain "rain" step);
//  - Ice Ball carries its rollout counter, Magnitude the RAM gAnimMovePower (fold71's 20222 key), STATS_CHANGE the ROM's animArg1.
//   node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts <fixture-dir> <scenario-name> <out.json>
// AUDIT20_LENDS_ONLY=1: no probes; per window the CHAIN lend's free order (a deferred lend resolved as the render seam resolves it) vs the
// ROM's free order at the activation frame. AUDIT20_NO_HIDE=1: render with no hide. AUDIT20_MASK: see below.
// AUDIT20_TRACE=1: the host's free order after every history event on stderr. AUDIT20_MISS_RULE_ALL_TURNS=1: audit 18's missed-strike rule also in the consumer's own (truncated) turn (the ablation).
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { applyLiveSemiInvulnerableCommand, LIVE_SEMI_INVULNERABLE_NONE } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import {
  LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveBattlerAnchors, liveDiveSetupSplashBirth, liveMoveAnimationPresentation, liveMoveHiddenSides,
  liveMoveGeometrySpriteOrderPlanText, liveWordsOrderDeferredCarry,
} from "../../src/engine/liveMoveAnimation.ts";
import {
  activateLiveMovePresentationRng, GENERAL_RAIN_RANDOM2_PLAN, liveMovePresentationRngBodyKey, liveMovePresentationRngWords, liveMoveRandom2Plan,
} from "../../src/engine/liveMovePresentationRng.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { resolveSpriteOrderDeferredLend } from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS, liveSpriteAllocatorAnimationNetZero, prepareLiveMoveSpriteAllocator,
} from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, liveSpriteOrderHostOrder,
  markLiveSpriteOrderDeferredBody,
} from "../../src/engine/liveSpriteOrderHost.ts";
import { createPresentationRngHostAt, recordPresentationRngSubStream } from "../../src/engine/presentationRngHost.ts";
import { generalAnimationPresentationRngKey } from "../../src/engine/wordsOrderUnits.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { spriteOrderStatusAnimationName } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { classifyPresentationDecline } from "./liveShareCensusGates.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

type Json = Record<string, any>;
const SPECIES: Record<string, number> = Object.fromEntries(speciesStats.species.map((s) => [s.name.replace(/^SPECIES_/, ""), s.id]));
const [dir, scenario, out] = process.argv.slice(2) as [string, string, string];
const fixtures = readdirSync(dir).filter((n) => new RegExp(`^${scenario}-c\\d+\\.json$`).test(n)).sort((a, b) => Number(/c(\d+)\.json$/.exec(a)![1]) - Number(/c(\d+)\.json$/.exec(b)![1]))
  .map((n) => ({ name: n, f: JSON.parse(readFileSync(join(dir, n), "utf8")) as Fixture & Json }));
if (fixtures.length === 0) throw new Error(`no fixtures for ${scenario}`);
const pinnedHost = (value: number) => createPresentationRngHostAt(createPresentationRngState(value, "pinned"));

function lendOf(f: Fixture & Json, turns: Json[], field: Json) {
  const side = f.attacker.geometry.side as "player" | "opponent";
  const species = { player: SPECIES[side === "player" ? f.attacker.species : f.target.species]!,
    opponent: SPECIES[side === "opponent" ? f.attacker.species : f.target.species]! };
  const geometry = { playerSpecies: species.player, opponentSpecies: species.opponent };
  // The orchestrator's liveSpriteOrderBodyPlanAt passes the displayed field and the lent order too (Shock Wave 351 / Water Spout need
  // them: sw67 / plans54); audit 16 / 17's callback passed the species only.
  const planAt = (_s: number, _q: number, moveId: number, attackerSide: "player" | "opponent", lentFree?: readonly number[]) =>
    liveMoveGeometrySpriteOrderPlanText(moveId, attackerSide, geometry, field as never, lentFree) ?? undefined;
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let allocator = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove;
  let sequence = 0, flat = 0;
  let lend: Json = {};
  let consumerKey = "";
  const rngBodies: unknown[] = [];
  const pinned = new Map<number, number>((f.pinnedRng2 as [number, number][] | undefined ?? []).map(([i, v]) => [i, v]));
  const pinnedGeneral = new Map<number, number>((f.pinnedGeneral as [number, number][] | undefined ?? []).map(([i, v]) => [i, v]));
  const invalidatedBy: string[] = [];
  const prompts = f.promptShown as boolean[] | undefined;
  turns.forEach((turn, t) => {
    const events = (turn.events as Json[]).map((payload) => Object.freeze({ sequence: sequence++, payload, provenance: undefined }) as unknown as BattleKernelSemanticEvent);
    const resolution = { resolutionId: { requestId: t + 1 }, segmentIndex: 0, segments: [{ events }] };
    host = beginLiveSpriteOrderTurn(host, t + 1, prompts?.[t] ?? true);
    if (process.env.AUDIT20_TRACE === "1") {
      const o = liveSpriteOrderHostOrder(host);
      console.error(JSON.stringify({ turn: t, event: "begin-turn", prompt: prompts?.[t] ?? true, known: o.known, free: o.free }));
    }
    events.forEach((event, i) => {
      const p = event.payload as unknown as Json;
      const last = t === turns.length - 1 && i === events.length - 1;
      const req = p.animationId === "MOVE_ANIMATION" ? battleMoveAnimationRequest(p.battler, p.target, p.arguments) : null;
      const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: t + 1 }, segmentIndex: 0, commandIndex: i });
      const at = flat++;
      if (last) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        lend = { spriteOrderInput: lendLiveSpriteOrder(host, req!.moveId), spriteAllocatorInput: prepareLiveMoveSpriteAllocator(allocator, req!).input };
        consumerKey = key;
        if (liveMoveRandom2Plan(req!) !== null && f.presentationRngActivation !== undefined) {
          // audit 19: a Dive SETUP consumer needs the production plan context (the setup splash birth from its displayed species), as the
          // history Dive bodies get it (audit 18 never had a Dive consumer); AUDIT20_NO_SPLASH_CONTEXT=1 is the ablation
          const context = req!.moveId === 291 && (req!.turn & 1) === 0 && process.env.AUDIT20_NO_SPLASH_CONTEXT !== "1"
            ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field as never, req!.attacker === 0 ? "player" : "opponent") } : undefined;
          rngBodies.push(...activateLiveMovePresentationRng(pinnedHost(f.presentationRngActivation.value), req!, key, context).bodies);
        }
        return;
      }
      if (req) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        const bodyLend = lendLiveSpriteOrder(host, req.moveId);
        host = markLiveSpriteOrderDeferredBody(host, bodyLend, req, key, species);
        if (pinned.has(at) && liveMoveRandom2Plan(req) !== null) {
          const context = req.moveId === 291 && (req.turn & 1) === 0
            ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field as never, req.attacker === 0 ? "player" : "opponent") } : undefined;
          rngBodies.push(...activateLiveMovePresentationRng(pinnedHost(pinned.get(at)!), req, key, context).bodies);
        }
        allocator = prepareLiveMoveSpriteAllocator(allocator, req).next;
      } else if (p.animationId === "RAIN_CONTINUES" && pinnedGeneral.has(at)) {
        rngBodies.push(...recordPresentationRngSubStream(pinnedHost(pinnedGeneral.get(at)!), generalAnimationPresentationRngKey(t + 1, 0, event.sequence),
          GENERAL_RAIN_RANDOM2_PLAN).bodies);
        if (!liveSpriteAllocatorAnimationNetZero(p as never)) { allocator = invalidateLiveSpriteAllocatorHost(allocator); invalidatedBy.push(p.animationId); }
      } else if (p.kind === "status-animation") {
        const unit = spriteOrderStatusAnimationName(p.isStatus2 !== 0, p.status) ?? "";
        if (!LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS.has(unit)) { allocator = invalidateLiveSpriteAllocatorHost(allocator); invalidatedBy.push(unit); }
      } else if (p.kind === "animation" && !liveSpriteAllocatorAnimationNetZero(p as never)) {
        allocator = invalidateLiveSpriteAllocatorHost(allocator); invalidatedBy.push(p.animationId);
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, false, planAt);
      // AUDIT20_TRACE=1 (stderr): the host's free order after every history event (the #160 / Needle Arm diagnosis vs the probe's endOrder)
      if (process.env.AUDIT20_TRACE === "1") {
        const o = liveSpriteOrderHostOrder(host);
        console.error(JSON.stringify({ turn: t, event: p.animationId ?? p.kind, battler: p.battler, move: p.arguments?.[0], known: o.known,
          free: o.free }));
      }
    });
    if (t < turns.length - 1) host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY, false, planAt);
  });
  const presentationRng = rngBodies.length === 0 ? undefined : { host: Object.freeze({ ...pinnedHost(0), bodies: Object.freeze(rngBodies) }), key: consumerKey };
  return { lend, host: host as Json, invalidatedBy, presentationRng };
}

const variants = fixtures.map(({ name, f }) => {
  const entryFixture = { ...f, precedingTurns: [{ events: [f.precedingTurns!.at(-1)!.events.at(-1)!] }], pinnedRng2: [], promptShown: [true] } as Fixture & Json;
  const make = (fx: Fixture & Json) => {
    const base = liveView(fx, 0) as Json;
    const { lend, host, invalidatedBy, presentationRng } = lendOf(fx, fx.precedingTurns as Json[], base.field);
    let hidden = LIVE_SEMI_INVULNERABLE_NONE;
    const doll = [false, false];
    // audit 17's rule: a hidden battler's opponent playing a SECOND body before the hidden battler's next body means the forced strike
    // played none (missed) in between: the orchestrator's sprite-visibility receipt (MOVEEND_ATTACKER_VISIBLE) shows it again.
    const otherBodies = [0, 0];
    const turnsOf = fx.precedingTurns as Json[];
    const all = turnsOf.flatMap((t) => t.events as Json[]);
    // audit 18: a two-turn strike that played NO body (missed / the user fully paralysed) still shows the charger again (the
    // orchestrator's sprite-visibility receipt); inferred per turn: a setup body of battler b in turn t - 1 and no body of b in turn t.
    const firstOfTurn = new Map<number, number>();
    turnsOf.forEach((_t, t) => firstOfTurn.set(turnsOf.slice(0, t).reduce((n, x) => n + (x.events as Json[]).length, 0), t));
    const bodyOf = (t: number, b: number, setup: boolean) => ((turnsOf[t]?.events ?? []) as Json[]).some((e) => e.animationId === "MOVE_ANIMATION"
      && e.battler === b && (!setup || (["19", "340", "91", "291"].includes(e.arguments[0]) && e.arguments[1] === "0")));
    all.forEach((p, i) => {
      const t = firstOfTurn.get(i);
      // audit 19: not in the consumer's own turn — the fixture truncates it at the consumer, so a strike AFTER the consumer is absent
      // (audit 18's rule then un-hid a diver the ROM still hides: wp160-opp-s1-c1, the Whirlpool before the Dive attack in one turn)
      if (t !== undefined && t > 0 && (t < turnsOf.length - 1 || process.env.AUDIT20_MISS_RULE_ALL_TURNS === "1")) {
        for (const b of [0, 1]) {
          if (hidden[b] && bodyOf(t - 1, b, true) && !bodyOf(t, b, false)) {
            hidden = applyLiveSemiInvulnerableCommand(hidden, { type: "sprite-visibility", battler: b } as never);
          }
        }
      }
      // audit 20 (land75 Part B): a faint / send-in shows the battler again (production's "faint" / "switch-in" commands clear the hide)
      if ((p.kind === "faint-animation" || p.kind === "switch-in-animation") && i < all.length - 1) {
        hidden = applyLiveSemiInvulnerableCommand(hidden, { type: p.kind === "faint-animation" ? "faint" : "switch-in", battler: p.battler } as never);
        otherBodies[p.battler as 0 | 1] = 0;
        return;
      }
      if (p.animationId === "SUBSTITUTE_FADE" && i < all.length - 1) doll[p.battler] = false;
      if (p.animationId !== "MOVE_ANIMATION") return;
      const other = 1 - p.battler;
      if (hidden[other] && ++otherBodies[other]! >= 2) {
        hidden = applyLiveSemiInvulnerableCommand(hidden, { type: "sprite-visibility", battler: other } as never);
      }
      if (i === all.length - 1) return;
      if (p.arguments[0] === "164") doll[p.battler] = true;
      const before = hidden[p.battler];
      hidden = applyLiveSemiInvulnerableCommand(hidden, { type: "move-animation", battler: p.battler,
        animation: battleMoveAnimationRequest(p.battler, p.target, p.arguments) } as never);
      if (!before && hidden[p.battler]) otherBodies[p.battler] = 0;
    });
    if (process.env.AUDIT20_NO_HIDE === "1") hidden = LIVE_SEMI_INVULNERABLE_NONE;
    const view = (age: number) => {
      const v = liveView(fx, age) as Json;
      const visibility = { player: { ...v.visibility.player, sprite: v.visibility.player.sprite && !hidden[0] },
        opponent: { ...v.visibility.opponent, sprite: v.visibility.opponent.sprite && !hidden[1] } };
      const field = { ...v.field, player: { ...v.field.player, ...(doll[0] ? { substituteDoll: true } : {}) },
        opponent: { ...v.field.opponent, ...(doll[1] ? { substituteDoll: true } : {}) } };
      return { ...v, field, visibility, effect: { ...v.effect, ...lend, ...(presentationRng === undefined ? {} : { presentationRng }) } };
    };
    const v0 = view(0);
    const e0 = v0.effect;
    const hiddenSides = liveMoveHiddenSides(v0.visibility, e0.request);
    const live = liveMoveAnimationPresentation(e0.request, v0.field, 0, e0.paletteInput, e0.spriteAllocatorInput, e0.spriteOrderInput,
      e0.presentationRng, e0.battlerX2Input, hiddenSides) !== null;
    const decline = live ? null : classifyPresentationDecline({ request: e0.request, field: v0.field, age: 0, paletteInput: e0.paletteInput,
      spriteAllocatorInput: e0.spriteAllocatorInput, spriteOrderInput: e0.spriteOrderInput, presentationRngInput: e0.presentationRng,
      battlerX2Input: e0.battlerX2Input, hiddenSides }).reason;
    return { view, live, decline, orderKnown: (lend.spriteOrderInput as Json | undefined)?.known === true,
      orderDeferred: (lend.spriteOrderInput as Json | undefined)?.deferred !== undefined,
      orderInvalid: host.tracker?.invalidReason ?? null, allocatorInput: lend.spriteAllocatorInput !== undefined,
      firstBody: (lend.spriteOrderInput as Json | undefined)?.firstBody === true, x2: e0.battlerX2Input ?? null, invalidatedBy, hidden: [...hidden],
      doll: [...doll] };
  };
  return { name, f, chain: make(f), entry: make(entryFixture) };
});

// audit 20: the production allocator input vs the ROM. Production's [wall, ...sparkles] must equal the first 1 + sparkles slots the ROM
// created in the body (creation order); the ROM state on the frame before activation must equal the battle's entry state (the known
// entry the allocator host assumes while its history is known).
function allocOf(v: (typeof variants)[number]) {
  const input = v.chain.view(0).effect.spriteAllocatorInput as Json | undefined;
  const rom = ((v.f.rom as Json).alloc ?? {}) as Json;
  const romSlots = ((rom.creates ?? []) as [number, number][]).map(([, s]) => s);
  const prod = input === undefined ? null : [input.wall as number, ...(input.sparkles as number[])];
  const preEqEntry = rom.pre !== undefined && JSON.stringify(rom.pre) === JSON.stringify(rom.entry);
  return { input: prod, rom: romSlots.slice(0, Math.max(prod?.length ?? 0, 1) + 2), preEqEntry,
    equal: prod === null ? null : JSON.stringify(prod) === JSON.stringify(romSlots.slice(0, prod.length)) && preEqEntry,
    preDiff: preEqEntry ? [] : Object.keys(rom.pre ?? {}).filter((k) => JSON.stringify(rom.pre[k]) !== JSON.stringify(rom.entry?.[k])) };
}
if (process.env.AUDIT20_ALLOC_ONLY === "1") {
  const occupied = new Set(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
  for (const v of variants) {
    const e0 = v.chain.view(0).effect as Json;
    const input = e0.spriteOrderInput as Json | undefined;
    const rom = ((v.f.rom as Json).spriteOrder as number[]).filter((s) => !occupied.has(s));
    const free = input === undefined || input.deferred !== undefined ? null : input.free as number[];
    console.log(JSON.stringify({ fixture: v.name, move: v.f.move, live: v.chain.live, decline: v.chain.decline, invalidatedBy: v.chain.invalidatedBy,
      alloc: allocOf(v), orderKnown: input !== undefined, orderSame: free === null ? null : JSON.stringify(free) === JSON.stringify(rom) }));
  }
  process.exit(0);
}
// AUDIT20_LENDS_ONLY=1: no probes; per window the CHAIN lend's free order (a deferred lend resolved as the render seam resolves it) vs the
// ROM's free order at the activation frame (sSpriteOrder without the known-entry occupied slots: fixture rom.spriteOrder).
if (process.env.AUDIT20_LENDS_ONLY === "1") {
  const occupied = new Set(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
  for (const v of variants) {
    const e0 = v.chain.view(0).effect as Json;
    const input = e0.spriteOrderInput as Json | undefined;
    const art = createBattleCommandFieldArtView(v.chain.view(0).field as never);
    const anchors = { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
    const free = input === undefined ? null : input.deferred === undefined ? input.free : resolveSpriteOrderDeferredLend(input.deferred,
      liveWordsOrderDeferredCarry((key) => liveMovePresentationRngWords({ host: (e0.presentationRng as Json | undefined)?.host ?? null, key }), anchors),
      LIVE_WORDS_ORDER_DEFERRED_REPLAY);
    const rom = ((v.f.rom as Json).spriteOrder as number[]).filter((s) => !occupied.has(s));
    const same = free !== null && JSON.stringify(free) === JSON.stringify(rom);
    console.log(JSON.stringify({ fixture: v.name, move: v.f.move, live: v.chain.live, decline: v.chain.decline, deferred: input?.deferred !== undefined,
      same, lend: free?.slice(0, 16) ?? null, rom: rom.slice(0, 16) }));
  }
  process.exit(0);
}
// AUDIT20_MASK="x0:x1:y0:y1[,...]": an ablation that ignores the given inclusive pixel rectangles (e.g. Castform's sprite box, ISSUES #143).
const masks = (process.env.AUDIT20_MASK ?? "").split(",").filter(Boolean).map((r) => r.split(":").map(Number) as [number, number, number, number]);
const masked = (x: number, y: number) => masks.some(([a, b, c, d]) => x >= a && x <= b && y >= c && y <= d);
const runs: Json[] = [];
for (let run = 0; run < 2; run++) {
  const tmp = mkdtempSync(join(tmpdir(), "audit20-"));
  const r = spawnSync("python3", ["tools/run-mgba-probe.py", join(tmp, "p.json"), "--", "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python",
    "tools/integration/audit20Probe.py", fixtures[0]!.f.scenario, join(tmp, "p.json"), join(tmp, "rgb")], { encoding: "utf8",
    env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH ?? "/Users/kyle/Developer/pokebench/vendor/libmgba-py" } });
  const probe = JSON.parse(readFileSync(join(tmp, "p.json"), "utf8")) as Json;
  const perFixture: Json = {};
  for (const v of variants) {
    const w = v.f.denseWindow!;
    const body = (probe.bodies as Json[]).find((b) => b.startFrame === w.startFrame && b.endFrame === w.endFrame);
    const res: Json = { sameWindow: body !== undefined };
    // A fresh probe run whose ROM trajectory diverged (ISSUES #154 class: the window's body is not where the fixture says, its frames
    // were not dumped) is recorded as diverged (digest "diverged", px -1), not rendered.
    if (body === undefined) {
      for (const kind of ["chain", "entry"] as const) res[kind] = { digest: "diverged", rows: 0, exactRows: 0, px: -1, residualRows: [], detail: [] };
      perFixture[v.name] = res;
      continue;
    }
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
          if (masked(p % 240, (p / 240) | 0)) continue;
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
  const pick = (k: "chain" | "entry") => ({ live: v[k].live, decline: v[k].decline, orderKnown: v[k].orderKnown, orderDeferred: v[k].orderDeferred,
    orderInvalid: v[k].orderInvalid, allocatorInput: v[k].allocatorInput, firstBody: v[k].firstBody, hidden: v[k].hidden, doll: v[k].doll,
    invalidatedBy: v[k].invalidatedBy, rows: a![k].rows, exactRows: a![k].exactRows, px: a![k].px,
    digests: [a![k].digest, b![k].digest], residualRows: a![k].residualRows.slice(0, 40), detail: a![k].detail });
  const romInvisible = (v.f.rom as Json).invisible as boolean[];
  return { fixture: v.name, move: v.f.move, side: v.f.attacker.geometry.side, species: `${v.f.attacker.species}/${v.f.target.species}`,
    alloc: allocOf(v),
    units: (v.f.precedingTurns as Json[]).flatMap((t) => t.events).length - 1, romInvisible,
    hideAgree: romInvisible.every((x, i) => i === (v.f.attacker.geometry.side === "player" ? 0 : 1) || x === v.chain.hidden[i]),
    promptShown: v.f.promptShown,
    history: (v.f.precedingTurns as Json[]).map((t) => (t.events as Json[]).map((e) => e.kind === "status-animation"
      ? `status:${spriteOrderStatusAnimationName(e.isStatus2 !== 0, e.status)}@${e.battler}` : e.animationId === "MOVE_ANIMATION"
      ? `${e.arguments[0]}${e.arguments[1] === "1" ? "t1" : ""}@${e.battler}` : `${e.animationId}${e.arguments?.length ? `(${e.arguments.join(",")})` : ""}@${e.battler}`).join(" ")),
    romPower: (v.f.rom as Json).power, request: v.f.requestFields,
    unitPowers: (v.f.precedingTurns as Json[]).flatMap((t) => t.events as Json[]).slice(0, -1).filter((e) => e.arguments?.[0] === "222")
      .map((e) => Number(e.arguments[2])), window: v.f.denseWindow, sameWindow: [a!.sameWindow, b!.sameWindow], x2: v.chain.x2, chain: pick("chain"), entry: pick("entry") };
});
// probe exit codes (0 / 138 / 139 teardown) vary run to run: printed, not written, so the receipt is byte-reproducible.
console.log("probe exits", runs.map((r) => r.exit).join(" "));
writeFileSync(out, `${JSON.stringify({ schema: "audit20-chain-check/v1", scenario, rows }, null, 1)}\n`);
for (const r of rows) {
  console.log(r.fixture, JSON.stringify({ live: r.chain.live, decline: r.chain.decline, order: r.chain.orderKnown, alloc: r.chain.allocatorInput,
    allocEqual: r.alloc.equal,
    rows: r.chain.rows, px: r.chain.px, same: r.chain.digests[0] === r.chain.digests[1], hideAgree: r.hideAgree, entryLive: r.entry.live,
    entryPx: r.entry.px, entrySame: r.entry.digests[0] === r.entry.digests[1] }));
}
