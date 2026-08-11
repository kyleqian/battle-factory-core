import { describe, expect, it } from "vitest";
import fixture from "../src/data/gen/battle1-swap-duplicate-species-off.json" with { type: "json" };

type Row = {
  tick: number;
  task: { name: string; state: number } | null;
  swapScreen: { cursorPos: number; monSwapped: number } | null;
  playerSpecies: number[];
  enemySpecies: number[];
  specialVarResult: number;
};

const evidence = fixture as {
  profile: string;
  staging: { tick: number; fromSpecies: number; toSpecies: number; duplicatePlayerSlot: number; changedEnemyBytes: number[] };
  edges: { pickerA: { rejected: number; acceptedFresh: number }; duplicateMessageB: { rejected: number; accepted: number }; returnPickerRight: { rejected: number; acceptedFresh: number } };
  timeline: { duplicateTask: number; messageInputReady: number; pickerInstalled: number };
  rows: Row[];
  invariants: Record<string, boolean>;
};

const row = (tick: number) => evidence.rows.find((entry) => entry.tick === tick)!;

describe("OFF Factory swap duplicate-species evidence", () => {
  it("stages only a non-replaced party duplicate and takes the source rejection task", () => {
    expect(evidence.profile).toBe("battle-scene-off");
    expect(evidence.staging).toMatchObject({ tick: 29935, fromSpecies: 278, toSpecies: 240, duplicatePlayerSlot: 1 });
    expect(evidence.staging.changedEnemyBytes).toEqual([28, 29, 68, 69]);
    expect(row(29935).playerSpecies).toEqual([95, 240, 153]);
    expect(row(29935).enemySpecies).toEqual([240, 198, 17]);
    expect(row(evidence.timeline.duplicateTask).task).toMatchObject({ name: "Swap_TaskCantHaveSameMons", state: 0 });
  });

  it("pins rejected/accepted prompt edges and the rebuilt picker first input", () => {
    expect(row(evidence.edges.pickerA.rejected).task).toMatchObject({ name: "Swap_Task_HandleChooseMons", state: 1 });
    expect(row(evidence.edges.pickerA.acceptedFresh).task).toMatchObject({ name: "Swap_TaskCantHaveSameMons", state: 0 });
    expect(row(evidence.edges.duplicateMessageB.rejected).task).toMatchObject({ name: "Swap_TaskCantHaveSameMons", state: 0 });
    expect(row(evidence.edges.duplicateMessageB.accepted).task).toMatchObject({ name: "Swap_TaskCantHaveSameMons", state: 1 });
    expect(row(evidence.timeline.pickerInstalled).swapScreen?.cursorPos).toBe(0);
    expect(row(evidence.edges.returnPickerRight.acceptedFresh).swapScreen?.cursorPos).toBe(1);
  });

  it("pins no copy/result mutation while returning to the enemy picker", () => {
    expect(evidence.invariants).toEqual({ playerPartyPreserved: true, rentalRecordsPreserved: true, enemyPartyPreservedAfterStaging: true, copySwappedMonDataNotReached: true });
    for (const entry of evidence.rows) {
      expect(entry.playerSpecies).toEqual([95, 240, 153]);
      expect(entry.enemySpecies).toEqual([240, 198, 17]);
      expect(entry.specialVarResult).toBe(1);
      expect(entry.swapScreen?.monSwapped).toBe(0);
    }
  });
});
