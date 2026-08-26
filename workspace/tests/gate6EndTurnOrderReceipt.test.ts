import { describe, expect, it } from "vitest";
import orderFixture from "../tools/battle-lab/issue131-endturn-order-switch-off.json" with { type: "json" };
import tieFixture from "../tools/battle-lab/issue131-endturn-order-tie-off.json" with { type: "json" };
import tieControlFixture from "../tools/battle-lab/issue131-endturn-order-tie-control-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/issue131-endturn-order-off.json" with { type: "json" };
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

/**
 * ISSUES #131 -- `ENDTURN_ORDER` (`battle_util.c:1199-1218`) identity-fills
 * `gBattlerByTurnOrder` and re-sorts it with `GetWhoStrikesFirst(order[i],
 * order[j], FALSE)` at the top of EVERY end-turn pass, using post-action
 * speed and drawing `Random() & 1` on an exact effective-speed tie
 * (`battle_main.c:4728`/`:4745`).
 *
 * ROM receipt: `tools/probe/receipts/issue131-endturn-order-off.json`
 * (Battle Scene OFF, three mechanicLab arms, two fresh byte-identical runs
 * each). This file pins both of its arms through the kernel.
 */

const STRENGTH = 70;
const RNG_SEED = 919694434;
/** include/constants/battle.h:233 B_WEATHER_SANDSTORM_TEMPORARY. */
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const SPECIES_SANDSHREW = 27;
const SPECIES_SLUGMA = 218;
const SPECIES_DODUO = 84;
const SPECIES_RATTATA = 19;
const MOVE_SANDSTORM = 201;
const MOVE_FURY_ATTACK = 31;
const MOVE_SPLASH = 150;

/** Grass/Poison on both sides, so the sandstorm damage loop hits both. */
function switchTurnConfig(benchSpeed: number, weather: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: RNG_SEED,
    weather,
    player: {
      species: 1, moveId: STRENGTH, attack: 50, defense: 200,
      spAttack: 50, spDefense: 200, speed: 100, hp: 999,
    },
    trainer: {
      species: 43, moveId: STRENGTH, attack: 50, defense: 200,
      spAttack: 50, spDefense: 200, speed: 50, hp: 999,
    },
    playerBenchHp: [999, 0],
    playerBenchOverride: [{
      species: 1, moves: [STRENGTH, 0, 0, 0], maxHP: 999,
      attack: 50, defense: 200, speed: benchSpeed, spAttack: 50, spDefense: 200,
    }, undefined],
  };
}

/** One turn: the player switches to party slot 1, the trainer attacks. */
function runSwitchTurn(benchSpeed: number, weather: number) {
  const initial = createFactoryFullTurnBattleState(switchTurnConfig(benchSpeed, weather));
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1, side: "player", decision: { kind: "switch", partyIndex: 1 },
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (result.kind !== "decision-required") throw new Error("expected next player decision");
  return result;
}

describe("ISSUES #131 -- ENDTURN_ORDER's per-turn gBattlerByTurnOrder recompute, Battle Scene OFF receipt", () => {
  it("keeps all three fixtures complete legal mechanicLab parties varying only what the arm is about", () => {
    for (const fixture of [orderFixture, tieFixture, tieControlFixture]) {
      expect(fixture).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off",
        level: 50, seed: 305419897,
      });
      expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
    }
    // ORDER arm: SANDSHREW sets the sandstorm, SLUGMA is the slow switch-in,
    // and DODUO's four identical FURY ATTACK slots pin the Factory AI.
    expect(orderFixture.overrides.parties.player[0]).toMatchObject({
      species: SPECIES_SANDSHREW, moves: [MOVE_SANDSTORM, 91, 317, 28],
    });
    expect(orderFixture.overrides.parties.player[1]!.species).toBe(SPECIES_SLUGMA);
    expect(orderFixture.overrides.parties.opponent[0]).toMatchObject({
      species: SPECIES_DODUO,
      moves: [MOVE_FURY_ATTACK, MOVE_FURY_ATTACK, MOVE_FURY_ATTACK, MOVE_FURY_ATTACK],
    });
    // TIE arm vs its control: identical RATTATA/SPLASH parties, the opponent's
    // speed IV is the ONLY difference (31 => tie, 29 => one point slower).
    for (const fixture of [tieFixture, tieControlFixture]) {
      for (const side of ["player", "opponent"] as const) {
        for (const mon of fixture.overrides.parties[side]) {
          expect(mon).toMatchObject({
            species: SPECIES_RATTATA,
            moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH],
            item: 0,
          });
        }
      }
    }
    expect(tieFixture.overrides.parties.opponent[0]!.ivs.speed).toBe(31);
    expect(tieControlFixture.overrides.parties.opponent[0]!.ivs.speed).toBe(29);
    expect(receipt.freshRunCountPerArm).toBe(2);
    expect(receipt.byteIdenticalAcrossFreshRuns).toBe(true);
  });

  it("pins the ROM's own ORDER-arm numbers: action order [0,1], end-turn order [1,0], foe buffeted first", () => {
    const arm = receipt.arms.order;
    // gBattlerByTurnOrder at turn-2 action time -- the switch is ordered first
    // with NO speed comparison (battle_main.c:4820-4832).
    expect(arm.orderEvents[0]).toMatchObject({
      from: [1, 0, 0, 0], to: [0, 1, 0, 0], inBattleTurnPassed: false,
    });
    // ...and the ENDTURN_ORDER re-sort, INSIDE BattleTurnPassed.
    expect(arm.orderEvents[1]).toMatchObject({
      from: [0, 1, 0, 0], to: [1, 0, 0, 0], inBattleTurnPassed: true,
    });
    expect(arm.battleTurnPassedWindows[1]).toMatchObject({
      battlerByTurnOrderBefore: [0, 1, 0, 0],
      battlerByTurnOrderAfterEndturnOrder: [1, 0, 0, 0],
    });
    // SLUGMA speed 36, Foe DODUO speed 95: the messages follow the re-sort.
    const buffeted = arm.messageEvents
      .filter((event) => event.text.includes("buffeted") && event.frame > 2000)
      .map((event) => event.text.replace("\n", " "));
    expect(buffeted).toEqual([
      "Foe DODUO is buffeted by the sandstorm!",
      "SLUGMA is buffeted by the sandstorm!",
    ]);
    expect(arm.final.actives.player.speed).toBe(36);
    expect(arm.final.actives.opponent.speed).toBe(95);
  });

  it("pins the ROM's own TIE-arm numbers: one extra end-turn Random() over the speed-91 control", () => {
    const tie = receipt.arms.tie;
    const control = receipt.arms.tieControl;
    expect([tie.initial.actives.player.speed, tie.initial.actives.opponent.speed]).toEqual([92, 92]);
    expect([control.initial.actives.player.speed, control.initial.actives.opponent.speed]).toEqual([92, 91]);
    expect(tie.battleTurnPassedRandomCalls).toBe(control.battleTurnPassedRandomCalls + 1);
    // Two speed-tie draws per tied turn overall: SetActionsAndBattlersTurnOrder's
    // (battle_main.c:4846) and ENDTURN_ORDER's (battle_util.c:1209).
    expect(tie.totalRandomCalls).toBe(control.totalRandomCalls + 2);
    // The tie draw came up odd, so the end-turn order swapped; the control never does.
    expect(tie.orderEvents[1]).toMatchObject({
      from: [0, 1, 0, 0], to: [1, 0, 0, 0], inBattleTurnPassed: true,
    });
    expect(control.orderEvents).toEqual([]);
  });

  it("ARM (a): the kernel re-sorts the end-turn order by CURRENT speed after a switch, and the sandstorm loop follows it", () => {
    // Player switches in a speed-20 mon while the speed-50 trainer attacks:
    // the action order is [player, trainer] (switch first, no speed compare)
    // and the ROM's ENDTURN_ORDER re-sort makes it [trainer, player].
    const slowSwitchIn = runSwitchTurn(20, B_WEATHER_SANDSTORM_TEMPORARY);
    const rc = slowSwitchIn.state.rules.rulesContext;
    expect(rc.battlers[0]!.partyIndex).toBe(1);
    expect(rc.battlers[0]!.speed).toBe(20);
    expect(rc.battlers[1]!.speed).toBe(50);
    expect(rc.battlerByTurnOrder.slice(0, 2)).toEqual([1, 0]);
    // BattleScript_DamagingWeatherContinues walks gBattlerByTurnOrder
    // (copyarraywithindex, battle_scripts_1.s:3705), so the foe's sandstorm
    // damage resolves FIRST even though the player acted first this turn.
    const sandstormBattlers = slowSwitchIn.events.flatMap(({ payload }) =>
      payload.kind === "hp-change" && payload.to < payload.from ? [payload.battler] : []
    );
    expect(sandstormBattlers.slice(-2)).toEqual([1, 0]);

    // Control: a FASTER switch-in keeps [player, trainer] and buffets the
    // player first -- the same code path, only the speeds differ.
    const fastSwitchIn = runSwitchTurn(99, B_WEATHER_SANDSTORM_TEMPORARY);
    const fastRc = fastSwitchIn.state.rules.rulesContext;
    expect(fastRc.battlers[0]!.speed).toBe(99);
    expect(fastRc.battlerByTurnOrder.slice(0, 2)).toEqual([0, 1]);
    const fastSandstormBattlers = fastSwitchIn.events.flatMap(({ payload }) =>
      payload.kind === "hp-change" && payload.to < payload.from ? [payload.battler] : []
    );
    expect(fastSandstormBattlers.slice(-2)).toEqual([0, 1]);
  });

  it("ARM (b): an exact end-turn speed tie costs exactly one extra RNG draw over a one-point control", () => {
    // A switch turn skips the ACTION-order speed comparison entirely
    // (battle_main.c:4820-4832), so the only tie draw a tied switch turn can
    // make is ENDTURN_ORDER's own -- the receipt's isolated measurement.
    const tie = runSwitchTurn(50, 0);
    const control = runSwitchTurn(49, 0);
    expect(tie.state.rules.rulesContext.battlers[0]!.speed).toBe(50);
    expect(tie.state.rules.rulesContext.battlers[1]!.speed).toBe(50);
    expect(control.state.rules.rulesContext.battlers[0]!.speed).toBe(49);
    expect(tie.state.rng.calls).toBe(control.state.rng.calls + 1);
    // Same shape the ROM measured inside its end-turn window: 2 vs 1.
    expect(receipt.arms.tie.battleTurnPassedRandomCalls).toBe(2);
    expect(receipt.arms.tieControl.battleTurnPassedRandomCalls).toBe(1);
  });
});
