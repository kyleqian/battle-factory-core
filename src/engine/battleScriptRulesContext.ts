import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  acknowledgeBattleScriptController,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  isBattleScriptBattlerId,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import type { BattleScriptOperand, BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  createBattleScriptMoveValuesCommandHandlers,
  type BattleScriptMoveValuesRulesContext,
} from "./battleScriptMoveValuesCommands.ts";
import {
  createBattleScriptBicbyteCommandHandlers,
  createBattleScriptSetByteCommandHandlers,
  type BattleScriptSetByteRulesContext,
} from "./battleScriptSetByte.ts";
import { createBattleScriptAttackCancelerOpcodeHandlers } from "./battleScriptAttackCancelerOpcode.ts";
import { createBattleScriptHitChainOpcodeHandlers } from "./battleScriptHitChainOpcode.ts";
import { createBattleScriptMoveEndOpcodeHandlers } from "./battleScriptMoveEndOpcode.ts";
import { createBattleScriptJumpifbyteOpcodeHandlers } from "./battleScriptJumpifbyteOpcode.ts";
import { createBattleScriptJumpifwordOpcodeHandlers } from "./battleScriptJumpifwordOpcode.ts";
import { createBattleScriptJumpifhalfwordOpcodeHandlers } from "./battleScriptJumpifhalfwordOpcode.ts";
import { createBattleScriptJumpifstatus3conditionOpcodeHandlers } from "./battleScriptJumpifstatus3conditionOpcode.ts";
import { createBattleScriptOrwordOpcodeHandlers } from "./battleScriptOrwordOpcode.ts";
import { createBattleScriptOpenPartyScreenOpcodeHandlers } from "./battleScriptOpenPartyScreenOpcode.ts";
import { createBattleScriptSwitchinOpcodeHandlers } from "./battleScriptSwitchinOpcode.ts";
import { createBattleScriptGetexpOpcodeHandlers } from "./battleScriptGetexpOpcode.ts";
import { createBattleScriptCheckteamslostOpcodeHandlers } from "./battleScriptCheckteamslostOpcode.ts";
import { createBattleScriptStatbuffchangeOpcodeHandlers } from "./battleScriptStatbuffchangeOpcode.ts";
import { createBattleScriptSetSideStatusOpcodeHandlers } from "./battleScriptSetSideStatusOpcode.ts";
import { createBattleScriptSetWeatherOpcodeHandlers } from "./battleScriptSetWeatherOpcode.ts";
import { createBattleScriptDamagingWeatherOpcodeHandlers } from "./battleScriptDamagingWeatherOpcode.ts";
import { createBattleScriptTryCastformDataChangeOpcodeHandlers } from "./battleScriptTryCastformDataChangeOpcode.ts";
import { createBattleScriptIngrainLeechSeedWrapOpcodeHandlers } from "./battleScriptIngrainLeechSeedWrapOpcode.ts";
import { createBattleScriptRemoveitemOpcodeHandlers } from "./battleScriptRemoveitemOpcode.ts";
import {
  createBattleScriptClearstatusfromeffectOpcodeHandlers,
  createBattleScriptSemiInvulnerableBitOpcodeHandlers,
} from "./battleScriptSemiInvulnerableOpcode.ts";
import { createBattleScriptStatusPrimaryOpcodeHandlers } from "./battleScriptStatusPrimaryOpcode.ts";
import { createBattleScriptSetyawnOpcodeHandlers } from "./battleScriptSetyawnOpcode.ts";
import { createBattleScriptConfuseifrepeatingattackendsOpcodeHandlers } from "./battleScriptConfuseifrepeatingattackendsOpcode.ts";
import { createBattleScriptTargetIterationOpcodeHandlers } from "./battleScriptTargetIterationOpcode.ts";
import { createBattleScriptProtectlikeOpcodeHandlers } from "./battleScriptProtectlikeOpcode.ts";
import { createBattleScriptNegativedamageOpcodeHandlers } from "./battleScriptNegativedamageOpcode.ts";
import { createBattleScriptTrysetrestOpcodeHandlers } from "./battleScriptTrysetrestOpcode.ts";
import { createBattleScriptJumpifstatOpcodeHandlers } from "./battleScriptJumpifstatOpcode.ts";
import { createBattleScriptPlaystatchangeanimationOpcodeHandlers } from "./battleScriptPlaystatchangeanimationOpcode.ts";
import { createBattleScriptTryinfatuatingOpcodeHandlers } from "./battleScriptTryinfatuatingOpcode.ts";
import { createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers } from "./battleScriptJumpifconfusedandstatmaxedOpcode.ts";
import { createBattleScriptTryhealhalfhealthOpcodeHandlers } from "./battleScriptTryhealhalfhealthOpcode.ts";
import { createBattleScriptTryKOOpcodeHandlers } from "./battleScriptTryKOOpcode.ts";
import { createBattleScriptTrysetdestinybondtohappenOpcodeHandlers } from "./battleScriptTrysetdestinybondtohappenOpcode.ts";
import { createBattleScriptSetdestinybondOpcodeHandlers } from "./battleScriptSetdestinybondOpcode.ts";
import { createBattleScriptSetsubstituteOpcodeHandlers } from "./battleScriptSetsubstituteOpcode.ts";
import { createBattleScriptForceSwitchOpcodeHandlers } from "./battleScriptForceSwitchOpcode.ts";
import { createBattleScriptExplosionOpcodeHandlers } from "./battleScriptExplosionOpcode.ts";
import { createBattleScriptJumpifnotfirstturnOpcodeHandlers } from "./battleScriptJumpifnotfirstturnOpcode.ts";
import { createBattleScriptJumpifabilitypresentOpcodeHandlers } from "./battleScriptJumpifabilitypresentOpcode.ts";
import { createBattleScriptRecoverbasedonsunlightOpcodeHandlers } from "./battleScriptRecoverbasedonsunlightOpcode.ts";
import { createBattleScriptCurseOpcodeHandlers } from "./battleScriptCurseOpcode.ts";
import { createBattleScriptRemainingHpToPowerOpcodeHandlers } from "./battleScriptRemainingHpToPowerOpcode.ts";
import { createBattleScriptFriendshipToDamageOpcodeHandlers } from "./battleScriptFriendshipToDamageOpcode.ts";
import { createBattleScriptCopyFoeStatsOpcodeHandlers } from "./battleScriptCopyFoeStatsOpcode.ts";
import { createBattleScriptJumpifcantswitchOpcodeHandlers } from "./battleScriptJumpifcantswitchOpcode.ts";
import { createBattleScriptJumpifnodamageOpcodeHandlers } from "./battleScriptJumpifnodamageOpcode.ts";
import { createBattleScriptSleepTalkOpcodeHandlers } from "./battleScriptSleepTalkOpcode.ts";
import { createBattleScriptTrywishOpcodeHandlers } from "./battleScriptTrywishOpcode.ts";
import { createBattleScriptRolloutOpcodeHandlers } from "./battleScriptRolloutOpcode.ts";
import { createBattleScriptSetDefenseCurlBitOpcodeHandlers } from "./battleScriptSetDefenseCurlBitOpcode.ts";
import { createBattleScriptTrysetfutureattackOpcodeHandlers } from "./battleScriptTrysetfutureattackOpcode.ts";
import { createBattleScriptDisablelastusedattackOpcodeHandlers } from "./battleScriptDisablelastusedattackOpcode.ts";
import { createBattleScriptFuryCutterOpcodeHandlers } from "./battleScriptFuryCutterOpcode.ts";
import { createBattleScriptSetminimizeOpcodeHandlers } from "./battleScriptSetminimizeOpcode.ts";
import { createBattleScriptSetforcedtargetOpcodeHandlers } from "./battleScriptSetforcedtargetOpcode.ts";
import { createBattleScriptGetSecretPowerEffectOpcodeHandlers } from "./battleScriptGetSecretPowerEffectOpcode.ts";
import { createBattleScriptTryswapabilitiesOpcodeHandlers } from "./battleScriptTryswapabilitiesOpcode.ts";
import { createBattleScriptTrysethelpinghandOpcodeHandlers } from "./battleScriptTrysethelpinghandOpcode.ts";
import { createBattleScriptTryswapitemsOpcodeHandlers } from "./battleScriptTryswapitemsOpcode.ts";
import { createBattleScriptSettormentOpcodeHandlers } from "./battleScriptSettormentOpcode.ts";
import { createBattleScriptTrysetencoreOpcodeHandlers } from "./battleScriptTrysetencoreOpcode.ts";
import { createBattleScriptTrysetperishsongOpcodeHandlers } from "./battleScriptTrysetperishsongOpcode.ts";
import { createBattleScriptTrysetgrudgeOpcodeHandlers } from "./battleScriptTrysetgrudgeOpcode.ts";
import { createBattleScriptTryspiteppreduceOpcodeHandlers } from "./battleScriptTryspiteppreduceOpcode.ts";
import { createBattleScriptRankedBatch1OpcodeHandlers } from "./battleScriptRankedBatch1Opcode.ts";
import { createBattleScriptPainSplitOpcodeHandlers } from "./battleScriptPainSplitOpcode.ts";
import { createBattleScriptStockpileOpcodeHandlers } from "./battleScriptStockpileOpcode.ts";
import { createBattleScriptSettauntOpcodeHandlers } from "./battleScriptSettauntOpcode.ts";
import { createBattleScriptSetforesightOpcodeHandlers } from "./battleScriptSetforesightOpcode.ts";
import { createBattleScriptSetfocusenergyOpcodeHandlers } from "./battleScriptSetfocusenergyOpcode.ts";
import { createBattleScriptDoubleDamageIfDamagedOpcodeHandlers } from "./battleScriptDoubleDamageIfDamagedOpcode.ts";
import { createBattleScriptTrysetmagiccoatOpcodeHandlers } from "./battleScriptTrysetmagiccoatOpcode.ts";
import { createBattleScriptWeightDamageOpcodeHandlers } from "./battleScriptWeightDamageOpcode.ts";
import { createBattleScriptTrysetspikesOpcodeHandlers } from "./battleScriptTrysetspikesOpcode.ts";
import { createBattleScriptRefreshOpcodeHandlers } from "./battleScriptRefreshOpcode.ts";
import { createBattleScriptHealpartystatusOpcodeHandlers } from "./battleScriptHealpartystatusOpcode.ts";
import { createBattleScriptIncrementGameStatOpcodeHandlers } from "./battleScriptIncrementGameStatOpcode.ts";
import {
  createBattleScriptRuleCommandHandlers,
  type BattleScriptByteResolverPort,
} from "./battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptSourceCommandPorts,
  type BattleScriptStatusAnimationPreparation,
  type BattleScriptStatusAnimationPreparationPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_BATTLER_SELECTORS,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };
import itemHoldEffectsData from "../data/gen/item-hold-effects.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };

export const BATTLE_SCRIPT_NUM_BATTLE_STATS = 8;
export const BATTLE_SCRIPT_ITEM_ENIGMA_BERRY = 175;
export const BATTLE_SCRIPT_DYNAMIC_TYPE_MASK = 0x3f;
export const BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND = 29;
export const BATTLE_SCRIPT_MOVE_NONE = 0;
export const BATTLE_SCRIPT_MOVE_STRUGGLE = 165;
export const BATTLE_SCRIPT_MOVE_BATON_PASS = 226;
export const BATTLE_SCRIPT_MOVE_UNAVAILABLE = 0xffff;
export const BATTLE_SCRIPT_HITMARKER_OBEYS = 1 << 25;
export const BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED = 1 << 10;
export const BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET = 1 << 12;
export const BATTLE_SCRIPT_MOVE_RESULT_FAILED = 1 << 5;
export const BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT = (1 << 0) | (1 << 3) | (1 << 5);
export const BATTLE_SCRIPT_MOVE_FLAG_MIRROR_MOVE_AFFECTED = 1 << 4;
export const BATTLE_SCRIPT_EFFECT_BATON_PASS = 127;
export const BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE = 1 << 0;
export const BATTLE_SCRIPT_BATTLE_TYPE_TRAINER = 1 << 3;
export const BATTLE_SCRIPT_BATTLE_TYPE_ARENA = 1 << 18;
export const BATTLE_SCRIPT_BATTLE_TYPE_FACTORY = 1 << 19;
/** include/constants/battle.h:321; Factory battle-room map type INDOOR resolves to this environment. */
export const BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING = 8;
export const BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING = 1 << 9;
export const BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE = 1 << 19;
export const BATTLE_SCRIPT_MOVE_TARGET_BOTH = 1 << 3;
export const BATTLE_SCRIPT_STATUS2_SUBSTITUTE = 1 << 24;
const BATTLE_SCRIPT_ITEMS_COUNT = itemHoldEffectsData.itemsCount;

export type BattleScriptStatStages = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Source gBattleMons six independent 5-bit IV fields. */
export type BattleScriptIvs = Readonly<{
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  spAttack: number;
  spDefense: number;
}>;

export function uniformBattleScriptIvs(iv: number): BattleScriptIvs {
  if (!Number.isSafeInteger(iv) || iv < 0 || iv > 31) {
    throw new Error(`uniform IV must be an integer in 0..31, got ${iv}`);
  }
  return Object.freeze({
    hp: iv,
    attack: iv,
    defense: iv,
    speed: iv,
    spAttack: iv,
    spDefense: iv,
  });
}

export type BattleScriptSpecialStatus = Readonly<{
  restoredBattlerSprite: 0 | 1;
  physicalDmg: number;
  specialDmg: number;
  /** Source s32 gSpecialStatuses[battler].shellBellDmg. */
  shellBellDmg: number;
}>;

/** Modeled struct SideTimer fields, including Follow Me's timer/target (include/battle.h:149-174) -- see the field comment on BattleScriptRulesContext.sideTimers. */
export type BattleScriptSideTimerState = Readonly<{
  reflectTimer: number;
  reflectBattlerId: BattleScriptBattlerId;
  lightscreenTimer: number;
  lightscreenBattlerId: BattleScriptBattlerId;
  safeguardTimer: number;
  safeguardBattlerId: BattleScriptBattlerId;
  mistBattlerId: BattleScriptBattlerId;
  /** Source u8 followmeTimer/followmeTarget, consumed by GetMoveTarget. */
  followmeTimer: number;
  followmeTarget: BattleScriptBattlerId;
  /** Source u8 spikesAmount, paired with SIDE_STATUS_SPIKES. */
  spikesAmount: number;
}>;

export type BattleScriptSideTimerInput = Readonly<{
  reflectTimer?: number;
  reflectBattlerId?: BattleScriptBattlerId;
  lightscreenTimer?: number;
  lightscreenBattlerId?: BattleScriptBattlerId;
  safeguardTimer?: number;
  safeguardBattlerId?: BattleScriptBattlerId;
  mistBattlerId?: BattleScriptBattlerId;
  followmeTimer?: number;
  followmeTarget?: BattleScriptBattlerId;
  spikesAmount?: number;
}>;

type BattleScriptRulesBattlerBase = Readonly<{
  side: 0 | 1;
  ability: number;
  hp: number;
  moves: readonly [number, number, number, number];
  pp: readonly [number, number, number, number];
  status1: number;
  status2: number;
  status3: number;
  substituteHP: number;
  rolloutTimer: number;
  furyCutterCounter: number;
  truantCounter: 0 | 1;
  rechargeTimer: number;
  flinchImmobility: 0 | 1;
  disabledMove: number;
  usedDisabledMove: 0 | 1;
  tauntTimer: number;
  usedTauntedMove: 0 | 1;
  usedImprisonedMove: 0 | 1;
  /** ProtectStruct::bounceMove; absent legacy inputs normalize to zero at read sites. */
  bounceMove?: 0 | 1;
  /** ProtectStruct::confusionSelfDmg; absent legacy inputs normalize to zero. */
  confusionSelfDmg?: 0 | 1;
  /** ProtectStruct::prlzImmobility; absent legacy inputs normalize to zero. */
  prlzImmobility?: 0 | 1;
  /** ProtectStruct::loveImmobility; absent legacy inputs normalize to zero. */
  loveImmobility?: 0 | 1;
  /** ProtectStruct::stealMove; absent legacy inputs normalize to zero at read sites. */
  stealMove?: 0 | 1;
  /** SpecialStatus::lightningRodRedirected; absent legacy inputs normalize to zero. */
  lightningRodRedirected?: 0 | 1;
  /** ProtectStruct::endured (Cmd_adjustnormaldamage's HP-clamp gate); absent legacy inputs normalize to zero. */
  endured?: 0 | 1;
  /** ProtectStruct::helpingHand (Cmd_damagecalc's 1.5x); absent legacy inputs normalize to zero. */
  helpingHand?: 0 | 1;
  /**
   * The already source-modified physical operands consumed by
   * CalculateBaseDamage's MOVE_POUND/powerOverride=40 confusion call.
   * Optional because non-self-hit branches never read these fields.
   */
  confusionDamage?: Readonly<{
    level: number;
    attack: number;
    defense: number;
    attackStage: number;
    defenseStage: number;
    isBurned: boolean;
    hasGuts: boolean;
  }>;
}>;

type BattleScriptMoveEndBattlerMetadata = Readonly<{
  /** Source gBattleMons[battler] IV bitfields, consumed by Hidden Power. */
  ivs: BattleScriptIvs;
  /** Source four-bit DisableStruct::mimickedMoves mask. */
  mimickedMoves: number;
  /** Source two-bit DisableStruct::stockpileCounter (0..3). */
  stockpileCounter: number;
  /** DisableStruct's paired four-bit duration fields. */
  disableTimer: number;
  disableTimerStartValue: number;
  /** Source DisableStruct::encoreTimer/encoredMove, consumed by CheckMoveLimitations. */
  encoreTimer: number;
  encoredMove: number;
  encoredMovePos: number;
  encoreTimerStartValue: number;
  /** Source DisableStruct's paired four-bit Perish Song countdown fields. */
  perishSongTimer: number;
  perishSongTimerStartValue: number;
  /** Source u16 gBattleMons[battler].item. */
  item: number;
  /** Source s8 gBattleMons[battler].statStages[NUM_BATTLE_STATS]. */
  statStages: BattleScriptStatStages;
  /** Source gSpecialStatuses[battler] fields required by Cmd_moveend. */
  specialStatus: BattleScriptSpecialStatus;
  /** ProtectStruct::chargingTurn. */
  chargingTurn: 0 | 1;
  /** Remaining durable ProtectStruct bits required by WasUnableToUseMove. */
  targetNotAffected: 0 | 1;
  flag2Unknown: 0 | 1;
  /** ProtectStruct::protected (this battler used Protect/Detect this turn). */
  protected: 0 | 1;
  /** DisableStruct::protectUses (Cmd_setprotectlike's success-rate index/streak counter). */
  protectUses: number;
  /** SpecialStatus::ppNotAffectedByPressure. */
  ppNotAffectedByPressure: 0 | 1;
  /** ProtectStruct::physicalDmg -- Counter's own retaliation-amount input (distinct from SpecialStatus::physicalDmg, specialStatus.physicalDmg above; see docs/counter-retaliation-design.md §1.2 for why these cannot share a field). */
  protectPhysicalDmg: number;
  protectPhysicalBattlerId: BattleScriptBattlerId;
  /** ProtectStruct::specialDmg -- Mirror Coat's equivalent. */
  protectSpecialDmg: number;
  protectSpecialBattlerId: BattleScriptBattlerId;
  /** Source gBattleMons[battler].types[2], the hit-chain's defending/Ghost-immunity types. */
  types: readonly [string, string];
  /** Source gBattleMons[battler].species - Lucky Punch/Stick's species-gated crit stage boost. */
  species: number;
  /**
   * Source gBattleMons[battler].personality. Cmd_tryinfatuating rereads
   * species/personality from the party mon via GetMonData rather than
   * gBattleMons directly (battle_script_commands.c:7656-7671), but this
   * engine has no Transform species/personality divergence yet
   * (B_SCR_OP_TRANSFORMDATAEXECUTION is unregistered), so the party value
   * and gBattleMons[battler].personality are always identical -- reading it
   * off the already-modeled per-battler state is exact, matching the
   * `species` field above's own precedent.
   */
  personality: number;
  /** Source gBattleMons[battler].{attack,defense,spAttack,spDefense,level} - CalculateBaseDamage's raw stat inputs. */
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  level: number;
  /** Source gBattleMons[battler].friendship - Cmd_attackanimation's EmitMoveAnimation argument. */
  friendship: number;
  /** Source gBattlerPartyIndexes[battler] -- the party slot this active battler mirrors. */
  partyIndex: number;
  /**
   * Source gBattleMons[battler].maxHP -- end-turn status ticks' own damage
   * base (`maxHP/8`/`maxHP/16`, `docs/end-turn-ground-truth.md` §2a/§2b).
   * Absent legacy inputs default to `hp` (a full-HP mon) at construction --
   * safe because no code path before this doc's own end-turn orchestration
   * ever reads this field.
   */
  maxHP: number;
  /**
   * Source gBattleMons[battler].speed -- GetWhoStrikesFirst's own effective-
   * speed input (`turnOrder.ts`, `battle_main.c:4605-4650`), needed once a
   * decision reducer must compute real turn order between two battlers
   * (`docs/end-turn-ground-truth.md` PROGRESS #449's own gap). Absent legacy
   * inputs default to 100 at construction -- safe because no code path
   * before the full-turn reducer ever reads this field.
   */
  speed: number;
  /**
   * Source GetBattlerTurnOrderNum(battler) (battle_script_commands.c:2210-2219)
   * -- this battler's own position within gBattlerByTurnOrder for the
   * currently-running turn. The only reader is SetMoveEffect's
   * MOVE_EFFECT_FLINCH case (docs/set-move-effect-ground-truth.md:104-112),
   * comparing this against the context-level currentTurnActionNumber to gate
   * "the effect battler hasn't acted yet this turn". Absent legacy inputs
   * default to 1 alongside currentTurnActionNumber's own default of 0 (see
   * createBattleScriptRulesContext) -- every battler reads as "hasn't acted",
   * the shape every single-command hit-chain fixture already implies (one
   * attacker action, no second mover). Safe because no code path before this
   * doc's own FLINCH registration ever reads this field.
   */
  turnOrderNum: number;
  /**
   * Source `gBattleStruct->wrappedMove[battler]` -- the trapping move's id,
   * written by SetMoveEffect's MOVE_EFFECT_WRAP case
   * (docs/ingrain-leechseed-wrap-ground-truth.md §1c). Absent legacy inputs
   * default to 0 (MOVE_NONE) -- safe because no code path before Wrap's own
   * setter registration ever reads this field.
   */
  wrappedMove: number;
  /**
   * Source `gBattleStruct->wrappedBy[battler]` -- the attacker who set the
   * trap, read back by `Cmd_cleareffectsonfaint`'s cross-battler
   * STATUS2_WRAPPED clear (`FaintClearSetData`, battle_main.c:3281). Absent
   * legacy inputs default to 0 -- inert unless this battler's own status2
   * STATUS2_WRAPPED bits are actually set, which no code path before Wrap's
   * own setter registration ever does.
   */
  wrappedBy: BattleScriptBattlerId;
  /**
   * Source `gDisableStructs[battler].battlerPreventingEscape` -- the owner
   * of this battler's STATUS2_ESCAPE_PREVENTION bit. Switch/faint cleanup
   * compares this identity with the departing battler before clearing the
   * trap.
   */
  battlerPreventingEscape: BattleScriptBattlerId;
  /**
   * Source `gDisableStructs[battler].isFirstTurn` -- set to 2 at battle
   * init/switch-in (`battle_main.c:3051,3220,3312`), decremented by
   * `TurnValuesCleanUp(FALSE)` (not modeled by this engine yet, see
   * `battleEndTurnOrchestration.ts`'s own header comment). The ONLY reader
   * this engine wires is `ABILITY_SPEED_BOOST`'s own `!= 2` exception
   * (`battle_util.c:2643`, docs/endturn-abilities-items-ground-truth.md
   * §1b). Absent legacy inputs default to 0 (i.e. "not first turn") -- safe
   * because no code path before this registration ever reads this field.
   */
  isFirstTurn: number;
}>;

/**
 * Construction input. Legacy focused fixtures may omit only the newly added
 * move-end metadata; createBattleScriptRulesContext materializes it once.
 */
export type BattleScriptRulesBattler = BattleScriptRulesBattlerBase & Readonly<{
  /**
   * Older focused fixtures normalize absent move-end metadata at this single
   * construction boundary. Production constructors supply source values.
   */
  item?: number;
  /** Legacy focused fixtures default to six zero IVs at the construction boundary. */
  ivs?: BattleScriptIvs;
  mimickedMoves?: number;
  stockpileCounter?: number;
  disableTimer?: number;
  disableTimerStartValue?: number;
  encoreTimer?: number;
  encoredMove?: number;
  encoredMovePos?: number;
  encoreTimerStartValue?: number;
  perishSongTimer?: number;
  perishSongTimerStartValue?: number;
  statStages?: readonly number[];
  specialStatus?: Readonly<{
    restoredBattlerSprite?: 0 | 1;
    physicalDmg?: number;
    specialDmg?: number;
    shellBellDmg?: number;
  }>;
  chargingTurn?: 0 | 1;
  /** ProtectStruct bits read by WasUnableToUseMove but not by admission yet. */
  targetNotAffected?: 0 | 1;
  flag2Unknown?: 0 | 1;
  protected?: 0 | 1;
  protectUses?: number;
  ppNotAffectedByPressure?: 0 | 1;
  protectPhysicalDmg?: number;
  protectPhysicalBattlerId?: BattleScriptBattlerId;
  protectSpecialDmg?: number;
  protectSpecialBattlerId?: BattleScriptBattlerId;
  types?: readonly [string, string];
  species?: number;
  personality?: number;
  attack?: number;
  defense?: number;
  spAttack?: number;
  spDefense?: number;
  level?: number;
  friendship?: number;
  partyIndex?: number;
  maxHP?: number;
  speed?: number;
  turnOrderNum?: number;
  wrappedMove?: number;
  wrappedBy?: BattleScriptBattlerId;
  battlerPreventingEscape?: BattleScriptBattlerId;
  isFirstTurn?: number;
}>;

export type BattleScriptRulesBattlerState =
  BattleScriptRulesBattlerBase & BattleScriptMoveEndBattlerMetadata;

export type BattleScriptRulesBattlers = readonly [
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
  BattleScriptRulesBattlerState,
];

export type BattleScriptSelectorRoleBindings = Readonly<{
  attacker: BattleScriptBattlerId | null;
  target: BattleScriptBattlerId | null;
  effectBattler: BattleScriptBattlerId | null;
  /**
   * Source gBattlerFainted (battle_util.c:713's BS_FAINTED case). A distinct
   * role from `target`: HandleFaintedMonActions reassigns
   * `gBattlerFainted = gBattlerTarget = faintedActionsBattlerId` together
   * (battle_util.c:1915), so the fainted-actions orchestration
   * (battleScriptFaintedActionsOrchestration.ts) writes both roles at once
   * -- this field is never derived from `target` (ISSUES #43).
   */
  fainted: BattleScriptBattlerId | null;
}>;

/** include/constants/pokemon.h PARTY_SIZE -- Cmd_checkteamslost's own loop bound. */
export const BATTLE_SCRIPT_PARTY_SIZE = 6;

export type BattleScriptPartyMemberMoves = readonly [number, number, number, number];
export type BattleScriptPartyMemberPp = readonly [number, number, number, number];

/** The exact GetMonData fields Cmd_checkteamslost and GetMostSuitableMonToSwitchInto read per party slot. */
export type BattleScriptPartyMemberState = Readonly<{
  species: number;
  isEgg: boolean;
  /** Source MON_DATA_ABILITY_NUM (0 or 1). */
  abilityNum: number;
  hp: number;
  /** Source gPlayerParty/gEnemyParty[].status1 -- kept in sync by SetMoveEffect's status write, mirroring datahpupdate's HP sync. */
  status1: number;
  /** Source gPlayerParty/gEnemyParty[].heldItem, synchronized by REQUEST_HELDITEM_BATTLE controller writes. */
  item: number;
  /** Source MON_DATA_MOVE1..4 -- read by GetMostSuitableMonToSwitchInto's super-effective-move gate (forced-switch-ground-truth.md §1b/§4 slice 2). */
  moves: BattleScriptPartyMemberMoves;
  /** Source MON_DATA_PP1..4, synchronized by REQUEST_PPMOVE1_BATTLE controller writes. */
  pp: BattleScriptPartyMemberPp;
}>;

export type BattleScriptPartyState = readonly [
  BattleScriptPartyMemberState,
  BattleScriptPartyMemberState,
  BattleScriptPartyMemberState,
  BattleScriptPartyMemberState,
  BattleScriptPartyMemberState,
  BattleScriptPartyMemberState,
];

/** Source gPlayerParty/gEnemyParty, narrowed to the three fields above. */
export type BattleScriptPartyBySide = Readonly<{
  player: BattleScriptPartyState;
  opponent: BattleScriptPartyState;
}>;

export type BattleScriptBideDamageByBattler = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptBideTargetByBattler = readonly [
  BattleScriptBattlerId,
  BattleScriptBattlerId,
  BattleScriptBattlerId,
  BattleScriptBattlerId,
];

export type BattleScriptMoveEndHalfwords = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptMoveEndBytes = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptMoveHistory = Readonly<{
  /** Six independent source globals; none is an alias of another. */
  lastPrintedMoves: BattleScriptMoveEndHalfwords;
  lastMoves: BattleScriptMoveEndHalfwords;
  lastResultingMoves: BattleScriptMoveEndHalfwords;
  lastLandedMoves: BattleScriptMoveEndHalfwords;
  lastHitByType: BattleScriptMoveEndHalfwords;
  lastHitBy: BattleScriptMoveEndBytes;
  /** Exact source byte buffers from BattleStruct. */
  lastTakenMove: readonly number[];
  lastTakenMoveFrom: readonly number[];
}>;

export type BattleScriptBattlerPositions = readonly [
  number,
  number,
  number,
  number,
];

export type BattleScriptBattlersCount = 2 | 4;

export type BattleScriptPreparedMonNick = Readonly<{
  battler: BattleScriptBattlerId;
  partyIndex: number;
}>;

/** Exact immutable globals used by source battler-position helpers. */
export type BattleScriptBattleTopology = Readonly<{
  battlersCount: BattleScriptBattlersCount;
  battleTypeFlags: number;
  battlerPositions: BattleScriptBattlerPositions;
}>;

/**
 * First durable source-shaped Battle Script rules slice.
 *
 * The four indexed battlers mirror the source's MAX_BATTLERS_COUNT arrays.
 * The scalar move-value fields are exactly the u8/u32 globals mutated by
 * MoveValuesCleanUp. The selector bindings cover only roles observed at
 * opcodes 100-102. Null means the surrounding action has not supplied that
 * source role.
 */
export type BattleScriptRulesContext = Readonly<
  BattleScriptMoveValuesRulesContext & BattleScriptSetByteRulesContext & {
    battlers: BattleScriptRulesBattlers;
    selectorRoles: BattleScriptSelectorRoleBindings;
    scriptingBattler: BattleScriptBattlerId;
    /** Source u8 gBattleScripting.battlerWithAbility, written by successful jumpifability checks. */
    battlerWithAbility: BattleScriptBattlerId;
    atkCancelerTracker: number;
    battleOutcome: number;
    currentMove: number;
    currentMoveEffect: number;
    currentMovePower: number;
    currentMovePosition: number;
    /** Source u8 gBattleEnvironment, initialized from BattleSetup_GetEnvironmentId before battle controllers. */
    gBattleEnvironment: number;
    /** Source u8 gLastUsedAbility. */
    lastUsedAbility: number;
    multiHitCounter: number;
    /**
     * Source u8 gBattleScripting.multihitString[4] (`sMULTIHIT_STRING + 4`,
     * `include/constants/battle_script_commands.h:260`) -- the hits-landed
     * counter every multi-hit family script's own `BattleScript_DoMultiHit`
     * shared tail increments unconditionally (`addbyte sMULTIHIT_STRING + 4,
     * 1`, real for MULTI_HIT/DOUBLE_HIT/TWINEEDLE too, not Triple-Kick-only
     * as docs/roar-multihit-registration-scout.md §1d's own table
     * characterized it -- found live this session running the committed
     * script rather than trusting the dossier).
     */
    multiHitStringCounter: number;
    multistringChooser: number;
    /** Source u16 gBattleScripting.animArg1 -- the only field Cmd_playanimation's sB_ANIM_ARG1 operand dereferences (animArg2 is never read by playanimation). */
    animArg1: number;
    battleMoveDamage: number;
    /** Source s32 gBattleScripting.painSplitHp scratch. */
    painSplitHp: number;
    /** Source u16 gDynamicBasePower, read by Cmd_damagecalc as its power override. */
    dynamicBasePower: number;
    /** Source s32 gHpDealt -- Cmd_datahpupdate's real-damage-dealt bookkeeping. */
    hpDealt: number;
    /** Source s32 gBideDmg[MAX_BATTLERS_COUNT]. */
    bideDmg: BattleScriptBideDamageByBattler;
    /** Source u8 gBideTarget[MAX_BATTLERS_COUNT], validated to battler ids. */
    bideTarget: BattleScriptBideTargetByBattler;
    /** Source s32 gBattleScripting.bideDmg. */
    scriptingBideDmg: number;
    /** Source u8 gAbsentBattlerFlags, limited to the four battler bits. */
    absentBattlerFlags: number;
    /** Source u16 gCalledMove, distinct from both current and chosen move. */
    calledMove: number;
    /** Source u16 gChosenMove, distinct from gCurrentMove. */
    chosenMove: number;
    /** Source u8 gBattleStruct->chosenMovePositions[MAX_BATTLERS_COUNT]. */
    chosenMovePositions: BattleScriptMoveEndBytes;
    /** Source u16 gLockedMoves[MAX_BATTLERS_COUNT]. */
    lockedMoves: BattleScriptMoveEndHalfwords;
    /** Source four-bit gDisableStructs[battler].rolloutTimerStartValue. */
    rolloutTimerStartValues: BattleScriptMoveEndBytes;
    /** Source u16 gBattleStruct->choicedMove[MAX_BATTLERS_COUNT]. */
    choicedMove: BattleScriptMoveEndHalfwords;
    /** Source u16 gBattleStruct->changedItems[MAX_BATTLERS_COUNT]. */
    changedItems: BattleScriptMoveEndHalfwords;
    /** Source gWishFutureKnock.knockedOffMons[NUM_BATTLE_SIDES], one six-party-slot mask per side. */
    knockedOffMons: readonly [number, number];
    /**
     * Source u8 gBattleStruct->monToSwitchIntoId[MAX_BATTLERS_COUNT] --
     * PARTY_SIZE (6) is the "undecided" sentinel; 0-5 is a resolved bench
     * slot. Written by openpartyscreen's AI branch
     * (docs/forced-switch-ground-truth.md §1a row 1, §4 slice 2).
     */
    monToSwitchIntoId: BattleScriptMoveEndHalfwords;
    /** Source u8 gBattleStruct->absentBattlerFlags, separate from the global mask. */
    battleStructAbsentBattlerFlags: number;
    /**
     * Source u8 gBattleStruct->alreadyStatusedMoveAttempt, per-battler bits
     * (Cmd_various's VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT case,
     * battleScriptSwitchinOpcode.ts). Only ever read by Battle Arena
     * (battle_arena.c:594), a facility this engine does not model -- tracked
     * anyway so BattleScript_RestIsAlreadyAsleep's own
     * setalreadystatusedmoveattempt write is exact rather than skipped.
     */
    alreadyStatusedMoveAttempt: number;
    /** Source u8 gBattleStruct->dynamicMoveType. */
    dynamicMoveType: number;
    /** Source u8 gEnigmaBerries[MAX_BATTLERS_COUNT].holdEffect values. */
    enigmaBerryHoldEffects: BattleScriptMoveEndBytes;
    /** Source-shaped move histories used only by move-end states 14 and 15. */
    moveHistory: BattleScriptMoveHistory;
    /** Source gBattlersCount, gBattleTypeFlags, and gBattlerPositions[4]. */
    battleTopology: BattleScriptBattleTopology;
    /**
     * Source gPlayerParty/gEnemyParty, narrowed to the three fields
     * Cmd_checkteamslost reads. datahpupdate's active-battler HP write keeps
     * the slot at that battler's partyIndex in sync (battleScriptHitChainOpcode.ts).
     */
    party: BattleScriptPartyBySide;
    /**
     * Source u32 gSideStatuses[2]. Originally narrowed to the
     * SIDE_STATUS_SAFEGUARD bit SetMoveEffect reads; widened by the screens/
     * weather setter registration (docs/screens-weather-ground-truth.md §2)
     * to genuinely carry REFLECT/LIGHTSCREEN/MIST too, now that
     * Cmd_setreflect/setlightscreen/setmist/setsafeguard are real writers.
     * SIDE_STATUS_SPIKES and its transient SPIKES_DAMAGED guard are also
     * modeled by trysetspikes/switchineffects. Other unregistered bits still
     * have no source writer in this engine.
     */
    sideStatuses: readonly [number, number];
    /** Source u8 gSideTimers[side].mistTimer -- ChangeStatBuffs' own Mist guard (0 = inactive). */
    mistTimers: readonly [number, number];
    /**
     * Source struct SideTimer's remaining fields this engine tracks
     * (include/battle.h:149-174, docs/screens-weather-ground-truth.md §2):
     * reflect/lightscreen/safeguard's own timers + the battlerId each
     * Cmd_set* stamps (`gSideTimers[side].reflectBattlerId = gBattlerAttacker`
     * etc.), read back by DoFieldEndTurnEffects' own end-turn cases to
     * reassign BS_ATTACKER for the wear-off script. mistBattlerId is kept
     * here (not beside mistTimers above) since Cmd_setmist writes it too but
     * no pre-existing reader needed it before that registration. Follow Me's
     * timer/target are also carried here for Cmd_setforcedtarget, the existing
     * source-shaped GetMoveTarget reader, and the generic turn-tail cleanup.
     * spikesAmount is the persistent layer counter paired with sideStatuses.
     */
    sideTimers: readonly [BattleScriptSideTimerState, BattleScriptSideTimerState];
    /** Source u32 gBattleWeather. */
    weather: number;
    /** Source u8 gWishFutureKnock.weatherDuration -- the one shared weather timer every Cmd_set<weather> writes (include/battle.h:172, byte offset 0x28). */
    weatherTimer: number;
    /** Source gWishFutureKnock.wishCounter[MAX_BATTLERS_COUNT], owned by positional battler slots. */
    wishCounter: readonly [number, number, number, number];
    /** Source gWishFutureKnock.wishMonId[MAX_BATTLERS_COUNT], the setup-time party index for each positional Wish. */
    wishMonId: readonly [number, number, number, number];
    /** Source gWishFutureKnock delayed-attack arrays, keyed by positional battler slot. */
    futureSightCounter: readonly [number, number, number, number];
    futureSightMove: readonly [number, number, number, number];
    futureSightAttacker: readonly [number, number, number, number];
    futureSightDmg: readonly [number, number, number, number];
    /** Typed form of PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1, battler, partyIndex). */
    battleTextBuff1MonNick: BattleScriptPreparedMonNick | null;
    /** Typed form of PREPARE_BYTE_NUMBER_BUFFER(gBattleTextBuff1, 1, value). */
    battleTextBuff1ByteNumber: number | null;
    /** Typed form of PREPARE_MOVE_BUFFER(gBattleTextBuff1, move). */
    battleTextBuff1Move: number | null;
    /** Typed form of PREPARE_BYTE_NUMBER_BUFFER(gBattleTextBuff2, 1, value). */
    battleTextBuff2ByteNumber: number | null;
    /**
     * Source gBattlerByTurnOrder[MAX_BATTLERS_COUNT] -- populated by
     * `ENDTURN_ORDER`'s `GetWhoStrikesFirst` insertion sort
     * (`docs/end-turn-ground-truth.md` §1a) before the field loop runs;
     * `Cmd_copyarraywithindex`'s own read in
     * `BattleScript_DamagingWeatherLoop` (doc §1c) is this field's only
     * reader. Defaults to ascending battler id, matching
     * `computeBattlerOrder`'s own documented simplification
     * (`battleEndTurnOrchestration.ts`) -- this engine has no speed model in
     * `BattleScriptRulesContext` yet.
     */
    battlerByTurnOrder: readonly [number, number, number, number];
    /**
     * Source u8 gCurrentTurnActionNumber (battle_main.c:162) -- the action
     * index of the currently-executing battler's script. Paired with each
     * battler's own turnOrderNum (see BattleScriptRulesBattlerBase) by
     * SetMoveEffect's MOVE_EFFECT_FLINCH case. The full-turn reducer
     * (factoryBattleScriptFullTurnDecision.ts) is the one owner of real
     * per-action values (0 for the first mover's action, 1 for the second);
     * every other construction site defaults to 0 alongside turnOrderNum's
     * own default of 1.
     */
    currentTurnActionNumber: number;
  }
>;

export type BattleScriptRulesContextInput = Readonly<{
  battlers: readonly BattleScriptRulesBattler[];
  selectorRoles?: Readonly<{
    attacker?: BattleScriptBattlerId | null;
    target?: BattleScriptBattlerId | null;
    effectBattler?: BattleScriptBattlerId | null;
    fainted?: BattleScriptBattlerId | null;
  }>;
  scriptingBattler: BattleScriptBattlerId;
  battlerWithAbility?: BattleScriptBattlerId;
  atkCancelerTracker: number;
  battleOutcome: number;
  currentMove: number;
  currentMovePosition: number;
  /** Legacy focused inputs default here; production Factory inputs explicitly supply BUILDING. */
  gBattleEnvironment?: number;
  lastUsedAbility?: number;
  moveResultFlags: number;
  dmgMultiplier: number;
  critMultiplier: number;
  moveEffectByte: number;
  missType: number;
  hitMarker: number;
  multiHitCounter: number;
  multistringChooser?: number;
  battleMoveDamage?: number;
  painSplitHp?: number;
  dynamicBasePower?: number;
  hpDealt?: number;
  bideDmg?: readonly number[];
  bideTarget?: readonly BattleScriptBattlerId[];
  scriptingBideDmg?: number;
  absentBattlerFlags?: number;
  calledMove?: number;
  chosenMove?: number;
  chosenMovePositions?: readonly number[];
  lockedMoves?: readonly number[];
  rolloutTimerStartValues?: readonly number[];
  choicedMove?: readonly number[];
  changedItems?: readonly number[];
  knockedOffMons?: readonly [number?, number?];
  monToSwitchIntoId?: readonly number[];
  battleStructAbsentBattlerFlags?: number;
  alreadyStatusedMoveAttempt?: number;
  dynamicMoveType?: number;
  enigmaBerryHoldEffects?: readonly number[];
  moveHistory?: Readonly<{
    lastPrintedMoves?: readonly number[];
    lastMoves?: readonly number[];
    lastResultingMoves?: readonly number[];
    lastLandedMoves?: readonly number[];
    lastHitByType?: readonly number[];
    lastHitBy?: readonly number[];
    lastTakenMove?: readonly number[];
    lastTakenMoveFrom?: readonly number[];
  }>;
  battleTopology?: Readonly<{
    battlersCount: BattleScriptBattlersCount;
    battleTypeFlags: number;
    battlerPositions: readonly number[];
  }>;
  battleCommunication0?: number;
  battleCommunication1?: number;
  animTargetsHit?: number;
  animTurn?: number;
  giveExpState?: number;
  learnMoveState?: number;
  lvlBoxState?: number;
  moveendState?: number;
  multiHitEffect?: number;
  statChanger?: number;
  statAnimPlayed?: number;
  animArg1?: number;
  tripleKickPower?: number;
  multiHitStringCounter?: number;
  twoTurnStringId?: number;
  /** Omitted slots default to species 0 (empty) -- Cmd_checkteamslost's own species-nonzero gate excludes them. */
  party?: Readonly<{
    player?: readonly BattleScriptPartyMemberInput[];
    opponent?: readonly BattleScriptPartyMemberInput[];
  }>;
  sideStatuses?: readonly [number?, number?];
  mistTimers?: readonly [number?, number?];
  sideTimers?: readonly [BattleScriptSideTimerInput?, BattleScriptSideTimerInput?];
  weather?: number;
  weatherTimer?: number;
  wishCounter?: readonly number[];
  wishMonId?: readonly number[];
  futureSightCounter?: readonly number[];
  futureSightMove?: readonly number[];
  futureSightAttacker?: readonly number[];
  futureSightDmg?: readonly number[];
  battleTextBuff1MonNick?: BattleScriptPreparedMonNick | null;
  battleTextBuff1ByteNumber?: number | null;
  battleTextBuff1Move?: number | null;
  battleTextBuff2ByteNumber?: number | null;
  battlerByTurnOrder?: readonly number[];
  currentTurnActionNumber?: number;
}>;

export type BattleScriptPartyMemberInput = Readonly<{
  species?: number;
  isEgg?: boolean;
  abilityNum?: number;
  hp?: number;
  status1?: number;
  item?: number;
  moves?: readonly [number?, number?, number?, number?];
  pp?: readonly [number?, number?, number?, number?];
}>;

function requireUnsigned(value: number, maximum: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} must be an unsigned integer <= ${maximum}, got ${value}`);
  }
  return value;
}

function requireSigned32(value: number, field: string): number {
  if (
    !Number.isSafeInteger(value)
    || value < -0x8000_0000
    || value > 0x7fff_ffff
  ) {
    throw new Error(`${field} must be a signed 32-bit integer, got ${value}`);
  }
  return value | 0;
}

function requireSigned8(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < -0x80 || value > 0x7f) {
    throw new Error(`${field} must be a signed 8-bit integer, got ${value}`);
  }
  return value;
}

function createBattleScriptSpecialStatus(
  value: BattleScriptRulesBattler["specialStatus"],
  battler: number,
): BattleScriptSpecialStatus {
  if (
    value !== undefined
    && (
      value === null
      || typeof value !== "object"
      || Array.isArray(value)
    )
  ) {
    throw new Error(`battlers[${battler}].specialStatus must be a plain object`);
  }
  return Object.freeze({
    restoredBattlerSprite: requireUnsigned(
      value?.restoredBattlerSprite ?? 0,
      1,
      `battlers[${battler}].specialStatus.restoredBattlerSprite`,
    ) as 0 | 1,
    physicalDmg: requireSigned32(
      value?.physicalDmg ?? 0,
      `battlers[${battler}].specialStatus.physicalDmg`,
    ),
    specialDmg: requireSigned32(
      value?.specialDmg ?? 0,
      `battlers[${battler}].specialStatus.specialDmg`,
    ),
    shellBellDmg: requireSigned32(
      value?.shellBellDmg ?? 0,
      `battlers[${battler}].specialStatus.shellBellDmg`,
    ),
  });
}

type GeneratedMoveEffectRow = Readonly<{
  id: number;
  effectId: number;
}>;

type GeneratedMovePowerRow = Readonly<{
  id: number;
  power: number;
}>;

type GeneratedMoveTypeRow = Readonly<{
  id: number;
  type: string;
  flags: readonly string[];
  target: readonly string[];
}>;

type GeneratedItemHoldEffectRow = Readonly<{
  itemId: number;
  holdEffectId: number;
  holdEffectParam: number;
}>;

type GeneratedMoveBasePpRow = Readonly<{
  id: number;
  pp: number;
}>;

// include/constants/pokemon.h:6-23. The order is the numeric TYPE_* ABI.
const BATTLE_SCRIPT_MOVE_TYPE_IDS = new Map<string, number>([
  "TYPE_NORMAL",
  "TYPE_FIGHTING",
  "TYPE_FLYING",
  "TYPE_POISON",
  "TYPE_GROUND",
  "TYPE_ROCK",
  "TYPE_BUG",
  "TYPE_GHOST",
  "TYPE_STEEL",
  "TYPE_MYSTERY",
  "TYPE_FIRE",
  "TYPE_WATER",
  "TYPE_GRASS",
  "TYPE_ELECTRIC",
  "TYPE_PSYCHIC",
  "TYPE_ICE",
  "TYPE_DRAGON",
  "TYPE_DARK",
].map((name, id) => [name, id]));

const GENERATED_MOVE_EFFECTS = new Map<number, number>(
  (topologyData.moves as readonly GeneratedMoveEffectRow[]).map(
    ({ id, effectId }) => [id, effectId],
  ),
);

const GENERATED_MOVE_POWERS = new Map<number, number>(
  (movesData.moves as readonly GeneratedMovePowerRow[]).map(
    ({ id, power }) => [id, requireUnsigned(power, 0xff, `gBattleMoves[${id}].power`)],
  ),
);

const GENERATED_MOVE_TYPES = new Map<number, number>(
  (movesData.moves as readonly GeneratedMoveTypeRow[]).map(({ id, type }) => {
    const typeId = BATTLE_SCRIPT_MOVE_TYPE_IDS.get(type);
    if (typeId === undefined) throw new Error(`gBattleMoves[${id}] has unknown type ${type}`);
    return [id, typeId];
  }),
);

const GENERATED_MOVE_FLAGS = new Map<number, number>(
  (movesData.moves as readonly GeneratedMoveTypeRow[]).map(({ id, flags }) => [
    id,
    flags.includes("FLAG_MIRROR_MOVE_AFFECTED")
      ? BATTLE_SCRIPT_MOVE_FLAG_MIRROR_MOVE_AFFECTED
      : 0,
  ]),
);

const BATTLE_SCRIPT_MOVE_TARGET_IDS = new Map<string, number>([
  ["MOVE_TARGET_SELECTED", 0],
  ["MOVE_TARGET_DEPENDS", 1 << 0],
  ["MOVE_TARGET_USER_OR_SELECTED", 1 << 1],
  ["MOVE_TARGET_RANDOM", 1 << 2],
  ["MOVE_TARGET_BOTH", BATTLE_SCRIPT_MOVE_TARGET_BOTH],
  ["MOVE_TARGET_USER", 1 << 4],
  ["MOVE_TARGET_FOES_AND_ALLY", 1 << 5],
  ["MOVE_TARGET_OPPONENTS_FIELD", 1 << 6],
]);

const GENERATED_MOVE_TARGETS = new Map<number, number>(
  (movesData.moves as readonly GeneratedMoveTypeRow[]).map(({ id, target }) => [
    id,
    target.reduce((mask, name) => {
      const value = BATTLE_SCRIPT_MOVE_TARGET_IDS.get(name);
      if (value === undefined) {
        throw new Error(`gBattleMoves[${id}] has unknown target ${name}`);
      }
      return mask | value;
    }, 0),
  ]),
);

const GENERATED_ITEM_HOLD_EFFECTS = new Map<number, number>(
  (itemHoldEffectsData.items as readonly GeneratedItemHoldEffectRow[]).map(
    ({ itemId, holdEffectId }) => [itemId, holdEffectId],
  ),
);

/** reference/pokeemerald/src/data/items.h's own per-item `.holdEffectParam` field (docs/endturn-abilities-items-ground-truth.md §2b: Sitrus 30, Oran 10, Berry Juice 20, Leppa 10 -- verified directly against items.h, not assumed). */
const GENERATED_ITEM_HOLD_EFFECT_PARAMS = new Map<number, number>(
  (itemHoldEffectsData.items as readonly GeneratedItemHoldEffectRow[]).map(
    ({ itemId, holdEffectParam }) => [itemId, requireUnsigned(holdEffectParam, 0xff, `gItems[${itemId}].holdEffectParam`)],
  ),
);

/** gBattleMoves[move].pp (base PP, before any PP Up bonus -- battle_util.c:3347-3373's own `CalculatePPWithBonus` input). */
const GENERATED_MOVE_BASE_PP = new Map<number, number>(
  (movesData.moves as readonly GeneratedMoveBasePpRow[]).map(
    ({ id, pp }) => [id, requireUnsigned(pp, 0xff, `gBattleMoves[${id}].pp`)],
  ),
);

/**
 * Resolves gBattleMoves[move].effect from the pinned generated source table.
 * Rules phases consume this typed context field rather than dispatching on a
 * move name, battle number, turn number, or presentation tick.
 */
export function resolveBattleScriptCurrentMoveEffect(currentMove: number): number {
  const effect = GENERATED_MOVE_EFFECTS.get(currentMove);
  if (effect === undefined) {
    throw new Error(
      `currentMove ${currentMove} has no source-derived gBattleMoves effect`,
    );
  }
  return effect;
}

/** Resolves the source u8 gBattleMoves[move].power field. */
export function resolveBattleScriptCurrentMovePower(currentMove: number): number {
  const power = GENERATED_MOVE_POWERS.get(currentMove);
  if (power === undefined) {
    throw new Error(
      `currentMove ${currentMove} has no source-derived gBattleMoves power`,
    );
  }
  return power;
}

/**
 * Exact GET_MOVE_TYPE expansion from include/battle.h:458-464.
 * A nonzero dynamic byte wins and is masked to its low six bits, including
 * F_DYNAMIC_TYPE_SET's representation of a dynamic Normal type.
 */
export function resolveBattleScriptMoveType(
  currentMove: number,
  dynamicMoveType: number,
): number {
  requireUnsigned(dynamicMoveType, 0xff, "dynamicMoveType");
  if (dynamicMoveType !== 0) return dynamicMoveType & BATTLE_SCRIPT_DYNAMIC_TYPE_MASK;
  const type = GENERATED_MOVE_TYPES.get(currentMove);
  if (type === undefined) {
    throw new Error(`currentMove ${currentMove} has no source-derived gBattleMoves type`);
  }
  return type;
}

/** Resolves the source gBattleMoves[move].flags bits needed by state 15. */
export function resolveBattleScriptMoveFlags(move: number): number {
  const flags = GENERATED_MOVE_FLAGS.get(move);
  if (flags === undefined) {
    throw new Error(`move ${move} has no source-derived gBattleMoves flags`);
  }
  return flags;
}

/** Resolves the source u8 gBattleMoves[move].target field. */
export function resolveBattleScriptMoveTarget(move: number): number {
  const target = GENERATED_MOVE_TARGETS.get(move);
  if (target === undefined) {
    throw new Error(`move ${move} has no source-derived gBattleMoves target`);
  }
  return target;
}

/** Source GetBattlerPosition: direct indexing into gBattlerPositions. */
export function resolveBattleScriptBattlerPosition(
  topology: BattleScriptBattleTopology,
  battler: BattleScriptBattlerId,
): number {
  return topology.battlerPositions[battler];
}

/**
 * Source GetBattlerAtPosition: scan only i < gBattlersCount and return the
 * count sentinel when no active battler occupies the requested position.
 */
export function resolveBattleScriptBattlerAtPosition(
  topology: BattleScriptBattleTopology,
  position: number,
): number {
  requireUnsigned(position, 0xff, "position");
  for (let battler = 0; battler < topology.battlersCount; battler += 1) {
    if (topology.battlerPositions[battler] === position) return battler;
  }
  return topology.battlersCount;
}

/** Exact BATTLE_PARTNER(GetBattlerPosition(battler)) source composition. */
export function resolveBattleScriptBattlerPartner(
  topology: BattleScriptBattleTopology,
  battler: BattleScriptBattlerId,
): number {
  return resolveBattleScriptBattlerAtPosition(
    topology,
    resolveBattleScriptBattlerPosition(topology, battler) ^ 2,
  );
}

/** Exact battle_util.c:890-905 WasUnableToUseMove predicate. */
export function wasBattleScriptBattlerUnableToUseMove(
  context: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): boolean {
  const protect = context.battlers[battler];
  return (protect.prlzImmobility ?? 0) !== 0
    || protect.targetNotAffected !== 0
    || protect.usedImprisonedMove !== 0
    || (protect.loveImmobility ?? 0) !== 0
    || protect.usedDisabledMove !== 0
    || protect.usedTauntedMove !== 0
    || protect.flag2Unknown !== 0
    || protect.flinchImmobility !== 0
    || (protect.confusionSelfDmg ?? 0) !== 0;
}

/**
 * Pure durable portion of MOVEEND_SUBSTITUTE. It deliberately neither
 * advances moveendState nor participates in the opcode's loop.
 */
export function applyBattleScriptMoveEndSubstituteOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  let changed = false;
  const battlers = context.battlers.map((battler, index) => {
    if (
      index >= context.battleTopology.battlersCount
      || battler.substituteHP !== 0
      || (battler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) === 0
    ) {
      return battler;
    }
    changed = true;
    return Object.freeze({
      ...battler,
      status2: (battler.status2 & ~BATTLE_SCRIPT_STATUS2_SUBSTITUTE) >>> 0,
    });
  }) as unknown as BattleScriptRulesBattlers;
  return changed
    ? Object.freeze({ ...context, battlers: Object.freeze(battlers) })
    : context;
}

export type BattleScriptMoveEndNextTargetResolution =
  | Readonly<{
    kind: "advance";
    hitMarker: number;
    reason: "not-both-target-replay" | "partner-fainted";
  }>
  | Readonly<{
    kind: "replay-partner";
    targetBattler: BattleScriptBattlerId;
    hitMarker: number;
    /** The later opcode implementation must perform cleanup and script transfer. */
    transferRemainder: "cleanup-move-values-and-transfer-effect-script";
  }>;

/**
 * Pure prerequisites and topology resolution for MOVEEND_NEXT_TARGET.
 * Controller-free script stack/PC transfer and MoveValuesCleanUp stay out.
 */
export function resolveBattleScriptMoveEndNextTarget(
  context: BattleScriptRulesContext,
): BattleScriptMoveEndNextTargetResolution {
  const attacker = context.selectorRoles.attacker;
  const target = context.selectorRoles.target;
  if (attacker === null || target === null) {
    throw new Error("next-target resolution requires attacker and target battlers");
  }
  const canReplay =
    (context.hitMarker & BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) === 0
    && (context.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0
    && context.battlers[attacker].chargingTurn === 0
    && resolveBattleScriptMoveTarget(context.currentMove) === BATTLE_SCRIPT_MOVE_TARGET_BOTH
    && (context.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING) === 0;
  if (!canReplay) {
    return Object.freeze({
      kind: "advance",
      hitMarker: context.hitMarker,
      reason: "not-both-target-replay",
    });
  }

  const partner = resolveBattleScriptBattlerPartner(context.battleTopology, target);
  if (!isBattleScriptBattlerId(partner)) {
    throw new Error(`target partner position resolved to source sentinel ${partner}`);
  }
  const hitMarker = (
    context.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
  ) >>> 0;
  if (context.battlers[partner].hp === 0) {
    return Object.freeze({ kind: "advance", hitMarker, reason: "partner-fainted" });
  }
  return Object.freeze({
    kind: "replay-partner",
    targetBattler: partner,
    hitMarker,
    transferRemainder: "cleanup-move-values-and-transfer-effect-script",
  });
}

function replaceMoveEndArrayValue(
  values: BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes,
  index: BattleScriptBattlerId,
  value: number,
): BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes {
  if (values[index] === value) return values;
  return Object.freeze(values.map((entry, entryIndex) =>
    entryIndex === index ? value : entry
  )) as BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes;
}

function normalizedOriginallyUsedMove(chosenMove: number): number {
  return chosenMove === BATTLE_SCRIPT_MOVE_UNAVAILABLE
    ? BATTLE_SCRIPT_MOVE_NONE
    : chosenMove;
}

/**
 * Pure durable reducer for MOVEEND_UPDATE_LAST_MOVES. It performs the source
 * swap before all indexed writes and advances only the already-owned state.
 */
export function applyBattleScriptMoveEndUpdateLastMovesOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  let attacker = context.selectorRoles.attacker;
  let target = context.selectorRoles.target;
  if (attacker === null || target === null) {
    throw new Error("update-last-moves ownership requires attacker and target battlers");
  }
  let hitMarker = context.hitMarker;
  let selectorRoles = context.selectorRoles;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET) !== 0) {
    [attacker, target] = [target, attacker];
    selectorRoles = Object.freeze({ ...selectorRoles, attacker, target });
    hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET) >>> 0;
  }

  let {
    lastPrintedMoves,
    lastMoves,
    lastResultingMoves,
    lastLandedMoves,
    lastHitByType,
    lastHitBy,
  } = context.moveHistory;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) !== 0) {
    lastPrintedMoves = replaceMoveEndArrayValue(
      lastPrintedMoves,
      attacker,
      context.chosenMove,
    ) as BattleScriptMoveEndHalfwords;
  }

  const attackerBit = 1 << attacker;
  const originallyUsedMove = normalizedOriginallyUsedMove(context.chosenMove);
  if (
    (context.absentBattlerFlags & attackerBit) === 0
    && (context.battleStructAbsentBattlerFlags & attackerBit) === 0
    && resolveBattleScriptCurrentMoveEffect(originallyUsedMove)
      !== BATTLE_SCRIPT_EFFECT_BATON_PASS
  ) {
    const obeys = (hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS) !== 0;
    lastMoves = replaceMoveEndArrayValue(
      lastMoves,
      attacker,
      obeys ? context.chosenMove : BATTLE_SCRIPT_MOVE_UNAVAILABLE,
    ) as BattleScriptMoveEndHalfwords;
    lastResultingMoves = replaceMoveEndArrayValue(
      lastResultingMoves,
      attacker,
      obeys ? context.currentMove : BATTLE_SCRIPT_MOVE_UNAVAILABLE,
    ) as BattleScriptMoveEndHalfwords;

    const targetFaintedMask = ((1 << target) << 28) >>> 0;
    if ((hitMarker & targetFaintedMask) === 0) {
      lastHitBy = replaceMoveEndArrayValue(
        lastHitBy,
        target,
        attacker,
      ) as BattleScriptMoveEndBytes;
    }

    if (obeys && (context.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0) {
      lastLandedMoves = replaceMoveEndArrayValue(
        lastLandedMoves,
        target,
        context.chosenMove === BATTLE_SCRIPT_MOVE_UNAVAILABLE
          ? context.chosenMove
          : context.currentMove,
      ) as BattleScriptMoveEndHalfwords;
      if (context.chosenMove !== BATTLE_SCRIPT_MOVE_UNAVAILABLE) {
        lastHitByType = replaceMoveEndArrayValue(
          lastHitByType,
          target,
          resolveBattleScriptMoveType(context.currentMove, context.dynamicMoveType),
        ) as BattleScriptMoveEndHalfwords;
      }
    } else {
      lastLandedMoves = replaceMoveEndArrayValue(
        lastLandedMoves,
        target,
        BATTLE_SCRIPT_MOVE_UNAVAILABLE,
      ) as BattleScriptMoveEndHalfwords;
    }
  }

  const historyChanged =
    lastPrintedMoves !== context.moveHistory.lastPrintedMoves
    || lastMoves !== context.moveHistory.lastMoves
    || lastResultingMoves !== context.moveHistory.lastResultingMoves
    || lastLandedMoves !== context.moveHistory.lastLandedMoves
    || lastHitByType !== context.moveHistory.lastHitByType
    || lastHitBy !== context.moveHistory.lastHitBy;
  return Object.freeze({
    ...context,
    selectorRoles,
    hitMarker,
    moveendState: context.moveendState + 1,
    moveHistory: historyChanged
      ? Object.freeze({
        ...context.moveHistory,
        lastPrintedMoves,
        lastMoves,
        lastResultingMoves,
        lastLandedMoves,
        lastHitByType,
        lastHitBy,
      })
      : context.moveHistory,
  });
}

/**
 * Pure durable reducer for MOVEEND_MIRROR_MOVE. The packed buffers retain the
 * source's little-endian target and [target][attacker] byte addressing.
 */
export function applyBattleScriptMoveEndMirrorMoveOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  const attacker = context.selectorRoles.attacker;
  const target = context.selectorRoles.target;
  if (attacker === null || target === null) {
    throw new Error("mirror-move ownership requires attacker and target battlers");
  }
  const originallyUsedMove = normalizedOriginallyUsedMove(context.chosenMove);
  const targetFaintedMask = ((1 << target) << 28) >>> 0;
  const applies = (context.absentBattlerFlags & (1 << attacker)) === 0
    && (context.battleStructAbsentBattlerFlags & (1 << attacker)) === 0
    && (
      resolveBattleScriptMoveFlags(originallyUsedMove)
      & BATTLE_SCRIPT_MOVE_FLAG_MIRROR_MOVE_AFFECTED
    ) !== 0
    && (context.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS) !== 0
    && attacker !== target
    && (context.hitMarker & targetFaintedMask) === 0
    && (context.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0;

  if (!applies) {
    return Object.freeze({ ...context, moveendState: context.moveendState + 1 });
  }
  const lastTakenMove = [...context.moveHistory.lastTakenMove];
  lastTakenMove[target * 2] = context.chosenMove & 0xff;
  lastTakenMove[target * 2 + 1] = context.chosenMove >>> 8;
  const lastTakenMoveFrom = [...context.moveHistory.lastTakenMoveFrom];
  const fromOffset = target * 8 + attacker * 2;
  lastTakenMoveFrom[fromOffset] = context.chosenMove & 0xff;
  lastTakenMoveFrom[fromOffset + 1] = context.chosenMove >>> 8;
  return Object.freeze({
    ...context,
    moveendState: context.moveendState + 1,
    moveHistory: Object.freeze({
      ...context.moveHistory,
      lastTakenMove: Object.freeze(lastTakenMove),
      lastTakenMoveFrom: Object.freeze(lastTakenMoveFrom),
    }),
  });
}

/**
 * Cmd_moveend's source lookup at battle_script_commands.c:4228-4231.
 * Items without an explicit source holdEffect have the C initializer's zero.
 */
export function resolveBattleScriptBattlerHoldEffect(
  context: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): number {
  const item = context.battlers[battler].item;
  if (item >= BATTLE_SCRIPT_ITEMS_COUNT) {
    throw new Error(`item ${item} is outside the source gItems corpus`);
  }
  return item === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY
    ? context.enigmaBerryHoldEffects[battler]
    : (GENERATED_ITEM_HOLD_EFFECTS.get(item) ?? 0);
}

/**
 * `battlerHoldEffectParam` (`GetItemHoldEffectParam`, `battle_util.c:3300`) --
 * the per-item amount `HOLD_EFFECT_RESTORE_HP`/`RESTORE_PP` read directly
 * (doc §2b/§5 slice 4 follow-up). No Enigma Berry special case: unlike
 * `resolveBattleScriptBattlerHoldEffect`, source's own Enigma-Berry param
 * comes from a separate in-battle struct (`gEnigmaBerries[battler]`) this
 * engine does not model at all -- moot, since no Enigma Berry is
 * Factory-legal (doc §1c), so this plain item-table lookup is exact for
 * every real carrier.
 */
export function resolveBattleScriptBattlerHoldEffectParam(
  context: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): number {
  const item = context.battlers[battler].item;
  if (item >= BATTLE_SCRIPT_ITEMS_COUNT) {
    throw new Error(`item ${item} is outside the source gItems corpus`);
  }
  return GENERATED_ITEM_HOLD_EFFECT_PARAMS.get(item) ?? 0;
}

/** Resolves the source u8 gBattleMoves[move].pp field (base PP, no PP Up bonus -- see resolveBattleScriptBattlerHoldEffectParam's own caller for why Factory rentals never carry one). */
export function resolveBattleScriptMoveBasePp(move: number): number {
  const pp = GENERATED_MOVE_BASE_PP.get(move);
  if (pp === undefined) {
    throw new Error(`move ${move} has no source-derived gBattleMoves pp`);
  }
  return pp;
}

/**
 * Pure durable-state portion of MOVEEND_CHOICE_MOVE
 * (battle_script_commands.c:4296-4317). It intentionally owns no move-end
 * cursor, opcode dispatch, controller, item-effect, or history behavior.
 */
export function applyBattleScriptMoveEndChoiceOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  const attacker = context.selectorRoles.attacker;
  if (attacker === null) throw new Error("choice ownership requires an attacker battler");
  let choice = context.choicedMove[attacker];
  if (
    (context.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS) !== 0
    && resolveBattleScriptBattlerHoldEffect(context, attacker)
      === BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND
    && context.chosenMove !== BATTLE_SCRIPT_MOVE_STRUGGLE
    && (choice === BATTLE_SCRIPT_MOVE_NONE || choice === BATTLE_SCRIPT_MOVE_UNAVAILABLE)
  ) {
    // Source breaks out of the case before its stale-choice cleanup.
    if (
      context.chosenMove === BATTLE_SCRIPT_MOVE_BATON_PASS
      && (context.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_FAILED) === 0
    ) {
      return context;
    }
    choice = context.chosenMove;
  }
  if (!context.battlers[attacker].moves.includes(choice)) {
    choice = BATTLE_SCRIPT_MOVE_NONE;
  }
  if (choice === context.choicedMove[attacker]) return context;
  const choicedMove = Object.freeze(
    context.choicedMove.map((move, battler) => battler === attacker ? choice : move),
  ) as unknown as BattleScriptMoveEndHalfwords;
  return Object.freeze({ ...context, choicedMove });
}

/**
 * Pure durable-state portion of MOVEEND_CHANGED_ITEMS
 * (battle_script_commands.c:4318-4329). Cardinality comes from the exact
 * immutable gBattlersCount topology owner.
 */
export function applyBattleScriptMoveEndChangedItemOwnership(
  context: BattleScriptRulesContext,
): BattleScriptRulesContext {
  const { battlersCount } = context.battleTopology;
  let changed = false;
  const battlers = context.battlers.map((battler, index) => {
    const item = index < battlersCount ? context.changedItems[index] : BATTLE_SCRIPT_MOVE_NONE;
    if (item === BATTLE_SCRIPT_MOVE_NONE) return battler;
    changed = true;
    return Object.freeze({ ...battler, item });
  }) as unknown as BattleScriptRulesBattlers;
  if (!changed) return context;
  const changedItems = Object.freeze(
    context.changedItems.map((item, index) =>
      index < battlersCount && item !== BATTLE_SCRIPT_MOVE_NONE
        ? BATTLE_SCRIPT_MOVE_NONE
        : item
    ),
  ) as unknown as BattleScriptMoveEndHalfwords;
  return Object.freeze({
    ...context,
    battlers: Object.freeze(battlers),
    changedItems,
  });
}

function createMoveEndArray(
  input: readonly number[] | undefined,
  maximum: number,
  field: string,
): BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes {
  const values = input ?? [0, 0, 0, 0];
  if (!Array.isArray(values) || values.length !== 4) {
    throw new Error(`${field} must contain exactly four values`);
  }
  values.forEach((value, index) =>
    requireUnsigned(value, maximum, `${field}[${index}]`)
  );
  if (Object.isFrozen(values)) {
    return values as unknown as
      BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes;
  }
  return Object.freeze([...values]) as
    BattleScriptMoveEndHalfwords | BattleScriptMoveEndBytes;
}

function createMoveEndByteBuffer(
  input: readonly number[] | undefined,
  length: number,
  field: string,
): readonly number[] {
  const values = input ?? new Array<number>(length).fill(0);
  if (!Array.isArray(values) || values.length !== length) {
    throw new Error(`${field} must contain exactly ${length} bytes`);
  }
  values.forEach((value, index) => requireUnsigned(value, 0xff, `${field}[${index}]`));
  return Object.isFrozen(values) ? values : Object.freeze([...values]);
}

function createBattleScriptMoveHistory(
  input: BattleScriptRulesContextInput["moveHistory"],
): BattleScriptMoveHistory {
  return Object.freeze({
    lastPrintedMoves: createMoveEndArray(
      input?.lastPrintedMoves,
      0xffff,
      "moveHistory.lastPrintedMoves",
    ) as BattleScriptMoveEndHalfwords,
    lastMoves: createMoveEndArray(
      input?.lastMoves,
      0xffff,
      "moveHistory.lastMoves",
    ) as BattleScriptMoveEndHalfwords,
    lastResultingMoves: createMoveEndArray(
      input?.lastResultingMoves,
      0xffff,
      "moveHistory.lastResultingMoves",
    ) as BattleScriptMoveEndHalfwords,
    lastLandedMoves: createMoveEndArray(
      input?.lastLandedMoves,
      0xffff,
      "moveHistory.lastLandedMoves",
    ) as BattleScriptMoveEndHalfwords,
    lastHitByType: createMoveEndArray(
      input?.lastHitByType,
      0xffff,
      "moveHistory.lastHitByType",
    ) as BattleScriptMoveEndHalfwords,
    lastHitBy: createMoveEndArray(
      input?.lastHitBy,
      0xff,
      "moveHistory.lastHitBy",
    ) as BattleScriptMoveEndBytes,
    lastTakenMove: createMoveEndByteBuffer(
      input?.lastTakenMove,
      16,
      "moveHistory.lastTakenMove",
    ),
    lastTakenMoveFrom: createMoveEndByteBuffer(
      input?.lastTakenMoveFrom,
      32,
      "moveHistory.lastTakenMoveFrom",
    ),
  });
}

function createBattleScriptBattleTopology(
  input: BattleScriptRulesContextInput["battleTopology"],
): BattleScriptBattleTopology {
  const battlersCountValue = requireUnsigned(
    input?.battlersCount ?? 2,
    4,
    "battleTopology.battlersCount",
  );
  if (battlersCountValue !== 2 && battlersCountValue !== 4) {
    throw new Error(
      `battleTopology.battlersCount must be exactly 2 or 4, got ${battlersCountValue}`,
    );
  }
  const battlersCount: BattleScriptBattlersCount = battlersCountValue;
  const battleTypeFlags = requireUnsigned(
    input?.battleTypeFlags ?? 0,
    0xffff_ffff,
    "battleTopology.battleTypeFlags",
  ) >>> 0;
  const positions = input?.battlerPositions ?? [0, 1, 0xff, 0xff];
  if (!Array.isArray(positions) || positions.length !== 4) {
    throw new Error("battleTopology.battlerPositions must contain exactly four positions");
  }
  const battlerPositions = positions.map((position, battler) =>
    requireUnsigned(position, 0xff, `battleTopology.battlerPositions[${battler}]`)
  );
  const activePositions = battlerPositions.slice(0, battlersCount);
  if (activePositions.some((position) => position > 3)) {
    throw new Error("active battleTopology battler positions must be in range 0..3");
  }
  if (new Set(activePositions).size !== activePositions.length) {
    throw new Error("active battleTopology battler positions must be unique");
  }
  const isDouble = (battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0;
  if (isDouble !== (battlersCount === 4)) {
    throw new Error(
      "battleTopology BATTLE_TYPE_DOUBLE must be set if and only if battlersCount is 4",
    );
  }
  if (input !== undefined && Object.isFrozen(input) && Object.isFrozen(positions)) {
    return input as BattleScriptBattleTopology;
  }
  return Object.freeze({
    battlersCount,
    battleTypeFlags,
    battlerPositions: Object.freeze(battlerPositions) as unknown as
      BattleScriptBattlerPositions,
  });
}

const BATTLE_SCRIPT_EMPTY_PARTY_MEMBER_MOVES: BattleScriptPartyMemberMoves = Object.freeze([0, 0, 0, 0]);
const BATTLE_SCRIPT_EMPTY_PARTY_MEMBER_PP: BattleScriptPartyMemberPp = Object.freeze([0, 0, 0, 0]);

const BATTLE_SCRIPT_EMPTY_PARTY_MEMBER: BattleScriptPartyMemberState = Object.freeze({
  species: 0,
  isEgg: false,
  abilityNum: 0,
  hp: 0,
  status1: 0,
  item: 0,
  moves: BATTLE_SCRIPT_EMPTY_PARTY_MEMBER_MOVES,
  pp: BATTLE_SCRIPT_EMPTY_PARTY_MEMBER_PP,
});

function createBattleScriptPartyMemberMoves(
  input: readonly [number?, number?, number?, number?] | undefined,
  field: string,
): BattleScriptPartyMemberMoves {
  if (input === undefined) return BATTLE_SCRIPT_EMPTY_PARTY_MEMBER_MOVES;
  if (!Array.isArray(input) || input.length !== 4) {
    throw new Error(`${field} must contain exactly 4 move slots`);
  }
  return Object.freeze(
    input.map((moveId, index) => requireUnsigned(moveId ?? 0, 0xffff, `${field}[${index}]`)),
  ) as unknown as BattleScriptPartyMemberMoves;
}

function createBattleScriptPartyState(
  input: readonly BattleScriptPartyMemberInput[] | undefined,
  field: string,
): BattleScriptPartyState {
  if (input === undefined) {
    return Object.freeze(
      new Array(BATTLE_SCRIPT_PARTY_SIZE).fill(BATTLE_SCRIPT_EMPTY_PARTY_MEMBER),
    ) as unknown as BattleScriptPartyState;
  }
  if (!Array.isArray(input) || input.length !== BATTLE_SCRIPT_PARTY_SIZE) {
    throw new Error(`${field} must contain exactly ${BATTLE_SCRIPT_PARTY_SIZE} party member slots`);
  }
  return Object.freeze(
    input.map((member, index) => Object.freeze({
      species: requireUnsigned(member.species ?? 0, 0xffff, `${field}[${index}].species`),
      isEgg: Boolean(member.isEgg),
      abilityNum: requireUnsigned(member.abilityNum ?? 0, 1, `${field}[${index}].abilityNum`),
      hp: requireUnsigned(member.hp ?? 0, 0xffff, `${field}[${index}].hp`),
      status1: requireUnsigned(member.status1 ?? 0, 0xffff_ffff, `${field}[${index}].status1`) >>> 0,
      item: requireUnsigned(member.item ?? 0, 0xffff, `${field}[${index}].item`),
      moves: createBattleScriptPartyMemberMoves(member.moves, `${field}[${index}].moves`),
      pp: Object.freeze(
        createBattleScriptPartyMemberMoves(member.pp, `${field}[${index}].pp`).map(
          (value, movePosition) => requireUnsigned(value, 0xff, `${field}[${index}].pp[${movePosition}]`),
        ),
      ) as unknown as BattleScriptPartyMemberPp,
    })),
  ) as unknown as BattleScriptPartyState;
}

function createBattleScriptPartyBySide(
  input: BattleScriptRulesContextInput["party"],
): BattleScriptPartyBySide {
  return Object.freeze({
    player: createBattleScriptPartyState(input?.player, "party.player"),
    opponent: createBattleScriptPartyState(input?.opponent, "party.opponent"),
  });
}

/**
 * Cmd_datahpupdate's write-through sync point (docs/faint-outcome-ground-truth.md
 * §3.2): the active battler's real HP write also lands in the matching party
 * slot at that battler's partyIndex, keeping Cmd_checkteamslost's party-wide
 * sum consistent with the hit chain's own HP mutations.
 */
export function withBattleScriptPartyMemberHp(
  party: BattleScriptPartyBySide,
  side: 0 | 1,
  partyIndex: number,
  hp: number,
): BattleScriptPartyBySide {
  const sideKey = side === 0 ? "player" : "opponent";
  const state = party[sideKey];
  const member = state[partyIndex];
  if (member.hp === hp) return party;
  const nextState = state.map((candidate, index) =>
    index === partyIndex ? Object.freeze({ ...candidate, hp }) : candidate
  ) as unknown as BattleScriptPartyState;
  return Object.freeze({ ...party, [sideKey]: Object.freeze(nextState) });
}

/**
 * SetMoveEffect's status1 write (battle_script_commands.c:2488's
 * BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE, ...)) also lands in the
 * matching party slot, exactly mirroring withBattleScriptPartyMemberHp's
 * already-established datahpupdate sync point
 * (docs/set-move-effect-ground-truth.md §2).
 */
export function withBattleScriptPartyMemberStatus1(
  party: BattleScriptPartyBySide,
  side: 0 | 1,
  partyIndex: number,
  status1: number,
): BattleScriptPartyBySide {
  const sideKey = side === 0 ? "player" : "opponent";
  const state = party[sideKey];
  const member = state[partyIndex];
  if (member.status1 === status1) return party;
  const nextState = state.map((candidate, index) =>
    index === partyIndex ? Object.freeze({ ...candidate, status1 }) : candidate
  ) as unknown as BattleScriptPartyState;
  return Object.freeze({ ...party, [sideKey]: Object.freeze(nextState) });
}

/**
 * REQUEST_HELDITEM_BATTLE's player/opponent controller handlers write the
 * supplied u16 to the active battler's corresponding persistent party slot.
 */
export function withBattleScriptPartyMemberItem(
  party: BattleScriptPartyBySide,
  side: 0 | 1,
  partyIndex: number,
  item: number,
): BattleScriptPartyBySide {
  const sideKey = side === 0 ? "player" : "opponent";
  const state = party[sideKey];
  const member = state[partyIndex];
  if (member.item === item) return party;
  const nextState = state.map((candidate, index) =>
    index === partyIndex ? Object.freeze({ ...candidate, item }) : candidate
  ) as unknown as BattleScriptPartyState;
  return Object.freeze({ ...party, [sideKey]: Object.freeze(nextState) });
}

/** REQUEST_PPMOVE1_BATTLE + slot writes one durable party PP byte. */
export function withBattleScriptPartyMemberPp(
  party: BattleScriptPartyBySide,
  side: 0 | 1,
  partyIndex: number,
  movePosition: number,
  pp: number,
): BattleScriptPartyBySide {
  const sideKey = side === 0 ? "player" : "opponent";
  const state = party[sideKey];
  const member = state[partyIndex];
  if (member.pp[movePosition] === pp) return party;
  const nextPp = member.pp.map((value, index) =>
    index === movePosition ? pp : value
  ) as unknown as BattleScriptPartyMemberPp;
  const nextState = state.map((candidate, index) =>
    index === partyIndex
      ? Object.freeze({ ...candidate, pp: Object.freeze(nextPp) })
      : candidate
  ) as unknown as BattleScriptPartyState;
  return Object.freeze({ ...party, [sideKey]: Object.freeze(nextState) });
}

function requireRole(
  value: BattleScriptBattlerId | null | undefined,
  field: string,
): BattleScriptBattlerId | null {
  if (value === undefined || value === null) return null;
  if (!isBattleScriptBattlerId(value)) {
    throw new Error(`${field} must be a battler id 0..3, null, or omitted, got ${value}`);
  }
  return value;
}

function requireSideTimerBattlerId(
  value: BattleScriptBattlerId | undefined,
  field: string,
): BattleScriptBattlerId {
  if (value === undefined) return 0;
  if (!isBattleScriptBattlerId(value)) {
    throw new Error(`${field} must be a battler id 0..3, got ${value}`);
  }
  return value;
}

function buildSideTimerState(
  input: BattleScriptSideTimerInput | undefined,
  side: 0 | 1,
): BattleScriptSideTimerState {
  return Object.freeze({
    reflectTimer: requireUnsigned(input?.reflectTimer ?? 0, 0xff, `sideTimers[${side}].reflectTimer`),
    reflectBattlerId: requireSideTimerBattlerId(input?.reflectBattlerId, `sideTimers[${side}].reflectBattlerId`),
    lightscreenTimer: requireUnsigned(input?.lightscreenTimer ?? 0, 0xff, `sideTimers[${side}].lightscreenTimer`),
    lightscreenBattlerId: requireSideTimerBattlerId(input?.lightscreenBattlerId, `sideTimers[${side}].lightscreenBattlerId`),
    safeguardTimer: requireUnsigned(input?.safeguardTimer ?? 0, 0xff, `sideTimers[${side}].safeguardTimer`),
    safeguardBattlerId: requireSideTimerBattlerId(input?.safeguardBattlerId, `sideTimers[${side}].safeguardBattlerId`),
    mistBattlerId: requireSideTimerBattlerId(input?.mistBattlerId, `sideTimers[${side}].mistBattlerId`),
    followmeTimer: requireUnsigned(input?.followmeTimer ?? 0, 0xff, `sideTimers[${side}].followmeTimer`),
    followmeTarget: requireSideTimerBattlerId(input?.followmeTarget, `sideTimers[${side}].followmeTarget`),
    spikesAmount: requireUnsigned(input?.spikesAmount ?? 0, 0xff, `sideTimers[${side}].spikesAmount`),
  });
}

export function createBattleScriptRulesContext(
  input: BattleScriptRulesContextInput,
): BattleScriptRulesContext {
  if (!Array.isArray(input.battlers) || input.battlers.length !== 4) {
    throw new Error("Battle Script rules context must contain exactly four indexed battlers");
  }
  const battlers = input.battlers.map((battler, index) => Object.freeze({
    side: requireUnsigned(battler.side, 1, `battlers[${index}].side`) as 0 | 1,
    ability: requireUnsigned(battler.ability, 0xff, `battlers[${index}].ability`),
    hp: requireUnsigned(battler.hp, 0xffff, `battlers[${index}].hp`),
    item: requireUnsigned(battler.item ?? 0, 0xffff, `battlers[${index}].item`),
    moves: Object.freeze(
      (() => {
        if (!Array.isArray(battler.moves) || battler.moves.length !== 4) {
          throw new Error(`battlers[${index}].moves must contain exactly four move-slot values`);
        }
        return (battler.moves as readonly number[]).map((move, movePosition) =>
          requireUnsigned(
            move,
            0xffff,
            `battlers[${index}].moves[${movePosition}]`,
          )
        );
      })(),
    ) as unknown as readonly [number, number, number, number],
    pp: Object.freeze(
      (() => {
        if (!Array.isArray(battler.pp) || battler.pp.length !== 4) {
          throw new Error(`battlers[${index}].pp must contain exactly four move-slot values`);
        }
        return (battler.pp as readonly number[]).map((pp, movePosition) => requireUnsigned(
          pp,
          0xff,
          `battlers[${index}].pp[${movePosition}]`,
        ));
      })(),
    ) as unknown as readonly [number, number, number, number],
    statStages: Object.freeze(
      (() => {
        const statStages = battler.statStages
          ?? new Array<number>(BATTLE_SCRIPT_NUM_BATTLE_STATS).fill(0);
        if (
          !Array.isArray(statStages)
          || statStages.length !== BATTLE_SCRIPT_NUM_BATTLE_STATS
        ) {
          throw new Error(
            `battlers[${index}].statStages must contain exactly ${BATTLE_SCRIPT_NUM_BATTLE_STATS} signed stage values`,
          );
        }
        return statStages.map((stage, stat) =>
          requireSigned8(stage, `battlers[${index}].statStages[${stat}]`)
        );
      })(),
    ) as unknown as BattleScriptStatStages,
    status1: requireUnsigned(battler.status1, 0xffff_ffff, `battlers[${index}].status1`) >>> 0,
    status2: requireUnsigned(battler.status2, 0xffff_ffff, `battlers[${index}].status2`) >>> 0,
    status3: requireUnsigned(battler.status3, 0xffff_ffff, `battlers[${index}].status3`) >>> 0,
    specialStatus: createBattleScriptSpecialStatus(battler.specialStatus, index),
    substituteHP: requireUnsigned(
      battler.substituteHP,
      0xff,
      `battlers[${index}].substituteHP`,
    ),
    rolloutTimer: requireUnsigned(
      battler.rolloutTimer,
      0x0f,
      `battlers[${index}].rolloutTimer`,
    ),
    furyCutterCounter: requireUnsigned(
      battler.furyCutterCounter,
      0xff,
      `battlers[${index}].furyCutterCounter`,
    ),
    truantCounter: requireUnsigned(
      battler.truantCounter,
      1,
      `battlers[${index}].truantCounter`,
    ) as 0 | 1,
    rechargeTimer: requireUnsigned(
      battler.rechargeTimer,
      0xff,
      `battlers[${index}].rechargeTimer`,
    ),
    flinchImmobility: requireUnsigned(
      battler.flinchImmobility,
      1,
      `battlers[${index}].flinchImmobility`,
    ) as 0 | 1,
    disabledMove: requireUnsigned(
      battler.disabledMove,
      0xffff,
      `battlers[${index}].disabledMove`,
    ),
    disableTimer: requireUnsigned(
      battler.disableTimer ?? 0,
      0x0f,
      `battlers[${index}].disableTimer`,
    ),
    disableTimerStartValue: requireUnsigned(
      battler.disableTimerStartValue ?? 0,
      0x0f,
      `battlers[${index}].disableTimerStartValue`,
    ),
    encoreTimer: requireUnsigned(
      battler.encoreTimer ?? 0,
      0x0f,
      `battlers[${index}].encoreTimer`,
    ),
    encoredMove: requireUnsigned(
      battler.encoredMove ?? 0,
      0xffff,
      `battlers[${index}].encoredMove`,
    ),
    encoredMovePos: requireUnsigned(
      battler.encoredMovePos ?? 0,
      3,
      `battlers[${index}].encoredMovePos`,
    ),
    encoreTimerStartValue: requireUnsigned(
      battler.encoreTimerStartValue ?? 0,
      0x0f,
      `battlers[${index}].encoreTimerStartValue`,
    ),
    perishSongTimer: requireUnsigned(
      battler.perishSongTimer ?? 0,
      0x0f,
      `battlers[${index}].perishSongTimer`,
    ),
    perishSongTimerStartValue: requireUnsigned(
      battler.perishSongTimerStartValue ?? 0,
      0x0f,
      `battlers[${index}].perishSongTimerStartValue`,
    ),
    usedDisabledMove: requireUnsigned(
      battler.usedDisabledMove,
      1,
      `battlers[${index}].usedDisabledMove`,
    ) as 0 | 1,
    tauntTimer: requireUnsigned(
      battler.tauntTimer,
      0x0f,
      `battlers[${index}].tauntTimer`,
    ),
    usedTauntedMove: requireUnsigned(
      battler.usedTauntedMove,
      1,
      `battlers[${index}].usedTauntedMove`,
    ) as 0 | 1,
    usedImprisonedMove: requireUnsigned(
      battler.usedImprisonedMove,
      1,
      `battlers[${index}].usedImprisonedMove`,
    ) as 0 | 1,
    ...(battler.bounceMove === undefined ? {} : {
      bounceMove: requireUnsigned(
        battler.bounceMove,
        1,
        `battlers[${index}].bounceMove`,
      ) as 0 | 1,
    }),
    ...(battler.confusionSelfDmg === undefined ? {} : {
      confusionSelfDmg: requireUnsigned(
        battler.confusionSelfDmg,
        1,
        `battlers[${index}].confusionSelfDmg`,
      ) as 0 | 1,
    }),
    ...(battler.prlzImmobility === undefined ? {} : {
      prlzImmobility: requireUnsigned(
        battler.prlzImmobility,
        1,
        `battlers[${index}].prlzImmobility`,
      ) as 0 | 1,
    }),
    ...(battler.loveImmobility === undefined ? {} : {
      loveImmobility: requireUnsigned(
        battler.loveImmobility,
        1,
        `battlers[${index}].loveImmobility`,
      ) as 0 | 1,
    }),
    ...(battler.stealMove === undefined ? {} : {
      stealMove: requireUnsigned(
        battler.stealMove,
        1,
        `battlers[${index}].stealMove`,
      ) as 0 | 1,
    }),
    ...(battler.lightningRodRedirected === undefined ? {} : {
      lightningRodRedirected: requireUnsigned(
        battler.lightningRodRedirected,
        1,
        `battlers[${index}].lightningRodRedirected`,
      ) as 0 | 1,
    }),
    ...(battler.endured === undefined ? {} : {
      endured: requireUnsigned(battler.endured, 1, `battlers[${index}].endured`) as 0 | 1,
    }),
    ...(battler.helpingHand === undefined ? {} : {
      helpingHand: requireUnsigned(battler.helpingHand, 1, `battlers[${index}].helpingHand`) as 0 | 1,
    }),
    targetNotAffected: requireUnsigned(
      battler.targetNotAffected ?? 0,
      1,
      `battlers[${index}].targetNotAffected`,
    ) as 0 | 1,
    flag2Unknown: requireUnsigned(
      battler.flag2Unknown ?? 0,
      1,
      `battlers[${index}].flag2Unknown`,
    ) as 0 | 1,
    chargingTurn: requireUnsigned(
      battler.chargingTurn ?? 0,
      1,
      `battlers[${index}].chargingTurn`,
    ) as 0 | 1,
    protected: requireUnsigned(
      battler.protected ?? 0,
      1,
      `battlers[${index}].protected`,
    ) as 0 | 1,
    protectUses: requireUnsigned(
      battler.protectUses ?? 0,
      0xff,
      `battlers[${index}].protectUses`,
    ),
    ppNotAffectedByPressure: requireUnsigned(
      battler.ppNotAffectedByPressure ?? 0,
      1,
      `battlers[${index}].ppNotAffectedByPressure`,
    ) as 0 | 1,
    protectPhysicalDmg: requireSigned32(
      battler.protectPhysicalDmg ?? 0,
      `battlers[${index}].protectPhysicalDmg`,
    ),
    protectPhysicalBattlerId: requireUnsigned(
      battler.protectPhysicalBattlerId ?? 0,
      3,
      `battlers[${index}].protectPhysicalBattlerId`,
    ) as BattleScriptBattlerId,
    protectSpecialDmg: requireSigned32(
      battler.protectSpecialDmg ?? 0,
      `battlers[${index}].protectSpecialDmg`,
    ),
    protectSpecialBattlerId: requireUnsigned(
      battler.protectSpecialBattlerId ?? 0,
      3,
      `battlers[${index}].protectSpecialBattlerId`,
    ) as BattleScriptBattlerId,
    types: Object.freeze(
      (() => {
        const types = battler.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"];
        if (
          !Array.isArray(types)
          || types.length !== 2
          || types.some((type) => typeof type !== "string")
        ) {
          throw new Error(`battlers[${index}].types must contain exactly two type name strings`);
        }
        return [...types];
      })(),
    ) as unknown as readonly [string, string],
    species: requireUnsigned(battler.species ?? 0, 0xffff, `battlers[${index}].species`),
    ivs: Object.freeze({
      hp: requireUnsigned(battler.ivs?.hp ?? 0, 31, `battlers[${index}].ivs.hp`),
      attack: requireUnsigned(battler.ivs?.attack ?? 0, 31, `battlers[${index}].ivs.attack`),
      defense: requireUnsigned(battler.ivs?.defense ?? 0, 31, `battlers[${index}].ivs.defense`),
      speed: requireUnsigned(battler.ivs?.speed ?? 0, 31, `battlers[${index}].ivs.speed`),
      spAttack: requireUnsigned(battler.ivs?.spAttack ?? 0, 31, `battlers[${index}].ivs.spAttack`),
      spDefense: requireUnsigned(battler.ivs?.spDefense ?? 0, 31, `battlers[${index}].ivs.spDefense`),
    }),
    mimickedMoves: requireUnsigned(
      battler.mimickedMoves ?? 0,
      0x0f,
      `battlers[${index}].mimickedMoves`,
    ),
    stockpileCounter: requireUnsigned(
      battler.stockpileCounter ?? 0,
      3,
      `battlers[${index}].stockpileCounter`,
    ),
    personality: requireUnsigned(battler.personality ?? 0, 0xffff_ffff, `battlers[${index}].personality`) >>> 0,
    attack: requireUnsigned(battler.attack ?? 0, 0xffff, `battlers[${index}].attack`),
    defense: requireUnsigned(battler.defense ?? 0, 0xffff, `battlers[${index}].defense`),
    spAttack: requireUnsigned(battler.spAttack ?? 0, 0xffff, `battlers[${index}].spAttack`),
    spDefense: requireUnsigned(battler.spDefense ?? 0, 0xffff, `battlers[${index}].spDefense`),
    level: requireUnsigned(battler.level ?? 0, 0xff, `battlers[${index}].level`),
    friendship: requireUnsigned(battler.friendship ?? 0, 0xff, `battlers[${index}].friendship`),
    partyIndex: requireUnsigned(
      battler.partyIndex ?? 0,
      BATTLE_SCRIPT_PARTY_SIZE - 1,
      `battlers[${index}].partyIndex`,
    ),
    maxHP: requireUnsigned(battler.maxHP ?? battler.hp, 0xffff, `battlers[${index}].maxHP`),
    speed: requireUnsigned(battler.speed ?? 100, 0xffff, `battlers[${index}].speed`),
    turnOrderNum: requireUnsigned(battler.turnOrderNum ?? 1, 0xff, `battlers[${index}].turnOrderNum`),
    wrappedMove: requireUnsigned(battler.wrappedMove ?? 0, 0xffff, `battlers[${index}].wrappedMove`),
    wrappedBy: requireUnsigned(battler.wrappedBy ?? 0, 3, `battlers[${index}].wrappedBy`) as BattleScriptBattlerId,
    battlerPreventingEscape: requireUnsigned(
      battler.battlerPreventingEscape ?? 0,
      3,
      `battlers[${index}].battlerPreventingEscape`,
    ) as BattleScriptBattlerId,
    isFirstTurn: requireUnsigned(battler.isFirstTurn ?? 0, 2, `battlers[${index}].isFirstTurn`),
    ...(battler.confusionDamage === undefined ? {} : {
      confusionDamage: Object.freeze({
        level: requireUnsigned(
          battler.confusionDamage.level,
          0xff,
          `battlers[${index}].confusionDamage.level`,
        ),
        attack: requireUnsigned(
          battler.confusionDamage.attack,
          0xffff,
          `battlers[${index}].confusionDamage.attack`,
        ),
        defense: requireUnsigned(
          battler.confusionDamage.defense,
          0xffff,
          `battlers[${index}].confusionDamage.defense`,
        ),
        attackStage: requireUnsigned(
          battler.confusionDamage.attackStage,
          12,
          `battlers[${index}].confusionDamage.attackStage`,
        ),
        defenseStage: requireUnsigned(
          battler.confusionDamage.defenseStage,
          12,
          `battlers[${index}].confusionDamage.defenseStage`,
        ),
        isBurned: Boolean(battler.confusionDamage.isBurned),
        hasGuts: Boolean(battler.confusionDamage.hasGuts),
      }),
    }),
  })) as unknown as BattleScriptRulesBattlers;
  const selectorRoles = Object.freeze({
    attacker: requireRole(input.selectorRoles?.attacker, "selectorRoles.attacker"),
    // For this source role only, null also preserves gBattlerTarget's explicit
    // BATTLER_NONE (0xFF) sentinel. UproarWakeUpCheck can replace that sentinel
    // with the first battler it finds using Uproar.
    target: requireRole(input.selectorRoles?.target, "selectorRoles.target"),
    effectBattler: requireRole(
      input.selectorRoles?.effectBattler,
      "selectorRoles.effectBattler",
    ),
    fainted: requireRole(input.selectorRoles?.fainted, "selectorRoles.fainted"),
  });
  const scriptingBattler = requireRole(input.scriptingBattler, "scriptingBattler");
  if (scriptingBattler === null) {
    throw new Error("scriptingBattler must be a battler id 0..3");
  }
  const battlerWithAbility = requireRole(
    input.battlerWithAbility ?? 0,
    "battlerWithAbility",
  );
  if (battlerWithAbility === null) {
    throw new Error("battlerWithAbility must be a battler id 0..3");
  }
  const currentMove = requireUnsigned(input.currentMove, 0xffff, "currentMove");
  const bideDmgInput = input.bideDmg ?? [0, 0, 0, 0];
  if (!Array.isArray(bideDmgInput) || bideDmgInput.length !== 4) {
    throw new Error("bideDmg must contain exactly four signed 32-bit values");
  }
  const bideDmg = Object.freeze(bideDmgInput.map((value, index) =>
    requireSigned32(value, `bideDmg[${index}]`)
  )) as unknown as BattleScriptBideDamageByBattler;
  const bideTargetInput = input.bideTarget ?? [0, 0, 0, 0];
  if (!Array.isArray(bideTargetInput) || bideTargetInput.length !== 4) {
    throw new Error("bideTarget must contain exactly four battler ids");
  }
  const bideTarget = Object.freeze(bideTargetInput.map((value, index) => {
    const target = requireRole(value, `bideTarget[${index}]`);
    if (target === null) {
      throw new Error(`bideTarget[${index}] must be a battler id 0..3`);
    }
    return target;
  })) as unknown as BattleScriptBideTargetByBattler;
  const choicedMove = createMoveEndArray(
    input.choicedMove,
    0xffff,
    "choicedMove",
  ) as BattleScriptMoveEndHalfwords;
  const changedItems = createMoveEndArray(
    input.changedItems,
    0xffff,
    "changedItems",
  ) as BattleScriptMoveEndHalfwords;
  const chosenMovePositions = createMoveEndArray(
    input.chosenMovePositions,
    3,
    "chosenMovePositions",
  ) as BattleScriptMoveEndBytes;
  const lockedMoves = createMoveEndArray(
    input.lockedMoves,
    0xffff,
    "lockedMoves",
  ) as BattleScriptMoveEndHalfwords;
  const rolloutTimerStartValues = createMoveEndArray(
    input.rolloutTimerStartValues,
    0x0f,
    "rolloutTimerStartValues",
  ) as BattleScriptMoveEndBytes;
  const monToSwitchIntoId = createMoveEndArray(
    input.monToSwitchIntoId ?? [
      BATTLE_SCRIPT_PARTY_SIZE,
      BATTLE_SCRIPT_PARTY_SIZE,
      BATTLE_SCRIPT_PARTY_SIZE,
      BATTLE_SCRIPT_PARTY_SIZE,
    ],
    BATTLE_SCRIPT_PARTY_SIZE,
    "monToSwitchIntoId",
  ) as BattleScriptMoveEndHalfwords;
  const enigmaBerryHoldEffects = createMoveEndArray(
    input.enigmaBerryHoldEffects,
    0xff,
    "enigmaBerryHoldEffects",
  ) as BattleScriptMoveEndBytes;
  const moveHistory = createBattleScriptMoveHistory(input.moveHistory);
  const battleTopology = createBattleScriptBattleTopology(input.battleTopology);
  const party = createBattleScriptPartyBySide(input.party);
  return Object.freeze({
    battlers: Object.freeze(battlers),
    selectorRoles,
    scriptingBattler,
    battlerWithAbility,
    atkCancelerTracker: requireUnsigned(
      input.atkCancelerTracker,
      0xff,
      "atkCancelerTracker",
    ),
    battleOutcome: requireUnsigned(input.battleOutcome, 0xff, "battleOutcome"),
    currentMove,
    currentMoveEffect: resolveBattleScriptCurrentMoveEffect(currentMove),
    currentMovePower: resolveBattleScriptCurrentMovePower(currentMove),
    currentMovePosition: requireUnsigned(
      input.currentMovePosition,
      3,
      "currentMovePosition",
    ),
    gBattleEnvironment: requireUnsigned(
      input.gBattleEnvironment ?? 0,
      0xff,
      "gBattleEnvironment",
    ),
    lastUsedAbility: requireUnsigned(
      input.lastUsedAbility ?? 0,
      0xff,
      "lastUsedAbility",
    ),
    moveResultFlags: requireUnsigned(input.moveResultFlags, 0xff, "moveResultFlags"),
    dmgMultiplier: requireUnsigned(input.dmgMultiplier, 0xff, "dmgMultiplier"),
    critMultiplier: requireUnsigned(input.critMultiplier, 0xff, "critMultiplier"),
    moveEffectByte: requireUnsigned(input.moveEffectByte, 0xff, "moveEffectByte"),
    missType: requireUnsigned(input.missType, 0xff, "missType"),
    hitMarker: requireUnsigned(input.hitMarker, 0xffff_ffff, "hitMarker") >>> 0,
    multiHitCounter: requireUnsigned(input.multiHitCounter, 0xff, "multiHitCounter"),
    multistringChooser: requireUnsigned(
      input.multistringChooser ?? 0,
      0xff,
      "multistringChooser",
    ),
    battleMoveDamage: requireSigned32(
      input.battleMoveDamage ?? 0,
      "battleMoveDamage",
    ),
    painSplitHp: requireSigned32(input.painSplitHp ?? 0, "painSplitHp"),
    dynamicBasePower: requireUnsigned(
      input.dynamicBasePower ?? 0,
      0xffff,
      "dynamicBasePower",
    ),
    hpDealt: requireSigned32(input.hpDealt ?? 0, "hpDealt"),
    bideDmg,
    bideTarget,
    scriptingBideDmg: requireSigned32(
      input.scriptingBideDmg ?? 0,
      "scriptingBideDmg",
    ),
    absentBattlerFlags: requireUnsigned(
      input.absentBattlerFlags ?? 0,
      0x0f,
      "absentBattlerFlags",
    ),
    calledMove: requireUnsigned(input.calledMove ?? 0, 0xffff, "calledMove"),
    chosenMove: requireUnsigned(input.chosenMove ?? 0, 0xffff, "chosenMove"),
    chosenMovePositions,
    lockedMoves,
    rolloutTimerStartValues,
    choicedMove,
    changedItems,
    knockedOffMons: Object.freeze([
      requireUnsigned(input.knockedOffMons?.[0] ?? 0, 0x3f, "knockedOffMons[0]"),
      requireUnsigned(input.knockedOffMons?.[1] ?? 0, 0x3f, "knockedOffMons[1]"),
    ]) as readonly [number, number],
    monToSwitchIntoId,
    battleStructAbsentBattlerFlags: requireUnsigned(
      input.battleStructAbsentBattlerFlags ?? 0,
      0x0f,
      "battleStructAbsentBattlerFlags",
    ),
    alreadyStatusedMoveAttempt: requireUnsigned(
      input.alreadyStatusedMoveAttempt ?? 0,
      0x0f,
      "alreadyStatusedMoveAttempt",
    ),
    dynamicMoveType: requireUnsigned(input.dynamicMoveType ?? 0, 0xff, "dynamicMoveType"),
    enigmaBerryHoldEffects,
    moveHistory,
    battleTopology,
    party,
    battleCommunication0: requireUnsigned(
      input.battleCommunication0 ?? 0,
      0xff,
      "battleCommunication0",
    ),
    battleCommunication1: requireUnsigned(
      input.battleCommunication1 ?? 0,
      0xff,
      "battleCommunication1",
    ),
    animTargetsHit: requireUnsigned(input.animTargetsHit ?? 0, 0xff, "animTargetsHit"),
    animTurn: requireUnsigned(input.animTurn ?? 0, 0xff, "animTurn"),
    giveExpState: requireUnsigned(input.giveExpState ?? 0, 0xff, "giveExpState"),
    learnMoveState: requireUnsigned(input.learnMoveState ?? 0, 0xff, "learnMoveState"),
    lvlBoxState: requireUnsigned(input.lvlBoxState ?? 0, 0xff, "lvlBoxState"),
    moveendState: requireUnsigned(input.moveendState ?? 0, 0xff, "moveendState"),
    multiHitEffect: requireUnsigned(input.multiHitEffect ?? 0, 0xff, "multiHitEffect"),
    statChanger: requireUnsigned(input.statChanger ?? 0, 0xff, "statChanger"),
    statAnimPlayed: requireUnsigned(input.statAnimPlayed ?? 0, 0xff, "statAnimPlayed"),
    animArg1: requireUnsigned(input.animArg1 ?? 0, 0xffff, "animArg1"),
    tripleKickPower: requireUnsigned(input.tripleKickPower ?? 0, 0xffff, "tripleKickPower"),
    multiHitStringCounter: requireUnsigned(input.multiHitStringCounter ?? 0, 0xff, "multiHitStringCounter"),
    twoTurnStringId: requireUnsigned(input.twoTurnStringId ?? 0, 0xff, "twoTurnStringId"),
    sideStatuses: Object.freeze([
      requireUnsigned(input.sideStatuses?.[0] ?? 0, 0xffff_ffff, "sideStatuses[0]") >>> 0,
      requireUnsigned(input.sideStatuses?.[1] ?? 0, 0xffff_ffff, "sideStatuses[1]") >>> 0,
    ]) as unknown as readonly [number, number],
    mistTimers: Object.freeze([
      requireUnsigned(input.mistTimers?.[0] ?? 0, 0xff, "mistTimers[0]"),
      requireUnsigned(input.mistTimers?.[1] ?? 0, 0xff, "mistTimers[1]"),
    ]) as unknown as readonly [number, number],
    sideTimers: Object.freeze([
      buildSideTimerState(input.sideTimers?.[0], 0),
      buildSideTimerState(input.sideTimers?.[1], 1),
    ]) as unknown as readonly [BattleScriptSideTimerState, BattleScriptSideTimerState],
    weather: requireUnsigned(input.weather ?? 0, 0xffff_ffff, "weather") >>> 0,
    weatherTimer: requireUnsigned(input.weatherTimer ?? 0, 0xff, "weatherTimer"),
    wishCounter: Object.freeze([
      requireUnsigned(input.wishCounter?.[0] ?? 0, 0xff, "wishCounter[0]"),
      requireUnsigned(input.wishCounter?.[1] ?? 0, 0xff, "wishCounter[1]"),
      requireUnsigned(input.wishCounter?.[2] ?? 0, 0xff, "wishCounter[2]"),
      requireUnsigned(input.wishCounter?.[3] ?? 0, 0xff, "wishCounter[3]"),
    ]) as unknown as readonly [number, number, number, number],
    wishMonId: Object.freeze([
      requireUnsigned(input.wishMonId?.[0] ?? 0, 5, "wishMonId[0]"),
      requireUnsigned(input.wishMonId?.[1] ?? 0, 5, "wishMonId[1]"),
      requireUnsigned(input.wishMonId?.[2] ?? 0, 5, "wishMonId[2]"),
      requireUnsigned(input.wishMonId?.[3] ?? 0, 5, "wishMonId[3]"),
    ]) as unknown as readonly [number, number, number, number],
    futureSightCounter: Object.freeze([
      requireUnsigned(input.futureSightCounter?.[0] ?? 0, 0xff, "futureSightCounter[0]"),
      requireUnsigned(input.futureSightCounter?.[1] ?? 0, 0xff, "futureSightCounter[1]"),
      requireUnsigned(input.futureSightCounter?.[2] ?? 0, 0xff, "futureSightCounter[2]"),
      requireUnsigned(input.futureSightCounter?.[3] ?? 0, 0xff, "futureSightCounter[3]"),
    ]) as unknown as readonly [number, number, number, number],
    futureSightMove: Object.freeze([
      requireUnsigned(input.futureSightMove?.[0] ?? 0, 0xffff, "futureSightMove[0]"),
      requireUnsigned(input.futureSightMove?.[1] ?? 0, 0xffff, "futureSightMove[1]"),
      requireUnsigned(input.futureSightMove?.[2] ?? 0, 0xffff, "futureSightMove[2]"),
      requireUnsigned(input.futureSightMove?.[3] ?? 0, 0xffff, "futureSightMove[3]"),
    ]) as unknown as readonly [number, number, number, number],
    futureSightAttacker: Object.freeze([
      requireUnsigned(input.futureSightAttacker?.[0] ?? 0, 3, "futureSightAttacker[0]"),
      requireUnsigned(input.futureSightAttacker?.[1] ?? 0, 3, "futureSightAttacker[1]"),
      requireUnsigned(input.futureSightAttacker?.[2] ?? 0, 3, "futureSightAttacker[2]"),
      requireUnsigned(input.futureSightAttacker?.[3] ?? 0, 3, "futureSightAttacker[3]"),
    ]) as unknown as readonly [number, number, number, number],
    futureSightDmg: Object.freeze([
      requireSigned32(input.futureSightDmg?.[0] ?? 0, "futureSightDmg[0]"),
      requireSigned32(input.futureSightDmg?.[1] ?? 0, "futureSightDmg[1]"),
      requireSigned32(input.futureSightDmg?.[2] ?? 0, "futureSightDmg[2]"),
      requireSigned32(input.futureSightDmg?.[3] ?? 0, "futureSightDmg[3]"),
    ]) as unknown as readonly [number, number, number, number],
    battleTextBuff1MonNick: input.battleTextBuff1MonNick === null
      || input.battleTextBuff1MonNick === undefined
      ? null
      : Object.freeze({
        battler: requireUnsigned(input.battleTextBuff1MonNick.battler, 3, "battleTextBuff1MonNick.battler") as BattleScriptBattlerId,
        partyIndex: requireUnsigned(input.battleTextBuff1MonNick.partyIndex, 5, "battleTextBuff1MonNick.partyIndex"),
      }),
    battleTextBuff1ByteNumber: input.battleTextBuff1ByteNumber === null
      || input.battleTextBuff1ByteNumber === undefined
      ? null
      : requireUnsigned(input.battleTextBuff1ByteNumber, 0xff, "battleTextBuff1ByteNumber"),
    battleTextBuff1Move: input.battleTextBuff1Move === null
      || input.battleTextBuff1Move === undefined
      ? null
      : requireUnsigned(input.battleTextBuff1Move, 0xffff, "battleTextBuff1Move"),
    battleTextBuff2ByteNumber: input.battleTextBuff2ByteNumber === null
      || input.battleTextBuff2ByteNumber === undefined
      ? null
      : requireUnsigned(input.battleTextBuff2ByteNumber, 0xff, "battleTextBuff2ByteNumber"),
    battlerByTurnOrder: Object.freeze([
      requireUnsigned(input.battlerByTurnOrder?.[0] ?? 0, 3, "battlerByTurnOrder[0]"),
      requireUnsigned(input.battlerByTurnOrder?.[1] ?? 1, 3, "battlerByTurnOrder[1]"),
      requireUnsigned(input.battlerByTurnOrder?.[2] ?? 2, 3, "battlerByTurnOrder[2]"),
      requireUnsigned(input.battlerByTurnOrder?.[3] ?? 3, 3, "battlerByTurnOrder[3]"),
    ]) as unknown as readonly [number, number, number, number],
    currentTurnActionNumber: requireUnsigned(
      input.currentTurnActionNumber ?? 0,
      0xff,
      "currentTurnActionNumber",
    ),
  });
}

function decodeSupportedBattlerSelector(operand: BattleScriptOperand): number | null {
  const named = BATTLE_SCRIPT_BATTLER_SELECTORS[
    operand.expression as keyof typeof BATTLE_SCRIPT_BATTLER_SELECTORS
  ];
  if (named !== undefined) return named;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(operand.expression)) return null;
  const numeric = Number(operand.expression);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

/**
 * Source-exact GetBattlerForBattleScript mapping for the selector roles proven
 * reachable by statusanimation/status2animation/chosenstatusanimation, plus
 * BS_TARGET (battle_util.c:694-734: `case BS_TARGET: ret = gBattlerTarget;`
 * unconditionally -- ISSUES #43). `gBattlerTarget` is unchanged from whatever
 * the enclosing hit chain set it to, so the already-populated
 * `selectorRoles.target` is the correct value at any point this selector is
 * read. BS_FAINTED (`:713`, `case BS_FAINTED: ret = gBattlerFainted;`) reads
 * the distinct `selectorRoles.fainted` role, written only by the fainted-
 * actions orchestration (battleScriptFaintedActionsOrchestration.ts) --
 * never derived from `target` (ISSUES #43's closed remainder).
 */
export const resolveRulesBattlerForBattleScript: NonNullable<
  BattleScriptSourceCommandPorts<BattleScriptRulesContext>["resolveBattlerForBattleScript"]
> = (context, selectorOperand) => {
  const selector = decodeSupportedBattlerSelector(selectorOperand);
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_TARGET) {
    return context.state.rulesContext.selectorRoles.target;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_ATTACKER) {
    return context.state.rulesContext.selectorRoles.attacker;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_EFFECT_BATTLER) {
    return context.state.rulesContext.selectorRoles.effectBattler;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_FAINTED) {
    return context.state.rulesContext.selectorRoles.fainted;
  }
  if (selector === BATTLE_SCRIPT_BATTLER_SELECTORS.BS_SCRIPTING) {
    return context.state.rulesContext.scriptingBattler;
  }
  return null;
};

export const prepareRulesStatusAnimation: BattleScriptStatusAnimationPreparationPort<
  BattleScriptRulesContext
> = (context, battler, request): BattleScriptStatusAnimationPreparation => {
  const rules = context.state.rulesContext;
  const sourceBattler = rules.battlers[battler];
  if (
    (sourceBattler.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0
    || sourceBattler.substituteHP !== 0
    || (rules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
  ) {
    return Object.freeze({ kind: "suppress" });
  }

  let isStatus2: number;
  let status: number;
  switch (request.kind) {
    case "live-status1":
      isStatus2 = 0;
      status = sourceBattler.status1;
      break;
    case "masked-live-status2":
      isStatus2 = 1;
      status = (sourceBattler.status2 & request.wantedMask) >>> 0;
      break;
    case "explicit-status":
      isStatus2 = request.isStatus2;
      status = request.status;
      break;
  }
  return Object.freeze({
    kind: "emit",
    receipt: Object.freeze({
      kind: "status-animation",
      battler,
      isStatus2,
      status,
    }),
  });
};

export type BattleScriptStatusRulesExternalPorts = Readonly<
  Omit<
    BattleScriptSourceCommandPorts<BattleScriptRulesContext>,
    "resolveBattlerForBattleScript" | "prepareStatusAnimation"
  > & {
    resolveByteOperand: BattleScriptByteResolverPort<BattleScriptRulesContext>;
  }
>;

/**
 * Production handler composition for the currently explicit rules context.
 * The generic command factories remain injectable; this bundle replaces only
 * the two status-family ports whose live source data now has durable owners
 * and includes cleanup because all of its mutated fields are owned here.
 */
export function createBattleScriptStatusRulesHandlers(
  program: BattleScriptProgram,
  externalPorts: BattleScriptStatusRulesExternalPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const { resolveByteOperand, ...sourceExternalPorts } = externalPorts;
  const sourcePorts: BattleScriptSourceCommandPorts<BattleScriptRulesContext> =
    Object.freeze({
      ...sourceExternalPorts,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
      prepareStatusAnimation: prepareRulesStatusAnimation,
    });
  return Object.freeze({
    ...createBattleScriptControlHandlers<BattleScriptRulesContext>(program),
    ...createBattleScriptSourceCommandHandlers(program, sourcePorts),
    ...createBattleScriptRuleCommandHandlers(program, resolveByteOperand, resolveRulesBattlerForBattleScript),
    ...createBattleScriptMoveValuesCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
    ...createBattleScriptSetByteCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
    ...createBattleScriptBicbyteCommandHandlers<BattleScriptRulesContext>(
      program,
    ),
    ...createBattleScriptAttackCancelerOpcodeHandlers(program),
    ...createBattleScriptHitChainOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
      prepareMessage: sourceExternalPorts.prepareMessage,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptMoveEndOpcodeHandlers(program),
    ...createBattleScriptJumpifbyteOpcodeHandlers(program),
    ...createBattleScriptJumpifwordOpcodeHandlers(program),
    ...createBattleScriptJumpifhalfwordOpcodeHandlers(program),
    ...createBattleScriptJumpifstatus3conditionOpcodeHandlers(program),
    ...createBattleScriptOrwordOpcodeHandlers(program),
    ...createBattleScriptOpenPartyScreenOpcodeHandlers(program),
    ...createBattleScriptSwitchinOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
    }),
    ...createBattleScriptGetexpOpcodeHandlers(program),
    ...createBattleScriptCheckteamslostOpcodeHandlers(program),
    ...createBattleScriptStatbuffchangeOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptSetSideStatusOpcodeHandlers(program),
    ...createBattleScriptSetWeatherOpcodeHandlers(program),
    ...createBattleScriptDamagingWeatherOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptTryCastformDataChangeOpcodeHandlers(program),
    ...createBattleScriptIngrainLeechSeedWrapOpcodeHandlers(program),
    ...createBattleScriptRemoveitemOpcodeHandlers(program, {
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptStatusPrimaryOpcodeHandlers(program, resolveRulesBattlerForBattleScript),
    ...createBattleScriptSetyawnOpcodeHandlers(program),
    ...createBattleScriptConfuseifrepeatingattackendsOpcodeHandlers(program),
    ...createBattleScriptTargetIterationOpcodeHandlers(program),
    ...createBattleScriptProtectlikeOpcodeHandlers(program),
    ...createBattleScriptNegativedamageOpcodeHandlers(program),
    ...createBattleScriptTrysetrestOpcodeHandlers(program),
    ...createBattleScriptJumpifstatOpcodeHandlers(program, resolveRulesBattlerForBattleScript),
    ...createBattleScriptPlaystatchangeanimationOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptTryinfatuatingOpcodeHandlers(program),
    ...createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers(program),
    ...createBattleScriptTryhealhalfhealthOpcodeHandlers(program),
    ...createBattleScriptTryKOOpcodeHandlers(program),
    ...createBattleScriptTrysetdestinybondtohappenOpcodeHandlers(program),
    ...createBattleScriptSetdestinybondOpcodeHandlers(program),
    ...createBattleScriptSetsubstituteOpcodeHandlers(program),
    ...createBattleScriptForceSwitchOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
    }),
    ...createBattleScriptExplosionOpcodeHandlers(program, {
      isControllerIdle: sourceExternalPorts.isControllerIdle,
    }),
    ...createBattleScriptClearstatusfromeffectOpcodeHandlers(program, {
      resolveBattlerForBattleScript: resolveRulesBattlerForBattleScript,
    }),
    ...createBattleScriptSemiInvulnerableBitOpcodeHandlers(program),
    ...createBattleScriptJumpifnotfirstturnOpcodeHandlers(program),
    ...createBattleScriptJumpifabilitypresentOpcodeHandlers(program),
    ...createBattleScriptRecoverbasedonsunlightOpcodeHandlers(program),
    ...createBattleScriptCurseOpcodeHandlers(program, resolveRulesBattlerForBattleScript),
    ...createBattleScriptRemainingHpToPowerOpcodeHandlers(program),
    ...createBattleScriptFriendshipToDamageOpcodeHandlers(program),
    ...createBattleScriptCopyFoeStatsOpcodeHandlers(program),
    ...createBattleScriptJumpifcantswitchOpcodeHandlers(program),
    ...createBattleScriptJumpifnodamageOpcodeHandlers(program),
    ...createBattleScriptSleepTalkOpcodeHandlers(program),
    ...createBattleScriptTrywishOpcodeHandlers(program),
    ...createBattleScriptRolloutOpcodeHandlers(program),
    ...createBattleScriptSetDefenseCurlBitOpcodeHandlers(program),
    ...createBattleScriptTrysetfutureattackOpcodeHandlers(program),
    ...createBattleScriptDisablelastusedattackOpcodeHandlers(program),
    ...createBattleScriptTrysetencoreOpcodeHandlers(program),
    ...createBattleScriptTrysetperishsongOpcodeHandlers(program),
    ...createBattleScriptTrysetgrudgeOpcodeHandlers(program),
    ...createBattleScriptTryspiteppreduceOpcodeHandlers(program),
    ...createBattleScriptRankedBatch1OpcodeHandlers(program),
    ...createBattleScriptPainSplitOpcodeHandlers(program),
    ...createBattleScriptStockpileOpcodeHandlers(program),
    ...createBattleScriptFuryCutterOpcodeHandlers(program),
    ...createBattleScriptSetminimizeOpcodeHandlers(program),
    ...createBattleScriptSetforcedtargetOpcodeHandlers(program),
    ...createBattleScriptGetSecretPowerEffectOpcodeHandlers(program),
    ...createBattleScriptRefreshOpcodeHandlers(program),
    ...createBattleScriptHealpartystatusOpcodeHandlers(program),
    ...createBattleScriptIncrementGameStatOpcodeHandlers(program),
    ...createBattleScriptSettormentOpcodeHandlers(program),
    ...createBattleScriptSettauntOpcodeHandlers(program),
    ...createBattleScriptSetforesightOpcodeHandlers(program),
    ...createBattleScriptSetfocusenergyOpcodeHandlers(program),
    ...createBattleScriptDoubleDamageIfDamagedOpcodeHandlers(program),
    ...createBattleScriptWeightDamageOpcodeHandlers(program),
    ...createBattleScriptTrysetspikesOpcodeHandlers(program),
    ...createBattleScriptTrysetmagiccoatOpcodeHandlers(program),
    ...createBattleScriptTrysethelpinghandOpcodeHandlers(program),
    ...createBattleScriptTryswapitemsOpcodeHandlers(program),
    ...createBattleScriptTryswapabilitiesOpcodeHandlers(program),
  });
}

export type BattleScriptStatusRulesExecution = Readonly<{
  state: BattleScriptMachineState<BattleScriptRulesContext>;
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
}>;

export function createBattleScriptStatusRulesExecution(
  program: BattleScriptProgram,
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
  externalPorts: BattleScriptStatusRulesExternalPorts,
  scheduler?: BattleScriptSchedulerState,
): BattleScriptStatusRulesExecution {
  return Object.freeze({
    state: createBattleScriptMachine(
      program,
      entryLabel,
      rulesContext,
      rngSeed,
      scheduler,
    ),
    handlers: createBattleScriptStatusRulesHandlers(program, externalPorts),
  });
}

/** Named acknowledgement seam retained beside the production execution bundle. */
export const acknowledgeBattleScriptStatusRulesController =
  acknowledgeBattleScriptController;
