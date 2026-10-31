// prep47: prep45OrderCensus.ts copied, plus (A) a class for every "command resolution without an action prompt" prompt cycle
// (retained opponent locked action: its move, status2 lock bits, continuation or fresh resolution, who moves first in the continuation;
// player locked: its locked move and bits) carried on the chain unit and on every decline whose chain holds it
// (withoutPromptClasses), and (B) the battle-start script events behind the order seed (initializeFreshFactoryBattle replayed with
// the orchestrator's own inputs and checked against the started battle; battleStartSeed on the record). Report adds withoutPromptCases,
// withoutPromptByClass and battleStartSeeds. Same driver, policy and command records otherwise (docs/next-adapters-prep47.md).
// prep45: liveShareCensus.ts's battle driver (copied verbatim: that script runs at import and exports nothing) plus the SPRITE
// ORDER host chain tracker. Every "sprite-order lend unknown" decline carries orderChain: every order-host-invalidating unit since the
// production order host (state.liveMoveSpriteAllocatorHost.orderHost.tracker) was last known, in order, with the production reason
// text (the first = the tracker's own invalidReason; later units from a shadow tracker that skips each chain unit), and
// orderRecoveriesBefore: what revived the host earlier in the battle. Same CLI and report as liveShareCensus.ts plus
// report.orderInvalidatingUnits / orderInvalidationsAll / orderRecoveriesAll / orderShadowAgreement (docs/next-adapters-prep45.md).
// S10A ORDINARY-PLAY LIVE-SHARE CENSUS: how often real Factory play (Scene ON) presents a move body through a live adapter vs
// the scene-off fallback, and why. Each battle is a generated Level-50 rental draft (seed, streak; rentals 0..2) played to its
// terminal boundary with ordinary controller input only: FIGHT, then the least-used LEGAL move slot (so all 4 slots get used),
// forced replacements answered with the first healthy member (generatedCommandAnimationReplay's selector). Read-only use of
// production: every presented frame of every move-animation / substitute-fade command is classified exactly as
// renderBattleResolutionLiveView decides it (liveSubstituteSwapView, then liveMoveAnimationPresentation; substituteFadeRenderView),
// and every fallback carries the production gate that fired (liveShareCensusGates.ts). No oracle.
//   node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=<from>..<to> [--seed-step=N]
//     [--streak-mul=N] [--out=report.json] [--commands=commands.jsonl]
// Battle i (0-based) uses seed = from + i * seedStep and streak = (i * streakMul) % 49 (streaks 0..48, challenges 0..6).
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { substituteFadeRenderView } from "../../src/engine/liveSubstituteFade.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };
import monsJson from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import policyJson from "../../src/data/gen/factory-round-policy.json" with { type: "json" };
import { classifyDurationDecline, classifyPresentationDecline, type Decline } from "./liveShareCensusGates.ts";
import {
  applySpriteOrderPresentationEvent, spriteOrderStatusAnimationName, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../../src/engine/battleScriptSourceConstants.ts";
import { liveSpriteOrderBattlersPresent, seedLiveSpriteOrderHostFromBattleStart, type LiveSpriteOrderHost } from "../../src/engine/liveSpriteOrderHost.ts";
import { initializeFreshFactoryBattle } from "../../src/engine/factoryBattleStart.ts";
import { healFactoryKernelParty } from "../../src/engine/battleScenario.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const seedStep = Number(arg("seed-step", "1")), streakMul = Number(arg("streak-mul", "11"));
const FRAME_BUDGET = 200000, RENDER_SAMPLE_EVERY = 97;

const moveRows = (movesJson as unknown as { moves: { move: string; id: number; name: string }[] }).moves;
const nameOf = new Map(moveRows.map((m) => [m.id, m.name]));
// Factory use weight: the remainingAdaptersCensus.mjs / spriteOrderPlanCoverageRank.py model (Level-50 rental ranges 0..6, 4 moves
// per set, each range equally likely): the fraction of all Factory move slots that are this move.
const weightOf = (() => {
  const entries = (monsJson as unknown as { entries: { index: number; moves: string[] }[] }).entries;
  const ranges = (policyJson as unknown as { rentalSelection: { ranges: { level50: { start: number; end: number }[] } } })
    .rentalSelection.ranges.level50.slice(0, 7);
  const w = new Map<string, number>();
  for (const r of ranges) {
    const sets = entries.filter((m) => m.index >= r.start && m.index <= r.end);
    for (const m of sets) for (const mv of m.moves) w.set(mv, (w.get(mv) ?? 0) + 1 / sets.length / ranges.length);
  }
  const total = [...w.values()].reduce((a, b) => a + b, 0);
  const byId = new Map(moveRows.map((m) => [m.id, (w.get(m.move) ?? 0) / total]));
  return (id: number) => byId.get(id) ?? 0;
})();

// ---- prep45: the production ORDER host's invalidator CHAIN -------------------------------------------------------------------
// Copies of liveSpriteOrderHost.ts's private event mapping (orderEventOf, isForcedSwitchOut, followsForcedSwitchOut,
// isVoluntaryPlayerSwitchOut; not exported). The shadow tracker is the production tracker with every chain unit SKIPPED (kept at its
// pre-unit state): it starts from the production tracker at the step the host goes known -> unknown, receives exactly the events the
// production host consumed in each step (its cursor before -> after) plus the prompt cycle, and every event that would invalidate a
// known tracker is recorded with the production reason text (applySpriteOrderPresentationEvent's own invalidReason).
const TWO_TURN_ANIM_MOVE_IDS: ReadonlySet<number> = new Set([76, 91, 143, 280]);
const RECALL_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_VARIOUS", "B_SCR_OP_RETURNATKTOBALL", "B_SCR_OP_RETURNTOBALL"]);
const INVALIDATING_EVENTS: ReadonlySet<string> = new Set(["trainer-slide-out", "outcome"]);
function isForcedSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const event = events[index]!, payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible || event.provenance?.opcodeName !== "B_SCR_OP_RETURNTOBALL") return false;
  for (let at = index - 1; at >= 0; at--) {
    const earlier = events[at]!.payload;
    if (earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION") return earlier.target !== earlier.battler && earlier.target === payload.battler;
  }
  return false;
}
function followsForcedSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number, battler: 0 | 1): boolean {
  for (let at = index - 1; at >= 0; at--) {
    const earlier = events[at]!.payload;
    if (earlier.kind === "draw-party-status-summary" || earlier.kind === "switch-in-animation" || earlier.kind === "faint-animation") return false;
    if (earlier.kind === "set-battler-sprite-visibility" && earlier.battler === battler) return isForcedSwitchOut(events, at);
  }
  return false;
}
function isVoluntaryPlayerSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const event = events[index]!, payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible || payload.battler !== 0
    || event.provenance?.opcodeName !== "B_SCR_OP_RETURNATKTOBALL") return false;
  return !events.slice(0, index).some(({ payload: earlier }) => earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION");
}
function orderEventOf(events: readonly BattleKernelSemanticEvent[], index: number, hidden: readonly [boolean, boolean],
): { event?: SpriteOrderPresentationEvent; then?: SpriteOrderPresentationEvent; hidden?: readonly [boolean, boolean] } {
  const event = events[index]!, payload = event.payload;
  if (payload.kind === "faint-animation" || payload.kind === "draw-party-status-summary" || payload.kind === "hide-party-status-summary"
    || payload.kind === "switch-in-animation") {
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) return { event: { kind: "invalidate", reason: `${payload.kind} battler ${battler}` } };
    switch (payload.kind) {
      case "faint-animation": return { event: { kind: "faint", side: battler === 0 ? "player" : "opponent" } };
      case "draw-party-status-summary": return battler === 1 ? { event: { kind: "party-summary-next" } } : {};
      case "hide-party-status-summary": return battler === 1 ? { event: { kind: "party-summary-hide" } } : {};
      case "switch-in-animation":
        if (followsForcedSwitchOut(events, index, battler)) {
          const side = battler === 0 ? "player" as const : "opponent" as const;
          return { event: { kind: "switch-in-start", side }, then: { kind: "switch-in-finish", side } };
        }
        return battler === 1 ? { event: { kind: "next-mon-send-out" } } : { event: { kind: "switch-in-start" }, then: { kind: "switch-in-finish" } };
    }
  }
  if (payload.kind === "switch") return {};
  if (payload.kind === "trainer-slide-in") return { event: { kind: "trainer-slide-end" } };
  if (payload.kind === "animation") {
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) return { event: { kind: "invalidate", reason: `animation ${payload.animationId} battler ${battler}` } };
    switch (payload.animationId) {
      case "MOVE_ANIMATION": {
        const request = battleMoveAnimationRequest(battler, payload.target, payload.arguments);
        const secondBranch = (request.turn & 1) === 1 && TWO_TURN_ANIM_MOVE_IDS.has(request.moveId);
        return { event: { kind: "move-animation", moveId: secondBranch ? 10000 + request.moveId : request.moveId, attackerSide: battler === 0 ? "player" : "opponent" } };
      }
      case "HIT_ANIMATION": return { event: { kind: "hit-animation", targetVisible: !hidden[battler] } };
      case "STATS_CHANGE": {
        const argument = Number(payload.arguments[0]);
        return { event: Number.isInteger(argument) ? { kind: "stat-animation", argument } : { kind: "invalidate", reason: "stat animation without an argument" } };
      }
      case "SCENE_OFF_ATTACK_PAUSE": return { event: { kind: "invalidate", reason: "scene-off attack pause" } };
      default:
        if (payload.animationId === "WEATHER_VAR") {
          const argument = payload.arguments[0];
          return { event: { kind: "general-animation", animation: argument === "12" ? "SANDSTORM_CONTINUES" : argument === "13" ? "HAIL_CONTINUES" : "WEATHER_VAR" } };
        }
        return { event: { kind: "general-animation", animation: payload.animationId } };
    }
  }
  if (payload.kind === "status-animation") {
    const name = spriteOrderStatusAnimationName(payload.isStatus2 !== 0, payload.status);
    return name === null ? {} : { event: { kind: "status-animation", status: name } };
  }
  if (payload.kind === "set-battler-sprite-visibility") {
    if (isForcedSwitchOut(events, index)) return { event: { kind: "forced-switch-out", side: payload.battler === 0 ? "player" : "opponent" } };
    if (isVoluntaryPlayerSwitchOut(events, index)) return { event: { kind: "switch-out" } };
    if (RECALL_OPCODES.has(event.provenance?.opcodeName ?? "")) return { event: { kind: "invalidate", reason: "return to ball" } };
    if (payload.battler !== 0 && payload.battler !== 1) return { event: { kind: "invalidate", reason: "visibility battler" } };
    const next: [boolean, boolean] = [hidden[0], hidden[1]];
    next[payload.battler] = payload.invisible;
    return { hidden: Object.freeze(next) as readonly [boolean, boolean],
      ...(payload.invisible ? { event: { kind: "invalidate", reason: "semi-invulnerable battler hidden" } as const } : {}) };
  }
  if (INVALIDATING_EVENTS.has(payload.kind)) return { event: { kind: "invalidate", reason: payload.kind } };
  return {};
}
type OrchestratorState = ReturnType<typeof createFactoryRoundBattleOrchestrator>;
const orderHostOf = (s: OrchestratorState): LiveSpriteOrderHost | undefined =>
  s.liveMoveSpriteAllocatorHost?.battleCallStart === s.activeBattleCallStart ? s.liveMoveSpriteAllocatorHost?.orderHost : undefined;
interface ChainUnit { unit: string; requestId: number; segmentIndex: number; sequence: number; cls?: string }
// prep47 (A) / (B) receipts.
const S2 = BATTLE_SCRIPT_STATUS2_MASKS;
const lockBits = (s: number) => [s & S2.STATUS2_MULTIPLETURNS ? "MULTIPLETURNS" : "", s & S2.STATUS2_RECHARGE ? "RECHARGE" : "",
  s & S2.STATUS2_UPROAR ? "UPROAR" : "", s & S2.STATUS2_BIDE ? "BIDE" : "", s & S2.STATUS2_LOCK_CONFUSE ? "LOCK_CONFUSE" : ""].filter(Boolean).join("|");
interface WithoutPromptCase { battle: number; requestId: number; cls: string; retained: boolean; continuation: boolean | null;
  playerLocked: boolean; segmentsBefore: number | null; firstMoverInContinuation: number | null; hostKnownBefore: boolean }
const withoutPromptCases: WithoutPromptCase[] = [];
interface BattleStartSeed { battle: number; known: boolean; invalidReason: string | null; replayMatches: boolean; events: string[];
  abilities: [number, number]; species: [number, number] }
const battleStartSeeds: BattleStartSeed[] = [];
const returnToBallCases = new Map<string, number>();
const compactEvent = (e: BattleKernelSemanticEvent) => {
  const p = e.payload as Record<string, unknown> & { kind: string };
  const bits = [p.kind];
  for (const k of ["animationId", "battler", "target", "arguments", "stringId", "messageId", "stat", "invisible"]) if (p[k] !== undefined) bits.push(`${k}=${JSON.stringify(p[k])}`);
  return bits.join(" ");
};
const orderInvalidations = new Map<string, number>();
const orderRecoveries = new Map<string, number>();
const shadowAgreement = { firstUnitMatched: 0, firstUnitHostLevel: 0, reviveAndInvalidateInOneStep: 0, hostLevelReasons: {} as Record<string, number> };

interface CommandRecord {
  battle: number; kind: "move" | "substitute-fade"; moveId: number; move: string; side: "player" | "opponent";
  attacker: string; target: string; status: "live" | "fallback" | "partial"; frames: number; liveFrames: number;
  swapFrames: number; duration: number | null; decline: (Decline & { detail?: string }) | null;
  /** prep45: every order-host-invalidating unit since the host was last known (first = the tracker's invalidReason). */
  orderChain?: string[];
  /** prep45: what revived the order host earlier in this battle (in order). */
  orderRecoveriesBefore?: string[];
  /** prep47: classes of the chain's "without an action prompt" units / the battle-start seed's events. */
  withoutPromptClasses?: string[];
  battleStartSeed?: string;
}
interface BattleRecord { battle: number; seed: number; streak: number; frames: number; end: "terminal" | "stalled" | "error"; error?: string; turns: number;
  stalledAt?: string }

const commands: CommandRecord[] = [];
const battles: BattleRecord[] = [];
const sanity = { sampledLiveFrames: 0, renderedOk: 0, renderThrows: [] as string[] };
let liveFrameCounter = 0;

function playBattle(battle: number, seed: number, streak: number): void {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  const fb = new Uint8Array(240 * 160 * 4);
  // core.ts tick's presentation seam (after the logical frame): the default-seed Random2 session, a fresh one per battle (each
  // battle is the session's first), feeding the faithful-random adapters exactly as createInitialState / render do.
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, turns = 0, commandKey = "", current: CommandRecord | null = null;
  const slotUses = [0, 0, 0, 0];
  // prep45: order-host chain state (per battle).
  let shadow: SpriteOrderTracker | null = null, chain: ChainUnit[] = [], hiddenShadow: readonly [boolean, boolean] = [false, false];
  let lastResolution: OrchestratorState["battleResolutionPresentation"] = null;
  const recoveriesThisBattle: string[] = [];
  const trackOrder = (before: OrchestratorState, after: OrchestratorState) => {
    const hb = orderHostOf(before), ha = orderHostOf(after);
    if (after.battleResolutionPresentation) lastResolution = after.battleResolutionPresentation;
    if (!ha) return;
    const knownBefore = hb?.tracker.cursor.order.known === true, knownAfter = ha.tracker.cursor.order.known;
    if (!hb) {
      // prep47 (B): replay the orchestrator's initializeFreshFactoryBattle (startCurrentBattle) with its own inputs.
      const rr = after.round.rules, opp = rr.currentOpponent.rentalRecords;
      let events: readonly BattleKernelSemanticEvent[] = [], replayMatches = false;
      if (rr.playerKernelParty && opp && after.battle) {
        // factoryRoundBattleOrchestrator.ts EMPTY_PARTY_MEMBER (copied; not exported).
        const empty = Object.freeze({ species: 0, isEgg: false, abilityNum: 0, ivs: Object.freeze({ hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 }),
          personality: 0, experience: 0, level: 0, friendship: 0, maxHP: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0, hp: 0,
          status1: 0, item: 0, moves: Object.freeze([0, 0, 0, 0] as const), pp: Object.freeze([0, 0, 0, 0] as const), ppBonuses: 0 });
        try {
          const party = (p: readonly unknown[]) => Object.freeze([p[0], p[1], p[2], empty, empty, empty]) as never;
          const init = initializeFreshFactoryBattle({ requestId: before.nextBattleRequestId, rngSeed: rr.rngValue, battleScene: "on",
            preCommandRngCalls: before.pendingBattlePreCommandRngCalls,
            ...(before.carriedBattleMovePower === undefined ? {} : { battleMovePower: before.carriedBattleMovePower }),
            playerParty: party(rr.playerKernelParty as never), opponentParty: party(healFactoryKernelParty(opp) as never) });
          events = init.events;
          const seeded = seedLiveSpriteOrderHostFromBattleStart(init.events);
          replayMatches = JSON.stringify(init.state.rules) === JSON.stringify(after.battle.rules)
            && seeded.tracker.cursor.order.known === knownAfter && seeded.tracker.invalidReason === ha.tracker.invalidReason;
        } catch { replayMatches = false; }
      }
      const bc = after.battle?.rules.rulesContext.battlers;
      battleStartSeeds.push({ battle, known: knownAfter, invalidReason: ha.tracker.invalidReason ?? null, replayMatches,
        events: events.map(compactEvent), abilities: [bc?.[0]?.ability ?? -1, bc?.[1]?.ability ?? -1] as [number, number],
        species: [bc?.[0]?.species ?? -1, bc?.[1]?.species ?? -1] as [number, number] });
      if (!knownAfter) { shadow = null; chain = [{ unit: `battle-start seed: ${ha.tracker.invalidReason ?? "unknown"}`, requestId: -1, segmentIndex: -1, sequence: -Infinity,
        cls: events.map(compactEvent).join(" / ") }]; }
      return;
    }
    if (knownBefore) { shadow = hb.tracker; chain = []; }
    hiddenShadow = hb.hidden;
    let revived = false;
    const add = (unit: string, requestId: number, segmentIndex: number, sequence: number, cls?: string) => {
      chain.push({ unit, requestId, segmentIndex, sequence, ...(cls === undefined ? {} : { cls }) });
    };
    // TURN_TRAP units are named with the trapped battler's wrapped move (General_TurnTrap branches on it; the kernel event's argument is
    // not the trap move), so the chain predictor can tell the planned trap kinds from the others. Naming only.
    let decorate = "";
    const apply = (ev: SpriteOrderPresentationEvent | undefined, requestId: number, segmentIndex: number, sequence: number) => {
      if (!ev || !shadow || !shadow.cursor.order.known) return;
      const next = applySpriteOrderPresentationEvent(shadow, ev);
      if (next.cursor.order.known) shadow = next; else add(`${next.invalidReason ?? "?"}${decorate}`, requestId, segmentIndex, sequence);
    };
    // The prompt cycle (beginLiveSpriteOrderTurn; promptShown as factoryRoundBattleOrchestrator.ts ~:1828-1837).
    // prep47: also the command submit of a retained locked-action continuation, which keeps the retained resolution's request id
    // (so promptRequestId does not change; prep45's shadow missed it mid-chain).
    const submitted = before.battleCommandPresentation !== null && after.battleCommandPresentation === null
      && after.battleResolutionPresentation !== null;
    if (ha.promptRequestId !== null && (ha.promptRequestId !== hb.promptRequestId || submitted)) {
      const cp = before.battleCommandPresentation, rq = ha.promptRequestId;
      const fromPartyMenu = cp?.pendingDecision?.kind === "switch";
      if (!fromPartyMenu && hb.cursor !== null && !hb.cursor.drained) add("previous resolution not fully applied", rq, -1, -Infinity);
      const status2 = cp ? before.battle?.rules.rulesContext.battlers[cp.request.battler]?.status2 ?? 0 : 0;
      const locked = (status2 & (BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE)) !== 0;
      if (before.retainedLockedActionPresentationOwner !== null || locked) {
        const owner = before.retainedLockedActionPresentationOwner, rules = before.battle?.rules.rulesContext;
        const res = after.battleResolutionPresentation;
        const continuation = owner === null ? null : res?.resolutionId.requestId === owner.resolution.resolutionId.requestId;
        let firstMover: number | null = null;
        if (continuation && res) for (const e of res.segments[res.segments.length - 1]!.events) {
          const p = e.payload;
          if (p.kind === "animation" && p.animationId === "MOVE_ANIMATION") { firstMover = p.battler; break; }
        }
        const pl = locked ? `player locked ${nameOf.get(rules?.lockedMoves[0] ?? 0) ?? "?"} [${lockBits(status2)}]` : "";
        const cls = owner === null ? pl
          : `retained ${owner.action.battler === 1 ? "opponent" : "player"} ${nameOf.get(owner.action.currentMove) ?? owner.action.currentMove} [${
            lockBits(rules?.battlers[owner.action.battler]?.status2 ?? 0)}] ${continuation ? "continuation" : "fresh (no receipt)"}${locked ? ` + ${pl}` : ""}`;
        withoutPromptCases.push({ battle, requestId: rq, cls, retained: owner !== null, continuation, playerLocked: locked,
          segmentsBefore: owner === null ? null : owner.resolution.segments.length, firstMoverInContinuation: firstMover,
          hostKnownBefore: knownBefore });
        add("command resolution without an action prompt", rq, -1, -Infinity, cls);
      }
      if (!fromPartyMenu) { apply({ kind: "action-prompt" }, rq, -1, -Infinity); apply({ kind: "actions-committed" }, rq, -1, -Infinity); }
    }
    // The events the production host consumed this step (its cursor before -> after).
    const cur = ha.cursor;
    if (cur !== null && (hb.cursor?.requestId !== cur.requestId || hb.cursor.segmentIndex !== cur.segmentIndex || hb.cursor.nextEventIndex !== cur.nextEventIndex)) {
      const res = after.battleResolutionPresentation?.resolutionId.requestId === cur.requestId ? after.battleResolutionPresentation
        : lastResolution?.resolutionId.requestId === cur.requestId ? lastResolution : null;
      let seg = 0, idx = 0;
      if (hb.cursor?.requestId === cur.requestId) { seg = hb.cursor.segmentIndex; idx = hb.cursor.nextEventIndex; }
      else {
        if (hb.cursor !== null && !hb.cursor.drained) add("previous resolution not fully applied", cur.requestId, -1, -Infinity);
        if (ha.promptRequestId !== cur.requestId) add("resolution without a modelled prompt cycle", cur.requestId, -1, -Infinity);
      }
      // Forced party menu -> switch-in (orchestrator ~:2229-2249): reset + reshow before the switch-in segment's events.
      const forced = after.battleResolutionPresentation?.lifecycle.phase === "presenting-switch-in"
        && !(hb.cursor?.requestId === cur.requestId && hb.cursor.segmentIndex === cur.segmentIndex);
      if (res) while (seg < cur.segmentIndex || (seg === cur.segmentIndex && idx < cur.nextEventIndex) || (forced && seg === cur.segmentIndex && !revived)) {
        if (forced && seg === cur.segmentIndex && !revived) {
          revived = true;
          if (chain.length > 0 || !knownBefore) { recoveriesThisBattle.push("forced party menu reset (switch-in)"); orderRecoveries.set("forced party menu reset (switch-in)", (orderRecoveries.get("forced party menu reset (switch-in)") ?? 0) + 1); }
          chain = [];
          const battlers = liveSpriteOrderBattlersPresent(res, cur.segmentIndex);
          const reset = applySpriteOrderPresentationEvent(shadow ?? ha.tracker, { kind: "party-menu-reset" });
          shadow = reset;
          if (!battlers.opponent) add("reshow without the opponent battler", cur.requestId, seg, -Infinity);
          else if (hiddenShadow[0] || hiddenShadow[1]) add("reshow with a hidden battler", cur.requestId, seg, -Infinity);
          else apply({ kind: "battle-reshow", playerBattlerPresent: battlers.player }, cur.requestId, seg, -Infinity);
          continue;
        }
        const events = res.segments[seg]?.events ?? [];
        if (idx >= events.length) { seg++; idx = 0; continue; }
        const m = orderEventOf(events, idx, hiddenShadow);
        if (m.event?.kind === "invalidate" && m.event.reason === "return to ball") {
          // prep47 (C): the recall's opcode / battler and the segment context (which BattleScript recalled).
          const ev = events[idx]!, p = ev.payload as { battler?: number };
          const prior = events.slice(0, idx);
          const lastMove = [...prior].reverse().find((e) => e.payload.kind === "animation" && e.payload.animationId === "MOVE_ANIMATION");
          const key = `${ev.provenance?.opcodeName ?? "?"} battler ${p.battler} | ${lastMove ? `after move ${nameOf.get(battleMoveAnimationRequest(
            (lastMove.payload as { battler: number }).battler, (lastMove.payload as { target: number }).target, (lastMove.payload as { arguments: readonly string[] }).arguments).moveId) ?? "?"} by battler ${(lastMove.payload as { battler: number }).battler}` : "no earlier move body"}`;
          returnToBallCases.set(key, (returnToBallCases.get(key) ?? 0) + 1);
        }
        if (m.hidden) hiddenShadow = m.hidden;
        const p = events[idx]!.payload;
        decorate = p.kind === "animation" && p.animationId === "TURN_TRAP" && (p.battler === 0 || p.battler === 1)
          ? ` (wrapped ${nameOf.get(after.battle?.rules.rulesContext.battlers[p.battler]?.wrappedMove ?? -1) ?? "?"})` : "";
        apply(m.event, cur.requestId, seg, events[idx]!.sequence);
        apply(m.then, cur.requestId, seg, events[idx]!.sequence);
        idx++;
      }
    }
    const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    if (knownAfter) {
      if (!knownBefore && !revived) {
        const by = after.battlePartySelect || before.battlePartySelect ? "voluntary party menu reset"
          : before.battleCommandPresentation?.pendingDecision?.kind === "switch" ? "voluntary switch (party menu return)" : `other (lastUnit ${ha.tracker.lastUnit})`;
        recoveriesThisBattle.push(by); count(orderRecoveries, by);
      }
      chain = []; shadow = ha.tracker;
    } else if (knownBefore || revived || (ha.tracker !== hb.tracker && ha.tracker.invalidReason !== hb.tracker.invalidReason)) {
      const reason = ha.tracker.invalidReason ?? "?";
      count(orderInvalidations, reason);
      if (chain[0]?.unit === reason || chain[0]?.unit.startsWith(`${reason} (wrapped `)) shadowAgreement.firstUnitMatched++;
      else {
        if (!knownBefore && !revived) { shadowAgreement.reviveAndInvalidateInOneStep++; chain = []; }
        else shadowAgreement.firstUnitHostLevel++;
        shadowAgreement.hostLevelReasons[reason] = (shadowAgreement.hostLevelReasons[reason] ?? 0) + 1;
        chain = [{ unit: reason, requestId: cur?.requestId ?? -1, segmentIndex: -1, sequence: -Infinity }, ...chain.filter((u) => u.unit !== reason)];
      }
    }
  };
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation" && command?.type !== "substitute-fade") return;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    if (key !== commandKey) {
      commandKey = key;
      const request = command.type === "move-animation" ? command.animation : undefined;
      const side = command.type === "move-animation" ? (request?.attacker ?? 0) === 0 ? "player" : "opponent"
        : command.battler === 0 ? "player" : "opponent";
      const moveId = command.type === "move-animation" ? request?.moveId ?? -1 : -164;
      const duration = request ? liveMoveAnimationDuration(request, view.field) : null;
      current = {
        battle, kind: command.type === "move-animation" ? "move" : "substitute-fade", moveId,
        move: command.type === "substitute-fade" ? "SUBSTITUTE_FADE" : nameOf.get(moveId) ?? `#${moveId}`, side,
        attacker: side === "player" ? view.field.player.name : view.field.opponent.name,
        target: side === "player" ? view.field.opponent.name : view.field.player.name,
        status: "fallback", frames: 0, liveFrames: 0, swapFrames: 0, duration,
        decline: command.type === "move-animation" && !request
          ? { stage: "request", reason: "move-animation command without an animation request", gate: "battleResolutionPresentationRender.ts:battleResolutionCommandDuration" }
          : request && duration === null ? classifyDurationDecline(request, view.field) : null,
      };
      commands.push(current);
    }
    const rec = current!;
    rec.frames++;
    let live = false;
    if (command.type === "substitute-fade") {
      live = view.effect?.type === "substitute-fade" && substituteFadeRenderView(view) !== null;
      if (!live && !rec.decline) {
        rec.decline = { stage: "presentation", reason: "fade battler not shown as the doll at the command start",
          gate: "battleResolutionPresentationRender.ts:fadePresented" };
      }
    } else if (view.effect?.type === "move") {
      // renderBattleResolutionLiveView's own decision order.
      const swap = liveSubstituteSwapView(view);
      if (swap?.kind === "swap") { live = true; rec.swapFrames++; }
      else {
        const v = swap ? swap.view : view, e = v.effect;
        if (e?.type === "move") {
          live = liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
            e.presentationRng, e.battlerX2Input) !== null;
          if (!live && !rec.decline) {
            rec.decline = classifyPresentationDecline({ request: e.request, field: v.field, age: e.age, paletteInput: e.paletteInput,
              spriteAllocatorInput: e.spriteAllocatorInput, spriteOrderInput: e.spriteOrderInput, presentationRngInput: e.presentationRng,
              battlerX2Input: e.battlerX2Input });
            // The lend is absent: name the production order host's own state (spriteOrderEventTransform.ts invalidReason).
            if (rec.decline.reason === "sprite-order lend unknown") {
              const host = state.liveMoveSpriteAllocatorHost?.orderHost;
              rec.decline.detail = `order host: ${!host ? "absent" : host.tracker.invalidReason ?? (host.tracker.cursor.order.known ? "known, no lend for this body" : "unknown")}`;
              const seq = "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
              rec.orderChain = [...new Set(chain.filter((u) => !(u.requestId === r.resolutionId.requestId && u.segmentIndex === r.segmentIndex
                && u.sequence >= seq)).map((u) => u.unit))];
              rec.orderRecoveriesBefore = [...recoveriesThisBattle];
              const wp = chain.filter((u) => u.unit === "command resolution without an action prompt" && u.cls !== undefined).map((u) => u.cls!);
              if (wp.length > 0) rec.withoutPromptClasses = wp;
              const bs = chain.find((u) => u.unit.startsWith("battle-start seed"));
              if (bs?.cls !== undefined) rec.battleStartSeed = bs.cls;
            }
          }
        }
      }
    }
    if (live) {
      rec.liveFrames++;
      if (liveFrameCounter++ % RENDER_SAMPLE_EVERY === 0) {
        sanity.sampledLiveFrames++;
        try { renderBattleResolutionLiveView(fb, view); sanity.renderedOk++; }
        catch (e) { sanity.renderThrows.push(`${rec.move}/${rec.side} battle ${battle} age ${r.lifecycle.phaseElapsed}: ${String(e).slice(0, 100)}`); }
      }
    }
    rec.status = rec.liveFrames === rec.frames ? "live" : rec.liveFrames === 0 ? "fallback" : "partial";
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    const before = state;
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    trackOrder(before, state);
    observe();
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  let end: BattleRecord["end"] = "terminal", error: string | undefined;
  try {
    until(() => phase() === "action-menu");
    while (!ended) {
      pulse("A");
      until(() => phase() === "fight-menu");
      if (ended) break;
      const menu = state.battleCommandPresentation!;
      const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
      const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
      slotUses[slot]!++;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      pulse("A");
      turns++;
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) {
    end = String(e).includes("frame budget") ? "stalled" : "error";
    if (end === "error") error = String(e).slice(0, 160);
  }
  const stalledAt = end !== "stalled" ? undefined : [
    state.battleResolutionPresentation ? `resolution ${state.battleResolutionPresentation.lifecycle.phase}` : null,
    state.battleCommandPresentation ? `command ${state.battleCommandPresentation.lifecycle.phase}` : null,
    state.battlePartySelect ? "party select" : null, state.battleForcedPartySelect ? "forced party select" : null,
  ].filter(Boolean).join(", ");
  battles.push({ battle, seed, streak, frames: frame, end, turns, ...(error ? { error } : {}), ...(stalledAt !== undefined ? { stalledAt } : {}) });
}

const started = Date.now();
for (let i = 0, seed = fromSeed; seed <= toSeed; i++, seed += seedStep) {
  playBattle(i, seed, (i * streakMul) % 49);
  if (i % 10 === 9) process.stderr.write(`battle ${i + 1} seed ${seed}: ${commands.length} commands, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
}

// ---- report ------------------------------------------------------------------------------------------------------------------
const pct = (a: number, b: number) => (b === 0 ? 0 : +((100 * a) / b).toFixed(2));
const sum = (xs: readonly CommandRecord[], f: (c: CommandRecord) => number) => xs.reduce((a, c) => a + f(c), 0);
const fallbackFrames = (c: CommandRecord) => c.frames - c.liveFrames;
const declined = commands.filter((c) => c.status !== "live");
type Bucket = { move: string; moveId: number; side: string; reason: string; gate: string; count: number; frames: number; weightPct: number;
  details: Map<string, number> };
const bucketMap = new Map<string, Bucket>();
for (const c of declined) {
  const reason = c.decline?.reason ?? "unclassified (no decline recorded)", gate = c.decline?.gate ?? "-";
  const k = `${c.move}|${c.side}|${reason}|${gate}`;
  const b = bucketMap.get(k) ?? { move: c.move, moveId: c.moveId, side: c.side, reason, gate, count: 0, frames: 0,
    weightPct: c.moveId >= 0 ? +(weightOf(c.moveId) * 100).toFixed(3) : 0, details: new Map<string, number>() };
  b.count++; b.frames += fallbackFrames(c);
  if (c.decline?.detail) b.details.set(c.decline.detail, (b.details.get(c.decline.detail) ?? 0) + 1);
  bucketMap.set(k, b);
}
const topDetails = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([d, n]) => `${n}x ${d}`);
const buckets = [...bucketMap.values()].map((b) => ({ ...b, details: topDetails(b.details) }));
const invalidations = new Map<string, { detail: string; count: number; frames: number; moves: Set<string> }>();
for (const c of declined) if (c.decline?.detail) {
  const r = invalidations.get(c.decline.detail) ?? { detail: c.decline.detail, count: 0, frames: 0, moves: new Set<string>() };
  r.count++; r.frames += fallbackFrames(c); r.moves.add(`${c.move}/${c.side}`);
  invalidations.set(c.decline.detail, r);
}
const order = (by: "frames" | "count") => [...buckets].sort((a, b) => b[by] - a[by] || b[by === "frames" ? "count" : "frames"] - a[by === "frames" ? "count" : "frames"]
  || a.move.localeCompare(b.move) || a.side.localeCompare(b.side) || a.reason.localeCompare(b.reason));
const reasonMap = new Map<string, { reason: string; count: number; frames: number; moves: Set<string> }>();
for (const c of declined) {
  const reason = `${c.decline?.stage ?? "?"}: ${c.decline?.reason ?? "unclassified (no decline recorded)"}`;
  const r = reasonMap.get(reason) ?? { reason, count: 0, frames: 0, moves: new Set<string>() };
  r.count++; r.frames += fallbackFrames(c); r.moves.add(c.move);
  reasonMap.set(reason, r);
}
const kinds = (k: CommandRecord["kind"]) => {
  const xs = commands.filter((c) => c.kind === k);
  return { commands: xs.length, live: xs.filter((c) => c.status === "live").length, partial: xs.filter((c) => c.status === "partial").length,
    frames: sum(xs, (c) => c.frames), liveFrames: sum(xs, (c) => c.liveFrames), swapFrames: sum(xs, (c) => c.swapFrames),
    liveSharePctByCount: pct(xs.filter((c) => c.status === "live").length, xs.length), liveSharePctByFrames: pct(sum(xs, (c) => c.liveFrames), sum(xs, (c) => c.frames)) };
};
const report = {
  schema: "prep47-order-census/v1",
  config: { seeds: `${fromSeed}..${toSeed}`, seedStep, streakMul, streaks: "(i * streakMul) % 49", battleScene: "on", rentals: "generateInitial [0,1,2]",
    policy: "FIGHT + least-used legal slot (ties: lowest); forced replacement: first healthy member", renderSampleEvery: RENDER_SAMPLE_EVERY,
    presentationRng: "core.ts tick seam replicated: createPresentationRngSession() default seed, fresh per battle" },
  battles: { played: battles.length, terminal: battles.filter((b) => b.end === "terminal").length, stalled: battles.filter((b) => b.end === "stalled").length,
    errors: battles.filter((b) => b.end === "error").map((b) => ({ seed: b.seed, streak: b.streak, error: b.error })),
    stalls: battles.filter((b) => b.end === "stalled").map((b) => ({ seed: b.seed, streak: b.streak, turns: b.turns, at: b.stalledAt })),
    frames: battles.reduce((a, b) => a + b.frames, 0), playerTurns: battles.reduce((a, b) => a + b.turns, 0) },
  overall: {
    commands: commands.length, live: commands.filter((c) => c.status === "live").length, partial: commands.filter((c) => c.status === "partial").length,
    fallback: commands.filter((c) => c.status === "fallback").length,
    frames: sum(commands, (c) => c.frames), liveFrames: sum(commands, (c) => c.liveFrames),
    liveSharePctByCount: pct(commands.filter((c) => c.status === "live").length, commands.length),
    liveSharePctByFrames: pct(sum(commands, (c) => c.liveFrames), sum(commands, (c) => c.frames)),
    moveAnimation: kinds("move"), substituteFade: kinds("substitute-fade"),
  },
  perReason: [...reasonMap.values()].sort((a, b) => b.frames - a.frames || a.reason.localeCompare(b.reason))
    .map((r) => ({ reason: r.reason, count: r.count, frames: r.frames, distinctMoves: r.moves.size })),
  orderHostStateWhenLendUnknown: [...invalidations.values()].sort((a, b) => b.frames - a.frames || a.detail.localeCompare(b.detail))
    .map((r) => ({ detail: r.detail, count: r.count, frames: r.frames, bodies: [...r.moves].sort() })),
  orderInvalidatingUnits: (() => {
    const m = new Map<string, { unit: string; count: number; frames: number; bodies: Map<string, number> }>();
    for (const c of declined) if (c.decline?.reason === "sprite-order lend unknown" && c.orderChain) {
      const unit = c.orderChain[0] ?? "(empty chain)";
      const r = m.get(unit) ?? { unit, count: 0, frames: 0, bodies: new Map<string, number>() };
      r.count++; r.frames += fallbackFrames(c); r.bodies.set(`${c.move}/${c.side}`, (r.bodies.get(`${c.move}/${c.side}`) ?? 0) + 1);
      m.set(unit, r);
    }
    return [...m.values()].sort((a, b) => b.frames - a.frames || b.count - a.count || a.unit.localeCompare(b.unit))
      .map((r) => ({ unit: r.unit, count: r.count, frames: r.frames, invalidations: orderInvalidations.get(r.unit) ?? 0,
        bodies: [...r.bodies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${n}x ${k}`) }));
  })(),
  orderInvalidationsAll: [...orderInvalidations].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([unit, count]) => ({ unit, count })),
  orderRecoveriesAll: [...orderRecoveries].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([by, count]) => ({ by, count })),
  orderShadowAgreement: shadowAgreement,
  returnToBallCases: [...returnToBallCases].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([recall, count]) => ({ recall, count })),
  withoutPromptCases,
  withoutPromptByClass: (() => {
    const m = new Map<string, { cls: string; cases: number; firstUnitCount: number; firstUnitFrames: number; involvedCount: number; involvedFrames: number }>();
    const get = (cls: string) => m.get(cls) ?? m.set(cls, { cls, cases: 0, firstUnitCount: 0, firstUnitFrames: 0, involvedCount: 0, involvedFrames: 0 }).get(cls)!;
    for (const c of withoutPromptCases) get(c.cls).cases++;
    for (const c of declined) if (c.withoutPromptClasses) {
      const first = c.orderChain?.[0] === "command resolution without an action prompt";
      for (const cls of new Set(c.withoutPromptClasses)) { const r = get(cls); r.involvedCount++; r.involvedFrames += fallbackFrames(c); }
      if (first) { const r = get(c.withoutPromptClasses[0]!); r.firstUnitCount++; r.firstUnitFrames += fallbackFrames(c); }
    }
    return [...m.values()].sort((a, b) => b.firstUnitFrames - a.firstUnitFrames || b.cases - a.cases || a.cls.localeCompare(b.cls));
  })(),
  battleStartSeeds: (() => {
    const m = new Map<string, { events: string; known: boolean; reason: string | null; battles: number; replayMismatches: number; declines: number; frames: number;
      abilities: Set<string> }>();
    for (const s of battleStartSeeds) {
      const k = s.events.join(" / ");
      const r = m.get(k) ?? m.set(k, { events: k, known: s.known, reason: s.invalidReason, battles: 0, replayMismatches: 0, declines: 0, frames: 0,
        abilities: new Set() }).get(k)!;
      r.battles++; if (!s.replayMatches) r.replayMismatches++; r.abilities.add(`${s.abilities[0]}/${s.abilities[1]}`);
    }
    for (const c of declined) if (c.battleStartSeed !== undefined && c.orderChain?.[0]?.startsWith("battle-start seed")) {
      const r = m.get(c.battleStartSeed); if (r) { r.declines++; r.frames += fallbackFrames(c); }
    }
    return [...m.values()].sort((a, b) => b.frames - a.frames || b.battles - a.battles || a.events.localeCompare(b.events))
      .map((r) => ({ ...r, abilities: [...r.abilities].sort() }));
  })(),
  topBucketsByFrames: order("frames").slice(0, 25),
  topBucketsByCount: order("count").slice(0, 25),
  bucketCount: buckets.length,
  sanity: { ...sanity, renderThrows: sanity.renderThrows.slice(0, 20), renderThrowCount: sanity.renderThrows.length },
  battleDigest: createHash("sha256").update(JSON.stringify(battles)).digest("hex"),
  commandDigest: createHash("sha256").update(JSON.stringify(commands)).digest("hex"),
};
const text = JSON.stringify(report, null, 1) + "\n";
const out = arg("out");
if (out) writeFileSync(out, text); else process.stdout.write(text);
const commandsOut = arg("commands");
if (commandsOut) writeFileSync(commandsOut, commands.map((c) => JSON.stringify(c)).join("\n") + "\n");
process.stderr.write(`done: ${battles.length} battles, ${commands.length} commands, live ${report.overall.liveSharePctByCount}% by count / ${report.overall.liveSharePctByFrames}% by frames, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
