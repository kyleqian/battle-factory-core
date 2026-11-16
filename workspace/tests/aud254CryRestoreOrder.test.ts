// aud254 (cry4 seed 71 ON): a cry that starts on the frame the previous cry's restore task would fire supersedes the restore. The main loop runs callback1 (the battle controllers, PlayCry_ByMode
// -> counter = 2, reference/pokeemerald/src/sound.c RestoreBGMVolumeAfterPokemonCry) before callback2 (RunTasks -> Task_DuckBGMForPokemonCry), so the task sees counter != 0 and does not restore.
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { CRY_FAINT_FRAMES } from "../src/data/cryModeFrames.ts";
import { beginScreenSoundTick, BGM_BATTLE, playFaintCry, runScheduledScreenSounds, scheduleAfter } from "../src/engine/screenSounds.ts";

const run = (nextCryDelay: number): SoundEvent[] => {
  const events: SoundEvent[] = [];
  for (let frame = 1; frame <= 200; frame += 1) {
    events.push(...collectSoundTick(frame, () => {
      beginScreenSoundTick(frame);
      if (frame === 1) {
        playFaintCry(BGM_BATTLE, 65, 25);
        scheduleAfter(nextCryDelay, () => playFaintCry(BGM_BATTLE, 31, -25));
      }
      runScheduledScreenSounds();
    }).events);
  }
  return events;
};

describe("aud254 restore vs next cry on the same frame", () => {
  const restore = CRY_FAINT_FRAMES[65]! + 1;
  it("the next cry's duck stands and the old restore does not fire", () => {
    const ducks = run(restore).filter((e) => e.kind === "duck").map((e) => [e.frame, (e as { volume?: number }).volume]);
    expect(ducks.filter(([frame]) => frame === 1 + restore)).toEqual([[1 + restore, 85]]);
    expect(ducks.filter(([, volume]) => volume === 256).map(([frame]) => frame)).toEqual([1 + restore + CRY_FAINT_FRAMES[31]! + 1]);
  });
  it("one frame later the restore has already fired (restore, then duck)", () => {
    const ducks = run(restore + 1).filter((e) => e.kind === "duck").map((e) => [e.frame, (e as { volume?: number }).volume]);
    expect(ducks.slice(0, 3)).toEqual([[1, 85], [1 + restore, 256], [2 + restore, 85]]);
  });
});
