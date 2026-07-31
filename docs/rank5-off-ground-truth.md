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
# oracle ground truth
bin/oracle run tools/compare/traces/turn9-quickattack-off.json -o <dir>
bin/oracle run tools/compare/traces/turn9-quickattack-b-off.json -o <dir>
bin/oracle run tools/compare/traces/turn9-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn10-aerialace-off.json -o <dir>

# honest app baseline (expected low, not chased)
npm run compare -- tools/compare/traces/turn9-quickattack-off.json --summary
npm run compare -- tools/compare/traces/turn9-quickattack-b-off.json --summary
npm run compare -- tools/compare/traces/turn9-rockslide-off.json --summary
npm run compare -- tools/compare/traces/turn10-aerialace-off.json --summary

# determinism check (turn9-quickattack-off re-run twice, diffed by sha)
bin/oracle run tools/compare/traces/turn9-quickattack-off.json -o /tmp/a
bin/oracle run tools/compare/traces/turn9-quickattack-off.json -o /tmp/b
# 0/233 sha256 mismatches between /tmp/a and /tmp/b manifests
```

## Remaining work for the next slice (not done here — honest gap, not silent)

- **turn10-rockslide** (Onix's turn-10 counter — the row's biggest window,
  961-tick ON range with heavy internal gaps; needs its own landmark scout
  the way turn9-rockslide got here, not a blind stride-1 over the full ON
  range) plus **turn11-featherdance**, **turn11-rockslide**,
  **turn12-aerialace**, **turn12-rockslide-miss** — the remaining five of
  the nine move/result windows.
- **turn9-menu, turn10-menu, turn11-menu, turn12-menu** — lowest priority
  per the assigned brief; likely near-identical to their ON pins since they
  sit *before* any move fires in their turn (no compression has happened yet
  at that point in the sequence), but not verified this session.
- turn10-aerialace's own settle tick (see above) needs a wider capture past
  12460 to land precisely.
- Once all 13 windows are banked, the actual re-timing/retirement of the
  class-c call sites the scout doc named is main-lane `src/` work, out of
  scope for this side-lane doc.

## Verification

`npm test` and `npm run build` (run after this doc, see commit) — no `src/`
changes this session. New files only: the four `-off.json` traces above plus
this doc. `git status` shows only these five new files.
