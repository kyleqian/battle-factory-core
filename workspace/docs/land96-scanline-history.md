# land96: scan93 patch A landed (scanline-buffer history; Memento later bodies live)

## Results

- Patch A (`tools/integration/fixtures/scan93/scan93-temp-src-A.diff`) applied with `patch -p1`, all hunks landed, no `.orig` / `.rej` kept.
  New `src/engine/liveScanlineHistory.ts`; the order host carries and lends `scanlineHistory`; Memento (262) later bodies go live when
  the history is known and both battlers' idle rests are zero. Extrasensory (326) opponent later bodies read the history (display-neutral);
  Extrasensory **player** later bodies still decline (patch B's D4 lag entry is not approved).
- Census 0..999, base `4a9f6a06f` vs final: **+4 commands / +713 frames** (26181 -> 26185 live, 3905536 -> 3906249 live frames), exactly the 4
  player Memento later bodies (census battles 7, 92, 751, 800; 178-179 frames). 0 live -> fallback, command KEY digest, battle digest and
  battle digest excluding frames identical, 0 pairing mismatches. Same delta as scan93's A census (its absolute totals differ only because
  scan93's base predates `4a9f6a06f`).
- Re-render through the final worktree code: scan93's 17 A-live later windows (5 Memento + 12 Extrasensory opponent-attacker windows), two
  invocations x 2 fresh direct-mGBA runs each: r1 == r2, 0 px residual on every row, byte-identical to scan93's committed `check-A.json`
  (verdict, rows, exactRows, residualPixels, render digests). Memento windows are `exact` (175 / 175 / 175 / 182 / 180 rows); the
  Extrasensory windows are `other-phase-documented` (162 rows) as before.
- ON/OFF parity (`flat77Parity.ts --seed=7 --streak=28`, the Memento later-body route): RNG, rules context and boundary equal at all 13 turn boundaries.
- Pins moved: `tests/animation/liveExtremeSpeedMementoAdapters.test.ts` "gates" (later body after Psywave is live; a Dragon Dance predecessor
  declines) and route 127/28 (later Memento body active, battle continues).
- New `tests/land96ScanlineHistory.test.ts` (7 tests): the fold per predecessor class vs the RAM digests of all 103 receipt bodies (67 known,
  36 invalidated), the order host lend, the Memento later-body gate (history + rest-free), Extrasensory player later bodies still declining.
  Revert experiment: restoring the first-body-only Memento gate (`!spriteOrderInput.firstBody` -> null) fails 3 of the 7 tests; restored.

Receipt: `tools/integration/fixtures/land96-live-receipt.json`.

## Reproduce

    mkdir -p .integration/validation/land96/sel   # copy the 17 fixtures named in scan93/check-A.json from scan93/live/
    OUT=$PWD/.integration/validation/land96/chk JOBS=8 sh tools/integration/later58Check.sh .integration/validation/land96/sel .integration/validation/land96/check.json
    # census: git archive 4a9f6a06f . into a scratch dir (symlink node_modules / reference), then in each tree
    #   liveShareCensus.ts --seeds=$a..$((a+99)) --index-from=$a --out=... --commands=... for a in 0 100 ... 900
    # hist73Merge.py; prep43CensusDelta.py; scan93CensusCheck.py
    node --experimental-strip-types --no-warnings tools/integration/flat77Parity.ts --seed=7 --streak=28
