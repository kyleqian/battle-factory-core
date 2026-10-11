/**
 * Compare production live-field adapters to complete fresh source move bodies.
 * The tool supplies a displayed field and typed request, never a captured
 * per-frame host/config. Ordinary command selection is tested independently.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesNames from "../../src/data/gen/species-names.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveDiveSetupSplashBirth, liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveMoveTimingBodyOf } from "../../src/engine/liveMoveTimingPolicy.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator, prepareLiveMoveSpriteOrder } from "../../src/engine/liveMoveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, bonemerangHit2Free, createLiveSpriteOrderHost, digUnleashLend, lendLiveSpriteOrder,
  markLiveSpriteOrderDeferredBody, type LiveSpriteOrderHost,
} from "../../src/engine/liveSpriteOrderHost.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState,
  spriteOrderPlanTableFromFixture,
  type SpriteOrderPlan,
} from "../../src/engine/spriteOrderProvider.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend, type SpriteOrderPresentationEvent,
} from "../../src/engine/spriteOrderEventTransform.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import {
  activateLiveMovePresentationRng, GENERAL_RAIN_RANDOM2_PLAN, liveMovePresentationRngBodyKey, liveMoveRandom2Plan, type LiveMovePresentationRngInput,
  type LiveMoveRandom2PlanContext,
} from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt, recordPresentationRngSubStream } from "../../src/engine/presentationRngHost.ts";
import { generalAnimationPresentationRngKey } from "../../src/engine/wordsOrderUnits.ts";
import {
  LIVE_BATTLER_X2_IDLE, applyLiveBattlerX2Event, liveBattlerX2EventsOf, liveMoveBattlerX2Input, type LiveBattlerX2Event,
  type LiveMoveBattlerX2Input,
} from "../../src/engine/liveBattlerX2History.ts";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { SceneOnDragonRageFieldProfile } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { replayPostKoTurnsThroughHost, type PostKoHostLend, type PostKoTurn } from "./postkoHostReplay.ts";

export interface Fixture {
  sourceFixture?: string;
  move: string;
  denseWindow?: { startFrame: number; endFrame: number; ageOffset?: number };
  /** Ordered inclusive source-frame segments of one body whose rows are not contiguous. */
  denseSegments?: [number, number][];
  sourceWindow?: { startFrame: number; endFrame: number };
  probeMoveId?: number;
  probe: string;
  /** Extra probe CLI arguments (for example a defensive-wall mode). */
  probeArgs?: string[];
  scenario: string;
  attacker: { species: string; geometry: { side: "player" | "opponent" } };
  target: { species: string; geometry: { side: "player" | "opponent" } };
  fieldProfile: SceneOnDragonRageFieldProfile;
  /** Displayed status of each battler at the body (presentation field only; default none, e.g. the sleeping Sleep Talk user). */
  displayedStatus?: { player?: "none" | "sleep" | "burn" | "poison" | "paralysis" | "freeze"; opponent?: "none" | "sleep" | "burn" | "poison" | "paralysis" | "freeze" };
  /** Real attacker party personality (Spinda spots); presentation-only. */
  attackerPersonality?: number;
  /** Self-target moves: the species displayed on the other side of the field. */
  bystander?: { species: string };
  body?: "normal" | "shattered-wall";
  /** Controller arguments the ROM held at this body (gAnimMoveTurn/Power/Dmg). */
  /** Source text box content during this body (default: the move-used banner). */
  messageLines?: [string, string];
  requestFields?: { turn?: number; power?: number; damage?: number; friendship?: number; rolloutCounter?: number };
  /**
   * Units that ran before this body in the scenario (docs/sprite-order-body-plans.md §2/§5): bodies by move id and
   * ATTACKER side, in order. Omitted = this is the scenario's first body after the known entry. The harness replays
   * them with the plan applier (gap tables between units) and asserts the resulting free order equals the
   * per-fixture value in order-consumer-seeds.json (provider == accepted literal == observed); never capture rows.
   * `statAnimation` marks a STATS_CHANGE unit (moveId 0; its B_ANIM_STATS_CHANGE argument), fed as the production
   * `stat-animation` event (plan key `0:any`; no battler x2 effect, liveBattlerX2History KEEP_ANIMATIONS). `statusAnimation` (e.g. "SLP") marks an
   * InitAndLaunchChosenStatusAnimation unit (moveId 0), fed as the production `status-animation` event (prep28: Snore after Sleep Powder).
   */
  precedingBodies?: { moveId: number; side: "player" | "opponent"; statAnimation?: number; statusAnimation?: string }[];
  /**
   * Post-KO bodies (docs/postko-consumer-audit.md §4): the scenario's recorded semantic event history, one turn per action
   * prompt, ending with this body. The harness replays it through the PRODUCTION live hosts (postkoHostReplay.ts:
   * liveSpriteOrderHost + the orchestrator's allocator seam) and supplies their lends at the activation edge; never a
   * value copied from the ROM state.
   */
  precedingTurns?: PostKoTurn[];
  /**
   * Battler x2 history events of the scenario before this body when it contains more than move bodies (ISSUES #148: a
   * faint + replacement send-in), in order, from the scenario's ROM receipt; the PRODUCTION tracker derives the state
   * from them (fixtureBattlerX2Input). Takes precedence over precedingBodies for the x2 input only.
   */
  precedingX2Events?: LiveBattlerX2Event[];
  /** Dig unleash body after its setup (prep18 s1.1): the production host lends the post-setup order (`digUnleashLend`). */
  digUnleashAfterSetup?: boolean;
  /**
   * Ice Ball counter body k > 0 (docs/s10a-random2-order-lend-blocker.md design 1): the chain's earlier bodies' probed activation values
   * (counters 0..k-1, the scenario's own animationRng at each body's row 0) and whether the foe's Tackle runs first each turn (accepted
   * SPHEAL: REGISTEEL is faster) or after the Ice Ball (GLALIE). The harness drives the PRODUCTION order host through the history (prompt
   * cycle, bodies, visible hit blips; the marker at each Ice Ball body) and lends what it lends: the deferred lend, resolved by the seam with
   * the pinned host holding every chain body's words.
   */
  iceBallChain?: { earlier: { value: number; source: string }[]; foeFirst: boolean };
  /**
   * S10A words46 (docs/next-adapters-prep46.md): a consumer after Random2-words order units. `turns` is the order-relevant history from the
   * battle entry, one list per prompt cycle: ["body", moveId, side] (a move body lent + marked as the orchestrator does), ["hit", side],
   * ["stat", side, argument], ["rain"] (B_ANIM_RAIN_CONTINUES); the LAST body step is the fixture's own body. The harness drives the PRODUCTION
   * order host through it and lends what it lends (the word-free deferred marker). TEST-ONLY PIN HOOK: each earlier words unit's probed
   * activation value (`words`, in order: Sand-Attack / Mud-Slap / Rain Dance bodies and RAIN_CONTINUES events, RAM-read gRng2Value at the
   * unit's activation) seeds a pinned host whose words follow the production law (body activation / non-consuming sub-stream) under the
   * unit's production key; the render seam reads them by key, exactly as in play. Production never reads capture rows.
   */
  wordsChain?: { turns: (readonly (string | number | Readonly<{ player: number; opponent: number }>)[])[][]; words: { value: number; source: string }[] };
  /**
   * Faithful-random (Random2) bodies: the oracle-pinned presentation stream value at the activation frame (gRng2Value
   * after the first anim-active frame, from a direct-mGBA probe of this scenario; provenance "pinned"). The harness
   * seeds a pinned host with it and activates the body through the PRODUCTION activation (liveMovePresentationRng.ts);
   * render reads the words from that host exactly as in play. Never a word array.
   */
  presentationRngActivation?: { value: number; source: string };
}
interface Probe {
  frames?: { frame: number; sha256: string }[] | number;
  rows?: { frame: number; sha256: string }[];
  /** postkoStateProbe.py: every frame's RGB888 sha256, indexed by frame. */
  sha256?: string[];
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ids = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.id]));
const names = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.name]));
const powers: Record<number, number> = Object.fromEntries(moveData.moves.map(row => [row.id, (row as { power?: number }).power ?? 0]));
const SELF_TARGET_MOVES = new Set(["LIGHT_SCREEN", "BARRIER", "MAGIC_COAT", "PROTECT", "REFLECT", "SOFT_BOILED"]);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

let planCache: ReturnType<typeof spriteOrderPlanTableFromFixture> | undefined;
const planFixture = (): ReturnType<typeof spriteOrderPlanTableFromFixture> => planCache ??= spriteOrderPlanTableFromFixture(
  JSON.parse(readFileSync(resolve(root, "tools/integration/fixtures/sprite-order-body-plans.json"), "utf8")));
interface SeedRow { scenario: string; move: number; attackerSide: string; observedFreeAtEdge?: number[];
  providerValid?: boolean; unitIndex: number }
let seedsCache: { scenarios: SeedRow[] } | undefined;
const seedsFixture = (): { scenarios: SeedRow[] } => seedsCache ??=
  JSON.parse(readFileSync(resolve(root, "tools/integration/fixtures/order-consumer-seeds.json"), "utf8"));

/** Order cursor at the fixture body's activation edge: known entry + the declared preceding bodies' plans. */
export function fixtureSpriteOrder(f: Fixture, request: BattleMoveAnimationRequest) {
  // POKEBENCH_LIVE_ORDER_INPUT=first-body: ignore precedingBodies and lend the known-entry order, exactly what
  // production supplies when the move is the battle's first body (the oracle frames still come from the scenario).
  if (process.env.POKEBENCH_LIVE_ORDER_INPUT === "first-body") f = { ...f, precedingBodies: [] };
  const table = planFixture();
  const entry = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove.occupants.map(o => o.slot);
  let cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("battle-lab-ordinary-singles"), entry);
  const keys = [...(f.precedingBodies ?? []).map(u => u.statAnimation === undefined && u.statusAnimation === undefined ? `${u.moveId}:${u.side}` : "0:any"),
    `${request.moveId}:${f.attacker.geometry.side}`];
  let previous = "entry";
  keys.forEach((key, index) => {
    const gap: SpriteOrderPlan | undefined = table.gaps.get(`${previous}>${key}`) ?? table.gapAfterBody.get(previous)
      ?? (previous === "entry" ? [] : undefined);
    cursor = applySpriteOrderUnitPlan(cursor, gap);
    if (index < keys.length - 1) cursor = applySpriteOrderUnitPlan(cursor, table.bodies.get(key));
    previous = key;
  });
  if (!cursor.order.known) {
    // No plan unit exists for this preceding-body pair (prep8: Tackle -> Horn Drill, Peck -> Stockpile): use the production
    // order host's own tracker (spriteOrderEventTransform), fed the events the orchestrator feeds (prompt, commit, each body as
    // move-animation, a visible hit after the damaging Tackle/Peck), exactly the lend production makes at the activation edge.
    let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    const feed = (event: SpriteOrderPresentationEvent) => { tracker = applySpriteOrderPresentationEvent(tracker, event); };
    feed({ kind: "action-prompt" }); feed({ kind: "actions-committed" });
    for (const unit of f.precedingBodies ?? []) {
      if (unit.statAnimation !== undefined) { feed({ kind: "stat-animation", argument: unit.statAnimation }); continue; }
      if (unit.statusAnimation !== undefined) { feed({ kind: "status-animation", status: unit.statusAnimation }); continue; }
      feed({ kind: "move-animation", moveId: unit.moveId, attackerSide: unit.side });
      // POKEBENCH_LIVE_ORDER_HIT=damaging: control that also feeds the visible hit after every other damaging body (power > 0).
      if (unit.moveId === 33 || unit.moveId === 64 || (process.env.POKEBENCH_LIVE_ORDER_HIT === "damaging"
        && (powers[unit.moveId] ?? 0) > 0)) feed({ kind: "hit-animation", targetVisible: true });
    }
    const lent = spriteOrderTrackerLend(tracker);
    if (lent === null) throw new Error(`Sprite order unknown for ${f.move}`);
    return { ...cursor, order: { known: true as const, free: lent, pendingDestroyed: [] } };
  }
  const scenarioName = basename(f.scenario, ".json").replace(/^mechanic-/, "");
  const row = seedsFixture().scenarios.find(s => s.scenario === scenarioName && s.move === request.moveId
    && s.attackerSide === f.attacker.geometry.side && s.unitIndex === 1 + 2 * (f.precedingBodies?.length ?? 0));
  if (row && process.env.POKEBENCH_LIVE_ORDER_INPUT !== "first-body") {
    if (!row.providerValid || JSON.stringify(row.observedFreeAtEdge) !== JSON.stringify(cursor.order.free)) {
      throw new Error(`Plan-replayed order differs from order-consumer-seeds.json for ${scenarioName}`);
    }
  }
  return cursor;
}

const postKoLends = new WeakMap<PostKoTurn[], PostKoHostLend>();
/** Production host lends of a post-KO fixture (memoized per recorded history). */
export function fixturePostKoLend(f: Fixture, request: BattleMoveAnimationRequest): PostKoHostLend | undefined {
  if (!f.precedingTurns) return undefined;
  let lend = postKoLends.get(f.precedingTurns);
  if (!lend) {
    const body = f.precedingTurns.at(-1)?.events.at(-1) as { arguments?: string[]; battler?: number } | undefined;
    if (Number(body?.arguments?.[0]) !== request.moveId || body?.battler !== request.attacker) {
      throw new Error(`precedingTurns of ${f.move} do not end with its body`);
    }
    lend = replayPostKoTurnsThroughHost(f.precedingTurns);
    postKoLends.set(f.precedingTurns, lend);
  }
  return lend;
}

/** ice72: the species ids the fixture's field displays on each side (liveView's battlers). */
function fixtureFieldSpecies(f: Fixture): { player: number; opponent: number } {
  const id = (side: "player" | "opponent") => {
    const mon = f.attacker.geometry.side === side ? f.attacker : f.bystander ?? f.target;
    const species = speciesStats.species.find(s => s.name === `SPECIES_${mon.species}`)?.id;
    if (species === undefined) throw new Error(`Unknown species ${mon.species}`);
    return species;
  };
  return { player: id("player"), opponent: id("opponent") };
}
const chainLends = new WeakMap<object, { spriteOrderInput: LiveMoveSpriteOrderInput | undefined; presentationRng: LiveMovePresentationRngInput }>();
/** Production order host lend + pinned presentation host of an Ice Ball chain fixture body (iceBallChain). */
export function fixtureIceBallChain(f: Fixture, request: BattleMoveAnimationRequest) {
  const chain = f.iceBallChain!;
  let cached = chainLends.get(chain);
  if (cached) return cached;
  const battler = request.attacker as 0 | 1, foe = (1 - battler) as 0 | 1;
  const ev = (sequence: number, kind: string, extra: object) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const move = (seq: number, who: 0 | 1, args: string[]) => ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler: who, target: 1 - who, arguments: args });
  const hit = (seq: number, target: 0 | 1) => ev(seq, "animation", { animationId: "HIT_ANIMATION", battler: target, target, arguments: [] });
  const values = [...chain.earlier.map((e) => e.value), f.presentationRngActivation!.value];
  let order: LiveSpriteOrderHost = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let host = createPresentationRngHostAt(createPresentationRngState(values[0]!, "pinned"));
  const bodies: (typeof host.bodies)[number][] = [];
  let lend: LiveMoveSpriteOrderInput | undefined;
  let key = "";
  values.forEach((value, k) => {
    const counter = k + 1;
    const iceArgs = ["301", "0", String(30 << k), "0", "70", "0", String(counter)];
    const foeBody = [move(10 * k, foe, ["33", "0", "35", "0", "70", "0"]), hit(10 * k + 1, battler)];
    const iceBody = [move(10 * k + 2, battler, iceArgs), hit(10 * k + 3, foe)];
    const events = chain.foeFirst ? [...foeBody, ...iceBody] : [...iceBody, ...foeBody];
    order = beginLiveSpriteOrderTurn(order, k + 1, true);
    const resolution = { resolutionId: { requestId: k + 1 }, segmentIndex: 0, segments: [{ events }] };
    const commandIndex = events.findIndex((e) => (e.payload as { arguments?: string[] }).arguments?.[0] === "301");
    order = advanceLiveSpriteOrderHost(order, resolution, events[commandIndex]!.sequence, true);
    const req = battleMoveAnimationRequest(battler, foe, iceArgs);
    lend = lendLiveSpriteOrder(order, 301);
    key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: k + 1 }, segmentIndex: 0, commandIndex });
    // ice72: the species displayed at the body (the fixture's field), recorded in the marker as the orchestrator records it
    order = markLiveSpriteOrderDeferredBody(order, lend, req, key, fixtureFieldSpecies(f));
    // Each chain body's words: the pinned activation value of that body (fixture provenance), activated through the production seam.
    const pinned = activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(value, "pinned")), req, key);
    bodies.push(...pinned.bodies);
    host = pinned;
    if (k < values.length - 1) order = advanceLiveSpriteOrderHost(order, resolution, Number.POSITIVE_INFINITY);
  });
  // POKEBENCH_LIVE_ICEBALL_CHAIN=entry-lend: negative control, the words-free known-entry lend instead of the deferred lend.
  if (process.env.POKEBENCH_LIVE_ICEBALL_CHAIN === "entry-lend") lend = { known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER };
  cached = { spriteOrderInput: lend, presentationRng: { host: Object.freeze({ ...host, bodies: Object.freeze(bodies) }), key } };
  chainLends.set(chain, cached);
  return cached;
}

const wordsChainLends = new WeakMap<object, { spriteOrderInput: LiveMoveSpriteOrderInput | undefined; presentationRng: LiveMovePresentationRngInput }>();
/** Production order host lend + pinned presentation host of a words46 consumer fixture (wordsChain). */
export function fixtureWordsChain(f: Fixture): { spriteOrderInput: LiveMoveSpriteOrderInput | undefined; presentationRng: LiveMovePresentationRngInput } {
  const chain = f.wordsChain!;
  const cached = wordsChainLends.get(chain);
  if (cached) return cached;
  const ev = (sequence: number, kind: string, extra: object) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const who = (side: unknown): 0 | 1 => side === "player" ? 0 : 1;
  let order: LiveSpriteOrderHost = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const bodies: ReturnType<typeof createPresentationRngHostAt>["bodies"][number][] = [];
  const pinned = (value: number) => createPresentationRngHostAt(createPresentationRngState(value, "pinned"));
  const words = [...chain.words];
  let lend: LiveMoveSpriteOrderInput | undefined;
  let key = "";
  const lastTurn = chain.turns.length - 1;
  chain.turns.forEach((steps, t) => {
    const requestId = t + 1;
    order = beginLiveSpriteOrderTurn(order, requestId, true);
    const events = steps.map((step, i) => {
      const seq = 10 * requestId + i;
      if (step[0] === "body") {
        const b = who(step[2]);
        // dive70: an optional 5th element is the body's gAnimMoveTurn (Dive setup 0 / attack 1)
        return ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler: b, target: 1 - b, arguments: [String(step[1]), String(step[4] ?? 0), "40", "10", "70", "0"] });
      }
      if (step[0] === "hit") return ev(seq, "animation", { animationId: "HIT_ANIMATION", battler: who(step[1]), target: who(step[1]), arguments: [] });
      if (step[0] === "stat") return ev(seq, "animation", { animationId: "STATS_CHANGE", battler: who(step[1]), target: who(step[1]), arguments: [String(step[2] ?? 20)] });
      if (step[0] === "rain") return ev(seq, "animation", { animationId: "RAIN_CONTINUES", battler: 0, target: 0, arguments: [] });
      // words57: battle units after a words unit (an opponent KO + next-mon summary / hide / send-out; the Factory AI's DoSwitchOut summary,
      // which the host applies as the opponent's recall + summary) and other general animations (SUN_CONTINUES)
      if (step[0] === "faint") return ev(seq, "faint-animation", { battler: who(step[1]) });
      if (step[0] === "summary") return ev(seq, "draw-party-status-summary", { battler: 1 });
      if (step[0] === "aisummary") {
        return Object.freeze({ sequence: seq, payload: { kind: "draw-party-status-summary", battler: 1 },
          provenance: { sourceLabel: "BattleScript_DoSwitchOut" } }) as unknown as BattleKernelSemanticEvent;
      }
      if (step[0] === "hide") return ev(seq, "hide-party-status-summary", { battler: 1 });
      if (step[0] === "sendout") return ev(seq, "switch-in-animation", { battler: 1, partyIndex: Number(step[1] ?? 1) });
      // st76: an optional 3rd element is the general animation's battler side (HELD_ITEM_EFFECT on the holder; default 0)
      if (step[0] === "general") {
        const b = step[2] === undefined ? 0 : who(step[2]);
        return ev(seq, "animation", { animationId: String(step[1]), battler: b, target: b, arguments: [] });
      }
      // st76: a status1 animation (InitAndLaunchChosenStatusAnimation): ["status", side, status1 bits]
      if (step[0] === "status") return ev(seq, "status-animation", { battler: who(step[1]), isStatus2: 0, status: Number(step[2]) });
      throw new Error(`wordsChain step ${JSON.stringify(step)}`);
    });
    const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events }] };
    const lastBody = steps.map((s) => s[0]).lastIndexOf("body");
    steps.forEach((step, commandIndex) => {
      const event = events[commandIndex]!;
      if (step[0] === "rain") {
        const value = words.shift()!.value;
        bodies.push(...recordPresentationRngSubStream(pinned(value), generalAnimationPresentationRngKey(requestId, 0, event.sequence), GENERAL_RAIN_RANDOM2_PLAN).bodies);
        return;
      }
      if (step[0] !== "body") return;
      order = advanceLiveSpriteOrderHost(order, resolution, event.sequence, true);
      const payload = event.payload as unknown as { battler: 0 | 1; target: 0 | 1; arguments: string[] };
      const req = battleMoveAnimationRequest(payload.battler, payload.target, payload.arguments);
      const bodyLend = lendLiveSpriteOrder(order, req.moveId);
      const bodyKey = liveMovePresentationRngBodyKey({ resolutionId: { requestId }, segmentIndex: 0, commandIndex });
      if (t === lastTurn && commandIndex === lastBody) {
        lend = bodyLend; key = bodyKey;
        // st76: a Dive SETUP fixture body records its words with the production plan context (liveDiveSetupSplashBirth), as below
        const lastSpecies = step[3] as { player: number; opponent: number } | undefined;
        const lastContext = req.moveId === 291 && (req.turn & 1) === 0 && lastSpecies !== undefined
          ? { diveSetupSplashBirth: liveDiveSetupSplashBirth({ player: { species: lastSpecies.player }, opponent: { species: lastSpecies.opponent } } as unknown as BattleResolutionDisplayedField,
            req.attacker === 0 ? "player" : "opponent") } : undefined;
        if (liveMoveRandom2Plan(req) !== null) bodies.push(...activateLiveMovePresentationRng(pinned(f.presentationRngActivation!.value), req, bodyKey, lastContext).bodies);
        return;
      }
      // words59: a body step may carry the species displayed at the body (["body", move, side, { player, opponent }]), recorded in the
      // marker as the orchestrator records it (the dirt carry's anchors past a send-out)
      const bodySpecies = step[3] as { player: number; opponent: number } | undefined;
      order = markLiveSpriteOrderDeferredBody(order, bodyLend, req, bodyKey, bodySpecies);
      if ([28, 189, 240].includes(req.moveId)) bodies.push(...activateLiveMovePresentationRng(pinned(words.shift()!.value), req, bodyKey).bodies);
      // dive70: an earlier Dive body (the setup before the fixture's attack body) records its words under its key with the production
      // plan context (the setup splash birth from the body's displayed species, liveDiveSetupSplashBirth)
      if (req.moveId === 291) {
        if (bodySpecies === undefined) throw new Error("wordsChain: a Dive body step needs its displayed species");
        const field = { player: { species: bodySpecies.player }, opponent: { species: bodySpecies.opponent } } as unknown as BattleResolutionDisplayedField;
        const context = (req.turn & 1) === 0 ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field, req.attacker === 0 ? "player" : "opponent") } : undefined;
        bodies.push(...activateLiveMovePresentationRng(pinned(words.shift()!.value), req, bodyKey, context).bodies);
      }
    });
    if (t < lastTurn) order = advanceLiveSpriteOrderHost(order, resolution, Number.POSITIVE_INFINITY);
  });
  if (words.length !== 0) throw new Error("wordsChain: unused words");
  // POKEBENCH_LIVE_WORDS_CHAIN=entry-lend: negative control, the words-free known-entry lend instead of the deferred lend.
  if (process.env.POKEBENCH_LIVE_WORDS_CHAIN === "entry-lend") lend = { known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER };
  const result = { spriteOrderInput: lend, presentationRng: { host: Object.freeze({ ...pinned(0), bodies: Object.freeze(bodies) }), key } };
  wordsChainLends.set(chain, result);
  return result;
}

/** Pinned controlled-body host for a Random2 fixture body, activated through the production seam at host frame 0. */
export function fixturePresentationRng(f: Fixture, request: BattleMoveAnimationRequest, context?: LiveMoveRandom2PlanContext): LiveMovePresentationRngInput | undefined {
  if (liveMoveRandom2Plan(request) === null) return undefined;
  const pinned = f.presentationRngActivation;
  if (!pinned || !Number.isInteger(pinned.value) || pinned.value < 0 || pinned.value > 0xffffffff) {
    throw new Error(`${f.move} draws Random2: the fixture needs presentationRngActivation (pinned activation value)`);
  }
  const key = liveMovePresentationRngBodyKey({ resolutionId: { requestId: 0 }, segmentIndex: 0, commandIndex: 0 });
  const host = activateLiveMovePresentationRng(
    createPresentationRngHostAt(createPresentationRngState(pinned.value, "pinned")), request, key, context);
  return { host, key };
}

/**
 * Battler x2 history at the fixture body's activation edge (ISSUES #148), through the PRODUCTION tracker
 * (liveBattlerX2History.ts) from the scenario's real history: both battlers sent in (idle), then precedingX2Events, the
 * recorded post-KO semantic events (precedingTurns, without the body itself) or each declared preceding body
 * (precedingBodies). Never a
 * hand-set state. POKEBENCH_LIVE_X2_INPUT=species-rest withholds it (the pre-#148 species front-idle rest).
 */
export function fixtureBattlerX2Input(f: Fixture): LiveMoveBattlerX2Input | undefined {
  if (process.env.POKEBENCH_LIVE_X2_INPUT === "species-rest") return undefined;
  let history = LIVE_BATTLER_X2_IDLE;
  if (f.precedingX2Events) {
    // POKEBENCH_LIVE_X2_INPUT=no-send-in: control that drops the send-in resets (the pre-send-in battler's history).
    const events = process.env.POKEBENCH_LIVE_X2_INPUT === "no-send-in"
      ? f.precedingX2Events.filter((event) => event.kind !== "send-in") : f.precedingX2Events;
    history = events.reduce(applyLiveBattlerX2Event, history);
  } else if (f.precedingTurns) {
    const payloads = f.precedingTurns.flatMap((turn) => turn.events).slice(0, -1);
    for (const payload of payloads) {
      for (const event of liveBattlerX2EventsOf({ payload } as unknown as BattleKernelSemanticEvent)) {
        history = applyLiveBattlerX2Event(history, event);
      }
    }
  } else {
    for (const unit of f.precedingBodies ?? []) {
      if (unit.statAnimation !== undefined || unit.statusAnimation !== undefined) continue;
      history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: unit.moveId, attackerSide: unit.side });
    }
  }
  return liveMoveBattlerX2Input(history);
}

/**
 * prep16 s0.3 first-body marker: what the production order host lends while no unit has run since the battle began
 * (liveSpriteOrderHost `bodies` 0). A fixture is a first body when it declares no preceding body, turn or x2 event; the
 * POKEBENCH_LIVE_ORDER_INPUT=first-body control forces it, mirroring fixtureSpriteOrder.
 */
function withFirstBody(f: Fixture, input: ReturnType<typeof prepareLiveMoveSpriteOrder>["input"]) {
  if (input === undefined) return undefined;
  const first = process.env.POKEBENCH_LIVE_ORDER_INPUT === "first-body"
    || (!f.precedingBodies?.length && !f.precedingTurns && !f.precedingX2Events);
  if (first) return { ...input, firstBody: true as const };
  // prep29: Bonemerang hit 2 directly after a first-body hit 1 (host `bonemerangHit1`).
  const only = f.precedingBodies?.length === 1 && !f.precedingTurns && !f.precedingX2Events ? f.precedingBodies[0]! : undefined;
  return only?.moveId === 155 && only.statAnimation === undefined && only.statusAnimation === undefined && f.move === "BONEMERANG"
    ? { ...input, free: bonemerangHit2Free(), afterBonemerangHit1: true as const } : input;
}

// Production reads display names from species-names.json (MR_MIME -> "MR. MIME"); the raw constant drops punctuation glyphs.
const dispName = (c: string): string =>
  speciesNames.species.find(s => s.species === `SPECIES_${c}`)?.name ?? c;
export function liveView(f: Fixture, age: number): BattleResolutionPresentationRenderView {
  const profile = f.fieldProfile;
  const makeBattler = (side: "player" | "opponent") => {
    const mon = f.attacker.geometry.side === side ? f.attacker : f.bystander ?? f.target;
    const species = speciesStats.species.find(s => s.name === `SPECIES_${mon.species}`)?.id;
    if (species === undefined) throw new Error(`Unknown species ${mon.species}`);
    return {
      ...(f.attacker.geometry.side === side && f.attackerPersonality !== undefined
        ? { personality: f.attackerPersonality } : {}),
      species, name: dispName(mon.species), side: side === "player" ? "player" as const : "trainer" as const,
      battler: side === "player" ? 0 as const : 1 as const, partyIndex: 0 as const,
      level: (profile as { playerLevel?: number; opponentLevel?: number })[side === "player" ? "playerLevel" : "opponentLevel"] ?? 50,
      hp: side === "player" ? profile.playerHp : profile.opponentHp,
      maxHP: side === "player" ? profile.playerMaxHp : profile.opponentMaxHp,
      gender: (side === "player" ? profile.playerGender : profile.opponentGender) ?? "male",
      status: f.displayedStatus?.[side] ?? "none" as const, moveIds: [0, 0, 0, 0] as const,
      currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    };
  };
  const field: BattleResolutionDisplayedField = { player: makeBattler("player"), opponent: makeBattler("opponent") };
  const attacker = f.attacker.geometry.side === "player" ? 0 : 1;
  const request: BattleMoveAnimationRequest = {
    moveId: ids[f.move]!, attacker,
    target: SELF_TARGET_MOVES.has(f.move) ? attacker : attacker === 0 ? 1 : 0,
    // ret88: every committed Return fixture (return-live, prep48, later48) was staged with a friendship-255 attacker (ReturnStrongest);
    // a fixture of another power level names its friendship in requestFields.
    turn: f.body === "shattered-wall" ? 1 : 0, power: 0, damage: 0, friendship: f.move === "RETURN" ? 255 : 70, multihit: 0,
    ...f.requestFields,
  };
  if (liveMoveAnimationDuration(request, field) === null) throw new Error(`No live adapter for ${f.move}`);
  const postKo = fixturePostKoLend(f, request);
  const healthbox = (mon: typeof field.player) => ({
    name: mon.name, level: mon.level, gender: mon.gender === "genderless" ? "none" as const : mon.gender, status: mon.status,
    hpFraction: mon.hp / mon.maxHP, currentHp: mon.hp, maxHp: mon.maxHP,
  });
  // Battle text uses the source's display spelling (for example VICEGRIP,
  // not a synthesized "VICE GRIP"). This remains fixture-independent.
  const name = names[f.move] ?? f.move.replaceAll("_", " ");
  return {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: { player: healthbox(field.player), opponent: healthbox(field.opponent) },
    message: { lines: f.messageLines ?? [`${attacker === 1 ? "Foe " : ""}${dispName(f.attacker.species)} used`, `${name}!`], visibleCharacters: 99 },
    effect: {
      type: "move", request, age,
      // Plans exist only for audited moves; every other move yields no input. Post-KO fixtures: the production hosts'
      // lends after replaying the recorded history (re-seeded entry-label allocator host, pi(F) order).
      spriteAllocatorInput: postKo ? postKo.spriteAllocatorInput : prepareLiveMoveSpriteAllocator(
        createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove,
        request,
      ).input,
      // Every fixture body is the scenario's first move body after the known entry: supply the order exactly as
      // production does there (known-entry F, checked against the allocator occupancy), never from capture rows.
      // POKEBENCH_LIVE_ORDER_INPUT=none withholds it (order-independent adapters must stay exact without a host order).
      spriteOrderInput: process.env.POKEBENCH_LIVE_ORDER_INPUT === "none" ? undefined
        : f.wordsChain ? fixtureWordsChain(f).spriteOrderInput
        : f.iceBallChain ? fixtureIceBallChain(f, request).spriteOrderInput
        : postKo ? postKo.spriteOrderInput
          : f.digUnleashAfterSetup ? digUnleashLend()
          : withFirstBody(f, prepareLiveMoveSpriteOrder(fixtureSpriteOrder(f, request).order, request).input),
      // words46: the render view passes the presentation host to any consumer of a deferred lend (battleResolutionPresentationRender.ts).
      ...(f.wordsChain ? { presentationRng: fixtureWordsChain(f).presentationRng }
        : liveMoveRandom2Plan(request) === null ? {} : { presentationRng: f.iceBallChain ? fixtureIceBallChain(f, request).presentationRng : fixturePresentationRng(f, request, request.moveId === 291
        && (request.turn & 1) === 0 ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field, attacker === 0 ? "player" : "opponent") } : undefined) }),
      ...(fixtureBattlerX2Input(f) === undefined ? {} : { battlerX2Input: fixtureBattlerX2Input(f) }),
    },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null,
    midBattleSwitchIn: null, switchOut: null, partySummary: null, midBattleSwitchFade: null,
    midBattleSwitchParticles: null, trainerSlide: null,
  };
}

const sharedProbeRuns = new Map<string, { scratch: string }>();

export function verifyLiveAdapterFramebuffer(path: string, freshRuns = 2) {
  const source = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const fixture: Fixture = source.sourceFixture
    ? { ...JSON.parse(readFileSync(resolve(root, source.sourceFixture), "utf8")), ...source }
    : source;
  // These shared source probes require the selected move as a CLI argument.
  const moveArgumentProbes = [
    "tools/compare/poisonFangProbe.py", "tools/compare/crunchProbe.py",
    "tools/compare/crushClawProbe.py", "tools/compare/takeDownProbe.py",
  ];
  const probeMoveId = fixture.probeMoveId
    ?? (moveArgumentProbes.includes(fixture.probe) ? ids[fixture.move] : undefined);
  // These probes take the first source frame to record as a fourth argument.
  const startFrameProbes = ["tools/compare/synthesisProbe.py", "tools/compare/milkDrinkProbe.py",
    "tools/compare/acidProbe.py", "tools/compare/waterGunProbe.py", "tools/compare/earthquakeProbe.py"];
  const probeStartFrame = startFrameProbes.includes(fixture.probe)
    ? (fixture.denseWindow ?? fixture.sourceWindow)?.startFrame : undefined;
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const results: Array<{ digest: string; exactRows: number; rows: number; expectedDuration: number | null; ageOffset: number;
    residualPixels: number } & Record<string, unknown>> = [];
  for (let run = 0; run < freshRuns; run++) {
    // POKEBENCH_LIVE_PROBE_SHARE=1: several fixtures of ONE scenario (e.g. the six Water Spout tier bodies) evaluate the same
    // fresh probe process of run N (run 0 and run 1 are still two separate fresh probe processes); no per-fixture RGB copy.
    const share = process.env.POKEBENCH_LIVE_PROBE_SHARE === "1";
    const shareKey = `${run}|${fixture.probe}|${fixture.scenario}|${(fixture.probeArgs ?? []).join(" ")}`;
    const shared = share ? sharedProbeRuns.get(shareKey) : undefined;
    const scratch = shared?.scratch ?? createScratchDir("pokebench-live-adapter-");
    const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
    if (!shared) {
      const probeRun = spawnSync("python3", [
        join(root, "tools/run-mgba-probe.py"), output, "--",
        join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
        resolve(root, fixture.scenario), output, rgbDir,
        ...(probeMoveId === undefined ? [] : [String(probeMoveId)]),
        ...(probeStartFrame === undefined ? [] : [String(probeStartFrame)]),
        ...(fixture.probeArgs ?? []),
      ], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
      if (probeRun.status !== 0) throw new Error(probeRun.stderr || probeRun.stdout);
      if (share) sharedProbeRuns.set(shareKey, { scratch });
    }
    const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
    // Use the previously accepted complete source-owned window; some probes
    // also retain pre-body text and post-body stat banners. Never pick matching rows.
    const window = fixture.denseWindow ?? fixture.sourceWindow;
    const probeFrames = Array.isArray(probe.sha256) ? probe.sha256.map((sha256, frame) => ({ frame, sha256 }))
      : Array.isArray(probe.frames) ? probe.frames : probe.rows;
    if (!probeFrames) throw new Error("Probe omitted framebuffer rows");
    const segments = fixture.denseSegments;
    const frames = segments
      ? segments.flatMap(([start, end]) => {
          const part = probeFrames.filter(f => f.frame >= start && f.frame <= end);
          if (part.length !== end - start + 1) throw new Error("Probe omitted part of a source segment");
          return part;
        })
      : window
      ? probeFrames.filter(f => f.frame >= window.startFrame && f.frame <= window.endFrame)
      : probeFrames;
    if (!segments && window && (frames.length !== window.endFrame - window.startFrame + 1
      || frames.some((f, i) => f.frame !== window.startFrame + i))) {
      throw new Error("Probe omitted part of the complete source window");
    }
    const ageOffset = fixture.denseWindow?.ageOffset ?? 0;
    const rows = frames.map((frame, rowIndex) => {
      const age = rowIndex + ageOffset;
      const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
      if (rgb.length !== 240 * 160 * 3 || hash(rgb) !== frame.sha256) throw new Error("Source RGB receipt drift");
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, liveView(fixture, age));
      let residualPixels = 0;
      const regions = { field: 0, chrome: 0 };
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
          residualPixels++;
          regions[p < 240 * 112 ? "field" : "chrome"]++;
        }
      }
      return { age, frame: frame.frame, residualPixels, regions, source: hash(rgb), live: hash(rgba) };
    });
    const view0 = liveView(fixture, 0);
    // d4later: the duration of the lend's body class (body-keyed D4 phases), exactly as battleResolutionPresentationRender.ts passes it.
    const effect0 = view0.effect as { request: BattleMoveAnimationRequest; spriteOrderInput?: LiveMoveSpriteOrderInput };
    const expectedDuration = liveMoveAnimationDuration(effect0.request, view0.field, liveMoveTimingBodyOf(effect0.spriteOrderInput));
    const receipt = {
      fixture: path, run, scratch, expectedDuration, ageOffset, rows: rows.length,
      exactRows: rows.filter(r => r.residualPixels === 0).length,
      residualPixels: rows.reduce((a, r) => a + r.residualPixels, 0),
      digest: hash(Buffer.from(JSON.stringify(rows))), firstMismatches: rows.filter(r => r.residualPixels > 0).slice(0, 5),
    };
    writeFileSync(join(scratch, "live-comparison.json"), JSON.stringify({ ...receipt, comparisons: rows }, null, 2) + "\n");
    const retainedRoot = process.env.POKEBENCH_LIVE_EVIDENCE_DIR;
    if (retainedRoot) {
      mkdirSync(retainedRoot, { recursive: true });
      if (share) {
        const dir = join(retainedRoot, `${basename(path, ".json")}-run${run}`);
        mkdirSync(dir, { recursive: true });
        cpSync(join(scratch, "live-comparison.json"), join(dir, "live-comparison.json"));
      } else {
        cpSync(scratch, join(retainedRoot, `${basename(path, ".json")}-run${run}`), {
          recursive: true,
          errorOnExist: true,
        });
      }
    }
    results.push(receipt);
  }
  if (results.some(r => r.digest !== results[0]!.digest)) throw new Error("Fresh source/live results differ");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const results = verifyLiveAdapterFramebuffer(path);
    console.log(JSON.stringify(results, null, 2));
    if (results.some(r => r.exactRows !== r.rows || r.expectedDuration !== r.rows + r.ageOffset)) process.exitCode = 1;
  }
}
