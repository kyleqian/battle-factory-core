/** prep24: row-0 control. Alternate Snorlax(player) -> Pidgeot(opponent) row 0 fed ONLY with corpus inputs still differs by 200 px: the renderer draws the age-0 enemy shadow only for an opponent attacker (battleScene.ts RETURN branch), not for an elevated opponent target. usage: npx vite-node tools/integration/prep24ReturnRow0Control.ts [alt.json-stem] */
import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { returnConfigFor } from "../compare/verifyReturnReducer.ts";
const A = process.argv[2] ?? "/tmp/p24/alt/prep24-return-alt-snorlax-pidgeot-r1";
const rows = JSON.parse(readFileSync(`${A}.json`, "utf8")).frames;
const base = returnConfigFor("strongest", "player-back", rows, 0);
const NAMES: Record<string, string> = { "143": "SNORLAX", "18": "PIDGEOT" };
const nm = (s: unknown) => NAMES[String(s)] ?? String(s);
const ai = base.animationInputs, a = nm(base.attacker.species), t = nm(base.target.species);
const cfg = { ...base, attacker: { ...base.attacker, species: a }, target: { ...base.target, species: t }, animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: a }, targetArt: { ...ai.targetArt, displaySpecies: t } } };
const raw = readFileSync(`${A}-rgb/${String(rows[0].frame).padStart(5, "0")}.rgb`);
const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg as never), age: 0 } as never });
let n = 0; for (let p = 0; p < 38400; p += 1) if (app[p*4] !== raw[p*3] || app[p*4+1] !== raw[p*3+1] || app[p*4+2] !== raw[p*3+2]) n += 1;
console.log("row0 all-corpus inputs residual px:", n);
