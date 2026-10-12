# stf115 (S10A main lane, 2026-10-11): the remaining Struggle 165 declines — order lends (rung 1), doll cells (rung 2)

Base: FIXED master `7390bf8ca` (Struggle live since stl109). Evidence + banked patch, new files only; every tree is a git-archive copy of
`7390bf8ca` (+ a banked `tools/integration/fixtures/stf115/stf115-*.diff`). Direct mGBA only, lab seed pinned (stg107Stage.SEED 305420349).
Runner: `sh tools/integration/stf115Run.sh <fresh-out-dir>` (§4).

## Results

- **Rung 1 — the order after a Struggle body: the premise does not hold; no plan is missing.** stg107 §3.1 / §3.5 says Struggle has no
  end-order plan entry. That is wrong: `src/engine/spriteOrderProductionPlans.ts` `SPRITE_ORDER_PRODUCTION_BODIES` has **both**
  `"165:player": 94` and `"165:opponent": 94` (plan 94 = `Cff;D0,1/P540,540;Cf;D2`). `165:player` comes from
  `fixtures/sprite-order-body-plans-ext.json` (EXACT-PLAN, `live: false`). `165:opponent` is absent from that fixture but present in the
  table's appended block. `SPRITE_ORDER_PRODUCTION_ANIMS` (the non-move table) has no Struggle key and needs none. Nothing is missing.
  - **Prediction (from source, = the in-tree plan 94, committed before this step):** the waves take slots 3 / 4 (subpriority attacker − 2
    → word 540 player / 550 opponent). Both are destroyed at age 75. The hitsplat reuses slot 3 (attacker − 3 → 539 / 549) and is freed at
    86. Slot 3 (lower stale word) therefore sorts before slot 4, and the free order after the body begins `[3, 4, 21, 20, 5, 19, …]`, the
    rest unchanged.
  - **ROM RAM (sSpriteOrder at every next activation, two fresh probe batches, r1 == r2):** the production CHAIN lend equals the ROM free
    order on **68 / 68 windows**. **28 / 28** of them follow a Struggle body: both sides, after first and repeated Struggles, after
    Taunt / Harden / Mean Look / Substitute, KO and recoil-faint battles. Receipt `fixtures/stf115/rung1-lends.jsonl`.
  - **Production render (unpatched `7390bf8ca`, aligned windows, audit21Check):** **58 / 58 live windows 0 px on every row**, including
    **23 / 23 live windows after a Struggle** (repeated Struggle bodies, and Taunt / Harden / Substitute after a Struggle). r1 == r2 on 68 / 68.
    The 10 non-live windows are the named gates: the stg107 ONIX later-body rest gate (3), defender doll (Struggle 4 + Taunt 2), and
    receipt `fixtures/stf115/rung1-windows-base.txt`.
  - **Where the census's 106 `sprite-order lend unknown` Struggle declines come from** (census 0..999 on `7390bf8ca`, receipt
    `fixtures/stf115/census-base-declines.json`, `stf115Declines.py` reads the order host's own invalid reason): **101** are in ONE battle
    (705, CHANSEY vs WOBBUFFET). There, the player's **Metronome called Odor Sleuth 316** at command 16, a fallback body with **no order
    plan** (`316:player` / `316:opponent` are ABSENT from `sprite-order-body-plans-ext.json`). That invalidates the host for the rest of the
    battle (106 declines, 101 of them Struggle). The other **5** are in battle 729, after a player **Hyper Beam 63** (`63:player` NEEDS-KEYS:
    "equal priority word, different y"; 12 declines, 5 Struggle). **A Struggle plan therefore lifts 0 of the 106.** Lifting them needs order
    plans for Odor Sleuth (`CloneBattlerSpriteWithBlend` x2: clones copy the target's priority word AND y, so the order depends on SortSprites'
    tie rule) and Hyper Beam's y keys. Both are separate units, not Struggle work (§3).
- **Rung 2 — doll cells:** §2.

## 1. Rung 1 detail

| Census 0..999 on `7390bf8ca` (stg107Census.sh) | value |
|---|---|
| commands / live / live frames | 27,458 / 27,128 (98.80 %) / 4,031,756 of 4,061,256 (99.27 %) |
| Struggle commands / live / fallback | 1,032 / 883 / 149 |
| `sprite-order lend unknown` after `316:player` (battle 705, Metronome → Odor Sleuth) | 101 Struggle (+5 other bodies) |
| `sprite-order lend unknown` after `63:player` (battle 729, Hyper Beam) | 5 Struggle (+7 other bodies; battle 644 adds 0 Struggle) |
| `attacker doll: swap body cell unproven` | 24 (battles 587, 796) |
| `defender doll: unproven body cell` | 19 (battles 497, 587, 796, 881) |

(`310:player` Astonish invalidates 5 non-Struggle bodies in 4 battles. It is listed in the receipt, not Struggle.)
