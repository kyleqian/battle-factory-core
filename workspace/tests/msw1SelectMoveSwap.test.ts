import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import {
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import { createBattleCommandPresentationRenderView } from "../src/engine/battleCommandPresentationRender.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import {
  initialMoveSwitchTarget,
  moveSwitchTargetAfter,
  swapBattleScriptBattlerMoves,
  swapMimickedMask,
  swapPackedPpBonuses,
} from "../src/engine/battleMoveSwitching.ts";
import { BATTLE_SCRIPT_STATUS2_TRANSFORMED } from "../src/engine/battleScriptSourceConstants.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { SE_SELECT } from "../src/engine/screenSounds.ts";
import { GBA_BUTTONS, buttonForKey, normalizeButtons, type GbaButton } from "../src/input.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

function acknowledgeAndAdvance(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(state, { commandId }));
}

function startedBattle(seed: number): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  return acknowledgeAndAdvance(createFactoryRoundBattleOrchestrator({
    id: `msw1-${seed}`,
    rngValue: seed,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  }));
}

function press(state: FactoryRoundBattleOrchestratorState, ...buttons: GbaButton[]): FactoryRoundBattleOrchestratorState {
  return advanceFactoryRoundBattleCommand(state, new Set(buttons));
}

function toFightMenu(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (let i = 0; i < 40 && next.battleCommandPresentation?.lifecycle.phase !== "action-menu"; i += 1) next = press(next);
  next = press(next, "A");
  for (let i = 0; i < 40 && next.battleCommandPresentation?.lifecycle.phase !== "fight-menu"; i += 1) next = press(next);
  return next;
}

function idle(state: FactoryRoundBattleOrchestratorState, frames: number): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (let i = 0; i < frames; i += 1) next = press(next);
  return next;
}

function presentation(state: FactoryRoundBattleOrchestratorState): BattleCommandPresentationState {
  return state.battleCommandPresentation!;
}

function activeMoves(state: FactoryRoundBattleOrchestratorState) {
  const rules = state.battle!.rules.rulesContext;
  const mon = rules.battlers[0];
  return { battler: mon, member: rules.party.player[mon.partyIndex]! };
}

describe("msw1: SELECT move switching (HandleMoveSwitching)", () => {
  it("cursor rule: target starts at slot 0 unless the cursor is there, D-pad moves it inside the 2x2 grid", () => {
    expect([0, 1, 2, 3].map((cursor) => initialMoveSwitchTarget(cursor as 0 | 1 | 2 | 3))).toEqual([1, 0, 0, 0]);
    expect(moveSwitchTargetAfter(0, "LEFT")).toBe(0);
    expect(moveSwitchTargetAfter(0, "RIGHT")).toBe(1);
    expect(moveSwitchTargetAfter(1, "LEFT")).toBe(0);
    expect(moveSwitchTargetAfter(1, "RIGHT")).toBe(1);
    expect(moveSwitchTargetAfter(0, "UP")).toBe(0);
    expect(moveSwitchTargetAfter(0, "DOWN")).toBe(2);
    expect(moveSwitchTargetAfter(3, "UP")).toBe(1);
    expect(moveSwitchTargetAfter(3, "DOWN")).toBe(3);
  });

  it("packed PP Up and Mimic bits follow the swap", () => {
    expect(swapPackedPpBonuses(0b11_10_01_00, 0, 3)).toBe(0b00_10_01_11);
    expect(swapPackedPpBonuses(0b11_10_01_00, 1, 1)).toBe(0b11_10_01_00);
    expect(swapMimickedMask(0b0001, 0, 2)).toBe(0b0100);
    expect(swapMimickedMask(0b0100, 0, 2)).toBe(0b0100);
    expect(swapMimickedMask(0b0010, 0, 2)).toBe(0b0010);
  });

  it("SELECT is carried by the public input path unchanged", () => {
    expect(GBA_BUTTONS).toContain("SELECT");
    expect(normalizeButtons(["SELECT"])).toEqual(["SELECT"]);
    expect(buttonForKey("Shift")).toBe("SELECT");
  });

  it("presentation: enter is silent, A/SELECT confirm and B cancel play SE_SELECT, same target does nothing", () => {
    let state = toFightMenu(startedBattle(4));
    expect(presentation(state).fightCursor).toBe(0);
    const sounds = (buttons: GbaButton[]) => {
      const collected = collectSoundTick(1, () => {
        state = press(state, ...buttons);
      });
      return collected.events.map((event) => event.kind === "se" ? event.id : -1);
    };
    expect(sounds(["SELECT"])).toEqual([]);
    expect(presentation(state).moveSwitch).toEqual({ target: 1 });
    expect(sounds(["DOWN"])).toEqual([SE_SELECT]);
    expect(presentation(state).moveSwitch).toEqual({ target: 3 });
    expect(sounds(["DOWN"])).toEqual([]);
    expect(sounds(["B"])).toEqual([SE_SELECT]);
    expect(presentation(state).moveSwitch).toBeNull();
    expect(presentation(state).fightCursor).toBe(0);
    state = idle(state, 3);
    const before = activeMoves(state).battler;
    expect(sounds(["SELECT"])).toEqual([]);
    expect(sounds(["LEFT"])).toEqual([SE_SELECT]);
    expect(presentation(state).moveSwitch).toEqual({ target: 0 });
    expect(sounds(["A"])).toEqual([SE_SELECT]);
    expect(presentation(state).moveSwitch).toBeNull();
    expect(presentation(state).pendingMoveSwitch).toBeNull();
    expect(activeMoves(state).battler).toBe(before);
    state = idle(state, 3);
    expect(sounds(["SELECT"])).toEqual([]);
    expect(sounds(["SELECT"])).toEqual([SE_SELECT]);
    expect(presentation(state).moveSwitch).toBeNull();
    expect(activeMoves(state).battler.moves[1]).toBe(before.moves[0]);
  });

  it("orchestrator: a confirmed swap rewrites the battler and party mon, republishes the request, and the cursor follows", () => {
    let state = toFightMenu(startedBattle(4));
    const { battler: before, member: memberBefore } = activeMoves(state);
    state = press(state, "SELECT");
    state = idle(state, 2);
    expect(presentation(state).moveSwitch).toEqual({ target: 1 });
    state = press(state, "A");
    const { battler, member } = activeMoves(state);
    expect(battler.moves).toEqual([before.moves[1], before.moves[0], before.moves[2], before.moves[3]]);
    expect(battler.pp).toEqual([before.pp[1], before.pp[0], before.pp[2], before.pp[3]]);
    expect(member.moves).toEqual([memberBefore.moves[1], memberBefore.moves[0], memberBefore.moves[2], memberBefore.moves[3]]);
    expect(member.pp).toEqual([memberBefore.pp[1], memberBefore.pp[0], memberBefore.pp[2], memberBefore.pp[3]]);
    expect(presentation(state).fightCursor).toBe(1);
    expect(presentation(state).fightDisplayCursor).toBe(1);
    expect(presentation(state).field.player.moveIds).toEqual(battler.moves);
    expect(presentation(state).pendingMoveSwitch).toBeNull();
    expect(state.moveSelectionCursors[0]).toBe(1);
    const boundary = state.battle!.boundary;
    if (boundary.kind !== "decision-required") throw new Error("expected a decision");
    expect(boundary.request.requestId).toBe(presentation(state).request.requestId);
  });

  it("orchestrator: a same-slot confirm changes nothing in the battle", () => {
    let state = toFightMenu(startedBattle(4));
    const before = activeMoves(state);
    state = press(state, "SELECT");
    state = idle(state, 2);
    state = press(state, "LEFT");
    state = idle(state, 2);
    state = press(state, "A");
    expect(activeMoves(state).battler).toBe(before.battler);
    expect(presentation(state).moveSwitch).toBeNull();
    expect(presentation(state).fightCursor).toBe(0);
  });

  it("a later turn uses the swapped slot and decrements its PP; the order persists into the next battle", () => {
    let state = toFightMenu(startedBattle(4));
    const before = activeMoves(state);
    state = press(state, "SELECT");
    state = idle(state, 2);
    state = press(state, "A");
    state = idle(state, 10);
    state = press(state, "LEFT");
    state = idle(state, 2);
    expect(presentation(state).fightCursor).toBe(0);
    state = press(state, "A");
    const resolution = state.battleResolutionPresentation;
    expect(resolution?.sourceDecision).toEqual({ kind: "use-move", moveSlot: 0, targetBattler: 1 });
    for (let i = 0; i < 2_000 && state.battleResolutionPresentation !== null; i += 1) {
      state = advanceFactoryRoundBattleResolution(state);
    }
    const after = activeMoves(state);
    expect(after.battler.moves[0]).toBe(before.battler.moves[1]);
    expect(after.battler.pp[0]).toBe(before.battler.pp[1]! - 1);
    expect(after.battler.pp[1]).toBe(before.battler.pp[0]);
    expect(after.member.moves[0]).toBe(before.member.moves[1]);

    for (let i = 0; i < 80 && state.battle !== null; i += 1) {
      const boundary = state.battle.boundary;
      if (boundary.kind !== "decision-required" || boundary.request.side !== "player") throw new Error("expected player decision");
      if (boundary.request.kind === "forced-switch") {
        state = submitFactoryRoundPlayerDecision(state, { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! });
      } else {
        state = submitFactoryRoundPlayerDecision(state, boundary.request.legalDecisions.find((d) => d.kind === "use-move")!);
      }
    }
    expect(state.battle).toBeNull();
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    const records = state.round.rules.playerRentalRecords!;
    expect(records[0]!.moveOrder).toEqual([1, 0, 2, 3]);
    expect(records[1]!.moveOrder).toBeUndefined();

    state = acknowledgeAndAdvance(state);
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = chooseFactoryRoundSwap(completeFactoryRoundPresentation(state, { commandId: offerId }), { type: "decline" });
    state = acknowledgeAndAdvance(state);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.battleIndex).toBe(1);
    const next = activeMoves(state);
    expect(next.battler.partyIndex).toBe(0);
    expect(next.battler.moves[0]).toBe(before.battler.moves[1]);
    expect(next.battler.moves[1]).toBe(before.battler.moves[0]);
    expect(next.member.moves[0]).toBe(before.member.moves[1]);
  });

  it("rules: a Transformed battler swaps gBattleMons only, the party mon keeps its order", () => {
    const state = toFightMenu(startedBattle(4));
    const rules = state.battle!.rules.rulesContext;
    const transformed = Object.freeze({
      ...rules,
      battlers: Object.freeze(rules.battlers.map((mon, index) =>
        index === 0 ? Object.freeze({ ...mon, status2: mon.status2 | BATTLE_SCRIPT_STATUS2_TRANSFORMED }) : mon,
      )) as unknown as typeof rules.battlers,
    });
    const next = swapBattleScriptBattlerMoves(transformed, 0, 0, 2);
    expect(next.battlers[0].moves[0]).toBe(rules.battlers[0].moves[2]);
    expect(next.party.player[rules.battlers[0].partyIndex]!.moves).toEqual(rules.party.player[rules.battlers[0].partyIndex]!.moves);
    expect(swapBattleScriptBattlerMoves(rules, 0, 2, 2)).toBe(rules);
  });

  it("render view: the swap redraw lands one name row per frame, and the gray source arrow shows only while selecting", () => {
    let state = toFightMenu(startedBattle(4));
    const oldMoves = [...presentation(state).field.player.moveIds];
    state = press(state, "SELECT");
    state = idle(state, 1);
    expect(createBattleCommandPresentationRenderView(presentation(state)).fightMenu!.moveSwitch)
      .toEqual({ gray: 0, arrow: 1, arrowKind: "target" });
    state = idle(state, 1);
    state = press(state, "DOWN");
    state = idle(state, 1);
    expect(createBattleCommandPresentationRenderView(presentation(state)).fightMenu!.moveSwitch)
      .toEqual({ gray: 0, arrow: 3, arrowKind: "target" });
    state = press(state, "A");
    const views: ReturnType<typeof createBattleCommandPresentationRenderView>["fightMenu"][] = [];
    for (let i = 0; i < 5; i += 1) {
      views.push(createBattleCommandPresentationRenderView(presentation(state)).fightMenu);
      state = idle(state, 1);
    }
    const names = (view: (typeof views)[number]) => view!.moveset.map((entry) => entry.name);
    const newMoves = [...presentation(state).field.player.moveIds];
    expect(newMoves).toEqual([oldMoves[3], oldMoves[1], oldMoves[2], oldMoves[0]]);
    expect(views[0]!.moveSwitch).toEqual({ gray: 0, arrow: 3, arrowKind: "target" });
    expect(views[0]!.displayCursor).toBe(0);
    expect(views[1]!.displayCursor).toBe(3);
    expect(views[1]!.moveSwitch?.gray).toBeNull();
    expect(names(views[1]!)).not.toEqual(names(views[0]!));
    expect(views.at(-1)!.moveSwitch).toBeNull();
    expect(views.at(-1)!.displayCursor).toBe(3);
  });

  it("the engine tick carries SELECT to the fight menu and the swap survives the render", () => {
    const orchestrator = toFightMenu(startedBattle(4));
    const engine = tick({
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      factoryRoundBattleOrchestrator: orchestrator,
      rngMode: "frontierBattle",
      rngValue: orchestrator.battle!.rng.value,
    }, new Set(["SELECT"] as const));
    expect(engine.factoryRoundBattleOrchestrator?.battleCommandPresentation?.moveSwitch).toEqual({ target: 1 });
  });
});
