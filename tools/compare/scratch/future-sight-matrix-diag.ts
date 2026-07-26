// Diagnostic (not a comparator): read the already-cached futureSightPortable
// probe.json's own playerSprite.matrix (RAM, gOamMatrices) directly, per
// frame, and find what mechanism age it corresponds to - same technique as
// growthPortable.ts's "component" check, but as a standalone sweep to
// determine whether the KADABRA attacker matrix is RAM-exact with NO lag
// (like GROWTH's own matrix), and what the actual framebuffer-vs-RAM lag is.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { futureSightAttackerEffectAtAge, FUTURE_SIGHT_ATTACKER_EFFECT_START_AGE } from "../../../src/engine/futureSight.ts";

const scratch = process.argv[2]!;
const probe = JSON.parse(readFileSync(join(scratch, "probe.json"), "utf8")) as {
  frames: {
    frame: number;
    playerSprite: { matrix: { a: number; d: number }; x2: number; y2: number; affineMode: number; paletteFaded: number[] };
  }[];
};

const START_FRAME = 77;
for (const f of probe.frames) {
  const age = f.frame - START_FRAME;
  // Mechanism with NO lag applied (local = age - START_AGE directly).
  const mech = futureSightAttackerEffectAtAge(age);
  const sprite = f.playerSprite;
  const active = sprite.matrix.a !== 256 || sprite.matrix.d !== 256;
  console.log(
    `frame${f.frame} age=${age} local=${age - FUTURE_SIGHT_ATTACKER_EFFECT_START_AGE} `
    + `RAM(a=${sprite.matrix.a},d=${sprite.matrix.d},x2=${sprite.x2},y2=${sprite.y2},affineMode=${sprite.affineMode}) `
    + `mech(active=${mech.attackerScale.active},x=${mech.attackerScale.xScale},y=${mech.attackerScale.yScale}) `
    + `${!active && !mech.attackerScale.active ? "match(inactive)" : sprite.matrix.a === mech.attackerScale.xScale && sprite.matrix.d === mech.attackerScale.yScale ? "MATCH" : "diff"}`,
  );
}
