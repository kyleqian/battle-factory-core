import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import receipt from "../../tools/compare/fixtures/ancient-power-dense-evidence.json" with { type: "json" };

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

describe("MOVE_ANCIENT_POWER dense Scene-ON evidence checkpoint", () => {
  it("pins the numeric carrier and source record independently of fixture labels", () => {
    expect(receipt.status).toBe("unsupported-staged");
    expect(receipt.source).toMatchObject({ moveId: 246, carrierSetId: 75, carrierSpeciesId: 318, carrierLabel: "FRONTIER_MON_BALTOY", completePartyRecords: true });
    expect(frontierMons.entries.find(({ index }) => index === 75)).toMatchObject({
      index: 75,
      label: "FRONTIER_MON_BALTOY",
      species: "SPECIES_BALTOY",
      moves: ["MOVE_PSYBEAM", "MOVE_ANCIENT_POWER", "MOVE_LIGHT_SCREEN", "MOVE_MUD_SLAP"],
      itemTableId: 7,
      nature: "NATURE_NAUGHTY",
    });
  });

  it.each(["player-back", "opponent-front"] as const)("retains the full 128-row state receipt for %s", (orientation) => {
    const row = receipt.orientations[orientation];
    const compressed = readFileSync(row.stateGzip);
    expect(sha256(compressed)).toBe(row.stateGzipSha256);
    const probe = JSON.parse(gunzipSync(compressed).toString("utf8"));
    expect(probe.schema).toBe("ancient-power-dense-evidence/v1");
    expect(probe.sourceWindow).toEqual(receipt.source.sourceWindow);
    expect(probe.frames).toHaveLength(128);
    expect(probe.frames[0].frame).toBe(225);
    expect(probe.frames.at(-1)).toMatchObject({ frame: 352, gAnimScriptActive: false });
    expect(probe.frames.every((frame: { parties: { player: unknown[]; opponent: unknown[] } }) =>
      frame.parties.player.length === 3 && frame.parties.opponent.length === 3,
    )).toBe(true);
    const carrierParty = orientation === "player-back" ? probe.frames[0].parties.player : probe.frames[0].parties.opponent;
    expect(carrierParty[0]).toMatchObject({ species: 318, level: 50, nature: 4, moves: [246, 246, 246, 246], item: 140, abilitySlot: 0, friendship: 70, gender: "genderless", shiny: false });
    expect(probe.topology.tasks).toEqual(expect.arrayContaining(receipt.topology.tasks));
    expect(probe.topology.templates).toEqual(expect.arrayContaining(receipt.topology.moveSprites));
    expect(probe.frames.some((frame: { scriptOffset: number }) => frame.scriptOffset === 151)).toBe(true);
    expect(probe.frames.some((frame: { scriptOffset: number }) => frame.scriptOffset === 277)).toBe(true);
  });
});
