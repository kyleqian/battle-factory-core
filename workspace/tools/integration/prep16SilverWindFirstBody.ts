// prep16 item 3: Silver Wind, OPPONENT attacker as the battle's FIRST body (prep16-hist-silverwind-opp-first-shuckle, dense capture via tools/compare/silverWindProbe.py + RGB).
//  (a) reducer/renderer with inputs derived from this first-body capture (silverWindInputsFor(.., rows)): residual pixels vs the ROM RGB;
//  (b) the same frames rendered with the ACCEPTED (post-Tackle) opponent inputs: shows what the history input changes;
//  (c) which `background` fields differ between (a) and (b).    npx vite-node tools/integration/prep16SilverWindFirstBody.ts /tmp/p16/swfirst/out.json /tmp/p16/swfirst/rgb [out.json]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { silverWindConfigFor, silverWindInputsFor } from "../compare/verifySilverWindReducer.ts";
import { gunzipSync } from "node:zlib";
type Json = Record<string, any>;
const [corpusPath, rgbDir, outPath] = process.argv.slice(2);
const rows = (JSON.parse(readFileSync(corpusPath!, "utf8")) as Json).frames as Json[];
const accepted = (JSON.parse(gunzipSync(readFileSync("tools/compare/evidence/silver-wind-opponent-dense-state.json.gz")).toString("utf8")) as Json).frames as Json[];
const cfgFirst = silverWindConfigFor("opponent-front", rows), cfgAcc = silverWindConfigFor("opponent-front", accepted);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const res: Json = { rows: rows.length, firstBody: { exact: 0, residual: 0, bad: [] as string[] }, acceptedPostTackleInputs: { exact: 0, residual: 0, bad: [] as string[] } };
for (const [age, row] of rows.entries()) {
  const raw = readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb`); if (sha(raw) !== row.sha256) throw new Error("rgb drift");
  for (const [name, cfg] of [["firstBody", cfgFirst], ["acceptedPostTackleInputs", cfgAcc]] as const) {
    const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg), age } });
    let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) n += 1;
    res[name].residual += n; if (n === 0) res[name].exact += 1; else if (res[name].bad.length < 8) res[name].bad.push(`${age}:${n}`);
  }
}
const a = silverWindInputsFor("opponent-front", rows), b = silverWindInputsFor("opponent-front", accepted);
const diff = (x: Json, y: Json) => Object.fromEntries(Object.keys(x).filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k])).map((k) => [k, [x[k], y[k]]]));
res.backgroundFieldDiffFirstVsAccepted = { registers: diff(a.background.registers, b.background.registers), values: diff(a.background.values, b.background.values), monbg: diff(a.background.monbg, b.background.monbg) };
res.otherInputFieldsDiffering = Object.keys(a).filter((k) => !["background", "palettes", "animationRngSeed", "gameplayRng", "gameplayState", "allocator", "attackerSprite", "targetSprite"].includes(k) && JSON.stringify((a as Json)[k]) !== JSON.stringify((b as Json)[k]));
console.log(JSON.stringify(res, null, 1));
if (outPath) writeFileSync(outPath, JSON.stringify(res, null, 1));
