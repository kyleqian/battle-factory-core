# Gold LAST-BOX -> CLOSE-BOX transition: dense edge evidence (2026-08-17, side lane)

A read-only audit this round found the real-close edge (box3, "page 4" of
the gold personality speech, accepting into the close box "All right! Bring
it on!" via `brainSpeechClosing`) unfixtured in both tiers:
`factory-brain-gold-walkup-speech-close-off.json` parks **already inside**
the close box (`generatedRoundBattle7NolandGoldSpeechCloseHeldStage`,
`speechStep = GOLD_FIRST_ENCOUNTER_SPEECH_BOXES.length - 1`) and never
drives the box3->box4 transition itself, so `src/engine/battleRoom.ts`'s
comment citing that guard as confirmation for `speechAcceptedFast: false`
on this edge (line ~386) was never actually oracle-tested at the frame
that matters. This step banks that missing dense fixture and lets pixels
answer the question directly.

## 1. True onset derivation (§9″ instrumentation technique)

Instrumented the already-verified-exact (177/177)
`factory-brain-gold-walkup-speech-pages-off.json` trace by stepping
`createInitialState`/`tick` through its own segments (park stage
`factory-round-battle7-noland-gold-speech-box0-held-off`, then its own
6/1/586/1/133/1/127-frame segment schedule) and logging
`battleRoom.phase`/`speechStep`/`elapsed` every tick. `battleRoom` first
reaches `phase: "brainSpeechIdle", speechStep: 3, elapsed: 0` (box3, "page
4", true onset) at that trace's own local tick **776**. That trace's
`preCheckpointFrameOffset` is 1535, so true onset = 1535 + 776 = abs oracle
frame **2311** — this independently reproduces `docs/noland-brain-intro-
gold-ground-truth.md` §7′'s own citation of abs frame 2311 as the first
frame of "Page 4 settled, held" (`ab880d96dcf4c641`), confirming the
derivation two ways at once.

`generatedRoundBattle7NolandGoldSpeechPage4HeldStage`
(`tools/compare/factoryRoundIntroGeneralizationStage.ts`) already parks
`battleRoom` at exactly this state with its default `elapsed = 0` — no new
stage or wrapper was needed. Box3 is elapsed-invariant to render: it is the
*last* personality page, so `brainSpeechCursorVisible`'s own gate
(`speechStep < brainSpeechPersonalityBoxCount(state) - 1`, i.e. `3 < 3`)
is false — no wait-cursor ever shows on this box, matching a direct
oracle probe (`bin/oracle lab` on a scratch copy of the pages scenario with
`preCheckpointCaptureFrames` covering 2305-2430) which found box3's hold
is a **single constant sha (`ab880d96dcf4c641`) for all 87 frames from
abs 2311 through abs 2397** — completely static, no cycling, no bob. Since
the render is identical at every point in that hold, the new fixture below
anchors its `preCheckpointFrameOffset` at abs **2397** (the last held
frame, immediately adjacent to the real transition) rather than the full
onset 2311 — pixel-equivalent, and keeps the dense capture window tight
per the step brief's ~50-80 frame guidance instead of re-capturing 87
redundant static frames.

## 2. Oracle probe: exact transition frames (bin/oracle lab, captureFrames)

A scratch battle-lab scenario (same seed/params as
`factory-brain-gold-speech-pages-off.json`, `preCheckpointCaptureFrames`
swapped to a stride-1 range 2305-2430) run via `bin/oracle lab` gave the
per-frame sha sequence directly:

| Abs frame | sha256 (12) | Content (direct PNG check) |
| --- | --- | --- |
| 2311-2397 | `ab880d96dcf4` (constant) | Box3 held: "Now, this should be fun! I'm getting excited, hey!" |
| **2398** | `1081d8ac48d9` | **Box border visible, 0 characters** — the cleared tick |
| 2399 | `b40a8a91c51f` | "A" (1 char) |
| 2400 | `0d86b03cb31b` | "Al" |
| 2401 | `d032930f6298` | "All" |
| 2402 | `d032930f6298` (repeat) | "All" (punctuation/cadence hold, same char count) |
| 2403-2419 | unique per frame (with two more single-tick repeats at 2413/2414 and 2416/2417) | typewriter continues to "All right! Bring it on!" |
| 2420-2430 | `f0d9bf0629eb` (constant) | Close box fully printed, held — same sha `factory-brain-gold-walkup-speech-close-off.json` already cites for its own 2495-2530 hold tail |

**This directly answers the deliverable's core question:** yes, the oracle
shows exactly **one** cleared-box frame (abs **2398** — box border drawn,
zero characters) between box3's last held frame (abs **2397**) and the
close box's first printed character (abs **2399**, "A") — a single-tick
resolution, unambiguous, PNG-verified (not just sha-inferred).

## 3. New fixture and compare result

- `tools/battle-lab/factory-brain-gold-speech-close-edge-off.json` — same
  `mode`/`seed`/`playerSetIds`/`challengeNum`/`trace` as the already-committed
  pages/close scenarios (a pure fixed recording per §9‴, independent of any
  comparison trace's own press timing), `preCheckpointCaptureFrames` =
  stride-1 `[2397..2450]` (54 frames: the last held tick, the full close-box
  print span, and the settle + ~15 hold frames beyond it).
- `tools/compare/traces/factory-brain-gold-walkup-speech-close-edge-off.json`
  — app stage `factory-round-battle7-noland-gold-speech-page4-held-off`
  (box3 held, `elapsed: 0`, true onset per §1 above), `preCheckpointFrameOffset:
  2397`, segments `[1 frame A][52 frames idle]`, `captureWindow: {0, 53}`.

```
npm run compare -- tools/compare/traces/factory-brain-gold-walkup-speech-close-edge-off.json --summary
```

**Result: 28/54 frames matched — NOT exact.** Local frame 0 (abs 2397,
park) matches trivially. Local frames 1-26 (abs 2398-2423) all mismatch;
local frames 27-53 (abs 2424-2450) all match once both sides reach the
same fully-printed, settled close box.

## 4. Frame-level verdict: which model, and why it's neither cleanly

The oracle's cleared-tick-then-print **shape** (§2 above) matches
"hypothesis (i)", the slow clear-then-print model the current code already
intends (`speechAcceptedFast: false` at the real-close branch,
`battleRoom.ts` line 386) — a real cleared tick does exist, just as it does
at the window's first `\p` transition (§9‴/§9⁗). But the code's actual
*mechanism* for reaching that state on this specific edge is a different,
falsified claim, confirmed by direct PNG diff (`tools/compare/out/<run>/
app-000NN.png` vs `oracle-000NN.png` for local frames 1-6):

| Local frame | Abs frame | Oracle shows | App shows | Match? |
| --- | --- | --- | --- | --- |
| 0 | 2397 | Box3 held (park) | Box3 held (park) | yes |
| 1 | 2398 | Box **border visible**, 0 chars (the cleared tick) | Box **fully absent** — `MSGBOX_HIDDEN` (`brainSpeechClosing`, `elapsed: 0`) | **no** |
| 2 | 2399 | "A" | Box absent (`brainSpeechClosing`, `elapsed: 1`) | no |
| 3 | 2400 | "Al" | Box absent (`elapsed: 2`) | no |
| 4 | 2401 | "All" | Box absent (`elapsed: 3`) | no |
| 5 | 2402 | "All" | Box border visible, 0 chars — **only now** enters `brainSpeech`/close-box `elapsed: 0` | no |
| 6 | 2403 | continuing print | "A" (first char, its own `elapsed: 1`) | no (4-tick lag) |
| 27 | 2424 | settled, full text | settled, full text (caught up) | yes |

The app inserts the generic `MSGBOX_CLOSE_TICKS = 4` "real close" phase
(`brainSpeechClosing`, rendered as `MSGBOX_HIDDEN` — the box vanishes
*entirely*, no border) before landing on its own single bordered-empty
tick and starting to print. The oracle never hides the box at all: it
shows the border continuously, empty for exactly one tick, then printing
starts immediately. The net effect is a constant **4-tick delay** in the
app's print start (first character at local frame 6 vs. oracle's local
frame 2) plus a wrong intermediate visual (box absent vs. box bordered)
for those 4 ticks — not a one-tick model mismatch but a distinct,
larger defect in how the real close+reopen is modeled for this edge only.
Both sides converge once the app's own print (started 4 ticks late)
finishes catching up to the same final settled text, which is why the
residual is confined to local frames 1-26 and everything from 27 onward is
exact.

**Conclusion:** the doc comment's claim that
`factory-brain-gold-walkup-speech-close-off.json` "confirms" the slow
model for this branch was correct about the model's *shape* (a cleared
tick exists) by coincidence, but wrong that the guard fixture had ever
tested it — this fixture is the first to actually drive the transition,
and it falsifies the current `brainSpeechClosing`/`MSGBOX_CLOSE_TICKS`
mechanism as this edge's real implementation. Per the step's own
constraints this is documented, not fixed — the `MSGBOX_HIDDEN` `"brainSpeechClosing"`
case and/or the `speechAcceptedFast: false` assignment at `battleRoom.ts`
line 386 are the concrete edit sites for whoever picks this up (likely:
render `brainSpeechClosing` as a bordered `chars: 0` box instead of hidden,
and/or collapse the close+reopen to skip the 4-tick `MSGBOX_CLOSE_TICKS`
wait for this specific real-close edge — needs its own derivation, not
guessed here).

## 5. Guard reruns (fresh, this worktree)

| Fixture | Result |
| --- | --- |
| `factory-brain-gold-walkup-speech-pages-off.json` | **177/177** (unmoved) |
| `factory-brain-gold-walkup-speech-close-off.json` (park-stage untouched) | **80/126** (unmoved, matches the doc-stated bar) |
| `factory-brain-silver-walkup-speech-box2-off.json` | **100/100** (unmoved) |

No `src/` edit this step. `tools/compare/factoryRoundIntroGeneralizationStage.ts`
and `tools/compare/appTrace.ts` untouched — the app stage this fixture uses
(`factory-round-battle7-noland-gold-speech-page4-held-off`) was already
registered (unused by any trace until now). Only two new files were added:
the battle-lab scenario and the compare trace above, plus this doc.
