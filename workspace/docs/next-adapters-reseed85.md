# S10A reseed85 — the post-KO send-out allocator reseed after a words-order unit (banked for landing)

Evidence only (main-lane worker, new files only). FIXED base: master `005101dfc` (production src tree `9f3b877d`). The production change is
a TEMPORARY patch (`tools/integration/fixtures/reseed85/reseed85-temp-src.diff`, `src/engine/liveSpriteOrderHost.ts` only) applied only to
`git archive 005101dfc` copies under the scratch dir; the checkout's tracked files never changed. Direct mGBA processes only (no shared HTTP
oracle). Censuses are seeds 0..999 as 10 `--index-from` shards (hist73's instruments, unchanged). Predictions were committed before any probe
or patched census (`fixtures/reseed85/predictions.md`, commit `fdd28d635`).

## 1. Results

| | live by count | live by frames | allocator-unknown |
|---|---|---|---|
| base `005101dfc` | 25,886 / 27,516 = **94.08 %** | 3,867,171 / 3,968,405 = **97.45 %** | 52 cmds / 5,145 frames |
| + reseed85 temp patch | 25,933 = **94.25 %** | 3,872,005 = **97.57 %** | 6 / 530 |
| gain | **+47** | **+4,834** | -46 / -4,615 |

The +47 / +4,834 = 46 / 4,615 allocator-unknown commands + 1 / 219 "unclassified (case-local gate)" (battle 446, a FLATTER 260 history-claim
consumer: its allocator gate is the same reseeded host). Command KEY sequence (battle, kind, moveId, side, attacker, target), presented frames
per command, battle digest (`5cc95d1eace6`) and command KEY digest identical (`keycheck.txt`: 4 / 4 PASS), every shard's
`battleDigest` AND `battleDigestExcludingFrames` identical (`digests.txt`), **0 live -> fallback** (`census-delta-seeds0-999.json`).

**ON / OFF parity (patched copy, `parity-<seed>.json`; `flat77Parity.ts` = land75Parity's controller, at every action-menu arrival the
battle RNG, rules context and boundary compared):**

| seed / streak | gain on this route | turn boundaries | RNG / rules / boundary equal | Scene ON bodies allocator-known |
|---|---|---|---|---|
| 11 / 23 | Sand-Attack opp -> Protect opp x4 | 30 | yes / yes / yes | 37 / 37 |
| 98 / 0 | Mud-Slap ply -> Protect opp | 20 | yes / yes / yes | 33 / 33 |
| 420 / 14 | Rain Dance opp -> Reflect opp x7 | 45 | yes / yes / yes | 62 / 62 |
| 384 / 10 | RAIN_CONTINUES -> Protect opp x2 | 38 | yes / yes / yes | 52 / 52 |
| 785 / 11 | Ice Ball opp -> Protect ply x2 | 29 | yes / yes / yes | 40 / 40 |

Prediction P3 was +49 / +4,855: 3 commands / 240 frames of the words groups stay, each blocked by a NON-words unit in the same pending chain
(the shadow replays the units with the production plans and invalidates exactly where the real tracker would):
- battle 197, Magic Coat x2 (152 frames) after Rain Dance 240: the chain also holds Gust 16 / Transform 144 bodies (no order plan, not live
  adapters; prep52 NET-ZERO but excluded by the ⊆-live-adapters policy);
- battle 528, Light Screen (88) after RAIN_CONTINUES: the first send-out of that battle reseeds through the shadow; the SECOND send-out comes
  ~10 turns later on the same pending rain marker, after a `Return power level 0 body` (no order plan: ret80 has Medium / Strongest only).

### Residual table (hist73's chain tools; `reseed-blockers-base.json` / `reseed-blockers-patched.json`)

| blocking unit at the switch-in reseed | base cmds / frames | patched | |
|---|---|---|---|
| Sand-Attack 28 (opponent 14 / 1,383, player 4 / 457) | 18 / 1,840 | 0 | cleared |
| Rain Dance 240 (opponent 9 / 705, player 4 / 413) | 13 / 1,118 | 2 / 152 | battle 197: + Gust / Transform in the chain |
| Mud-Slap 189 (player 7 / 720, opponent 4 / 445) | 11 / 1,165 | 0 | cleared |
| RAIN_CONTINUES (General_Rain) | 5 / 486 | 1 / 88 | battle 528: + Return power level 0 in the chain |
| Ice Ball 301 (opponent) | 2 / 246 | 0 | cleared |
| **words units** | **49 / 4,855** | **3 / 240** | |
| Astonish 310 (player; no order plan, not a words unit) | 2 / 211 | 2 / 211 | out of scope (named) |
| Struggle 165 (not a live adapter) | 1 / 79 | 1 / 79 | out of scope |
| **total allocator-unknown** | **52 / 5,145** | **6 / 530** | |

hist73 measured this residual at 55 / 5,523 on `a7904fcc0` + its Part A; on the base it is 51 / 5,066 (every declined consumer a PLANS allocator
consumer: Protect 182, Light Screen 113, Reflect 115, Magic Coat 277, Barrier 112).

## 2. Mechanism (source)

The switch-in reseed (`reseedLiveSpriteAllocatorAfterSendOut` -> `liveSpriteAllocatorReseedable`) reads `lastUnit` and the post-unit view's
role isomorphism (`spriteOrderEntryLabelRelabel`): battler slots, occupant roles and the OCCUPIED set. It never reads the free ORDER (only the
free SET, as the complement). In `applySpriteOrderUnitPlan`, occupancy evolves without the order: a create takes the lowest (`f`) / highest
(`e`) open slot, a destroy names a slot (`o`), a survivor (`c`) or a creation of the unit (`n`). The order only breaks ties inside a
destroy group (`pw`). A words unit (28, 189, 240, 291, 301, RAIN_CONTINUES) is allocator-net-zero (`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` /
`_GENERAL_ANIMATIONS`). Its Random2 words reorder the free slots, but the body ends with the occupancy it began with. So the post-send-out
occupancy is word-free:

**occupancy shadow** = the known tracker just before the words unit's own event (prompt pair gone), `lastUnit` = that unit, replayed through
the pending marker's `deferred.units` with the production `applySpriteOrderPresentationEvent`.

This is the same unit replay that `resolveSpriteOrderDeferredLend` already runs for order consumers (words57 / words59 / ice72: exact past
KO / forced / AI-switch units). The only difference is the starting free order: the shadow has the same set but the pre-body order instead
of the words-resolved one. So the shadow's occupancy equals that replay's at every step. Its free order is wrong and is never lent: it
feeds the allocator reseed only. The six PLANS allocator consumers' pixels are key-determined (allocator-consumer tie audit), so they need
occupancy, not order.

## 3. ROM evidence (P1; `fixtures/reseed85/occupancy-audit.json`, `probes-r1r2.txt`)

13 scenarios (`fixtures/reseed85/scenarios/`; words57's base `mechanic-sand-attack-pidgeotto-onix.json`, explicit lab seed 305419897 =
ISSUES #154). The words unit is used by a fast, frail opponent lead. The slower player SNORLAX (speed IV 0) Swift-KOs it in the same turn,
then the opponent faints, shows the summary and sends out its next mon. Both opponent bench slots hold the consumer mon, so the Factory AI's
send-out choice is that mon. The KO's text waits for an A press, so the consumer turn is turn 3. Each scenario ran 2 probes x 2 fresh
processes, all 4 runs in one batch: `prep46OrderRngProbe.py` (per-frame `sSpriteOrder` + inUse) and `flat77Probe.py` (body RAM + RGB).
**26 / 26 probe pairs byte-identical (A == B).** Species are internal ids: "pidgeotto" in the scenario ids is internal 18 = PIDGEOT, a
label inherited from words57's constant.

| words route | control (same route, non-words net-zero body) | consumer | occupancy at the consumer | mask events in its body | free order |
|---|---|---|---|---|---|
| sa-opp-pidgeotto-protect (Sand-Attack) | ctl-leer-pidgeotto-protect (Leer 43) | opp PROTECT | **same** | **same** | differs |
| ms-opp-pidgeotto-lightscreen (Mud-Slap) | ctl-leer-pidgeotto-lightscreen | opp LIGHT_SCREEN | **same** | **same** | differs |
| rd-opp-poliwag-reflect (Rain Dance + RAIN_CONTINUES after the send-out) | ctl-sunny-poliwag-reflect (Sunny Day 241 + SUN_CONTINUES) | opp REFLECT | **same** | **same** | differs |
| sa-ply-snorlax-protect (Sand-Attack) | ctl-leer-snorlax-protect | player PROTECT | **same** | **same** | differs |

Without a control: sa-opp-diglett-reflect, ms-opp-diglett-protect, rd-opp-horsea-protect, ms-ply-snorlax-lightscreen and rd-ply-snorlax-reflect.
All 13 consumer activations are aligned (flat77's activation `sSpriteOrder` == the order probe's row) and role-isomorphic to the known entry
with ONE occupancy, `{0, 1, 2, 5, 6, 60, 61, 62, 63}`. **P1 confirmed: occupancy is word-independent, the free order is not.**

## 4. Windows through the PATCHED production live renderer (P2; `windows.json`, `check-base/`, `check-patched/`)

`reseed85Check.ts` is flat84Check.ts with the orchestrator's KO-unit allocator handling added: the party-summary command invalidates the
allocator, and the switch-in command re-seeds it from the order host after its events (lab known-entry route). It ran in the base copy and
in the patched copy. Every row is rendered against two fresh `flat77Probe.py` runs.

| window | move / side | base | patched: rows, px (run 1 / run 2 digest equal) |
|---|---|---|---|
| sa-opp-pidgeotto-protect-c0 | PROTECT opp | decline `sprite allocator history unknown` (reseed refused) | 123, **0** (=) |
| sa-opp-diglett-reflect-c0 / -c1 | REFLECT opp / SWIFT ply | decline / live 0 px | 79, **0** / 78, **0** (=) |
| ms-opp-pidgeotto-lightscreen-c0 / -c1 | LIGHT_SCREEN opp / SWIFT ply | decline / live 0 px | 86, **0** / 78, **0** (=) |
| ms-opp-diglett-protect-c0 | PROTECT opp | decline | 123, **0** (=) |
| rd-opp-poliwag-reflect-c0 / -c1 | REFLECT opp / SWIFT ply | decline / live 0 px | 79, **0** / 78, **0** (=) |
| rd-opp-horsea-protect-c0 | PROTECT opp | decline | 123, **0** (=) |
| sa-ply-snorlax-protect-c0 / -c1 | PROTECT ply (x2 turns) | decline / decline | 123, **0** / 123, **0** (=) |
| ms-ply-snorlax-lightscreen-c0 | LIGHT_SCREEN ply | decline | 86, **0** (=) |
| rd-ply-snorlax-reflect-c0 | REFLECT ply | decline | 79, **0** (=) |
| 7 control windows (ctl-*: Protect x3, Light Screen, Reflect, Swift x2) | both sides | live 0 px | live 0 px (unchanged) |

**20 / 20 windows live, 0 px every row, r1 == r2 (1,948 rows)** on the patched copy. All 10 words-route allocator consumer windows decline
on the base and turn live and exact. The order consumers (Swift after a words chain, lend = the deferred replay) are live with 0 px on BOTH
copies, as are the controls, so the patch changes neither.

## 5. FOLD INSTRUCTIONS

1. **Patch:** `patch -p1 < tools/integration/fixtures/reseed85/reseed85-temp-src.diff` from `workspace/`. Checked: it applies to `005101dfc`,
   and also cleanly to master `f0b7bce06` (land86 merged during this session; `git apply --check` and `patch --dry-run` show no offsets or
   fuzz). land86 makes Flatter 260 a words unit. 260 is allocator-net-zero (hist73 receipt), so the shadow covers Flatter markers too.
   **Re-measure the census on the fold's base:** Flatter-marker reseeds may add gains not counted below.
   It adds `LiveSpriteOrderHost.deferredOccupancy` (set when a words marker starts: `shadowStart` of the pre-event tracker, or the replayed
   shadow for a nested words unit; dropped with the marker by `withoutDeferred` and when the tracker turns known) and
   `deferredOccupancyTracker()`. `liveSpriteAllocatorReseedable` falls back to the replayed shadow when the real tracker is unknown. No lend,
   plan, words, RNG or gameplay path changes.
2. **Pins a fold must move:** none. The related set, run on the patched copy (95 files: every test naming the order host / allocator /
   reseed / words / deferred / post-KO / Light Screen / Protect / census, `related-tests-patched.txt`), gives **94 files passed, 1,202
   tests passed**. The only failing file is `factoryAiSwitchPolicyParity.test.ts` (3 tests), which is environmental: `artifacts/wasm` is
   absent from git-archive copies, the known WASM parity set. **Full suite on the patched copy** (`tests-patched-full-summary.txt`,
   4 workers): **12,379 passed, 19 failed**. The 19 failures are exactly the environmental WASM parity set (6 files: `factoryAi*Parity`,
   `factoryTrainerScheduleParity`, "factory-wasm artifact not found"). 1,088 tests are skipped, as on master.
3. **New pins (Tier 1) a fold should add** (e.g. `tests/reseed85WordsOccupancyReseed.test.ts`; each must fail without the hunks):
   - KO after a pending words marker: host from the known entry, Sand-Attack 28 marker (`markLiveSpriteOrderDeferredBody` + its
     move-animation event), then `hit-animation`, `faint` (opponent), `party-summary-next`, `party-summary-hide`, `next-mon-send-out` (the
     postkoLend.test.ts `KO` units): `liveSpriteAllocatorReseedable` is true; `reseedLiveSpriteAllocatorAfterSendOut(invalid, host)` equals
     `createKnownEntrySpriteAllocatorProvider(route).firstMove`; `liveSpriteOrderHostOrder(host).known` stays false; `lendLiveSpriteOrder`
     is unchanged (the deferred lend).
   - The same with RAIN_CONTINUES as the marker, and with a nested words unit (Mud-Slap after Sand-Attack).
   - Refusals: an `invalidate` unit or a planless body (e.g. Return power level 0, Gust 16) in `deferred.units` -> false; a non-words
     invalid tracker (no marker) -> false; the shadow is dropped with the marker (a party-menu reset / a known tracker).
   - Policy pin: `WORDS_ORDER_UNIT_MOVE_IDS` ⊆ `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` and RAIN_CONTINUES ∈
     `LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS` (the shadow's license). A new words unit must be allocator-audited first.
   - Receipt pins: `occupancy-audit.json` `summary.pairsSame == 4`, `allRoleIsomorphic`, `allAligned`; `windows.json` `summary.pass`.
4. **Census expectation** (seeds 0..999, hist73's driver, relative to a base whose words-unit reseed groups equal `005101dfc`'s):
   **+47 commands / +4,834 frames**, 0 regressions, KEY sequence + battle digests (with and excluding frames) identical. Allocator-unknown
   52 / 5,145 -> 6 / 530.
5. **ON / OFF parity:** the order host and the allocator host exist only in Scene ON (`battleScene === "on"`). The patch changes no kernel,
   RNG or controller input. Census proof: every shard's `battleDigestExcludingFrames` and `battleDigest` are identical base vs patched.
   Scene ON vs OFF parity routes for the fold: `flat77Parity.ts` (land75Parity's controller) in the PATCHED copy, on census battles whose
   allocator consumers now go live through the shadow. These are **seed 11** (Sand-Attack opp -> Protect opp x4), **seed 98** (Mud-Slap
   ply -> Protect opp), **seed 420** (Rain Dance opp -> Reflect opp x7), **seed 384** (RAIN_CONTINUES -> Protect opp x2) and **seed 785**
   (Ice Ball opp -> Protect ply x2), each with streak = `(seed * 11) % 49` as in the census. The receipts are `parity-<seed>.json` (see §1
   addendum).
6. **Gates:** smoke, full `npm test`, `npm run build`, typecheck, the census, the parity routes.
7. **Ledger wording:** "Post-KO send-out allocator reseed after a words-order unit (reseed85): the reseed reads occupancy only, and a words
   unit is allocator-net-zero, so the order host keeps a word-free occupancy shadow (the pre-body tracker replayed through the pending
   marker's units). ROM: 13 routes x 2 probes x 2 runs, A == B; 4 / 4 words-vs-control pairs SAME occupancy with a differing free order;
   20 / 20 windows 0 px. +47 / +4,834."

**Resume conditions (not provable here):** Astonish 310 (2 / 211) needs an Astonish order plan, or a separately audited "allocator-net-zero
body without a plan" shadow step. The 3 / 240 words-chain stays clear once their chains' blockers (Gust / Transform as live adapters with
plans; Return power level 0 plan) have plans. The shadow then replays them unchanged.

## 6. Reproduction (from workspace/)

```
sh tools/integration/reseed85Run.sh <fresh-out-dir>                     # probes (13 x 2 x 2) + fixtures + windows (base + patched); ~6 min
RESEED85_CENSUS=1 sh tools/integration/reseed85Run.sh <fresh-out-dir>   # + the 4 seeds-0..999 censuses (live-share + allocator, base / patched)
```
The runner refuses a non-empty out dir, checks `git status --short src` is clean, builds `git archive 005101dfc` copies inside the out dir
(+ this checkout's reseed85 tools / scenarios, `node_modules` / `reference` symlinks), applies the `.diff` only to the patched copy, deletes the
raw RGB dumps, and prints `same` / `DIFF` for every receipt vs `tools/integration/fixtures/reseed85/`.

Individual steps: `reseed85Probe.py <out>` -> `reseed85Occupancy.py <out> <json>`; `reseed85Fixtures.py <out>/raw <fx>` -> (in a copy)
`reseed85Check.ts <fx> <scenario> <json>` -> `reseed85Windows.py <check-base> <check-patched> <json>`; censuses `hist73LiveShareCensus.ts` /
`hist73AllocatorCensus.ts --seeds=A..B --index-from=A` (10 shards) -> `hist73Merge.py` -> `hist73KeyCheck.py` / `prep43CensusDelta.py` /
`hist73Chains.py` / `hist73ReseedBlockers.py`; `reseed85Digests.py <base-shards> <patched-shards>` (`digests.txt`).
