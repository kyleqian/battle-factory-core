# land87 — the post-KO send-out allocator reseed after a words-order unit (reseed85 landed)

## Results

- **Landed:** `tools/integration/fixtures/reseed85/reseed85-temp-src.diff` applied with `patch -p1` (`src/engine/liveSpriteOrderHost.ts` only, all hunks, no `.orig` / `.rej`):
  `LiveSpriteOrderHost.deferredOccupancy` (a word-free occupancy shadow of a pending words marker), `deferredOccupancyTracker()`, and
  `liveSpriteAllocatorReseedable` falls back to the shadow. No lend, plan, words, RNG or gameplay change; the free ORDER stays deferred.
- **Flatter 260 policy:** the shadow's license is "every words unit is allocator-net-zero". `WORDS_ORDER_UNIT_MOVE_IDS` = 28, 189, 240, 260, 291, 301;
  all six are in `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` (260 via the hist73 net-zero audit group; 28 / 189 / 240 / 291 / 301 by earlier audits) and
  RAIN_CONTINUES is in `LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS`. No membership change was needed. Pinned by `tests/land87WordsOccupancyReseed.test.ts`.
- **Tests:** `tests/land87WordsOccupancyReseed.test.ts` (8 tests: Sand-Attack, Mud-Slap, RAIN_CONTINUES, nested; refusals; policy; reseed85 + land87 receipts).
  Revert experiment (the pre-patch `liveSpriteOrderHost.ts`): the 4 shadow tests fail, the refusal / policy / receipt tests pass.
- **Windows (8 of reseed85's 20, production live renderer of this tree, fresh direct-mGBA probes, 12 of 12 A == B probe pairs, each check = two fresh
  flat77Probe runs):** sa-opp-pidgeotto-protect-c0, ms-opp-diglett-protect-c0, rd-opp-poliwag-reflect-c0 / -c1, sa-ply-snorlax-protect-c0 / -c1,
  rd-ply-snorlax-reflect-c0, ms-ply-snorlax-lightscreen-c0: all live, **0 px**, r1 == r2, 814 rows; the 6 check JSONs are **byte-identical** to
  `fixtures/reseed85/check-patched/`.
- **Census (seeds 0..999, 10 `--index-from` shards, base c25af4253 + the import fix below vs final):** **+58 commands / +6,955 frames**, live 25,962 -> 26,020,
  frames 3,880,093 -> 3,887,048; allocator-unknown 55 / 5,514 -> 6 / 530; 0 live -> fallback; command KEY sequence, frames per command and battle digest (5cc95d1eace6)
  identical (`prep43CensusDelta.py`, `hist73KeyCheck.py`). Gained: PROTECT 24, LIGHT SCREEN 9, REFLECT 8, BARRIER 5, MAGIC COAT 3, FLATTER 9 (unclassified case-local gate; 1,971 frames).
  reseed85's +47 / +4,834 on aeaa33dff was 46 allocator commands + 1 Flatter; land86's Flatter words unit adds chains that now reach the shadow (3 Magic Coat, 8 more Flatter).
- **Master defect found and fixed (separate commit, outside the grant, one word):** `src/engine/liveMoveAnimation.ts:1608` (land86's Flatter carry) calls `composeLivePalettes`,
  which cast83's merge left un-imported: `npm run typecheck` fails TS2552 on c25af4253, and the census ran 27,137 commands instead of 27,516 (battles truncated by a ReferenceError).
  Both census trees carry the fix. Drop that commit only if the supervisor fixes master differently.
- **ON / OFF parity** (`flat77Parity.ts`, seeds 11 / 98 / 420, streak = (seed * 11) % 49): byte-identical to reseed85's `parity-*.json`.
- Receipt: `tools/integration/fixtures/land87-live-receipt.json`.

Scope: a live adapter, not whole-playable arbitrary-history exactness. Resume conditions are reseed85 §5 (Astonish 310, Gust / Transform / Return level 0 plans).

## Reproduction (from workspace/)

```
sh tools/integration/land87Census.sh <workdir> <out-dir>   # base: git archive c25af4253 copy; final: this checkout; then hist73Merge-d automatically
PYTHONPATH=<libmgba-py> python tools/integration/reseed85Probe.py <out> --only <scenario,...>; python3 tools/integration/reseed85Fixtures.py <out>/raw <fx>
node --experimental-strip-types --no-warnings tools/integration/reseed85Check.ts <fx> <scenario> <json>
```
