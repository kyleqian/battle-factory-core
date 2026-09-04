import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type Scenario = {
  overrides: { parties: { player: Array<{ species: number; moves: number[] }>; opponent: Array<{ species: number; moves: number[] }> } };
  trace: { segments: Array<{ buttons: string[] }> };
};

describe("MOVE_ROAR dense evidence fixtures", () => {
  it("pins complete legal parties and the asymmetric real-set/controller contract", () => {
    const player = JSON.parse(readFileSync(
      "tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json", "utf8",
    )) as Scenario;
    const opponent = JSON.parse(readFileSync(
      "tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json", "utf8",
    )) as Scenario;
    for (const scenario of [player, opponent]) {
      for (const party of Object.values(scenario.overrides.parties)) {
        expect(party).toHaveLength(3);
      }
    }
    expect(player.overrides.parties.player[0]).toMatchObject({
      species: 228, moves: [242, 52, 46, 182],
    });
    expect(player.overrides.parties.opponent.some((mon) => mon.species === 228)).toBe(false);
    expect(player.trace.segments.map((segment) => segment.buttons)).toContainEqual(["DOWN"]);
    expect(opponent.overrides.parties.opponent[0]).toMatchObject({
      species: 228, moves: [46, 46, 46, 46],
    });
    expect(opponent.overrides.parties.player.some((mon) => mon.species === 228)).toBe(false);
  });

  it("pins the exact portable receipt and production seam inputs", () => {
    const receipts = [
      {
        path: "tools/compare/fixtures/roar-player-houndour-opponent-onix.json",
        frames: 99,
        evidence: "cec50726a292d511a1a8317a501a60256c1932c9bb0b4ec42e026ef43b688aa1",
        raw: "0a90faea42c2ccf0886c633ec5234ad867aa54df51193c7a04e56cec21174899",
      },
      {
        path: "tools/compare/fixtures/roar-opponent-houndour-player-onix.json",
        frames: 104,
        evidence: "d7b5ddc1dea422802dbb466b050e7830259e891eb0acf5323530c4be3e1b4da8",
        raw: "727e277d1fae2dbb76b10948497badd0390c4a1b206719218cfcd3a8d1a0002a",
      },
    ] as const;
    for (const receipt of receipts) {
      const fixture = JSON.parse(readFileSync(receipt.path, "utf8"));
      expect(fixture.schema).toBe("roar-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(receipt.frames);
      expect(fixture.evidenceSha256).toBe(receipt.evidence);
      expect(fixture.rawRgbSha256).toBe(receipt.raw);
      expect(fixture.attacker.species).toBe("HOUNDOUR");
      expect(fixture.target.species).toBe("ONIX");
      expect(fixture.appStage.presentationAge).toBe(0);
    }
  });

  it("normalizes only Roar's asserted-empty compact Python transport field", () => {
    const fresh = {
      schema: "noise-line-roar-effect-test",
      setup: {
        preCheckpointCaptures: [],
        name: "\u00e9",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"noise-line-roar-effect-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });

  it("ratchets only the independently receipted noise-line Roar track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    for (const move of ["MOVE_HOWL", "MOVE_ROAR"]) {
      expect(coverage.entries.find((entry: { move: string }) =>
        entry.move === move)).toMatchObject({ status: "exact" });
    }
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "noise-line-roar-effect")).toMatchObject({
      components: [
        "asset:ANIM_TAG_NOISE_LINE",
        "sprite:gRoarNoiseLineSpriteTemplate",
        "subroutine:RoarEffect",
        "task:AnimTask_DeepInhale",
        "task:SoundTask_PlayCryHighPitch",
      ],
      representatives: ["MOVE_HOWL", "MOVE_ROAR"],
      fulfilled: true,
    });
  });
});
