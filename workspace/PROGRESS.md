# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-04 — Light Screen + five adapter batches folded (110 live)

- **State:** S10A, local master; 110 live adapters, 166 accepted bodies
  remain (Light Screen, fieldfx 6, glow 5, anchor 7, wall 5, anchor2 7).
  Opus supervisor with Sonnet workers.
- **Did:** repair worker cherry-picked withheld candidate `84f2e5264` and made
  every move animation pass the sprite-allocator seam (`306b5adf1`), so only
  the audited Light Screen plan keeps history known. Folded by fast-forward.
- **Checks:** independent eligibility PASS 7/7 (adapter only as first body;
  bounded fallback after 185/318/209), dense 264 rows/run twice fresh with zero
  residual, affected 47 + smoke 448. Worker full 1,483 files/11,763 tests and
  build reused (clean fast-forward). Receipt
  `light-screen-guard-supervisor-receipt.json`.
- **Also:** fieldfx batch (Flame Wheel, Fire Spin, Heat Wave, Sandstorm,
  Sonic Boom, Block) independently verified: 1,611 rows/run twice fresh,
  zero residual; six ordinary routes PASS. Preview refreshed at `28d5be550`.
- **Also:** glow batch (Synthesis, Milk Drink, Flash, Role Play, Spite):
  1,496 rows/run twice fresh, zero residual; five routes PASS.
- **Also:** anchor batch (shared battler-anchor helper + seven moves): 1,692
  rows/run twice fresh, zero residual. Side lane banked wall-family allocator
  evidence and a net-zero allocator audit of all live moves (all net-zero).
- **Also:** wall family (Barrier, Magic Coat, Protect, Reflect, Mirror Coat)
  with source allocator plans: 1,056 rows/run twice fresh, zero residual;
  17/17 eligibility routes. Side lane banked sprite-order evidence, an exact
  free-slot order event model with a provider design, and a status-animation
  sprite audit (all net-zero).
- **Also:** anchor2 (seven picture-anchor moves; Reversal deferred): 2,204
  rows/run twice fresh, zero residual. Tie audit: the six allocator consumers
  never share draw-order keys, so free-slot history cannot change their pixels.
- **Next:** allocator history persistence across audited net-zero bodies and
  status animations; anchor3 batch. Oracle freshness FAIL at orient was a false positive:
  only workspace commits since service start; both services kept.
- **Notes:** no material decision deferred.

---

## 2026-10-04 — Opus supervisor and Sonnet worker defaults

- **State:** default `./run-supervisor.sh` now uses Claude Opus 5.5
  (`claude-opus-5-5`) with Sonnet 5.5 (`claude-sonnet-5-5`) workers.
  S10A remains active; 79 adapters, 197 accepted moves remain.
- **Did:** changed the default provider/model, refreshed Opus/Sonnet aliases
  and direct-worker default, and aligned active run guides. Explicit Codex,
  mixed-provider and max-mode profiles remain available.
- **Checks:** shell syntax and both resolved configs pass; three affected
  launcher/boundary/inventory files, 71 tests pass; coverage/asset audit and
  diff checks pass. Launcher tooling only; accepted production unchanged.
- **Next:** review preserved Light Screen candidate `84f2e5264` in
  `.worktrees/integration-20261003-085057`; repair its allocator-history guard
  before independent proof and merge. Brief remains in
  `.codex-logs/s10a-lightscreen-guard-repair-20261003.txt`.
- **Notes:** latest IDs verified against Anthropic's model documentation;
  Claude Code 2.1.289 installed. This change starts no new work session.
  The prior supervisor stopped at a model-capacity error after withholding
  Light Screen; candidate worktree and logs are retained.

---

## 2026-10-03 — Source-derived sprite allocator provider accepted

- **State:** S10A, local master; 79 adapters, 197 accepted moves remain.
  Production helper `277834353` accepted; no Light Screen registration yet.
- **Did:** ported semantic healthbox/trainer/summary/battler/ball/controller
  allocation/free procedures. Independent six fresh exact-call witnesses
  (82/82/82/82/84/84 calls) and canonical prompt spot check agree.
- **Checks:** independent14files/476smoke+affected tests; worker final full
  1,483files/11,761tests, build844 reused on clean fast-forward. Source/reference
  hashes pinned; no rules/RNG/damage/order/facility changes.
- **Next:** consume provider for Light Screen, align actual activation and wall
  clocks, preserve completed text; full body/cleanup/following display twice
  bilateral plus complete Slowpoke, real routes and ON/OFF parity.
- **Notes:** unknown later entry/status/switch/summary histories stay unknown.
  Preview `e3f60734c` verified: four canvas/PNG hashes, replay/export/mode restart,
  no errors. Raw evidence, worker ref/logs preserved. No deferred decision.
