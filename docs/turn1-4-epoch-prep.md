# Turns 1-4 `turnNResolved` epoch prep

Evidence checkpoint for ISSUES #39 only. This document does not implement a
retirement. Citations describe side-lane commit `20fcbdec`; production line
numbers are the current tree at that commit. The dynamic evidence is Battle
Scene OFF and comes from the committed output
`docs/turn1-4-epoch-probe.json`.

## 1. Reproducible census

Run these commands verbatim from the run root:

```sh
rg -n --no-heading '\bturn[1-4]Resolved\b' src tests
rg -o --no-heading '\bturn[1-4]Resolved\b' src tests | wc -l
rg -o --no-heading '\bturn[1-4]Resolved\b' src tests | cut -d: -f1 | sort | uniq -c
for field in turn1Resolved turn2Resolved turn3Resolved turn4Resolved; do
  printf '%s ' "$field"
  rg -o "\\b${field}\\b" src tests | wc -l
done

rg -n --no-heading '\b(rockSlideResettledBounceTick|turn2SubmenuBounceTick|turn2KickoffBounceTick|dragonBreathResettledBounceTick|turn3SubmenuBounceTick|turn3KickoffBounceTick|turn3RockSlideResettledBounceTick|turn4SubmenuBounceTick|turn4KickoffBounceTick|turn4RockSlideResettledBounceTick|turn5SubmenuBounceTick|turn5KickoffBounceTick)\b' src/engine tests
for name in rockSlideResettledBounceTick turn2SubmenuBounceTick turn2KickoffBounceTick dragonBreathResettledBounceTick turn3SubmenuBounceTick turn3KickoffBounceTick turn3RockSlideResettledBounceTick turn4SubmenuBounceTick turn4KickoffBounceTick turn4RockSlideResettledBounceTick turn5SubmenuBounceTick turn5KickoffBounceTick; do
  printf '%s=' "$name"
  rg -o "\\b${name}\\b" src tests | wc -l | tr -d ' '
done
```

The first command finds **342 exact-token occurrences**: 166 in production
and 176 in tests. Per field the counts are `84 / 96 / 83 / 79`. Per file:

| File | Exact-token occurrences |
| --- | ---: |
| `src/engine/battleMenu.ts` | 13 |
| `src/engine/battleScene.ts` | 128 |
| `src/engine/core.ts` | 24 |
| `src/engine/presentationEventWindowBridge.ts` | 1 (comment only, line 6) |
| `tests/battle2ActionMenu.test.ts` | 1 |
| `tests/battleMenu.test.ts` | 21 |
| `tests/battleMenuIdle.test.ts` | 4 |
| `tests/battleScene.test.ts` | 60 |
| `tests/battleSetup.test.ts` | 10 |
| `tests/fightSubmenu.test.ts` | 76 |
| `tests/turn17.test.ts` | 4 |

The second family command returns these exact-token counts (definitions,
comments, calls, imports, and tests together): `rockSlideResettledBounceTick`
16, `turn2SubmenuBounceTick` 16, `turn2KickoffBounceTick` 6,
`dragonBreathResettledBounceTick` 14, `turn3SubmenuBounceTick` 18,
`turn3KickoffBounceTick` 6, `turn3RockSlideResettledBounceTick` 8,
`turn4SubmenuBounceTick` 8, `turn4KickoffBounceTick` 6,
`turn4RockSlideResettledBounceTick` 6, `turn5SubmenuBounceTick` 11, and
`turn5KickoffBounceTick` 7.

### Common storage, guards, and PP

All four fields are state, not derived facts: declarations are
`battleScene.ts:2475,2477,2479,2481`; initialization is `:2566-2569`; the
advance-copy is `:2596-2599`. `core.ts:1096-1099` copies them into mutable
tick locals, `:1195-1260` contains the negative guards, positive predecessor
guards, and writes, and `:1524-1527` writes them back. Rendering receives all
four at `battleScene.ts:17136-17139`.

`drawFightSubmenuChrome` sends the fields to `currentPPForActiveMon` at
`battleScene.ts:7772-7789`. Its live cumulative reads are
`battleMenu.ts:2612-2614` (turns 1, 3, and 4 decrement ROCK_SLIDE slot 0) and
`:2634` (turn 2 decrements DRAGON_BREATH slot 2). This is a shared generic
PP dispatcher; it is not presentation-only.

### Per-field production consumers

| Field | Core predecessor roles | HP/content roles | Bounce/presentation clock roles |
| --- | --- | --- | --- |
| `turn1Resolved` | Own negative guard `core.ts:1195`; write `:1209`; positive predecessor for turn 2 `:1211`. | Enables all post-turn-1 opponent HP at `battleScene.ts:7321-7328`; threads through the generic idle/base/chrome calls at `:7341,7372,7417,7568,7578,7584,7658-7659,7689-7690`; PP slot 0 as above. | Action/open clock selects `turn2SubmenuBounceTick` at `:7414-7415`; confirm and idle clocks select `turn2KickoffBounceTick` / `turn2SubmenuBounceTick` at `:7677-7678,7708-7709`. Direct sibling render calls are `:8552,8771`. |
| `turn2Resolved` | Negative guard `core.ts:1212`; write `:1226`; positive predecessor for turn 3 `:1228`. | Selects opponent HP 88 through `battleScene.ts:7327`, player HP overlay at `:7355,7686,7724`, ENDEAVOR-family text routing at `:7599-7600`, and turn-3 kickoff at `:7627`; PP slot 2. | Selects `turn3SubmenuBounceTick` at `:7412-7413,7706-7707` and `turn3KickoffBounceTick` at `:7675-7676`; direct presentation calls are `:8851,8995`. |
| `turn3Resolved` | Negative guard `core.ts:1229`; write `:1241`; positive predecessor for turn 4 `:1243`. | Selects opponent HP 41 and player HP 88 at `battleScene.ts:7327,7372,7417,7685,7723`; identifies the turn-4 DOUBLE_TEAM window at `:7599`; selects turn-4 kickoff at `:7619`; PP slot 0. | Selects `turn4SubmenuBounceTick` at `:7410-7411,7704-7705` and `turn4KickoffBounceTick` at `:7673-7674`; direct presentation calls are `:9142,9222`. |
| `turn4Resolved` | Negative guard `core.ts:1244`; write `:1258`; positive predecessor for the completed-turn-5 handoff at `:1260`. | Selects opponent HP 1 at `battleScene.ts:7322-7328`; selects turn-5 ENDEAVOR content at `:7611-7615`; flows through the same generic idle/base/chrome calls; PP slot 0. | Selects the turn-5 chain at `:7406-7409,7671-7672,7702-7703`: `turn4RockSlideResettledBounceTick` for the same-tick reopen exception, then `turn5SubmenuBounceTick`, plus `turn5KickoffBounceTick`. Direct turn-5 presentation calls are `:9422,10018`. |

The clock definitions form a predecessor chain, not four isolated helpers:

- Turn 1 reset: `rockSlideResettledBounceTick` at
  `battleMenu.ts:2294`, composed by `turn2SubmenuBounceTick` / kickoff at
  `:2500-2501,2522-2523`.
- Turn 2 reset: `dragonBreathResettledBounceTick` and
  `turn3SubmenuBounceTick` at `battleScene.ts:8585,8617-8618`, then kickoff
  at `:8648-8651`.
- Turn 3 reset: `turn3RockSlideResettledBounceTick` at `:9010`, composed by
  turn-4 submenu/kickoff at `:9087-9088,9108-9111`.
- Turn 4 reset: `turn4RockSlideResettledBounceTick` at `:9236`, composed by
  turn-5 submenu/kickoff at `:9333-9356`.

### Test readers and fixtures

The exact-token grep above is the exhaustive test inventory. These are all
lines containing at least one of the four field names (multiple names on one
line explain why line counts are smaller than occurrence counts):

- `tests/battleScene.test.ts`: 152, 160, 179, 219, 222, 230, 502, 1039,
  1064, 1068, 1100, 1104, 1460, 1468, 1472-1473, 1555-1558, 2388-2391.
  The live render-reader fixtures are especially 179 (turn 2), 222 (turn 5),
  230/1460 (turn 4), and 1555-1558/2388-2391 (all four).
- `tests/fightSubmenu.test.ts`: 154, 174-177, 444, 460-463, 484, 487, 490,
  503-504, 511, 529-531, 546, 568, 634, 652-654, 679, 682, 685-686, 730,
  733-734, 743, 763-765, 775, 782, 786, 823-826, 853-856, 867, 878-881,
  889, 893, 897, 916, 919, 944-947, 969-972, 1003. Direct state reads are
  the `expect` lines 460-463, 484, 490, 503-504, 546, 568, 679, 685-686,
  733-734, 763-765, 775, 878-881, 889, 919, and 969-972; 782/893 and their
  adjacent blocks are direct PP-reader tests.
- `tests/battleMenu.test.ts`: 139, 191-192, 199-200, 1068. The first five
  are state fixtures; 1068 names the pre-turn-1 bounce baseline.
- `tests/battleSetup.test.ts`: 113, 162, 169, 172. Lines 169-172 directly
  test turn 1's slot-0 PP effect through rendering.
- `tests/battleMenuIdle.test.ts`: 89; `tests/turn17.test.ts`: 63-66; both
  are later-window fixture construction.
- `tests/battle2ActionMenu.test.ts`: 174 is a direct assertion that the
  separate Battle-2 path does not advance `turn1Resolved`.

Bounce-helper tests are also live readers even when they do not spell the
boolean. The primary anchors are `battleMenu.test.ts:920-924` (turn-1 reset),
`:1047-1064` (turn-2 submenu composition), `:1074-1082` (turn-2 reset), and
`battleScene.test.ts:1141-1179` (turn-3 RAM phase rule), plus the turn-4/5
dispatch fixtures at `battleScene.test.ts:1483-1487`. The full bounce-family
grep above is the exhaustive list and must be rerun after each field swap.

## 2. Scene-OFF RAM ground truth

### Reproduce

The required fresh-directory/wrapper command is:

```sh
scratch_dir=$(mktemp -d -t pokebench-turn14-epoch.XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/turn1-4-epoch-probe.json" -- \
  tools/probe/probe-turn1-4-epochs-off.py \
  "$scratch_dir/turn1-4-epoch-probe.json"
jq '{oracleProfile, boundaries: (.boundaries | map_values({handlerInstalledTick,bounceResetAndFirstInputTick,postTurnFacts,inputCandidates:(.inputCandidates|map({pulseTick,acceptedActionOnPulse}))}))}' \
  "$scratch_dir/turn1-4-epoch-probe.json"
```

The probe consumes `turn5-menu.json`'s controller segments but explicitly
loads `factory-battle-scene-off.json`; the output records
`"oracleProfile": "battle-scene-off"` at
`turn1-4-epoch-probe.json:2-3`. The three earlier dump scripts remain useful
for move-local internals (`dump-turn1-rockslide-off.py`,
`dump-turn2-dragonbreath-off.py`, and `dump-turn4-doubleteam-off.py`), but
they do not watch the choose-action controller or input discrimination. The
new combined probe fills exactly that gap; no separate turn-3 move-local dump
was needed because this step needs the shared post-turn boundary, not another
ROCK_SLIDE animation probe.

### Source owner and exact boundaries

The ROM source identifies the semantic owner:

- `HandleChooseActionAfterDma3` waits for BG-copy completion, sets
  `gBattle_BG0_Y=160`, and installs `HandleInputChooseAction`
  (`reference/pokeemerald/src/battle_controller_player.c:2565-2572`).
- On its first execution, `HandleInputChooseAction` calls `DoBounceEffect`
  for `BOUNCE_HEALTHBOX` and `BOUNCE_MON` before reading A
  (`battle_controller_player.c:233-245`).
- `DoBounceEffect` refuses a duplicate live driver, otherwise creates the
  invisible driver and initializes healthbox seed 128 or mon seed 192,
  delta 7, amplitude 1 (`reference/pokeemerald/src/battle_main.c:2899-2937`).
  The two live flags and driver ids belong to `BattleHealthboxInfo`
  (`reference/pokeemerald/include/battle.h:553-570`).

| Completed turn | Post-turn HP `(player, foe)` | PP / persisted slot | Handler installed (A rejected) | Bounce reset + settled redraw + first accepted A |
| ---: | --- | --- | ---: | ---: |
| 1 | `(117,101)` | `[9,20,20,10]` / 0 | 2347 | **2348** |
| 2 | `(101,88)` | `[9,20,19,10]` / 2 | 3236 | **3237** |
| 3 | `(88,41)` | `[8,20,19,10]` / 0 | 4211 | **4212** |
| 4 | `(88,1)` | `[7,20,19,10]` / 0 | 5351 | **5352** |

The summary facts are committed at `turn1-4-epoch-probe.json:11-23,
380-392,749-761,1118-1130`. The isolated pulses reject the install ticks and
accept the reset ticks at `:295-338,664-707,1033-1076,1402-1445`.

This is not a pixel-fit inference. Immediately before each reset both bounce
flags are false and the framebuffer is still the blank/previous hold; on the
reset tick both flags are true, the drivers carry `(delta=7, amplitude=1,
which=0/1)`, and the raw framebuffer hash changes to the settled idle-menu
family. The four reset rows are `:225-252,594-621,963-990,1332-1359`.
Post-callback observed phase indices are 199/135 because the same tick's
`SpriteCB_BounceEffect` advances source seeds 192/128 by 7; the source seed,
not 199/135, is the typed reset fact.

The exact semantic split is therefore:

- `handlerInstalledTick`: redraw DMA is complete and the controller pointer
  is ready, but an A sampled on this tick was processed by the preceding
  callback and is rejected;
- `bounceResetAndFirstInputTick`: `HandleInputChooseAction` runs,
  `DoBounceEffect` publishes the fresh presentation epoch, the framebuffer
  becomes the settled menu, and A is consumable.

## 3. Typed handoff proposal

Follow `turn8ResolutionAdapter.ts:12-22,30-49`, but add the facts these four
multi-consumer fields actually own. Do not store the absolute oracle ticks in
production. A suitable common shape is:

```ts
type CompletedResolutionNextCommandHandoff = Readonly<{
  playerPp: readonly [number, number, number, number];
  persistedMoveSlot: 0 | 2;
  hp: Readonly<{ player: number; opponent: number }>;
  presentationEpoch: Readonly<{
    owner: "HandleInputChooseAction";
    reset: "DoBounceEffect";
    elapsed: number; // runtime-relative engine epoch, not a canonical tick
    mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>;
    healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }>;
  }>;
  nextCommand: Readonly<{ redraw: "settled"; input: "ready" }>;
}>;
```

Create it when the modeled choose-action controller emits the reset event,
not on the much later canonical A that reopens FIGHT. `elapsed` is the local
runtime epoch supplied by the controller/presentation event. Bounce consumers
derive `elapsedSinceReset`; no `_OFF_*_MENU_REDRAW_DELAY`, turn number, or
absolute trace tick belongs in the handoff.

Per field, move consumers as follows:

| Field | Typed facts | Consumers to migrate |
| --- | --- | --- |
| turn 1 | PP `[9,20,20,10]`, slot 0, HP `117/101`, fresh epoch | `core.ts:1195,1211`; opponent HP `battleScene.ts:7321-7328`; PP `battleMenu.ts:2612`; turn-2 submenu/kickoff clock branches `battleScene.ts:7414-7415,7677-7678,7708-7709`. |
| turn 2 | PP `[9,20,19,10]`, slot 2, HP `101/88`, fresh epoch | `core.ts:1212,1228`; opponent/player HP `battleScene.ts:7327,7355,7686,7724`; ENDEAVOR/kickoff routing `:7599-7600,7627`; PP `battleMenu.ts:2634`; turn-3 clocks `:7412-7413,7675-7676,7706-7707`. |
| turn 3 | PP `[8,20,19,10]`, slot 0, HP `88/41`, fresh epoch | `core.ts:1229,1243`; HP `battleScene.ts:7327,7372,7417,7685,7723`; turn-4 routing `:7599,7619`; PP `battleMenu.ts:2613`; turn-4 clocks `:7410-7411,7673-7674,7704-7705`. |
| turn 4 | PP `[7,20,19,10]`, slot 0, HP `88/1`, fresh epoch | `core.ts:1244,1260`; opponent HP `battleScene.ts:7322-7328`; turn-5 route `:7611-7615`; PP `battleMenu.ts:2614`; turn-5 chain `:7406-7409,7671-7672,7702-7703`. |

Use one field per worker, in order. Each slice should first introduce its own
typed receipt/event, migrate HP/content/clock consumers, then swap both core
guards and PP, and only then delete the boolean/storage plumbing. Adapter
presence alone is not readiness: the move-local turn-1/2/3/4 staging modules
end at their own scripts and do not publish the later choose-action reset.

### Acceptance windows

Do not thin or merge these committed dense sets:

1. Turn 1 retirement: turn-1 producer set
   `turn1-kickoff-off` 81 + `turn1-cloneanim-off` 230 +
   `turn1-rockslide-off` 256 + `turn1-drain-off` 102 = **669**, plus turn-2
   reader set `turn2-endeavor-off` 256 + `turn2-dragonbreath-off` 237 =
   **493**.
2. Turn 2: turn-2 **493** plus turn-3 reader set
   `turn3-endeavor-off` 255 + `turn3-rockslide-off` 161 = **416**.
3. Turn 3: turn-3 **416** plus turn-4 reader set
   `turn4-doubleteam-off` 256 + `turn4-rockslide-off` 256 = **512**.
4. Turn 4: turn-4 **512** plus a newly banked explicit turn-5 OFF reader set.
   **That reader compare set does not exist yet.**

`docs/turn5-6-off-ground-truth.md` banks RAM boundaries and scratch pixel
ranges, but no explicit committed `turn5-*-off.json` reader trace exists.
The banking step must preserve the canonical controller segments and capture,
at stride 1 and in cap-sized files:

- the post-turn-4 reset at 5351/5352 and enough idle frames to prove the new
  HP `88/1` plus fresh bounce phase;
- canonical turn-5 action A at 5926-5927, the DMA hold, FIGHT reveal, slot-0
  PP `[7,20,19,10]`, and submenu dwell;
- turn-5 confirm at 5958-5959 and the ENDEAVOR kickoff/content-selection edge,
  including both HP overlays and the shared bounce freeze;
- the remainder of turn 5 through ROCK_SLIDE, faint/switch/Sitrus, next
  settled action menu, and first input-ready edge; and
- the following turn-6 action/FIGHT reopen with PP `[6,20,19,10]`, which is
  the positive-predecessor/dispatcher reader gated by completed turn 5.

The banker must report filenames and `captureFrames.length` totals before the
turn-4 implementation brief can name an exact `512 + N` acceptance pair.

## 4. Traps for one-field workers

1. **The reset chains cross field boundaries.** `turn5SubmenuBounceTick`
   composes `turn4RockSlideResettledBounceTick`; the earlier chains have the
   same relationship. Replacing only the boolean selector while leaving a
   downstream helper anchored to its old turn-specific delay silently keeps
   the old owner alive.
2. **Handler-installed is not input-ready.** Each boundary has a one-tick
   split. Publishing at 2347/3236/4211/5351 rejects the first legal input and
   leaves both bounce flags false. Publish on the controller's first executed
   input/reset event instead.
3. **Same-turn menu bounce is not a new epoch.** A B-close/A-reopen keeps the
   existing phase (`battleScene.ts:7363-7373`); do not overwrite the completed
   turn's epoch on these menu-only cycles.
4. **HP is shared generic state.** `drawMenuIdleBaseWithOpponentHp` and
   `drawActionMenuIdleContent` serve action menu, DMA holds, submenu, and
   kickoff fallbacks. Migrating only the dedicated move renderer leaves a
   boolean read in the generic dispatcher.
5. **Kickoff identity is not monotonic-history identity.** The existing
   `turn2Resolved`/`turn3Resolved` combination at `battleScene.ts:7599-7600`
   distinguishes turn-4 DOUBLE_TEAM from the repeated ENDEAVOR family. The
   replacement should select the next command/presentation from a typed
   command fact, not recreate this boolean algebra.
6. **Slots differ.** Turn 2 persists/decrements slot 2; turns 1, 3, and 4 use
   slot 0. A resolved-count abstraction is incorrect.
7. **Dead-mirror precedent does not apply.** Per the audit's same-shape trap,
   `turn5KoDismissElapsed` had only its one-shot guard. Every field here has
   core, PP, HP/content, and multiple bounce readers. The broad test fixture
   surface listed above is also real migration work, not permission to leave
   compatibility booleans behind.
8. **Move-local staging is not the controller epoch.** The existing staged
   hit/stat modules prove damage/content facts, while this probe proves the
   later `HandleInputChooseAction`/`DoBounceEffect` boundary. Do not gate the
   new receipt merely on an adapter being non-null.

No remaining source-owner gap is hidden in this checkpoint. The bounded
external prerequisite is the missing committed turn-5 OFF reader set; the
typed event and runtime plumbing still require a main-lane implementation
decision.
