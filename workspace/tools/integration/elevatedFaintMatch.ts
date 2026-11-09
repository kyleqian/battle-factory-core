// ISSUES #147 faint-sink check: each ROM frame (direct mGBA RGB dir from elevatedFaintStage.py) vs production renders of the ordinary field
// (with / without shadow, HP 0), the faint sink at every step (PROD-*, the real renderer) and ground/elevated sink candidates; prints
// the matching candidates per run of identical results (opponent-sprite window x136-215 y0-72).
//   node --experimental-strip-types tools/integration/elevatedFaintMatch.ts <rgb-dir> <fixture.json (same opponent species)>
import { readFileSync, readdirSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
const { renderBattleResolutionLiveView } = await import("../../src/engine/battleScene.ts");
const { liveView } = await import("./liveAdapterFramebuffer.ts");
const [dir, fixture] = process.argv.slice(2);
const f = JSON.parse(readFileSync(fixture!, "utf8"));
const base = { ...liveView(f, 0), effect: null };
const elev = base.fieldArt.opponent.speciesSymbol === "GOLBAT" ? 8 : 0;
const box = (p: number) => { const x = p % 240, y = (p / 240) | 0; return x >= 136 && x < 216 && y < 73; };
const render = (v: any) => { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, v); return fb; };
const cands: [string, Uint8Array][] = [["ordinary", render(base)], ["ordinary-noshadow", render({ ...base, postBodyShadowHidden: true })],
  ["empty", render({ ...base, visibility: { ...base.visibility, opponent: { ...base.visibility.opponent, sprite: false } } })]];
const steps0 = 8 - Math.floor(base.fieldArt.opponent.coords.yOffset / 8);
for (let s = 0; s <= steps0; s++) cands.push([`PROD-sink st${steps0} s${s}`, render({ ...base, field: { ...base.field, opponent: { ...base.field.opponent, hp: 0 } }, effect: { type: "faint", battler: 1, healthboxVisible: true, sink: { type: "opponent-tile-rows", keptRows: steps0 - s, y2: s * 8 } } })]);
cands.push(["PROD-ordinary-hp0", render({ ...base, field: { ...base.field, opponent: { ...base.field.opponent, hp: 0 } } })]);
const lowered = { ...base, fieldArt: { ...base.fieldArt, opponent: { ...base.fieldArt.opponent, speciesSymbol: "ONIX", origin: { x: base.fieldArt.opponent.origin.x, y: base.fieldArt.opponent.origin.y - elev } } } };
for (let steps = 1; steps <= 8; steps++) for (let s = 1; s <= steps; s++) {
  const eff = { type: "faint", battler: 1, healthboxVisible: true, sink: { type: "opponent-tile-rows", keptRows: steps - s, y2: s * 8 } };
  cands.push([`sink-ground st${steps} s${s}`, render({ ...base, effect: eff })]);
  if (elev) cands.push([`sink-elev st${steps} s${s}`, render({ ...lowered, effect: eff })]);
}
const files = readdirSync(dir!).filter(n => n.endsWith(".rgb")).sort();
let prev = "";
for (const n of files) {
  const rgb = readFileSync(`${dir}/${n}`);
  let shadow = 0; for (let y = 65; y <= 72; y++) for (let x = 160; x <= 191; x++) { const p = (y * 240 + x) * 3; if (rgb[p] === 0x52 && rgb[p + 1] === 0x6b && rgb[p + 2] === 0x63) shadow++; }
  const hits: string[] = []; let best = ["", 1e9] as [string, number];
  for (const [name, fb] of cands) {
    let r = 0; for (let p = 0; p < 240 * 160; p++) if (box(p) && (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2])) r++;
    if (r === 0) hits.push(name); if (r < best[1]) best = [name, r];
  }
  const line = `${hits.length ? hits.filter(h => h.startsWith('PROD') || h.startsWith('ordinary') || h==='empty').slice(0, 4).join("|") : `NONE best ${best[0]}:${best[1]}`} shadow=${shadow}`;
  if (line !== prev) console.log(n, line); prev = line;
}
