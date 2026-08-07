import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation, sceneOnMinimizeView } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// age 5, frame 215, failing pixel (66,86)
const age = 5;
const view = sceneOnMinimizeView({ ...stage, age });
const displayed = sceneOnMinimizeView({ ...stage, age: age - 1 });
console.log("clones at age-1 (displayed):", displayed.clones.map(c=>`idx${c.index} m=${c.matrix} y2=${c.y2}`));
console.log("clones at age (view):", view.clones.map(c=>`idx${c.index} m=${c.matrix}`));
// What's the attacker scale at age 5? scale = 256+40*(5-1+1)=256+200=456
console.log("attacker scale at age5:", view.scale, "y2:", view.y2);
