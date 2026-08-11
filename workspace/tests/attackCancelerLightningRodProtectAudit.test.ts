import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import speciesData from "../src/data/gen/species-stats.json" with { type: "json" };
import interceptFixture from "../tools/battle-lab/mechanic-protect-intercept-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/mechanic-protect-control-off.json" with { type: "json" };

const level50 = frontierMons.entries.filter((entry) => entry.index < 850);
const moveFacts = new Map<string, { flags: string[]; effect: string }>(movesData.moves.map((move) => [
  move.move,
  { flags: [...move.flags] as string[], effect: move.effect },
]));
const twoTurnEffects = new Set([
  "EFFECT_SKULL_BASH",
  "EFFECT_RAZOR_WIND",
  "EFFECT_SKY_ATTACK",
  "EFFECT_SOLAR_BEAM",
  "EFFECT_SEMI_INVULNERABLE",
  "EFFECT_BIDE",
]);

function hasMove(entry: (typeof level50)[number], move: string) {
  return entry.moves.includes(move);
}

describe("Lightning Rod / Protect attack-canceler audit fixtures", () => {
  it("keeps the OFF intercept and control legal at construction and free of transient injection", () => {
    for (const fixture of [interceptFixture, controlFixture]) {
      expect(fixture).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        playerSetIds: [121, 188, 135],
        opponentSetIds: [156, 149, 180],
        overrides: { battlers: { opponent: { moves: [332, 332, 332, 332], ability: 0 } } },
      });
      expect(JSON.stringify(fixture)).not.toMatch(/"(?:hp|status1|status2|status3|weather|statStages|sideConditions)"/);
      expect(fixture.trace.captureFrames).toEqual([0, 684]);
    }
    expect(interceptFixture.overrides.battlers.player).toMatchObject({ moves: [182, 182, 182, 182], ability: 0 });
    expect(controlFixture.overrides.battlers.player).toMatchObject({ moves: [150, 150, 150, 150], ability: 0 });
  });

  it("pins legal Level-50 Lightning Rod, Protect/Detect, Curse, and two-turn corpus reachability", () => {
    const lightningSpecies = new Set(speciesData.species
      .filter((species) => species.abilities.includes("ABILITY_LIGHTNING_ROD"))
      .map((species) => species.name));
    expect(level50).toHaveLength(850);
    expect(level50.filter((entry) => lightningSpecies.has(entry.species)).map((entry) => entry.index)).toEqual([
      64, 104, 133, 387, 393, 403, 470, 489, 499, 579, 585, 595, 675, 681, 691,
    ]);
    expect(level50.filter((entry) => hasMove(entry, "MOVE_PROTECT"))).toHaveLength(40);
    expect(level50.filter((entry) => hasMove(entry, "MOVE_DETECT"))).toHaveLength(5);
    expect(level50.filter((entry) => hasMove(entry, "MOVE_CURSE"))).toHaveLength(18);
    expect(level50.filter((entry) => entry.moves.some((move) =>
      moveFacts.get(move)?.flags.includes("FLAG_PROTECT_AFFECTED")))).toHaveLength(843);
    expect(level50.filter((entry) => entry.moves.some((move) =>
      twoTurnEffects.has(moveFacts.get(move)?.effect ?? "")))).toHaveLength(61);
  });

  it("pins the source order, singles-only redirection gate, and direct ownership boundary", () => {
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const utility = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    const history = readFileSync("reference/pokeemerald/src/battle_ai_script_commands.c", "utf8");
    const lightning = commands.indexOf("if (gSpecialStatuses[gBattlerTarget].lightningRodRedirected)");
    const protect = commands.indexOf("else if (DEFENDER_IS_PROTECTED", lightning);
    expect(lightning).toBeGreaterThan(commands.indexOf("BattleScript_SnatchedMove"));
    expect(protect).toBeGreaterThan(lightning);
    expect(commands).toContain("gSpecialStatuses[gBattlerTarget].lightningRodRedirected = FALSE;");
    expect(commands).toContain("gLastUsedAbility = ABILITY_LIGHTNING_ROD;");
    expect(commands).toContain("gBattlescriptCurrInstr = BattleScript_TookAttack;");
    expect(commands).toContain("RecordAbilityBattle(gBattlerTarget, gLastUsedAbility);");
    expect(commands).toContain("gMoveResultFlags |= MOVE_RESULT_MISSED;");
    expect(commands).toContain("gBattleCommunication[MISS_TYPE] = B_MSG_PROTECTED;");
    expect(utility).toContain("else if ((gBattleTypeFlags & BATTLE_TYPE_DOUBLE)");
    expect(utility).toContain("gSpecialStatuses[gActiveBattler].lightningRodRedirected = 1;");
    expect(utility).toContain("void CancelMultiTurnMoves(u8 battler)");
    expect(scripts).toContain("BattleScript_TookAttack::");
    expect(history).toContain("BATTLE_HISTORY->abilities[battler] = abilityId;");
  });
});
