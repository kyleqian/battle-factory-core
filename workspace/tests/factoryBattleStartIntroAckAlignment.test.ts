import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { renderGeneratedBattleStartPreSendOut } from "../src/engine/battleScene.ts";
import type { GbaButton } from "../src/input.ts";

// Same tuple as tools/compare/traces/factory-arbitrary-intro-yoshi-off.json /
// appTrace.ts's generatedBattleStartIntroArbitraryStage (docs/trainer-pic-
// off-window-scout.md §D): trainerId 49 (YOSHI, BUG CATCHER), opponent
// COMBUSKEN/POLIWHIRL/PORYGON.
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function generatedCommandRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: 0x89ab_cdef,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function yoshiIntroOrchestrator(): FactoryRoundBattleOrchestratorState {
  const playerRentalRecords = [
    generatedCommandRecord(110),
    generatedCommandRecord(130),
    generatedCommandRecord(150),
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
        generatedCommandRecord(115),
        generatedCommandRecord(135),
        generatedCommandRecord(145),
      ],
    },
  });
  return beginFactoryRoundBattleStartIntro(orchestrator);
}

function renderIntro(orchestrator: FactoryRoundBattleOrchestratorState): Uint8Array {
  const fb = new Uint8Array(240 * 160 * 4);
  renderGeneratedBattleStartPreSendOut(fb, orchestrator.battleStartIntro!);
  return fb;
}

function framesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Replays app-relative frames 0..maxFrame (frame 0 = the render right after
 * beginFactoryRoundBattleStartIntro, before any tick — the same numbering
 * tools/compare's appTrace.ts/traceReplay.ts use), pressing A on exactly one
 * chosen tick.
 */
function replayThroughAck(pressFrame: number, maxFrame: number): Uint8Array[] {
  let orchestrator = yoshiIntroOrchestrator();
  const frames: Uint8Array[] = [renderIntro(orchestrator)];
  for (let frame = 1; frame <= maxFrame; frame += 1) {
    const keys: ReadonlySet<GbaButton> = frame === pressFrame ? new Set(["A"]) : new Set();
    orchestrator = advanceFactoryRoundBattleStartIntro(orchestrator, keys);
    frames[frame] = renderIntro(orchestrator);
  }
  return frames;
}

describe("generated Factory intro: A-press-to-message-switch alignment (YOSHI arbitrary fixture)", () => {
  // docs/trainer-pic-off-window-scout.md §D: the oracle's own auto-ack route
  // clears the "would like to battle!" box and starts the barely-printed
  // "sent out COMBUSKEN!" message at exactly absolute frame 1545, with a
  // stable (pixel-static) 1541..1544 plateau just before it. The fixture's
  // own preCheckpointFrameOffset is 1171, so the source-faithful app-relative
  // switch frame is 1545-1171 = 374, and the ROM's own accepted-edge frame
  // is 1541-1171 = 370 — not 374 or 379 (both tried and rejected in the
  // prior slice; both land the edge too late).
  const FAITHFUL_PRESS_FRAME = 370;
  const SWITCH_FRAME = 374;

  it("freezes elapsed for exactly one tick on the accepted A edge (orchestrator-level ack stall)", () => {
    let orchestrator = yoshiIntroOrchestrator();
    for (let frame = 1; frame < FAITHFUL_PRESS_FRAME; frame += 1) {
      orchestrator = advanceFactoryRoundBattleStartIntro(orchestrator, new Set());
    }
    const preElapsed = orchestrator.battleStartIntro!.elapsed;
    orchestrator = advanceFactoryRoundBattleStartIntro(orchestrator, new Set(["A"]));
    // advanceFactoryRoundBattleStartIntro's own comment: the source
    // PAUSE_UNTIL_PRESS callback accepts the edge one callback before its
    // presentation task's clock advances, so the orchestrator holds elapsed
    // at its pre-tick value on this one frame instead of incrementing it.
    expect(orchestrator.battleStartIntro!.acknowledgedElapsed).toBe(preElapsed);
    expect(orchestrator.battleStartIntro!.elapsed).toBe(preElapsed);
  });

  it("pressing A only latches internal state — rendering through frame 373 is identical regardless of the exact (late-enough) press frame", () => {
    const pressedAt370 = replayThroughAck(FAITHFUL_PRESS_FRAME, SWITCH_FRAME);
    const pressedAt374 = replayThroughAck(374, SWITCH_FRAME);
    for (let frame = 0; frame < SWITCH_FRAME; frame += 1) {
      expect(framesEqual(pressedAt374[frame]!, pressedAt370[frame]!)).toBe(true);
    }
  });

  it("only the faithful press frame (370) lands the message-box switch on app-relative frame 374", () => {
    const faithful = replayThroughAck(FAITHFUL_PRESS_FRAME, SWITCH_FRAME);
    expect(framesEqual(faithful[SWITCH_FRAME]!, faithful[SWITCH_FRAME - 1]!)).toBe(false);

    // The two offsets tried (and rejected) in the prior slice both land the
    // ROM's accepted edge too late, so frame 374 hasn't switched yet.
    for (const rejectedPressFrame of [374, 379]) {
      const rejected = replayThroughAck(rejectedPressFrame, SWITCH_FRAME);
      expect(framesEqual(rejected[SWITCH_FRAME]!, rejected[SWITCH_FRAME - 1]!)).toBe(true);
    }
  });
});
