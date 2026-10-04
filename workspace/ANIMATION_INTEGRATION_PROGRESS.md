# Animation integration progress

## 2026-10-04 — anchor batch: battler-anchor helper + seven adapters (98 live)

- Folded worker `99f9935f9` (tested code `9a3e45f0f`, src tree `bcc9f0d2c`):
  `liveBattlerAnchors` (raw source anchors, pinned on 14 fixtures) and Acid,
  Sludge, Sludge Bomb, Water Gun, Harden, Iron Defense, Metal Claw. Adapters
  98, remaining 178. No palette plans.
- MetallicShine bodies (Harden/Iron Defense/Metal Claw) render view age = live
  age - 1: accepted windows start one frame before the task's age 0
  (convention alignment, not a fit; controller timing remains unclaimed).
- Supervisor dense proof: fourteen fixtures twice fresh, 1,692 rows/run, zero
  residual. Routes PASS for all seven. Repeat routes that end in a player
  faint stop at the forced-replacement screen, which
  `generatedCommandAnimationReplay` does not drive (tool limit; also OFF and
  on master) — single-decision routes used.
- Gates: supervisor focused 80 + smoke 448; worker full 1,486 files/11,810
  tests, build, typecheck reused. Receipt `anchor-supervisor-receipt.json`.
- Next: wall-family adapters with source plans; remaining anchor groups
  (picture offsets, coords, heights, effect centers, initial x2).

## 2026-10-04 — sprite-allocator net-zero audit banked

- Side-lane evidence `eee899bee` folded (new files only): probe
  `tools/compare/allocatorNetZeroProbe.py`, batch/manifest/receipt tools,
  receipt `tools/integration/fixtures/allocator-net-zero-audit.json`, doc
  `docs/allocator-net-zero-audit.md`. Production unchanged.
- 91 ids net-zero (86 live adapters plus the five wall moves), 0 not net-zero;
  every body starts and ends at `[0,1,2,6,8,60,61,62,63]`; 203 scenario pairs
  identical across fresh runs; Light Screen/wall calibration reproduced.
  Supervisor reruns of Razor Leaf, Brick Break and Light Screen identical.
- Not audited: Twineedle, Bite, Hyper Fang, Super Fang (fixtures reuse the
  Poison Fang scenario, move never activates) and Shadow Punch (no fixture).
  Fury Swipes player side only. Slot 3 reappears after many bodies as the next
  animation or the damage healthbox hit effect; outside the move script.
- Scope: Scene ON, scenario-specific; status/stat/switch/summary animations not
  covered and still invalidate.

## 2026-10-04 — wall-family source allocator evidence banked

- Side-lane evidence `0014e69f7` folded as `523265bc5` (new files only):
  generic wall-family clock/allocator-call probes, scenarios, five receipts
  `wall-family-<move>-source-receipt.json`, doc
  `docs/wall-family-allocator-evidence.md`. Production unchanged.
- Both orientations twice fresh, raw pairs identical; supervisor fresh reruns of
  Reflect player and Mirror Coat opponent byte-identical. Live offsets: Reflect,
  Mirror Coat, Protect 7; Barrier, Magic Coat 4. Wall slot 3 throughout.
  Reflect sparkles slots 4/5/4 (life 15); Mirror Coat matches Light Screen's
  six-sparkle cycle 4/5/7 (last two live 22). Every move ends net-zero against
  baseline `[0,1,2,6,8,60,61,62,63]`.
- Mirror Coat can never be a first body (priority -5, needs a prior special
  hit): under first-body eligibility it stays bounded fallback. Barrier's
  accepted fixtures are not first-body; new scenarios cover that.
- Next: wall-family adapters with source plans, and an audited net-zero rule so
  audited moves keep allocator history known.

## 2026-10-04 — glow batch: five live adapters (91 live)

- Folded worker `98348602f` (tested code `394aa629a`, src tree `f14e250a1`):
  Synthesis, Milk Drink, Flash, Role Play, Spite. Adapters 91, remaining 185.
  No palette plans; history invalidates after each body.
- Role Play's silhouette now adds the target species' picture y-offset in the
  attacker's orientation (source `CreateAdditionalMonSpriteForMoveAnim`,
  supervisor-checked). Spite uses the source enemy shadow. The framebuffer
  harness passes start frames to the Synthesis/Milk Drink probes.
- Supervisor dense proof: ten fixtures twice fresh, 1,496 rows/run, zero
  residual. Ordinary routes PASS (Synthesis after a damaging turn, Spite after
  a prior move, Flash repeated, Role Play on an independent seed).
- Gates: supervisor focused 57 + smoke 448; worker full 1,485 files/11,787
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/glow-supervisor-receipt.json`.
- Next: battler-anchor helper batch; wall-family source allocator evidence is
  being banked in parallel (side lane, new files only).

## 2026-10-04 — fieldfx batch: six live adapters (86 live)

- Folded `08ccbcaf9` (worker `7dec4734b`, tested code `caaab87a4`, src tree
  `e45fc575d`): Flame Wheel, Fire Spin, Heat Wave, Sandstorm, Sonic Boom,
  Block. Adapters 86, accepted 276, remaining 190. No palette plans added.
- Sonic Boom's live target idle now uses the species rest offset and the
  source enemy shadow; staged output unchanged. Block duration is per side
  (141/146). Fire Spin's live window is the accepted 104 rows.
- Supervisor dense proof: twelve fixtures twice fresh, 1,611 rows/run, zero
  residual. Ordinary routes PASS for all six (Flame Wheel, Sandstorm and Block
  with repeats); Sandstorm's first-found seed 18 is a legitimate no-body route
  (user immobilized by Attract).
- Gates: supervisor focused 40 + smoke 448; worker full 1,484 files/11,776
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/fieldfx-supervisor-receipt.json`.
- Next: glow batch (Synthesis, Milk Drink, Flash, Role Play, Spite), then the
  battler-anchor helper with seven projectile/sprite-center moves.

## 2026-10-04 — Light Screen live adapter folded with history guard repaired

- Production `a5d52f2fe` (src tree `b24b89ddbdeffb5e3b3cf19e7091e478537f0ef3`);
  adapters 80, accepted 276, remaining 196. Fast-forward of the repair worker.
- Repair `306b5adf1`: every move animation now passes the allocator seam, so
  only the audited Light Screen plan keeps history known. The withheld
  candidate's three commits were cherry-picked unchanged.
- Supervisor eligibility check (`.codex-logs/verify-ls-eligibility.mjs`) PASS
  7/7: adapter on seeds 2/45/59/114 [3,3] and opponent first body seed 16;
  bounded fallback after unproved 185/318/209 (seeds 27/84, 2 [0,3]). All
  routes: 88 ages, full text, success and repeat failure, action-menu, ON/OFF
  rules/RNG/boundaries equal (scene bit only). Candidate fails the same check.
- Dense source: independent 3 cases twice fresh, 264 rows/run, zero residual,
  digests identical to the worker and the candidate.
- Gates: supervisor affected 6 files/47 tests, smoke 448; worker full
  1,483 files/11,763 tests, build 847, typecheck — reused on clean fast-forward.
  Receipt `tools/integration/fixtures/light-screen-guard-supervisor-receipt.json`.
- Preview <http://127.0.0.1:5191/> serves `28d5be550` (847 modules): four
  canvas/PNG hashes identical to `e3f60734c`, export, ON-to-OFF restart, no
  errors. `playable-preview-28d5be550-receipt.json`.
- Next: bounded H_BASIC adapter batches (Flame Wheel, Fire Spin, Heat Wave,
  Sandstorm, Sonic Boom, Block; then Synthesis, Milk Drink, Flash, Role Play,
  Spite). Light Screen after other bodies stays bounded fallback until more
  allocator plans exist.

## 2026-10-03 — known-entry sprite allocator provider verified

- Production helper `277834353`, tested tree `02b775a5d988d6884c722a48829c8b01931c8e64`;
  adapters79, accepted276, remaining197. No move adapter promoted.
- `createKnownEntrySpriteAllocatorProvider(route)` returns commandPrompt and
  cursor-free firstMove hosts from ported source operations; semantic owners
  distinguish mutable templates. Exact in-frame summary/ball destruction and
  reuse traced, first/end allocator returns verified. No captured slot recipe.
- Supervisor six fresh direct-mGBA runs: both Exeggcute sides twice (82 calls
  each), complete Slowpoke twice (84 each), raw pairs identical. Canonical
  ordinary-input first prompt agrees at1886; detailed call order is the Lab proof.
- Receipt `tools/integration/fixtures/known-entry-sprite-allocator-supervisor-receipt.json`;
  raw `.integration/validation/known-entry-provider-supervisor-9f98134ea/`.
  Worker exploratory/failure and final folders copied to primary; ref/logs kept.
- Gates: independent14files/476smoke+affected; worker FINAL277834353 full
  1,483files/11,761tests (223skipped), build844; scoped source/coverage/audit/diff pass.
  Clean fast-forward reuses same-code full/build under verification contract.
- Preview: <http://127.0.0.1:5191/> serves `e3f60734c`; ordinary input, four
  exact canvas/saved PNG hashes, export, ON-to-OFF restart and no page errors.
  `playable-preview-e3f60734c-receipt.json`; no adapter/source-body credit added.
- Next: immediate provider consumer is Light Screen. Correct activation/wall
  clock and text ownership; dense full script-load/body/cleanup/following display
  bilateral twice and Slowpoke complete; ordinary repeats/prompts and full mode
  parity. Old `d12db7f0b` stays unmerged and uncounted. Later history remains
  unknown; this helper adds no arbitrary-history framebuffer claim.

## 2026-10-03 — exact allocator lifecycle source checkpoint

- Accepted tooling `f9bdab222`; production unchanged at `695e10751`, src tree
  `a5ceb566190019a2cbdd29ea24c9c88318374664`. Adapters79, remaining197.
- Independent six fresh direct-mGBA runs: both Exeggcute orientations twice
  and Slowpoke twice, raw pairs identical. Player activation/cleanup303/388,
  opponent213/298, Slowpoke306/391. Wall3, sparkle4/5/7/4/5/7.
- Source reset, healthbox, shadow, intro/tray/sendout and command-cursor
  destruction observed. VBlank deltas coalesce same-frame free/create calls;
  no runtime recipe, adapter or complete displayed-frame acceptance.
- Receipt: `tools/integration/fixtures/light-screen-allocator-supervisor-receipt.json`;
  raw `.integration/validation/light-screen-allocator-supervisor-f9bdab222/`.
  All worker pass/failure folders copied to primary before cleanup; refs/logs kept.
- Gates: independent source6/6, focused19/19, Python compile; unchanged
  boundary/inventory, coverage/audit/source-audit/diff pass. Prior final pair reused.
- Next: instrument exact in-frame allocator calls and map source callers;
  implement bounded known-entry provider, then fix Light Screen live activation
  clock and completed text, prove full body/cleanup/following display twice
  bilateral plus complete Slowpoke. Candidate `d12db7f0b` stays unmerged.
- Correction: worker attributed Slowpoke +3 to a longer name. Name is shorter;
  causal attribution is not accepted. No deferred material decision.

## 2026-10-03 — Continuation uses the main roadmap

- Setup: integration is S10A in `ROADMAP.md`; normal `./run-supervisor.sh` reads
  the current roadmap instead of a hardcoded mechanics mission. The previous
  supervisor integration flag remains an alias; worker contracts are unchanged.
- Checks: shell syntax, 73 affected tests, boundary/inventory, coverage/audit
  and diff checks pass. Production is unchanged; the final session receipt and
  next Light Screen step below remain the current implementation checkpoint.
- Run mode: default interactive terminal; optional `--headless` streams output
  and keeps logs without the chat interface. Both use Sol 6.1/high and the same
  worker routing/cap. No new supervisor session started for this setup change.





## 2026-10-02 — local integration session wind-down; 79 verified adapters

- State: all14 recovered physical adapters accepted (65→79); eight palette
  plans added (58total,57/79live), actual status-event guard and known-entry
  party/B-cancel return provider accepted. Factory276/277, remaining197,
  whole-playable exact0. Production `695e10751`, src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
- Source: Burn tooling `78c85cb3e` independently verified bilateral twice,
  twelve Small Ember bank7 load/free lifetimes38ticks, real Shadow scratch9.
  Confusion non-Shadow Lick control also passes4fresh runs/eight lifetimes.
  Semantic subject is script attacker/target; transient activeBattler2 is
  bookkeeping. No status provider promoted; all actual status history unknown.
- Gates: final independent1,482files /11,754tests pass (223skipped), build844;
  full ON/OFF rules/RNG at eleven actual draft boundaries equal (scene bit
  only excluded). Last source tools pass verifier, boundary/inventory9,
  coverage/audit/source-audit/diff; no production change since final full pair.
- Evidence: `final-supervisor-gates-20261002.json`, Burn/Confusion-Lick source
  supervisor receipts. All refs/logs and fresh pass/failure raw evidence kept
  in primary; no temporary worker worktrees or active workers. No material
  choice deferred. Preview currently verified `4815edf58`; final refresh follows.
- Next: Light Screen `d12db7f0b` remains unmerged. Derive intro/sendout/summary
  allocator ownership; actual clock303..388(player)/213..298(opponent), preserve
  completed text and extend full framebuffer proof through cleanup/following
  display, both sides twice and complete Slowpoke. See clock/review receipts.
  Then source-owned semantic status provider may use audited Duck/Small Ember
  resources with event subject/priority, lifecycle and real follow-up proof.
  Unknown entry/switch/summary/substitute/transform ownership stays open;
  keep outcomes/RNG/damage/order/progression intact. Factory/Rust not dispatched.

## 2026-10-02 — Light Screen source clock separated from prior controller text

- State: source/tool `c3ccc8cd3` accepted; runtime `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Candidate `d12db7f0b` remains unmerged; no source allocator recipe claimed.
- Proof: independent bilateral twice-fresh source clock, reference/tool/source
  hashes pinned. Player printer269..296, script303, loads304/307, wall310,
  cleanup388; opponent175..206, script213, loads214/217, wall220, cleanup298.
  Old currentMove-selected image windows include prior text and end early.
- Resume: derive intro/sendout/summary creation/destruction and slot ownership;
  use actual controller activation without reprinting completed attack text;
  extend dense framebuffer proof through actual script cleanup/following
  display, including complete alternate Slowpoke, then real command/parity.
  `light-screen-clock-supervisor-receipt.json` and withheld review retain limits.
- Gates: source4runs, Python compile, boundary/inventory9, coverage/audit/diff
  passed. Independent final1,482files /11,754tests and build844 remain valid
  on unchanged production. Full rules/RNG draft parity at all11boundaries
  reconfirmed; generated pixels identical to the verified browser artifacts.
- Preview: <http://127.0.0.1:5191/> serves verified `4815edf58`, eleven exact
  canvas/PNG samples, exports/restarts and no errors. Accepted worktrees
  retired after all fresh pass/failure evidence preservation; refs/logs kept.
- Next: bounded burn-status source witness if deadline permits, then clean
  final handoff. Actual status histories remain unknown. No material decision
  deferred; do not dispatch Factory acceptance or Rust work.

## 2026-10-02 — confusion source checkpoint and independent final production gates

- State: accepted tooling/source `8aefa52bb`; production `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Actual status graphics remain unknown; no palette provider promoted.
- Source: supervisor four fresh legal Golbat/Haunter runs, bilateral twice:
  eight Status_Confusion lifetimes, DUCK bank7 load/free after99ticks, affected
  attacker/target, real following Shadow Punch scratch9/faded dependency.
  Reference ROM/ELF/map and tool/source hashes retained. Source-only claim.
- Gates: independent final full1,482files /11,754tests pass (223skipped),
  build844; unchanged src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
  Source checkpoint verifier, boundary/inventory9, coverage/audit/diff pass.
  `final-supervisor-gates-20261002.json`, `status-confusion-supervisor-receipt.json`.
- Preview: <http://127.0.0.1:5191/> refreshed at `4815edf58`; eleven exact
  canvas/PNG samples, ordinary party-cancel and Razor Leaf routes, eleven
  full ON/OFF rules/RNG boundaries, exports/restarts and no browser errors.
  `playable-preview-4815edf58-receipt.json`. Retired worker worktrees removed;
  refs/logs and all fresh pass/failure raw evidence preserved in primary.
- Next: bounded Light Screen source load/text-clock audit, then handoff.
  Light Screen candidate stays unmerged; do not register Reflect by copying
  its allocator. Future confusion provider requires a semantic event lifecycle,
  source allocator and non-Shadow follow-up proof. No material choice deferred.
