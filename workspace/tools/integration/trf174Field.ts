// trf174: the post-body FIELD (rows y < 112: battlers, shadow, healthboxes; the text window excluded) from the Transform body's first
// inactive row + 1 to the next script / at most 140 rows, through the production field (BattleCommandFieldBattler.transform ->
// createBattleCommandFieldArtView -> renderBattleResolutionLiveView with no effect), against an existing trf174Probe.py run.
// Controls: `own` (the untransformed DITTO field) and `unblended` (copied species with its raw palette) must NOT match.
// usage: node --experimental-strip-types --no-warnings tools/integration/trf174Field.ts <probe-dir> <fixture.json>...
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { withLiveTransform } from "../../src/engine/liveTransform.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const [dir, ...paths] = process.argv.slice(2);
type Probe = { frames: { frame: number; script: string | null; battlers: { sprite: { x2: number; y2: number; invisible: boolean } }[] }[] };
let failed = false;
const out: Record<string, unknown> = {};
for (const path of paths) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  const name = basename(f.scenario, ".json");
  const probe = JSON.parse(readFileSync(join(dir!, `${name}-r1.json`), "utf8")) as Probe;
  const end = f.denseWindow!.endFrame + 1;
  const rows = [];
  for (let frame = end; frame < end + 140; frame++) {
    const row = probe.frames[frame]!;
    if (row.script) break;
    rows.push(frame);
  }
  const base = liveView(f, 0);
  const attacker = f.attacker.geometry.side === "player" ? 0 : 1;
  const target = speciesStats.species.find((s) => s.name === `SPECIES_${f.target.species}`)!.id;
  const transformed = withLiveTransform(base.field, attacker, { species: target, personality: 0 });
  const views = {
    transformed: { ...base, effect: null, field: transformed, fieldArt: createBattleCommandFieldArtView(transformed) },
    own: { ...base, effect: null },
    unblended: (() => {
      const art = createBattleCommandFieldArtView(transformed);
      const raw = createBattleCommandFieldArtView({ ...transformed, [f.attacker.geometry.side]: { ...transformed[f.attacker.geometry.side], species: target, transform: undefined } });
      const side = f.attacker.geometry.side;
      return { ...base, effect: null, field: transformed, fieldArt: { ...art, [side]: { ...art[side], pic: raw[side].pic } } };
    })(),
  };
  const result: Record<string, { rows: number; exactRows: number; residual: number }> = {};
  for (const [label, view] of Object.entries(views)) {
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, view as typeof base);
    let exactRows = 0, residual = 0;
    for (const frame of rows) {
      const rgb = inflateSync(readFileSync(join(dir!, `${name}-r1-rgb`, `${String(frame).padStart(5, "0")}.rgb.z`)));
      let n = 0;
      for (let p = 0; p < 240 * 112; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) n++;
      }
      if (n === 0) exactRows++;
      residual += n;
    }
    result[label] = { rows: rows.length, exactRows, residual };
  }
  if (result.transformed!.exactRows !== rows.length || result.own!.exactRows !== 0 || result.unblended!.exactRows !== 0) failed = true;
  out[name] = { firstFrame: end, ...result };
  console.log(name, JSON.stringify(out[name]));
}
if (process.env.TRF174_FIELD_OUT) (await import("node:fs")).writeFileSync(process.env.TRF174_FIELD_OUT, JSON.stringify(out, null, 1) + "\n");
if (failed) process.exitCode = 1;
