import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/ancient-power-dense-evidence.json" with { type: "json" };

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const read = (path: string): string => readFileSync(path, "utf8");
const species = read("reference/pokeemerald/include/constants/species.h");
const frontierIds = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const probeSource = read("tools/compare/ancientPowerProbe.py");
const baltoyStart = frontierMons.indexOf("[FRONTIER_MON_BALTOY] = {");
const baltoyEnd = frontierMons.indexOf("[FRONTIER_MON_SNORUNT] = {", baltoyStart);
const baltoySourceBlock = frontierMons.slice(baltoyStart, baltoyEnd);

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const expectedCarrier = {
  species: 318,
  level: 50,
  nature: 4,
  ivs: { hp: 31, attack: 31, defense: 31, speed: 0, spAttack: 31, spDefense: 31 },
  evs: { hp: 4, attack: 252, defense: 0, speed: 0, spAttack: 252, spDefense: 0 },
  moves: [246, 246, 246, 246],
  ppUps: [0, 0, 0, 0],
  item: 140,
  abilitySlot: 0,
  friendship: 70,
  gender: "genderless",
  shiny: false,
};

function expectCompleteRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_ANCIENT_POWER dense Scene-ON evidence checkpoint", () => {
  it("reads the authoritative Baltoy identity directly from Emerald source", () => {
    expect(receipt.status).toBe("exact");
    expect(receipt.source).toMatchObject({ moveId: 246, carrierSetId: 75, carrierSpeciesId: 318, carrierLabel: "FRONTIER_MON_BALTOY", completePartyRecords: true });
    expect(species).toContain("#define SPECIES_BALTOY 318");
    expect(frontierIds).toMatch(/#define FRONTIER_MON_BALTOY\s+75(?:\s|$)/);
    expect(baltoyStart).toBeGreaterThanOrEqual(0);
    expect(baltoyEnd).toBeGreaterThan(baltoyStart);
    expect(baltoySourceBlock).toContain(".species = SPECIES_BALTOY");
    expect(baltoySourceBlock).toContain(".moves = {MOVE_PSYBEAM, MOVE_ANCIENT_POWER, MOVE_LIGHT_SCREEN, MOVE_MUD_SLAP}");
    expect(baltoySourceBlock).toContain(".itemTableId = BATTLE_FRONTIER_ITEM_PERSIM_BERRY");
    expect(baltoySourceBlock).toContain(".evSpread = F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_ATTACK");
    expect(baltoySourceBlock).toContain(".nature = NATURE_NAUGHTY");
  });

  it("pins the complete twice-fresh bilateral exact production gate", () => {
    expect(receipt.acceptance).toEqual({ status: "exact", reducerRows: 128, seamRows: 128, componentRows: 128, latchRows: 127, framebufferRows: 128, freshRuns: 2 });
    expect(receipt.residual).toBeNull();
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const row = receipt.orientations[orientation];
      expect(sha256(readFileSync(row.changeMap))).toBe(row.changeMapSha256);
    }
  });

  it("keeps the committed probe runnable through the relative mGBA wrapper route", () => {
    expect(probeSource).toContain("tools/run-mgba-probe.py");
    expect(probeSource).toContain("tools/compare/ancientPowerProbe.py");
    expect(probeSource).toContain("tools/battle-lab/mechanic-ancient-power-player-baltoy-opponent-onix.json");
    expect(probeSource).not.toContain("/Users/");
  });

  it.each(["player-back", "opponent-front"] as const)("pins the committed complete six-Pokemon scenario for %s", (orientation) => {
    const row = receipt.orientations[orientation];
    const bytes = readFileSync(row.scenario);
    expect(sha256(bytes)).toBe(row.scenarioSha256);
    const scenario = JSON.parse(bytes.toString("utf8"));
    expect(scenario).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      trace: {
        segments: [
          { frames: 2, buttons: ["A"] },
          { frames: 30, buttons: [] },
          { frames: 2, buttons: ["A"] },
          { frames: 1500, buttons: [] },
        ],
      },
    });
    const parties = scenario.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    const records = [...parties.player, ...parties.opponent];
    expect(records).toHaveLength(6);
    records.forEach(expectCompleteRecord);
    const carrier = orientation === "player-back" ? parties.player[0] : parties.opponent[0];
    expect(carrier).toEqual(expectedCarrier);
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
