import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const DIR = "/tmp/menu-materialize-scan-out2";
function load(kind, tick) {
  return PNG.sync.read(readFileSync(`${DIR}/${kind}-${String(tick).padStart(5, "0")}.png`));
}

// Known particle-burst colors from docs/battle-scene-notes.md's own particle
// palette + accent tones observed in the oracle diffs (spark/star frames).
const PARTICLE_COLORS = new Set([
  "255,173,0", "255,255,255", "66,66,66", "214,41,41", "255,156,123", "132,0,0",
]);
const ONIX_TINT = "255,181,247";

for (let tick = 1653; tick <= 1663; tick++) {
  const app = load("app", tick);
  const oracle = load("oracle", tick);
  let total = 0, particleColored = 0, other = 0;
  const otherSamples = [];
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      const ar = app.data[i], ag = app.data[i+1], ab = app.data[i+2];
      const or_ = oracle.data[i], og = oracle.data[i+1], ob = oracle.data[i+2];
      if (ar !== or_ || ag !== og || ab !== ob) {
        total++;
        const oKey = `${or_},${og},${ob}`;
        const aKey = `${ar},${ag},${ab}`;
        if (PARTICLE_COLORS.has(oKey) || PARTICLE_COLORS.has(aKey)) {
          particleColored++;
        } else {
          other++;
          if (otherSamples.length < 10) otherSamples.push({ x, y, app: [ar,ag,ab], oracle: [or_,og,ob] });
        }
      }
    }
  }
  console.log(`tick ${tick}: total=${total} particleColored=${particleColored} other=${other}`);
  if (other > 0) for (const s of otherSamples) console.log("  OTHER:", JSON.stringify(s));
}
