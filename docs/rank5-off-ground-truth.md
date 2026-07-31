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
