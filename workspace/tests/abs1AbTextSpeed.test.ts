// abs1 (docs/abs1-ab-text-speedup.md): holding or pressing A / B while text prints does not speed any surface at the oracle save's FAST text
// speed (text.c AddTextPrinter's `--textSpeed` leaves 0 for FAST, so RenderText never reaches the `delayCounter && textSpeed` branch that reads
// canABSpeedUpPrint), and the page waits / message ends take a press only from their ROM frames.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceBattleRoom,
  battleRoomQuoteInputReady,
  INITIAL_BATTLE_2_ROOM_STATE,
  JENSON_MSGBOX_ACCEPT_ELAPSED,
  MSGBOX_ACCEPT_ELAPSED,
  MSGBOX_PRINT_COMPLETE_ELAPSED,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import {
  advanceFactoryLobbyAttendant,
  ATTENDANT_SCREENS,
  attendantAcceptsInput,
  attendantLastGlyphAge,
  createFactoryLobbyAttendantState,
  type AttendantInput,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";
import { createInitialState, tick } from "../src/engine/core.ts";

const NONE: AttendantInput = { a: false, b: false, up: false, down: false };
const A: AttendantInput = { ...NONE, a: true };
const B: AttendantInput = { ...NONE, b: true };

type Burst = readonly [first: number, last: number, frames: number];
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/abs1-text-bursts.json", import.meta.url), "utf8")) as {
  traces: Record<string, { oracle: Burst[]; app: Burst[]; matched: string }>;
};

describe("abs1: the ROM does not speed any measured surface up on A (oracle bursts, hold-A vs mash-A)", () => {
  const pairs: readonly (readonly [string, string])[] = [
    ["abs1-room-intro-hold-a-on", "abs1-room-intro-mash-a-on"],
    ["abs1-lobby-hold-a-off", "abs1-lobby-mash-a-off"],
    ["abs1-tackle-hold-a-on", "abs1-tackle-mash-a-on"],
    ["abs1-tackle-hold-a-off", "abs1-tackle-mash-a-off"],
    ["abs1-faint-hold-a-off", "abs1-faint-mash-a-off"],
  ];
  // Later bursts differ by design: a mashed A takes each page wait / message end the moment it opens, a held one only the first.
  it.each(pairs)("%s and %s have the same ROM first text burst (first and last glyph frame)", (hold, mash) => {
    expect(fixture.traces[hold]!.oracle.length).toBeGreaterThan(0);
    const [holdFirst, mashFirst] = [fixture.traces[hold]!.oracle[0]!, fixture.traces[mash]!.oracle[0]!];
    expect(mashFirst[0]).toBe(holdFirst[0]);
    // The Lobby's first burst runs through the page turns, so only its first glyph frame is the same; every other first burst is one page.
    if (!hold.includes("lobby")) expect(mashFirst).toEqual(holdFirst);
  });

  it("the first opponent's box prints frames 718..738 on the ROM with A held the whole time", () => {
    expect(fixture.traces["abs1-room-intro-hold-a-on"]!.oracle[0]).toEqual([718, 738, 18]);
  });

  it.each([
    "abs1-room-intro-hold-a-on",
    "abs1-lobby-hold-a-off",
    "abs1-lobby-mash-a-off",
    "abs1-tackle-hold-a-on",
    "abs1-tackle-hold-a-off",
    "abs1-tackle-mash-a-on",
    "abs1-tackle-mash-a-off",
  ])("%s: the engine's text bursts are the ROM's", (name) => {
    expect(fixture.traces[name]!.app).toEqual(fixture.traces[name]!.oracle);
  });
});

describe("abs1: the engine prints at its own speed whatever is held", () => {
  it("Battle Room opponent box: holding A through the print window leaves the print length and the idle phase unchanged", () => {
    let held = { phase: "entering", elapsed: 0 } as BattleRoomState;
    let free = held;
    for (let i = 0; i < MSGBOX_PRINT_COMPLETE_ELAPSED + 2; i += 1) {
      held = tick({ ...createInitialState({ appRoute: "canonical-recorded" }), battleRoom: held }, new Set(["A"])).battleRoom!;
      free = advanceBattleRoom(free);
      expect(held).toEqual(free);
    }
    expect(free).toEqual({ phase: "msgboxIdle", elapsed: 2 });
  });

  it("Battle Room opponent box: the first A / B is taken three frames after the last character (second battle: two)", () => {
    expect(MSGBOX_ACCEPT_ELAPSED).toBe(3);
    expect(JENSON_MSGBOX_ACCEPT_ELAPSED).toBe(2);
    for (const [base, gate] of [[{ phase: "msgboxIdle", elapsed: 0 }, 3], [INITIAL_BATTLE_2_ROOM_STATE, 2]] as const) {
      for (let elapsed = 0; elapsed < 6; elapsed += 1) {
        expect(battleRoomQuoteInputReady({ ...base, phase: "msgboxIdle", elapsed } as BattleRoomState)).toBe(elapsed >= gate);
      }
    }
  });

  it("Lobby attendant: A / B held every frame never skips a page's typing; a `\\p` / `\\l` wait opens on the last glyph's frame, a message end two frames after", () => {
    for (const input of [A, B]) {
      let s: FactoryLobbyAttendantState = createFactoryLobbyAttendantState(0);
      for (let i = 0; i < 2000 && !attendantAcceptsInput(s); i += 1) s = advanceFactoryLobbyAttendant(s, input);
      expect(s.screen).toBe("welcome");
      expect(s.page).toBe(0);
      const typed = attendantLastGlyphAge("welcome", 0);
      const end = ATTENDANT_SCREENS.welcome.pages[0]!.end;
      expect(s.age).toBe(end === "end" ? typed + 2 : typed);
    }
    // The gate, page by page of every non-menu screen, from its own page age.
    for (const [screen, def] of Object.entries(ATTENDANT_SCREENS)) {
      if (def.menu !== null || def.autoHold !== null || screen === "saved") continue;
      def.pages.forEach((page, index) => {
        const typed = attendantLastGlyphAge(screen as keyof typeof ATTENDANT_SCREENS, index);
        const open = page.end === "end" ? typed + 2 : typed;
        const base = { ...createFactoryLobbyAttendantState(0), screen, page: index, lead: null } as unknown as FactoryLobbyAttendantState;
        expect(attendantAcceptsInput({ ...base, age: open - 1 })).toBe(false);
        expect(attendantAcceptsInput({ ...base, age: open })).toBe(true);
      });
    }
  });
});
