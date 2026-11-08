import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createInitialState, tick, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { SessionRecorder } from "../../src/sessionRecorder.ts";
import { presentationRngTraceMetadata } from "../../src/engine/presentationRngHost.ts";
import type { GbaButton } from "../../src/input.ts";

export interface LiveAnimationObservation {
  frame: number;
  moveId: number;
  attacker: 0 | 1;
  player: string;
  opponent: string;
  duration: number | null;
  samples: Array<{ age: number; sha256: string }>;
}

/** Starts at the real rental draft, then uses only ordinary controller input. */
export function playableAnimationReplay(
  battleScene: "on" | "off",
  moveSlots: readonly (0 | 1 | 2 | 3)[] = [0, 1, 0],
  presentationSeed?: number,
) {
  let state = createInitialState({ battleScene, presentationSeed });
  const recorder = new SessionRecorder();
  const observations: LiveAnimationObservation[] = [];
  const boundaries: EngineState[] = [];
  const commands: Array<{ type: string; command: unknown }> = [];
  const semanticEvents: Array<{
    requestId: number;
    segmentIndex: number;
    event: unknown;
  }> = [];
  const observedSegments = new Set<object>();
  let commandKey = "";
  let animationKey = "";
  const step = (buttons: readonly GbaButton[] = []) => {
    recorder.recordTick(new Set(buttons));
    state = tick(state, new Set(buttons));
    const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (r) for (let segmentIndex = 0; segmentIndex < r.segments.length; segmentIndex += 1) {
      const segment = r.segments[segmentIndex]!;
      if (observedSegments.has(segment)) continue;
      observedSegments.add(segment);
      for (const event of segment.events) {
        semanticEvents.push({ requestId: r.resolutionId.requestId, segmentIndex, event });
      }
    }
    const command = r?.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (r?.lifecycle.phase === "presenting" && command) {
      const current = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (current !== commandKey) {
        commandKey = current;
        commands.push({ type: command.type, command });
      }
    }
    if (r?.lifecycle.phase === "presenting" && command?.type === "move-animation" && command.animation) {
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (key !== animationKey) {
        animationKey = key;
        const view = createBattleResolutionPresentationRenderView(r);
        observations.push({
          frame: state.frame, moveId: command.animation.moveId,
          attacker: command.animation.attacker,
          player: view.field.player.name, opponent: view.field.opponent.name,
          duration: liveMoveAnimationDuration(command.animation, view.field), samples: [],
        });
      }
      const observation = observations.at(-1)!;
      if (observation.duration !== null) {
        // Render every age: errors in an intermediate callback must fail the route.
        const rgba = render(state);
        if ([0, Math.floor(observation.duration / 2), observation.duration - 1].includes(r.lifecycle.phaseElapsed)) {
          observation.samples.push({ age: r.lifecycle.phaseElapsed,
            sha256: createHash("sha256").update(rgba).digest("hex") });
        }
      }
    }
  };
  const until = (predicate: () => boolean, budget = 8000) => {
    for (let i=0; !predicate(); i++) {
      if (i >= budget) throw new Error(`playable replay stalled at frame ${state.frame}`);
      const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      step(r?.lifecycle.phase === "awaiting-message-dismiss" && i % 2 === 0 ? ["A"] : []);
    }
  };
  const pulse = (button: GbaButton) => { step(); step([button]); step(); };
  const commandPhase = () => state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase;
  const draft = JSON.parse(readFileSync("tools/compare/traces/interactive-haunter-shadow-punch-off.json", "utf8"));
  outer: for (const segment of draft.segments) {
    for (let i=0; i<segment.frames; i++) {
      step(segment.buttons);
      if (commandPhase() === "action-menu") break outer;
    }
  }
  if (commandPhase() !== "action-menu") throw new Error("draft input did not reach an ordinary command");
  boundaries.push(state);
  for (const slot of moveSlots) {
    until(() => commandPhase() === "action-menu");
    pulse("A");
    until(() => commandPhase() === "fight-menu");
    for (let i=0; i<4; i++) {
      const cursor = state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.factoryRoundBattleOrchestrator?.battleCommandPresentation);
    until(() => commandPhase() === "action-menu");
    if (state.sceneOnPresentation !== null) throw new Error("live route injected a dev probe");
    boundaries.push(state);
  }
  return {
    state, boundaries, observations, commands, semanticEvents,
    trace: recorder.toTrace({
      appRoute: state.appRoute,
      battleScene,
      build: "integration-replay",
      presentationRng: presentationRngTraceMetadata(state.presentationRng),
    }),
  };
}
