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
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";
import {
  createFactoryFullTurnBattleState,
  createFactoryFullTurnBattleStateFromRulesContext,
  submitFactoryFullTurnDecision,
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

  it("resolves the opponent's Sitrus heal under Scene OFF's HITMARKER_NO_ANIMATIONS, where no HELD_ITEM_EFFECT receipt exists", () => {
    // Soak signature 3 (docs/soak-crash-catalog.md §3): the live generated
    // route runs the whole battle with HITMARKER_NO_ANIMATIONS
    // (factoryBattleStart.ts:405-407), so Cmd_playanimation takes its
    // BattleScript_Pausex20 branch (battle_script_commands.c:4014-4018) and
    // the projector never sees a HELD_ITEM_EFFECT animation event. The print
    // owner must come from the message's own print-time scriptingBattler
    // (battle_util.c:3604-3606, read by battle_message.c:2450), not from the
    // animation receipt. Runs the REAL full-turn kernel: player Tackle drops
    // the Sitrus-holding trainer below half, the end-turn ITEMEFFECT_NORMAL
    // pass procs the berry, and the resolution projector must produce the
    // opponent-owned heal lines.
    const ITEM_SITRUS_BERRY = 142;
    const MOVE_TACKLE = 33;
    const battlerBase = {
      moveId: MOVE_TACKLE,
      moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
      pp: [35, 35, 35, 35] as const,
      ability: 0,
      item: 0,
      friendship: 0,
      attack: 60,
      defense: 60,
      spAttack: 60,
      spDefense: 60,
      hp: 200,
      maxHp: 200,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    };
    for (let seed = 1; seed <= 40; seed += 1) {
      const initial = createFactoryFullTurnBattleState({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...battlerBase, species: 12, speed: 120 }),
        trainer: Object.freeze({
          ...battlerBase,
          species: 198, // MURKROW
          item: ITEM_SITRUS_BERRY,
          hp: 105,
          speed: 60,
        }),
      });
      // Re-enter the same kernel state with the Scene-OFF whole-battle
      // hitmarker the production factory battle start sets.
      const offInitial = createFactoryFullTurnBattleStateFromRulesContext({
        requestId: 1,
        rngSeed: seed,
        rulesContext: Object.freeze({
          ...initial.rules.rulesContext,
          hitMarker: (initial.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0,
        }),
      });
      if (offInitial.boundary.kind !== "decision-required") throw new Error("expected the player's command boundary");
      const decision = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });
      const afterPlayer = submitFactoryFullTurnDecision(offInitial, {
        requestId: 1,
        side: "player",
        decision,
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command boundary");
      const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2,
        side: "trainer",
        decision: Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const }),
      });
      const healEvent = transition.events.find(({ payload }) =>
        payload.kind === "message" && payload.messageId === "STRINGID_PKMNSITEMRESTOREDHEALTH"
      );
      if (healEvent === undefined) continue; // miss/RNG seed -- try the next one
      expect(transition.events.find(({ payload }) =>
        payload.kind === "animation" && payload.animationId === "HELD_ITEM_EFFECT"
      )).toBeUndefined();
      expect(healEvent.payload).toMatchObject({ scriptingBattler: 1 });

      const command = createBattleCommandPresentation(
        offInitial.boundary.request as never,
        offInitial.rules.rulesContext,
        0,
      );
      const resolution = createBattleResolutionPresentation({
        sourceRequest: offInitial.boundary.request as never,
        sourceDecision: decision,
        beforeRules: offInitial.rules,
        transition,
        fieldBoundary: command.field,
        confirmHandoff: {
          fightDisplayCursor: command.fightDisplayCursor,
          idleBounceElapsed: command.idleBounceElapsed,
        },
        opponentTrainer: null,
      });
      const heal = resolution.segments
        .flatMap((segment) => segment.commands)
        .find((candidate) =>
          candidate.type === "message" && candidate.eventSequence === healEvent.sequence
        );
      expect(heal).toMatchObject({
        type: "message",
        lines: [`Foe ${command.field.opponent.name}’s SITRUS BERRY`, "restored health!"],
      });
      return;
    }
    throw new Error("no seed in 1..40 produced STRINGID_PKMNSITEMRESTOREDHEALTH");
  });
});
