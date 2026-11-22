// hpb3 (docs/hpb3-hp-bar-length.md): the hp command's length for the shapes that kept the 28-row floor (Shell Bell heal after a hit; Focus Band and the no-change drain heal are pinned by T2 only).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";

const SHELL_BELL = 219, SCRATCH = 10, DEFENSE_CURL = 111;
const battler = (level: number, moveId: number, speed: number, hp: number, item = 0, maxHp = 201) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp, maxHp, level, types: [entry.types[0], entry.types[1]] as const };
};

function production(o: { playerMove: number; foeMove: number; foeItem?: number; foeHp?: number; playerHp?: number; playerItem?: number }) {
  const state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(50, o.playerMove, 120, o.playerHp ?? 201, o.playerItem ?? 0), trainer: battler(100, o.foeMove, 40, o.foeHp ?? 201, o.foeItem ?? 0),
  } as never);
  const before = state.rules.rulesContext;
  const submit = (s: any, requestId: number, side: "player" | "trainer", foe: 0 | 1) => {
    try {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: foe } as never });
    } catch {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 - foe } as never });
    }
  };
  const a = submit(state, 1, "player", 1);
  const b = submit(a.state, 2, "trainer", 0);
  const make = (index: 0 | 1, level: number, moveId: number) => Object.freeze({
    species: 19, name: "RATTATA", side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level,
    hp: before.battlers[index].hp, maxHP: 201, gender: "male", status: "none" as const, moveIds: [moveId, moveId, moveId, moveId], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, 50, o.playerMove), opponent: make(1, 100, o.foeMove) }) as never;
  return projectBattleResolutionCommands(b.events as never, before, b.state.rules.rulesContext, field, null, { className: "BIRD KEEPER", name: "DESTIN", speechLose: ["a", "b"], speechWin: ["c", "d"] }) as readonly any[];
}

describe("hpb3: floor-free hp before a Shell Bell heal", () => {
  it("a hit followed by the attacker's Shell Bell: the hit's hp is bar + 1 + (ROM rows to the item's playanimation - 1 - 9), no 28-row floor", () => {
    const commands = production({ playerMove: DEFENSE_CURL, foeMove: SCRATCH, foeItem: SHELL_BELL, foeHp: 100 });
    const index = commands.findIndex((c) => c.type === "general-animation" && c.animation === "HELD_ITEM_EFFECT");
    expect(index).toBeGreaterThan(3);
    const hit = commands[index - 3];
    expect(hit.type).toBe("hp");
    expect(hit.timing.minimumFrames).toBe(0);
    expect(hit.timing.tailFrames).toBe(1);
    expect(commands[index - 2].type).toBe("sprite-visibility");
  });
});
