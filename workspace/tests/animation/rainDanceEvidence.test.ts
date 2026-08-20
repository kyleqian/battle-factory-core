import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/rain-dance-evidence.json" with { type: "json" };

const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_RAIN_DANCE exact bilateral evidence", () => {
  it("pins the authoritative source interval, components, carrier, and legal bilateral staging", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", fixture.source.audit,
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_RAIN_DANCE",
      moveId: 240,
      sourceBounds: {
        start: "0x082d050a",
        endExclusive: "0x082d0555",
        pointerContract: "half-open-byte-interval-with-even-and-odd-command-pointers-observed",
      },
      carrier: { frontierMon: "FRONTIER_MON_WOOPER", setId: 14, species: 194 },
      tasks: ["AnimTask_BlendBattleAnimPal", "AnimTask_CreateRaindrops"],
      assets: ["ANIM_TAG_RAIN_DROPS", "gBattleAnimSpriteGfx_RainDrops", "gBattleAnimSpritePal_RainDrops"],
      audio: { soundEffect: "SE_M_RAIN_DANCE", id: 127, pan: "SOUND_PAN_ATTACKER" },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const config = fixture.orientations[side];
      const scenario = JSON.parse(readFileSync(config.scenario, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides).not.toHaveProperty("battlers");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.player.every((mon: any) => mon.species === (side === "player-back" ? 194 : 95))).toBe(true);
      expect(scenario.overrides.parties.opponent.every((mon: any) => mon.species === (side === "player-back" ? 95 : 194))).toBe(true);
      const all = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      for (const mon of all) {
        expect(mon).toMatchObject({ level: 50, ppUps: [0, 0, 0, 0], item: 0, abilitySlot: 0, friendship: 70, shiny: false });
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
      }
      expect(scenario.trace.segments.every((segment: any) => segment.frames > 0 && segment.buttons.every((button: string) => ["A"].includes(button)))).toBe(true);
      expect(sha(config.scenario)).toBe(config.scenarioSha256);
    }
  });

  it("replays complete twice-fresh dense state/RGB evidence and retains exact acceptance", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", fixture.source.evidenceReplay,
    ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const summary = JSON.parse(output) as Record<string, any>;
    expect(fixture).toMatchObject({
      schema: "rain-dance-bilateral-evidence/v1",
      move: "MOVE_RAIN_DANCE",
      status: "exact",
      coverageCredit: true,
      acceptance: {
        freshRunsPerOrientation: 2,
        sourceRows: 374,
        rawRgbRows: 374,
        reducerRows: 374,
        typedSeamRows: 374,
        productionFramebufferRows: 374,
        framebufferCompared: true,
        framebufferResidualPixels: 0,
        observedPointerParities: [0, 1],
        raindropCreatesPerOrientation: 80,
        raindropDestroysPerOrientation: 80,
        maximumLiveRaindrops: 14,
      },
      repeatability: { runsPerOrientation: 2, allMatched: true },
    });
    expect(fixture.components).toEqual([
      "asset:ANIM_TAG_RAIN_DROPS",
      "task:AnimTask_BlendBattleAnimPal",
      "task:AnimTask_CreateRaindrops",
    ]);
    expect(fixture.productionAcceptance).toMatchObject({
      reducer: "374/374 retained component-state rows",
      typedSeam: "374/374 retained component-state rows",
      productionCompositor: "374/374 retained raw-RGB rows with zero residual pixels",
      freshProductionCompositor: "twice fresh per orientation, 748/748 raw-RGB rows with zero residual pixels and per-orientation deterministic evidence",
      manualQueue: "empty after exact promotion",
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const config = fixture.orientations[side];
      expect(summary[side]).toMatchObject({
        sourceWindow: config.sourceWindow,
        lifecycle: { taskRanges: [[18, 135]], creates: 80, destroys: 80, peak: 14 },
        latches: {
          hardwareOamEqualsPrecedingSoftware: "186/186",
          hardwareMatricesEqualsPrecedingSoftware: "186/186",
          hardwarePaletteEqualsPrecedingFaded: "186/186",
        },
        state: { gameplayRngDistinct: 1, animationRngDistinct: 187, partiesStable: true },
        cleanup: { age: 186, active: false, visualTasks: 0, soundTasks: 0, rainDrops: 0 },
      });
      expect(sha(config.denseState)).toBe(config.denseStateSha256);
      expect(sha(config.rawRgbArchive)).toBe(config.rawRgbArchiveSha256);
      expect(sha(config.changeMap)).toBe(config.changeMapSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(config.denseState)).toString("utf8")) as Record<string, any>;
      expect(probe.frames).toHaveLength(187);
      expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0, rainDrops: [] });
    }
  });

  it("keeps Haze/Detect as regression controls and Hail as a distinct unsupported body", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const hail = scripts.slice(scripts.indexOf("Move_HAIL:"), scripts.indexOf("Move_HAZE:"));
    expect(hail).toContain("AnimTask_Hail");
    expect(fixture.controls).toMatchObject({
      haze: "exact BlendBattleAnimPal regression control only",
      detect: "exact BlendBattleAnimPal regression control only",
      hail: "distinct unsupported source body; no credit",
    });
  });
});
