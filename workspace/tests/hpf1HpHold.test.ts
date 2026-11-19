// hpf1 (docs/hpd1-hp-hold.md "hpf1"): the hit's `hp` command has no 28-frame floor before a print / a faint, and none on the player.
// ROM: aud241b super-effective / lowhp-faint windows (tests/aud241bBattleSounds.test.ts: every sound on the ROM's frame), hpf1-rollingkick-on (+5),
// hpf1-pk-dragonrage-{on,off} (hp -> faint at +0), hpf1-p{c,a}-* (player hit, 8 labs). Hermetic: the model through production.
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender.ts";

const battler = (level: number, moveId: number, speed: number, hp: number, maxHp = 201) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp, maxHp, level, types: [entry.types[0], entry.types[1]] as const };
};

// The player (moves first) uses playerMove on the foe, then the foe uses foeMove on the player.
function production(o: { playerMove: number; foeMove: number; playerHp?: number; foeHp?: number; playerLevel?: number; foeLevel?: number }) {
  const state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(o.playerLevel ?? 50, o.playerMove, 120, o.playerHp ?? 201), trainer: battler(o.foeLevel ?? 100, o.foeMove, 40, o.foeHp ?? 201),
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
  const field = Object.freeze({ player: make(0, o.playerLevel ?? 50, o.playerMove), opponent: make(1, o.foeLevel ?? 100, o.foeMove) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, before, b.state.rules.rulesContext, field, null, { className: "BIRD KEEPER", name: "DESTIN", speechLose: ["a", "b"], speechWin: ["c", "d"] }) as readonly any[];
  return { commands, field };
}
const hpOf = (commands: readonly any[], battlerIndex: 0 | 1, nth = 0) => commands.filter((c) => c.type === "hp" && c.battler === battlerIndex)[nth];
const DRAGON_RAGE = 82, ROLLING_KICK = 27, DEFENSE_CURL = 111, TACKLE = 33;

describe("hpf1: the hit's hp command carries the ROM's post-datahpupdate rows, no 28-frame floor", () => {
  it("hp -> 'It's super effective!' (Rolling Kick on a Normal foe): tail = datahpupdate -> resultmessage rows + 2 = 5, floor-free", () => {
    const { commands, field } = production({ playerMove: ROLLING_KICK, foeMove: DEFENSE_CURL });
    const hp = hpOf(commands, 1)!;
    expect(commands[commands.indexOf(hp) + 1].type).toBe("message");
    expect(hp.timing).toEqual({ minimumFrames: 0, tailFrames: 5 });
    expect(battleResolutionCommandDuration(hp, field)).toBe(Math.max(1, hp.from - hp.to) + 1 + 5);
  });

  it("hp -> faint (the foe's 10 HP bar, Dragon Rage): the hp command is the bar + 1 (11 rows), not the 28-row floor, in both directions of the hit", () => {
    for (const [name, o, side] of [["foe faints", { playerMove: DRAGON_RAGE, foeMove: DEFENSE_CURL, foeHp: 10 }, 1], ["player faints", { playerMove: DEFENSE_CURL, foeMove: DRAGON_RAGE, playerHp: 10, playerLevel: 100, foeLevel: 50 }, 0]] as const) {
      const { commands, field } = production(o);
      const hp = hpOf(commands, side)!;
      expect(hp.to, name).toBe(0);
      expect(commands[commands.indexOf(hp) + 1].type, name).toBe("faint");
      expect(hp.timing, name).toEqual({ minimumFrames: 0 });
      expect(battleResolutionCommandDuration(hp, field), name).toBe(11);
    }
  });

  it("a hit on the player that ends the turn: tail 7 (floor-free); a short bar (Dragon Rage's 10-row-class hit) is no longer padded to 28", () => {
    const { commands, field } = production({ playerMove: DEFENSE_CURL, foeMove: DRAGON_RAGE, playerLevel: 100, foeLevel: 50 });
    const hp = hpOf(commands, 0)!;
    expect(hp.timing).toEqual({ minimumFrames: 0, tailFrames: 7 });
    expect(battleResolutionCommandDuration(hp, field)).toBe(hp.from - hp.to + 1 + 7);
  });

  it("a hit on the player followed by the player's next action's move: tail 1 (the datahpupdate row)", () => {
    const { commands } = production({ playerMove: TACKLE, foeMove: TACKLE });
    const hp = hpOf(commands, 0);
    if (hp !== undefined && commands[commands.indexOf(hp) + 1]?.type === "move-animation") expect(hp.timing).toEqual({ minimumFrames: 0, tailFrames: 1 });
  });
});
