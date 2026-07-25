import { readFileSync } from "node:fs";
import {
  createSceneOnMovePresentation,
  sceneOnShadowPunchView,
} from "../../../src/engine/sceneOnPresentation.ts";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/shadow-punch-player-haunter-opponent-onix.json", "utf8"));
const stage = createSceneOnMovePresentation({
  move: "SHADOW_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerSpriteId: fixture.attackerSpriteId,
  attackerMoveSpeed: fixture.attackerMoveSpeed,
  attackerSubpriority: fixture.attackerSubpriority,
  fieldProfile: fixture.fieldProfile,
});

// Just print attackerVisible/x2/clones for a range of ages to compare directly
// against RAM ground truth printed earlier (attacker.invisible, x2, traceSprites).
for (let age = 35; age <= 50; age++) {
  const v = sceneOnShadowPunchView({ ...stage, age });
  console.log(age, "visible=", v.attackerVisible, "x2=", v.attackerX2, "clones=", v.clones.map(c=>c.x2));
}
