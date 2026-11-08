// msg175 (docs/msg175-used-message-duration.md): the "<mon> used <move>!" print through the PRODUCTION PRESENTATION against the committed
// off108 / off148 ROM receipts (fixtures/off108|off148/receipts/rom-r1.json; each use's openerFirstChange = the first glyph, G = the
// final glyph). Two checks per scenario and scene:
//   1. duration: every ROM attackstring use runs first glyph -> final glyph in exactly the print's printable length L (one glyph per
//      row, the line break costs no row), so the production command (minimumFrames 0) ends on G;
//   2. edge: turn 1's first "used" first glyph -> the second action's "used" first glyph, ROM vs production (new rule, and the old
//      24-frame floor = new + max(0, 24 - L1)).
// The full-turn kernel (Scene OFF = HITMARKER_NO_ANIMATIONS, as factoryBattleStart.ts does) emits turn 1 with synthetic stats
// (speeds ordered as the ROM's first use); projectBattleResolutionCommands builds the commands, battleResolutionCommandDuration times them.
//   node --experimental-strip-types --no-warnings tools/integration/msg175Anchors.ts [--json]
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";

const SPECIES: Record<string, number> = { PRIMEAPE: 57, SNORLAX: 143, ONIX: 95, MACHAMP: 68 };
const FIXTURES = ["off108", "off148"] as const;

const battler = (species: number, moves: number[], speed: number, hp: number) => {
  const entry = speciesTypes.species[species - 1]!;
  return {
    species, moveId: moves[0], moves, ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed, hp, maxHp: hp, types: [entry.types[0], entry.types[1]] as const,
  };
};

type Row = { type: string; start: number; frames: number; text: string; length: number };

export function msg175Production(
  playerSpecies: string, playerMove: number, opponentSpecies: string, opponentMove: number, playerFirst: boolean, scene: "on" | "off",
): Row[] {
  const p = SPECIES[playerSpecies]!; const o = SPECIES[opponentSpecies]!;
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(p, [playerMove, playerMove, playerMove, playerMove], playerFirst ? 120 : 40, 260),
    trainer: battler(o, [opponentMove, opponentMove, opponentMove, opponentMove], playerFirst ? 40 : 120, 260),
  } as never);
  if (scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  // A self-targeting move's legal target is its user: try the foe, then the user.
  const submit = (s: any, requestId: number, side: "player" | "trainer", foe: 0 | 1) => {
    try {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: foe } as never });
    } catch {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 - foe } as never });
    }
  };
  const a = submit(state, 1, "player", 1);
  const b = submit(a.state, 2, "trainer", 0);
  if (process.env.MSG175_EVENTS) for (const e of b.events as any[]) console.error(e.provenance?.instructionExecution, e.payload.kind, e.payload.messageId ?? e.payload.animationId ?? "", e.provenance?.opcodeName ?? "");
  const make = (index: 0 | 1, species: number, name: string, moves: number[], rules: any) => Object.freeze({
    species, name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
    hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: "male", status: "none" as const,
    moveIds: moves, currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({
    player: make(0, p, playerSpecies, [playerMove, playerMove, playerMove, playerMove], beforeRules),
    opponent: make(1, o, opponentSpecies, [opponentMove, opponentMove, opponentMove, opponentMove], beforeRules),
  }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, beforeRules, b.state.rules.rulesContext, field, null);
  let t = 0;
  return commands.map((command) => {
    const start = t;
    const frames = battleResolutionCommandDuration(command, field);
    t += frames;
    const lines = command.type === "message" ? (command as any).lines as string[] : [];
    return { type: command.type, start, frames, text: lines.join("\\n"), length: battleStringPrintableLength(lines) };
  });
}

/** Both checks over the off108 / off148 scenarios (optionally only the named ones). */
export function msg175Measure(only?: readonly string[]) {
  const durations: any[] = []; const edges: any[] = [];
  for (const fixture of FIXTURES) {
    const index = JSON.parse(readFileSync(`tools/integration/fixtures/${fixture}/scenario-index.json`, "utf8"));
    const rom = JSON.parse(readFileSync(`tools/integration/fixtures/${fixture}/receipts/rom-r1.json`, "utf8")).scenarios;
    for (const [file, meta] of Object.entries<any>(index)) {
      const name = file.replace(/\.json$/, "");
      if (only !== undefined && !only.includes(name)) continue;
      for (const scene of ["on", "off"] as const) {
        const uses = rom[name]?.[scene];
        if (!uses) continue;
        // ROM attacker / target: the scenario's attacker uses `move`; the other side Tackles (33).
        const attackerIsPlayer = meta.attackerSide === "player";
        const playerSpecies = attackerIsPlayer ? meta.attacker : meta.target;
        const opponentSpecies = attackerIsPlayer ? meta.target : meta.attacker;
        const playerMove = attackerIsPlayer ? meta.move : 33; const opponentMove = attackerIsPlayer ? 33 : meta.move;
        const playerFirst = uses[0].atk === 0;
        let rows: Row[];
        try {
          rows = msg175Production(playerSpecies, playerMove, opponentSpecies, opponentMove, playerFirst, scene);
        } catch (error) {
          edges.push({ scenario: name, scene, error: String(error).slice(0, 120) });
          continue;
        }
        const used = rows.filter((row) => row.type === "message" && row.text.includes(" used\\n"));
        for (const use of uses.filter((u: any) => u.opener === "attackstring")) {
          const atkName = use.atk === 0 ? playerSpecies : `Foe ${opponentSpecies}`;
          const moveRow = used.find((row) => row.text.startsWith(`${atkName} used`));
          durations.push({ scenario: name, scene, mv: use.mv, romRows: use.G - use.openerFirstChange + 1, L: moveRow?.length ?? null,
            text: moveRow?.text ?? null });
        }
        if (uses[0].opener !== "attackstring" || uses[1]?.opener !== "attackstring" || used.length < 2) continue;
        const romEdge = uses[1].openerFirstChange - uses[0].openerFirstChange;
        const prodEdge = used[1]!.start - used[0]!.start;
        const oldEdge = prodEdge + Math.max(0, 24 - used[0]!.length);
        edges.push({ scenario: name, scene, class: meta.class, L1: used[0]!.length, rom: romEdge, production: prodEdge,
          residual: prodEdge - romEdge, oldResidual: oldEdge - romEdge });
      }
    }
  }
  return { durations, edges };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { durations, edges } = msg175Measure();
  if (process.argv.includes("--json")) console.log(JSON.stringify({ schema: "msg175-anchors/v1", durations, edges }, null, 1));
  else {
    // L null: the ROM use is not in production's synthetic turn 1 (a two-turn move's 2nd turn, an RNG-different foe turn).
    const matched = durations.filter((d: any) => d.L !== null); const bad = matched.filter((d: any) => d.romRows !== d.L);
    console.log(`durations: ${matched.length - bad.length} / ${matched.length} ROM first-glyph -> final-glyph rows == L`
      + ` (${durations.length - matched.length} ROM uses outside production's turn 1)`);
    for (const d of bad) console.log("  MISMATCH", JSON.stringify(d));
    for (const e of edges as any[]) console.log(e.error ? `${e.scenario}-${e.scene}: ERROR ${e.error}`
      : `${e.scenario}-${e.scene} (${e.class}, L1 ${e.L1}): ROM ${e.rom} prod ${e.production} (${e.residual}; old floor ${e.oldResidual})`);
  }
}
