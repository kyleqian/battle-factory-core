import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/family-b-cluster4-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF family-B Cluster-4 item-motion receipts", () => {
  it("pins source and generated-data carrier facts", () => {
    const paths = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
      "battle_frontier_mons.h": "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "species_info.h": "reference/pokeemerald/src/data/pokemon/species_info.h",
      "constants_battle.h": "reference/pokeemerald/include/constants/battle.h",
      "moves.h": "reference/pokeemerald/include/constants/moves.h",
      "items.h": "reference/pokeemerald/include/constants/items.h",
      "abilities.h": "reference/pokeemerald/include/constants/abilities.h",
      "battle-frontier-mons.json": "src/data/gen/battle-frontier-mons.json",
      "species-stats.json": "src/data/gen/species-stats.json",
    } as const;
    expect(Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, sha256(path)]))).toEqual(evidence.sourceSha256);

    const generatedMons = JSON.parse(file(paths["battle-frontier-mons.json"])) as { entries: Array<{ index: number; label: string; species: string; moves: string[]; itemName: string; nature: string }> };
    const generatedSpecies = JSON.parse(file(paths["species-stats.json"])) as { species: Array<{ id: number; abilities: string[] }> };
    expect(generatedMons.entries[203]).toMatchObject({ index: 203, label: "FRONTIER_MON_LINOONE_1", species: "SPECIES_LINOONE", moves: ["MOVE_SECRET_POWER", "MOVE_SAND_ATTACK", "MOVE_COVET", "MOVE_TICKLE"], itemName: "BATTLE_FRONTIER_ITEM_WHITE_HERB", nature: "NATURE_ADAMANT" });
    expect(generatedMons.entries[163]).toMatchObject({ index: 163, label: "FRONTIER_MON_SABLEYE_1", species: "SPECIES_SABLEYE", moves: ["MOVE_FAINT_ATTACK", "MOVE_CONFUSE_RAY", "MOVE_KNOCK_OFF", "MOVE_FAKE_OUT"], itemName: "BATTLE_FRONTIER_ITEM_BLACK_GLASSES", nature: "NATURE_LONELY" });
    expect(generatedSpecies.species.find(({ id }) => id === 289)?.abilities).toEqual(["ABILITY_PICKUP", "ABILITY_NONE"]);
    expect(generatedSpecies.species.find(({ id }) => id === 322)?.abilities).toEqual(["ABILITY_KEEN_EYE", "ABILITY_NONE"]);
    expect(generatedSpecies.species.find(({ id }) => id === 367)?.abilities).toEqual(["ABILITY_LIQUID_OOZE", "ABILITY_STICKY_HOLD"]);
  });

  it("pins the steal, Sticky Hold, Knock Off, and switch-restoration source gates", () => {
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const stealStart = commands.indexOf("case MOVE_EFFECT_STEAL_ITEM:");
    const steal = commands.slice(stealStart, commands.indexOf("case MOVE_EFFECT_PREVENT_ESCAPE:", stealStart));
    const knockStart = commands.indexOf("case MOVE_EFFECT_KNOCK_OFF:");
    const knock = commands.slice(knockStart, commands.indexOf("case MOVE_EFFECT_SP_ATK_TWO_DOWN:", knockStart));
    const trickStart = commands.lastIndexOf("static void Cmd_tryswapitems(void)");
    const trick = commands.slice(trickStart, commands.indexOf("// Role Play", trickStart));
    expect(steal).toMatch(/BATTLE_TYPE_FRONTIER[\s\S]*?ABILITY_STICKY_HOLD[\s\S]*?BattleScript_NoItemSteal[\s\S]*?gBattleMons\[gBattlerAttacker\]\.item != ITEM_NONE[\s\S]*?ITEM_ENIGMA_BERRY[\s\S]*?IS_ITEM_MAIL[\s\S]*?item == ITEM_NONE/);
    expect(steal).toMatch(/gLastUsedItem = \*changedItem = gBattleMons\[gBattlerTarget\]\.item;[\s\S]*?gBattleMons\[gBattlerTarget\]\.item = ITEM_NONE;[\s\S]*?REQUEST_HELDITEM_BATTLE[\s\S]*?REQUEST_HELDITEM_BATTLE[\s\S]*?choicedMove/);
    expect(knock).toMatch(/ABILITY_STICKY_HOLD[\s\S]*?item == ITEM_NONE[\s\S]*?BattleScript_StickyHoldActivates[\s\S]*?gLastUsedItem = gBattleMons\[gEffectBattler\]\.item;[\s\S]*?item = ITEM_NONE;[\s\S]*?knockedOffMons[\s\S]*?BattleScript_KnockedOff[\s\S]*?choicedMove/);
    expect(trick).toMatch(/BATTLE_TYPE_FRONTIER[\s\S]*?knockedOffMons\[sideAttacker\][\s\S]*?knockedOffMons\[sideTarget\][\s\S]*?gBattleStruct->changedItems/);
    expect(commands).toMatch(/check knocked off item[\s\S]*?knockedOffMons\[i\][\s\S]*?gBattleMons\[gActiveBattler\]\.item = ITEM_NONE;/);
    expect(scripts).toContain("BattleScript_EffectThief::\n\tsetmoveeffect MOVE_EFFECT_STEAL_ITEM");
    expect(scripts).toContain("BattleScript_EffectKnockOff::\n\tsetmoveeffect MOVE_EFFECT_KNOCK_OFF");
    expect(scripts).toContain("BattleScript_ItemSteal::\n\tplayanimation BS_TARGET, B_ANIM_ITEM_STEAL");
    expect(scripts).toContain("BattleScript_KnockedOff::\n\tplayanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF");
  });

  it("keeps all three complete-party 25-frame receipts reproducible", () => {
    expect(evidence.schema).toBe("family-b-cluster4-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const receipt of Object.values(evidence.cases)) {
      expect(sha256(receipt.scenario)).toBe(receipt.scenarioSha256);
      expect(receipt.repeatability).toMatchObject({ runs: 2, comparison: "byte-identical full manifest.json" });
      expect(receipt.initialPartyChecksumsValid).toEqual(Array(6).fill(true));
      expect(receipt.speeds.player).toBeGreaterThan(receipt.speeds.opponent);
      const scenario = JSON.parse(file(receipt.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      const grid = Array.from({ length: receipt.captureGrid.count }, (_, index) => receipt.captureGrid.start + index * receipt.captureGrid.step);
      expect(scenario.trace.captureFrames).toEqual(grid);
      expect(grid.at(-1)).toBe(receipt.captureGrid.end);
      for (const observation of receipt.observed) expect(grid).toContain(observation.frame);
    }
  });

  it("pins item ownership, PP, no-op controls, RNG, and normalized framebuffer hashes", () => {
    const covet = evidence.cases.covetSuccessAndOccupiedAttacker.observed;
    expect(covet.map(({ covetPp, playerActiveItem, playerPartyItem, opponentActiveItem, opponentPartyItem }) => [covetPp, playerActiveItem, playerPartyItem, opponentActiveItem, opponentPartyItem])).toEqual([
      [40, 0, 0, 200, 200],
      [39, 0, 200, 0, 0],
      [39, 200, 200, 0, 0],
      [38, 200, 200, 0, 0],
      [38, 200, 200, 0, 0],
    ]);
    expect(covet.at(-1)?.opponentHp).toBe(113);

    const knock = evidence.cases.knockOffRemovalAndNoItem.observed;
    expect(knock.map(({ knockOffPp, opponentActiveItem, opponentPartyItem }) => [knockOffPp, opponentActiveItem, opponentPartyItem])).toEqual([
      [20, 180, 180],
      [19, 180, 180],
      [19, 0, 180],
      [18, 0, 180],
      [18, 0, 180],
    ]);
    expect(knock.map(({ opponentHp }) => opponentHp)).toEqual([127, 127, 122, 122, 117]);

    const sticky = evidence.cases.covetStickyHold.observed;
    expect(sticky.every(({ playerActiveItem, playerPartyItem, opponentActiveItem, opponentPartyItem, opponentAbility }) => playerActiveItem === 0 && playerPartyItem === 0 && opponentActiveItem === 186 && opponentPartyItem === 186 && opponentAbility === 60)).toBe(true);
    expect(sticky.map(({ covetPp, opponentHp }) => [covetPp, opponentHp])).toEqual([[40, 177], [39, 177], [39, 129], [39, 129]]);
    expect([...covet, ...knock, ...sticky].every(({ sha256, rngValue }) => /^[0-9a-f]{64}$/.test(sha256) && Number.isInteger(rngValue))).toBe(true);
    expect(evidence.observedVsSourceOnly).toContain("knockedOffMons");
  });
});
