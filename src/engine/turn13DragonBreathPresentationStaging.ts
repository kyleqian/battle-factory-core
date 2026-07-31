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
  type StagedPlayerHitChainResult,
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

export function stageTurn13DragonBreathHitChain(): StagedPlayerHitChainResult {
  return stagePlayerHitChain({
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
    },
    currentMove: MOVE_DRAGON_BREATH,
    currentMovePosition: 2,
    moveEffectByte: MOVE_EFFECT_PARALYSIS,
    rngSeed: RNG_BEFORE_DRAGON_BREATH,
  });
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
