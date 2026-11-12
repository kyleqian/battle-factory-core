import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/endturn-order-forced-struggle.md. ENDTURN_ORDER re-sorts the battlers with GetWhoStrikesFirst(.., FALSE)
// (battle_util.c:1199-1218). That function takes MOVE_STRUGGLE for a battler whose gProtectStructs[].noValidMoves is set
// (battle_main.c:4700), but HandleAction_UseMove clears the cell when the forced Struggle starts (battle_util.c:100-102).
// At end of turn the sort therefore reads the slot the cursor still points at. The audit suspected the opposite; the ROM
// (Mechanic Lab: Shuckle out of Protect PP vs a faster Blissey, both holding Leftovers) shows the Struggling Shuckle heal
// FIRST. This test pins that: do not "fix" it to Struggle's priority 0.

const TACKLE = 33;
const PROTECT = 182;
const LEFTOVERS = 200;

function config(): FactoryFullTurnConfig {
  const stats = { attack: 100, defense: 100, spAttack: 80, spDefense: 100, hp: 400, maxHp: 500, item: LEFTOVERS };
  return {
    requestId: 1,
    rngSeed: 3,
    // Slow, out of PP on its only move (Protect): this turn's move is the forced Struggle.
    player: { species: 29, moveId: PROTECT, moves: [PROTECT, 0, 0, 0], pp: [0, 0, 0, 0], speed: 50, ...stats },
    trainer: { species: 32, moveId: TACKLE, moves: [TACKLE, 0, 0, 0], pp: [35, 0, 0, 0], speed: 100, ...stats },
  } as FactoryFullTurnConfig;
}

function commandDecisions(state: ReturnType<typeof createFactoryFullTurnBattleState>) {
  const boundary = state.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
  return boundary.request.legalDecisions;
}

describe("end-turn order: a battler that Struggled sorts with its cursor slot's priority (ROM-proven)", () => {
  it("the slower Struggling battler's Leftovers heals first because its cursor slot is Protect (+3)", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: commandDecisions(initial)[0]! });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command");
    const done = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: commandDecisions(afterPlayer.state)[0]!,
    });
    const messages = done.events.flatMap(({ payload }) => (payload.kind === "message" ? [payload.messageId] : []));
    expect(messages).toContain("STRINGID_PKMNHITWITHRECOIL"); // the player's move really was the forced Struggle
    // Leftovers heals are the only HP gains of the turn; their order is the end-turn battler order.
    const heals = done.events.flatMap(({ payload }) =>
      payload.kind === "hp-change" && payload.to > payload.from ? [payload.battler] : []);
    expect(heals).toEqual([0, 1]); // ROM order; with Struggle's priority 0 the faster battler 1 would heal first
  });
});
