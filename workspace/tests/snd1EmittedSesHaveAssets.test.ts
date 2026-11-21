// snd1 (Kyle's 2026-11-20 live play: Delibird's Ice Ball "sounds really weird"): SE_M_BRICK_BREAK, the Ice Ball impact, had no recording, so the
// player dropped it as `missing` and only the whoosh and the super-effective SE were heard. 53 of the 131 SE ids the move animations emit had no
// recording at all (44 of the 623 SEs of Kyle's session were silent) and 26 emitted pans fell back to a recording panned to the other side.
// Every (id, pan) the move-animation emitter can produce (src/data/gen/anim-sound-timing.json through animSoundPan, both attacker sides) must now
// have a recording of that id within NEAREST_PAN_TOLERANCE pan units (the player's sfxSound picks the nearest pan).
// snd3 (ISSUES #226): the looping ones were the exceptions (SE_M_BLIZZARD 153 had no recording at all, SE_M_GUST 132 only +63, seven centred
// tuples only at +-63); they are recorded now (docs/snd3-pan-recordings.md) and the exception list is gone.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { animSoundPan } from "../src/audio/soundEvents.ts";

const manifest = JSON.parse(readFileSync(new URL("../src/assets/gen/audio/manifest.json", import.meta.url), "utf8")) as {
  sounds: Record<string, { kind: string; id?: number; pan?: number | null; lengthSamples: number; peak: number }>;
};
const timing = JSON.parse(readFileSync(new URL("../src/data/gen/anim-sound-timing.json", import.meta.url), "utf8")) as {
  variants: { op: string; id?: number | null; pan?: number; id2?: number; pan2?: number }[][];
};

/** m4a's pan law is y = 2 * pan (player.ts m4aPanGains): a 2-unit pan difference is a 3% gain difference, the largest fallback accepted. */
const NEAREST_PAN_TOLERANCE = 2;

function emitted(): Map<string, { id: number; pan: number | null }> {
  const out = new Map<string, { id: number; pan: number | null }>();
  const add = (id: number, pan: number | null) => out.set(`se:${id}:${pan ?? "none"}`, { id, pan });
  const sides = [{ attackerSide: "player", targetSide: "opponent" }, { attackerSide: "opponent", targetSide: "player" }] as const;
  for (const variant of timing.variants) {
    for (const op of variant) {
      if (op.id == null) continue;
      if (op.op === "playse") add(op.id, null);
      else for (const side of sides) add(op.id, animSoundPan(op.pan ?? 0, side));
      if (op.id2 != null) for (const side of sides) add(op.id2, animSoundPan(op.pan2 ?? op.pan ?? 0, side));
    }
  }
  return out;
}

const recordedPans = new Map<number, (number | null)[]>();
for (const [key, sound] of Object.entries(manifest.sounds)) {
  if (!key.startsWith("se:")) continue;
  const id = Number(key.split(":")[1]);
  recordedPans.set(id, [...(recordedPans.get(id) ?? []), sound.pan ?? null]);
}

describe("every SE the move animations emit has a recording (no silent `missing`, no opposite-side fallback)", () => {
  const tuples = [...emitted()];

  it("covers the 131 emitted ids", () => {
    expect(new Set([...emitted().values()].map((t) => t.id)).size).toBe(131);
  });

  it("each emitted id has a recording", () => {
    const missing = [...new Set(tuples.filter(([, t]) => !recordedPans.has(t.id)).map(([, t]) => t.id))];
    expect(missing).toEqual([]);
  });

  it("each emission has a recording within the pan tolerance (the exact pan, or a 1-2 unit neighbour; never the opposite side or the centre)", () => {
    const far = tuples
      .filter(([key]) => manifest.sounds[key] === undefined)
      .filter(([, t]) => (recordedPans.get(t.id) ?? []).every((p) => Math.abs((p ?? 0) - (t.pan ?? 0)) > NEAREST_PAN_TOLERANCE))
      .map(([key]) => key);
    expect(far).toEqual([]);
  });

  it("the Blizzard / Gust sweeps start from recordings at their own start pan, as exact loops the player can hold until the next SE preempts them", () => {
    // Cmd_panse / Task_PanFromInitialToTarget sweeps the pan -64 -> 63 at +2 per frame; the start pan comes from the recording, the sweep from `pan` events.
    for (const key of ["se:153:-64", "se:153:63", "se:132:-64", "se:132:63"]) {
      const sound = manifest.sounds[key] as unknown as { loops: boolean; loopStartSamples: number; loopEndSamples: number; lengthSamples: number; seam: { shortMaxAbsDiff: number } };
      expect(sound, key).toBeDefined();
      expect(sound.loops, key).toBe(true);
      expect(sound.loopEndSamples, key).toBe(sound.lengthSamples);
      expect(sound.loopStartSamples, key).toBeGreaterThan(0);
      expect(sound.seam.shortMaxAbsDiff, key).toBeLessThanOrEqual(1);
    }
  });

  it("SE_M_BRICK_BREAK (198), Ice Ball's impact, is recorded on both sides and audible", () => {
    for (const key of ["se:198:-63", "se:198:63"]) {
      expect(manifest.sounds[key], key).toBeDefined();
      expect(manifest.sounds[key]!.lengthSamples).toBeGreaterThan(1000);
      expect(manifest.sounds[key]!.peak).toBeGreaterThan(1000);
    }
  });
});
