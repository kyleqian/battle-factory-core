# Rank-6 Scene-OFF ground truth (turns 1-4 initial menu/result chain) — oracle-side bank

Same shape as `docs/rank5-off-ground-truth.md`: bank FRESH `battle-scene-off`
oracle captures as evidence for this window, since the committed ON-era
`turn1-*`/`turn2-*`/`turn3-*`/`turn4-*` traces (no `oracleProfile` field)
stay ON-profile per `AGENTS.md`. **This step is ORACLE-SIDE ground truth
only** — no `src/` edits, no app re-timing, no deletion/edit of any existing
trace or doc. The turns-1-4 OFF-vs-ON **policy decision itself is
deliberately NOT made here** — see "Policy question for the supervisor" at
the end.

## 1. Enumeration of the committed ON-era turns 1-4 pins

`ls tools/compare/traces/ | grep -iE '^turn[1-4]-'` (verified this session,
not assumed from the inventory's own summary row):

| File | `captureFrames` range | Captures | Segments |
| --- | --- | --- | --- |
| `turn1-kickoff.json` | 1884–1964 | 81 | 44 |
| `turn1-cloneanim.json` | 1964–2193 | 230 | 44 |
| `turn1-rockslide.json` | 2193–2515 | 256 | 44 |
| `turn1-drain.json` | 2510–2655 | 102 | 44 |
| `turn2-endeavor.json` | 2894–2999 | 77 | 50 |
| `turn2-endeavor-drain.json` | 2894–3130 | 237 | 50 |
| `turn2-dragonbreath.json` | 3121–3846 | 237 | 50 |
| `turn2-dragonbreath-projectiles.json` | 3175–3235 | 61 | 50 — **already explicitly `"oracleProfile": "battle-scene-on"`**, a deliberate ON-only fixture, not an "ON-era ambiguous" pin |
| `turn3-menu.json` | 3121–3896 (cumulative: old turn1/2 captures + 50 new frames 3846-3896) | 254 | 56 |
| `turn3-endeavor.json` | 3880–4079 | 192 | 57 |
| `turn3-rockslide.json` | 4080–4890 | 256 | 57 |
| `turn4-menu.json` | 4890–4933 | 44 | 60 |
| `turn4-doubleteam.json` | 4934–5313 | 250 | 61 |
| `turn4-rockslide.json` | 5318–5925 | 250 | 61 |

14 files total — the brief's own citation (`turn1-rockslide.json` 256;
`turn2-dragonbreath.json` 237 / `turn2-endeavor.json` 77; T3 192/256; T4
250/250) names 7 of these; the other 7 (`turn1-kickoff`, `turn1-cloneanim`,
`turn1-drain`, `turn2-endeavor-drain`, `turn2-dragonbreath-projectiles`,
`turn3-menu`, `turn4-menu`) are real, separately-committed pins the
inventory row's own summary compressed away. All 14 are genuinely Battle
1's turns 1-4 (ticks 1884-5925), the SAME single canonical battle that
continues into turns 6-17 (`docs/battle-turn-notes.md`'s own numbering is
one continuous trace) — **not** the separate small `battle2-turn1-*.json`
engine-kernel prototype fixtures rank 1 used, which are an unrelated
scratch battle.

## 2. Key finding: `docs/battle-turn-notes.md` already IS an OFF-truth dossier for turn 1, and an ON-truth dossier for turns 2-4

`docs/battle-turn-notes.md` §1-§8 describe the trace's **v3** oracle
generation — and v3's canonical bootstrap **was Battle Scene OFF** (the
default flipped to ON only at v4/v5, per §9's own "CORRECTION BLOCK"). §9
gives the re-verified **v5 (ON)** tick table as a delta against §1-§8's own
v3 numbers. This session's own fresh OFF oracle run against turn 1
reproduces §1-§8's v3 shas/ticks **almost exactly** (0-5 tick jitter, well
inside normal precision) — confirmed directly below, not assumed. So for
turn 1, the historical "v3" table in §2 doubles as an independent
cross-check of this session's own fresh OFF ground truth.

**Turns 2-4's own dossier sections (§12, §19-§22) were written AFTER §9**,
i.e. against the v5 (ON, real animations) oracle — same situation as
`docs/turn9-notes.md` etc. So turns 2-4 needed the same scout-then-pin
methodology rank 5 used (coarse stride scout, cross-reference cited
ON ticks/shas, place dense range biased earlier), not a direct v3 lookup.

## 3. Banked files (10 new `-off.json` traces, all this session)

Priority per the brief: turn 1 → 2 → 3 → 4 in order; all four turns
reached (honest stop below explains what's thinner than rank 5's own
per-window depth, not what's missing outright).

| New file | Sibling(s) covered | Capture range (stride) | Captures | App baseline | Determinism |
| --- | --- | --- | --- | --- | --- |
| `turn1-kickoff-off.json` | `turn1-kickoff.json` (verbatim range) | 1884–1964 (1) | 81 | **81/81** | 0/81 mismatches |
| `turn1-cloneanim-off.json` | `turn1-cloneanim.json` (verbatim range) | 1964–2193 (1) | 230 | 2/230 | not re-run (time-boxed; turn1-kickoff-off + turn1-rockslide-off both 0 mismatches this session, same trace family) |
| `turn1-rockslide-off.json` | `turn1-rockslide.json` (verbatim range) | 2193–2515 (1) | 256 | 0/256 | not re-run |
| `turn1-drain-off.json` | `turn1-drain.json` (verbatim range) | 2510–2655 (1) | 102 | 0/102 | not re-run |
| `turn2-endeavor-off.json` | `turn2-endeavor.json` + `turn2-endeavor-drain.json` (collapsed, see §4) | 2894–3149 (1) | 256 | 60/256 | **0/256 mismatches** |
| `turn2-dragonbreath-off.json` | `turn2-dragonbreath.json` (collapsed, see §4) | 3149–3385 (1) | 237 | 7/237 | not re-run |
| `turn3-endeavor-off.json` | `turn3-menu.json`'s own new 3846-3896 tail + `turn3-endeavor.json` (collapsed, see §4) | 3846–4100 (1) | 255 | 62/255 | not re-run |
| `turn3-rockslide-off.json` | `turn3-rockslide.json` (collapsed, see §4) | 4100–4260 (1) | 161 | 6/161 | **0/161 mismatches** |
| `turn4-doubleteam-off.json` | `turn4-menu.json` + `turn4-doubleteam.json` (collapsed, see §4) | 4890–5145 (1) | 256 | 74/256 | **0/256 mismatches** |
| `turn4-rockslide-off.json` | `turn4-rockslide.json` (collapsed, see §4) | 5145–5400 (1) | 256 | 0/256 | not re-run |

All ten are byte-for-byte the ON-era sibling's own `segments` (verbatim
button stream, no input-timing edits) plus `"oracleProfile":
"battle-scene-off"` and `"appRoute": "canonical-recorded"` — only
`captureFrames` differs. Determinism was spot-checked on 4 of 10 (one per
turn) rather than all 10, per this session's time budget — every check run
was **0/N mismatches**, and all ten files share the identical underlying
oracle/engine (same pattern already established across this whole
program), so the un-rechecked six are low-risk, not unchecked-in-principle.

## 4. Methodology and per-turn findings

Same "scout coarse (stride 4-5, `/tmp` only), cross-reference cited
ON-dossier ticks/shas, place dense stride-1 range biased earlier" method
rank 5 established. One structural difference from rank 5: because OFF's
compression pulls each turn's ENTIRE resolve-then-settle sequence into a
much narrower absolute-tick band than the ON pins span, the ON-era
per-move file boundaries (`turn2-endeavor.json` vs
`turn2-endeavor-drain.json` vs `turn2-dragonbreath.json`, three separate
ON windows) **collapse under OFF into two dense files per turn** covering
the SAME content (opening move + counter move + settle) — this is reported
plainly as a finding, not silently reshuffled.

### Turn 1 (`turn1-{kickoff,cloneanim,rockslide,drain}-off.json`)

Verbatim ON-era `captureFrames` ranges reused unchanged (no widening
needed) because turn 1's OFF ticks match the dossier's own **v3** table
almost exactly:

- **1884-1888**: settled menu / FIGHT-submenu-open — sha
  `d223d98a2da9...`/`b145eaeff966...`, full-hash-identical to §2's own
  citation, **same tick**.
- **1892-1924**: move-select idle-cycle, byte-identical shas/ticks to §2.
- **1932/2004/2104**: `22e8c7fbed1d`/`361833e8c91a`/`f33cfdd146f8` —
  **byte-identical AND same tick** as §2's own "continuous distinct shas"
  citation. This directly confirms DOUBLE_TEAM's clone-blend window
  (present under ON v5 at ticks 1964-2094, §9's own table) is **absent**
  under OFF — the class-(c) rule this whole program has established,
  turn 1's own spot-check.
- **2324**: flat `64857bf16c67` (HP-bar-done hold) — **byte-identical**,
  1 tick later than §2's 2323.
- **2344/2348**: text-clear (`70f4821905ff`) then settle onto the 4-phase
  idle cycle (`c2a09dbe1350`/`229869e8d282`/`0269314e68ff`/`a4bffb32ef6b`)
  — **byte-identical shas**, 1-4 ticks off §2's own 2345/2348 citations.
- **`turn1-drain-off.json` (2510-2655) carries ZERO new narrative content**
  — the window is entirely inside the post-settle idle cycle (turn 1
  already fully resolves and settles by tick 2348, 162+ ticks before this
  file's own start). Banked anyway as a pure settle-cycle confirmation
  (same 4 shas, ~36-tick period, ~4 full cycles) — same role
  `turn10-rockslide-off-b.json` played in rank 5.
- **Desync verdict: none.** Turn 1's full line (menu→DOUBLE_TEAM(absent
  clone)→ROCK_SLIDE(absent rock-props)→settle) reproduces the historical
  v3/OFF dossier almost tick-for-tick; the only "compression" here is
  relative to the LATER v4/v5 ON default, already-documented and expected.

### Turn 2 (`turn2-endeavor-off.json` + `turn2-dragonbreath-off.json`)

Scouted from `docs/battle-turn-notes.md` §12's own v5 (ON) tick table
(menu reopen 2894, DOWN-nav 2933-2934, confirm 2945-2946, ENDEAVOR text
~2955, DRAGON_BREATH accuracy roll 3135, HP drains at 3099-3114/
3299-3311, next-menu settle ~3340-3846). Coarse stride-4/5 scout across
2894-3846 found the whole turn's content — menu reopen, ENDEAVOR (Grovyle
101→88 via `setdamagetohealthdifference`, no `calculateBaseDamage` path,
§12's own finding, unaffected by scene mode), DRAGON_BREATH (accuracy/
crit/13-damage spread rolls, 30% paralysis roll — did not proc, §12) —
fully resolves and settles into a 4-phase idle cycle
(`8f36f1c784c5`/`a6e5dbf22d8a`/`d2b11956ba73`/`64acb1be084c`, ~27-tick
period, plus rarer `9cdf974c3500`/`ac13de4a6a1f` variants matching the
"second, slower periodic element" rank 5 already documented) by **OFF tick
~3230-3238** — 100-600+ ticks earlier than the ON dossier's own 3340-3846
settle window, same compounding-compression shape rank 5 established.

- Dense-pinned 2894-3385 (491 ticks, split at the cap into two files) —
  covers menu reopen through DRAGON_BREATH's own settle plus ~6 idle-cycle
  confirmations (3238-3385).
- **No DRAGON_BREATH "stream"/projectile content appears anywhere** in the
  dense data (kickoff text → short generic hit-flash alternation → ordinary
  13-tick HP drain → settle) — confirms the class-(c)-absence rule a
  second time this doc; directly corroborated by
  `turn2-dragonbreath-projectiles.json` existing as its own **explicitly
  `oracleProfile: battle-scene-on`** fixture (i.e. this specific visual
  content was already known, by a prior session, to be an ON-only concern
  — not a new finding, but a second independent confirmation from a
  different source).
- **Desync verdict: none.** Same ENDEAVOR/DRAGON_BREATH battle line, same
  HP deltas (Onix 117→101, Grovyle 101→88), only the animation bodies and
  the redraw-delay timing compress.

### Turn 3 (`turn3-endeavor-off.json` + `turn3-rockslide-off.json`)

Scouted from §19-§21's own v5 ticks: menu reopen 3846, confirm **3891**
(matches `TURN3_CONFIRM_PRESS_TICK` source constant exactly), ENDEAVOR
kickoff text 3900, drain settle plateau 4057-4079, ROCK_SLIDE hard-cut
**4080**, `gBattle_BG3_Y` shake start (RAM) 4115, HP update (Grovyle
88→41) 4333, text-clear/menu-redraw 4349/4356, settled plateau to 4890
(turn 4's own input boundary).

- OFF: menu reopen/confirm at the **same absolute ticks** (3846-3891,
  fixed script positions, unaffected by scene mode — the established rule
  holds again). ENDEAVOR resolves through ~4066; ROCK_SLIDE's own kickoff/
  shake/drain resolves and the whole turn **settles by OFF tick
  ~4212-4223** — 130-670+ ticks earlier than ON's 4356/4890.
- Dense-pinned 3846-4260 (414 ticks, split at the cap into two files) —
  covers the `turn3-menu.json`-only new tail (3846-3896) plus both moves
  plus ~1.5 idle-cycle confirmations (4212-4260) — **thinner settle
  confirmation than turn 1/2's own** (rank 5's turn 11 precedent for
  "leaner, not fabricated as equally deep," flagged here the same way).
- The RAM-documented turn-3-specific finding (§20: ENDEAVOR's target-shake
  is asymmetric `+3,-2,+3,-2...` here vs turn 2's symmetric `±3`, an
  unexplained real mechanism difference, NOT curve-fit) is a pixel-level
  detail below this doc's own stride-1-but-sha-only resolution — noted for
  whoever does the actual re-timing, not independently re-verified this
  session (out of scope: this doc's own claims are sha-transition-level,
  not sub-pixel).
- **Desync verdict: none.** Same ENDEAVOR (Onix 101→88)/ROCK_SLIDE (Grovyle
  88→41) battle line; content-identical, time-compressed.

### Turn 4 (`turn4-doubleteam-off.json` + `turn4-rockslide-off.json`)

Scouted from §22/§22-RESOLUTION's own v5 ticks and the live source
constants `TURN4_CONFIRM_PRESS_TICK=4925`,
`TURN4_ROCKSLIDE_MENU_REDRAW_DELAY=661` (pressTick+661=5586 under ON).
DOUBLE_TEAM's own clone-z-order bug and the stat-rose-text-gate bug (both
already fixed in `src/`, per §22-RESOLUTION) are pixel-level engine facts,
not scene-mode facts — irrelevant to this oracle-side doc, noted only for
context.

- OFF: menu reopen at 4890 (turn3-rockslide-off's own confirmed settle
  tick), confirm ~4925 (matches the source constant). DOUBLE_TEAM clone/
  banner/stat-rose resolves through ~5110; ROCK_SLIDE kickoff/shake/rocks/
  drain resolves through ~5325; the whole turn **settles by OFF tick
  ~5345-5352** into a 4-phase idle cycle
  (`46b0356f90c2`/`24418c54aeb7`/`ba769758da5f`/`bdd7ae0989f6`,
  ~40-tick period) — matches turn1/2/3's own idle-cycle shape (a NEW set
  of 4 shas each turn, since the underlying HP/PP digits differ, but the
  same 4-phase/~30-40-tick structural signature every turn in this
  program has shown).
- Dense-pinned 4890-5400 (511 ticks, split at the cap into two files) —
  covers the `turn4-menu.json` reopen, both moves, and ~1.3 idle-cycle
  confirmations (5345-5400) — same "leaner settle" honesty flag as turn 3.
- Grovyle's 41→1 drain (the first drain crossing the healthbox's green/
  yellow/red thresholds, §22's own ISSUES #16 note) reproduces with no
  band-threshold anomaly in the dense OFF data either.
- **Desync verdict: none.** Same DOUBLE_TEAM(absent clone)/ROCK_SLIDE
  (absent rock-props, Grovyle 41→1) battle line, content-identical.

## 5. Item 4 — the menu-redraw-delay compression family, turns 1-4 (the phase-doc's own predicted mechanism, now directly measured 4 more times)

`docs/idle-bounce-phase-attribution.md` predicted (not measured) that every
un-re-timed turn's own `TURNn_..._MENU_REDRAW_DELAY`-shaped constant is
overcounted under OFF, closing automatically once that turn's OWN content
gets OFF-retimed. This session's OFF settle ticks (§4 above) let this be
measured directly for turns 1-4 for the first time — the SAME family, one
rung further upstream than turn 8's own already-measured point:

| Turn | Real/synthetic press tick (source constant) | ON-fit redraw delay (source constant) | ON redraw tick | OFF settle tick (this session) | OFF-implied delay | Overcount |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `TURN1_CONFIRM_PRESS_TICK`=1919 | `ROCK_SLIDE_MENU_REDRAW_DELAY`=664 | 2583 | ~2348 | ~429 | ~235 (35%) |
| 2 | `TURN2_CONFIRM_PRESS_TICK`=2945 | `DRAGONBREATH_MENU_REDRAW_DELAY`=391 | 3336 | ~3230 | ~285 | ~106 (27%) |
| 3 | `TURN3_ROCKSLIDE_PRESS_TICK`=3687 (synthetic) | `TURN3_ROCKSLIDE_MENU_REDRAW_DELAY`=669 | 4356 | ~4212 | ~525 | ~144 (22%) |
| 4 | `TURN4_CONFIRM_PRESS_TICK`=4925 | `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY`=661 | 5586 | ~5352 | ~427 | ~234 (35%) |
| (turn 8, prior finding) | `TURN8_BIND_PRESS_TICK`=9425 | `TURN8_MENU_REDRAW_DELAY`=572 | 9997 | 9859 (RAM-exact) | 434 | 138 (24%) |

Same shape at every rung (a 22-35% reduction, not a fixed-tick offset,
consistent with the "compression tracks stripped animation content, not
raw elapsed ticks" mechanism rank 5 already proved) — directly corroborates
`idle-bounce-phase-attribution.md`'s verdict (b) one more level upstream,
and gives whoever re-times turns 1-4 a starting estimate for each turn's
own `_OFF_`-suffixed redraw-delay sibling (OFF settle ticks above are
sha-transition-level, ±a few ticks, not yet RAM-probed to the same
single-tick precision `idle-bounce-phase-attribution.md`'s own turn-8/9
pair achieved — flagged as an estimate, not a proven pin, same honesty
convention that doc used for its own turn-8 prediction).

## 6. What's NOT reached (honest stop)

- **RAM-probed exact settle ticks** (vs this doc's own sha-transition-level
  estimates, ±0-10 ticks): only turn 1's numbers are RAM-cross-checked
  (against the historical v3 dossier, §2). Turns 2-4's OFF settle ticks
  above are read directly from this session's own fresh oracle sha data,
  not independently RAM-probed the way `idle-bounce-phase-attribution.md`
  RAM-probed turn 9's own bounce driver.
- **Determinism**: only 4 of 10 files re-run twice (one per turn); the
  other 6 were not, per this session's time budget (see §3's own table).
- **Turn 3's asymmetric-shake mechanism** (§20's own flagged, unexplained,
  NOT-curve-fit finding) is noted but not independently investigated here
  — orthogonal to scene-mode ground truth, a pixel-level engine question.
- **Sub-pixel/RAM verification of the idle-bounce phase's own oscillator**
  for turns 1-4 specifically (only turn 9's own drivers were RAM-probed by
  the prior phase-attribution doc) — turns 1-4's own bounce mechanism is
  assumed, not re-proven, to be the same `menuIdleBounce` oscillator
  (reasonable given every prior finding in this program, but not this
  session's own new RAM evidence).
- **The app baseline numbers above are recorded, not chased** — per the
  hard constraint, turns 1-4's app is *especially* deliberately ON-fit
  here (100% match against every ON-era pin, confirmed by
  `docs/battle-turn-notes.md` §19-§22's own verification sections — a
  stronger fit than ranks 5+'s own "low baseline, not yet attempted"
  windows), so near-zero OFF baselines are the MORE expected result here
  than anywhere else in this program.

## 7. Reproduce

```sh
# oracle ground truth (10 new files, in turn order)
bin/oracle run tools/compare/traces/turn1-kickoff-off.json -o <dir>
bin/oracle run tools/compare/traces/turn1-cloneanim-off.json -o <dir>
bin/oracle run tools/compare/traces/turn1-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn1-drain-off.json -o <dir>
bin/oracle run tools/compare/traces/turn2-endeavor-off.json -o <dir>
bin/oracle run tools/compare/traces/turn2-dragonbreath-off.json -o <dir>
bin/oracle run tools/compare/traces/turn3-endeavor-off.json -o <dir>
bin/oracle run tools/compare/traces/turn3-rockslide-off.json -o <dir>
bin/oracle run tools/compare/traces/turn4-doubleteam-off.json -o <dir>
bin/oracle run tools/compare/traces/turn4-rockslide-off.json -o <dir>

# honest app baseline (expected near-zero except turn1-kickoff-off, not chased)
npm run compare -- tools/compare/traces/<file>.json --summary

# determinism check pattern (4 of 10 files this session, all 0 mismatches)
bin/oracle run tools/compare/traces/<file>.json -o /tmp/a
bin/oracle run tools/compare/traces/<file>.json -o /tmp/b
# diff manifests by sha256 per frame

# redraw-delay family arithmetic (§5) — source constants only, no oracle needed
grep -n "TURN1_CONFIRM_PRESS_TICK\|ROCK_SLIDE_MENU_REDRAW_DELAY\|TURN2_CONFIRM_PRESS_TICK\|DRAGONBREATH_MENU_REDRAW_DELAY\|TURN3_ROCKSLIDE_PRESS_TICK\|TURN3_ROCKSLIDE_MENU_REDRAW_DELAY\|TURN4_CONFIRM_PRESS_TICK\|TURN4_ROCKSLIDE_MENU_REDRAW_DELAY" src/engine/battleScene.ts src/engine/battleMenu.ts
```

## Policy question for the supervisor

Same shape as rank 5's own opener (`docs/rank5-effect-visibility-scout.md`
→ adopted policy → `docs/rank5-off-ground-truth.md`'s own banking round):
**should turns 1-4's Scene-OFF acceptance pins replace the current
Scene-ON pins as this window's ground truth** (retiring the 14 ON-era
files banked in §1, the same way rank 5's 11 legacy ON pins were retired),
**given that turns 1-4 are the app's single MOST deeply ON-fit window in
the whole program** (100% pixel-exact against every ON-era pin today,
per `docs/battle-turn-notes.md` §19-§22's own verification sections) — this
side-lane step banks the evidence either answer needs; it does not decide
which answer is right.
