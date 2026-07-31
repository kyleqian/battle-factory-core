// ISSUES #56 item 2: app-side per-tick series for frames 444/536
// (factory-arbitrary-intro-yoshi-off.json), read directly off the running
// engine (not hand-derived), for direct comparison against the OAM RAM
// series read by dump-issue56-frames-444-536-oam.py.
//
// Duplicates the YOSHI stage construction from tools/compare/appTrace.ts
// (that file doesn't export its APP_STAGES registry) and drives the exact
// same trace segments through the real tick()/render() engine functions -
// read-only against src/engine/*, no production file touched.
//
// Run: node --experimental-strip-types tools/probe/analyze-issue56-frames-444-536-app-series.ts

import { readFileSync } from "node:fs";
import { createInitialState, tick, render } from "../../src/engine/core.ts";
import type { EngineState } from "../../src/engine/core.ts";
import { traceAdvances } from "../../tools/compare/traceReplay.ts";
import {
  createFactoryRoundBattleOrchestrator,
  beginFactoryRoundBattleStartIntro,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import battleAnimTables from "../../src/data/gen/battle-anim-tables.json" with { type: "json" };
import {
  ballIcons,
  ballStatusBarPositions,
  generatedBattleIntroSourceClock,
  turn5MaterializeCoeff,
  TURN5_BALL_HANDOFF_TICK,
} from "../../src/engine/battleScene.ts";
import {
  playerSummaryFadeEva,
  playerSummaryIconExitDx,
  playerSummaryBarExitDx,
} from "../../src/engine/battleMenu.ts";

// --- verbatim copy of appTrace.ts's generatedCommandRecord/YOSHI stage ---
const generatedNatureByName = new Map(
  (naturesData as { natures: { name: string; index: number }[] }).natures.map(
    (row) => [row.name, row.index],
  ),
);

function generatedCommandRecord(
  setId: number,
  fixedIv = 31,
  exactPersonality?: number,
): FactoryRentalRecord {
  const set = (frontierMonsData as { entries: Record<number, { nature: string }> }).entries[setId]!;
  const personality = exactPersonality ?? generatedNatureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: 0x89ab_cdef,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

const FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV =
  getLevel50InitialRentalFixedIv(0, false);

function buildYoshiState(): EngineState {
  let state = createInitialState({ appRoute: "generated-orchestrator" });
  const playerRentalRecords = [
    generatedCommandRecord(110, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 2737562574),
    generatedCommandRecord(130, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 3230415900),
    generatedCommandRecord(150, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV, 391062422),
  ] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-arbitrary-intro-yoshi-off",
    rngValue: 42,
    factoryWinStreak: 0,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        generatedCommandRecord(115, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
        generatedCommandRecord(135, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
        generatedCommandRecord(145, FACTORY_LEGAL_CHALLENGE0_INITIAL_RENTAL_FIXED_IV),
      ],
    },
  });
  orchestrator = beginFactoryRoundBattleStartIntro(orchestrator);
  state = {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.battle?.rng.value ?? state.rngValue,
  };
  return state;
}

// --- local replica of drawGeneratedOpponentRelease's materialize formula
// (battleScene.ts:4333-4376/4753-4828) - read-only reproduction for
// analysis, citing the exact constants; not re-exported from the module. ---
const MATERIALIZE_START_OFFSET = 19; // battleScene.ts:4753
const MATERIALIZE_Y2_TABLE: readonly number[] =
  [14, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3, 2]; // battleScene.ts:4828
const affineEmerge = (battleAnimTables as { affineEmerge: { neutralScale: number; steps: { xScale: number; duration: number }[] } }).affineEmerge;

function affineEmergeAccumulator(logicalOffset: number): number {
  let acc = affineEmerge.neutralScale;
  let consumed = 0;
  for (const step of affineEmerge.steps) {
    if (step.duration === 0) {
      acc = step.xScale;
      continue;
    }
    const stepsApplied = Math.min(step.duration, Math.max(0, logicalOffset - consumed));
    acc += step.xScale * stepsApplied;
    consumed += step.duration;
    if (logicalOffset < consumed) break;
  }
  return Math.min(affineEmerge.neutralScale, acc);
}

// Established anchor (docs/trainer-pic-off-window-scout.md §D round 4/5):
// the opponent-release handoff for this fixture lands on app-relative frame
// 412 exactly (oracle abs 1583 = 412 + preCheckpointFrameOffset 1171).
const HANDOFF_FRAME = 412;

function materializeFacts(frame: number): { local: number; coeff: number; accumulator: number; y2: number } | null {
  const elapsed = frame - HANDOFF_FRAME;
  if (elapsed < MATERIALIZE_START_OFFSET) return null;
  const local = elapsed - MATERIALIZE_START_OFFSET;
  const coeff = turn5MaterializeCoeff(TURN5_BALL_HANDOFF_TICK + MATERIALIZE_START_OFFSET + local - 1);
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  return { local, coeff, accumulator, y2 };
}

function rgbAt(rgba: Uint8Array, x: number, y: number): string {
  const o = (y * 240 + x) * 4;
  return `(${rgba[o]},${rgba[o + 1]},${rgba[o + 2]})`;
}

const traceJson = JSON.parse(
  readFileSync(
    new URL("../compare/traces/factory-arbitrary-intro-yoshi-off.json", import.meta.url),
    "utf8",
  ),
) as { segments: { frames: number; buttons?: string[] }[] };

const WINDOW_444 = { start: 429, end: 452 };
const WINDOW_536 = { start: 525, end: 545 };

function inWindow(frame: number): boolean {
  return (frame >= WINDOW_444.start && frame <= WINDOW_444.end)
    || (frame >= WINDOW_536.start && frame <= WINDOW_536.end);
}

let state = buildYoshiState();
console.log("frame,elapsed,t,local,coeff,accumulator,y2,px158_40,px160_40,px155_88,px158_88,px168_88,eva,iconExitDx0,barExitDx,opp144_40,opp160_60");
if (inWindow(0)) logFrame(0);

function logFrame(frame: number): void {
  const intro = state.factoryRoundBattleOrchestrator?.battleStartIntro;
  const elapsed = intro?.elapsed ?? -1;
  const t = generatedBattleIntroSourceClock(elapsed);
  const mf = materializeFacts(frame);
  const rgba = render(state);
  const summaries = intro?.command.partySummaries;
  const icons = ballIcons(t, summaries);
  const playerIcon0 = icons.find((icon) => icon.y === 88);
  const eva = playerSummaryFadeEva(t);
  const iconExitDx0 = playerSummaryIconExitDx(t, 0);
  const barExitDx = playerSummaryBarExitDx(t);
  const bars = ballStatusBarPositions(t);
  console.log([
    frame,
    elapsed,
    t,
    mf ? mf.local : "",
    mf ? mf.coeff : "",
    mf ? mf.accumulator : "",
    mf ? mf.y2 : "",
    rgbAt(rgba, 158, 40),
    rgbAt(rgba, 160, 40),
    rgbAt(rgba, 155, 88),
    rgbAt(rgba, 158, 88),
    rgbAt(rgba, 168, 88),
    eva,
    iconExitDx0,
    barExitDx,
    playerIcon0 ? playerIcon0.x : "",
    bars.player.x,
  ].join(","));
}

for (const advance of traceAdvances(traceJson.segments)) {
  state = tick(state, advance.buttons);
  if (inWindow(advance.frame)) logFrame(advance.frame);
  if (advance.frame > WINDOW_536.end) break;
}
