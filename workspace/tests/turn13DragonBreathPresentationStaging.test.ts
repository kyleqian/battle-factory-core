import { describe, expect, it } from "vitest";
import {
  resolveTurn13DragonBreathFaintLines,
  resolveTurn13DragonBreathHpEndpoints,
  resolveTurn13DragonBreathKickoffLines,
  resolveTurn13DragonBreathWindowContent,
  stageTurn13DragonBreathHitChain,
  turn13DragonBreathHasParalysisStatusChange,
} from "../src/engine/turn13DragonBreathPresentationStaging.ts";

describe("turn13DragonBreathPresentationStaging", () => {
  it("replays the four real Dragon Breath RNG draws and computes the canonical 16 -> 0 KO", () => {
    const staged = stageTurn13DragonBreathHitChain();
    expect(staged.rngValueAfter).toBe(2653573252);
    expect(staged.target.hp).toBe(0);
    expect(resolveTurn13DragonBreathHpEndpoints()).toEqual({ from: 16, to: 0 });
  });

  it("bridges the used-move, HP-zero, and faint content by source provenance", () => {
    expect(resolveTurn13DragonBreathWindowContent()).toEqual({
      damage: {
        message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
        hp: { battler: 1, from: 16, to: 0 },
      },
      faint: {
        faintedBattler: 1,
        message: {
          messageId: "STRINGID_TARGETFAINTED",
          substitutions: [],
        },
      },
    });
  });

  it("resolves the rendered lines without turn-keyed text literals", () => {
    expect(resolveTurn13DragonBreathKickoffLines()).toEqual([
      "ONIX used",
      "DRAGONBREATH!",
    ]);
    expect(resolveTurn13DragonBreathFaintLines()).toEqual([
      "Foe PIDGEOTTO",
      "fainted!",
    ]);
  });

  it("emits health-bar and faint-animation receipts; the only status receipt is faint cleanup, not paralysis", () => {
    const staged = stageTurn13DragonBreathHitChain();
    expect(staged.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "health-bar-update",
        battler: 1,
        healthValue: expect.any(Number),
      }),
      expect.objectContaining({ kind: "faint-animation", battler: 1 }),
    ]));
    expect(staged.events.filter(
      (event) => event.kind === "set-battler-status-data",
    )).toEqual([
      expect.objectContaining({
        kind: "set-battler-status-data",
        battler: 1,
        status1: 0,
        provenance: expect.objectContaining({
          sourceLabel: "BattleScript_FaintTarget",
        }),
      }),
    ]);
    expect(turn13DragonBreathHasParalysisStatusChange(staged)).toBe(false);
  });
});
