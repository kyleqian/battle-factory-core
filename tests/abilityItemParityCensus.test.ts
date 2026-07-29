import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import hooksData from "../src/data/gen/ability-item-hooks.json" with { type: "json" };
import monsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import heldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };

// Pins for the ability/item parity census (ROADMAP S10 scope decision
// 2026-07-28): the source-hook ground-truth artifact, its byte-idempotent
// regeneration, and the census doc's regeneration ratchet. The exact-set
// pins mirror the move census's literal-entry rule: the extraction is only
// trustworthy while it reproduces the known source structure exactly.

type TokenMention = { token: string; line: number };
type HookCase = {
  caseName: string;
  dispatchLabels: TokenMention[];
  tokenMentions: TokenMention[];
  aliasLabels: { name: string }[];
};

const abilityCases = hooksData.abilityBattleEffects.cases as HookCase[];
const itemCases = hooksData.itemBattleEffects.cases as HookCase[];

function dispatchSet(cases: HookCase[], caseName: string): string[] {
  const hookCase = cases.find((candidate) => candidate.caseName === caseName);
  if (!hookCase) throw new Error(`case ${caseName} missing`);
  return [...new Set(hookCase.dispatchLabels.map((label) => label.token))].sort();
}

describe("ability-item-hooks ground-truth artifact", () => {
  it("pins the universes and case structure", () => {
    expect(hooksData.schema).toBe("ability-item-hooks/v1");
    expect(hooksData.universes.abilities).toHaveLength(78);
    expect(hooksData.universes.holdEffects).toHaveLength(67);
    expect(abilityCases).toHaveLength(20);
    expect(itemCases.map((hookCase) => hookCase.caseName)).toEqual([
      "ITEMEFFECT_ON_SWITCH_IN",
      "ITEMEFFECT_NORMAL",
      "ITEMEFFECT_DUMMY",
      "ITEMEFFECT_MOVE_END",
      "ITEMEFFECT_KINGSROCK_SHELLBELL",
    ]);
    expect(abilityCases.flatMap((hookCase) => hookCase.aliasLabels.map((alias) => alias.name)).sort()).toEqual([
      "ABILITYEFFECT_MUD_SPORT",
      "ABILITYEFFECT_SWITCH_IN_WEATHER",
      "ABILITYEFFECT_WATER_SPORT",
    ]);
  });

  it("pins the load-bearing delegate dispatch sets exactly", () => {
    expect(dispatchSet(abilityCases, "ABILITYEFFECT_ON_SWITCHIN")).toEqual([
      "ABILITY_AIR_LOCK",
      "ABILITY_CLOUD_NINE",
      "ABILITY_DRIZZLE",
      "ABILITY_DROUGHT",
      "ABILITY_FORECAST",
      "ABILITY_INTIMIDATE",
      "ABILITY_SAND_STREAM",
      "ABILITY_TRACE",
    ]);
    expect(dispatchSet(abilityCases, "ABILITYEFFECT_ENDTURN")).toEqual([
      "ABILITY_RAIN_DISH",
      "ABILITY_SHED_SKIN",
      "ABILITY_SPEED_BOOST",
      "ABILITY_TRUANT",
    ]);
    expect(dispatchSet(abilityCases, "ABILITYEFFECT_ABSORBING")).toEqual([
      "ABILITY_FLASH_FIRE",
      "ABILITY_VOLT_ABSORB",
      "ABILITY_WATER_ABSORB",
    ]);
    expect(dispatchSet(abilityCases, "ABILITYEFFECT_ON_DAMAGE")).toEqual([
      "ABILITY_COLOR_CHANGE",
      "ABILITY_CUTE_CHARM",
      "ABILITY_EFFECT_SPORE",
      "ABILITY_FLAME_BODY",
      "ABILITY_POISON_POINT",
      "ABILITY_ROUGH_SKIN",
      "ABILITY_STATIC",
    ]);
    expect(dispatchSet(abilityCases, "ABILITYEFFECT_IMMUNITY")).toEqual([
      "ABILITY_IMMUNITY",
      "ABILITY_INSOMNIA",
      "ABILITY_LIMBER",
      "ABILITY_MAGMA_ARMOR",
      "ABILITY_OBLIVIOUS",
      "ABILITY_OWN_TEMPO",
      "ABILITY_VITAL_SPIRIT",
      "ABILITY_WATER_VEIL",
    ]);
    expect(dispatchSet(itemCases, "ITEMEFFECT_KINGSROCK_SHELLBELL")).toEqual([
      "HOLD_EFFECT_FLINCH",
      "HOLD_EFFECT_SHELL_BELL",
    ]);
  });

  it("keeps condition-form members visible as token mentions", () => {
    const movesBlock = abilityCases.find((hookCase) => hookCase.caseName === "ABILITYEFFECT_MOVES_BLOCK")!;
    expect(new Set(movesBlock.tokenMentions.map((mention) => mention.token))).toContain("ABILITY_SOUNDPROOF");
  });
});

describe("Level-50 carrier joins (independent recomputation)", () => {
  const species = new Map(speciesStatsData.species.map((entry) => [entry.name, entry]));
  const holdEffectByTableId = new Map(heldItemsData.entries.map((row) => [row.itemTableId, row.holdEffect]));
  const l50 = monsData.entries.filter((mon) => mon.index < 850);

  function abilityCarriers(ability: string): number {
    return l50.filter((mon) => {
      const slots = species.get(mon.species)!.abilities;
      return slots[0] === ability || slots[1] === ability;
    }).length;
  }

  function holdEffectCarriers(holdEffect: string): number {
    return l50.filter((mon) => holdEffectByTableId.get(mon.itemTableId) === holdEffect).length;
  }

  it("pins known carrier counts the census ranks by", () => {
    expect(abilityCarriers("ABILITY_LEVITATE")).toBe(54);
    expect(abilityCarriers("ABILITY_INTIMIDATE")).toBe(38);
    expect(abilityCarriers("ABILITY_CHLOROPHYLL")).toBe(38);
    expect(holdEffectCarriers("HOLD_EFFECT_FOCUS_BAND")).toBe(78);
    expect(holdEffectCarriers("HOLD_EFFECT_QUICK_CLAW")).toBe(75);
    expect(holdEffectCarriers("HOLD_EFFECT_CHOICE_BAND")).toBe(12);
  });
});

describe("regeneration ratchets", () => {
  it("extract-ability-item-hooks regenerates the committed artifact byte-identically", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "ability-item-hooks-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/extract/extract-ability-item-hooks.ts", "--out-dir", outputDirectory],
      { stdio: "pipe" },
    );
    const regenerated = readFileSync(join(outputDirectory, "ability-item-hooks.json"), "utf8");
    const committed = readFileSync("src/data/gen/ability-item-hooks.json", "utf8");
    expect(
      regenerated === committed,
      "src/data/gen/ability-item-hooks.json is stale — rerun "
        + "`node --experimental-strip-types tools/extract/extract-ability-item-hooks.ts` and commit the result",
    ).toBe(true);
  });

  it("the parity census doc matches the current tree (regenerate it in the same commit as engine changes)", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "ability-item-census-"));
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/report/ability-item-parity-census.ts", "--out-dir", outputDirectory],
      { stdio: "pipe" },
    );
    const regenerated = readFileSync(join(outputDirectory, "ability-item-parity-census.md"), "utf8");
    const committed = readFileSync("docs/ability-item-parity-census.md", "utf8");
    expect(
      regenerated === committed,
      "docs/ability-item-parity-census.md is stale relative to the engine/corpus — rerun "
        + "`node --experimental-strip-types tools/report/ability-item-parity-census.ts` and commit the "
        + "regenerated doc in the same commit as the change that moved it (the same deliberate-regen "
        + "discipline as the move census)",
    ).toBe(true);
  });
});
