// hpb202 (docs/hpb202-health-bar-programs.md): production render of a SHEDINJA (max HP 1) damage-KO health bar vs the ROM's raw RGB
// (hpb202/scenarios/shedinja-ko-{opp,ply}.json, lsd194Probes.sh -> sub183RomFrames.py direct mGBA dump). The hp command's rows 0..N (N = battleHealthBarAnimationFrames)
// are compared to ROM frames o..o+N over the Shedinja healthbox rectangle; o is searched over every ROM frame (best + runner-up residual reported, so a unique zero is a proof).
//   node --experimental-strip-types --no-warnings tools/integration/hpb202BarCompare.ts <rom.rgb.gz> <out.json> --scene=on|off --side=player|opponent [--seed=N]
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../../src/engine/battleResolutionPresentation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { battleResolutionCommandDuration, createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { battleHealthBarAnimationFrames } from "../../src/engine/healthboxAssembly.ts";
import { LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_SCENE_OFF_INPUT } from "../../src/engine/liveBattlerX2History.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };

const arg = (n: string, d?: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const [romRgb, outPath] = process.argv.slice(2, 4) as [string, string];
const scene = arg("scene", "off") as "on" | "off", side = arg("side", "opponent") as "player" | "opponent";
const W = 240, H = 160, FS = W * H * 3;
const rom = gunzipSync(readFileSync(romRgb));
const romFrames = Math.floor(rom.length / FS);

const SHEDINJA = { name: "SHEDINJA", id: 303, hp: 1, attack: 110, defense: 70, spAttack: 55, spDefense: 55, speed: 40 };
const DUGTRIO = { name: "DUGTRIO", id: 51, hp: 110, attack: 100, defense: 55, spAttack: 55, spDefense: 70, speed: 140 };
type Mon = typeof SHEDINJA;
const battler = (m: Mon, move: number, ability: number) => {
  const entry = speciesTypes.species[m.id - 1]!;
  return { species: m.id, moveId: move, moves: [move, move, move, move], ability, item: 0, personality: 0, attack: m.attack, defense: m.defense,
    spAttack: m.spAttack, spDefense: m.spDefense, speed: m.speed, hp: m.hp, maxHp: m.hp, types: [entry.types[0], entry.types[1]] as const };
};
const shedIsPlayer = side === "player";
const [p, t] = shedIsPlayer ? [SHEDINJA, DUGTRIO] : [DUGTRIO, SHEDINJA];
const pMove = shedIsPlayer ? 10 : 157, tMove = shedIsPlayer ? 157 : 10;
let state = createFactoryFullTurnBattleState({ requestId: 1, rngSeed: Number(arg("seed", "305419897")),
  player: battler(p, pMove, p === SHEDINJA ? 25 : 8), trainer: battler(t, tMove, t === SHEDINJA ? 25 : 8) } as never);
if (scene === "off") {
  const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
  state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
}
const beforeRules = state.rules.rulesContext;
const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } as never });
const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 } as never });
const make = (index: 0 | 1, m: Mon, move: number, rules: any) => Object.freeze({
  species: m.id, name: m.name, side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level: 50,
  hp: rules.battlers[index].hp, maxHP: rules.battlers[index].maxHp ?? rules.battlers[index].hp, gender: m === SHEDINJA ? "genderless" : "male", status: "none" as const,
  moveIds: [move, move, move, move], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
});
const field = Object.freeze({ player: make(0, p, pMove, beforeRules), opponent: make(1, t, tMove, beforeRules) }) as never;
const commands = projectBattleResolutionCommands(b.events as never, beforeRules, b.state.rules.rulesContext, field, null,
  { className: "TRAINER", name: "HPB202", speechLose: ["a", "b"], speechWin: ["a", "b"] } as never) as any[];
const shedBattler = shedIsPlayer ? 0 : 1;
const hpIdx = commands.findIndex((c) => c.type === "hp" && c.battler === shedBattler);
if (hpIdx < 0) throw new Error("no Shedinja hp command: " + commands.map((c) => c.type).join(","));
const hp = commands[hpIdx];
const barFrames = battleHealthBarAnimationFrames({ maxHp: 1, from: hp.from, to: hp.to });

const fb = new Uint8Array(W * H * 4);
const render = (commandIndex: number, phaseElapsed: number) => {
  const s = {
    field, segments: [{ field, beforeRules, afterRules: b.state.rules, events: b.events, commands }],
    segmentIndex: 0, commandIndex, lifecycle: { phase: "presenting", phaseElapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0, liveOrdinaryBattlerX2History: LIVE_BATTLER_X2_IDLE,
    ...(scene === "off" ? { liveMoveBattlerX2Input: LIVE_BATTLER_X2_SCENE_OFF_INPUT } : {}),
  };
  fb.fill(0);
  renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(s as never));
  return Uint8Array.from(fb);
};
// healthbox rectangles (screen px): opponent frame origin (12,14) 128x32; player frame origin (126,72) 104x40 incl. HP text.
const RECT = side === "opponent" ? { x0: 12, y0: 14, x1: 140, y1: 46 } : { x0: 126, y0: 72, x1: 230, y1: 112 };
const BAR = side === "opponent" ? { x0: 36, y0: 30, x1: 104, y1: 39 } : { x0: 190, y0: 84, x1: 236, y1: 94 };
const diffRect = (f: Uint8Array, romFrame: number, r: typeof RECT) => {
  let n = 0;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
    const i = (y * W + x) * 4, j = romFrame * FS + (y * W + x) * 3;
    if (f[i] !== rom[j] || f[i + 1] !== rom[j + 1] || f[i + 2] !== rom[j + 2]) n++;
  }
  return n;
};
const prodRows = Array.from({ length: barFrames + 1 }, (_, e) => render(hpIdx, e));
const offsets: { o: number; box: number; bar: number }[] = [];
for (let o = 0; o + barFrames < romFrames; o++) {
  let box = 0, bar = 0;
  for (let e = 0; e <= barFrames; e++) { box += diffRect(prodRows[e]!, o + e, RECT); bar += diffRect(prodRows[e]!, o + e, BAR); }
  offsets.push({ o, box, bar });
}
offsets.sort((x, y) => x.box - y.box || x.o - y.o);
const best = offsets[0]!;
// filled bar pixels on the bar's middle pixel row (opponent bar rows y 33..34): fill colours are the only pixels with g > 150 that are not the frame's white / cream.
const fillPixels = (f: (x: number, y: number) => readonly number[]) => {
  let n = 0;
  for (let x = BAR.x0; x < BAR.x1; x++) { const c = f(x, BAR.y0 + 3); if (c[1]! > 150 && !(c[0]! > 200 && c[2]! > 170) && !(c[0]! === 82)) n++; }
  return n;
};
const perRow = prodRows.map((f, e) => ({ e, rom: best.o + e, box: diffRect(f, best.o + e, RECT), bar: diffRect(f, best.o + e, BAR),
  prodFill: fillPixels((x, y) => [f[(y * W + x) * 4]!, f[(y * W + x) * 4 + 1]!, f[(y * W + x) * 4 + 2]!]),
  romFill: fillPixels((x, y) => [rom[(best.o + e) * FS + (y * W + x) * 3]!, rom[(best.o + e) * FS + (y * W + x) * 3 + 1]!, rom[(best.o + e) * FS + (y * W + x) * 3 + 2]!]) }));
const out = { schema: "hpb202-bar-compare/v1", scene, side, hpCommand: { index: hpIdx, from: hp.from, to: hp.to, healthValue: hp.healthValue }, barFrames,
  commandDuration: battleResolutionCommandDuration(hp, field), romFrames, best, runnerUp: offsets[1], rectArea: (RECT.x1 - RECT.x0) * (RECT.y1 - RECT.y0), perRow };
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(scene, side, JSON.stringify({ barFrames, best, runnerUp: offsets[1], nonzeroRows: perRow.filter((r) => r.box).length }));
if (arg("debug")) for (let e = 0; e < 12; e++) {
  const v = createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules, afterRules: b.state.rules, events: b.events, commands }], segmentIndex: 0, commandIndex: hpIdx,
    lifecycle: { phase: "presenting", phaseElapsed: e }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    liveOrdinaryBattlerX2History: LIVE_BATTLER_X2_IDLE } as never) as any;
  console.log(e, JSON.stringify(v.healthboxes[side]), JSON.stringify(v.field[side].hp));
}
if (arg("debug")) for (const e of [0, 1, 5, 8, 9, 10]) {
  const f = prodRows[e]!; let line = "";
  for (let x = BAR.x0; x < BAR.x1; x++) { const i = (BAR.y0 + 3) * W * 4 + x * 4; line += f[i + 1]! > 200 ? "#" : f[i + 1]! > 150 ? "+" : "."; }
  console.log(e, line);
}
if (arg("diffRow")) {
  const e = Number(arg("diffRow")), f = prodRows[e]!, o = best.o + e;
  for (let y = RECT.y0; y < RECT.y1; y++) for (let x = RECT.x0; x < RECT.x1; x++) {
    const i = (y * W + x) * 4, j = o * FS + (y * W + x) * 3;
    if (f[i] !== rom[j] || f[i + 1] !== rom[j + 1] || f[i + 2] !== rom[j + 2]) console.log("diff", x, y, [f[i], f[i + 1], f[i + 2]], [rom[j], rom[j + 1], rom[j + 2]]);
  }
}
