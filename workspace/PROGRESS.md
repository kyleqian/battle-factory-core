# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-13 — User scope update: all remaining Factory correctness work is authorized

- **State:** scope/instructions checkpoint on local master; production src `65a45fcc` and the green final receipt on `c4d38e1f3`
  are unchanged. Move-animation coverage remains 99.34% of commands / 99.60% of frames; no fix is credited by this scope change.
- **Did:** recorded `docs/factory-finish-scope.md` and updated the roadmap, lane/supervisor instructions and launch prompt. All
  remaining animation variants, presentation corrections and source-proven battle-engine bugs are authorized. Main-lane changes
  to damage / AI / RNG / event ordering are allowed with source proof; presentation workers retain their narrow ownership.
- **Next:** FIRST #165 Return -> Frustration; then #141's rampage / Sticky Hold RNG draws, #140's Mimic/Transform targeting branch,
  and #139's Focus Punch pre-pass. Continue independent banked #168 fixes, fallback variants and presentation/timing remainders.
  Use the engine gates in ANIMATION_VERIFICATION.md, including all five gameplay gates; attribute intentional trajectory changes.
- **Notes:** audio remains deferred, settled exceptions stay settled, and no run is launched by this checkpoint. Reuse the unchanged
  production receipt. Scope/ledger checks, `git diff --check`, shell syntax / `--print-config`, and all 62 launcher-profile tests passed.

---

## 2026-10-12 (evening) .. 2026-10-13 — S10A: Scene ON status-condition animations DONE (#168: timed + all nine drawn), sound-effect waits, Double Team / Smokescreen timing, ordinary-row idle rest; live share 0..999 98.95 -> 99.34 % of commands (99.32 -> 99.60 % of frames)

- **State:** local master `63f6850b2` (production src == union `c4d38e1f3`). Supervisor FINAL gates on that union: typecheck, smoke 448,
  full suite 1,653 files / 13,710 tests 0 failed, build; differential vs session start `cfe4e26ca`: both canonical railroad traces
  byte-identical (235 + 216), the app-only presentation-rng trace 172 / 173 (Double Team's intended +9 tail). Census 0..999: **99.34 % /
  99.60 %** live (27,221 / 27,402 commands), 0 render throws. Catalogue `236+13+27+0+0=276` + Struggle (Smokescreen -> faithful timing).
  Preview <http://127.0.0.1:5191/> serves `63f6850b2` (4 samples hash-equal, export + ON -> OFF restart passed, no browser errors).
  Soak on `74cbec2b8` (last Scene OFF change): vanilla 0:20 20 / 20, full 0:60 60 / 60, winning 0:60 60 / 60, winning-swap 0:60 60 / 60;
  fifth gate 100 / 100 x 4.
- **Did (production; every worker runner re-run by the supervisor into a fresh dir, ALL SAME; unions gated in detached worktrees):**
  ordl126 (ord124 order plans: +106 commands live), sa125 (#168 SA1 + SA3: the status-animation command with ROM controller rows, the
  32-frame stand-in removed), sag130 (the IsBattleSEPlaying gate before status animations: 72 commands / 729 frames), sar131 + sad133 +
  sae135 (**all nine status animations drawn**: 88 dense ROM windows 0 px on every command row; source-derived x2 rows), gaf140 (the
  drawn animation waits out the gate: a union defect sae135 found), sgl138 (the same gate on stats-change in both scenes and multi-hit
  2nd+ hits: 366 / 240 commands), tmr136 (#166 Double Team tail +9 rows; Smokescreen first-use D4 phase), rsl141 (ordinary Scene ON rows
  draw ONIX's idle rest: 22,746 / 22,746 ROM rows 0 px).
- **Did (evidence):** seg127, stp128, stq132, sgs134, rst139 (prep for the above); live audits 27 (aud129: Golbat Mega Punch flag = a D4
  phase, 0 defects) and 28 (aud137: 121 / 121 status-animation command rows 0 px, 0 new defects); inv142 (a status animation over a hidden
  Dig battler: the ROM draws its sprites; banked patch, 5 census cases, not landed).
- **Supervisor union fixes:** sad133 x stq132 typecheck break (TS2366); sad133 x sae135 diverged `liveStatusAnimationRow` signatures (5-file
  resolution); tmr136 x sgl138 render conflict + one route-total re-pin (seed 9: 3 live Double Teams).
- **Next:** ROADMAP S10A "Next (2026-10-13)": land inv142 (banked); FRZ 115 / 116 frozen-turn phase (aud137, D4); #167 remainders; Hyper
  Beam / Astonish / Extrasensory / doll-cell fallbacks; a live audit after every batch. (The app-only differential traces were
  regenerated on the final timeline, `bba4d9dc6`: 173 -> 190 captures; differential 831 / 831 byte-identical, smoke 448.)
- **Notes:** no DEFERRED entries. ISSUES: #168 trimmed to inv142's remainder, #166 removed (fixed). Worker branches merged, worktrees
  removed (scratch under `.integration/validation/*-2026101[23]/`, transcripts `.codex-logs/workers/`).

---

## 2026-10-11 (afternoon / evening) — S10A: Struggle LIVE, General_StatsChange LIVE (both scenes), timeline fixes, 2 audits -> 4 live defects fixed; live share 0..999 95.38 -> 98.95 % of commands (98.72 -> 99.32 % of frames)

- **State:** local master; production src `b4befa039` (code `2131feda7`; later commits are docs, receipts, new evidence tools and one soak
  driver fix). Adapter census `237+13+26+0+0=276` (Shadow Punch -> faithful timing) **+ Struggle 165 live** (the one additional required
  body; `additionalRequiredBodies.MOVE_STRUGGLE`). Supervisor FINAL gates on `2131feda7`: typecheck, full suite 1,639 files / 13,532 tests
  0 failed, build; differential vs session start `52c181d54`: the two canonical railroad traces byte-identical (235 + 216), the app-only
  `presentation-rng-playable-live-bodies-seeded-on` 131 / 173 captures moved by today's intended timing (shp116 / iu120: regenerate its
  capture frames). Census 0..999: **98.95 % / 99.32 %** live (27,139 / 27,426 commands, 0 render throws; session start 95.38 / 98.72).
  General_StatsChange (separate line): Scene ON 3,667 / OFF 4,529 commands. Preview <http://127.0.0.1:5191/> serves `8d815e080` (src
  `b4befa039`; 4 samples hash-equal, export + ON -> OFF restart passed, no browser errors; `playable-preview-8d815e080-receipt.json`).
- **Did (production, each supervisor-reproduced from the worker's runner into a fresh dir; union gates after every fold):** Struggle
  (stg107 -> stl109 -> stf115 -> sdl119: 15 / 15 + 11 doll windows 0 px; 895 / 1,001 census Struggle commands live); ISSUES #166
  General_StatsChange (sc106 command, scd112 renderer, scf117 alignment / Growl x2 rows / order plan / accounting); #167 (olnd113 OFF
  no-hit pauses + MoveMissedPause hold); off121 (Scene OFF `status` command); iu120 (idle98 universal pre / post rows: 23,870 live
  commands +3 / +5); shp116 (shadow105 lead-row shadow, Shadow Punch D4, its shadow-return defect); fix114 / fix122 (live defects from
  audits 25 / 26: Taunt marks, Harden idle rest, Swagger picture height, Struggle target x2, Scene ON "But it failed!" hold — 12 classes).
- **Did (tooling):** soak111 decoupled the soak player's press stream from its decisions (presentation length no longer re-rolls soak
  games; ISSUES #89 pin -> seed 226). Its sticky post-win roll hung 5 wind-down soak seeds on the no-op RECORD / REST choices -> fixed
  `7d04d2686` + `bd7780162` (all 5 seeds OK; soak tests 70 / 70).
- **Soak gates (S10A scoped policy does not require them; run because the soak driver changed):** vanilla 0:20 **20 / 20 OK**; on the
  pre-fix driver full 0:60 59 / 60, winning 57 / 60, winning-swap 59 / 60 (all HANGs = the driver bug above; each rerun OK on the fix);
  confirmation on the fixed driver `bd7780162`: full 0:60 **60 / 60**, winning 0:60 **60 / 60**, winning-swap 0:60 **60 / 60** OK (all
  budget-ended); varied-RNG fifth gate on the fixed driver: winning carry 0 / 14 / 28
  **100 / 100 each**, winning-swap carry 0 **100 / 100**.
- **Next:** ROADMAP S10A resume points — land the BANKED ord124 order plans (+106 commands -> 99.34 / 99.60 %; then audit its Mega Punch
  flag), ISSUES #168 Scene ON status animations (prep pack DONE: docs/sta123-status-animations-design.md, slices SA1..SA10), #166 / #167
  remainders, regenerate the app-only presentation-rng trace.
- **Notes:** no DEFERRED entries. ISSUES: #166 / #167 trimmed, #168 new, #153 quantified. All worker branches merged; worktrees removed
  (scratch preserved under `.integration/validation/*-20261011/`, transcripts `.codex-logs/workers/`).

---
