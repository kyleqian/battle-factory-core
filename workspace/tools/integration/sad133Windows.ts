// sad133 (S10A, ISSUES #168 slices SA6 / SA7 / SA8, docs/sad133-status-animation-render-2.md): the production state of one stp128 ROM
// window (CURSED / NIGHTMARE / CONFUSION / FRZ), shared by sad133ProductionCompare.ts and tests/sad133StatusAnimationRender.test.ts.
// The sar131Windows.ts segment on the stp128 scenario's leads:
//   [previous message (automatic, printed), <status> (FRZ inflicted only), status-animation {battler, animation,
//    minimumFrames = STATUS_ANIMATION_ADDED_ROWS}, next message]
// rendered at ROM row rel a (rel 0 = the gAnimScriptActive rise row) with status-animation command age a, through production's
// createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (Scene ON). FRZ inflicted after Ice Beam (ROM E 115)
// puts the battler's status command right before the status-animation command, as sa125 SA3 projects it.
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

export const STP128 = "tools/integration/fixtures/stp128";
export const SAD133 = "tools/integration/fixtures/sad133";
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

export type Sad133RomWindow = {
  scenario: string; animation: "CURSED" | "NIGHTMARE" | "CONFUSION" | "FRZ"; side: "player" | "opponent"; battler: 0 | 1; E: number;
  rows: { rel: number; bat: number[]; other: number[] }[];
};

/** FRZ: the ROM path of the window (E 115 = inflicted after Ice Beam's gate, E 116 = the frozen turn's load lag). */
export const sad133FreezeInflicted = (w: Sad133RomWindow) => w.animation === "FRZ" && w.E === 115;

/** The production x2 input before the window: the opponent's ROM x2 on row -2 (0 = zeroed, else the tracked idle rest). */
export function sad133X2Zeroed(w: Sad133RomWindow): ("player" | "opponent")[] {
  const opponentX2 = w.side === "opponent" ? w.rows[0]!.bat[2] : w.rows[0]!.other[2];
  return opponentX2 === 0 ? ["opponent"] : [];
}

export function sad133Window(
  w: Sad133RomWindow, zeroed: readonly ("player" | "opponent")[] | null,
  opts: { ageShift?: number; battlerOverride?: 0 | 1; inflicted?: boolean } = {},
) {
  const scenario = JSON.parse(readFileSync(`${STP128}/scenarios/${w.scenario}`, "utf8"));
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const animation = w.animation;
  const rows = STATUS_ANIMATION_ADDED_ROWS[animation];
  const battler = opts.battlerOverride ?? w.battler;
  const inflicted = opts.inflicted ?? sad133FreezeInflicted(w);
  const x2Input = zeroed === null ? undefined : Object.freeze({ zeroed: Object.freeze([...zeroed]) });
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const status = Object.freeze({ type: "status", eventSequence: 2, battler, before: 0, after: 0x20, timing: { minimumFrames: 1 } });
  const command = Object.freeze({ type: "status-animation", eventSequence: 3, battler, animation, timing: { minimumFrames: rows } });
  const commands = [message(1, ["PREVIOUS", "MESSAGE"]), ...(inflicted ? [status] : []), command, message(4, ["NEXT", "MESSAGE"])];
  const at = inflicted ? 2 : 1;
  const stateAt = (commandIndex: number, age: number) => ({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
  });
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView =>
    createBattleResolutionPresentationRenderView(stateAt(commandIndex, age) as never);
  const ageShift = opts.ageShift ?? 0;
  /** Command age of ROM row rel a (ageShift: the age+1 control). */
  const viewAt = (a: number) => {
    const age = a + ageShift;
    if (age < 0) return viewOf(at - 1, inflicted ? 0 : 200);
    if (age < rows) return viewOf(at, age);
    return viewOf(at + 1, age - rows);
  };
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  /** Production's own frame without the status animation's pixels (sar131Windows.ts `reference`). */
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
