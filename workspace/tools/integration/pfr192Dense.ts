// pfr192: dense pixel comparison of the PLAYER faint-replacement send-in, production render vs the ROM (pfr192RomFrames.sh dumps).
// Production side = the typed resolution the kernel projects for a faint replacement (party-summary, "Go! X!", party-summary hide, switch-in
// with its incoming.field, turn-end), driven through the orchestrator's own lifecycle phases: presenting-switch-in (the forced selector's
// confirmation clock, renderBattleResolutionForcedPartySelect) -> turn-end presenting (8) -> next-command-handoff (6) -> action menu.
// Timeline parameters come from partySendOutTimingFor / partySendOutResumeElapsed (the production functions).  The opponent half
// (x < 120, y < 48 and x >= 120, y < 64) and the party-menu phases (before the battle field returns) are not compared.
//   node --experimental-strip-types --no-warnings tools/integration/pfr192Dense.ts <rom-dir> <id> <scene on|off> <out.json> [--delta=N] [--dump=e,e,..]
import { readFileSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import { renderBattleResolutionForcedPartySelect, renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES, playerFaintReplacementSendOutTimingOfSegment } from "../../src/engine/battleResolutionPresentationRender.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../../src/engine/battleResolutionPresentation.ts";
import { calculateHpStat } from "../../src/engine/stats.ts";
import * as party from "../../src/engine/partySelect.ts";

const [romDir, id, scene, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (name: string) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split("=")[1] ?? null;
const sceneOn = scene === "on";
const stats = (sid: number) => speciesStats.species.find((s) => s.id === sid)!;
const name = (sid: number) => stats(sid).name.replace(/^SPECIES_/, "");
const scenario = JSON.parse(readFileSync(`${romDir}/${id}-${scene}.scenario.json`, "utf8"));
const probe = JSON.parse(readFileSync(`${romDir}/${id}-${scene}.json`, "utf8"));
const raw = readFileSync(`${romDir}/${id}-${scene}.raw`);
const FRAME = 240 * 160 * 3;
const romFrame = (abs: number): Uint8Array | null => {
  const i = abs - probe.rawFirstFrame;
  return i < 0 || (i + 1) * FRAME > raw.length ? null : raw.subarray(i * FRAME, (i + 1) * FRAME);
};

const parties = scenario.overrides.parties;
const mk = (b: 0 | 1, m: any, partyIndex: number) => {
  const maxHP = calculateHpStat(stats(m.species).baseHp, m.ivs.hp, m.evs.hp, m.level);
  return Object.freeze({
    species: m.species as number, name: name(m.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex, level: m.level as number, hp: maxHP, maxHP, gender: m.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    personality: b === 0 && partyIndex === 1 ? (m.nature as number) : 0,
  });
};
const incomingCfg = parties.player[1];
const incoming = mk(0, incomingCfg, 1);
const field = Object.freeze({ player: incoming, opponent: mk(1, parties.opponent[0], 0) });
const states = Object.freeze(["fainted", "healthy", "healthy", "empty", "empty", "empty"]);
const timing = switchInTiming(0, incoming.species, sceneOn, incoming.name, false, incoming.personality);
const commands = [
  Object.freeze({ type: "party-summary", eventSequence: 1, battler: 0, visible: true, states, timing: { minimumFrames: 7 } }),
  Object.freeze({ type: "message", eventSequence: 2, lines: [`Go! ${incoming.name}!`], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } }),
  Object.freeze({ type: "party-summary", eventSequence: 3, battler: 0, visible: false, states }),
  Object.freeze({ type: "switch-in", eventSequence: 4, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
    timing, settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES, sceneOn }),
  Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
];
const segment = { field, beforeRules: { rulesContext: { hitMarker: sceneOn ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } }, afterRules: null, events: [], commands } as never;
const resolution = (commandIndex: number, phase: string, phaseElapsed: number) => ({
  field, segments: [segment], segmentIndex: 0,
  commandIndex, lifecycle: { phase, phaseElapsed }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
} as never);
const sendOutTiming = playerFaintReplacementSendOutTimingOfSegment(segment) ?? undefined;
const partyState = (e: number) => ({ sendOutElapsed: e, elapsed: 400 + e, sendOutTiming } as never);
const ready = (e: number) => party.partySendOutBattleMenuReady(e, sendOutTiming);
let readyE = 0; while (!ready(readyE)) readyE += 1;
const TURN_END = 8; const HANDOFF = BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES;
const promptE = readyE + TURN_END + HANDOFF;
const draw = (e: number): Uint8Array => {
  const fb = new Uint8Array(240 * 160 * 4);
  if (e < readyE) {
    const view = createBattleResolutionPresentationRenderView(resolution(0, "presenting-switch-in", e));
    renderBattleResolutionForcedPartySelect(fb, view, partyState(e));
  } else if (e < readyE + TURN_END) {
    renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(resolution(4, "presenting", e - readyE)));
  } else {
    renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(resolution(5, "next-command-handoff", e - readyE - TURN_END)));
  }
  return fb;
};
const opponentHalf = (x: number, y: number) => (x < 120 && y < 48) || (x >= 120 && y < 72);
const region = (x: number, y: number) => y >= 112 ? "msg" : x >= 120 ? "phb" : "mon";
const diff = (p: Uint8Array, r: Uint8Array) => {
  const o = { total: 0, phb: 0, mon: 0, msg: 0 };
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    if (opponentHalf(x, y)) continue;
    const i = y * 240 + x;
    if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) { o.total += 1; o[region(x, y) as "phb" | "mon" | "msg"] += 1; }
  }
  return o;
};
const FIRST_E = 56; // BATTLE_FADE_IN_START: the field returns (the party-menu phases before it are species-independent)
const confirm = probe.confirmFrame as number;
// Alignment: delta = ROM frame of production e=0 relative to the confirm press frame; searched on e in [FIRST_E, FIRST_E + 80) (field return, Go! text) unless fixed.
const fixed = opt("delta");
const score = (delta: number) => { let s = 0; for (let e = FIRST_E; e < FIRST_E + 80; e += 1) { const r = romFrame(confirm + e + delta); if (r) s += diff(draw(e), r).total; } return s; };
let delta = fixed !== null ? Number(fixed) : 0;
if (fixed === null) { let best = Infinity; for (let d = -4; d <= 4; d += 1) { const s = score(d); if (s < best) { best = s; delta = d; } } }
const rows: { e: number; total: number; phb: number; mon: number; msg: number }[] = [];
for (let e = FIRST_E; e < promptE; e += 1) {
  const r = romFrame(confirm + e + delta);
  if (!r) break;
  rows.push({ e, ...diff(draw(e), r) });
}
const sum = (k: "total" | "phb" | "mon" | "msg") => rows.reduce((s, r) => s + r[k], 0);
const ranges = (pred: (r: (typeof rows)[number]) => boolean) => {
  const out: string[] = []; let start: number | null = null; let prev = 0;
  for (const r of rows) { if (pred(r)) { if (start === null) start = r.e; prev = r.e; } else if (start !== null) { out.push(start === prev ? `${start}` : `${start}-${prev}`); start = null; } }
  if (start !== null) out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out;
};
const result = {
  id, scene, species: incoming.species, name: incoming.name, nature: incomingCfg.nature, delta, readyE, promptE, rows: rows.length,
  zeroRows: rows.filter((r) => r.total === 0).length, px: { total: sum("total"), phb: sum("phb"), mon: sum("mon"), msg: sum("msg") },
  nonZeroRanges: ranges((r) => r.total > 0), nonZeroRegionRanges: { phb: ranges((r) => r.phb > 0), mon: ranges((r) => r.mon > 0), msg: ranges((r) => r.msg > 0) },
  perRow: rows,
};
if (outPath) writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
console.log(`${id}-${scene} ${result.name} delta ${delta} ready ${readyE} prompt ${promptE}: rows ${rows.length} zero ${result.zeroRows} px ${JSON.stringify(result.px)} nonzero ${result.nonZeroRanges.join(",")}`);
const dump = opt("dump");
if (dump) for (const e of dump.split(",").map(Number)) {
  const p = draw(e); const r = romFrame(confirm + e + delta)!;
  const img = Buffer.alloc(480 * 160 * 3);
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) for (let k = 0; k < 3; k += 1) {
    img[(y * 480 + x) * 3 + k] = p[(y * 240 + x) * 4 + k]!; img[(y * 480 + 240 + x) * 3 + k] = r[(y * 240 + x) * 3 + k]!;
  }
  writeFileSync(`${outPath ?? "/tmp/pfr192/dump"}.e${e}.ppm`, Buffer.concat([Buffer.from("P6 480 160 255\n"), img]));
}
const bbox = opt("bbox");
if (bbox) for (const e of bbox.split(",").map(Number)) {
  const p = draw(e); const r = romFrame(confirm + e + delta); if (!r) continue;
  const bb: Record<string, number[]> = {};
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    if (opponentHalf(x, y)) continue; const i = y * 240 + x;
    if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) { const k = region(x, y); const b = (bb[k] ??= [999, 999, -1, -1, 0]); b[0] = Math.min(b[0]!, x); b[1] = Math.min(b[1]!, y); b[2] = Math.max(b[2]!, x); b[3] = Math.max(b[3]!, y); b[4]! += 1; }
  }
  console.log(`e${e} bbox[x0,y0,x1,y1,n]`, JSON.stringify(bb));
}
// --lag=lo,hi : per production frame e, the ROM frame offset k in [-4,4] whose `mon` region (x < 120, 48 <= y < 112) matches best
const lag = opt("lag");
if (lag) {
  const [lo, hi] = lag.split(",").map(Number) as [number, number];
  const out: string[] = [];
  for (let e = lo!; e <= hi!; e += 1) {
    const p = draw(e); let best = [1e9, 0] as [number, number]; let atZero = 0;
    for (let k = -4; k <= 4; k += 1) {
      const r = romFrame(confirm + e + k); if (!r) continue;
      let n = 0;
      for (let y = 48; y < 112; y += 1) for (let x = 0; x < 120; x += 1) { const i = y * 240 + x; if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) n += 1; }
      if (k === 0) atZero = n;
      if (n < best[0]) best = [n, k];
    }
    out.push(`${e}:${best[1]}${best[0] === 0 ? "" : `(${best[0]}/${atZero})`}`);
  }
  console.log("lag", out.join(" "));
}
