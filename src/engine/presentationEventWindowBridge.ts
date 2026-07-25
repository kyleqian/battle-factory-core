/**
 * S10 presentation-seam checkpoint (ROADMAP S10 §3, docs/presentation-seam-
 * scout.md §7.3 gap 7): "a presentation consumer must answer 'which window
 * am I in' from `BattleScriptEventProvenance` (`programCounter`/
 * `sourceLabel`) instead of the hand-threaded `turn5Resolved`/
 * `turn4Resolved` booleans." This is the minimal bridge for the turn5-faint
 * window's own dispatch decision -- it does not redesign `battleScene.ts`'s
 * whole `drawFightSubmenuWindow` turn cascade (out of this checkpoint's
 * scope, per the brief).
 *
 * A kernel run of a fainting hit chain emits many events (attackstring,
 * hp-change, health-bar-update, animation, faint-cry, faint-animation,
 * cleareffectsonfaint, the fainted message, ...). "Which window" here means:
 * which of those events is the fainted-branch's own content, identified
 * purely from provenance -- `sourceLabel` (the compiled program's own
 * enclosing label, `battleScriptMachine.ts:208`) equal to
 * `BattleScript_FaintTarget` (`reference/pokeemerald/data/
 * battle_scripts_1.s:2817-2823`, confirmed reachable end-to-end by
 * `battleScriptHitChainOpcode.test.ts:1495-1499`) -- never a turn number.
 */
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";

/** Source `BattleScript_FaintTarget::` (`data/battle_scripts_1.s:2817`). */
export const FAINT_TARGET_SCRIPT_LABEL = "BattleScript_FaintTarget";

export type FaintPresentationWindowContent = Readonly<{
  faintedBattler: number;
  message: Readonly<{ messageId: string; substitutions: readonly string[] }>;
}>;

/**
 * Answers "are we in the fainted-message presentation window" from the
 * event stream's own provenance. Returns `null` (not a guess) when either
 * signal is absent -- both the real `hp-change{to:0}` and the real
 * `BattleScript_FaintTarget`-labeled message must be present for this
 * window to be genuinely active.
 */
export function resolveFaintPresentationWindowContent(
  events: readonly BattleScriptSemanticEvent[],
  faintScriptLabel: string = FAINT_TARGET_SCRIPT_LABEL,
): FaintPresentationWindowContent | null {
  const koEvent = events.find((event) => event.kind === "hp-change" && event.to === 0);
  if (!koEvent || koEvent.kind !== "hp-change") return null;

  const faintMessageEvent = events.find(
    (event) => event.kind === "message" && event.provenance.sourceLabel === faintScriptLabel,
  );
  if (!faintMessageEvent || faintMessageEvent.kind !== "message") return null;

  return Object.freeze({
    faintedBattler: koEvent.battler,
    message: Object.freeze({
      messageId: faintMessageEvent.messageId,
      substitutions: faintMessageEvent.substitutions,
    }),
  });
}
