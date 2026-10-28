import { describe, expect, it } from "vitest";
import { tick, type EngineState } from "../src/engine/core.ts";
import { FACTORY_LOSS_TERMINAL_PROFILE } from "../src/engine/factoryTerminalPresentation.ts";
import { postwinContinuationInputReady } from "../src/engine/postwin.ts";
import type { GbaButton } from "../src/input.ts";
import { GoalPlayDirector } from "../tools/browser/goalPlay.ts";

function postwinMenuReady(scene: "on" | "off"): EngineState {
  const director = new GoalPlayDirector({ seed: 1, scene, mixRate: 0 });
  for (let guard = 0; guard < 400_000 && !director.done; guard += 1) {
    director.runFrames(director.state.postwin ? 1 : 50);
    const p = director.state.postwin;
    if (
      p !== null &&
      p.question === null &&
      p.dialoguePage === 0 &&
      p.continuationConfirmElapsed === null &&
      postwinContinuationInputReady(p) &&
      p.continuationCursorPos === 0
    )
      return director.state;
  }
  throw new Error("post-win menu never became ready");
}

describe("RETIRE -> YES after a won battle continues into the Lobby like a loss", () => {
  it.each(["on", "off"] as const)("hands off to the loss terminal and A reaches lobby free-roam (scene %s)", (scene) => {
    let s = postwinMenuReady(scene);
    const press = (button: GbaButton | null, frames: number): void => {
      const held = new Set<GbaButton>(button === null ? [] : [button]);
      for (let i = 0; i < frames; i += 1) s = tick(s, held);
    };
    for (let i = 0; i < 3; i += 1) {
      press("DOWN", 2);
      press(null, 3);
    }
    expect(s.postwin?.continuationCursorPos).toBe(3);
    press("A", 2);
    press(null, 70);
    expect(s.postwin?.question?.kind).toBe("retire");
    press("UP", 2);
    press(null, 2);
    press("A", 2);
    expect(s.postwin?.questionYesElapsed).not.toBeNull();
    expect(s.factoryTerminal).toBeNull();

    let handoffAge: number | null = null;
    for (let i = 0; i < 80 && handoffAge === null; i += 1) {
      press(null, 1);
      const terminal = (s as EngineState).factoryTerminal;
      if (terminal !== null) handoffAge = terminal.age;
    }
    expect(handoffAge).toBe(FACTORY_LOSS_TERMINAL_PROFILE.fieldFirstAge);
    expect(s.postwin).toBeNull();
    expect(s.factoryTerminal?.profile.outcome).toBe("loss");

    for (let i = 0; i < 40 && s.lobbyFreeRoam === null; i += 1) {
      press("A", 2);
      press(null, 150);
    }
    expect(s.lobbyFreeRoam).not.toBeNull();
    expect(s.pendingGeneratedRound ?? null).toBeNull();
  }, 120_000);
});
