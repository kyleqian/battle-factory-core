import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_HAZE exact bilateral evidence", () => {
  it("pins complete pointer-bounded dense receipts and change maps", () => {
    const fixtures = ["player-koffing-opponent-onix", "opponent-koffing-player-onix"]
      .map((name) => JSON.parse(readFileSync(`tools/compare/fixtures/haze-${name}.json`, "utf8")));
    expect(fixtures.map((f) => [f.orientation,f.sourceWindow.startFrame,f.sourceWindow.endFrame,f.sourceWindow.frameCount,f.probeJsonSha256,f.rawRgbSha256,f.changeMapSha256])).toEqual([
      ["player-back",201,402,202,"be17962f279d4ca438f1bf641158b51ab447b0ecf7285818dcbc5afa4b0c9dc7","8acb434e5eb606306db6977f3c9c1e3c48460e39ca6050a0b43d310d70a8af6d","56d3daf4587ab17379d4f43f1aed644db1182ccd664930156cf9a91d1c296ce0"],
      ["opponent-front",289,490,202,"6d6514bc43371b97d9a0fff732f519a142bce4b3213ff4143f2059de30affa34","8a719e863a21ed91abaeaa10706aea6989604522d9dc8cba8271e83853cc8305","4bc33da60686ba24aab7d2b37fc9e53bce1a23b67f47fe0fd7eb47007e412f3e"],
    ]);
  });

  it("audits the complete script, task, assets, audio, and sole legal carrier", () => {
    expect(JSON.parse(execFileSync(process.execPath,["--experimental-strip-types","tools/compare/hazeSourceAudit.ts"],{encoding:"utf8"}))).toMatchObject({move:"MOVE_HAZE",moveId:114,carrier:127,tasks:{init:"0x0810c0a0",step:"0x0810c164"}});
  });

  it("regenerates fog tiles, tilemap, palette, and blend table byte-for-byte", () => {
    const output=join(mkdtempSync(join(tmpdir(),"haze-assets-")),"haze.json");
    execFileSync(process.execPath,["--experimental-strip-types","tools/compare/extractHazeAssets.ts","--out",output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/haze.json"));
  });

  it("keeps twice-fresh full-window acceptance executable", () => {
    const portable=readFileSync("tools/compare/hazePortable.ts","utf8");
    expect(portable).toContain("runNumber <= 2");
    expect(portable).toContain("framebuffer ${framebuffer}/202");
    expect(portable).toContain("tools/run-mgba-probe.py");
  });
});
