// scd112 (S10A, ISSUES #166 slice d): the production state of one stat101 window, shared by scd112ProductionCompare.ts and
// tests/scd112StatsChangeRender.test.ts. A constructed resolution segment
//   [previous message (automatic, printed), stats-change {battler, argument, minimumFrames = addedRows},
//    next command (print path: a message; playstatchangeanimation path: the 2-frame `stat` write, then a message)]
// rendered at ROM row `rel` with stats-change command age a = rel - 1 (stat102 s4): rel <= 0 is the previous command's last frame,
// rel >= addedRows + 1 the next command's frames. Scene ON draws with renderBattleResolutionLiveView (the app's drawScene), Scene OFF
// with renderBattleResolutionSceneOffView; `zeroed` is the production x2 tracker's state before the window (Scene ON only).
import { readFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView, renderBattleResolutionSceneOffView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { statsChangeParams, statsChangeSpan } from "../../src/animation/statsChange.ts";

export const SCD112_STAT101 = "tools/integration/fixtures/stat101";
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

export type Scd112Window = ReturnType<typeof scd112Window>;

export function scd112Window(
  scen: string, scene: "on" | "off", receipts: any, zeroed: readonly ("player" | "opponent")[] | null, commandAgeShift = 0,
) {
  const v = receipts[scen];
  const ix = v.index, w = v[scene].windows[0];
  const scenario = JSON.parse(readFileSync(`${SCD112_STAT101}/scenarios/${scen}.json`, "utf8"));
  const params = statsChangeParams(w.arg)!;
  const span = statsChangeSpan(params);
  const E = w.E - w.A;
  // (The Intimidate window animates the player; its switched-in opponent is unchanged by the command, so the transplant cancels it.)
  const oppSlot = ix.bench ? 1 : 0;
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[oppSlot]) });
  const battler: 0 | 1 = ix.animatedSide === "player" ? 0 : 1;
  const launch = String(w.script.launch);
  const psca = !launch.includes("PrintString") && !launch.includes("StatDown+") && !launch.includes("Intimidate");
  const x2Input = scene === "on" && zeroed !== null ? Object.freeze({ zeroed: Object.freeze([...zeroed]) }) : undefined;
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const statsChange = Object.freeze({ type: "stats-change", eventSequence: 2, battler, argument: w.arg, timing: { minimumFrames: span.addedRows } });
  const stat = Object.freeze({ type: "stat", eventSequence: 3, battler, stat: "defense", from: 6, to: params.direction === "up" ? 7 : 5, timing: { minimumFrames: 2 } });
  const commands = [message(1, ["PREVIOUS", "MESSAGE"]), statsChange, ...(psca ? [stat] : []), message(4, ["NEXT", "MESSAGE"])];
  const stateAt = (commandIndex: number, age: number) => ({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
  });
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView =>
    createBattleResolutionPresentationRenderView(stateAt(commandIndex, age) as never);
  const commandAge = (rel: number) => rel - 1 + commandAgeShift;
  const viewAtRel = (rel: number) => {
    const age = commandAge(rel);
    if (age < 0) return viewOf(0, 200);
    if (age < span.addedRows) return viewOf(1, age);
    let rest = age - span.addedRows;
    if (psca && rest < 2) return viewOf(2, rest);
    if (psca) rest -= 2;
    return viewOf(psca ? 3 : 2, rest);
  };
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    if (scene === "on") renderBattleResolutionLiveView(fb, view); else renderBattleResolutionSceneOffView(fb, view);
    return fb;
  };
  /** The base tree's frame for the command: the same state with the effect dropped (the ordinary field / box). */
  const ordinary = () => draw({ ...viewOf(1, 0), effect: null });
  return { ix, w, E, params, span, field, battler, psca, x2Input, commandAge, viewOf, viewAtRel, draw, ordinary };
}
