import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const scenarios = [
  "tools/battle-lab/mechanic-luster-purge-player-latios-opponent-onix.json",
  "tools/battle-lab/mechanic-luster-purge-opponent-latios-player-onix.json",
];

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_LUSTER_PURGE source and legal staging checkpoint", () => {
  it("pins the exclusive even-pointer body, UnsetPsychicBackground, assets, tasks, and siblings", () => {
    const audit = JSON.parse(execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/lusterPurgeSourceAudit.ts"],
      { encoding: "utf8" },
    ));
    expect(audit).toMatchObject({
      move: "MOVE_LUSTER_PURGE",
      sourceBounds: {
        start: "0x082ce517", endExclusive: "0x082ce62e",
        evenPointerStart: "0x082ce516", bytes: 279,
      },
      unsetBounds: { start: "0x082d7cdd", endExclusive: "0x082d7ce5", bytes: 8 },
      randomDraws: { hitsplats: 6, visualRandom2PerHitsplat: 2 },
      siblings: {
        MOVE_MIST_BALL: "independent control",
        MOVE_FLAIL: "independent control",
        MOVE_HEAT_WAVE: "independent control",
        MOVE_CALM_MIND: "independent control",
      },
    });
    expect(audit.components).toHaveLength(19);
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_IMPACT",
      "asset:ANIM_TAG_WHITE_CIRCLE_OF_LIGHT",
      "sprite:gLusterPurgeCircleSpriteTemplate",
      "subroutine:UnsetPsychicBackground",
      "task:AnimTask_BlendBattleAnimPalExclude",
      "task:AnimTask_BlendParticle",
      "task:AnimTask_FadeScreenToWhite",
      "task:AnimTask_HorizontalShake",
      "task:SoundTask_PlaySE1WithPanning",
      "visualCommand:blendoff",
      "visualCommand:clearmonbg",
      "visualCommand:create_random_pos_hitsplat_sprite",
      "visualCommand:fadetobg",
      "visualCommand:monbg",
      "visualCommand:restorebg",
      "visualCommand:setalpha",
      "visualCommand:setarg",
      "visualCommand:waitbgfadein",
      "visualCommand:waitbgfadeout",
    ]);
    expect(audit.carrier).toEqual([
      { index: 799, label: "FRONTIER_MON_LATIOS_4", species: "SPECIES_LATIOS", speciesId: 408, nature: "NATURE_MODEST" },
      { index: 847, label: "FRONTIER_MON_LATIOS_6", species: "SPECIES_LATIOS", speciesId: 408, nature: "NATURE_DOCILE" },
    ]);
    expect(audit.speciesIdentity).toMatchObject({
      internalIds: { SPECIES_RELICANTH: 381, SPECIES_LATIOS: 408 },
      names: { relicanth: true, latios: true },
      latios: {
        types: [16, 14], ability: 26,
        baseStats: { hp: 80, attack: 90, defense: 80, speed: 110, spAttack: 130, spDefense: 110 },
        sourceInfo: true,
        art: { back: true, front: true, palette: true },
        healthbox: { player: true, opponent: true, bar: true },
      },
    });
    expect(audit.sourceRom).toMatchObject({
      moveScript: { bytes: 279, sha256: "cf068f899a65b6a097c6e6fd144d0746f4ee1da48fb379432c1b3bc18c974178" },
      unsetPsychicBackground: { bytes: 8, sha256: "8fa2d0ddbd079c6f7bf5c9c0125a221f3852421cb29ecb1d27d6f96f71564b30" },
      circleTemplate: { bytes: 52, sha256: "3738f5adc1ff8a62bbd0a4090e85b85b1e4071adb99faf76d177e3005bf57b83" },
      blendBattleAnimPalExclude: { bytes: 248, sha256: "48e20922730df327c553a6a3f6bdb60bfa7056e5d2ba82c73c46c7c4aea39d0f" },
      blendParticleBothTasks: { bytes: 280, sha256: "300dd05608d7f1a0082e22817e31c249b1afbe8f7e4ef3303421d646ca9fe501" },
      fadeScreenToWhite: { bytes: 2024, sha256: "ebc738d19a103880d29e30ec030fc5d81690471f3decc19013391eb538435ca1" },
      horizontalShake: { bytes: 684, sha256: "fc5595d0c5b6f2333dd64b6c40abe930e760ff687916eb8aae712117df9146cf" },
      soundSE1WithPanning: { bytes: 52, sha256: "5d05fb5af1087588d43b342d11687c83e6a9a714234e950044b28e600d06d39d" },
    });
  });

  it.each(scenarios)("keeps complete legal three-Pokemon Scene-ON parties in %s", (path) => {
    const bytes = readFileSync(path);
    const stage = JSON.parse(bytes.toString("utf8")) as Record<string, any>;
    expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.overrides).not.toHaveProperty("hp");
    expect(stage.overrides).not.toHaveProperty("status");
    expect(stage.overrides).not.toHaveProperty("stages");
    expect(stage.overrides).not.toHaveProperty("weather");
    expect(stage.overrides).not.toHaveProperty("outcome");
    expect(stage.overrides).not.toHaveProperty("sideConditions");
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const latios = [...parties.player, ...parties.opponent].find((mon) => mon.species === 408)!;
    expect(latios).toMatchObject({
      species: 408, level: 50, nature: 15, item: 141,
      moves: [295, 295, 295, 295], ppUps: [0, 0, 0, 0], abilitySlot: 0,
    });
    expect([...parties.player, ...parties.opponent].some((mon) => mon.species === 381)).toBe(false);
    const opponentMoves = path.includes("player-latios") ? parties.opponent : parties.player;
    expect(opponentMoves[0]!.moves).toEqual([33, 33, 33, 33]);
    expect(opponentMoves.every((mon) => mon.moves === opponentMoves[0]!.moves ||
      JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    expect(sha256(bytes)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps Luster Purge exact while coverage advances independently", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const entries = coverage.entries as Array<Record<string, unknown>>;
    const luster = entries.find((entry) => entry.move === "MOVE_LUSTER_PURGE");
    expect(luster).toMatchObject({ move: "MOVE_LUSTER_PURGE", status: "exact" });
    const exact = entries.filter((entry) => entry.status === "exact").length;
    expect(exact).toBe(212);
    const report = execFileSync("npm", ["run", "animation:coverage", "--silent"], { encoding: "utf8" });
    expect(report).toContain("Level 50: 212/276 exact, 0 partial, 0 staged, 64 unsupported");
  });
});
