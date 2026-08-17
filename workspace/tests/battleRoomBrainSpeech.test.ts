// Walk-up build steps B2/B3: Tier-1 tests for the silver and gold Noland
// speech machine (src/engine/battleRoom.ts's brainSpeech* phases) - the
// gated first-encounter personality speech + close/cry line, the short
// repeat variant, the in-session heard-speech flag gating which variant
// plays (independently per tier), and the handoff seam into the existing
// brain battle-start path. Pinned against
// src/data/gen/factory-brain-walkup-script.json (source truth, already
// pinned structurally by tests/factoryBrainWalkupScript.test.ts).
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
  battleRoomMsgboxClosingPhase,
  battleRoomQuote,
  battleRoomQuoteInputReady,
  BRAIN_MOVEMENT_SETTLE_ELAPSED,
  BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED,
  BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED,
  brainSpeechCursorVisible,
  createBrainWalkupBattleRoomState,
  CURSOR_APPEAR_DELAY_TICKS,
  GOLD_FIRST_ENCOUNTER_SPEECH_BOXES,
  GOLD_PERSONALITY_BOX_COUNT,
  GOLD_PERSONALITY_SPEECH_BOXES,
  GOLD_REPEAT_SPEECH_BOXES,
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
const goldFirstEncounter = walkup.scenes.goldFirstEncounter;
const goldRepeat = walkup.scenes.goldRepeat;

function settledFirstEncounterState(tier: "silver" | "gold" = "silver"): BattleRoomState {
  let state: BattleRoomState = createBrainWalkupBattleRoomState(undefined, false, tier);
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
      // The cursor never shows the instant print completes - oracle draws no
      // cursor pixels at all for the first CURSOR_APPEAR_DELAY_TICKS ticks of
      // every fresh brainSpeechIdle entry (battleRoom.ts's own doc, dense-
      // compare-caught this session). Past that delay, the wait cursor shows
      // on every box except the last personality page (string-terminated, no
      // more \p/\l pending) and the cry (a standalone msgbox, same shape as
      // the entrance's own cursor-less "Get a move on!" box).
      expect(brainSpeechCursorVisible(next)).toBe(false);
      let cursorCheck = next;
      for (let i = 0; i < CURSOR_APPEAR_DELAY_TICKS; i += 1) cursorCheck = advanceBattleRoom(cursorCheck);
      expect(brainSpeechCursorVisible(cursorCheck)).toBe(box < SILVER_PERSONALITY_BOX_COUNT - 1);
      const prev = next;
      next = battleRoomAcceptedState(next);
      if (battleRoomJustFinishedBrainPersonalitySpeech(prev, next)) heardFired += 1;
      // Only the window's FINAL box (the cry box's own dismiss) is still a
      // real close via "brainSpeechClosing" - every other box boundary
      // (personality-to-personality AND the real close+reopen into the cry
      // box) lands directly on "brainSpeech" with no hidden wait, see
      // battleRoomAcceptedState's own doc.
      if (next.phase === "brainSpeechClosing") {
        for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) next = advanceBattleRoom(next);
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

describe("gold Noland speech (walk-up build step B3)", () => {
  it("the JSON's goldFirstEncounter speech is 4 pages, verbatim, gated on the gold heard-speech flag (its own bit, independent of silver's)", () => {
    const message = goldFirstEncounter.events[0] as { pages: readonly string[] };
    expect(message.pages).toHaveLength(4);
    expect(message.pages[0]).toBe("NOLAND: Hey, hey! How's it going?\\nYou keeping up with your studies?");
    expect(message.pages[3]).toBe("Now, this should be fun!\\nI'm getting excited, hey!");
    // No battle-cry event - the gated speech is followed directly by the
    // always-shown close line (module doc in battleRoom.ts).
    const close = goldFirstEncounter.events[2] as { pages: readonly string[] };
    expect(close.pages).toEqual(["All right!\\nBring it on!"]);
    expect((goldFirstEncounter.gate as { bit: string }).bit).toBe("1 << 9");
    expect((walkup.scenes.silverFirstEncounter.gate as { bit: string }).bit).toBe("1 << 8");
  });

  it("flattens the 4 pages to 4 boxes 1:1 (no \\l scroll in any gold page, unlike silver's page 1) - text verbatim spot-checked", () => {
    expect(GOLD_PERSONALITY_SPEECH_BOXES).toHaveLength(4);
    expect(GOLD_PERSONALITY_BOX_COUNT).toBe(4);
    expect(GOLD_PERSONALITY_SPEECH_BOXES[0]).toEqual([
      "NOLAND: Hey, hey! How’s it going?",
      "You keeping up with your studies?",
    ]);
    expect(GOLD_PERSONALITY_SPEECH_BOXES[1]).toEqual(["…Oh?", ""]);
    expect(GOLD_PERSONALITY_SPEECH_BOXES[2]).toEqual([
      "You’ve taken on a harder look than",
      "the last time I saw you.",
    ]);
    expect(GOLD_PERSONALITY_SPEECH_BOXES[3]).toEqual([
      "Now, this should be fun!",
      "I’m getting excited, hey!",
    ]);
    // First-encounter queue is the 4 personality boxes plus the close line.
    expect(GOLD_FIRST_ENCOUNTER_SPEECH_BOXES).toHaveLength(5);
    expect(GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[4]).toEqual(["All right!", "Bring it on!"]);
  });

  it("the repeat variant (goldRepeat.events: close message + DoNolandBattle call, 2 JSON events) is just the one close box - the same text either variant ends on", () => {
    expect(goldRepeat.events).toHaveLength(2);
    expect(goldRepeat.events[0]!.kind).toBe("message");
    expect(goldRepeat.events[1]!.kind).toBe("call");
    expect(GOLD_REPEAT_SPEECH_BOXES).toHaveLength(1);
    expect(GOLD_REPEAT_SPEECH_BOXES[0]).toEqual(
      GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length - 1],
    );
    // Gold's close line is textually distinct from silver's own cry line.
    expect(GOLD_REPEAT_SPEECH_BOXES[0]).not.toEqual(SILVER_REPEAT_SPEECH_BOXES[0]);
  });

  it("flag gating: heardBrainSpeechBefore selects the repeat variant, unset selects the full first-encounter speech - same shape as silver, tier passed as the third arg", () => {
    const first = createBrainWalkupBattleRoomState(undefined, false, "gold");
    expect(first.brainSpeechFirstEncounter).toBe(true);
    expect(first.brainSpeechTier).toBe("gold");
    const repeat = createBrainWalkupBattleRoomState(undefined, true, "gold");
    expect(repeat.brainSpeechFirstEncounter).toBe(false);
    expect(repeat.brainSpeechTier).toBe("gold");
    // Omitting the tier arg (every pre-B3 call site) still defaults silver.
    expect(createBrainWalkupBattleRoomState(undefined, false).brainSpeechTier).toBe("silver");
  });

  it("brainSettled hands off into the gold speech; the first box's text/print-tick count matches box 0 and battleRoomQuote", () => {
    const state = settledFirstEncounterState("gold");
    expect(state.phase).toBe("brainSpeech");
    expect(state.speechStep).toBe(0);
    expect(battleRoomQuote(state)).toEqual(GOLD_PERSONALITY_SPEECH_BOXES[0]);
    const box0PrintTicks = GOLD_PERSONALITY_SPEECH_BOXES[0]![0].length
      + GOLD_PERSONALITY_SPEECH_BOXES[0]![1].length;
    let printed = state;
    for (let i = 0; i < box0PrintTicks; i += 1) printed = advanceBattleRoom(printed);
    expect(printed.phase).toBe("brainSpeechIdle");
    expect(msgboxVisual(printed)).toEqual({ visible: true, chars: box0PrintTicks });
    expect(battleRoomQuoteInputReady(printed)).toBe(true);
  });

  it("walks through all 5 first-encounter boxes in order, then settles into 'brainSpeechSettled' - page 4 (the last personality box) is STATIC, no cursor blink, matching the dense gold ground truth (docs/noland-brain-intro-gold-ground-truth.md §7')", () => {
    let state = settledFirstEncounterState("gold");
    const seenBoxes: (readonly [string, string])[] = [];
    let heardFired = 0;
    for (let box = 0; box < GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length; box += 1) {
      expect(state.phase).toBe("brainSpeech");
      expect(state.speechStep).toBe(box);
      seenBoxes.push(battleRoomQuote(state));
      let next = advanceThroughFullyPrinted(state);
      // Same CURSOR_APPEAR_DELAY_TICKS onset delay as silver's own box loop
      // above. Past that delay, cursor shows on every box except the last
      // personality page (page 4, index 3 - static per the dense ground
      // truth) and the close line (a standalone msgbox, same shape as
      // silver's cry box).
      expect(brainSpeechCursorVisible(next)).toBe(false);
      let cursorCheck = next;
      for (let i = 0; i < CURSOR_APPEAR_DELAY_TICKS; i += 1) cursorCheck = advanceBattleRoom(cursorCheck);
      expect(brainSpeechCursorVisible(cursorCheck)).toBe(box < GOLD_PERSONALITY_BOX_COUNT - 1);
      const prev = next;
      next = battleRoomAcceptedState(next);
      if (battleRoomJustFinishedBrainPersonalitySpeech(prev, next)) heardFired += 1;
      // Only the window's FINAL box (the close box's own dismiss) is still a
      // real close via "brainSpeechClosing" - see the silver loop's own
      // comment above for why every other box boundary skips it.
      if (next.phase === "brainSpeechClosing") {
        for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) next = advanceBattleRoom(next);
      }
      state = next;
    }
    expect(seenBoxes).toEqual(GOLD_FIRST_ENCOUNTER_SPEECH_BOXES);
    // The heard-speech transition fires exactly once, between the last
    // personality box (index 3) and the close box (index 4).
    expect(heardFired).toBe(1);
    expect(state.phase).toBe("brainSpeechSettled");
    expect(state.elapsed).toBe(0);
    for (let i = 0; i < BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeechSettled");
    expect(msgboxVisual(state)).toEqual({ visible: false, chars: 0 });
  });

  it("battleRoomAcceptedState (core.ts's real accept seam): an internal \\p page turn skips brainSpeechClosing entirely - lands directly on the next page at elapsed 0, same tick as the accept, no empty-box delay - the LAST personality page's real close+reopen into the close box does too (just under the slow/cleared model, not the fast one) - and the repeat variant (single box, already the close box) never takes the direct-continuation shortcut", () => {
    let state = settledFirstEncounterState("gold");
    for (let box = 0; box < GOLD_PERSONALITY_BOX_COUNT - 1; box += 1) {
      const held = advanceThroughFullyPrinted(state);
      const accepted = battleRoomAcceptedState(held);
      // Direct continuation: still "brainSpeech" (never "brainSpeechClosing"),
      // next box, elapsed reset to 0. The window's FIRST accept-driven
      // transition (box === 0, leaving the window's very first box) still
      // shows the accept tick cleared (chars 0, first glyph one tick later) -
      // gold's page 1->2 edge is oracle-exact under this model
      // (docs/noland-brain-intro-gold-ground-truth.md §9'''). Every LATER
      // transition (box >= 1) is one tick faster: the accept tick already
      // shows the next box's first character (chars 1) - gold's page 2->3/
      // 3->4 edges and silver's box 1->2 edge are oracle-exact under this
      // model instead (same doc + docs/silver-speech-box2-evidence.md; see
      // `speechAcceptedFast`'s own doc in battleRoom.ts for the full
      // two-window derivation this pins).
      expect(accepted.phase).toBe("brainSpeech");
      expect(accepted.speechStep).toBe(box + 1);
      expect(accepted.elapsed).toBe(0);
      expect(msgboxVisual(accepted)).toEqual({ visible: true, chars: box === 0 ? 0 : 1 });
      expect(battleRoomQuote(accepted)).toEqual(GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[box + 1]);
      state = accepted;
    }
    // Now on the last personality page (index GOLD_PERSONALITY_BOX_COUNT - 1)
    // - accepting it is a genuine box close (a real new message() call for
    // the close box), but the two dense edge fixtures
    // (docs/speech-close-edge-evidence.md, docs/speech-close-edge-silver-
    // evidence.md) proved it renders identically to a direct continuation:
    // straight onto "brainSpeech" on the accept tick, just under the slow/
    // cleared model (speechAcceptedFast false, chars 0) rather than the fast
    // one - never "brainSpeechClosing" (no MSGBOX_HIDDEN wait at all).
    expect(state.speechStep).toBe(GOLD_PERSONALITY_BOX_COUNT - 1);
    const heldLast = advanceThroughFullyPrinted(state);
    const acceptedLast = battleRoomAcceptedState(heldLast);
    expect(acceptedLast.phase).toBe("brainSpeech");
    expect(acceptedLast.speechStep).toBe(GOLD_PERSONALITY_BOX_COUNT);
    expect(acceptedLast.elapsed).toBe(0);
    expect(acceptedLast.speechAcceptedFast).toBe(false);
    expect(msgboxVisual(acceptedLast)).toEqual({ visible: true, chars: 0 });
    expect(battleRoomQuote(acceptedLast)).toEqual(
      GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[GOLD_PERSONALITY_BOX_COUNT],
    );
    expect(battleRoomJustFinishedBrainPersonalitySpeech(heldLast, acceptedLast)).toBe(true);

    // Only the close box's OWN dismiss (no next box left) is still a real
    // close via "brainSpeechClosing".
    const heldClose = advanceThroughFullyPrinted(acceptedLast);
    const acceptedClose = battleRoomAcceptedState(heldClose);
    expect(acceptedClose.phase).toBe("brainSpeechClosing");
    expect(acceptedClose.elapsed).toBe(0);

    // Repeat variant: speechStep 0 IS the close box itself
    // (brainSpeechFirstEncounter false) - must not be mistaken for an
    // internal personality-page continuation even though
    // GOLD_PERSONALITY_BOX_COUNT - 1 (3) is still > 0.
    let repeatState: BattleRoomState = createBrainWalkupBattleRoomState(undefined, true, "gold");
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) repeatState = advanceBattleRoom(repeatState);
    repeatState = battleRoomAcceptedState(repeatState);
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) repeatState = advanceBattleRoom(repeatState);
    for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) repeatState = advanceBattleRoom(repeatState);
    for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) repeatState = advanceBattleRoom(repeatState);
    expect(repeatState.phase).toBe("brainSpeech");
    expect(repeatState.speechStep).toBe(0);
    const repeatHeld = advanceThroughFullyPrinted(repeatState);
    const repeatAccepted = battleRoomAcceptedState(repeatHeld);
    expect(repeatAccepted.phase).toBe("brainSpeechClosing");
  });

  it("the repeat variant walks through exactly 1 box (no personality speech, no heard-flag transition) straight to brainSpeechSettled", () => {
    let state: BattleRoomState = createBrainWalkupBattleRoomState(undefined, true, "gold");
    for (let i = 0; i < BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    state = { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) state = advanceBattleRoom(state);
    for (let i = 0; i < BRAIN_MOVEMENT_SETTLE_ELAPSED; i += 1) state = advanceBattleRoom(state);
    for (let i = 0; i <= SPEECH_APPEAR_ELAPSED; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("brainSpeech");
    expect(state.speechStep).toBe(0);
    expect(battleRoomQuote(state)).toEqual(GOLD_REPEAT_SPEECH_BOXES[0]);
    let next = advanceThroughFullyPrinted(state);
    next = { ...next, phase: battleRoomMsgboxClosingPhase(next), elapsed: 0 };
    for (let i = 0; i < MSGBOX_CLOSE_TICKS; i += 1) {
      const prev = next;
      next = advanceBattleRoom(next);
      expect(battleRoomJustFinishedBrainPersonalitySpeech(prev, next)).toBe(false);
    }
    expect(next.phase).toBe("brainSpeechSettled");
  });

  it("the heard-speech flag is per-tier and in-session only: marking gold never touches silver's own slot, matching B2's precedent for silver marking gold", () => {
    const heard = markFactoryBrainSpeechHeard(minimalOrchestrator("brain-speech-heard-gold"), "gold");
    expect(factoryHeardBrainSpeech(heard.facilityState, "gold")).toBe(true);
    // Marking is idempotent.
    expect(markFactoryBrainSpeechHeard(heard, "gold")).toBe(heard);
    // Silver's own slot is independent and untouched by the gold mark.
    expect(factoryHeardBrainSpeech(heard.facilityState, "silver")).toBe(false);
  });
});
