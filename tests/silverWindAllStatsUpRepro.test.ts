import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * Repro for docs/silverwind-allstatsup-crash-scout.md: BUTTERFREE's SILVER
 * WIND secondary (10% MOVE_EFFECT_ALL_STATS_UP proc, MOVE_EFFECT_AFFECTS_USER)
 * emits a real STRINGID_ATTACKERSSTATROSE message event from the production
 * kernel. battleResolutionPresentation.ts's messageLines now has the
 * ATTACKER-variant branch mirroring STRINGID_DEFENDERSSTATROSE/FELL, so this
 * no longer throws.
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 13,
  player: Object.freeze({
    species: 12, // BUTTERFREE
    moveId: 318, // SILVER_WIND
    moves: [318, 0, 0, 0] as const,
    pp: [5, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 45,
    defense: 50,
    spAttack: 90,
    spDefense: 80,
    speed: 70,
    hp: 120,
    maxHp: 120,
    types: ["TYPE_BUG", "TYPE_FLYING"] as const,
  }),
  trainer: Object.freeze({
    species: 19, // RATTATA
    moveId: 33, // TACKLE
    moves: [33, 0, 0, 0] as const,
    pp: [35, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 56,
    defense: 35,
    spAttack: 25,
    spDefense: 35,
    speed: 72,
    hp: 100,
    maxHp: 100,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  }),
});

describe("Silver Wind All-Stats-Up ATTACKERSSTATROSE presentation crash", () => {
  it(
    "the production resolution presentation resolves BUTTERFREE's proc'd SILVER_WIND into five ordered stat banners (docs/silverwind-allstatsup-crash-scout.md)",
    () => {
      const initial = createFactoryFullTurnBattleState(SCENARIO);
      if (initial.boundary.kind !== "decision-required") {
        throw new Error("expected the player's command boundary");
      }
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      });
      if (afterPlayer.kind !== "decision-required") {
        throw new Error("expected the trainer's command boundary");
      }
      const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      });

      // Confirm the kernel itself ran the proc correctly (five real ATK/DEF/
      // SPEED/SPATK/SPDEF stat rises, all reported via STRINGID_ATTACKERSSTATROSE)
      // before handing off to presentation -- the crash was downstream, not here.
      const messageIds = transition.events
        .filter((event) => event.payload.kind === "message")
        .map((event) => (event.payload as { messageId: string }).messageId);
      expect(messageIds.filter((id) => id === "STRINGID_ATTACKERSSTATROSE")).toHaveLength(5);
      expect(initial.rules.rulesContext.battlers[0]!.statStages.slice(1, 6)).toEqual([6, 6, 6, 6, 6]);

      const command = createBattleCommandPresentation(
        initial.boundary.request as BattleCommandRequest,
        initial.rules.rulesContext,
        0,
      );

      // Used to throw: "battleStringResolver: STRINGID_ATTACKERSSTATROSE
      // references placeholder {B_BUFF1} with no resolver supplied"
      // (src/engine/battleStringResolver.ts:144), reached via messageLines
      // (battleResolutionPresentation.ts:594), the production presentation
      // path wired into the live render path. Now resolves cleanly.
      const resolution = createBattleResolutionPresentation({
        sourceRequest: initial.boundary.request as BattleCommandRequest,
        sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        beforeRules: initial.rules,
        transition,
        fieldBoundary: command.field,
        confirmHandoff: {
          fightDisplayCursor: command.fightDisplayCursor,
          idleBounceElapsed: command.idleBounceElapsed,
        },
        opponentTrainer: null,
      });

      const commands = resolution.segments.flatMap((segment) => segment.commands);
      const statCommands = commands.filter(
        (cmd): cmd is Extract<typeof cmd, { type: "stat" }> => cmd.type === "stat",
      );
      expect(statCommands.map((cmd) => ({ battler: cmd.battler, stat: cmd.stat, from: cmd.from, to: cmd.to })))
        .toEqual([
          { battler: 0, stat: "attack", from: 6, to: 7 },
          { battler: 0, stat: "defense", from: 6, to: 7 },
          { battler: 0, stat: "speed", from: 6, to: 7 },
          { battler: 0, stat: "special-attack", from: 6, to: 7 },
          { battler: 0, stat: "special-defense", from: 6, to: 7 },
        ]);

      const messageLinesInOrder = commands
        .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
        .map((cmd) => cmd.lines)
        .filter((lines) => lines.some((line) => line.includes("rose!")));
      expect(messageLinesInOrder).toEqual([
        ["BUTTERFREE’s attack", "rose!"],
        ["BUTTERFREE’s defense", "rose!"],
        ["BUTTERFREE’s speed", "rose!"],
        ["BUTTERFREE’s special-attack", "rose!"],
        ["BUTTERFREE’s special-defense", "rose!"],
      ]);
    },
  );
});
