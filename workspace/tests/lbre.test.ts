// lbr-e: the PreBattleRoom walk and briefing between the Lobby door fade and the rental draft (docs/lbre-prebattle-briefing.md).
// ROM windows: tools/compare/traces/lbre-prebattle-{a,b,c}-off.json (255 / 255 each); this file pins the model and the deal.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { createFactoryLobbyFreeRoamState } from "../src/engine/factoryLobbyFreeRoam.ts";
import { createInitialFactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import {
  PREBATTLE_ENTRY_BOX_OPEN_AGE,
  PREBATTLE_ENTRY_DEAL_AGE,
  PREBATTLE_ENTRY_TIMING,
  PREBATTLE_ENTRY_WALK_END_AGE,
  PREBATTLE_ENTRY_WALK_START_AGE,
  buildBriefingMessages,
  briefingGlyphCount,
  prebattleEntryScene,
} from "../src/engine/prebattleEntry.ts";
import type { GbaButton } from "../src/input.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { frameHash } from "../tools/browser/goalPlay.ts";
import { driveAttendantConversation, driveBriefing } from "./helpers/lobbyAttendant.ts";

// appTrace.ts is outside the typechecked tests graph (tsconfig include), so load its stage registry untyped.
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: EngineState) => EngineState>;
};

const NONE = new Set<GbaButton>();
const A = new Set<GbaButton>(["A"]);

function lobbyState(scene: "on" | "off", streak = 0, rng = 0x12345678): EngineState {
  const base = createInitialState({ battleScene: scene, presentationSeed: 0xabc });
  const carry = createInitialFactoryCarry(base.factoryCarry.playerTrainerId);
  return {
    ...base,
    lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
    rngValue: rng,
    rngMode: "vblank",
    lobbyStreakKept: streak > 0,
    factoryCarry: Object.freeze({ ...carry, factoryWinStreak: streak, rentsCount: streak === 0 ? 0 : 3, battlePoints: 21 }),
  };
}

function enterEntry(scene: "on" | "off", streak = 0, rng = 0x12345678): EngineState {
  return driveAttendantConversation(tick(lobbyState(scene, streak, rng), A)).state;
}

describe("lbr-e: the PreBattleRoom entry timeline (ROM-measured)", () => {
  it("pins the ages: walk 23..103, deal on 104, briefing box on 106", () => {
    expect(PREBATTLE_ENTRY_WALK_START_AGE).toBe(23);
    expect(PREBATTLE_ENTRY_WALK_END_AGE).toBe(103);
    expect(PREBATTLE_ENTRY_DEAL_AGE).toBe(104);
    expect(PREBATTLE_ENTRY_BOX_OPEN_AGE).toBe(106);
    expect(PREBATTLE_ENTRY_TIMING.warpExtraRng).toEqual([
      { fadeTick: 27, extra: 2 },
      { fadeTick: 28, extra: 3 },
    ]);
  });

  it("the camera scrolls one pixel per tick for 80 ticks and the NPCs stop on their standing poses", () => {
    expect(prebattleEntryScene(0).originY).toBe(136);
    expect(prebattleEntryScene(PREBATTLE_ENTRY_WALK_START_AGE).originY).toBe(135);
    expect(prebattleEntryScene(PREBATTLE_ENTRY_WALK_END_AGE - 1).originY).toBe(56);
    expect(prebattleEntryScene(PREBATTLE_ENTRY_WALK_END_AGE)).toEqual({ originY: 56, attendantFrame: 0, playerFrame: 1 });
  });

  it.each(["on", "off"] as const)("the hand-off enters the room with no draft dealt yet (scene %s)", (scene) => {
    const entry = enterEntry(scene);
    expect(entry.lobbyFreeRoam).toBeNull();
    expect(entry.lobbyAttendant).toBeNull();
    expect(entry.prebattleEntry).toMatchObject({ age: 0, phase: "intro" });
    expect(entry.pendingGeneratedRound).toBeNull();
    expect(entry.factoryRoundBattleOrchestrator).toBeNull();
    expect(render(entry).length).toBe(240 * 160 * 4);
  });

  it("A mashed through the fade-in and the walk changes nothing: the deal still runs on age 104, the box opens on 106", () => {
    let s = enterEntry("off");
    let dealtAt: number | null = null;
    for (let i = 0; i < 110; i += 1) {
      s = tick(s, A);
      if (dealtAt === null && s.pendingGeneratedRound !== null) dealtAt = s.prebattleEntry!.age;
    }
    expect(dealtAt).toBe(PREBATTLE_ENTRY_DEAL_AGE);
    expect(s.prebattleEntry).toMatchObject({ phase: "talk", message: 0, page: 0 });
    expect(s.prebattleEntry!.age).toBeGreaterThanOrEqual(PREBATTLE_ENTRY_BOX_OPEN_AGE);
  });

  it("the briefing takes one A per message and one for the page turn (5), then fades to the draft", () => {
    const entry = enterEntry("off");
    const drive = driveBriefing(entry);
    const draft = drive.state;
    expect(draft.prebattleEntry).toBeNull();
    expect(draft.draftScreen.mode).toBe("cursor");
    expect(draft.pendingGeneratedRound).not.toBeNull();
    // Each message waits for its A: with no A at all the entry never leaves the room.
    let s = entry;
    for (let i = 0; i < 1500; i += 1) s = tick(s, NONE);
    expect(s.prebattleEntry).toMatchObject({ phase: "talk", message: 0, page: 0 });
  });

  it("A while the first message is still printing is ignored", () => {
    let s = enterEntry("off");
    for (let i = 0; i < PREBATTLE_ENTRY_BOX_OPEN_AGE + 5; i += 1) s = tick(s, i % 3 === 0 ? A : NONE);
    expect(s.prebattleEntry).toMatchObject({ phase: "talk", message: 0 });
    expect(s.prebattleEntry!.textAge).toBeLessThan(briefingGlyphCount(s.prebattleEntry!.messages![0]![0]!));
  });

  it("every phase draws a distinct, correctly sized frame and the replay is deterministic", () => {
    const hashes = new Set<ReturnType<typeof frameHash>>();
    let s = enterEntry("off");
    const seen = new Set<string>();
    for (let i = 0; i < 4000 && s.prebattleEntry !== null; i += 1) {
      s = tick(s, i % 8 < 2 ? A : NONE);
      if (s.prebattleEntry !== null) {
        seen.add(s.prebattleEntry.phase);
        if (i % 40 === 0) hashes.add(frameHash(render(s)));
      }
    }
    expect([...seen].sort()).toEqual(["black", "closing", "draftFadeIn", "fadeOut", "intro", "talk"].sort());
    expect(hashes.size).toBeGreaterThan(8);
    const again = driveBriefing(enterEntry("off")).state;
    const first = driveBriefing(enterEntry("off")).state;
    expect(frameHash(render(again))).toBe(frameHash(render(first)));
  });
});

describe("lbr-e: briefing text for a continued streak", () => {
  it("the script has no streak-dependent text: messages 1 and 4 are fixed, 2 and 3 come from the opponent set", () => {
    const base = createInitialFactoryCarry(createInitialState().factoryCarry.playerTrainerId);
    const fresh = buildBriefingMessages(base, 0x1234abcd);
    const kept = buildBriefingMessages({ ...base, factoryWinStreak: 7, rentsCount: 3 }, 0x1234abcd);
    expect(fresh).toHaveLength(4);
    expect(kept).toHaveLength(4);
    expect(kept[0]).toEqual(fresh[0]);
    expect(kept[3]).toEqual(fresh[3]);
    expect(fresh[0]![0]!.lines).toEqual(["I've conducted a little investigation", "about your upcoming opponent."]);
    expect(fresh[3]!.map((page) => page.end)).toEqual(["p", "end"]);
    for (const message of [...fresh, ...kept]) for (const page of message) expect(page.lines.length).toBeGreaterThan(0);
  });

  it("a continued streak runs the same entry through the engine (carry kept, same timeline)", () => {
    // The type / style lines come from the dealt opponent set, so the briefing's typing length varies with the deal; this cursor (scanned, lbr-f2) deals both runs the same length.
    const rng = 0x4ea349da;
    const fresh = driveBriefing(enterEntry("off", 0, rng));
    const kept = driveBriefing(enterEntry("off", 7, rng));
    expect(kept.state.pendingGeneratedRound!.carry.factoryWinStreak).toBe(7);
    expect(kept.state.pendingGeneratedRound!.carry.rentsCount).toBe(3);
    expect(kept.state.factoryCarry.factoryWinStreak).toBe(7);
    expect(fresh.state.factoryCarry.factoryWinStreak).toBe(0);
    expect(kept.frames).toBe(fresh.frames);
  });
});

describe("lbr-e: the deal against the ROM (lbre-prebattle-c-off route)", () => {
  it("the draft is dealt from the ROM's cursor at its deal frame and its six offers equal the ROM's", () => {
    const trace = JSON.parse(fs.readFileSync("tools/compare/traces/lbre-prebattle-c-off.json", "utf8"));
    let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene });
    let frame = 0;
    const stage = (): void => {
      if (trace.appStage.frame === frame) state = APP_STAGES[trace.appStage.id]!(state);
    };
    stage();
    const cursors = new Map<number, number>();
    for (const advance of traceAdvances(trace.segments)) {
      state = tick(state, advance.buttons);
      frame = advance.frame;
      stage();
      if (frame === trace.appRngRebase.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
      if (frame === 6548 || frame === 6659 || frame === 6660) cursors.set(frame, state.rngValue);
    }
    // The ROM's gRngValue (tools/probe/lbre-deal-ram.py): 6548 after the door warp's +2 / +3 extra draws, 6659 = the cursor the generator ran from.
    expect(cursors.get(6548)).toBe(0x620d7ebb);
    expect(cursors.get(6659)).toBe(0xdb35a7d8);
    expect(state.pendingGeneratedRound!.rngValueBefore).toBe(0xdb35a7d8);
    // ROM RAM rentalMons[0..5].monId at frame 6660 and after.
    expect(state.draftScreen.rentals.map((rental) => rental.source.setId)).toEqual([150, 173, 123, 168, 132, 124]);
    expect(state.prebattleEntry).toBeNull();
  }, 180_000);
});
