import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const receipt = JSON.parse(readFileSync("tools/compare/fixtures/leech-seed-evidence.json", "utf8"));

const recordKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs",
  "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

const retained = [
  {
    id: "player-back",
    scenarioSha256: "0e52e79d02c223436d73fccc3359dc2a47749ec40623ff3d7b83e0ce8869fdd9",
    probeJsonSha256: "c90f08b19bdea3dc3a83e7313f16cec9ca0f065c1f7860350d153a18c66fc0b0",
    denseStateSha256: "27981c33d5e7e1a9d74dd2d099b112c15b005678e284df243284a7ee44c408f2",
    rawRgbArchiveSha256: "78469d52aafc2c6dc9ac64997402a2e5d374ae01b29d4c1d1cb246f57380a61d",
    windows: {
      main: { startFrame: 246, endFrame: 386, frameCount: 141,
        rawRgbSha256: "a361049431b69015253fb2285f3d7887c8b8cb782fe62556f8b60e9b0bddd353",
        changeMapSha256: "8f645ab9e502613830a62403a135d88c270621ae5964863fda6706bca839e9d5" },
      residual: { startFrame: 485, endFrame: 691, frameCount: 207,
        rawRgbSha256: "d124f6396a1093a768c7ef2a547bd968249f02b221624454a1ab61823afb9d17",
        changeMapSha256: "0148672f4c2953c8ff69698a8008b2af4ad9435c0b6b6f18257aa791d492b458" },
    },
  },
  {
    id: "opponent-front",
    scenarioSha256: "6b65c703100796a09abca58b33049550ea93faad5c4d0a3d53d711c0c783f468",
    probeJsonSha256: "9a59920b417e15b250beac43150d3d2b37a400aab6b07725a9b48e39cde5a156",
    denseStateSha256: "a99680f521ad25f00e158957787e57361215250e8fecd726743ce5c5af122619",
    rawRgbArchiveSha256: "a04360e82827f73c47f6abb5de4d91cc8c3d02136f8e0db2c948a698f551a5a9",
    windows: {
      main: { startFrame: 245, endFrame: 385, frameCount: 141,
        rawRgbSha256: "83e9553e02fcd7fb91ded34085818e16213b016869e412529fabaa00aa0d3669",
        changeMapSha256: "eb2fb6e7a933c7e005d1abac1aeec444764124987c14bda61e11c7eb944b4dbc" },
      residual: { startFrame: 480, endFrame: 686, frameCount: 207,
        rawRgbSha256: "f5b256e9ca2399728c2c05a24694cf9062a50b615ccaec7adc2a018a3e8799c0",
        changeMapSha256: "e06887ac6ddd55d8d577fd52fdde36307eea612a023ffa71f5ff46378f95580e" },
    },
  },
] as const;

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

describe("seed-projectile-leech-seed fulfilled component-track ratchet", () => {
  it("pins the authoritative two-component boundary and its exclusive source ownership", () => {
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
      components: ["asset:ANIM_TAG_SEED", "visualCommand:createleechseedsprite"],
      residualGraph: ["BattleScript_LeechSeedTurnDrain", "B_ANIM_LEECH_SEED_DRAIN",
        "General_LeechSeedDrain", "AnimTask_GetBattlersFromArg", "Move_ABSORB"],
      sibling: { move: "MOVE_BULLET_SEED", tier: "outsideFactory",
        role: "asset/source sibling only; never a Leech Seed coverage sibling" },
    });
  });

  it("pins complete legal bilateral fixtures and all four retained bodies with their hashes", () => {
    expect(receipt).toMatchObject({
      schema: "leech-seed-bilateral-main-residual-evidence/v1",
      oracleProfile: "battle-scene-on", move: "MOVE_LEECH_SEED", moveId: 73,
      status: "exact", coverageCredit: true,
      source: { probe: "tools/compare/leechSeedProbe.py",
        probeSha256: "b8bc5a7ad0a90d557db6df55ed8d81c0630d83fe534f427e10aaa05b49238d8a" },
    });

    let rows = 0;
    for (const expected of retained) {
      const evidence = receipt.orientations[expected.id];
      expect(evidence).toMatchObject({
        scenarioSha256: expected.scenarioSha256, probeJsonSha256: expected.probeJsonSha256,
        repeatProbeJsonSha256: expected.probeJsonSha256,
        denseStateSha256: expected.denseStateSha256,
        rawRgbArchiveSha256: expected.rawRgbArchiveSha256,
      });
      expect(sha(readFileSync(evidence.scenario))).toBe(expected.scenarioSha256);
      expect(sha(readFileSync(evidence.denseState))).toBe(expected.denseStateSha256);
      expect(sha(readFileSync(evidence.rawRgbArchive))).toBe(expected.rawRgbArchiveSha256);
      for (const body of ["main", "residual"] as const) {
        expect(evidence[body]).toMatchObject(expected.windows[body]);
        expect(sha(readFileSync(evidence[body].changeMap))).toBe(expected.windows[body].changeMapSha256);
      }

      const scenario = JSON.parse(readFileSync(evidence.scenario, "utf8"));
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on",
        level: 50, challengeNum: 0, seed: 305419897 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.trace).not.toHaveProperty("captureFrames");
      const party = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(party).toHaveLength(6);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...recordKeys].sort());
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
      const attacker = expected.id === "player-back"
        ? scenario.overrides.parties.player : scenario.overrides.parties.opponent;
      const target = expected.id === "player-back"
        ? scenario.overrides.parties.opponent : scenario.overrides.parties.player;
      expect(attacker.every((mon: any) => mon.species === 102 && mon.level === 50
        && mon.nature === 4 && mon.item === 140 && mon.abilitySlot === 0
        && JSON.stringify(mon.moves) === "[73,73,73,73]")).toBe(true);
      expect(target.every((mon: any) => mon.species === 95 && mon.level === 50
        && mon.item === 0 && mon.abilitySlot === 0
        && JSON.stringify(mon.moves) === "[33,33,33,33]")).toBe(true);

      const payload = gunzipSync(readFileSync(evidence.denseState));
      expect(sha(payload)).toBe(expected.probeJsonSha256);
      const probe = JSON.parse(payload.toString("utf8"));
      expect(probe.sourceIntervals).toEqual({
        Move_LEECH_SEED: [137142403, 137142489], General_LeechSeedDrain: [137200381, 137200395],
        Move_ABSORB: [137170842, 137170953], AbsorbEffect: [137170953, 137171122],
        HealingEffect: [137198047, 137198120],
      });
      for (const body of ["main", "residual"] as const) {
        const window = probe.windows[body];
        expect(window).toMatchObject({
          startFrame: expected.windows[body].startFrame,
          endFrame: expected.windows[body].endFrame,
          frameCount: expected.windows[body].frameCount,
        });
        expect(window.frames).toHaveLength(expected.windows[body].frameCount);
        expect(window.frames[0].frame).toBe(expected.windows[body].startFrame);
        expect(window.frames.at(-1)).toMatchObject({ frame: expected.windows[body].endFrame,
          animScriptActive: false, visualTaskCount: 0 });
        expect(window.frames.every((row: any) => /^[a-f0-9]{64}$/.test(row.sha256))).toBe(true);
        rows += window.frames.length;
      }
    }
    expect(rows).toBe(696);
  });

  it("keeps Leech Seed's own RAM+1 findings and its one residual palette exception move-local", () => {
    for (const expected of retained) {
      const evidence = receipt.orientations[expected.id];
      const probe = JSON.parse(gunzipSync(readFileSync(evidence.denseState)).toString("utf8"));
      const main = probe.windows.main.frames;
      const residual = probe.windows.residual.frames;

      for (let age = 1; age < main.length; age += 1) {
        expect(same(main[age].hardwareOam, main[age - 1].softwareOam)).toBe(true);
        expect(same(main[age].hardwareMatrices, main[age - 1].softwareMatrices)).toBe(true);
        expect(same(main[age].hardwarePalette, main[age - 1].fadedPalette)).toBe(true);
      }
      for (let age = 1; age < residual.length; age += 1)
        expect(same(residual[age].hardwareOam, residual[age - 1].softwareOam)).toBe(true);

      const paletteExceptions = residual.flatMap((row: any, age: number) => age
        && !same(row.hardwarePalette, residual[age - 1].fadedPalette) ? [age] : []);
      expect(paletteExceptions).toEqual([11]);
      const exception = residual[11];
      expect(exception).toMatchObject({ frame: expected.windows.residual.startFrame + 11,
        scriptOwner: "Move_ABSORB", scriptOwnerOffset: 11 });
      expect(same(exception.hardwarePalette, exception.fadedPalette)).toBe(true);
      expect(exception.tasks.map((task: any) => task.func.symbol)).toContain("Task_UpdateMonBg");

      const shakeAges = residual.flatMap((row: any, age: number) => row.tasks
        .some((task: any) => task.func.symbol === "AnimTask_ShakeMon_Step") ? [age] : []);
      expect(shakeAges).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39]);
      for (const age of shakeAges)
        expect(same(residual[age].hardwareOam, residual[age - 1].softwareOam)).toBe(true);
    }
  });

  it("fulfills only the Leech Seed track and gives neither control sibling a transfer", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const track = coverage.componentTracks.find((entry: any) =>
      entry.id === "seed-projectile-leech-seed");
    expect(track).toEqual({
      id: "seed-projectile-leech-seed",
      components: ["asset:ANIM_TAG_SEED", "visualCommand:createleechseedsprite"],
      representatives: ["MOVE_LEECH_SEED"],
      fulfilled: true,
      goal: "FULFILLED: MOVE_LEECH_SEED independently accepts two complete 141-row main bodies and two complete 207-row natural residual bodies (696/696 source-relative reducer, typed seam, raw-RGB, and production-framebuffer rows with zero residual pixels). It proves all three projectile-hidden-sprout lifecycles and its own role-swapped General_LeechSeedDrain -> Move_ABSORB body through cleanup. MOVE_ABSORB remains an independently exact regression control only; outside-Factory MOVE_BULLET_SEED remains unsupported and receives no sibling or latch credit.",
    });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_LEECH_SEED"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ABSORB"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_BULLET_SEED")).toBeUndefined();
  });
});
