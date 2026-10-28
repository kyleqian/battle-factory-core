import { describe, expect, it } from "vitest";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import { createFactoryLobbyFreeRoamState } from "../src/engine/factoryLobbyFreeRoam.ts";
import type { GbaButton } from "../src/input.ts";
import {
  DEFAULT_POLICY_CYCLE,
  GoalPlayDirector,
  LOBBY_WANDER_FRAMES,
  appendFrame,
  frameHash,
  policyForChallenge,
  type FrameSegment,
} from "../tools/browser/goalPlay.ts";

const totalFrames = (segments: readonly FrameSegment[]): number => segments.reduce((sum, s) => sum + s.frames, 0);


describe("goal-directed browser play (tools/browser/goalPlay.ts)", () => {
  it("RLE-merges identical consecutive frames and sorts button sets", () => {
    const segments: FrameSegment[] = [];
    appendFrame(segments, []);
    appendFrame(segments, []);
    appendFrame(segments, ["B", "A"]);
    appendFrame(segments, ["A", "B"]);
    appendFrame(segments, ["A"]);
    expect(segments).toEqual([
      { frames: 2, buttons: [] },
      { frames: 2, buttons: ["A", "B"] },
      { frames: 1, buttons: ["A"] },
    ]);
  });

  it("cycles one policy per challenge", () => {
    expect(policyForChallenge(0)).toBe(DEFAULT_POLICY_CYCLE[0]);
    expect(policyForChallenge(DEFAULT_POLICY_CYCLE.length)).toBe(DEFAULT_POLICY_CYCLE[0]);
    expect(policyForChallenge(3)).toBe("full");
    expect(new GoalPlayDirector({ seed: 1, scene: "off", challenge: 3 }).policy).toBe("full");
  });

  it.each(["on", "off"] as const)("completes the draft and reaches an orchestrator battle (scene %s)", (scene) => {
    const director = new GoalPlayDirector({ seed: 1, scene, mixRate: 0 });
    for (let guard = 0; guard < 60 && director.state.factoryRoundBattleOrchestrator?.battle == null && !director.done; guard += 1) {
      director.runFrames(200);
    }
    expect(director.mirrorError).toBeNull();
    expect(director.state.factoryRoundBattleOrchestrator?.battle).toBeTruthy();
    expect(director.stats.policyPresses).toBeGreaterThan(10);
    expect(director.stats.randomPresses).toBe(0);
  });

  it("is deterministic per (seed, challenge) and differs across seeds", () => {
    const run = (seed: number, challenge: number) => {
      const segments: FrameSegment[] = [];
      const director = new GoalPlayDirector({ seed, scene: "off", challenge });
      for (const segment of director.runFrames(1500)) segments.push(segment);
      return segments;
    };
    expect(run(5, 0)).toEqual(run(5, 0));
    expect(run(5, 0)).not.toEqual(run(6, 0));
    expect(run(5, 0)).not.toEqual(run(5, 1));
  });

  it("emits exactly the frames the mirror ticked: replaying the segments reproduces the mirror state", () => {
    const director = new GoalPlayDirector({ seed: 3, scene: "on", mixRate: 0.2 });
    const segments: FrameSegment[] = [];
    for (let i = 0; i < 20; i += 1) for (const segment of director.runFrames(150)) segments.push(segment);
    expect(totalFrames(segments)).toBe(director.frame);
    let replay = createInitialState({ battleScene: "on", presentationSeed: 3 });
    for (const segment of segments) {
      const buttons = new Set<GbaButton>(segment.buttons);
      for (let i = 0; i < segment.frames; i += 1) replay = tick(replay, buttons);
    }
    expect(replay.frame).toBe(director.frame);
    expect(frameHash(render(replay))).toBe(frameHash(render(director.state)));
    expect(director.stats.randomPresses).toBeGreaterThan(0);
  });

  it("wanders the free-roam lobby, then asks for a fresh challenge", () => {
    const initialState = { ...createInitialState({ battleScene: "off" }), lobbyFreeRoam: createFactoryLobbyFreeRoamState() };
    const director = new GoalPlayDirector({ seed: 2, scene: "off", initialState });
    const segments: FrameSegment[] = [];
    for (let i = 0; i < 20 && !director.done; i += 1) for (const segment of director.runFrames(60)) segments.push(segment);
    expect(director.restart).toBe("lobby");
    expect(director.mirrorError).toBeNull();
    expect(totalFrames(segments)).toBeGreaterThanOrEqual(LOBBY_WANDER_FRAMES);
    expect(totalFrames(segments)).toBeLessThan(LOBBY_WANDER_FRAMES + 60);
    const used = new Set(segments.flatMap((s) => s.buttons));
    expect([...used].every((b) => ["UP", "DOWN", "LEFT", "RIGHT", "A", "B"].includes(b))).toBe(true);
    expect(director.stats.lobbyPresses).toBeGreaterThan(5);
  });

  it("hands over to the next challenge once its frame budget is spent, but never cuts a lobby short", () => {
    const director = new GoalPlayDirector({ seed: 1, scene: "off", budgetFrames: 300 });
    for (let i = 0; i < 10 && !director.done; i += 1) director.runFrames(100);
    expect(director.restart).toBe("budget");
    expect(director.frame).toBeGreaterThanOrEqual(300);
    expect(director.frame).toBeLessThan(300 + 10);
    const lobby = new GoalPlayDirector({
      seed: 1,
      scene: "off",
      budgetFrames: 1,
      initialState: { ...createInitialState({ battleScene: "off" }), lobbyFreeRoam: createFactoryLobbyFreeRoamState() },
    });
    for (let i = 0; i < 20 && !lobby.done; i += 1) lobby.runFrames(60);
    expect(lobby.restart).toBe("lobby");
  });

  it("stops without throwing when the mirror engine cannot run", () => {
    const broken = { ...createInitialState({ battleScene: "off" }), draftScreen: null } as unknown as ReturnType<typeof createInitialState>;
    const director = new GoalPlayDirector({ seed: 1, scene: "off", initialState: broken });
    expect(() => director.runFrames(10)).not.toThrow();
    expect(director.mirrorError).toBeInstanceOf(Error);
    expect(director.done).toBe(true);
    expect(director.runFrames(10)).toEqual([]);
  });
});
