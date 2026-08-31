import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/sand-tomb-mud-sand.json" with { type: "json" };

const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/sandTombSourceAudit.ts"], { encoding: "utf8" }));

describe("MOVE_SAND_TOMB source/asset/staging contract", () => {
  it("pins the complete ROM/source interval, component graph, carriers, callbacks, audio, resources, and cleanup", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_SAND_TOMB", moveId: 328, status: "exact-source-contract",
      source: {
        root: { start: "0x082d516a", endExclusive: "0x082d51b7", bytes: 77, sha256: "23701555772a9a43b70a26589187a029954e9859d26f7e66ca9fac11a0f04b68" },
        subroutine: { start: "0x082d51b7", endExclusive: "0x082d5242", bytes: 139, sha256: "8346bc94ab13ba070c56e3c60863dca3a566750cb435fab353a658e8a0325ee0" },
        complete: { bytes: 216, sha256: "0ddd2f1fdfb4bc3819f44c4fc581c4e85f903d66760cf2a1f325a57805a283f3" },
        text: { bytes: 1218, sha256: "3b672f3fbd0eb6d5a6f3dd28b27e06287cf3277b184bcac38f7612b1260abbca" },
      },
      components: ["asset:ANIM_TAG_MUD_SAND", "sprite:gSwirlingDirtSpriteTemplate", "subroutine:SandTombSwirlingDirt", "task:AnimTask_ShakeMon", "visualCommand:simple_palette_blend"],
      lifecycle: { sprites: 18, palettePrograms: 2, shake: ["ANIM_TARGET", 0, 2, 43, 1], audio: { id: 230, pan: "SOUND_PAN_TARGET" } },
      asset: { shared: true, sandTombExclusiveArt: false, cell: "tile 0, 8x8", sourceBytes: 160 },
      ownership: { reducer: true, seam: true, renderer: true, framebuffer: true, gameplayState: false, rng: false, controller: false },
    });
    const result = audit();
    expect(result.lifecycle.spriteArgs).toHaveLength(6);
    expect(result.carrier.allLevel50).toHaveLength(1);
    expect(result.carrier.lowestLegal).toMatchObject({ index: 372, label: "FRONTIER_MON_DUGTRIO_1", species: "SPECIES_DUGTRIO", itemName: "BATTLE_FRONTIER_ITEM_SOFT_SAND", nature: "NATURE_ADAMANT" });
    expect(result.carrier.legalRange).toMatchObject({ start: 372, end: 467 });
    expect(result.callbacks).toEqual(expect.arrayContaining(["AnimParticleInVortex", "AnimParticleInVortex_Step", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step", "Cmd_end"]));
    expect(result.siblings.mudSand).toEqual(["MOVE_SAND_ATTACK", "MOVE_FISSURE", "MOVE_DIG", "MOVE_MUD_SLAP", "MOVE_ROLLOUT", "MOVE_MUD_SPORT"]);
  });

  it("re-extracts the complete shared MUD_SAND source asset byte-for-byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "sand-tomb-asset-"));
    const output = join(dir, "asset.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractSandTombAssets.ts", "--out", output]);
    const committed = readFileSync("src/animation/assets/sand-tomb-mud-sand.json");
    const fresh = readFileSync(output);
    expect(fresh).toEqual(committed);
    expect(createHash("sha256").update(fresh).digest("hex")).toMatch(/^[0-9a-f]{64}$/);
    expect(asset).toMatchObject({
      source: { tag: { name: "ANIM_TAG_MUD_SAND", value: 10074 }, note: expect.stringContaining("no exclusive art") },
      hashes: { graphicsSha256: "f343ee129eaf60f24352029ea3a6cad513368841b25b0ce4e14442a1bd5da099", paletteSourceSha256: "b0d8265b3a364158880b483ad893234f058c5f75d6414f1e52d85ce6b97af24b" },
      dimensions: { widthPixels: 40, heightPixels: 8, bitDepth: 4, bytes: 160 },
      tileset: { columns: 5, rows: 1 }, sandTombCell: { tileOffset: 0, dimensions: { widthPixels: 8, heightPixels: 8 } },
    });
    expect(asset.tileset.tiles).toHaveLength(5);
    expect(asset.tileset.tiles.every((tile) => tile.length === 64 && tile.every((pixel) => pixel >= 0 && pixel < 16))).toBe(true);
    expect(asset.palette).toHaveLength(16);
    expect(asset.sandTombCell.pixels).toEqual(asset.tileset.tiles[0]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-sand-tomb-player-dugtrio-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-sand-tomb-opponent-dugtrio-player-onix.json", false],
  ])("keeps the %s stage complete, legal, bilateral, capture-free, and transient-free", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 3, battleNum: 3, trainerId: 120 });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(stage).not.toHaveProperty("preCheckpointCaptureAllFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather"]) expect(stage.overrides).not.toHaveProperty(transient);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const defender = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(defender).toHaveLength(3);
    for (const mon of [...attacker, ...defender]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 51, level: 50, nature: 3, item: 203, abilitySlot: 0, moves: [328, 328, 328, 328] });
    expect(defender[0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
    expect(new Set(attacker.map((mon: any) => mon.species)).size).toBe(3);
    expect(new Set(defender.map((mon: any) => mon.species)).size).toBe(3);
  });

  it("promotes only Sand Tomb and fulfills its track without sibling credit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SAND_TOMB")?.status).toBe("exact");
    expect(coverage.queue).not.toContain("MOVE_SAND_TOMB");
    expect(coverage.componentTracks.find((track: any) => track.id === "sand-tomb-vortex")).toMatchObject({ representatives: ["MOVE_SAND_TOMB"], fulfilled: true });
    for (const sibling of ["MOVE_SAND_ATTACK", "MOVE_FISSURE", "MOVE_DIG", "MOVE_MUD_SLAP", "MOVE_ROLLOUT", "MOVE_MUD_SPORT"]) {
      expect(coverage.componentTracks.find((track: any) => track.id === "sand-tomb-vortex")?.representatives).not.toContain(sibling);
    }
  });
});
