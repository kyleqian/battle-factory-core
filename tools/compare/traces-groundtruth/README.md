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
