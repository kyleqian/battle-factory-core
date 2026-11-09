// lsd194 (docs/lsd194-print-floor-and-drain.md): production's presentation commands (start / duration on the turn's timeline) for a staged one-turn
// scenario through the real kernel, either scene. Generalises lsd186Production.ts (a Leech Seed drain) to the short-print classes of msg189.
//   node --experimental-strip-types --no-warnings tools/integration/lsd194Production.ts <class> <scene on|off> [--seed=N]   (prints the command rows)
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };

export type Mon = { name: string; id: number; hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
export const MONS = {
  LOMBRE: { name: "LOMBRE", id: 296, hp: 135, attack: 70, defense: 90, spAttack: 90, spDefense: 90, speed: 70 },
  NOSEPASS: { name: "NOSEPASS", id: 320, hp: 105, attack: 45, defense: 135, spAttack: 45, spDefense: 90, speed: 50 },
  ONIX: { name: "ONIX", id: 95, hp: 110, attack: 65, defense: 160, spAttack: 50, spDefense: 65, speed: 90 },
  PRIMEAPE: { name: "PRIMEAPE", id: 57, hp: 150, attack: 120, defense: 80, spAttack: 80, spDefense: 80, speed: 100 },
  DUGTRIO: { name: "DUGTRIO", id: 51, hp: 110, attack: 100, defense: 55, spAttack: 55, spDefense: 70, speed: 140 },
  METAPOD: { name: "METAPOD", id: 11, hp: 105, attack: 30, defense: 75, spAttack: 30, spDefense: 40, speed: 40 },
  SNORLAX: { name: "SNORLAX", id: 143, hp: 220, attack: 130, defense: 85, spAttack: 85, spDefense: 130, speed: 30 },
} satisfies Record<string, Mon>;
const battler = (m: Mon, move: number) => {
  const entry = speciesTypes.species[m.id - 1]!;
  return { species: m.id, moveId: move, moves: [move, move, move, move], ability: 0, item: 0, personality: 0, attack: m.attack, defense: m.defense,
    spAttack: m.spAttack, spDefense: m.spDefense, speed: m.speed, hp: m.hp, maxHp: m.hp, types: [entry.types[0], entry.types[1]] as const };
};

export function lsd194Production(o: { scene: "on" | "off"; player: Mon; opponent: Mon; pMove: number; oMove: number; seed: number; selfMoves?: boolean; oSelf?: boolean; pSelf?: boolean; lenientHp?: boolean }) {
  let state = createFactoryFullTurnBattleState({ requestId: 1, rngSeed: o.seed, player: battler(o.player, o.pMove), trainer: battler(o.opponent, o.oMove) } as never);
  if (o.scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: (o.pSelf ?? o.selfMoves) ? 0 : 1 } as never });
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: o.selfMoves || o.oSelf ? 1 : 0 } as never });
  const make = (index: 0 | 1, m: Mon, move: number, rules: any) => Object.freeze({
    species: m.id, name: m.name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: "male", status: "none" as const,
    moveIds: [move, move, move, move], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, o.player, o.pMove, beforeRules), opponent: make(1, o.opponent, o.oMove, beforeRules) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, beforeRules, b.state.rules.rulesContext, field, null, { className: "TRAINER", name: "LSD194", speechLose: ["a", "b"], speechWin: ["a", "b"] } as never) as any[];
  let at = 0;
  const rows = commands.map((c) => {
    // fnt201: a 1-HP bar (Shedinja) has no converging source program; lenientHp keeps the command's minimum so the rest of the timeline stays comparable.
    let dur: number;
    try { dur = battleResolutionCommandDuration(c, field); } catch (e) { if (!o.lenientHp || c.type !== "hp") throw e; dur = c.timing.minimumFrames + 1; }
    const row = { type: c.type, battler: c.battler ?? null, from: c.from ?? null, to: c.to ?? null, lines: c.lines ?? null, timing: c.timing ?? null, start: at, dur,
      messageId: c.payload?.messageId ?? c.messageId ?? null };
    at += dur;
    return row;
  });
  return { rows, events: b.events as any[], commands, field };
}

// Classes: the staged ROM scenarios of tools/integration/fixtures/lsd194/scenarios (seed = a kernel seed whose outcome class matches the ROM's).
export const CLASSES = {
  "super-effective": { player: MONS.LOMBRE, opponent: MONS.NOSEPASS, pMove: 55, oMove: 89 },
  "crit": { player: MONS.ONIX, opponent: MONS.ONIX, pMove: 33, oMove: 33 },
  "failed": { player: MONS.PRIMEAPE, opponent: MONS.SNORLAX, pMove: 173, oMove: 173 },
  "ohko": { player: MONS.DUGTRIO, opponent: MONS.METAPOD, pMove: 90, oMove: 106, oSelf: true },
  "stat-up": { player: MONS.PRIMEAPE, opponent: MONS.ONIX, pMove: 339, oMove: 339, selfMoves: true },
} as const;

if (process.argv[1]?.endsWith("lsd194Production.ts")) {
  const cls = process.argv[2] as keyof typeof CLASSES, scene = process.argv[3] as "on" | "off";
  const seedArg = process.argv.find((x) => x.startsWith("--seed="));
  const seed = seedArg ? Number(seedArg.slice(7)) : 1;
  const find = process.argv.find((x) => x.startsWith("--find="))?.slice(7);
  if (find) {
    for (let s = 1; s <= 400; s++) {
      const r = lsd194Production({ scene, seed: s, ...CLASSES[cls] });
      if (r.rows.some((c) => JSON.stringify(c.lines ?? "").includes(find))) { console.log("seed", s); break; }
    }
    process.exit(0);
  }
  const { rows } = lsd194Production({ scene, seed, ...CLASSES[cls] });
  for (const c of rows) console.log(c.start, c.dur, c.type, c.battler, c.from, c.to, JSON.stringify(c.lines), JSON.stringify(c.timing), c.messageId ?? "");
}
