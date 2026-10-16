// pfr185: ROM (pfr185Run.py r1 == r2 rows + confirm-edge.json) vs the live forced-player send-in model applied to the faint path vs production now
// (the party select's fixed SEND OUT clock, fixtures/pfr185/prod-timing.json).  Frames from the ball spawn B, and from the SEND OUT confirm.
//   model next print  = D + 10  (D = sceneOn/OffPlayerForcedSwitchInDuration: the forced "dragged out!" first glyph; the faint path prints 10 later)
//   model action prompt = D + 17
//   node --experimental-strip-types --no-warnings tools/integration/pfr185Model.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { PARTY_SENDOUT_BALL_VISIBLE_START, PARTY_SENDOUT_BLANK_MESSAGE_START, PARTY_SENDOUT_ACTION_MENU_START } from "../../src/engine/partySelect.ts";
import { sceneOffPlayerForcedSwitchInDuration, sceneOnPlayerForcedSwitchInDuration } from "../../src/engine/switchInTail.ts";

const dir = "tools/integration/fixtures/pfr185";
const rom = JSON.parse(readFileSync(`${dir}/rom-rows-r1.json`, "utf8")) as any[];
const rom2 = JSON.parse(readFileSync(`${dir}/rom-rows-r2.json`, "utf8")) as any[];
const edge = new Map((JSON.parse(readFileSync(`${dir}/confirm-edge.json`, "utf8")) as any[]).map((e) => [e.key, e]));
const prod = JSON.parse(readFileSync(`${dir}/prod-timing.json`, "utf8")) as any[];
const prodMenu = new Set(prod.filter((p) => p.phasesFromConfirm["presenting:message"] === undefined).map((p) => p.actionMenuFromConfirm));
if (prodMenu.size !== 1) throw new Error(`production action menu offsets differ: ${[...prodMenu]}`);
const productionMenu = [...prodMenu][0] as number;

const out: any[] = []; let nextOk = 0; let promptOk = 0; let same = 0;
rom.forEach((r, i) => {
  const e = edge.get(`${r.id}-${r.scene}`)!;
  const species = r.case.species as number; const nature = (r.case.nature ?? 6) as number;
  const D = r.scene === "on" ? sceneOnPlayerForcedSwitchInDuration(species, nature) : sceneOffPlayerForcedSwitchInDuration(species);
  const modelNext = D + 10; const modelPrompt = D + 17;
  if (rom2[i].sha256 === r.sha256) same += 1;
  if (modelNext === r.nextTxt) nextOk += 1;
  if (modelPrompt === r.actionPrompt) promptOk += 1;
  const B = e.ballFromConfirm as number;
  out.push({
    id: r.id, scene: r.scene, species, nature, romR2Identical: rom2[i].sha256 === r.sha256,
    ballFromConfirm: B, romIdleFromBall: r.ctrlIdle, romNextFromBall: r.nextTxt, romPromptFromBall: r.actionPrompt,
    forcedModelD: D, modelNextFromBall: modelNext, modelPromptFromBall: modelPrompt,
    romNextFromConfirm: e.nextTxtFromConfirm, romPromptFromConfirm: e.promptFromConfirm,
    modelNextFromConfirm: B + modelNext, modelPromptFromConfirm: B + modelPrompt,
    productionNextFromConfirm: PARTY_SENDOUT_BLANK_MESSAGE_START, productionClockMenuFromConfirm: PARTY_SENDOUT_ACTION_MENU_START, productionMenuFromConfirm: productionMenu,
    productionMinusRomPrompt: productionMenu - e.promptFromConfirm, modelMinusRomPrompt: modelPrompt - r.actionPrompt,
  });
  console.log(`${r.id.padEnd(12)} ${r.scene.padEnd(3)} ROM next/prompt ${String(e.nextTxtFromConfirm).padStart(3)}/${String(e.promptFromConfirm).padStart(3)}  production ${PARTY_SENDOUT_BLANK_MESSAGE_START}/${productionMenu} (${productionMenu - e.promptFromConfirm >= 0 ? "+" : ""}${productionMenu - e.promptFromConfirm})  model ${B + modelNext}/${B + modelPrompt}  model-vs-ROM (from ball) next ${modelNext - r.nextTxt} prompt ${modelPrompt - r.actionPrompt}`);
});
console.log(`${out.length} rows, ROM r1 == r2 ${same}; model exact: next print ${nextOk}, action prompt ${promptOk}; production ball visible ${PARTY_SENDOUT_BALL_VISIBLE_START}`);
writeFileSync(process.argv[2]!, JSON.stringify({ productionBallVisibleFromConfirm: PARTY_SENDOUT_BALL_VISIBLE_START, rows: out }, null, 1) + "\n");
