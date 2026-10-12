# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  games; ISSUES #89 pin -> seed 226). Its sticky post-win roll hung full seed 25 on the unselectable REST (wind-down gate) -> fixed
  `7d04d2686` (seed 25 OK; soak tests 70 / 70).
- **Soak gates (S10A scoped policy does not require them; run because the soak driver changed):** vanilla 0:20 **20 / 20 OK**; full 0:60
  **59 / 60** on the pre-fix driver (the one HANG = seed 25, the driver bug above; rerun on the fix: OK); winning 0:60 / winning-swap 0:60
  see the ledger (ANIMATION_INTEGRATION_PROGRESS.md top entry); varied-RNG fifth gate on the fixed driver: winning carry 0 / 14 / 28
  **100 / 100 each**, winning-swap carry 0 **100 / 100**.
- **Next:** ROADMAP S10A resume points — ISSUES #168 Scene ON status animations (prep pack DONE: docs/sta123-status-animations-design.md,
  slices SA1..SA10), remaining fallbacks (Odor Sleuth / Hyper Beam order plans), #166 / #167 remainders, regenerate the app-only trace.
- **Notes:** no DEFERRED entries. ISSUES: #166 / #167 trimmed, #168 new, #153 quantified. All worker branches merged; worktrees removed
  (scratch preserved under `.integration/validation/*-20261011/`, transcripts `.codex-logs/workers/`).

---

## 2026-10-11 — User scope update: include Struggle in S10A

- **State:** docs-only checkpoint on local master; production src `14d1be15` and the green 2026-10-10 night receipt are unchanged.
  Coverage remains 95.38% of move-animation commands / 98.72% of frames, including Struggle. Its live adapter is still missing.
- **Did:** recorded the user's explicit inclusion of Struggle 165, removed the roadmap exclusion, and updated supervisor instructions,
  live-status pending work and census reporting. The historical 276 accepted bodies stay separate from this additional required body;
  no acceptance or live credit was added. See `docs/struggle-integration-scope.md`.
- **Next:** FIRST implement and prove Struggle through real forced-use routes, both sides and source-required variants, alongside
  #166's missing stat-change presentation; extend accounting before live promotion. Then resume the existing timing / history queue.
- **Notes:** this is presentation scope only; #165's gameplay change remains a separate scope decision. No run started. Diff,
  JSON/queue ledger checks and the historical catalogue census (`238+13+25+0+0=276`) passed; the unchanged green production receipt
  is reused under `ANIMATION_VERIFICATION.md`.

---

## 2026-10-10 (night) — S10A: 12 production folds + 4 live audits; live share 0..999 93.79 -> 95.38 % of commands (97.37 -> 98.72 % of frames; 99.32 / 99.59 % excluding Struggle); 238 + 13 + 25

- **State:** local master, production src `14d1be15` (gated on `4bf782115`; later commits are docs / receipts / evidence). Adapter census
  `238+13+25+0+0=276` (Focus Punch scoped exact -> faithful timing under the standing D4 approval). Supervisor FINAL gates: typecheck,
  full suite 1,627 files / 13,387 tests, build; differential vs session start `b05d384ca`: the two canonical railroad traces byte-identical,
  the app-only `presentation-rng-playable-live-bodies-seeded-on` 163 / 173 captures shifted by land97's intended Shadow Punch lead rows.
  Census seeds 0..999 (two runs byte-identical): **95.38 % of move-animation commands / 98.72 % of frames** (start 93.79 / 97.37; +436
  commands, 0 live -> fallback, 0 errors, gameplay keys identical); seeds 0..299 99.12 / 99.68 %; seeds 50000..50999 96.67 / 98.84 % (start 95.20 / 97.18).
  Preview <http://127.0.0.1:5191/> serves `66dbf4973` (src `14d1be15`; 4 samples hash-equal, export + ON -> OFF restart passed, no errors).
- **Did (production, each supervisor-reproduced by census on the worker tree + an evidence rerun):** land82 (13 Substitute-doll cells,
  +77), cast83 (#143 per-form Castform art, +32), land86 (Flatter words unit, +44), union fix `302e39bdb` (land86 x cast83 semantic break,
  caught by the union census), ret88 (Return at the kernel's friendship 0: 37 wrong ReturnStrongest claims corrected, then ReturnWeak live,
  +123), land87 (post-KO reseed through a words-unit occupancy shadow, +58), qa91 (Quick Attack target offset from the tracked rest: 144
  live bodies per 1,000 battles were 1 px off; 3 Castform keys), doll90 (Psych Up / Double Team / Sing doll cells, +37), land96 (scanline
  history: Memento later bodies, +4), ctl95 (live DEFECTS fixed: GrassWhistle's position-dependent fade-back, Iron Tail's band mask;
  Recover / GrassWhistle doll cells, +24), fury99 (Fury Cutter counters 2..5, +36), fp100 (Focus Punch D4), land97 (40 adapters present
  their static lead rows: Scene ON timeline +N frames) + the supervisor's narrow audit-24 / shadow105 fix (no lead rows while an
  elevated opponent is on the field; shadow105's banked patch restores them properly).
- **Did (evidence / audits):** flat84, reseed85, scan93, idle94, idle98 (universal pre / post rows banked), stat101 + stat102 (#166 design
  pack; the stat-change reducer + comparator DONE, unwired), shadow105 + sp103 (banked patches: lead row-0 shadow; Shadow Punch D4);
  live audits 21 (Quick Attack DEFECT), 22 (none), 23 (none), 24 (land97 row 0).
- **Next:** ROADMAP S10A "Next (2026-10-11 night)": #166 slice (c) (the missing stat-change animation, both scenes, ~8.6 % of the
  timeline) is the headline; then the banked universal pre / post rows, #167, the remaining 181 non-Struggle fallbacks.
- **Notes:** no DEFERRED entries; ISSUES #166 / #167 new, #143 / #165 updated. #165 (Return -> Frustration) still needs a run where gameplay
  changes are in scope. Soak gates not run (S10A scoped policy; no kernel / rules / RNG file changed). All worker branches merged, worktrees
  removed; briefs + launcher logs under `.integration/validation/*-2026101[01]/`, transcripts `.codex-logs/workers/`.

---
