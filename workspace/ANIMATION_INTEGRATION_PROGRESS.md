# Animation integration progress


## 2026-10-02 — physical2a accepted locally; 69 live adapters

- State: worker `f4a847729` clean-folded to master: Body Slam, Take Down,
  Double-Edge and Submission. Factory remains 276/277; 207 accepted bodies
  need adapters. No gameplay/RNG code or acceptance ledger changed.
- Baseline/recovery: reused unchanged `b4befb4f7` production receipt after
  70 launcher/boundary/inventory tests, coverage/audit and 470-decision ON/OFF
  control. Reviewed recovered snapshot; avoided registry omissions, stale
  adapter replacement and hard-coded Thunder Punch status. Ten recovered
  bodies remain for later bounded batches.
- Proof: independently repeated **939 rows/run**, both orientations, twice
  fresh, **zero pixels** on exact worker code. Take Down opponent ages 1–97
  are its complete source body; prior shadow teardown at age 0 is unclaimed.
  Ordinary Body Slam covers both sides/paralysis/no-hit; Take Down repeats
  through KO/replacement; recoil queues and ON/OFF logical state/RNG agree.
- Gates: worker typecheck, **1,478 files / 11,720 tests** (223 skipped), build
  **844 modules**. Supervisor 59 affected tests and 448 smoke tests pass;
  same-code worker full pair reused. Evidence/logs retained in primary
  `.integration/validation/worker-integration-20261002-171137` and `.codex-logs/`;
  independent receipt: `tools/integration/fixtures/physical2a-supervisor-receipt.json`.
- Next: refresh/verify the 69-adapter local preview, retire the accepted worker
  worktree, then dispatch Thunder Punch, Pin Missile, Razor Leaf, Secret Power
  and Needle Arm. Palette/party-return/switch and arbitrary-history limits remain.


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
- Runtime: CLI 0.146.0 rejected Sol 6.1 for ChatGPT sign-in. Updated using
  `codex update` to 0.160.0; a read-only `gpt-6.1-sol/high` execution now returns
  READY successfully and the fresh model catalog lists Sol 6.1. No fallback
  model or API credential was used.
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
