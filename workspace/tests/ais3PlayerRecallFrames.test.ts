import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { midBattleSwitchOutFeetAnchorY2, playerBattlerYDelta } from "../src/engine/battleResolutionPresentationRender.ts";

const { PNG } = createRequire(import.meta.url)("pngjs") as { PNG: { sync: { read(buf: Buffer): { data: Buffer } } } };
const fixture = JSON.parse(readFileSync(new URL("./fixtures/ais3-player-recall-rom-frames.json", import.meta.url), "utf8")) as {
  stage: unknown; lo: number; hi: number; scenes: Record<"off" | "on", { setup: unknown; md5: string[] }>;
};
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

describe("player recall of a non-13 back-pic species (ais3)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`Graveler (back y_offset 12) Scene ${scene.toUpperCase()}: the return-to-ball scale-up frames are the ROM's`, { timeout: 180_000 }, () => {
      const w = fixture.scenes[scene];
      const dir = mkdtempSync(join(tmpdir(), "ais3-"));
      writeFileSync(join(dir, "setup.json"), JSON.stringify(w.setup));
      writeFileSync(join(dir, "stage.json"), JSON.stringify(fixture.stage));
      execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--stage=${join(dir, "stage.json")}`, `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`,
        `--render=${fixture.lo}:${fixture.hi}`, `--render-dir=${join(dir, "eng")}`, `--out=${join(dir, "e.json")}`],
      { stdio: "pipe", maxBuffer: 1 << 28, env: { ...process.env, ROM_REPLAY_POLICY: "script", ROM_REPLAY_SYMBOLS: "0" } });
      const bad: number[] = [];
      for (let f = fixture.lo; f <= fixture.hi; f += 1) {
        const h = createHash("md5").update(PNG.sync.read(readFileSync(join(dir, "eng", `engine-${String(f).padStart(5, "0")}.png`))).data).digest("hex");
        if (h !== w.md5[f - fixture.lo]) bad.push(f);
      }
      expect(bad).toEqual([]);
    });
  }

  it("the player's y delta is gMonBackPicCoords y_offset, or the Castform elevation", () => {
    const art = (player: number) => createBattleCommandFieldArtView({
      player: { species: player, substituteDoll: false },
      opponent: { species: 198, substituteDoll: false },
    } as never).player;
    const graveler = art(75);
    expect(graveler.speciesSymbol).toBe("GRAVELER");
    expect(playerBattlerYDelta(graveler)).toBe(12);
    expect(midBattleSwitchOutFeetAnchorY2(736, 12)).not.toBe(midBattleSwitchOutFeetAnchorY2(736, 13));
    expect(playerBattlerYDelta(art(385))).toBe(0);
  });
});
