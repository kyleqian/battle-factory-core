// lbw9: the Lobby attendant's save wait and menu rules (start_menu.c SaveSuccessCallback / SaveSuccesTimer, script_menu.c InitMultichoiceCheckWrap,
// menu.c Menu_ProcessInputNoWrap). Compare traces: tools/compare/traces/lbw9-*-off.json. Doc: docs/lbw9-lobby-save-wait.md.
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import {
  ATTENDANT_MENU_ITEMS,
  ATTENDANT_SAVED_SE_IDLE_AGE,
  ATTENDANT_TIMING,
  advanceFactoryLobbyAttendant,
  attendantAcceptsInput,
  attendantMenuWraps,
  attendantSavedMessageEnds,
  createFactoryLobbyAttendantState,
  type AttendantInput,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";
import { emitLobbyAttendantSounds } from "../src/engine/lobbySounds.ts";

const NONE: AttendantInput = { a: false, b: false, up: false, down: false };
const A: AttendantInput = { ...NONE, a: true, aHeld: true };
const HELD: AttendantInput = { ...NONE, aHeld: true };
const UP: AttendantInput = { ...NONE, up: true };
const DOWN: AttendantInput = { ...NONE, down: true };

function idleUntilReady(state: FactoryLobbyAttendantState): FactoryLobbyAttendantState {
  let s = state;
  for (let i = 0; i < 3000 && s.done === null && !attendantAcceptsInput(s); i += 1) s = advanceFactoryLobbyAttendant(s, NONE);
  return s;
}

/** Press one input on a ready conversation, then idle until it takes input again. */
function press(state: FactoryLobbyAttendantState, input: AttendantInput): FactoryLobbyAttendantState {
  return idleUntilReady(advanceFactoryLobbyAttendant(idleUntilReady(state), input));
}

/** A cursor-moving press, then one idle tick so the one-frame-late cursor has drawn. */
function move(state: FactoryLobbyAttendantState, input: AttendantInput): FactoryLobbyAttendantState {
  return advanceFactoryLobbyAttendant(advanceFactoryLobbyAttendant(idleUntilReady(state), input), NONE);
}

function toScreen(screen: FactoryLobbyAttendantState["screen"]): FactoryLobbyAttendantState {
  let s = idleUntilReady(createFactoryLobbyAttendantState(0));
  for (let i = 0; i < 200 && s.screen !== screen; i += 1) s = press(s, A);
  expect(s.screen).toBe(screen);
  return s;
}

/** The conversation on the tick the "saved" screen's first glyph draws (age 0). */
function savedStart(): FactoryLobbyAttendantState {
  let s = toScreen("saveQuestion");
  s = press(s, A); // saveInfo
  s = press(s, A); // overwrite
  s = advanceFactoryLobbyAttendant(idleUntilReady(s), A); // YES: saving
  for (let i = 0; i < 2000 && !(s.screen === "saved" && s.lead === null && s.age === 0); i += 1) s = advanceFactoryLobbyAttendant(s, NONE);
  expect(s.screen).toBe("saved");
  return s;
}

/** Advance with `input(age before the tick)` until the conversation leaves "saved"; endAge is the age the ending tick reaches. */
function runSaved(input: (age: number) => AttendantInput): { endAge: number; next: FactoryLobbyAttendantState } {
  let s = savedStart();
  for (let i = 0; i < 400; i += 1) {
    const age = s.age;
    const next = advanceFactoryLobbyAttendant(s, input(age));
    if (next.screen !== "saved") return { endAge: age + 1, next };
    s = next;
  }
  throw new Error("the saved screen never ended");
}

describe("lbw9: the save message waits for a timer, or a held A, not for a new press", () => {
  it("the rule: nothing before the SE idles (age 65); then a held A, or 60 frames, ends it", () => {
    expect(ATTENDANT_TIMING.saveSeAge).toBe(15);
    expect(ATTENDANT_TIMING.saveSeIdleDelay).toBe(50);
    expect(ATTENDANT_TIMING.saveSuccessTimer).toBe(60);
    expect(ATTENDANT_SAVED_SE_IDLE_AGE).toBe(65);
    expect(attendantSavedMessageEnds(64, true)).toBe(false);
    expect(attendantSavedMessageEnds(65, true)).toBe(true);
    expect(attendantSavedMessageEnds(65, false)).toBe(false);
    expect(attendantSavedMessageEnds(123, false)).toBe(false);
    expect(attendantSavedMessageEnds(124, false)).toBe(true);
  });

  it("no A: the message ends 60 frames after the SE (decided on age 124)", () => {
    expect(runSaved(() => NONE).endAge).toBe(124);
  });

  it("a held A skips the timer once the SE has ended, not before", () => {
    expect(runSaved(() => HELD).endAge).toBe(65);
    expect(runSaved((age) => (age >= 64 ? HELD : NONE)).endAge).toBe(65);
    expect(runSaved((age) => (age < 64 ? HELD : NONE)).endAge).toBe(124);
  });

  it("a new A press during the SE does nothing (it neither skips nor restarts the timer)", () => {
    expect(runSaved((age) => (age === 30 ? A : NONE)).endAge).toBe(124);
  });

  it("a tap after the SE (a new press is also held) skips the timer", () => {
    expect(runSaved((age) => (age === 79 ? A : NONE)).endAge).toBe(80);
  });

  it("the saved screen takes no input of its own any more", () => {
    expect(attendantAcceptsInput(savedStart())).toBe(false);
  });

  it("SE_SELECT plays only when a held A ends the message, not when the timer does", () => {
    function sounds(input: (age: number) => AttendantInput): string[] {
      let s = savedStart();
      const out: string[] = [];
      for (let i = 0; i < 400; i += 1) {
        const inp = input(s.age);
        const before = s;
        const r = collectSoundTick(i, () => {
          const next = advanceFactoryLobbyAttendant(before, inp);
          emitLobbyAttendantSounds(before, next, inp);
          return next;
        });
        for (const e of r.events) out.push(`${e.kind}:${e.id}`);
        s = r.result;
        if (s.screen !== "saved") break;
      }
      return out;
    }
    const timer = sounds(() => NONE);
    const held = sounds(() => HELD);
    expect(timer.filter((e) => e.startsWith("se:"))).toHaveLength(1); // SE_SAVE only
    expect(held.filter((e) => e.startsWith("se:"))).toHaveLength(2); // SE_SAVE, then SE_SELECT on the skip
    expect(held[held.length - 1]).not.toBe(timer[timer.length - 1]);
  });

  it("a state driven without aHeld falls back to the new-press flag", () => {
    const via = (input: AttendantInput) => {
      let s = savedStart();
      for (let i = 0; i < 400; i += 1) {
        s = advanceFactoryLobbyAttendant(s, i === 70 ? input : NONE);
        if (s.screen !== "saved") return i;
      }
      return -1;
    };
    expect(via({ ...NONE, a: true })).toBe(70);
  });
});

describe("lbw9: a multichoice wraps only above three entries, and moves only if the cursor moves", () => {
  it("InitMultichoiceCheckWrap: wrap needs more than 3 items", () => {
    expect(attendantMenuWraps(2)).toBe(false);
    expect(attendantMenuWraps(3)).toBe(false);
    expect(attendantMenuWraps(4)).toBe(true);
    expect(attendantMenuWraps(5)).toBe(true);
  });

  it("every Lobby menu is 3 or fewer items, so none wraps", () => {
    for (const items of Object.values(ATTENDANT_MENU_ITEMS)) expect(attendantMenuWraps(items.length)).toBe(false);
  });

  it("CHALLENGE / INFO / EXIT (3 items): Up on the first and Down on the last stay put", () => {
    let s = toScreen("ask");
    expect(s.cursor).toBe(0);
    s = move(s, UP);
    expect(s.cursor).toBe(0);
    s = move(move(s, DOWN), DOWN);
    expect(s.cursor).toBe(2);
    s = move(s, DOWN);
    expect(s.cursor).toBe(2);
    s = move(s, UP);
    expect(s.cursor).toBe(1);
  });

  it("LV. 50 / OPEN LEVEL / EXIT (3 items) stays put at both ends", () => {
    let s = toScreen("level");
    s = move(s, UP);
    expect(s.cursor).toBe(0);
    s = move(move(s, DOWN), DOWN);
    s = move(s, DOWN);
    expect(s.cursor).toBe(2);
  });

  it("YES / NO (2 items): Up on YES and Down on NO stay put", () => {
    for (const screen of ["saveQuestion", "overwrite"] as const) {
      let s = toScreen(screen);
      s = move(s, UP);
      expect(s.cursor).toBe(0);
      s = move(s, DOWN);
      expect(s.cursor).toBe(1);
      s = move(s, DOWN);
      expect(s.cursor).toBe(1);
    }
  });

  it("the cursor draws one frame after the press on every menu", () => {
    const s = idleUntilReady(toScreen("ask"));
    const pressed = advanceFactoryLobbyAttendant(s, DOWN);
    expect(pressed.cursor).toBe(0);
    expect(advanceFactoryLobbyAttendant(pressed, NONE).cursor).toBe(1);
  });

  it("A wins over a direction pressed on the same frame (A, B, UP, DOWN order)", () => {
    const s = idleUntilReady(toScreen("ask"));
    const both = advanceFactoryLobbyAttendant(s, { ...NONE, a: true, down: true });
    expect(both.screen).toBe("level");
    expect(both.pendingCursor).toBeUndefined();
    expect(both.cursor).toBe(0);
  });

  it("an edge press plays no SE; a press that moves the cursor plays one", () => {
    function plays(state: FactoryLobbyAttendantState, input: AttendantInput): number {
      const next = advanceFactoryLobbyAttendant(state, input);
      return collectSoundTick(0, () => {
        emitLobbyAttendantSounds(state, next, input);
        return next;
      }).events.filter((e) => e.kind === "se").length;
    }
    const s = idleUntilReady(toScreen("ask"));
    expect(plays(s, UP)).toBe(0);
    expect(plays(s, DOWN)).toBe(1);
    const last = press(press(s, DOWN), DOWN);
    expect(plays(last, DOWN)).toBe(0);
    expect(plays(last, UP)).toBe(1);
  });
});

describe("lbw9: the first input a menu accepts is the tick after it first draws (sProcessInputDelay is inside the text delay)", () => {
  it("a Down on the first tick the ask menu accepts input moves the cursor; one tick earlier it is ignored", () => {
    let prev = createFactoryLobbyAttendantState(0);
    let t = prev;
    for (let i = 0; i < 4000 && !(t.screen === "ask" && attendantAcceptsInput(t)); i += 1) {
      prev = t;
      t = advanceFactoryLobbyAttendant(t, attendantAcceptsInput(t) && i % 4 === 0 ? A : NONE);
    }
    expect(t.screen).toBe("ask");
    expect(attendantAcceptsInput(prev) && prev.screen === "ask").toBe(false);
    expect(advanceFactoryLobbyAttendant(prev, DOWN).pendingCursor).toBeUndefined();
    expect(advanceFactoryLobbyAttendant(t, DOWN).pendingCursor).toBe(1);
    expect(ATTENDANT_TIMING.menuInputDelay).toBe(0);
  });
});
