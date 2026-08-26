import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eruptionAudioAtAge, eruptionAudioPlayAges, eruptionTargetPan } from "../../src/animation/eruptionAudio.ts";

const profile = { commandAge: 10, endAge: 246, taskSlot: 2, attackerSide: "player", targetSide: "opponent" } as const;

describe("MOVE_ERUPTION loopsewithpan audio component", () => {
  it("ports the source command, task cadence, twelve starts, panning, and cleanup", () => {
    expect(eruptionAudioAtAge(9, profile)).toMatchObject({ owned: false, source: null, task: null, soundTaskCount: 0, audio: null });
    expect(eruptionAudioAtAge(10, profile)).toMatchObject({
      source: { offset: 187, pointer: 0x082c_e3c6, pointerParity: 0, args: [131, "SOUND_PAN_TARGET", 16, 12] },
      task: { slot: 2, priority: 254, sourcePriority: 1, callback: "Task_LoopAndPlaySE", data: [131, 63, 16, 11, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
      soundTaskCount: 1,
      audio: { song: "se_m_rock_throw", pan: 63, playIndex: 0, startThisRow: true, status: 0, trackFlags: 131, active: true },
    });
    expect(eruptionAudioAtAge(26, profile).task?.data).toEqual([131, 63, 16, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(eruptionAudioPlayAges(10)).toEqual([10, 26, 43, 60, 77, 94, 111, 128, 145, 162, 179, 196]);
    expect(eruptionAudioAtAge(196, profile)).toMatchObject({ task: null, soundTaskCount: 0, audio: { playIndex: 11, startThisRow: true, active: true } });
    expect(eruptionAudioAtAge(245, profile).audio).toMatchObject({ status: 1, trackFlags: 0, active: true });
    expect(eruptionAudioAtAge(246, profile).audio).toMatchObject({ status: 0x8000_0000, trackFlags: 0, active: false, firstInactive: true });
    expect(eruptionTargetPan({ ...profile, attackerSide: "opponent", targetSide: "player" })).toBe(-63);
    expect(eruptionTargetPan({ ...profile, attackerStatusAnimationActive: true })).toBe(-63);
  });

  it("strictly audits every retained bilateral source/task/audio/gameplay row", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/eruptionAudioAudit.ts"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
    expect(audit).toMatchObject({
      schema: "eruption-loopsewithpan-audio-audit/v1",
      component: "audio:loopsewithpan-SE_M_ROCK_THROW-target-16-12",
      move: "MOVE_ERUPTION", oracleProfile: "battle-scene-on", coverageCredit: false,
      ownership: { loopSeWithPanOnly: true, explosion: false, launchRocks: false, fallingRocks: false, horizontalShake: false, palette: false, typedSeam: false, compositor: false, framebuffer: false, gameplay: false, rng: false, controller: false },
      sides: {
        "player-back": { command: { age: 239 }, panning: { adjustedPan: 63 }, task: { firstAge: 239, lastAge: 424, rows: 186, cleanupAge: 425 }, audio: { starts: [239,255,272,289,306,323,340,357,374,391,408,425], finalActiveAge: 474, firstInactiveAge: 475 }, checked: { rows: 476, taskRows: 186, audioRows: 237, passThroughRows: 239, gameplayRows: 476 } },
        "opponent-front": { command: { age: 257 }, panning: { adjustedPan: -63 }, task: { firstAge: 257, lastAge: 442, rows: 186, cleanupAge: 443 }, audio: { starts: [257,273,290,307,324,341,358,375,392,409,426,443], finalActiveAge: 492, firstInactiveAge: 493 }, checked: { rows: 494, taskRows: 186, audioRows: 237, passThroughRows: 257, gameplayRows: 494 } },
      },
    });
  });

  it("keeps Eruption unsupported and the component track unfulfilled", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ERUPTION")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "eruption-warm-rock")).toMatchObject({ fulfilled: false });
  });
});
