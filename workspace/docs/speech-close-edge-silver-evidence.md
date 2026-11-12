# Silver twin: LAST-BOX -> CRY-BOX transition dense edge evidence (2026-08-17, side lane)

Silver's real-close edge (box 8, the last personality page "I'll be using
rental POKéMON, too!", accepting into `SILVER_CRY_BOX` — "Shake out every
last bit of your knowledge and bring it on!" — via `brainSpeechClosing`) was
fixtured in this step as the second-tier verification target for the
just-landed gold twin (`docs/speech-close-edge-evidence.md`,
commit `ea36151c`). `brainSpeechClosing` is shared tier-general code, so this
fixture bounds the same edge on silver's own box indices/timing.

## 1. Onset derivation (frame-diff on an already-committed dense probe)

`factory-brain-silver-walkup-speech-page8-held-off.json` (39/39 exact, base
this step) parks `battleRoom` at `phase: "brainSpeechIdle", speechStep: 8,
elapsed: 0` (box 8, the 9th and last personality box —
`SILVER_FIRST_ENCOUNTER_SPEECH_BOXES.length - 2`) via its own
`oracleBattleLab.scenario`,
`../../battle-lab/factory-brain-silver-walkup-11-speech-p7-battlecry-dense-off.json`,
at `preCheckpointFrameOffset` 2966. That same battle-lab scenario file
already carries a stride-1 `preCheckpointCaptureFrames` range 2944-3199
(256 frames, already committed, unmodified this step) — wide enough to
cover the entire box8->cry gap without any new scratch probe file. Running
`bin/oracle lab` on it directly and grouping the resulting frame PNGs by
sha256 gives the transition boundary directly:

| Abs frame range | sha256 (12) | Content |
| --- | --- | --- |
| 2966-3067 (102 frames) | `d7a6a8bb1216` (constant) | Box8 held: "I'll be using rental POKéMON, too!" — includes the existing page8-held fixture's own 2966-3004 capture window as a sub-range, confirming that fixture's 39/39 sits inside this same hold |
| **3068** | `db4034bee8d4` | **Box border visible, 0 characters — the cleared tick** |
| 3069 | `1800ea5a4833` | "S" (1 char) |
| 3070-3125 | unique per frame (with several single-tick punctuation/cadence repeats, e.g. 3073-3074, 3077-3078, 3083-3084) | typewriter continues to "Shake out every last bit of your knowledge and bring it on!" |
| 3126-3199 (74 frames) | `4e425b03092a` (constant) | Cry box fully printed, held — same sha the already-committed `factory-brain-silver-walkup-speech-cry-held-off.json` cites for its own 3126-3199 hold (74/74 exact) |

Direct PNG check (not just sha-inferred) at the four load-bearing frames
confirms the table: abs 3067 shows box8's held text; abs 3068 shows the box
border with zero characters; abs 3069 shows "S"; abs 3126 shows the cry
box's full settled text.

**This directly answers the deliverable's core question:** yes, the oracle
shows exactly **one** cleared-box frame (abs **3068**) between box8's last
held frame (abs **3067**) and the cry box's first printed character (abs
**3069**, "S") — the same single-tick resolution the gold twin found at its
own analogous edge (abs 2398, box3->close-box).

Per the gold twin's own precedent (§1 there), box 8 is elapsed-invariant to
render — it is the *last* personality page, so `brainSpeechCursorVisible`'s
own gate (`speechStep < brainSpeechPersonalityBoxCount(state) - 1`, i.e.
`8 < 9 - 1` = `8 < 8`) is false, no wait-cursor shows, and the fixture below
anchors `preCheckpointFrameOffset` at abs **3067** (the last held frame)
rather than the true onset — pixel-equivalent, and matches the already
oracle-confirmed constant hold 2966-3067.

## 2. New fixture and compare result

- No new battle-lab scenario needed: the existing, already-committed
  `factory-brain-silver-walkup-11-speech-p7-battlecry-dense-off.json` already
  carries stride-1 `preCheckpointCaptureFrames` covering 2944-3199, a strict
  superset of the target window 3067-3141 (75 frames: the last held tick,
  the full cry-box print span, and the settle + ~15 hold frames beyond it,
  per the step brief's ~50-80 frame guidance).
- `tools/compare/traces/factory-brain-silver-walkup-speech-cry-edge-off.json`
  (new, this step) — app stage
  `factory-round-battle7-noland-silver-speech-page8-held-off` (already
  registered; box8 held, `elapsed: 0`, true onset per §1), reusing the same
  existing battle-lab scenario at `preCheckpointFrameOffset: 3067`, segments
  `[1 frame A][73 frames idle]`, `captureWindow: {0, 74}`.

```
npm run compare -- tools/compare/traces/factory-brain-silver-walkup-speech-cry-edge-off.json --summary
```

**Result: 13/75 frames matched — NOT exact**, the same 4-tick-late class the
gold twin found (28/54). Local frame 0 (abs 3067, park) matches trivially.
Local frames 1-62 (abs 3068-3129) all mismatch; local frames 63-74 (abs
3130-3141) all match once both sides reach the same fully-printed, settled
cry box.

## 3. Frame-level verdict

Direct PNG diff (`tools/compare/out/<run>/app-000NN.png` vs
`oracle-000NN.png`) at the key local frames:

| Local frame | Abs frame | Oracle shows | App shows | Match? |
| --- | --- | --- | --- | --- |
| 0 | 3067 | Box8 held (park) | Box8 held (park) | yes |
| 1 | 3068 | Box **border visible**, 0 chars (the cleared tick) | Box **fully absent** — `MSGBOX_HIDDEN` (`brainSpeechClosing`, `elapsed: 0`) | **no** |
| 5 | 3072 | "Shak" (4 chars) | Box border visible, 0 chars — **only now** enters `brainSpeech`/cry-box `elapsed: 0` (the 4-tick `MSGBOX_CLOSE_TICKS` wait just elapsed) | no |
| 6 | 3073 | continuing print | "S" (first char, its own `elapsed: 1`) | no (4-tick lag) |
| 62 | 3129 | settled, full text | still one tick behind | no (last mismatch) |
| 63 | 3130 | settled, full text | settled, full text (caught up) | yes |

**Verdict sentence: the oracle shows exactly 1 cleared-border tick at
silver's real-close edge** (abs 3068, single frame, PNG-verified) —
identical in shape and magnitude to the gold twin's own finding (1
cleared-border tick, abs 2398). The app's generic `MSGBOX_CLOSE_TICKS = 4`
`brainSpeechClosing`/`MSGBOX_HIDDEN` phase produces the same wrong
intermediate visual (box fully absent instead of bordered-empty) and the
same net 4-tick-late print start on silver as it does on gold; this
confirms the defect the gold doc identified is tier-general (shared
`brainSpeechClosing` code), not a gold-specific artifact of that fixture's
particular box count or text length. Per this step's own constraints this
is banked evidence only, not fixed — the concrete edit sites remain
`brainSpeechClosing`'s `MSGBOX_HIDDEN` render case and/or the
`speechAcceptedFast: false` assignment (`battleRoom.ts` line ~386), as the
gold doc already names; this fixture exists so that fix can be verified
against both tiers at once.

## 4. Guard reruns (fresh, this worktree)

| Fixture | Result |
| --- | --- |
| `factory-brain-silver-walkup-speech-page8-held-off.json` | **39/39** (unmoved) |
| `factory-brain-silver-walkup-speech-cry-held-off.json` | **74/74** (unmoved) |
| `factory-brain-silver-walkup-speech-close-pause-off.json` | **28/28** (unmoved) |
| `factory-brain-silver-walkup-speech-box2-off.json` | **100/100** (unmoved) |
| `factory-brain-gold-walkup-speech-close-edge-off.json` | **28/54** (unmoved, matches the doc-stated bar) |

No `src/` edit this step. `tools/compare/factoryRoundIntroGeneralizationStage.ts`
and `tools/compare/appTrace.ts` untouched — the app stage this fixture uses
(`factory-round-battle7-noland-silver-speech-page8-held-off`) was already
registered (previously used only by the page8-held guard fixture). Only one
new file was added: the compare trace above, plus this doc. No new
battle-lab scenario was needed — the existing dense scenario already
covered the target frame range.

## 5. RESOLVED (2026-08-17, main worker)

Fixed in the same step as the gold twin, one shared tier-general code path -
see `docs/speech-close-edge-evidence.md` §6 for the full derivation and
fix write-up (`battleRoomAcceptedState`'s direct-continuation branch now
covers the real close+reopen too, `speechAcceptedFast: false`). **Result:
this fixture 13/75 → 75/75.** Guard matrix (including this doc's own four
fixtures above plus the gold twin) reverified unmoved by the fix; full
`npm test`/`npm run build`/`npm run typecheck` green.
