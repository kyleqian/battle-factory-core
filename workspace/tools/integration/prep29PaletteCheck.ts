// prep29: measured D-PAL check. For every probe scenario (prep29Probe.py state JSON), compares the ROM palette buffers at the move body's activation
// (BG banks 2/3/4, OBJ banks 0/1 = composite banks 16/17, unfaded AND faded) with src/engine/liveMovePaletteComposite.ts composeLivePalettes(player, opponent).
// usage: node --experimental-strip-types tools/integration/prep29PaletteCheck.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const [dir, outPath] = process.argv.slice(2);
const species = new Map<number, string>();
for (const m of readFileSync(join(root, "reference/pokeemerald/include/constants/species.h"), "utf8").matchAll(/#define SPECIES_(\w+)\s+(\d+)/g)) species.set(Number(m[2]), m[1]!);
const MOVES: Record<string, number> = { bonemerang: 155, eruption: 284, "rapid-spin": 229, "spit-up": 255, "luster-purge": 295, outrage: 200 };
const out: any = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const scName = f.slice(0, -8);
  const mv = Object.keys(MOVES).find((k) => scName.startsWith(`mechanic-${k}-`) || scName.startsWith(`prep29-${k}-alt-`));
  if (!mv) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const bodies = probe.bodies.filter((b: any) => b.move === MOVES[mv]);
  for (const [bi, body] of bodies.entries()) {
  const scen = JSON.parse(readFileSync(join(root, "tools/battle-lab", `${scName}.json`), "utf8"));
  const P = scen.overrides.parties;
  const p = species.get(P.player[0].species)!, o = species.get(P.opponent[0].species)!;
  const comp = composeLivePalettes(p, o);
  const a = body.atActivation;
  const rows: Record<string, boolean | null> = {};
  if (!comp) { out[`${scName}#${bi}`] = { player: p, opponent: o, composite: null }; continue; }
  const hex = (v: number) => v.toString(16).padStart(4, "0");
  const bank = (arr: number[], b: number) => arr.slice(b * 16, b * 16 + 16).map(hex).join("");
  for (const kind of ["Unfaded", "Faded"]) {
    const obj: string[] = a[`obj${kind}`], bg: string[] = a[kind === "Unfaded" ? "bgUnfaded" : "bgUnfaded"];
    const c = comp[kind === "Unfaded" ? "unfaded" : "faded"];
    rows[`obj0=${kind}`] = obj[0] === bank(c, 16); rows[`obj1=${kind}`] = obj[1] === bank(c, 17);
    if (kind === "Unfaded") for (const b of [2, 3, 4]) rows[`bg${b}=Unfaded`] = bg[b] === bank(c, b);
  }
  out[`${scName}#${bi}`] = { player: p, opponent: o, ...rows };
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
const all = Object.values(out).flatMap((r: any) => Object.entries(r).filter(([k]) => /=/.test(k)).map(([, v]) => v));
console.log(`scenarios ${Object.keys(out).length}; checks ${all.length}; true ${all.filter((v) => v === true).length}; false ${all.filter((v) => v === false).length}`);
for (const [n, r] of Object.entries(out)) { const bad = Object.entries(r as any).filter(([k, v]) => /=/.test(k) && v !== true).map(([k]) => k); if (bad.length) console.log(n, bad.join(",")); }
