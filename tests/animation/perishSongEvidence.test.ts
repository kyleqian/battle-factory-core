import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_PERISH_SONG complete dense evidence", () => {
  it("pins both legal challenge-2 Scene-ON receipts and complete parties", () => {
    for (const path of [
      "tools/compare/fixtures/perish-song-player-murkrow-opponent-onix.json",
      "tools/compare/fixtures/perish-song-opponent-murkrow-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture.schema).toBe("perish-song-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(259);
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.fieldProfile).toMatchObject({
        playerPerishSongTurns: 3,
        opponentPerishSongTurns: 3,
      });
      expect(scenario).toMatchObject({
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 2,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
        for (const mon of party) {
          expect(mon.moves).toHaveLength(4);
          expect(Object.values(mon.ivs)).toHaveLength(6);
          expect(Object.values(mon.evs)).toHaveLength(6);
          expect(mon.friendship).toBe(0);
        }
      }
    }
  });

  it("regenerates Murkrow and MUSIC_NOTES_2 assets byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "pokebench-perish-assets-"));
    const output = join(directory, "perish-song.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractPerishSongAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/perish-song.json"),
    );
  });
});
