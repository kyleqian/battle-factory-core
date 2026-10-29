// bso226 (docs/bso226-battle-start-intro-send-outs.md): the production battle-start intro (generated-orchestrator route) vs a Scene ON
// ROM battle-lab run (pre-checkpoint frames), per-frame / per-region residual.
//   node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts <params.json> <rom-dir> <out.json>
//     [--scene=on|off] [--offset=N] [--ack=N] [--end=N] [--dump=f,f,..] [--dump-dir=DIR]
// params.json: { tag, rngValue, factoryWinStreak, playerSetIds:[3], playerPersonalities:[3], benchSetIds:[3] }.
// `--scene=off` renders the pre-bso226 route (the Scene OFF intro renderer) against the same ROM frames = the "before" column.
// Regions: opp = opponent mon (x >= 120, y < 64); pm = player mon / trainer (x < 120, 48 <= y < 112); rest = everything else.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import { createInitialState, render, tick } from "../../src/engine/core.ts";
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
const offset = Number(opt("offset", "1171"));
const ack = Number(opt("ack", "369"));
const end = Number(opt("end", "750"));
const dump = (opt("dump", "") ?? "").split(",").filter((s) => s !== "").map(Number);
const dumpDir = opt("dump-dir", null);

const params = JSON.parse(readFileSync(paramsPath!, "utf8")) as {
  tag: string; rngValue: number; factoryWinStreak: number; playerSetIds: number[]; playerPersonalities: number[]; benchSetIds: number[];
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
  const playerRentalRecords = params.playerSetIds.map((id, i) => record(id, fixedIv, params.playerPersonalities[i])) as unknown as readonly [FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord];
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

function readRom(frame: number): Uint8Array {
  const file = `${romDir}/pre-checkpoint-frame-${String(frame + offset).padStart(5, "0")}.png`;
  return PNG.sync.read(readFileSync(file)).data;
}

type Region = "opp" | "pm" | "rest";
const regionOf = (x: number, y: number): Region =>
  x >= 120 && y < 64 ? "opp" : x < 120 && y >= 48 && y < 112 ? "pm" : "rest";

let state = stageIntro(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
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
