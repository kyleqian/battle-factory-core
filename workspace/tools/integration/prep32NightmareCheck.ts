/**
 * prep32 Nightmare field check (library: prep32NightmareLib.ts).
 *   npx vite-node tools/integration/prep32NightmareCheck.ts [<dense.json[.gz]>:player|opponent ...] [--lend=entry] [--neg=palette|registers|shake|phase] [--out=<file>]
 * Without window args: the accepted corpora (tools/compare/evidence/nightmare-{player,opponent}-dense-state.json.gz).
 */
import { writeFileSync } from "node:fs";
import { ACCEPTED, checkWindow, LEND, NEG } from "./prep32NightmareLib.ts";
import type { Side } from "./prep32NightmareModel.ts";

{
  const args = process.argv.slice(2).filter((x) => !x.startsWith("--"));
  const windows = (args.length ? args : ACCEPTED).map((w) => { const i = w.lastIndexOf(":"); return checkWindow(w.slice(0, i), w.slice(i + 1) as Side); });
  const receipt = { schema: "prep32-nightmare-check/v1", neg: NEG || null, lend: LEND, windows };
  const outPath = process.argv.find((x) => x.startsWith("--out="))?.slice(6);
  if (outPath) writeFileSync(outPath, `${JSON.stringify(receipt, null, 1)}\n`);
  for (const w of windows) console.log(w.window, w.rows, JSON.stringify(w.phase), w.allExact ? "ALL EXACT" : JSON.stringify(Object.fromEntries(Object.entries(w.fields).filter(([, f]: any) => f.exact !== f.rows).map(([n, f]: any) => [n, `${f.exact}/${f.rows} ${f.bad.join(",")}`]))));
}
