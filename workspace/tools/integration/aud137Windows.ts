// aud137 (docs/aud137-live-audit-28.md): the production state of one aud137 ROM window, for ANY of the nine Scene ON status
// animations. sae135Windows.ts / sad133Windows.ts's construction, unchanged, over aud137's own scenarios / rom-windows.json:
//   [previous message (automatic, printed), <status> (FRZ inflicted only: ROM E 115, sad133FreezeInflicted's rule),
//    status-animation {battler, animation, minimumFrames = STATUS_ANIMATION_ADDED_ROWS}, next message]
// rendered at ROM rel a with status-animation command age a (rel 0 = the first gAnimScriptActive row) through production's
// createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (Scene ON). The x2 input is the ROM's own opponent rest
// on row rel -1 (`zeroed` = ["opponent"] when the ROM shows it at 0 where the species' idle rest is not 0); a ROM x2 that is neither is
// reported (`x2Unexplained`), not fitted. Read-only use of production.
import { readFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

export const AUD137 = "tools/integration/fixtures/aud137";
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
type Animation = keyof typeof STATUS_ANIMATION_ADDED_ROWS;

export type Aud137RomWindow = {
  scenario: string; animation: Animation; side: "player" | "opponent"; battler: 0 | 1; E: number; rise: number;
  rows: { rel: number; bat: number[]; other: number[] }[];
};

export const aud137FreezeInflicted = (w: Aud137RomWindow) => w.animation === "FRZ" && w.E === 115;

/** `castformForm`: the window battler's displayed CASTFORM weather form (aud137Forms.py, from the ROM's General_CastformChange). */
export function aud137Window(
  win: Aud137RomWindow, scenariosDir = `${AUD137}/scenarios`, opts: { zeroed?: readonly ("player" | "opponent")[]; castformForm?: number } = {},
) {
  const scenario = JSON.parse(readFileSync(`${scenariosDir}/${win.scenario}`, "utf8"));
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: (mon.gender ?? "male") as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  // production's live form input (battleResolutionPresentationRender.ts liveCastformFormsAt / withLiveCastformForms): [player, opponent]
  const forms = opts.castformForm === undefined ? undefined
    : Object.freeze(win.battler === 0 ? [opts.castformForm, 0] as const : [0, opts.castformForm] as const);
  const animation = win.animation;
  const rows = STATUS_ANIMATION_ADDED_ROWS[animation];
  const battler = win.battler;
  const inflicted = aud137FreezeInflicted(win);
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const status = Object.freeze({ type: "status", eventSequence: 2, battler, before: 0, after: 0x20, timing: { minimumFrames: 1 } });
  const command = Object.freeze({ type: "status-animation", eventSequence: 3, battler, animation, timing: { minimumFrames: rows } });
  const commands = [message(1, ["PREVIOUS", "MESSAGE"]), ...(inflicted ? [status] : []), command, message(4, ["NEXT", "MESSAGE"])];
  const at = inflicted ? 2 : 1;
  const stateFor = (x2Input: { zeroed: readonly ("player" | "opponent")[] }) => (commandIndex: number, age: number) => ({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveMoveBattlerX2Input: x2Input,
    ...(forms === undefined ? {} : { liveCastformForms: forms }),
  });
  const before = win.rows.find((r) => r.rel === -1);
  const romOpponentX2 = before === undefined ? null : win.side === "opponent" ? before.bat[2]! : before.other[2]!;
  const probe = createBattleResolutionPresentationRenderView(stateFor({ zeroed: [] })(at, 0) as never);
  const idle = liveBattlerAnchors("opponent", probe.fieldArt, { zeroed: [] }).frontIdleRest.x2;
  const x2Unexplained = opts.zeroed === undefined && romOpponentX2 !== idle && romOpponentX2 !== 0;
  const x2Input = Object.freeze({ zeroed: Object.freeze(opts.zeroed ?? (romOpponentX2 === idle ? [] : ["opponent" as const])) });
  const stateAt = stateFor(x2Input);
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView =>
    createBattleResolutionPresentationRenderView(stateAt(commandIndex, age) as never);
  const viewAt = (age: number) => {
    if (age < 0) return viewOf(at - 1, inflicted ? 0 : 200);
    if (age < rows) return viewOf(at, age);
    return viewOf(at + 1, age - rows);
  };
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  /** Production's own frame without the status animation (effect dropped, opponent at its tracked rest, shadow shown). */
  const reference = (a: number) => {
    const view = viewAt(a);
    if (a < 0) return draw({ ...view, effect: null });
    const rest = liveBattlerAnchors("opponent", view.fieldArt, x2Input).frontIdleRest;
    const opp = view.fieldArt.opponent;
    return draw({ ...view, effect: null, postBodyShadowHidden: false,
      fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
  };
  return { field, rows, battler, animation, inflicted, x2Input, romOpponentX2, idle, x2Unexplained, viewAt, draw, reference };
}
