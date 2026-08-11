/**
 * ISSUES #39 rank-4 slice 5 (final rank-4 slice, `docs/rank4-prep-scout.md`
 * §2.4/§3 item 5): turn 8's own BIND kickoff + miss window (Onix -> Pidgeotto,
 * the canonical line's own accuracy check MISSES). Same "reuse the shared
 * player-attacker hit-chain helper" shape `turn67RockSlidePresentationStaging.ts`/
 * `turn13DragonBreathPresentationStaging.ts` already establish, now unblocked
 * by `turn1RockSlidePresentationStaging.ts`'s new optional `entryLabel`
 * parameter (every pre-existing caller keeps the hardcoded
 * `BattleScript_HitFromAtkCanceler` default) since BIND's own real dispatch
 * entry is `BattleScript_EffectTrap`
 * (`reference/pokeemerald/data/battle_scripts_1.s:830-837`: `setmoveeffect
 * MOVE_EFFECT_WRAP` then `goto BattleScript_EffectHit`, which itself joins
 * the same generic hit chain every sibling module already enters lower down),
 * not the generic hit-chain entry those sibling modules use directly. BIND's
 * own attacker/target direction (Onix, player, battler 0 -> Pidgeotto,
 * opponent, battler 1) already matches the shared helper's hardcoded
 * direction exactly -- unlike the FEATHER_DANCE family (opponent-attacks-
 * player), no local hand-rolled pipeline is needed here.
 *
 * Ground truth: `docs/turn8-notes.md` §3/§4 (already-committed RAM+pixel
 * dossier, reused not re-derived). Onix atk/def/spd/spA/spD = 51/187/76/36/72
 * (unchanged all battle, the same real level-50 values every sibling module
 * in this family cites); Onix's own ATK stage enters this move at 0 (this
 * turn's own 3rd FEATHER_DANCE already floored it earlier this same turn --
 * `turn78FeatherDancePresentationStaging.ts`'s own turn-8 scope, out of this
 * module's own). Pidgeotto atk/def/spd/spA/spD = 98/61/77/56/56, HP 82
 * entering (turn 7's own settle, `turn67RockSlidePresentationStaging.ts`'s
 * own `TURN7_PIDGEOTTO_PRE_HIT_HP` sibling constant), item 180
 * (ITEM_WHITE_HERB -- inert here, it only restores the HOLDER's own lowered
 * stats and neither battler's stats are Pidgeotto's own this turn). BIND's
 * own real accuracy is 75 (`docs/turn8-notes.md` §3 corrects an earlier "85"
 * mis-citation elsewhere in this project's own docs), unmodified by any
 * stage/ability/item this turn. Onix's own BIND PP enters at 20/20 (1st use
 * this battle).
 *
 * ## RNG seed -- the canonical MISS (real, direct carry-forward)
 *
 * `docs/turn8-notes.md` §3's own tick-9436 row (Pidgeotto's own 3rd
 * FEATHER_DANCE accuracy roll), value after = 680271464 -- the SAME value
 * `turn78FeatherDancePresentationStaging.ts`'s own `stageTurn8FeatherDanceHitChain`
 * already lands on and pins. No other `Random()` call fires between
 * FEATHER_DANCE's own roll and BIND's own accuracy check (`docs/turn8-notes.md`
 * §3's own ledger: the very next entry after tick 9436 is tick 9844, BIND's
 * own accuracy roll), so this is a direct carry-forward, not an inversion.
 * Verified live this session (not guessed): staging this seed through
 * `BattleScript_EffectTrap` consumes exactly 1 `Random()` call and lands on
 * `rngValueAfter` byte-identical to `docs/turn8-notes.md` §3's own tick-9844
 * value (3780969147), and the roll misses
 * (`(3780969147 >>> 16 & 0xffff) % 100 + 1 = 94 > 75`) -- matching the real
 * canonical outcome exactly. Onix's own BIND PP decrements to 19 even on the
 * miss (`ppreduce` runs under `BattleScript_PrintMoveMissed` regardless of
 * the accuracy result), matching `docs/turn8-notes.md` §4's own "19/20 (1st
 * use)" table entry.
 *
 * ## RNG seed -- the HIT branch (kernel receipt only, NOT this turn's real
 * outcome)
 *
 * `docs/rank4-prep-scout.md` §1's own dynamic scratch-stage already proved
 * BIND's on-hit trap-start branch reaches a clean terminal state with zero
 * new opcode work; this module re-proves it with a real, already-documented
 * RNG value reused from elsewhere in this codebase --
 * `turn1RockSlidePresentationStaging.ts`'s own `STAGED_RNG_SEED`
 * (3485459011, `battle1-turn1-ram-dump.json`'s own real recorded ledger
 * entry) -- chosen only because it happens to land a hit against BIND's own
 * 75 accuracy calc (roll 47), NOT because it is turn 8's own real seed: the
 * real canonical line misses, and no committed dossier records a real BIND
 * hit this battle. Honest, not a hedge: no `presentationEventWindowBridge.ts`
 * window renders this branch -- `battleScene.ts`'s own turn-8 window only
 * ever plays the miss -- so this module exposes it only as a raw kernel
 * receipt (`stageTurn8BindHitReceipts` below), not through any resolved
 * text/window content function.
 */
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";
import { stagePlayerHitChainToTerminalMachineState } from "./turn1RockSlidePresentationStaging.ts";
import {
  resolveMoveMissedKickoffPresentationWindowContent,
  type MoveMissedKickoffPresentationWindowContent,
} from "./presentationEventWindowBridge.ts";
import { resolveBattleNameWithPrefix, resolveBattleStringLines, resolveMoveNameExclaim } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn8BindPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

/** `reference/pokeemerald/data/battle_scripts_1.s:830` -- BIND's own EFFECT_TRAP dispatch-table entry point, NOT the generic hit-chain entry every sibling player-attacker module enters at. */
const ENTRY_LABEL = "BattleScript_EffectTrap";
/** src/data/gen/moves.json MOVE_BIND -- the real move this window uses. */
const MOVE_BIND = 20;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling module. */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;

/** docs/turn8-notes.md §3's own tick-9436 row -- see this module's own top doc for why this is a direct carry-forward, not an inversion. */
const TURN8_STAGED_MISS_RNG_SEED = 680271464;
/** turn1RockSlidePresentationStaging.ts's own real recorded seed, reused ONLY because it lands a hit against BIND's own 75 accuracy calc -- see this module's own top doc. */
const HIT_BRANCH_RNG_SEED = 3485459011;

/** docs/turn8-notes.md §4's own pre-BIND snapshot. */
const ONIX_HP = 31;
const ONIX_ATK_STAGE_ENTERING = 0;
const ONIX_ROCK_SLIDE_PP_FROZEN = 4;
const ONIX_BIND_PP_BEFORE = 20;
const PIDGEOTTO_HP = 82;
const PIDGEOTTO_FEATHER_DANCE_PP = 12;
const PIDGEOTTO_ITEM_WHITE_HERB = 180;

function stageTurn8Bind(rngSeed: number) {
  return stagePlayerHitChainToTerminalMachineState({
    attacker: {
      hp: ONIX_HP,
      species: SPECIES_ONIX,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
      moves: [157, MOVE_BIND, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM
      pp: [ONIX_ROCK_SLIDE_PP_FROZEN, ONIX_BIND_PP_BEFORE, 19, 10],
      statStages: [6, ONIX_ATK_STAGE_ENTERING, 6, 6, 6, 6, 6, 6],
    },
    target: {
      hp: PIDGEOTTO_HP,
      species: SPECIES_PIDGEOTTO,
      attack: 98,
      defense: 61,
      spAttack: 56,
      spDefense: 56,
      types: ["TYPE_NORMAL", "TYPE_FLYING"],
      moves: [332, 98, 297, 28], // AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK
      pp: [20, 30, PIDGEOTTO_FEATHER_DANCE_PP, 15],
      item: PIDGEOTTO_ITEM_WHITE_HERB,
    },
    currentMove: MOVE_BIND,
    currentMovePosition: 1,
    moveEffectByte: 0,
    rngSeed,
    entryLabel: ENTRY_LABEL,
  });
}

export type Turn8BindMissResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  rngValueAfter: number;
  onixBindPpAfter: number;
  pidgeottoHpAfter: number;
}>;

/**
 * Runs turn 8's own real ONIX BIND -> PIDGEOTTO hit chain (the canonical
 * MISS) from `BattleScript_EffectTrap` to the script's own `end`, returning
 * every semantic event the registered opcodes emitted along the way. Same
 * "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn8BindMiss(): Turn8BindMissResult {
  const { state } = stageTurn8Bind(TURN8_STAGED_MISS_RNG_SEED);
  return Object.freeze({
    events: state.events,
    rngValueAfter: state.rng.value,
    onixBindPpAfter: state.rulesContext.battlers[0]!.pp[1]!,
    pidgeottoHpAfter: state.rulesContext.battlers[1]!.hp,
  });
}

export type Turn8BindHitReceipts = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  targetHpAfter: number;
  targetStatus2: number;
  targetWrappedBy: number;
  targetWrappedMove: number;
}>;

/**
 * NOT this turn's own real outcome (the canonical line misses, see this
 * module's own top doc) -- a kernel-only receipt proving BIND's on-hit
 * trap-start branch (`STATUS2_WRAPPED` plus `wrappedBy`/`wrappedMove`) stages
 * cleanly through the exact same `BattleScript_EffectTrap` entry, with no
 * presentation-window consumer.
 */
export function stageTurn8BindHitReceipts(): Turn8BindHitReceipts {
  const { state } = stageTurn8Bind(HIT_BRANCH_RNG_SEED);
  const target = state.rulesContext.battlers[1]!;
  return Object.freeze({
    events: state.events,
    targetHpAfter: target.hp,
    targetStatus2: target.status2,
    targetWrappedBy: target.wrappedBy,
    targetWrappedMove: target.wrappedMove,
  });
}

/**
 * The PC-to-window bridge (`docs/rank4-prep-scout.md` §2.4) applied to the
 * canonical MISS run: extracts the BIND kickoff's own message + miss content
 * purely from provenance, never a turn number.
 */
export function resolveTurn8BindWindowContent(): MoveMissedKickoffPresentationWindowContent {
  const { events } = stageTurn8BindMiss();
  const content = resolveMoveMissedKickoffPresentationWindowContent(events);
  if (!content) {
    throw new Error("turn8BindPresentationStaging: staged miss chain did not produce the kickoff+miss event pair");
  }
  return content;
}

/** `TURN8_BIND_LINE1`/`LINE2`'s real content: `STRINGID_USEDMOVE` resolved with Onix (player side, no "Foe " prefix) as `B_ATK_NAME_WITH_PREFIX` and MOVE_BIND's own display name as `B_BUFF2`. */
export function resolveTurn8BindKickoffLines(): readonly string[] {
  const content = resolveTurn8BindWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_BIND),
  });
}

/** `TURN8_MISS_LINE1`/`LINE2`'s real content: `STRINGID_ATTACKMISSED` (`sText_AttackMissed`) resolved with Onix as `B_ATK_NAME_WITH_PREFIX` (same shape `battleResolutionPresentation.ts`'s own STRINGID_ATTACKMISSED branch already establishes for a different call site). */
export function resolveTurn8MissLines(): readonly string[] {
  const content = resolveTurn8BindWindowContent();
  return resolveBattleStringLines(content.missMessage.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
  });
}
