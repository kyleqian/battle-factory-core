// contain213: the contain209 draft route (Scene ON, rendering every frame like the browser) played to the end of its first battle
// -- A on every prompt (FIGHT, the first move slot with PP, message dismiss), a forced party menu walked with DOWN + A -- until the postwin /
// return hold starts. The engine graph is passed in so a test can drive a vi.doMock'd copy; `beforeTick` lets a test arm an
// injected fault for one tick (and disarm it before that frame renders).
import { readFileSync } from "node:fs";
import type * as Core from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";

type State = ReturnType<typeof Core.createInitialState>;

export function contain213BattleToEnd(
  core: typeof Core,
  beforeTick: (state: State) => (() => void) | void = () => {},
  budget = 60_000,
) {
  let state = core.createInitialState({ battleScene: "on" });
  const segmentEvents: unknown[] = [];
  const seenSegments = new Set<object>();
  let forcedMenus = 0;
  const step = (buttons: readonly GbaButton[] = []) => {
    const disarm = beforeTick(state);
    try {
      state = core.tick(state, new Set(buttons));
    } finally {
      disarm?.();
    }
    core.render(state);
    const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    for (const segment of r?.segments ?? []) {
      if (seenSegments.has(segment)) continue;
      seenSegments.add(segment);
      segmentEvents.push(...segment.events);
    }
  };
  const draft = JSON.parse(readFileSync("tools/compare/traces/interactive-haunter-shadow-punch-off.json", "utf8"));
  outer: for (const segment of draft.segments) {
    for (let i = 0; i < segment.frames; i++) {
      step(segment.buttons);
      if (state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase === "action-menu") break outer;
    }
  }
  let forcedFrames = 0;
  for (let i = 0; state.postwin === null; i++) {
    if (i >= budget) throw new Error(`contain213 battle stalled at frame ${state.frame}`);
    const orchestrator = state.factoryRoundBattleOrchestrator;
    const forced = orchestrator?.battleForcedPartySelect;
    if (forced && forced.sendOutElapsed === null) {
      if (forcedFrames === 0) forcedMenus += 1;
      forcedFrames += 1;
      // Walk the cursor off a fainted slot now and then; A otherwise (pick, then SEND OUT). The DOWN only lands while the list owns
      // the input: inside the SEND OUT / SUMMARY / CANCEL window it would move the action cursor onto SUMMARY (sum241) and the next
      // A would open the summary instead of sending out -- before sum241 that DOWN was a no-op there, which this keeps.
      step(forcedFrames % 4 !== 0 ? [] : forcedFrames % 48 === 0 ? (forced.submenuOpen || forced.message !== null ? [] : ["DOWN"]) : ["A"]);
      continue;
    }
    forcedFrames = 0;
    const command = orchestrator?.battleCommandPresentation;
    if (command?.lifecycle.phase === "fight-menu" && i % 2 === 0) {
      // The first move slot with PP left.
      const pp = orchestrator!.battle!.rules.rulesContext.battlers[0]!.pp;
      const slot = Math.max(0, pp.findIndex((value) => value > 0));
      const cursor = command.fightCursor;
      if (cursor !== slot) {
        step([(cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP")]);
        continue;
      }
    }
    step(i % 2 === 0 ? ["A"] : []);
  }
  return { state, segmentEvents, forcedMenus };
}
