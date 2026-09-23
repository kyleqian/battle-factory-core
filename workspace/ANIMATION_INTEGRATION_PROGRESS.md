# Animation integration progress

## 2026-09-23 — 49 adapters / 50 palette plans; combined gates pending

- State: physical batch and live Howl folded; source palette plans now cover
  all 49 adapters plus palette-only Fury Cutter. Imported supervisor-verified
  Factory 33bc8bbed one-way (Curse accepted; Ice Ball evidence only): 274 exact
  Factory moves remains separate from zero whole-playable exact claims.
- Source: physical 2,608 rows/run including alternate Wobbuffet, twice fresh,
  zero residuals; parent independently repeats 660 rows/run for Hi Jump Kick,
  Steel Wing and altered Vice Grip. Howl 408 rows/run (Loudred and Mightyena,
  both directions), twice fresh exact; ordinary seed 8 repeats with stages
  6 -> 7 -> 8 and identical ON/OFF outcomes/RNG.
- Palette: 50 source resource plans; Smokescreen/Confusion/Dynamic Punch
  histories each prove eight Shadow scratch allocations. Sing/Grass Whistle
  both directions twice prove four-slot allocation, faded-only writes through
  cleanup and unchanged unfaded scratch. Complete-body Shadow diagnosis stays
  partial: restore timing diverges at age 83 under changed history; no
  empirical offset or capture input was added.
- Verified preview: http://127.0.0.1:5191/ at cf3e5009e, 36 adapters.
  Full fa1404db5 passes 1,455 files / 11,610 tests; type-only replay request
  annotation repair passes 19 affected tests, build 838 modules. Production
  source is unchanged between those two commits. Browser four canvas/PNG
  hashes, export, mode switch and no-error checks pass. Receipt:
  tools/integration/fixtures/playable-preview-cf3e5009e-receipt.json.
- Next: run typecheck, affected/semantic/shared controls, smoke and final full
  suite/build on this combined 49-adapter production tree. Prior child gate
  queues were stopped while waiting to consolidate checks here. Isolated
  support worker side-20260923-144936 owns sixteen more bodies; separate
  Sol/high Shadow fade worker starts from verified cf3e5009e plus diagnostic
  bc550ae26. Continue supervising and folding; preview is only a checkpoint.

## 2026-09-23 — 36 adapters and persistent palette input, union gates running

- State: status batch folded as a77f93644/bedf905cf; palette provider folded
  as dec7ced85. Twelve status/psychic adapters join the earlier 24. The
  immutable preview remains at verified 82544f434 (24 adapters).
- Status evidence: 24 complete source windows, 4,322 frames per fresh run,
  twice with zero residuals through the production live renderer. Repeated
  generated-input Confusion covers current Drowzee/Luvdisc. Independent Gengar/Machamp Night Shade
  control passes both directions twice: 456 source frames per fresh run,
  zero residuals, complete legal parties and current source-derived geometry.
- Palette: source allocation, stale unfaded/faded RAM and resource lifetime
  persist across commands. Shadow Punch / Smokescreen / Shadow Punch matches
  eight source allocations across two orientations and two fresh runs.
  Palette typecheck and 20 focused tests pass; merged affected/inventory
  suite passes 8 files / 46 tests, smoke 8 files / 448 tests, coverage and
  asset audit. Unknown resource bodies and switch/KO
  graphics explicitly invalidate history. This is a bounded scratch provider,
  not complete graphics-memory or arbitrary-history exactness.
- Next: run full test/build gates on this committed union, then continue
  adapters/providers. Physical batch worker animation-20260923-134749 runs
  from verified 82544f434, isolated from parent and Factory. Never stop at
  the first preview; no whole-playable exact credit has been added.

## 2026-09-23 — verified playable checkpoint 82544f434

- Full union passes: **1,452 files / 11,586 tests**, 44 files / 223 tests
  skipped; production build **835 modules**. Actual tested/built commit:
  82544f434a081d5b63f5ff944eca21610454239b, clean tree.
- Isolated immutable preview: http://127.0.0.1:5190/ (local SSH forward to
  hcloud 8190), build stamp 82544f434 2026-09-23. Manifest at /build.json and
  ordinary input trace at /replay.json. Own service:
  pokebench-integration-preview-82544f434.service. Factory services untouched.
- Browser verification passes: three mid-body frames plus command prompt;
  canvas and saved PNG RGBA hashes match engine evidence; exported input is
  unchanged; branch/commit/stamp and Scene ON/OFF restart control verified;
  no page errors. Browser clock now pauses before load so screenshots retain
  the verified frame. Receipt is tools/integration/fixtures/playable-preview-82544f434-receipt.json.
- Continue: 24 live adapters, zero whole-battle/arbitrary-history exact claims.
  Status/psychic worker runs from 82544f434. Parent palette-host implementation
  lives on codex/animation-palette-host in .worktrees/live-palette-host.
  Source startup was checked through ordinary draft input, and the source
  Shadow Punch/Smokescreen/Shadow Punch sequence confirms persistent stale
  palette rows. Production provider and tests are being finished there.
  Preview remains pinned while this work continues; do not stop at this milestone.
