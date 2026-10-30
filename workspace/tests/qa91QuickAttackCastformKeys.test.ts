// qa91 (docs/qa91-quick-attack-castform-keys.md): live audit 21's Quick Attack DEFECT and Castform key lift.
// 1. Quick Attack 98: AnimTask_ShakeMon writes the target's x2 absolutely, so from the impact age the target leaves its drawn rest: the
//    reducer's targetBaseX2 is -(the target's x2 at activation), the opponent's TRACKED front-idle rest (ONIX / RATTATA 1 until a body
//    zeroes it; every other species 0), not prep7's constant -1 for a player attacker (fitted on ONIX's first body).
// 2. LIVE_CASTFORM_FORM_PROVEN gains 52:by:1 / 53:by:1 / 184:at:3 (audit 21: window-alignment ARTIFACT); rain Icy Wind stays declined.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QUICK_ATTACK_IMPACT_FIRST_AGE, quickAttackAnimationAtAge } from "../src/animation/quickAttack.ts";
import { sceneOnQuickAttackView } from "../src/animation/sceneOnPresentation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_CASTFORM_FORM_PROVEN, LIVE_CASTFORM_FORM_RESIDUAL, liveCastformFormDeclineReason, liveMoveAnimationPresentation,
} from "../src/engine/liveMoveAnimation.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

const mon = (name: string, battler: 0 | 1, castformForm?: number) => ({
  species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
  hp: 100, maxHP: 120, gender: "male", status: "none", side: battler === 0 ? "player" : "trainer", battler,
  partyIndex: 0, moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0, ...(castformForm === undefined ? {} : { castformForm }),
});
const fieldOf = (player: string, opponent: string, forms: [number?, number?] = []) =>
  ({ player: mon(player, 0, forms[0]), opponent: mon(opponent, 1, forms[1]) }) as unknown as BattleResolutionDisplayedField;
const quickAttack = (attacker: 0 | 1) =>
  ({ moveId: 98, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 40, damage: 0, friendship: 70, multihit: 0 }) as const;
const ZEROED = { zeroed: ["player", "opponent"] as const };
/** Live age 14 = reducer age 58 (case 98 animationAgeOffset 44): the first impact row. */
const baseX2 = (attacker: 0 | 1, field: BattleResolutionDisplayedField, age: number, x2?: typeof ZEROED) =>
  sceneOnQuickAttackView(liveMoveAnimationPresentation(quickAttack(attacker), field, age, undefined, undefined, undefined, undefined, x2)!)
    .targetBaseX2;

describe("qa91: Quick Attack's target leaves its drawn rest when AnimTask_ShakeMon starts", () => {
  it("reducer: 0 before the impact age; -targetRestX2 from it, either side; a rest-0 target is never shifted", () => {
    for (const side of ["player", "opponent"] as const) {
      for (const rest of [0, 1]) {
        expect(quickAttackAnimationAtAge(QUICK_ATTACK_IMPACT_FIRST_AGE - 1, side, rest).targetBaseX2).toBe(0);
        for (const age of [58, 61, 67, 69, 80]) {
          expect(Object.is(quickAttackAnimationAtAge(age, side, rest).targetBaseX2, rest === 0 ? 0 : -rest)).toBe(true);
        }
      }
    }
  });

  it("live seam (player attacker): NIDORINO / SNORLAX / CROBAT 0 (audit 21's 16 windows); ONIX / RATTATA -1 at rest, 0 once zeroed", () => {
    for (const species of ["NIDORINO", "SNORLAX", "CROBAT"]) {
      expect([13, 14, 32].map((age) => baseX2(0, fieldOf("NIDORINA", species), age))).toEqual([0, 0, 0]);
      expect(baseX2(0, fieldOf("NIDORINA", species), 14, ZEROED)).toBe(0);
    }
    for (const species of ["ONIX", "RATTATA"]) {
      // First body (send-out rest 1, RAM: tools/integration/fixtures/qa91/x2/): the prep7 / audit 21 EXACT windows.
      expect([13, 14, 32].map((age) => baseX2(0, fieldOf("PIDGEOTTO", species), age))).toEqual([0, -1, -1]);
      // Later body (an earlier Quick Attack's ShakeMon left x2 0: the tracker's zeroed input).
      expect([13, 14, 32].map((age) => baseX2(0, fieldOf("PIDGEOTTO", species), age, ZEROED))).toEqual([0, 0, 0]);
    }
  });

  it("live seam (opponent attacker): the player-side target never shifts (unchanged)", () => {
    for (const species of ["ONIX", "NIDORINO", "RATTATA"]) {
      expect([14, 32].map((age) => baseX2(1, fieldOf(species, "PIDGEOTTO"), age))).toEqual([0, 0]);
    }
  });

  it("RAM receipt: the opponent sprite's x2 at each Quick Attack activation is the tracker's rest (ONIX 1 then 0; NIDORINO 0)", () => {
    const at = (name: string) => (JSON.parse(readFileSync(`tools/integration/fixtures/qa91/x2/${name}.json`, "utf8")) as {
      bodies: { label: string; startFrame: number; x2: number[][] }[] }).bodies
      .filter((b) => b.label === "Move_QUICK_ATTACK").map((b) => b.x2.find((row) => row[0] === b.startFrame)![3]);
    expect(at("a21-qa-ply-pidgeotto-onix")).toEqual([1, 0, 0]);
    expect(at("a21-qa-ply-nidorina-onix")).toEqual([1, 0, 0]);
    expect(at("a21-qa-ply-nidorina-nidorino")).toEqual([0, 0, 0]);
  });
});

describe("qa91: the Castform proven-key set", () => {
  const LIFTED = ["52:by:1", "53:by:1", "184:at:3"];
  it("lifts sun Ember / Flamethrower and hail Scary Face; rain Icy Wind stays a named TIMING-PHASE residual", () => {
    expect(LIVE_CASTFORM_FORM_PROVEN.size).toBe(34); // cff230: + 52:by:2 / 52:by:3
    for (const key of LIFTED) expect([LIVE_CASTFORM_FORM_PROVEN.has(key), LIVE_CASTFORM_FORM_RESIDUAL.has(key)], key).toEqual([true, false]);
    expect([...LIVE_CASTFORM_FORM_RESIDUAL.keys()]).toEqual(["196:by:2", "196:at:2"]);
    expect(liveCastformFormDeclineReason(fieldOf("CASTFORM", "GOLBAT", [1]), { moveId: 52, attacker: 0 })).toBeNull();
    expect(liveCastformFormDeclineReason(fieldOf("GOLBAT", "CASTFORM", [undefined, 1]), { moveId: 53, attacker: 1 })).toBeNull();
    expect(liveCastformFormDeclineReason(fieldOf("CASTFORM", "GOLBAT", [3]), { moveId: 184, attacker: 1 })).toBeNull();
    expect(liveCastformFormDeclineReason(fieldOf("CASTFORM", "GOLBAT", [2]), { moveId: 196, attacker: 1 }))
      .toMatch(/^measured residual 196:at:2: .*TIMING-PHASE/);
    expect(liveCastformFormDeclineReason(fieldOf("CASTFORM", "GOLBAT", [1]), { moveId: 52, attacker: 1 })).toBe("body not ROM-proven for 52:at:1");
  });

  it("final-code receipt (audit 21's aligned windows through this tree): every lifted window live, 0 px CHAIN and ENTRY, r1 == r2, both sides", () => {
    const dir = "tools/integration/fixtures/qa91/castform";
    type Row = { side: string; chain: { live: boolean; px: number; digests: string[] }; entry: { live: boolean; px: number } };
    const rows = readdirSync(dir).filter((f) => /^check-c83-(sun|hail)-.*\.json$/.test(f))
      .flatMap((f) => (JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { rows: Row[] }).rows);
    expect(rows.length).toBe(14);
    for (const r of rows) {
      expect([r.chain.live, r.chain.px, r.chain.digests[0] === r.chain.digests[1], r.entry.live, r.entry.px]).toEqual([true, 0, true, true, 0]);
    }
    expect(new Set(rows.map((r) => r.side))).toEqual(new Set(["player", "opponent"]));
  });
});
