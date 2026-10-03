# Animation integration progress

## 2026-10-02 — physical2c accepted locally; 78 live adapters

- State: clean-folded production `cf212c63a` plus test-only follow-ups:
  Guillotine, Counter, Super Fang and Covet. Factory stays 276/277;
  198 accepted bodies need adapters. Gameplay/RNG/damage/progression intact.
- Proof: independently repeated **1,133 rows/run**, eight complete bilateral
  windows, twice fresh, **zero pixels**. Ordinary routes reach next commands;
  Guillotine KO/replacement and failure, Counter success/failure, repeated
  Super Fang/Covet and all ON/OFF logical state/RNG pass (scene bit excluded).
  Source integer-half damage is pinned at 158 -> 79 and 87 -> 43.
- Gates: worker **1,480 files / 11,743 tests** (223 skipped), build **844
  modules**, typecheck; final test-only follow-ups use scoped checks. Supervisor
  39 affected tests, final 21 test/boundary/inventory checks and 448 smoke pass;
  same-production full pair reused. Independent receipt:
  `tools/integration/fixtures/physical2c-supervisor-receipt.json`; raw evidence,
  failed Drill Peck windows and worker logs preserved in primary validation.
- Withheld: Drill Peck player-back remains **108,889 pixels/run**, 91 rows,
  despite source-correct Fearow max HP 140; opponent-front is exact. Resume with
  source affine OBJ center/retained pose proof and alternate back geometry.
- Preview: <http://127.0.0.1:5191/> serves `2a0465df9`, **78 adapters**; eight
  canvas/PNG hashes, session export, ON -> OFF -> ON and no browser/console
  errors pass. Receipt: `playable-preview-2a0465df9-receipt.json`. Whole-playable
  exact stays zero; palette covers 49/78 with party/switch/history limits.
- Next: bounded Drill Peck geometry proof, then physical palette ownership;
  no material user decision deferred. Accepted worktree removed; refs/logs/raw evidence retained.

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
