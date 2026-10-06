// prep16 item 3: Psych Up (player attacker) as the battle's FIRST body (prep16-hist-psychup-player-first-shuckle: JUMPLUFF vs SHUCKLE; dense capture via tools/compare/psychUpProbe.py + RGB; the config's hard-coded
// NINJASK target species is overridden with SHUCKLE, every other input is capture-derived by psychUpInputsFor(.., rows)).  (a) first-body capture inputs vs the ROM RGB; (b) accepted (post-Swords-Dance) inputs vs the same RGB;
// (c) which input fields differ.    npx vite-node tools/integration/prep16PsychUpFirstBody.ts <out.json> <rgb-dir> [receipt.json]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { psychUpConfigFor, psychUpInputsFor } from "../compare/verifyPsychUpReducer.ts";
type Json = Record<string, any>;
const [corpusPath, rgbDir, outPath] = process.argv.slice(2);
const rows = (JSON.parse(readFileSync(corpusPath!, "utf8")) as Json).frames as Json[];
const accepted = (JSON.parse(gunzipSync(readFileSync("tools/compare/evidence/psych-up-player-dense-state.json.gz")).toString("utf8")) as Json).frames as Json[];
const withTarget = (c: Json) => ({ ...c, target: { ...c.target, species: "SHUCKLE" } });
const cfgFirst = withTarget(psychUpConfigFor("player-back", rows)), cfgAcc = withTarget(psychUpConfigFor("player-back", accepted));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const res: Json = { rows: rows.length, firstBody: { exact: 0, residual: 0, bad: [] as string[] }, acceptedPostSwordsDanceInputsOnFirstBodyCapture: { exact: 0, residual: 0, bad: [] as string[] } };
for (const [age, row] of rows.entries()) {
  const raw = readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb`); if (sha(raw) !== row.sha256) throw new Error("rgb drift");
  for (const [name, cfg] of [["firstBody", cfgFirst], ["acceptedPostSwordsDanceInputsOnFirstBodyCapture", cfgAcc]] as const) {
    const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg as never), age } });
    let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) n += 1;
    res[name].residual += n; if (n === 0) res[name].exact += 1; else if (res[name].bad.length < 8) res[name].bad.push(`${age}:${n}`);
  }
}
const a = psychUpInputsFor("player-back", rows) as Json, b = psychUpInputsFor("player-back", accepted) as Json;
const flat = (o: Json, p = ""): Json => Object.fromEntries(Object.entries(o).flatMap(([k, v]) => v && typeof v === "object" && !Array.isArray(v) ? Object.entries(flat(v, `${p}${k}.`)) : [[`${p}${k}`, v]]));
const fa = flat(a), fb2 = flat(b);
res.inputFieldsDiffering = Object.keys(fa).filter((k) => !/palettes\.(unfaded|faded|hardware)$|animationRng|gameplay|allocator|attackerSprite|targetSprite|spriteOrder/.test(k) && JSON.stringify(fa[k]) !== JSON.stringify(fb2[k])).map((k) => [k, JSON.stringify(fa[k]).slice(0, 80), JSON.stringify(fb2[k]).slice(0, 80)]);
console.log(JSON.stringify(res, null, 1));
if (outPath) writeFileSync(outPath, JSON.stringify(res, null, 1));
