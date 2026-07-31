import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../src/engine/factoryRentalGeneration.ts";
import {
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { GbaButton } from "../src/input.ts";

// Decisive instrument for ISSUES #56 item 2, run verbatim per
// docs/issue56-residual-probe.md Question 2's own "what fact would decide
// it" paragraph: instrument the app-relative frame where the live command
// presentation's lifecycle phase first reads "action-menu" and compare it
// to that doc's own RAM-fitted n0 per species. Same tuples as
// tools/compare/appTrace.ts's generatedBattleStartIntroArbitraryStage /
// generatedBattleStartIntroMagnetonStage — replicated here rather than
// imported since appTrace.ts is a dev-time tool module, not exported API.
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function commandRecord(
  setId: number,
  fixedIv: number = 31,
  exactPersonality?: number,
): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = exactPersonality ?? natureByName.get(set.nature)!;
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

const CHALLENGE0_FIXED_IV = getLevel50InitialRentalFixedIv(0, false);
const CHALLENGE2_FIXED_IV = getLevel50InitialRentalFixedIv(2, false);

function yoshiIntroOrchestrator(): FactoryRoundBattleOrchestratorState {
  const playerRentalRecords = [
    commandRecord(110, CHALLENGE0_FIXED_IV, 2737562574),
    commandRecord(130, CHALLENGE0_FIXED_IV, 3230415900),
    commandRecord(150, CHALLENGE0_FIXED_IV, 391062422),
  ] as const;
  const orchestrator = createFactoryRoundBattleOrchestrator({
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
        commandRecord(115, CHALLENGE0_FIXED_IV),
        commandRecord(135, CHALLENGE0_FIXED_IV),
        commandRecord(145, CHALLENGE0_FIXED_IV),
      ],
    },
  });
  return beginFactoryRoundBattleStartIntro(orchestrator);
}

function magnetonIntroOrchestrator(): FactoryRoundBattleOrchestratorState {
  const playerRentalRecords = [
    commandRecord(267, CHALLENGE2_FIXED_IV, 768061940),
    commandRecord(268, CHALLENGE2_FIXED_IV, 1251336124),
    commandRecord(269, CHALLENGE2_FIXED_IV, 2794049353),
  ] as const;
  const orchestrator = createFactoryRoundBattleOrchestrator({
    id: "factory-arbitrary-intro-magneton-off",
    rngValue: 70,
    factoryWinStreak: 14,
    playerTrainerId: 0x89ab_cdef,
    battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        commandRecord(110),
        commandRecord(130),
        commandRecord(150),
        commandRecord(115),
        commandRecord(135),
        commandRecord(145),
      ],
    },
  });
  return beginFactoryRoundBattleStartIntro(orchestrator);
}

/**
 * Replays app-relative frames 0..maxFrame (frame 0 = the state right after
 * beginFactoryRoundBattleStartIntro, before any tick — same numbering as
 * tools/compare's appTrace.ts/traceReplay.ts and
 * factoryBattleStartIntroAckAlignment.test.ts's own replayThroughAck),
 * pressing A on exactly one chosen tick, and returns the first app-relative
 * frame at which battleCommandPresentation.lifecycle.phase === "action-menu".
 */
function firstActionMenuFrame(
  build: () => FactoryRoundBattleOrchestratorState,
  pressFrame: number,
  maxFrame: number,
): number {
  let orchestrator = build();
  if (orchestrator.battleCommandPresentation?.lifecycle.phase === "action-menu") {
    return 0;
  }
  for (let frame = 1; frame <= maxFrame; frame += 1) {
    const keys: ReadonlySet<GbaButton> = frame === pressFrame ? new Set(["A"]) : new Set();
    orchestrator = advanceFactoryRoundBattleStartIntro(orchestrator, keys);
    if (orchestrator.battleCommandPresentation?.lifecycle.phase === "action-menu") {
      return frame;
    }
  }
  throw new Error(`action-menu phase not reached by frame ${maxFrame}`);
}

// docs/issue56-residual-probe.md Question 2's own RAM-fitted n0 table
// (search over the real menuIdleBounce closed form against a live 64-slot
// gSprites[*].y2 RAM scan, two species, tick-exact fit outside a startup
// edge). Compared against below, NOT re-derived here.
const RAM_FITTED_N0 = { yoshi: 611, magneton: 550 } as const;

describe("ISSUES #56 item 2 decisive instrument: app-relative action-menu handoff frame vs RAM-fitted n0", () => {
  // Faithful A-press frames per factoryBattleStartIntroAckAlignment.test.ts
  // (YOSHI, 370) and the magneton fixture's own compare trace segments
  // (362 idle frames then one A-press frame = app-relative frame 363).
  it("YOSHI (GRIMER lead): action-menu handoff lands at app-relative frame 678, 67 ticks after n0=611", () => {
    const frame = firstActionMenuFrame(yoshiIntroOrchestrator, 370, 750);
    expect(frame).toBe(678);
    expect(frame - RAM_FITTED_N0.yoshi).toBe(67);
  });

  it("MAGNETON (DELCATTY lead): action-menu handoff lands at app-relative frame 689, 139 ticks after n0=550", () => {
    const frame = firstActionMenuFrame(magnetonIntroOrchestrator, 363, 750);
    expect(frame).toBe(689);
    expect(frame - RAM_FITTED_N0.magneton).toBe(139);
  });

  // Decision rule (docs/issue56-residual-probe.md Q2): equal deltas would
  // convict a species-independent constant (e.g. BATTLE_COMMAND_ACTION_
  // ENTER_DELAY); this falsifies that — the deltas differ by 72 ticks, so
  // no single flat constant explains both. No production fix follows from
  // this instrument (see docs/issue56-residual-probe.md's follow-up).
  it("the two species' deltas are NOT equal — falsifies the flat-constant hypothesis", () => {
    const yoshiFrame = firstActionMenuFrame(yoshiIntroOrchestrator, 370, 750);
    const magnetonFrame = firstActionMenuFrame(magnetonIntroOrchestrator, 363, 750);
    const yoshiDelta = yoshiFrame - RAM_FITTED_N0.yoshi;
    const magnetonDelta = magnetonFrame - RAM_FITTED_N0.magneton;
    expect(yoshiDelta).not.toBe(magnetonDelta);
  });
});
