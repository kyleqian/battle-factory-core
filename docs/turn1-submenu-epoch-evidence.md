# Turn-1 handoff / turn-2 submenu epoch evidence

Evidence checkpoint for ISSUES #39 only. This document describes production
at `5a1ecbde`; it does not implement the migration. All dynamic evidence uses
Battle Scene OFF. The discarded candidate from PROGRESS 839 is unavailable,
so this checkpoint distinguishes the rule proved by source/RAM from the exact
candidate expression, which cannot be reconstructed.

## 1. Reproduce the evidence

Run from the worktree root. The third probe reuses the generic driver-chain
reader in `dump-turn9-idle-bounce-off.py`; despite that script's historical
name, its arguments are an arbitrary trace and tick range and it explicitly
loads `factory-battle-scene-off.json` (`tools/probe/dump-turn9-idle-bounce-off.py:38-46,58-72`).

```sh
bin/oracle info

scratch_dir=$(mktemp -d -t pokebench-turn1-submenu-epoch.XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/turn1-4-epoch-probe.json" -- \
  tools/probe/probe-turn1-4-epochs-off.py \
  "$scratch_dir/turn1-4-epoch-probe.json"
python3 tools/run-mgba-probe.py "$scratch_dir/turn2-2894-2999.json" -- \
  tools/probe/dump-turn2-dragonbreath-off.py \
  tools/compare/traces/turn2-endeavor-off.json \
  "$scratch_dir/turn2-2894-2999.json" 2894 2999
python3 tools/run-mgba-probe.py "$scratch_dir/turn2-bounce-driver-2894-2999.json" -- \
  tools/probe/dump-turn9-idle-bounce-off.py \
  tools/compare/traces/turn2-endeavor-off.json \
  "$scratch_dir/turn2-bounce-driver-2894-2999.json" 2894 2999

jq '.captureFrames=[range(2894;3000)]' \
  tools/compare/traces/turn2-endeavor-off.json \
  > "$scratch_dir/turn2-submenu-scout.json"
bin/oracle run "$scratch_dir/turn2-submenu-scout.json" \
  -o "$scratch_dir/oracle-scout"
```

The first probe's compact result is:

```sh
jq '{oracleProfile,turn1:.boundaries.turn1}' \
  "$scratch_dir/turn1-4-epoch-probe.json"
```

The selected turn-2 driver rows used below are reproducible with:

```sh
jq '{ticks:[.ticks[]|select(
  .tick==2894 or .tick==2900 or .tick==2901 or .tick==2902 or
  .tick==2904 or .tick==2905 or .tick==2906 or .tick==2944 or
  .tick==2945 or .tick==2946 or .tick==2947 or .tick==2948 or
  .tick==2999)]}' \
  "$scratch_dir/turn2-bounce-driver-2894-2999.json"
```

## 2. What the boolean path does today

There are two epochs here, and the existing boolean misleadingly names the
later lifecycle edge as though it were completion:

- The source-owned completed-turn reset is `HandleInputChooseAction` calling
  `DoBounceEffect` (`reference/pokeemerald/src/battle_controller_player.c:233-245`).
  `DoBounceEffect` is idempotent while a driver is live and initializes mon
  seed 192 or healthbox seed 128, delta 7, amplitude 1
  (`reference/pokeemerald/src/battle_main.c:2899-2937`). The fresh OFF reset is
  absolute tick **2348**, scene-relative elapsed **1308** because `TICK0=1040`
  (`battleScene.ts:2463-2464`; fresh `turn1-4-epoch-probe.json`,
  `boundaries.turn1`).
- The later turn-2-command activation is the accepted action-menu A at
  absolute tick **2901**, scene-relative elapsed **1861**. On that tick core
  replaces the old confirmed submenu with a fresh `openFightSubmenu` and sets
  `turn1Resolved=true` in the same branch (`core.ts:1210-1225`). That is 553
  ticks after the reset, not another reset.

The exact render evaluation order for the assigned window is:

| Frames | State and render path | Bounce clock |
| --- | --- | --- |
| 2894-2900 | The old turn-1 submenu still has its turn-1 confirmation. `drawFightSubmenuWindow` reaches the cursor-0 turn-1 ROCK_SLIDE renderer (`battleScene.ts:7577-7639`); because the OFF redraw was already reached, `drawRockSlideWindow` calls `drawTurnEndSettledMenu` (`:14424-14428`). | `rockSlideResettledBounceTick(t, 1919, 429)` at `battleScene.ts:14505-14508`, whose definition maps `1919+429=2348` onto `MENU_IDLE_BLANK_END_TICK+1` (`battleMenu.ts:2281-2300`). No `turn1Resolved` clock selection occurs in these frames. |
| 2901-2905 | Before input, core advances `displayCursor`, computes post-increment `sceneT`, and copies the old boolean (`core.ts:1074-1113`). Its turn-boundary branch then opens the new submenu and flips the boolean (`:1210-1225`); the updated state is written before `advanceBattleScene` (`:1553-1568,1600`). Rendering sees `openElapsed=1861`, `confirmElapsed=null`, and `turn1Resolved=true`. The reveal is tick 2906, so the open-DMA hold calls `drawActionMenuIdleWindow` (`battleScene.ts:7560-7568`). | Its selector reads `turn1Resolved` directly and calls `turn2SubmenuBounceTick(t,429)` (`battleScene.ts:7383-7394`). The helper itself does not read the boolean: it composes `rockSlideResettledBounceTick` and subtracts the two-tick open correction (`battleMenu.ts:2501-2506`). |
| 2906-2944 | The FIGHT list is revealed. With no confirmation yet, the final idle branch draws chrome and selects its bounce (`battleScene.ts:7677-7713`); the DOWN navigation changes cursor/display state but not the epoch. | The `turn1Resolved` arm again directly selects `turn2SubmenuBounceTick(t,429)` (`battleScene.ts:7691-7702`). |
| 2945-2947 | Core records the move confirmation as scene-relative 1905, hence absolute `pressTick=2945` (`core.ts:1139-1158`; `battleScene.ts:7577-7579`). The turn-2 text does not start until 2954, so the confirm-wait fallback remains active (`battleScene.ts:7588-7597,7641-7669`). | `turn1Resolved` directly selects `turn2KickoffBounceTick`; while `t < 2945+3=2948`, that helper transitively calls `turn2SubmenuBounceTick` (`battleScene.ts:7660-7669`; `battleMenu.ts:2525-2528`). |
| 2948-2953 | Still before the first ENDEAVOR glyph. | `turn2KickoffBounceTick` returns the literal flat-plateau tick 2119, independent of the reset epoch (`battleMenu.ts:2508-2528`). |
| 2954-2999 | `drawTurn2KickoffText` owns the window (`battleScene.ts:7590-7598,8735-8760`). | Its two direct `turn2KickoffBounceTick` consumers (`battleScene.ts:8541,8760`) are also on the literal post-freeze arm. |

Thus `rockSlideResettledBounceTick`, `turn2SubmenuBounceTick`, and the live
arm of `turn2KickoffBounceTick` are one transitive clock chain. None of those
three functions reads `turn1Resolved`; the three generic render selectors at
`battleScene.ts:7391-7392,7666-7667,7697-7698` read it. The two dedicated
turn-2 calls at `battleScene.ts:8541,8760` call the kickoff helper directly.

### Same-turn close/reopen is not completion

`openFightSubmenu` stores `reopenedFromClose`, while close and confirm preserve
the other lifecycle fields (`battleMenu.ts:960-995,1011-1038`). Core checks the
same-turn B-close/A-reopen branch before the completed-turn branch, reopens
with the current cursor and `reopenedFromClose=true`, and does **not** mutate
`turn1Resolved` (`core.ts:1168-1209`). The DMA-hold renderer checks that flag
before any turn-epoch selector and preserves the prior shift
(`battleScene.ts:7340-7350`). The revealed-idle fallback also contains a
cumulative DMA-shift arm, but it is ordered after the monotonic turn-epoch
arms (`battleScene.ts:7686-7701`); this canonical window never sets
`reopenedFromClose`, so it is not evidence for changing that precedence.

The semantic rule is stronger than those current branches: a same-turn
B-close/A-reopen may update `FightSubmenuState.openElapsed` for that UI
transition, but must never publish or overwrite the completed-turn receipt's
`presentationEpoch.elapsed`. It is view-level DMA drift inside the already
active epoch. The completed-turn reset, by contrast, destroys the prior
drivers during resolution and creates fresh source-seeded drivers when the
next `HandleInputChooseAction` first executes
(`reference/pokeemerald/src/battle_controller_player.c:3049-3053`;
`reference/pokeemerald/src/battle_main.c:2940-2964,2899-2937`).

## 3. Scene-OFF RAM and pixel ground truth

The fresh combined epoch probe reproduced the turn-1 boundary exactly:

| Tick | Controller fact | Drivers | Pixels |
| ---: | --- | --- | --- |
| 2347 | `HandleInputChooseAction` installed; an isolated A is rejected | both bounce flags false | SHA `70f4821905ff...` |
| **2348** | first `HandleInputChooseAction`; isolated A accepted | source seeds 192/128 have already callback-advanced to observed 199/135; delta 7, amplitude 1 | settled-menu SHA `c2a09dbe1350...` |
| 2349 | same live drivers | observed 206/142 | SHA `a4bffb32ef6b...` |

These rows are `turn1-4-epoch-probe.json`'s
`boundaries.turn1.canonicalRows/inputCandidates`. They also prove why the
handoff stores source seeds, not the post-callback observations
(`turn1ResolutionAdapter.ts:19-29,59-65`).

The fresh driver-chain probe over 2894-2999 proves continuity rather than a
reopen reset:

| Tick | Mon driver `(id,index,delta,amp,y2)` | Healthbox driver `(id,index,delta,amp,y2)` | Meaning |
| ---: | --- | --- | --- |
| 2894 | `(4,181,7,1,0)` | `(3,117,7,1,1)` | same live reset epoch |
| 2900 | `(4,223,7,1,0)` | `(3,159,7,1,0)` | immediately before reopen |
| **2901** | `(4,230,7,1,0)` | `(3,166,7,1,0)` | A opens FIGHT; IDs/seeds continue, no reset |
| 2902 | `(4,230,7,1,0)` | `(3,166,7,1,0)` | DMA polling stalls both drivers for one frame |
| 2904 / 2905 / 2906 | indices `237 / 244 / 251` | indices `173 / 180 / 187` | the same drivers resume after the stall |
| 2944 / 2945 / 2946 | indices `5 / 12 / 19` | indices `197 / 204 / 211` | still the same reset epoch through confirm |
| **2947** | driver data cleared; `y2=0` | driver data cleared; `y2=0` | confirmation resolution ends both bounces |
| 2948 / 2999 | still cleared | still cleared | no new epoch in this window |

Those are direct rows from fresh
`turn2-bounce-driver-2894-2999.json`. The companion
`turn2-2894-2999.json` independently records `BG0_Y=160` through 2904,
`BG0_Y=320` from 2905 through the submenu dwell, and Onix `y2=1` at
2945-2946 before returning to zero at 2947.

The 106-frame oracle scout pins the visible boundaries:

| Frames | Pixel result |
| --- | --- |
| 2894-2900 | settled action-menu bounce; 2894 SHA `a4bffb32ef6b...`, 2900 `c2a09dbe1350...` |
| 2901-2905 | held action menu, all SHA `c2a09dbe1350...` |
| **2906** | FIGHT reveal, SHA `6830153db7fb...` |
| 2944-2945 | flat submenu SHA `bc5eb0a4f79d...` |
| 2946-2947 | raised Onix state SHA `ca8039ea6cef...` |
| **2948**-2953 | frozen-flat state returns, SHA `bc5eb0a4f79d...` |
| **2954** | first ENDEAVOR text frame, SHA `8001f63a575b...` |
| 2999 | settled ENDEAVOR text, SHA `6aa3d9d35106...` |

The receipt-relative phase equation proved by the current exact chain is:

```text
turn2 submenu pseudo-t
  = (MENU_IDLE_BLANK_END_TICK + 1)
    + (currentElapsed - handoff.presentationEpoch.elapsed)
    - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
```

At frame 2901 this is `1748 + (1861 - 1308) - 2 = 2299`, exactly the
current OFF composition `turn2SubmenuBounceTick(2901,429)`. The raw age
`553` is **not** itself a valid `menuIdleBounce` input: the established local
phase origin 1748 must remain. Likewise, storing the later reopen elapsed
1861 as the reset would incorrectly make the age zero.

## 4. What the discarded failure does and does not prove

The mismatch envelope is diagnostic:

- 2894-2900 are rendered by the move-local resettled tail, before any
  handoff-selected turn-2 submenu helper.
- 2901-2947 are exactly the interval in which generic rendering selects a
  live receipt/boolean-dependent submenu clock.
- From 2948, `turn2KickoffBounceTick` is the literal frozen plateau, so it no
  longer depends on epoch age.

This **confirms the failure class**: the candidate changed the selected live
clock, its readiness/activation predicate, or the coordinate supplied to it.
It falsifies a pure `turn1Resolved` -> `isTurn1NextCommandHandoffReady`
predicate substitution *with the same already-valid handoff and unchanged
clock arguments*: once the turn-2 lifecycle is active, both predicates select
the same helper, so that substitution alone cannot move pixels.

The exact discarded expression is **not determinable** from the banked diff.
Several faults fit the same phase-sensitive envelope: publishing `elapsed` on
the 2901 reopen instead of the 2348 reset; passing raw epoch age to
`menuIdleBounce` without the 1748 local origin; mixing absolute `t` with
scene-relative elapsed; or letting a readiness predicate select the fallback
clock for the new submenu. The candidate no longer exists, so claiming which
one occurred would exceed the evidence.

The first discriminating check on the next candidate must log/assert, before
any pixel replay, this tuple at frames 2901, 2906, 2945, 2947, and 2948:

```text
handoff present/ready,
handoff.presentationEpoch.elapsed (must remain 1308),
fightSubmenu.openElapsed (must be 1861 after reopen),
currentElapsed,
selected clock family,
derived pseudo-t,
menuIdleBounce(pseudo-t)
```

At 2901 the required tuple ends in
`ready=true, epoch=1308, open=1861, current=1861,
family=turn2-submenu, pseudo-t=2299`. A candidate that cannot produce this
tuple should not be sent to the 1,162-frame differential.

## 5. Migration prescription

The receipt and lifecycle are separate facts:

1. `nextCommand.{redraw,input}` says the completed-turn action menu is ready.
2. `presentationEpoch.elapsed` says when its `DoBounceEffect` drivers reset.
3. The turn-2 command becomes active only when a later submenu lifecycle is
   opened. A source-neutral predicate is the conjunction of receipt readiness
   and `fightSubmenu.openElapsed > presentationEpoch.elapsed`; the old turn-1
   open is earlier than the reset, while the turn-2 open and its same-turn
   reopen descendants are later. Do not add the 2901 transition to the
   immutable receipt.

Land the retry in this order, keeping each step green:

1. **Publish at the reset, not at reopen.** Add the nullable turn-1 handoff to
   `BattleSceneState` beside the legacy field and through initialization/copy/
   writeback (`battleScene.ts:2466-2499,2539-2591`; `core.ts:1112-1124,
   1553-1568`). Call
   `resolveTurn1CompletedResolutionNextCommandHandoff` on the modeled
   `HandleInputChooseAction`/`DoBounceEffect` reset event with elapsed 1308 on
   this trace (`turn1ResolutionAdapter.ts:37-67`). **Do not** construct it in
   the reopen branch at `core.ts:1210-1225`. If the main-lane model still has
   no source-owned reset event, stop here and expose that event first; using
   `ROCK_SLIDE_MENU_REDRAW_DELAY` as a new downstream owner merely preserves
   the debt this handoff is meant to retire.
2. **Pin activation before swapping selectors.** Add a pure helper (adapter or
   controller seam) equivalent to
   `ready && openElapsed !== null && openElapsed > presentationEpoch.elapsed`.
   Use it for the negative/positive command-lifecycle roles now carried by
   `turn1Resolved` at `core.ts:1210-1228`. Evaluate it from the pre-input
   submenu first; after the accepted A, store the fresh `openElapsed`, so the
   predicate becomes true on that same rendered frame. This preserves core's
   current ordering at `core.ts:1074-1095,1210-1225`.
3. **Move the phase calculation without changing its origin.** Keep
   `rockSlideResettledBounceTick` and its turn-1 tail call
   (`battleMenu.ts:2281-2300`; `battleScene.ts:14505-14508`) move-local. Add a
   receipt-age form of `turn2SubmenuBounceTick` at
   `battleMenu.ts:2503-2506` implementing the equation in section 3; do not
   pass raw age directly and do not re-anchor to `openElapsed`.
4. **Swap the three generic consumers one at a time.** At
   `battleScene.ts:7383-7394` (open DMA hold), `:7691-7702` (revealed idle),
   then `:7660-7669` (confirm wait), replace the `turn1Resolved` arm with the
   activation predicate and feed its immutable epoch age to the receipt-based
   submenu/kickoff helper. Keep `reopenedFromClose`'s UI drift handling intact;
   never regenerate the receipt during B-close/A-reopen.
5. **Thread the receipt through the dedicated turn-2 renderer.** Replace the
   old `redrawDelay` dependency at `battleScene.ts:8541,8760` with the same
   receipt-derived kickoff helper. These calls are frozen in the currently
   banked post-2948 pixels, but migrating them is necessary to remove the old
   move-delay owner rather than leave a transitive reader behind.
6. Only after HP/PP/content readers and both core roles consume the receipt,
   delete `turn1Resolved` storage/plumbing. Rerun the exact-token census from
   `docs/turn1-4-epoch-prep.md:13-26`; do not leave a compatibility mirror.

Tier-1 gates for those landing steps:

- Extend `tests/turn1ResolutionAdapterEquivalence.test.ts:31-43` with the
  canonical relative reset 1308, activation false for old `openElapsed=847`,
  true for 1861, and unchanged epoch across a same-turn reopen.
- Extend `tests/battleMenu.test.ts:1048-1087` to pin the receipt equation at
  2901 (`pseudo-t=2299`) plus live 2945-2947 and the literal freeze at 2948.
- Extend `tests/fightSubmenu.test.ts:432-510` so B-close/A-reopen changes UI
  lifecycle but not the receipt epoch, and add a core pin that an already-ready
  receipt does not block the later 2901 activation A.
- Keep the turn-2 render fixture in `tests/battleScene.test.ts:175-183` and add
  equivalence assertions at 2901, 2906, 2945-2948 before deleting the boolean.

Final pixel acceptance remains unchanged and unthinned:

- turn-1 producer windows: `81 + 230 + 256 + 102 =` **669/669**;
- turn-2 reader windows: `turn2-endeavor-off` 256 plus
  `turn2-dragonbreath-off` 237 = **493/493**;
- combined clean-parent differential: **1,162/1,162 raw RGBA captures**.

The 2901-2947 region must be dense. Exactness only at 2948+ proves merely that
the literal freeze survived; it does not validate the receipt epoch.
