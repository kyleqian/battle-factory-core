import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { sceneOnSkyAttackView } from "../../src/animation/sceneOnPresentation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// ISSUES #151 (species audit 7): idle-x2 class (Sheer Cold, Sand Tomb, Sky Attack charge) and the Sheer Cold elevated-opponent
// age-0 shadow. Dense proofs (2 fresh mGBA runs, accepted / alternate fixtures unchanged): tools/integration/fixtures/fix151-live-receipt.json.
const SA7 = "tools/integration/fixtures/species-audit-7/derived";
const fixture = (stem: string, dir = SA7) => JSON.parse(readFileSync(`${dir}/${stem}.json`, "utf8")) as Fixture;
const presentationAt = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  const e = view.effect as any;
  return liveMoveAnimationPresentation(e.request, view.field, age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input) as any;
};
const ZERO = { x2: 0, y2: 0 };

describe("ISSUES #151 idle-x2 class", () => {
  // No Sheer Cold task writes x2 / y2: the opponent RATTATA / ONIX rest (x2 = 1) persists in both roles, monbg copy included.
  it.each([
    ["rattata-sheer-cold-player-dewgong-opponent-chansey", ZERO, { x2: 1, y2: 0 }],
    ["onix-sheer-cold-player-dewgong-opponent-chansey", ZERO, { x2: 1, y2: 0 }],
    ["rattataA-sheer-cold-opponent-dewgong-player-chansey", { x2: 1, y2: 0 }, ZERO],
    ["onixA-sheer-cold-opponent-dewgong-player-chansey", { x2: 1, y2: 0 }, ZERO],
  ])("Sheer Cold %s carries the tracked idle rest", (stem, attacker, target) => {
    const p = presentationAt(fixture(stem), 0);
    expect(p.config.move).toBe("SHEER_COLD");
    expect(p.config.idleRest).toEqual({ attacker, target });
  });

  it("Sand Tomb carries the attacker rest (only the target is shaken)", () => {
    expect(presentationAt(fixture("rattataA-sand-tomb-opponent-dugtrio-player-onix"), 0).config.attackerIdleRest).toEqual({ x2: 1, y2: 0 });
    expect(presentationAt(fixture("sand-tomb-opponent-dugtrio-player-onix", "tools/integration/fixtures/q2-live"), 0).config.attackerIdleRest)
      .toEqual(ZERO);
  });

  // AnimTask_HorizontalShake (battle_anim_ground.c:666-705): no write on the task's first frame (age 43 keeps the rest), absolute
  // writes from age 44, and the final state zeroes x2 for the rest of the charge.
  it("Sky Attack charge: the attacker shake owns x2 from age 44 and leaves it zero", () => {
    const x2At = (stem: string, age: number, dir?: string) => {
      const p = presentationAt(fixture(stem, dir), age);
      return sceneOnSkyAttackView({ ...p, age }).battlers.attacker.sprite.x2;
    };
    const rattata = "rattataA-sky-attack-opponent-fearow-player-shuckle-charge";
    expect([42, 43, 44, 105, 106, 107, 147].map((age) => x2At(rattata, age))).toEqual([1, 1, 3, 1, 0, 0, 0]);
    const fearow = ["sky-attack-opponent-fearow-player-shuckle-charge", "tools/integration/fixtures/q2-live"] as const;
    expect([42, 43, 44, 107, 147].map((age) => x2At(fearow[0], age, fearow[1]))).toEqual([0, 0, 3, 0, 0]);
    // The charge never writes the target's x2: the monbg copy keeps the RATTATA target rest.
    expect(presentationAt(fixture("rattata-sky-attack-player-fearow-opponent-shuckle-charge"), 1).config.animationInputs.targetSprite.x2).toBe(1);
  });
});

describe("ISSUES #151 Sheer Cold elevated opponent age-0 shadow", () => {
  const shadow = JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8"));
  const shadowPixels = (fb: Uint8Array): number => {
    const x0 = 176 - shadow.width / 2, y0 = 40 + 29 - shadow.height / 2;
    let n = 0;
    for (const p of shadow.mask as number[]) {
      const o = ((y0 + Math.floor(p / shadow.width)) * 240 + x0 + (p % shadow.width)) * 4;
      if (fb[o] === shadow.color.r && fb[o + 1] === shadow.color.g && fb[o + 2] === shadow.color.b) n++;
    }
    return n;
  };
  it.each([
    "flygon-sheer-cold-player-dewgong-opponent-chansey", "golbat-sheer-cold-player-dewgong-opponent-chansey",
    "flygonA-sheer-cold-opponent-dewgong-player-chansey", "golbatA-sheer-cold-opponent-dewgong-player-chansey",
  ])("%s: the shadow is drawn on row 0 only", (stem) => {
    const f = fixture(stem);
    const at = (age: number) => {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, liveView(f, age));
      return shadowPixels(fb);
    };
    expect(at(0)).toBe(200);
    expect(at(1)).toBeLessThan(200);
  });
});
