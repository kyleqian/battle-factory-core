// prep7: Quick Attack afterimage slots 3/4 tie audit on the direct-mGBA sprite dumps (prep7-sprites/quick-attack-*.json): for every frame with >=2 pool sprites it lists equal-key
// (priority, subpriority, OAM y) pairs and which slot the ROM's sSpriteOrder puts in front (earlier = drawn on top), then compares with the renderer's rule
// (battleScene.ts:48690-48725 draws slot 3 under slot 4 where slot 4 is opaque, i.e. slot 4 in front) and the reducer's slot labels (quickAttack.ts:100-120: slot 3 ages <=?, slot 4 ages 58..64).
//   node --experimental-strip-types tools/integration/prep7QuickAttackTie.mjs > tools/integration/fixtures/prep7-quick-attack-tie.json
import { readFileSync } from "node:fs";
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const out = [];
for (const f of ["quick-attack-pidgeotto-onix", "quick-attack-player-pidgeotto-onix"]) {
  const d = JSON.parse(readFileSync(`tools/integration/fixtures/prep7-sprites/${f}.json`));
  const frames = Object.keys(d.dumps).map(Number).sort((a, b) => a - b);
  const act = d.intervals.find((i) => i.move === 98).start;
  const pairs = []; let multi = 0; const slotsSeen = new Set();
  for (const fr of frames) {
    const r = d.dumps[fr]; const pool = r.sprites.filter((s) => !RES.has(s.slot));
    pool.forEach((s) => slotsSeen.add(s.slot));
    if (pool.length < 2) continue; multi++;
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      const key = (s) => `${(s.attr[2] >> 10) & 3}/${s.subpriority}/${s.attr[0] & 0xff}`;
      if (key(a) !== key(b)) continue;
      const pa = r.spriteOrder.indexOf(a.slot), pb = r.spriteOrder.indexOf(b.slot);
      pairs.push({ frame: fr, age: fr - act, slots: [a.slot, b.slot], key: key(a), romFront: pa < pb ? a.slot : b.slot, x: [a.x + a.x2, b.x + b.x2], y: [a.y + a.y2, b.y + b.y2] });
    }
  }
  out.push({ scenario: f, activation: act, poolSlotsSeen: [...slotsSeen].sort((a, b) => a - b), framesWithTwoOrMorePoolSprites: multi, equalKeyPairFrames: pairs.length, romFrontCounts: pairs.reduce((m, p) => ((m[p.romFront] = (m[p.romFront] ?? 0) + 1), m), {}), pairs: pairs.slice(0, 40) });
}
console.log(JSON.stringify(out, null, 1));
