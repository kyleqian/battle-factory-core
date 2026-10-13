// chg161 (ISSUES #167 (d), docs/chg161-charge-turn-print.md): a two-turn move's charge turn THROUGH THE PRODUCTION PRESENTATION, per
// scene, against the off108 ROM windows (Dig / Razor Wind / Solar Beam, player PRIMEAPE (faster) vs SNORLAX Tackle; off108's
// receipts/rom-r1.json, re-probed fresh twice by chg161Run.sh). The full-turn kernel (Scene OFF = HITMARKER_NO_ANIMATIONS on the fresh
// state, as factoryBattleStart.ts does) emits the turn; projectBattleResolutionCommands builds production's commands and
// battleResolutionCommandDuration times them. Anchor = the empty box's first frame == the ROM row the box clears (G + 1, off108's
// G = the print's release row - 2). Checked: the charge message's first glyph and the foe's "used" first glyph, relative to it.
//   node --experimental-strip-types --no-warnings tools/integration/chg161Anchors.ts [--json] [--rows]
import { readFileSync } from "node:fs";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";

const ROM = JSON.parse(readFileSync("tools/integration/fixtures/off108/receipts/rom-r1.json", "utf8")).scenarios;
export const CHG161_ARMS = [
  { scenario: "off108-dig-ply-primeape-snorlax", move: 91, charge: "dug a hole" },
  { scenario: "off108-razor-wind-ply-primeape-snorlax", move: 13, charge: "whipped up" },
  { scenario: "off108-solar-beam-ply-primeape-snorlax", move: 76, charge: "sunlight" },
] as const;

/** ROM rows relative to the box's clear row (G + 1): the charge print's first glyph and the foe's "used" first glyph. */
export function chg161Rom(scenario: string, scene: "on" | "off") {
  const uses = ROM[scenario][scene];
  const i = uses.findIndex((use: any) => use.opener === "EMPTYSTRING3");
  const use = uses[i]; const next = uses[i + 1];
  const box = use.openerFirstChange;
  const chargeRun = use.runs.find((run: any) => run[0] === "BattleScript_TwoTurnMovesSecondTurn+85");
  return { box, chargeGlyph: use.G + chargeRun[5][0] - box, foeUsedGlyph: next.openerFirstChange - box };
}

const battler = (species: number, moves: number[], speed: number, hp: number) => {
  const entry = speciesTypes.species[species - 1]!;
  return {
    species, moveId: moves[0], moves, ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed, hp, maxHp: hp, types: [entry.types[0], entry.types[1]] as const,
  };
};

export function chg161Production(move: number, scene: "on" | "off") {
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897, player: battler(57, [move, move, move, move], 120, 160), trainer: battler(143, [33, 33, 33, 33], 40, 260),
  } as never);
  if (scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 } as never });
  const make = (index: 0 | 1, species: number, name: string, moves: number[], rules: any) => Object.freeze({
    species, name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: "male", status: "none" as const,
    moveIds: moves, currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({
    player: make(0, 57, "PRIMEAPE", [move, move, move, move], beforeRules), opponent: make(1, 143, "SNORLAX", [33, 33, 33, 33], beforeRules),
  }) as never;
  let printed = 0;
  const cut = (b.events as readonly any[]).findIndex((event) => event.payload.kind === "message" && ++printed === 4);
  const events = cut < 0 ? b.events : b.events.slice(0, cut);
  const commands = projectBattleResolutionCommands(events as never, beforeRules, b.state.rules.rulesContext, field, null);
  let t = 0;
  const rows = commands.map((command) => {
    const start = t;
    const frames = battleResolutionCommandDuration(command, field);
    t += frames;
    return { type: command.type, start, frames, text: command.type === "message" ? (command as any).lines.join("\\n") : (command as any).animation ?? "" };
  });
  const box = Math.max(0, rows.findIndex((row) => row.type === "message" && row.text === ""));
  const rel = rows.slice(box).map((row) => ({ ...row, start: row.start - rows[box]!.start }));
  const messages = rel.filter((row) => row.type === "message");
  return { rows: rel, boxFrames: rel[0]!.frames, chargeGlyph: messages[1]?.start ?? null, foeUsedGlyph: messages[2]?.start ?? null };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = CHG161_ARMS.flatMap((arm) => (["on", "off"] as const).map((scene) => {
    const rom = chg161Rom(arm.scenario, scene);
    const production = chg161Production(arm.move, scene);
    return {
      arm: `${arm.scenario.replace("off108-", "")}-${scene}`, rom, production: { boxFrames: production.boxFrames, chargeGlyph: production.chargeGlyph, foeUsedGlyph: production.foeUsedGlyph },
      residual: { chargeGlyph: production.chargeGlyph! - rom.chargeGlyph, foeUsedGlyph: production.foeUsedGlyph! - rom.foeUsedGlyph },
      rows: production.rows,
    };
  }));
  if (process.argv.includes("--json")) console.log(JSON.stringify(results.map(({ rows, ...rest }) => rest), null, 1));
  for (const r of results) {
    console.log(`${r.arm}: box ${r.production.boxFrames}  charge glyph ROM ${r.rom.chargeGlyph} prod ${r.production.chargeGlyph} (${r.residual.chargeGlyph})  foe used glyph ROM ${r.rom.foeUsedGlyph} prod ${r.production.foeUsedGlyph} (${r.residual.foeUsedGlyph})`);
    if (process.argv.includes("--rows")) for (const row of r.rows.slice(0, 8)) console.log(`    ${row.start} ${row.type} ${row.frames} ${row.text}`);
  }
}
