// Walk-up build step B2: Tier-1 tests for the silver Noland speech machine
// (src/engine/battleRoom.ts's brainSpeech* phases) - the 8-page first-
// encounter personality speech + battle-cry line, the 2-event repeat
// variant, the in-session heard-speech flag gating which variant plays, and
// the handoff seam into the existing brain battle-start path. Pinned
// against src/data/gen/factory-brain-walkup-script.json (source truth,
// already pinned structurally by tests/factoryBrainWalkupScript.test.ts).
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import walkup from "../src/data/gen/factory-brain-walkup-script.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceBattleRoom,
  battleRoomJustFinishedBrainPersonalitySpeech,
  battleRoomMsgboxClosingPhase,
  battleRoomQuote,
  battleRoomQuoteInputReady,
  BRAIN_MOVEMENT_SETTLE_ELAPSED,
  BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED,
  BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED,
  brainSpeechCursorVisible,
  createBrainWalkupBattleRoomState,
  MSGBOX_CLOSE_TICKS,
  msgboxVisual,
  SILVER_FIRST_ENCOUNTER_SPEECH_BOXES,
  SILVER_PERSONALITY_BOX_COUNT,
  SILVER_PERSONALITY_SPEECH_BOXES,
  SILVER_REPEAT_SPEECH_BOXES,
  SPEECH_APPEAR_ELAPSED,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import {
  createFactoryRoundBattleOrchestrator,
  factoryHeardBrainSpeech,
  markFactoryBrainSpeechHeard,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const PLAYER_TRAINER_ID = 0x89ab_cdef;

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
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function minimalOrchestrator(id: string) {
  const playerRecords = [record(664), record(678), record(527)] as const;
  return createFactoryRoundBattleOrchestrator({
    id,
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords: [...playerRecords, record(1), record(2), record(3)],
    },
  });
}

const silverFirstEncounter = walkup.scenes.silverFirstEncounter;
const silverRepeat = walkup.scenes.silverRepeat;

function settledFirstEncounterState(): BattleRoomState {
  let state: BattleRoomState = createBrainWalkupBattleRoomState(undefined, false);
  for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) state = advanceBattleRoom(state);
  state = { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };
  for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) state = advanceBattleRoom(state);
  for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
  expect(state.phase).toBe("brainSettled");
  for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) state = advanceBattleRoom(state);
  return state;
}

describe("silver Noland speech (walk-up build step B2)", () => {
  it("the JSON's silverFirstEncounter speech is 8 pages, verbatim, gated on the silver heard-speech flag", () => {
    const message = silverFirstEncounter.events[0] as { pages: readonly string[] };
    expect(message.pages).toHaveLength(8);
    expect(message.pages[0]).toBe(
      "Hey, my name's NOLAND!\\nI'm basically in charge of this place,\\lwhich is why I'm the FACTORY HEAD!",
    );
    expect(message.pages[7]).toBe("I'll be using rental POKéMON, too!");
    const cry = silverFirstEncounter.events[2] as { pages: readonly string[] };
    expect(cry.pages).toEqual(["Shake out every last bit of your\\nknowledge and bring it on!"]);
  });

  it("flattens the 8 pages to 9 boxes (page 1's internal \\l scroll splits into 2) - text verbatim spot-checked (apostrophes normalized to the font's own curly glyph - factoryTrainerPresentation.ts's displayEasyChatWord precedent, since the extraction JSON's plain ASCII apostrophe has no charmap entry)", () => {
    expect(SILVER_PERSONALITY_SPEECH_BOXES).toHaveLength(9);
    expect(SILVER_PERSONALITY_BOX_COUNT).toBe(9);
    expect(SILVER_PERSONALITY_SPEECH_BOXES[0]).toEqual([
      "Hey, my name’s NOLAND!",
      "I’m basically in charge of this place,",
    ]);
    expect(SILVER_PERSONALITY_SPEECH_BOXES[1]).toEqual([
      "I’m basically in charge of this place,",
      "which is why I’m the FACTORY HEAD!",
    ]);
    expect(SILVER_PERSONALITY_SPEECH_BOXES[8]).toEqual(["I’ll be using rental POKéMON, too!", ""]);
    // First-encounter queue is the 9 personality boxes plus the cry.
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_BOXES).toHaveLength(10);
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[9]).toEqual([
      "Shake out every last bit of your",
      "knowledge and bring it on!",
    ]);
  });

  it("the repeat variant (silverRepeat.events: cry message + DoNolandBattle call, 2 JSON events) is just the one cry box - the same text either variant ends on", () => {
    expect(silverRepeat.events).toHaveLength(2);
    expect(silverRepeat.events[0]!.kind).toBe("message");
    expect(silverRepeat.events[1]!.kind).toBe("call");
    expect(SILVER_REPEAT_SPEECH_BOXES).toHaveLength(1);
    expect(SILVER_REPEAT_SPEECH_BOXES[0]).toEqual(
      SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length - 1],
    );
  });

  it("flag gating: heardBrainSpeechBefore selects the repeat variant, unset selects the full first-encounter speech", () => {
    const first = createBrainWalkupBattleRoomState(undefined, false);
    expect(first.brainSpeechFirstEncounter).toBe(true);
    const repeat = createBrainWalkupBattleRoomState(undefined, true);
    expect(repeat.brainSpeechFirstEncounter).toBe(false);
    // Default (no third arg, matching B1's own existing call sites) is
    // still "first encounter" - non-breaking for every pre-B2 caller.
    expect(createBrainWalkupBattleRoomState().brainSpeechFirstEncounter).toBe(true);
  });

  it("brainSettled hands off into the speech; the first box's text/print-tick count matches box 0 and battleRoomQuote", () => {
    const state = settledFirstEncounterState();
    expect(state.phase).toBe("brainSpeech");
    expect(state.speechStep).toBe(0);
    expect(battleRoomQuote(state)).toEqual(SILVER_PERSONALITY_SPEECH_BOXES[0]);
    const box0PrintTicks = SILVER_PERSONALITY_SPEECH_BOXES[0]![0].length
      + SILVER_PERSONALITY_SPEECH_BOXES[0]![1].length;
    let printed = state;
    for (let i = 0; i < box0PrintTicks; i += 1) printed = advanceBattleRoom(printed);
    expect(printed.phase).toBe("brainSpeechIdle");
    expect(msgboxVisual(printed)).toEqual({ visible: true, chars: box0PrintTicks });
    expect(battleRoomQuoteInputReady(printed)).toBe(true);
    // Idling holds the same phase/text/print state (no timer-driven page
    // auto-advance) - only `elapsed` keeps ticking, driving the wait-
    // cursor's own bob animation (brainSpeechCursorYOffset).
    const held = advanceBattleRoom(printed);
    expect(held).toEqual({ ...printed, elapsed: printed.elapsed + 1 });
    expect(msgboxVisual(held)).toEqual({ visible: true, chars: box0PrintTicks });
  });

  it("walks through all 10 first-encounter boxes in order, then settles into 'brainSpeechSettled' and becomes handoff-ready at BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED", () => {
    let state = settledFirstEncounterState();
    const seenBoxes: (readonly [string, string])[] = [];
    let heardFired = 0;
    for (let box = 0; box < SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length; box += 1) {
      expect(state.phase).toBe("brainSpeech");
      expect(state.speechStep).toBe(box);
      seenBoxes.push(battleRoomQuote(state));
      let next = advanceThroughFullyPrinted(state);
      // The wait cursor shows on every box except the last personality page
      // (string-terminated, no more \p/\l pending) and the cry (a standalone
      // msgbox, same shape as the entrance's own cursor-less "Get a move
      // on!" box) - dense-compare-caught (this step's own box0/cry traces).
      expect(brainSpeechCursorVisible(next)).toBe(box < SILVER_PERSONALITY_BOX_COUNT - 1);
      next = { ...next, phase: battleRoomMsgboxClosingPhase(next), elapsed: 0 };
      for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) {
        const prev = next;
        next = advanceBattleRoom(next);
        if (battleRoomJustFinishedBrainPersonalitySpeech(prev, next)) heardFired += 1;
      }
      state = next;
    }
    expect(seenBoxes).toEqual(SILVER_FIRST_ENCOUNTER_SPEECH_BOXES);
    // The heard-speech transition fires exactly once, between the last
    // personality box (index 8) and the cry box (index 9) - never for any
    // other box boundary.
    expect(heardFired).toBe(1);
    expect(state.phase).toBe("brainSpeechSettled");
    expect(state.elapsed).toBe(0);
    for (let i = 0; i < BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeechSettled");
    expect(state.elapsed).toBe(BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED);
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });
  });

  it("the repeat variant walks through exactly 1 box (no personality speech, no heard-flag transition) straight to brainSpeechSettled", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState(undefined, true);
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    state = { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) state = advanceBattleRoom(state);
    for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeech");
    expect(state.speechStep).toBe(0);
    expect(battleRoomQuote(state)).toEqual(SILVER_REPEAT_SPEECH_BOXES[0]);
    let next = advanceThroughFullyPrinted(state);
    next = { ...next, phase: battleRoomMsgboxClosingPhase(next), elapsed: 0 };
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) {
      const prev = next;
      next = advanceBattleRoom(next);
      expect(battleRoomJustFinishedBrainPersonalitySpeech(prev, next)).toBe(false);
    }
    expect(next.phase).toBe("brainSpeechSettled");
  });

  it("the heard-speech flag is in-session only: a fresh orchestrator's facilityState reads unheard even after another instance marked it", () => {
    const heard = markFactoryBrainSpeechHeard(minimalOrchestrator("brain-speech-heard"), "silver");
    expect(factoryHeardBrainSpeech(heard.facilityState, "silver")).toBe(true);
    // Marking is idempotent.
    expect(markFactoryBrainSpeechHeard(heard, "silver")).toBe(heard);
    // Gold's own slot is independent and untouched by the silver mark.
    expect(factoryHeardBrainSpeech(heard.facilityState, "gold")).toBe(false);

    const fresh = minimalOrchestrator("brain-speech-fresh-session");
    expect(factoryHeardBrainSpeech(fresh.facilityState, "silver")).toBe(false);
  });
});

function advanceThroughFullyPrinted(state: BattleRoomState): BattleRoomState {
  let next = state;
  while (!battleRoomQuoteInputReady(next)) next = advanceBattleRoom(next);
  return next;
}
