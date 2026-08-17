# Silver speech box 2 — dense evidence for the single-line cursor fix's tier-generality

Side lane, 2026-08-17. Answers the pointer left by
`docs/noland-brain-intro-gold-ground-truth.md` §9″ Fix B: that fix made
`drawOpponentMsgbox`/`drawBrainSpeechCursor` (`battleRoomRender.ts`) anchor
the wait cursor on whichever line actually holds the last printed glyph
(`line2` if non-empty, else `line1`), fixing gold's page 2
(`GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[1]` = `["…Oh?", ""]`). That doc's own
write-up named silver's `SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[2]` (`"I had a
look at your Battle Swap data."`, `""`) as the same single-line shape,
claimed covered by the same fix, but noted **no dense silver fixture existed
to confirm it pixel-for-pixel**. This doc is that fixture and its verdict.

Neither `docs/noland-brain-intro-gold-ground-truth.md` nor
`docs/walkup-call-scene-ground-truth.md` is edited by this step (both are
owned by an in-flight sibling this round) — cited read-only.

## 1. Text shape confirmation

`factory-brain-walkup-script.json`'s `silverFirstEncounter` scene, page index
1 (0-indexed): `"I had a look at your Battle Swap data."` — no `\n`/`\l`, so
`splitSpeechBoxes` yields a single box `["I had a look at your Battle Swap
data.", ""]` (38 characters on line 1, line 2 empty) at
`SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[2]` (box index 2 — page 0's own internal
`\l` scroll already produced boxes 0/1 from page index 0, so page index 1
lands at box index 2). Exactly the shape §9″ named.

## 2. Onset derivation (app side + oracle side, cross-referenced)

**App side.** `battleRoomAcceptedState` (`src/engine/battleRoom.ts`) is the
single accept seam every `battleRoom` branch uses. For a personality-speech
page with more pages queued (box 1 → box 2 here), its own reducer is
unconditional and deterministic: `{...state, phase: "brainSpeech", elapsed:
0, speechStep: nextStep}` — no intervening close phase. So box 2's true
onset state is fully determined by composing two already-existing,
already-verified pieces — no simulation or timing guess needed on the app
side: `battleRoomAcceptedState(<box-1-held battleRoom state>)` yields
`{phase: "brainSpeech", elapsed: 0, speechStep: 2, ...}` verbatim. Added
`generatedRoundBattle7NolandSilverSpeechBoxOpeningStage` (and its zero-arg
`...Box2OpeningStage` wrapper) in `tools/compare/factoryRoundIntroGeneralizationStage.ts`
to park directly in this state — the same "park directly in a real,
reachable engine state" idiom the existing `...BoxHeldStage` family already
uses, just one step upstream (parked in the printing phase itself, not the
already-fully-printed idle phase), since this step's whole point is to
exercise the turn edge and the typewriter print that the held-only fixtures
explicitly skip.

**Oracle side.** Wrote a new dense battle-lab scenario,
`tools/battle-lab/factory-brain-silver-walkup-speech-box2-open-dense-off.json`
(same `factoryBrain`/seed-305419896 recipe as the existing 12 numbered
walk-up scenarios, `preCheckpointCaptureFrames` retargeted to abs frames
2129–2228, 100 stride-1 frames), and ran it via `bin/oracle lab <scenario> -o
/tmp/silver07/` (also reran the already-committed
`factory-brain-silver-walkup-07-speech-p1-p2-dense-off.json`, abs 1920–2175,
as a cross-check — both agree). Decoded every PNG's raw-RGB sha256 and
diffed run lengths: box 1's held text is byte-stable (only its own cursor
bob varies) through abs **2128**; abs **2129** already shows box 2's first
character ("I") — **no frame at any 1-tick sample shows box 2 cleared
(0 chars)**. Direct pixel crop of `pre-checkpoint-frame-02129.png` confirms
this visually (single "I" glyph, box otherwise empty). This is the oracle
recording's own fixed content — independent of any trace timing choice (see
`oracleClient.ts`'s `runOracleBattleLab`, read directly: post-checkpoint
frames never influence which pre-checkpoint frames the scenario returns).

So: **true onset = abs frame 2129**, and there is no oracle frame showing
the "cleared" tick the app's model expects — see §4.

## 3. Fixture

- Stage: `generatedRoundBattle7NolandSilverSpeechBox2OpeningStage`, registered
  as app-stage id `factory-round-battle7-noland-silver-speech-box2-opening-off`.
- Scenario: `tools/battle-lab/factory-brain-silver-walkup-speech-box2-open-dense-off.json`
  (abs 2129–2228).
- Trace: `tools/compare/traces/factory-brain-silver-walkup-speech-box2-off.json`
  — `preCheckpointFrameOffset: 2129`, one 100-frame no-button segment,
  `captureWindow: {0, 99}` (stride-1, 100 frames — local frame 0 = the parked
  onset state, unticked; local frames 1–99 = one real app tick each). Covers
  the full box-2 turn edge, the complete 38-character typewriter print, and
  ~60 frames of the settled hold with the wait cursor visible. Does **not**
  extend to the box 2→3 accept edge (abs ~2258 per
  `docs/noland-silver-walkup-presentation-map.md` §3) — out of this step's
  time budget; the mechanism that edge would exercise is already
  characterized below from box 2's own turn-in edge, so the extension is a
  cheap, low-priority follow-up rather than new information.

## 4. Compare verdict: 63/100 — NOT exact, one precisely-named residual

```
npm run compare -- tools/compare/traces/factory-brain-silver-walkup-speech-box2-off.json --summary
```

**63/100 frames matched.** The 37 mismatches are every consequence of a
single, coherent, already-known mechanism class — not 37 independent
defects, and not a new discovery about cursor *placement* (Fix B holds, see
§5). Two groups:

**Group A — print-phase mismatches (31 of frames 0–39).** Proven to be a
**constant, non-compounding, one-tick-early oracle shift** — the exact
"later-`\p`-one-tick" residual class `docs/noland-brain-intro-gold-ground-truth.md`
§9‴ already named for gold's page 2→3/3→4 edges (`battleRoomAcceptedState`'s
uniform 2-tick model — accept tick shows the box cleared, next tick shows
the first character — is one tick too slow; the real game shows the first
new character on the accept tick itself, with no cleared frame ever visible
at 1-tick resolution). Proof, not assumption: box 2's text is `"I had a look
at your Battle Swap data."`; if oracle's chars-shown at abs `2129+F` equals
`app's chars-shown at local frame F, plus one`, then app frame `F` should
render **identically** to oracle frame `F` exactly when 1-indexed character
`F+1` is an invisible space. The 9 matched frames in the print span (local
1, 5, 7, 12, 15, 20, 27, 32, plus 38 where both sides are already fully
printed) are **exactly** the frames where character `F+1` is a space (chars
2, 6, 8, 13, 16, 21, 28, 33 of the string are the 8 spaces before the
closing period) — an exact match, not a coincidence. This is the same
mechanism §9‴ proved for gold, now shown (new information) to also cover
silver's box 1→2 edge — which is *not* gold's "first `\p`" case (silver's
page 0 already had one prior transition, its own internal `\l` scroll,
before this `\p`) but structurally the analogous 3rd transition since the
window truly opened. This refines §9‴'s "first vs. later `\p`" framing: the
cleaner rule this fixture's evidence supports is "1st transition since
window-open is 2-tick, every later one (whether `\l` or `\p`) is 1-tick" —
worth a note for whoever next touches this mechanism, though re-deriving it
formally against every known edge is out of this step's scope.

**Group B — periodic hold-phase mismatches (frames 48, 57, 66, 75, 84, 93 —
period 9, all `bbox≈213,124-219,133`, the wait-cursor's own glyph box).**
Direct consequence of the same Group-A shift, not a separate defect: the
cursor's own bob animation appears to hold a fixed Y position for several
ticks then blip 1px for a single tick (period ~9, consistent with box 1's
own two-variant bob-hold pattern observed at abs 2114–2122/2123–2128 while
deriving §2's onset). Because Group A's constant one-tick shift also carries
into the idle phase (the app first shows the wait cursor at local frame 40 —
`printTicks` 38 + `CURSOR_APPEAR_DELAY_TICKS` 2 — while oracle already shows
it at local frame 39, confirmed by direct pixel crop of frame 39: oracle
already draws the cursor glyph after "data.", app's box is still bare), the
two sides' bob cycles are phase-shifted by exactly one tick. For most of the
period the two phase-shifted cycles still land on the same rendered Y
position (hence long matching runs), but once per period-9 cycle the
"blip" tick falls on different frame indices for the two sides, producing
the isolated single-frame mismatches. No new mechanism, no engine edit
needed to explain it — same root cause as Group A.

No engine edit was made (none permitted this step — `battleRoomAcceptedState`
lives in `src/engine/`, main-lane territory). If this residual is ever
picked up, the evidence above (the space-character proof in particular) is
enough to re-derive the fix without new oracle work.

## 5. Fix B's tier-generality: CONFIRMED

Excluding the two groups above (both fully attributable to the *timing*
residual, not placement), **every one of the 63 matching frames that shows
the wait cursor renders it byte-identical to the oracle** — including all of
local frames 40–47, 49–56, 58–65, 67–74, 76–83, 85–92, 94–99 (54 consecutive
non-blip hold frames). The cursor sits inline at the end of line 1
(`"...data."` + cursor, x≈213–219, y≈124–133), never at line 2's fixed
(empty) position — exactly what §9″ Fix B (`drawOpponentMsgbox` picking
`line2` if non-empty else `line1`) predicts, and exactly the shape §9″'s own
write-up flagged as unconfirmed. **This closes that gap**: Fix B is
tier-general, silver included, pixel-for-pixel.

## 6. Guard reruns (fresh, unmoved by this step's edits)

| Trace | Result |
| --- | --- |
| `factory-brain-silver-walkup-speech-box0-held-off` | 39/39 |
| `factory-brain-silver-walkup-speech-cry-held-off` | 74/74 |
| `factory-brain-silver-walkup-speech-page8-held-off` | 39/39 |
| `factory-brain-silver-walkup-speech-close-pause-off` | 28/28 |
| `factory-brain-gold-walkup-speech-pages-off` | 175/177 (frames 593/727 — pre-existing, already-named residual, untouched) |

`tools/compare/factoryRoundIntroGeneralizationStage.ts` and `appTrace.ts`
only gained new exports/registrations (`generatedRoundBattle7NolandSilverSpeechBoxOpeningStage`,
`...Box2OpeningStage`, and the `factory-round-battle7-noland-silver-speech-box2-opening-off`
stage id) — every existing helper and stage id is byte-unchanged.

## 7. VERDICT (2026-08-17, main worker): §4's residual CLOSED — 63/100 → 100/100

Picked up §4's own space-character proof and closed the mechanism it named,
cross-checked against `docs/noland-brain-intro-gold-ground-truth.md` §9‴'s
gold page 2→3/3→4 edges (landed the same session, same rule). **Derived
rule** (stated in full, with citations, in `battleRoom.ts`'s new
`speechAcceptedFast` field doc and in that doc's own §9⁗ addendum): the
window's FIRST accept-driven box transition (leaving box 0) keeps the
existing 2-tick clear-then-print model; every LATER one (leaving box ≥ 1 —
box 1→2 here is the window's 2nd, counting box 0→1's own `\l` scroll as the
1st) skips the cleared tick — the accept tick itself already shows the
first new character. Implemented as a new `BattleRoomState` field
(`speechAcceptedFast`), set by `battleRoomAcceptedState`'s direct-
continuation branch; this fixture's own park helper
(`generatedRoundBattle7NolandSilverSpeechBoxOpeningStage`) constructs
`battleRoom` state directly rather than calling `battleRoomAcceptedState`,
so it needed its own matching derivation (`speechStep - 1 >= 1`) to actually
exercise the fixed model — done in the same commit.

**Result:** `factory-brain-silver-walkup-speech-box2-off.json` **63/100 →
100/100** — both Group A (the 31-frame print-span shift) and Group B (all 6
period-9 cursor-bob blips) closed by the single one-tick fix, exactly as §4
predicted ("No new mechanism, no engine edit needed to explain [Group B]
- same root cause as Group A"): no separate bob-phase fix was needed.
Guard reruns (§6's own table) unmoved: silver box0-held 39/39, cry-held
74/74, page8-held 39/39, close-pause 28/28; gold-pages
**175/177 → 177/177** (the sibling fix's own two frames, 593/727, closed
by the same engine change — see the gold doc's §9⁗ for the trace-level
compensation that had to be reverted alongside it). Full `npm test` (1065
files, 10010 passed, 223 skipped), `npm run build`, `npm run typecheck`
green; `executableFrontierRatchet` barrier counts unmoved.
