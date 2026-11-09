// Pre-body counterpart: the ordinary field (no live effect) vs the ROM frames S-1..S-n before the body's first accepted row S
// (message / idle rows the ordinary queue owns). usage: elevatedPostbodyPrebody.ts <evidence-dir> <n> <opp window fixture>...
import { readFileSync, existsSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { basename, join } from "node:path";
const { renderBattleResolutionLiveView, patchProof } = await import(`../../src/engine/${process.env.EP_RENDERER ?? "battleScene.ts"}`);
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [evidence, nArg, ...fixtures] = process.argv.slice(2);
const px = (b: Uint8Array, p: number, s: number) => (b[p * s]! << 16) | (b[p * s + 1]! << 8) | b[p * s + 2]!;
for (const path of fixtures) {
  const source = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  const f: Fixture = source.sourceFixture ? { ...JSON.parse(readFileSync(source.sourceFixture, "utf8")), ...source } : source;
  const S = (f.denseWindow ?? f.sourceWindow)!.startFrame;
  const dir = join(evidence, `${basename(path, ".json")}-run0`);
  if (!existsSync(dir)) continue;
  const res: string[] = [];
  for (let k = Number(nArg); k >= 1; k--) {
    const file = join(dir, "rgb", `${String(S - k).padStart(5, "0")}.rgb`);
    if (!existsSync(file)) continue;
    const rgb = readFileSync(file); const rgba = new Uint8Array(240 * 160 * 4);
    if (patchProof) patchProof.suppressShadow = false;
    renderBattleResolutionLiveView(rgba, { ...liveView(f, 0), effect: null } as never);
    let r = 0, shadow = 0;
    for (let p = 0; p < 240 * 112; p++) { const x = p % 240, y = (p / 240) | 0; if (x < 136 || x > 215 || y > 72) continue; if (px(rgb, p, 3) !== px(rgba, p, 4)) r++; }
    for (let y = 65; y <= 72; y++) for (let x = 160; x <= 191; x++) if (px(rgb, y * 240 + x, 3) === 0x526b63) shadow++;
    res.push(`S-${k}:${r}${shadow >= 100 ? "s" : ""}`);
  }
  console.log(basename(path), "S", S, res.join(" "));
}
