// sar131 (S10A, ISSUES #168 slice SA4, docs/sar131-status-animation-render.md): the production state of one PSN / PRZ ROM window,
// shared by sar131ProductionCompare.ts and tests/sar131StatusAnimationRender.test.ts. A constructed resolution segment
//   [previous message (automatic, printed), status-animation {battler, animation, minimumFrames = STATUS_ANIMATION_ADDED_ROWS},
//    next message]
// rendered at ROM row X + 1 + a with status-animation command age a (X = the statusanimation instruction row, a = 0 = the first
// gAnimScriptActive row; a < 0 = the previous command's last frame, a >= minimumFrames = the next command's frames) through
// production's createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (Scene ON, the app's drawScene). `zeroed`
// = the production x2 tracker's sides before the window (null = no x2 input).
import { readFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

export const SAR131 = "tools/integration/fixtures/sar131";
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

export function sar131Window(
  stem: string, win: { animation: string; battler: 0 | 1 }, zeroed: readonly ("player" | "opponent")[] | null,
  opts: { ageShift?: number; battlerOverride?: 0 | 1 } = {},
) {
  const scenario = JSON.parse(readFileSync(`${SAR131}/scenarios/${stem}.json`, "utf8"));
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const animation = win.animation as keyof typeof STATUS_ANIMATION_ADDED_ROWS;
  const rows = STATUS_ANIMATION_ADDED_ROWS[animation];
  const battler = opts.battlerOverride ?? win.battler;
  const x2Input = zeroed === null ? undefined : Object.freeze({ zeroed: Object.freeze([...zeroed]) });
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const command = Object.freeze({ type: "status-animation", eventSequence: 2, battler, animation, timing: { minimumFrames: rows } });
  const commands = [message(1, ["PREVIOUS", "MESSAGE"]), command, message(3, ["NEXT", "MESSAGE"])];
  const stateAt = (commandIndex: number, age: number) => ({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
  });
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView =>
    createBattleResolutionPresentationRenderView(stateAt(commandIndex, age) as never);
  const ageShift = opts.ageShift ?? 0;
  /** Command age of ROM row X + 1 + a (ageShift: the age+1 control). */
  const viewAt = (a: number) => {
    const age = a + ageShift;
    if (age < 0) return viewOf(0, 200);
    if (age < rows) return viewOf(1, age);
    return viewOf(2, age - rows);
  };
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  /**
   * Production's own frame without the status animation's pixels: the effect dropped; from the command's first row on, the opponent
   * at its tracked rest before the window and the elevated shadow shown (the ROM's row X shows both; production's ordinary rows
   * never draw a rest).
   */
  const reference = (a: number) => {
    const view = viewAt(a);
    if (a + ageShift < 0) return draw({ ...view, effect: null });
    const rest = x2Input === undefined ? { x2: 0, y2: 0 } : liveBattlerAnchors("opponent", view.fieldArt, x2Input).frontIdleRest;
    const opp = view.fieldArt.opponent;
    return draw({ ...view, effect: null, postBodyShadowHidden: false,
      fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
  };
  return { field, rows, battler, animation, x2Input, viewAt, draw, reference };
}
