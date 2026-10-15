// trn176 (docs/trn176-action-transition.md): the Scene OFF action-transition rule against the committed ROM receipts, applied to the
// production kernel's events and presentation commands.
//
// RULE (ROM rows, source: Cmd_end -> HandleAction_TryFinish -> HandleAction_ActionFinished -> HandleAction_UseMove -> the move's script).
//   Let E be the last row the previous action's last blocking instruction waits on the controller (a print's waitmessage, the HP bar's
//   datahpupdate), m0 the first row whose pointer is BattleScript_MoveEnd's `moveend`, n the number of MoveEnd sprite-visibility
//   receipts (Cmd_moveend calls: MOVEEND_ATTACKER_VISIBLE and, for a foe target, MOVEEND_TARGET_VISIBLE each emit and return; the
//   controller clears the flag in the same frame, so the pointer stays on `moveend` for n + 1 rows), then `end` / TryFinish /
//   ActionFinished / UseMove take the 4 rows with the pointer on `end`, the next script's u-th instruction (attackstring, u =
//   instructionExecution of the next USEDMOVE) runs on row m0 + n + 5 + u, and its first glyph is one row later:
//        first glyph = m0 + n + 6 + u
//   With d = rows from E + 1 to m0 - 1 (= kernel instructionExecution(first moveend receipt) - E_exec - 1), the next first glyph is
//        E + 1 + d + n + 6 + u
//   and production, which presents the anchor command up to E, must start the next "used" command d + n + 6 + u frames after the
//   anchor command's end (E_prod + 1); it presents `between` frames there (status icon, MoveEnd's 1-frame receipts): the pause is
//        P = d + n + 6 + u - between.
//   E_exec of a print = instructionExecution + W (the kernel counts waitmessage once per row: W = 64 for B_WAIT_TIME_LONG), of the HP
//   bar = datahpupdate's instructionExecution.
//
//   node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts [--json] [--scene=off|on] [--fixtures=a,b] [--only=name]
import { readFileSync, existsSync } from "node:fs";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import { loadBattleScriptProgram } from "../../src/engine/battleScriptProgram.ts";

const PROGRAM = loadBattleScriptProgram();
const SPECIES: Record<string, number> = { PRIMEAPE: 57, SNORLAX: 143, ONIX: 95, MACHAMP: 68, ALAKAZAM: 65, GENGAR: 94, DUGTRIO: 51, PIDGEOT: 18 };
const WAIT_TICKS: Record<string, number> = { B_WAIT_TIME_LONG: 64, B_WAIT_TIME_MED: 48, B_WAIT_TIME_SHORT: 32 };
export const MOVEEND_ROWS_AFTER_END = 4; // `end`, TryFinish, ActionFinished, UseMove: the pointer stays on `end` for 4 rows
export const POST_ATTACKSTRING_ROWS = 1; // the controller starts the print one row after attackstring executes

const battler = (species: number, moves: number[], speed: number, hp: number) => {
  const entry = speciesTypes.species[species - 1]!;
  return {
    species, moveId: moves[0], moves, ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed, hp, maxHp: hp, types: [entry.types[0], entry.types[1]] as const,
  };
};

type Row = { type: string; start: number; frames: number; text: string };
type Production = { rows: Row[]; events: any[]; commands: any[]; field: any; beforeRules: any; afterRules: any };

export function trn176Production(
  playerSpecies: string, playerMove: number, opponentSpecies: string, opponentMove: number, playerFirst: boolean, scene: "on" | "off",
): Production {
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
  const submit = (s: any, requestId: number, side: "player" | "trainer", foe: 0 | 1) => {
    try {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: foe } as never });
    } catch {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 - foe } as never });
    }
  };
  const a = submit(state, 1, "player", 1);
  const b = submit(a.state, 2, "trainer", 0);
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
  const rows = commands.map((command) => {
    const start = t;
    const frames = battleResolutionCommandDuration(command, field);
    t += frames;
    const lines = command.type === "message" ? (command as any).lines as string[] : [];
    return { type: command.type, start, frames, text: lines.join("\\n") };
  });
  return { rows, events: b.events as any[], commands: commands as any[], field, beforeRules, afterRules: b.state.rules };
}

const exec = (event: any): number => event.provenance?.instructionExecution;
const isUsed = (event: any) => event.payload.kind === "message" && (event.payload.messageId === "STRINGID_USEDMOVE" || event.payload.messageId === "STRINGID_EMPTYSTRING3");

/** Splits the flat events into actions (the count restarts with each action). */
function actions(events: any[]): any[][] {
  const out: any[][] = []; let last = Infinity;
  for (const event of events) {
    const e = exec(event);
    if (e === undefined) continue;
    if (e <= last || out.length === 0) out.push([]);
    out[out.length - 1]!.push(event);
    last = e;
  }
  return out;
}

export type Transition = {
  e1: number; n: number; u: number; anchorKind: string; anchorExec: number; wait: number; d: number; required: number;
};

/** The rule's kernel-provenance inputs for action `a` followed by action `b` (null: the shape is not covered). */
export function transitionInputs(a: any[], b: any[]): Transition | { reason: string } {
  const moveend = a.map((event, index) => ({ event, index }))
    .filter(({ event }) => event.payload.kind === "set-battler-sprite-visibility" && event.provenance?.opcodeName === "B_SCR_OP_MOVEEND");
  if (moveend.length === 0) return { reason: "no MoveEnd receipt" };
  const first = moveend[0]!;
  const used = b[0];
  if (!used || !isUsed(used) || used.payload.messageId !== "STRINGID_USEDMOVE") return { reason: "next action does not open with a USEDMOVE print" };
  const u = exec(used);
  let anchor: any = null;
  for (let index = first.index - 1; index >= 0; index -= 1) {
    const event = a[index]!;
    if (event.payload.kind === "message" || event.payload.kind === "hp-change" || event.payload.kind === "status-icon-update") { anchor = event; break; }
  }
  if (anchor === null) return { reason: "no print / HP anchor before MoveEnd" };
  if (anchor.payload.kind === "message" && anchor.payload.messageId === "STRINGID_USEDMOVE") return { reason: "anchor is the used print itself" };
  let wait = 0;
  if (anchor.payload.kind === "message") {
    const following = PROGRAM.instructions[anchor.provenance.programCounter + 1];
    if (following?.opcodeName !== "B_SCR_OP_WAITMESSAGE") return { reason: `print without waitmessage (${anchor.payload.messageId})` };
    wait = WAIT_TICKS[following.operands[0]!.expression]!;
  }
  // updatestatusicon: production presents one frame for the icon (ROM: UpdateEffectStatusIconRet+2 is a 2-row run, its first row).
  const anchorExec = exec(anchor) + wait;
  const e1 = exec(first.event);
  const d = e1 - anchorExec - 1;
  const n = moveend.length;
  return { e1, n, u, anchorKind: anchor.payload.kind === "message" ? `print+${wait}` : anchor.payload.kind === "hp-change" ? "hp" : "icon", anchorExec, wait, d, required: d + n + 6 + u };
}

/** The production rows of the transition: the anchor command's end and the next action's "used" start. */
function productionGap(rows: Row[], usedTexts: [string, string], chargeOpener: boolean) {
  const second = rows.find((row) => row.type === "message" && row.text.startsWith(usedTexts[1] + " used"));
  const first = chargeOpener ? rows[0] : rows.find((row) => row.type === "message" && row.text.startsWith(usedTexts[0] + " used"));
  if (!second || !first) return null;
  let anchor: Row | null = null;
  for (const row of rows) if (row.start >= first.start && row.start < second.start && (row.type === "message" || row.type === "hp" || row.type === "status-icon") && row !== first) anchor = row;
  if (!anchor) anchor = first;
  const end = anchor.start + anchor.frames;
  return { secondStart: second.start, firstStart: first.start, anchor: `${anchor.type}@${anchor.start}+${anchor.frames}`, anchorFrames: anchor.frames, anchorStart: anchor.start, anchorType: anchor.type, anchorEnd: end, gap: second.start - end };
}

type Case = {
  fixture: string; name: string; scene: "on" | "off"; cls: string; romEdge: number; romGlyphFromM0: number | null;
  uses: any[]; meta: any;
};

function romOf(use0: any, use1: any) {
  // First `moveend` row after use0's last long run and the structure up to use1's first glyph (rows relative to use0's G).
  const runs = use0.runs as any[];
  const idx = runs.map((r, i) => (r[0] === "BattleScript_MoveEnd+6" ? i : -1)).filter((i) => i >= 0).pop();
  if (idx === undefined) return null;
  const m0 = runs[idx][1]; const len6 = runs[idx][2];
  const end = runs[idx + 1]; // MoveEnd+9
  const glyph = use1.openerFirstChange - use0.G;
  const m0i = runs.findIndex((r) => r[0] === "BattleScript_MoveEnd+0");
  let waitRows: number | null = null; let waitGlyph: number | null = null;
  for (let i = (m0i < 0 ? idx : m0i) - 1; i >= 0; i -= 1) if (runs[i][6] > 0 && runs[i][2] > 2) { waitRows = runs[i][2]; waitGlyph = runs[i][5][0] + use0.G - use0.openerFirstChange; break; }
  return { waitRows, waitGlyph, m0, n: len6 - 1, rowsOnEnd: end && end[0] === "BattleScript_MoveEnd+9" ? end[2] : null, glyph, glyphFromM0: glyph - m0 };
}

export function trn176Cases(fixtures: string[], only?: string[]): Case[] {
  const out: Case[] = [];
  for (const fixture of fixtures) {
    const base = `tools/integration/fixtures/${fixture}`;
    if (!existsSync(`${base}/scenario-index.json`)) continue;
    const index = JSON.parse(readFileSync(`${base}/scenario-index.json`, "utf8"));
    const rom = JSON.parse(readFileSync(`${base}/receipts/rom-r1.json`, "utf8")).scenarios;
    for (const [file, meta] of Object.entries<any>(index)) {
      const name = file.replace(/\.json$/, "");
      if (only && !only.includes(name)) continue;
      for (const scene of ["off", "on"] as const) {
        const uses = rom[name]?.[scene];
        if (!uses || uses.length < 2) continue;
        out.push({ fixture, name, scene, cls: meta.class, romEdge: uses[1].openerFirstChange - uses[0].openerFirstChange, romGlyphFromM0: null, uses, meta });
      }
    }
  }
  return out;
}

export function trn176Evaluate(c: Case) {
  const meta = c.meta; const uses = c.uses;
  // ROM attacker / target: the scenario's attacker uses `move`; the other side Tackles (33) unless the scenario says otherwise.
  const attackerIsPlayer = meta.attackerSide === "player";
  const playerSpecies = attackerIsPlayer ? meta.attacker : meta.target;
  const opponentSpecies = attackerIsPlayer ? meta.target : meta.attacker;
  const otherMove = meta.otherMove ?? 33;
  const playerMove = attackerIsPlayer ? meta.move : otherMove; const opponentMove = attackerIsPlayer ? otherMove : meta.move;
  const playerFirst = uses[0].atk === 0;
  const rom = romOf(uses[0], uses[1]);
  const result: any = { fixture: c.fixture, name: c.name, scene: c.scene, class: c.cls, romEdge: c.romEdge };
  let prod: Production;
  try {
    prod = trn176Production(playerSpecies, playerMove, opponentSpecies, opponentMove, playerFirst, c.scene);
  } catch (error) {
    return { ...result, skipped: `kernel: ${String(error).slice(0, 80)}` };
  }
  const acts = actions(prod.events);
  if (acts.length < 2) return { ...result, skipped: "fewer than two actions" };
  const t = transitionInputs(acts[0]!, acts[1]!);
  if ("reason" in t) return { ...result, skipped: t.reason };
  const firstName = uses[0].atk === 0 ? playerSpecies : `Foe ${opponentSpecies}`;
  const secondName = uses[1].atk === 0 ? playerSpecies : `Foe ${opponentSpecies}`;
  const gap = productionGap(prod.rows, [firstName, secondName], uses[0].opener === "EMPTYSTRING3");
  if (gap === null) return { ...result, skipped: "no used rows" };
  const prodEdge = gap.secondStart - gap.firstStart;
  const pause = t.required - gap.gap;
  return {
    ...result, ...t, rom: rom ? { m0: rom.m0, n: rom.n, rowsOnEnd: rom.rowsOnEnd, glyphFromM0: rom.glyphFromM0, ruleGlyphFromM0: t.n + 6 + t.u } : null,
    productionEdge: prodEdge, residual: prodEdge - c.romEdge, anchor: gap.anchor, between: gap.gap, pause, predictedResidual: prodEdge + pause - c.romEdge,
    anchorFrames: gap.anchorFrames, romWaitRows: rom?.waitRows ?? null, anchorDelta: rom?.waitRows == null ? null : gap.anchorFrames - rom.waitRows,
    anchorEndDelta: rom?.waitRows == null || rom?.waitGlyph == null || gap.anchorType === "status-icon" ? null : gap.anchorStart - gap.firstStart - rom.waitGlyph + gap.anchorFrames - rom.waitRows + 1,
    // ROM-only check of the rule, independent of production: rows from the anchor's release E (the last row of the controller wait run) to the next first glyph.
    romCheck: rom?.waitRows == null || rom?.waitGlyph == null || gap.anchorType === "status-icon" ? null
      : c.romEdge - (rom.waitGlyph + rom.waitRows - 2) - (1 + t.d + t.n + 6 + t.u),
    romWaitGlyph: rom?.waitGlyph ?? null, anchorStartDelta: rom?.waitGlyph == null ? null : gap.anchorStart - gap.firstStart - rom.waitGlyph,
  };
}

if (process.argv[1]?.endsWith("trn176Predict.ts")) {
  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const fixtures = (arg("fixtures") ?? "off108,off148,trn176").split(",");
  const scenes = (arg("scene") ?? "off,on").split(",");
  const only = arg("only")?.split(",");
  const results = trn176Cases(fixtures, only).filter((c) => scenes.includes(c.scene)).map(trn176Evaluate);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(results, null, 1));
  } else {
    console.log("fixture/scenario scene | class | e1 n u d | ROM glyph-m0 (rule) | ROM edge | prod edge (resid) | between | P | predicted resid");
    for (const r of results) {
      if (r.skipped) { console.log(`${r.name} ${r.scene} | ${r.class} | skipped: ${r.skipped}`); continue; }
      console.log(`${r.name} ${r.scene} | ${r.class} | e1 ${r.e1} n ${r.n} u ${r.u} d ${r.d} (${r.anchorKind}) | ROM ${r.rom?.glyphFromM0 ?? "?"} (rule ${r.rom?.ruleGlyphFromM0}; rom n ${r.rom?.n}) | ${r.romEdge} | ${r.productionEdge} (${r.residual}) | ${r.between} | P ${r.pause} | ${r.predictedResidual} | anchor ${r.anchor} vs ROM wait ${r.romWaitRows} (${r.anchorDelta}) start Δ ${r.anchorStartDelta} => anchor-end Δ ${r.anchorEndDelta} | ROM-only rule check ${r.romCheck}`);
    }
  }
}
