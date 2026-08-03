# #62 — generated-OFF-route residual census for the retired turn-2 reproducers

**Scope of this document.** Evidence/characterization only, per the supervisor's
routing decision recorded in ISSUES #62: profile-less legacy-shaped inputs
correctly select the generated default route; the historical canonical
turn-2 route was deleted at the rank-6 flip and is not coming back. This
document does not change any production code, does not revive either deleted
trace into `tools/compare/traces/`, and does not propose trace/tick special
cases. It characterizes exactly where the two retired reproducers'
`0/77` and `0/237` residuals come from, so a future slice (if any is
prioritized) can be briefed precisely instead of re-deriving this evidence.

**Bottom line up front.** Of the five families identified below, only one
(the idle-menu-bounce spikes) is a previously-understood mechanism — it is
the *same settled class* closed in #56 item 2, reappearing here because it is
a general action-select-idle mechanism, not scenario-specific. The other four
families all trace to **the two engines running genuinely different battle
continuities** once these legacy button-timed inputs are replayed against
the generated route instead of the historical canonical route — an AI
move-choice divergence, a turn-resolution frame-budget divergence, and the
downstream HP-bar-fraction residue of both. None of these four look like bugs
in the shared renderer (`renderWithoutFactoryTerminal` →
`renderBattleResolutionPresentation` → `renderBattleResolutionSceneOffView`)
itself; they look like expected consequences of feeding a stale, route-specific
input schedule into a route it was never authored for. See "Ranking by fix
leverage" at the end for what, if anything, is worth a follow-up slice.

## Reproduction

Fixtures recovered byte-for-byte from `01eac159` (only `"oracleProfile":
"battle-scene-off"` added; diffed against the original blob to confirm no
other byte changed):

```sh
git show 01eac159:tools/compare/traces/turn2-endeavor.json      # original
git show 01eac159:tools/compare/traces/turn2-dragonbreath.json  # original
```

Committed as new files (not restored into `tools/compare/traces/`):

- `tools/compare/fixtures/issue62-turn2-endeavor.json`
- `tools/compare/fixtures/issue62-turn2-dragonbreath.json`

Every count in this document reproduces from:

```sh
npm run compare -- tools/compare/fixtures/issue62-turn2-endeavor.json --summary
npm run compare -- tools/compare/fixtures/issue62-turn2-dragonbreath.json --summary
```

Both report `0/77 frames matched` and `0/237 frames matched` respectively,
matching the #62 bounded evidence exactly. Per-frame `DIFF <px> bbox=...`
lines from these two runs are the raw data every family below buckets. Frame
regions were localized with:

```sh
npm run inspect-frame -- <run-dir>/app-XXXXX.png <run-dir>/oracle-XXXXX.png --clusters 20
```

and confirmed visually by reading the `app-*.png`/`oracle-*.png` capture
pairs directly (both engines' full 240×160 frames, and 4×-zoomed crops of the
message textbox / HP-bar boundary).

## Endeavor — 77/77 red frames, three families

| Family | Frames | Count | Total-px range (min/median/max) |
| --- | --- | --- | --- |
| E-1 idle-menu-bounce (**settled**, see below) | 2894–2947 | 54 | 799 / 1609 / 2378 |
| E-2 persistent opponent-HP-bar fraction gap | 2948–2970 (2948–2960, 2963, 2967 captured) | 15 | 30 / 30 / 30 |
| E-3 AI move-choice divergence (message + HP tail) | 2971–2999 (2971,2975,2979,2983,2987,2991,2995,2999 captured) | 8 | 79 / 388 / 2081 |
| **Total** | | **77** | matches `0/77` exactly |

### E-1 — action-select idle-menu-bounce — SETTLED, same class as #56 item 2

Frames 2894–2947 show the "What will ONIX do?" action-select menu, open and
idle (no player input yet — confirmed by reading `app-02902.png`/
`oracle-02902.png`, both show the FIGHT/BAG/POKéMON/RUN menu). The diff
alternates between two fixed bboxes with one one-frame combined transition:

- `(44,49)-(99,110)`, ~769px extra beyond E-2's baseline — the player
  battler's sprite silhouette region.
- `(127,74)-(229,110)`, ~1579px extra — the player's own healthbox region.
- Frame 2936 alone shows both combined (2378px total) — a transition-boundary
  frame where the oscillator flips phase mid-scan.

**This is not a new defect.** The second bbox, `127,74-229,110`, is a
pixel-for-pixel exact match to the region `docs/issue56-residual-probe.md`
Q2 identified and closed as no-app-bug on 2026-07-31 (`432e16aa`): the
player's own healthbox/sprite idle-bounce oscillator, owned by
`menuIdleBounce` (`src/engine/battleMenu.ts:825`), driven through
`actionMenuDisplayAtAge` (`battleMenu.ts:848`) from
`renderGeneratedBattleCommandPresentation` (`src/engine/battleScene.ts:18381`),
clocked by `presentation.idleBounceElapsed`
(`src/engine/battleCommandPresentation.ts:103`, incremented in
`advanceBattleCommandPresentation` at `battleCommandPresentation.ts:325`
once `BATTLE_COMMAND_ACTION_ENTER_DELAY = 6` elapses,
`battleCommandPresentation.ts:126` — all four grep-verified against the
current tree). The #56 investigation established this is a CPU/VBlank-phase
artifact of the real oscillator, not a source-owned defect, and that no
tick/turn/species-keyed producer predicts it without becoming a fitted
exception. Do not re-open it here; this reproducer is additional confirming
evidence that the mechanism is scenario-independent (it appears identically
on a turn-2 1v1 Factory matchup, not just the arbitrary-trainer-intro
fixtures #56 was built from).

### E-2 — persistent opponent (GROVYLE) HP-bar fraction gap

A `30px` cluster at `(85,33)-(99,34)` — two rows of GROVYLE's (opponent, top-left
box) HP bar — is present in **every one of the 77 frames**, always with the
identical color pair (`app` (90,214,132) green fill vs `oracle` (74,66,90),
the bar's unfilled-track shade). Direct pixel sampling (`y=33`, `x=60..104`,
frame 2948) shows the oracle's GROVYLE bar filled only from `x=60` to `x=84`
(~62% of the bar) while the app's bar is filled green all the way to `x=99`
(the bar's right edge, i.e. ~100%). This is frames 2948–2970's *entire* red
signature (exactly 30px, nothing else) and is embedded as a constant
sub-component inside every E-1 and E-3 frame's total too.

**Direction:** app renders GROVYLE at (near-)full HP; oracle renders GROVYLE
partially damaged. **Hypothesis (source-cited, not confirmed):** the bar
fraction is computed by `healthboxParams()`
(`src/engine/battleResolutionPresentationRender.ts:313`) as
`hpFraction: battler.hp / battler.maxHP`, where `battler.hp` comes from the
`BattleResolutionDisplayedField` seeded once per turn by `resolutionField()`
(`src/engine/sceneOffPresentation.ts:210`, reading
`input.before.battlers[id].hp` — the kernel's own pre-turn HP for that
battler) and never updated afterward except by an explicit `"hp"` command
(`battleResolutionCommandDuration`'s `"hp"` case,
`battleResolutionPresentationRender.ts:250`). A 30px gap that is bit-identical
across 106 real ticks (1894→2999) without ever resolving is inconsistent with
a transient animation/flash; it means GROVYLE's *kernel-tracked* current HP
genuinely differs between the app's independently-computed generated-route
turn-1 outcome and the oracle's real-ROM turn-1 outcome — most plausibly
because the generated route legitimately produced a different turn-1 result
(different AI move, different roll) than the deleted historical recording
assumed. **This reads as a downstream symptom of route/state divergence, not
an isolated renderer bug** — see the leverage ranking below for what a
follow-up slice should check before touching any rendering code.

### E-3 — AI move-choice divergence (message + growing tail)

Frames 2971–2999 (sparsely captured, every 4th frame) show the second-line
message text growing character-by-character, and it diverges immediately:
frame 2971 reads `app: "...used DO"` vs `oracle: "...used EN"`; by frame 2995
the full text is legible — **`oracle: "Foe GROVYLE used ENDEAVOR!"` vs
`app: "Foe GROVYLE used DOUBLE TEAM!"`** (confirmed by direct 4×-zoomed crop
of both `app-02995.png`/`oracle-02995.png`). This is not a text-timing lag
(no prefix of "ENDEAVOR" is ever a substring of "DOUBLE TEAM") — **the two
engines have the opponent using two entirely different moves on turn 2.**
The bbox grows from `(17,140)-(27,149)` (49px, first message line only) to
`(17,16)-(206,149)` (2081px, nearly the full battle scene) by frame 2995,
because a different move naturally cascades into different HP-bar states and
(likely) different field content for the rest of the window.

**Direction:** oracle plays the real recording's ENDEAVOR; app's
independently-driven Factory AI legitimately picks DOUBLE TEAM instead.
**Mechanism (source-cited):** the opponent's move choice on the generated
route is decided by the Factory AI policy —
`submitFactoryAiDecision` (`src/engine/factoryAiDecisionPolicy.ts:1115`)
dispatching to `chooseFactoryAiScoredDecision`
(`factoryAiDecisionPolicy.ts:729`) or `chooseFactoryAiMaskZeroDecision`
(`factoryAiDecisionPolicy.ts:295`) per `selectFactoryAiMask`
(`src/engine/factoryAiMaskSelection.ts:151`) — which re-scores against
*this route's own* battle state (HP, PP, prior moves, RNG stream) rather than
replaying the historical recording's locked-in decision. Replaying the old
button schedule against a freshly-seeded generated-route battle can
legitimately land the AI on a different move. **This is exactly the class
the supervisor's routing decision already named as retired and not coming
back** — there is no rendering fix available here; the only way to make this
window agree with the old recording would be reviving the deleted canonical
route, which is explicitly out of scope.

## Dragon Breath — 237/237 red frames, three families

| Family | Frames | Count | Total-px (phase detail) |
| --- | --- | --- | --- |
| D-1 turn-resolution frame-budget divergence | 3121–3238 (59 captured, see phase table) | 59 | 946 → 10351 → 1635 (rise then fall, see below) |
| D-2 persistent HP-bar-fraction baseline | 3239–3846 minus D-3 spikes | 172 | 98 / 98 / 98 |
| D-3 idle-menu-bounce spikes (**settled**, same as E-1) | 3247, 3256, 3302, 3311, 3320, 3567 | 6 | 867 / 1635 / 2407 |
| **Total** | | **237** | matches `0/237` exactly |

### D-1 — turn-resolution frame-budget divergence

Four sub-phases, all one family (same direction, same root cause), captured
frames: 3121–3126 (6), 3127–3176 (50), 3236 (1, after a 3177–3235 capture gap
in the original fixture's own capture list — not something this census
introduced), 3237–3238 (2):

- **3121–3126 (946px, steady):** `app-03121.png` shows a blank message box
  (a transitional frame); `oracle-03121.png` already reads "ONIX used
  DRAGONBREATH!". App has moved on already.
- **3127–3176 (6495px → 10351px, climbing):** `app-03127.png` shows the
  *next* turn's "What will ONIX do?" action-select menu already open, ONIX's
  HP bar back at full (117/117); `oracle-03150.png`/`oracle-03176.png` are
  still holding on "ONIX used DRAGONBREATH!" with ONIX at 101/117. **The app
  has already fully resolved turn 2's move execution and reopened the next
  menu, while the oracle is still stepping through turn 2's own
  message/HP-update sequence** — confirmed by reading `app-03150.png` next to
  `oracle-03150.png` side by side. Diff climbs because nearly the entire
  scene differs (menu-box UI vs message-box UI, differing HP bars) — bbox
  reaches `(9,15)-(238,158)`, essentially the full screen.
- **3236 (7621px, one frame after the capture gap):** oracle now shows an
  empty/blank transitional box; app is unchanged (still its own static
  "ONIX do?" menu).
- **3237–3238 (1638px → 1635px, falling fast):** oracle's screen is
  converging toward the same static structure the app has been sitting on.

**Direction: app is ahead, not behind** — it finishes the turn's
message/animation sequence in far fewer real frames than the oracle's actual
hardware timing for the same logical turn, then sits at the next menu while
the oracle catches up. **Hypothesis (source-cited, not confirmed):** message
advancement in this renderer is gated by
`isBattleResolutionButtonMessageReady()`
(`src/engine/battleResolutionPresentationRender.ts:296`), and command
duration by `battleResolutionCommandDuration()` (`...:237`, e.g. the
`"message"` case uses `battleStringPrintableLength` + a `minimumFrames`
floor). If the *number of real advance-gated messages* the ROM plays for
this turn (move-used text, possibly an effectiveness/stat line, HP-drain
animation, return-to-menu) differs from what the generated route's
projected command sequence emits — built by
`createBattleKernelTurnPresentation`
(`src/engine/sceneOffPresentation.ts:249`) — the *legacy trace's fixed
button-press schedule*, timed for the deleted historical route's message
count, will satisfy the app's shorter sequence and fall short of (or run past)
the oracle's real one. That is a frame-budget/input-timing mismatch inherent
to replaying a stale schedule, not necessarily a bug in the duration
functions themselves — see leverage ranking.

### D-2 — persistent HP-bar-fraction baseline

Once both engines coincidentally land on the same static "ONIX do?" menu
structure (from frame 3239 on), the diff drops to a stable `98px` split
across two clusters, confirmed via `inspect-frame` on frame 3846:

- `(81,33)-(99,34)`, 38px — GROVYLE's (opponent) HP-bar boundary, same
  color pair and same screen position as Endeavor's E-2 family (`(90,214,132)`
  vs `(74,66,90)`).
- `(191,92)-(221,104)`, 60px across three small clusters — ONIX's (player)
  own healthbox HP/EXP-bar area.

**Direction:** both battlers' bars disagree between app and oracle from this
point on. This is the same signature as E-2, now on both battlers at once,
consistent with the app and oracle representing **two different battle
continuities** from turn 2 onward (app's continuation off its own
faster-resolved turn 2; oracle's continuation off the real one) that happen
to coincidentally agree on gross UI structure ("a menu is open") without
agreeing on the underlying HP state. Same "symptom, not cause" caveat as E-2
applies.

### D-3 — idle-menu-bounce spikes (settled, same class as E-1)

Six frames (3247, 3256, 3302, 3311, 3320, 3567) spike to 867–2407px within
the otherwise-flat D-2 tail. `inspect-frame` on frame 3256 shows clusters at
`(44,62)-(99,111)` (697px) and `(127,97)-(229,110)` (594px) — bbox-identical
to E-1's idle-bounce region. **Same settled #56-item-2 mechanism**, now
firing independently on each engine's own long-idle "a menu is open, no
input yet" state (app's stale turn-2 menu; oracle's real turn-3 menu) —
additional evidence the oscillator is a general per-menu-open mechanism, not
tied to which logical turn or battle state is displayed.

## Full frame accounting

- Endeavor: 54 (E-1) + 15 (E-2) + 8 (E-3) = **77** ✓
- Dragon Breath: 59 (D-1) + 172 (D-2) + 6 (D-3) = **237** ✓

No silent remainder in either fixture.

## Ranking by fix leverage

1. **Persistent HP-bar-fraction baseline (E-2 / D-2, 15 + 172 = 187 frames,
   the largest frame count of any non-settled family) — LOW confidence,
   highest *potential* leverage if it turns out to be a plumbing bug.**
   Before any code change, a follow-up slice should RAM-probe whether
   GROVYLE's/ONIX's true post-turn-1 HP in the oracle's real replay
   genuinely differs from the generated route's independently-computed
   turn-1 outcome (most likely — in which case this family is not
   independently fixable without reviving the historical route, i.e. out of
   scope), or whether the kernel's own tracked HP matches the oracle and only
   `resolutionField()`/`healthboxParams()`'s wiring is stale (in which case
   this is a real, scenario-independent presentation bug worth a small
   dedicated slice). This is the only family where "fix the renderer" is
   even a coherent question; the recommendation is **investigate before
   coding**, not "recovers N frames for M effort" — leverage is unknown until
   that probe runs.
2. **Turn-resolution frame-budget divergence (D-1, 59 frames) — likely zero
   leverage for these specific fixtures**, since matching real per-message
   advance timing for *this exact stale, unreproducible legacy input
   schedule* would be a trace-specific special case (explicitly out of
   scope). It is flagged, not ranked for action, because *if* the underlying
   message-duration/advance-gate formulas are found to generally undercount
   real advance-gated messages (not just for this retired trace), that would
   have leverage far beyond these two fixtures — but establishing that needs
   a scenario-independent probe this census did not attempt, and is a
   separate research question from "characterize these two reproducers."
3. **AI move-choice divergence (E-3, 8 frames) — zero leverage, out of
   scope by the routing decision itself.** The generated route's Factory AI
   legitimately computing a different move than the deleted historical
   recording is exactly the scenario the supervisor's decision already
   named as retired; there is no rendering-layer fix for "the AI chose a
   different move," and reviving the old decision means reviving the old
   route.
4. **Idle-menu-bounce (E-1 + D-3, 60 frames combined) — zero leverage,
   settled.** Do not re-open; matches #56 item 2 by exact bbox and
   mechanism. Recovering these frames would mean re-litigating a class
   already closed as no-app-bug.

**Net read for a future prioritization decision:** of 314 total red frames
across both retired reproducers, at most 187 (E-2 + D-2) are plausibly
presentation-layer work, and even those need a state probe to confirm
they're not just the visible edge of AI/route divergence before any code is
written. The remaining 127 frames (E-1, E-3, D-1, D-3) are either settled or
inherent to replaying deleted-route-shaped inputs on the generated route.
This matches, and gives frame-by-frame texture to, the supervisor's framing
that these two reproducers are evidence artifacts of the routing decision,
not a presentation parity backlog.
