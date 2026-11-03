// aud240c: the battle party menus' sounds (cursor, A / B, action window, SE_FAILURE on the forced menu, refusal dismiss,
// SUMMARY entry) reproduce the ROM's sound events frame for frame. The fixtures are committed oracle output of
// tools/audio/soundEventProbe.py (stepping mode) with the key script embedded; this test needs no emulator.
// See docs/aud240c-party-menu-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  PARTY_SELECT_OPEN_TOTAL_FRAMES,
  advanceBattlePartySelect,
  createBattlePartySelectState,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import {
  INITIAL_PARTY_SELECT_STATE,
  PARTY_LIST_INPUT_ELAPSED,
  advancePartySelect,
} from "../src/engine/partySelect.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import type { GbaButton } from "../src/input.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  mode?: string | number;
  volume?: number;
  priority?: number;
}
interface Fixture {
  from: number;
  frames: number;
  profile: string;
  events: FixtureEvent[];
  trace: { route: "default" | "canonical-recorded" | "lab"; battleScene?: "on" | "off"; segments: Array<{ frames: number; buttons?: string[] }> };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

const CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2", "GROWL_1", "GROWL_2", "WEAK", "WEAK_DOUBLES"];
const key = (e: FixtureEvent) => ({
  frame: e.frame,
  kind: e.kind,
  id: e.id,
  pan: e.pan,
  mode: typeof e.mode === "number" ? CRY_MODES[e.mode] : e.mode,
  volume: e.volume,
  priority: e.priority,
});

function replayTick(rom: Fixture, collecting: boolean) {
  let state = createInitialState({ appRoute: "canonical-recorded", battleScene: rom.trace.battleScene });
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (collecting) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      if (advance.frame > rom.from) events.push(...result.events);
    } else {
      state = tick(state, advance.buttons);
    }
    expect(state.frame).toBe(advance.frame);
  }
  return { state, events: events.filter((e) => e.frame <= rom.from + rom.frames) };
}

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1 };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

// A live voluntary selector: slot 0 is the active battler (refusal on A), slots 1 and 2 are legal.
function liveSelector(): BattlePartySelectState {
  const records = [record(664), record(678), record(527)] as const;
  let carrier = createFactoryRoundBattleOrchestrator({
    id: "aud240c-party-sounds",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x12345678,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: records,
      savedRentalRecords: [...records, record(1), record(2), record(3)],
    },
  });
  const commandId = carrier.round.presentation!.command.commandId;
  carrier = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(carrier, { commandId }));
  const battle = carrier.battle!;
  if (battle.boundary.kind !== "decision-required" || battle.boundary.request.kind !== "command") {
    throw new Error("expected live player command");
  }
  return createBattlePartySelectState(battle.boundary.request, battle.rules.rulesContext, undefined, records);
}

function settled(state: BattlePartySelectState): BattlePartySelectState {
  let next = state;
  while (next.openElapsed < PARTY_SELECT_OPEN_TOTAL_FRAMES) next = advanceBattlePartySelect(next, new Set<GbaButton>());
  return next;
}

function press(state: BattlePartySelectState, ...buttons: GbaButton[]) {
  const result = collectSoundTick(1, () => advanceBattlePartySelect(state, new Set(buttons)));
  return { state: result.result, sounds: result.events.map((e) => [e.kind, e.id, e.pan]) };
}

const SE_SELECT = ["se", 5, null];
const SE_FAILURE = ["se", 32, null];

describe("battle party menu sounds match the ROM (aud240c)", () => {
  it("party-forced-window.json: every event of the forced SEND_OUT menu window", () => {
    const rom = fixture("party-forced-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(rom.events.filter((e) => e.id === 32).length).toBeGreaterThanOrEqual(2);
    expect(replayTick(rom, true).events.map(key)).toEqual(rom.events.map(key));
  });

  it("party-summary-entry-window.json: the SUMMARY entry has one SE, then only the summary's own sounds", () => {
    const rom = fixture("party-summary-entry-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(replayTick(rom, true).events.map(key)).toEqual(rom.events.map(key));
  });

  it("party-voluntary-window.json: every event of the voluntary menu window", () => {
    const rom = fixture("party-voluntary-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(rom.trace.route).toBe("lab");
    // The window opens at the A that opens the menu (frame `from`); input from the next frame on.
    let state = liveSelector();
    const events: SoundEvent[] = [];
    for (const advance of traceAdvances(rom.trace.segments)) {
      if (advance.frame <= rom.from) continue;
      const result = collectSoundTick(advance.frame, () => advanceBattlePartySelect(state, advance.buttons));
      state = result.result;
      events.push(...result.events);
    }
    expect(events.filter((e) => e.frame <= rom.from + rom.frames).map(key)).toEqual(rom.events.map(key));
  });

  it("every window covers the double-SE B and, on the forced menu, SE_FAILURE", () => {
    const doubled = (name: string) => {
      const frames = fixture(name).events.map((e) => e.frame);
      return frames.filter((f, i) => frames.indexOf(f) !== i).length;
    };
    expect(doubled("party-voluntary-window")).toBe(1);
    expect(doubled("party-forced-window")).toBeGreaterThanOrEqual(1);
  });

  it("sound collection never changes engine state", () => {
    for (const name of ["party-forced-window", "party-summary-entry-window"]) {
      const rom = fixture(name);
      expect(JSON.stringify(replayTick(rom, true).state)).toBe(JSON.stringify(replayTick(rom, false).state));
    }
    const plain = (() => {
      let s = settled(liveSelector());
      for (const b of ["DOWN", "A", "DOWN", "UP", "B", "B"] as const) s = advanceBattlePartySelect(s, new Set([b]));
      return s;
    })();
    const sounded = (() => {
      let s = settled(liveSelector());
      for (const b of ["DOWN", "A", "DOWN", "UP", "B", "B"] as const) s = press(s, b).state;
      return s;
    })();
    expect(JSON.stringify(sounded)).toBe(JSON.stringify(plain));
  });
});

describe("voluntary party menu branches", () => {
  it("row cursor: SE when the cursor moves, silence when LEFT has nowhere to go", () => {
    const s = settled(liveSelector());
    const left = press(s, "LEFT");
    expect(left.state.cursor).toBe(s.cursor);
    expect(left.sounds).toEqual([]);
    const down = press(s, "DOWN");
    expect(down.state.cursor).not.toBe(s.cursor);
    expect(down.sounds).toEqual([SE_SELECT]);
  });

  it("A on a mon opens the action window with one SE; its cursor is silent at the ends (NoWrap)", () => {
    let s = settled(liveSelector());
    s = press(s, "DOWN").state;
    const open = press(s, "A");
    expect(open.sounds).toEqual([SE_SELECT]);
    expect(open.state.submenuOpen).toBe(true);
    s = open.state;
    for (let i = 0; i < 3; i += 1) s = advanceBattlePartySelect(s, new Set<GbaButton>());
    const up = press(s, "UP");
    expect(up.state.actionCursor).toBe(s.actionCursor);
    expect(up.sounds).toEqual(s.actionCursor === 0 ? [] : [SE_SELECT]);
  });

  it("B in the action window plays two SEs (PlaySE + PlaySE) and closes it", () => {
    let s = settled(liveSelector());
    s = press(s, "DOWN").state;
    s = press(s, "A").state;
    for (let i = 0; i < 20; i += 1) s = advanceBattlePartySelect(s, new Set<GbaButton>());
    const b = press(s, "B");
    expect(b.sounds).toEqual([SE_SELECT, SE_SELECT]);
  });

  it("input before the open fade completes is silent (the ROM ignores it)", () => {
    const s = liveSelector();
    expect(s.openElapsed).toBeLessThan(PARTY_SELECT_OPEN_TOTAL_FRAMES);
    expect(press(s, "DOWN").sounds).toEqual([]);
    expect(press(s, "A").sounds).toEqual([]);
    expect(press(s, "B").sounds).toEqual([]);
  });

  it("B on the voluntary list is one SE_SELECT and cancels", () => {
    const s = settled(liveSelector());
    const b = press(s, "B");
    expect(b.sounds).toEqual([SE_SELECT]);
    expect(b.state.outcome).toEqual({ kind: "cancel" });
  });
});

describe("forced party menu branches", () => {
  const forcedPress = (state: typeof INITIAL_PARTY_SELECT_STATE, ...buttons: GbaButton[]) => {
    const result = collectSoundTick(1, () => advancePartySelect(state, new Set(buttons)));
    return { state: result.result, sounds: result.events.map((e) => [e.kind, e.id, e.pan]) };
  };
  const ready = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED };

  it("B and A on CANCEL play SE_FAILURE and leave the menu open", () => {
    const b = forcedPress(ready, "B");
    expect(b.sounds).toEqual([SE_FAILURE]);
    expect(b.state.sendOutElapsed).toBeNull();
    const onCancel = { ...ready, cursor: "cancel" as const };
    const a = forcedPress(onCancel, "A");
    expect(a.sounds).toEqual([SE_FAILURE]);
    expect(a.state.sendOutElapsed).toBeNull();
    expect(a.state.submenuOpen).toBe(false);
  });

  it("DOWN moves with one SE_SELECT; A on a mon opens the action window with one SE_SELECT", () => {
    const down = forcedPress(ready, "DOWN");
    expect(down.state.cursor).toBe(1);
    expect(down.sounds).toEqual([SE_SELECT]);
    const open = forcedPress(down.state, "A");
    expect(open.state.submenuOpen).toBe(true);
    expect(open.sounds).toEqual([SE_SELECT]);
  });

  it("B in the action window plays two SE_SELECTs; A on a row plays one", () => {
    const open = forcedPress(forcedPress(ready, "DOWN").state, "A").state;
    expect(forcedPress(open, "B").sounds).toEqual([SE_SELECT, SE_SELECT]);
  });

  it("input before the list is ready is silent", () => {
    const early = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 2 };
    expect(forcedPress(early, "DOWN").sounds).toEqual([]);
    expect(forcedPress(early, "B").sounds).toEqual([]);
  });
});
