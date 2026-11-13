import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/white-herb-baton-pass.md, "The Spikes flag". Cmd_switchineffects sets SIDE_STATUS_SPIKES_DAMAGED when the entering Pokemon takes
// its Spikes damage and clears it at its very end (battle_script_commands.c). A White Herb that fires in between (a lowered stage handed over by
// Baton Pass) ends the script through BattleScriptExecute, so the flag stays set: the NEXT Pokemon of that side takes no Spikes damage, and its
// own switch-in clears the flag. ROM (Mechanic Lab, seed 701): Snorlax with the herb enters over Spikes (235 -> 206, herb used); Blissey then
// enters at 330 / 330; Jolteon after it takes the damage again. Without the herb Blissey takes it (330 -> 275).

const BATON_PASS = 226;
const SPIKES = 191;
const SPLASH = 150;
const WHITE_HERB = 180;
const SPECIES_WOBBUFFET = 202;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;

function config(herb: boolean): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 3,
    player: {
      species: SPECIES_WOBBUFFET, moveId: BATON_PASS,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, hp: 300,
      statStages: [6, 5, 6, 6, 6, 6, 6, 6] as [number, number, number, number, number, number, number, number], // Attack -1, handed over
    },
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: SPIKES,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200, hp: 300,
    },
    playerBenchHp: [200, 200] as [number, number],
    playerBenchOverride: [
      { species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: herb ? WHITE_HERB : 0, maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100 },
      { species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0, maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100 },
    ] as FactoryFullTurnConfig["playerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

/** Turn 1: the trainer's Spikes, the player's Baton Pass to party slot 1. Turn 2: the player switches to party slot 2. Returns that Pokemon's HP on entry. */
function thirdPokemonAfterTheHerbHolder(herb: boolean) {
  let state = createFactoryFullTurnBattleState(config(herb));
  const submit = (side: "player" | "trainer", decision: unknown) => {
    const boundary = state.boundary;
    if (boundary?.kind !== "decision-required") throw new Error("no open request");
    const result = submitFactoryFullTurnDecision(state, { requestId: boundary.request.requestId, side, decision } as never);
    if (result.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(result.barrier)}`);
    state = result.state;
    return result;
  };
  const command = (kind: string) => {
    const boundary = state.boundary;
    if (boundary?.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("expected a command request");
    return boundary.request.legalDecisions.find((d) => d.kind === kind)!;
  };
  submit("player", command("use-move"));
  submit("trainer", command("use-move"));                       // Spikes first (faster), then Baton Pass halts for the replacement
  submit("player", { kind: "switch", partyIndex: 1 });           // the herb holder enters over Spikes
  const afterHolder = state.rules.rulesContext;
  const toThird = state.boundary?.kind === "decision-required" && state.boundary.request.kind === "command"
    ? state.boundary.request.legalDecisions.find((d) => d.kind === "switch" && (d as { partyIndex: number }).partyIndex === 2)
    : undefined;
  if (toThird === undefined) throw new Error("no switch to party slot 2 on turn 2");
  submit("player", toThird);
  submit("trainer", command("use-move"));
  return { afterHolder, afterThird: state.rules.rulesContext };
}

describe("White Herb on a Baton Pass switch-in over Spikes leaves the Spikes flag set", () => {
  it("the herb holder takes the Spikes damage and uses the herb; the next Pokemon of the side takes none", () => {
    const { afterHolder, afterThird } = thirdPokemonAfterTheHerbHolder(true);
    expect(afterHolder.battlers[0].partyIndex).toBe(1);
    expect(afterHolder.battlers[0].hp).toBe(200 - 25); // one layer: 1/8
    expect(afterHolder.battlers[0].item).toBe(0);
    expect(afterHolder.battlers[0].statStages[1]).toBe(6);
    expect(afterHolder.sideStatuses[0] & SIDE_STATUS_SPIKES_DAMAGED).not.toBe(0);
    expect(afterThird.battlers[0].partyIndex).toBe(2);
    expect(afterThird.battlers[0].hp).toBe(200);
    expect(afterThird.sideStatuses[0] & SIDE_STATUS_SPIKES_DAMAGED).toBe(0);
  });

  it("control, no herb: the flag is cleared and the next Pokemon takes the damage", () => {
    const { afterHolder, afterThird } = thirdPokemonAfterTheHerbHolder(false);
    expect(afterHolder.battlers[0].hp).toBe(200 - 25);
    expect(afterHolder.sideStatuses[0] & SIDE_STATUS_SPIKES_DAMAGED).toBe(0);
    expect(afterThird.battlers[0].hp).toBeLessThan(200);
  });
});
