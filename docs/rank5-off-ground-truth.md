# Rank-5 Scene-OFF ground truth (turns 9-12 loop) — oracle-side bank

Executes the rank-5 OFF-pin policy adopted 2026-07-31 (`docs/
rank5-effect-visibility-scout.md`, ADOPTED per today's PROGRESS entry): bank
FRESH `battle-scene-off` oracle captures as the acceptance pins for this
window, since the 13 committed ON-era `turn{9,10,11,12}-*.json` traces
(`turn9-{menu,quickattack,quickattack-b,rockslide}`, `turn10-{menu,aerialace,
rockslide}`, `turn11-{menu,featherdance,rockslide}`, `turn12-{menu,aerialace,
rockslide-miss}`) are Scene-ON fixtures (no `oracleProfile` field; per
`AGENTS.md` they stay ON-profile and are the animation lane's concern, not
touched here).

**This step is ORACLE-SIDE ground truth only.** No `src/` edits, no app
re-timing, no deletions of the class-c animation functions the scout doc
proposed retiring — that is later main-lane work this doc explicitly does not
do.

## What's banked this session (4 of 13 windows; honest stop at the 35-minute cap)

Priority per the assigned step: the nine move/result windows before the four
menu windows, turn 9 → 12 order. Time allowed 4 of the 9 move/result windows
— the full turn-9 triplet (quickattack, quickattack-b, rockslide) plus
turn-10's aerialace. **Not attempted:** turn9-menu, turn10-rockslide,
turn10-menu, turn11-featherdance, turn11-rockslide, turn11-menu,
turn12-aerialace, turn12-rockslide-miss, turn12-menu — flagged for whoever
picks up the next slice, not silently dropped.

## Slice 2 — turn10-rockslide banked, turn10-aerialace settle extended

New session, same 55-minute bounded-worker contract. Picked up exactly where
the "Remaining work" section below (as it stood before this slice) left off.
Banked **turn10-rockslide** (the biggest of the nine windows) plus widened
**turn10-aerialace-off.json**'s own settle per item 3 of the assigned brief.
See the bottom of this doc for the up-to-date "Remaining work" after this
slice.

### Methodology change for this slice: scout-then-pin, made cheap by reusing existing ON dossiers

`turn10-rockslide.json` and `turn10-aerialace.json` share **byte-identical
`segments`** (both sum to 13306 frames, 92 segments) — they are the same
underlying turn-10 replay, just pinning different sub-ranges. Since button
presses are literal fixed-frame-offset script positions (unaffected by scene
mode), the last player input in this file fires at frame 12304-12306 (an
`A` press), after which a **1000-frame stretch with zero further input**
carries both AERIAL_ACE and ROCK_SLIDE to completion and back to a settled
turn-11 menu — this is the actual 961-tick-wide dynamic content the brief
flagged.

Rather than blind-guess a shifted dense range, ran one **coarse stride-4
scratch scout** (uncommitted, `/tmp` only) over the full no-input tail
(12306-13306, 250 captures) against the OFF oracle, then cross-referenced
every sha transition against `docs/turn10-notes.md` — the existing ON-era
dossier for this exact window, which already cites specific shas at specific
ON ticks (kickoff-text-settle, message-transition shas, HP-drain windows,
the "It's super effective!" hold, the settled turn-11-menu sha, and even a
documented single-tick idle-bob blip). Every one of those cited shas turned
up byte-identical in the OFF scout, just earlier — turning "scout landmarks"
into a direct byte-for-byte cross-check instead of a guess, and pinpointing
exactly where to place the dense stride-1 windows before spending any oracle
budget on them.

### turn10-rockslide-off.json + turn10-rockslide-off-b.json (Onix ROCK_SLIDE, Pidgeotto ← target)

Commands:
```sh
bin/oracle run tools/compare/traces/turn10-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn10-rockslide-off-b.json -o <dir>
```

Sibling: `turn10-rockslide.json` (ON-era, captureFrames span 12345-13306).
Split into two OFF files because the actual dynamic range found by the scout
(12546-12930, see below) is 385 ticks — over the oracle's 256-per-request
cap — same precedent as `turn9-quickattack-b`:

| New file | Capture range (stride) | Oracle captures |
| --- | --- | --- |
| `turn10-rockslide-off.json` | 12546–12800 (1) | 255 |
| `turn10-rockslide-off-b.json` | 12800–12930 (1) | 131 |

- **12546–12561**: ROCK_SLIDE's message-box-open transition, changing sha
  almost every frame. The exact 4-sha sequence `739aa4ce2f99`→`0b067c2ab6fb`→
  `c780691a9702`→`b1c3ca06760f` at OFF ticks **12543-12546** (captured in the
  widened aerialace trace, see below — this transition's start overlaps that
  file's tail) is **byte-identical** to `docs/turn10-notes.md`'s own cited
  "message-box transition into 'ONIX used ROCK SLIDE!'" sequence, there cited
  at **ON ticks 12562-12565** — same 4 shas, same order, landing here ~19
  ticks earlier.
- **12562–12605**: kickoff text held flat (`6a8a21d232da`, 44 ticks) — this
  sha is **byte-identical** to the ON dossier's own citation for "ROCK_SLIDE
  kickoff text holds through the impact animation" (there ON ticks
  ~12581-12587before the animation). **No rock-prop content appears** in
  this held span — under OFF the hold runs straight into the generic
  wobble/HP-drain below instead of the ON dossier's own much longer
  "12588-~12780" span (which is padded out by ROCK_SLIDE's own rock-prop
  drop animation, class c) — confirming the class-(c)-absence rule for
  ROCK_SLIDE a second time (turn9-rockslide-off was the first), this turn's
  own spot-check.
- **12606–12645**: generic healthbox-wobble/flicker four-way alternation
  (`317f6f46998e`/`699a05c5413b`/`3d5792280445`/`d2d13e0e77b9`, then
  `fa297869b83d`/`6a8a21d232da`) — Scene-agnostic, same shape as previously
  documented in this arc.
- **12646–12689**: HP-drain (Pidgeotto), changing sha nearly every frame —
  ordinary drain cadence.
- **12689–12765**: flat (`54cbcb4fc2a4` held 76 ticks) — "It's super
  effective!" result text settled, same duration order-of-magnitude as
  turn9-rockslide's own 76-tick hold at the mirrored point in that turn.
- **12766**: `25874032e009` — text-clear begins; **byte-identical** to the ON
  dossier's own citation for this exact step ("secondary-effect/turn-end,
  text clears"), there cited at ON tick 12878/12892 — lands here ~112-126
  ticks earlier.
- **12773**: `e28bc5375a15` — settled "What will ONIX do?" turn-11 menu;
  **byte-identical** to the ON dossier's own citation (ON ticks
  12899/12901/13306) — the largest compression yet in this arc, up to ~533
  ticks earlier depending which ON citation is used as the reference point,
  continuing the compounding-compression pattern the previous slice
  documented (compression grows the further into a turn/no-input stretch the
  content sits).
- **12774**: `63e2d272402d` — one-tick blip; **byte-identical** to the ON
  dossier's own cited "single-tick pixel blip at turn-11 menu rest...
  consistent with... Onix on-field idle-bob sprite animation," there at ON
  tick 12900. Confirms this pre-existing Scene-agnostic mechanism reproduces
  under OFF too.
- **12775–12930** (spanning the rest of `-off.json` plus all of `-off-b.json`):
  the idle-bob cycle continues cleanly — the same four shas
  (`e28bc5375a15`/`fdfbd14d06b5`/`4cb8009fcb8f`/`63e2d272402d`) repeat with a
  ~36-37-tick period, plus rare single-tick anomalies (`ca8165a07a63`,
  `a57fbc581b11`) consistent with a second, slower periodic element. No new
  narrative content appears anywhere in this span — a strong settle
  confirmation (3+ full bob cycles captured in `-off-b.json` alone), unlike
  the ON pin's own sparse tail sampling (12930/12937/.../13306) which could
  easily have aliased onto the same phase of the bob cycle by luck.
- **Desync verdict: none.** Every distinctive sha the ON dossier names for
  this window reproduces byte-identical under OFF, only shifted earlier
  (19 to ~530 ticks depending how deep into the no-input stretch); no
  move-specific ROCK_SLIDE content (rock-prop animation) appears anywhere —
  confirms the class-(c)-absence rule for ROCK_SLIDE a second time this
  program.
- **App baseline**: `turn10-rockslide-off.json` → **19/255**;
  `turn10-rockslide-off-b.json` → **0/131**. Both low as expected (app still
  runs ON-fit class-c/timing code); not chased.
- **Determinism**: `turn10-rockslide-off.json` re-run twice back-to-back,
  **0/255 sha mismatches**.
- **Range-choice rationale**: the scout showed the window's actual content
  fully settles by OFF tick ~12773, while the ON pin's own captureFrames
  reach out to 13306 — 533 ticks of the ON pin's own range is dead idle-bob
  cycling with zero new content once cross-referenced. The dense pins
  deliberately stop at 12930 (3+ confirmed bob cycles) rather than chasing
  the ON pin's own endpoint. Starting point 12546 was chosen because that's
  exactly where AERIAL_ACE's own settled result text (`0802bec48f53`, see
  below) transitions into ROCK_SLIDE's kickoff — i.e. the natural boundary
  between the two moves' own windows, found precisely (not guessed) from the
  widened aerialace trace's own tail.

### turn11-featherdance-off.json + turn11-rockslide-off.json (Pidgeotto FEATHER_DANCE / Onix ROCK_SLIDE)

Commands:
```sh
bin/oracle run tools/compare/traces/turn11-featherdance-off.json -o <dir>
bin/oracle run tools/compare/traces/turn11-rockslide-off.json -o <dir>
```

Siblings: `turn11-featherdance.json` (ON range 13352-13529, already dense) and
`turn11-rockslide.json` (ON range 13530-14340, sparse). Both share
byte-identical `segments` (14340 total, 96 segments); last button fires at
13338-13340, then a 1000-tick no-input stretch carries both moves to
completion — same shape as turn 10. `docs/turn11-notes.md` is an
exceptionally detailed existing ON dossier for this exact window (per-tick
sha citations for nearly every boundary), so this round's scout (coarse
stride-4 over 13340-14340, uncommitted `/tmp` scratch) was almost entirely a
byte-for-byte cross-check against it rather than fresh discovery.

| New file | Capture range (stride) | Oracle captures |
| --- | --- | --- |
| `turn11-featherdance-off.json` | 13340–13530 (1) | 191 |
| `turn11-rockslide-off.json` | 13530–13785 (1) | 256 |

**Headline finding — FEATHER_DANCE shows ~zero compression this turn**, unlike
every move in this program so far: `docs/turn11-notes.md` §5 itself
documents that Onix's ATK stat is already at the floor, so the stat-change
handler **short-circuits before its own animation step** — there is no
class-c animation for OFF to strip, so nothing compresses:
- **13342–13351**: settled post-confirm submenu, sha `528d4d92a33e` —
  **byte-identical AND same absolute tick** as the ON dossier's own citation
  (ON 13341-13351).
- **13352–13381**: kickoff-text typing letter-by-letter, settling to
  `492ccf070e80` at OFF **13382** — only **7 ticks earlier** than the ON
  dossier's own citation (ON 13389), the smallest shift measured in this
  program so far.
- **13422**: message-box transition into the ATK-floor message begins —
  **exact same absolute tick** as the ON dossier's own citation (ON 13422,
  sha `b60ceefdb735`) — **zero compression**.
- **13449**: settles to `82aa7ca871df` — **exact same absolute tick** as the
  ON dossier's own citation (ON 13449) — **zero compression** for this
  move's entire sequence, holds flat through **13529** (80 ticks, matching
  the ON dossier's own measured hold span exactly).
- **13530**: transitions toward ROCK_SLIDE's own kickoff (`b60ceefdb735` —
  the same sha as the earlier 13422 transition-frame, a reused
  content-agnostic box-transition graphic, not a coincidence worth flagging
  as new content).
- **App baseline**: **189/191 frames matched** — far higher than every other
  window in this program, because there is no class-c content or timing
  drift for the app to get wrong here; not chased, still an honest number.
- **Determinism**: re-ran twice back-to-back, **0/191 sha mismatches**.

**turn11-rockslide-off.json — compression resumes once ROCK_SLIDE's own
animation-gated content starts:**
- **13530–13548**: message-box transition + kickoff-text typing.
- **13549**: settles to `aa0bf4647996` — **exact same absolute tick** as the
  ON dossier's own citation (ON 13549) — still zero compression (pure
  text-typing, no animation yet).
- **13549–13592**: held flat (43 ticks) — crit/spread rolls resolve silently
  underneath, matching the ON dossier's own "RNG rolls don't need a pixel
  change" rule.
- **13593–13612**: generic wobble alternation (`00a2c9955417`/
  `773530fb2e95`/`63f7c19b5cdb`/`a351b9c785eb`) — **no rock-prop content
  appears**, the fourth independent confirmation in this program of the
  class-(c)-absence rule for ROCK_SLIDE (turns 9 and 10 were the first two;
  this is turn 11's own spot-check, exactly as the assigned brief asked for).
- **13622**: round-trip back to `aa0bf4647996` — **byte-identical** to the ON
  dossier's own cited round-trip ("the animation loop completes and the
  frame returns to the exact same kickoff-text sha... right as the HP-drain
  begins"), there at ON tick 13734 — **112 ticks earlier** here.
- **13630**: `27ca305dbfa8` — **byte-identical** to the ON dossier's own
  "still yellow" healthbar citation (ON 13737-13739) — **107-109 ticks
  earlier**.
- **13633**: `579f9eae60b7` — **byte-identical** to the ON dossier's own
  "now red" healthbar **color-zone-crossing** citation (ON 13740+) — **107
  ticks earlier**. A third independent data point (after turn9 Onix, turn11
  ON-era Pidgeotto) landing on the same crossing sha, now confirmed
  Scene-agnostic too.
- **13649**: `aeb115ac712f` — **byte-identical** to the ON dossier's own
  "drain done" citation (ON 13756-13761) — **107-112 ticks earlier**.
- **13675**: `6ccb690b57b3` — **byte-identical** to the ON dossier's own
  ""It's super effective!" text holds" citation (ON 13787-13857) — **112-182
  ticks earlier**.
- **13752**: `cf34cbe53962` — **byte-identical** to the ON dossier's own
  "text starts clearing" citation (ON ~13858-13865) — **106-113 ticks
  earlier**.
- **13759-13760**: `a173d834997e`/`db251fad6c61` — **byte-identical** to the
  ON dossier's own settled-turn-12-menu citation (ON ~13895-13898) — **135-138
  ticks earlier**, the deepest compression point in this window, consistent
  with the "compression peaks at the final post-animation settle" pattern
  turn10 established.
- **13761–13785**: idle-menu cycling continues (`a173d834997e`/
  `55822ddf41b2`/`1b57eb51635c`) — **byte-identical** to the ON dossier's own
  "cycling through a slow multi-frame idle animation... at ~70-175-tick
  intervals" citation — confirms this Scene-agnostic idle loop reproduces
  under OFF too.
- **Desync verdict: none** for both files. Every distinctive sha the ON
  dossier names for this window reproduces byte-identical under OFF, with
  compression ranging from **0 ticks** (pure text-typing-driven points) to
  **~138 ticks** (the deepest post-animation settle) — same shape turn 10
  established, this turn's own spot-check confirms it generalizes.
- **App baseline**: **38/256 frames matched**.
- **Determinism**: re-ran twice back-to-back, **0/256 sha mismatches**.
- **Range-choice rationale**: `docs/turn11-notes.md`'s existing per-tick sha
  citations made this the fastest window in the program to scout — nearly
  every landmark was a direct byte-for-byte lookup rather than fresh
  discovery, so the coarse scout mainly confirmed *where* (not *whether*)
  each cited sha reproduces under OFF. `turn11-rockslide-off.json`'s range
  (13530-13785, 256, the oracle's per-request cap) was chosen to land the
  settled turn-12 menu plus a few idle-cycle ticks inside a single file,
  unlike turn10-rockslide which needed a second `-b` file — turn 11's total
  active-content span (13530→13760, 230 ticks) is smaller than turn 10's
  (12546→12773, 227 ticks, but turn 10 needed 3+ full idle-bob cycles as
  extra settle confirmation, which this window's leaner single-shot check
  didn't reproduce past the second sha change — a smaller settle-confirmation
  than turn 10 got, flagged here for honesty, not fabricated as equally deep).

### turn12-aerialace-off.json + turn12-rockslide-miss-off.json (Pidgeotto AERIAL_ACE / Onix ROCK_SLIDE — a MISS this turn)

Commands:
```sh
bin/oracle run tools/compare/traces/turn12-aerialace-off.json -o <dir>
bin/oracle run tools/compare/traces/turn12-rockslide-miss-off.json -o <dir>
```

Siblings: `turn12-aerialace.json` (ON range 14383-14629) and
`turn12-rockslide-miss.json` (ON range 14625-15374, sparse). Both share
byte-identical `segments` (15374 total, 100 segments); last button fires at
14372-14374, then the usual 1000-tick no-input stretch. `docs/turn12-notes.md`
is this turn's own detailed ON dossier, and per its own RAM-proven finding
turn 12's ROCK_SLIDE **misses** — a genuinely different content shape from
turns 9-11 (miss skips crit/spread/secondary rolls **and**, per the dossier's
own probe, "zero active rocks, zero shakes, zero [animation-driver reads]"
even under ON), making this the cleanest possible spot-check for whether
compression tracks animation content or just elapsed ticks.

| New file | Capture range (stride) | Oracle captures |
| --- | --- | --- |
| `turn12-aerialace-off.json` | 14374–14620 (1) | 247 |
| `turn12-rockslide-miss-off.json` | 14620–14875 (1) | 256 |

- **14376**: `713aa10cfa28` — **byte-identical** to the ON dossier's own
  "submenu open, settled... / confirm-press transient" citation (ON
  14346-14383) — lands inside the ON pin's own range, effectively **zero
  shift** this early.
- **14384–14411**: AERIAL_ACE kickoff-text typing letter-by-letter.
- **14412**: settles to `ca8bf06021b4` — **byte-identical** to the ON
  dossier's own citation for "kickoff text held, through a hit-flash flicker
  and into the HP-drain onset" (ON 14412) — **same absolute tick**, zero
  shift.
- **14456–14485**: hit-flash-flicker alternation
  (`b30f960778d7`/`f39e1ff2b572`/`b48f58d68894`/`36b855becaef`, plus
  `5a8c1fbe5723`/`ca8bf06021b4` recurring) — matches the ON dossier's own
  cited hit-flash shape (Onix's sprite recolored orange/inverted) — this is
  the shared `Cmd_hitanimation`-family reaction (already confirmed
  Scene-agnostic in turn 9), **not** AERIAL_ACE's own move-specific content;
  no lunge/clone/slice/field-darken appears, matching `docs/
  aerial-ace-notes.md`'s prediction and turn10-aerialace-off's own prior
  confirmation — **this turn's own spot-check, as the brief asked for**.
- **14500**: `5b1e7929cda0` — **byte-identical** to the ON dossier's own
  "HP-drain (Onix)... settles" citation (ON 14519-14524) — **19-24 ticks
  earlier**.
- **14529**: `376db54b61d2` — **byte-identical** to the ON dossier's own
  ""It's not very effective.." held" citation (ON 14552-14629, 78-tick hold)
  — **23 ticks earlier**; holds here through **14610** (82 ticks), matching
  the ON dossier's own hold duration closely.
- **14620**: transitions toward ROCK_SLIDE's own kickoff.
- **App baseline**: **120/247 frames matched** — notably higher than the
  turn 9-11 hit-move windows, because AERIAL_ACE's own animation body was
  already largely stripped from the app's rendering at these frames by
  coincidence of the app's current timing constants; not chased.
- **Determinism**: re-ran twice back-to-back, **0/247 sha mismatches**.

**turn12-rockslide-miss-off.json — the miss (near-zero extra compression, confirming compression tracks stripped animation content, not raw elapsed ticks):**
- **14620–14629**: message-box transition + kickoff-text typing into "ONIX
  used ROCK SLIDE!".
- **14630**: settles to `760b178a4259` — **byte-identical** to the ON
  dossier's own ""ONIX used ROCK SLIDE!" held (the miss — no further
  rolls)" citation (ON 14649-14685) — **19-55 ticks earlier**; holds through
  **14666** (37 ticks), close to the ON dossier's own 36-tick hold.
- **14667–14685**: transition into "ONIX's attack missed!".
- **14686**: settles to `1aabdcb03ee5` — **byte-identical** to the ON
  dossier's own headline ""ONIX's attack missed!" held" citation (ON
  14705-14780) — **19 ticks earlier**; holds through **14761** (75 ticks),
  matching the ON dossier's own 75-tick hold **almost exactly** — the
  tightest hold-duration match in this program, because a miss has no
  animation content at all for OFF to strip out of the hold.
- **14762**: `0e26952eb6a2` — **byte-identical** to the ON dossier's own
  "turn-13 resettle transition" first sub-frame citation (ON 14781-14789) —
  **19 ticks earlier**.
- **14769-14771**: `882e3c818195`/`5646ba2c6ca9` cycle onset — **byte-identical**
  to the ON dossier's own "turn-13 menu settled" citation (ON 14790-14798) —
  **~19-29 ticks earlier**, by far the **smallest** final-settle compression
  measured in this program (turns 10-11 showed 112-138 ticks at the
  equivalent point). Directly confirms the mechanism: compression tracks how
  much class-c/animation-gated content the ON profile actually plays for
  that specific outcome, not a fixed drift-per-tick — a miss has almost none
  of it, so almost nothing compresses away.
- **14780–14874**: idle-menu cycling continues
  (`f3d4f434717a`/`bd3cee3f4041`/`5646ba2c6ca9`/`882e3c818195`, plus rare
  `66a569d21ce7`) — **byte-identical** to the ON dossier's own "turn-13 menu
  idle, cycling... among 882e3c818195/bd3cee3f4041/5646ba2c6ca9/f3d4f434717a"
  citation — same 4 shas, confirming the idle loop is Scene-agnostic here
  too.
- **Desync verdict: none.** Every distinctive sha the ON dossier names
  reproduces byte-identical under OFF. **No move-specific content appears
  for either half of this turn** — AERIAL_ACE's hit-flash is the shared
  generic reaction (not its own class-c body), and ROCK_SLIDE's miss plays
  zero rock/shake content under ON already, so OFF has nothing extra to
  strip; this turn is the cleanest confirmation yet that the class-(c)-
  absence rule and the compounding-compression pattern are two faces of the
  same mechanism.
- **App baseline**: **75/256 frames matched**.
- **Determinism**: re-ran twice back-to-back, **0/256 sha mismatches**.
- **Range-choice rationale**: `docs/turn12-notes.md`'s own dense per-tick
  citations (plus a §3 "engine-readiness probe" table of fixed
  pressTick-relative delay constants) again made this mostly a byte-for-byte
  cross-check. `turn12-aerialace-off.json`'s range (14374-14620) and
  `turn12-rockslide-miss-off.json`'s range (14620-14875, 256, the cap) meet
  at the natural AERIAL_ACE→ROCK_SLIDE kickoff boundary, same convention as
  every other window this slice. The rockslide-miss file's tail (14780-14875,
  ~1.3 idle-cycle periods at this turn's own ~72-tick period) is a shorter
  settle-confirmation than turn 10's 3+-cycle `-b` file — flagged as a
  leaner check, not fabricated as equally deep, consistent with this
  slice's time budget favoring breadth (covering all remaining windows)
  over redundant depth on an already-well-established mechanism.

### turn10-menu-off.json (banked) + a flagged finding about the other three menu windows (item 4, attempted)

With priorities 1-3 done and time remaining, attempted item 4 (lowest
priority: `turn9-menu`/`turn10-menu`/`turn11-menu`/`turn12-menu`). The
assigned brief predicted these would be "likely near-identical... since no
compression has happened yet at that point in the sequence" — **this
session's own live cross-check against the ON oracle found that assumption
is only true for `turn10-menu`,** and even then not perfectly. The other
three show a genuinely different phenomenon worth flagging precisely rather
than either rushing a wrong "confirmed identical" claim or silently
dropping the item.

**Methodology difference from every other window this slice**: rather than
cross-referencing written dossier citations, ran the **original ON-era
trace files live** against `--profile battle-scene-on` (the ON oracle at
8012, exported as `POKEBENCH_ANIMATION_ORACLE_URL`) side-by-side with a
fresh OFF run of the same `captureFrames`, and diffed the two manifests
directly — the most direct possible cross-check, since all four menu files'
`captureFrames` were already fully dense (stride 1) in their ON-era form.

**Banked: `turn10-menu-off.json`** (verbatim ON captureFrames, 12262-12344,
83 captures) — command: `bin/oracle run tools/compare/traces/
turn10-menu-off.json -o <dir>`.
- **81/83 frames byte-identical to a live ON run at the same absolute
  ticks** (checked directly, not inferred).
- The only two mismatches: (1) tick 12269 vs ON's 12269 — OFF shows the
  ON-12269 sha one tick late (at OFF 12270); (2) ON has a single-tick idle
  blip (`e0f0aed31be8`) at tick 12280 that's simply **absent** under OFF
  (the preceding sha holds straight through instead). Both are consistent
  with a **sub-10-tick idle-bounce phase difference**, not new/different
  content — every sha OFF produces also appears in the ON run, just
  occasionally one tick off during an idle hold.
- **Desync verdict: none.** Same content, trivial idle-bounce phase noise.
- **App baseline**: **81/83 frames matched**.
- **Determinism**: re-ran twice back-to-back, **0/83 sha mismatches**.

**Not banked — `turn9-menu`, `turn11-menu`, `turn12-menu`: idle-bounce phase
misalignment is much larger and the mechanism needs proper attribution
before pinning, not a quick spot-check.** Live ON-vs-OFF diffs on their own
(unmodified) verbatim captureFrames:

| File | Common frames | Mismatches |
| --- | --- | --- |
| `turn9-menu.json` | 111 | 56 |
| `turn11-menu.json` | 56 | 46 |
| `turn12-menu.json` | 46 | 12 |

For `turn9-menu` (10818-10928), per-tick dedup shows the ON and OFF
sequences carry the **same set of shas** but the settled-menu idle-bounce
(`docs/turn9-notes.md`'s own §5 citation: "turn-9 settled menu persists...
same resting frame `battle1-turn8-dense.json` itself ends on", plus a
`LEFT` press at 10858-10860 and the move-confirm `A` at 10869-10877) is
**out of phase by up to 9 ticks** between the two profiles for the pure-idle
portion (10818-~10868: ON's `bda161ec91f5`/`d75ee6c58ea8`/`87e19f2d77e8`/
`4eb7db7c26ca` cycle at ticks 10833/10842/10851/10860 vs OFF's *same four
shas* at 10842/10851/10860/10869 — a consistent -9 lag, i.e. **OFF is
LATER, not earlier**, the opposite direction from every move-effect window
this program has found). Once the `LEFT`/`A` button-press-driven content
takes over (fixed absolute-frame positions, as established throughout this
program), the two profiles **snap to exact zero-shift alignment** at tick
10874 and stay byte-identical for the rest of the window.

`turn11-menu` and `turn12-menu` show the same *shape* of finding (same set
of shas present in both profiles, reordered/phase-shifted relative to each
other, re-converging once real button input takes over) but with a
same-sha-different-relative-order wrinkle that needs care to read correctly:
some shas (e.g. `528d4d92a33e`, `e280e37fc2e9`) legitimately recur at
**multiple distinct narrative points** (a generic, content-independent
box-transition sub-frame, same phenomenon already noted for
`b60ceefdb735` in turn 11's own move-window findings above) — a naive
"first sha match" diff can misattribute these. This needs the same
per-tick, RAM-cross-checked treatment `turn9/10/11/12-notes.md` already
gave their own ON-era windows, not a quick sha-diff, to state a correct
per-tick shift table.

**Working hypothesis (not yet confirmed — flagged for whoever picks this
up)**: the settled-menu idle-bounce is Scene-agnostic (matches every prior
finding in this program) and genuinely periodic; its **phase** at the start
of any given turn's menu window is inherited from however much compression
already accumulated in *upstream* turns (1-8 for turn 9's own menu, which
are out of this worker's/this program's scope — see `AGENTS.md`'s lane
table, main lane owns "another canonical Battle 2 turn... after tick
33331" but turns 1-8 predate this rank-5 arc entirely and were never
Scene-OFF-pinned). That upstream, out-of-scope phase inheritance — not a
new bug in turns 9-12 — is the most likely explanation for why the "no
compression yet" assumption doesn't hold pixel-for-pixel here, even though
the **content itself never diverges** (no new/different battle line
appeared in any of the four windows; §"Desync verdict" would be **none**
once the phase attribution is done correctly). Not stated as certain,
because the actual upstream turns were not re-examined this session
(time-boxed) — a hypothesis for the next slice to confirm or refute, not a
resolved finding.

- **App baseline / determinism**: not run for the three unbanked files —
  pinning a `captureFrames` window before its own tick-shift is understood
  would risk banking a *wrong* pin (an app baseline against a mis-shifted
  window is worse than no baseline at all).
- **Scope honesty**: these three scratch trace files were **not committed**
  (removed after this investigation) — only `turn10-menu-off.json` is
  banked. This should NOT be treated as "menus are low-risk, skip them
  entirely" for the next slice — the finding above is real, reproducible
  data (specific tick citations, specific sha lists), not a shrug.

### turn10-aerialace-off.json — settle extended (item 3)

Command: `bin/oracle run tools/compare/traces/turn10-aerialace-off.json -o <dir>`

Widened this file's own `captureFrames` from 12345-12460 (116 captures, its
state at the end of the previous slice) to **12345-12550 (206 captures)** —
still dense stride-1, still under the 256 cap — specifically to reach past
the point flagged as "still mid-transition" last time.

- **12461**: settles to `0802bec48f53` — **byte-identical** to the ON
  dossier's own cited sha for "'It's not very effective..' text holds," there
  at ON tick 12540. Lands here **79 ticks earlier** (12461 vs 12540).
- **12461–12542**: holds flat (82 ticks) — the settle the previous slice
  asked for; comparable order-of-magnitude to the ON dossier's own measured
  hold span (12470-12540, ~70 ticks).
- **12543–12546**: transitions into ROCK_SLIDE's own kickoff box-open —
  the exact 4-sha sequence cited above (byte-identical to the ON dossier's
  12562-12565 citation), confirming this is genuinely AERIAL_ACE's own
  settle-then-handoff, not an artifact of an arbitrarily-chosen cutoff.
- **Settle tick recorded**: **OFF tick 12461**, sha `0802bec48f53`, holding
  through **12542** (82 ticks) before ROCK_SLIDE's box-open begins.
- **App baseline**: **82/206 frames matched** (up from 19/116 pre-extension —
  expected, the added range is mostly a long flat hold the app already
  happens to render close to correctly at those exact frames; not chased,
  still an honest low-context number for the window as a whole).
- **Determinism**: re-ran twice back-to-back, **0/206 sha mismatches**.

New files, each built from its ON-era sibling's **unmodified `segments`**
(verbatim button stream — no input-timing edits, per the hard constraint)
plus `"oracleProfile": "battle-scene-off"`, `"appRoute": "canonical-recorded"`,
and a widened `captureFrames` window:

| New file | Sibling (segments source) | Capture range (stride) | Oracle captures |
| --- | --- | --- | --- |
| `tools/compare/traces/turn9-quickattack-off.json` | `turn9-quickattack.json` | 10818–11050 (1) | 233 |
| `tools/compare/traces/turn9-quickattack-b-off.json` | `turn9-quickattack-b.json` | 10900–11130 (1) | 231 |
| `tools/compare/traces/turn9-rockslide-off.json` | `turn9-rockslide.json` | 11090–11345 (1) | 256 |
| `tools/compare/traces/turn10-aerialace-off.json` | `turn10-aerialace.json` | 12345–12460 (1) | 116 |

**Why these ranges, not the sibling's own `captureFrames` verbatim:** the
ON-era pins place their dense sampling around ON-timing landmarks
(`turn9-rockslide.json`'s own range is 11100–11365 with large gaps, e.g.
11160→11270). Per the assigned brief, OFF runs faster and a given narrative
beat lands at a **lower** absolute tick than its ON citation (confirmed
directly below), so widening had to bias earlier and go fully dense
(stride 1, no gaps) rather than trust the ON pin's own landmark placement —
"generously covering," not guessing a shifted landmark position. All four
ranges stayed at or under the oracle's 256-capture-per-request cap, so no
window needed a coarser stride.

## Per-window findings

Every claim below is this session's own fresh `bin/oracle run` output against
`POKEBENCH_ORACLE_URL` (confirmed 8014/`battle-scene-off` via `bin/oracle
--profile battle-scene-off info` succeeding this session), diffed by
sha256 dedup over the full manifest — not assumed from the scout doc's ON-era
citations (those are cross-referenced only for their own tick/sha claims).

### turn9-quickattack-off.json (Pidgeotto QUICK_ATTACK, Onix ← target)

Command: `bin/oracle run tools/compare/traces/turn9-quickattack-off.json -o <dir>`

- **10818**: baseline (pre-move, matches the ON pin's own opening frame).
- **10818–10912**: message-box open/kickoff-text typing, changing sha almost
  every frame (ordinary text-typing cadence).
- **10912–10955**: **flat** (`97f91ce7ec45` held) — the hitsplat/shake window
  (ON dossier cites this episode at ON ticks 10934–10943) is **absent** under
  OFF, confirming `docs/rank5-effect-visibility-scout.md` §1's
  `attackanimation`-gate rule directly: no class-c content in this span.
- **10956–10976**: generic healthbox-wobble + target-flicker alternation
  (`17807fbabf19`/`118674761faa`/`90c586364261`/`ccb02560610a`, 3-block-of-4
  cadence) — **present**, matches the ON dossier's own Episode-2 shape,
  confirming the `Cmd_hitanimation` pair is Scene-agnostic.
- **10991–11025**: HP-bar drain (changing sha almost every frame, ordinary
  drain cadence).
- **11026**: settles to `12b7204322f9` and **holds flat through 11050** (end
  of this trace's own window) — this is the exact sha
  `docs/rank5-effect-visibility-scout.md` cites for the ON dossier's
  "not very effective" settled-hold message, at ON tick **11028**; here it
  lands at OFF tick **11026**, 2 ticks earlier — content-identical, just
  time-shifted, and this early in the sequence the shift is still small
  (compression compounds turn-by-turn, see turn9-rockslide below).
- **Desync verdict: none.** Same move (QUICK_ATTACK), same "not very
  effective" result text, same generic hit-reaction/HP-drain shape as the
  ON dossier — only the move's own animation body (class c) is missing, as
  source-predicted, not a different battle line.
- **App baseline** (honest, not chased): `npm run compare -- tools/compare/
  traces/turn9-quickattack-off.json --summary` → **108/233 frames matched**.
  Low as expected — the app still renders class-c content and ON-fit timing
  constants for this window; re-timing/retirement is later main-lane work.
- **Determinism**: re-ran twice back-to-back, **0/233 sha mismatches**.

### turn9-quickattack-b-off.json (QUICK_ATTACK settle → ROCK_SLIDE kickoff)

Command: `bin/oracle run tools/compare/traces/turn9-quickattack-b-off.json -o <dir>`

Same underlying content as quickattack-off's tail (10900–11026, identical
shas — expected, it's the same replay continuing), extended to also capture
ROCK_SLIDE's own kickoff:

- **11026–11107**: flat (`12b7204322f9` held) — the QUICK_ATTACK result text
  sits settled, waiting on the fixed inter-move pause.
- **11108**: `95efd4fe0a13` — this is the ON dossier's own cited
  "ONIX used ROCK SLIDE!" box-open transition sha, cited at **ON tick 11110**;
  here it lands at OFF tick **11108**, 2 ticks earlier.
- **11108–11127**: kickoff-text typing, settling to `81aaa90be45f` by 11127
  (matches the ON dossier's own cited kickoff-text-held sha for ROCK_SLIDE).
- **Desync verdict: none.** ROCK_SLIDE is the next move in the same battle
  line (Onix's counter after Pidgeotto's QUICK_ATTACK), same message text.
- **App baseline**: **141/231 frames matched**.
- Re-run alongside quickattack-off's own re-run (see above); this trace
  shares its first ~127 frames' shas with quickattack-off's tail 1:1, an
  incidental second determinism check at no extra oracle cost.

### turn9-rockslide-off.json (Onix ROCK_SLIDE, the row's third named move)

Command: `bin/oracle run tools/compare/traces/turn9-rockslide-off.json -o <dir>`

- **11090–11107**: flat (`12b7204322f9`, QUICK_ATTACK's own settled result
  text still held).
- **11108**: ROCK_SLIDE kickoff box-open (`95efd4fe0a13`, see above).
- **11127–11190**: kickoff text held (`81aaa90be45f`) with the same generic
  wobble/flicker alternation (`6f20bbbb7382`/`87a78130cc35`/`54dc8a804ef5`/
  `c0658a4b5394`) breaking it periodically — **no rock-prop content appears
  anywhere in this span**, confirming the scout's §2 finding that
  ROCK_SLIDE's own rock-prop drop animation (class c) is absent under Scene
  OFF (the ON dossier cites the rock-prop's own visible window at ON ticks
  ~11150–11274; here the equivalent span is flat/generic only).
- **11192–11252**: HP-bar drain + "super effective"-class message settle
  (changing sha almost every frame, ordinary cadence).
- **11252–11328**: flat (`4ac2608f8bab` held 76 ticks) — result text settled,
  waiting on the fixed inter-turn pause.
- **11329–11336**: transition to the next menu; **11336** lands on
  `f97541a1f42d` — **byte-identical** to the scout doc's own cited sha for
  the ON dossier's "fully settled turn-10 menu," which ON doesn't reach until
  **render 11450**. Here it lands **114 ticks earlier**, at OFF tick 11336 —
  reproducing the scout's own headline compression finding exactly, this time
  from a purpose-built dense (stride-1, gap-free) capture rather than the
  scout's stride-2 scratch trace.
- **11337**: one-tick blink (`fbc2f019ca83`, likely a cursor/blink frame),
  **11338**: back to `f97541a1f42d` — held for the rest of this window.
- **Desync verdict: none.** Full turn-9 line (QUICK_ATTACK → ROCK_SLIDE →
  turn-10 menu) reproduces the ON dossier's own cited content byte-for-byte,
  just compressed ~114+ ticks earlier by the time the sequence reaches the
  turn-10 menu.
- **App baseline**: **37/256 frames matched** — lowest of the four (expected:
  this window spans the most class-c-affected content, so the app's current
  ON-fit rock-prop/timing code diverges most here).
- **Note on range choice**: 11090–11345 (256, the oracle's per-request cap)
  was chosen to start just before the confirmed 11108 kickoff and end just
  past the confirmed 11336 settle; the window intentionally does **not**
  reach as far as the ON pin's own end (11365) since the settle already
  lands well inside 11345 — confirms "widen earlier, not later" was the
  right call here: the ON pin's own dense clusters (its 11270–11305 and
  11305–11345 blocks) were chasing landmarks that, under OFF, had already
  happened tens of ticks earlier.

### turn10-aerialace-off.json (Pidgeotto AERIAL_ACE, Onix ← target)

Command: `bin/oracle run tools/compare/traces/turn10-aerialace-off.json -o <dir>`

- **12345**: kickoff sha `5d89f7e89485` (matches the ON-era pin's own opening
  frame — turn10's move-selection button press lands at the **same**
  absolute tick under both profiles, since it's driven by a fixed frame-count
  wait from the previous button, not by animation completion; only
  **mid-turn, no-further-input** content compresses, as turn9-rockslide's
  180-vs-triggered-kickoff case above shows).
- **12388–12408**: generic wobble/flicker alternation (`4a9880045818`/
  `3cdfb6acec87`/`08e138c483a8`/`15e1ee397a1a`) — no lunge, clone, slice, or
  field-darken content, matching `docs/aerial-ace-notes.md`'s five named
  ON-only mechanisms being entirely class-c.
- **12409**: returns to **the exact same sha as 12345** (`5d89f7e89485`) —
  screen is pixel-identical to its own pre-effect state, exactly reproducing
  the scout doc's own cited finding (there cited from the unmodified
  ON-era pin re-run, here reproduced independently from this session's own
  purpose-built trace).
- **12423–12432**: HP-bar drain (changing sha almost every frame, ordinary
  cadence) — matches the ON-era pin's own capture range end (12437) closely;
  no compression is visible yet in this particular sub-window because it's
  the first move of turn 10 (compression accumulates through the turn, as
  the following result-message content 12438–12460 — extended past the
  ON-era pin's own 12437 endpoint to see where it settles — continues
  changing sha almost every frame, i.e. this window's tail still hadn't
  reached its own settled-message plateau by 12460; the next slice should
  extend further to find it before trusting a specific settle tick here).
- **Desync verdict: none.** Same move (AERIAL_ACE), same generic
  hit-reaction/HP-drain shape.
- **App baseline**: **19/116 frames matched**.
- **Scope honesty**: unlike the turn-9 triplet, this window's *own* settle
  tick was not pinned down this session (12460 is still mid-transition) —
  flagged, not fabricated.

## Commands (reproduce everything above)

```sh
# oracle ground truth — slice 1 (turn 9 triplet + turn10-aerialace)
bin/oracle run tools/compare/traces/turn9-quickattack-off.json -o <dir>
bin/oracle run tools/compare/traces/turn9-quickattack-b-off.json -o <dir>
bin/oracle run tools/compare/traces/turn9-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn10-aerialace-off.json -o <dir>

# oracle ground truth — slice 2 (turn10-rockslide, turn11, turn12, turn10-menu)
bin/oracle run tools/compare/traces/turn10-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn10-rockslide-off-b.json -o <dir>
bin/oracle run tools/compare/traces/turn11-featherdance-off.json -o <dir>
bin/oracle run tools/compare/traces/turn11-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn12-aerialace-off.json -o <dir>
bin/oracle run tools/compare/traces/turn12-rockslide-miss-off.json -o <dir>
bin/oracle run tools/compare/traces/turn10-menu-off.json -o <dir>

# honest app baseline (expected low except turn11-featherdance/turn10-menu, not chased)
npm run compare -- tools/compare/traces/<file>.json --summary

# determinism check pattern (repeated per file this slice, always 0 mismatches)
bin/oracle run tools/compare/traces/<file>.json -o /tmp/a
bin/oracle run tools/compare/traces/<file>.json -o /tmp/b
# diff manifests by sha256 per frame

# menu cross-check methodology (item 4) — live ON-vs-OFF diff, not doc citations
bin/oracle --profile battle-scene-on run tools/compare/traces/turn9-menu.json -o <on-dir>
bin/oracle run tools/compare/traces/turn9-menu-off.json -o <off-dir>
# (turn9-menu-off.json itself was NOT committed — see finding above; recreate
# by copying turn9-menu.json + oracleProfile: battle-scene-off if re-attempting)
```

## Remaining work for the next slice (not done here — honest gap, not silent)

**All nine move/result windows are now banked** (slice 1: turn9 triplet +
turn10-aerialace; slice 2: turn10-rockslide, turn11-featherdance,
turn11-rockslide, turn12-aerialace, turn12-rockslide-miss). Item 3
(turn10-aerialace's own settle) is also done — settle tick pinned at OFF
12461, sha `0802bec48f53`, holding 82 ticks.

Remaining for whoever picks up next:
- **turn9-menu, turn11-menu, turn12-menu** (item 4, lowest priority) — **not
  a quick "likely near-identical" spot-check as originally assumed.** This
  slice found real idle-bounce phase misalignment (up to 9-16 ticks,
  non-monotonic, opposite-direction from the move-window compression
  pattern) that needs proper per-tick attribution before pinning — see the
  full writeup and working hypothesis above (search "Not banked" in this
  doc). `turn10-menu` **is** banked (`turn10-menu-off.json`, 81/83
  byte-identical to a live ON run, the two mismatches are a trivial 1-tick
  idle-bounce blip) — it turned out to be the one genuinely simple case of
  the four.
- Once all 13 windows are banked (9 move/result + turn10-menu done; 3 menu
  windows remain, see above), the actual re-timing/retirement of the class-c
  call sites the scout doc named is main-lane `src/` work, out of scope for
  this side-lane doc.
- Minor open thread from this slice: the exact HP-drain duration comparison
  for turn10-rockslide's Pidgeotto drain (ON ~23 ticks vs. an eyeballed ~44
  in the OFF dense data) was noted but not tightened to an exact tick
  boundary — doesn't affect the desync verdict, flagged for precision only.

## Verification

Slice 1: `npm test` and `npm run build` green, four new trace files + this
doc, confirmed via `git status`.

Slice 2: `npm test` and `npm run build` re-run green (see commit history) —
no `src/` changes this session either. New files this slice: `turn10-
rockslide-off.json`, `turn10-rockslide-off-b.json`, `turn11-featherdance-
off.json`, `turn11-rockslide-off.json`, `turn12-aerialace-off.json`,
`turn12-rockslide-miss-off.json`, `turn10-menu-off.json`, plus `turn10-
aerialace-off.json` widened in place (item 3) and this doc updated. The
three menu-off scratch files for turn9/11/12 were created, investigated, and
removed (not committed) per the finding above.
