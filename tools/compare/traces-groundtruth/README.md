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
