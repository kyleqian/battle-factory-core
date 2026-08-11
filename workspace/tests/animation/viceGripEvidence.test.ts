import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  [
    "tools/compare/fixtures/vice-grip-player-crawdaunt-opponent-onix.json",
    "player-back",
    "9610089d5bb34fcf8c8d7397f6307b0f6ede10e2016a54fd11cd0c6aa7dea99d",
    "2b6d3fe452beee982ec6355e857e6407e60e90b182320d879a65f1f6e5f79631",
    "9241bca16953dcdb081b0b6ca645dd84f824740e855b637c7baf53601378851a",
  ],
  [
    "tools/compare/fixtures/vice-grip-opponent-crawdaunt-player-onix.json",
    "opponent-front",
    "f40729e448c4d2c2cea60afccb3eab7fe1aa1dea784ea93357e8f1a8fa2b99f4",
    "247f3004cb45594d30909fdd3f934e55baf4d2524e8ea4434d8ebda34526e6c0",
    "09282a7d0a66bd7c22421de15fc9f6d07c59ba46ce2bc88520df1fa44bc7e776",
  ],
] as const;

describe("MOVE_VICE_GRIP dense bilateral evidence", () => {
  it.each(fixtures)("pins %s", (path, orientation, evidence, raw, map) => {
    const fixture = JSON.parse(readFileSync(path, "utf8"));
    expect(fixture).toMatchObject({
      schema: "vice-grip-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "VICE_GRIP",
      orientation,
      sourceWindow: { startFrame: 212, endFrame: 253, frameCount: 42 },
      evidenceSha256: evidence,
      rawRgbSha256: raw,
      changeMapSha256: map,
      acceptance: {
        status: "exact",
        componentMatching: 42,
        framebufferMatching: 42,
      },
    });
    expect(
      createHash("sha256")
        .update(readFileSync(fixture.changeMap))
        .digest("hex"),
    ).toBe(map);
    const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
    expect(scenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      challengeNum: 1,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
  });

  it("keeps source, hardware, immutable battle fields, audio, raw RGB, and production framebuffer checks load-bearing", () => {
    const portable = readFileSync("tools/compare/viceGripPortable.ts", "utf8");
    for (const token of [
      "priorHardwareMatches",
      "priorHardwarePaletteMatches",
      "task counters",
      "registers.dispcnt",
      "AnimViceGripPincer",
      "subpriority",
      "animation-2 hitsplat",
      "AnimTask_ShakeMon2 tuple/state",
      "target-panned audio",
      "immutable",
      "rawReceipts",
      "change-map receipt",
      "framebufferDiff",
    ])
      expect(portable).toContain(token);
  });
});
