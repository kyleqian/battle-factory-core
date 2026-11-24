# ffw1: fast-forward (`setSpeed`)

Kyle, 2026-11-24: "fast forward key, but only apply it to my own ID, like an admin". The website holds a key to run the game
faster for player ids on a server-side list (factory-web: `FAST_FORWARD_PLAYERS`). This library change is the speed control.

## The library

- `FactoryGame.setSpeed(speed)` (`src/factoryContract.ts`, `lib-types/index.d.ts`, `src/lib.ts`): game frames per display
  frame, 1 to 8, rounded. Other values, NaN included, clamp to that range or fall back to 1.
- The loop's frame accumulator gains `(time - last) * speed` per display frame, capped at `8 * speed` frames as the normal
  8-frame cap. Each tick is the same `tickOnce` with the same input sampling, so the ticks, the trace runs and the events
  are the same at any speed. Only the trace's wall-clock `t` (ignored by every replay) and the real time a challenge takes
  are shorter. A host that checks play time against real time must allow it: the website's `too_fast` limit does, for
  listed players only.
- Sound: above 1, nothing reaches the audio player, while the music tracker still follows every event. Going fast calls
  `restore([], frame)`, which silences everything. Coming back to 1 calls `restore(music.events(), frame)`, which brings
  the music to the live frame, as after a resume's fast-forward (aud245b). A resume that ends, or an audio player that
  loads, while fast also restores silence.
- The picture and asset holds (dl3 / dl4) work as before: a hold stops the loop for that display frame at any speed.
- Headless output is unchanged (ENGINE_BUILD unchanged).

## Tests

`tests/ffw1FastForward.test.ts`:
- ticks per display frame at 1, 4 and 8 (clamped);
- the 4 x 8 cap;
- silence while fast, and the BGM at the live loop position after;
- the same trace runs at speed 1 and at mixed speeds up to 8 with the same presses.

`tests/factoryLibrary.test.ts` pins the public handle's keys (now with `setSpeed`).
