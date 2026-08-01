import { describe, expect, it } from "vitest";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import type {
  BattleDecisionTransitionResult,
  BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createBattleResolutionPresentation,
} from "../src/engine/battleResolutionPresentation.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { runBattleScriptFaintedActionsOrchestration } from "../src/engine/battleScriptFaintedActionsOrchestration.ts";
import {
  createFactoryFullTurnBattleStateFromRulesContext,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { stageTurn5KoHitChainToTerminalMachineState } from "../src/engine/turn5ResolutionAdapter.ts";

describe("generated resolution held-item message ownership", () => {
  it("projects the live Sitrus receipt with the typed held-item-effect battler as B_SCR_ACTIVE_NAME_WITH_PREFIX", () => {
    const staged = stageTurn5KoHitChainToTerminalMachineState();
    const fainted = runBattleScriptFaintedActionsOrchestration(
      staged.program,
      staged.handlers,
      staged.state,
    );
    if (fainted.kind !== "resumed") throw new Error(`expected resumed, got ${fainted.kind}`);
    const ended = runBattleEndTurnOrchestration(
      staged.program,
      staged.handlers,
      fainted.state,
    );
    if (ended.kind !== "next-turn") throw new Error(`expected next-turn, got ${ended.kind}`);

    const source = createFactoryFullTurnBattleStateFromRulesContext({
      requestId: 63,
      rngSeed: fainted.state.rng.value,
      rulesContext: fainted.state.rulesContext,
    });
    if (
      source.boundary.kind !== "decision-required"
      || source.boundary.request.kind !== "command"
    ) throw new Error("expected player command source boundary");
    const decision = source.boundary.request.legalDecisions.find(
      (candidate) => candidate.kind === "use-move",
    );
    if (decision?.kind !== "use-move") throw new Error("expected a legal source move");

    const events = ended.state.events
      .slice(fainted.state.events.length)
      .map((event): BattleKernelSemanticEvent => {
        const { sequence, provenance, ...payload } = event;
        return Object.freeze({ sequence, provenance, payload: Object.freeze(payload) });
      });
    const afterRules = Object.freeze({
      ...source.rules,
      rulesContext: ended.state.rulesContext,
    }) as FactoryFullTurnDecisionRules;
    const transition = Object.freeze({
      kind: "decision-required" as const,
      state: Object.freeze({
        ...source,
        revision: source.revision + 1,
        nextEventSequence: (events.at(-1)?.sequence ?? 0) + 1,
        rules: afterRules,
      }),
      events: Object.freeze(events),
      nextRequest: source.boundary.request,
    }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
    const command = createBattleCommandPresentation(
      source.boundary.request,
      source.rules.rulesContext,
      decision.moveSlot,
    );

    const resolution = createBattleResolutionPresentation({
      sourceRequest: source.boundary.request,
      sourceDecision: decision,
      beforeRules: source.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: decision.moveSlot,
        idleBounceElapsed: 0,
      },
    });
    const heldItemEffect = events.find(({ payload }) =>
      payload.kind === "animation" && payload.animationId === "HELD_ITEM_EFFECT"
    );
    const heal = resolution.segments[0]!.commands.find((candidate) =>
      candidate.type === "message"
      && candidate.eventSequence === heldItemEffect!.sequence + 1
    );

    expect(heldItemEffect?.payload).toMatchObject({ battler: 0 });
    expect(heal).toMatchObject({
      type: "message",
      lines: ["ONIX’s SITRUS BERRY", "restored health!"],
    });
  });
});
