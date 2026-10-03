# Animation integration progress

## 2026-10-02 — local integration supervisor configured on Sol 6.1

- State: `run-supervisor.sh --lane integration` now supervises primary local
  master using `gpt-6.1-sol/high`. Temporary integration workers use the ON
  oracle and retain the existing Terra/Luna/Sol model routing. No production
  code changed; the 65-adapter production receipt at `b4befb4f7` remains valid.
- Did: added a dedicated integration supervisor guide and worker contract,
  removed obsolete cloud execution directions from the active brief, and
  documented local startup, verification, cleanup and log retention.
- Gates: shell syntax, typecheck, 4 affected test files / 72 tests, animation
  boundary/inventory, coverage, asset audit and diff check pass. Real launcher
  print-config resolves Sol 6.1/high, integration guide and ON profile; Codex
  CLI is logged in using ChatGPT. Full production gates reused unchanged.
- Next: start the six-hour local headless run, review the recovered physical2
  snapshot, then verify and fold bounded adapter/provider batches to master.
  Preserve explicit arbitrary-history limitations and refresh the local preview
  only at green production checkpoints.

## 2026-10-02 — local consolidation complete; hcloud deleted; 65-adapter preview verified

- State: local `master` contains Factory `8fb2afbc1` (276/277 accepted), the 65-adapter integration checkpoint, Rust `5691a4ef4`, the experimental native runtime and local audit research. Production checkpoint `b4befb4f7`; later migration receipts/docs do not alter production. All 407 remote refs and interrupted physical2 edits are recoverable locally. Only the primary checkout remains.
- Did: preserved the complete 13.2 GB server archive (SHA-256 and zstd/content checks passed), all old local worktrees, and 4,625 searchable Codex/Claude transcripts. Deleted server 164080634, both primary IPs and dedicated firewall; post-delete account inventories are empty. Recovery root: `/Users/kyle/Developer/pokebench/hcloud-archive-20261002`; startup: `LOCAL_SETUP.md`.
- Local continuation: party-menu entry now invalidates the bounded palette-history claim even when cancelling before any move. Regression reproduced before the fix; ordinary-input before/after-first-move tests pass in both scene modes without changing battle state or AI history. Fixed two source audits choosing the wrong duplicate Cmd_end symbol on Linux; forward/reversed symbol orders now agree and receipt chains pin the actual animation runtime body.
- Gates: typecheck/build (844 modules), full suite **1,477 files / 11,708 tests passed**, 44 files / 223 tests skipped; rebuilt WASM and **1,832 Rust tests passed**. Both local oracle profiles respond; anchor matches 1/1 after server deletion. Local fresh Rest windows pass both directions twice, 220 rows/run, zero pixels. Earlier support source proof remains 1,898 rows/run twice. Shadow Punch's partial-history residuals remain unchanged and explicitly unclaimed.
- Preview: <http://127.0.0.1:5191/> at **b4befb4f7**, 65 adapters. Post-deletion browser validation passes all four canvas/PNG hashes, session export, ON/OFF restart and no-error checks; receipt `tools/integration/fixtures/playable-preview-b4befb4f7-receipt.json`.
- Next: review `codex/recovered-physical2-20261002` (unfinished tracked snapshot, not accepted), then continue the remaining **211 accepted moves' live adapters/providers locally**. Complete party-return/switch palette ownership and arbitrary-history rendering; no whole-playable exactness credit. Helping Hand alone remains blocked on legal doubles staging.

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
