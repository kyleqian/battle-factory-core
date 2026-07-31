/**
 * ISSUES #39 retirement: stage the canonical Onix -> Pidgeotto
 * DRAGON_BREATH KO through the common hit-chain interpreter and expose only
 * generic semantic presentation receipts.
 *
 * Source ownership:
 * - `BattleScript_EffectParalyzeHit` sets MOVE_EFFECT_PARALYSIS, then joins
 *   `BattleScript_HitFromAtkCanceler`
 *   (`reference/pokeemerald/data/battle_scripts_1.s:369-372,236-260`).
 * - `healthbarupdate` precedes `datahpupdate`; `tryfaintmon` then enters
 *   `BattleScript_FaintTarget`, whose `faintanimation` and
 *   `STRINGID_TARGETFAINTED` own the sink/message sequence
 *   (`battle_scripts_1.s:253-260,2817-2823`).
 * - `seteffectwithchance` always consumes the move's 30% secondary roll,
 *   then clears MOVE_EFFECT_BYTE. The recorded roll is 90 and therefore
 *   does not paralyze; the target is already at zero HP
 *   (`battle_script_commands.c:2905-2938`; `docs/turn13-notes.md` §2).
 *
 * The staged values are the real turn-13 RAM values: Onix's accuracy is
 * already 5 after SAND_ATTACK, Pidgeotto is at 16/156 HP, and the RNG cursor
 * is the post-SAND_ATTACK value 2287569056. The four DRAGON_BREATH draws end
 * at 2653573252, matching the recorded accuracy/crit/spread/secondary
 * ledger exactly.
 */
import {
  stagePlayerHitChain,
  stagePlayerHitChainToTerminalMachineState,
  type StagedPlayerHitChainMachineState,
  type StagedPlayerHitChainResult,
  type StagePlayerHitChainInput,
} from "./turn1RockSlidePresentationStaging.ts";
import {
  resolveFaintPresentationWindowContent,
  resolveRockSlidePresentationWindowContent,
  type FaintPresentationWindowContent,
  type RockSlidePresentationWindowContent,
} from "./presentationEventWindowBridge.ts";
import {
  resolveBattleNameWithPrefix,
  resolveBattleStringLines,
  resolveMoveNameExclaim,
} from "./battleStringResolver.ts";

const MOVE_DRAGON_BREATH = 225;
const MOVE_EFFECT_PARALYSIS = 5;
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
const RNG_BEFORE_DRAGON_BREATH = 2287569056;

const ONIX_STAT_STAGES_AFTER_SAND_ATTACK =
  Object.freeze([6, 6, 6, 6, 6, 6, 5, 6] as const);

/** PIDGEOTTO's own real party slot (`docs/onix-readylag-destin-bench-probes.md` Probe 2). */
const PIDGEOTTO_PARTY_INDEX = 2;
/** include/constants/battle.h:78 -- Factory always sets this bit; gates Cmd_getexp's own Frontier short-circuit. */
const BATTLE_TYPE_FACTORY = 1 << 19;

/**
 * ISSUES #39 rank-2 switch-in half: both real party sides, threaded into
 * the staged hit chain's own `party` so `runBattleScriptFaintedActionsOrchestration`
 * can chain straight into the real forced-switch dance from this script's
 * own terminal halt -- `checkteamslost` sums BOTH sides' party HP
 * (`battleScriptCheckteamslostOpcode.ts`), so the player side needs its own
 * live ONIX entry too, not just the opponent bench.
 *
 * - `player`: ONIX alone (Lv50, hp 4 -- this turn's own real pre-DRAGON_BREATH-
 *   counterattack value, matching the staged `attacker` battler above); the
 *   other two bench mons (Magby/Bayleef) are never read since ONIX alone
 *   already makes `playerHp !== 0`.
 * - `opponent`: DESTIN's real Battle-1 bench
 *   (`docs/onix-readylag-destin-bench-probes.md` Probe 2: GROVYLE slot 0 /
 *   MURKROW slot 1 / PIDGEOTTO slot 2, otId 416049562 shared by all three,
 *   no 4th-6th slot). MURKROW's full stat block is `docs/battle-turn-
 *   notes.md` HEADLINE 3 (Lv50, 142/142 HP, atk 91, def 69, spd 97, spAtk
 *   91, spDef 69, ability INSOMNIA, moves FAINT_ATTACK/FLY/TORMENT/TAUNT)
 *   -- the real RAM-read struct `switchindataupdate` rebuilds the incoming
 *   battler from (`battleScriptSwitchinOpcode.ts`). GROVYLE (dead since
 *   turn 5) and PIDGEOTTO (this turn's own faint) only need species/hp/
 *   moves: the decision itself excludes both purely on hp===0
 *   (`docs/destin-canonical-replacements-decision-proof.md`), never reads
 *   their other stats.
 */
const TURN13_PARTY: StagePlayerHitChainInput["party"] = Object.freeze({
  player: Object.freeze([
    { species: SPECIES_ONIX, hp: 4, level: 50 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
  ]),
  opponent: Object.freeze([
    { species: 278, hp: 0, moves: [210, 283, 280, 104] as const }, // GROVYLE, fainted turn 5
    {
      species: 198, hp: 142, level: 50, // MURKROW
      attack: 91, defense: 69, speed: 97, spAttack: 91, spDefense: 69,
      abilityNum: 0, // ABILITY_INSOMNIA (species-stats.json)
      moves: [185, 19, 259, 269] as const, // FAINT_ATTACK, FLY, TORMENT, TAUNT
    },
    { species: SPECIES_PIDGEOTTO, hp: 0, moves: [332, 98, 297, 28] as const }, // fainted this turn
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
  ]),
});

const TURN13_DRAGONBREATH_HIT_CHAIN_INPUT: StagePlayerHitChainInput = {
  attacker: {
    hp: 4,
    maxHP: 117,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [157, 20, MOVE_DRAGON_BREATH, 201],
    pp: [0, 19, 19, 10],
    statStages: ONIX_STAT_STAGES_AFTER_SAND_ATTACK,
  },
  target: {
    hp: 16,
    maxHP: 156,
    species: SPECIES_PIDGEOTTO,
    attack: 98,
    defense: 61,
    spAttack: 56,
    spDefense: 56,
    types: ["TYPE_NORMAL", "TYPE_FLYING"],
    partyIndex: PIDGEOTTO_PARTY_INDEX,
  },
  currentMove: MOVE_DRAGON_BREATH,
  currentMovePosition: 2,
  moveEffectByte: MOVE_EFFECT_PARALYSIS,
  rngSeed: RNG_BEFORE_DRAGON_BREATH,
  party: TURN13_PARTY,
  battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
};

export function stageTurn13DragonBreathHitChain(): StagedPlayerHitChainResult {
  return stagePlayerHitChain(TURN13_DRAGONBREATH_HIT_CHAIN_INPUT);
}

/**
 * ISSUES #39 rank-2 switch-in half: additive sibling exposing the SAME
 * staged DRAGON_BREATH chain's full terminal machine state (party/
 * battleTopology/scheduler included), not just the reduced
 * `{events, rngValueAfter, attacker, target}` view above --
 * `turn13ResolutionAdapter.ts` needs the full state to chain into
 * `runBattleScriptFaintedActionsOrchestration`. `party`/`target.partyIndex`
 * are inert during this script's own damage/faint run (only a later,
 * separately-invoked `HandleFaintedMonActions` reads them), so
 * `stageTurn13DragonBreathHitChain` above is unaffected by their presence
 * -- both functions share the identical input.
 */
export function stageTurn13DragonBreathHitChainToTerminalMachineState(): StagedPlayerHitChainMachineState {
  return stagePlayerHitChainToTerminalMachineState(TURN13_DRAGONBREATH_HIT_CHAIN_INPUT);
}

export type Turn13DragonBreathWindowContent = Readonly<{
  damage: RockSlidePresentationWindowContent;
  faint: FaintPresentationWindowContent;
}>;

export function resolveTurn13DragonBreathWindowContent():
  Turn13DragonBreathWindowContent {
  const { events } = stageTurn13DragonBreathHitChain();
  const damage = resolveRockSlidePresentationWindowContent(events);
  const faint = resolveFaintPresentationWindowContent(events);
  if (!damage || !faint) {
    throw new Error(
      "turn13DragonBreathPresentationStaging: staged hit chain did not produce damage and faint receipts",
    );
  }
  return Object.freeze({ damage, faint });
}

export function resolveTurn13DragonBreathKickoffLines(): readonly string[] {
  const { damage } = resolveTurn13DragonBreathWindowContent();
  return resolveBattleStringLines(damage.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
      side: "player",
      isTrainerBattle: true,
      nickname: "ONIX",
    }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_DRAGON_BREATH),
  });
}

export function resolveTurn13DragonBreathFaintLines(): readonly string[] {
  const { faint } = resolveTurn13DragonBreathWindowContent();
  return resolveBattleStringLines(faint.message.messageId, {
    B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
      side: "opponent",
      isTrainerBattle: true,
      nickname: "PIDGEOTTO",
    }),
  });
}

export function resolveTurn13DragonBreathHpEndpoints(): Readonly<{
  from: number;
  to: number;
}> {
  const { hp } = resolveTurn13DragonBreathWindowContent().damage;
  return Object.freeze({ from: hp.from, to: hp.to });
}

export function turn13DragonBreathHasParalysisStatusChange(
  result: StagedPlayerHitChainResult = stageTurn13DragonBreathHitChain(),
): boolean {
  return result.events.some(
    (event) =>
      event.kind === "set-battler-status-data"
      && event.status1 !== 0,
  );
}
