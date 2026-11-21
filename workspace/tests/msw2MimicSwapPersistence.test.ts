import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
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
import type { GbaButton } from "../src/input.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

function acknowledgeAndAdvance(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(state, { commandId }));
}

function startedBattle(seed: number, lead: number): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(lead), record(678), record(527)] as const;
  return acknowledgeAndAdvance(createFactoryRoundBattleOrchestrator({
    id: `msw2-${seed}`,
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
function idle(state: FactoryRoundBattleOrchestratorState, frames: number): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (let i = 0; i < frames; i += 1) next = press(next);
  return next;
}
function toFightMenu(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (let i = 0; i < 60 && next.battleCommandPresentation?.lifecycle.phase !== "action-menu"; i += 1) next = press(next);
  next = press(next, "A");
  for (let i = 0; i < 60 && next.battleCommandPresentation?.lifecycle.phase !== "fight-menu"; i += 1) next = press(next);
  return next;
}
function activeMoves(state: FactoryRoundBattleOrchestratorState) {
  const rules = state.battle!.rules.rulesContext;
  const mon = rules.battlers[0];
  return { battler: mon, member: rules.party.player[mon.partyIndex]! };
}
function finishResolution(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  let next = state;
  for (let i = 0; i < 4_000 && next.battleResolutionPresentation !== null; i += 1) next = advanceFactoryRoundBattleResolution(next);
  return next;
}

const MOVE_SING = 47;
const MOVE_WISH = 273;
const MOVE_MIMIC = 102;
const MOVE_DOUBLE_SLAP = 3;

function acceptSwapOfferAndStartNextBattle(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  let next = acknowledgeAndAdvance(state);
  const offerId = next.round.presentation?.command.commandId;
  if (offerId === undefined) throw new Error("expected swap offer");
  next = chooseFactoryRoundSwap(completeFactoryRoundPresentation(next, { commandId: offerId }), { type: "decline" });
  next = acknowledgeAndAdvance(next);
  return acknowledgeAndAdvance(next);
}

/*
 * ROM evidence (msw2, ISSUES #227; .integration/evidence/msw2/romSwapMimic.py, mechanicLab parties, both scenes identical):
 * lead MACHAMP [MIMIC, CROSS CHOP, SPLASH, SING] vs three MAGIKARP with TACKLE. SELECT swaps slots 0 <-> 1, MIMIC (cursor on its slot 1) copies TACKLE, then
 * SELECT swaps 1 <-> 3, then the battle is won. After every step the party mon keeps the PERMUTED ORIGINAL moves -- MIMIC is never written to the party
 * (Cmd_mimicattackcopy writes gBattleMons only; the party write REQUEST_MOVES_PP_BATTLE is Sketch's alone and no Factory mon can have Sketch):
 *   after swap 1         battler [CC, MIMIC, SPLASH, SING]       party [CC, MIMIC, SPLASH, SING]          mimicked 0
 *   after MIMIC          battler [CC, TACKLE, SPLASH, SING]      party [CC, MIMIC, SPLASH, SING] pp[1] 9  mimicked 0b0010
 *   after swap 2, win    battler [CC, SING, SPLASH, TACKLE]      party [CC, SING, SPLASH, MIMIC] pp[3] 9  mimicked 0b1000
 */
describe("msw2: a SELECT swap and Mimic in the same battle (ISSUES #227)", () => {
  it("the party keeps the permuted original moves, the Mimic copy lives in the battler with its bit following the swap", () => {
    let state = toFightMenu(startedBattle(0, 43));
    expect(activeMoves(state).battler.moves).toEqual([MOVE_SING, MOVE_WISH, MOVE_MIMIC, MOVE_DOUBLE_SLAP]);

    state = press(state, "SELECT"); state = idle(state, 2); state = press(state, "A"); state = idle(state, 10);
    expect(activeMoves(state).member.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_MIMIC, MOVE_DOUBLE_SLAP]);
    state = press(state, "LEFT"); state = idle(state, 2); state = press(state, "A");
    state = finishResolution(state);

    state = toFightMenu(state);
    state = press(state, "DOWN"); state = idle(state, 2); state = press(state, "DOWN"); state = idle(state, 2);
    state = press(state, "A");
    state = finishResolution(state);
    const copied = state.battle!.rules.rulesContext.moveHistory.lastMoves[1]!;
    expect([0, MOVE_MIMIC, MOVE_WISH, MOVE_SING, MOVE_DOUBLE_SLAP, 0xffff]).not.toContain(copied);
    let { battler, member } = activeMoves(state);
    expect(battler.moves).toEqual([MOVE_WISH, MOVE_SING, copied, MOVE_DOUBLE_SLAP]);
    expect(battler.mimickedMoves).toBe(0b0100);
    expect(battler.pp[2]).toBe(5);
    expect(member.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_MIMIC, MOVE_DOUBLE_SLAP]);
    expect(member.pp[2]).toBe(9);

    state = toFightMenu(state);
    state = press(state, "SELECT"); state = idle(state, 2);
    state = press(state, "RIGHT"); state = idle(state, 2); state = press(state, "DOWN"); state = idle(state, 2);
    state = press(state, "A"); state = idle(state, 10);
    ({ battler, member } = activeMoves(state));
    expect(battler.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_DOUBLE_SLAP, copied]);
    expect(battler.mimickedMoves).toBe(0b1000);
    expect(battler.pp[3]).toBe(5);
    expect(member.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_DOUBLE_SLAP, MOVE_MIMIC]);
    expect(member.pp[3]).toBe(9);

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
    expect(records[0]!.moveOrder).toEqual([1, 0, 3, 2]);
    expect(records[1]!.moveOrder).toBeUndefined();

    state = acceptSwapOfferAndStartNextBattle(state);
    expect(state.round.rules.battleIndex).toBe(1);
    const next = activeMoves(state);
    expect(next.battler.partyIndex).toBe(0);
    expect(next.battler.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_DOUBLE_SLAP, MOVE_MIMIC]);
    expect(next.battler.mimickedMoves).toBe(0);
    expect(next.member.moves).toEqual([MOVE_WISH, MOVE_SING, MOVE_DOUBLE_SLAP, MOVE_MIMIC]);
  });

  it("Mimic without a swap writes nothing to the records", () => {
    let state = toFightMenu(startedBattle(0, 43));
    state = press(state, "RIGHT"); state = idle(state, 2); state = press(state, "A");
    state = finishResolution(state);
    state = toFightMenu(state);
    state = press(state, "LEFT"); state = idle(state, 2); state = press(state, "DOWN"); state = idle(state, 2);
    state = press(state, "A");
    state = finishResolution(state);
    const { battler, member } = activeMoves(state);
    expect(battler.mimickedMoves).toBe(0b0100);
    expect(member.moves).toEqual([MOVE_SING, MOVE_WISH, MOVE_MIMIC, MOVE_DOUBLE_SLAP]);
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
    expect(state.round.rules.playerRentalRecords!.every((entry) => entry.moveOrder === undefined)).toBe(true);
  });
});
