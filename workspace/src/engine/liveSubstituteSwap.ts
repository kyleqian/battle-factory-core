/**
 * S10A Substitute swaps (docs/next-adapters-prep37.md s2 / s3c): Special_SubstituteToMon / Special_MonToSubstitute around a
 * Scene ON move body whose ATTACKER is displayed as the Substitute doll. Presentation timing only: never read by rules, RNG,
 * damage, turn order or the logical queue (Scene OFF carries no MOVE_ANIMATION request, so it never swaps).
 *
 * Source (battle_controller_player.c / battle_controller_opponent.c *DoMoveAnimation): state 0 launches SUBSTITUTE_TO_MON
 * when behindSubstitute && !flag_x8 (setting flag_x8, so a multi-hit chain swaps once); state 1 waits for it and starts
 * the body; state 2 runs the body and, once it ends, launches MON_TO_SUBSTITUTE only when multihit < 2 (the LAST hit).
 * Both specials run AnimTask_SwapMonSpriteToFromSubstitute (battle_anim_mons.c): x2 += / -= (acc += 0x500) >> 8 = 5 per
 * row (acc's low byte stays 0) away from the field (player left, opponent right) until x + x2 + 32 > 304 unsigned, one
 * row LoadBattleMonGfxAndAnimate (doll <-> mon graphics + y), then back by 5 per row until x2 crosses 0 (set to 0, task
 * destroyed). No RNG, BG or palette effect.
 *
 * Measured (prep37 s2; tools/integration/fixtures/subst-swap-live-receipt.json): 42 script rows player / 40 opponent,
 * x2 -105..0 / 0..100, the load on row 21 / 20 (VRAM switch visible at 23 / 22 while the sprite is off screen), one idle
 * row before the body. The display shows each row's OAM two rows late (task x2 after BuildOamBuffer).
 */
import { createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleCommandFieldBattler } from "./battleCommandPresentation.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, liveMoveBattlerX2Input, type LiveBattlerX2History, type LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { liveBattlerAnchors, liveMoveAnimationDuration } from "./liveMoveAnimation.ts";

type Side = "player" | "opponent";

/** sBattlerCoords x of the attacker sprite (72 / 176). */
const SPRITE_X: Readonly<Record<Side, number>> = Object.freeze({ player: 72, opponent: 176 });

export type SubstituteSwapRow = Readonly<{ x2: number; doll: boolean }>;

const swapRowsCache = new Map<string, readonly SubstituteSwapRow[]>();
/**
 * RAM rows of AnimTask_SwapMonSpriteToFromSubstitute from the first script row (index = script row) through the first
 * inactive row (x2 = 0, task destroyed). `toMon`: SUBSTITUTE_TO_MON (doll -> mon); else MON_TO_SUBSTITUTE.
 */
export function substituteSwapRows(side: Side, toMon: boolean): readonly SubstituteSwapRow[] {
  const key = `${side}/${toMon}`;
  const cached = swapRowsCache.get(key);
  if (cached) return cached;
  const away = side === "player" ? -1 : 1;
  let x2 = 0, acc = 0, doll = toMon;
  const rows: SubstituteSwapRow[] = [];
  // case 1: slide away until the sprite's right / left edge leaves the screen (u32 compare).
  for (;;) {
    acc += 0x500;
    x2 += away * (acc >> 8);
    acc &= 0xff;
    rows.push({ x2, doll });
    if (((SPRITE_X[side] + x2 + 32) >>> 0) > 304) break;
  }
  // case 2: LoadBattleMonGfxAndAnimate (graphics + y switch; x2 unchanged).
  doll = !toMon;
  rows.push({ x2, doll });
  // case 3: slide back until x2 crosses 0.
  for (;;) {
    acc += 0x500;
    x2 -= away * (acc >> 8);
    acc &= 0xff;
    if (away < 0 ? x2 >= 0 : x2 <= 0) {
      rows.push({ x2: 0, doll });
      break;
    }
    rows.push({ x2, doll });
  }
  const frozen = Object.freeze(rows.map((row) => Object.freeze(row)));
  swapRowsCache.set(key, frozen);
  return frozen;
}

/** Script rows of one swap special (the task rows before its first inactive row): 42 player / 40 opponent. */
export function substituteSwapScriptRows(side: Side): number {
  return substituteSwapRows(side, true).length - 1;
}

/**
 * Move bodies proven dense through swap + idle + body + swap-back with a subbed attacker (subst-swap-live-receipt.json):
 * Headbutt (29; GOLEM / ZIGZAGOON player, GOLEM / ONIX (idle rest +1) opponent) and Body Slam (34; PERSIAN<->SLOWBRO both
 * sides, elevated GOLBAT opponent). Bodies whose adapter window does not start at activation (e.g. Bite's 26 rows) cannot be
 * framed. Every other attacker-doll body keeps declining (the whole command falls back), including multi-hit and two-turn
 * bodies.
 */
export const LIVE_SUBSTITUTE_SWAP_BODY_IDS: ReadonlySet<number> = new Set([29, 34, 73]);

function battlerOf(field: BattleResolutionDisplayedField, battler: number): BattleCommandFieldBattler {
  return battler === 0 ? field.player : field.opponent;
}

/** The displayed field with the attacker shown as the mon (the body runs after SUBSTITUTE_TO_MON). */
export function substituteSwapBodyField(
  field: BattleResolutionDisplayedField, attacker: 0 | 1,
): BattleResolutionDisplayedField {
  const { substituteDoll: _doll, ...mon } = battlerOf(field, attacker);
  return Object.freeze(attacker === 0
    ? { player: Object.freeze(mon), opponent: field.opponent }
    : { player: field.player, opponent: Object.freeze(mon) });
}

/**
 * Whether a move-animation request is presented with the swaps: the attacker is displayed as the doll, the target is not,
 * the body is proven, and it is the last (or only) hit. Null = not a subbed-attacker body.
 */
export function liveSubstituteSwapApplies(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): boolean | null {
  if (battlerOf(field, request.attacker).substituteDoll !== true) return null;
  return request.target !== request.attacker
    && battlerOf(field, request.target).substituteDoll !== true
    && LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(request.moveId)
    && request.multihit < 2;
}

/** Whole presented length: swap-in script rows + idle row + body (activation .. first inactive row) + swap-back + its first inactive row. */
export function substituteSwapCompositeDuration(side: Side, bodyDuration: number): number {
  return 2 * substituteSwapScriptRows(side) + bodyDuration + 1;
}

export type SubstituteSwapFrame =
  | Readonly<{ kind: "swap"; x2: number; doll: boolean; afterBody: boolean }>
  | Readonly<{ kind: "body"; age: number }>;

/**
 * The displayed frame at composite age `age`. Swap rows show the task row two rows earlier (OAM latch); body age 0 still
 * shows the swap-in tail, the body's own first inactive row is swap-back row 0, and swap-back row k >= 1 shows its task
 * row k - 2 (row -1 = the settled mon).
 */
export function substituteSwapFrameAt(side: Side, bodyDuration: number, age: number): SubstituteSwapFrame {
  const scriptRows = substituteSwapScriptRows(side);
  const swapIn = substituteSwapRows(side, true), swapOut = substituteSwapRows(side, false);
  const bodyStart = scriptRows + 1;
  if (age <= bodyStart) {
    const row = age - 2;
    if (row < 0) return Object.freeze({ kind: "swap", x2: 0, doll: true, afterBody: false });
    return Object.freeze({ kind: "swap", ...swapIn[Math.min(row, swapIn.length - 1)]!, afterBody: false });
  }
  const bodyAge = age - bodyStart;
  if (bodyAge <= bodyDuration - 1) return Object.freeze({ kind: "body", age: bodyAge });
  const k = bodyAge - (bodyDuration - 1);
  const row = k - 2;
  if (row < 0) return Object.freeze({ kind: "swap", x2: 0, doll: false, afterBody: true });
  return Object.freeze({ kind: "swap", ...swapOut[Math.min(row, swapOut.length - 1)]!, afterBody: true });
}

export type SubstituteSwapView =
  | Readonly<{ kind: "swap"; view: BattleResolutionPresentationRenderView }>
  | Readonly<{ kind: "body"; view: BattleResolutionPresentationRenderView }>;

/**
 * The live renderer's view of a composite age (renderBattleResolutionLiveView): a swap row is the ordinary field with the
 * attacker drawn as the doll or the mon at x2 (an opponent's shadow stays hidden: SpriteCB_EnemyShadow while
 * behindSubstitute); a body row is the adapter's view on the mon field at the body age, the attacker's x2 zeroed by the
 * task (an opponent's front idle rest does not survive the swap). Null = not a presented subbed-attacker body.
 */
export function liveSubstituteSwapView(view: BattleResolutionPresentationRenderView): SubstituteSwapView | null {
  const effect = view.effect;
  if (effect?.type !== "move" || liveSubstituteSwapApplies(effect.request, view.field) !== true) return null;
  const attacker = effect.request.attacker === 0 ? 0 : 1, side: Side = attacker === 0 ? "player" : "opponent";
  const bodyField = substituteSwapBodyField(view.field, attacker);
  const bodyDuration = liveMoveAnimationDuration(effect.request, bodyField);
  if (bodyDuration === null) return null;
  const frame = substituteSwapFrameAt(side, bodyDuration, effect.age);
  if (frame.kind === "body") {
    const zeroed = effect.battlerX2Input?.zeroed ?? [];
    return Object.freeze({ kind: "body", view: Object.freeze({
      ...view, field: bodyField, fieldArt: createBattleCommandFieldArtView(bodyField),
      effect: Object.freeze({ ...effect, age: frame.age, battlerX2Input: Object.freeze({
        ...effect.battlerX2Input, zeroed: Object.freeze([...zeroed.filter((s) => s !== side), side]),
      }) }),
    }) });
  }
  const field = frame.doll ? view.field : bodyField;
  const art = createBattleCommandFieldArtView(field);
  const moved = Object.freeze({ ...art[side], origin: Object.freeze({ x: art[side].origin.x + frame.x2, y: art[side].origin.y }) });
  // A player attacker's opponent target keeps its tracked front idle rest (as the body adapters draw it; e.g. ONIX +1), after
  // the body the body's own end state (liveBattlerX2History: e.g. Headbutt resets the target to 0).
  const target = side === "player" ? (() => {
    const input = frame.afterBody
      ? liveMoveBattlerX2Input(applyLiveBattlerX2Event(liveBattlerX2HistoryOfInput(effect.battlerX2Input),
        { kind: "move-body", moveId: effect.request.moveId, attackerSide: side, turn: effect.request.turn }))
      : effect.battlerX2Input;
    const rest = liveBattlerAnchors("opponent", art, input).frontIdleRest;
    return Object.freeze({ ...art.opponent, origin: Object.freeze({ x: art.opponent.origin.x + rest.x2, y: art.opponent.origin.y + rest.y2 }) });
  })() : art.player;
  return Object.freeze({ kind: "swap", view: Object.freeze({
    ...view, field, effect: null,
    fieldArt: Object.freeze(side === "player" ? { player: moved, opponent: target } : { player: target, opponent: moved }),
    ...(side === "opponent" ? { postBodyShadowHidden: true } : {}),
  }) });
}

/** The tracker history a lent input stands for: zeroed sides zeroed, the rest at the species rest (idle). */
function liveBattlerX2HistoryOfInput(input?: LiveMoveBattlerX2Input): LiveBattlerX2History {
  const state = (side: Side) => (input?.zeroed.includes(side) ? "zeroed" as const : "idle" as const);
  return Object.freeze({ player: state("player"), opponent: state("opponent") });
}
