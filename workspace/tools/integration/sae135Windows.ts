// sae135 (S10A, ISSUES #168 slice SA5, docs/sae135-status-animation-render-3.md): the production state of one stq132 SLP / BRN /
// INFATUATION ROM window (tools/integration/fixtures/stq132/rom-windows.json), shared by sae135ProductionCompare.ts and
// tests/sae135StatusAnimationRender.test.ts. sar131Windows.ts's construction over stq132's scenarios: a resolution segment
//   [previous message (automatic, printed), status-animation {battler, animation, minimumFrames = STATUS_ANIMATION_ADDED_ROWS},
//    next message]
// rendered at ROM rel a with status-animation command age a (rel 0 = the first gAnimScriptActive row = sar131's ROM row X + 1; a < 0 =
// the previous command's last frame, a >= minimumFrames = the next command's frames) through production's
// createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (Scene ON). The x2 input is the ROM's own opponent rest
// on row rel -1 (`zeroed` = ["opponent"] when the ROM shows it at 0 where the species' idle rest is not 0; the tracker's own rows for
// these three are `keep`, checked by sae135NextBodyX2.ts).
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

export const STQ132 = "tools/integration/fixtures/stq132";
export const SAE135 = "tools/integration/fixtures/sae135";
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

export type Sae135RomWindow = {
  scenario: string; animation: "SLP" | "BRN" | "INFATUATION"; side: "player" | "opponent"; battler: 0 | 1; E: number;
  rows: { rel: number; bat: number[]; other: number[] }[];
};

export function sae135RomWindows(): Record<string, Sae135RomWindow> {
  return JSON.parse(readFileSync(`${STQ132}/rom-windows.json`, "utf8")).windows;
}

/** `zeroed`: an explicit x2 input (sae135NextBodyX2.ts: the production tracker's prediction) instead of the ROM's row rel -1. */
export function sae135Window(
  win: Sae135RomWindow, opts: { ageShift?: number; battlerOverride?: 0 | 1; zeroed?: readonly ("player" | "opponent")[] } = {},
) {
  const scenario = JSON.parse(readFileSync(`${STQ132}/scenarios/${win.scenario}`, "utf8"));
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: (mon.gender ?? "male") as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const animation = win.animation;
  const rows = STATUS_ANIMATION_ADDED_ROWS[animation];
  const battler = opts.battlerOverride ?? win.battler;
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const command = Object.freeze({ type: "status-animation", eventSequence: 2, battler, animation, timing: { minimumFrames: rows } });
  const commands = [message(1, ["PREVIOUS", "MESSAGE"]), command, message(3, ["NEXT", "MESSAGE"])];
  const stateFor = (x2Input: { zeroed: readonly ("player" | "opponent")[] }) => (commandIndex: number, age: number) => ({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveMoveBattlerX2Input: x2Input,
  });
  // The ROM's opponent x2 on row rel -1 -> the tracked x2 input that reproduces it.
  const before = win.rows.find((r) => r.rel === -1);
  const romOpponentX2 = before === undefined ? null : win.side === "opponent" ? before.bat[2]! : before.other[2]!;
  const probe = createBattleResolutionPresentationRenderView(stateFor({ zeroed: [] })(1, 0) as never);
  const idle = liveBattlerAnchors("opponent", probe.fieldArt, { zeroed: [] }).frontIdleRest.x2;
  if (opts.zeroed === undefined && romOpponentX2 !== idle && romOpponentX2 !== 0) {
    throw new Error(`sae135Window: ROM opponent x2 ${romOpponentX2} is neither the rest ${idle} nor 0`);
  }
  const x2Input = Object.freeze({ zeroed: Object.freeze(opts.zeroed ?? (romOpponentX2 === idle ? [] : ["opponent" as const])) });
  const stateAt = stateFor(x2Input);
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView =>
    createBattleResolutionPresentationRenderView(stateAt(commandIndex, age) as never);
  const ageShift = opts.ageShift ?? 0;
  /** Command age of ROM rel a (ageShift: the age+1 control). */
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
  /** sar131Windows.ts `reference`: production's own frame without the status animation (effect dropped, opponent at its tracked rest, shadow shown). */
  const reference = (a: number) => {
    const view = viewAt(a);
    if (a + ageShift < 0) return draw({ ...view, effect: null });
    const rest = liveBattlerAnchors("opponent", view.fieldArt, x2Input).frontIdleRest;
    const opp = view.fieldArt.opponent;
    return draw({ ...view, effect: null, postBodyShadowHidden: false,
      fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
  };
  return { field, rows, battler, animation, x2Input, romOpponentX2, viewAt, draw, reference };
}
