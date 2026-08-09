import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FIXTURE_PATH = "tools/battle-lab/mechanic-color-change-off.json";
const RECEIPT_PATHS = [
  "tools/probe/receipts/color-change-off-seed-610839776.json",
  "tools/probe/receipts/color-change-off-seed-324508639.json",
] as const;

type Receipt = {
  profile: string;
  seed: number;
  initial: {
    player: { species: number; ability: number; types: number[]; hp: number; pp: number[] };
    opponent: { species: number; ability: number; types: number[]; hp: number; maxHp: number; pp: number[] };
  };
  typeChanges: Array<{
    frame: number;
    from: number[];
    to: number[];
    currentMove: number;
    lastUsedAbility: number;
    randomCallsThisFrame: number;
    targetHp: number;
  }>;
  colorChangeMessages: Array<{
    frame: number;
    displayedString: string;
    currentMove: number;
    lastUsedAbility: number;
  }>;
};

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("Battle Scene OFF Color Change semantic receipts", () => {
  it("keeps the staged complete-party request legal, controller-driven, and free of transient injection", () => {
    const fixture = json<Record<string, any>>(FIXTURE_PATH);
    expect(fixture).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-off",
      level: 50,
      challengeNum: 2,
      battleNum: 2,
      trainerId: 110,
    });
    const parties = fixture.overrides.parties;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    for (const mon of [...parties.player, ...parties.opponent]) {
      expect(mon).toMatchObject({ level: 50, item: 0, abilitySlot: 0, friendship: 70, shiny: false });
      expect(mon.ivs).toHaveProperty("hp");
      expect(mon.evs).toHaveProperty("hp");
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toEqual([0, 0, 0, 0]);
      expect(Object.keys(mon)).not.toEqual(expect.arrayContaining(["hp", "status1", "status2", "status3", "weather", "statStages"]));
    }
    expect(parties.player[0]).toMatchObject({ species: 135, moves: [85, 85, 85, 85] });
    expect(parties.opponent[0]).toMatchObject({ species: 317, moves: [150, 150, 150, 150] });
    expect(fixture.trace.segments.some((segment: { buttons: string[] }) => segment.buttons.includes("A"))).toBe(true);
  });

  it("pins two fresh stock-ROM observations of the shared ON_DAMAGE Color Change arm", () => {
    const receipts = RECEIPT_PATHS.map((path) => json<Receipt>(path));
    expect(receipts.map((receipt) => receipt.seed)).toEqual([610839776, 324508639]);

    for (const receipt of receipts) {
      expect(receipt.profile).toBe("battle-scene-off");
      expect(receipt.initial.player).toEqual({
        species: 135, ability: 10, types: [13, 13], hp: 140, pp: [15, 15, 15, 15],
      });
      expect(receipt.initial.opponent).toEqual({
        species: 317, ability: 16, types: [0, 0], hp: 167, maxHp: 167, pp: [40, 40, 40, 40],
      });
      expect(receipt.typeChanges).toHaveLength(1);
      expect(receipt.typeChanges[0]).toMatchObject({
        from: [0, 0],
        to: [13, 13],
        currentMove: 85,
        lastUsedAbility: 16,
        randomCallsThisFrame: 0,
      });
      expect(receipt.typeChanges[0]!.targetHp).toBeGreaterThan(0);
      expect(receipt.typeChanges[0]!.targetHp).toBeLessThan(receipt.initial.opponent.hp);
      expect(receipt.colorChangeMessages).toHaveLength(1);
      expect(receipt.colorChangeMessages[0]).toMatchObject({ currentMove: 85, lastUsedAbility: 16 });
      expect(receipt.colorChangeMessages[0]!.displayedString).toMatch(/KECLEON.*COLOR CHANGE[\s\S]*ELECTR/);
      expect(receipt.colorChangeMessages[0]!.frame).toBe(receipt.typeChanges[0]!.frame + 1);
    }
  });

  it("keeps the source caller, target ability selection, and kernel branch distinct but aligned", () => {
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const utility = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const kernel = readFileSync("src/engine/battleScriptMoveEndOpcode.ts", "utf8");
    expect(commands).toContain("case MOVEEND_ON_DAMAGE_ABILITIES:");
    expect(commands).toContain("AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)");
    const colorChange = utility.slice(utility.indexOf("case ABILITY_COLOR_CHANGE:"), utility.indexOf("case ABILITY_ROUGH_SKIN:"));
    expect(colorChange).toContain("move != MOVE_STRUGGLE");
    expect(colorChange).toContain("gBattleMoves[move].power != 0");
    expect(colorChange).toContain("TARGET_TURN_DAMAGED");
    expect(colorChange).toContain("!IS_BATTLER_OF_TYPE(battler, moveType)");
    expect(colorChange).toContain("SET_BATTLER_TYPE(battler, moveType)");
    expect(kernel).toContain("if (ability === ABILITY_COLOR_CHANGE)");
    expect(kernel).toContain('"BattleScript_ColorChangeActivates"');
  });
});
