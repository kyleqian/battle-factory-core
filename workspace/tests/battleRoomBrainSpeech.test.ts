// Noland's speech in the battle room (src/engine/battleRoom.ts, the speech section): the lines of each variant, verbatim from
// src/data/gen/factory-brain-walkup-script.json, and the field message box's frame rules measured on the real ROM
// (docs/parity-mac/noland-room-scenes.md; the frame-for-frame recordings are pinned by tests/parityMacNolandRoomScenes.test.ts).
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import walkup from "../src/data/gen/factory-brain-walkup-script.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceBattleRoom,
  battleRoomAcceptedState,
  battleRoomJustFinishedBrainPersonalitySpeech,
  battleRoomQuoteInputReady,
  BRAIN_MOVEMENT_SETTLE_ELAPSED,
  BRAIN_MSGBOX_ACCEPT_ELAPSED,
  BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED,
  brainSpeechAcceptPlaysSelect,
  brainSpeechLines,
  brainSpeechPicture,
  brainSpeechRows,
  createBrainWalkupBattleRoomState,
  GOLD_FIRST_ENCOUNTER_SPEECH_LINES,
  GOLD_REPEAT_SPEECH_LINES,
  SILVER_FIRST_ENCOUNTER_SPEECH_LINES,
  SILVER_REPEAT_SPEECH_LINES,
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
  const input = { setId, personality, fixedIv, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
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
    rentals: { type: "currentRecords", playerRentalRecords: playerRecords, savedRentalRecords: [...playerRecords, record(1), record(2), record(3)] },
  });
}

const curly = (text: string): string => text.replaceAll("'", "’");
const pages = (scene: { events: readonly { kind: string; pages?: readonly string[] }[] }): string[][] =>
  scene.events.filter((e) => e.kind === "message").map((e) => [...e.pages!]);

/** The escort box printed, pressed on its first taken frame, the movement run, then the speech's first frame (an empty box). */
function speechStart(firstEncounter: boolean, tier: "silver" | "gold"): BattleRoomState {
  let state: BattleRoomState = createBrainWalkupBattleRoomState(undefined, !firstEncounter, tier);
  for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED + BRAIN_MSGBOX_ACCEPT_ELAPSED; i += 1) state = advanceBattleRoom(state);
  expect(battleRoomQuoteInputReady(state)).toBe(true);
  state = battleRoomAcceptedState(state);
  expect(state.phase).toBe("brainMoving");
  for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
  expect(state.phase).toBe("brainSettled");
  for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) state = advanceBattleRoom(state);
  expect(state.phase).toBe("brainSpeech");
  return state;
}

/** Ticks without a press until a press is taken; returns the press frame's pre-state and how many frames it waited. */
function untilReady(state: BattleRoomState): { state: BattleRoomState; frames: number } {
  let frames = 0;
  while (!battleRoomQuoteInputReady(state)) {
    state = advanceBattleRoom(state);
    frames += 1;
    if (frames > 500) throw new Error("no press taken");
  }
  return { state, frames };
}

describe("Noland's lines (scripts.inc:113-153)", () => {
  it("each variant's lines are the script's pages split at \\n and \\l, a \\p starting a new page and each msgbox a new message", () => {
    const silver = pages(walkup.scenes.silverFirstEncounter);
    expect(silver).toHaveLength(2);
    expect(silver[0]).toHaveLength(8);
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_LINES.map((l) => l.text).join("|")).toBe(
      silver.flat().join("|").replaceAll("\\n", "|").replaceAll("\\l", "|").replaceAll("'", "’"),
    );
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_LINES.slice(0, 3).map((l) => [l.link, l.row])).toEqual([["start", 0], ["newline", 1], ["scroll", 1]]);
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_LINES[3]).toMatchObject({ text: "I had a look at your Battle Swap data.", link: "clear", row: 0, message: 0 });
    expect(SILVER_FIRST_ENCOUNTER_SPEECH_LINES.at(-2)).toMatchObject({ text: "Shake out every last bit of your", link: "start", message: 1 });
    expect(SILVER_REPEAT_SPEECH_LINES.map((l) => l.text)).toEqual(["Shake out every last bit of your", "knowledge and bring it on!"]);
    expect(GOLD_FIRST_ENCOUNTER_SPEECH_LINES[0]!.text).toBe(curly("NOLAND: Hey, hey! How's it going?"));
    expect(GOLD_FIRST_ENCOUNTER_SPEECH_LINES.filter((l) => l.link === "scroll")).toHaveLength(0);
    expect(GOLD_REPEAT_SPEECH_LINES.map((l) => l.text)).toEqual(["All right!", "Bring it on!"]);
  });

  it("the room picks the tier's first meeting or its short line from the heard bit", () => {
    expect(brainSpeechLines(createBrainWalkupBattleRoomState(undefined, false, "silver"))).toBe(SILVER_FIRST_ENCOUNTER_SPEECH_LINES);
    expect(brainSpeechLines(createBrainWalkupBattleRoomState(undefined, true, "silver"))).toBe(SILVER_REPEAT_SPEECH_LINES);
    expect(brainSpeechLines(createBrainWalkupBattleRoomState(undefined, false, "gold"))).toBe(GOLD_FIRST_ENCOUNTER_SPEECH_LINES);
    expect(brainSpeechLines(createBrainWalkupBattleRoomState(undefined, true, "gold"))).toBe(GOLD_REPEAT_SPEECH_LINES);
  });
});

describe("the field message box's frame rules (ROM)", () => {
  it("prints one character a frame; \\n is free; a \\l / \\p prompt takes a press on the frame after the last character, the end of a message three frames after", () => {
    let state = speechStart(true, "silver");
    expect(brainSpeechPicture(state)).toMatchObject({ line: 0, chars: 0 });
    // line 0 (22 characters) then the \n line (38): 60 frames, the \n costing none
    for (let i = 0; i < 22; i += 1) state = advanceBattleRoom(state);
    expect(brainSpeechPicture(state)).toMatchObject({ line: 0, chars: 22 });
    state = advanceBattleRoom(state);
    expect(brainSpeechPicture(state)).toMatchObject({ line: 1, chars: 1 });
    const prompt = untilReady(state);
    expect(prompt.frames).toBe(37);
    expect(brainSpeechAcceptPlaysSelect(prompt.state)).toBe(true);
    // the \l scroll: the press frame and the next show the page, then 4 / 8 / 12 / 16 pixels, a hold, the new line's first character
    state = battleRoomAcceptedState(prompt.state);
    const scrolls: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      state = advanceBattleRoom(state);
      scrolls.push(brainSpeechPicture(state).scroll);
    }
    expect(scrolls).toEqual([0, 4, 8, 12, 16, 16, 0]);
    expect(brainSpeechPicture(state)).toMatchObject({ line: 2, chars: 1 });
    expect(brainSpeechRows(state, brainSpeechPicture(state))).toEqual(["I’m basically in charge of this place,", "w"]);
  });

  it("a \\p press shows the cleared box on the next frame only when the arrow is redrawn on the press frame (the first wait frame, then every 9th)", () => {
    let state = speechStart(true, "silver");
    // through the \l to line 2's end (the first \p)
    state = battleRoomAcceptedState(untilReady(state).state);
    const atClear = untilReady(state).state;
    const early = advanceBattleRoom(battleRoomAcceptedState(atClear));
    expect(brainSpeechPicture(early)).toMatchObject({ line: 3, chars: 0 });
    // three frames into the wait: no redraw on the press frame, the page holds one more frame, then the first character
    let late = atClear;
    for (let i = 0; i < 3; i += 1) late = advanceBattleRoom(late);
    late = advanceBattleRoom(battleRoomAcceptedState(late));
    expect(brainSpeechPicture(late)).toMatchObject({ line: 2 });
    late = advanceBattleRoom(late);
    expect(brainSpeechPicture(late)).toMatchObject({ line: 3, chars: 1 });
  });

  it("the end of a message waits three frames; the next msgbox shows its empty box three frames after the press; the last closes two frames after", () => {
    let state = speechStart(false, "gold");
    expect(brainSpeechLines(state)).toBe(GOLD_REPEAT_SPEECH_LINES);
    const end = untilReady(state);
    // "All right!" (10) + "Bring it on!" (12): the last character on frame 22, the press taken on frame 25 (its pre-state is frame 24's)
    expect(end.frames).toBe(22 + 2);
    expect(brainSpeechAcceptPlaysSelect(end.state)).toBe(false);
    state = battleRoomAcceptedState(end.state);
    state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeech");
    state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeechSettled");
    expect(state.elapsed).toBe(0);
  });

  it("the first speech's end marks the heard bit on the press that starts the close line", () => {
    let state = speechStart(true, "gold");
    let marked = 0;
    for (let guard = 0; guard < 4000 && state.phase === "brainSpeech"; guard += 1) {
      if (battleRoomQuoteInputReady(state)) {
        const next = battleRoomAcceptedState(state);
        if (battleRoomJustFinishedBrainPersonalitySpeech(state, next)) {
          marked += 1;
          expect(brainSpeechLines(state)[state.speechLine!]!.message).toBe(0);
        }
        state = next;
      } else {
        state = advanceBattleRoom(state);
      }
    }
    expect(state.phase).toBe("brainSpeechSettled");
    expect(marked).toBe(1);
  });
});

describe("the heard-speech bits", () => {
  it("are per tier: marking gold never touches silver", () => {
    const orchestrator = markFactoryBrainSpeechHeard(minimalOrchestrator("heard-gold"), "gold");
    expect(factoryHeardBrainSpeech(orchestrator.facilityState, "gold")).toBe(true);
    expect(factoryHeardBrainSpeech(orchestrator.facilityState, "silver")).toBe(false);
    expect(factoryHeardBrainSpeech(minimalOrchestrator("fresh").facilityState, "gold")).toBe(false);
  });
});
