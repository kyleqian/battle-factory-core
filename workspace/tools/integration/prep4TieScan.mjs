// Sprite-order dependence scan for Ember / Dragon Breath: for every presentation age of the accepted window, find sprite
// pairs that share the OAM sort key (same subpriority AND same centerY) and whose 16x16 cells overlap. Only such pairs consume
// the OAM index (SortSprites tie), i.e. the reducers' spawnIndex proxy. node --experimental-strip-types tools/integration/prep4TieScan.mjs
import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnEmberView, sceneOnDragonBreathView } from "../../src/animation/sceneOnPresentation.ts";
const res = [];
for (const [move, file, view, ages] of [["EMBER", "ember", sceneOnEmberView, [0, 62]], ["DRAGON_BREATH", "dragon-breath", sceneOnDragonBreathView, [-2, 82]]]) {
  for (const o of ["player-onix-opponent-murkrow", "opponent-onix-player-murkrow"]) {
    const fx = JSON.parse(readFileSync(`tools/compare/fixtures/${file}-${o}.json`, "utf8"));
    const stage = createSceneOnMovePresentation({ move, attacker: fx.attacker, target: fx.target, animationProfile: fx.animationProfile, fieldProfile: fx.fieldProfile });
    let ties = 0, overlapTies = 0, maxSprites = 0; const firstTies = [];
    for (let age = ages[0]; age <= ages[1]; age++) {
      for (const lag of [0, 1, 2]) { // the renderer shows state age-1 (Ember/DB) and DB adds a palette lag; scan neighbours too
        const v = view({ ...stage, age: age - lag });
        const sp = v.sprites ?? v.fireSprites ?? [];
        maxSprites = Math.max(maxSprites, sp.length);
        for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
          const a = sp[i], b = sp[j];
          const sub = (s) => s.subpriority ?? 0;
          if (a.centerY === b.centerY && sub(a) === sub(b)) {
            ties++;
            if (Math.abs(a.centerX - b.centerX) < 16) { overlapTies++; if (firstTies.length < 3) firstTies.push({ age: age - lag, a: [a.centerX, a.centerY], b: [b.centerX, b.centerY] }); }
          }
        }
      }
    }
    res.push({ move, orientation: o, ageRange: ages, maxSprites, equalKeyPairs: ties, overlappingEqualKeyPairs: overlapTies, firstTies });
  }
}
console.log(JSON.stringify(res, null, 1));
