import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import copyFixture from "../tools/battle-lab/mechanic-ability-manipulation-roleplay-copy-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/mechanic-ability-manipulation-roleplay-control-off.json" with { type: "json" };
import copyReceipt from "../tools/probe/receipts/ability-manipulation-roleplay-copy-off.json" with { type: "json" };
import controlReceipt from "../tools/probe/receipts/ability-manipulation-roleplay-control-off.json" with { type: "json" };

const SYNCHRONIZE = 28;
const LIMBER = 7;
const WONDER_GUARD = 25;

describe("Direct ability-manipulation opcode family -- fresh Battle Scene OFF receipts (Role Play)", () => {
  it("Role Play: Kadabra copies Ditto's Limber; a Shedinja Wonder Guard control blocks the copy", () => {
    for (const fixture of [copyFixture, controlFixture]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 64, moves: [272, 272, 272, 272], abilitySlot: 0 });
    }
    expect(copyFixture.overrides.parties.opponent[0]).toMatchObject({ species: 132, abilitySlot: 0 });
    expect(controlFixture.overrides.parties.opponent[0]).toMatchObject({ species: 303, abilitySlot: 0 });

    expect(copyReceipt.summary).toEqual({ attackerAbilityTransitionFrame: 67, copyMessageFrame: 103, totalRandomCalls: 10 });
    expect(controlReceipt.summary).toEqual({ attackerAbilityTransitionFrame: null, copyMessageFrame: null, totalRandomCalls: 10 });
    // Role Play's own accuracycheck uses NO_ACC_CALC_CHECK_LOCK_ON (no roll) and
    // trycopyability itself rolls nothing -- both arms consume identical RNG,
    // attributable only to the Factory AI's forced-Splash evaluation.
    expect(copyReceipt.summary.totalRandomCalls).toBe(controlReceipt.summary.totalRandomCalls);

    expect(copyReceipt.initial.player).toMatchObject({ ability: SYNCHRONIZE, partyAbility: SYNCHRONIZE });
    expect(copyReceipt.initial.opponent).toMatchObject({ ability: LIMBER, partyAbility: LIMBER });
    expect(copyReceipt.final.player).toMatchObject({ ability: LIMBER, partyAbility: SYNCHRONIZE, pp: [9, 10, 10, 10] });
    // Only the attacker's active byte is written; the target is never touched,
    // and the attacker's persistent party record is untouched too.
    expect(copyReceipt.final.opponent).toMatchObject({ ability: LIMBER, partyAbility: LIMBER });

    expect(controlReceipt.initial.opponent).toMatchObject({ ability: WONDER_GUARD, partyAbility: WONDER_GUARD });
    expect(controlReceipt.final.player).toMatchObject({ ability: SYNCHRONIZE, partyAbility: SYNCHRONIZE, pp: [9, 10, 10, 10] });
    expect(controlReceipt.final.opponent).toMatchObject({ ability: WONDER_GUARD });

    // gLastUsedAbility is not copy-exclusive: AbilityBattleEffects overwrites
    // it every call (switch-in/end-turn bookkeeping), so the control arm's
    // final value reflects Shedinja's own ability, not a Role Play write.
    expect(controlReceipt.final.lastUsedAbility).toBe(WONDER_GUARD);
  });

  it("cites the Cmd_trycopyability guard-chain source shape this receipt exercises", () => {
    const commands = readFileSync(new URL("../reference/pokeemerald/src/battle_script_commands.c", import.meta.url), "utf8");
    expect(commands).toContain("static void Cmd_trycopyability(void)");
    expect(commands).toMatch(/gBattleMons\[gBattlerTarget\]\.ability != ABILITY_NONE[\s\S]*?gBattleMons\[gBattlerTarget\]\.ability != ABILITY_WONDER_GUARD[\s\S]*?gBattleMons\[gBattlerAttacker\]\.ability = gBattleMons\[gBattlerTarget\]\.ability;[\s\S]*?gLastUsedAbility = gBattleMons\[gBattlerTarget\]\.ability;/);
  });
});

describe("Direct ability-manipulation opcode family -- pre-existing Skill Swap evidence (not restaged)", () => {
  it("references, and does not duplicate, docs/skill-swap-off-evidence.md's bare-swap witness", () => {
    const skillSwapTest = readFileSync(new URL("./skillSwapOracleEvidence.test.ts", import.meta.url), "utf8");
    expect(skillSwapTest).toContain("Battle Scene OFF Skill Swap / tryswapabilities evidence");
    expect(skillSwapTest).toContain("skill-swap-off-evidence.json");

    const swapReceipt = readFileSync(new URL("../tools/probe/receipts/immunity-limber-off-seed-610839776.json", import.meta.url), "utf8");
    expect(swapReceipt).toContain("abilitySwapped");
  });
});
