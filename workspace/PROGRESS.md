# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-11 (afternoon, checkpoint) — S10A: Struggle LIVE, stats-change command, 3 live defects fixed; live share 0..999 95.38 -> 98.80 % of commands (98.72 -> 99.27 % of frames)

- **State:** local master `7390bf8ca` (production src `2ed518f1f`); supervisor union gates green (typecheck, full suite 1,630 files /
  13,431 tests, build). Adapter census `238+13+25+0+0=276` + Struggle (the one additional required body) = 239 live. Workers still
  running: stats-change renderer (scd112), Scene OFF pauses (olnd113), Struggle declines evidence (stf115).
- **Did:** Struggle 165 live (stg107 evidence -> stl109: 15 / 15 ROM windows 0 px, 884 / 1,033 census Struggle commands live);
  ISSUES #166 slice (c) (sc106: `stats-change` command, 76 / 90 frames, both scenes); soak driver press stream decoupled from its
  decisions (soak111: presentation length no longer re-rolls soak games; #89 coverage on seed 226); live audit 25 (aud110) + fix114
  (Taunt marks / Harden idle rest / Swagger picture height: wrong live pixels on ~118 census commands, now 0 px); #167 anchors banked (off108).
- **Next:** fold scd112 / olnd113 / stf115; then #166 slices (e) + (f), shp116 (shadow105 + sp103 banked patches), idle98 universal rows.
- **Notes:** details in ANIMATION_INTEGRATION_PROGRESS.md. No DEFERRED entries.

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

## 2026-10-10 (day) — S10A: ISSUES #159 fixed, 12 production folds, 3 live audits; live share 0..999 91.89 -> 93.79 % of commands (95.82 -> 97.37 % of frames); 239 + 13 + 24

- **State:** local master, production src `4c4fe4c7` (`bf082c6e1`). Census `239+13+24+0+0=276` (no adapter-count change: today widened
  histories and fixed live claims). Supervisor FINAL gates on that code: typecheck, full suite 1,614 files / 13,258 tests, build,
  differential 624 / 624 vs `b50c4dabd` (session start), census seeds 0..299 97.98 % / 98.40 % (start 96.98 / 97.99), seeds 0..999
  **93.79 % of move-animation commands / 97.37 % of frames live** (start 91.89 / 95.82; two runs byte-identical), seeds 50000.. 95.20 / 97.18
  (start 93.07 / 95.47); gameplay command key sequence + battle digest identical at every fold; soak gates on `bf082c6e1` (a kernel file changed: Speed Boost animArg1): vanilla 0:20 20 / 20 OK, full 0:60 60 / 60, winning
  0:60 60 / 60, winning-swap 0:60 60 / 60 (all budget-ended = OK; the varied-RNG fifth gate was not run). Preview
  <http://127.0.0.1:5191/> serves `20023b861` (src `4c4fe4c7`; 4 samples
  hash-equal, session export + ON -> OFF restart passed, no browser errors; `playable-preview-20023b861-receipt.json`).
- **Did (production, each re-proved by the supervisor from fresh probes / reruns):** hide66 (ISSUES #159: live bodies drew a hidden
  Fly / Bounce / Dig / Dive charger — 90 wrong live commands on 0..999 -> 0) + fly63 re-landed; sw67 (Shock Wave geometry-keyed order plan);
  land68 (Dive words unit + SUBSTITUTE_FADE); fold71 (Magnitude / CASTFORM_CHANGE / Conversion 2 / Needle Arm plans + the kernel's Speed
  Boost animArg1); dive70 (Dive attack body live); ice72 (Ice Ball words unit for any consumer); fix74 (player Light Screen at a hidden
  opponent fails closed); land75 (37 audited net-zero allocator bodies; hidden faint / reshow keep the order host: +154 / +17,256);
  st76 (Dive / Meteor Mash status gates lifted); cf78 (live bodies decline while a Castform is in a weather form — 54 commands honestly
  back to fallback; Needle Arm tie); land79 (Flatter at later bodies); ret80 (Return's order keyed by power level — 123 commands honestly
  back to fallback, see #165).
- **Did (evidence / audits):** plans69, hist73, flat77, doll81 (banked, see Next); live audits 18 (442 windows), 19 (599), 20 (436) —
  each found real issues (Light Screen hidden-phase, Castform weather form, Needle Arm tie, Return plan) that were fixed the same day.
- **Decisions (reversible, in scope):** failing closed instead of shipping known-wrong pixels (Castform weather forms, Return at
  friendship 0, Sky Uppercut / player Light Screen at a hidden battler); Bulk Up's "species defect" refuted by source + 22 ROM windows.
- **Next:** ISSUES #165 FIRST if gameplay changes are in scope for the next run (the ROM Factory has no Return: friendship 0 + Return ->
  Frustration; production keeps Return — a damage / AI / animation divergence, outside S10A's presentation-only mandate). S10A: land the
  banked doll81 (Substitute doll cells) patch; Flatter after a Flatter (words unit) / after Tackle (audit 33); #143 per-form Castform art
  (then lift cf78's decline); post-KO reseed blockers (words-unit order plans); Extrasensory / Memento later bodies; #161 (Dive attack
  age-17 lag); live audit 21 after the next batch.
- **Notes:** no DEFERRED entries. ISSUES: #159 / #160 / #162 / #163 / #164 closed; #161 and #165 new. All worker branches merged,
  worktrees removed; briefs, launcher logs and pruned worker scratch under `.integration/validation/*-20261010/`, transcripts
  `.codex-logs/workers/`.

---
