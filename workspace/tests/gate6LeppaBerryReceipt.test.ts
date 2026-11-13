import { describe, expect, it } from "vitest";
import fixture from "../tools/battle-lab/gate6-leppa-berry-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-leppa-berry-off.json" with { type: "json" };
import {
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
} from "../src/engine/battleScriptRulesContext.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  gate6Battler,
  gate6Context,
  gate6Ports,
  gate6Program,
} from "./gate6StatusInteractionHelpers.ts";

const HORN_DRILL = 32;
const MEAN_LOOK = 212;
const ITEM_LEPPA_BERRY = 138;
const SPECIES_NIDOKING = 34;
const SPECIES_MISDREAVUS = 200;

/** Nidoking exactly as the ROM leaves it after the fifth HORN DRILL (receipt ppTimeline[4]). */
function emptiedSlotContext() {
  return gate6Context(
    0,
    gate6Battler({
      species: SPECIES_NIDOKING,
      ability: 38,
      hp: 156,
      maxHP: 156,
      item: ITEM_LEPPA_BERRY,
      moves: [HORN_DRILL, HORN_DRILL, HORN_DRILL, HORN_DRILL],
      pp: [0, 5, 5, 5],
      types: ["TYPE_POISON", "TYPE_GROUND"],
    }),
    gate6Battler({
      species: SPECIES_MISDREAVUS,
      ability: 26,
      hp: 135,
      maxHP: 135,
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      moves: [MEAN_LOOK, MEAN_LOOK, MEAN_LOOK, MEAN_LOOK],
      pp: [5, 5, 5, 5],
    }),
  );
}

function runEndTurn(rulesContext: ReturnType<typeof emptiedSlotContext>) {
  const ports = gate6Ports();
  const handlers = createBattleScriptStatusRulesHandlers(gate6Program, ports);
  const initial = createBattleScriptStatusRulesExecution(
    gate6Program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    ports,
  ).state;
  const result = runBattleEndTurnOrchestration(gate6Program, handlers, initial);
  if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
  return { result, initial };
}

describe("Gate-6 LEPPA BERRY end-turn PP restore Battle Scene OFF receipt", () => {
  it("keeps the complete legal three-mon fixture wired to the receipt", () => {
    expect(fixture).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-off",
      level: 50,
      seed: 305419897,
    });
    expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    // Nidoking set 606 keeps its own LEPPA BERRY and HORN DRILL; PP Ups stay 0
    // so the restore cap is HORN DRILL's unmodified 5 PP.
    expect(fixture.overrides.parties.player[0]).toMatchObject({
      species: SPECIES_NIDOKING,
      item: ITEM_LEPPA_BERRY,
      abilitySlot: 0,
      moves: [HORN_DRILL, HORN_DRILL, HORN_DRILL, HORN_DRILL],
      ppUps: [0, 0, 0, 0],
    });
    // Pure-Ghost Misdreavus set 566 with MEAN LOOK in all four slots: the
    // Factory AI has one legal choice, it deals no damage, and HORN DRILL
    // (Normal) can never connect, so five turns are guaranteed.
    expect(fixture.overrides.parties.opponent[0]).toMatchObject({
      species: SPECIES_MISDREAVUS,
      moves: [MEAN_LOOK, MEAN_LOOK, MEAN_LOOK, MEAN_LOOK],
      ivs: expect.objectContaining({ speed: 0 }),
    });
    expect(receipt.parties.leppaNidoking).toEqual({
      species: SPECIES_NIDOKING, item: ITEM_LEPPA_BERRY, abilitySlot: 0, ability: 38,
      moves: [HORN_DRILL, HORN_DRILL, HORN_DRILL, HORN_DRILL], pp: [5, 5, 5, 5],
    });
  });

  it("pins two byte-identical fresh mGBA probe runs", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-leppa-berry-off-semantic-receipt/v1",
      oracleProfile: "battle-scene-off",
      probe: "tools/probe/probe-gate6-leppa-berry-off.py",
      fixture: "tools/battle-lab/gate6-leppa-berry-off.json",
      freshRunCount: 2,
      byteIdenticalAcrossFreshRuns: true,
    });
    expect(receipt.probeOutputSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("records the ROM's five-turn PP walk, the fire turn, the capped value and the consumed berry", () => {
    expect(receipt.ppTimeline.slice(0, 6).map((row) => [row.frame, row.ppBefore, row.ppAfter])).toEqual([
      [67, 5, 4],
      [467, 4, 3],
      [847, 3, 2],
      [1227, 2, 1],
      [1607, 1, 0],
      [1918, 0, 5],
    ]);
    // Battler copy and persistent party record move together on every frame.
    for (const row of receipt.ppTimeline) expect(row.recordPp).toBe(row.ppAfter);
    expect(receipt.hornDrillUsesBeforeRestore).toBe(9);
    expect(receipt.restore).toEqual({
      frame: 1918,
      ppAfter: [5, 5, 5, 5],
      recordPpAfter: [5, 5, 5, 5],
      itemAfter: ITEM_LEPPA_BERRY,
      recordItemAfter: ITEM_LEPPA_BERRY,
    });
    // The message prints after the PP write, and the item clears later still.
    expect(receipt.restoreMessage).toEqual([
      { frame: 1953, text: "NIDOKING’s LEPPA BERRY\nrestored HORN DRILL’s PP!" },
    ]);
    expect(receipt.itemTimeline).toEqual([
      { frame: 2066, itemBefore: ITEM_LEPPA_BERRY, itemAfter: 0, recordItem: 0, pp: [5, 5, 5, 5] },
    ]);
    // One-shot: the next four uses walk 5 -> 1 with no second restore.
    expect(receipt.ppTimeline.slice(6).map((row) => [row.ppBefore, row.ppAfter])).toEqual([
      [5, 4], [4, 3], [3, 2], [2, 1],
    ]);
    expect(receipt.final.player.item).toBe(0);
    // Ghost immunity keeps Nidoking at full HP for the whole trace.
    expect(receipt.playerHpAcrossTrace).toEqual({ initial: 156, final: 156, maxHp: 156 });
  });

  it("drives the same end-turn item poll through the engine and reproduces the restore", () => {
    const { result, initial } = runEndTurn(emptiedSlotContext());
    const holder = result.state.rulesContext.battlers[0]!;
    expect(holder.pp).toEqual(receipt.restore.ppAfter);
    // docs/parity-mac/party-pp-writes.md: BtlController_EmitSetMonData(i + REQUEST_PPMOVE1_BATTLE, &changedPP) (battle_util.c:3377)
    // writes the PARTY Pokemon. Unfixed: the party record kept 0 and the restored PP was lost on a switch (ROM seed 7879).
    expect(result.state.rulesContext.party.player[holder.partyIndex]!.pp[0]).toBe(receipt.restore.ppAfter[0]);
    expect(holder.item).toBe(0);
    expect(holder.hp).toBe(receipt.playerHpAcrossTrace.final);
    expect(result.state.rulesContext.scriptingBattler).toBe(0);
    expect(result.state.rulesContext.battleTextBuff1Move).toBe(HORN_DRILL);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNSITEMRESTOREDPP" }),
    ]));
    // battle_util.c's restore does no Random() work.
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("does not fire while every HORN DRILL slot still has PP", () => {
    const context = gate6Context(
      0,
      gate6Battler({
        species: SPECIES_NIDOKING, ability: 38, hp: 156, maxHP: 156, item: ITEM_LEPPA_BERRY,
        moves: [HORN_DRILL, HORN_DRILL, HORN_DRILL, HORN_DRILL], pp: [1, 5, 5, 5],
        types: ["TYPE_POISON", "TYPE_GROUND"],
      }),
      gate6Battler({
        species: SPECIES_MISDREAVUS, ability: 26, hp: 135, maxHP: 135,
        types: ["TYPE_GHOST", "TYPE_GHOST"], moves: [MEAN_LOOK, MEAN_LOOK, MEAN_LOOK, MEAN_LOOK],
        pp: [5, 5, 5, 5],
      }),
    );
    const { result } = runEndTurn(context);
    expect(result.state.rulesContext.battlers[0]!.pp).toEqual([1, 5, 5, 5]);
    expect(result.state.rulesContext.battlers[0]!.item).toBe(ITEM_LEPPA_BERRY);
  });
});
