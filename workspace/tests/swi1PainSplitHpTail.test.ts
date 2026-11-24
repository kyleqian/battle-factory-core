// swi1: Pain Split's two `healthbarupdate; datahpupdate` runs follow the ROM exec rows (aud261-painsplit labs, s648 d10), no 28-row floor.
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";

const PAIN_SPLIT = 220, DEFENSE_CURL = 111;
const battler = (moveId: number, speed: number, hp: number) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp, maxHp: 201, level: 50, types: [entry.types[0], entry.types[1]] as const };
};

describe("swi1: Pain Split hp tails", () => {
  it("the attacker's bar holds bar + 1 + 3 and the target's bar + 1 + 3, both floor-free", () => {
    const state = createFactoryFullTurnBattleState({ requestId: 1, rngSeed: 305419897, player: battler(PAIN_SPLIT, 120, 201), trainer: battler(DEFENSE_CURL, 40, 101) } as never);
    const before = state.rules.rulesContext;
    const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
    const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
    const make = (index: 0 | 1, moveId: number) => Object.freeze({
      species: 19, name: "RATTATA", side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
      hp: before.battlers[index].hp, maxHP: 201, gender: "male", status: "none" as const, moveIds: [moveId, moveId, moveId, moveId], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
    });
    const field = Object.freeze({ player: make(0, PAIN_SPLIT), opponent: make(1, DEFENSE_CURL) }) as never;
    const commands = projectBattleResolutionCommands(b.events as never, before, b.state.rules.rulesContext, field, null, { className: "BIRD KEEPER", name: "DESTIN", speechLose: ["a", "b"], speechWin: ["c", "d"] } as never);
    const hps = commands.filter((c) => c.type === "hp");
    expect(hps.length).toBeGreaterThanOrEqual(2);
    expect(hps[0]!.timing).toEqual({ minimumFrames: 0, tailFrames: 3 });
    expect(hps[1]!.timing).toEqual({ minimumFrames: 0, tailFrames: 3 }); // mtl1: the ROM's target tail is 3 (the body end carries the other 3; mtl1-painsplit-leech-* prints exact)
  });
});
