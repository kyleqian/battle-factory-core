// hpb3 (docs/hpb3-hp-bar-length.md): the hp command's length for the shapes that kept the 28-row floor (Shell Bell heal after a hit; Focus Band and the no-change drain heal are pinned by T2 only).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";

const SHELL_BELL = 219, SCRATCH = 10, DEFENSE_CURL = 111;
const battler = (level: number, moveId: number, speed: number, hp: number, item = 0, maxHp = 201, defense = 100) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item, personality: 0, attack: 100, defense, spAttack: 100,
    spDefense: 100, speed, hp, maxHp, level, types: [entry.types[0], entry.types[1]] as const };
};

function production(o: { playerMove: number; foeMove: number; foeItem?: number; foeHp?: number; playerHp?: number; playerItem?: number; foeDefense?: number }) {
  const state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(50, o.playerMove, 120, o.playerHp ?? 201, o.playerItem ?? 0), trainer: battler(100, o.foeMove, 40, o.foeHp ?? 201, o.foeItem ?? 0, 201, o.foeDefense ?? 100),
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

  it("shb1: a Shell Bell heal followed by the next action's used print holds 3 + 1 + 6 + u rows (no MoveEnd receipt to count from)", () => {
    const commands = production({ playerMove: SCRATCH, foeMove: SCRATCH, playerItem: SHELL_BELL, playerHp: 100 });
    const item = commands.findIndex((c) => c.type === "general-animation" && c.animation === "HELD_ITEM_EFFECT");
    expect(item).toBeGreaterThan(0);
    const heal = commands.findIndex((c, i) => i > item && c.type === "hp");
    expect(heal).toBeGreaterThan(item);
    expect(commands[heal + 1].type).toBe("message");
    expect(commands[heal].timing.minimumFrames).toBe(0);
    expect(commands[heal].timing.tailFrames).toBe(14); // 3 + 1 + 6 + u, u = 4 (the used print's instructionExecution)
  });

  it("shb1: a short bar before the Shell Bell's animation waits out the hit's SE (IsBattleSEPlaying: 73 - 49 - bar rows)", () => {
    const commands = production({ playerMove: SCRATCH, foeMove: SCRATCH, playerItem: SHELL_BELL, playerHp: 100, foeDefense: 125 });
    const item = commands.findIndex((c) => c.type === "general-animation" && c.animation === "HELD_ITEM_EFFECT");
    const hit = commands[item - 3];
    expect(hit.type).toBe("hp");
    expect(hit.from - hit.to).toBe(22);
    expect(hit.timing.tailFrames).toBe(3); // 1 + (73 - (49 + 22))
  });
});
