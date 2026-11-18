// mem2 (docs/aud242-move-anim-sounds.md section 29, mem1 / exp1): the 0x7FFF INSTANT_HP_BAR_DROP of Memento (Cmd_trymemento) and Explosion / Self-Destruct
// (Cmd_tryexplosion) is an instant bar drop, not a 106-row drain. ROM windows: 5 Memento + 4 Explosion / Self-Destruct (both sides, Scene ON).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";

const battler = (moveId: number, speed: number) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp: 105, maxHp: 105, level: 50, types: [entry.types[0], entry.types[1]] as const };
};

// `userSide` uses `moveId` (the faster one); the other side's Tackle follows only if the user is still alive.
function production(moveId: number, userSide: "player" | "trainer", scene: "on" | "off") {
  const userIsPlayer = userSide === "player";
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(userIsPlayer ? moveId : 33, userIsPlayer ? 120 : 40), trainer: battler(userIsPlayer ? 33 : moveId, userIsPlayer ? 40 : 120),
  } as never);
  if (scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const before = state.rules.rulesContext;
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 } as never });
  const make = (index: 0 | 1) => Object.freeze({
    species: 19, name: "RATTATA", side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: before.battlers[index].hp, maxHP: 105, gender: "male", status: "none" as const, moveIds: [33, 33, 33, 33], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0), opponent: make(1) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, before, b.state.rules.rulesContext, field, null, { className: "BIRD KEEPER", name: "DESTIN", speechLose: ["a", "b"], speechWin: ["c", "d"] });
  return { commands: commands as readonly any[], field, userBattler: userIsPlayer ? 0 : 1 };
}

// ROM rows from the hp command start to the move command's first row, less the move command's own `pre` 3 (mem1 / exp1: Memento 8 - 3, Explosion / Self-Destruct 9 - 3).
const CASES = [[262, "Memento", 5, 3], [153, "Explosion", 6, 2], [120, "Self-Destruct", 6, 2]] as const;

describe("mem2: the 0x7FFF user bar is an instant drop", () => {
  for (const scene of ["on", "off"] as const) {
    for (const [moveId, name, rows, textRow] of CASES) {
      for (const side of ["player", "trainer"] as const) {
        it(`${name}, ${side} user, Scene ${scene}: one instant hp command of ${rows} rows (text row ${textRow}), then the move body`, () => {
          const { commands, field, userBattler } = production(moveId, side, scene);
          const i = commands.findIndex((command) => command.type === "hp" && command.healthValue === 0x7fff);
          expect(i, "instant hp command present").toBeGreaterThan(0);
          const hp = commands[i]!;
          expect([hp.battler, hp.from, hp.to]).toEqual([userBattler, 105, 0]);
          expect(hp.timing).toEqual({ minimumFrames: 0, tailFrames: rows, instantDrop: textRow });
          expect(battleResolutionCommandDuration(hp, field)).toBe(rows);
          if (scene === "on") expect(commands[i + 1]!.type).toBe("move-animation");
        });
      }
    }
  }

  it("an ordinary hit is untouched: the Tackle's drain still derives from the bar's frames", () => {
    const { commands, field } = production(33, "player", "on");
    const hp = commands.find((command) => command.type === "hp")!;
    expect(hp.timing.instantDrop).toBeUndefined();
    expect(battleResolutionCommandDuration(hp, field)).toBeGreaterThanOrEqual(hp.from - hp.to > 0 ? 2 : 1);
  });
});
