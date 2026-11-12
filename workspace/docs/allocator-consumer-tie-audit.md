# Allocator-consumer draw-order tie audit (S10A, side lane, evidence only)

Question: Light Screen 113, Reflect 115, Mirror Coat 243, Barrier 112, Magic Coat 277 and Protect 182 are exact as a first
move body. Can their displayed frames depend on the **free-slot order** of `sSpriteOrder`, which earlier net-zero bodies and
status animations permute (`docs/sprite-order-provider-design.md` destroy-to-head rule)?

Receipt `tools/integration/fixtures/allocator-consumer-tie-audit.json` (pins, per consumer x scenario rows); compact raw
`tools/integration/fixtures/allocator-consumer-tie-raw/<scenario>.json` (run 0 in full, run 1 as a hash plus `identical`);
scenarios `tools/integration/fixtures/allocator-consumer-tie-scenarios/` (44 staged); probe
`tools/compare/allocatorConsumerTieProbe.py`; stage/run/receipt `tools/integration/allocatorConsumerTieAudit.py`.

## Verdict

**All six consumers: HISTORY-INDEPENDENT on every sampled frame.** Over 54 consumer/scenario rows (about 5,200 window
frames, both orientations, both fresh runs identical on every row) there is **no frame on which any visible sprite of the
move (wall, sparkle, shield) has a SortSprites key equal to any other visible sprite's.** Zero tie frames, so zero
overlapping ties. Draw order of the move's sprites is therefore decided by `(oam.priority<<8|subpriority)` and wrapped
`oam.y` alone, never by the array order the free-slot history leaves behind.

| consumer | rows (scenarios x orientation x variant) | window frames | tie frames (move sprite = another visible sprite) | overlapping ties | later-body cases reached | verdict |
|---|---|---|---|---|---|---|
| Light Screen 113 | 10 | 890 | 0 | 0 | after Tackle, Smokescreen(+status body 0), Toxic(+poison status body 0), both orientations | HISTORY-INDEPENDENT |
| Reflect 115 | 9 | 738 | 0 | 0 | after Smokescreen + Tackle (player side) | HISTORY-INDEPENDENT |
| Barrier 112 | 12 | 948 | 0 | 0 | after Tackle, Smokescreen, Toxic (+status body 0), Barrier itself; both orientations | HISTORY-INDEPENDENT |
| Magic Coat 277 | 9 | 711 | 0 | 0 | after Rock Slide(157)+Smokescreen bodies (player side, slot2-smokescreen) | HISTORY-INDEPENDENT |
| Protect 182 | 12 | 1512 | 0 | 0 | only after an earlier Protect body (t2), both orientations | HISTORY-INDEPENDENT (thin later-body evidence) |
| Mirror Coat 243 | 5 | 445 | 0 | 0 | native 2nd body (after Confusion 93) and turn-2 repeat, both orientations | HISTORY-INDEPENDENT |

## Method

Profile `battle-scene-on`, direct mGBA processes (`PY=<vendor>/mgba-venv/bin/python`). The lane oracle is Scene OFF, but
Scene OFF skips move animations entirely (every body is `sAnimMoveIndex` 0, nothing activates); every earlier allocator
probe and the integration use Scene ON for the same reason.

1. Probe samples each frame after `oracle.advance`: for every occupied slot template and callback symbol, `oam.priority`,
   subpriority, raw `oam.y`, the key `y` exactly as `SortSprites` computes it (`y>=160 -> y-256`; double-affine size-3
   square/V-rect `y>128 -> y-256`, sprite.c:372-460), `oam.x`, shape/size/affine mode, invisible, subsprite-table flag;
   plus `sSpriteOrder[64]` and the first 48 `gMain.oamBuffer` entries. Window = activation-1 .. cleanup+2 of each body
   of the consumer move (activation = first frame `gAnimScriptActive && sAnimMoveIndex == move`).
2. OAM emission order = `sSpriteOrder` filtered by `inUse && !invisible` (sprite.c:482-492, `AddSpritesToOamBuffer`);
   hardware draws a lower OAM index on top. The sorted order is checked against the recomputed keys on every frame
   (`sortInconsistentFrames` = 0 in all rows), so the recomputed key is the one the game sorted with.
3. Move sprites = slots whose template differs from the slot's template at window start. Tie = two visible sprites, at
   least one a move sprite, with identical `(prio, sub, key y)`. Overlap = intersection of the two OAM rectangles (shape/size
   table, doubled for double-affine) clipped to the 240x160 screen; sprites with subsprite tables are conservatively
   counted as overlapping (none ever tied).
4. Later-body comparison: each later body's per-offset emitted label sequences are compared with the first-body reference
   of the same consumer/orientation; for every differing frame, every (move sprite, other sprite) pair's relative emission order
   is compared. Result: **0 move-vs-other inversions in all rows** (differences that exist are other-side battler sprites
   moving/absent, i.e. a different Tackle/Smokescreen context, not reordering).

## Scenarios (variants)

`first` accepted/wall-family scenario as is (consumer is the first body for Reflect, Magic Coat, Protect; Light Screen/Barrier
act after the opponent's Tackle; Mirror Coat after Confusion). `slow` other lead replaced by Shuckle so the consumer acts
first (Light Screen, Barrier). `smokescreen-t2` / `toxic-t2` other lead uses Smokescreen(108)/Toxic(92) for two turns (the
consumer is a later body in turn 1 when the other side is faster: Light Screen, Barrier, plus a Barrier turn-2 repeat; Toxic
adds the poison status-animation body 0). `slot2-smokescreen` / `slot2-toxic` (player orientation only, the opponent's move
slot is chosen by AI) the consumer user's turn-1 move is Smokescreen/Toxic and the consumer sits in slot 2 (RIGHT) for turn 2.
Mirror Coat: `first` is natively a second body; `t2` appends one more turn.

Reached later bodies: Light Screen after 33 / 108+status / 92+status; Barrier after 33 / 108 / 92+status / 112; Reflect after
108+0+33; Magic Coat after 157+108+0; Protect only after 182 (turn 2, Protect after Protect); Mirror Coat after 93 (and 243).
**Not reached:** `slot2-toxic` for Reflect/Magic Coat and both `slot2-*` for Protect (consumer did not play in turn 2: the
RIGHT press mistimed after the poison/Protect text, 0 bodies); opponent-orientation Reflect/Magic Coat/Protect later bodies
(Magic Coat/Protect priority +3 act first, and a repeat Protect/Magic Coat/Reflect/Light Screen fails). Those rows are in the
receipt with `consumerBodiesReached` 0 or with no earlier body. The free-slot order at activation-1 differs from the
first-body order in every reached later case (`freeOrderAtActivationMinus1` per row), confirming the history actually
varied.

## What a persistence rule may and may not assume

May: occupancy is exact (earlier audited net-zero bodies/status animations); free-slot **order** may be treated as
unknown for these six consumers, and the consumer's own sprites drawn by key only, because in all sampled windows their
keys are distinct from every other visible sprite's. Slots: wall slot 3 (Barrier/Magic Coat/Reflect/Light Screen/Protect/
Mirror Coat), effect slots 4/5/7, as in the wall-family receipts.

May not: assume that equal-key ties never exist in general. Healthboxes and the battler pair share keys (for example
priority 0 / subpriority 1 healthboxes); these ties do not involve the move's sprites and were not examined for overlap.
The conclusion is empirical for the sampled scenarios (Factory Level-50 singles species/positions listed above): a
different battler layout (a wall sprite whose priority/subpriority/y collides with a battler or sparkle sprite) would need
a fresh audit. Do not extend this to other consumers (any move whose sprites use subpriority 200 with `y` equal to another
sprite at the same priority), and treat Protect later-body evidence as thin (only after a prior Protect).

## Reproduce

    V=../../vendor; export PY=$V/mgba-venv/bin/python PYTHONPATH=$V/libmgba-py
    python3 tools/integration/allocatorConsumerTieAudit.py stage
    python3 tools/integration/allocatorConsumerTieAudit.py run [name-substr ...]   # work raw in $TIE_WORK (/tmp/tie-work)
    python3 tools/integration/allocatorConsumerTieAudit.py receipt
