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

/**
 * docs/presentation-seam-scout.md §8.3's own mapping row for
 * `turn1-rockslide.json` (`drawRockSlideWindow`/`drawRockSlideAttack`): the
 * ROCK_SLIDE-window sibling to `resolveFaintPresentationWindowContent` above,
 * same mechanism (identify this window's own content purely from
 * `sourceLabel`, never a turn number), different label family --
 * `BattleScript_HitFromAtkString`/`BattleScript_HitFromAtkAnimation`
 * (`reference/pokeemerald/data/battle_scripts_1.s:243-260`, confirmed live
 * in this staged run's own event dump, §8.2) instead of the fainted branch's
 * `BattleScript_FaintTarget`.
 */
export const HIT_FROM_ATK_STRING_SCRIPT_LABEL = "BattleScript_HitFromAtkString";
export const HIT_FROM_ATK_ANIMATION_SCRIPT_LABEL = "BattleScript_HitFromAtkAnimation";

export type RockSlidePresentationWindowContent = Readonly<{
  message: Readonly<{ messageId: string; substitutions: readonly string[] }>;
  hp: Readonly<{ battler: number; from: number; to: number }>;
}>;

/**
 * Answers "are we in the ROCK_SLIDE attack's own message + HP-drain
 * presentation content" from the event stream's own provenance. Returns
 * `null` (not a guess) when either signal is absent -- both the real
 * `attackstring`-labeled message and the `attackanimation`-labeled
 * `hp-change` must be present.
 */
export function resolveRockSlidePresentationWindowContent(
  events: readonly BattleScriptSemanticEvent[],
  attackStringScriptLabel: string = HIT_FROM_ATK_STRING_SCRIPT_LABEL,
  attackAnimationScriptLabel: string = HIT_FROM_ATK_ANIMATION_SCRIPT_LABEL,
): RockSlidePresentationWindowContent | null {
  const messageEvent = events.find(
    (event) => event.kind === "message" && event.provenance.sourceLabel === attackStringScriptLabel,
  );
  if (!messageEvent || messageEvent.kind !== "message") return null;

  const hpChangeEvent = events.find(
    (event) => event.kind === "hp-change" && event.provenance.sourceLabel === attackAnimationScriptLabel,
  );
  if (!hpChangeEvent || hpChangeEvent.kind !== "hp-change") return null;

  return Object.freeze({
    message: Object.freeze({
      messageId: messageEvent.messageId,
      substitutions: messageEvent.substitutions,
    }),
    hp: Object.freeze({ battler: hpChangeEvent.battler, from: hpChangeEvent.from, to: hpChangeEvent.to }),
  });
}

/**
 * docs/presentation-seam-scout.md §11.2/§11.3 step 1's own mapping row for
 * `turn4-doubleteam.json`'s kickoff phase (`drawTurn4KickoffText`,
 * `battleScene.ts`): a genuinely NEW shape, not a relabeled reuse of
 * `resolveRockSlidePresentationWindowContent` above -- this window's own real
 * event stream never contains an `hp-change` at all (DOUBLE_TEAM is a
 * self-targeted, non-damaging status move, §11.2's own dedicated test
 * assertion), so `{message, hp}` does not fit. Both signals this window
 * actually has -- the kickoff `message{messageId:"STRINGID_USEDMOVE"}` and the
 * evasion `stat-stage-change` -- are real, present, and co-located under the
 * SAME `sourceLabel` in the real script
 * (`reference/pokeemerald/data/battle_scripts_1.s:487-494`,
 * `BattleScript_EffectEvasionUp` -> shared
 * `BattleScript_EffectStatUp`/`...StatUpAfterAtkCanceler`), so a single
 * `sourceLabel` check identifies this window's own content, same "identify
 * from provenance, never a turn number" discipline as every sibling bridge
 * function above.
 */
export const EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL = "BattleScript_EffectStatUpAfterAtkCanceler";

export type DoubleTeamKickoffPresentationWindowContent = Readonly<{
  message: Readonly<{ messageId: string; substitutions: readonly string[] }>;
  statChange: Readonly<{ battler: number; stat: string; from: number; to: number }>;
}>;

/**
 * Answers "are we in the DOUBLE_TEAM kickoff's own message + evasion-rise
 * presentation content" from the event stream's own provenance. Returns
 * `null` (not a guess) when either signal is absent -- both the real
 * `BattleScript_EffectStatUpAfterAtkCanceler`-labeled `message` and the
 * same-labeled `stat-stage-change` must be present for this window to be
 * genuinely active.
 */
export function resolveDoubleTeamKickoffPresentationWindowContent(
  events: readonly BattleScriptSemanticEvent[],
  statUpScriptLabel: string = EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL,
): DoubleTeamKickoffPresentationWindowContent | null {
  const messageEvent = events.find(
    (event) => event.kind === "message" && event.provenance.sourceLabel === statUpScriptLabel,
  );
  if (!messageEvent || messageEvent.kind !== "message") return null;

  const statChangeEvent = events.find(
    (event) => event.kind === "stat-stage-change" && event.provenance.sourceLabel === statUpScriptLabel,
  );
  if (!statChangeEvent || statChangeEvent.kind !== "stat-stage-change") return null;

  return Object.freeze({
    message: Object.freeze({
      messageId: messageEvent.messageId,
      substitutions: messageEvent.substitutions,
    }),
    statChange: Object.freeze({
      battler: statChangeEvent.battler,
      stat: statChangeEvent.stat,
      from: statChangeEvent.from,
      to: statChangeEvent.to,
    }),
  });
}
