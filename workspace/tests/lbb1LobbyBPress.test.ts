// lbb1 (docs/lbb1-lobby-b-press.md): the boxes of the Lobby, the after-round terminal, the after-battle (postwin) flow and the rooms on
// either side of it that wait for a press take A or B, on the frame A is taken, as the ROM's do: `msgbox ..., MSGBOX_DEFAULT` ends in
// `waitbuttonpress` (WaitForAorBPress, scrcmd.c:1323-1330), a `\p` page waits in TextPrinterWaitWithDownArrow (JOY_NEW(A_BUTTON |
// B_BUTTON), text.c:865-882), and the RECORD / RETIRE question (`multichoicedefault ..., MULTI_YESNO, 1, FALSE`) takes B as
// MULTI_B_PRESSED, which the script sends back to the GO ON menu like NO. Before, these took A only; the fcm1 catcher saw the ROM close
// the Lobby's farewell on a B ours ignored (s118-on-wc after battle 14, ours 170,402), and five rounds stop in the Lobby that way.
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattlePresentationCommand } from "../src/engine/battlePresentation.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createFactoryLobbyFreeRoamState } from "../src/engine/factoryLobbyFreeRoam.ts";
import { beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { createInitialFactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
  createFactoryTerminalRoundWonPresentation,
  FACTORY_LOSS_TERMINAL_PROFILE,
  FACTORY_ROUND_WON_TERMINAL_PROFILE,
  type FactoryTerminalPresentationState,
} from "../src/engine/factoryTerminalPresentation.ts";
import {
  INITIAL_POSTWIN_STATE,
  POSTWIN_HEAL_INPUT_READY_AGE,
  POSTWIN_QUESTION_WINDOW_DELAYS,
  POSTWIN_RECORDED_INPUT_READY_DELAY,
  advancePostwin,
  postwinContinuationInputReady,
  type PostwinState,
} from "../src/engine/postwin.ts";
import { SE_SELECT } from "../src/engine/screenSounds.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import type { SoakCoverageCollector } from "../tools/soak/randomRoundSoakCoverage.ts";
import { driveAttendantConversation } from "./helpers/lobbyAttendant.ts";

const A: ReadonlySet<GbaButton> = new Set(["A"]);
const B: ReadonlySet<GbaButton> = new Set(["B"]);
const DOWN: ReadonlySet<GbaButton> = new Set(["DOWN"]);
const NONE: ReadonlySet<GbaButton> = new Set();

type TerminalInput = Parameters<typeof advanceFactoryTerminalPresentation>[1];

function idleTo<T extends FactoryTerminalPresentationState>(state: T, age: number): T {
  let s = state;
  while (s.age < age) s = advanceFactoryTerminalPresentation(s, {}) as T;
  return s;
}

/** Presses `input` on every other tick, from the second (a release, a press: core reads new presses only) until `done`. */
function pressUntil<T extends FactoryTerminalPresentationState>(state: T, input: TerminalInput, done: (s: T) => boolean): T {
  let s = state;
  for (let i = 0; i < 6000 && !done(s); i += 1) s = advanceFactoryTerminalPresentation(s, i % 2 === 1 ? input : {}) as T;
  if (!done(s)) throw new Error("terminal gate never reached");
  return s;
}

const LOSS = { type: "roundLost", commandId: 1, battleIndex: 0 } as const;
const WON = { type: "roundCompleted", commandId: 1, battleIndex: 6, opponent: {} } as unknown as Extract<
  BattlePresentationCommand,
  { readonly type: "roundCompleted" }
>;

describe("lbb1: the Lobby's after-round boxes take B on the frame A is taken", () => {
  it("the farewell after the record question closes on B from the ROM's gate (won: s118-on-wc's B 47 frames after the answer)", () => {
    // Won round, NO on the record question (pressing A from the first frame each box takes it), then B on the farewell.
    const answered = pressUntil(createFactoryTerminalRoundWonPresentation(WON), { pressedA: true }, (s) => s.declineFarewellReleaseAge !== null);
    expect(answered.recordChoice).toBe("no");
    const edge = answered.declineFarewellReleaseAge!;
    const gate = FACTORY_ROUND_WON_TERMINAL_PROFILE.declineInputDelay;
    expect(gate).toBe(41);
    const early = advanceFactoryTerminalPresentation(idleTo(answered, edge + gate - 2), { pressedB: true });
    expect(early.declineDismissAge).toBeNull();
    const before = idleTo(answered, edge + gate - 1);
    const onB = advanceFactoryTerminalPresentation(before, { pressedB: true });
    expect(onB.age).toBe(edge + gate);
    expect(onB.declineDismissAge).toBe(edge + gate);
    expect(onB).toEqual(advanceFactoryTerminalPresentation(before, { pressedA: true }));
    // fcm1 s118-on-wc: the test player's B came 47 frames after the answer, which the ROM took (ours ignored it).
    const s118 = advanceFactoryTerminalPresentation(idleTo(answered, edge + 46), { pressedB: true });
    expect(s118.declineDismissAge).toBe(edge + 47);
  });

  it("the loss route: both `\\p` pages and the farewell take B at their A gates", () => {
    const P = FACTORY_LOSS_TERMINAL_PROFILE;
    let s = createFactoryTerminalLossPresentation(LOSS);
    // Page 0 ("Thank you for participating!") from age 171, as A (factoryTerminalPresentation.test.ts).
    expect(advanceFactoryTerminalPresentation(idleTo(s, P.firstPageInputReadyAge - 2), { pressedB: true }).firstPageReleaseAge).toBeNull();
    s = advanceFactoryTerminalPresentation(idleTo(s, P.firstPageInputReadyAge - 1), { pressedB: true });
    expect(s.firstPageReleaseAge).toBe(P.firstPageInputReadyAge);
    // Page 1 from its last character, as A.
    const page1 = pressUntil(s, { pressedA: true }, (t) => t.secondPageReleaseAge !== null);
    const page1Gate = page1.secondPageReleaseAge!;
    const beforePage1 = idleTo(s, page1Gate - 1);
    expect(advanceFactoryTerminalPresentation(idleTo(s, page1Gate - 2), { pressedB: true }).secondPageReleaseAge).toBeNull();
    expect(advanceFactoryTerminalPresentation(beforePage1, { pressedB: true })).toEqual(page1);
    // The record question answered with B (cancel), then the farewell's B at edge + 39.
    const answered = pressUntil(page1, { pressedB: true }, (t) => t.declineFarewellReleaseAge !== null);
    expect(answered.recordChoice).toBe("cancel");
    const edge = answered.declineFarewellReleaseAge!;
    expect(advanceFactoryTerminalPresentation(idleTo(answered, edge + P.declineInputDelay - 2), { pressedB: true }).declineDismissAge)
      .toBeNull();
    expect(advanceFactoryTerminalPresentation(idleTo(answered, edge + P.declineInputDelay - 1), { pressedB: true }).declineDismissAge)
      .toBe(edge + P.declineInputDelay);
  });

  it("YES: 'battle was recorded' and then the farewell take B at their A gates", () => {
    const P = FACTORY_LOSS_TERMINAL_PROFILE;
    const menu = pressUntil(createFactoryTerminalLossPresentation(LOSS), { pressedA: true }, (s) => s.recordPromptReleaseAge !== null);
    const onYes = advanceFactoryTerminalPresentation(idleTo(menu, menu.recordPromptReleaseAge! + P.recordMenuInputDelay), { pressedUp: true });
    expect(onYes.recordMenuCursor).toBe(0);
    const yes = advanceFactoryTerminalPresentation(onYes, { pressedA: true });
    expect(yes.recordChoice).toBe("yes");
    const edge = yes.declineFarewellReleaseAge!;
    expect(advanceFactoryTerminalPresentation(idleTo(yes, edge + P.recordSavedInputDelay - 2), { pressedB: true }).recordSavedDismissAge)
      .toBeNull();
    const before = idleTo(yes, edge + P.recordSavedInputDelay - 1);
    const saved = advanceFactoryTerminalPresentation(before, { pressedB: true });
    expect(saved.recordSavedDismissAge).toBe(edge + P.recordSavedInputDelay);
    expect(saved).toEqual(advanceFactoryTerminalPresentation(before, { pressedA: true }));
    const farewellEdge = saved.declineFarewellReleaseAge!;
    expect(farewellEdge).toBe(saved.recordSavedDismissAge);
    expect(advanceFactoryTerminalPresentation(idleTo(saved, farewellEdge + P.declineInputDelay - 1), { pressedB: true }).declineDismissAge)
      .toBe(farewellEdge + P.declineInputDelay);
  });
});

/** The state from which A is first taken (`taken(before, after)`), ticking with no press, and the state one tick earlier. */
function untilAccepts(
  start: EngineState,
  taken: (before: EngineState, after: EngineState) => boolean,
  limit = 4000,
): { ready: EngineState; prev: EngineState; waited: number } {
  let prev = start;
  let s = start;
  for (let i = 0; i < limit; i += 1) {
    if (taken(s, tick(s, A))) return { ready: s, prev, waited: i };
    prev = s;
    s = tick(s, NONE);
  }
  throw new Error("no press taken");
}

/** B is taken on the very tick A is, with the same result, and not a tick earlier. */
function expectBLikeA(
  start: EngineState,
  taken: (before: EngineState, after: EngineState) => boolean,
  pick: (s: EngineState) => unknown,
): EngineState {
  const { ready, prev, waited } = untilAccepts(start, taken);
  expect(waited).toBeGreaterThan(0);
  expect(taken(prev, tick(prev, B))).toBe(false);
  const onB = tick(ready, B);
  expect(taken(ready, onB)).toBe(true);
  expect(pick(onB)).toEqual(pick(tick(ready, A)));
  expect(onB.rngValue).toBe(tick(ready, A).rngValue);
  return onB;
}

const postwinOf = (s: EngineState) => s.postwin;

describe("lbb1: the postwin's boxes take B on the frame A is taken", () => {
  it("'Let us restore your POKéMON!' (MSGBOX_DEFAULT) from the ROM's A gate, age 194", () => {
    const start: EngineState = { ...createInitialState(), postwin: { ...INITIAL_POSTWIN_STATE, elapsed: POSTWIN_HEAL_INPUT_READY_AGE - 6 } };
    const onB = expectBLikeA(start, (b, a) => b.postwin!.healDismissElapsed === null && a.postwin!.healDismissElapsed !== null, postwinOf);
    expect(onB.postwin!.healDismissElapsed).toBe(POSTWIN_HEAL_INPUT_READY_AGE);
  });

  for (const kind of ["record", "retire"] as const) {
    it(`B on the ${kind.toUpperCase()} question is NO, wherever the cursor is, with one SE_SELECT, from the window's first frame`, () => {
      const edge = 6_639;
      const window = POSTWIN_QUESTION_WINDOW_DELAYS[kind];
      const at = (elapsed: number, cursor: 0 | 1): EngineState => ({
        ...createInitialState(),
        postwin: {
          ...INITIAL_POSTWIN_STATE,
          elapsed,
          healDismissElapsed: 2_000,
          continuationCursorPos: kind === "record" ? 1 : 3,
          question: { kind, edgeElapsed: edge },
          questionCursorPos: cursor,
          questionCursorDisplayPos: cursor,
        },
      });
      // One tick before the window: B is not taken (as A is not).
      expect(tick(at(edge + window - 2, 1), B).postwin!.questionDismissElapsed).toBeNull();
      for (const cursor of [1, 0] as const) {
        const { result, events } = collectSoundTick(1, () => tick(at(edge + window - 1, cursor), B));
        expect(result.postwin!.questionDismissElapsed).toBe(edge + window - 1);
        expect(result.postwin!.questionYesElapsed).toBeNull();
        expect(events.filter((e) => e.kind === "se" && e.id === SE_SELECT)).toHaveLength(1);
        if (cursor === 1) expect(result.postwin).toEqual(tick(at(edge + window - 1, 1), A).postwin);
      }
      // ... and it goes back to the GO ON menu like NO: the menu asked again, on GO ON, takes input.
      let s = tick(at(edge + window - 1, 0), B);
      for (let i = 0; i < 200 && !(s.postwin!.question === null && postwinContinuationInputReady(s.postwin!)); i += 1) s = tick(s, NONE);
      expect(s.postwin!.question).toBeNull();
      expect(s.postwin!.continuationCursorPos).toBe(0);
      expect(s.postwin!.disableRecordBattle).toBe(false);
    });
  }

  it("'{PLAYER}'s battle was recorded' (MSGBOX_DEFAULT) takes B at its A gate", () => {
    const edge = 6_639;
    const window = POSTWIN_QUESTION_WINDOW_DELAYS.record;
    const onYes: EngineState = {
      ...createInitialState(),
      postwin: {
        ...INITIAL_POSTWIN_STATE,
        elapsed: edge + window - 1,
        healDismissElapsed: 2_000,
        continuationCursorPos: 1,
        question: { kind: "record", edgeElapsed: edge },
        questionCursorPos: 0,
        questionCursorDisplayPos: 0,
      },
    };
    const yes = tick(onYes, A);
    const yesEdge = yes.postwin!.questionYesElapsed!;
    expect(yesEdge).toBe(edge + window - 1);
    const onB = expectBLikeA(
      yes,
      (b, a) => b.postwin!.recordedMessageDismissElapsed === null && a.postwin!.recordedMessageDismissElapsed !== null,
      postwinOf,
    );
    // (stored one tick back, the canonical-edge convention of acceptPostwinRecordedMessageDismiss)
    expect(onB.postwin!.recordedMessageDismissElapsed).toBe(yesEdge + POSTWIN_RECORDED_INPUT_READY_DELAY - 1);
  });
});

describe("lbb1: the rooms' boxes take B on the frame A is taken", () => {
  it("the first battle's 'Right this way, please!' and the opponent's intro (canonical route)", () => {
    const room = { ...createInitialState({ appRoute: "canonical-recorded" }), prebattleRoom: { phase: "idle" as const, elapsed: 0 } };
    expect(tick(room, B).prebattleRoom).toEqual({ phase: "messageClosing", elapsed: 0 });
    expect(tick(room, B).prebattleRoom).toEqual(tick(room, A).prebattleRoom);
    const intro: EngineState = { ...createInitialState({ appRoute: "canonical-recorded" }), battleRoom: { phase: "msgboxIdle", elapsed: 0 } };
    expect(tick(intro, B).battleRoom).toEqual({ phase: "msgboxClosing", elapsed: 0 });
    // Not before the box takes input (as A).
    const entering: EngineState = { ...createInitialState({ appRoute: "canonical-recorded" }), battleRoom: { phase: "entering", elapsed: 0 } };
    expect(tick(entering, B).battleRoom).toEqual({ phase: "entering", elapsed: 1 });
  });

  it("the PreBattleRoom briefing after the Lobby: every page and message takes B at its A gate, a `\\p` page with SE_SELECT", () => {
    const base = createInitialState({ battleScene: "off", presentationSeed: 0xabc });
    const lobby: EngineState = {
      ...base,
      lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
      rngValue: 0x12345678,
      rngMode: "vblank",
      factoryCarry: createInitialFactoryCarry(base.factoryCarry.playerTrainerId),
    };
    let s = driveAttendantConversation(tick(lobby, A)).state;
    expect(s.prebattleEntry).not.toBeNull();
    const position = (t: EngineState) => t.prebattleEntry && t.prebattleEntry.messages !== null
      ? `${t.prebattleEntry.message}:${t.prebattleEntry.page}:${t.prebattleEntry.phase}` : null;
    let boxes = 0;
    while (s.prebattleEntry !== null && s.prebattleEntry.phase !== "closing" && boxes < 12) {
      if (s.prebattleEntry.phase !== "talk") { s = tick(s, NONE); continue; }
      const page = s.prebattleEntry.messages![s.prebattleEntry.message]![s.prebattleEntry.page]!;
      const onB = expectBLikeA(s, (b, a) => position(a) !== position(b) && b.prebattleEntry!.prev === null && b.prebattleEntry!.textAge >= 0,
        (t) => t.prebattleEntry);
      const { ready } = untilAccepts(s, (b, a) => position(a) !== position(b) && b.prebattleEntry!.prev === null && b.prebattleEntry!.textAge >= 0);
      const { events } = collectSoundTick(ready.frame + 1, () => tick(ready, B));
      expect(events.filter((e) => e.kind === "se" && e.id === SE_SELECT)).toHaveLength(page.end === "p" ? 1 : 0);
      s = onB;
      boxes += 1;
    }
    expect(boxes).toBeGreaterThanOrEqual(4);
    expect(s.prebattleEntry!.phase).toBe("closing");
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------
// A live round (the production tick path): the soak driver's strong-route player wins battle 1, then the postwin is pressed through
// with B on the heal message, RECORD -> B, GO ON, the scouting pages, B (NO) on the swap offer, "Right this way", and B on the next
// opponent's intro, each on the tick A would be taken.

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

class Captured extends Error {}

function firstPostwin(rngValue: number): EngineState {
  const playerRentalRecords = [strongRouteRecord(664), strongRouteRecord(678), strongRouteRecord(527)] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: `lbb1-${rngValue}`,
      rngValue,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [...playerRentalRecords, strongRouteRecord(1), strongRouteRecord(2), strongRouteRecord(3)],
      },
    }),
  );
  let captured: EngineState | null = null;
  const observer = {
    beginSeed: () => {},
    recordPlayerFightCommit: () => {},
    observe: (state: EngineState) => {
      if (captured === null && state.postwin !== null && state.factoryRoundBattleOrchestrator?.round.rules.phase === "presentingBattleWin") {
        captured = state;
        throw new Captured();
      }
    },
  } as unknown as SoakCoverageCollector;
  const result = runSeed(rngValue, {
    testPolicy: "strong-route",
    policy: "winning",
    stateFactory: () => ({
      ...createInitialState(),
      factoryRoundBattleOrchestrator: orchestrator,
      rngMode: "frontierBattle",
      rngValue: orchestrator.round.rules.rngValue,
    }),
    maxFrames: 30_000,
    renderEvery: 0,
    coverage: observer,
  });
  if (captured === null) throw new Error(`no postwin reached: ${result.outcome} ${result.errorMessage ?? ""}`);
  return captured;
}

function press(state: EngineState, keys: ReadonlySet<GbaButton>, until: (s: EngineState) => boolean, limit = 3000): EngineState {
  let s = state;
  for (let i = 0; i < limit && !until(s); i += 1) s = tick(s, i % 2 === 0 ? keys : NONE);
  if (!until(s)) throw new Error("not reached");
  return s;
}

describe("lbb1: a live round's postwin and next room take B", () => {
  it("heal, RECORD -> B, swap offer B, the next opponent's intro on B: each on A's tick, and battle 2 starts", () => {
    let s = firstPostwin(1);
    const pw = (t: EngineState): PostwinState => t.postwin!;
    s = expectBLikeA(s, (b, a) => pw(b).healDismissElapsed === null && pw(a).healDismissElapsed !== null, postwinOf);
    // The GO ON menu: DOWN to RECORD, A.
    s = press(s, NONE, (t) => pw(t).continuationCursorPos !== null && postwinContinuationInputReady(advancePostwin(pw(t))));
    s = tick(s, DOWN);
    expect(pw(s).continuationCursorPos).toBe(1);
    s = press(tick(s, NONE), A, (t) => pw(t).question !== null);
    // B on the question (NO), on A's tick.
    s = expectBLikeA(s, (b, a) => pw(b).questionDismissElapsed === null && pw(a).questionDismissElapsed !== null, postwinOf);
    // The menu asked again, on GO ON: A; the scouting pages; B on the swap offer (NO); "Right this way" A.
    s = press(s, A, (t) => t.postwin !== null && pw(t).dialoguePage === 4 && pw(t).swapCursorPos !== null);
    s = press(s, B, (t) => pw(t).swapDeclineElapsed !== null);
    s = press(s, A, (t) => t.postwin === null || pw(t).rightThisWayDismissElapsed !== null);
    // The next opponent's intro box.
    s = press(s, NONE, (t) => t.battleRoom !== null && t.battleRoom.phase === "msgboxIdle", 4000);
    s = expectBLikeA(s, (b, a) => b.battleRoom?.phase === "msgboxIdle" && a.battleRoom?.phase === "msgboxClosing", (t) => t.battleRoom);
    s = press(s, NONE, (t) => t.factoryRoundBattleOrchestrator?.battleStartIntro != null, 4000);
    expect(s.factoryRoundBattleOrchestrator!.round.rules.battleIndex).toBe(1);
  }, 60_000);
});
