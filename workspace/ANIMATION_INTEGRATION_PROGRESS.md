# Animation integration progress

## 2026-10-02 — physical2b accepted locally; 74 live adapters

- State: clean-folded `612520093`: Thunder Punch, Pin Missile, Razor Leaf,
  Factory-indoor Secret Power and Needle Arm. Factory remains 276/277;
  202 accepted bodies need adapters. No rules/RNG/damage/progression changes.
- Proof: independently repeated **1,092 rows/run**, ten complete windows,
  twice fresh, **zero pixels**. Found/repaired Thunder Punch's false send-out
  offset; supervisor corrected verifier maximum HP (117, current HP 72).
  Neutral opponent pose after Faint Attack is bounded, not retained-history proof.
- Routes: all five repeat through full ages and next commands with ON/OFF
  state/RNG exact (only hit-marker scene bit excluded). Pin Missile has four
  complete hit bodies across two commands; explicit miss has no body. Normal
  Bayleef draft reaches a 139-age Razor Leaf after misses, five parity checkpoints.
- Gates: worker typecheck, **1,479 files / 11,732 tests** (223 skipped), build
  **844 modules** on final code. Supervisor 41 affected tests and 448 smoke pass;
  same-code full pair reused. Independent receipt:
  `tools/integration/fixtures/physical2b-supervisor-receipt.json`; raw passes,
  failures and worker evidence retained in primary `.integration/validation/`.
- Preview: <http://127.0.0.1:5191/> served `4b0d82b7e`, **74 adapters**; eight
  canvas/PNG hashes (including Razor Leaf ages 0/69/138), session export,
  ON -> OFF -> ON restart and no console/page errors pass. Receipt:
  `tools/integration/fixtures/playable-preview-4b0d82b7e-receipt.json`. Accepted
  worktree removed; worker ref, logs and raw pass/failure evidence retained.
- Next: Guillotine, Drill Peck, Counter, Super Fang and Covet; then bounded
  palette ownership. Party-return/switch/unknown-history and Shadow Punch
  framebuffer limits remain explicit. No material user decision deferred.

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
- Preview: <http://127.0.0.1:5191/> served `6569b50bd`, **69 adapters**; four
  canvas/PNG hashes, session export, ON -> OFF -> ON restart, no console/page
  errors. Receipt: `tools/integration/fixtures/playable-preview-6569b50bd-receipt.json`.
  Accepted temporary worktree removed; worker ref and all needed evidence retained.
- Next: dispatch Thunder Punch, Pin Missile, Razor Leaf, Secret Power and
  Needle Arm. Palette/party-return/switch and arbitrary-history limits remain.

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
