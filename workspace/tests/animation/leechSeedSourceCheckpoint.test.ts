import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-leech-seed-player-exeggcute-opponent-onix.json",
  "tools/battle-lab/mechanic-leech-seed-opponent-exeggcute-player-onix.json",
] as const;
const recordKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs",
  "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_LEECH_SEED source and natural-residual staging checkpoint", () => {
  it("pins its odd pointer body, literal creates/assets/callbacks, and residual graph", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/leechSeedSourceAudit.ts"], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_LEECH_SEED",
      sourceBounds: { start: "0x082ca083", endExclusive: "0x082ca0d9", bytes: 86,
        sha256: "a57a0f5321a67e5e7d860057faef1fa0d22183f3a5e9e13defc1515187228997" },
      residualBounds: { start: "0x082d82fd", endExclusive: "0x082d830b", bytes: 14,
        sha256: "dbb83b75703ae20007c80ac87c99696fe4a17e12b513cdcbe16bfc179acde754" },
      callbacks: {
        AnimLeechSeed: { bytes: 112, sha256: "591c2735c6aa67d0ad667c5d026a98dab8438187f8a4eeec6b59d70e12beaef7" },
        AnimLeechSeed_Step: { bytes: 56, sha256: "095a94892a07abb33b80c7a56a549f39acaa3e0c4ad5dd6c2b0b7a525d5d1b3a" },
        AnimLeechSeedSprouts: { bytes: 56, sha256: "425859aebce2112bc2b56b0573f3c8286ff6cb5210cc72b8499a58a57732b555" },
      },
      template: { bytes: 24, sha256: "0ffb0e77754862d8f3a674d53921fc9bcc44088d07e3c1a3e41e9bdb07a25e06" },
      assets: {
        seedGfxLiteral: { bytes: 204, sha256: "38f3c444cf58b7ff55e763988aa32edcc375364a213f727eefe72c1e1bae091f" },
        seedPaletteLiteral: { bytes: 40, sha256: "6efcb27c6a302e2431ccd7bd47ca13f9a85adceaf7f90f974c908b130a32f274" },
        decompressedTileBytes: 384, paletteColors: 16,
      },
      lifecycle: { arcCallback: "TranslateAnimHorizontalArc", hiddenFrames: 10,
        sproutFrames: 60, sproutAnimation: "4/8 tile frames, 7 ticks each, looping" },
      components: ["asset:ANIM_TAG_SEED", "visualCommand:createleechseedsprite"],
      sibling: { move: "MOVE_BULLET_SEED", tier: "outsideFactory" },
    });
    expect(audit.projectiles).toEqual([
      { targetX: 0, targetY: 24, duration: 35, waveAmplitude: -32 },
      { targetX: -16, targetY: 24, duration: 35, waveAmplitude: -40 },
      { targetX: 16, targetY: 24, duration: 35, waveAmplitude: -37 },
    ]);
    expect(audit.residualGraph).toEqual(["BattleScript_LeechSeedTurnDrain",
      "B_ANIM_LEECH_SEED_DRAIN", "General_LeechSeedDrain",
      "AnimTask_GetBattlersFromArg", "Move_ABSORB"]);
    expect(audit.carrier.lowestLevel50).toMatchObject({ index: 112,
      label: "FRONTIER_MON_EXEGGCUTE", species: "SPECIES_EXEGGCUTE",
      moves: ["MOVE_CONFUSION", "MOVE_ANCIENT_POWER", "MOVE_LEECH_SEED", "MOVE_LIGHT_SCREEN"],
      nature: "NATURE_NAUGHTY" });
  });

  it.each(scenarios)("keeps a complete legal Scene-ON party and natural turn route in %s", (path) => {
    const bytes = readFileSync(path);
    const stage = JSON.parse(bytes.toString("utf8"));
    expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on",
      level: 50, challengeNum: 0, seed: 305419897 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages",
      "status", "weather"]) expect(stage.overrides).not.toHaveProperty(transient);
    const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
    expect(all).toHaveLength(6);
    for (const mon of all) {
      expect(Object.keys(mon).sort()).toEqual([...recordKeys].sort());
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
      expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toHaveLength(4);
    }
    const attacker = path.includes("player-exeggcute")
      ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = path.includes("player-exeggcute")
      ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker.every((mon: any) => mon.species === 102 && mon.level === 50
      && mon.nature === 4 && mon.item === 140 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === "[73,73,73,73]")).toBe(true);
    expect(target.every((mon: any) => mon.species === 95 && mon.level === 50
      && mon.item === 0 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === "[33,33,33,33]")).toBe(true);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      path.includes("player-exeggcute")
        ? "0e52e79d02c223436d73fccc3359dc2a47749ec40623ff3d7b83e0ce8869fdd9"
        : "6b65c703100796a09abca58b33049550ea93faad5c4d0a3d53d711c0c783f468");
  });

  it("records a non-exclusive track without granting Leech Seed or Bullet Seed coverage", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_LEECH_SEED"))
      .toBeUndefined();
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_BULLET_SEED"))
      .toBeUndefined();
    expect(coverage.componentTracks.find((track: any) =>
      track.id === "seed-projectile-leech-seed")).toMatchObject({
      components: ["asset:ANIM_TAG_SEED", "visualCommand:createleechseedsprite"],
      representatives: ["MOVE_LEECH_SEED"],
    });
  });
});
