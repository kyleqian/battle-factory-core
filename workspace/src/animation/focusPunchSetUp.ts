import { endureAtAge } from "./endure.ts";
import type { FocusEnergySide, FocusEnergySprite } from "./focusEnergy.ts";

/**
 * fps147 (ISSUES #139 presentation half; docs/fps147-focus-punch-setup.md): General_FocusPunchSetUp, the Scene ON
 * B_ANIM_FOCUS_PUNCH_SETUP that BattleScript_FocusPunchSetUp plays between its empty box and "…is tightening its focus!".
 * UNWIRED: no production module imports this file yet.
 *
 * The script (battle_anim_scripts.s:10635-10646) is byte-identical to Move_ENDURE (:3196-3207): three EndureEffect waves,
 * the red BlendColorCycle (2, 2, 0, 11) and AnimTask_ShakeMon2 (ATTACKER, 1, 0, 32, 1). Only the host differs. A general
 * animation's script runs from Task_ClearBitWhenBattleTableAnimDone inside RunTasks (after AnimateSprites / BuildOamBuffer),
 * where Move_ENDURE runs from the controller in CB1, before them. Row 0 (`rel` 0) is the first gAnimScriptActive row R.
 * Against endureAtAge's ages, measured on 6 / 6 dense ROM windows:
 * - The script runs at age rel + 1. Its offsets and sprite creations match, and the script is active on rel 0 .. 119.
 *   Endure's age-0 load row has no general-animation row: the script is already 3 bytes in on R.
 * - Script-created sprites step at age rel, one row behind the script. On its create row a sprite holds its
 *   AnimEndureEnergy init position (CreateSpriteAndAnimate ran the init only), and it lives one RAM row longer.
 * - The visual tasks step one row behind the script too. BlendColorCycle's palette Y and ShakeMon2's x2 at rel are
 *   Endure's at age rel. The tasks are created on rel 37 (ShakeMon2 holds its +1 initializer there) and end one row later.
 * - The display at rel equals production's Endure display at age rel: sprites and palette Y from age rel - 1
 *   (Endure's `battlerDisplayAge`), and the battler x2 is Endure's `attackerDisplayX2` at age rel.
 */

/** Rows of BattleScript_FocusPunchSetUp around General_FocusPunchSetUp, rel to R (identical on 6 / 6 Scene ON windows). */
export const FOCUS_PUNCH_SETUP_ROWS = Object.freeze({
  /** gBattlescriptCurrInstr enters BattleScript_FocusPunchSetUp (printstring STRINGID_EMPTYSTRING3). */
  scriptStart: -6,
  /** The empty message box is first on screen. */
  emptyBoxDisplay: -4,
  /** gAnimScriptActive is set on rel 0 .. activeRows - 1. */
  activeRows: 120,
  /** The ShakeMon2 / BlendColorCycle tasks are created on this row. */
  taskCreateRow: 37,
  /** printstring STRINGID_PKMNTIGHTENINGFOCUS executes. */
  focusPrintRow: 122,
  /** The first glyph of "…is tightening its focus!" is on screen. */
  focusFirstGlyphDisplay: 123,
});

export interface FocusPunchSetUpSprite extends FocusEnergySprite {
  /** True on the create row: AnimEndureEnergy's init position, before any AnimEndureEnergy_Step. */
  readonly initOnly: boolean;
}

export type FocusPunchSetUpScriptLabel = "General_FocusPunchSetUp" | "EndureEffect";

/** RAM state at the end of row `rel` (what a dense probe reads after the frame). */
export interface FocusPunchSetUpSourceRow {
  readonly rel: number;
  readonly active: boolean;
  /** sBattleAnimScriptPtr as label + offset (EndureEffect while inside a `call EndureEffect`); null outside the script. */
  readonly script: { readonly label: FocusPunchSetUpScriptLabel; readonly offset: number } | null;
  readonly sprites: readonly FocusPunchSetUpSprite[];
  readonly paletteTaskActive: boolean;
  readonly shakeTaskActive: boolean;
  /** gAnimVisualTaskCount: sprites + BlendColorCycle + ShakeMon2. */
  readonly visualTaskCount: number;
  /** BlendColorCycle's coefficient in gPlttBufferFaded (toward RGB_RED). */
  readonly attackerPaletteY: number;
  /** The attacker battler sprite's x2. */
  readonly attackerX2: number;
}

/** What the screen of row `rel` shows. */
export interface FocusPunchSetUpDisplayRow {
  readonly rel: number;
  /** Endure particles in OAM, ascending gSprites slot (production draws them 9, 7, 5, 4, 3). */
  readonly sprites: readonly FocusEnergySprite[];
  readonly attackerPaletteTarget: "red";
  readonly attackerPaletteY: number;
  /** Added to the attacker's corner (production adds the opponent's tracked front idle rest on top). */
  readonly attackerX2: number;
}

/** Move_ENDURE's offsets past its 64 bytes are inside EndureEffect, which follows it directly in the ROM. */
const ENDURE_EFFECT_OFFSET = 64;

function sourceSprites(
  rel: number,
  side: FocusEnergySide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): FocusPunchSetUpSprite[] {
  const stepped = endureAtAge(rel, side, attackerCoord).sprites.map((s) => ({ ...s, initOnly: false }));
  // Created on this row: endure's first-step row is the next age; undo that step (data0 1 <= every delay, so y -= 1).
  const created = endureAtAge(rel + 1, side, attackerCoord).sprites
    .filter((s) => !stepped.some((t) => t.wave === s.wave && t.index === s.index))
    .map((s) => ({ ...s, y: s.y + 1, frame: 0 as const, data0: 0, initOnly: true }));
  return [...stepped, ...created].sort((a, b) => a.oamSlot - b.oamSlot);
}

export function focusPunchSetUpSourceRow(
  rel: number,
  side: FocusEnergySide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): FocusPunchSetUpSourceRow {
  const active = rel >= 0 && rel < FOCUS_PUNCH_SETUP_ROWS.activeRows;
  const script = endureAtAge(rel + 1, side, attackerCoord).scriptOffset;
  const tasks = endureAtAge(rel, side, attackerCoord);
  const created = rel === FOCUS_PUNCH_SETUP_ROWS.taskCreateRow;
  const sprites = sourceSprites(rel, side, attackerCoord);
  const paletteTaskActive = created || tasks.paletteTaskActive;
  const shakeTaskActive = created || tasks.shakeTaskActive;
  return {
    rel,
    active,
    script: rel < 0 ? null
      : script >= ENDURE_EFFECT_OFFSET
        ? { label: "EndureEffect", offset: script - ENDURE_EFFECT_OFFSET }
        : { label: "General_FocusPunchSetUp", offset: script },
    sprites,
    paletteTaskActive,
    shakeTaskActive,
    visualTaskCount: sprites.length + Number(paletteTaskActive) + Number(shakeTaskActive),
    attackerPaletteY: tasks.attackerPaletteY,
    // AnimTask_ShakeMon2's initializer (x2 = +1) before its first step.
    attackerX2: created ? 1 : tasks.attackerX2,
  };
}

export function focusPunchSetUpDisplayRow(
  rel: number,
  side: FocusEnergySide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): FocusPunchSetUpDisplayRow {
  const at = endureAtAge(rel, side, attackerCoord);
  const shown = endureAtAge(at.battlerDisplayAge, side, attackerCoord);
  return {
    rel,
    sprites: shown.sprites,
    attackerPaletteTarget: "red",
    attackerPaletteY: shown.attackerPaletteY,
    attackerX2: at.attackerDisplayX2,
  };
}
