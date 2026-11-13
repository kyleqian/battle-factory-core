import { describe, expect, it } from "vitest";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { FACTORY_LOSS_TERMINAL_PROFILE } from "../src/engine/factoryTerminalPresentation.ts";
import { postwinContinuationInputReady } from "../src/engine/postwin.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  createFactoryLobbyFreeRoamState,
  isFactoryLobbyFacingSinglesAttendant,
} from "../src/engine/factoryLobbyFreeRoam.ts";
import { createInitialFactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import type { GbaButton } from "../src/input.ts";
import { driveAttendantConversation } from "./helpers/lobbyAttendant.ts";
import { GoalPlayDirector, appendFrame, frameHash, type FrameSegment } from "../tools/browser/goalPlay.ts";

const PLAYER_TRAINER_ID = createInitialState().factoryCarry.playerTrainerId;

function lobbyState(scene: "on" | "off", carryStreak = 0): EngineState {
  const base = createInitialState({ battleScene: scene, presentationSeed: 0xabc });
  return {
    ...base,
    lobbyFreeRoam: createFactoryLobbyFreeRoamState(),
    rngValue: 0x12345678,
    rngMode: "vblank",
    factoryCarry: Object.freeze({
      factoryWinStreak: carryStreak,
      factorySymbolsCount: 1,
      battlePoints: 21,
      rentsCount: carryStreak === 0 ? 0 : 3,
      playerTrainerId: PLAYER_TRAINER_ID,
    }),
  };
}

describe("nch231: A facing the singles attendant starts a new challenge", () => {
  it.each(["on", "off"] as const)("hands off to a freshly generated draft from the live RNG cursor (scene %s)", (scene) => {
    const before = lobbyState(scene, 7);
    expect(isFactoryLobbyFacingSinglesAttendant(before.lobbyFreeRoam!)).toBe(true);
    const opened = tick(before, new Set<GbaButton>(["A"]));
    expect(opened.lobbyAttendant).not.toBeNull();
    expect(opened.lobbyFreeRoam).not.toBeNull();
    expect(opened.pendingGeneratedRound ?? null).toBeNull();
    const drive = driveAttendantConversation(opened);
    const after = drive.state;

    expect(after.lobbyFreeRoam).toBeNull();
    expect(after.lobbyAttendant).toBeNull();
    expect(after.battleSceneMode).toBe(scene);
    expect(after.presentationRng.seed).toBe(before.presentationRng.seed);
    expect(after.appRoute).toBe(before.appRoute);
    expect(after.frame).toBe(opened.frame + drive.frames);
    // Loss / retire: the win streak and rents count reset (InitFactoryChallenge); symbols and BP stay.
    expect(after.factoryCarry).toMatchObject({ factoryWinStreak: 0, rentsCount: 0, factorySymbolsCount: 1, battlePoints: 21 });
    // The cursor kept running through the conversation frames (lbrb): the deal is the live cursor's next step, never the boot anchor.
    expect(drive.beforeHandoff.rngValue).not.toBe(0x12345678);
    expect(after.pendingGeneratedRound?.rngValueBefore).toBe(advanceRngValue(drive.beforeHandoff.rngValue));
    expect(after.rngValue).not.toBe(createInitialState().rngValue);
    expect(after.pendingGeneratedRound?.carry).toBe(after.factoryCarry);
    expect(after.factoryRoundBattleOrchestrator).toBeNull();
    expect(after.draftScreen).not.toBe(before.draftScreen);
    expect(render(after).length).toBe(240 * 160 * 4);
  });

  it("a different RNG cursor deals a different rental pool", () => {
    const a = driveAttendantConversation(tick(lobbyState("off"), new Set<GbaButton>(["A"]))).state;
    const b = driveAttendantConversation(tick({ ...lobbyState("off"), rngValue: 0x0badf00d }, new Set<GbaButton>(["A"]))).state;
    expect(JSON.stringify(a.draftScreen)).not.toBe(JSON.stringify(b.draftScreen));
  });

  it("is a no-op for B, away from the attendant, and for an A that stays held", () => {
    const s0 = lobbyState("off");
    let s = tick(s0, new Set<GbaButton>(["B"]));
    expect(s.lobbyFreeRoam).not.toBeNull();
    // Walk away from the attendant: A is silent.
    for (let i = 0; i < 40; i += 1) s = tick(s, new Set<GbaButton>(["DOWN"]));
    for (let i = 0; i < 4; i += 1) s = tick(s, new Set<GbaButton>());
    expect(isFactoryLobbyFacingSinglesAttendant(s.lobbyFreeRoam!)).toBe(false);
    s = tick(s, new Set<GbaButton>(["A"]));
    expect(s.lobbyFreeRoam).not.toBeNull();
    expect(s.pendingGeneratedRound ?? null).toBeNull();
    // JOY_NEW(A): an A that was already held on the previous frame does not fire.
    const noRepeat = tick({ ...s0, keyRepeat: tick(s0, new Set<GbaButton>(["A"])).keyRepeat }, new Set<GbaButton>(["A"]));
    expect(noRepeat.lobbyFreeRoam).not.toBeNull();
  });

  it("does not fire while the player is mid-turn", () => {
    let s = lobbyState("off");
    s = tick(s, new Set<GbaButton>(["LEFT"]));
    s = tick(s, new Set<GbaButton>(["LEFT"]));
    s = tick(s, new Set<GbaButton>(["LEFT"]));
    expect(isFactoryLobbyFacingSinglesAttendant(s.lobbyFreeRoam!)).toBe(false);
    s = tick(s, new Set<GbaButton>(["A"]));
    expect(s.lobbyFreeRoam).not.toBeNull();
  });

  it("the carry reset starts from the initial carry too", () => {
    const after = driveAttendantConversation(
      tick({ ...lobbyState("off"), factoryCarry: createInitialFactoryCarry(PLAYER_TRAINER_ID) }, new Set<GbaButton>(["A"])),
    ).state;
    expect(after.factoryCarry).toMatchObject({ factoryWinStreak: 0, rentsCount: 0, battlePoints: 0 });
  });
});

function retireToLobbyReady(scene: "on" | "off", segments: FrameSegment[]): EngineState {
  const director = new GoalPlayDirector({ seed: 1, scene, mixRate: 0, presentationSeed: 1 });
  let ready = false;
  for (let guard = 0; guard < 400_000 && !director.done && !ready; guard += 1) {
    const burst = director.state.postwin ? 1 : 50;
    for (const seg of director.runFrames(burst)) for (let i = 0; i < seg.frames; i += 1) appendFrame(segments, seg.buttons);
    const p = director.state.postwin;
    ready =
      p !== null &&
      p.question === null &&
      p.dialoguePage === 0 &&
      p.continuationConfirmElapsed === null &&
      postwinContinuationInputReady(p) &&
      p.continuationCursorPos === 0;
  }
  if (!ready) throw new Error("post-win menu never became ready");
  return director.state;
}

describe("nch231: a recorded retire -> lobby -> A -> second draft session replays identically", () => {
  it.each(["on", "off"] as const)("replay from createInitialState reproduces the live state (scene %s)", (scene) => {
    const segments: FrameSegment[] = [];
    let s = retireToLobbyReady(scene, segments);
    const press = (button: GbaButton | null, frames: number): void => {
      const buttons: GbaButton[] = button === null ? [] : [button];
      for (let i = 0; i < frames; i += 1) {
        s = tick(s, new Set(buttons));
        appendFrame(segments, buttons);
      }
    };
    for (let i = 0; i < 3; i += 1) {
      press("DOWN", 2);
      press(null, 3);
    }
    press("A", 2);
    press(null, 70);
    expect(s.postwin?.question?.kind).toBe("retire");
    press("UP", 2);
    press(null, 2);
    press("A", 2);
    for (let i = 0; i < 80 && s.factoryTerminal === null; i += 1) press(null, 1);
    expect(s.factoryTerminal?.profile.outcome).toBe(FACTORY_LOSS_TERMINAL_PROFILE.outcome);
    for (let i = 0; i < 40 && s.lobbyFreeRoam === null; i += 1) {
      press("A", 2);
      press(null, 150);
    }
    expect(s.lobbyFreeRoam).not.toBeNull();
    // Walk off and back: the attendant tile is reached again by a recorded walk.
    press("DOWN", 40);
    press(null, 30);
    press("UP", 70);
    press(null, 30);
    expect(isFactoryLobbyFacingSinglesAttendant(s.lobbyFreeRoam!)).toBe(true);
    const rngBefore = s.rngValue;
    press("A", 1);
    expect(s.lobbyAttendant).not.toBeNull();
    // The conversation: tap A (2 held, 6 released) until the Lobby hands off to the draft.
    for (let i = 0; i < 4000 && s.lobbyFreeRoam !== null; i += 1) {
      press("A", 2);
      press(null, 6);
    }
    expect(s.lobbyFreeRoam).toBeNull();
    expect(s.pendingGeneratedRound).not.toBeNull();
    expect(s.pendingGeneratedRound!.rngValueBefore).not.toBe(rngBefore);
    press(null, 60);
    press("A", 2);
    press(null, 30);
    press("RIGHT", 4);
    press(null, 30);

    let replay = createInitialState({ battleScene: scene, presentationSeed: 1 });
    for (const segment of segments) {
      const buttons = new Set<GbaButton>(segment.buttons);
      for (let i = 0; i < segment.frames; i += 1) replay = tick(replay, buttons);
    }
    expect(replay.frame).toBe(s.frame);
    expect(replay.rngValue).toBe(s.rngValue);
    expect(replay.pendingGeneratedRound).toEqual(s.pendingGeneratedRound);
    expect(replay.factoryCarry).toEqual(s.factoryCarry);
    expect(frameHash(render(replay))).toBe(frameHash(render(s)));
    expect(JSON.stringify(replay.draftScreen)).toBe(JSON.stringify(s.draftScreen));
  }, 180_000);
});
