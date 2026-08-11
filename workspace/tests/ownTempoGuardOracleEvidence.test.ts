import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import blockFixture from "../tools/battle-lab/mechanic-own-tempo-guard-confuseray-block-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/mechanic-own-tempo-guard-confuseray-control-off.json" with { type: "json" };
import blockReceipt from "../tools/probe/receipts/own-tempo-guard-confuseray-block-off.json" with { type: "json" };
import controlReceipt from "../tools/probe/receipts/own-tempo-guard-confuseray-control-off.json" with { type: "json" };

const INNER_FOCUS = 39;
const OWN_TEMPO = 20;
const LIMBER = 7;
const STATUS2_CONFUSION_MASK = 0x7;

describe("Pre-emptive Own Tempo confusion-guard family -- fresh Battle Scene OFF receipts (Confuse Ray)", () => {
  it("Confuse Ray: Smeargle's Own Tempo blocks confusion; a Ditto/Limber control confuses normally", () => {
    for (const fixture of [blockFixture, controlFixture]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
      expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 41, moves: [109, 109, 109, 109], abilitySlot: 0 });
    }
    expect(blockFixture.overrides.parties.opponent[0]).toMatchObject({ species: 235, abilitySlot: 0 });
    expect(controlFixture.overrides.parties.opponent[0]).toMatchObject({ species: 132, abilitySlot: 0 });

    expect(blockReceipt.summary).toEqual({
      defenderConfusionTransitionFrame: null,
      preventsMessageFrame: 99,
      confusedMessageFrame: null,
      totalRandomCalls: 6,
    });
    expect(controlReceipt.summary).toEqual({
      defenderConfusionTransitionFrame: 107,
      preventsMessageFrame: null,
      confusedMessageFrame: 109,
      totalRandomCalls: 10,
    });
    // The guard sits before accuracycheck in BattleScript_EffectConfuse, so
    // the block arm skips the accuracy roll entirely -- a real, attributable
    // 4-call delta (accuracy roll + confusion-duration roll + a seed-dependent
    // self-hit pair), not a fixed law for every own-tempo-guard move.
    expect(controlReceipt.summary.totalRandomCalls - blockReceipt.summary.totalRandomCalls).toBe(4);

    expect(blockReceipt.initial.opponent).toMatchObject({ ability: OWN_TEMPO, status2: 0 });
    expect(blockReceipt.final.opponent).toMatchObject({ ability: OWN_TEMPO, status2: 0 });
    expect((blockReceipt.final.opponent.status2 & STATUS2_CONFUSION_MASK)).toBe(0);

    expect(controlReceipt.initial.opponent).toMatchObject({ ability: LIMBER, status2: 0 });
    expect((controlReceipt.final.opponent.status2 & STATUS2_CONFUSION_MASK)).not.toBe(0);

    expect(blockReceipt.initial.player).toMatchObject({ ability: INNER_FOCUS, pp: [10, 10, 10, 10] });
    expect(blockReceipt.final.player).toMatchObject({ ability: INNER_FOCUS, pp: [9, 10, 10, 10] });
    expect(controlReceipt.final.player).toMatchObject({ ability: INNER_FOCUS, pp: [9, 10, 10, 10] });
  });

  it("cites the shared jumpifability BS_TARGET, ABILITY_OWN_TEMPO guard this receipt exercises", () => {
    const script = readFileSync(new URL("../reference/pokeemerald/data/battle_scripts_1.s", import.meta.url), "utf8");
    expect(script).toContain("BattleScript_EffectConfuse::");
    expect(script).toMatch(/BattleScript_EffectConfuse::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents/);
  });
});

describe("Pre-emptive Own Tempo confusion-guard family -- Swagger/Flatter/Teeter Dance route/guard certificates (not independently receipted)", () => {
  it("pins Swagger/Flatter's unconditional stat-raise before their own TryConfuse guard sub-label", () => {
    const script = readFileSync(new URL("../reference/pokeemerald/data/battle_scripts_1.s", import.meta.url), "utf8");
    expect(script).toMatch(/BattleScript_SwaggerTryConfuse::\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents/);
    expect(script).toMatch(/BattleScript_FlatterTryConfuse::\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents/);
  });

  it("pins Teeter Dance's per-target loop guard, reached after an unconditional self-exclusion check", () => {
    const script = readFileSync(new URL("../reference/pokeemerald/data/battle_scripts_1.s", import.meta.url), "utf8");
    expect(script).toMatch(/jumpifbyteequal gBattlerAttacker, gBattlerTarget, BattleScript_TeeterDanceLoopIncrement\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_TeeterDanceOwnTempoPrevents/);
    expect(script).toMatch(/BattleScript_TeeterDanceOwnTempoPrevents::\n\tpause B_WAIT_TIME_SHORT\n\tprintstring STRINGID_PKMNPREVENTSCONFUSIONWITH\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_TeeterDanceDoMoveEndIncrement/);
  });
});
