// bso226 (docs/bso226-battle-start-intro-send-outs.md): the production battle-start intro (generated-orchestrator route) vs a Scene ON
// ROM battle-lab run (pre-checkpoint frames), per-frame / per-region residual.
//   node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts <params.json> <rom-dir> <out.json>
//     [--scene=on|off] [--offset=N] [--ack=N] [--end=N] [--dump=f,f,..] [--dump-dir=DIR]
// params.json: { tag, rngValue, factoryWinStreak, playerSetIds:[3], playerPersonalities?:[3], benchSetIds:[3] }.
// `--scene=off` renders the pre-bso226 route (the Scene OFF intro renderer) against the same ROM frames = the "before" column.
// Regions: opp = opponent mon (x >= 120, y < 64); pm = player mon / trainer (x < 120, 48 <= y < 112); rest = everything else.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import {
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [paramsPath, romDir, outPath] = args;
const opt = (name: string, dflt: string | null = null) =>
  process.argv.find((x) => x.startsWith(`--${name}=`))?.split("=")[1] ?? dflt;
const scene = opt("scene", "on") as "on" | "off";
let offset = Number(opt("offset", "1171"));
let ack = Number(opt("ack", "369"));
const end = Number(opt("end", "750"));
const dump = (opt("dump", "") ?? "").split(",").flatMap((s) => { const m = s.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => Number(m[1]) + i) : s === "" ? [] : [Number(s)]; });
const dumpDir = opt("dump-dir", null);

const params = JSON.parse(readFileSync(paramsPath!, "utf8")) as {
  tag: string; rngValue: number; factoryWinStreak: number; playerSetIds: number[]; playerPersonalities?: number[]; benchSetIds: number[];
};
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const record = (setId: number, fixedIv: number, personality?: number): FactoryRentalRecord => {
  const set = frontierMonsData.entries[setId]!;
  const p = personality ?? natureByName.get(set.nature)!;
  const input = { setId, personality: p, fixedIv, abilitySlot: (p & 1) as 0 | 1, otId: 0x89ab_cdef };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
};

export function stageIntro(state: ReturnType<typeof createInitialState>) {
  const fixedIv = getLevel50InitialRentalFixedIv(0, false);
  const playerRentalRecords = params.playerSetIds.map((id, i) => record(id, fixedIv, params.playerPersonalities?.[i])) as unknown as readonly [FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord];
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: `bso226-${params.tag}`,
    battleScene: scene,
    rngValue: params.rngValue,
    factoryWinStreak: params.factoryWinStreak,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: params.factoryWinStreak,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [...playerRentalRecords, ...params.benchSetIds.map((id) => record(id, fixedIv))],
    },
  });
  orchestrator = beginFactoryRoundBattleStartIntro(orchestrator);
  return { ...state, factoryRoundBattleOrchestrator: orchestrator, rngMode: "frontierBattle" as const, rngValue: orchestrator.battle?.rng.value ?? state.rngValue };
}

// --lag=L@F: from app frame F the ROM runs L frames later than the app (Scene ON waits for the opponent front animation before "Go!").
const lagOpt = opt("lag", null);
const lag: { by: number; at: number } = lagOpt === null ? { by: 0, at: Infinity } : { by: Number(lagOpt.split("@")[0]), at: Number(lagOpt.split("@")[1]) };
function readRom(frame: number): Uint8Array {
  const file = `${romDir}/pre-checkpoint-frame-${String(frame + offset + (frame >= lag.at ? lag.by : 0)).padStart(5, "0")}.png`;
  return PNG.sync.read(readFileSync(file)).data;
}

type Region = "opp" | "pm" | "rest";
const regionOf = (x: number, y: number): Region =>
  x >= 120 && y < 64 ? "opp" : x < 120 && y >= 48 && y < 112 ? "pm" : "rest";

if (opt("scan") !== null) {
  const [lo, hi] = opt("scan")!.split("-").map(Number);
  for (let seed = lo!; seed <= hi!; seed += 1) {
    params.rngValue = seed;
    const g = stageIntro(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene })).factoryRoundBattleOrchestrator!.opponentGenerations[0]!;
    console.log(seed, g.trainerId, (g.generation as any).opponents.map((o: any) => o.setId).join(","));
  }
  process.exit(0);
}
let state = stageIntro(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
if (opt("info") !== null) {
  const g = state.factoryRoundBattleOrchestrator!.opponentGenerations[0]!;
  console.log(JSON.stringify({ trainerId: g.trainerId, opponents: (g.generation as any).opponents.map((o: any) => [o.setId, o.species ?? null]) }));
  process.exit(0);
}
const frameDiff = (a: Uint8Array, b: Uint8Array) => {
  let n = 0;
  for (let i = 0; i < 240 * 160 * 4; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n += 1;
  return n;
};
// --auto: per-window ROM alignment. offset = ROM frame of app frame 0 (min diff over app frames 0/8/16/24/32); ack = the app frame the
// A press lands on (min diff over the 40 frames after it, `ack` candidates 300..460, offset fixed).
if (opt("auto") !== null) {
  const states = [state];
  const shots = [render(state)];
  for (let f = 1; f <= 700; f += 1) { states.push(tick(states[f - 1]!, [])); shots.push(render(states[f]!)); }
  let bestOffset = { d: Infinity, o: 0 };
  const [oLo, oHi] = (opt("auto") === "1" ? "800-1700" : opt("auto")!).split("-").map(Number);
  for (let o = oLo!; o <= oHi!; o += 1) {
    let d = 0;
    for (const f of [...Array.from({ length: 70 }, (_, i) => i * 3), 240, 280, 320, 360]) d += frameDiff(shots[f]!, PNG.sync.read(readFileSync(`${romDir}/pre-checkpoint-frame-${String(f + o).padStart(5, "0")}.png`)).data);
    if (d < bestOffset.d) bestOffset = { d, o };
  }
  offset = bestOffset.o;
  const ackScore = (a: number) => {
    let st = tick(states[a]!, ["A"]);
    let d = frameDiff(render(st), readRom(a + 1));
    for (let k = 1; k <= 12; k += 1) { for (let n = 0; n < 8; n += 1) st = tick(st, []); d += frameDiff(render(st), readRom(a + 1 + 8 * k)); }
    return d;
  };
  let bestAck = { d: Infinity, a: 0 };
  for (let a = 300; a <= 600; a += 1) { const d = ackScore(a); if (d < bestAck.d) bestAck = { d, a }; }
  ack = bestAck.a;
  console.error(`auto-align offset=${offset} (d=${bestOffset.d}) ack=${ack} (d=${bestAck.d})`);
}
if (opt("drift") !== null) {
  // per app frame (step 20, no buttons) the ROM frame within +-40 of offset+f that matches best (diff in px)
  let st = state;
  for (let f = 0; f <= 700; f += 1) {
    if (f >= Number(opt("drift")) && f % Number(opt("dstep", "20")) === 0) {
      const mine = render(st);
      let best = { d: Infinity, r: 0 };
      for (let r = f + offset - 160; r <= f + offset + 160; r += 1) {
        const d = frameDiff(mine, PNG.sync.read(readFileSync(`${romDir}/pre-checkpoint-frame-${String(r).padStart(5, "0")}.png`)).data);
        if (d < best.d) best = { d, r: r - offset };
      }
      console.log(`app ${f} -> rom ${best.r} (d=${best.d}) lag=${best.r - f}`);
    }
    st = tick(st, f + 1 === ack ? ["A"] : []);
  }
  process.exit(0);
}
// --lagauto: the ROM holds "sent out" until the opponent front animation ends, so after the app's "Go!" switch the ROM runs L frames
// later. splitAt = first app frame (>= ack+40) whose lag-0 `rest` residual jumps; L = the lag minimizing the residual of sampled frames.
if (opt("lagauto") !== null) {
  const ours: Uint8Array[] = [];
  let st = state;
  for (let f = 1; f <= end; f += 1) { st = tick(st, f === ack + 1 ? ["A"] : []); ours[f] = render(st); }
  const romAt = (f: number, extra: number) => PNG.sync.read(readFileSync(`${romDir}/pre-checkpoint-frame-${String(f + offset + extra).padStart(5, "0")}.png`)).data;
  let splitAt = -1;
  for (let f = ack + 40; f <= end; f += 1) {
    const rom = romAt(f, 0); let n = 0;
    for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) { const i = (y * 240 + x) * 4; if (regionOf(x, y) === "rest" && (ours[f]![i] !== rom[i] || ours[f]![i + 1] !== rom[i + 1] || ours[f]![i + 2] !== rom[i + 2])) n += 1; }
    if (n > 500) { splitAt = f; break; }
  }
  let best = { d: Infinity, L: 0 };
  for (let L = 10; L <= 160; L += 1) {
    let d = 0;
    for (let f = splitAt; f <= splitAt + 80; f += 8) d += frameDiff(ours[f]!, romAt(f, L));
    if (d < best.d) best = { d, L };
  }
  lag.by = best.L; lag.at = splitAt;
  console.error(`lagauto lag=${best.L}@${splitAt} (d=${best.d})`);
}
// go246 --menulag=F0: the ROM's first-action-menu lag. splitAt = first app frame >= F0 whose lag-0 `rest` residual exceeds 500 px;
// L (-5..60) = the ROM lag minimizing the residual over app frames splitAt..splitAt+30 (ROM frames past the staged range are skipped).
if (opt("menulag") !== null) {
  const ours: Uint8Array[] = [];
  let st = state;
  for (let f = 1; f <= end; f += 1) { st = tick(st, f === ack + 1 ? ["A"] : []); ours[f] = render(st); }
  const romAt = (f: number, extra: number) => PNG.sync.read(readFileSync(`${romDir}/pre-checkpoint-frame-${String(f + offset + extra).padStart(5, "0")}.png`)).data;
  let splitAt = -1;
  for (let f = Number(opt("menulag")); f <= end; f += 1) {
    const rom = romAt(f, 0); let n = 0;
    for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) { const i = (y * 240 + x) * 4; if (regionOf(x, y) === "rest" && (ours[f]![i] !== rom[i] || ours[f]![i + 1] !== rom[i + 1] || ours[f]![i + 2] !== rom[i + 2])) n += 1; }
    if (n > 500) { splitAt = f; break; }
  }
  const scores: string[] = [];
  let best = { d: Infinity, L: 0 };
  for (let L = -5; L <= 60; L += 1) {
    let d = 0;
    for (let f = splitAt; f <= Math.min(end, splitAt + 30); f += 2) { if (f + offset + L > Number(opt("romlast", "2006"))) { d = Infinity; break; } d += frameDiff(ours[f]!, romAt(f, L)); }
    if (d < best.d) best = { d, L };
    if (Number.isFinite(d)) scores.push(`${L}:${d}`);
  }
  console.log(JSON.stringify({ tag: params.tag, splitAt, menuLag: best.L, d: best.d, lag0: scores.find((x) => x.startsWith("0:")) }));
  process.exit(0);
}
const segments = [{ frames: ack, buttons: [] as string[] }, { frames: 1, buttons: ["A"] }, { frames: end - ack - 1, buttons: [] as string[] }];
type Row = { frame: number; opp: number; pm: number; rest: number };
const rows: Row[] = [];
const dumps: Record<number, { ours: Uint8Array; rom: Uint8Array }> = {};
const capture = (frame: number) => {
  const ours = render(state);
  const rom = readRom(frame);
  const row: Row = { frame, opp: 0, pm: 0, rest: 0 };
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const i = (y * 240 + x) * 4;
      if (ours[i] !== rom[i] || ours[i + 1] !== rom[i + 1] || ours[i + 2] !== rom[i + 2]) row[regionOf(x, y)] += 1;
    }
  }
  rows.push(row);
  if (dump.includes(frame)) dumps[frame] = { ours: new Uint8Array(ours), rom: new Uint8Array(rom) };
};
capture(0);
for (const advance of traceAdvances(segments)) {
  state = tick(state, advance.buttons);
  capture(advance.frame);
}

const sum = (k: Region) => rows.reduce((a, r) => a + r[k], 0);
const first = (k: Region) => rows.find((r) => r[k] > 0)?.frame ?? null;
const summary = {
  tag: params.tag, scene, offset, ack, frames: rows.length,
  oppPx: sum("opp"), pmPx: sum("pm"), restPx: sum("rest"),
  oppFramesDiff: rows.filter((r) => r.opp > 0).length, pmFramesDiff: rows.filter((r) => r.pm > 0).length, restFramesDiff: rows.filter((r) => r.rest > 0).length,
  firstOpp: first("opp"), firstPm: first("pm"), firstRest: first("rest"),
};
writeFileSync(outPath!, JSON.stringify({ summary, rows }));
console.log(JSON.stringify(summary));
if (dumpDir !== null) {
  mkdirSync(dumpDir, { recursive: true });
  for (const [f, d] of Object.entries(dumps)) {
    const png = new PNG({ width: 480, height: 160 });
    for (let y = 0; y < 160; y += 1) {
      for (let x = 0; x < 240; x += 1) {
        for (let k = 0; k < 4; k += 1) {
          png.data[(y * 480 + x) * 4 + k] = d.ours[(y * 240 + x) * 4 + k]!;
          png.data[(y * 480 + 240 + x) * 4 + k] = d.rom[(y * 240 + x) * 4 + k]!;
        }
      }
    }
    writeFileSync(`${dumpDir}/${params.tag}-f${f}.png`, PNG.sync.write(png));
  }
}
