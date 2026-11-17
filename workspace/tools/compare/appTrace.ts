// App-side trace renderer.
//
// Replays a trace against the real engine code (the same modules the Vite
// build ships) and returns raw RGBA frames for each captured frame, so
// tools/compare/run.ts can diff them against the oracle.
// Frame/input numbering is shared with the oracle contract; see
// docs/oracle-frame-semantics.md and traceReplay.ts.

import "./harnessPlayerName.ts";
import type { Trace } from "./oracleClient.ts";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import { createInitialFactoryCarry } from "../../src/engine/factoryRoundChaining.ts";
import { driveGeneratedRoundToCompletion, PLAYER_TRAINER_ID as CARRIER_PLAYER_TRAINER_ID } from "./factoryRoundCarrier.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import type { EngineState } from "../../src/engine/core.ts";
import { traceAdvances } from "./traceReplay.ts";
import { BATTLE2_OFF_TURN1_COMMAND_DURATIONS } from "../../src/engine/battle2CommandAdapter.ts";
import { createFactoryFullTurnBattleState, createFactoryFullTurnBattleStateFromRulesContext } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import { stageFactoryFullTurnBattle } from "../../src/engine/stagedBattleTurn.ts";
import {
  createSceneOnMovePresentation,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createPostwinStateFromOpponentRentalRecords,
  type FactoryPostwinOpponentRentalRecords,
} from "../../src/engine/postwin.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  type FactoryBattleMoveSelectionCursors,
  type FactoryBattlePresentationBoundaries,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  adoptFactoryOpponentSchedule,
  generateFactoryOpponent,
  type FactoryOpponentGenerationResult,
} from "../../src/engine/factoryOpponentGeneration.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import {
  createBattleState,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
  type BattleState,
} from "../../src/engine/battleDecisionBoundary.ts";
import {
  createBattleResolutionPresentation,
  USED_MESSAGE_B_WAIT_TIME_SHORT_HOLD_FRAMES,
  USED_MESSAGE_SPLASH_CONTROLLER_HOLD_FRAMES,
  type BattleResolutionPresentationState,
  type CreateBattleResolutionPresentationInput,
} from "../../src/engine/battleResolutionPresentation.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";
import {
  BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
  TORMENT_ROUTE_BOUNCE_SCHEDULE,
  createBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "../../src/engine/battleCommandPresentation.ts";
import { getFactoryTrainerPresentation } from "../../src/engine/factoryTrainerPresentation.ts";
import { createFactoryAiBattleHistory } from "../../src/engine/factoryAiLiveDriver.ts";
import type {
  BattleScriptPartyMemberInput,
} from "../../src/engine/battleScriptRulesContext.ts";
import type {
  FactoryFullTurnBattlerConfig,
  FactoryFullTurnConfig,
  FactoryFullTurnDecisionRules,
} from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type {
  FactoryBattleMoveSelectionCursors,
  FactoryBattlePresentationBoundaries,
  FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../../src/engine/battleScriptSourceConstants.ts";
import {
  generatedRoundBattle6LukasRevealStage,
  generatedRoundBattle6LukasStatusSummaryMessageStage,
  generatedRoundBattle7NolandGoldRevealStage,
  generatedRoundBattle7NolandGoldSpeechBox0HeldStage,
  generatedRoundBattle7NolandGoldSpeechClosePauseStage,
  generatedRoundBattle7NolandGoldSpeechCloseHeldStage,
  generatedRoundBattle7NolandGoldSpeechOpenStage,
  generatedRoundBattle7NolandGoldSpeechPage4HeldStage,
  generatedRoundBattle7NolandPostwinAskReadyMenuOpenStage,
  generatedRoundBattle7NolandPostwinCallSceneStartStage,
  generatedRoundBattle7NolandRevealStage,
  generatedRoundBattle7NolandRoomEntranceStage,
  generatedRoundBattle7NolandSilverSpeechBox0HeldStage,
  generatedRoundBattle7NolandSilverSpeechBox2OpeningStage,
  generatedRoundBattle7NolandSilverSpeechClosePauseStage,
  generatedRoundBattle7NolandSilverSpeechCryHeldStage,
  generatedRoundBattle7NolandSilverSpeechPage8HeldStage,
} from "./factoryRoundIntroGeneralizationStage.ts";

// bnd256c: install the sprite pixels for render(). Optional so app-differential --harness-from-head can overlay this file on a base checkout
// from before the provider existed (that engine reads the sprite JSON itself); any other load failure still throws.
await import("../../src/engine/monPicPixelsInstall.ts").catch((error: { code?: string }) => {
  if (error?.code !== "ERR_MODULE_NOT_FOUND" && !/Failed to load url|Cannot find module/.test(String(error))) throw error;
});

export interface AppCapture {
  frame: number;
  /** Raw RGBA pixels, 240*160*4 bytes. */
  rgba: Buffer | Uint8Array;
}

type AppStage = (state: EngineState) => EngineState;

function createFactoryPostwinStage(
  opponentRentalRecords: FactoryPostwinOpponentRentalRecords,
): AppStage {
  return (state) => ({
    ...state,
    postwin: createPostwinStateFromOpponentRentalRecords(opponentRentalRecords),
  });
}

const CANONICAL_POSTWIN_OPPONENT_RECORDS = [
  { setId: 153, personality: 24, fixedIv: 3, abilitySlot: 0 },
  { setId: 179, personality: 19, fixedIv: 3, abilitySlot: 1 },
  { setId: 181, personality: 6, fixedIv: 3, abilitySlot: 0 },
] as const;

// Honest rung-8 generation output for seed 3. Its commentary is ROCK /
// unrestrained, differing in both classifications from the canonical
// no-favorite / weakening pages. This stage is app-visible even though no
// matching source-valid oracle field checkpoint exists yet.
const GENERATED_POSTWIN_ROCK_UNRESTRAINED_RECORDS = [
  { setId: 156, personality: 116865875, fixedIv: 3, abilitySlot: 1 },
  { setId: 180, personality: 1392861431, fixedIv: 3, abilitySlot: 0 },
  { setId: 122, personality: 3471709106, fixedIv: 3, abilitySlot: 0 },
] as const;

const generatedNatureByName = new Map(
  naturesData.natures.map((row) => [row.name, row.index]),
);

// `exactPersonality`, when given, is the ROM's own real rental personality
// for this setId (read off the oracle's own dense `state.parties` capture
// for the fixture that stages this exact record) instead of the synthetic
// nature-table-index placeholder below. The placeholder only satisfies the
// nature constraint by construction (it IS the nature index, trivially); its
// gender/shiny bits are incidental, not ROM-derived - the source of the
// party-summary/healthbox gender-icon residual named in docs/trainer-pic-
// off-window-scout.md §D round 6. Only staged (player) rentals need this -
// the opponent's own party is generated by the ported RNG generator, not
// staged, so it isn't affected.
function generatedCommandRecord(setId: number, fixedIv: number = 31, exactPersonality?: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = exactPersonality ?? generatedNatureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: 0x89ab_cdef,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function generatedBattleCommandStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "battle-command-generated-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("generated command stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
}

// Arbitrary (non-canonical) generated Factory opponent for the public dense
// intro comparison (docs/trainer-pic-off-window-scout.md §C/§D): trainerId 49
// (YOSHI) and opponent species COMBUSKEN/POLIWHIRL/PORYGON are whatever
// factoryOpponentGeneration.ts's own selectFactoryTrainer/GenerateOpponentMons
// port produces for rngValue 42, factoryWinStreak 0, battleIndex 0 (the
// non-reversed workflow: the tuple is read off the generator, not chosen to
// match a known trainer) — neither DESTIN(50) nor JENSON(58) nor the
// SHIZUKA(110) mapping fixture, and outside all three casts.
// `factoryLegal` mode runs the real Factory rental-generation pipeline (no
// mechanicLab `overrides.parties` stat injection, unlike
// `generatedBattleCommandStage` above), so the player's initial rentals must
// carry the ROM's own challenge-0 fixed IV (`GetFactoryMonFixedIV` via
// `getLevel50InitialRentalFixedIv`, factory-round-policy.json's own
// `rentalSelection.fixedIvs[0].regular`), not the mechanicLab-fixture-only
// IV=31 `generatedCommandRecord`'s default preserves for that other stage.
const FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV =
  getLevel50InitialRentalFixedIv(0, false);

// Real personalities for setIds 110/130/150 (GRIMER/NUZLEAF/NOSEPASS), read
// off `bin/oracle lab` on this fixture's own committed request
// (`tools/battle-lab/factory-arbitrary-intro-yoshi-off.json`)'s dense
// `state.parties.player` capture - the ROM's own values, not synthesized.
// Closes the party-summary/healthbox gender-icon residual (docs/trainer-
// pic-off-window-scout.md §D round 6).
function generatedBattleStartIntroArbitraryStage(state: EngineState, battleScene: "on" | "off" = "off"): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(110, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 2737562574),
    generatedCommandRecord(130, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 3230415900),
    generatedCommandRecord(150, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 391062422),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-arbitrary-intro-yoshi-off",
    battleScene,
    rngValue: 42,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(115, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
        generatedCommandRecord(135, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
        generatedCommandRecord(145, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
      ],
    },
  });
  orchestrator = beginFactoryRoundBattleStartIntro(orchestrator);
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
}

// Second arbitrary-species intro proof (#56 item 3) and the first to
// exercise GENERATED_OPPONENT_SHADOW_DELAY's live branch (MAGNETON's
// dispatch delay, 111, exceeds it). Tuple from docs/intro-cry-shadow-
// evidence.md Part 2 / trainer-pic-off-window-scout.md §D round 6:
// generateFactoryOpponent(rngValue:70, factoryWinStreak:14, battleIndex:0,
// storedTrainerIds:[], savedRentalSetIds:[110,130,150,115,135,145]) ->
// trainerId 109 (RICARDO), opponentSetIds [349,353,292]
// (MAGNETON/SWALOT/MINUN). The `savedRentalRecords` bench below must be
// exactly that same six-setId list (reusing the YOSHI fixture's own
// placeholder rentals) - `generateFactoryOpponent`'s only use of the saved
// bench is `savedRentalSetIds`, so this reproduces the validated tuple
// exactly even though these bench setIds are outside this challenge's own
// 267-371 rank-0 range; they are never rendered (bench-only, no swap
// exercised in this window). The active player party (`playerSetIds`
// [267,268,269] = DELCATTY/SABLEYE/LICKITUNG) is the real challenge-2/
// rank-0 range the oracle fixture itself uses.
const FACTORY_LEGAL_CHALLENGE2_INITIAL_RENTAL_FIXED_IV =
  getLevel50InitialRentalFixedIv(2, false);

// Real personalities for setIds 267/268/269, read off `bin/oracle lab` on
// `tools/battle-lab/factory-arbitrary-intro-magneton-off.json`'s own dense
// `state.parties.player` capture - same convention as the YOSHI stage above.
function generatedBattleStartIntroMagnetonStage(state: EngineState, battleScene: "on" | "off" = "off"): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(267, FACTORY_LEGAL_CHALLENGE2_INITIAL_RENTAL_FIXED_IV, 768061940),
    generatedCommandRecord(268, FACTORY_LEGAL_CHALLENGE2_INITIAL_RENTAL_FIXED_IV, 1251336124),
    generatedCommandRecord(269, FACTORY_LEGAL_CHALLENGE2_INITIAL_RENTAL_FIXED_IV, 2794049353),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-arbitrary-intro-magneton-off",
    battleScene,
    rngValue: 70,
    factoryWinStreak: 14,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        generatedCommandRecord(110),
        generatedCommandRecord(130),
        generatedCommandRecord(150),
        generatedCommandRecord(115),
        generatedCommandRecord(135),
        generatedCommandRecord(145),
      ],
    },
  });
  orchestrator = beginFactoryRoundBattleStartIntro(orchestrator);
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
}

// ISSUES #73: edge-relative scaffold for the LOSS terminal window
// (docs/terminal-seam-loss-path-ground-truth.md). These battler configs only
// exist to give createFactoryFullTurnBattleState a valid rules/request
// boundary to build the synthetic terminal transition from -- the compare
// window's own claim (trainer-slide-in + dismissible message box) does not
// depend on which species/moves populate that scaffold. Same values
// tests/presentationTerminalSeamTrainerSlide.test.ts's terminalResolution()
// helper uses.
//
// `hp: 0` on both (docs/terminal-seam-win-window-probe.md §5): this window's
// own real orchestrator (`createFactoryRoundBattleOrchestrator({rngValue: 4,
// ...})`) generates its own, disjoint real parties for
// `state.round.rules.playerParty`/`currentOpponent.party` -- whatever species
// that RNG draw actually produces, NOT these placeholder MURKROWs (never
// rendered; both battlers are recalled/invisible for this window's entire
// span). `finishBattle` carries `id`/`maxHp` from that real party but
// overlays `hp` from this synthetic one (`battleResolutionAdapter.ts`'s
// `deriveBattleParty`), so this placeholder's `hp` must fall inside
// `[0, realMaxHp]` for a `realMaxHp` this scaffold never sees -- 0 is the one
// value that satisfies that bound for any positive real max, and it is also
// the narratively correct terminal value: both configs' own event chains
// below narrate exactly this battler fainting (LOSS: battler 0, this
// MURKROW's own Explosion self-KO; WIN: battler 1, the opponent's antecedent
// faint). `maxHp` stays 200 (a fainted mon's own display max, discarded by
// `deriveBattleParty` regardless -- never the value that reaches
// `assertBattleMon`).
const TERMINAL_SEAM_SCAFFOLD_PLAYER: FactoryFullTurnBattlerConfig = Object.freeze({
  // MURKROW -- matches the real committed fixture's own last-to-faint player
  // mon (docs/terminal-seam-loss-path-ground-truth.md §2, frame 2896:
  // "MURKROW / fainted!"), so the antecedent STRINGID_ATTACKERFAINTED
  // message this window's scaffold now holds resolves the real oracle text
  // via the real name resolver rather than a hardcoded string.
  species: 198, // MURKROW
  moveId: 33, // TACKLE
  moves: [33, 33, 33, 33] as const,
  pp: [35, 35, 35, 35] as const,
  ability: 0,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 80,
  spDefense: 80,
  speed: 120,
  hp: 0,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

const TERMINAL_SEAM_SCAFFOLD_TRAINER: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198, // MURKROW
  moveId: 33,
  moves: [33, 33, 33, 33] as const,
  pp: [35, 35, 35, 35] as const,
  ability: 0,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 0,
  maxHp: 200,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

// ISSUES #73 WIN window only: unlike LOSS (whose player battler is already
// fainted/invisible for the entire compare window, so its placeholder
// species is never actually drawn), the WIN window's player battler stays
// alive and fully visible on screen throughout -- docs/terminal-seam-win-
// window-ground-truth.md's own staging deliberately keeps all three player
// DUSCLOPS at full, unchanged HP the entire battle ("115/115/115 confirmed
// in every captured frame"). The oracle's own healthbox at this window's
// frame 0 pixel-confirms species DUSCLOPS, Lv50, 115/115 (this session's own
// fresh capture, tools/compare/out/.../oracle-04613.png) -- reusing the
// shared MURKROW/200 placeholder here (correct for LOSS, where it's never
// drawn) would draw the wrong species/HP on top of a real, visible healthbox.
const TERMINAL_SEAM_WIN_SCAFFOLD_PLAYER: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 362, // DUSCLOPS
  // TACKLE, not the fixture's own staged SPLASH: SPLASH's real targeting is
  // self (moveSlot 0 -> targetBattler 0), which doesn't match this scaffold's
  // shared { moveSlot: 0, targetBattler: 1 } sourceDecision (same value every
  // other terminal-seam scaffold in this file uses) -- the move choice here
  // is a placeholder either way (never actually used/rendered), so keep the
  // decision-boundary shape consistent instead of re-deriving a new one.
  moveId: 33,
  moves: [33, 33, 33, 33] as const,
  pp: [35, 35, 35, 35] as const,
  ability: 0,
  item: 0,
  friendship: 0,
  // The fixture's own overrides.parties[0] (tools/battle-lab/win-terminal-
  // explosion-dusclops-off.json) stages "gender": "male" for this DUSCLOPS,
  // pixel-confirmed against the oracle's own healthbox gender icon. DUSCLOPS's
  // genderRatio is 127 (src/data/gen/species-stats.json); getMonGender
  // resolves male whenever (personality & 0xff) >= genderRatio, so any
  // personality with a low byte >= 127 reproduces it -- this is not the
  // fixture's own exact personality value (not needed for this window, which
  // never renders shininess/IVs), just a value in the correct male range.
  personality: 0xff,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 115,
  maxHp: 115,
  types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
});

const TERMINAL_SEAM_EVENT_PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "compare-fixture",
  dispatcher: "compare-fixture",
  sourceLabel: "compare-fixture",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

// tests/battleScriptFaintedActionsOrchestration.test.ts's "player's last mon
// faints" pin proves this event is the real interpreter's
// VARIOUS_RETURN_OPPONENT_MON1 receipt (Cmd_various), not a generic
// placeholder -- battleResolutionPresentation.ts's "sprite-visibility"
// command reads this exact opcodeName to distinguish the real
// CONTROLLER_RETURNMONTOBALL recall from the unrelated
// CONTROLLER_SPRITEINVISIBILITY (Dig/Fly) receipt.
const TERMINAL_SEAM_RECALL_EVENT_PROVENANCE = Object.freeze({
  ...TERMINAL_SEAM_EVENT_PROVENANCE,
  opcodeName: "B_SCR_OP_VARIOUS",
});

function terminalSeamEvent(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: payload.kind === "set-battler-sprite-visibility"
      ? TERMINAL_SEAM_RECALL_EVENT_PROVENANCE
      : TERMINAL_SEAM_EVENT_PROVENANCE,
  });
}

// Replicates factoryRoundBattleOrchestrator.ts's private
// createBattlePresentationBoundaries (ISSUES #73: that helper isn't
// exported, so compare-only code rebuilds its ~15 lines rather than
// reaching into src/ for an export the main lane hasn't added).
function createTerminalSeamPresentationBoundaries(
  presentation: BattleCommandPresentationState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
): FactoryBattlePresentationBoundaries {
  const fields = [presentation.field.player, presentation.field.opponent] as const;
  return Object.freeze(fields.map((field, battler) => {
    const active = battle.rules.rulesContext.battlers[battler]!;
    return Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1: active.status1,
      spriteVisible: true,
      idleEpoch: 0,
      moveCursor: cursors[battler]!,
    });
  })) as unknown as FactoryBattlePresentationBoundaries;
}

// docs/terminal-seam-antecedent-boundary-probe.md §2: the antecedent
// "MURKROW fainted!" message's real down-arrow-eligible wait starts one tick
// after its own last glyph draws (`TextPrinterInitDownArrowCounters`), and
// the fixture's own real dismiss `A` press (`trace.segments[36]`, the same
// committed input the rest of this window's antecedent chain already
// represents) registers 22 ticks later. Both are RAM-probed absolute ticks
// from the fixture's *original* antecedent flow, which predates this
// window's own frame 0 (2996) and which this edge-relative scaffold does not
// replay per-tick (see the commandIndex-4 comment below) -- not fitted or
// simulated values.
const TERMINAL_SEAM_ANTECEDENT_READY_TICK = 2907;
const TERMINAL_SEAM_ANTECEDENT_DISMISS_TICK = 2929;
// docs/terminal-seam-antecedent-boundary-probe.md §2: "frozenPhase =
// floor((dismissTick-readyTick)/9) % 4, held constant... for every tick
// after dismissTick". Kept here as an `age` (22) rather than a pre-computed
// phase index so it feeds straight through the live render's own unmodified
// `floor(age/9)%4` cursor-phase formula (battleScene.ts's
// `CURSOR_Y_OFFSETS` lookup) instead of duplicating that arithmetic here.
const TERMINAL_SEAM_ANTECEDENT_FROZEN_CURSOR_AGE =
  TERMINAL_SEAM_ANTECEDENT_DISMISS_TICK - TERMINAL_SEAM_ANTECEDENT_READY_TICK;

// docs/terminal-seam-win-window-probe.md §1: the WIN window's own antecedent
// is STRINGID_PLAYERDEFEATEDTRAINER1 (not a plain fainted message -- the WIN
// script has no recall step, so this button-gated, cursor-KEPT message is
// what's still on screen when the trainer slide dispatches). Same
// readyTick/dismissTick idiom as the LOSS constants above: both are real
// RAM-probed absolute ticks from the fixture's own original antecedent flow
// (predating this window's own frame 0, 4613), not fitted or simulated.
const TERMINAL_SEAM_WIN_ANTECEDENT_READY_TICK = 4262;
const TERMINAL_SEAM_WIN_ANTECEDENT_DISMISS_TICK = 4608;
const TERMINAL_SEAM_WIN_ANTECEDENT_FROZEN_CURSOR_AGE =
  TERMINAL_SEAM_WIN_ANTECEDENT_DISMISS_TICK - TERMINAL_SEAM_WIN_ANTECEDENT_READY_TICK;

// ISSUES #73 LOSS window: constructs a real factoryRoundBattleOrchestrator
// (so aiHistory/activeBattleCallStart/battlePresentationBoundaries are real,
// non-null values -- finishBattle requires them once the dismiss press
// completes terminal-handoff), then swaps in a synthetic terminal battle +
// resolution already at commandIndex 1 (trainer-slide, phaseElapsed 0) --
// i.e. app frame 0 == oracle tick 2996 of the committed LOSS fixture
// (docs/terminal-seam-loss-path-ground-truth.md), already past the
// opponent's return-to-ball recall (oracle ticks 2951-2995), which this
// window deliberately excludes. The event shape is the real one
// tests/battleScriptFaintedActionsOrchestration.test.ts's "player's last mon
// faints" test proves the kernel emits for LOSS; opponentTrainer is DESTIN
// (trainerId 50), matching the fixture.
function lossTerminalWindowStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "loss-terminal-window-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("loss terminal window stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  if (orchestrator.aiHistory === null || orchestrator.activeBattleCallStart === null) {
    throw new Error("loss terminal window stage requires a live started battle");
  }

  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: TERMINAL_SEAM_SCAFFOLD_PLAYER,
    trainer: TERMINAL_SEAM_SCAFFOLD_TRAINER,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("terminal seam scaffold has no source command");
  }
  const terminalBattle = Object.freeze({
    ...createBattleState({
      rules: initial.rules,
      rngSeed: 9,
      request: initial.boundary.request,
    }),
    boundary: Object.freeze({ kind: "terminal" as const, outcome: "trainer-win" as const }),
  });
  const events: readonly BattleKernelSemanticEvent[] = [
    // ISSUES #73 (B)+(C): the real segment this window is edge-relative to
    // still holds the antecedent "MURKROW fainted!" box (ground-truth doc
    // §2, frames 2896-2945), and all 3 player mons are already fainted
    // (§0) -- both are the SAME real event, MURKROW's own Explosion self-KO
    // (setatkhptozero unconditionally zeroes the user's HP, §0's staging
    // note), replayed through the real health-bar-update -> hp-change ->
    // faint-animation -> STRINGID_ATTACKERFAINTED chain (not
    // STRINGID_TARGETFAINTED -- the *user* of the move is the one who
    // faints here). The real "faint" command this produces generically
    // clears both the player's sprite and healthbox (the same
    // `fainted`-gated visibility every other faint already uses), so it
    // fixes (C) as a side effect without a separate synthetic event.
    terminalSeamEvent(0, { kind: "health-bar-update", battler: 0, healthValue: 200 }),
    terminalSeamEvent(1, { kind: "hp-change", battler: 0, from: 200, to: 0 }),
    terminalSeamEvent(2, { kind: "faint-animation", battler: 0 }),
    terminalSeamEvent(3, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
    // The real CONTROLLER_RETURNMONTOBALL recall (A): opponent Dusclops.
    terminalSeamEvent(4, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }, { opcodeName: "B_SCR_OP_VARIOUS" }),
    terminalSeamEvent(5, { kind: "trainer-slide-in", battler: 1 }),
    // docs/terminal-seam-antecedent-boundary-probe.md §3: the oracle's real
    // printstring dispatch lands 3 ticks after the trainer-slide's own
    // completion -- three independently-caused one-tick holds stacked, not
    // one "cadence" mechanism. Each filler below reuses the sprite-visibility
    // command type as a genuine 1-frame no-op (opponent battler 1 is already
    // invisible from the real recall event above, so re-asserting it changes
    // nothing) purely to consume exactly one presentation-command tick each;
    // `BattleSpriteVisibilityTiming.minimumFrames` is literal-typed to 1, so
    // three separate commands -- not one command scaled to 3 -- is how this
    // scaffold reproduces the exact tick count without editing src/.
    // §3(1) interpreter-visibility lag: the slide sprite's completion clears
    // gBattleControllerExecFlags mid-frame, one tick after the interpreter's
    // own call already sampled the pre-clear value.
    terminalSeamEvent(6, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    // §3(2) one-opcode-per-tick budget: the parked `waitstate` opcode only
    // advances gBattlescriptCurrInstr to printstring's own address this
    // tick; printstring itself cannot also run the same tick.
    terminalSeamEvent(7, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    // §3(3) RAM-to-pixel render lag: printstring's same-tick AddTextPrinter
    // call is not visible in the framebuffer until the following tick (the
    // same +1 lag already established for an unrelated window by
    // tools/probe/verify-turn4-kickoff-textgate-rule.py).
    terminalSeamEvent(8, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    terminalSeamEvent(9, { kind: "message", messageId: "STRINGID_TRAINER1WINTEXT", substitutions: [] }),
  ];
  const transition = Object.freeze({
    kind: "terminal" as const,
    state: terminalBattle,
    events: Object.freeze(events),
    outcome: "trainer-win" as const,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  const command = createBattleCommandPresentation(initial.boundary.request, initial.rules.rulesContext, 0);
  const input: CreateBattleResolutionPresentationInput = {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    opponentTrainer: getFactoryTrainerPresentation(50),
  };
  // Commands 0-2 (the player's antecedent faint chain: hp/faint/message)
  // and command 3 (opponent recall) are all out-of-window housekeeping this
  // edge-relative scaffold places before its own frame 0 -- hand-set
  // directly to commandIndex 4 (the trainer slide) rather than replayed
  // through real per-tick advancement, matching the same "outside real
  // ticks" idiom the prior single-command skip used (ISSUES #73).
  const resolution = Object.freeze({
    ...createBattleResolutionPresentation(input),
    commandIndex: 4,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    confirmHandoff: null,
  });
  const boundaries = createTerminalSeamPresentationBoundaries(
    command,
    terminalBattle,
    orchestrator.moveSelectionCursors,
  );

  const swapped = Object.freeze({
    ...orchestrator,
    battle: terminalBattle,
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    battlePresentationBoundaries: boundaries,
  });

  return {
    ...state,
    factoryRoundBattleOrchestrator: swapped,
    rngMode: "frontierBattle",
    rngValue: swapped.battle?.rng.value ?? state.rngValue,
  };
}

// ISSUES #73 WIN window: the sibling of lossTerminalWindowStage above, over
// the banked WIN fixture (docs/terminal-seam-win-window-ground-truth.md,
// tools/battle-lab/win-terminal-explosion-dusclops-off.json). Same
// edge-relative-scaffold technique (a real orchestrator swapped onto a
// synthetic terminal battle at a fixed commandIndex), but the WIN script
// (BattleScript_FrontierTrainerBattleWon) differs from LOSS in exactly the
// two ways the ground-truth doc's §4 flags: (a) no opponent-recall step at
// all -- the opponent's own Explosion self-KO already clears its sprite via
// the ordinary faint-sink before the terminal sequence starts, so this
// window's frame 0 (oracle tick 4613, docs/terminal-seam-win-window-probe.md
// §3) sits right after STRINGID_PLAYERDEFEATEDTRAINER1's own dismiss, not
// after a recall; (b) that STRINGID_PLAYERDEFEATEDTRAINER1 message is a real
// extra button-gated printstring the LOSS script never has, printed between
// the antecedent fainted text and the trainer slide -- and, per
// terminal-seam-loss-path-ground-truth.md §6, it KEEPS its down-arrow cursor
// (unlike the two bare-placeholder quote ids), so it is this window's
// held-cursor antecedent, not the fainted message beneath it. The antecedent
// faint chain replays through the opponent's own battler (1), not the
// player's (0) -- MURKROW is the opponent's own last mon here (ground-truth
// doc §0/§2), matching TERMINAL_SEAM_SCAFFOLD_TRAINER's species (198)
// already used for battler 1.

// ISSUES #55 battle-2 opponent provenance (docs/win-battle2-opponent-
// provenance-receipt.md §7): on this WIN GO ON route the ROM's real battle-2
// opponent is trainer 9 LILIANA, set-selected single-frame (frame 6636) from
// pre-call cursor 0x7399E3AE (4 gapless draws: trainer + sets 169/170/130),
// with personalities constructed 32 frames later under per-mon cursors
// [0x2F959DF4, 0xBD6F8138, 0xDE320F3A] (interleaved ambient VBlank ticks).
// The ported generator is byte-exact; only the single-cursor construction
// contract is wrong (ISSUES #55), so this scaffold adopts the per-mon
// schedule at the GO ON pre-generation seam (config.adoptedNextOpponent)
// instead of re-rolling the personalities back-to-back from one cursor.
const WIN_TERMINAL_SELECTION_RNG_VALUE = 0x7399e3ae;
const WIN_TERMINAL_PLAYER_TRAINER_ID = 416_049_562;
const WIN_TERMINAL_SAVED_RENTAL_SET_IDS = [156, 149, 180, 188, 184, 135] as const;
const WIN_TERMINAL_SET_IDS = [169, 170, 130] as const;
const WIN_TERMINAL_CONSTRUCTION_RNG_VALUES = [0x2f959df4, 0xbd6f8138, 0xde320f3a] as const;

function winTerminalNextOpponentGeneration(): FactoryOpponentGenerationResult {
  const selection = generateFactoryOpponent({
    rngValue: WIN_TERMINAL_SELECTION_RNG_VALUE,
    factoryWinStreak: 1,
    battleIndex: 1,
    storedTrainerIds: [50] as const,
    savedRentalSetIds: WIN_TERMINAL_SAVED_RENTAL_SET_IDS,
    playerTrainerId: WIN_TERMINAL_PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
  });
  return adoptFactoryOpponentSchedule({
    factoryWinStreak: 1,
    battleIndex: 1,
    storedTrainerIds: [50] as const,
    savedRentalSetIds: WIN_TERMINAL_SAVED_RENTAL_SET_IDS,
    playerTrainerId: WIN_TERMINAL_PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    trainerId: 9,
    setIds: WIN_TERMINAL_SET_IDS,
    selectionDrawLedger: selection.drawLedger.filter((draw) => draw.phase !== "personality"),
    constructionRngValues: WIN_TERMINAL_CONSTRUCTION_RNG_VALUES,
  });
}

function winTerminalWindowStage(state: EngineState): EngineState {
  // The swap-offer/swap-screen fixtures (scratch-win-go-on-swap-offer-*,
  // win-terminal-explosion-dusclops-off) stage the player party as DUSCLOPS
  // (species 362) x3, so the round's player records must render the same
  // species the oracle's swap picker shows. The win-terminal window itself
  // never draws the round party (the scaffold battle does), so swapping the
  // arbitrary 664/678/527 placeholder for DUSCLOPS records is a no-op there.
  // Nature is chosen from the DUSCLOPS frontier corpus (ADAMANT/IMPISH); the
  // swap picker only renders species name + category, so any legal DUSCLOPS
  // set reproduces it (the fixture's staged HARDY personality is not
  // representable through the source corpus, which has no HARDY DUSCLOPS).
  const playerRentalRecords = [
    generatedCommandRecord(666),
    generatedCommandRecord(570),
    generatedCommandRecord(378),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "win-terminal-window-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: WIN_TERMINAL_PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        generatedCommandRecord(156),
        generatedCommandRecord(149),
        generatedCommandRecord(180),
        generatedCommandRecord(188),
        generatedCommandRecord(184),
        generatedCommandRecord(135),
      ],
    },
    adoptedNextOpponent: {
      generation: winTerminalNextOpponentGeneration(),
      battleIndex: 1,
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("win terminal window stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  if (orchestrator.aiHistory === null || orchestrator.activeBattleCallStart === null) {
    throw new Error("win terminal window stage requires a live started battle");
  }

  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: TERMINAL_SEAM_WIN_SCAFFOLD_PLAYER,
    trainer: TERMINAL_SEAM_SCAFFOLD_TRAINER,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("terminal seam scaffold has no source command");
  }
  const terminalBattle = Object.freeze({
    ...createBattleState({
      rules: initial.rules,
      // Carries the ROM's real pre-call cursor (receipt §2 row 1) through the
      // synthetic terminal resolution: `resolveRoundBattle` banks the terminal
      // `battle.rng.value` as the round's post-win `rngValue`, which is exactly
      // what `preGenerateFactoryRoundNextOpponent` reads at the GO ON edge --
      // so the battle-2 selection cursor lands on the probed 0x7399E3AE rather
      // than a modeled seed.
      rngSeed: WIN_TERMINAL_SELECTION_RNG_VALUE,
      request: initial.boundary.request,
    }),
    boundary: Object.freeze({ kind: "terminal" as const, outcome: "player-win" as const }),
  });
  const events: readonly BattleKernelSemanticEvent[] = [
    // The real segment this window is edge-relative to still holds the
    // antecedent "Foe MURKROW fainted!" box before STRINGID_PLAYERDEFEATED-
    // TRAINER1 ever prints (docs/terminal-seam-win-window-ground-truth.md
    // §2, ticks ~3592-4206) -- MURKROW's own Explosion self-KO
    // (setatkhptozero unconditionally zeroes the *attacker's* HP, same
    // source fact the LOSS doc cites, just on the opponent's own battler
    // here), replayed through the real health-bar-update -> hp-change ->
    // faint-animation -> STRINGID_ATTACKERFAINTED chain on battler 1.
    terminalSeamEvent(0, { kind: "health-bar-update", battler: 1, healthValue: 135 }),
    terminalSeamEvent(1, { kind: "hp-change", battler: 1, from: 135, to: 0 }),
    terminalSeamEvent(2, { kind: "faint-animation", battler: 1 }),
    terminalSeamEvent(3, { kind: "message", messageId: "STRINGID_ATTACKERFAINTED", substitutions: [] }),
    // Real WIN-only step: checkteamslost flips the outcome, then
    // BattleScript_FrontierTrainerBattleWon prints STRINGID_PLAYERDEFEATED-
    // TRAINER1 (ground-truth doc §2, ticks 4219/4229-4265) -- this window's
    // own held-cursor antecedent (probe doc §1: cursor KEPT). No recall
    // event follows it (ground-truth doc §4(1)): the trainer slide dispatches
    // directly off this message's own dismiss.
    terminalSeamEvent(4, { kind: "message", messageId: "STRINGID_PLAYERDEFEATEDTRAINER1", substitutions: [] }),
    terminalSeamEvent(5, { kind: "trainer-slide-in", battler: 1 }),
    // docs/terminal-seam-win-window-probe.md §2: the same 3-independently-
    // caused-one-tick-hold swap-edge shape the LOSS probe doc found,
    // RAM-confirmed again here on BattleScript_FrontierTrainerBattleWon_
    // LoseTexts's identical trainerslidein/waitstate/printstring sequence.
    // Battler 1's sprite is already invisible via the ordinary faint-sink
    // (ground-truth doc §2: "opponent sprite + healthbox already fully gone"
    // by the time the fainted text even settles), so re-asserting it here is
    // a genuine no-op purely consuming one presentation-command tick each.
    terminalSeamEvent(6, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    terminalSeamEvent(7, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    terminalSeamEvent(8, { kind: "set-battler-sprite-visibility", battler: 1, invisible: true }),
    terminalSeamEvent(9, { kind: "message", messageId: "STRINGID_TRAINER1LOSETEXT", substitutions: [] }),
  ];
  const transition = Object.freeze({
    kind: "terminal" as const,
    state: terminalBattle,
    events: Object.freeze(events),
    outcome: "player-win" as const,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  const command = createBattleCommandPresentation(initial.boundary.request, initial.rules.rulesContext, 0);
  const input: CreateBattleResolutionPresentationInput = {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    opponentTrainer: getFactoryTrainerPresentation(50),
  };
  // Commands 0-2 (the antecedent faint chain: hp/faint/message) and command
  // 3 (STRINGID_PLAYERDEFEATEDTRAINER1) are all out-of-window housekeeping
  // this edge-relative scaffold places before its own frame 0 -- hand-set
  // directly to commandIndex 4 (the trainer slide) rather than replayed
  // through real per-tick advancement, matching the same "outside real
  // ticks" idiom lossTerminalWindowStage uses.
  const resolution = Object.freeze({
    ...createBattleResolutionPresentation(input),
    commandIndex: 4,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    confirmHandoff: null,
  });
  const boundaries = createTerminalSeamPresentationBoundaries(
    command,
    terminalBattle,
    orchestrator.moveSelectionCursors,
  );

  const swapped = Object.freeze({
    ...orchestrator,
    battle: terminalBattle,
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    battlePresentationBoundaries: boundaries,
  });

  return {
    ...state,
    factoryRoundBattleOrchestrator: swapped,
    rngMode: "frontierBattle",
    rngValue: swapped.battle?.rng.value ?? state.rngValue,
  };
}

// ISSUES #78 dense-compare wiring: the scout's staged mid-battle switch
// fixture (tools/battle-lab/scratch-mid-battle-switch-dense-*-off.json)
// stages BOTH sides as three Level-50 RATTATA (species 19) with SPLASH x4,
// seed 1. The frontier corpus has no such set, so the battle is staged
// directly via createFactoryFullTurnBattleState (the same staged-battle seam
// battle2-off-turn1-before-confirm and the terminal scaffolds use) and
// installed into a real orchestrator at the fixture's fight-menu-open
// checkpoint (frame 0). The orchestrator's live route then replays the
// fixture's verbatim segments: turn-1 double SPLASH, the party-menu voluntary
// switch to slot 1, and the switch-in cadence (ISSUES #78 slices 1-3).
const RATTATA_LV50: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 19,
  // The oracle fixture leaves personalities unpinned, and the ROM derived
  // BOTH actives male: their healthbox gender glyphs render in the male
  // colors (fg 66,206,255) at (52,21)/(174,79) in the dense-a captures --
  // this was the two-cluster "48px residual" misattributed to a RATTATA
  // sprite-palette gap in PROGRESS 956. getMonGender is male when
  // (personality & 0xff) >= genderRatio (127 for RATTATA); 150 % 25 == 0
  // also preserves the default personality-0 HARDY nature bits carried
  // through switch reconstruction. Bench members stay personality 0
  // (female): the switched-in slot-1 mon's healthbox matches the oracle
  // as female (post-switch frames carry only the opponent-box cluster).
  personality: 150,
  moveId: 150, // MOVE_SPLASH
  moves: [150, 150, 150, 150] as const,
  pp: [40, 40, 40, 40] as const,
  ability: 50, // ABILITY_RUN_AWAY
  abilityNum: 0,
  item: 0,
  friendship: 0,
  attack: 76,
  defense: 55,
  spAttack: 45,
  spDefense: 55,
  speed: 92,
  hp: 105,
  maxHp: 105,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
});

const RATTATA_LV50_BENCH: BattleScriptPartyMemberInput = Object.freeze({
  species: 19,
  isEgg: false,
  abilityNum: 0,
  personality: 0,
  level: 50,
  friendship: 0,
  hp: 105,
  maxHP: 105,
  attack: 76,
  defense: 55,
  speed: 92,
  spAttack: 45,
  spDefense: 55,
  status1: 0,
  item: 0,
  moves: [150, 150, 150, 150] as const,
  pp: [40, 40, 40, 40] as const,
});

// pmo239: the same staged battle with a distinct-species player bench (PIDGEY, MACHOP: the ROM-derived stats / personalities of
// tools/battle-lab/pmo239-switch-0-to-2-reopen-off.json), so a reordered party menu is visible row by row.
const PMO239_PIDGEY_BENCH: BattleScriptPartyMemberInput = Object.freeze({
  ...RATTATA_LV50_BENCH,
  species: 16, personality: 1013904250, hp: 115, maxHP: 115, attack: 65, defense: 60, speed: 76, spAttack: 55, spDefense: 55,
});
const PMO239_MACHOP_BENCH: BattleScriptPartyMemberInput = Object.freeze({
  ...RATTATA_LV50_BENCH,
  species: 66, personality: 3668340025, hp: 145, maxHP: 145, attack: 100, defense: 70, speed: 55, spAttack: 55, spDefense: 55,
});

function midBattleSwitchDenseOffStage(state: EngineState): EngineState {
  return midBattleSwitchStage(state, "mid-battle-switch-dense-off", [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105]);
}

// aud241b: hit / faint / low-HP sound windows (tools/battle-lab/aud241b-*.json): both sides are Rattata at
// the given levels with SEISMIC TOSS x4 (a fixed, RNG-free damage equal to the attacker's level), so the faint
// and red-HP turns are deterministic. Stats are the ROM's for nature 0, IV 31, EV 0.
function rattataAtLevel(level: number, moveId = 69, item = 0): FactoryFullTurnBattlerConfig {
  const stat = (base: number, hp = false): number => {
    const raw = Math.floor(((2 * base + 31) * level) / 100);
    return hp ? raw + level + 10 : raw + 5;
  };
  const hp = stat(30, true);
  return Object.freeze({
    ...RATTATA_LV50,
    level,
    item,
    moveId,
    moves: [moveId, moveId, moveId, moveId] as const,
    pp: [20, 20, 20, 20] as const,
    attack: stat(56),
    defense: stat(35),
    spAttack: stat(25),
    spDefense: stat(35),
    speed: stat(72),
    hp,
    maxHp: hp,
  });
}

function aud241bStage(
  state: EngineState,
  id: string,
  scene: "on" | "off",
  playerLevel: number,
  opponentLevel: number,
  playerMoveId = 69,
  lastFaint?: "opponent" | "player",
  frontierBrain = false,
  opponentMoveId = 69,
  rngSeed = 1,
  firstTurn = false,
): EngineState {
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    rngSeed,
    ...(firstTurn ? { firstTurn } : {}),
    ...(lastFaint === "opponent" ? { trainerBenchHp: null } : {}),
    ...(lastFaint === "player" ? { playerBenchNone: true } : {}),
    ...(frontierBrain ? { frontierBrain } : {}),
    battleScene: scene,
    player: rattataAtLevel(playerLevel, playerMoveId),
    trainer: rattataAtLevel(opponentLevel, opponentMoveId),
    usedMessageHoldFrames: 0,
    sceneOffNoAnimations: scene === "off",
  });
}

// aud242l: aud241bStage with the Blizzard user (Lv50) and a Seismic Toss target (Lv12) of the given species (attacker side `side`).
function aud242lBlizzardStage(state: EngineState, id: string, side: "player" | "opponent", attackerSpecies: number, targetSpecies: number, attackerMove = 59, attackerTypes?: readonly [string, string]): EngineState {
  const attacker = Object.freeze({ ...rattataAtLevel(50, attackerMove), species: attackerSpecies, ...(attackerTypes === undefined ? {} : { types: attackerTypes }) });
  const target = Object.freeze({ ...rattataAtLevel(12, 69), species: targetSpecies });
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: "on",
    player: side === "player" ? attacker : target,
    trainer: side === "player" ? target : attacker,
    usedMessageHoldFrames: 0,
    sceneOffNoAnimations: false,
  });
}

// hie1: held-item effect windows (tools/battle-lab/hie1-*.json): the player's Rattata holds `playerItem`; the opponent's move / level is
// chosen per site so the item fires (Leftovers end-turn, Sitrus after the hit, Shell Bell on the player's hit, Cheri cures Thunder Wave).
function hie1Stage(
  state: EngineState,
  id: string,
  scene: "on" | "off",
  playerLevel: number,
  opponentLevel: number,
  playerItem: number,
  opponentMoveId = 69,
): EngineState {
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: scene,
    player: rattataAtLevel(playerLevel, 69, playerItem),
    trainer: rattataAtLevel(opponentLevel, opponentMoveId),
    usedMessageHoldFrames: 0,
    sceneOffNoAnimations: scene === "off",
  });
}

// wsh1: Wish / Future Sight / Focus Band windows (tools/battle-lab/wsh1-*.json): Rattata pair, the player's move / item and the lab seed vary.
function wsh1Stage(
  state: EngineState,
  id: string,
  scene: "on" | "off",
  playerLevel: number,
  opponentLevel: number,
  playerMoveId: number,
  playerItem = 0,
  rngSeed = 1,
): EngineState {
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: scene,
    player: rattataAtLevel(playerLevel, playerMoveId, playerItem),
    trainer: rattataAtLevel(opponentLevel, 69),
    usedMessageHoldFrames: 0,
    sceneOffNoAnimations: scene === "off",
    rngSeed,
  });
}

// wsh1b: the Wisher's second move (slot 2) is DIG (the heal's `playanimation` meets a STATUS3_SEMI_INVULNERABLE battler) or SUBSTITUTE
// (the heal meets the displayed doll, TryHandleLaunchBattleTableAnimation); Scene ON skips the animation either way.
function wsh1bWishDigStage(state: EngineState, id: string, scene: "on" | "off", secondMove = 91): EngineState {
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: scene,
    player: Object.freeze({ ...rattataAtLevel(50, 273), moves: [273, secondMove, 273, 273] as const }),
    trainer: rattataAtLevel(12, 69),
    usedMessageHoldFrames: 0,
    sceneOffNoAnimations: scene === "off",
  });
}

// cry1: cry-task windows (tools/battle-lab/cry1-*.json): the attacker's species is staged over the Rattata stats (the cry follows the species; levels 50 / 12 as aud241b,
// the other side uses SEISMIC TOSS, a modelled move, as the filler: Roar's -6 priority makes it move first).
function cry1Stage(state: EngineState, id: string, species: number, attackerSide: "player" | "opponent", moveId: number): EngineState {
  const attacker = { ...rattataAtLevel(50, moveId), species };
  return midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: "on",
    player: attackerSide === "player" ? attacker : rattataAtLevel(20, 69),
    trainer: attackerSide === "player" ? rattataAtLevel(12, 69) : { ...rattataAtLevel(12, moveId), species },
    usedMessageHoldFrames: 0,
  });
}

// frf250a: the lab's frame 0 is some frames into the menu's idle bounce (the lab boots past the send-out); this staging-only
// age aligns the app's bounce clock with each scene's ROM lab (measured: ON 27, OFF 34 of the 36-frame period).
function frf250aStage(state: EngineState, bounceAge: number): EngineState {
  const o = state.factoryRoundBattleOrchestrator;
  if (o === null || o.battleCommandPresentation === null) throw new Error("frf250a stage needs a command presentation");
  const k = bounceAge;
  return {
    ...state,
    factoryRoundBattleOrchestrator: Object.freeze({
      ...o,
      battleCommandPresentation: Object.freeze({ ...o.battleCommandPresentation, idleBounceElapsed: k }),
    }),
  };
}

// enc276: frf250a's Rattata pair with the SPLASH turn's controller hold on the staged turn; the Struggle window's later turn uses Struggle (no SPLASH hold).
function enc276Stage(state: EngineState, id: string, scene: "on" | "off", opponentMoveId: number, bounceAge: number): EngineState {
  return frf250aStage(midBattleSwitchStage(state, id, [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: scene,
    player: rattataAtLevel(50, 150),
    trainer: rattataAtLevel(40, opponentMoveId),
    sceneOffNoAnimations: scene === "off",
    // Struggle: the turn-2 used-move hold is not SPLASH's; Scene ON's Struggle body starts 8 frames after the app's own (a generic body-start residual, not the forced-turn handoff).
    ...(opponentMoveId === 269 ? { laterTurnsUsedMessageHoldFrames: scene === "on" ? 8 : 0 } : {}),
  }), bounceAge);
}

function pmo239SwitchReopenOffStage(state: EngineState): EngineState {
  return midBattleSwitchStage(state, "pmo239-switch-0-to-2-off", [PMO239_PIDGEY_BENCH, PMO239_MACHOP_BENCH], [115, 145]);
}

type MidBattleSwitchStageOptions = Readonly<{
  battleScene?: "on" | "off";
  player?: FactoryFullTurnBattlerConfig;
  trainer?: FactoryFullTurnBattlerConfig;
  usedMessageHoldFrames?: number;
  /** The hold for every turn after the staged first one (the SPLASH controller hold belongs to the SPLASH turn only). */
  laterTurnsUsedMessageHoldFrames?: number;
  sceneOffNoAnimations?: boolean;
  /** wsh1: the staged battle's RNG seed (the lab's `seed`); default 1. */
  rngSeed?: number;
  /** `null`: no bench for that side (the last faint is a hard terminal, the full-turn reducer's default shape). */
  trainerBenchHp?: readonly [number, number] | null;
  playerBenchNone?: boolean;
  /** Stage the 21st battle of the run: the Silver Factory Head round (`currentOpponent.frontierBrain`). */
  frontierBrain?: boolean;
  /** aud259: the staged battle's RNG seed (default 1); a sub-100 accuracy move can miss in the engine while the ROM lab hits. */
  rngSeed?: number;
  /** aud259: both staged battlers start with isFirstTurn 1 (a fresh battle's first selection), as the ROM lab's Fake Out needs. */
  firstTurn?: boolean;
}>;

function midBattleSwitchStage(
  state: EngineState,
  id: string,
  playerBench: readonly [BattleScriptPartyMemberInput, BattleScriptPartyMemberInput],
  playerBenchHp: readonly [number, number],
  options: MidBattleSwitchStageOptions = {},
): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  const usedMessageHold = options.usedMessageHoldFrames ?? USED_MESSAGE_SPLASH_CONTROLLER_HOLD_FRAMES;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id,
    ...(options.battleScene === undefined ? {} : { battleScene: options.battleScene }),
    rngValue: 4,
    factoryWinStreak: options.frontierBrain === true ? 20 : 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("mid-battle switch stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  if (orchestrator.battle === null || orchestrator.activeBattleCallStart === null) {
    throw new Error("mid-battle switch stage requires a live started battle");
  }
  const stagedOn = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: options.rngSeed ?? 1,
    player: options.player ?? RATTATA_LV50,
    trainer: options.trainer ?? RATTATA_LV50,
    ...(options.playerBenchNone === true
      ? {}
      : { playerBenchHp: [...playerBenchHp] as [number, number], playerBenchOverride: [...playerBench] as [BattleScriptPartyMemberInput, BattleScriptPartyMemberInput] }),
    ...(options.trainerBenchHp === null
      ? {}
      : {
          trainerBenchHp: [...(options.trainerBenchHp ?? [105, 105])] as [number, number],
          trainerBenchOverride: [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH] as [BattleScriptPartyMemberInput, BattleScriptPartyMemberInput],
        }),
  });
  // Scene OFF: factoryBattleStart.ts sets HITMARKER_NO_ANIMATIONS for the whole battle; the staged state starts with hitMarker 0.
  const staged = options.sceneOffNoAnimations !== true && options.firstTurn !== true
    ? stagedOn
    : createFactoryFullTurnBattleStateFromRulesContext({
      requestId: 1,
      rngSeed: options.rngSeed ?? 1,
      rulesContext: Object.freeze({
        ...stagedOn.rules.rulesContext,
        ...(options.sceneOffNoAnimations === true
          ? { hitMarker: (stagedOn.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 }
          : {}),
        ...(options.firstTurn === true
          ? { battlers: Object.freeze(stagedOn.rules.rulesContext.battlers.map((b) => Object.freeze({ ...b, isFirstTurn: 1 }))) as typeof stagedOn.rules.rulesContext.battlers }
          : {}),
      }),
    });
  if (
    staged.boundary.kind !== "decision-required"
    || staged.boundary.request.kind !== "command"
  ) {
    throw new Error("mid-battle switch staged battle has no player command boundary");
  }
  const cursors: FactoryBattleMoveSelectionCursors = Object.freeze([0, 0, 0, 0]);
  const presentation: BattleCommandPresentationState = Object.freeze({
    ...createBattleCommandPresentation(
      staged.boundary.request,
      staged.rules.rulesContext,
      cursors[0],
      BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
      // Route-scoped used-move hold (ISSUES #81 / #78): the SPLASH no-anim
      // attackstring is held by its `attackanimation`/`waitanimation`
      // controller span (measured 39 = 1265-1303 in
      // docs/battle-message-pacing-ground-truth.md §2), shared by the
      // dense-a and pacing-b fixtures (identical scenarios).
      usedMessageHold,
    ),
    // The fixture's frame 0 is the already-interactive action menu (its first
    // segment is an A press at frame 0), so the app stage must skip the
    // action-enter delay the generated-route carrier otherwise starts in.
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
  });
  const boundaries = Object.freeze(
    ([presentation.field.player, presentation.field.opponent] as const).map(
      (field, battler) => {
        const active = staged.rules.rulesContext.battlers[battler]!;
        return Object.freeze({
          battler: battler as 0 | 1,
          partyIndex: field.partyIndex,
          field,
          displayedHp: field.hp,
          displayedStatus1: active.status1,
          spriteVisible: true,
          idleEpoch: 0,
          moveCursor: cursors[battler]!,
        });
      },
    ),
  ) as unknown as FactoryBattlePresentationBoundaries;
  const swapped: FactoryRoundBattleOrchestratorState = Object.freeze({
    ...orchestrator,
    battle: staged,
    battleCommandPresentation: presentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors: cursors,
    battlePresentationBoundaries: boundaries,
    aiHistory: createFactoryAiBattleHistory(staged.rules.rulesContext),
    usedMessageHoldFrames: options.laterTurnsUsedMessageHoldFrames ?? usedMessageHold,
  });
  return {
    ...state,
    factoryRoundBattleOrchestrator: swapped,
    rngMode: "frontierBattle",
    rngValue: swapped.battle?.rng.value ?? state.rngValue,
  };
}

// ISSUES #80 rank 5 dense-compare wiring: the party-menu status/held-item
// fixture (tools/battle-lab/party-menu-status-item-off.json) extends the
// mid-battle-switch dense-a recipe with the player's three real held items
// (slot 0 Leftovers 200, slot 1 Silk Scarf 217, slot 2 Quick Claw 183) and
// the opponent using THUNDER_WAVE (86) x4 (the Factory AI's only legal
// choice, no AI injection). The live route then replays the fixture's
// verbatim segments: turn-1 Thunder Wave PRZ's slot 0, the first party-menu
// voluntary switch to slot 1, turn-2 Thunder Wave PRZ's slot 1, and the
// second party-menu open settles with slot 0 benched-and-PRZ'd, slot 1
// active-and-PRZ'd, slot 2 clean -- the three-way status/item contrast the
// doc's §4 acceptance measures.
const THUNDER_WAVE_LV50: FactoryFullTurnBattlerConfig = Object.freeze({
  ...RATTATA_LV50,
  moveId: 86, // MOVE_THUNDER_WAVE
  moves: [86, 86, 86, 86] as const,
  pp: [20, 20, 20, 20] as const,
});

// ISSUES #80 settled-band gender fix: the fixture's oracle party is
// slot 0 = item 200 bench female, slot 1 = item 217 ACTIVE male, slot 2 =
// item 183 bench female (RATTATA genderRatio 127; bench personalities low
// byte 0 render female, the active personality 150 male). These overrides
// pin the same personalities onto the item-bearing slots so the party-menu
// gender glyphs match -- before RATTATA's genderRatio was banked, memberGender
// fell back to "male" on every slot and masked the placement.
const RATTATA_LV50_ITEM_SLOT0: FactoryFullTurnBattlerConfig = Object.freeze({
  ...RATTATA_LV50,
  item: 200, // ITEM_LEFTOVERS
  personality: 0, // bench female
});

const RATTATA_LV50_ITEM_BENCH: BattleScriptPartyMemberInput = Object.freeze({
  ...RATTATA_LV50_BENCH,
  item: 217, // ITEM_SILK_SCARF (slot 1, the active male)
  personality: 150,
});

const RATTATA_LV50_ITEM_BENCH2: BattleScriptPartyMemberInput = Object.freeze({
  ...RATTATA_LV50_BENCH,
  item: 183, // ITEM_QUICK_CLAW (slot 2)
  personality: 0, // bench female
});

function partyMenuStatusItemOffStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "party-menu-status-item-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("party-menu status/item stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  if (orchestrator.battle === null || orchestrator.activeBattleCallStart === null) {
    throw new Error("party-menu status/item stage requires a live started battle");
  }
  const staged = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: RATTATA_LV50_ITEM_SLOT0,
    trainer: THUNDER_WAVE_LV50,
    playerBenchHp: [105, 105],
    playerBenchOverride: [RATTATA_LV50_ITEM_BENCH, RATTATA_LV50_ITEM_BENCH2],
    trainerBenchHp: [105, 105],
    trainerBenchOverride: [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH],
  });
  if (
    staged.boundary.kind !== "decision-required"
    || staged.boundary.request.kind !== "command"
  ) {
    throw new Error("party-menu status/item staged battle has no player command boundary");
  }
  const cursors: FactoryBattleMoveSelectionCursors = Object.freeze([0, 0, 0, 0]);
  const presentation: BattleCommandPresentationState = Object.freeze({
    ...createBattleCommandPresentation(
      staged.boundary.request,
      staged.rules.rulesContext,
      cursors[0],
    ),
    // The fixture's frame 0 is the already-interactive action menu (its first
    // segment is an A press at frame 0), exactly like mid-battle-switch-dense-off.
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
  });
  const boundaries = Object.freeze(
    ([presentation.field.player, presentation.field.opponent] as const).map(
      (field, battler) => {
        const active = staged.rules.rulesContext.battlers[battler]!;
        return Object.freeze({
          battler: battler as 0 | 1,
          partyIndex: field.partyIndex,
          field,
          displayedHp: field.hp,
          displayedStatus1: active.status1,
          spriteVisible: true,
          idleEpoch: 0,
          moveCursor: cursors[battler]!,
        });
      },
    ),
  ) as unknown as FactoryBattlePresentationBoundaries;
  const swapped: FactoryRoundBattleOrchestratorState = Object.freeze({
    ...orchestrator,
    battle: staged,
    battleCommandPresentation: presentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors: cursors,
    battlePresentationBoundaries: boundaries,
    aiHistory: createFactoryAiBattleHistory(staged.rules.rulesContext),
  });
  return {
    ...state,
    factoryRoundBattleOrchestrator: swapped,
    rngMode: "frontierBattle",
    rngValue: swapped.battle?.rng.value ?? state.rngValue,
  };
}

// ISSUES #81 dense-compare wiring: the Torment selection-rejection fixture
// (tools/battle-lab/mechanic-selection-reject-torment-off.json) stages
// BUTTERFREE (TACKLE/GUST) vs MURKROW (TORMENT x4), seed 1; turn 1 lands
// TORMENT on the player and leaves TACKLE as gLastMoves[0], so turn 2's
// fight menu flags slot 0 (`rejectionReasonBySlot`) and the commit types the
// rejection message. The app cannot replay turn 1 byte-for-byte yet, so the
// stage installs the post-turn-1 checkpoint directly at the fixture's
// turn-2 frame 734: a staged full-turn battle with the player already
// Tormented and TACKLE as the last move, the command presentation in the
// interactive action-menu phase, and the live orchestrator replaying the
// fixture's verbatim segments from there.
const BUTTERFREE_TORMENTED_LV50: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12,
  moves: [33, 16, 0, 0] as const, // TACKLE, GUST
  // Same staged-gender class as MURKROW: the oracle's BUTTERFREE is male
  // (the ~24px "detail-box type cell" residual at (190-194, 79-87) is the
  // player-healthbox gender glyph; fixture pins `"gender": "male"`).
  // BUTTERFREE genderRatio 127; personality 150 => male, HARDY bits.
  // Also stages the oracle's real post-turn-1 TACKLE PP: turn 1 used TACKLE
  // once, so currentPP[0] is 34, not 35 (the "34/35" PP digit at
  // (208-213, 124-133) - docs/fight-menu-chrome-ground-truth.md §4).
  personality: 150,
  pp: [34, 35, 0, 0] as const,
  attack: 65,
  defense: 70,
  spAttack: 100,
  spDefense: 100,
  speed: 90,
  hp: 135,
  maxHp: 135,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
  status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
  lastMove: 33, // TACKLE -- the banned last move
});

const MURKROW_TORMENT_LV50: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198,
  // Same staged-gender class as RATTATA_LV50 above: the oracle's ROM-derived
  // MURKROW is male (the ~24px "pink-vs-cyan" cluster at (55,21)-(59,28) in
  // PROGRESS 958's residual list is the opponent healthbox gender glyph, not
  // a move-target arrow). MURKROW genderRatio 127; 150 => male, HARDY bits.
  personality: 150,
  moves: [259, 259, 259, 259] as const, // TORMENT x4 (constrain-to-one-legal-choice idiom)
  pp: [15, 15, 15, 15] as const,
  attack: 105,
  defense: 62,
  spAttack: 105,
  spDefense: 62,
  speed: 111,
  hp: 119,
  maxHp: 135,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

function tormentSelectionRejectionOffStage(state: EngineState): EngineState {
  const playerRentalRecords = [
    generatedCommandRecord(664),
    generatedCommandRecord(678),
    generatedCommandRecord(527),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "mechanic-selection-reject-torment-off",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(1),
        generatedCommandRecord(2),
        generatedCommandRecord(3),
      ],
    },
  });
  const commandId = orchestrator.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("torment rejection stage requires the battle-start command");
  }
  orchestrator = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(orchestrator, { commandId }),
  );
  if (orchestrator.battle === null || orchestrator.activeBattleCallStart === null) {
    throw new Error("torment rejection stage requires a live started battle");
  }
  const staged = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: BUTTERFREE_TORMENTED_LV50,
    trainer: MURKROW_TORMENT_LV50,
  });
  if (
    staged.boundary.kind !== "decision-required"
    || staged.boundary.request.kind !== "command"
  ) {
    throw new Error("torment rejection staged battle has no player command boundary");
  }
  const cursors: FactoryBattleMoveSelectionCursors = Object.freeze([0, 0, 0, 0]);
  const presentation: BattleCommandPresentationState = Object.freeze({
    ...createBattleCommandPresentation(
      staged.boundary.request,
      staged.rules.rulesContext,
      cursors[0],
      // Route-scoped idle-bounce freeze schedule (ISSUES #81 remainder 4a):
      // the torment fixture's 4/1/1 opening/message/reopen-tail freezes vs
      // battle-1's own 0/2/1+1 (docs/fight-menu-freeze-schedule-probe.md §4).
      // Only this route supplies it; every other caller keeps the battle-1
      // default.
      TORMENT_ROUTE_BOUNCE_SCHEDULE,
      // Route-scoped used-move hold (ISSUES #81 remainder 4b): the failed
      // Torment's attackstring is followed by `pause B_WAIT_TIME_SHORT`
      // (32) + ~6 dispatch with NO waitmessage, so M1 holds 38 frames
      // (oracle 1076-1113) before "But it failed!" types at 1114
      // (docs/battle-message-pacing-ground-truth.md §1).
      USED_MESSAGE_B_WAIT_TIME_SHORT_HOLD_FRAMES,
    ),
    // The fixture's frame 734 is the already-interactive turn-2 action menu
    // (its first turn-2 segment is an A press at 734-735), so the app stage
    // skips the action-enter delay, exactly like mid-battle-switch-dense-off.
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
    // Class-4 bounce entry phase (docs/fight-menu-chrome-ground-truth.md §8):
    // the real `DoBounceEffect` sprite was seeded when the turn-2 action menu
    // first polled input, 6 frames before this stage's clock starts (the
    // frame-734 action menu's `menuIdleBounce`/`commandMenuBounceY2` phase
    // lands on the oracle's schedule at `idleBounceElapsed = 7`, i.e. 1
    // first-tick reveal + 6 pre-stage bounce frames). Without this seed the
    // app's entry-relative clock is 49 index units (7 frames) behind the
    // oracle and every bounce frame shows the 857/1776px class-4 diff.
    idleBounceElapsed: 7,
  });
  const boundaries = Object.freeze(
    ([presentation.field.player, presentation.field.opponent] as const).map(
      (field, battler) => {
        const active = staged.rules.rulesContext.battlers[battler]!;
        return Object.freeze({
          battler: battler as 0 | 1,
          partyIndex: field.partyIndex,
          field,
          displayedHp: field.hp,
          displayedStatus1: active.status1,
          spriteVisible: true,
          idleEpoch: 0,
          moveCursor: cursors[battler]!,
        });
      },
    ),
  ) as unknown as FactoryBattlePresentationBoundaries;
  const swapped: FactoryRoundBattleOrchestratorState = Object.freeze({
    ...orchestrator,
    battle: staged,
    battleCommandPresentation: presentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors: cursors,
    battlePresentationBoundaries: boundaries,
    aiHistory: createFactoryAiBattleHistory(staged.rules.rulesContext),
  });
  return {
    ...state,
    factoryRoundBattleOrchestrator: swapped,
    rngMode: "frontierBattle",
    rngValue: swapped.battle?.rng.value ?? state.rngValue,
  };
}

function terminalWindowResolution(
  state: EngineState,
): BattleResolutionPresentationState | null {
  return state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
}

/**
 * docs/terminal-seam-antecedent-boundary-probe.md §2 (Class 1) + §5: the
 * shared renderer only ever draws a wait-cursor for a segment's *current*
 * command (battleResolutionPresentationRender.ts's `waitCursor` is scoped to
 * `segment.commands[commandIndex]`), so once this window's antecedent
 * button-gated, cursor-kept message (LOSS: "MURKROW fainted!"; WIN:
 * "Player defeated...") is superseded by the trainer-slide/filler commands
 * it jumps straight to, the shared renderer has no way left to know its
 * down-arrow is real leftover window content rather than cleared -- §5:
 * "not a render-layer bug", so the fix stays scaffold-only. Renders the
 * antecedent message a second time, held at its RAM-derived frozen pose
 * (`frozenCursorAge`, one constant per window -- docs/terminal-seam-
 * antecedent-boundary-probe.md §2 for LOSS, docs/terminal-seam-win-window-
 * probe.md §1 for WIN), and diffs it against the same message one tick
 * before the cursor is eligible (fully typed, not yet ready --
 * `isBattleResolutionButtonMessageReady`) to isolate exactly the arrow's own
 * pixels, independent of whatever else is on screen in the frame this mask
 * gets patched onto.
 */
function terminalWindowHeldCursorMask(
  state: EngineState,
  frozenCursorAge: number,
): ReadonlyMap<number, number> | null {
  const orchestrator = state.factoryRoundBattleOrchestrator;
  const resolution = orchestrator?.battleResolutionPresentation ?? null;
  if (!orchestrator || !resolution) return null;
  const commands = resolution.segments[resolution.segmentIndex]?.commands;
  // The *last* button-advance, cursor-kept message strictly before the
  // window's current position -- not the first. WIN's window has two such
  // candidates ahead of the trainer slide (STRINGID_ATTACKERFAINTED, then
  // STRINGID_PLAYERDEFEATEDTRAINER1 immediately before the slide itself);
  // only the second is actually still on screen, superseding the first.
  // LOSS's window only ever has one candidate, so this is a strict
  // generalization, not a behavior change for it.
  let antecedentIndex = -1;
  if (commands) {
    for (let index = Math.min(resolution.commandIndex, commands.length) - 1; index >= 0; index -= 1) {
      const candidate = commands[index]!;
      if (candidate.type === "message" && candidate.advance === "button" && !candidate.noCursor) {
        antecedentIndex = index;
        break;
      }
    }
  }
  const antecedent = antecedentIndex === -1 ? undefined : commands?.[antecedentIndex];
  if (!antecedent || antecedent.type !== "message") return null;
  const printableLength = battleStringPrintableLength(antecedent.lines);
  const at = (phaseElapsed: number): EngineState => ({
    ...state,
    factoryRoundBattleOrchestrator: {
      ...orchestrator,
      battleResolutionPresentation: {
        ...resolution,
        commandIndex: antecedentIndex,
        lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed }),
      },
    },
  });
  const withoutCursor = render(at(printableLength));
  const withCursor = render(at(printableLength + 1 + frozenCursorAge));
  const mask = new Map<number, number>();
  for (let index = 0; index < withCursor.length; index += 1) {
    if (withCursor[index] !== withoutCursor[index]) {
      mask.set(index, withCursor[index]!);
    }
  }
  return mask;
}

/**
 * docs/terminal-seam-antecedent-boundary-probe.md §2's own freeze span: held
 * from the trainer-slide command (the first command after the real dismiss)
 * through the last filler command -- every command before the swap-edge
 * quote message (`noCursor`) becomes current. Derived from the live
 * commandIndex/command shape, not a hardcoded frame range (AGENTS.md: "never
 * add another ... absolute-tick rendering branch").
 */
function terminalWindowHeldCursorActive(state: EngineState): boolean {
  const resolution = terminalWindowResolution(state);
  const commands = resolution?.segments[resolution.segmentIndex]?.commands;
  if (!resolution || !commands) return false;
  const trainerSlideIndex = commands.findIndex((command) => command.type === "trainer-slide");
  const quoteIndex = commands.findIndex(
    (command) => command.type === "message" && command.noCursor,
  );
  if (trainerSlideIndex === -1 || quoteIndex === -1) return false;
  return resolution.commandIndex >= trainerSlideIndex && resolution.commandIndex < quoteIndex;
}

function applyTerminalWindowHeldCursor(
  state: EngineState,
  rgba: Uint8Array,
  mask: ReadonlyMap<number, number> | null,
): Uint8Array {
  if (!mask || mask.size === 0 || !terminalWindowHeldCursorActive(state)) return rgba;
  const patched = rgba.slice();
  for (const [index, value] of mask) patched[index] = value;
  return patched;
}

/**
 * Stage ids whose antecedent message keeps a wait-cursor through the
 * trainer-slide/filler span, mapped to that antecedent's own RAM-probed
 * `frozenCursorAge` (docs/terminal-seam-antecedent-boundary-probe.md §2,
 * docs/terminal-seam-win-window-probe.md §1). Every other stage leaves
 * `heldCursorMask` null in `renderAppTrace` below, a no-op.
 */
const TERMINAL_WINDOW_FROZEN_CURSOR_AGE: Readonly<Record<string, number>> = {
  "loss-terminal-window-off": TERMINAL_SEAM_ANTECEDENT_FROZEN_CURSOR_AGE,
  "win-terminal-window-off": TERMINAL_SEAM_WIN_ANTECEDENT_FROZEN_CURSOR_AGE,
};

/**
 * Named, dev-time-only staging registry. A stage may replace logical state at
 * a target boundary while the oracle still replays the untouched anchor
 * trace. Production code never imports this registry.
 */
export const APP_STAGES: Readonly<Record<string, AppStage>> = {
  // iss216: the anchor deal has no duplicate species; the ROM probe pokes slot 6's monId to slot 1's
  // (tools/probe/stage-draft-same-species-off.py), the engine pokes the same identity (display unchanged).
  "iss216-dup-draft-off": (state) => ({
    ...state,
    draftScreen: {
      ...state.draftScreen,
      rentals: state.draftScreen.rentals.map((rental, i) =>
        i === 5 ? { ...rental, species: state.draftScreen.rentals[0]!.species } : rental),
    },
  }),
  "battle-command-generated-off": generatedBattleCommandStage,
  "factory-arbitrary-intro-yoshi-off": generatedBattleStartIntroArbitraryStage,
  "factory-arbitrary-intro-magneton-off": generatedBattleStartIntroMagnetonStage,
  // aud241a: Scene ON siblings (dev-only; same tuples), for the ROM sound windows on the Scene ON oracle.
  "factory-arbitrary-intro-yoshi-on": (state) => generatedBattleStartIntroArbitraryStage(state, "on"),
  "factory-arbitrary-intro-magneton-on": (state) => generatedBattleStartIntroMagnetonStage(state, "on"),
  "factory-round-battle6-lukas-reveal-off": generatedRoundBattle6LukasRevealStage,
  "factory-round-battle6-lukas-status-summary-message-off":
    generatedRoundBattle6LukasStatusSummaryMessageStage,
  "factory-round-battle7-noland-reveal-off": generatedRoundBattle7NolandRevealStage,
  "factory-round-battle7-noland-gold-reveal-off": generatedRoundBattle7NolandGoldRevealStage,
  "factory-round-battle7-noland-room-entrance-off": generatedRoundBattle7NolandRoomEntranceStage,
  "factory-round-battle7-noland-postwin-call-scene-start-off":
    generatedRoundBattle7NolandPostwinCallSceneStartStage,
  "factory-round-battle7-noland-postwin-askready-menu-open-off":
    generatedRoundBattle7NolandPostwinAskReadyMenuOpenStage,
  "factory-round-battle7-noland-silver-speech-box0-held-off":
    generatedRoundBattle7NolandSilverSpeechBox0HeldStage,
  "factory-round-battle7-noland-silver-speech-box2-opening-off":
    generatedRoundBattle7NolandSilverSpeechBox2OpeningStage,
  "factory-round-battle7-noland-silver-speech-cry-held-off":
    generatedRoundBattle7NolandSilverSpeechCryHeldStage,
  "factory-round-battle7-noland-silver-speech-page8-held-off":
    generatedRoundBattle7NolandSilverSpeechPage8HeldStage,
  "factory-round-battle7-noland-silver-speech-close-pause-off":
    generatedRoundBattle7NolandSilverSpeechClosePauseStage,
  "factory-round-battle7-noland-gold-speech-open-off":
    generatedRoundBattle7NolandGoldSpeechOpenStage,
  "factory-round-battle7-noland-gold-speech-box0-held-off":
    generatedRoundBattle7NolandGoldSpeechBox0HeldStage,
  "factory-round-battle7-noland-gold-speech-page4-held-off":
    generatedRoundBattle7NolandGoldSpeechPage4HeldStage,
  "factory-round-battle7-noland-gold-speech-close-held-off":
    generatedRoundBattle7NolandGoldSpeechCloseHeldStage,
  "factory-round-battle7-noland-gold-speech-close-pause-off":
    generatedRoundBattle7NolandGoldSpeechClosePauseStage,
  "factory-postwin-canonical-opponent-party":
    createFactoryPostwinStage(CANONICAL_POSTWIN_OPPONENT_RECORDS),
  "factory-postwin-generated-rock-unrestrained-opponent-party":
    createFactoryPostwinStage(GENERATED_POSTWIN_ROCK_UNRESTRAINED_RECORDS),
  "factory-swap-duplicate-species-enemy-picker": (state) => {
    if (!state.factorySwap) {
      throw new Error("duplicate-species stage requires the live Factory swap picker");
    }
    return {
      ...state,
      factorySwap: {
        ...state.factorySwap,
        // The stage is applied after frame 29935's deliberately rejected
        // install-edge A has already passed through tick().  Reconstruct the
        // source's now-settled HandleChooseMons callback before applying the
        // staged roster identity; otherwise the canonical GROVYLE route has
        // already entered acceptPrompt and this fixture never exercises the
        // live duplicate-species reducer at all.
        phaseElapsed: 0,
        speciesNameFade: {
          ...state.factorySwap.speciesNameFade,
          active: true,
        },
        loadedDisplaySpecies:
          state.factorySwap.controller.enemyParty[
            state.factorySwap.controller.displayCursor as 0 | 1 | 2
          ]?.species ?? null,
        controller: {
          ...state.factorySwap.controller,
          phase: "enemyPicker",
          inputReady: true,
          enemyMonId: null,
          enemyParty: [
            {
              ...state.factorySwap.controller.enemyParty[0],
              species: "MAGBY",
            },
            state.factorySwap.controller.enemyParty[1],
            state.factorySwap.controller.enemyParty[2],
          ],
        },
      },
    };
  },
  "battle2-off-turn1-before-confirm": (state) => ({
    ...state,
    rngMode: "frontierBattle",
    rngValue: 3530724670,
    battleControllerExecFlags: 1,
    battle2Turn1: null,
    stagedBattleTurn: stageFactoryFullTurnBattle(
      {
        initialState: createFactoryFullTurnBattleState({
          requestId: 1,
          rngSeed: 3530724670,
          player: {
            species: 95,
            moveId: 157,
            moves: [157, 20, 225, 201],
            pp: [10, 20, 20, 10],
            ability: 5,
            item: 142,
            friendship: 0,
            attack: 51,
            defense: 187,
            spAttack: 36,
            spDefense: 72,
            speed: 76,
            hp: 117,
            maxHp: 117,
            types: ["TYPE_ROCK", "TYPE_GROUND"],
          },
          trainer: {
            species: 140,
            moveId: 72,
            moves: [72, 246, 28, 182],
            pp: [10, 5, 15, 10],
            ability: 4,
            item: 142,
            friendship: 0,
            attack: 118,
            defense: 96,
            spAttack: 93,
            spDefense: 51,
            speed: 61,
            hp: 91,
            maxHp: 91,
            types: ["TYPE_ROCK", "TYPE_WATER"],
          },
        }),
        playerSubmission: {
          requestId: 1,
          side: "player",
          decision: {
            kind: "use-move",
            moveSlot: 0,
            targetBattler: 1,
          },
        },
        trainerSubmission: {
          requestId: 2,
          side: "trainer",
          decision: {
            kind: "use-move",
            moveSlot: 2,
            targetBattler: 0,
          },
        },
        battlers: [
          {
            battler: 0,
            name: "ONIX",
            moveNames: [
              "ROCK SLIDE",
              "BIND",
              "DRAGONBREATH",
              "SANDSTORM",
            ],
          },
          {
            battler: 1,
            name: "KABUTO",
            moveNames: [
              "MEGA DRAIN",
              "ANCIENTPOWER",
              "SAND-ATTACK",
              "PROTECT",
            ],
          },
        ],
      },
      // Confirm-relative OFF ledger: player resolution through +160,
      // opponent text/effect/stat message through +400, turn/menu gate +405.
      BATTLE2_OFF_TURN1_COMMAND_DURATIONS,
    ),
  }),
  "fire-punch-onix-grovyle-animation-owned": (state) => ({
    ...state,
    stagedBattleTurn: null,
    sceneOnPresentation: createSceneOnMovePresentation({
      move: "FIRE_PUNCH",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      resolutionProfile: ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
    }),
    rngMode: "frontierBattle",
  }),
  "loss-terminal-window-off": lossTerminalWindowStage,
  // lbr-d2b: a real generated round driven to roundComplete (seven wins), parked at its terminal. The first tick creates the won terminal
  // (age 1), so stage frame F == the oracle tick of the Lobby CB2_LoadMap handoff (terminal age 0, docs/lbrd2b-won-windows.md).
  "seventh-win-terminal-off": (state) => {
    const carry = createInitialFactoryCarry(CARRIER_PLAYER_TRAINER_ID);
    return { ...state, factoryCarry: carry, factoryRoundBattleOrchestrator: driveGeneratedRoundToCompletion(carry, 17) };
  },
  "win-terminal-window-off": winTerminalWindowStage,
  "mid-battle-switch-dense-off": midBattleSwitchDenseOffStage,
  "aud241b-opponent-faint-on": (state) => aud241bStage(state, "aud241b-opponent-faint-on", "on", 50, 12),
  "aud241b-opponent-faint-off": (state) => aud241bStage(state, "aud241b-opponent-faint-off", "off", 50, 12),
  "aud241b-player-faint-on": (state) => aud241bStage(state, "aud241b-player-faint-on", "on", 12, 50),
  "aud241b-player-faint-off": (state) => aud241bStage(state, "aud241b-player-faint-off", "off", 12, 50),
  "aud241b-lowhp-on": (state) => aud241bStage(state, "aud241b-lowhp-on", "on", 27, 50),
  "aud241b-lowhp-off": (state) => aud241bStage(state, "aud241b-lowhp-off", "off", 27, 50),
  // MOVE_KARATE_CHOP (2, Fighting) against a Normal Rattata: SE_SUPER_EFFECTIVE, then the faint.
  // aud241c: the battle-end windows. Last faint with both benches empty: the opponent's (win) or the player's (loss).
  "aud241c-win-on": (state) => aud241bStage(state, "aud241c-win-on", "on", 50, 12, 69, "opponent"),
  "aud241c-win-off": (state) => aud241bStage(state, "aud241c-win-off", "off", 50, 12, 69, "opponent"),
  "aud241c-brain-on": (state) => aud241bStage(state, "aud241c-brain-on", "on", 50, 12, 69, "opponent", true),
  "aud241c-brain-off": (state) => aud241bStage(state, "aud241c-brain-off", "off", 50, 12, 69, "opponent", true),
  "aud241c-loss-on": (state) => aud241bStage(state, "aud241c-loss-on", "on", 12, 50, 69, "player"),
  "aud241c-loss-off": (state) => aud241bStage(state, "aud241c-loss-off", "off", 12, 50, 69, "player"),
  "aud241b-super-effective-on": (state) => aud241bStage(state, "aud241b-super-effective-on", "on", 50, 12, 2),
  "aud241b-super-effective-off": (state) => aud241bStage(state, "aud241b-super-effective-off", "off", 50, 12, 2),
  // aud242a: Scene ON move-animation sound windows (one Level-50 attacker side each; docs/aud242-move-anim-sounds.md).
  "aud242a-slam-player-on": (state) => aud241bStage(state, "aud242a-slam-player-on", "on", 50, 12, 21, undefined, false, 69),
  "aud242a-slam-player-off": (state) => aud241bStage(state, "aud242a-slam-player-off", "off", 50, 12, 21, undefined, false, 69),
  "aud242a-razorleaf-player-on": (state) => aud241bStage(state, "aud242a-razorleaf-player-on", "on", 50, 12, 75, undefined, false, 69),
  "aud242a-swift-opponent-on": (state) => aud241bStage(state, "aud242a-swift-opponent-on", "on", 12, 50, 69, undefined, false, 129),
  "aud242a-swordsdance-opponent-on": (state) => aud241bStage(state, "aud242a-swordsdance-opponent-on", "on", 12, 50, 69, undefined, false, 14),
  "aud242a-slash-opponent-on": (state) => aud241bStage(state, "aud242a-slash-opponent-on", "on", 12, 50, 69, undefined, false, 163),
  "aud242a-ember-player-on": (state) => aud241bStage(state, "aud242a-ember-player-on", "on", 50, 12, 52, undefined, false, 69),
  "aud242a-psybeam-player-on": (state) => aud241bStage(state, "aud242a-psybeam-player-on", "on", 50, 12, 60, undefined, false, 69),
  "aud242a-agility-player-on": (state) => aud241bStage(state, "aud242a-agility-player-on", "on", 50, 12, 97, undefined, false, 33),
  // aud242b: Scene ON move-animation sounds after data-dependent waits / in branches (docs/aud242-move-anim-sounds.md).
  "aud242b-hyperbeam-player-on": (state) => aud241bStage(state, "aud242b-hyperbeam-player-on", "on", 50, 12, 63, undefined, false, 69),
  "aud242b-dragonrage-opponent-on": (state) => aud241bStage(state, "aud242b-dragonrage-opponent-on", "on", 12, 50, 69, undefined, false, 82),
  "aud242b-aurorabeam-player-on": (state) => aud241bStage(state, "aud242b-aurorabeam-player-on", "on", 50, 12, 62, undefined, false, 69),
  "aud242b-thunder-opponent-on": (state) => aud241bStage(state, "aud242b-thunder-opponent-on", "on", 12, 50, 69, undefined, false, 87),
  "aud242b-crunch-player-on": (state) => aud241bStage(state, "aud242b-crunch-player-on", "on", 50, 12, 242, undefined, false, 69),
  "aud242b-icywind-opponent-on": (state) => aud241bStage(state, "aud242b-icywind-opponent-on", "on", 12, 50, 69, undefined, false, 196),
  "aud242b-hyperfang-player-on": (state) => aud241bStage(state, "aud242b-hyperfang-player-on", "on", 50, 12, 158, undefined, false, 69),
  "aud242b-machpunch-opponent-on": (state) => aud241bStage(state, "aud242b-machpunch-opponent-on", "on", 12, 50, 69, undefined, false, 183),
  "aud242b-thunderbolt-player-on": (state) => aud241bStage(state, "aud242b-thunderbolt-player-on", "on", 50, 12, 85, undefined, false, 69),
  "aud242b-icebeam-opponent-on": (state) => aud241bStage(state, "aud242b-icebeam-opponent-on", "on", 12, 50, 69, undefined, false, 58),
  "aud242b-shadowball-player-on": (state) => aud241bStage(state, "aud242b-shadowball-player-on", "on", 50, 12, 247, undefined, false, 69),
  "aud242b-flamethrower-opponent-on": (state) => aud241bStage(state, "aud242b-flamethrower-opponent-on", "on", 12, 50, 69, undefined, false, 53),
  "aud242b-dragonrage-player-on": (state) => aud241bStage(state, "aud242b-dragonrage-player-on", "on", 50, 12, 82, undefined, false, 69),
  "aud242b-megapunch-opponent-on": (state) => aud241bStage(state, "aud242b-megapunch-opponent-on", "on", 12, 50, 69, undefined, false, 5),
  "aud242b-megapunch-player-on": (state) => aud241bStage(state, "aud242b-megapunch-player-on", "on", 50, 12, 5, undefined, false, 69),
  "aud242b-haze-player-on": (state) => aud241bStage(state, "aud242b-haze-player-on", "on", 50, 12, 114, undefined, false, 69),
  "aud242b-hijumpkick-opponent-on": (state) => aud241bStage(state, "aud242b-hijumpkick-opponent-on", "on", 12, 50, 69, undefined, false, 136),
  "aud242b-hijumpkick-player-on": (state) => aud241bStage(state, "aud242b-hijumpkick-player-on", "on", 50, 12, 136, undefined, false, 69),
  // aud242c: the other attacker side of the fade / pan / sound-task windows (docs/aud242-move-anim-sounds.md section 7).
  "aud242b-machpunch-player-on": (state) => aud241bStage(state, "aud242b-machpunch-player-on", "on", 50, 12, 183, undefined, false, 69),
  "aud242b-flamethrower-player-on": (state) => aud241bStage(state, "aud242b-flamethrower-player-on", "on", 50, 12, 53, undefined, false, 69),
  "aud242b-hyperbeam-opponent-on": (state) => aud241bStage(state, "aud242b-hyperbeam-opponent-on", "on", 12, 50, 69, undefined, false, 63),
  "aud242b-sweetscent-player-on": (state) => aud241bStage(state, "aud242b-sweetscent-player-on", "on", 50, 12, 230, undefined, false, 69),
  "aud242b-metalsound-opponent-on": (state) => aud241bStage(state, "aud242b-metalsound-opponent-on", "on", 12, 50, 69, undefined, false, 319),
  // aud242d: the palette-family windows (BlendBattleAnimPal d > 0, Exclude, complex_palette_blend, metallic_shine; docs/aud242-move-anim-sounds.md section 8).
  "aud242b-hail-player-on": (state) => aud241bStage(state, "aud242b-hail-player-on", "on", 50, 12, 258, undefined, false, 69),
  "aud242b-sunnyday-player-on": (state) => aud241bStage(state, "aud242b-sunnyday-player-on", "on", 50, 12, 241, undefined, false, 69),
  "aud242b-doubleedge-player-on": (state) => aud241bStage(state, "aud242b-doubleedge-player-on", "on", 50, 12, 38, undefined, false, 69),
  "aud242b-calmmind-player-on": (state) => aud241bStage(state, "aud242b-calmmind-player-on", "on", 50, 12, 347, undefined, false, 69),
  "aud242b-metalclaw-player-on": (state) => aud241bStage(state, "aud242b-metalclaw-player-on", "on", 50, 12, 232, undefined, false, 69),
  "aud242b-steelwing-player-on": (state) => aud241bStage(state, "aud242b-steelwing-player-on", "on", 50, 12, 211, undefined, false, 69),
  "aud242b-fireblast-player-on": (state) => aud241bStage(state, "aud242b-fireblast-player-on", "on", 50, 12, 126, undefined, false, 69),
  "aud242b-dragonclaw-opponent-on": (state) => aud241bStage(state, "aud242b-dragonclaw-opponent-on", "on", 12, 50, 69, undefined, false, 337),
  "aud242b-cosmicpower-player-on": (state) => aud241bStage(state, "aud242b-cosmicpower-player-on", "on", 50, 12, 322, undefined, false, 69),
  // hie1: held-item effect (docs/hie-scout.md step 1).
  "hie1-leftovers-on": (state) => hie1Stage(state, "hie1-leftovers-on", "on", 50, 40, 200, 69),
  "hie1-leftovers-off": (state) => hie1Stage(state, "hie1-leftovers-off", "off", 50, 40, 200, 69),
  "hie1-sitrus-on": (state) => hie1Stage(state, "hie1-sitrus-on", "on", 30, 50, 142, 69),
  "hie1-sitrus-off": (state) => hie1Stage(state, "hie1-sitrus-off", "off", 30, 50, 142, 69),
  "hie1-shellbell-on": (state) => hie1Stage(state, "hie1-shellbell-on", "on", 40, 50, 219, 69),
  "hie1-shellbell-off": (state) => hie1Stage(state, "hie1-shellbell-off", "off", 40, 50, 219, 69),
  "hie1-cheri-on": (state) => hie1Stage(state, "hie1-cheri-on", "on", 50, 40, 133, 86),
  "hie1-cheri-off": (state) => hie1Stage(state, "hie1-cheri-off", "off", 50, 40, 133, 86),
  // hie2: the opponent's Rattata holds the Sitrus Berry (the player's faster Seismic Toss triggers it).
  "hie2-sitrus-opp-on": (state) => midBattleSwitchStage(state, "hie2-sitrus-opp-on", [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: "on",
    player: rattataAtLevel(50, 69),
    trainer: rattataAtLevel(30, 69, 142),
    usedMessageHoldFrames: 0,
  }),
  "cry1-roar-pidgey-player-on": (state) => cry1Stage(state, "cry1-roar-pidgey-player-on", 16, "player", 46),
  "cry1-roar-jynx-player-on": (state) => cry1Stage(state, "cry1-roar-jynx-player-on", 124, "player", 46),
  "cry1-roar-pidgey-opp-on": (state) => cry1Stage(state, "cry1-roar-pidgey-opp-on", 16, "opponent", 46),
  "cry1-howl-jynx-player-on": (state) => cry1Stage(state, "cry1-howl-jynx-player-on", 124, "player", 336),
  "cry1-hypervoice-pidgey-player-on": (state) => cry1Stage(state, "cry1-hypervoice-pidgey-player-on", 16, "player", 304),
  "cry1-hypervoice-jynx-player-on": (state) => cry1Stage(state, "cry1-hypervoice-jynx-player-on", 124, "player", 304),
  // aud250: General_FocusPunchSetUp / General_LeechSeedDrain sound anchors (docs/aud250-general-anim-sounds.md).
  "aud250-focuspunch-player-on": (state) => aud241bStage(state, "aud250-focuspunch-player-on", "on", 50, 12, 264, undefined, false, 69),
  "aud250-leechseed-player-on": (state) => aud241bStage(state, "aud250-leechseed-player-on", "on", 50, 12, 73, undefined, false, 69),
  "aud250-focuspunch-opponent-on": (state) => aud241bStage(state, "aud250-focuspunch-opponent-on", "on", 12, 50, 69, undefined, false, 264),
  "aud250-leechseed-opponent-on": (state) => aud241bStage(state, "aud250-leechseed-opponent-on", "on", 12, 50, 69, undefined, false, 73),
  "aud242b-flatter-player-on": (state) => aud241bStage(state, "aud242b-flatter-player-on", "on", 50, 12, 260, undefined, false, 69),
  "aud242b-superpower-player-on": (state) => aud241bStage(state, "aud242b-superpower-player-on", "on", 50, 12, 276, undefined, false, 69),
  "aud242b-dragonrage-opponent-off": (state) => aud241bStage(state, "aud242b-dragonrage-opponent-off", "off", 12, 50, 69, undefined, false, 82),
  // aud242e: sprite and mon-task lifetimes (docs/aud242-move-anim-sounds.md section 9).
  "aud242e-toxic-player-on": (state) => aud241bStage(state, "aud242e-toxic-player-on", "on", 50, 12, 92, undefined, false, 69),
  "aud242e-rocktomb-player-on": (state) => aud241bStage(state, "aud242e-rocktomb-player-on", "on", 50, 12, 317, undefined, false, 69),
  "aud242e-overheat-player-on": (state) => aud241bStage(state, "aud242e-overheat-player-on", "on", 50, 12, 315, undefined, false, 69),
  "aud242e-counter-player-on": (state) => aud241bStage(state, "aud242e-counter-player-on", "on", 50, 12, 68, undefined, false, 69),
  "aud242e-gigadrain-player-on": (state) => aud241bStage(state, "aud242e-gigadrain-player-on", "on", 50, 12, 202, undefined, false, 69),
  "aud242e-thunderbolt-player-on": (state) => aud241bStage(state, "aud242e-thunderbolt-player-on", "on", 50, 12, 85, undefined, false, 69),
  "aud242e-sludge-player-on": (state) => aud241bStage(state, "aud242e-sludge-player-on", "on", 50, 12, 124, undefined, false, 69),
  "aud242e-poisonfang-player-on": (state) => aud241bStage(state, "aud242e-poisonfang-player-on", "on", 50, 12, 305, undefined, false, 69),
  "aud242e-watergun-player-on": (state) => aud241bStage(state, "aud242e-watergun-player-on", "on", 50, 12, 55, undefined, false, 69),
  "aud242e-waterpulse-player-on": (state) => aud241bStage(state, "aud242e-waterpulse-player-on", "on", 50, 12, 352, undefined, false, 69),
  "aud242e-doubleedge-player-on": (state) => aud241bStage(state, "aud242e-doubleedge-player-on", "on", 50, 12, 38, undefined, false, 69),
  "aud242e-poisontail-player-on": (state) => aud241bStage(state, "aud242e-poisontail-player-on", "on", 50, 12, 342, undefined, false, 69),
  "aud242e-rollingkick-player-on": (state) => aud241bStage(state, "aud242e-rollingkick-player-on", "on", 50, 12, 27, undefined, false, 69),
  "aud242e-absorb-player-on": (state) => aud241bStage(state, "aud242e-absorb-player-on", "on", 50, 12, 71, undefined, false, 69),
  "aud242e-megadrain-player-on": (state) => aud241bStage(state, "aud242e-megadrain-player-on", "on", 50, 12, 72, undefined, false, 69),
  // aud242f: next lifetime families (docs/aud242-move-anim-sounds.md section 10).
  "aud242f-horndrill-player-on": (state) => aud241bStage(state, "aud242f-horndrill-player-on", "on", 50, 12, 32, undefined, false, 69),
  "aud242f-blizzard-player-on": (state) => aud241bStage(state, "aud242f-blizzard-player-on", "on", 50, 12, 59, undefined, false, 69),
  "aud242f-icepunch-player-on": (state) => aud241bStage(state, "aud242f-icepunch-player-on", "on", 50, 12, 8, undefined, false, 69),
  "aud242f-icebeam-player-on": (state) => aud241bStage(state, "aud242f-icebeam-player-on", "on", 50, 12, 58, undefined, false, 69),
  "aud242f-triattack-player-on": (state) => aud241bStage(state, "aud242f-triattack-player-on", "on", 50, 12, 161, undefined, false, 69),
  "aud242f-bubblebeam-player-on": (state) => aud241bStage(state, "aud242f-bubblebeam-player-on", "on", 50, 12, 61, undefined, false, 69),
  "aud242f-psychic-player-on": (state) => aud241bStage(state, "aud242f-psychic-player-on", "on", 50, 12, 94, undefined, false, 69),
  "aud242f-growth-player-on": (state) => aud241bStage(state, "aud242f-growth-player-on", "on", 50, 12, 74, undefined, false, 69),
  // aud242h: Body Slam (gVerticalDipSpriteTemplate wait).
  "aud242h-bodyslam-player-on": (state) => aud241bStage(state, "aud242h-bodyslam-player-on", "on", 50, 12, 34, undefined, false, 69),
  // aud242i: Sludge Bomb (waitsound after SE_M_DIG, gSludgeBombHitParticleSpriteTemplate wait).
  "aud242i-sludgebomb-player-on": (state) => aud241bStage(state, "aud242i-sludgebomb-player-on", "on", 50, 12, 188, undefined, false, 69),
  "aud242i-sludgebomb-opponent-on": (state) => aud241bStage(state, "aud242i-sludgebomb-opponent-on", "on", 12, 50, 69, undefined, false, 188),
  // aud242j: Struggle (ShakeMonInPlace / MovementWaves), Attract (heart projectile / burst), Silver Wind (flying sparks), Dig's second turn (DigUpMovement).
  "aud242j-struggle-player-on": (state) => aud241bStage(state, "aud242j-struggle-player-on", "on", 50, 12, 165, undefined, false, 69),
  "aud242j-silverwind-player-on": (state) => aud241bStage(state, "aud242j-silverwind-player-on", "on", 50, 12, 318, undefined, false, 69),
  "aud242j-silverwind-opponent-on": (state) => aud241bStage(state, "aud242j-silverwind-opponent-on", "on", 12, 50, 69, undefined, false, 318),
  "aud242j-dig-player-on": (state) => aud241bStage(state, "aud242j-dig-player-on", "on", 50, 12, 91, undefined, false, 69),
  // aud242k: Ancient Power, Fire Punch, Yawn, Smokescreen, Scary Face, Wish, Safeguard, Lovely Kiss, Crunch, Recover (player attacker, Scene ON).
  "aud242k-ancientpower-player-on": (state) => aud241bStage(state, "aud242k-ancientpower-player-on", "on", 50, 12, 246, undefined, false, 69),
  "aud242k-firepunch-player-on": (state) => aud241bStage(state, "aud242k-firepunch-player-on", "on", 50, 12, 7, undefined, false, 69),
  "aud242k-yawn-player-on": (state) => aud241bStage(state, "aud242k-yawn-player-on", "on", 50, 12, 281, undefined, false, 69),
  "aud242k-smokescreen-player-on": (state) => aud241bStage(state, "aud242k-smokescreen-player-on", "on", 50, 12, 108, undefined, false, 69),
  "aud242k-scaryface-player-on": (state) => aud241bStage(state, "aud242k-scaryface-player-on", "on", 50, 12, 184, undefined, false, 69),
  "aud242k-wish-player-on": (state) => aud241bStage(state, "aud242k-wish-player-on", "on", 50, 12, 273, undefined, false, 69),
  "wsh1-wish-on": (state) => aud241bStage(state, "wsh1-wish-on", "on", 50, 12, 273, undefined, false, 69),
  "wsh1-wish-off": (state) => aud241bStage(state, "wsh1-wish-off", "off", 50, 12, 273, undefined, false, 69),
  "wsh1b-wishdig-on": (state) => wsh1bWishDigStage(state, "wsh1b-wishdig-on", "on"),
  "wsh1b-wishdig-off": (state) => wsh1bWishDigStage(state, "wsh1b-wishdig-off", "off"),
  "wsh1b-wishsub-on": (state) => wsh1bWishDigStage(state, "wsh1b-wishsub-on", "on", 164),
  "wsh1-fb-on": (state) => wsh1Stage(state, "wsh1-fb-on", "on", 20, 50, 69, 196, 2),
  "wsh1-fs-on": (state) => wsh1Stage(state, "wsh1-fs-on", "on", 50, 25, 248, 0, 2),
  "wsh1-fs-off": (state) => wsh1Stage(state, "wsh1-fs-off", "off", 50, 25, 248, 0, 2),
  "wsh1-fb-off": (state) => wsh1Stage(state, "wsh1-fb-off", "off", 20, 50, 69, 196, 2),
  "aud242k-safeguard-player-on": (state) => aud241bStage(state, "aud242k-safeguard-player-on", "on", 50, 12, 219, undefined, false, 69),
  "aud242k-lovelykiss-player-on": (state) => aud241bStage(state, "aud242k-lovelykiss-player-on", "on", 50, 12, 142, undefined, false, 69),
  "aud242k-crunch-player-on": (state) => aud241bStage(state, "aud242k-crunch-player-on", "on", 50, 12, 242, undefined, false, 69),
  "aud242k-recover-player-on": (state) => aud241bStage(state, "aud242k-recover-player-on", "on", 50, 12, 105, undefined, false, 69),
  "aud242m-frustration-player-on": (state) => aud241bStage(state, "aud242m-frustration-player-on", "on", 50, 12, 218, undefined, false, 69),
  "aud242m-flail-player-on": (state) => aud241bStage(state, "aud242m-flail-player-on", "on", 50, 12, 175, undefined, false, 69),
  "aud242m-return-player-on": (state) => aud241bStage(state, "aud242m-return-player-on", "on", 50, 12, 216, undefined, false, 69),
  "aud242n-confuseray-player-on": (state) => aud241bStage(state, "aud242n-confuseray-player-on", "on", 50, 12, 109, undefined, false, 69),
  "aud242n-confuseray-opponent-on": (state) => aud241bStage(state, "aud242n-confuseray-opponent-on", "on", 12, 50, 69, undefined, false, 109),
  "aud242n-spark-player-on": (state) => aud241bStage(state, "aud242n-spark-player-on", "on", 50, 12, 209, undefined, false, 69),
  "aud242n-spark-opponent-on": (state) => aud241bStage(state, "aud242n-spark-opponent-on", "on", 12, 50, 69, undefined, false, 209),
  "aud242o-petaldance-player-on": (state) => aud241bStage(state, "aud242o-petaldance-player-on", "on", 50, 12, 80, undefined, false, 69),
  "aud242o-triattack-player-on": (state) => aud241bStage(state, "aud242o-triattack-player-on", "on", 50, 12, 161, undefined, false, 69),
  "aud242o-rollout-player-on": (state) => aud241bStage(state, "aud242o-rollout-player-on", "on", 50, 12, 205, undefined, false, 69),
  // hpd1: fixed-damage hit-hold windows (tools/integration/hpd1Labs.py, docs/hpd1-hp-hold.md): the Lv100 foe uses Defense Curl, the player's fixed-damage move follows.
  "hpd1-sonicboom-on": (state) => aud241bStage(state, "hpd1-sonicboom-on", "on", 50, 100, 49, undefined, false, 111),
  "hpd1-sonicboom-off": (state) => aud241bStage(state, "hpd1-sonicboom-off", "off", 50, 100, 49, undefined, false, 111),
  "hpd1-dragonrage-on": (state) => aud241bStage(state, "hpd1-dragonrage-on", "on", 50, 100, 82, undefined, false, 111),
  "hpd1-dragonrage-off": (state) => aud241bStage(state, "hpd1-dragonrage-off", "off", 50, 100, 82, undefined, false, 111),
  "hpd1-toss10-on": (state) => aud241bStage(state, "hpd1-toss10-on", "on", 10, 100, 69, undefined, false, 111),
  "hpd1-toss10-off": (state) => aud241bStage(state, "hpd1-toss10-off", "off", 10, 100, 69, undefined, false, 111),
  "hpd1-toss30-on": (state) => aud241bStage(state, "hpd1-toss30-on", "on", 30, 100, 69, undefined, false, 111),
  "hpd1-toss30-off": (state) => aud241bStage(state, "hpd1-toss30-off", "off", 30, 100, 69, undefined, false, 111),
  "hpd1-toss50-on": (state) => aud241bStage(state, "hpd1-toss50-on", "on", 50, 100, 69, undefined, false, 111),
  "hpd1-toss50-off": (state) => aud241bStage(state, "hpd1-toss50-off", "off", 50, 100, 69, undefined, false, 111),
  "hpd1-toss80-on": (state) => aud241bStage(state, "hpd1-toss80-on", "on", 80, 100, 69, undefined, false, 111),
  "hpd1-toss80-off": (state) => aud241bStage(state, "hpd1-toss80-off", "off", 80, 100, 69, undefined, false, 111),
  "hpd1-a-sonicboom-on": (state) => aud241bStage(state, "hpd1-a-sonicboom-on", "on", 60, 50, 49, undefined, false, 111),
  "hpd1-a-sonicboom-off": (state) => aud241bStage(state, "hpd1-a-sonicboom-off", "off", 60, 50, 49, undefined, false, 111),
  "hpd1-a-dragonrage-on": (state) => aud241bStage(state, "hpd1-a-dragonrage-on", "on", 60, 50, 82, undefined, false, 111),
  "hpd1-a-dragonrage-off": (state) => aud241bStage(state, "hpd1-a-dragonrage-off", "off", 60, 50, 82, undefined, false, 111),
  "hpd1-a-toss60-on": (state) => aud241bStage(state, "hpd1-a-toss60-on", "on", 60, 50, 69, undefined, false, 111),
  "hpd1-a-toss60-off": (state) => aud241bStage(state, "hpd1-a-toss60-off", "off", 60, 50, 69, undefined, false, 111),
  "hpd1-a-toss90-on": (state) => aud241bStage(state, "hpd1-a-toss90-on", "on", 90, 50, 69, undefined, false, 111),
  "hpd1-a-toss90-off": (state) => aud241bStage(state, "hpd1-a-toss90-off", "off", 90, 50, 69, undefined, false, 111),
  "aud242o-rollout5-player-on": (state) => aud241bStage(state, "aud242o-rollout5-player-on", "on", 50, 100, 205, undefined, false, 111),
  "aud242o-dive-player-on": (state) => aud241bStage(state, "aud242o-dive-player-on", "on", 50, 12, 291, undefined, false, 69),
  "aud257-cosmicpower-player-on": (state) => aud241bStage(state, "aud257-cosmicpower-player-on", "on", 50, 12, 322, undefined, false, 69),
  "aud257-sweetkiss-player-on": (state) => aud241bStage(state, "aud257-sweetkiss-player-on", "on", 50, 12, 186, undefined, false, 69),
  "aud242r-softboiled-player-on": (state) => aud241bStage(state, "aud242r-softboiled-player-on", "on", 50, 12, 135, undefined, false, 69),
  "aud259-block-player-on": (state) => aud241bStage(state, "aud259-block-player-on", "on", 50, 12, 335, undefined, false, 69),
  "aud259-block-opponent-on": (state) => aud241bStage(state, "aud259-block-opponent-on", "on", 12, 50, 69, undefined, false, 335),
  "aud259-dynamicpunch-player-on": (state) => aud241bStage(state, "aud259-dynamicpunch-player-on", "on", 50, 12, 223, undefined, false, 69, 2),
  "aud259-fakeout-player-on": (state) => aud241bStage(state, "aud259-fakeout-player-on", "on", 50, 12, 252, undefined, false, 69, 1, true),
  "aud259-crabhammer-player-on": (state) => aud241bStage(state, "aud259-crabhammer-player-on", "on", 50, 12, 152, undefined, false, 69),
  "aud261-extremespeed-player-on": (state) => aud242lBlizzardStage(state, "aud261-extremespeed-player-on", "player", 19, 143, 245),
  "aud261-extremespeed-opponent-on": (state) => aud241bStage(state, "aud261-extremespeed-opponent-on", "on", 12, 50, 69, undefined, false, 245),
  "aud260-aircutter-player-on": (state) => aud241bStage(state, "aud260-aircutter-player-on", "on", 50, 12, 314, undefined, false, 69),
  "aud260-aircutter-opponent-on": (state) => aud241bStage(state, "aud260-aircutter-opponent-on", "on", 12, 50, 69, undefined, false, 314),
  "aud260-brickbreak-player-on": (state) => aud241bStage(state, "aud260-brickbreak-player-on", "on", 55, 50, 280, undefined, false, 115),
  "aud260-glare-player-on": (state) => aud241bStage(state, "aud260-glare-player-on", "on", 50, 12, 137, undefined, false, 69),
  "aud260-recycle-player-on": (state) => midBattleSwitchStage(state, "aud260-recycle-player-on", [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
    battleScene: "on",
    player: rattataAtLevel(50, 278, 142),
    trainer: rattataAtLevel(55, 69),
    usedMessageHoldFrames: 0,
  }),
  "aud260-willowisp-player-on": (state) => aud241bStage(state, "aud260-willowisp-player-on", "on", 50, 12, 261, undefined, false, 69),
  "aud260-willowisp-opponent-on": (state) => aud241bStage(state, "aud260-willowisp-opponent-on", "on", 12, 50, 69, undefined, false, 261),
  "aud258-torment-player-on": (state) => aud241bStage(state, "aud258-torment-player-on", "on", 50, 12, 259, undefined, false, 69),
  "aud258-seismictoss-player-on": (state) => aud241bStage(state, "aud258-seismictoss-player-on", "on", 50, 12, 69, undefined, false, 69),
  "aud258-seismictossstrong-player-on": (state) => aud241bStage(state, "aud258-seismictossstrong-player-on", "on", 100, 12, 69, undefined, false, 69),
  "aud258-shockwave-player-on": (state) => aud241bStage(state, "aud258-shockwave-player-on", "on", 50, 12, 351, undefined, false, 69),
  "aud258-shockwavelow-player-on": (state) => aud242lBlizzardStage(state, "aud258-shockwavelow-player-on", "player", 282, 19, 351),
  "aud242p-encore-player-on": (state) => aud241bStage(state, "aud242p-encore-player-on", "on", 50, 12, 227, undefined, false, 69),
  "aud242p-flatter-player-on": (state) => aud241bStage(state, "aud242p-flatter-player-on", "on", 50, 12, 260, undefined, false, 69),
  "aud242p-reversal-player-on": (state) => aud241bStage(state, "aud242p-reversal-player-on", "on", 50, 12, 179, undefined, false, 69),
  "aud242p-taunt-player-on": (state) => aud241bStage(state, "aud242p-taunt-player-on", "on", 50, 12, 269, undefined, false, 69),
  "aud242p-karatechop-player-on": (state) => aud241bStage(state, "aud242p-karatechop-player-on", "on", 50, 12, 2, undefined, false, 69),
  "aud242p-revenge-player-on": (state) => aud241bStage(state, "aud242p-revenge-player-on", "on", 50, 12, 279, undefined, false, 1),
  "aud242p-mistball-player-on": (state) => aud241bStage(state, "aud242p-mistball-player-on", "on", 50, 12, 296, undefined, false, 69),
  "aud242p-leafblade-player-on": (state) => aud241bStage(state, "aud242p-leafblade-player-on", "on", 50, 12, 348, undefined, false, 69),
  // aud242q: Fury Cutter, Strength, Secret Power, Extrasensory, Super Fang (player attacker, Scene ON), Ice Ball five-turn lock against a Lv100 Defense Curl target.
  "aud242q-furycutter-player-on": (state) => aud241bStage(state, "aud242q-furycutter-player-on", "on", 50, 12, 210, undefined, false, 69),
  "aud242q-secretpower-player-on": (state) => aud241bStage(state, "aud242q-secretpower-player-on", "on", 50, 12, 290, undefined, false, 69),
  "aud242q-extrasensory-player-on": (state) => aud241bStage(state, "aud242q-extrasensory-player-on", "on", 50, 12, 326, undefined, false, 69),
  "aud242q-superfang-player-on": (state) => aud241bStage(state, "aud242q-superfang-player-on", "on", 50, 12, 162, undefined, false, 69),
  "aud242q-iceball5-player-on": (state) => aud241bStage(state, "aud242q-iceball5-player-on", "on", 50, 100, 301, undefined, false, 111),
  // aud242r: Heal Bell (player attacker, Scene ON).
  "aud242r-healbell-player-on": (state) => aud241bStage(state, "aud242r-healbell-player-on", "on", 50, 12, 215, undefined, false, 69),
  "aud242r-spikecannon-player-on": (state) => aud241bStage(state, "aud242r-spikecannon-player-on", "on", 50, 12, 131, undefined, false, 69),
  "aud242r-eruption-player-on": (state) => aud241bStage(state, "aud242r-eruption-player-on", "on", 50, 12, 284, undefined, false, 69),
  "aud242r-moonlight-player-on": (state) => aud241bStage(state, "aud242r-moonlight-player-on", "on", 50, 12, 236, undefined, false, 69),
  // aud242r: Ghost-type Curse (Misdreavus, species 200) on a Lv12 Rattata: the CurseGhost branch (BIND x3 behind the stretching black bg, NIGHTMARE behind the nail).
  "aud242r-curse-player-on": (state) => aud242lBlizzardStage(state, "aud242r-curse-player-on", "player", 200, 19, 174, ["TYPE_GHOST", "TYPE_GHOST"]),
  // aud242l: Blizzard (snowball / ice crystal lifetimes depend on both battlers' pic Y): the species only differ in the staged battlers' `species` (the ICY_WIND rows come before any damage).
  "aud242l-blizzard-fearow-bulbasaur-opponent-on": (state) => aud242lBlizzardStage(state, "aud242l-blizzard-fearow-bulbasaur-opponent-on", "opponent", 22, 1),
  "aud242l-blizzard-bulbasaur-charizard-opponent-on": (state) => aud242lBlizzardStage(state, "aud242l-blizzard-bulbasaur-charizard-opponent-on", "opponent", 1, 6),
  "aud242l-blizzard-bulbasaur-bulbasaur-opponent-on": (state) => aud242lBlizzardStage(state, "aud242l-blizzard-bulbasaur-bulbasaur-opponent-on", "opponent", 1, 1),
  "aud242l-blizzard-bulbasaur-fearow-player-on": (state) => aud242lBlizzardStage(state, "aud242l-blizzard-bulbasaur-fearow-player-on", "player", 1, 22),
  // aud242i: Faint Attack (attacker_fade_to_invisible / _from_invisible and SetAttackerInvisibleWaitForSignal lifetimes).
  "aud242i-faintattack-player-on": (state) => aud241bStage(state, "aud242i-faintattack-player-on", "on", 50, 12, 185, undefined, false, 69),
  "aud242i-faintattack-opponent-on": (state) => aud241bStage(state, "aud242i-faintattack-opponent-on", "on", 12, 50, 69, undefined, false, 185),
  "aud242f-swagger-player-on": (state) => aud241bStage(state, "aud242f-swagger-player-on", "on", 50, 12, 207, undefined, false, 69),
  // aud242g: SetPsychicBackground / Tri Attack triangle lifetimes (docs/aud242-move-anim-sounds.md section 11).
  "aud242g-triattack-player-on": (state) => aud241bStage(state, "aud242g-triattack-player-on", "on", 50, 12, 161, undefined, false, 69),
  // Dream Eater needs a sleeping target: turn 1 Spore (slot 0), turn 2 Dream Eater (slot 1).
  "aud242g-dreameater-sleep-player-on": (state) =>
    midBattleSwitchStage(state, "aud242g-dreameater-sleep-player-on", [RATTATA_LV50_BENCH, RATTATA_LV50_BENCH], [105, 105], {
      battleScene: "on",
      player: Object.freeze({ ...rattataAtLevel(50, 147), moves: [147, 138, 138, 138] as const }),
      trainer: rattataAtLevel(12, 69),
      usedMessageHoldFrames: 0,
      sceneOffNoAnimations: false,
    }),
  "aud242f-lusterpurge-player-on": (state) => aud241bStage(state, "aud242f-lusterpurge-player-on", "on", 50, 12, 295, undefined, false, 69),
  "aud242f-curse-player-on": (state) => aud241bStage(state, "aud242f-curse-player-on", "on", 50, 12, 174, undefined, false, 69),
  "aud242f-extremespeed-player-on": (state) => aud241bStage(state, "aud242f-extremespeed-player-on", "on", 50, 12, 245, undefined, false, 69),
  "aud242f-headbutt-player-on": (state) => aud241bStage(state, "aud242f-headbutt-player-on", "on", 50, 12, 29, undefined, false, 69),
  "aud242f-attract-player-on": (state) => aud241bStage(state, "aud242f-attract-player-on", "on", 50, 12, 213, undefined, false, 69),
  "aud242f-spark-player-on": (state) => aud241bStage(state, "aud242f-spark-player-on", "on", 50, 12, 209, undefined, false, 69),
  "aud242f-hiddenpower-player-on": (state) => aud241bStage(state, "aud242f-hiddenpower-player-on", "on", 50, 12, 237, undefined, false, 69),
  "aud242f-hornattack-player-on": (state) => aud241bStage(state, "aud242f-hornattack-player-on", "on", 50, 12, 30, undefined, false, 69),
  "aud242f-drillpeck-player-on": (state) => aud241bStage(state, "aud242f-drillpeck-player-on", "on", 50, 12, 65, undefined, false, 69),
  "aud242f-bulkup-player-on": (state) => aud241bStage(state, "aud242f-bulkup-player-on", "on", 50, 12, 339, undefined, false, 69),
  "aud242f-icepunch-opponent-on": (state) => aud241bStage(state, "aud242f-icepunch-opponent-on", "on", 12, 50, 69, undefined, false, 8),
  "aud242f-icebeam-opponent-on": (state) => aud241bStage(state, "aud242f-icebeam-opponent-on", "on", 12, 50, 69, undefined, false, 58),
  "aud242f-horndrill-opponent-on": (state) => aud241bStage(state, "aud242f-horndrill-opponent-on", "on", 12, 50, 69, undefined, false, 32),
  "aud242f-swagger-opponent-on": (state) => aud241bStage(state, "aud242f-swagger-opponent-on", "on", 12, 50, 69, undefined, false, 207),
  "aud242f-headbutt-opponent-on": (state) => aud241bStage(state, "aud242f-headbutt-opponent-on", "on", 12, 50, 69, undefined, false, 29),
  "aud242f-hiddenpower-opponent-on": (state) => aud241bStage(state, "aud242f-hiddenpower-opponent-on", "on", 12, 50, 69, undefined, false, 237),
  "aud242f-bulkup-opponent-on": (state) => aud241bStage(state, "aud242f-bulkup-opponent-on", "on", 12, 50, 69, undefined, false, 339),
  // frf250a: BAG / RUN on the action menu (two Level-50 Rattata, both scenes; tools/battle-lab/frf250a-*.json).
  "frf250a-bagrun-on": (state) => frf250aStage(aud241bStage(state, "frf250a-bagrun-on", "on", 50, 50), 27),
  "frf250a-bagrun-off": (state) => frf250aStage(aud241bStage(state, "frf250a-bagrun-off", "off", 50, 50), 34),
  // enc276: a forced turn goes from FIGHT straight into the turn (tools/battle-lab/enc276-*.json): the L50 player's SPLASH is
  // Encored (opponent L40 ENCORE) / Taunted into forced Struggle (opponent L40 TAUNT); turn 2's FIGHT has no move menu.
  "enc276-encore-on": (state) => enc276Stage(state, "enc276-encore-on", "on", 227, 27),
  "enc276-encore-off": (state) => enc276Stage(state, "enc276-encore-off", "off", 227, 30),
  "enc276-struggle-on": (state) => enc276Stage(state, "enc276-struggle-on", "on", 269, 27),
  "enc276-struggle-off": (state) => enc276Stage(state, "enc276-struggle-off", "off", 269, 30),
  "pmo239-switch-0-to-2-off": pmo239SwitchReopenOffStage,
  "mechanic-selection-reject-torment-off": tormentSelectionRejectionOffStage,
  "party-menu-status-item-off": partyMenuStatusItemOffStage,
};

export async function renderAppTrace(trace: Trace): Promise<AppCapture[]> {
  const presentationRng = presentationRngFromTrace(trace);
  let state = createInitialState({
    appRoute: trace.appRoute,
    battleScene: trace.battleScene,
    presentationSeed: presentationRng.seed,
    presentationRngPolicy: presentationRng.policy,
  });
  const captureFrames = new Set(trace.captureFrames ?? []);
  const captures: AppCapture[] = [];
  let frame = 0;
  // docs/terminal-seam-antecedent-boundary-probe.md §2/§5: computed once (the
  // pose is frozen, not per-frame) the moment this one stage applies; stays
  // null -- a no-op -- for every other trace, which capture the plain
  // `render(state)` output exactly as before.
  let heldCursorMask: ReadonlyMap<number, number> | null = null;

  const applyStage = (): void => {
    if (!trace.appStage || trace.appStage.frame !== frame) return;
    const stage = APP_STAGES[trace.appStage.id];
    if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
    state = stage(state);
    const frozenCursorAge = TERMINAL_WINDOW_FROZEN_CURSOR_AGE[trace.appStage.id];
    if (frozenCursorAge !== undefined) {
      heldCursorMask = terminalWindowHeldCursorMask(state, frozenCursorAge);
    }
  };

  const applyRngRebase = (): void => {
    if (trace.appRngRebase && trace.appRngRebase.frame === frame) {
      state = { ...state, rngValue: trace.appRngRebase.rngValue };
    }
  };

  const captureFrame = (): void => {
    if (!captureFrames.has(frame)) return;
    const rgba = heldCursorMask === null
      ? render(state)
      : applyTerminalWindowHeldCursor(state, render(state), heldCursorMask);
    captures.push({ frame, rgba });
  };

  applyStage();
  captureFrame();

  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    frame = advance.frame;
    applyStage();
    applyRngRebase();
    captureFrame();
  }

  return captures;
}
