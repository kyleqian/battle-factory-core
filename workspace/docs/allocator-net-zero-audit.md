# Sprite-allocator net-zero audit (Scene ON)

Evidence only; no production code touched. Question: after a live move
adapter runs, is the OBJ allocator back where it started, so
`liveMoveSpriteAllocator.ts` can keep history KNOWN across it instead of
invalidating the host (today only Light Screen, 113, is kept)?

Receipt: `tools/integration/fixtures/allocator-net-zero-audit.json`; raw window
rows: `tools/integration/fixtures/allocator-net-zero-raw/<move>-<scenario>-{0,1}.json`
(each pair byte-identical; sha256 in the receipt); manifest:
`tools/integration/fixtures/allocator-net-zero-manifest.json`.

## Definition (same as wall-family-allocator-evidence.md)

Activation = first frame with `gAnimScriptActive` and `sAnimMoveIndex == move`
(frames from trace frame 0 of the scenario, ordinary BattleLab entry, profile
`battle-scene-on`). Cleanup = first frame the script is no longer active
(re-raises of the same move within 30 frames are merged into one body).
Baseline = occupied OBJ slots at activation-1; end = occupied at cleanup.
NET-ZERO per scenario body = end == baseline AND created == destroyed inside
[activation, cleanup] (slot-table diff per frame; a same-slot template change
counts as destroy+create). Multi-hit/multi-activation scenarios have several
bodies; the row is net-zero only if all are. Occupied-set changes in the 8
frames after cleanup are recorded as `lateChanges` (with template/callback)
and flagged.

## Method / commands

    export PY=<vendor>/mgba-venv/bin/python PYTHONPATH=<vendor>/libmgba-py   # vendor = pokebench/vendor
    python3 tools/integration/allocatorNetZeroManifest.py > tools/integration/fixtures/allocator-net-zero-manifest.json
    $PY tools/integration/allocatorNetZeroBatch.py tools/integration/fixtures/allocator-net-zero-manifest.json [move-id ...]
    python3 tools/integration/allocatorNetZeroReceipt.py
    $PY tools/compare/allocatorNetZeroProbe.py <move-id> <scenario.json> <out.json>   # single run

The manifest resolves each id of `LIVE_MOVE_ANIMATION_IDS` (91) through its
`tools/integration/fixtures/*-{player,opponent}.json` -> `sourceFixture` ->
`scenario`; moves with no integration fixture file use the accepted
`tools/battle-lab/mechanic-<slug>-*` scenarios (marked `fallback`). The five
wall moves 112/115/182/243/277 are re-measured with the same probe (extra
rows, not in the 91). The batch runs every (move, scenario) twice in fresh
processes, 4 at a time. The probe exits with `os._exit(0)` because mGBA
teardown segfaults (rc 139) after the output is written.

## Calibration

Reproduced from the committed wall-family receipts: Light Screen player
Exeggcute act 303 / cleanup 388 (baseline = end = [0,1,2,6,8,60,61,62,63]);
Reflect P/O act 65/69, cleanup 143/147 (+78); Barrier 70/74, cleanup 145/149;
Magic Coat 69/73, cleanup 144/148; Protect 68/72, cleanup 190/194; Mirror Coat
319/321, cleanup 404/406. All equal the wall-family values.

## Result

96 rows (91 live ids + 5 wall ids): **audited 91 / net-zero 91 / not net-zero 0
/ not audited 5**. Counting only the 91 live ids: 86 audited, all net-zero;
not audited: 41 Twineedle, 44 Bite, 158 Hyper Fang, 162 Super Fang (their
accepted fixtures reuse the Poison Fang scenario and substitute the move id
inside `poisonFangProbe.py`/their own probe, so no staged scenario plays the
move; the move never activates), 325 Shadow Punch (no scenario of the
standard shape: only dense/`-haunter-onix` variants, no integration fixture).
Every audited row had both fresh runs byte-identical (203 scenario pairs).
Baseline was `[0,1,2,6,8,60,61,62,63]` for every body of every scenario.

Table (scenario count audited, orientations P/O; "late" = slot change in the 8
frames after cleanup):

| id | move | scenarios | net-zero | notes |
|---|---|---|---|---|
| 2 | KARATE_CHOP | 2 (o/p) | yes | bodies [1]; created=destroyed per body [4]; late≤8f yes |
| 5 | MEGA_PUNCH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 9 | THUNDER_PUNCH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [11]; late≤8f yes |
| 11 | VICE_GRIP | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f yes |
| 12 | GUILLOTINE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [10]; late≤8f yes |
| 14 | SWORDS_DANCE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [5]; late≤8f yes |
| 21 | SLAM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 23 | STOMP | 2 (o/p) | yes | bodies [1]; created=destroyed per body [8]; late≤8f yes |
| 25 | MEGA_KICK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 27 | ROLLING_KICK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f yes |
| 29 | HEADBUTT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 34 | BODY_SLAM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 36 | TAKE_DOWN | 2 (o/p) | yes | bodies [1]; created=destroyed per body [8]; late≤8f yes |
| 38 | DOUBLE_EDGE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 39 | TAIL_WHIP | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 41 | TWINEEDLE | 0/2 | not audited | move never active in the shared scenario (probe substitutes the move) |
| 42 | PIN_MISSILE | 2 (o/p) | yes | bodies [2]; created=destroyed per body [9]; late≤8f yes |
| 43 | LEER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [2]; late≤8f yes |
| 44 | BITE | 0/2 | not audited | move never active in the shared scenario (probe substitutes the move) |
| 47 | SING | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 48 | SUPERSONIC | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 49 | SONIC_BOOM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [8]; late≤8f yes |
| 50 | DISABLE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [2]; late≤8f no |
| 65 | DRILL_PECK | 3 (o/p) | yes | bodies [1]; created=destroyed per body [17]; late≤8f yes |
| 66 | SUBMISSION | 2 (o/p) | yes | bodies [1]; created=destroyed per body [18]; late≤8f yes |
| 67 | LOW_KICK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f yes |
| 68 | COUNTER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [15]; late≤8f yes |
| 74 | GROWTH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 75 | RAZOR_LEAF | 2 (o/p) | yes | bodies [1]; created=destroyed per body [22]; late≤8f yes |
| 78 | STUN_SPORE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [15]; late≤8f yes |
| 79 | SLEEP_POWDER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [15]; late≤8f yes |
| 83 | FIRE_SPIN | 2 (o/p) | yes | bodies [1]; created=destroyed per body [18]; late≤8f yes |
| 92 | TOXIC | 2 (o/p) | yes | bodies [1]; created=destroyed per body [14]; late≤8f no |
| 93 | CONFUSION | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 94 | PSYCHIC | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 95 | HYPNOSIS | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 97 | AGILITY | 2 (o/p) | yes | bodies [1]; created=destroyed per body [10]; late≤8f yes |
| 101 | NIGHT_SHADE | 4 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 103 | SCREECH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [4]; late≤8f yes |
| 105 | RECOVER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [46]; late≤8f no |
| 108 | SMOKESCREEN | 2 (o/p) | yes | bodies [1]; created=destroyed per body [18]; late≤8f yes |
| 109 | CONFUSE_RAY | 2 (o/p) | yes | bodies [1]; created=destroyed per body [4]; late≤8f yes |
| 113 | LIGHT_SCREEN | 3 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f no |
| 114 | HAZE | 4 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f no |
| 122 | LICK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [1]; late≤8f yes |
| 131 | SPIKE_CANNON | 2 (o/p) | yes | bodies [2, 3]; created=destroyed per body [13]; late≤8f yes |
| 136 | HI_JUMP_KICK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [10]; late≤8f yes |
| 147 | SPORE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 148 | FLASH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 151 | ACID_ARMOR | 2 (o/p) | yes | bodies [1]; created=destroyed per body [0]; late≤8f yes |
| 154 | FURY_SWIPES | 2 (p) | yes | bodies [2, 3]; created=destroyed per body [10]; late≤8f yes |
| 156 | REST | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f no |
| 158 | HYPER_FANG | 0/2 | not audited | move never active in the shared scenario (probe substitutes the move) |
| 162 | SUPER_FANG | 0/2 | not audited | move never active in the shared scenario (probe substitutes the move) |
| 163 | SLASH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [4]; late≤8f yes |
| 172 | FLAME_WHEEL | 2 (o/p) | yes | bodies [1]; created=destroyed per body [37]; late≤8f yes |
| 178 | COTTON_SPORE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 180 | SPITE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [1]; late≤8f no |
| 186 | SWEET_KISS | 2 (o/p) | yes | bodies [1]; created=destroyed per body [7]; late≤8f yes |
| 201 | SANDSTORM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [14]; late≤8f no |
| 204 | CHARM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f yes |
| 208 | MILK_DRINK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f no |
| 211 | STEEL_WING | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 213 | ATTRACT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [23, 24]; late≤8f no |
| 223 | DYNAMIC_PUNCH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 227 | ENCORE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f no |
| 231 | IRON_TAIL | 2 (o/p) | yes | bodies [1]; created=destroyed per body [7]; late≤8f yes |
| 235 | SYNTHESIS | 2 (o/p) | yes | bodies [1, 2]; created=destroyed per body [8]; late≤8f no |
| 242 | CRUNCH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 246 | ANCIENT_POWER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [26]; late≤8f yes |
| 247 | SHADOW_BALL | 2 (o/p) | yes | bodies [2]; created=destroyed per body [1]; late≤8f yes |
| 257 | HEAT_WAVE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [14]; late≤8f yes |
| 264 | FOCUS_PUNCH | 3 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f yes |
| 272 | ROLE_PLAY | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f no |
| 280 | BRICK_BREAK | 4 (o/p) | yes | bodies [1]; created=destroyed per body [18, 23]; late≤8f yes |
| 281 | YAWN | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f no |
| 287 | REFRESH | 2 (o/p) | yes | bodies [1]; created=destroyed per body [7]; late≤8f no |
| 290 | SECRET_POWER | 2 (o/p) | yes | bodies [1]; created=destroyed per body [7]; late≤8f yes |
| 302 | NEEDLE_ARM | 2 (o/p) | yes | bodies [1]; created=destroyed per body [24]; late≤8f yes |
| 305 | POISON_FANG | 2 (o/p) | yes | bodies [1]; created=destroyed per body [7]; late≤8f yes |
| 306 | CRUSH_CLAW | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 319 | METAL_SOUND | 2 (o/p) | yes | bodies [1]; created=destroyed per body [8]; late≤8f yes |
| 320 | GRASS_WHISTLE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [14]; late≤8f yes |
| 321 | TICKLE | 2 (o/p) | yes | bodies [1]; created=destroyed per body [4]; late≤8f yes |
| 325 | SHADOW_PUNCH | — | not audited | no fixture/scenario |
| 335 | BLOCK | 2 (o/p) | yes | bodies [1]; created=destroyed per body [1]; late≤8f no |
| 336 | HOWL | 4 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f yes |
| 337 | DRAGON_CLAW | 2 (o/p) | yes | bodies [1]; created=destroyed per body [42]; late≤8f yes |
| 342 | POISON_TAIL | 2 (o/p) | yes | bodies [1]; created=destroyed per body [13]; late≤8f yes |
| 343 | COVET | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f yes |
| 347 | CALM_MIND | 2 (o/p) | yes | bodies [1]; created=destroyed per body [3]; late≤8f yes |
| 112 | BARRIER | 4 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f yes |
| 115 | REFLECT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [9]; late≤8f no |
| 182 | PROTECT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [2]; late≤8f no |
| 243 | MIRROR_COAT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [12]; late≤8f yes |
| 277 | MAGIC_COAT | 2 (o/p) | yes | bodies [1]; created=destroyed per body [6]; late≤8f no |

## Caveats (important)

- **Late changes**: most damaging moves are followed within 8 frames by a
  sprite that is not the move's own: e.g. `gMultiuseSpriteTemplate`/
  `SpriteCallbackDummy` in slot 3 when the next animation (move index 0,
  starting a few frames later) starts, or `sInvisibleSpriteTemplate` with
  `SpriteCB_HitAnimHealthoxEffect` in slot 3 (healthbox hit effect after the
  damage). These are owned by the next battle action, not the move script, so
  they do not break net-zero by the definition above, but an allocator host
  that models history across moves must account for them (slot 3 is the first
  free slot after baseline, so it matters to the next move's allocation).
  Per-row detail is in `bodies[].lateChanges`.
- Scene ON profile only; scenario-specific (species, level, turn order,
  field). A different battle state (extra live battle sprites, active statuses)
  could shift the baseline; net-zero here means the script itself nets zero
  from whatever baseline exists, observed with this baseline only.
- Sprites created and destroyed within a single frame are invisible to the
  frame-sampled table.
- Status/stat/switch/summary/ball animations are separate paths and still
  invalidate; this audit covers move-script animations only.
- Variants: multi-hit/two-turn/repeat bodies appear as several bodies in one
  scenario (Pin Missile, Spike Cannon, Fury Swipes, Synthesis, Shadow Ball
  scenarios) and each is net-zero. Fury Swipes has only a player-orientation
  accepted scenario (opponent orientation has none: not audited). Brick Break
  wall and no-wall scenarios are both audited (4 scenarios). Mirror Coat is
  staged as a second body by necessity (it cannot be a first body).
- Not audited ids, with reason, are listed in the receipt `summary.notAudited`.
