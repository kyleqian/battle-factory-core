import { describe, expect, it } from "vitest";
import {
  NO_MOVES_BOUNCE_STOP_AFTER,
  NO_MOVES_DISMISS_HOLD_FRAMES,
  NO_MOVES_MESSAGE_FIRST_GLYPH_AT,
  NO_MOVES_MESSAGE_HOLD_AT,
  advanceBattleCommandPresentation,
  createBattleCommandPresentation,
  type BattleCommandPresentationState,
} from "../src/engine/battleCommandPresentation.ts";
import { createBattleCommandPresentationRenderView } from "../src/engine/battleCommandPresentationRender.ts";
import type { BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { battleScriptForcedMoveSelection } from "../src/engine/battleScriptActionAdmission.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import { resolveNoMovesLeftMessageLines } from "../src/engine/battleResolutionPresentation.ts";
import { createFactoryFullTurnBattleState } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// enc276 (docs/enc276-forced-turn-no-menu.md): on a forced turn FIGHT confirms the forced action with no move menu.
const SPLASH = 150;
const TACKLE = 33;

function mon(moves: readonly [number, number, number, number], pp: readonly [number, number, number, number]) {
  return {
    species: 19,
    personality: 0,
    moveId: moves[0],
    moves,
    pp,
    attack: 80,
    defense: 60,
    spAttack: 50,
    spDefense: 60,
    speed: 90,
    hp: 100,
    maxHp: 100,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  };
}

function boundary(playerPp: readonly [number, number, number, number]) {
  const state = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 7,
    player: mon([SPLASH, SPLASH, SPLASH, SPLASH], playerPp),
    trainer: mon([TACKLE, TACKLE, TACKLE, TACKLE], [20, 20, 20, 20]),
  });
  if (state.boundary.kind !== "decision-required" || state.boundary.request.kind !== "command") {
    throw new Error("no command request");
  }
  return { request: state.boundary.request as BattleCommandRequest, rules: state.rules.rulesContext as BattleScriptRulesContext };
}

function encoredBoundary() {
  const { request, rules } = boundary([20, 20, 20, 20]);
  const player = { ...rules.battlers[0]!, encoredMove: SPLASH, encoredMovePos: 0, encoreTimer: 3 };
  const encoredRules = { ...rules, battlers: rules.battlers.map((b, i) => (i === 0 ? player : b)) } as BattleScriptRulesContext;
  const legalDecisions = request.legalDecisions.filter((d) => d.kind !== "use-move" || d.moveSlot === 0);
  return { request: { ...request, legalDecisions } as BattleCommandRequest, rules: encoredRules };
}

function step(state: BattleCommandPresentationState, keys: readonly ("A" | "B")[] = []) {
  return advanceBattleCommandPresentation(state, new Set(keys));
}

function toActionMenu(state: BattleCommandPresentationState) {
  let next = state;
  for (let i = 0; i < 60 && next.lifecycle.phase !== "action-menu"; i += 1) next = step(next);
  expect(next.lifecycle.phase).toBe("action-menu");
  return next;
}

describe("enc276: a forced turn goes from FIGHT straight into the turn", () => {
  it("a normal turn still opens the move menu", () => {
    const { request, rules } = boundary([20, 20, 20, 20]);
    expect(battleScriptForcedMoveSelection(rules, 0)).toBeNull();
    const state = createBattleCommandPresentation(request, rules);
    expect(state.forcedMove).toBeNull();
    expect(step(toActionMenu(state), ["A"]).lifecycle.phase).toBe("fight-opening");
  });

  it("Encore: the FIGHT press submits the Encored move, no fight-menu phase", () => {
    const { request, rules } = encoredBoundary();
    expect(battleScriptForcedMoveSelection(rules, 0)).toBe("encore");
    const state = createBattleCommandPresentation(request, rules);
    expect(state.forcedMove?.kind).toBe("encore");
    const pressed = step(toActionMenu(state), ["A"]);
    expect(pressed.lifecycle.phase).toBe("submitting");
    expect(pressed.pendingDecision).toBe(state.forcedMove!.decision);
    expect(pressed.pendingDecision).toMatchObject({ kind: "use-move", moveSlot: 0 });
  });

  it("Struggle: FIGHT prints 'has no moves left!', the dismissing A (after the hold) submits Struggle, no fight-menu phase", () => {
    const { request, rules } = boundary([0, 0, 0, 0]);
    expect(battleScriptForcedMoveSelection(rules, 0)).toBe("struggle");
    const state = createBattleCommandPresentation(request, rules);
    expect(state.forcedMove?.kind).toBe("struggle");
    const phases = new Set<string>();
    let next = step(toActionMenu(state), ["A"]);
    phases.add(next.lifecycle.phase);
    expect(next.lifecycle.phase).toBe("no-moves-message");
    // An early A is ignored until the wait arrow is up (HOLD_AT).
    for (let i = 1; i < NO_MOVES_MESSAGE_HOLD_AT; i += 1) {
      next = step(next, i % 5 === 0 ? ["A"] : []);
      phases.add(next.lifecycle.phase);
      expect(next.lifecycle.phase).toBe("no-moves-message");
    }
    next = step(next, ["A"]);
    expect(next.lifecycle.phase).toBe("submitting");
    expect(next.pendingDecision).toBe(state.forcedMove!.decision);
    expect(next.forcedMove?.dismissedWaitCursorAge).toBeTypeOf("number");
    phases.add(next.lifecycle.phase);
    expect([...phases].some((phase) => phase.startsWith("fight"))).toBe(false);
  });

  it("Struggle message: the box lines and the glyph / hold schedule", () => {
    const { request, rules } = boundary([0, 0, 0, 0]);
    const state = createBattleCommandPresentation(request, rules);
    expect(resolveNoMovesLeftMessageLines(state.field, 0).join(" ")).toMatch(/has no\s+moves left!/);
    expect(NO_MOVES_MESSAGE_FIRST_GLYPH_AT).toBeLessThan(NO_MOVES_MESSAGE_HOLD_AT);
    expect(NO_MOVES_BOUNCE_STOP_AFTER).toBeLessThan(NO_MOVES_DISMISS_HOLD_FRAMES);
    let next = step(toActionMenu(state), ["A"]);
    for (let i = 0; i < NO_MOVES_MESSAGE_HOLD_AT - 1; i += 1) next = step(next);
    const view = createBattleCommandPresentationRenderView(next);
    expect(view).not.toBeNull();
  });

  it("Scene ON and OFF share the forced flow (the command seam has no scene input)", () => {
    const a = boundary([0, 0, 0, 0]);
    const b = boundary([0, 0, 0, 0]);
    const run = (input: ReturnType<typeof boundary>) => {
      let next = step(toActionMenu(createBattleCommandPresentation(input.request, input.rules)), ["A"]);
      const trace: string[] = [next.lifecycle.phase];
      for (let i = 0; i < NO_MOVES_MESSAGE_HOLD_AT; i += 1) {
        next = step(next, i === NO_MOVES_MESSAGE_HOLD_AT - 1 ? ["A"] : []);
        trace.push(next.lifecycle.phase);
      }
      return trace;
    };
    expect(run(a)).toEqual(run(b));
  });
});
