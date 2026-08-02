import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import scenarioCharmeleon from "../../tools/compare/fixtures/sendout-front-charmeleon.json" with { type: "json" };
import scenarioGrowlithe from "../../tools/compare/fixtures/sendout-front-growlithe.json" with { type: "json" };
import charmeleonA from "../../tools/compare/fixtures/sendout-front-charmeleon-run-a.json" with { type: "json" };
import charmeleonB from "../../tools/compare/fixtures/sendout-front-charmeleon-run-b.json" with { type: "json" };
import growlitheA from "../../tools/compare/fixtures/sendout-front-growlithe-run-a.json" with { type: "json" };
import growlitheB from "../../tools/compare/fixtures/sendout-front-growlithe-run-b.json" with { type: "json" };

const ROOT = "../../tools/compare/fixtures/";
const RECEIPTS = [
  ["CHARMELEON", 5, "sendout-front-charmeleon-run-a.json", "sendout-front-charmeleon-run-b.json", charmeleonA, charmeleonB, 371, "0190ff42c6eb73abf7aa8dbf8db1704a8ceb8fbaa05869a6f83fd668a95491bf", 2],
  ["GROWLITHE", 58, "sendout-front-growlithe-run-a.json", "sendout-front-growlithe-run-b.json", growlitheA, growlitheB, 372, "f88488626bb95c8c9db0dd220cc74c85154c25b5632959c8c30c7d9ce1af8030", 5],
] as const;

describe("ANIM_BACK_AND_LUNGE Scene-ON evidence", () => {
  it("pins selector 37 and the complete Factory census", () => {
    const animationConstants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const selectorSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    expect(animationConstants).toMatch(/^#define ANIM_BACK_AND_LUNGE\s+37$/m);
    expect(selectorSource).toMatch(/^\s*\[SPECIES_CHARMELEON - 1\]\s*= ANIM_BACK_AND_LUNGE,$/m);
    expect(selectorSource).toMatch(/^\s*\[SPECIES_GROWLITHE - 1\]\s*= ANIM_BACK_AND_LUNGE,$/m);
    expect(Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_BACK_AND_LUNGE")
      .map(([species]) => species)).toEqual(["CHARMELEON", "GROWLITHE"]);
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(["CHARMELEON", "GROWLITHE"].filter((species) => factory.has(species)))
      .toEqual(["CHARMELEON", "GROWLITHE"]);
  });

  it("keeps the initializer and five callbacks in pinned source order", () => {
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const names = [
      "Anim_BackAndLunge", "BackAndLunge_0", "BackAndLunge_1",
      "BackAndLunge_2", "BackAndLunge_3", "BackAndLunge_4",
    ];
    const positions = names.map((name) => animationSource.indexOf(
      `static void ${name}(struct Sprite *sprite)\n{`,
    ));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    const block = (name: string, nextName: string): string => {
      const start = positions[names.indexOf(name)]!;
      const end = animationSource.indexOf(
        `static void ${nextName}(struct Sprite *sprite)\n{`, start,
      );
      return animationSource.slice(start, end);
    };
    const initializer = block("Anim_BackAndLunge", "BackAndLunge_0");
    expect(initializer).toContain("HandleStartAffineAnim(sprite);");
    expect(initializer).toContain("sprite->callback = BackAndLunge_0;");
    expect(initializer).not.toContain("BackAndLunge_0(sprite);");
    const callbacks = names.slice(1).map((name, index) =>
      block(name, names[index + 2] ?? "BackFlip_0"));
    for (const callback of callbacks) {
      expect(callback.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    }
    expect(callbacks[0]).toContain("if (++sprite->x2 > 7)");
    expect(callbacks[1]).toContain("u8 var = sprite->data[7];");
    expect(callbacks[1]).toContain("do");
    expect(callbacks[2]).toContain("rotation = (sprite->data[5] * 6) / sprite->data[6];");
    expect(callbacks[2]).toContain("if (sprite->x2 < -8)");
    expect(callbacks[3]).toContain("if (sprite->data[3] > 11)");
    expect(callbacks[3]).toContain("sprite->data[2] -= 2;");
    expect(callbacks[4]).toContain("sprite->x2 += 2;");
    expect(callbacks[4]).toContain("ResetSpriteAfterAnim(sprite);");
    expect(callbacks[4]).toContain("sprite->callback = WaitAnimEnd;");
  });

  it.each([
    ["CHARMELEON", scenarioCharmeleon],
    ["GROWLITHE", scenarioGrowlithe],
  ] as const)("pins a complete legal challenge-0 Scene-ON %s party", (_species, scenario) => {
    expect(scenario).toMatchObject({
      mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 0, trainerId: 50,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    for (const party of Object.values(scenario.overrides.parties)) {
      for (const mon of party) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number), abilitySlot: expect.any(Number),
          friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean),
        }));
      }
    }
  });

  it.each(RECEIPTS)("pins two independent settled receipts for %s", (
    _species, speciesId, fileA, fileB, receiptA, receiptB, bytes, sha256, commandIndex,
  ) => {
    const rawA = readFileSync(new URL(`${ROOT}${fileA}`, import.meta.url));
    const rawB = readFileSync(new URL(`${ROOT}${fileB}`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(bytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(sha256);
    expect(receiptA).toEqual(receiptB);
    expect(receiptA.ticks).toHaveLength(1);
    expect(receiptA.ticks[0]!.battler1).toMatchObject({
      x2: 0, y2: 0, animNum: 1, animCmdIndex: commandIndex,
      data2: speciesId, callbackSymbol: "SpriteCallbackDummy",
    });
  });
});
