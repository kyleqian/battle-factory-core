# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-12 (evening, in progress) — S10A: status-condition animation TIMING live in Scene ON (#168 SA1 + SA3), ord124 order plans landed (99.34 / 99.60 %)

- **State:** local master `53419e533`; production src = union `a1730a1f9` (sa125 + ordl126) + stp128's unwired reducer module. Supervisor
  union gates on `a1730a1f9`: typecheck, smoke 448, full suite 1,642 files / 13,555 tests 0 failed, build. Session start `cfe4e26ca` (src
  `b4befa039`, the 2026-10-11 final-gated tree: receipt reused).
- **Did (production, each supervisor-reproduced from the worker's runner into a fresh dir):** ordl126 (ord124's banked Odor Sleuth 316 +
  False Swipe 206 order plans: census 0..999 98.95 / 99.32 -> **99.34 / 99.60 %**, +106 commands, 0 other changes); sa125 (ISSUES #168
  SA1 + SA3: a Scene ON `status-animation` command per kernel receipt with the ROM controller rows PSN 71 / CONFUSION 100 / BRN 39 /
  INFATUATION 97 / SLP 97 / PRZ 39 / FRZ 117 / CURSED 75 / NIGHTMARE 75; the 32-frame `status` stand-in ends at it (off121's rule in ON);
  212 / 212 anchored census commands land on the ROM row; +650,788 / -85,797 frames on 0..999; Scene OFF 10 / 10 shards byte-identical;
  canonical + app-only differential 624 / 624 identical; timing only, nothing drawn yet).
- **Did (evidence, new files):** seg127 (the IsBattleSEPlaying gate: `clamp(seRows - seAge, 0, 29)`, 56 / 56 ROM receipts, 72 gated / 729
  frames on 0..999; banked unwired rule), stp128 (CURSED / NIGHTMARE / CONFUSION / FRZ unwired reducer, 34 / 34 dense ROM windows 0 px),
  aud129 live audit 27 (105 windows: 85 OK, 20 D4 timing phases incl. ord124's Golbat Mega Punch flag, 0 defects).
- **In flight:** sar131 (draw PSN / PRZ + x2 rows), stq132 (BRN / SLP / INFATUATION reducer), next sag130 (wire the SE gate).
- **Notes:** no DEFERRED entries. Oracle freshness FAIL = known false positive (services 2026-10-06 postdate the last oracle/ commit).

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
