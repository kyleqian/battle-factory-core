// Scene-OFF ROM frames (direct mGBA, tools/integration/elevatedOffStage.py scenarios) vs the production ordinary Scene OFF field
// renderer (renderBattleResolutionSceneOffView, no live effect) in the opponent-sprite window x136..215 y0..72.
// Per ROM frame: ROM shadow present (32x8 blob 526b63 at x160..191 y65..72), residual of production-as-is, residual of the patched
// copy (EP_PATCHED=src/engine/battleScene.patched.ts). A frame is "field-like" when one of the two renderers matches the ROM exactly.
//   node --experimental-strip-types tools/integration/elevatedOffCompare.ts <rgb-dir> <fixture.json> [out.json]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionSceneOffView } from "../../src/engine/battleScene.ts";

const [dir, fixturePath, outPath] = process.argv.slice(2);
const patched = process.env.EP_PATCHED ? await import(`../../${process.env.EP_PATCHED}`) : null;
const f = JSON.parse(readFileSync(fixturePath!, "utf8")) as Fixture;
const view = { ...liveView(f, 0), effect: null } as never;
const render = (fn: (fb: Uint8Array, v: never) => void) => { const fb = new Uint8Array(240 * 160 * 4); fn(fb, view); return fb; };
const prod = render(renderBattleResolutionSceneOffView as never);
let pat: Uint8Array | null = null;
if (patched) { patched.patchProof.suppressShadow = false; pat = render(patched.renderBattleResolutionSceneOffView); }
const px = (b: Uint8Array, p: number, s: number) => (b[p * s]! << 16) | (b[p * s + 1]! << 8) | b[p * s + 2]!;
const inBox = (p: number) => { const x = p % 240, y = (p / 240) | 0; return x >= 136 && x < 216 && y < 73; };
const resid = (rom: Uint8Array, r: Uint8Array) => { let n = 0; for (let p = 0; p < 240 * 160; p++) if (inBox(p) && px(rom, p, 3) !== px(r, p, 4)) n++; return n; };
const rows: { frame: number; romShadow: boolean; prod: number; patched?: number }[] = [];
for (const name of readdirSync(dir).filter((n) => n.endsWith(".rgb")).sort()) {
  const rom = readFileSync(`${dir}/${name}`);
  let sh = 0; for (let y = 65; y <= 72; y++) for (let x = 160; x <= 191; x++) if (px(rom, y * 240 + x, 3) === 0x526b63) sh++;
  rows.push({ frame: Number(name.slice(0, 5)), romShadow: sh >= 100, prod: resid(rom, prod), ...(pat ? { patched: resid(rom, pat) } : {}) });
}
const exactProd = rows.filter((r) => r.prod === 0), exactPat = pat ? rows.filter((r) => r.patched === 0) : [];
const summary = {
  fixture: fixturePath, frames: rows.length, romShadowFrames: rows.filter((r) => r.romShadow).length,
  prodExact: exactProd.length, patchedExact: pat ? exactPat.length : null,
  // frames where the ROM draws the field-style opponent (patched exact) but production does not
  prodWrongWhereFieldLike: pat ? exactPat.filter((r) => r.prod !== 0).length : null,
  prodResidualWhenWrong: pat ? [...new Set(exactPat.filter((r) => r.prod !== 0).map((r) => r.prod))].slice(0, 6) : null,
  patchedExactRanges: ranges(exactPat.map((r) => r.frame)),
};
function ranges(a: number[]) { const o: string[] = []; for (let i = 0; i < a.length;) { let j = i; while (a[j + 1] === a[j]! + 1) j++; o.push(a[i] === a[j] ? `${a[i]}` : `${a[i]}-${a[j]}`); i = j + 1; } return o; }
if (outPath) writeFileSync(outPath, JSON.stringify({ summary, rows }));
console.log(JSON.stringify(summary));
