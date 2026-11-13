// contain209: the ordinary draft -> generated battle route of tools/integration/playableAnimationReplay.ts (Scene ON, live
// Shadow Punch in slot 0), rendering every frame like the browser, with the engine graph passed in so a test can drive a
// vi.doMock'd copy. Records each presented command's rows and the rendered frame hashes of every move-animation command.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import type * as Core from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";

export type Contain209Command = {
  key: string;
  type: string;
  command: object;
  rows: number;
  moveId?: number;
  /** move-animation only: sha256 of every rendered row, in order. */
  frames?: string[];
};

export function contain209Replay(core: typeof Core, moveSlots: readonly (0 | 1 | 2 | 3)[] = [0]) {
  let state = core.createInitialState({ battleScene: "on" });
  const commands: Contain209Command[] = [];
  const segmentEvents: unknown[] = [];
  const seenSegments = new Set<object>();
  const step = (buttons: readonly GbaButton[] = []) => {
    state = core.tick(state, new Set(buttons));
    const rgba = core.render(state);
    const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (!r) return;
    for (const segment of r.segments) {
      if (seenSegments.has(segment)) continue;
      seenSegments.add(segment);
      segmentEvents.push(...segment.events);
    }
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
    if ((r.lifecycle.phase !== "presenting" && r.lifecycle.phase !== "awaiting-message-dismiss") || !command) return;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    let entry = commands.at(-1);
    if (entry?.key !== key) {
      entry = {
        key, type: command.type, command, rows: 0,
        ...(command.type === "move-animation" ? { frames: [], ...(command.animation ? { moveId: command.animation.moveId } : {}) } : {}),
      };
      commands.push(entry);
    }
    entry.rows += 1;
    entry.frames?.push(createHash("sha256").update(rgba).digest("hex"));
  };
  const until = (predicate: () => boolean, budget = 8000) => {
    for (let i = 0; !predicate(); i++) {
      if (i >= budget) throw new Error(`contain209 replay stalled at frame ${state.frame}`);
      const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      step(r?.lifecycle.phase === "awaiting-message-dismiss" && i % 2 === 0 ? ["A"] : []);
    }
  };
  const pulse = (button: GbaButton) => { step(); step([button]); step(); };
  const commandPhase = () => state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase;
  const draft = JSON.parse(readFileSync("tools/compare/traces/interactive-haunter-shadow-punch-off.json", "utf8"));
  outer: for (const segment of draft.segments) {
    for (let i = 0; i < segment.frames; i++) {
      step(segment.buttons);
      if (commandPhase() === "action-menu") break outer;
    }
  }
  if (commandPhase() !== "action-menu") throw new Error("draft input did not reach an ordinary command");
  let actionMenus = 0;
  for (const slot of moveSlots) {
    const forced = state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.forcedMove ?? null;
    pulse("A");
    if (forced !== null) {
      if (commandPhase() === "no-moves-message") {
        until(() => (state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.factoryRoundBattleOrchestrator?.battleCommandPresentation);
      until(() => commandPhase() === "action-menu");
      actionMenus += 1;
      continue;
    }
    until(() => commandPhase() === "fight-menu");
    for (let i = 0; i < 4; i++) {
      const cursor = state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.factoryRoundBattleOrchestrator?.battleCommandPresentation);
    until(() => commandPhase() === "action-menu");
    actionMenus += 1;
  }
  return { state, commands, segmentEvents, actionMenus };
}
