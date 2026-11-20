/**
 * Presentation-event transform of the free-slot `sSpriteOrder` (presentation-only; never touches rules or RNG).
 *
 * Implements the production rule table of docs/sprite-order-gap-causes.md §2, validated on real ordinary-Factory
 * battle histories by docs/sprite-order-real-route.md (strict replay: tests/spriteOrderEventTransform.test.ts):
 *
 *   action prompt shown          C[two lowest free] (DoBounceEffect pair; idempotent while the pair lives)
 *   actions committed            D[the pair, FDERIVED = F order at creation] (EndBounceEffect)
 *   move menu / cancel / cursor  no-op
 *   move-animation body          EXACT plan of (moveId, attacker side) from SPRITE_ORDER_PRODUCTION_BODIES, else invalidate;
 *                                Giga Drain (202) / Mega Drain (72): the event's geometry plan (the displayed species,
 *                                liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText), else invalidate
 *   hit-animation, target shown  blip: C[f]; D[n0] (DoHitAnimHealthboxEffect); a hidden target is unproven -> invalidate
 *   stat animation               +-1 / multiple: C[f]; D[n0]; +-2: C[f] and the carried D at the next boundary
 *   status animation             PSN / PRZ / SLP / INFATUATION plans; any other status -> invalidate
 *   general animation            HELD_ITEM_EFFECT / SUN_CONTINUES / FOCUS_PUNCH_SETUP plans; HAIL_CONTINUES: the event's geometry plan
 *                                (Move_HAIL at the displayed species, plans54); any other -> invalidate
 *   anything else                invalidate (substitute, transform, mid-battle slide, hidden battlers, ...)
 *
 * A body/animation unit that leaves exactly one survivor (+-2 stat copy, SLP/PRZ/INFATUATION tails) gets its carried
 * destroy `D[c1,0]` applied at once: the carry lands before any other allocation (real-route ±2 carry 3/3 exact).
 *
 * Battle units (docs/sprite-order-uncovered-units.md §2, plan texts = UNIT_PLANS of
 * tools/integration/spriteOrderUncoveredReplay.ts; their survivors are persistent sprites, never carried). The
 * tracker holds the battler sprite slot per side (entry: player 6, opponent 8; null = no tracked battler sprite) and
 * the last applied unit (adjacency guard, §2 rules (a)-(d)):
 *
 *   faint {side}                 D o<battler slot>; an unknown slot invalidates
 *   party-summary-next           Cfeeeeee (opponent next-mon summary; only after the opponent battler is gone)
 *   party-summary-hide           marker: must directly follow party-summary-next, no allocation
 *   next-mon-send-out            nextSendOut directly after party-summary-next; its single survivor = opponent battler
 *   switch-in-start / -finish    switchInStart (side battler gone, directly after a reshow or recall; side default
 *                                player), then switchInParticles directly after it; side battler = n1 of the start unit
 *   forced-switch-out {side}     D o<battler slot> (Roar/Whirlwind `returntoball`, skipAnim: no recall particles;
 *                                docs/forced-switch-continuation.md §2.4, ROM free order 6/6); roles kept, unit "recall"
 *   party-menu-reset             ResetSpriteData: identity F, empty occupancy, battler slots and occupant roles
 *                                forgotten; revives an invalid tracker (the one revive path)
 *   battle-reshow                directly after a reset: reshowBoth / reshowPlayerGone by playerBattlerPresent; both
 *                                set the occupant roles from their survivors (below)
 *   switch-out                   recall(player slot): the voluntary switch's `returnatktoball` (docs/voluntary-switch-
 *                                lend-audit.md §2.3: 18/18 edges exact; the [n2, battler] group order is unobservable and
 *                                lend-irrelevant); roles kept
 *   trainer-slide-end            Cf (end-of-battle win slide)
 *
 * Occupant roles (docs/playerfaint-lend-audit.md §2.2 / §4.1): the healthbox main sprite per side and the enemy shadow
 * (entry 0 / 1 / 2). The healthbox other/bar halves are always 63,62 / 61,60 (CreateSpriteAtEnd from a full-free order
 * in both creation paths). reshowPlayerGone "Cf;Cfee;Cfee;Cf" sets them from its survivors (player healthbox n1,
 * opponent healthbox n4, shadow n7: ROM 1 / 2 / 3); reshowBoth "Cf;Cf;Cfee;Cfee;Cf" (voluntary party menu: cancel, or
 * the return from a voluntary choose) from its survivors n2 / n5 / n8 (ROM 2 / 3 / 4; docs/voluntary-switch-lend-audit.md
 * §2.2, 45 edges); faint, summary, send-out, recall, switch-in and bodies keep them.
 *
 * Any unit whose guard fails or whose plan does not resolve invalidates. Once invalid the tracker stays invalid
 * until a fresh known entry or a party-menu reset; it never guesses.
 */
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor,
  initSpriteOrderState,
  type SpriteOrderPlan, type SpriteOrderPlanCursor, type SpriteOrderPlanToken, type SpriteOrderPlanWindow,
  type SpriteOrderState,
} from "./spriteOrderProvider.ts";
import {
  SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS,
} from "./spriteOrderProductionPlans.ts";

export type SpriteOrderPresentationEvent =
  | Readonly<{ kind: "action-prompt" }>
  | Readonly<{ kind: "actions-committed" }>
  | Readonly<{ kind: "move-menu" }>
  | Readonly<{ kind: "move-animation"; moveId: number; attackerSide: "player" | "opponent"; geometryPlan?: string;
    /** ice2: the displayed field of a lent-order-keyed body (Water Spout 323 / Shock Wave 351) recorded while the order was unknown (a pending
     * words marker): the render seam computes the plan at the replayed tracker's lend (`geometryPlanText`) instead of a record-time plan text. */
    geometryField?: object }>
  | Readonly<{ kind: "hit-animation"; targetVisible: boolean }>
  | Readonly<{ kind: "stat-animation"; argument: number }>
  | Readonly<{ kind: "status-animation"; status: string }>
  | Readonly<{ kind: "general-animation"; animation: string; geometryPlan?: string }>
  | Readonly<{ kind: "faint"; side: SpriteOrderSide }>
  | Readonly<{ kind: "party-summary-next" }>
  | Readonly<{ kind: "party-summary-hide" }>
  | Readonly<{ kind: "next-mon-send-out" }>
  | Readonly<{ kind: "switch-in-start"; side?: SpriteOrderSide }>
  | Readonly<{ kind: "switch-in-finish"; side?: SpriteOrderSide }>
  | Readonly<{ kind: "forced-switch-out"; side: SpriteOrderSide }>
  | Readonly<{ kind: "party-menu-reset" }>
  | Readonly<{ kind: "battle-reshow"; playerBattlerPresent: boolean; opponentBattlerPresent?: boolean }>
  | Readonly<{ kind: "switch-out"; side?: SpriteOrderSide }>
  | Readonly<{ kind: "trainer-slide-end" }>
  | Readonly<{ kind: "invalidate"; reason: string }>;

export type SpriteOrderSide = "player" | "opponent";
export type SpriteOrderBattlerSlots = Readonly<{ player: number | null; opponent: number | null }>;
/** Persistent occupants that are not battler sprites: the healthbox main sprite per side and the enemy shadow. */
export type SpriteOrderOccupantRoles = Readonly<{
  healthboxMain: Readonly<{ player: number; opponent: number }>; shadow: number;
}>;
/** Last allocation unit applied (adjacency guard of the §2 unit pairs). */
export type SpriteOrderUnitKind =
  | "entry" | "prompt" | "commit" | "body" | "animation" | "faint" | "summary" | "send-out" | "switch-in-start"
  | "switch-in" | "reset" | "reshow" | "recall" | "trainer-slide";

export interface SpriteOrderTracker {
  readonly cursor: SpriteOrderPlanCursor;
  /** Bounce-pair slots while the action prompt is up (created, not yet destroyed). */
  readonly promptPair: readonly number[] | null;
  /** First reason the order became unknown (diagnostic only). */
  readonly invalidReason: string | null;
  /** Battler sprite slot per side; null = no tracked battler sprite (fainted, recalled, or forgotten at a reset). */
  readonly battlerSlots: SpriteOrderBattlerSlots;
  /** Healthbox main per side + enemy shadow; null = unknown (after a reset, the reshowBoth geometry, a recall). */
  readonly occupantRoles: SpriteOrderOccupantRoles | null;
  readonly lastUnit: SpriteOrderUnitKind;
}

/** Plan texts of the battle units (docs/sprite-order-uncovered-units.md §2 = UNIT_PLANS of
 * tools/integration/spriteOrderUncoveredReplay.ts, pinned equal by tests/spriteOrderBattleUnits.test.ts). */
export const SPRITE_ORDER_UNIT_PLAN_TEXTS = Object.freeze({
  summary: "Cfeeeeee",
  nextSendOut: "Cff;Cf;Dc1.6,c1.5,c1.4,c1.3,c1.2,c1.1,c1.0;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D2;Cf;Cf;Cf;D0;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15;D16;D17;D18",
  switchInStart: "Cff;Cf",
  switchInParticles: "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Dc1.2;Cf;Cf;Cf;Dc1.0;D0;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15",
  trainerSlide: "Cf",
  reshowPlayerGone: "Cf;Cfee;Cfee;Cf",
  reshowBoth: "Cf;Cf;Cfee;Cfee;Cf",
});
/**
 * Voluntary recall: 16 particles, the player battler freed with particle n2 (docs/voluntary-switch-lend-audit.md §2.3:
 * exact at 18 post-recall edges; the switch-in re-creates and re-destroys the freed pair's slots, so the group order
 * inside the window is unobservable and cannot reach a body edge).
 */
export function spriteOrderRecallPlanText(battlerSlot: number): string {
  return `${"Cf;".repeat(16)}D0;D1;D2,o${battlerSlot};${Array.from({ length: 13 }, (_, i) => `D${i + 3}`).join(";")}`;
}
/** Battler sprite slots at the known entry (KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER: player 6, opponent 8). */
export const KNOWN_ENTRY_BATTLER_SLOTS: SpriteOrderBattlerSlots = Object.freeze({ player: 6, opponent: 8 });
/** Occupant roles at the known entry (ROM gHealthboxSpriteIds: player 0, opponent 1; enemy shadow 2). */
export const KNOWN_ENTRY_OCCUPANT_ROLES: SpriteOrderOccupantRoles = Object.freeze({
  healthboxMain: Object.freeze({ player: 0, opponent: 1 }), shadow: 2,
});
/** Healthbox other half + bar per side (63,62 / 61,60 in every creation path): fixed labels. */
const HEALTHBOX_HALVES: readonly number[] = Object.freeze([60, 61, 62, 63]);

/**
 * Moves whose bodies hand the battler sprite to another graphics owner (§2 "transform"): invalidate. The Substitute body (164) is
 * order-neutral: Move_SUBSTITUTE is playsewithpan + createvisualtask AnimTask_MonToSubstitute, which rotscales the battler's own
 * OBJ and reloads its tiles in place (LoadBattleMonGfxAndAnimate -> BattleLoadSubstituteOrMonSpriteGfx: LZDecompressVram into the
 * battler's sprite gfx; no CreateSprite / DestroySprite), so it applies its measured EXACT empty plan (the ext table's 164 bodies;
 * docs/next-adapters-prep38.md s1 NEEDS-ORDER: the drop-164 lend makes Giga Drain / Mud-Slap / Ice Beam / Thunderbolt / Megahorn exact).
 */
const OWNERSHIP_CHANGING_MOVES: ReadonlySet<number> = new Set([144]);
const PROMPT_CREATE: SpriteOrderPlan = Object.freeze([{ C: [["n", 0, "f"], ["n", 1, "f"]] }]);
const BLIP: SpriteOrderPlan = Object.freeze([{ C: [["n", 0, "f"]] }, { D: [["n", 0]] }]);
const CARRY: SpriteOrderPlan = Object.freeze([{ D: [["c", 1, 0]] }]);
const PROMPT_PRIORITY_WORD = 782;

/** Inverse of tools/integration/spriteOrderProductionTable.ts `encodeSpriteOrderPlan`. */
export function decodeSpriteOrderPlan(text: string): SpriteOrderPlan {
  if (text === "") return Object.freeze([]);
  let made = 0;
  return Object.freeze(text.split(";").map(windowText => {
    const window: { C?: (readonly ["n", number, "f" | "e"])[]; D?: SpriteOrderPlanToken[]; pw?: number[] } = {};
    for (const part of windowText.split("/")) {
      const body = part.slice(1);
      if (part[0] === "C") {
        window.C = [...body].map(mode => {
          if (mode !== "f" && mode !== "e") throw new Error(`bad create mode ${mode}`);
          return Object.freeze(["n", made++, mode] as const);
        });
      } else if (part[0] === "D") {
        window.D = body.split(",").map(token => Object.freeze(token[0] === "c"
          ? ["c", Number(token.slice(1).split(".")[0]), Number(token.slice(1).split(".")[1])] as const
          : token[0] === "o" ? ["o", Number(token.slice(1))] as const : ["n", Number(token)] as const));
      } else if (part[0] === "P") {
        window.pw = body.split(",").map(Number);
      } else {
        throw new Error(`bad plan part ${part}`);
      }
    }
    return Object.freeze(window) as SpriteOrderPlanWindow;
  }));
}

const decoded = new Map<number, SpriteOrderPlan>();
function planAt(index: number | undefined): SpriteOrderPlan | null {
  if (index === undefined) return null;
  let plan = decoded.get(index);
  if (!plan) {
    const text = SPRITE_ORDER_PRODUCTION_PLANS[index];
    if (text === undefined) return null;
    plan = decodeSpriteOrderPlan(text);
    decoded.set(index, plan);
  }
  return plan;
}

/** EXACT body plan of `(moveId, attacker side)`, or null (NEEDS-KEYS / not observed / substitute / transform). */
/** Geometry-keyed move bodies (Giga Drain 202, Mega Drain 72, Dream Eater 138: same-frame orb destroys order by the battlers'
 * geometry; Eruption 284, plans54: the launch rocks' destroy groups follow the attacker's geometry, ISSUES #155): the host attaches the
 * body's plan text computed at the displayed species (`geometryPlan`, liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText) to their
 * move-animation event; no plan text invalidates (the base table's `284:*` rows are not used). Hail 258 (plans54): the particles target both
 * battlers' coordinates. Blizzard 59 (plans54): same-frame destroy groups follow the attacker / target geometry (the base table's
 * `59:player` row is the plan at its one probed geometry). Water Spout 323 (plans54): the attacker's HP tier, its picture and the lent order.
 * Shock Wave 351 (sw67): the bolt walk / lightning count follow the attacker / target geometry and the destroy groups the lent order. */
export const SPRITE_ORDER_GEOMETRY_KEYED_BODIES: ReadonlySet<number> = new Set([202, 72, 138, 284, 258, 59, 323, 351]);
/** Geometry-keyed general animations (plans54): HAIL_CONTINUES (General_Hail: `goto Move_HAIL`) carries Move_HAIL's plan at the displayed
 * species (`geometryPlan`); without it the animation invalidates. */
export const SPRITE_ORDER_GEOMETRY_KEYED_ANIMS: ReadonlySet<string> = new Set(["HAIL_CONTINUES"]);
const geometryPlans = new Map<string, SpriteOrderPlan>();
const decodeGeometryPlan = (text: string): SpriteOrderPlan => {
  if (!geometryPlans.has(text)) geometryPlans.set(text, decodeSpriteOrderPlan(text));
  return geometryPlans.get(text)!;
};

export function spriteOrderProductionBodyPlan(moveId: number, side: "player" | "opponent"): SpriteOrderPlan | null {
  if (OWNERSHIP_CHANGING_MOVES.has(moveId)) return null;
  return planAt(Object.hasOwn(SPRITE_ORDER_PRODUCTION_BODIES, `${moveId}:${side}`)
    ? SPRITE_ORDER_PRODUCTION_BODIES[`${moveId}:${side}`] : undefined);
}

/** `B_ANIM_STATS_CHANGE` argument (STAT_ANIM_PLUS1/MINUS1 + stat 15..28, PLUS2/MINUS2 + stat 39..52, multiple
 * +1/-1 55/57, multiple +-2 56/58). scf117: multiple +-2 is class 2 (stat101 Memento 58 receipt, both scenes: the copy in
 * gSprites slot 3 from rel 2, freed on the fall row 89, the Screech 47 rows exactly; 56 takes the same sharply Step path). */
export function spriteOrderStatAnimationPlan(argument: number): SpriteOrderPlan | null {
  const klass = (argument >= 15 && argument <= 28) || argument === 55 || argument === 57 ? 1
    : (argument >= 39 && argument <= 52) || argument === 56 || argument === 58 ? 2 : null;
  return klass === null ? null : planAt(SPRITE_ORDER_PRODUCTION_ANIMS[`STATS_CHANGE_CLASS_${klass}`]);
}

/** `InitAndLaunchChosenStatusAnimation` (battle_anim.c) status -> `B_ANIM_STATUS_*` name; null = no animation. */
export function spriteOrderStatusAnimationName(isStatus2: boolean, status: number): string | null {
  if (!isStatus2) {
    if (status === 0x20) return "FRZ";
    if (status === 0x8 || (status & 0x80) !== 0) return "PSN";
    if (status === 0x10) return "BRN";
    if ((status & 0x7) !== 0) return "SLP";
    if (status === 0x40) return "PRZ";
    return null;
  }
  if ((status & 0x000f0000) !== 0) return "INFATUATION";
  if ((status & 0x7) !== 0) return "CONFUSION";
  if ((status & 0x10000000) !== 0) return "CURSED";
  if ((status & 0x08000000) !== 0) return "NIGHTMARE";
  if ((status & 0xe000) !== 0) return "WRAPPED";
  return null;
}

/**
 * Tracker at `order`. `battlerSlots` defaults to the known-entry battler sprites (player 6, opponent 8), each kept only
 * while that slot is occupied in `order` (a ResetSpriteData identity order therefore tracks no battler). The occupant
 * roles default to the known-entry ones (0 / 1 / 2), kept only while all of them are occupied.
 */
export function createSpriteOrderTracker(
  order: SpriteOrderState, battlerSlots: SpriteOrderBattlerSlots = KNOWN_ENTRY_BATTLER_SLOTS,
  occupantRoles: SpriteOrderOccupantRoles | null = KNOWN_ENTRY_OCCUPANT_ROLES,
): SpriteOrderTracker {
  const occupied = (slot: number) => order.known && !order.free.includes(slot);
  const held = (slot: number | null) => slot !== null && occupied(slot) ? slot : null;
  const roles = occupantRoles !== null && [occupantRoles.healthboxMain.player, occupantRoles.healthboxMain.opponent,
    occupantRoles.shadow].every(occupied) ? occupantRoles : null;
  return Object.freeze({
    cursor: createSpriteOrderPlanCursor(order),
    promptPair: null,
    invalidReason: order.known ? null : "unknown entry",
    battlerSlots: Object.freeze({ player: held(battlerSlots.player), opponent: held(battlerSlots.opponent) }),
    occupantRoles: roles,
    lastUnit: "entry",
  });
}

export function invalidateSpriteOrderTracker(tracker: SpriteOrderTracker, reason: string): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  return Object.freeze({
    ...tracker, cursor: applySpriteOrderUnitPlan(tracker.cursor, null), promptPair: null, invalidReason: reason,
  });
}

function applyPlan(
  tracker: SpriteOrderTracker, plan: SpriteOrderPlan | null, label: string, unit: "body" | "animation" = "animation",
): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  if (plan === null) return invalidateSpriteOrderTracker(tracker, `no EXACT plan: ${label}`);
  let cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
  if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `plan did not resolve: ${label}`);
  const survivors = cursor.survivors[cursor.units - 1] ?? [];
  if (survivors.length > 1) return invalidateSpriteOrderTracker(tracker, `${survivors.length} survivors: ${label}`);
  if (survivors.length === 1) {
    cursor = applySpriteOrderUnitPlan(cursor, CARRY);
    if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `carry did not resolve: ${label}`);
  }
  return Object.freeze({ ...tracker, cursor, lastUnit: unit });
}

/**
 * prep49: the forced party menu's reshow with neither battler sprite (a double KO: Explosion / recoil; CreateBattlerSprite skips a
 * fainted mon, the healthboxes and the enemy shadow are created regardless): both healthboxes, then the shadow (ROM 4/4, 8 runs).
 */
const RESHOW_NEITHER_PLAN_TEXT = "Cfee;Cfee;Cf";
const UNIT_PLANS: Readonly<Record<keyof typeof SPRITE_ORDER_UNIT_PLAN_TEXTS, SpriteOrderPlan>> = Object.freeze(
  Object.fromEntries(Object.entries(SPRITE_ORDER_UNIT_PLAN_TEXTS).map(([key, text]) => [key, decodeSpriteOrderPlan(text)])),
) as never;

/** Apply a battle unit's plan (its survivors are persistent sprites: no carry). Null when the plan does not resolve. */
function applyUnit(tracker: SpriteOrderTracker, plan: SpriteOrderPlan): SpriteOrderPlanCursor | null {
  const cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
  return cursor.order.known ? cursor : null;
}

function withUnit(
  tracker: SpriteOrderTracker, cursor: SpriteOrderPlanCursor, lastUnit: SpriteOrderUnitKind,
  battlerSlots: SpriteOrderBattlerSlots = tracker.battlerSlots,
  occupantRoles: SpriteOrderOccupantRoles | null = tracker.occupantRoles,
): SpriteOrderTracker {
  return Object.freeze({ ...tracker, cursor, lastUnit, battlerSlots: Object.freeze({ ...battlerSlots }), occupantRoles });
}

const lastSurvivors = (cursor: SpriteOrderPlanCursor): readonly number[] => cursor.survivors[cursor.units - 1] ?? [];

function applyBattleUnit(
  tracker: SpriteOrderTracker,
  event: Exclude<SpriteOrderPresentationEvent, Readonly<{ kind: "action-prompt" | "actions-committed" | "move-menu"
    | "move-animation" | "hit-animation" | "stat-animation" | "status-animation" | "general-animation" | "invalidate"
    | "party-menu-reset" }>>,
): SpriteOrderTracker {
  const fail = (reason: string) => invalidateSpriteOrderTracker(tracker, reason);
  if (tracker.promptPair !== null) return fail(`${event.kind} while the prompt pair lives`);
  const slots = tracker.battlerSlots;
  switch (event.kind) {
    case "faint": {
      const slot = slots[event.side];
      if (slot === null) return fail(`faint of ${event.side}: battler slot unknown`);
      const cursor = applyUnit(tracker, [{ D: [["o", slot]] }]);
      return cursor ? withUnit(tracker, cursor, "faint", { ...slots, [event.side]: null }) : fail(`faint of ${event.side}: plan did not resolve`);
    }
    case "party-summary-next": {
      if (slots.opponent !== null) return fail("next-mon summary while the opponent battler is tracked");
      const cursor = applyUnit(tracker, UNIT_PLANS.summary);
      return cursor ? withUnit(tracker, cursor, "summary") : fail("next-mon summary: plan did not resolve");
    }
    case "party-summary-hide":
      return tracker.lastUnit === "summary" ? tracker : fail("summary hidden without the summary unit directly before it");
    case "next-mon-send-out": {
      if (tracker.lastUnit !== "summary") return fail("send-out without the summary unit directly before it");
      const cursor = applyUnit(tracker, UNIT_PLANS.nextSendOut);
      if (!cursor) return fail("send-out: plan did not resolve");
      const survivors = lastSurvivors(cursor);
      if (survivors.length !== 1) return fail(`send-out left ${survivors.length} survivors`);
      return withUnit(tracker, cursor, "send-out", { ...slots, opponent: survivors[0]! });
    }
    case "forced-switch-out": {
      const slot = slots[event.side];
      if (slot === null) return fail(`forced switch-out of ${event.side}: battler slot unknown`);
      const cursor = applyUnit(tracker, [{ D: [["o", slot]] }]);
      return cursor ? withUnit(tracker, cursor, "recall", { ...slots, [event.side]: null })
        : fail(`forced switch-out of ${event.side}: plan did not resolve`);
    }
    case "switch-in-start": {
      const side = event.side ?? "player";
      if (slots[side] !== null) return fail(`switch-in while the ${side} battler is tracked`);
      if (tracker.lastUnit !== "reshow" && tracker.lastUnit !== "recall") {
        return fail("switch-in without a reshow or recall directly before it");
      }
      const cursor = applyUnit(tracker, UNIT_PLANS.switchInStart);
      return cursor ? withUnit(tracker, cursor, "switch-in-start") : fail("switch-in start: plan did not resolve");
    }
    case "switch-in-finish": {
      if (tracker.lastUnit !== "switch-in-start") return fail("switch-in particles without the start unit directly before it");
      const battler = lastSurvivors(tracker.cursor)[1];
      const cursor = applyUnit(tracker, UNIT_PLANS.switchInParticles);
      if (!cursor || battler === undefined) return fail("switch-in particles: plan did not resolve");
      return withUnit(tracker, cursor, "switch-in", { ...slots, [event.side ?? "player"]: battler });
    }
    case "battle-reshow": {
      if (tracker.lastUnit !== "reset") return fail("reshow without a party-menu reset directly before it");
      if (event.opponentBattlerPresent === false) {
        if (event.playerBattlerPresent) return fail("reshow without the opponent battler");
        // reshowNeither survivors: n0..n2 / n3..n5 player / opponent healthbox, n6 shadow.
        const neither = applyUnit(tracker, decodeSpriteOrderPlan(RESHOW_NEITHER_PLAN_TEXT));
        if (!neither) return fail("reshow: plan did not resolve");
        const kept = lastSurvivors(neither);
        return withUnit(tracker, neither, "reshow", { player: null, opponent: null }, Object.freeze({
          healthboxMain: Object.freeze({ player: kept[0]!, opponent: kept[3]! }), shadow: kept[6]!,
        }));
      }
      const cursor = applyUnit(tracker, event.playerBattlerPresent ? UNIT_PLANS.reshowBoth : UNIT_PLANS.reshowPlayerGone);
      if (!cursor) return fail("reshow: plan did not resolve");
      const survivors = lastSurvivors(cursor);
      // reshowBoth survivors: n0 / n1 player / opponent battler, n2..n4 / n5..n7 player / opponent healthbox, n8 shadow.
      // reshowPlayerGone survivors: n0 opponent battler, n1..n3 / n4..n6 player / opponent healthbox, n7 shadow.
      return event.playerBattlerPresent
        ? withUnit(tracker, cursor, "reshow", { player: survivors[0]!, opponent: survivors[1]! }, Object.freeze({
          healthboxMain: Object.freeze({ player: survivors[2]!, opponent: survivors[5]! }), shadow: survivors[8]!,
        }))
        : withUnit(tracker, cursor, "reshow", { player: null, opponent: survivors[0]! }, Object.freeze({
          healthboxMain: Object.freeze({ player: survivors[1]!, opponent: survivors[4]! }), shadow: survivors[7]!,
        }));
    }
    case "switch-out": {
      // prep47 (C): the Factory AI's voluntary recall is the same plan with the opponent battler (side "opponent").
      const side = event.side ?? "player";
      const slot = slots[side];
      if (slot === null) return fail(`recall: ${side} battler slot unknown`);
      const cursor = applyUnit(tracker, decodeSpriteOrderPlan(spriteOrderRecallPlanText(slot)));
      return cursor ? withUnit(tracker, cursor, "recall", { ...slots, [side]: null }) : fail("recall: plan did not resolve");
    }
    case "trainer-slide-end": {
      const cursor = applyUnit(tracker, UNIT_PLANS.trainerSlide);
      return cursor ? withUnit(tracker, cursor, "trainer-slide") : fail("trainer slide: plan did not resolve");
    }
  }
}

/** Apply one presentation event (pure). */
export function applySpriteOrderPresentationEvent(
  tracker: SpriteOrderTracker, event: SpriteOrderPresentationEvent,
): SpriteOrderTracker {
  // ResetSpriteData: identity order, nothing allocated, no battler tracked (rule (d): revives an invalid tracker).
  if (event.kind === "party-menu-reset") {
    return Object.freeze({
      ...createSpriteOrderTracker(initSpriteOrderState(), { player: null, opponent: null }, null), lastUnit: "reset",
    });
  }
  if (!tracker.cursor.order.known) return tracker;
  switch (event.kind) {
    case "move-menu":
      return tracker;
    case "action-prompt": {
      if (tracker.promptPair !== null) return tracker;
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, PROMPT_CREATE);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair did not resolve");
      return Object.freeze({
        ...tracker, cursor, promptPair: Object.freeze([...cursor.survivors[cursor.units - 1]!]), lastUnit: "prompt",
      });
    }
    case "actions-committed": {
      if (tracker.promptPair === null) return invalidateSpriteOrderTracker(tracker, "actions committed without a prompt pair");
      const destroy: SpriteOrderPlan = [{
        D: tracker.promptPair.map(slot => ["o", slot] as const),
        pw: tracker.promptPair.map(() => PROMPT_PRIORITY_WORD),
      }];
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, destroy);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair destroy did not resolve");
      return Object.freeze({ ...tracker, cursor, promptPair: null, lastUnit: "commit" });
    }
    case "move-animation":
      if (tracker.promptPair !== null) return invalidateSpriteOrderTracker(tracker, "body while the prompt pair lives");
      // Giga Drain / Mega Drain: same-frame orb destroys order by the battlers' geometry; no geometry plan -> no plan (invalidates).
      return applyPlan(tracker, SPRITE_ORDER_GEOMETRY_KEYED_BODIES.has(event.moveId)
        ? event.geometryPlan === undefined ? null : decodeGeometryPlan(event.geometryPlan)
        : spriteOrderProductionBodyPlan(event.moveId, event.attackerSide),
      `body ${event.moveId}:${event.attackerSide}`, "body");
    case "hit-animation":
      // prep61: Player/OpponentHandleHitAnimation complete at once for an invisible battler sprite (no DoHitAnimHealthboxEffect): no
      // allocation (ROM: Gust on an ON_AIR Fly / Bounce user, Surf on an UNDERWATER Dive user, both sides).
      return event.targetVisible ? applyPlan(tracker, BLIP, "hit-animation blip") : tracker;
    case "stat-animation":
      return applyPlan(tracker, spriteOrderStatAnimationPlan(event.argument), `stat animation ${event.argument}`);
    case "status-animation":
      return applyPlan(tracker, planAt(SPRITE_ORDER_PRODUCTION_ANIMS[`STATUS_${event.status}`]),
        `status animation ${event.status}`);
    case "general-animation":
      return applyPlan(tracker, event.animation.startsWith("STAT") || event.animation.startsWith("STATUS_") ? null
        : SPRITE_ORDER_GEOMETRY_KEYED_ANIMS.has(event.animation)
          ? event.geometryPlan === undefined ? null : decodeGeometryPlan(event.geometryPlan)
          : planAt(Object.hasOwn(SPRITE_ORDER_PRODUCTION_ANIMS, event.animation)
            ? SPRITE_ORDER_PRODUCTION_ANIMS[event.animation] : undefined),
      `general animation ${event.animation}`);
    case "invalidate":
      return invalidateSpriteOrderTracker(tracker, event.reason);
    default:
      return applyBattleUnit(tracker, event);
  }
}

const KNOWN_ENTRY_FREE_SORTED: readonly number[] = Object.freeze([...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER].sort((l, r) => l - r));

/**
 * Entry-label relabel rho of docs/playerfaint-lend-audit.md §3 (generalising pi of docs/postko-consumer-audit.md §3.1) for a
 * post-unit view, or null when its occupancy is not role-isomorphic to the known entry: both battler slots and the occupant
 * roles known, and occupied == exactly the role set {battler P, battler O, healthbox main P / O, shadow, 60..63}. rho maps
 * each role onto its entry label (battlers 6 / 8, healthbox mains 0 / 1, shadow 2, 60..63 themselves) and the free slots
 * rank-for-rank (ascending) onto the known-entry free slots. `CreateSprite`/`CreateSpriteAtEnd` (lowest/highest free),
 * `AllocOamMatrix`, `CreateTask` and `SortSprites` (keys, ties by current order position, never by slot number) commute
 * with rho, so every modelled allocation and sort decision maps onto the entry one (§3.2 conditions (a)-(c), ROM-checked
 * at the entry, after opponent KOs and after a player faint + forced switch-in). Roles omitted (undefined) = the entry
 * roles 0 / 1 / 2, where rho is pi; null = unknown roles. At the known entry rho is the identity.
 */
export function spriteOrderEntryLabelRelabel(view: Readonly<{
  free: readonly number[]; occupied: readonly number[]; battlerSlots: SpriteOrderBattlerSlots;
  occupantRoles?: SpriteOrderOccupantRoles | null;
}>): ReadonlyMap<number, number> | null {
  const { player, opponent } = view.battlerSlots;
  const roles = view.occupantRoles === undefined ? KNOWN_ENTRY_OCCUPANT_ROLES : view.occupantRoles;
  if (player === null || opponent === null || roles === null) return null;
  const labels: readonly (readonly [number, number])[] = [
    [player, KNOWN_ENTRY_BATTLER_SLOTS.player!], [opponent, KNOWN_ENTRY_BATTLER_SLOTS.opponent!],
    [roles.healthboxMain.player, KNOWN_ENTRY_OCCUPANT_ROLES.healthboxMain.player],
    [roles.healthboxMain.opponent, KNOWN_ENTRY_OCCUPANT_ROLES.healthboxMain.opponent],
    [roles.shadow, KNOWN_ENTRY_OCCUPANT_ROLES.shadow], ...HEALTHBOX_HALVES.map(slot => [slot, slot] as const),
  ];
  const roleSlots = labels.map(([slot]) => slot).sort((l, r) => l - r);
  if (new Set(roleSlots).size !== roleSlots.length) return null;
  const occupied = [...view.occupied].sort((l, r) => l - r);
  if (occupied.length !== roleSlots.length || occupied.some((slot, index) => slot !== roleSlots[index])) return null;
  const free = [...view.free].sort((l, r) => l - r);
  if (free.length !== KNOWN_ENTRY_FREE_SORTED.length || free.some(slot => roleSlots.includes(slot))) return null;
  const rho = new Map<number, number>(labels);
  free.forEach((slot, rank) => rho.set(slot, KNOWN_ENTRY_FREE_SORTED[rank]!));
  return rho;
}

/**
 * Order lent to a move body at its activation edge: known, no prompt pair alive, and allocator occupancy
 * role-isomorphic to the known entry (spriteOrderEntryLabelRelabel; the entry itself, after a modelled opponent
 * faint + next-mon summary + send-out, after a player faint + forced party menu + reshowPlayerGone + forced
 * switch-in {0,1,2,3,5,60..63} with roles 1 / 2 / 3, or after a voluntary party menu's reshowBoth {0,1,2,3,4,60..63} and
 * its recall + switch-in {1,2,3,4,5,60..63} with roles 2 / 3 / 4). The lend is the tracked free order relabelled to entry slot
 * labels, F.map(rho), so every consumer's entry slot constants, lowest-free slices and occupied prefix stay valid labels;
 * the raw post-unit F is never handed out. Otherwise (unknown roles; mid-summary, mid-reshow, prompt pair alive) null:
 * consumers decline.
 */
export function spriteOrderTrackerLend(tracker: SpriteOrderTracker): readonly number[] | null {
  const view = spriteOrderTrackerPostUnitView(tracker);
  if (view === null) return null;
  const pi = spriteOrderEntryLabelRelabel(view);
  if (pi === null) return null;
  const free = view.free.map(slot => pi.get(slot)!);
  return free.every((slot, index) => slot === view.free[index]) ? view.free : Object.freeze(free);
}

/** Whether the tracker's post-unit view is role-isomorphic to the known entry (the lend gate without the order). */
export function spriteOrderTrackerRoleIsomorphic(tracker: SpriteOrderTracker): boolean {
  const view = spriteOrderTrackerPostUnitView(tracker);
  return view !== null && spriteOrderEntryLabelRelabel(view) !== null;
}

/**
 * Post-unit view: the tracked free order, the model's own allocator occupancy, the battler sprite slots and the occupant
 * roles (input of spriteOrderEntryLabelRelabel). Null when the order is unknown or the action-prompt pair is alive.
 */
export function spriteOrderTrackerPostUnitView(tracker: SpriteOrderTracker): Readonly<{
  free: readonly number[]; occupied: readonly number[]; battlerSlots: SpriteOrderBattlerSlots;
  occupantRoles: SpriteOrderOccupantRoles | null;
}> | null {
  const { order, occupied } = tracker.cursor;
  if (!order.known || tracker.promptPair !== null) return null;
  return Object.freeze({ free: order.free, occupied, battlerSlots: tracker.battlerSlots, occupantRoles: tracker.occupantRoles });
}

/**
 * Deferred lend (docs/s10a-random2-order-lend-blocker.md design 1, "seam-resolved"): a multi-body Random2 move's earlier body (Ice Ball's
 * shard y-sort, Dive's setup droplets) leaves a free order that depends on that body's presentation Random2 words, which the logical order
 * host never reads. The host records this word-free marker instead of a free order: the earlier body's presentation body key
 * (liveMovePresentationRngBodyKey) and request fields, its own activation lend (a known-entry-occupancy free order, or itself deferred) and
 * the order events applied since (`units`, the transform's own events). Only the render seam resolves it
 * (resolveSpriteOrderDeferredLend), reading the earlier body's recorded words to carry the order through it.
 */
export interface SpriteOrderDeferredLend {
  readonly key: string;
  readonly moveId: number;
  readonly attackerSide: SpriteOrderSide;
  /** Ice Ball: the earlier body's request.rolloutCounter (1..5). */
  readonly rolloutCounter?: number;
  /** Dive: the earlier body's request.turn. */
  readonly turn?: number;
  /**
   * A general-animation words unit (RAIN_CONTINUES, General_Rain; liveWordsUnitPostFree in liveMoveAnimation.ts): `key` is its per-event presentation key and
   * `moveId` is 0 (no move body).
   */
  readonly generalAnimation?: string;
  /**
   * words59 (docs/next-adapters-words59.md): Sand-Attack / Mud-Slap: the species ids displayed on each side at the body (the field the live
   * renderer drew it on). Their dirt carry aims at both battlers' pic points, which a later send-out / switch-in changes on the consumer's
   * field; the carry reads these instead (species ids only: word-free, render-pure).
   */
  readonly bodySpecies?: Readonly<Record<SpriteOrderSide, number>>;
  readonly activation: Readonly<{ free: readonly number[] }> | Readonly<{ deferred: SpriteOrderDeferredLend }>;
  readonly units: readonly SpriteOrderPresentationEvent[];
}

/**
 * Units a deferred lend may replay: body / animation / prompt units that keep the occupancy (a KO, a send-in, a switch, a party menu, a
 * slide or an invalidation was not modelled by the design's check, tools/integration/s10aLendChainCheck.ts: the lend declines).
 */
const DEFERRED_REPLAY_UNITS: ReadonlySet<SpriteOrderPresentationEvent["kind"]> = new Set([
  "action-prompt", "actions-committed", "move-menu", "move-animation", "hit-animation", "stat-animation", "status-animation", "general-animation"]);

/**
 * words57 (docs/next-adapters-words57.md): battle units a marker that opts in (`replayBattleUnits`) may also replay, with the production
 * plans from the known-entry battler slots 6 / 8 and roles 0 / 1 / 2 the replay tracker starts with. The lend is in entry labels and the
 * replay commutes with the entry-label relabel rho, so the replay in entry labels lends what the real-slot host would. ROM-checked per
 * allocation window and per frame after Sand-Attack / Mud-Slap / Rain Dance / RAIN_CONTINUES (tools/integration/words57Chain.ts, 45/45
 * chains): an opponent faint + next-mon summary + send-out, the Factory AI's recall (switch-out of the opponent) + summary + send-out, and
 * a Roar / Whirlwind forced switch-out of either side + its send-in. A player faint or the player's recall (both reach a party menu,
 * which drops the marker) and every other unit still decline.
 */
const DEFERRED_REPLAY_BATTLE_UNITS: ReadonlySet<SpriteOrderPresentationEvent["kind"]> = new Set([
  "party-summary-next", "party-summary-hide", "next-mon-send-out", "forced-switch-out", "switch-in-start", "switch-in-finish"]);

function deferredReplayable(unit: SpriteOrderPresentationEvent, battleUnits: boolean): boolean {
  if (DEFERRED_REPLAY_UNITS.has(unit.kind)) return true;
  if (!battleUnits) return false;
  if (unit.kind === "faint" || unit.kind === "switch-out") return unit.side === "opponent";
  return DEFERRED_REPLAY_BATTLE_UNITS.has(unit.kind);
}

/** A unit after which a battler sprite shows another mon (the displayed species may differ from the earlier body's). */
const replacesBattler = (unit: SpriteOrderPresentationEvent) => unit.kind === "next-mon-send-out" || unit.kind === "switch-in-finish";

/**
 * Carry of a deferred body (resolveSpriteOrderDeferredLend): the free order after the body from its activation free order, or null.
 * `battlerReplacedSince`: a replayed unit after this body showed another mon on a battler (send-out / switch-in), so the consumer's
 * displayed field is not the body's (a carry that reads battler geometry must take it from the marker's `bodySpecies`, or decline).
 */
export type SpriteOrderDeferredCarry = (
  body: SpriteOrderDeferredLend, activationFree: readonly number[], battlerReplacedSince: boolean,
) => readonly number[] | null;

/**
 * Render-seam resolution of a deferred lend (pure; the caller supplies `carryBody`, which reads the earlier body's recorded presentation
 * words and returns the free order after the body from its activation free order, or null). Recurses through a deferred activation, then
 * replays `units` with the production plans from the known-entry roles and battler slots and returns spriteOrderTrackerLend. Null (the
 * consumer declines) when any step is unknown or a unit outside DEFERRED_REPLAY_UNITS followed the body; a marker for which
 * `options.replayBattleUnits` holds also replays DEFERRED_REPLAY_BATTLE_UNITS (words57).
 */
export function resolveSpriteOrderDeferredLend(
  deferred: SpriteOrderDeferredLend,
  carryBody: SpriteOrderDeferredCarry,
  options: Readonly<{
    replayBattleUnits?: (marker: SpriteOrderDeferredLend) => boolean;
    /** ice2: the plan text of a lent-order-keyed body unit that carries `geometryField`, at the order it is lent in this replay. */
    geometryPlanText?: (unit: Extract<SpriteOrderPresentationEvent, { kind: "move-animation" }>, lentFree: readonly number[]) => string | null;
  }> = {},
  battlerReplacedAfter = false,
): readonly number[] | null {
  const battleUnits = options.replayBattleUnits?.(deferred) ?? false;
  if (deferred.units.some((unit) => !deferredReplayable(unit, battleUnits))) return null;
  const replaced = battlerReplacedAfter || deferred.units.some(replacesBattler);
  const activationFree = "deferred" in deferred.activation
    ? resolveSpriteOrderDeferredLend(deferred.activation.deferred, carryBody, options, replaced) : deferred.activation.free;
  if (activationFree === null) return null;
  const post = carryBody(deferred, activationFree, replaced);
  if (post === null) return null;
  let tracker = createSpriteOrderTracker({ known: true, free: post, pendingDestroyed: [] });
  for (const unit of deferred.units) {
    if (unit.kind === "move-animation" && unit.geometryField !== undefined && unit.geometryPlan === undefined && options.geometryPlanText !== undefined) {
      const lentFree = spriteOrderTrackerLend(tracker);
      const text = lentFree === null ? null : options.geometryPlanText(unit, lentFree);
      tracker = applySpriteOrderPresentationEvent(tracker, text === null ? unit : Object.freeze({ ...unit, geometryPlan: text }));
    } else tracker = applySpriteOrderPresentationEvent(tracker, unit);
  }
  return spriteOrderTrackerLend(tracker);
}
