/**
 * S10A Substitute fade (docs/next-adapters-prep39.md): General_SubstituteFade (data/battle_anim_scripts.s:10326,
 * B_ANIM_SUBSTITUTE_FADE from BattleScript_SubstituteFade) presented live, Scene ON and OFF alike (the source exempts it
 * from HITMARKER_NO_ANIMATIONS, battle_script_commands.c:4013 / :4057). Presentation timing only: never read by rules, RNG,
 * damage, turn order or facility state. A status animation, not an accepted move body (adapter counts unchanged).
 *
 * Source program (RAM rows from the first script row; prep39 model + fresh direct-mGBA probes, 14 windows):
 *   monbg ANIM_ATTACKER (row 0): the attacker's sprite copied to a BG layer (player BG2, opponent BG1), the OBJ hidden;
 *     Task_UpdateMonBg copies the OBJ's FADED palette into the BG slot every row (the white blend shows on the copy).
 *   AnimTask_SubstituteFadeToInvisible (row 3): BLDCNT TGT1 copy | EFFECT_BLEND | TGT2_ALL, BLDALPHA(16, 0), then k += 1
 *     every 3rd row -> BLDALPHA(16 - k, k); k == 16 -> zero-fill the OBJ tiles, clear behindSubstitute.
 *   AnimTask_BlendBattleAnimPal F_PAL_ATTACKER 0 0 16 RGB_WHITE (row 3): coefficient 1 after row 3, +1 per row to 16.
 *   waitforvisualfinish; delay 1; clearmonbg (rows 55..58); delay 2; blendoff (row 61).
 *   AnimTask_SwapMonSpriteToFromSubstitute TRUE (row 61): substituteSwapRows(side, true) verbatim (zero tiles out, mon in).
 * Display: OAM (visibility, x2) shows the RAM row two rows earlier; the OBJ tile block one row earlier; BLDCNT / BLDALPHA /
 * hardware palettes the previous row's writes (one row).
 *
 * The presented command spans the script rows, the first inactive row and the 2-row OAM tail (x2 -5 / +5, then 0): the
 * ROM's STRINGID_PKMNSUBSTITUTEFADED box changes 3 rows after the first inactive row (fresh probes: 106 player / 104
 * opponent), the queue's next message row 0.
 */
import { createBattleCommandFieldArtView, type BattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import { liveBattlerAnchors } from "./liveMoveAnimation.ts";
import { substituteSwapRows } from "./liveSubstituteSwap.ts";
import { LIVE_STATUS_ANIMATION_TIMING_POLICY } from "./liveMoveTimingPolicy.ts";

type Side = "player" | "opponent";

/** Script row of AnimTask_SubstituteFadeToInvisible / AnimTask_BlendBattleAnimPal (measured, both sides). */
const FADE_TASK_ROW = 3;
/** Script row of the trailing AnimTask_SwapMonSpriteToFromSubstitute; blendoff on the same row (I/O 0 from the next). */
const SWAP_ROW = 61;
/** clearmonbg runs rows 55..58; the BG copy is gone from row 59. */
const CLEARMONBG_ROW = 55;
/** Rows from the first inactive row to the next message's first box change (its row 0): the first inactive row + the OAM tail. */
const TAIL_ROWS = 3;

/** Script rows (the first inactive row's index): 103 player / 101 opponent. */
export function substituteFadeScriptRows(side: Side): number {
  return SWAP_ROW + substituteSwapRows(side, true).length - 1;
}

/** btn2: rows from the FADED-less press that released the damaged print to the fade's first script row (ROM: press F -> anim start F + 11). */
export const SUBSTITUTE_FADE_LEAD_ROWS = 11;

/** The presented command's body length (after the lead): script rows + first inactive row + 2-row OAM tail (106 player / 104 opponent). */
export function substituteFadeDuration(side: Side): number {
  return substituteFadeScriptRows(side) + TAIL_ROWS;
}

/** The command's whole length: the lead (the box is blank, the doll still shown) + the body (117 player / 115 opponent). */
export function substituteFadeCommandRows(side: Side): number {
  return SUBSTITUTE_FADE_LEAD_ROWS + substituteFadeDuration(side);
}

/** k of BLDALPHA(16 - k, k) written on RAM row r (null = none written yet). */
function alphaK(r: number): number | null {
  return r < FADE_TASK_ROW ? null : Math.min(16, Math.floor((r - FADE_TASK_ROW) / 3));
}

/** Source BlendPalette (palette.c) of one BGR555 color toward RGB_WHITE. */
export function substituteFadeWhiteBgr555(color: number, coefficient: number): number {
  let out = 0;
  for (const shift of [0, 5, 10]) {
    const from = (color >> shift) & 31;
    out |= (from + (((31 - from) * coefficient) >> 4)) << shift;
  }
  return out;
}

type RamRow = Readonly<{ bgCopy: boolean; obj: "doll" | "zero" | "mon"; objInvisible: boolean; x2: number;
  blend: boolean; eva: number; evb: number; white: number }>;

/** The policy's phase of the I/O copy: "event" reads the previous row's write (one row), "no-event" the same row's. */
const IO_LAG = Object.freeze(LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE!.parameters.map((p) => (p.chosen === "event" ? 1 : 0)));

function ramRow(side: Side, r: number): RamRow {
  const ioK = alphaK(r - IO_LAG[0]!);
  const blend = r - 1 >= FADE_TASK_ROW && r - IO_LAG[1]! < SWAP_ROW;
  const swap = substituteSwapRows(side, true);
  const j = r - SWAP_ROW;
  const loadRow = swap.findIndex((row) => !row.doll);
  // case 2's fill is DMA'd at VBlank: tiles read zero after row 53; the mon graphics two rows after the swap's load row.
  const obj = j >= loadRow + 2 ? "mon" as const : r >= FADE_TASK_ROW + 16 * 3 + 2 ? "zero" as const : "doll" as const;
  // Faded palette two rows late on the BG copy (Task_UpdateMonBg copies the previous row's faded buffer, then VBlank).
  const w = r - 2;
  return {
    bgCopy: r >= 0 && r < CLEARMONBG_ROW + 4, obj, objInvisible: r >= 0 && r < CLEARMONBG_ROW,
    x2: j >= 0 ? swap[Math.min(j, swap.length - 1)]!.x2 : 0,
    blend, eva: blend && ioK !== null ? 16 - ioK : 0, evb: blend && ioK !== null ? ioK : 0,
    white: w < FADE_TASK_ROW ? 0 : Math.min(16, w - FADE_TASK_ROW + 1),
  };
}

export type SubstituteFadeLayer =
  | Readonly<{ kind: "doll" }>
  | Readonly<{ kind: "bg-copy"; eva: number; evb: number; white: number; blend: boolean }>
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "mon"; x2: number }>;

/**
 * The fading battler's displayed layer at command age `age`, in the dominant VBlank phase of every BLDALPHA step and of the
 * blendoff (liveMoveTimingPolicy.ts LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE: "event", the later row).
 */
export function substituteFadeLayerAt(side: Side, age: number): SubstituteFadeLayer {
  if (age < 2) return Object.freeze({ kind: "doll" as const });
  const oam = ramRow(side, age - 2);
  if (!oam.objInvisible && ramRow(side, age - 1).obj === "mon") return Object.freeze({ kind: "mon" as const, x2: oam.x2 });
  const io = ramRow(side, age);
  if (io.bgCopy) {
    const eva = io.blend ? io.eva : 16, evb = io.blend ? io.evb : 0;
    if (eva > 0) return Object.freeze({ kind: "bg-copy" as const, eva, evb, white: io.white, blend: io.blend });
  }
  return Object.freeze({ kind: "none" as const });
}

export type SubstituteFadeBgCopy = Readonly<{
  side: Side;
  art: BattleCommandFieldArtView["player"];
  eva: number; evb: number; white: number; blend: boolean;
}>;

function withDoll(field: BattleResolutionDisplayedField, side: Side, doll: boolean): BattleResolutionDisplayedField {
  const { substituteDoll: _shown, ...mon } = field[side];
  const battler = Object.freeze(doll ? { ...mon, substituteDoll: true as const } : mon);
  return Object.freeze(side === "player" ? { ...field, player: battler } : { ...field, opponent: battler });
}

/**
 * The ordinary view of one fade row (the fade effect consumed) plus the BG copy to blend under the healthboxes and the
 * message window. The other battler stays at its tracked front idle rest (liveBattlerX2History); an elevated opponent's
 * shadow stays hidden while the script runs (SpriteCB_EnemyShadow: anim script active / behind a substitute) and through
 * the row after the first inactive row.
 */
export function substituteFadeRenderView(view: BattleResolutionPresentationRenderView): Readonly<{
  view: BattleResolutionPresentationRenderView; bgCopy: SubstituteFadeBgCopy | null;
}> | null {
  const effect = view.effect;
  if (effect?.type !== "substitute-fade") return null;
  const side: Side = effect.battler === 0 ? "player" : "opponent", other: Side = side === "player" ? "opponent" : "player";
  const layer = substituteFadeLayerAt(side, effect.age);
  const field = withDoll(view.field, side, layer.kind === "doll");
  const art = createBattleCommandFieldArtView(field);
  const rested = other === "opponent" ? (() => {
    const rest = liveBattlerAnchors("opponent", art, effect.battlerX2Input).frontIdleRest;
    return Object.freeze({ ...art.opponent, origin: Object.freeze({ x: art.opponent.origin.x + rest.x2, y: art.opponent.origin.y + rest.y2 }) });
  })() : art.player;
  const own = layer.kind === "mon"
    ? Object.freeze({ ...art[side], origin: Object.freeze({ x: art[side].origin.x + layer.x2, y: art[side].origin.y }) })
    : art[side];
  const fieldArt = Object.freeze(side === "player" ? { player: own, opponent: rested } : { player: rested, opponent: own });
  const hidden = layer.kind === "none" || layer.kind === "bg-copy";
  const visibility = Object.freeze({ ...view.visibility, [side]: Object.freeze({ ...view.visibility[side], sprite: view.visibility[side].sprite && !hidden }) });
  const bgCopy = layer.kind === "bg-copy" && view.visibility[side].sprite
    ? Object.freeze({ side, art: createBattleCommandFieldArtView(withDoll(view.field, side, true))[side], eva: layer.eva, evb: layer.evb, white: layer.white, blend: layer.blend })
    : null;
  return Object.freeze({
    // SpriteCB_EnemyShadow: the shadow stays hidden through the row after the first inactive row (measured elevated GOLBAT:
    // back on screen at script rows + 2, the command's last row).
    view: Object.freeze({ ...view, field, fieldArt, effect: null, visibility,
      postBodyShadowHidden: effect.age < substituteFadeScriptRows(side) + 2
        // A non-doll opponent OTHER battler's shadow is still on screen on the activation row (one-frame display lag, the #142
        // mechanism; species audit 14: elevated GOLBAT / FLYGON other battler of a player fade, 200 -> 0 px on row 0).
        && !(effect.age === 0 && side === "player") }),
    bgCopy,
  });
}
