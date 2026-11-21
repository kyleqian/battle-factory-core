// fch1: the AI's faint replacement choice costs 0 .. 4 extra script frames between FaintedMonTryChoose and FaintedMonSendOutNew (ROM 6 + extra, docs/aud251-s11-scoreboard-refresh.md "fch1").
// Pins: (1) the cost model on the 32 AI choices of ([GetMonData move reads, ROM extra]); (2) the engine's SE_PARTY_STATUS_SUMMARY (114) frame on the fsc2m labs
// (tools/battle-lab/fsc2m-*-off.json, tools/integration/fsc2mLabs.py; ROM frames from the lab probe + sound replay, ROM SE 16 = 252 in every lab; button schedule = the ROM probe's A presses).
import "../src/engine/monPicPixelsInstall.ts";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { aiReplacementChoiceExtraFrames, type BattleAiSwitchIntoWork } from "../src/engine/battleAiSwitchInto.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { applyTraceStage } from "../tools/compare/appTrace.ts";

const work = (moveReads: number): BattleAiSwitchIntoWork => ({ rounds: 0, speciesReads: 0, candidateScores: 0, moveReads, typeCalcs: 0, damageCalcs: 0, fallback: false });
// [moveReads, ROM TryChoose -> SendOut - 6] for the 32 choices (sorted by move reads; moveReads from the engine scorer, extra from the ROM probe)
const CHOICES: Array<[number, number]> = [
  [1, 0], [1, 0], [1, 0], [1, 0], [2, 0], [4, 0], [4, 0], [4, 0], [5, 1], [5, 1], [6, 1], [7, 1], [8, 1], [8, 1], [8, 1], [8, 1],
  [8, 2], [8, 2], [8, 2], [8, 2], [12, 2], [16, 2], [16, 2], [16, 2], [16, 2], [16, 2], [16, 2], [16, 3], [16, 3], [16, 3], [16, 4], [16, 4],
];

describe("AI replacement choice cost model (fch1)", () => {
  it("is within 2 frames of the ROM, exact on most of the 32 choices", () => {
    expect(aiReplacementChoiceExtraFrames(work(0))).toBe(0);
    const errors = CHOICES.map(([reads, rom]) => Math.abs(aiReplacementChoiceExtraFrames(work(reads)) - rom));
    expect(errors.filter((e) => e === 0).length).toBeGreaterThanOrEqual(21);
    expect(errors.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(13);
    expect(Math.max(...errors)).toBeLessThanOrEqual(2);
  });
});

function sePartySummaryFrame(lab: string): number {
  const presses = new Set([1, 2, 21, 22, 288]);
  const stage = { appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: `${lab}.json` } };
  let state: any = applyTraceStage(stage as any, createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" }) as any);
  for (let frame = 1; frame <= 330; frame += 1) {
    const result = collectSoundTick(state.frame + 1, () => tick(state, new Set(presses.has(frame) ? ["A" as const] : [])));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === 114) return e.frame;
  }
  throw new Error(`${lab}: no SE 114`);
}

describe("SE_PARTY_STATUS_SUMMARY after a faint on the fsc2m labs (fch1)", () => {
  // ROM: the base chain 6 (313), a super-effective move on the second candidate 7 (314), the damage fallback 8 (315)
  const ROM: Array<[string, number]> = [
    ["fsc2m-ai-same-se-off", 313], ["fsc2m-n7-rattata-off", 313], ["fsc2m-ai-se-first-off", 314],
    ["fsc2m-ai-nose-normal-off", 315], ["fsc2m-ai-nose-mixed-off", 315], ["fsc2m-ai-four-moves-off", 315],
  ];
  for (const [lab, frame] of ROM) {
    it(`${lab}: frame ${frame}`, { timeout: 120_000 }, () => {
      expect(sePartySummaryFrame(lab)).toBe(frame);
    });
  }
});
