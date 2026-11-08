/**
 * Reproducible source receipt for MOVE_SKY_UPPERCUT's presentation assets.
 *
 * The move owns no exclusive sprite art: its hit splats use the already
 * pinned ANIM_TAG_IMPACT sheet and its backdrop is the already pinned
 * BG_IN_AIR bundle.  Keep those reuse edges explicit instead of copying two
 * generic assets into a move-specific JSON file.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "tests/fixtures/data/sky-uppercut.json");

const scriptPath = join(root, "reference/pokeemerald/data/battle_anim_scripts.s");
const script = readFileSync(scriptPath, "utf8");
const start = script.indexOf("Move_SKY_UPPERCUT:\n");
const end = script.indexOf("\nMove_SECRET_POWER:", start);
if (start < 0 || end < 0) throw new Error("Move_SKY_UPPERCUT source body missing");
const body = script.slice(start, end);
for (const required of [
  "loadspritegfx ANIM_TAG_IMPACT",
  "fadetobg BG_IN_AIR",
  "create_basic_hitsplat_sprite",
  "AnimTask_MoveSkyUppercutBg",
]) {
  if (!body.includes(required)) throw new Error(`Move_SKY_UPPERCUT lacks ${required}`);
}

const impactPath = join(root, "src/assets/gen/battle-anim-hitsplat.json");
const backgroundPath = join(root, "src/animation/assets/seismic-toss.json");
const impactBytes = readFileSync(impactPath);
const backgroundBytes = readFileSync(backgroundPath);
const impact = JSON.parse(impactBytes.toString("utf8")) as { source: string };
const background = JSON.parse(backgroundBytes.toString("utf8")) as { source: string };
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:9599-9641 Move_SKY_UPPERCUT",
    scriptSha256: sha256(body),
    impact: "reused ANIM_TAG_IMPACT; gBasicHitSplatSpriteTemplate animation 1",
    background: "reused BG_IN_AIR; fadetobg / restorebg",
  },
  impactReuse: {
    path: "src/assets/gen/battle-anim-hitsplat.json",
    source: impact.source,
    sha256: sha256(impactBytes),
  },
  backgroundReuse: {
    path: "src/animation/assets/seismic-toss.json",
    source: background.source,
    sha256: sha256(backgroundBytes),
  },
})}\n`);
console.log(`wrote ${out}`);
