import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/faint-on-switch-in-cancels-turn.md (fix 39). A Pokemon that is switched in and faints from Spikes is replaced inside the switch
// action's own script: BattleScript_SpikesOnAttackerFainted -> BattleScript_HandleFaintedMon -> BattleScript_FaintedMonSendOutNew, which ends with
// `cancelallactions` (battle_scripts_1.s:2895; Cmd_cancelallactions, battle_script_commands.c:5850-5858). The other side does not act that turn.
// The engine let it act. ROM: staged battle spikes-faint-cancels-turn (the opponent's PP after that turn: ROM 18, engine 17).

const TACKLE = 33;
const SPIKES = 191;
const SPLASH = 150;
const SPECIES_WOBBUFFET = 202;

function config(): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 5,
    player: {
      species: SPECIES_WOBBUFFET, moveId: SPLASH,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, hp: 300,
    },
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: SPIKES, moves: [SPIKES, TACKLE, 0, 0] as [number, number, number, number], pp: [20, 35, 0, 0] as [number, number, number, number],
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 50, hp: 300,
    },
    playerBenchHp: [10, 200] as [number, number], // party slot 1 has 10 of 200 HP: one layer of Spikes (25) is more than that
    playerBenchOverride: [
      { species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0, maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100 },
      { species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0, maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100 },
    ] as FactoryFullTurnConfig["playerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

describe("a Pokemon that faints from Spikes as it is switched in ends the turn", () => {
  it("the replacement comes in and the other side's chosen move does not run", () => {
    let state = createFactoryFullTurnBattleState(config());
    const events: { messageId?: string; kind: string }[] = [];
    const submit = (side: "player" | "trainer", decision: unknown) => {
      const boundary = state.boundary;
      if (boundary?.kind !== "decision-required") throw new Error("no open request");
      const result = submitFactoryFullTurnDecision(state, { requestId: boundary.request.requestId, side, decision } as never);
      if (result.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(result.barrier)}`);
      state = result.state;
      events.push(...result.events.map(({ payload }) => payload as { messageId?: string; kind: string }));
    };
    const legal = () => {
      const boundary = state.boundary;
      if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
      return boundary.request.legalDecisions as readonly { kind: string; moveSlot?: number; partyIndex?: number }[];
    };
    // turn 1: Splash; the trainer lays Spikes
    submit("player", legal().find((d) => d.kind === "use-move"));
    submit("trainer", legal().find((d) => d.kind === "use-move" && d.moveSlot === 0));
    expect(state.rules.rulesContext.sideTimers[0].spikesAmount).toBe(1);
    // turn 2: the player switches to the 10-HP Pokemon; the trainer chooses Tackle
    events.length = 0;
    submit("player", legal().find((d) => d.kind === "switch" && d.partyIndex === 1));
    submit("trainer", legal().find((d) => d.kind === "use-move" && d.moveSlot === 1));
    const boundary = state.boundary;
    if (boundary?.kind !== "decision-required" || boundary.request.kind !== "forced-switch") throw new Error("expected the replacement choice");
    submit("player", { kind: "switch", partyIndex: 2 });
    const rules = state.rules.rulesContext;
    expect(rules.battlers[0].partyIndex).toBe(2);
    expect(rules.party.player[1]!.hp).toBe(0);
    // the trainer's Tackle did not run: no "used" line this turn, its PP is untouched, the replacement only lost its Spikes damage
    expect(events.filter((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE")).toEqual([]);
    expect(rules.battlers[1].pp[1]).toBe(35);
    expect(rules.battlers[0].hp).toBe(200 - 25);
  });
});
