# Silver dense flicker/circle-transition ground truth (2026-08-17, side lane)

Silver analog of `docs/noland-brain-intro-gold-ground-truth.md` §8″. New
files only — no `src/` edits (the re-basing fix this evidence unblocks is a
main-lane step).

## Method (same as gold §8″)

Sample a fixed black background pixel, `(2,2)`, per stride-1 oracle frame
and invert the shared `blendComponentToGray` formula
(`faded5 = c5 + ((11-c5)*y)>>4`, `GRAY_TARGET5=11`). For a pure-black pixel
(`c5=0`) `y -> faded5 -> component8` is injective over `grayFlickerY`'s own
even-only `y` range:

| y | 0 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| component8 | 0 | 8 | 16 | 33 | 41 | 49 | 66 | 74 | 90 |

Every one of the 106 sampled pixels landed exactly on one of these 9 values
(no interpolation needed), confirming the same inversion gold used applies
unchanged to silver.

## New fixtures

- `tools/battle-lab/factory-brain-silver-walkup-speech-flicker-off.json` —
  stride-1 `preCheckpointCaptureFrames` for abs frames 3195–3300 (106
  frames), same `mode`/`challengeNum 2`/`playerSetIds [267,268,269]`/`seed
  305419896` as the committed silver scenarios 11/12. Re-ran twice fresh
  (`bin/oracle lab ... -o /tmp/a --quiet` / `-o /tmp/b --quiet`,
  `diff -rq`) — byte-identical both times.
- `tools/compare/traces/factory-brain-silver-walkup-speech-flicker-off.json`
  — parked via the existing `factory-round-battle7-noland-silver-speech-
  close-pause-off` app stage (the committed close-pause fixture's own park
  stage, `generatedRoundBattle7NolandSilverSpeechClosePauseStage`, `phase:
  "brainSpeechSettled", elapsed: 0`), extended from that fixture's 28-frame
  window to `preCheckpointFrameOffset: 3201`, `captureWindow 0-99` (100
  frames, abs 3201–3300) — a strict superset of the committed 28-frame
  close-pause window, same offset, so the already-passing 28/28 guard's own
  frame-0 alignment (`elapsed=k` <-> `abs 3201+k`) is reused, not re-derived
  blind.

`npm run compare -- factory-brain-silver-walkup-speech-flicker-off.json
--summary` → **32/100 frames matched** (frames 0–27 exact — the pause,
matching the existing close-pause guard — then mismatches starting exactly
at frame 28, with a handful of coincidental phase-crossing matches during
the flicker, the same shape §8′ describes for gold's pre-fix state). Not a
failure — the expected, honest result: silver's current re-basing
(`te = b.elapsed - BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED`, no further
correction) predicts flicker starting 28 ticks later than the oracle's real
onset, so app frame 28 (still flat under the current formula) diverges from
oracle frame 3229 (already flickering).

## Banked coefficient table

Abs frame → elapsed (`= abs − 3201`, the close-pause stage's own clock) →
sampled `y`:

| Abs range | Elapsed range | `y` |
| --- | --- | --- |
| 3195–3228 | −6–27 | flat 0 (pause tail + full 28-frame pause) |
| 3229–3244 | 28–43 | 2,4,6,8,10,12,14,16,14,12,10,8,6,4,2,0 (cycle 1) |
| 3245–3260 | 44–59 | same 16-tick triangle (cycle 2) |
| 3261–3276 | 60–75 | same 16-tick triangle (cycle 3) |
| 3277–3300 | 76–99 | flat 0 (flicker over; no circle-sprite pixel reaches pixel (2,2) in this window) |

This is `grayFlickerY`'s own triangle shape exactly (3 full 16-tick cycles,
`FLICKER_END_TE(76) − FLICKER_START_TE(28) = 48 = 3×16`) — **starting at
elapsed 28, ending at elapsed 75** (i.e. `y = grayFlickerY(te)` with
`te = elapsed` directly, no offset at all).

## Verdicts (item 3)

**(a) Silver's true flicker-onset abs frame: 3229.** Immediately follows
the pause's last flat frame (3228, matching both the already-committed
`BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED=28` pause length and
`docs/noland-silver-walkup-presentation-map.md`'s own §3 sha citation for
frame 3229, `ce3e94fa…`, now independently confirmed by direct pixel
inversion rather than sha lookup alone). In the close-pause stage's own
clock, elapsed 28.

**(b) The te offset that registers the app's waveform onto the oracle's.**
Silver does **not** decompose the same way as gold's `MSGBOX_CLOSE_TICKS +
frontierTransitionFlickerStartTe` correction. The banked table shows
`y = grayFlickerY(te)` matches exactly when `te = b.elapsed` **with no
subtraction and no addition at all** — i.e. the correction needed is to
*remove* the current `- brainSpeechSceneHandoffElapsed(b)` term for silver
entirely (equivalently: add back `+BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED` (28)
to cancel it), the same "no re-basing" rule §8″'s own control step already
confirmed for the ordinary non-brain "settled" path (`b.elapsed` fed
directly as `te`). This is numerically 28 — the same value as
`FLICKER_START_TE` — but that equality is silver's own pause length
coincidentally matching the shared constant (already flagged in §8′/§8″),
**not** evidence that silver needs `MSGBOX_CLOSE_TICKS(4) + FLICKER_START_TE
(28) = 32` applied against its own handoff(28) the way gold's `te =
b.elapsed + 6` was derived. Applying that gold-shaped `+6`-style structural
form to silver (i.e. `te = b.elapsed - 28 + 32 = b.elapsed + 4`) is exactly
the tier-general attempt §8″ already reports regressing the close-pause
guard 28→24/28 (flicker starting 4 ticks early, at elapsed 24 instead of
28) — this step's dense data explains *why* that regressed: silver's real
dismiss-to-`elapsed=0` alignment has no equivalent `MSGBOX_CLOSE_TICKS`-
shaped gap to compensate for at this measurement (the close-pause stage's
`elapsed=0` already lines up 1:1 with real oracle frames, per the
already-passing 28/28 guard), so adding gold's `MSGBOX_CLOSE_TICKS` term on
top over-corrects. The raw measured offset is: **`te = b.elapsed`,
correction term `+28` relative to the current code's subtraction** (not a
`MSGBOX_CLOSE_TICKS`-shaped decomposition).

**(c) Circle-sprite onset vs gold's frames 113–125 late-onset residual: NOT
the same shape, and not fully resolved either.** Row-159 (bottom row, the
faster-converging left/right circle sprites per `CIRCLE_SPECS`, same probe
gold's own residual analysis used) first shows non-background pixels at
**abs 3281** (elapsed/te 80 under the `te=b.elapsed` hypothesis above) —
only 2 ticks after `CIRCLE_ANCHOR_TE=78`, i.e. close to on-time, not a large
late-onset gap like gold's. Row-0 (top row) shows **zero** circle-sprite
pixels through the end of this capture window (abs 3300, te 99) — silver's
top-sprite onset was not observed inside this window, so whether it shows a
gold-like residual is **not resolved** here (would need a wider capture
past te 99 to find it); this step does not extend further to avoid
overrunning its time budget. Net: the one circle onset silver's window does
resolve (bottom/left-right) tracks the shared `CIRCLE_ANCHOR_TE` constant
closely under the `te=b.elapsed` correction, unlike gold's confirmed-late
bottom-row residual — but this is a partial, not a full, answer to (c).

## Guard reruns (fresh, this step)

| Trace | Result |
| --- | --- |
| `factory-brain-silver-walkup-speech-close-pause-off.json` | 28/28 |
| `factory-brain-silver-walkup-speech-cry-held-off.json` | 74/74 |
| `factory-brain-gold-walkup-speech-close-off.json` | 113/126 |
| `factory-brain-silver-walkup-entrance-03-off.json` | 256/256 |

All unmoved by this step (new files only, no `src/` edits).
