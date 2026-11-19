// hpf2 (docs/hpd1-hp-hold.md "hpf2"): the hp -> print / hp -> hp holds of heals, recoil and drains, from the ROM labs
// (aud242e-doubleedge / gigadrain, aud242k-recover, aud242j-struggle: every bar pixel-exact at the lab's constant move-body offset).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";

const battler = (level: number, moveId: number, speed: number, hp: number, maxHp = 201) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp, maxHp, level, types: [entry.types[0], entry.types[1]] as const };
};

function production(o: { playerMove: number; foeMove: number; playerHp?: number; foeHp?: number }) {
  const state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(50, o.playerMove, 120, o.playerHp ?? 201), trainer: battler(100, o.foeMove, 40, o.foeHp ?? 201),
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
const hps = (commands: readonly any[]) => commands.filter((c) => c.type === "hp");
const DEFENSE_CURL = 111, RECOVER = 105, DOUBLE_EDGE = 38, GIGA_DRAIN = 202, SANDSTORM = 201, TACKLE = 33;

describe("hpf2: hp -> print / hp -> hp, no 28-frame floor", () => {
  it("a heal (Recover): the hp is followed by its print, tail = datahpupdate -> printstring rows + 2 = 3 (ROM: print at bar + 2, Delta 1)", () => {
    const heal = hps(production({ playerMove: RECOVER, foeMove: DEFENSE_CURL, playerHp: 100 })).find((c) => c.battler === 0 && c.to > c.from)!;
    expect(heal.timing).toEqual({ minimumFrames: 0, tailFrames: 3 });
  });

  it("recoil (Double-Edge): the hit's tail is the executions to the recoil's bar (ROM 10: bar rise -> next rise = 60 on a 50-row bar), the recoil then carries its print's 3", () => {
    const [hit, recoil] = hps(production({ playerMove: DOUBLE_EDGE, foeMove: DEFENSE_CURL }));
    expect(hit.battler).toBe(1);
    expect(recoil.battler).toBe(0);
    expect(hit.timing).toEqual({ minimumFrames: 0, tailFrames: 10 });
    expect(recoil.timing).toEqual({ minimumFrames: 0, tailFrames: 3 });
  });

  it("a drain (Giga Drain): the hit's tail is the executions to the heal's bar (ROM 11: bar rise -> next rise = 61), the heal then carries printfromtable's 4", () => {
    const [hit, drain] = hps(production({ playerMove: GIGA_DRAIN, foeMove: DEFENSE_CURL, playerHp: 100 }));
    expect(hit.battler).toBe(1);
    expect(drain.battler).toBe(0);
    expect(hit.timing).toEqual({ minimumFrames: 0, tailFrames: 11 });
    expect(drain.timing).toEqual({ minimumFrames: 0, tailFrames: 4 });
  });

  it("a hit then the turn end's first print (Sandstorm's 'buffeted' message): the hit's tail is MoveEnd rows 7 + 8 = 15 (ROM hail ON / toxic ON / sandstorm OFF: bar -> print rise = bar rows + 17)", () => {
    const commands = production({ playerMove: SANDSTORM, foeMove: TACKLE });
    const list = hps(commands);
    const hit = list.find((c) => c.battler === 0)!;
    const rest = commands.slice(commands.indexOf(hit) + 1);
    expect(rest.slice(0, 3).map((c) => c.type)).toEqual(["sprite-visibility", "sprite-visibility", "message"]);
    expect(hit.timing).toEqual({ minimumFrames: 0, tailFrames: 15 });
  });
});
