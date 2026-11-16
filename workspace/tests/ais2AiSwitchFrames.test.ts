import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { midBattleSwitchFadeAt, midBattleSwitchOutAt, midBattleSwitchOutFeetAnchorY2, opponentBattlerYDelta } from "../src/engine/battleResolutionPresentationRender.ts";
import { opponentPartySummaryDrawTiming } from "../src/engine/midBattleOpponentPartySummaryTiming.ts";

const { PNG } = createRequire(import.meta.url)("pngjs") as { PNG: { sync: { read(buf: Buffer): { data: Buffer } } } };
type SceneFixture = { romFrameOffset: number; lo: number; hi: number; setup: unknown; md5: string[] };
const fixture = JSON.parse(readFileSync(new URL("./fixtures/ais2-ai-switch-rom-frames.json", import.meta.url), "utf8")) as { scenes: Record<"off" | "on", SceneFixture> };
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

describe("AI mid-battle switch frames (ais2)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`seed 2741 Scene ${scene.toUpperCase()}: the withdraw, return-to-ball, recall ball effect and opponent tray are the ROM's frames`, { timeout: 180_000 }, () => {
      const w = fixture.scenes[scene];
      const dir = mkdtempSync(join(tmpdir(), "ais2-"));
      writeFileSync(join(dir, "setup.json"), JSON.stringify(w.setup));
      execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", "--seed=2741", `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`,
        `--render=${w.lo}:${w.hi}`, `--render-dir=${join(dir, "eng")}`, `--out=${join(dir, "e.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
      const ours: string[] = [];
      for (let f = w.lo; f <= w.hi; f += 1) {
        ours.push(createHash("md5").update(PNG.sync.read(readFileSync(join(dir, "eng", `engine-${String(f).padStart(5, "0")}.png`))).data).digest("hex"));
      }
      const bad = ours.flatMap((h, i) => (h === w.md5[i] ? [] : [w.lo + i]));
      expect(bad).toEqual([]);
    });
  }

  it("the feet anchor is SetBattlerSpriteYOffsetFromYScale of the recalled species' y delta", () => {
    // var = 64 - 2 * yDelta; y2 = (var - (var << 8) / d) / 2 with d the matrix scale (battle_anim_mons.c:1873-1882)
    expect(midBattleSwitchOutFeetAnchorY2(736)).toBe(12);
    expect(midBattleSwitchOutFeetAnchorY2(736, 11)).toBe(Math.floor((42 - Math.floor((42 << 8) / 736)) / 2));
    expect(midBattleSwitchOutFeetAnchorY2(736, 11)).not.toBe(midBattleSwitchOutFeetAnchorY2(736, 13));
    expect(midBattleSwitchOutAt(26, 1, 11).y2).toBe(midBattleSwitchOutFeetAnchorY2(midBattleSwitchOutAt(26, 1, 11).scale, 11));
    expect(midBattleSwitchOutAt(26, 1, 11).y2).not.toBe(midBattleSwitchOutAt(26, 1).y2);
  });

  it("the opponent's y delta is gMonFrontPicCoords y_offset, or the Castform elevation", () => {
    const art = createBattleCommandFieldArtView({
      player: { species: 19, substituteDoll: false },
      opponent: { species: 198, substituteDoll: false },
    } as never);
    expect(art.opponent.speciesSymbol).toBe("MURKROW");
    expect(opponentBattlerYDelta(art.opponent)).toBe(11);
  });

  it("the recall fade of the opponent has no stolen tick; the player's staged fixture keeps it", () => {
    const stolen = Array.from({ length: 52 }, (_, i) => midBattleSwitchFadeAt(1088 + i)?.bg);
    const plain = Array.from({ length: 52 }, (_, i) => midBattleSwitchFadeAt(1088 + i, false)?.bg);
    expect(plain).not.toEqual(stolen);
    expect(plain.slice(0, 33)).toEqual(stolen.slice(0, 33));
  });

  it("an AI switch's opponent tray draw is one switchhandleorder frame longer than a faint replacement's", () => {
    expect(opponentPartySummaryDrawTiming(false)).toEqual({ minimumFrames: 100, leadFrames: 0 });
    expect(opponentPartySummaryDrawTiming(false, true)).toEqual({ minimumFrames: 101, leadFrames: 0 });
    expect(opponentPartySummaryDrawTiming(true, true)).toEqual({ minimumFrames: 124, leadFrames: 23 });
  });
});
