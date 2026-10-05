// (library; CLI = spriteOrderUncoveredReplayRun.ts)
// Strict replay of the production sprite-order tracker (src/engine/spriteOrderEventTransform.ts) over the real ordinary-Factory battle-1 event lists
// and 12 BattleLab KO / forced-switch / voluntary-switch scenarios, with the previously uncovered unit classes modelled by the PROPOSED transforms of
// docs/sprite-order-uncovered-units.md (faint, next-mon party summary, next-mon send-out, forced switch-in, party-menu/reshow reset, trainer slide).
//   run the CLI: npx vite-node tools/integration/spriteOrderUncoveredReplayRun.ts -- --write
// Modes: "baseline" = every uncovered unit invalidates (today's behaviour), "modelled" = the proposed transforms.  Both STRICT (never re-seeded from the ROM).
// "isolated" additionally re-seeds from the ROM-observed pre-state whenever the tracker is unknown (rule test in isolation; the battler slots are then taken
// from the unit stream and are labelled as such).
import { readFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, invalidateSpriteOrderTracker, spriteOrderTrackerLend,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, initSpriteOrderState, knownEntrySpriteOrderState, type SpriteOrderPlan, type SpriteOrderState,
} from "../../src/engine/spriteOrderProvider.ts";

const FX = new URL("./fixtures/sprite-order-uncovered/", import.meta.url);
export const ROUTE_TRACES = ["battle1-turn17-dense", "battle1-switch", "battle1-turn2-dragonbreath", "battle1-grovyle-faint", "battle1-victory"] as const;
export const LAB_TRACES = ["forced-switch-player-choice", "forced-switch-ai-choice", "hit-chain-ko", "gate6-ohko-hit", "destiny-bond-ko", "issue129-noitem-ohko",
  "endturn-toxic-ko", "issue131-endturn-order-switch", "factory-ai-switch-receipt-a", "issue135-pursuit-switch-intercept", "gate6-ohko-sturdy", "issue129-shellbell-ko-heal"] as const;

/** The proposed constant-shape unit plans, production plan-token text (`decodeSpriteOrderPlan`; `c<ago>.<r>` = r-th survivor of the unit `ago` units earlier). */
export const UNIT_PLANS = {
  /** `CreatePartyStatusSummarySprites`: bar = lowest free, six ball slots at the end of the array (59..54). */
  summary: "Cfeeeeee",
  /** `StartSendOutAnim` + `Task_HidePartyStatusSummary_DuringBattle` + `PokeBallOpenParticleAnimation`; summary survivors destroyed in F order (54..59, bar). Survivor n1 = battler. */
  nextSendOut: "Cff;Cf;Dc1.6,c1.5,c1.4,c1.3,c1.2,c1.1,c1.0;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D2;Cf;Cf;Cf;D0;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15;D16;D17;D18",
  /** Forced / chosen switch-in after the party menu: ball start (n0 callback sprite, n1 battler, n2 ball task sprite). */
  switchInStart: "Cff;Cf",
  /** Ball-open particles; the ball (c1.2) and the callback sprite (c1.0) of the start unit are freed. */
  switchInParticles: "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Dc1.2;Cf;Cf;Cf;Dc1.0;D0;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15",
  /** `HandleEndTurn_FinishBattle` -> `OpponentHandleTrainerSlide`: one lowest-free create that lives to the end of the battle. */
  trainerSlide: "Cf",
  /** Reshow from ResetSpriteData identity, player battler already gone (forced switch after a faint): opponent battler n0, healthboxes, enemy shadow. */
  reshowPlayerGone: "Cf;Cfee;Cfee;Cf",
  /** Reshow with both battlers (voluntary party-menu return): player n0, opponent n1. */
  reshowBoth: "Cf;Cf;Cfee;Cfee;Cf",
} as const;
const PLANS: Record<keyof typeof UNIT_PLANS, SpriteOrderPlan> = Object.fromEntries(
  Object.entries(UNIT_PLANS).map(([key, text]) => [key, decodeSpriteOrderPlan(text)])) as never;

interface Ev { n: number; k: string; [key: string]: unknown }
type Side = "player" | "opponent";
const maskSlots = (mask: string) => {
  const bits = BigInt(`0x${mask}`);
  return Array.from({ length: 64 }, (_, slot) => slot).filter(slot => (bits >> BigInt(slot)) & 1n);
};
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
const GENERAL = new Map<number, string>([[7, "HELD_ITEM_EFFECT"], [11, "SUN_CONTINUES"], [13, "HAIL_CONTINUES"], [6, "TURN_TRAP"], [20, "FOCUS_PUNCH_SETUP"]]);
const STATUS = new Map<number, string>([[0, "PSN"], [1, "CONFUSION"], [2, "BRN"], [3, "INFATUATION"], [4, "SLP"], [5, "PRZ"], [6, "FRZ"], [7, "CURSED"], [8, "NIGHTMARE"]]);
function animEvent(table: string, id: number, arg: number | null): SpriteOrderPresentationEvent {
  if (table === "gBattleAnims_General" && id === 1 && arg !== null) return { kind: "stat-animation", argument: arg };
  if (table === "gBattleAnims_General") return { kind: "general-animation", animation: GENERAL.get(id) ?? `GENERAL_${id}` };
  if (table === "gBattleAnims_StatusConditions") return { kind: "status-animation", status: STATUS.get(id) ?? `STATUS_${id}` };
  return { kind: "invalidate", reason: `unknown animation table ${table}` };
}

/** Not yet in the production body table at this HEAD: Endeavor (283) and Fake Tears (313), both sides (docs/sprite-order-policy-gaps.md section 1 B; net-zero, relative-y-static). */
const BODY_OVERRIDES: Record<string, SpriteOrderPlan> = Object.fromEntries(["player", "opponent"].flatMap(side => [
  [`283:${side}`, decodeSpriteOrderPlan("Cffff;Cf;D1,3,0,2;Cffff;D4;D6,8,5,7;Cffff;Cf;D10,12,9,11;Cffff;D13;D15,17,14,16")],
  [`313:${side}`, decodeSpriteOrderPlan("Cff;Cff;Cff;Cff;D1,0;D3,2;D5,4;D7,6")],
]));

export type Mode = "baseline" | "modelled";
export interface Edge { frame: number; kind: "move" | "anim"; key: string; known: boolean; lent: boolean; exact: boolean | null; occupiedMatch: boolean | null; trivial: boolean }
export interface UnitCheck { frame: number; unit: string; exact: boolean; occupiedMatch: boolean; mode: "strict" | "isolated" }

/** Battler slots are tracked from the MODEL's own allocator (single survivor of a send-out unit), starting from the known entry (opponent 8, player 6). */
interface Roles { battler: Record<Side, number | null>; lastUnit: string; playerGone: boolean }

export function replay(name: string, mode: Mode, isolated = false) {
  const safe = name.replace(":", "-");
  const doc = JSON.parse(readFileSync(new URL(`./events/${safe}.json`, FX), "utf8"));
  const events: Ev[] = doc.events;
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
  const roles: Roles = { battler: { player: 6, opponent: 8 }, lastUnit: "entry", playerGone: false };
  const entryEnd = events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim")!.n;
  const edges: Edge[] = [];
  const unitChecks: UnitCheck[] = [];
  const invalidations: { frame: number; reason: string }[] = [];
  const modelled: string[] = [];
  let seededAt: Ev | null = null;
  const step = (e: Ev, event: SpriteOrderPresentationEvent) => {
    const before = tracker.cursor.order.known;
    tracker = applySpriteOrderPresentationEvent(tracker, event);
    if (before && !tracker.cursor.order.known) invalidations.push({ frame: e.n, reason: tracker.invalidReason ?? "" });
  };
  const kill = (e: Ev, reason: string) => {
    if (tracker.cursor.order.known) invalidations.push({ frame: e.n, reason });
    tracker = invalidateSpriteOrderTracker(tracker, reason);
  };
  const seed = (e: Ev, free: number[], mask: string) => {
    seededAt = e;
    const order = { known: true, free, pendingDestroyed: [] } as SpriteOrderState;
    tracker = { ...createSpriteOrderTracker(order), cursor: createSpriteOrderPlanCursor(order, maskSlots(mask)) };
  };
  const planUnit = (e: Ev, plan: SpriteOrderPlan, label: string) => {
    if (!tracker.cursor.order.known) return false;
    const cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
    if (!cursor.order.known) { kill(e, `unit plan did not resolve: ${label}`); return false; }
    tracker = { ...tracker, cursor, promptPair: null };
    return true;
  };
  const check = (e: Ev, unit: string) => {
    if (!tracker.cursor.order.known) return;
    unitChecks.push({ frame: e.n, unit, exact: same(tracker.cursor.order.free, e.obsF as number[]), occupiedMatch: same(tracker.cursor.occupied, maskSlots(e.obsMask as string)), mode: isolated && seededAt !== null ? "isolated" : "strict" });
  };
  const lastSurvivors = () => tracker.cursor.survivors[tracker.cursor.units - 1] ?? [];
  /** Apply the modelled transform of an uncovered unit; returns false when the class is not modelled / does not resolve (caller invalidates). */
  const modelUnit = (e: Ev): boolean => {
    const klass = String(e.unitClass);
    if (klass.startsWith("faint-")) {
      const side = klass === "faint-opponent" ? "opponent" : "player";
      const slot = roles.battler[side];
      if (slot === null) { if (side === "player") roles.playerGone = true; roles.lastUnit = klass; kill(e, `faint of ${side}: battler slot unknown`); return true; }
      if (side === "player") roles.playerGone = true;
      roles.lastUnit = klass;
      if (planUnit(e, [{ D: [["o", slot]] }], klass)) roles.battler[side] = null;
    } else if (klass === "U2-next-mon-summary") {
      roles.lastUnit = "summary";
      planUnit(e, PLANS.summary, klass);
    } else if (klass === "U3-next-mon-sendout") {
      const adjacent = roles.lastUnit === "summary";
      roles.lastUnit = "sendout";
      if (!adjacent) { kill(e, "send-out without the summary unit directly before it"); return true; }
      if (planUnit(e, PLANS.nextSendOut, klass)) {
        const survivors = lastSurvivors();
        if (survivors.length !== 1) { kill(e, `send-out left ${survivors.length} survivors`); return true; }
        roles.battler.opponent = survivors[0]!;
      }
    } else if (klass === "U4a-switchin-ball-start") {
      roles.lastUnit = "switchin-start";
      planUnit(e, PLANS.switchInStart, klass);
    } else if (klass === "U4b-switchin-ball-particles") {
      const adjacent = roles.lastUnit === "switchin-start";
      roles.lastUnit = "switchin";
      roles.playerGone = false;
      if (!adjacent) { kill(e, "switch-in particles without the start unit"); return true; }
      const battler = tracker.cursor.survivors[tracker.cursor.units - 1]?.[1] ?? null; // n1 of the start unit
      if (planUnit(e, PLANS.switchInParticles, klass)) roles.battler.player = battler;
    } else if (klass === "U5-party-menu") {
      roles.lastUnit = "party-menu"; // contents irrelevant: the menu exit is a ResetSpriteData (the next 'reset' event)
    } else if (klass === "U6-battle-reshow") {
      const plan = roles.playerGone ? PLANS.reshowPlayerGone : PLANS.reshowBoth;
      roles.lastUnit = "reshow";
      if (planUnit(e, plan, klass)) {
        const survivors = lastSurvivors();
        roles.battler.opponent = survivors[roles.playerGone ? 0 : 1] ?? null;
        roles.battler.player = roles.playerGone ? null : survivors[0] ?? null;
      }
    } else if (klass === "U7-end-trainer-slide") {
      roles.lastUnit = "trainer-slide";
      planUnit(e, PLANS.trainerSlide, klass);
    } else return false;
    return true;
  };

  for (let index = 0; index < events.length; index += 1) {
    const e = events[index]!;
    const next = events[index + 1];
    if (e.n <= entryEnd && e.k === "uncovered") continue;
    if (e.k === "prompt") {
      step(e, { kind: "action-prompt" });
      step(e, { kind: "actions-committed" });
      roles.lastUnit = "prompt";
    } else if (e.k === "blip") {
      step(e, { kind: "hit-animation", targetVisible: true });
    } else if (e.k === "body" || e.k === "anim") {
      const isBody = e.k === "body";
      const known = tracker.cursor.order.known;
      edges.push({
        frame: e.n, kind: isBody ? "move" : "anim", key: isBody ? `${e.move}:${e.side}` : `${e.table}:${e.id}:${e.arg}`, known, lent: spriteOrderTrackerLend(tracker) !== null,
        exact: known ? same(tracker.cursor.order.free, e.obsF as number[]) : null,
        occupiedMatch: known ? same(tracker.cursor.occupied, maskSlots(e.obsMask as string)) : null, trivial: seededAt === e,
      });
      if (isolated && !known) seed(e, e.obsF as number[], e.obsMask as string);
      const override = isBody ? BODY_OVERRIDES[`${e.move}:${e.side}`] : undefined;
      if (override) {
        if (tracker.promptPair !== null) kill(e, "body while the prompt pair lives");
        else planUnit(e, override, `body ${e.move}:${e.side}`);
      } else step(e, isBody ? { kind: "move-animation", moveId: e.move as number, attackerSide: e.side as Side } : animEvent(e.table as string, e.id as number, (e.arg as number | null) ?? null));
      roles.lastUnit = "body";
      if (isolated && !tracker.cursor.order.known && next) seed(next, next.preF as number[], next.preMask as string);
    } else if (e.k === "prompt-unterminated" && mode === "modelled") {
      step(e, { kind: "action-prompt" }); // the create half of the bounce pair (trace end / party menu opened over the prompt)
    } else if (e.k === "reset") {
      if (mode === "modelled") {
        tracker = createSpriteOrderTracker(initSpriteOrderState());
        roles.battler = { player: null, opponent: null };
        roles.lastUnit = "reset";
      } else kill(e, "reset (baseline invalidates)");
    } else if (e.k === "uncovered") {
      if (isolated && !tracker.cursor.order.known) {
        seed(e, e.preF as number[], e.preMask as string);
        const hint = (e.plan as { D?: ["o", number][] }[])[0]?.D?.[0];
        if (String(e.unitClass).startsWith("faint-") && hint) roles.battler[e.unitClass === "faint-opponent" ? "opponent" : "player"] = hint[1];
        if (e.unitClass === "U3-next-mon-sendout") roles.lastUnit = "summary"; // chain seeded mid-way: only meaningful after a summary unit
      }
      if (mode === "modelled" && String(e.unitClass).startsWith("other:HandleTurnActionSelectionState")) continue; // = the prompt-unterminated event above
      if (mode === "modelled" && modelUnit(e)) {
        modelled.push(`${e.n}:${String(e.unitClass)}`);
        if (e.unitClass !== "U5-party-menu") check(e, String(e.unitClass));
      } else kill(e, `uncovered unit class ${String(e.unitClass)}`);
      if (isolated && !tracker.cursor.order.known) seed({ ...e, n: e.last as number }, e.obsF as number[], e.obsMask as string);
    } else {
      kill(e, `${e.k}`);
    }
  }
  const count = (list: Edge[]) => ({
    edges: list.length, known: list.filter(x => x.known).length, tested: list.filter(x => x.known && !x.trivial).length,
    exact: list.filter(x => x.exact === true && !x.trivial).length, mismatched: list.filter(x => x.exact === false && !x.trivial).length,
    occupiedMismatch: list.filter(x => x.occupiedMatch === false && !x.trivial).length, lent: list.filter(x => x.lent).length,
  });
  const uc = (m: string) => { const l = unitChecks.filter(x => x.mode === m); return { checks: l.length, exact: l.filter(x => x.exact).length, mismatched: l.filter(x => !x.exact).length, occupiedMismatch: l.filter(x => !x.occupiedMatch).length }; };
  return {
    trace: name, mode, isolated, moveEdges: count(edges.filter(x => x.kind === "move")), animEdges: count(edges.filter(x => x.kind === "anim")),
    unitChecks: { strict: uc("strict"), isolated: uc("isolated") }, modelledUnits: modelled, firstInvalidation: invalidations[0] ?? null, invalidations, edges,
    unitCheckRows: unitChecks,
  };
}
