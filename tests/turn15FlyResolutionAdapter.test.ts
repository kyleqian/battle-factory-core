import { describe, expect, it } from "vitest";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";

describe("Turn-14/15 typed FLY presentation bridge", () => {
  it("owns charge, airborne miss, locked strike, faint, and forced request across the real intervening player request", () => {
    const adapter = CANONICAL_OPPONENT_FLY_RESOLUTION;
    expect(adapter.chargeResolution.segments).toHaveLength(1);
    expect(adapter.strikeResolution.segments).toHaveLength(2);
    expect(adapter.strikeResolution.resolutionId)
      .toBe(adapter.chargeResolution.resolutionId);
    expect(adapter.strikeResolution.segments[0])
      .toBe(adapter.chargeResolution.segments[0]);
    expect(Object.isFrozen(adapter.strikeResolution.segments)).toBe(true);
    expect(adapter.chargeResolution.pendingBoundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", side: "player", requestId: 3 },
    });
    expect(adapter.chargeCommands).toContainEqual(expect.objectContaining({
      type: "message",
      lines: ["Foe MURKROW flew", "up high!"],
    }));
    expect(adapter.chargeCommands).toContainEqual(expect.objectContaining({
      type: "sprite-visibility",
      battler: 1,
      visible: false,
    }));
    expect(adapter.chargeCommands).toContainEqual(expect.objectContaining({
      type: "message",
      lines: ["ONIX’s", "attack missed!"],
    }));
    expect(
      adapter.chargeResolution.segments[0]!.afterRules.rulesContext
        .battlers[0]!.pp[2],
    ).toBe(17);

    const strikeText = adapter.strikeCommands.findIndex((command) =>
      command.type === "message"
      && command.lines[0] === "Foe MURKROW used"
      && command.lines[1] === "FLY!"
    );
    const restored = adapter.strikeCommands.findIndex((command) =>
      command.type === "sprite-visibility"
      && command.battler === 1
      && command.visible
    );
    expect(strikeText).toBeGreaterThanOrEqual(0);
    expect(restored).toBeGreaterThan(strikeText);
    expect(adapter.strikeCommands).toContainEqual(expect.objectContaining({
      type: "hp",
      battler: 0,
      from: 4,
      to: 0,
    }));
    expect(adapter.strikeCommands).toContainEqual(expect.objectContaining({
      type: "faint",
      battler: 0,
    }));
    expect(adapter.strikeCommands).toContainEqual(expect.objectContaining({
      type: "message",
      lines: ["ONIX", "fainted!"],
      advance: "button",
    }));
    expect(adapter.forcedRequest).toEqual({
      kind: "forced-switch",
      requestId: 4,
      side: "player",
      battler: 0,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1, 2],
    });
    expect(adapter.strikeResolution.pendingBoundary).toEqual({
      kind: "decision-required",
      request: adapter.forcedRequest,
    });
    expect(adapter.chargeLines).toEqual(["Foe MURKROW flew", "up high!"]);
    expect(adapter.missLines).toEqual(["ONIX’s", "attack missed!"]);
    expect(adapter.strikeLines).toEqual(["Foe MURKROW used", "FLY!"]);
    expect(adapter.faintLines).toEqual(["ONIX", "fainted!"]);
    expect(adapter.hp).toEqual({ from: 4, to: 0 });
  });
});
