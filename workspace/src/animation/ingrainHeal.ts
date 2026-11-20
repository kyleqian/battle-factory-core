import { absorbAtAge, type AbsorbState } from "./absorb.ts";

/**
 * ing1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): B_ANIM_INGRAIN_HEAL's General_IngrainHeal
 * (data/battle_anim_scripts.s:10648-10665), played by BattleScript_IngrainTurnHeal's `playanimation BS_ATTACKER, B_ANIM_INGRAIN_HEAL`
 * (data/battle_scripts_1.s:3609-3610) before "X absorbed nutrients with its roots!".
 *
 * The script is Move_ABSORB (:5700-5724) without its opening hit: the same monbg / setalpha 12, 8 / BG blend toward RGB(13, 31, 12)
 * up to 4 and back, AbsorbEffect's eight absorption orbs and HealingEffect's four blue stars, but where Move_ABSORB plays SE_M_ABSORB,
 * a hit splat, `delay 2`, AnimTask_ShakeMon and `waitforvisualfinish` before its `delay 3`, General_IngrainHeal goes to `delay 3`
 * straight after the blend's wait. Its attacker and target are both the rooted battler (the controller launches a general animation
 * with gBattleAnimAttacker = gBattleAnimTarget = the active battler), so the orbs start around it and fly into it
 * (SetAnimSpriteInitialXOffset: equal x, so the side picks the sign, as absorb.ts's attacker side does).
 *
 * ROM (tools/battle-lab/ing1-player-on.json, Scene ON; the command starts on the row after the previous print's rows): blend 2 at
 * command age 20, 4 at 23, the first orb at 36, the first blue star at 131, blend 2 at 182, 0 at 185, the next print's first glyph at
 * 198 (INGRAIN_HEAL_COMMAND_FRAMES). Those are absorb.ts's displayed ages (its state one age back, as Move_ABSORB's renderer reads it)
 * at script age a - 15 for the blend-up and at a - 15 + 13 from AbsorbEffect on (the 13 rows Move_ABSORB's hit spends).
 */
export const INGRAIN_HEAL_SCRIPT_LEAD = 15;
/** Move_ABSORB's AbsorbEffect starts at its age 34 (absorb.ts ABSORB_ORB_FIRST_AGE); General_IngrainHeal's at 21. */
export const INGRAIN_HEAL_ABSORB_EFFECT_SHIFT = 13;
const INGRAIN_HEAL_ABSORB_EFFECT_SCRIPT_AGE = 21;

/** The displayed General_IngrainHeal state at command age `age` (null before the script and after its last visual row). */
export function ingrainHealAtCommandAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): AbsorbState | null {
  const scriptAge = age - INGRAIN_HEAL_SCRIPT_LEAD;
  if (scriptAge < 0) return null;
  if (scriptAge < INGRAIN_HEAL_ABSORB_EFFECT_SCRIPT_AGE) {
    // The blend-up rows are Move_ABSORB's own; its hit splat and ShakeMon (absorb ages 16 .. 27) have no counterpart here.
    const blend = absorbAtAge(scriptAge, center, center, side);
    return { ...blend, sprites: [], targetX2: 0, targetY2: 0, targetPoseOwned: false, splitBgPriorityFoes: false, soundRestart: null };
  }
  const state = absorbAtAge(scriptAge + INGRAIN_HEAL_ABSORB_EFFECT_SHIFT, center, center, side);
  if (!state.active) return null;
  return { ...state, splitBgPriorityFoes: false };
}
