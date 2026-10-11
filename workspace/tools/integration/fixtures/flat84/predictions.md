# flat84 predictions (committed BEFORE any comparison with the ROM endOrder / activation free orders)

Base: master `b05d384ca` (production src `4c4fe4c7`). The temp patch `flat84-temp-src.diff` (3 files) applies to git-archive copies only.

## Source derivation (Move_FLATTER, data/battle_anim_scripts.s:8412; AnimFlatterConfetti, battle_anim_effects_3.c:3033-3084)

- The 19 `call CreateFlatterConfetti` run with no delay between them, so all 38 confetti are created on ONE frame (FLATTER_K burst row 65),
  lowest free slot each (CreateSprite), after the spotlight and the second vertical dip.
- Each confetti draws 3 Random2 words (tile offset, data[0], data[1]); its y step is `y2 -= data[1] >> 8`, `data[1] -= 48` per frame, so
  its y path depends on its own third word only; every confetti destroys itself when `++data[3] == 31`: ALL 38 free on the same frame.
- SortSprites (insertion sort on (priority, subpriority, y), stable) runs every frame over all 64 entries of sSpriteOrder: while alive the
  confetti are permuted by their y (words), and once destroyed every freed entry carries the same dummy key, so their relative order is
  frozen at their last live frame. The spotlight / dips free on fixed rows, words-independent.
- => **Flatter is a words-order unit**: the post-body free order is a function of (activation free order, the 114 words). It is the order
  the production Flatter adapter already carries for its own pixels (`liveFlatterHardwareOamRows`, `carryLiveSpriteOrder` with
  `sortGbaSpriteOrder`) at its last row (218), minus the known-entry occupied slots. Battler sprites / species only move live entries,
  which never reorder two free entries (stable sort), so the plan is species-independent in value; the carry still reads the body's
  species for the adapter inputs (anchors, palettes), as Ice Ball's does.

## P1 plan == ROM (Flatter bodies)

`predict-plan.txt`: `flat84Plan.ts` with FLAT84_PREDICT=1 in the PATCHED copy on the r1 probes (reads only the activation fields
`at.spriteOrder`, `at.rng2`, `at.battlers[].species`; never `endOrder`): 44 Flatter bodies (first + later, both sides, 4 ff scenarios x 4
cycles and the consumer scenarios' Flatter bodies), 32 distinct plans. Prediction: **44 / 44 plan == ROM endOrder free order**.

## P2 consumer lends == ROM

`predict-lends.txt`: the production lend column of `flat77Check.ts` FLAT77_LENDS_ONLY=1 in the PATCHED copy on the 56 flat84 fixtures
(`flat84Fixtures.py` from the r1 probes; the chain = the production hosts fed as the orchestrator feeds them, the deferred lend resolved as
the render seam resolves it). Extracted (fixture, move, live, decline, deferred, lend[0..16]) and committed before the `same` / `rom`
columns were read. Prediction: **every consumer whose chain crosses a Flatter (deferred = true) has lend == ROM**; base: those lends are
null (flat77: 28 / 28).

## P3 Flatter's case-local gate

No narrowing needed: after a Flatter body the resolved deferred lend is `known` (no `firstBody`), and the allocator host stays known
(Flatter 260 is a net-zero history-claim move since land79 / flat77; STATS_CHANGE / Status_Confusion are audited net-zero), so the
existing gate `!known || (!firstBody && !historyKnown)` already admits a Flatter after a Flatter. Prediction: every Flatter-after-Flatter
fixture is `live: true` in the patched copy, `live: false` in base.

## P4 windows

Every newly live after-a-Flatter window (Flatter and non-Flatter consumers, both sides) renders **0 px on every row**, two fresh probe
processes r1 == r2, through the PATCHED production live renderer.

## P5 census 0..999

Master: Flatter "unclassified (case-local gate)" 14 / 3,066 frames; consumers stopped at "no EXACT plan: body 260:opponent" 10 / 1,570
and "body 260:player" 3 / 556. Prediction: the case-local Flatter bucket and both 260 stops shrink (to 0 where no other stop precedes),
a gain of at most +27 commands / +5,192 frames, 0 live -> fallback, command key sequence + battleDigestExcludingFrames identical.
