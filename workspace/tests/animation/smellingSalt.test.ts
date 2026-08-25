import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { smellingSaltAtAge } from "../../src/animation/smellingSalt.ts";

const paths = [
  "tools/compare/evidence/smelling-salt-player-dense-state.json.gz",
  "tools/compare/evidence/smelling-salt-opponent-dense-state.json.gz",
];

describe("MOVE_SMELLING_SALT pure source-age reducer", () => {
  it.each(paths)("replays every retained component row in %s", (path) => {
    const evidence = JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
    expect(evidence.sourceWindow.frameCount).toBe(121);
    for (const [age, row] of evidence.frames.entries()) {
      // MON_PIC_HEIGHT - 2 * GetBattlerYDeltaFromSpriteId: ONIX front/back.
      const reduced = smellingSaltAtAge(age, path.includes("player-") ? 60 : 64);
      expect(reduced.sourceOffset, `source offset age ${age}`).toBe(row.scriptOffset);
      expect(reduced.scriptActive, `script active age ${age}`).toBe(row.animScriptActive);
      const sprites = row.sprites.filter((sprite: any) =>
        sprite.template.symbol === "gSmellingSaltsHandSpriteTemplate");
      expect(reduced.hands.map((hand) => hand.x2), `hands age ${age}`)
        .toEqual(sprites.map((sprite: any) => sprite.x2));
      const exclamation = row.sprites.find((sprite: any) =>
        sprite.template.symbol === "gSmellingSaltExclamationSpriteTemplate");
      expect(reduced.exclamation?.visible ?? null, `exclamation age ${age}`)
        .toBe(exclamation ? !exclamation.invisible : null);
      const target = row.battlerSprites.target;
      expect(reduced.targetMatrix, `matrix age ${age}`).toEqual({
        a: target.matrix[0], d: target.matrix[3],
      });
      expect(reduced.targetY2, `y2 age ${age}`).toBe(target.y2);
      if (reduced.squishTargetX2 !== null) {
        expect(reduced.squishTargetX2, `squish x2 age ${age}`).toBe(target.x2);
      } else if (age >= 73) {
        expect(reduced.shakeTargetX2, `shake x2 age ${age}`).toBe(target.x2);
      }
    }
  });
});
