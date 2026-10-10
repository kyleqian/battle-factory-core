# land79: Flatter 260 live at later bodies with a known allocator history

Landing of the flat77 patch (docs/next-adapters-flat77.md) on master `c6f60846e` (production src `cdae97b8`, cf78 merged). The patch applied with
`patch -p1` (offset only); the three hunks are unchanged: `liveMoveAnimation.ts` case 260 gate, `liveMoveSpriteAllocator.ts`
`LIVE_SPRITE_ALLOCATOR_HISTORY_CLAIM_MOVE_IDS` = {260}, `liveOamMoves.ts` later-body register base (S0, WIN0 0 / 0 on row 0).

## Results

- **Census seeds 0..999, base `c6f60846e` vs final, one process each: +17 commands / +3,723 frames**, exactly flat77's prediction.
  - 0 live -> fallback regressions; command count, KEY sequence, frames per command identical; `battleDigest` `cc9e7604ea64a303` and
    `battleDigestExcludingFrames` `48b2d42bacd93479` identical.
  - Live share by count 94.17 % -> 94.24 %, by frames 97.94 % -> 98.03 %. `faithfulRandomHistory` 1,064 -> 1,067 commands.
  - cf78 changed nothing here: the 58 Castform-weather-form declines are the same before and after.
  - Receipts: `tools/integration/fixtures/land79-census/` (`delta.json`, `keycheck.txt`), `tools/integration/fixtures/land79-live-receipt.json`.
- **Windows re-rendered through the production live renderer (final code), each with two fresh direct-mGBA probe processes (r1 == r2):**
  qa-nidorina-golem-opp, qa-nidorina-golem-ply, qa-nidorino-snorlax-opp, qa-nidorino-snorlax-ply (Quick Attack predecessor, both sides),
  ex-aerial-ace-nidorina-golem-ply, ex-mega-drain-nidorino-golem-opp. Each: **219 rows, 0 px, lend order == ROM, allocator 431 / 431**.
  The six check JSONs are byte-identical to flat77's committed `check/` ones (`tools/integration/fixtures/land79-check/`).
  Command: `node --experimental-strip-types --no-warnings tools/integration/flat77Check.ts tools/integration/fixtures/flat77/fixtures <name> <out.json>`.
- **Test** `tests/land79FlatterLaterBodies.test.ts` (9 tests): claim set = {260}, history-only input only from a known host; per window the gate is live
  with the allocator input and null without it; row 0 WIN0 is 0 / 0 at a later body and 240 / 161 at the first-body variant; production-renderer pixel
  digests pinned. Revert experiment: with the three src files restored to the base, 9 / 9 fail; with the patch 9 / 9 pass.

## Not proven / unchanged

Shapes after a Flatter, or after Tackle, stay declined (order lend null / allocator host unknown), as in flat77. This is a live adapter, not whole-playable
arbitrary-history exactness.
