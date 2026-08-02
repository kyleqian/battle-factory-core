import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const animationSource = readFileSync(
  new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
  "utf8",
);

function functionBlock(name: string, nextName: string): string {
  const start = animationSource.indexOf(`static void ${name}(struct Sprite *sprite)\n{`);
  const end = animationSource.indexOf(`static void ${nextName}(struct Sprite *sprite)\n{`, start);
  expect(start, `${name} source symbol`).toBeGreaterThanOrEqual(0);
  expect(end, `${nextName} source symbol`).toBeGreaterThan(start);
  return animationSource.slice(start, end);
}

describe("Anim_BackAndLunge source evidence", () => {
  it("keeps the initializer and five callbacks in pinned source order", () => {
    const names = [
      "Anim_BackAndLunge", "BackAndLunge_0", "BackAndLunge_1",
      "BackAndLunge_2", "BackAndLunge_3", "BackAndLunge_4",
    ];
    const positions = names.map((name) => animationSource.indexOf(
      `static void ${name}(struct Sprite *sprite)\n{`,
    ));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    const initializer = functionBlock("Anim_BackAndLunge", "BackAndLunge_0");
    expect(initializer).toContain("HandleStartAffineAnim(sprite);");
    expect(initializer).toContain("sprite->callback = BackAndLunge_0;");
    expect(initializer).not.toContain("BackAndLunge_0(sprite);");

    const callbackBlocks = names.slice(1).map((name, index) =>
      functionBlock(name, names[index + 2] ?? "BackFlip_0"));
    for (const block of callbackBlocks) {
      expect(block.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    }
    expect(callbackBlocks[0]).toContain("if (++sprite->x2 > 7)");
    expect(callbackBlocks[1]).toContain("u8 var = sprite->data[7];");
    expect(callbackBlocks[1]).toContain("do");
    expect(callbackBlocks[2]).toContain("rotation = (sprite->data[5] * 6) / sprite->data[6];");
    expect(callbackBlocks[2]).toContain("if (sprite->x2 < -8)");
    expect(callbackBlocks[3]).toContain("if (sprite->data[3] > 11)");
    expect(callbackBlocks[3]).toContain("sprite->data[2] -= 2;");
    expect(callbackBlocks[4]).toContain("sprite->x2 += 2;");
    expect(callbackBlocks[4]).toContain("ResetSpriteAfterAnim(sprite);");
    expect(callbackBlocks[4]).toContain("sprite->callback = WaitAnimEnd;");
  });
});
