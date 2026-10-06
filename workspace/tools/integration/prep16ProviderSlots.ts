// prep16: does the EXISTING palette provider (spritePaletteHost via createLiveMovePaletteHost) allocate the banks the ROM uses for Overheat (ember 7, impact 8) and Silver Wind (sparkle6 7),
// and do the loaded unfaded rows equal the asset words?  (plan rows 315 / 318 do not exist in live-animation-palette-resources.json: this applies the same loads directly.)
//   npx vite-node tools/integration/prep16ProviderSlots.ts [out.json]
import { writeFileSync } from "node:fs";
import data from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import { createLiveMovePaletteHost } from "../../src/engine/liveMoveAnimationPalette.ts";
import { loadSpritePalette } from "../../src/animation/spritePaletteHost.ts";
import swAsset from "../../src/animation/assets/silver-wind.json" with { type: "json" };
import { assetWords } from "./prep16PaletteComposite.ts";
import ember from "../../src/assets/gen/battle-anim-small-ember.json" with { type: "json" };
import hit from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
const res = (data as any).resources, host0 = createLiveMovePaletteHost().memory;
const out: Record<string, any> = {};
const run = (name: string, loads: { tag: number; colors: readonly number[] }[]) => {
  let m = host0; const rows: any[] = [];
  for (const l of loads) { const r = loadSpritePalette(m, l.tag, l.colors); m = r.host; rows.push({ tag: l.tag, bank: 16 + r.index, unfadedEqualsAsset: JSON.stringify(m.unfaded.slice(256 + r.index * 16, 256 + r.index * 16 + 16)) === JSON.stringify(l.colors), fadedEqualsAsset: JSON.stringify(m.faded.slice(256 + r.index * 16, 256 + r.index * 16 + 16)) === JSON.stringify(l.colors) }); }
  out[name] = rows; console.log(name, JSON.stringify(rows));
};
const words = (o: any) => [...o.colors];
run("overheat (SMALL_EMBER, IMPACT) via live-animation-palette-resources.json", [res.ANIM_TAG_SMALL_EMBER, res.ANIM_TAG_IMPACT].map((r: any) => ({ tag: r.tag, colors: r.colors })));
out.overheatResourceJsonEqualsAssets = { ember: JSON.stringify(res.ANIM_TAG_SMALL_EMBER.colors) === JSON.stringify(assetWords(ember.palette as any)), impact: JSON.stringify(res.ANIM_TAG_IMPACT.colors) === JSON.stringify(assetWords(hit.palette as any)) };
console.log("resource json == asset words", JSON.stringify(out.overheatResourceJsonEqualsAssets));
run("silver wind (SPARKLE_6; tag 10263? taken from the asset)", [{ tag: (swAsset as any).resources.sparkle6.tagValue, colors: assetWords((swAsset as any).resources.sparkle6.palette) }]);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
