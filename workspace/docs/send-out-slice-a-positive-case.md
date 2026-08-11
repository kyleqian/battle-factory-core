# ISSUES #71 Slice A — staged positive case: RATTATA through the real battle-start send-out settle (Battle Scene OFF)

Measurement + fixture deliverable for the main lane's Slice A. The honest
problem Slice A was supposed to solve: only ONIX and RATTATA have a nonzero
terminal rest offset (`speciesFrontIdleRestOffset` → `{x2:1, y2:0}`), so
wiring the offset at the five settle hooks against GROVYLE/KABUTO/PIDGEOTTO/
MURKROW proves only that the wiring is inert. This brief stages the one
species that would show a positive case — RATTATA as the opponent front
sprite — and measures, from live RAM, what the settled sprite actually holds.

**Result up front: the positive case does not exist under Battle Scene OFF.**
The real ROM settles RATTATA at `{x2:0, y2:0}` with `SpriteCallbackDummy`
and never moves off it, for the entire battle. The `{x2:1, y2:0}` claim is
**refuted** for live OFF play, the app's current offset-free settled draw is
**0 pixels wrong**, and the old `{+1,0}` wiring would have been a **361-pixel
regression**. This independently re-confirms ISSUES #71's Slice-D record /
R4 addendum and the already-merged offset removal at the two generated-route
hooks.

## 1. The staged fixture

`tools/battle-lab/send-out-slice-a-rattata-off.json` — a new `mechanicLab`
scenario built on the committed RATTATA parties (same seed 2, trainer 110,
`overrides.parties` three complete Level-50 mons per side) as
`send-out-front-idle-rattata-off.json`, plus:

- `preCheckpointCaptureAllFrames: true` — the internal route (rental screen +
  battle-start send-out) is captured, which is where the send-out actually
  happens: the user-trace checkpoint is the action menu, after both mons are
  out. 2007 pre-checkpoint frames (absolute `0..2006`), 634 user-trace frames.
- a user trace (`A`, hold 30, `A`, hold 600) that confirms a move, plays a
  full turn to the next action menu, and holds — so persistence is sampled
  well past the settle, across a turn boundary.

**Determinism (twice-fresh, byte-identical):** two consecutive
`bin/oracle lab` runs (`/tmp/sa-run1`, `/tmp/sa-run2`) are `diff -r`
byte-identical across **all 2036 files** — 2007 pre-checkpoint PNGs + 28
post-checkpoint PNGs + `manifest.json`. Total emulated frames per run: **2641**
(2007 route + 634 trace). The trace's own `captureFrames` (28 frames) sample
the full post-checkpoint timeline.

## 2. RAM receipt at the settle

Probe: `tools/probe/dump-sendout-slice-a-rattata.py` — records
`gBattlerSpriteIds[0/1]` → `gSprites[slot]` fields (`x`, `y`, `x2`, `y2`,
`animNum`, `animCmdIndex`, `callback`, `data[2]`) for **every** emulated
frame of the route, pre and post, by wrapping `BattleLab.prepare()`'s
`_advance` (the internal intro route is otherwise invisible). Fresh probe
receipt: `tools/probe/receipts/sendout-slice-a-rattata-off-probe.json`
(2640 tick rows: 2006 pre + 634 post).

RATTATA lives in `gBattlerSpriteIds[1]` (slot 8, `data[2]==19`). Timeline
(pre-coordinate ticks, absolute from `new_session()`):

| pre-tick | event |
| --- | --- |
| 1204–1355 | battler-1 slot holds the opponent trainer (`SpriteCB_TrainerSlideIn` 0x0805d7ac) |
| **1581** | RATTATA mon sprite created (`slot 8`, `data2=19`, `x=176 y=56`, `x2=0 y2=0`, callback already `SpriteCallbackDummy` — `SKIP_FRONT_ANIM`, `pokemon.c:6803-6852` sets the dummy callback at creation) |
| 1599–1615 | ball arrival: `SpriteCB_OpponentMonFromBall` (0x08039b58) runs a single 16-tick `y2` descent (see (d)) |
| **1616** | **settle tick**: callback becomes `SpriteCallbackDummy` permanently; `x2`/`y2` never change again |

(a) **Settle tick: pre-tick 1616.** The sprite's callback is the dummy one and
`x2`/`y2` are stable at `{0,0}` from 1616 onward; `y2` returns to 0 at 1612
but the callback is still the ball-arrival one until 1616, so 1616 is the
earliest tick where *both* criteria hold. From 1581 to the end of the battle,
`x2 == 0` the sprite's entire life — it never reads `1`.

(b) **Settled `x2`/`y2` = `{0, 0}` — the `{x2:1, y2:0}` claim for RATTATA is
REFUTED for live Battle-Scene-OFF play.** `animNum == 0`, `animCmdIndex == 0`
throughout.

(c) **Persistence: yes, for the remainder of the battle.** All 634 post
ticks (`1..634`) read `(data2=19, x2=0, y2=0, SpriteCallbackDummy)` — zero
deviations, including across a complete turn (fixture confirms move 210,
RATTATA HP 105→85, player HP 157→112, player PP 20→19, back at the next
action menu) and 200+ ticks past the settle.

(d) **`x2`/`y2` trajectory through the intro** (RATTATA sprite, pre-ticks):

```
1581..1598: x2=0 y2=0
1599:       x2=0 y2=0    <- SpriteCB_OpponentMonFromBall starts
1600..1611: x2=0 y2=14,13,12,11,10,9,8,7,5,4,3,2   <- single descent
1612..1615: x2=0 y2=0
1616..:     x2=0 y2=0    <- SpriteCallbackDummy, settled
```

The only `x2`/`y2` motion in the entire send-out is this 16-tick `y2`
descent — the ball-arrival emerge. There is no horizontal (`x2`) animation
and no `ANIM_RAPID_H_HOPS` idle task; `SKIP_FRONT_ANIM` prevents the front
idle anim from ever launching.

## 3. The pixel consequence

`tools/probe/pixel-consequence-sendout-slice-a-rattata.py` renders RATTATA's
extracted front tileset with the engine's own `drawSpriteSheet` convention at
the app's generated-route origin `(144, 8+yOffset) = (144, 24)` and compares
against the oracle's settled frame (`/tmp/sa-run1/frame-00000.png`):

- **App's current settled draw (no offset): 0 mismatches** across the whole
  64×64 sprite canvas vs the oracle frame — the app is pixel-exact where it
  stands, so **the app is currently wrong by 0 pixels** (bbox empty). This is
  the brief's requested answer: with `(x2,y2)=(0,0)`, "shifted back by
  `(-x2,-y2)`" is the identity, so the literal diff is 0.
- **Hypothetical `{+1,0}` wiring (the old Slice-A behavior):** drawing
  RATTATA one pixel right of the oracle would differ on **361 pixels** over
  bbox `(164,41)-(190,71)` — i.e. wiring the "positive case" would not have
  been an inert no-op; it would have introduced a visible 361-pixel
  regression on every settled RATTATA frame. The oracle sprite footprint is
  518 px over bbox `(163,41)-(189,71)`.

**Verdict for Slice A:** "zero visible pixels" is exactly the finding. The
app's settled RATTATA already matches the real OFF game; there is no
positive case to wire at this seam. The only OFF-path send-out motion is the
16-tick `y2` ball-arrival descent (not a rest offset), which belongs to the
presentation of the emerge itself, not to `speciesFrontIdleRestOffset`.

## 4. Rerunnable verify

```
python3 tools/probe/verify-sendout-slice-a-rattata.py          # runs a fresh probe (~1-2 min)
python3 tools/probe/verify-sendout-slice-a-rattata.py <out.json>   # re-validate an existing probe
```

Re-derives (a) settle tick == 1616, (b) settled `x2`/`y2` == `{0,0}` (and
`x2 == 0` for the sprite's whole life), (c) all 634 post ticks flat
`(19,0,0,SpriteCallbackDummy)` across a full turn, plus the (d) `y2`
trajectory. **10/10 PASS on a fresh probe, exit 0.** A missing or truncated
capture FAILS with exit 1 (verified by truncating the post window) — it never
silently passes.

## Side observation (player sprite, out of scope)

`gBattlerSpriteIds[0]` (player WINGULL back sprite) shows a transient
`y2 == 1` window at the action-menu handoff (post ticks 16–34 and pre-tick
2000) before returning to `0`. This is a separate back-side phenomenon — not
the front RATTATA claim — but it is live RAM evidence that the player back
sprite is not strictly `{0,0}` at every instant under OFF. Flagged for the
back-family lane; does not affect the RATTATA front conclusion above.
