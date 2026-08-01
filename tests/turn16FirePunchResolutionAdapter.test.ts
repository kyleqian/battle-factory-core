import { describe, expect, it } from "vitest";
import { CANONICAL_FIRE_PUNCH_RESOLUTION } from "../src/engine/turn16FirePunchResolutionAdapter.ts";

describe("Turn-16 typed FIRE_PUNCH presentation bridge", () => {
  it("owns the faster opponent hit, player hit, burn icon receipt, residual, PP, and next command", () => {
    const adapter = CANONICAL_FIRE_PUNCH_RESOLUTION;
    expect(adapter.resolution.segments).toHaveLength(1);
    expect(adapter.resolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", side: "player", battler: 0, requestId: 7 },
    });
    expect(adapter.faintAttackLines).toEqual(["Foe MURKROW used", "FAINT ATTACK!"]);
    expect(adapter.firePunchLines).toEqual(["MAGBY used", "FIRE PUNCH!"]);
    expect(adapter.playerHp).toEqual({ from: 138, to: 79 });
    expect(adapter.opponentHitHp).toEqual({ from: 142, to: 75 });
    expect(adapter.burnedLines).toEqual(["Foe MURKROW was burned!"]);
    expect(adapter.opponentStatus1).toBe(1 << 4);
    expect(adapter.residualLines).toEqual(["Foe MURKROW is hurt", "by its burn!"]);
    expect(adapter.opponentResidualHp).toEqual({ from: 75, to: 58 });
    expect(adapter.playerPp).toEqual([14, 20, 10, 20]);

    const commands = adapter.commands;
    const rawStatus = commands.findIndex((command) => command.type === "status");
    const burned = commands.findIndex((command) =>
      command.type === "message" && command.lines === adapter.burnedLines
    );
    const icon = commands.findIndex((command) => command.type === "status-icon");
    const residual = commands.findIndex((command) =>
      command.type === "message" && command.lines === adapter.residualLines
    );
    expect(rawStatus).toBeGreaterThanOrEqual(0);
    expect(burned).toBeGreaterThan(rawStatus);
    expect(icon).toBeGreaterThan(burned);
    expect(residual).toBeGreaterThan(icon);
    expect(Object.isFrozen(adapter.resolution)).toBe(true);
    expect(Object.isFrozen(adapter.resolution.segments)).toBe(true);
  });
});
