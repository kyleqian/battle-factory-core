import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation, sceneOnMinimizeView } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const view = sceneOnMinimizeView({ ...stage, age: 1 });
console.log("view scale", view.scale, "y2", view.y2, "clones", view.clones.length, "blend", view.blendActive);
const engine: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 1 } };
try {
  const app = render(engine);
  console.log("render OK, len", app.length);
} catch (e) {
  console.log("RENDER THREW:", (e as Error).message);
  console.log((e as Error).stack);
}
