# Ground-truth traces (not parity fixtures)

Traces here are **oracle ground truth for stages the engine doesn't
implement yet**, committed so future sessions don't have to re-derive
timings from scratch. Unlike `tools/compare/traces/`, these are **not**
runnable through `npm run compare`'s parity expectation — there is no
engine code to compare against yet for the frames they cover. Use
`bin/oracle run tools/compare/traces-groundtruth/<name>.json -o <dir>`
to regenerate the reference PNGs directly from the oracle.

`battle1-fight-submenu-nav.json` / `battle1-fight-submenu-idle.json`: the
FIGHT-submenu / move-select window (docs/battle-turn-notes.md §11). Both
reuse `battle1-turn1.json`'s own first 41 segments verbatim (cumulative
1888 frames, ending in the first `A` press that opens the submenu) so tick
numbers stay comparable to §2/§9's tables, then diverge: `-nav` scripts
open->RIGHT->DOWN->LEFT->UP (a full loop through Onix's 4 moves)->a 40-frame
held-DOWN repeat check->B-close->resumed-action-menu idle, captureFrames
dense over every tick 1884-2118 (235 captures); `-idle` scripts open only,
then idle-pads to tick 2139 with every tick captured (256 captures, the
oracle's per-trace cap) to check the settled submenu for pixel drift/cycling
over 200+ idle ticks.

`battle1-rockslide-dense-a.json` / `-b.json`: dense stride-1 pixel coverage
of ticks 2094-2600 (docs/battle-move-anim-notes.md §9 — the post-clone gap,
the stat-banner/ROCK-SLIDE text windup, and ROCK_SLIDE's own attack
animation through the pre-drain hit-flash tail). Both reuse
`battle1-turn1.json`'s own first 43 segments verbatim (cumulative 1920
frames — every button press already made) then idle-pad: `-a` covers
2094-2349 (256 captures), `-b` covers 2350-2600 (251 captures) — together
every tick 2094-2600 at stride 1, no striding needed. Both twice-run, 0 sha
mismatches.

`battle1-switchin-dense-a.json` (ticks 6350-6560, 211 captures) / `-b.json`
(6555-6810, 256) / `-c.json` (6811-7066, 256) / `-d.json` (7067-7312, 246):
dense stride-1 pixel coverage of the whole Grovyle-faint -> Pidgeotto-
switch-in window (docs/faint-switch-notes.md's own "switch-in animation
window" section), superseding §13's coarser-strided captures
(`battle1-grovyle-faint.json`) for this specific span. All four reuse that
same trace's own 66 segments verbatim (identical button script, only
`captureFrames` differs) so tick numbers stay directly comparable to every
other section of the dossier. Together they cover every tick 6350-7312 at
stride 1 (no gaps, no overlap beyond the shared boundary ticks 6560/6555
and 6810/6811 and 7066/7067). All four twice-run, 0 sha mismatches.

`battle1-turn6-dense.json` (docs/turn6-notes.md): turn 6 of battle 1 (Onix
vs. switched-in PIDGEOTTO) — reuses `tools/compare/traces/turn5-switchin.json`'s
own 67-segment script verbatim, extended with one pure-idle filler segment
to tick 7312 plus `battle1-winline-b-swap.json`'s own segments[66:70] (the
turn-6 FIGHT-submenu-open, move-confirm, and resolution-idle — verbatim,
cross-checked byte-identical against that committed trace). 8346 frames
total, 251 `captureFrames` dense (stride-1) over nine windows bracketing
every RAM-confirmed transition (submenu open, FEATHER_DANCE kickoff/stat-
fall text, ROCK_SLIDE kickoff/impact/HP-drain, turn-7 menu reopen) — the
6350-7312 settle window is intentionally not re-captured here, already
covered by the `-switchin-dense-*` files above. Twice-run, 0 sha mismatches.

`battle1-turn7-dense.json` (docs/turn7-notes.md): turn 7 of battle 1 (same
matchup as turn 6, repeating the identical FEATHER_DANCE/ROCK_SLIDE move
pair) — reuses `battle1-turn6-dense.json`'s own 72-segment script verbatim,
extended with `battle1-winline-b-swap.json`'s own segments[70:74] (the
turn-7 FIGHT-submenu-open, move-confirm, and resolution-idle — verbatim,
cross-checked byte-identical against that committed trace, same convention
as turn6-dense.json's own §1). 9380 frames total, 256 `captureFrames`
(the oracle's per-trace cap, hit exactly) dense (stride-1) over nine
windows bracketing every RAM-confirmed transition this turn, plus a
correction to turn6-notes.md §5's own message-window boundaries (see
docs/turn7-notes.md §5 — re-verified directly against the already-committed
turn6-dense.json, not assumed). Twice-run, 0 sha mismatches.

`battle1-turn8-dense.json` (docs/turn8-notes.md): turn 8 of battle 1 — the
**first turn this dossier's two published lines diverge**, following
`battle1-winline-b-swap.json`'s own winning-line move choice (**BIND**, not
`battle-turn-notes.md` §14's "always ROCK_SLIDE" line's ROCK_SLIDE) — reuses
`battle1-turn7-dense.json`'s own 76-segment script verbatim, extended with
`battle1-winline-b-swap.json`'s own segments[74:80] (the turn-8 FIGHT-
submenu-open, one `RIGHT` press onto BIND, move-confirm, and resolution-idle
— verbatim, cross-checked byte-identical against that committed trace both
via a full per-frame button-state diff and a 10-tick pixel spot-check).
10826 frames total, 226 `captureFrames` dense (stride-1) over the eventful
transitions (submenu/cursor/confirm/kickoff-text-typing, the ATK-stat-floor
message, the BIND-miss kickoff/miss-message pair, the turn-9 menu resettle)
plus sparse representative sampling of the two long uneventful holds (the
FEATHER_DANCE animation loop and the settled miss text) — BIND misses on
this line, so there is no HP-drain/crit/damage-lock window to capture this
turn, unlike turns 6-7. Twice-run, 0 sha mismatches.

`battle1-turn9-dense.json` (docs/turn9-notes.md): turn 9 of battle 1 —
reuses `battle1-turn8-dense.json`'s own 82-segment script verbatim,
extended with `battle1-winline-b-swap.json`'s own segments[80:86] (the
turn-9 FIGHT-submenu-open, one `LEFT` press back onto ROCK_SLIDE from
BIND's own persisted cursor slot, move-confirm, and resolution-idle —
verbatim, cross-checked byte-identical against that committed trace both
via a full 12272-tick per-frame button-state diff and a 12-tick pixel
spot-check). 12272 frames total, 256 `captureFrames` (the oracle's
per-trace cap, hit exactly) dense (stride-1) over eight windows bracketing
every RAM-confirmed transition this turn — this is the first turn in the
6-9 arc where **both** combatants land a damaging hit (QUICK_ATTACK then
ROCK_SLIDE), so unlike turn 8 there are two full kickoff/impact/HP-drain/
effectiveness-message windows to capture, plus sparse representative
sampling of the animation holds and the turn-10 menu's own idle tail. The
brief's pinned falsifiable test (a 4th FEATHER_DANCE triggering the "won't
go any lower!" message) comes back **negative** — Pidgeotto's AI picks
QUICK_ATTACK instead this turn. Twice-run, 0 sha mismatches.

`battle1-turn10-dense.json` (docs/turn10-notes.md): turn 10 of battle 1 —
reuses `battle1-turn9-dense.json`'s own 88-segment script verbatim, extended
with `battle1-winline-b-swap.json`'s own segments[86:90] (the turn-10
FIGHT-submenu-open and move-confirm — **zero navigation presses**, cursor
already resting on ROCK_SLIDE — and the resolution-idle, verbatim,
cross-checked byte-identical against that committed trace both via a full
13306-tick per-frame button-state diff and a 12-tick pixel spot-check).
13306 frames total, 208 `captureFrames` dense (stride-1) over eight windows
bracketing every RAM-confirmed transition this turn (AERIAL_ACE then
ROCK_SLIDE, both hits) plus sparse representative sampling of the animation
holds and the turn-11 menu's own idle tail. **Both published lines
reconverge a second turn running** (bit-identical `gRngValue` and HP
outcomes to both `battle-turn-notes.md` sections 14 and 15's own turn-10
rows); all three of the dossier's standing falsifiable tests (ATK-floor
message, BIND actually hitting, the unattributed-RNG-step call site) come
back **negative** again this turn. Twice-run, 0 sha mismatches.

`battle1-turn11-dense.json` (docs/turn11-notes.md): turn 11 of battle 1 —
reuses `battle1-turn10-dense.json`'s own 92-segment script verbatim,
extended with `battle1-winline-b-swap.json`'s own segments[90:94] (the
turn-11 FIGHT-submenu-open and move-confirm — again **zero navigation
presses** — and the resolution-idle, verbatim, cross-checked byte-identical
against that committed trace both via a full 14340-tick per-frame
button-state diff and an 11-tick pixel spot-check). 14340 frames total, 256
`captureFrames` (the oracle's per-trace cap, hit exactly) dense (stride-1)
over six windows bracketing every RAM-confirmed transition this turn
(FEATHER_DANCE then ROCK_SLIDE) plus sparse representative sampling of the
uneventful holds and the turn-12 menu's own idle tail. **Falsifiable test 1
(the ATK-floor "won't go any lower!" message) finally fires positive**:
Pidgeotto's AI reselects FEATHER_DANCE for the first time since turn 7,
against Onix's ATK stage already floored since turn 8, and the game prints
`sText_StatsWontDecrease` verbatim, PP-charged, stat-write blocked, all
RAM- and pixel-confirmed. ROCK_SLIDE then hits Pidgeotto for the third
consecutive turn of bit-identical reconvergence between both published
lines. A second finding falls out of this turn's own structure: the
"unattributed RNG step" turns 9-10 both recorded does not fire at all this
turn, narrowing its likely call site to a damaging move's own HP-commit
path (absent here since FEATHER_DANCE deals no damage) rather than a fixed
per-turn cost. Pidgeotto's own healthbar also crosses yellow→red for the
first time in this sub-chain. Twice-run, 0 sha mismatches.

`battle1-turn12-dense.json` (docs/turn12-notes.md): turn 12 of battle 1 —
reuses `battle1-turn11-dense.json`'s own 96-segment script verbatim,
extended with `battle1-winline-b-swap.json`'s own segments[94:98] (again
**zero navigation presses**, cursor still on ROCK_SLIDE, verbatim,
cross-checked byte-identical via a full 15374-tick per-frame button-state
diff and an 8-tick pixel spot-check). 15374 frames total, 252
`captureFrames` dense (stride-1) over seven windows bracketing every
RAM-confirmed transition this turn (AERIAL_ACE then ROCK_SLIDE) plus sparse
representative sampling of the uneventful holds and the turn-13 menu's own
idle tail. **Corrects this session's own worktree brief**: turn 12 is
*not* Pidgeotto's faint — ROCK_SLIDE is already down to 1/10 PP entering
the turn (not the brief's assumed 2/10) and it **misses**, while
Pidgeotto's AERIAL_ACE hits Onix 14→4, bit-exact to `battle-turn-notes.md`
§15's own published turn-12 row, a 4th-turn reconvergence extending through
ROCK_SLIDE's own PP-exhaustion boundary. The "unattributed RNG step"
positively re-confirms a 4th time at the exact turns-9/10 offsets. A light
(unverified, not densely probed) RAM-only look ahead locates the actual
Pidgeotto faint at turn 13 (Onix's DRAGON_BREATH) and Murkrow's switch-in
immediately after — the natural target for a future turn-13 scout is
`battle1-winline-b-swap.json`'s own segments[98:106]. Twice-run, 0 sha
mismatches.

`battle1-turn13-dense-a.json` / `-b.json` (docs/turn13-notes.md): turn 13
of battle 1 — Pidgeotto's actual FAINT (Onix's DRAGON_BREATH, not the
now-PP-exhausted ROCK_SLIDE) and MURKROW's switch-in, the event
`turn12-notes.md` §6 located but only lightly scanned. Both reuse
`battle1-turn12-dense.json`'s own 100-segment script extended with
`battle1-winline-b-swap.json`'s own segments[98:106] verbatim (one `DOWN`
nav press, confirm, the 1400-frame resolution-idle, the button-gated
KO-dismiss `A` press, and a 900-frame post-switch-in idle — cross-checked
byte-identical against the full 156-segment winline script across all
17722 shared ticks). `-a` covers ticks 15374-16824 (menu through the
gated-press boundary, 256 captures, dense over the submenu/kickoff/
projectile/HP-drain/faint windows plus sparse KO-hold sampling); `-b`
covers 16815-17200 (overlapping `-a` at the gate, 223 captures, dense over
the switch-commit/sent-out-text/ball/particle/materialize/healthbox
windows through the settled menu vs. MURKROW). Falsifies the brief's own
"mirrored trajectory" premise for DRAGON_BREATH's fire projectiles: the
21-entry affine table and `x2` sequence are bit-identical to turn 2's own
(`dragon-breath-notes.md`), only the translation endpoint's `dy` differs,
traced exactly to the target's own `yOffset` — so ISSUES #23's exclusion
covers this turn too, not a separate problem. The full switch-in sequence
(faint sink, ball, particles, materialize, healthbox) reuses
`faint-switch-notes.md`'s own turn-5 closed forms verbatim with new
anchors/species params — see turn13-notes.md §7's reuse map. Both
twice-run, 0 sha mismatches.

`battle1-turn14-dense.json`: turn 14's ground truth — Murkrow's first
turn, dossiered in `docs/turn14-notes.md`. Extends the chain at tick
17722 (`turn13-notes.md`'s own final settled-menu boundary) with
`battle1-winline-b-swap.json`'s own segments[106:110] verbatim
(FIGHT-submenu-open, confirm — no nav press, cursor persisted at
DRAGON_BREATH — then one 1200-frame resolution-idle segment), 110
segments/18956 frames total, 248 captures (dense over the submenu
buttons, Murkrow's FLY charge-turn animation/text, and Onix's
DRAGON_BREATH kickoff/miss text; sparse over the closing idle hold).
Murkrow opens with **FLY** (not FAINT_ATTACK), consuming its charge
turn — no damage either side, Onix's own DRAGON_BREATH auto-misses the
now-airborne (`STATUS3_ON_AIR`) target with zero RNG cost
(`AccuracyCalcHelper`'s on-air short-circuit, source-cited). Both
`STATUS2_MULTIPLETURNS` (Murkrow's charge lock) and `STATUS3_ON_AIR`
(the invulnerability/sprite-hide flag) are RAM-confirmed to persist past
the turn boundary, still set at the trace's final tick. Confirms
`battle-turn-notes.md` §16's own coarse ledger row for this turn on
every HP/PP/order claim, refining its "some turn-end bookkeeping" to an
exact 1-`Random()`-call tick (18079). Twice-run, 0 sha mismatches;
flatten-and-compare prefix check against `battle1-winline-b-swap.json`'s
own script, 0 diffs across all 18956 shared ticks.
