// sub183: the production kernel's presentation commands for one Substitute turn (the user Substitutes, the other mon Tackles), either scene.
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";

type Mon = { name: string; id: number; hp: number };
const battler = (m: Mon, moves: number[], speed: number) => {
  const entry = speciesTypes.species[m.id - 1]!;
  return {
    species: m.id, moveId: moves[0], moves, ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed, hp: m.hp, maxHp: m.hp, types: [entry.types[0], entry.types[1]] as const,
  };
};

export function sub183Production(o: { scene: "on" | "off"; side: "player" | "opponent"; attacker: Mon; other: Mon }) {
  const playerIsAttacker = o.side === "player";
  const p = playerIsAttacker ? o.attacker : o.other, t = playerIsAttacker ? o.other : o.attacker;
  const pMoves = playerIsAttacker ? 164 : 33, tMoves = playerIsAttacker ? 33 : 164;
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(p, [pMoves, pMoves, pMoves, pMoves], playerIsAttacker ? 120 : 40),
    trainer: battler(t, [tMoves, tMoves, tMoves, tMoves], playerIsAttacker ? 40 : 120),
  } as never);
  if (o.scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const submit = (s: any, requestId: number, side: "player" | "trainer", foe: 0 | 1) => {
    try {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: foe } as never });
    } catch {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: (1 - foe) as 0 | 1 } as never });
    }
  };
  const a = submit(state, 1, "player", 1);
  const b = submit(a.state, 2, "trainer", 0);
  const make = (index: 0 | 1, m: Mon, move: number, rules: any) => Object.freeze({
    species: m.id, name: m.name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: "male", status: "none" as const,
    moveIds: [move, move, move, move], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, p, pMoves, beforeRules), opponent: make(1, t, tMoves, beforeRules) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, beforeRules, b.state.rules.rulesContext, field, null);
  return { events: b.events as any[], commands: commands as any[], field, beforeRules, afterRules: b.state.rules };
}
