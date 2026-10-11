import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import {
  GRASS_WHISTLE_RESTORE_BLEND_START_AGE, GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT, grassWhistleRestoreBlendStartAge,
} from "../src/animation/grassWhistle.ts";
import { ironTailAtAge } from "../src/animation/ironTail.ts";
import {
  LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS, liveMoveAnimationPresentation, liveMoveOpponentShadowReturn,
} from "../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { ctl95ControlRowSha, readCtl95ControlFixture } from "../tools/integration/ctl95ControlFixture.ts";

// ctl95 (docs/ctl95-doll-free-controls.md): the doll labs' doll-free control residuals, classified. Recover 105 = ARTIFACT (the checker's
// window alignment: production's age 0 is the first orb, activation + 10); GrassWhistle 320 = DEFECT fixed (restore blend after the last
// on-screen note; elevated shadow back after the script); Iron Tail 231 = DEFECT fixed (metal band masked by the attacker, no data10 gate).

const speciesId = (name: string) => speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id;
const mon = (name: string, side: "player" | "trainer", battler: 0 | 1) => ({
  species: speciesId(name), name, side, battler, partyIndex: 0, level: 50, hp: 50, maxHP: 100, gender: "male", status: "none",
  moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0,
});
const request = (moveId: number, attacker: 0 | 1) =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;

function grassWhistleRestore(side: "player" | "opponent", user: string, foe: string): number {
  const attacker = side === "player" ? 0 : 1;
  const field = {
    player: mon(attacker === 0 ? user : foe, "player", 0), opponent: mon(attacker === 0 ? foe : user, "trainer", 1),
  } as unknown as BattleResolutionDisplayedField;
  const state = liveMoveAnimationPresentation(request(320, attacker), field, 0)!;
  const config = state.config as unknown as Record<"attacker" | "target", { geometry: { animationCenter: { x: number; y: number } } }>;
  return grassWhistleRestoreBlendStartAge(config.attacker.geometry.animationCenter, config.target.geometry.animationCenter);
}

describe("ctl95 doll-free control classification", () => {
  it("GrassWhistle 320: the restore blend starts at the last on-screen note + 2 (8 measured pairs, 4 predicted before probing)", () => {
    // Fresh direct mGBA BG(5,5) steps at restore + 6 / + 12, r1 == r2 (tools/integration/fixtures/ctl95/receipts/).
    const measured: [side: "player" | "opponent", user: string, foe: string, restore: number][] = [
      ["opponent", "ROSELIA", "ONIX", 166], ["player", "ROSELIA", "ONIX", 163], // the accepted fixtures (the old constants)
      ["opponent", "PERSIAN", "SLOWBRO", 159], ["opponent", "GOLBAT", "LAPRAS", 161], // doll90's doll-free controls
      ["opponent", "GENGAR", "SLOWBRO", 157], ["opponent", "CROBAT", "WAILORD", 148], // predicted (gw-predictions.txt)
      ["player", "PERSIAN", "SLOWBRO", 163], ["player", "GENGAR", "SLOWBRO", 163],
    ];
    for (const [side, user, foe, restore] of measured) expect([side, user, foe, grassWhistleRestore(side, user, foe)]).toEqual([side, user, foe, restore]);
    expect([GRASS_WHISTLE_RESTORE_BLEND_START_AGE, GRASS_WHISTLE_RESTORE_BLEND_START_AGE_OPPONENT])
      .toEqual([grassWhistleRestore("player", "ROSELIA", "ONIX"), grassWhistleRestore("opponent", "ROSELIA", "ONIX")]);
  });

  it("GrassWhistle 320: the elevated-opponent shadow is back on rows 221..224 (220-row script, 225-row window)", () => {
    expect(LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS[320]).toBe(4);
    for (const attacker of [0, 1] as const) {
      expect([220, 221, 224].map((age) => liveMoveOpponentShadowReturn(request(320, attacker), age))).toEqual([false, true, true]);
    }
  });

  it("Iron Tail 231: the metal band is masked by the attacker from the first step through sweep 2 (no data10 >= 28 gate)", () => {
    const band = (age: number) => ironTailAtAge(age, "opponent", { x: 176, y: 40 }).metallic.maskSpriteActive;
    expect([5, 6, 9, 12, 41, 44, 68, 69].map(band)).toEqual([false, true, true, true, true, true, true, false]);
  });

  const dir = "tools/integration/fixtures/ctl95/windows";
  const windows = readdirSync(dir).filter((n) => n.endsWith(".json")).sort();
  it("commits seven ROM windows: Recover x2 (shift 10), GrassWhistle x3, Iron Tail x2", () => {
    expect(windows.map((n) => { const f = readCtl95ControlFixture(`${dir}/${n}`); return `${f.fixture.move}:${f.shift}:${f.rows.length}`; }))
      .toEqual(["GRASS_WHISTLE:0:225", "IRON_TAIL:0:135", "IRON_TAIL:0:135", "RECOVER:10:169", "GRASS_WHISTLE:0:225", "GRASS_WHISTLE:0:225",
        "RECOVER:10:169"]);
  });

  for (const name of windows) {
    it(`${name}: every window row of the production live renderer equals the ROM row (sha256)`, () => {
      const f = readCtl95ControlFixture(`${dir}/${name}`);
      const bad = f.rows.filter(([age, , sha]) => ctl95ControlRowSha(f, age) !== sha).map(([age]) => age);
      expect(bad).toEqual([]);
    }, 120_000);
  }

  it("Recover 105: age 0 is the first orb row (activation + 10), not the activation", () => {
    const f = readCtl95ControlFixture(`${dir}/doll90-ctl-recover-opponent-b0.json`);
    expect(f.rows[0]![1] - f.activation).toBe(10);
    // The activation-aligned framing of doll81 / doll90 renders these ROM rows 10 ages late: no longer equal.
    expect(ctl95ControlRowSha(f, 20)).not.toBe(f.rows[10]![2]);
    expect(ctl95ControlRowSha(f, 10)).toBe(f.rows[10]![2]);
  });
});
