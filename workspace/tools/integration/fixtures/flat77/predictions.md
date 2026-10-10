# flat77 predictions (committed BEFORE any probe)

Base: master `dd00bdd6e` (production src `d73cf1af`). The production hosts' lends come from `predict.txt`: `flat77Fixtures.py --predict` fixtures
(the PREDICTED turn-0 history of each staging) run through `flat77Check.ts` with `FLAT77_PREDICT=1` in a git-archive copy of `dd00bdd6e`.

## Source reads at a Flatter activation (Move_FLATTER, data/battle_anim_scripts.s)

- `LaunchBattleAnimation` (battle_anim.c:260-261) zeroes `gBattle_WIN0H` / `gBattle_WIN0V` at EVERY launch. Row 0 of the first body
  still latches the intro's WIN0 240 / 161; from row 1 it is 0 / 0 (the production register file already has this).
- `AnimTask_CreateSpotlight` (battle_anim_effects_3.c:1674) writes WININ, WIN1H / WIN1V (0..240 x 120..160) and sets DISPCNT_WIN1_ON.
- `AnimFlatterSpotlight` (:3087) writes WINOUT, WIN0H / WIN0V = 0 and sets DISPCNT_OBJWIN_ON (SetGpuRegBits). Its step 3 writes WINOUT
  again and **XORs** DISPCNT_OBJWIN_ON.
- `AnimTask_RemoveSpotlight` (:1697) writes WININ, zeroes WIN1 and clears DISPCNT_WIN1_ON.
- `AnimTask_HardwarePaletteFade` writes BLDCNT / BLDY in, then restores them out.
- The body reads no BG scroll, no scanline buffer and no BGnCNT.
- Allocator: `loadspritegfx` SPOTLIGHT / CONFETTI take the lowest free tile range and palette slot. Known entry: tile slot 6 = [305, 64],
  slot 7 = [433, 12], palette slots 7 / 8. Both are freed at the script end.
- Words: 114 Random2 words (38 confetti x 3) from the activation gRng2Value.

So the register state an earlier body can change is WIN0 (every body: 0 / 0) and DISPCNT bit 15. S0 = 0xbf40 has OBJWIN on. A finished
Flatter body leaves it OFF (`(S0 | WIN1) ^ OBJWIN & ~WIN1 = 0x3f40`). WININ / WINOUT end at 0x3f3f = S0 and BLDCNT / BLDY at 0.

## Predictions

- **P1 registers.**
  - At every LATER body, row 0 = S0 with WIN0H = WIN0V = 0 (`liveQ2Moves.ts registersFor(false)`), whatever the predecessor.
  - Rows >= 1 equal the first-body file (`liveFlatterRegisters`) after Quick Attack / Tackle / HIT / STATS_CHANGE / CONFUSION.
  - After an earlier FLATTER body, DISPCNT = 0x3f40 on rows 0..6 and 0x7f40 on rows 7..48. From row 49 it is the first-body file (the
    spotlight init sets OBJWIN again; step 3's XOR then gives the same 0x7f40 / 0x3f40 tail as the first body).
  - **Pixels: none of these is visible.** WIN0 0 / 0 at row 0 only moves pixels from WININ to WINOUT, and both are 0x3f3f. No OBJ-window
    sprite exists before row 49, so OBJWIN on / off does not change a pixel.
- **P2 activation order** (production chain lend, `predict.txt`).
  - qa-* turn 0 (after Quick Attack + HIT): known, free `[3,5,4,21,20,19,...]`, firstBody false.
  - tk-* turn 0 (after Tackle + HIT): known, free `[3,4,21,20,5,19,...]`.
  - ff-* (directly after a Flatter + STATS_CHANGE): the order host has NO lend (`orderKnown false`). Every later Flatter body after a Flatter
    is predicted to decline at `!spriteOrderInput?.known`, before any consumer gate (gates53 row D, host-side). The ROM order there is
    recorded but cannot be claimed.
  - Predicted: the ROM sSpriteOrder at activation == the prefix + the production lend for qa-* / tk-*.
- **P3 allocator.**
  - ROM: spotlight [305, 64] slot 6 / palette 7 and confetti [433, 12] slot 7 / palette 8 at every later window. Every predecessor here
    frees its sprites; Tackle's impact sprite included.
  - Production: the allocator host stays KNOWN after Quick Attack 98 / HIT / STATS_CHANGE / CONFUSION / FLATTER (all audited net-zero).
    It goes UNKNOWN after Tackle 33, which is not in `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`.
- **P4 gate.** `prepareLiveMoveSpriteAllocator` returns NO input for a planless net-zero move. So `spriteAllocatorInput?.historyKnown` is
  ALWAYS undefined for Flatter, and that narrowing alone would never go live. The temp patch needs an allocator-history claim for 260 from
  the allocator host, plus the later-body row-0 WIN0 0 / 0.
  - Expected live after the patch: qa-* turn-0 windows, and later qa turns only where the order host lends (not after the consumer's own
    Flatter).
  - Expected still declined: tk-* (allocator unknown) and every window after a Flatter (order unknown).
- **P5 pixels.** Every window that goes live under the patch: 0 px on every row, r1 == r2.

## Batch 2 (`ex-*`, committed BEFORE its probes; batch 1 already probed)

Source: under the temp patch, the patched census code (an index-offset copy of `liveShareCensus.ts`, scratch only) lifts 17 Flatter
commands on seeds 0..999. Their immediate predecessors include Light Screen, Mega Drain, Aerial Ace, Bite, Shock Wave, Iron Defense,
Mud-Slap and Acid. Each is staged as the fast lead's move before the consumer's turn-0 Flatter, both sides, 16 scenarios.

- **P6 registers.** Row 0 = S0 with WIN0 0 / 0. Any other difference is a display-neutral BGnCNT priority left by a `monbg` / `clearmonbg`
  predecessor (as Quick Attack). BLDCNT / BLDALPHA / BLDY / WININ / WINOUT / DISPCNT = S0: every one of these scripts ends with
  `blendoff` / restores its window registers.
- **P7 lends** (`predict.txt`, production chain lend).
  - Known for all 16.
  - Mud-Slap (a words order unit) gives the deferred lend, resolved from the pinned words.
  - The predicted fixtures add a HIT after Light Screen / Iron Defense; that is a predictor artifact (no HP drop in the ROM), not a claim.
- **P8 allocator.** The host stays known for all 16 (all audited net-zero; Light Screen through its PLANS entry). The ROM shows the known
  entry (spotlight [305, 64] / 7, confetti [433, 12] / 8).
- **P9.** All 16 windows are live under the temp patch: 0 px on every row, r1 == r2.

## Batch 3 (`ex-*-nidorino-golem-opp`, committed BEFORE its probes; batches 1 + 2 already probed)

Batch 2's probes showed a staging miss: NIDORINO (speed 63) outspeeds SNORLAX (50), so the 8 `ex-*-nidorino-snorlax-opp` Flatter bodies are
FIRST bodies (0 units). They stay as first-body controls. Batch 3 re-stages the opponent side with GOLEM (65 > 63) as the fast lead.

- P6 – P9 as batch 2, for these 8: lends known (`predict.txt`; Mud-Slap deferred), allocator known, row 0 = S0 with WIN0 0 / 0 plus
  display-neutral BGnCNT priority only, all live and 0 px under the temp patch.
