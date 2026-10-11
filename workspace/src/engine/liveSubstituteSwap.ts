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
import { createBattleCommandFieldArtView, type BattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleCommandFieldBattler } from "./battleCommandPresentation.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, liveMoveBattlerX2Input, type LiveBattlerX2History, type LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { wavyMusicNotesGeometryAtAge } from "../animation/sing.ts";
import { liveBattlerAnchors, liveCastformFormDeclines, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "./liveMoveAnimation.ts";
import { liveBattlerIsShiny } from "./liveMovePaletteComposite.ts";

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
 * (move id, attacker side) cells proven dense through swap + idle + body + swap-back with a subbed attacker:
 * - subst-swap-live-receipt.json: Headbutt (29; GOLEM / ZIGZAGOON player, GOLEM / ONIX (idle rest +1) opponent), Body Slam
 *   (34; PERSIAN<->SLOWBRO both sides, elevated GOLBAT opponent attacker and target) and Leech Seed (73);
 * - attdoll-live-receipt.json (docs/next-adapters-prep40.md s1, fresh direct-mGBA PERSIAN<->SLOWBRO windows): the bodies whose
 *   adapter window is the ROM body (activation .. first inactive row).
 * Every other attacker-doll cell keeps declining (the whole command falls back), including multi-hit and two-turn bodies.
 */
const BOTH: readonly Side[] = Object.freeze(["player", "opponent"]);
export const LIVE_SUBSTITUTE_SWAP_BODY_CELLS: ReadonlyMap<number, readonly Side[]> = new Map<number, readonly Side[]>([
  [29, BOTH], [34, BOTH], [73, BOTH],
  // prep40 one-batch: production's own adapter window, 0 px on every row.
  [8, BOTH], // Ice Punch
  [25, BOTH], // Mega Kick
  [38, BOTH], // Double-Edge
  [56, BOTH], // Hydro Pump
  [57, BOTH], // Surf
  [86, BOTH], // Thunder Wave
  [109, BOTH], // Confuse Ray
  [157, Object.freeze(["opponent"] as const)], // Rock Slide (the adapter is opponent-only)
  [213, BOTH], // Attract
  [242, BOTH], // Crunch
  [263, BOTH], // Facade
  [280, BOTH], // Brick Break
  [317, BOTH], // Rock Tomb
  [332, Object.freeze(["player"] as const)], // Aerial Ace (opponent: the doll-free control's own 1 px, not an accepted scope)
  // prep40 NEEDS-BODY-FRAMING: framed by the ROM body (LIVE_SUBSTITUTE_SWAP_BODY_FRAMING), 0 px on every row.
  [89, BOTH], // Earthquake
  [94, Object.freeze(["player"] as const)], // Psychic (opponent: the doll-free control's own 9 px, not an accepted scope)
  [188, BOTH], // Sludge Bomb
  [53, BOTH], // Flamethrower
  [92, BOTH], // Toxic
  [44, BOTH], // Bite
  [7, BOTH], // Fire Punch
  [153, BOTH], // Explosion
  // prep40 NEEDS-ORDER: order-dependent bodies, exact with the Substitute body's order-neutral lend (spriteOrderEventTransform.ts);
  // with no lend (a history the order tracker cannot place, doll-free too) the body rows decline to the static mon field. Mud-Slap
  // (D3) needs the first-body lend production does not make: declined.
  [58, BOTH], // Ice Beam
  [85, BOTH], // Thunderbolt
  [202, BOTH], // Giga Drain
  [315, BOTH], // Overheat
  [69, BOTH], // Seismic Toss (request.damage = gAnimMoveDmg)
  [224, BOTH], // Megahorn (D4: the shipped phase; liveMoveTimingPolicy.ts)
  // doll81 (docs/next-adapters-doll81.md): fresh direct-mGBA PERSIAN<->SLOWBRO + GENGAR -> GOLBAT / elevated GOLBAT -> LAPRAS windows,
  // 0 px on every row of every window.
  [138, Object.freeze(["opponent"] as const)], // Dream Eater (player: PERSIAN's ROM body is one row longer than GENGAR's)
  [320, Object.freeze(["player"] as const)], // GrassWhistle (opponent: 13 whole-field rows near the body's end)
  [76, BOTH], // SolarBeam, the charge turn only (the fire turn is the doll-free control's own residual)
  [142, BOTH], // Lovely Kiss
  [47, BOTH], // Sing (doll90: the ROM body length follows the note geometry, substituteSwapBodyFraming)
  [241, BOTH], // Sunny Day (self-target: LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS)
  // doll90 (docs/doll90-doll-cells.md): PERSIAN / GENGAR player, PERSIAN / elevated GOLBAT opponent, 0 px on every row.
  [104, BOTH], // Double Team (self-target; the attacker's personality-derived clone phase, dt60)
]);
export const LIVE_SUBSTITUTE_SWAP_BODY_IDS: ReadonlySet<number> = new Set(LIVE_SUBSTITUTE_SWAP_BODY_CELLS.keys());
/**
 * Self-target bodies presented with the swaps (doll81: the ROM runs SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE around them too). Double Team
 * (doll90): the stats banner the doll-free adapter ends with never runs behind the doll (TryHandleLaunchBattleTableAnimation skips
 * B_ANIM_STATS_CHANGE while behindSubstitute), so the composite frames only the ROM body.
 */
export const LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS: ReadonlySet<number> = new Set([241, 104]);

export type SubstituteSwapBodyFraming = Readonly<{ rows: number; shift: number }>;
/**
 * The ROM body inside the composite (docs/next-adapters-prep40.md s1.1): the swap-back starts at the body's FIRST INACTIVE row
 * (*DoMoveAnimation state 2 waits for the script), not after the adapter's visual length. `rows` = activation .. first inactive
 * row (both sides measured equal); body row r shows adapter age r + `shift` (the adapter's age 0 is `-shift` rows after
 * activation: prep38's calibrated doll-free shifts). Body rows outside the adapter's window draw what the adapter draws there
 * (the static mon field, as the doll-free path). Absent = the adapter window is the ROM body (rows = duration, shift 0).
 */
export const LIVE_SUBSTITUTE_SWAP_BODY_FRAMING: ReadonlyMap<number, SubstituteSwapBodyFraming> = new Map([
  [89, { rows: 208, shift: 0 }], // Earthquake (adapter 198)
  [94, { rows: 145, shift: -5 }], // Psychic (adapter 140)
  [188, { rows: 169, shift: -4 }], // Sludge Bomb (adapter 160)
  [53, { rows: 210, shift: -15 }], // Flamethrower (adapter 115)
  [92, { rows: 231, shift: -7 }], // Toxic (adapter 219)
  [44, { rows: 41, shift: -10 }], // Bite (adapter 26)
  [7, { rows: 102, shift: 0 }], // Fire Punch (adapter 101: one row short of the first inactive row)
  [153, { rows: 217, shift: -4 }], // Explosion (adapter 212)
  [320, { rows: 221, shift: 0 }], // GrassWhistle (adapter 225; doll81)
  [142, { rows: 153, shift: 0 }], // Lovely Kiss (adapter 152; doll81)
  [47, { rows: 246, shift: 0 }], // Sing (player adapter 245; doll81; doll90: geometry-derived, liveSingBodyRows)
  [104, { rows: 159, shift: -1 }], // Double Team (adapter 230 = body + stats banner; doll90: every doll-free control 0 px at -1)
].map(([id, framing]) => [id as number, Object.freeze(framing as SubstituteSwapBodyFraming)]));

/**
 * doll90: Sing (47)'s ROM body (activation .. first inactive row) follows its geometry. Each wavy note is destroyed once it leaves
 * x -16..256 / y -16..128 (AnimWavyMusicNotes_Step), the script's first waitforvisualfinish waits for the last one, and the rest
 * (clearmonbg, AnimTask_MusicNotesClearRainbowBlend, end) is geometry-independent: first inactive row = the last note's last
 * on-screen body age (sceneOnSingView: note age = body age - 7) + 97. Fresh direct-mGBA ROM bodies: player PERSIAN / GENGAR 246,
 * opponent PERSIAN 242, GOLBAT 244, and the predicted-then-probed CROBAT -> WAILORD 231 / WAILORD -> CROBAT 249 (docs/doll90-doll-cells.md).
 */
const SING_BODY_TAIL_ROWS = 97;
const singBodyRowsCache = new Map<string, number | null>();
export function liveSingBodyRows(request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField): number | null {
  const key = `${request.attacker}/${field.player.species}/${field.opponent.species}`;
  if (singBodyRowsCache.has(key)) return singBodyRowsCache.get(key)!;
  const state = liveMoveAnimationPresentation(request, field, 0);
  let rows: number | null = null;
  if (state !== null && state.config.move === "SING") {
    const { attacker, target } = state.config as unknown as Record<"attacker" | "target", { geometry: { animationCenter: { x: number; y: number } } }>;
    let last = -1;
    for (let noteAge = 0; noteAge < 512; noteAge++) {
      if (wavyMusicNotesGeometryAtAge(noteAge, attacker.geometry.animationCenter, target.geometry.animationCenter).length > 0) last = noteAge;
    }
    if (last >= 0) rows = last + 7 + SING_BODY_TAIL_ROWS;
  }
  singBodyRowsCache.set(key, rows);
  return rows;
}

/** The composite's body framing for a request whose adapter duration is `adapterDuration` (`field`: the body field, Sing's geometry). */
export function substituteSwapBodyFraming(
  moveId: number, adapterDuration: number, request?: BattleMoveAnimationRequest, field?: BattleResolutionDisplayedField,
): SubstituteSwapBodyFraming {
  if (moveId === 47 && request !== undefined && field !== undefined) {
    const rows = liveSingBodyRows(request, field);
    if (rows !== null) return Object.freeze({ rows, shift: 0 });
  }
  return LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(moveId) ?? Object.freeze({ rows: adapterDuration, shift: 0 });
}

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
 * the body is proven, it is the last (or only) hit, and neither battler is shiny. Null = not a subbed-attacker body.
 * Shiny: the ROM brings the mon back from the doll in its shiny palette, but the swap rows (Scene OFF field art) and the body art
 * have no shiny palette (docs/live-species-audit-13.md defect 2: shiny STEELIX 133k..322k px), so the swaps decline as the other
 * S10A adapters' shiny gates do (both battlers).
 */
export function liveSubstituteSwapApplies(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): boolean | null {
  if (battlerOf(field, request.attacker).substituteDoll !== true) return null;
  return (request.target === request.attacker ? LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS.has(request.moveId)
    : battlerOf(field, request.target).substituteDoll !== true)
    && (LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(request.moveId) ?? []).includes(request.attacker === 0 ? "player" : "opponent")
    && request.multihit < 2
    && !(request.moveId === 76 && request.turn !== 0)
    && !liveBattlerIsShiny(field.player.personality) && !liveBattlerIsShiny(field.opponent.personality);
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

/**
 * The row right after a presented composite (docs/next-adapters-prep40.md s2; the next command's first row): the ROM still shows
 * the attacker's doll at the swap-back's last moving x2 (task row scriptRows - 1: -5 player / +5 opponent; the 2-row OAM latch),
 * settled from the row after. The composite itself ends at the swap-back's first inactive row: the next command's own timing
 * (its first visible change) is unchanged, so this is a one-row latch on that command, never a longer composite.
 */
export function substituteSwapTailX2(side: Side): number {
  return substituteSwapRows(side, false)[substituteSwapScriptRows(side) - 1]!.x2;
}

/** The field art of the tail row: the attacker's (doll) sprite at substituteSwapTailX2. */
export function substituteSwapTailFieldArt(art: BattleCommandFieldArtView, side: Side): BattleCommandFieldArtView {
  const moved = Object.freeze({ ...art[side], origin: Object.freeze({ x: art[side].origin.x + substituteSwapTailX2(side), y: art[side].origin.y }) });
  return Object.freeze(side === "player" ? { player: moved, opponent: art.opponent } : { player: art.player, opponent: moved });
}

export type SubstituteSwapView =
  | Readonly<{ kind: "swap"; view: BattleResolutionPresentationRenderView }>
  | Readonly<{ kind: "body"; view: BattleResolutionPresentationRenderView }>;

/**
 * The live renderer's view of a composite age (renderBattleResolutionLiveView): a swap row is the ordinary field with the
 * attacker drawn as the doll or the mon at x2 (the opponent's shadow hidden: SpriteCB_EnemyShadow while behindSubstitute or
 * gAnimScriptActive; measured on an elevated GOLBAT target: rows 1..43 and every swap-back row); a body row is the adapter's view on the mon field at the body age, the attacker's x2 zeroed by the
 * task (an opponent's front idle rest does not survive the swap). Null = not a presented subbed-attacker body.
 */
export function liveSubstituteSwapView(view: BattleResolutionPresentationRenderView): SubstituteSwapView | null {
  const effect = view.effect;
  if (effect?.type !== "move" || liveSubstituteSwapApplies(effect.request, view.field) !== true) return null;
  // cf78: no swap composite while a CASTFORM is displayed in a weather form (the body declines too: scene-off fallback).
  if (liveCastformFormDeclines(view.field)) return null;
  const attacker = effect.request.attacker === 0 ? 0 : 1, side: Side = attacker === 0 ? "player" : "opponent";
  const bodyField = substituteSwapBodyField(view.field, attacker);
  const adapterDuration = liveMoveAnimationDuration(effect.request, bodyField);
  if (adapterDuration === null) return null;
  const framing = substituteSwapBodyFraming(effect.request.moveId, adapterDuration, effect.request, bodyField);
  const swapFrame = substituteSwapFrameAt(side, framing.rows, effect.age);
  const frame = swapFrame.kind === "body" ? Object.freeze({ kind: "body" as const, age: swapFrame.age + framing.shift }) : swapFrame;
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
  // SpriteCB_EnemyShadow hides an elevated opponent's shadow while any anim script (the swap specials too) is active or the
  // battler is behind a substitute: displayed from swap row 1 (row 0 still shows the idle latch) through every swap-back row.
  const shadowHidden = side === "opponent" || effect.age >= 1;
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
    ...(shadowHidden ? { postBodyShadowHidden: true } : {}),
  }) });
}

/** The tracker history a lent input stands for: zeroed sides zeroed, the rest at the species rest (idle). */
function liveBattlerX2HistoryOfInput(input?: LiveMoveBattlerX2Input): LiveBattlerX2History {
  const state = (side: Side) => (input?.zeroed.includes(side) ? "zeroed" as const : "idle" as const);
  return Object.freeze({ player: state("player"), opponent: state("opponent") });
}
