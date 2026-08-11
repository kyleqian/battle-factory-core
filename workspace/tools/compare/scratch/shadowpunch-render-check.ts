import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { createSceneOnMovePresentation } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";

const fixture = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const age = Number(process.argv[3]);
const stage = createSceneOnMovePresentation({
  move: "SHADOW_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerSpriteId: fixture.attackerSpriteId,
  attackerMoveSpeed: fixture.attackerMoveSpeed,
  attackerSubpriority: fixture.attackerSubpriority,
  fieldProfile: fixture.fieldProfile,
});
const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const rgba = render(engine);
const png = new PNG({ width: 240, height: 160 });
png.data = Buffer.from(rgba);
writeFileSync(process.argv[4]!, PNG.sync.write(png));
console.log("wrote", process.argv[4]);
