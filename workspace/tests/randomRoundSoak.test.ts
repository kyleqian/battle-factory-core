// Tier-1 pin for the random-play soak driver (tools/soak/randomRoundSoak.ts).
//
// Pins the currently-green soak surface: a seeded random player, driving the
// production play path (createInitialState + tick, real button presses only)
// through draft -> prebattle room -> battle room -> generated battle-start
// intro, reaches battle 1's first interactive action menu without any engine
// throw, for a small fixed seed set. Seeds that crash deeper in the round are
// cataloged in docs/soak-crash-catalog.md, NOT pinned here — as of 2026-08-08
// every soaked seed crashes inside battle 1's resolution presentation, so the
// full-round surface cannot be pinned green yet. When those engine defects
// close, extend this pin toward full rounds.

import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { createInitialState, type EngineState } from "../src/engine/core.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

const PIN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createSevenWinLiveState(): EngineState {
  const playerRentalRecords = [
    strongRouteRecord(664),
    strongRouteRecord(678),
    strongRouteRecord(527),
  ] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: "seven-win-live-seam-seed-21",
      rngValue: 21,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [
          ...playerRentalRecords,
          strongRouteRecord(1),
          strongRouteRecord(2),
          strongRouteRecord(3),
        ],
      },
    }),
  );
  return {
    ...createInitialState(),
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.round.rules.rngValue,
  };
}

describe("random round soak driver (green milestone pin)", () => {
  it("reaches battle 1's first action menu crash-free for the pinned seeds", () => {
    for (const seed of PIN_SEEDS) {
      const result = runSeed(seed, {
        maxFrames: 6_000,
        renderEvery: 8,
        stopAtFirstActionMenu: true,
      });
      expect(result, `seed ${seed}: ${result.errorMessage ?? result.hangSurface ?? ""}`)
        .toMatchObject({
          seed,
          outcome: "OK",
          endState: "milestone:first-action-menu",
          battle: 1,
        });
      // The whole draft->intro route runs ~1.4-1.6k frames; a blowout here
      // means the driver lost its way (a driver bug, not an engine bug).
      expect(result.frames).toBeLessThan(4_000);
    }
  });

  it("also reaches the milestone under the vanilla policy", () => {
    const result = runSeed(11, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "vanilla",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed", () => {
    const first = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    const second = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    expect(second.frames).toBe(first.frames);
    expect(second.outcome).toBe(first.outcome);
    expect(second.lastActions).toEqual(first.lastActions);
  });

  it("earns all seven generated wins through the live tick/render and terminal seams", () => {
    const options = {
      maxFrames: 200_000,
      renderEvery: 16,
      testPolicy: "strong-route" as const,
      stateFactory: createSevenWinLiveState,
      collectDiagnostics: true,
    };
    const first = runSeed(21, options);
    const second = runSeed(21, options);

    expect(first).toMatchObject({
      outcome: "OK",
      endState: "roundComplete",
      frames: 56_556,
      battle: 7,
      turn: 11,
      diagnostics: {
        roundPhase: "roundComplete",
        battleIndex: 6,
        lastBattleOutcome: "win",
        opponentGenerationCount: 7,
        battleRngSegmentCount: 7,
        terminalOutcome: "roundWon",
        terminalRecordMenuInputReadyReached: true,
        terminalRecordChoice: "no",
        renderCalls: 4_228,
      },
    });
    expect(second).toEqual(first);
  });

  it("ISSUES #85: keeps the genuine switched-in HP at a later damage-command start", () => {
    // Seed 0 voluntarily switches BUTTERFREE -> BAYLEEF on turn 8, then
    // MURKROW's same-turn FLY drains BAYLEEF 153 -> 66. The parent replayed
    // the settled 66-HP command field as the switch-in's initial display and
    // crashed while committing the preceding hit command at frame 4697.
    const result = runSeed(0, { maxFrames: 4_698, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /battle resolution HP command starts at .* displayed/,
    );
    expect(result.frames).toBeGreaterThan(4_697);
  });

  it("ISSUES #85: resets the display ledger when a healthy active replaces a statused one", () => {
    // Seed 6 reaches Pidgeotto after the previously active opponent carried
    // burn display state. The parent retained that old status across the
    // switch and failed the genuine next-command handoff at frame 6632.
    // The same family formerly recurred after the forced-send-out seam at
    // frame 7797, so keep this focused pin beyond both handoffs.
    const result = runSeed(6, { maxFrames: 7_798, renderEvery: 0 });
    expect(result.errorMessage).not.toBe(
      "resolution handoff battler 1 display does not match the genuine next boundary",
    );
    expect(result.frames).toBeGreaterThan(7_797);
  });

  it("ISSUES #86: commits every typed switch-in in one forced continuation", () => {
    // Seed 45's forced selection resumes through both the player's chosen
    // replacement and the opponent's automatic replacement. The source
    // receipt contains a complete switch transition for each battler; the
    // display ledger must consume both before the forced-send-out handoff.
    const result = runSeed(45, { maxFrames: 6_621, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(6_620);
  });

  it("ISSUES #86: waits for the requested battler's faint message before forced selection", () => {
    // Seed 16's turn has two faint receipts in source order: player QUILAVA
    // KOs opponent PHANPY, the automatic opponent 1 -> 2 switch completes,
    // then sandstorm KOs QUILAVA and requests the player's forced switch.
    // The earlier opponent faint dismissal must not steal the later player's
    // forced-selector handoff and strand the typed opponent switch command.
    const result = runSeed(16, { maxFrames: 28_562, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(28_561);
  });

  it("ISSUES #86: a later faint resets stale forced-switch choice ownership", () => {
    // Seed 14 completes one player forced switch on turn 18. On turn 19 the
    // new active faints; source ChooseMonToSendOut resets monToSwitchIntoId
    // before opening a fresh selector instead of reusing the previous slot.
    const result = runSeed(14, { maxFrames: 9_485, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /switch-in message has no preceding switch\/post-switch field/,
    );
    expect(result.frames).toBeGreaterThan(9_484);
  });

  it("ISSUES #86: presents a forced replacement's terminal sandstorm continuation", () => {
    // Seed 27 battle 4 turn 16 forces MURKROW in at 4 HP. The same genuine
    // reducer receipt then runs sandstorm damage, faints MURKROW, and returns
    // a terminal trainer-win boundary. Completing the send-out animation must
    // resume those queued typed commands rather than demand a player command.
    const result = runSeed(27, { maxFrames: 71_107, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /Slice 3 resolution completed without a player command boundary/,
    );
    expect(result).toMatchObject({ outcome: "OK", endState: "roundLost" });
  });
});
