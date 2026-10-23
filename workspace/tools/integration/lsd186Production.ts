// lsd186 (docs/lsd186-leech-seed-drain-timing.md): the production kernel's presentation commands for the staged ROM scenario
// mechanic-leech-seed-{player,opponent}-exeggcute-{opponent,player}-onix (EXEGGCUTE 156 HP Leech Seeds; ONIX 110 HP Tackles first), either scene,
// with each command's start / duration (battleResolutionCommandDuration) on the turn's timeline.
//   node --experimental-strip-types --no-warnings tools/integration/lsd186Production.ts <out.json> [--seed=N] [--seeds=a..b]
import { writeFileSync } from "node:fs";
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };

// Level 50 stats of the staged mons (neutral nature for ONIX; EXEGGCUTE nature 4, EVs hp/spAtk 170): HP from the ROM's gBattleMons, speed ONIX > EXEGGCUTE.
const EXEGGCUTE = { name: "EXEGGCUTE", id: 102, hp: 156, attack: 80, defense: 105, spAttack: 120, spDefense: 85, speed: 60 };
const ONIX = { name: "ONIX", id: 95, hp: 110, attack: 65, defense: 160, spAttack: 50, spDefense: 65, speed: 90 };
type Mon = typeof EXEGGCUTE;
const battler = (m: Mon, move: number, speed: number) => {
  const entry = speciesTypes.species[m.id - 1]!;
  return { species: m.id, moveId: move, moves: [move, move, move, move], ability: 0, item: 0, personality: 0, attack: m.attack, defense: m.defense,
    spAttack: m.spAttack, spDefense: m.spDefense, speed, hp: m.hp, maxHp: m.hp, types: [entry.types[0], entry.types[1]] as const };
};

export function lsd186Production(o: { scene: "on" | "off"; seederSide: "player" | "opponent"; seed: number; onixMove?: number }) {
  const pl = o.seederSide === "player";
  const p = pl ? EXEGGCUTE : ONIX, t = pl ? ONIX : EXEGGCUTE;
  const onixMove = o.onixMove ?? 33, pMove = pl ? 73 : onixMove, tMove = pl ? onixMove : 73;
  let state = createFactoryFullTurnBattleState({ requestId: 1, rngSeed: o.seed, player: battler(p, pMove, pl ? 60 : 90), trainer: battler(t, tMove, pl ? 90 : 60) } as never);
  if (o.scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 } as never });
  const make = (index: 0 | 1, m: Mon, move: number, rules: any) => Object.freeze({
    species: m.id, name: m.name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: "male", status: "none" as const,
    moveIds: [move, move, move, move], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, p, pMove, beforeRules), opponent: make(1, t, tMove, beforeRules) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, beforeRules, b.state.rules.rulesContext, field, null) as any[];
  let at = 0;
  const rows = commands.map((c) => {
    const dur = battleResolutionCommandDuration(c, field);
    const row = { type: c.type, battler: c.battler ?? null, from: c.from ?? null, to: c.to ?? null, lines: c.lines ?? null, timing: c.timing ?? null, start: at, dur };
    at += dur;
    return row;
  });
  return { rows, events: b.events as any[], commands, field, beforeRules, afterRules: b.state.rules };
}

if (process.argv[1]?.endsWith("lsd186Production.ts")) {
  const out = process.argv[2]!;
  const arg = (n: string) => process.argv.find((x) => x.startsWith(`--${n}=`))?.slice(n.length + 3);
  const seeds = arg("seeds") ? (() => { const [a, z] = arg("seeds")!.split("..").map(Number); return Array.from({ length: z! - a! + 1 }, (_, i) => a! + i); })() : [Number(arg("seed") ?? 305419897)];
  const result: any[] = [];
  for (const seed of seeds) for (const scene of ["off", "on"] as const) for (const seederSide of ["player", "opponent"] as const) {
    try {
      const { rows } = lsd186Production({ scene, seederSide, seed });
      result.push({ seed, scene, seederSide, rows });
    } catch (error) { result.push({ seed, scene, seederSide, error: (error as Error).message }); }
  }
  writeFileSync(out, JSON.stringify(result, null, 1) + "\n");
  for (const r of result.slice(0, 4)) {
    console.log(r.seed, r.scene, r.seederSide, r.error ?? "");
    for (const c of r.rows ?? []) console.log("  ", c.start, c.dur, c.type, c.battler, c.from, c.to, JSON.stringify(c.lines), JSON.stringify(c.timing));
  }
}
