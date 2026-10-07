/**
 * oam1: field-by-field check of the PRODUCTION hardware-OAM provider (liveMoveOamAssembler.ts via the live adapter) against
 * retained / fresh state corpora. The adapter inputs are the fixture's displayed field + the production lends (liveView); the
 * corpus is read only for the comparison. Rows 1..N-1 compare all 128 entries (pad words incl.); row 0 is the pre-activation
 * scene (reported, not required).
 *   npx vite-node tools/integration/oam1AssemblerCheck.ts --out=<out.json> <fixture.json>:<corpus.json[.gz]> ...
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith("--out="))?.slice(6);
const results = [];
for (const pair of args.filter((a) => !a.startsWith("--"))) {
  const [fixturePath, corpusPath] = pair.split(":") as [string, string];
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  // Only the fixture's own body: the corpus may hold several bodies (Fury Cutter: 4 x 43 rows); row 0 = its activation.
  const window = fixture.denseWindow!, rows = load(resolve(root, corpusPath)).slice(0, window.endFrame - window.startFrame + 1);
  let entries = 0, entryMatch = 0, rowsExact = 0, row0Exact = false;
  const examples: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const view = liveView(fixture, age);
    const e = view.effect as any;
    const presentation = liveMoveAnimationPresentation(e.request, view.field, age, e.paletteInput, e.spriteAllocatorInput,
      e.spriteOrderInput, e.presentationRng, e.battlerX2Input) as any;
    if (!presentation) throw new Error(`${fixturePath}: adapter declined at age ${age}`);
    const got: string[] = presentation.config.animationInputs.buffers.hardwareOam;
    const want: string[] = rows[age]!.hardwareOam;
    const same = got.length === want.length && got.every((v, i) => v === want[i]);
    if (age === 0) { row0Exact = same; continue; }
    for (let i = 0; i < 128; i += 1) { entries += 1; if (got[i] === want[i]) entryMatch += 1;
      else if (examples.length < 6) examples.push(`${age}/${i}: want ${want[i]} got ${got[i]}`); }
    if (same) rowsExact += 1;
  }
  const result = { fixture: fixturePath, corpus: corpusPath, rows: rows.length, checkedRows: rows.length - 1, rowsExact, entries, entryMatch, row0Exact, examples };
  console.log(JSON.stringify(result));
  results.push(result);
}
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
