// snd1 (Kyle's 2026-11-20 live play: Delibird's Ice Ball "sounds really weird"): SE_M_BRICK_BREAK, the Ice Ball impact, had no recording, so the
// player dropped it as `missing` and only the whoosh and the super-effective SE were heard. 53 of the 131 SE ids the move animations emit had no
// recording at all (44 of the 623 SEs of Kyle's session were silent) and 26 emitted pans fell back to a recording panned to the other side.
// Every (id, pan) the move-animation emitter can produce (src/data/gen/anim-sound-timing.json through animSoundPan, both attacker sides) must now
// have a recording of that id on the same side (the player's sfxSound picks the nearest pan), apart from the listed looping exceptions.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { animSoundPan } from "../src/audio/soundEvents.ts";

const manifest = JSON.parse(readFileSync(new URL("../src/assets/gen/audio/manifest.json", import.meta.url), "utf8")) as {
  sounds: Record<string, { kind: string; id?: number; pan?: number | null; lengthSamples: number; peak: number }>;
};
const timing = JSON.parse(readFileSync(new URL("../src/data/gen/anim-sound-timing.json", import.meta.url), "utf8")) as {
  variants: { op: string; id?: number | null; pan?: number; id2?: number; pan2?: number }[][];
};

/** Looping recordings the one-shot recorder caps (25 s): they need the aud244b loop-point pass, not done here (docs/snd1-playtest-sounds.md). */
const LOOP_EXCEPTIONS = new Set(["se:153:-64", "se:153:63", "se:132:-64", "se:132:-63"]);

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
  const tuples = [...emitted()].filter(([key]) => !LOOP_EXCEPTIONS.has(key));

  it("covers the 131 emitted ids", () => {
    expect(new Set([...emitted().values()].map((t) => t.id)).size).toBe(131);
  });

  it("each emitted id has a recording", () => {
    const missing = [...new Set(tuples.filter(([, t]) => !recordedPans.has(t.id)).map(([, t]) => t.id))];
    expect(missing).toEqual([]);
  });

  it("each side-panned emission has a recording on its own side (or the exact pan)", () => {
    const wrongSide = tuples
      .filter(([key, t]) => manifest.sounds[key] === undefined && t.pan !== null && t.pan !== 0)
      .filter(([, t]) => (recordedPans.get(t.id) ?? []).every((p) => p === null || p === 0 || p * t.pan! < 0))
      .map(([key]) => key);
    expect(wrongSide).toEqual([]);
  });

  it("SE_M_BRICK_BREAK (198), Ice Ball's impact, is recorded on both sides and audible", () => {
    for (const key of ["se:198:-63", "se:198:63"]) {
      expect(manifest.sounds[key], key).toBeDefined();
      expect(manifest.sounds[key]!.lengthSamples).toBeGreaterThan(1000);
      expect(manifest.sounds[key]!.peak).toBeGreaterThan(1000);
    }
  });
});
