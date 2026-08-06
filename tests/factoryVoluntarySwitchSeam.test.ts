import { describe, expect, it } from "vitest";
import {
  advanceBattleResolutionConfirmHandoff,
  createBattleResolutionPresentation,
  RETURN_TO_BALL_SPAN_FRAMES,
  SWITCH_IN_SPAN_FRAMES,
  SWITCH_IN_WAITSTATE_HOLD_FRAMES,
  type BattleResolutionPresentationState,
  type CreateBattleResolutionPresentationInput,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration,
  createBattleResolutionPresentationRenderView,
  midBattleSwitchOutAt,
} from "../src/engine/battleResolutionPresentationRender.ts";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  battlePartySelectClosePhase,
  PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FRAMES,
  PARTY_SELECT_CLOSE_MENU_FADE_FRAMES,
  PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES,
  PARTY_SELECT_CLOSE_TOTAL_FRAMES,
} from "../src/engine/battlePartySelect.ts";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  createBattleState,
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";

const RNG_SEED = 4;
const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createStartedBattle(): FactoryRoundBattleOrchestratorState {
  const playerRentalRecords = [record(664), record(678), record(527)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: "voluntary-switch-seam",
    rngValue: RNG_SEED,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(1),
        record(2),
        record(3),
      ],
    },
  });
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) {
    throw new Error("expected a presentation command");
  }
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function commandToActionMenu(state: FactoryRoundBattleOrchestratorState) {
  let next = state;
  for (
    let budget = 0;
    budget < 32
      && next.battleCommandPresentation?.lifecycle.phase !== "action-menu";
    budget += 1
  ) {
    next = advanceFactoryRoundBattleCommand(next, new Set());
  }
  if (next.battleCommandPresentation?.lifecycle.phase !== "action-menu") {
    throw new Error("battle command presentation never reached the action menu");
  }
  return next;
}

/**
 * Drives the live orchestrator to a confirmed voluntary party-menu switch and
 * then through the ISSUES #78 close cadence, returning the state with the
 * switch resolution installed (the party selector cleared).
 */
function confirmVoluntarySwitchThroughClose(
  cursorDowns: number,
): FactoryRoundBattleOrchestratorState {
  let state = commandToActionMenu(createStartedBattle());
  state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
  state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
  for (let index = 0; index < cursorDowns; index += 1) {
    state = advanceFactoryRoundBattleCommand(state, new Set(["DOWN"]));
  }
  state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
  state = advanceFactoryRoundBattleCommand(state, new Set(["A"]));
  expect(state.battlePartySelect?.outcome).toMatchObject({ kind: "select" });
  for (let tick = 0; tick < PARTY_SELECT_CLOSE_MENU_FRAMES - 1; tick += 1) {
    state = advanceFactoryRoundBattleCommand(state, new Set());
    expect(state.battlePartySelect).not.toBeNull();
  }
  state = advanceFactoryRoundBattleCommand(state, new Set());
  expect(state.battlePartySelect).toBeNull();
  expect(state.battleResolutionPresentation).not.toBeNull();
  return state;
}

describe("ISSUES #78 voluntary-switch presentation seam", () => {
  it("presents the recall → return-to-ball → switch-in command sequence instead of an immediate action menu", () => {
    const state = confirmVoluntarySwitchThroughClose(1);
    const resolution = state.battleResolutionPresentation!;
    expect(resolution.confirmHandoff).toBeNull();

    const commands = resolution.segments[0]!.commands;
    const recall = commands[0]!;
    expect(recall).toMatchObject({
      type: "message",
      advance: "automatic",
    });
    if (recall.type !== "message") {
      throw new Error("battle resolution voluntary switch has no recall message");
    }
    // The kernel deliberately skips the RETURNMON prelude
    // (runVoluntarySwitchAction); the presentation re-synthesizes it with the
    // real source text (battle_message.c sText_PkmnThatsEnough).
    expect(recall.lines[0]).toMatch(/^.+ that’s enough!$/);
    expect(recall.lines[1]).toBe("Come back!");

    const recallVisibility = commands.find(
      (command) => command.type === "sprite-visibility",
    );
    expect(recallVisibility).toMatchObject({
      type: "sprite-visibility",
      battler: 0,
      visible: false,
      recall: true,
    });

    const switchIn = commands.find((command) => command.type === "switch-in");
    expect(switchIn).toMatchObject({ type: "switch-in", battler: 0 });
    if (switchIn?.type !== "switch-in") {
      throw new Error("battle resolution voluntary switch has no switch-in command");
    }
    // The real CONTROLLER_SWITCHINANIM 91-frame span gates the opponent's move
    // (plus the 11-frame waitstate/move-load hold to the "used" message).
    expect(switchIn.timing).toEqual({ minimumFrames: SWITCH_IN_SPAN_FRAMES });
    expect(battleResolutionCommandDuration(switchIn, resolution.field))
      .toBe(SWITCH_IN_SPAN_FRAMES + SWITCH_IN_WAITSTATE_HOLD_FRAMES);

    // The switch-in command owns the field for the whole span with the
    // incoming mon already swapped in (mid-battle switch-in view active).
    const switchIndex = commands.indexOf(switchIn);
    const midSpan = createBattleResolutionPresentationRenderView(
      Object.freeze({
        ...resolution,
        commandIndex: switchIndex,
        lifecycle: Object.freeze({
          phase: "presenting",
          phaseElapsed: Math.floor(SWITCH_IN_SPAN_FRAMES / 2),
        }),
      }),
    );
    expect(midSpan.midBattleSwitchIn).toMatchObject({ battler: 0 });
    expect(midSpan.visibility.player.sprite).toBe(false);
  });

  it("times the party-menu close so the recall message's first glyph lands at the fixture edge", () => {
    // docs/mid-battle-switch-presentation-ground-truth.md §2: confirm at 963,
    // menu visible to 1019 (56f), fade 1019-1034 (16f), field idle 1035-1043
    // (9f), recall printstring first glyph at 1044.
    expect(PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES).toBe(56);
    expect(PARTY_SELECT_CLOSE_MENU_FADE_FRAMES).toBe(16);
    expect(PARTY_SELECT_CLOSE_MENU_FRAMES).toBe(72);
    expect(PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES).toBe(9);
    expect(PARTY_SELECT_CLOSE_TOTAL_FRAMES).toBe(81);
    expect(battlePartySelectClosePhase(0)).toBe("menu-hold");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES - 1))
      .toBe("menu-hold");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_MENU_HOLD_FRAMES))
      .toBe("menu-fade");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_MENU_FRAMES - 1))
      .toBe("menu-fade");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_MENU_FRAMES))
      .toBe("field-hold");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_TOTAL_FRAMES - 1))
      .toBe("field-hold");
    expect(battlePartySelectClosePhase(PARTY_SELECT_CLOSE_TOTAL_FRAMES))
      .toBe("done");
  });

  it("holds the settled field for the 9-frame lead-in before the recall message presents", () => {
    const state = confirmVoluntarySwitchThroughClose(1);
    let resolution = state.battleResolutionPresentation!;
    expect(resolution.lifecycle.phase).toBe("confirm-handoff");
    // The field-hold phase renders the settled field with no message.
    const holdView = createBattleResolutionPresentationRenderView(resolution);
    expect(holdView.confirmHandoff).toBeNull();
    expect(holdView.message).toBeNull();

    for (let frame = 0; frame < PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES; frame += 1) {
      resolution = advanceBattleResolutionConfirmHandoff(resolution);
      if (frame < PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES - 1) {
        expect(resolution.lifecycle.phase).toBe("confirm-handoff");
      }
    }
    expect(resolution.lifecycle.phase).toBe("presenting");
    expect(resolution.lifecycle.phaseElapsed).toBe(0);
    // The recall message's first glyph is the presented command's first frame.
    const presentingView = createBattleResolutionPresentationRenderView(resolution);
    expect(presentingView.message).toEqual({
      lines: presentingView.message!.lines,
      visibleCharacters: 1,
    });
  });

  it("keeps the use-move confirm-handoff stage walk and forced-switch continuation untouched", () => {
    // Use-move: the fight-menu bounce confirm-handoff stage sequence is
    // unchanged (regression against the seam's switch branch).
    const useMove = createResolutionWithUseMove();
    expect(useMove.confirmHandoff).not.toBeNull();
    expect(useMove.confirmHandoff!.stage).toBe("move-selection-response");
    const advanced = advanceBattleResolutionConfirmHandoff(useMove);
    expect(advanced.confirmHandoff!.stage).toBe("selection-accepted");
  });
});

// --- Direct `createBattleResolutionPresentation` fixtures (switch source) ---

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: PROVENANCE,
  });
}

function stagedBattle() {
  const RATTATA = Object.freeze({
    species: 19,
    moveId: 150,
    moves: [150, 150, 150, 150] as [150, 150, 150, 150],
    pp: [40, 40, 40, 40] as [40, 40, 40, 40],
    ability: 0,
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
  const BENCH = Object.freeze({
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
    moves: [150, 150, 150, 150] as [150, 150, 150, 150],
    pp: [40, 40, 40, 40] as [40, 40, 40, 40],
  });
  return createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: RATTATA,
    trainer: RATTATA,
    playerBenchHp: [105, 105],
    playerBenchOverride: [BENCH, BENCH],
    trainerBenchHp: [105, 105],
    trainerBenchOverride: [BENCH, BENCH],
  });
}

function createResolutionWithUseMove(): BattleResolutionPresentationState {
  const initial = stagedBattle();
  if (
    initial.boundary.kind !== "decision-required"
    || initial.boundary.request.kind !== "command"
  ) {
    throw new Error("fixture has no source command");
  }
  const state = createBattleState({
    rules: initial.rules,
    rngSeed: 9,
    request: initial.boundary.request,
  });
  const transition = Object.freeze({
    kind: "decision-required",
    state,
    events: Object.freeze([]),
    nextRequest: initial.boundary.request,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  return createBattleResolutionPresentation({
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: createBattleCommandPresentation(
      initial.boundary.request,
      initial.rules.rulesContext,
    ).field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
  });
}

function switchResolutionInput(
  events: readonly BattleKernelSemanticEvent[],
  boundary: BattleBoundary,
  afterRules: FactoryFullTurnDecisionRules,
): CreateBattleResolutionPresentationInput {
  const initial = stagedBattle();
  if (
    initial.boundary.kind !== "decision-required"
    || initial.boundary.request.kind !== "command"
  ) {
    throw new Error("fixture has no source command");
  }
  if (
    boundary.kind !== "decision-required"
    || boundary.request.kind !== "command"
  ) {
    throw new Error("fixture requires a player command boundary");
  }
  const state = createBattleState({
    rules: afterRules,
    rngSeed: 9,
    request: boundary.request,
  });
  const transition = Object.freeze({
    kind: "decision-required",
    state,
    events: Object.freeze(events),
    nextRequest: boundary.request,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  return {
    sourceRequest: initial.boundary.request,
    sourceDecision: { kind: "switch", partyIndex: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: createBattleCommandPresentation(
      initial.boundary.request,
      initial.rules.rulesContext,
    ).field,
  };
}

const NEXT_COMMAND: BattleBoundary = Object.freeze({
  kind: "decision-required",
  request: Object.freeze({
    kind: "command",
    requestId: 3,
    side: "player",
    battler: 0,
    legalDecisions: Object.freeze([Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: 0 })]),
  }),
});

describe("ISSUES #78 voluntary-switch source decision", () => {
  it("synthesizes the recall message ahead of the kernel switch events with the full-HP text", () => {
    const initial = stagedBattle();
    const context = initial.rules.rulesContext;
    const incoming = context.party.player[1]!;
    const switchedBattler = Object.freeze({
      ...context.battlers[0]!,
      ...incoming,
      side: 0 as const,
      partyIndex: 1,
      species: incoming.species,
      types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    });
    const afterContext = Object.freeze({
      ...context,
      battlers: Object.freeze([
        switchedBattler,
        context.battlers[1]!,
        context.battlers[2]!,
        context.battlers[3]!,
      ]) as typeof context.battlers,
    });
    const afterRules = Object.freeze({
      ...initial.rules,
      rulesContext: afterContext,
    }) as FactoryFullTurnDecisionRules;
    const input = switchResolutionInput([
      event(0, { kind: "draw-party-status-summary", battler: 0 }),
      event(1, { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 }),
      event(2, { kind: "message", messageId: "STRINGID_SWITCHINMON", substitutions: [] }),
      event(3, { kind: "hide-party-status-summary", battler: 0 }),
      event(4, { kind: "switch-in-animation", battler: 0, partyIndex: 1 }),
    ], NEXT_COMMAND, afterRules);
    const resolution = createBattleResolutionPresentation(input);
    expect(resolution.confirmHandoff).toBeNull();
    expect(resolution.sourceDecision).toEqual({ kind: "switch", partyIndex: 1 });
    const commands = resolution.segments[0]!.commands;
    expect(commands[0]).toMatchObject({
      type: "message",
      lines: ["RATTATA, that’s enough!", "Come back!"],
    });
    // ISSUES #78 slice 4: the synthesized return-atk-to-ball receipt now emits
    // the 32-frame switch-out span ahead of the recall receipt that commits
    // the hidden sprite/healthbox.
    expect(commands[1]).toMatchObject({
      type: "switch-out",
      battler: 0,
      timing: { minimumFrames: RETURN_TO_BALL_SPAN_FRAMES },
    });
    expect(commands[2]).toMatchObject({
      type: "sprite-visibility",
      battler: 0,
      visible: false,
      recall: true,
    });
  });

  it("times the recall hold at the real 82-frame schedule: typing+9, 32f switch-out, 7f party-summary/getswitched, 13f Go!", () => {
    // docs/mid-battle-switch-presentation-ground-truth.md §2/§4: the recall
    // message's visible hold is 1043-1124 (82 frames) -- message typing (33)
    // + 9-frame post-print hold, then the 32-frame CONTROLLER_RETURNMONTOBALL
    // (1086-1117), then party-summary draw + getswitched (1119-1125) before
    // the "Go!" printstring (1125, first glyph 1126).
    const initial = stagedBattle();
    const context = initial.rules.rulesContext;
    const incoming = context.party.player[1]!;
    const switchedBattler = Object.freeze({
      ...context.battlers[0]!,
      ...incoming,
      side: 0 as const,
      partyIndex: 1,
      species: incoming.species,
      types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    });
    const afterRules = Object.freeze({
      ...initial.rules,
      rulesContext: Object.freeze({
        ...context,
        battlers: Object.freeze([
          switchedBattler,
          context.battlers[1]!,
          context.battlers[2]!,
          context.battlers[3]!,
        ]) as typeof context.battlers,
      }),
    }) as FactoryFullTurnDecisionRules;
    const resolution = createBattleResolutionPresentation(switchResolutionInput([
      event(0, { kind: "draw-party-status-summary", battler: 0 }),
      event(1, { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 }),
      event(2, { kind: "message", messageId: "STRINGID_SWITCHINMON", substitutions: [] }),
      event(3, { kind: "hide-party-status-summary", battler: 0 }),
      event(4, { kind: "switch-in-animation", battler: 0, partyIndex: 1 }),
    ], NEXT_COMMAND, afterRules));
    const commands = resolution.segments[0]!.commands;
    const recall = commands[0]!;
    if (recall.type !== "message") {
      throw new Error("voluntary switch has no recall message command");
    }
    const switchOut = commands.find((c) => c.type === "switch-out");
    const partySummary = commands.find(
      (c) => c.type === "party-summary" && c.visible,
    );
    const go = commands.find(
      (c): c is Extract<BattleResolutionPresentationCommand, { type: "message" }> =>
        c.type === "message" && c.lines[0]?.startsWith("Go!"),
    );
    if (!switchOut || !partySummary || !go) {
      throw new Error("voluntary switch misses slice-4 commands");
    }
    // message-only region: 33 glyphs + 9f post-print hold = 42.
    expect(battleResolutionCommandDuration(recall, resolution.field)).toBe(42);
    // switch-out owns 1086-1117.
    expect(switchOut.timing).toEqual({ minimumFrames: RETURN_TO_BALL_SPAN_FRAMES });
    // party-summary draw + getswitched holds 1119-1125.
    expect(partySummary.timing).toEqual({ minimumFrames: 7 });
    // "Go!" first glyph at 1126; its visible hold is 13 frames.
    expect(go.timing).toEqual({ minimumFrames: 13, holdFrames: 0 });
    // The full 1044->1125 window (82 frames) before "Go!" wipes the box.
    const beforeGo = commands
      .slice(0, commands.indexOf(go))
      .reduce((total, command) =>
        total + battleResolutionCommandDuration(command, resolution.field), 0);
    expect(beforeGo).toBe(82);
    // The recall message persists as latestMessage across the switch-out span.
    const switchOutView = createBattleResolutionPresentationRenderView(
      Object.freeze({
        ...resolution,
        commandIndex: commands.indexOf(switchOut),
        lifecycle: Object.freeze({ phase: "presenting", phaseElapsed: 20 }),
      }),
    );
    expect(switchOutView.message).toEqual({
      lines: ["RATTATA, that’s enough!", "Come back!"],
      visibleCharacters: 33,
    });
  });

  it("models the return-to-ball scale-up 256->736 over relative 14-24 and frees the sprite at relative 25", () => {
    // AnimTask_SwitchOutShrinkMon (battle_anim_throw.c:642-667) steps the
    // affine scale +0x30/tick from 0x100 until >= 0x2D0: 256->736 across the
    // span's relative frames 14-24 (trace 1100-1110), sprite invisible from
    // relative 25 (trace 1111) -- ground truth §2.
    const viewAt = (elapsed: number) => midBattleSwitchOutAt(elapsed, 0);
    expect(viewAt(13)).toEqual({
      elapsed: 13,
      battler: 0,
      scale: 256,
      spriteVisible: true,
    });
    expect(viewAt(14).scale).toBe(256);
    expect(viewAt(15).scale).toBe(304);
    expect(viewAt(24).scale).toBe(736);
    expect(viewAt(24).spriteVisible).toBe(true);
    expect(viewAt(25).spriteVisible).toBe(false);
    expect(viewAt(31).spriteVisible).toBe(false);
  });
});
