import { describe, expect, it } from "vitest";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import {
  ATTENDANT_MENU_ITEMS,
  ATTENDANT_SCREENS,
  ATTENDANT_TIMING,
  advanceFactoryLobbyAttendant,
  attendantAcceptsInput,
  createFactoryLobbyAttendantState,
  type AttendantInput,
  type AttendantScreenId,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";
import { createFactoryLobbyFreeRoamState, isFactoryLobbyFacingSinglesAttendant } from "../src/engine/factoryLobbyFreeRoam.ts";
import { frameHash } from "../tools/browser/goalPlay.ts";
import type { GbaButton } from "../src/input.ts";
import { driveAttendantConversation, driveBriefing } from "./helpers/lobbyAttendant.ts";

const NONE: AttendantInput = { a: false, b: false, up: false, down: false };
const A: AttendantInput = { ...NONE, a: true };
const B: AttendantInput = { ...NONE, b: true };
const DOWN: AttendantInput = { ...NONE, down: true };

function idleUntilReady(state: FactoryLobbyAttendantState, limit = 3000): FactoryLobbyAttendantState {
  let s = state;
  for (let i = 0; i < limit && s.done === null; i += 1) {
    if (attendantAcceptsInput(s)) return s;
    s = advanceFactoryLobbyAttendant(s, NONE);
  }
  return s;
}

/** Press one input on a ready conversation, then idle until it takes input again (or ends). */
function press(state: FactoryLobbyAttendantState, input: AttendantInput): FactoryLobbyAttendantState {
  return idleUntilReady(advanceFactoryLobbyAttendant(idleUntilReady(state), input));
}

function finish(state: FactoryLobbyAttendantState): FactoryLobbyAttendantState {
  let s = state;
  for (let i = 0; i < 3000 && s.done === null; i += 1) s = advanceFactoryLobbyAttendant(s, NONE);
  return s;
}

const open = (): FactoryLobbyAttendantState => idleUntilReady(createFactoryLobbyAttendantState(0));

/** Walk the welcome text (3 `\p`/end pages) to the CHALLENGE / INFO / EXIT menu. */
function atMenu(): FactoryLobbyAttendantState {
  let s = open();
  expect(s.screen).toBe("welcome");
  while (s.screen === "welcome") s = press(s, A);
  return s;
}

describe("lbrb: the attendant conversation", () => {
  it("welcome text, then the CHALLENGE / INFO / EXIT menu", () => {
    const s = atMenu();
    expect(s.screen).toBe("ask");
    expect(ATTENDANT_MENU_ITEMS.challenge).toEqual(["CHALLENGE", "INFO", "EXIT"]);
    expect(ATTENDANT_SCREENS.ask.menu).toBe("challenge");
    expect(s.cursor).toBe(0);
  });

  it("EXIT and B give the farewell, then return to free roam", () => {
    for (const choose of [
      (s: FactoryLobbyAttendantState) => press(press(press(s, DOWN), DOWN), A),
      (s: FactoryLobbyAttendantState) => press(s, B),
    ]) {
      const s = choose(atMenu());
      expect(s.screen).toBe("farewell");
      expect(ATTENDANT_SCREENS.farewell.pages[0]!.lines).toEqual(["We look forward to your next visit."]);
      expect(finish(press(s, A)).done).toBe("freeRoam");
    }
  });

  it("INFO shows the info pages, then returns to the menu", () => {
    let s = press(press(atMenu(), DOWN), A);
    expect(s.screen).toBe("explain");
    expect(s.page).toBe(0);
    expect(ATTENDANT_SCREENS.explain.pages[0]!.lines).toEqual(["The Battle Swap Single Tournament", "is a SINGLE BATTLE competition using"]);
    const seen = new Set<number>();
    while (s.screen === "explain") {
      seen.add(s.page);
      s = press(s, A);
    }
    expect(seen.size).toBe(ATTENDANT_SCREENS.explain.pages.length);
    expect(s.screen).toBe("ask");
    expect(s.done).toBeNull();
  });

  it("CHALLENGE gives Level 50 / Open Level; Open Level is unselectable, B and EXIT give the farewell", () => {
    const level = press(atMenu(), A);
    expect(level.screen).toBe("level");
    expect(ATTENDANT_MENU_ITEMS.level).toEqual(["LV. 50", "OPEN LEVEL", "EXIT"]);
    const openLevel = press(press(level, DOWN), A);
    expect(openLevel.screen).toBe("level");
    expect(openLevel.cursor).toBe(1);
    expect(press(level, B).screen).toBe("farewell");
    expect(press(press(press(level, DOWN), DOWN), A).screen).toBe("farewell");
  });

  it("Level 50 asks to save; NO / B at any YES-NO give the farewell and return to free roam", () => {
    const save = press(press(atMenu(), A), A);
    expect(save.screen).toBe("saveQuestion");
    expect(ATTENDANT_SCREENS.saveQuestion.pages[0]!.lines).toEqual([
      "Before you begin your challenge,",
      "I need to save the game. Is that okay?",
    ]);
    const no = (s: FactoryLobbyAttendantState): FactoryLobbyAttendantState => press(press(s, DOWN), A);
    expect(no(save).screen).toBe("farewell");
    expect(press(save, B).screen).toBe("farewell");
    const dialog = press(save, A);
    expect(dialog.screen).toBe("saveInfo");
    expect(no(dialog).screen).toBe("farewell");
    const overwrite = press(dialog, A);
    expect(overwrite.screen).toBe("overwrite");
    expect(no(overwrite).screen).toBe("farewell");
    expect(finish(press(press(overwrite, B), A)).done).toBe("freeRoam");
  });

  it("YES runs the save dialog, then 'Please step this way.', the door walk and the draft handoff", () => {
    const screens: AttendantScreenId[] = [];
    let s = atMenu();
    let sawWalk = false;
    let sawFade = false;
    for (let i = 0; i < 6000 && s.done === null; i += 1) {
      if (screens[screens.length - 1] !== s.screen) screens.push(s.screen);
      if (s.phase === "walk") sawWalk = true;
      if (s.phase === "fade") sawFade = true;
      s = advanceFactoryLobbyAttendant(s, attendantAcceptsInput(s) && i % 3 === 0 ? A : NONE);
    }
    expect(screens).toEqual(["ask", "level", "saveQuestion", "saveInfo", "overwrite", "saving", "saved", "step"]);
    expect(sawWalk && sawFade).toBe(true);
    expect(s.done).toBe("draft");
  });

  it("the door walk is 64 frames at 1 px per frame, then the fade", () => {
    expect(ATTENDANT_TIMING.walkFrames).toBe(64);
    expect(ATTENDANT_TIMING.fadeFrames).toBeGreaterThan(0);
  });
});

describe("lbrb: the engine", () => {
  function lobby(): EngineState {
    return {
      ...createInitialState({ battleScene: "off", presentationSeed: 0xabc }),
      lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
      rngValue: 0x12345678,
      rngMode: "vblank",
    };
  }

  it("A at the attendant opens the conversation instead of dealing; the Lobby RNG keeps running", () => {
    const before = lobby();
    expect(isFactoryLobbyFacingSinglesAttendant(before.lobbyFreeRoam!)).toBe(true);
    let s = tick(before, new Set<GbaButton>(["A"]));
    expect(s.lobbyAttendant).not.toBeNull();
    expect(s.pendingGeneratedRound ?? null).toBeNull();
    const seen = new Set<unknown>([s.rngValue]);
    for (let i = 0; i < 30; i += 1) {
      s = tick(s, new Set<GbaButton>());
      seen.add(s.rngValue);
    }
    expect(seen.size).toBe(31);
    expect(s.rngMode).toBe("vblank");
    expect(s.lobbyAttendant).not.toBeNull();
    expect(render(s).length).toBe(240 * 160 * 4);
  });

  it("each conversation stage renders a distinct frame", () => {
    let s = tick(lobby(), new Set<GbaButton>(["A"]));
    const hashes = new Set<number>();
    for (let i = 0; i < 120; i += 1) {
      s = tick(s, new Set<GbaButton>());
      hashes.add(frameHash(render(s)));
    }
    expect(hashes.size).toBeGreaterThan(40);
  });

  it("consumer path: tapping A through the conversation ends in a draft from the live cursor", () => {
    const opened = tick(lobby(), new Set<GbaButton>(["A"]));
    const drive = driveAttendantConversation(opened);
    expect(drive.state.lobbyAttendant).toBeNull();
    expect(drive.state.prebattleEntry).not.toBeNull();
    expect(drive.frames).toBeGreaterThan(300);
    expect(driveBriefing(drive.state).state.pendingGeneratedRound).not.toBeNull();
  });

  it("B at the menu through the engine gives the farewell and returns to free roam without dealing", () => {
    let s = tick(lobby(), new Set<GbaButton>(["A"]));
    const tap = (button: GbaButton): void => {
      for (let i = 0; i < 2; i += 1) s = tick(s, new Set<GbaButton>([button]));
      for (let i = 0; i < 8; i += 1) s = tick(s, new Set<GbaButton>());
    };
    for (let i = 0; i < 400 && s.lobbyAttendant!.screen !== "ask"; i += 1) tap("A");
    expect(s.lobbyAttendant?.screen).toBe("ask");
    for (let i = 0; i < 60; i += 1) s = tick(s, new Set<GbaButton>());
    tap("B");
    expect(s.lobbyAttendant?.screen).toBe("farewell");
    for (let i = 0; i < 60; i += 1) s = tick(s, new Set<GbaButton>());
    tap("A");
    for (let i = 0; i < 20; i += 1) s = tick(s, new Set<GbaButton>());
    expect(s.lobbyAttendant).toBeNull();
    expect(s.lobbyFreeRoam).not.toBeNull();
    expect(s.pendingGeneratedRound ?? null).toBeNull();
  });
});
