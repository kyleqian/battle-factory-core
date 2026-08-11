import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  "tools/compare/fixtures/mist-ball-player-latias-opponent-registeel.json",
  "tools/compare/fixtures/mist-ball-opponent-latias-player-registeel.json",
] as const;

describe("MOVE_MIST_BALL bounded bilateral exact acceptance", () => {
  it("pins the real even exclusive source body, all seven components, and both carriers", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/mistBallSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082ce62e..0x082ce6bc (0x8e bytes), 18 commands, seven source components");
    expect(output).toContain("WHITE_FEATHER is loaded but unused");
    expect(output).toContain("set/index 798 FRONTIER_MON_LATIAS_4 is the lowest Level-50 carrier and 843 LATIAS_6 the only sibling carrier");
  });

  it("stages complete legal three-Pokemon parties and constrains only active move slots", () => {
    for (const path of fixtures) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 7 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const allMons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      for (const mon of allMons) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const key of ["item", "abilitySlot", "friendship", "gender", "shiny"]) expect(mon).toHaveProperty(key);
      }
      const latias = allMons.filter((mon) => mon.species === 407);
      expect(latias).toHaveLength(1);
      expect(latias[0].moves).toEqual([296, 296, 296, 296]);
      expect(allMons.slice(1).some((mon) => new Set(mon.moves).size > 1)).toBe(true);
    }
  });

  it("pins both complete dense receipts, maps, and the exact production verdict", () => {
    const values = fixtures.map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(values.map((fixture) => [fixture.orientation, fixture.sourceWindow, fixture.probeJsonSha256, fixture.rawRgbSha256])).toEqual([
      ["player-back", { startFrame: 75, endFrame: 287, frameCount: 213 }, "cbdb661c7acff845e050508ae045865925fbc33534625020f61718ea65e23af3", "0324bfaf3533f79fe00d7da9d96dc92492d4749ee371c3a172f725ae3f90d9df"],
      ["opponent-front", { startFrame: 79, endFrame: 291, frameCount: 213 }, "882e3de5031211f60df8f39795d22ebb06c3770dc38deee15de487357a13f762", "4729defc1099a6569f060d80f46fb8a1d7434c4645678092f5211b3e63787a83"],
    ]);
    for (const fixture of values) {
      expect(fixture.secondFreshProbeJsonSha256).toBe(fixture.probeJsonSha256);
      expect(fixture.acceptance).toEqual({ status: "exact", denseEvidenceFrames: 213, productionFramebufferFrames: 213 });
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(fixture.changeMapSha256);
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact")).toHaveLength(164);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_MIST_BALL")?.status).toBe("exact");
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "white-feather")?.checkpoint).toContain("213/213 required evidence and framebuffer frames");
  });

  it("keeps every required evidence surface load-bearing in the twice-fresh portable", () => {
    const portable = readFileSync("tools/compare/mistBallPortable.ts", "utf8");
    for (const token of [
      "for (let run = 1; run <= 2", "tools/run-mgba-probe.py", "Move_FEATHER_DANCE: 0x082ce6bc",
      "complete callback/task topology", "OAM/palette RAM+1 latch", "immutable battle outcome state",
      "resource/BG1/audio/projectile/cleanup contract", "productionFramebufferFrames !== 213", "production-framebuffer frames exact",
    ]) expect(portable).toContain(token);
  });
});
