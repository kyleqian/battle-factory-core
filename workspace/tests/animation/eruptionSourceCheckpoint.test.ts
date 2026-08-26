import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const scenario = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;

describe("MOVE_ERUPTION authoritative source and legal bilateral Scene-ON staging checkpoint", () => {
  it("pins the exact pointer-owned source body, generated component graph, assets, callbacks, palette, audio, and sole Level-50 carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/eruptionSourceAudit.ts"], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_ERUPTION", moveId: 284, status: "unsupported-source-staging-checkpoint",
      sourceBounds: { start: "0x082ce30b", endExclusive: "0x082ce3d8", bytes: 205, sha256: "d08f6fd6af6a0f7b6ded592cce73ba65c55df60a99397b14bb42d083a1bb507f" },
      sourceText: { bytes: 1370, sha256: "4a8566a35ab12634ba5481049250003fc96033e2adb44421d9eb4faa72279559" },
      components: ["asset:ANIM_TAG_WARM_ROCK", "sprite:gEruptionFallingRockSpriteTemplate", "task:AnimTask_EruptionLaunchRocks", "task:AnimTask_HorizontalShake", "visualCommand:simple_palette_blend"],
      assets: { tag: "ANIM_TAG_WARM_ROCK", gfx: "gBattleAnimSpriteGfx_WarmRock", palette: "gBattleAnimSpritePal_WarmRock", bytes: 2688 },
      audio: { explosion: { id: 178, pan: "SOUND_PAN_ATTACKER", waits: 2, delay: 60 }, rockThrow: { id: 131, pan: "SOUND_PAN_TARGET", interval: 16, count: 12 } },
      carrier: { setId: 346, label: "FRONTIER_MON_CAMERUPT_2", species: "SPECIES_CAMERUPT", moves: ["MOVE_EARTHQUAKE", "MOVE_ERUPTION", "MOVE_BODY_SLAM", "MOVE_SCARY_FACE"] },
      ownership: { gameplayState: false, damage: false, weather: false, rng: false, controller: false, reducer: "simple-palette-component-only", renderer: false },
    });
    expect(audit.sourceText.commandRows.filter((row: string) => row.startsWith("createsprite gEruptionFallingRockSpriteTemplate"))).toHaveLength(6);
    expect(audit.sourceText.commandRows.filter((row: string) => row.startsWith("createvisualtask AnimTask_EruptionLaunchRocks"))).toHaveLength(2);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-eruption-player-camerupt-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-eruption-opponent-camerupt-player-onix.json", false],
  ])("keeps %s legal, bilateral, capture-free, and constrained by ordinary inputs", (_orientation, path, playerCamerupt) => {
    const stage = scenario(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110 });
    expect(stage).not.toHaveProperty("captureFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace.segments).toEqual([{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }]);
    const attacker = playerCamerupt ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const defender = playerCamerupt ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    for (const mon of [...attacker, ...defender]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
      expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker.every((mon: any) => mon.species === 323 && mon.moves.every((move: number) => move === 284) && mon.item === 221)).toBe(true);
    expect(defender.every((mon: any) => mon.species === 95 && mon.moves.every((move: number) => move === 33))).toBe(true);
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps Eruption unsupported and its requested non-exclusive Warm Rock track unfulfilled", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    // Coverage records only promoted moves; an absent Level-50 move is unsupported.
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ERUPTION")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "eruption-warm-rock")).toMatchObject({
      components: ["asset:ANIM_TAG_WARM_ROCK", "sprite:gEruptionFallingRockSpriteTemplate", "task:AnimTask_EruptionLaunchRocks", "task:AnimTask_HorizontalShake", "visualCommand:simple_palette_blend"],
      representatives: ["MOVE_ERUPTION"], fulfilled: false,
    });
  });
});
