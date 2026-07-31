# Intro cry/shadow evidence pack (ISSUES #56 items 1 and 3)

Evidence-only step (no `src/`, `battleScene.ts`, or `tools/compare/` changes).
Cites `docs/trainer-pic-off-window-scout.md` §D (round 5/6 resolutions) and
`ISSUES.md` #56 by name throughout.

## Method

All frame numbers below are **oracle-absolute** `preCheckpointCaptures`
indices from `bin/oracle lab` runs with `preCheckpointCaptureAllFrames:
true`, decoded and dense-diffed pixel-by-pixel (numpy, not just
`sha256`/bbox presence) — the same method §D's own round 5/6 slices used.
No app-side stage or `preCheckpointFrameOffset` mapping was built or used
(out of scope this step); every delta here is computed directly in oracle
frame space, so none of it depends on any app-relative conversion.

Scratch dense probes (SHIZUKA re-run, GRANBULL char-length checks) ran into
`/tmp` — **not committed**, per this step's "no captured data in the repo"
constraint. Only two things are committed: this doc and the new MAGNETON
request-only fixture.

## Part 1 — player-cry data points (#56 item 1)

**Fixtures.** Three player leads, all `factoryLegal`, all re-probed dense
this session:

| Player lead | Fixture | Committed? | Opponent lead | challengeNum/battleNum |
| --- | --- | --- | --- | --- |
| GRIMER | `factory-arbitrary-intro-yoshi-off.json` | yes | COMBUSKEN | 0/0 |
| KADABRA | `factory-trainer-pic-shizuka-off.json` | yes | MAGNETON | 2/2 |
| DELCATTY | `factory-arbitrary-intro-magneton-off.json` (this step, §Part 2) | yes | MAGNETON | 2/0 |

KADABRA's own dense pass required a scratch copy of the committed SHIZUKA
fixture with `preCheckpointCaptureAllFrames: true` added (the committed file
only requests frame 0) — the committed file itself was not touched. DELCATTY
rides along for free on the MAGNETON fixture built for item 3, giving a third
point without a fourth probe.

**Per-species landmark table** (all frames oracle-absolute; `SENDOUT_
HANDOFF_LAG=3`, `generatedPlayerVisualLag(len)=len-1+3`, both from
`battleScene.ts`, read-only this step):

| Landmark | GRIMER (YOSHI) | KADABRA (SHIZUKA) | DELCATTY (MAGNETON) |
| --- | --- | --- | --- |
| Opponent handoff (release start) | 1583 | 1583 | 1583 |
| `dispatchDelay(opponent)` (§D round 5) | 125 (COMBUSKEN) | 111 (MAGNETON) | 111 (MAGNETON) |
| Box-clear / "Go! `<mon>`!" starts | 1708 | 1694 | 1694 |
| Player line ("Go! X!") length | 11 | 12 | 13 |
| `generatedPlayerVisualLag` | 13 | 14 | 15 |
| Throw becomes visible | **1721** (verified: 1212px jump at 1708, then 1690px jump at 1721) | **1708** (§D round 5, cross-verified this session: 1690px jump at 1708) | **1709** (verified: 1690px jump) |
| Ready-transition observed (menu box begins to change) | **1849** (bbox 16,123–73,133) | **1882** (bbox 16,123–79,133) | **1867** (bbox 16,123–85,133) |
| Player cry duration (`cry-durations.json`) | 30 | 76 | 59 |

The three "ready-transition observed" bboxes are the same UI element
(within 6px of each other on every edge) across three unrelated fixtures —
strong confirmation this is one mechanism, not per-fixture noise. This is
the same landmark round 6 called "the static message box → blank box"
transition for GRIMER (there reported as **app-relative 678**; the oracle-
absolute value re-derived this session, `678 + preCheckpointFrameOffset
1171 = 1849`, matches exactly, confirming both the offset and the earlier
finding).

**Hypothesis A (round 6's first-cut, anchored at dispatch/text-start).**
`readyLag(species) = 185 + (cryDuration(species) - cryDuration(GRANBULL=66))`,
total predicted = handoff + dispatchDelay + readyLag:

| Species | Predicted | Observed | Residual (predicted − observed) |
| --- | --- | --- | --- |
| GRIMER | 1857 | 1849 | **+8** (round 6's known miss) |
| KADABRA | 1889 | 1882 | **+7** |
| DELCATTY | 1872 | 1867 | **+5** |

All three residuals are **positive (predicted always late) and clustered
5–8 ticks**, not proportional to the cry-duration spread between species
(GRIMER 30 vs KADABRA 76 — a 46-tick difference, yet nearly identical
residual). A slope/proportionality error would spread the residual with
the cry-duration gap; a clustered near-constant residual instead points at
a wrong **anchor tick**, not a wrong per-species term.

**Hypothesis B (this step, anchored at the player's own throw-visible
tick).** Source-motivated: `Intro_TryShinyAnimShowHealthbox`'s cry-wait gate
can only start once the player's own mon is materialized out of the ball,
which is the throw-visible event, not the dispatch text-start. Model:
`readyLag'(species) = X + cryDuration(species)`, predicted = throwVisible +
readyLag':

| Species | throwVisible | Observed | `readyLag'` (observed − throwVisible) | cryDuration | `X` |
| --- | --- | --- | --- | --- | --- |
| GRIMER | 1721 | 1849 | 128 | 30 | **98** |
| KADABRA | 1708 | 1882 | 174 | 76 | **98** |
| DELCATTY | 1709 | 1867 | 158 | 59 | **99** |

`X` = 98, 98, 99 — a **1-tick spread across a 46-tick cry-duration range and
three independent fixtures/trainers/challenge numbers**. This is an exact
fit within measurement granularity, not a curve fit to one point: it
reproduces GRIMER (round 6's own residual) and independently predicts
KADABRA and DELCATTY to within 1 tick using a single shared constant.

**Verdict: the symmetric player-cry-gate mechanism is CONFIRMED — the
round-6 "8-tick miss" was an anchor-point error (dispatch/text-start instead
of throw-visible/release), not a wrong mechanism or a wrong per-species
term.** The corrected model is `readyTick = throwVisibleTick + 98 +
cryDurationTicks(playerLeadSpecies)`, equivalently `readyTick = handoffTick +
dispatchDelay(opponent) + generatedPlayerVisualLag(playerLine.length) + 98 +
cryDurationTicks(playerLeadSpecies)`. Not applied to `battleScene.ts` this
step (out of scope; a main step should consume this).

**Open reconciliation question, not resolved this step.** The existing flat
`GENERATED_PLAYER_READY_LAG=185` (`GENERATED_PLAYER_READY_DELAY=286`) was
calibrated against `battle-command-generated-off`
(`tools/battle-lab/mechanic-battle-command-generated-off.json`, player
GRANBULL, still pixel-exact at 128/128) and would need `X=119`
(`185 - cryDuration(GRANBULL=66)`) under Hypothesis A's from-dispatch
anchor, or a different value under Hypothesis B — neither matches the
98/98/99 cluster above cleanly. That fixture's own opponent send-out text
is rendered through the **canonical Battle-1 path**
(`battleSendOutEncounterParams`/`playerSendOutClock`, `battleScene.ts:3000-
3028`, hardcoded `"out GROVYLE!"`) rather than the generic
`factoryBattleStartIntro` machinery GRIMER/KADABRA/DELCATTY all exercise —
plausibly a different code path/timing convention entirely, not the same
linear-in-cry-duration mechanism sharing one constant. Flagged for whoever
applies this fix; not chased further this step (would need instrumenting
the canonical path's own frames, out of scope for an evidence-only step).

## Part 2 — MAGNETON shadow ground truth (#56 item 3)

**Fixture.** `tools/battle-lab/factory-arbitrary-intro-magneton-off.json`
(new, committed, request JSON only). Built from §D round 6's independently-
checked alternative tuple: `generateFactoryOpponent(rngValue=70,
factoryWinStreak=14, battleIndex=0, storedTrainerIds=[],
savedRentalSetIds=[110,130,150,115,135,145])` → `trainerId=109` (RICARDO),
`opponentSetIds=[349,353,292]` (MAGNETON/SWALOT/MINUN), MAGNETON as the
opponent's own active lead. `playerSetIds=[267,268,269]`
(DELCATTY/SABLEYE/LICKITUNG) — the challenge-2/rental-rank-0 legal range is
**267-371**, not 110-199 (the oracle rejected `[110,130,150]` with `"player
sets cannot be assigned to the source rental ranges for challenge 2 and
rental rank 0"` — `factory-round-policy.json`'s `rentalSelection.ranges.
level50[2]` — a small correction to §D round 6's own assumption that any
rank-0 set would do). `seed=70` (the `rngValue` fed to
`generateFactoryOpponent`, same convention as YOSHI's `seed=42`).
`challengeNum:2`/`battleNum:0`, `rentalSwapCount:0`,
`preCheckpointCaptureAllFrames:true`, mirroring
`factory-arbitrary-intro-yoshi-off.json`'s own construction exactly.

**Oracle validation** (`bin/oracle lab` on the committed file, scratch
output only): `trainerId=109`, `challengeNum=2`, `battleNum=0`,
`opponent[0].species=82` (MAGNETON), `player[0].species=316` (DELCATTY) —
tuple reproduces exactly as predicted, 2007 `preCheckpointCaptures` frames
(same size class as YOSHI/SHIZUKA).

**Landmark mapping** (oracle-absolute, this fixture's own probe — §C/§D's
standing "re-verify per fixture" caveat honored, not assumed from YOSHI):

| Landmark | Frame | Note |
| --- | --- | --- |
| P (room-message-dismiss plateau start of change) | **959** (963 − 4, same inference rule §D used) | sha256 constant 880..962, first change 963 — identical to YOSHI/SHIZUKA's own P, confirming it's generic/trainer-independent |
| `mainCallback2 == CB2_InitBattle+1` first (raw) | **1176** | `CB2_InitBattle = 0x8036760` via `bin/oracle symbols` |
| Battlers species-populate (opponent.species≠0) | **1212** | opponent species=82 (MAGNETON) |
| Opponent handoff / release-start (big pixel jump) | **1583** | identical to SHIZUKA's own handoff — same opponent species (MAGNETON), same species-driven ball/materialize sequence, independently reproduced on a different trainer/challenge |
| `GENERATED_OPPONENT_SHADOW_DELAY`(104)-relevant frame | **1687** (= 1583+104) | **directly pixel-confirmed**: 200px change, bbox (160,65)-(191,72) — matches `drawGeneratedOpponentShadow`'s own source-cited OAM region (`battleScene.ts:4072-4074`: center (176,40+29), 32×8) almost exactly. This is inside the reachable pre-dispatch window (104 < dispatchDelay 111), so the elevated-shadow branch is confirmed live and visually distinct for this fixture |
| Dispatch complete / box-clear ("Go! DELCATTY!" starts) | **1694** (= 1583+111) | third independent confirmation of `dispatchDelay(MAGNETON)=111` (after MAGNETON-as-opponent in the SHIZUKA fixture and this reproduction under a different trainer/challenge) |
| Throw becomes visible | **1709** (= 1694+15) | matches `generatedPlayerVisualLag(13)` exactly ("Go! DELCATTY!" is 13 chars) |
| Ready-transition observed | **1867** | see Part 1's DELCATTY row |
| Checkpoint (pixel-match to post-checkpoint frame 0, §D's own convention) | **1894** (first occurrence) | **caveat**: the command-menu cursor blinks on a period-9 cycle from ~1875 onward, so the checkpoint frame's own sha256 recurs multiple times across the tail of the window (also at 1908, 1917, ... and again near 2003-2006) — the *first* occurrence (1894) is reported per §D slice 1's own convention, but is a coincidental blink-phase match rather than a uniquely-determined instant; a future app-side comparison step should re-derive this the same way §D did for YOSHI/SHIZUKA rather than assume it |

**Status: oracle-side ground truth only, as scoped.** No app `AppStage` or
`compare` trace was built for this tuple (explicitly out of scope for this
step). `GENERATED_OPPONENT_SHADOW_DELAY`(104) therefore still has no
committed **pixel comparison** exercising it — but this fixture is now a
committed, validated, fully-landmarked starting point for that follow-up
main-lane step, closing the "no committed fixture" half of #56 item 3's gap
without requiring any more oracle re-probing.

## Summary

- **#56 item 1**: symmetric player-cry-gate mechanism confirmed exactly
  (three species, 1-tick spread) once anchored at the player's own
  throw-visible tick instead of dispatch/text-start; the round-6 8-tick
  miss is now explained, not just characterized. GRANBULL/`battle-command-
  generated-off`'s own calibration doesn't reconcile cleanly and is flagged
  as a likely different-code-path question for the follow-up, not a
  contradiction of the three-species fit above.
- **#56 item 3**: `factory-arbitrary-intro-magneton-off.json` committed,
  oracle-validated, fully landmarked (P/B/checkpoint/shadow/dispatch/visual/
  ready frames), including a direct pixel confirmation that the elevated-
  shadow OAM region visibly changes exactly at handoff+104. No constant or
  app-side change made; ready for a main step to build the matching
  `AppStage` + `compare` trace.
