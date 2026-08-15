import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/leech-seed-evidence.json", "utf8"));
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");

describe("MOVE_LEECH_SEED twice-fresh main and natural residual evidence", () => {
  it("keeps the probe and every retained artifact pinned after exact promotion", () => {
    expect(sha(readFileSync(fixture.source.probe))).toBe(fixture.source.probeSha256);
    for (const evidence of Object.values(fixture.orientations) as any[]) {
      expect(sha(readFileSync(evidence.scenario))).toBe(evidence.scenarioSha256);
      expect(evidence.repeatProbeJsonSha256).toBe(evidence.probeJsonSha256);
      for (const [path, digest] of [[evidence.denseState, evidence.denseStateSha256],
        [evidence.rawRgbArchive, evidence.rawRgbArchiveSha256],
        [evidence.main.changeMap, evidence.main.changeMapSha256],
        [evidence.residual.changeMap, evidence.residual.changeMapSha256]]) {
        expect(sha(readFileSync(path))).toBe(digest);
      }
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_LEECH_SEED"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ABSORB"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_BULLET_SEED"))
      .toBeUndefined();
  });

  it.each(Object.entries(fixture.orientations) as [string, any][])(
    "replays complete dense %s main and residual windows with raw RGB equality",
    (orientation, evidence) => {
      const decoded = gunzipSync(readFileSync(evidence.denseState));
      expect(sha(decoded)).toBe(evidence.probeJsonSha256);
      const probe = JSON.parse(decoded.toString("utf8"));
      expect(probe.schema).toBe("leech-seed-main-residual-dense-evidence/v1");
      expect(probe.lifecycleCounts).toEqual({ mainLeechSeeds: 3,
        residualAbsorptionOrbs: 8, residualHealingStars: 4 });
      for (const name of ["main", "residual"] as const) {
        const window = probe.windows[name];
        expect(window).toMatchObject({ startFrame: evidence[name].startFrame,
          endFrame: evidence[name].endFrame, frameCount: evidence[name].frameCount });
        expect(window.frames).toHaveLength(evidence[name].frameCount);
        expect(window.frames[0].frame).toBe(evidence[name].startFrame);
        expect(window.frames.at(-1)).toMatchObject({ frame: evidence[name].endFrame,
          animScriptActive: false, visualTaskCount: 0 });
        const members = execFileSync("tar", ["-tzf", evidence.rawRgbArchive],
          { encoding: "utf8" }).trim().split("\n")
          .filter((member) => member.startsWith(`./${name}/`) && member.endsWith(".rgb"))
          .sort();
        expect(members).toHaveLength(evidence[name].frameCount);
        const scratch = mkdtempSync(join(tmpdir(), "leech-seed-evidence-"));
        execFileSync("tar", ["-xzf", evidence.rawRgbArchive, "-C", scratch]);
        const rgb = Buffer.concat(members.map((member) =>
          readFileSync(join(scratch, member.replace(/^\.\//, "")))));
        rmSync(scratch, { recursive: true });
        expect(rgb).toHaveLength(evidence[name].frameCount * 240 * 160 * 3);
        expect(sha(rgb)).toBe(evidence[name].rawRgbSha256);
        window.frames.forEach((row: any, age: number) => {
          expect(row.frame).toBe(evidence[name].startFrame + age);
          expect(row.softwareOam).toHaveLength(128);
          expect(row.hardwareOam).toHaveLength(128);
          expect(row.softwareMatrices).toHaveLength(32);
          expect(row.hardwareMatrices).toHaveLength(32);
          expect(row.fadedPalette).toHaveLength(512);
          expect(row.unfadedPalette).toHaveLength(512);
          expect(row.hardwarePalette).toHaveLength(512);
          expect(row.paletteTags).toHaveLength(16);
          expect(row.tileTags).toHaveLength(128);
          expect(row.parties.player).toHaveLength(3);
          expect(row.parties.opponent).toHaveLength(3);
          expect(row.sha256).toBe(sha(rgb.subarray(age * 240 * 160 * 3,
            (age + 1) * 240 * 160 * 3)));
        });
      }

      const main = probe.windows.main.frames;
      for (let age = 1; age < main.length; age += 1) {
        expect(main[age].hardwareOam).toEqual(main[age - 1].softwareOam);
        expect(main[age].hardwareMatrices).toEqual(main[age - 1].softwareMatrices);
        expect(main[age].hardwarePalette).toEqual(main[age - 1].fadedPalette);
      }
      const residual = probe.windows.residual.frames;
      expect(residual.map((row: any) => row.scriptOwner).filter((owner: string, age: number, all: string[]) =>
        !age || owner !== all[age - 1])).toEqual(["General_LeechSeedDrain", "Move_ABSORB",
        "AbsorbEffect", "Move_ABSORB", "HealingEffect", "Move_ABSORB"]);
      expect(residual[0].scriptOwnerOffset).toBe(9);
      expect(residual[0].animationBattlers.attacker).toBe(orientation === "player-back" ? 0 : 1);
      expect(residual[0].animationBattlers.target).toBe(orientation === "player-back" ? 1 : 0);
      expect(Object.values(residual[0].battlers).some((mon: any) =>
        mon.volatile.leechSeededBy !== null)).toBe(true);
      for (let age = 1; age < residual.length; age += 1)
        expect(residual[age].hardwareOam).toEqual(residual[age - 1].softwareOam);
      expect(residual.filter((row: any, age: number) => age > 0
        && JSON.stringify(row.hardwarePalette) !== JSON.stringify(residual[age - 1].fadedPalette))
        .map((_: any, index: number) => index)).toHaveLength(1);
    },
  );
});
