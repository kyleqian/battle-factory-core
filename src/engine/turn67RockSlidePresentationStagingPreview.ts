/**
 * ISSUES #39 rank-4 groundwork (`docs/rank4-prep-scout.md` slice 1 + slice
 * 4): the turn-6 and turn-7 ROCK_SLIDE tails (Onix -> Pidgeotto, both hit),
 * the SAME shape rank 1 already retired three times over
 * (`turn1/3/4RockSlidePresentationStaging.ts`) and rank 3 a fourth
 * (`turn5ResolutionAdapter.ts`), now proved for turns 6/7. Preview only --
 * NOT wired into `battleScene.ts`, no production file touched this session.
 *
 * Ground truth, not fabricated: `docs/turn6-notes.md` §3/§4 and
 * `docs/turn7-notes.md` §3/§4 (both already-committed RAM+pixel dossiers,
 * reused not re-derived). Onix's/Pidgeotto's level-50 battle stats are the
 * same real values `turn6FeatherDancePresentationStaging.ts` already cites
 * from the identical snapshot table (atk/def/spd/spA/spD 51/187/76/36/72 and
 * 98/61/77/56/56). Onix's HP stays 31 all of turns 6-7 (FEATHER_DANCE deals
 * no damage; ROCK_SLIDE is a one-sided hit). Pidgeotto's HP is 156 -> 113
 * (turn 6, -43) then 113 -> 82 (turn 7, -31), both exact matches to
 * `battleScene.ts`'s own already-committed `TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP`
 * / `TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP` literals (see the equivalence test).
 *
 * ## Correction to `docs/rank4-prep-scout.md` §1.2's own claim
 *
 * §1.2 says the ROCK_SLIDE tail "reaches a clean terminal state through the
 * **existing, unmodified** `stagePlayerHitChainToTerminalMachineState`" and
 * flags only that its scratch probe used an arbitrary seed, so "the damage
 * value it produced is not the real 43." True as far as it goes, but
 * incomplete: **even with the real seed, that shared helper cannot reproduce
 * the real damage at all**, for a second, unrelated reason the scout doc's
 * own scratch probe did not surface. `stagePlayerHitChainToTerminalMachineState`
 * (`turn1RockSlidePresentationStaging.ts:223`) delegates to that same file's
 * own local, unexported `battler()` normalizer, which hardcodes
 * `statStages: [6, 6, 6, 6, 6, 6, 6, 6]` **regardless of the caller's input**
 * (`turn1RockSlidePresentationStaging.ts:116`, `turn4RockSlidePresentationStaging.ts:114`
 * -- neither reads `changes.statStages`). By the time ROCK_SLIDE fires on
 * either turn 6 or turn 7, Onix's ATK stat stage is NOT neutral -- Pidgeotto's
 * own earlier FEATHER_DANCE use that same turn already dropped it to 4 (turn
 * 6) or 2 (turn 7, cumulative) -- and `calculateBattleScriptBaseDamageForCurrentMove`
 * (`battleScriptHitChainOpcode.ts:1442-1449`, `toDamageCalcStatStages`) reads
 * `battler.statStages[1]` (`STAT_ATK`) straight into the real damage formula.
 * Live-verified this session (not asserted): staging turn 6's own real seed
 * through the shared helper's hardcoded-neutral path computes Pidgeotto's HP
 * as 156 -> 71 (-85 damage) -- not the real 156 -> 113 (-43). Only threading
 * the real, non-neutral stat stage through a LOCAL pipeline reproduces the
 * real 43/31 exactly (both confirmed below). This is the identical class of
 * silent-drop rank 3's own groundwork (`2fa31c96`) already found on this
 * exact shared helper for `maxHP`/`item` -- confirmed here for `statStages`
 * too, still unfixed. Per this session's own new-files-only constraint the
 * shared helper is not edited; instead this module builds its own local
 * `battler()`/`externalPorts()` pipeline, mirroring
 * `turn6FeatherDancePresentationStaging.ts`'s own already-correct pattern
 * (`changes.statStages ?? default`), the same choice rank 3 made for its own
 * silent-drop discovery.
 *
 * ## RNG seeds (real, not found-to-work)
 *
 * Both turns' ROCK_SLIDE hit chains are entered with the RNG value FEATHER_DANCE's
 * own accuracy roll left behind that same turn -- no other `Random()` call
 * fires in between (`docs/turn6-notes.md` §3 / `docs/turn7-notes.md` §3, each
 * ledger's very next entry after the FEATHER_DANCE row is the ROCK_SLIDE
 * accuracy row), so this is a direct carry-forward, not an LCG inversion:
 * - Turn 6: `docs/turn6-notes.md` §3's tick-7356 row, value after FEATHER_DANCE's
 *   own roll = 1484887866 (matches `turn6FeatherDancePresentationStaging.ts`'s
 *   own `STAGED_RNG_SEED` doc, which derives the SAME value from the opposite
 *   end -- inverting FEATHER_DANCE's own roll -- as this module's forward
 *   carry, corroborating both directions agree).
 * - Turn 7: `docs/turn7-notes.md` §3's tick-8390 row, value after Pidgeotto's
 *   own FEATHER_DANCE roll = 1495764607.
 *
 * Verified live this session (not guessed): staging each seed through
 * `BattleScript_HitFromAtkCanceler` with the real entering ATK stage consumes
 * exactly 4 `Random()` calls (accuracy, crit, damage-spread, secondary-effect)
 * and lands on `rngValueAfter` byte-identical to each dossier's own next
 * ledger entry (`3551375038` turn 6 tick 8104, `637293907` turn 7 tick 9126)
 * -- both the RNG *and* the HP settle round-trip against the real recorded
 * run, not just one or the other. `moveEffectByte: 0` keeps `seteffectwithchance`
 * on its deterministic "no secondary effect" path regardless of its own roll
 * (ROCK_SLIDE's 30% flinch chance), the same `turn1RockSlidePresentationStaging.ts`
 * convention every sibling ROCK_SLIDE module already follows -- this staged
 * run never reaches `applySetMoveEffect`'s flinch-family `unsupported-branch`,
 * so this module cannot move the ratchet's barrier-count pins.
 *
 * PP is a real, correctly-threaded side effect of this chain (ROCK_SLIDE
 * 6 -> 5 turn 6, 5 -> 4 turn 7, matching both dossiers' own tables exactly)
 * but is NOT exposed as an adapter fact here: `docs/rank4-prep-scout.md`'s
 * own consumer map (§2, "Turn 6/7/8 PP values" row) already names the real
 * consumer -- the FIGHT-submenu's `turnNResolved`-chain PP reconstruction,
 * `battleScene.ts:7460-7490` -- as a cross-rank blocker shared with ranks 1
 * and 6, not solvable from inside this module alone.
 */
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";
import {
  resolveRockSlidePresentationWindowContent,
  type RockSlidePresentationWindowContent,
} from "./presentationEventWindowBridge.ts";
import { resolveBattleNameWithPrefix, resolveBattleStringLines, resolveMoveNameExclaim } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn67RockSlidePresentationStagingPreview: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_ROCK_SLIDE -- the real move both tails use. */
const MOVE_ROCK_SLIDE = 157;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling module. */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;

/**
 * `docs/turn6-notes.md` §3's tick-7356 row -- see this module's own top doc
 * for why this is a direct carry-forward, not an inversion.
 */
const TURN6_STAGED_RNG_SEED = 1484887866;
/** `docs/turn7-notes.md` §3's tick-8390 row -- same reasoning as turn 6. */
const TURN7_STAGED_RNG_SEED = 1495764607;

/** `docs/turn6-notes.md` §4's own pre-ROCK_SLIDE snapshot: Onix HP 31 (unchanged), Pidgeotto HP 156, Onix ATK stage 4 (already dropped by this turn's own FEATHER_DANCE). */
const TURN6_ONIX_HP = 31;
const TURN6_PIDGEOTTO_PRE_HIT_HP = 156;
const TURN6_ONIX_ATK_STAGE_ENTERING = 4;
const TURN6_ONIX_ROCK_SLIDE_PP_BEFORE = 6;

/** `docs/turn7-notes.md` §4's own pre-ROCK_SLIDE snapshot: Onix HP 31 (unchanged), Pidgeotto HP 113 (turn 6's own settle), Onix ATK stage 2 (cumulative 2nd FEATHER_DANCE drop). */
const TURN7_ONIX_HP = 31;
const TURN7_PIDGEOTTO_PRE_HIT_HP = 113;
const TURN7_ONIX_ATK_STAGE_ENTERING = 2;
const TURN7_ONIX_ROCK_SLIDE_PP_BEFORE = 5;

function battler(changes: Partial<BattleScriptRulesBattler>): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: 0,
    hp: changes.hp ?? 0,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0] as const),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0] as const),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    /** The fix this module's own top doc explains: forward the caller's real stat stages instead of collapsing them to neutral. */
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: 0,
    partyIndex: 0,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
}

export type RockSlideTailHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  targetHpAfter: number;
  rngValueAfter: number;
  /** Onix's own ATK stat stage entering this hit chain -- confirms the real, non-neutral value this module's own top doc corrects the scout doc about. */
  attackerAtkStageEntering: number;
}>;

function stageRockSlideTail(input: Readonly<{
  onixHp: number;
  onixAtkStageEntering: number;
  onixRockSlidePpBefore: number;
  pidgeottoPreHitHp: number;
  rngSeed: number;
}>): RockSlideTailHitChainResult {
  const onix = battler({
    side: 0,
    hp: input.onixHp,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [MOVE_ROCK_SLIDE, 20, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM (docs/turn6-notes.md §4)
    pp: [input.onixRockSlidePpBefore, 20, 20, 10],
    statStages: [6, input.onixAtkStageEntering, 6, 6, 6, 6, 6, 6],
  });
  const pidgeotto = battler({
    side: 1,
    hp: input.pidgeottoPreHitHp,
    species: SPECIES_PIDGEOTTO,
    attack: 98,
    defense: 61,
    spAttack: 56,
    spDefense: 56,
    types: ["TYPE_NORMAL", "TYPE_FLYING"],
    moves: [332, 98, 297, 28], // AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK
    pp: [20, 30, 14, 15],
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, pidgeotto, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_ROCK_SLIDE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });

  const ports = externalPorts();
  const execution = createBattleScriptStatusRulesExecution(PROGRAM, ENTRY_LABEL, rulesContext, input.rngSeed, ports);
  let state = execution.state;
  for (let budget = 0; budget < 512; budget += 1) {
    const stepped = stepBattleScriptMachine(PROGRAM, state, execution.handlers);
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      return Object.freeze({
        events: stepped.state.events,
        targetHpAfter: stepped.state.rulesContext.battlers[1]!.hp,
        rngValueAfter: stepped.state.rng.value,
        attackerAtkStageEntering: input.onixAtkStageEntering,
      });
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn67RockSlidePresentationStagingPreview: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn67RockSlidePresentationStagingPreview: staged ROCK_SLIDE hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn67RockSlidePresentationStagingPreview: staged hit chain did not reach its own script end in budget");
}

function acknowledgePendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const b of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, b);
  }
  return next;
}

/**
 * Runs turn 6's own real ONIX ROCK_SLIDE -> PIDGEOTTO hit chain (156 HP,
 * non-lethal, real move/real stats, real -2 ATK stage already applied by
 * this turn's own FEATHER_DANCE) from `BattleScript_HitFromAtkCanceler` to
 * the script's own `end`, returning every semantic event the registered
 * opcodes emitted along the way. Same "kernel runs at staging time;
 * presentation reads the event list" architecture every sibling module
 * establishes. Pure: no shared/global state, no RNG or rules mutation
 * outside this call's own local machine instance.
 */
export function stageTurn6RockSlideHitChain(): RockSlideTailHitChainResult {
  return stageRockSlideTail({
    onixHp: TURN6_ONIX_HP,
    onixAtkStageEntering: TURN6_ONIX_ATK_STAGE_ENTERING,
    onixRockSlidePpBefore: TURN6_ONIX_ROCK_SLIDE_PP_BEFORE,
    pidgeottoPreHitHp: TURN6_PIDGEOTTO_PRE_HIT_HP,
    rngSeed: TURN6_STAGED_RNG_SEED,
  });
}

/**
 * Runs turn 7's own real ONIX ROCK_SLIDE -> PIDGEOTTO hit chain (113 HP,
 * non-lethal, real move/real stats, real -4 cumulative ATK stage already
 * applied by turns 6+7's own FEATHER_DANCE uses). Same shape as
 * `stageTurn6RockSlideHitChain`, own real seed/HP/stage.
 */
export function stageTurn7RockSlideHitChain(): RockSlideTailHitChainResult {
  return stageRockSlideTail({
    onixHp: TURN7_ONIX_HP,
    onixAtkStageEntering: TURN7_ONIX_ATK_STAGE_ENTERING,
    onixRockSlidePpBefore: TURN7_ONIX_ROCK_SLIDE_PP_BEFORE,
    pidgeottoPreHitHp: TURN7_PIDGEOTTO_PRE_HIT_HP,
    rngSeed: TURN7_STAGED_RNG_SEED,
  });
}

/**
 * The PC-to-window bridge (`docs/presentation-seam-scout.md` §8.3) applied
 * to turn 6's own staged run: extracts the ROCK_SLIDE attack's own message +
 * HP-drain content purely from provenance, never a turn number. Same generic
 * `resolveRockSlidePresentationWindowContent` window 2/4 already retired,
 * reused here unchanged (zero bridge edits).
 */
export function resolveTurn6RockSlideWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn6RockSlideHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn67RockSlidePresentationStagingPreview: turn 6 staged hit chain did not produce the ROCK_SLIDE window's own event pair");
  }
  return content;
}

/** Same bridge applied to turn 7's own staged run. */
export function resolveTurn7RockSlideWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn7RockSlideHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn67RockSlidePresentationStagingPreview: turn 7 staged hit chain did not produce the ROCK_SLIDE window's own event pair");
  }
  return content;
}

/**
 * `ROCK_SLIDE_LINE1`/`LINE2`'s real content for turn 6 (and, per
 * `Cmd_attackstring`'s fixed messageId, byte-identical for turn 7 too --
 * see `resolveTurn7RockSlideAttackLines` below): `STRINGID_USEDMOVE`
 * resolved with Onix (player side, no "Foe " prefix) as
 * `B_ATK_NAME_WITH_PREFIX` and MOVE_ROCK_SLIDE's own display name as
 * `B_BUFF2`. Matches `turn1RockSlidePresentationStaging.ts`'s own
 * `resolveTurn1RockSlideAttackLines` exactly (same move, same attacker
 * side, same messageId), re-derived here from THIS turn's own staged
 * run rather than assumed by analogy.
 */
export function resolveTurn6RockSlideAttackLines(): readonly string[] {
  const content = resolveTurn6RockSlideWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_ROCK_SLIDE),
  });
}

/** Same resolution applied to turn 7's own staged run -- own function, not a cached copy, so a future divergence would be caught. */
export function resolveTurn7RockSlideAttackLines(): readonly string[] {
  const content = resolveTurn7RockSlideWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_ROCK_SLIDE),
  });
}

/** Pidgeotto's real turn-6 pre-hit/post-hit HP (156 -> 113) -- replaces `battleScene.ts`'s own `TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP` literal's missing staged proof. */
export function resolveTurn6RockSlideHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn6RockSlideWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}

/** Pidgeotto's real turn-7 pre-hit/post-hit HP (113 -> 82) -- replaces `battleScene.ts`'s own `TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP` literal's missing staged proof. */
export function resolveTurn7RockSlideHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn7RockSlideWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}
