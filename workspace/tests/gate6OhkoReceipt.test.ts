import { describe, expect, it } from "vitest";
import hitFixture from "../tools/battle-lab/gate6-ohko-hit-off.json" with { type: "json" };
import missFixture from "../tools/battle-lab/gate6-ohko-miss-off.json" with { type: "json" };
import sturdyFixture from "../tools/battle-lab/gate6-ohko-sturdy-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-ohko-off.json" with { type: "json" };
import issue129Receipt from "../tools/probe/receipts/issue129-kingsrock-ko-off.json" with { type: "json" };
import { gate6Context, runGate6ScriptToTerminal } from "./gate6StatusInteractionHelpers.ts";

const FISSURE = 90;
const HARDEN = 106;
const ZAP_CANNON = 192;
const KINGS_ROCK = 187;
const SPECIES_DUGTRIO = 51;
const SPECIES_METAPOD = 11;
const SPECIES_FORRETRESS = 205;
const ABILITY_STURDY = 5;
const ABILITY_SAND_VEIL = 8;
const ABILITY_SHED_SKIN = 61;
const MOVE_RESULT_MISSED = 1 << 0;
const MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_RESULT_ONE_HIT_KO = 1 << 4;

// gRngValue immediately before Cmd_tryKO's accuracy draw in each ROM arm
// (receipt arms.*.rngLedger[0].rngBefore). The STURDY arm never reaches a
// draw, so it reuses the hit arm's cursor to prove the refusal is unconditional.
const HIT_RNG = receipt.arms.hit.rngLedger[0]!.rngBefore;
const MISS_RNG = receipt.arms.miss.rngLedger[0]!.rngBefore;

function fissureContext(
  target: Readonly<{
    species: number;
    ability: number;
    hp: number;
    types: readonly [string, string];
  }>,
) {
  return gate6Context(
    1,
    {
      species: SPECIES_DUGTRIO,
      ability: ABILITY_SAND_VEIL,
      item: KINGS_ROCK,
      hp: 110,
      maxHP: 110,
      level: 50,
      attack: 123,
      defense: 70,
      spAttack: 63,
      spDefense: 90,
      types: ["TYPE_GROUND", "TYPE_GROUND"],
      moves: [FISSURE, FISSURE, FISSURE, FISSURE],
      pp: [5, 5, 5, 5],
    },
    {
      species: target.species,
      ability: target.ability,
      hp: target.hp,
      maxHP: target.hp,
      level: 50,
      defense: 100,
      spDefense: 100,
      types: target.types,
    },
    { currentMove: FISSURE },
  );
}

const METAPOD_TARGET = {
  species: SPECIES_METAPOD,
  ability: ABILITY_SHED_SKIN,
  hp: 125,
  types: ["TYPE_BUG", "TYPE_BUG"],
} as const;
const FORRETRESS_TARGET = {
  species: SPECIES_FORRETRESS,
  ability: ABILITY_STURDY,
  hp: 150,
  types: ["TYPE_BUG", "TYPE_STEEL"],
} as const;

describe("Gate-6 OHKO (FISSURE) Battle Scene OFF receipt", () => {
  it("keeps three complete legal three-mon fixtures differing only in seed and target", () => {
    for (const fixture of [hitFixture, missFixture, sturdyFixture]) {
      expect(fixture).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
      });
      expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      // DUGTRIO set 564 keeps its KING'S ROCK; all four slots are its own
      // FISSURE, and speed IV 31 vs the target's 0 keeps the order strict.
      expect(fixture.overrides.parties.player[0]).toMatchObject({
        species: SPECIES_DUGTRIO,
        abilitySlot: 0,
        item: KINGS_ROCK,
        moves: [FISSURE, FISSURE, FISSURE, FISSURE],
        ivs: expect.objectContaining({ speed: 31 }),
      });
      expect(fixture.overrides.parties.opponent[0]!.ivs.speed).toBe(0);
      expect(fixture.trace).toEqual(hitFixture.trace);
    }
    // The hit/miss arms are the SAME parties at different seeds.
    expect(missFixture.overrides).toEqual(hitFixture.overrides);
    expect(hitFixture.seed).toBe(305419897);
    expect(missFixture.seed).toBe(2);
    expect(hitFixture.overrides.parties.opponent[0]).toMatchObject({
      species: SPECIES_METAPOD,
      moves: [HARDEN, HARDEN, HARDEN, HARDEN],
    });
    // FORRETRESS set 575: STURDY is its only ability slot; all four slots are
    // ZAP CANNON (its own set move), which is ELECTRIC and cannot touch a
    // GROUND-type DUGTRIO -- so the attacker demonstrably survives the turn.
    expect(sturdyFixture.overrides.parties.opponent[0]).toMatchObject({
      species: SPECIES_FORRETRESS,
      abilitySlot: 0,
      item: 0,
      moves: [ZAP_CANNON, ZAP_CANNON, ZAP_CANNON, ZAP_CANNON],
    });
    expect(receipt.arms.sturdy.parties.target.ability).toBe(ABILITY_STURDY);
    expect(receipt.arms.sturdy.attackerHpBefore).toBe(receipt.arms.sturdy.attackerHpAfter);
  });

  it("pins two byte-identical fresh mGBA probe runs per arm", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-ohko-off-semantic-receipt/v1",
      oracleProfile: "battle-scene-off",
      probe: "tools/probe/probe-gate6-ohko-off.py",
      freshRunCountPerArm: 2,
      byteIdenticalAcrossFreshRuns: true,
    });
    expect(receipt.probeOutputSha256).toEqual({
      hit: expect.stringMatching(/^[0-9a-f]{64}$/),
      miss: expect.stringMatching(/^[0-9a-f]{64}$/),
      sturdy: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    // No Lock-On carrier exists in the rental pool, and Level 50 is fixed on
    // both sides, so two of Cmd_tryKO's branches are unreachable here.
    expect(receipt.lockOnBranch).toContain("0 of 882");
    expect(receipt.levelGate).toContain("Unreachable");
  });

  it("records one accuracy draw and a one-hit KO on the hit arm", () => {
    const arm = receipt.arms.hit;
    expect(arm.targetHpBefore).toBe(125);
    expect(arm.targetHpAfter).toBe(0);
    expect(arm.attackerPpAfter).toEqual([4, 5, 5, 5]);
    expect(arm.opponentHpEvents).toEqual([{
      frame: 268,
      from: 125,
      to: 0,
      fissureRandomCallsSoFar: 1,
      moveResultFlags: MOVE_RESULT_ONE_HIT_KO | MOVE_RESULT_NOT_VERY_EFFECTIVE,
    }]);
    expect(arm.messageEvents.map((event) => event.text)).toEqual([
      "FISSURE",
      "TYPE/<FC><06><01>GROUND",
      "DUGTRIO used\nFISSURE!",
      "It’s a one-hit KO!",
      "Foe METAPOD\nfainted!\n",
    ]);
    expect(arm.scriptsVisited).toEqual([]);
    // This arm's ledger is a TRUNCATED-WINDOW measurement: 1 Cmd_tryKO accuracy
    // draw + 1 Cmd_seteffectwithchance draw (battle_script_commands.c:2917
    // evaluates `Random() % 100 < percentChance` before it looks at
    // MOVE_EFFECT_BYTE, so the opcode costs a draw even at secondaryEffectChance
    // 0). The fixture's 934 frames stall at 443 on the faint message's 0xFB
    // prompt, so Cmd_moveend -- and with it King's Rock's third draw -- never
    // ran inside the window. See issue129Receipt for the full resolution.
    expect(arm.fissureRandomCalls).toBe(2);
    expect(arm.rngLedger.map((entry) => entry.frame)).toEqual([67, 359]);
    expect(receipt.drawCountsPerFissureResolution.hitBeforeTheKO).toBe(1);
    expect(receipt.drawCountsPerFissureResolution.hit).toBe(3);
    expect(receipt.windowTruncation).toMatchObject({ frames: 934, stallFrame: 443 });
    expect(receipt.kingsRockControl.status).toContain("SUPERSEDED");
    // The #129 arms run past the KO into the opponent's send-out, so only the
    // leading three entries belong to the FISSURE resolution.
    expect(issue129Receipt.arms.ohkoKingsRock.rngLedger.slice(0, 3).map((e) => e.frame))
      .toEqual([67, 359, 642]);
    expect(issue129Receipt.arms.ohkoNoItemControl.rngLedger.slice(0, 3).map((e) => e.frame))
      .toEqual([67, 359, 869]);
  });

  it("records one accuracy draw and BattleScript_KOFail's miss string on the miss arm", () => {
    const arm = receipt.arms.miss;
    expect(arm.targetHpBefore).toBe(125);
    expect(arm.targetHpAfter).toBe(125);
    expect(arm.opponentHpEvents).toEqual([]);
    expect(arm.attackerPpAfter).toEqual([4, 5, 5, 5]);
    expect(arm.scriptsVisited).toEqual([{
      frame: 67,
      symbol: "BattleScript_KOFail",
      lastUsedAbility: ABILITY_SHED_SKIN,
      moveResultFlags: MOVE_RESULT_MISSED | MOVE_RESULT_NOT_VERY_EFFECTIVE,
      opponentHp: 125,
      fissureRandomCallsSoFar: 1,
    }]);
    expect(arm.messageEvents.map((event) => event.text)).toEqual([
      "FISSURE",
      "TYPE/<FC><06><01>GROUND",
      "DUGTRIO used\nFISSURE!",
      "DUGTRIO’s\nattack missed!",
      "Foe METAPOD used\nHARDEN!",
      "Foe METAPOD’s DEFENSE\nrose!",
      "What will\nDUGTRIO do?",
    ]);
    // No King's Rock draw: gBattleMoveDamage stayed 0, so battle_util.c's
    // `if (gBattleMoveDamage)` guard skips the whole block.
    expect(arm.fissureRandomCalls).toBe(1);
  });

  it("records the STURDY refusal spending ZERO draws, ahead of the accuracy draw", () => {
    const arm = receipt.arms.sturdy;
    expect(arm.targetHpBefore).toBe(150);
    expect(arm.targetHpAfter).toBe(150);
    expect(arm.opponentHpEvents).toEqual([]);
    expect(arm.attackerPpAfter).toEqual([4, 5, 5, 5]);
    expect(arm.scriptsVisited).toEqual([{
      frame: 67,
      symbol: "BattleScript_SturdyPreventsOHKO",
      lastUsedAbility: ABILITY_STURDY,
      moveResultFlags: MOVE_RESULT_MISSED,
      opponentHp: 150,
      fissureRandomCallsSoFar: 0,
    }]);
    expect(arm.messageEvents.map((event) => event.text)).toEqual([
      "FISSURE",
      "TYPE/<FC><06><01>GROUND",
      "DUGTRIO used\nFISSURE!",
      "Foe FORRETRESS was protected\nby STURDY!",
      "Foe FORRETRESS used\nZAP CANNON!",
      "It doesn’t affect\nDUGTRIO<B0>",
      "What will\nDUGTRIO do?",
    ]);
    expect(arm.fissureRandomCalls).toBe(0);
    expect(receipt.drawCountsPerFissureResolution.sturdy).toBe(0);
  });

  it("drives BattleScript_EffectOHKO through the engine at the recorded RNG cursors and reproduces all three arms", () => {
    const hit = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(METAPOD_TARGET),
      HIT_RNG,
    );
    expect(hit.rulesContext.battlers[0]!.hp).toBe(receipt.arms.hit.targetHpAfter);
    expect(hit.rulesContext.battlers[1]!.pp).toEqual(receipt.arms.hit.attackerPpAfter);
    expect(hit.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_ONEHITKO" }),
    ]));
    expect(hit.rng.ledger.map((entry) => entry.reason)).toContain("tryko");

    const miss = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(METAPOD_TARGET),
      MISS_RNG,
    );
    expect(miss.rulesContext.battlers[0]!.hp).toBe(receipt.arms.miss.targetHpAfter);
    expect(miss.rulesContext.battlers[1]!.pp).toEqual(receipt.arms.miss.attackerPpAfter);
    expect(miss.events.some((event) =>
      event.kind === "message" && event.messageId === "STRINGID_ONEHITKO")).toBe(false);

    const sturdy = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(FORRETRESS_TARGET),
      HIT_RNG,
    );
    expect(sturdy.rulesContext.battlers[0]!.hp).toBe(receipt.arms.sturdy.targetHpAfter);
    expect(sturdy.rulesContext.battlers[1]!.pp).toEqual(receipt.arms.sturdy.attackerPpAfter);
    expect(sturdy.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNPROTECTEDBY" }),
    ]));
    // The refusal precedes the accuracy draw, so the engine spends none either
    // -- the same cursor that produced the ROM's KO leaves FORRETRESS at full HP.
    expect(sturdy.rng.ledger.map((entry) => entry.reason)).toEqual([]);
  });

  it("matches the ROM's miss and Sturdy draw counts exactly", () => {
    const miss = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(METAPOD_TARGET),
      MISS_RNG,
    );
    expect(miss.rng.ledger).toHaveLength(receipt.arms.miss.fissureRandomCalls);
    const sturdy = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(FORRETRESS_TARGET),
      HIT_RNG,
    );
    expect(sturdy.rng.ledger).toHaveLength(receipt.arms.sturdy.fissureRandomCalls);
  });

  // NOT a divergence (ISSUES #129, 2026-08-25): the engine's third draw at
  // MOVEEND_KINGSROCK_SHELLBELL (battleScriptMoveEndOpcode.ts:883-905 mirroring
  // battle_util.c:3768-3780) is what the stock ROM does. gBattleMoveDamage is
  // still 125 and gSpecialStatuses[target].physicalDmg is still 125 when
  // Cmd_moveend reaches state 12 on the OHKO path, so the draw fires and only
  // the trailing `&& gBattleMons[gBattlerTarget].hp` -- evaluated AFTER it --
  // is false. FISSURE is not FLAG_KINGS_ROCK_AFFECTED, so no flinch results.
  it("matches the ROM's THREE-draw OHKO hit, King's Rock's moveend draw included", () => {
    const hit = runGate6ScriptToTerminal(
      "BattleScript_EffectOHKO",
      fissureContext(METAPOD_TARGET),
      HIT_RNG,
    );
    const reasons = hit.rng.ledger.map((entry) => entry.reason);
    expect(reasons).toHaveLength(receipt.drawCountsPerFissureResolution.hit);
    expect(reasons.slice(0, 2)).toEqual(["tryko", "seteffectwithchance"]);
    expect(reasons[2]).toContain("King's Rock");
    expect(issue129Receipt.arms.ohkoKingsRock.rngLedger[2]!.moveendState).toBe(17);
  });
});
