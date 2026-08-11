# Turns 5-6 Battle Scene OFF boundary ground truth

This is the oracle-side evidence prerequisite requested by
`docs/turn-resolved-owner-chain-audit.md` slice 0. It banks the canonical
Battle 1 turn-5 and turn-6 completion/reopen boundaries under the explicit
`battle-scene-off` bootstrap. It does not change production code, acceptance
traces, or tests, and it does not continue into turn 7's resolution.

## Evidence contract

The button source is `tools/compare/traces/turn7-menu.json`. Its canonical
prefix has these fixed intervals (trace frames are half-open; RAM ticks below
are the post-`advance` coordinate): turn-5 confirm `A` at `[5958,5960)`,
faint-dismiss `A` at `[6560,6562)`, turn-6 action-menu `A` at `[7312,7314)`,
turn-6 move confirm `A` at `[7344,7346)`, and turn-7 action-menu `A` at
`[8346,8348)`. The committed boundary watch stops at tick 8355, before the
turn-7 move-confirm press and resolution.

Two committed probes own the RAM claims:

- `tools/probe/specs/turn5-6-off-boundary-watch.json`, run through
  `tools/probe/ram-probe.py`, records the unchanged canonical replay through
  tick 8355. In this document its generated output is named
  `turn5-6-off-boundary-watch.json`.
- `tools/probe/verify-turn5-6-off-input-boundaries.py` moves one isolated A
  pulse across the candidate faint-dismiss/action-input boundaries while
  keeping the preceding canonical prefix byte-for-byte unchanged. Its output
  is named `turn5-6-off-input-boundaries.json`.

Controller pointers are source-owned, not inferred labels:
`0x08057589=HandleInputChooseAction`,
`0x08057bfd=HandleInputChooseMove`,
`0x0805c005=HandleChooseActionAfterDma3`, and
`0x08057505=PlayerBufferRunCommand` (`arm-none-eabi-nm -an
reference/pokeemerald/pokeemerald.elf`; implementations in
`battle_controller_player.c`). `gBattle_BG0_Y=160/320` is the action/FIGHT
menu selection made in those source handlers. `CONTROLLER_CHOOSEMOVE` is
command 20; its `ChooseMoveStruct.currentPP` bytes are
`gBattleBufferA[0][12..15]` (`battle_controllers.c` and
`battle_controllers.h`).

Dense pixel evidence is deliberately scratch output, not a committed compare
trace. The reproducible output names used below are:

| Output manifest | Dense capture frames | Owns |
| --- | --- | --- |
| `off-dense-faint/manifest.json` | 6235-6385 and 6548-6598 | hit/faint sink, faint text onset, canonical dismiss, switch continuation onset |
| `off-dense-faint-text/manifest.json` | 6376-6420 | last glyph and first visible wait cursor |
| `off-dense-switch/manifest.json` | 6670-6830 | replacement data/materialize/settle |
| `off-dense-sitrus/manifest.json` | 6840-7015 | Sitrus text/heal/text-clear/action-menu redraw |
| `off-dense-boundaries/manifest.json` | 7305-7351, 7855-7896, 8340-8396 | both canonical reopen edges, turn-6 end, PP submenus |

Every range is stride 1. The exact reproduction commands are in §6.

## 1. Turn 5 KO, immediate dismiss, switch-in, and Sitrus lifecycle

This is the canonical short-dismiss route only. The isolated-pulse probe
tests the earliest legal dismiss; it does not add the separate long delayed
route assigned to the turn-13 evidence worker.

| Boundary | OFF tick | Evidence and exact state | Legacy ON fit / delta |
| --- | ---: | --- | --- |
| fatal ROCK_SLIDE target HP commits 1→0 | 6285 | boundary watch: `opponentHp`; dense faint pixels are already in the hit-flash/drain tail | ON dossier RAM 6429; **-144** |
| faint sink first changes | 6360 | `off-dense-faint`: `1854bf9912ee…`; previous held frame through 6359 is `c77d8d43b7b5…` | ON first visible sink 6504; **-144** |
| Grovyle + healthbox fully gone | 6377 | `off-dense-faint`: `a4afaf7b12b3…`; direct PNG inspection shows bare opponent field | ON healthbox vanish 6521; **-144** |
| faint-text controller dispatch | 6378 | boundary watch: player command 16 and exec bit 0→1; controller becomes `CompleteOnInactiveTextPrinter2` (`0x080597b5`) | ON visible text start 6523 is the old fit; controller tick was not separately banked |
| first faint-text glyph | 6379 | `off-dense-faint-text`: `25165440bc5b…` | ON 6523; **-144** for the visible onset |
| faint text fully printed | 6397 | `off-dense-faint-text`: `dd34a61d1ba2…`, last glyph visible and no cursor | ON last glyph 6541; **-144** |
| **first dismiss-eligible A tick** | **6398** | input-boundary probe: pulse 6397 leaves exec=1/controller unchanged through its tail; pulse 6398 makes exec=0 and returns to `PlayerBufferRunCommand` at 6400 | old ON-fit eligibility/cursor anchor 6543; **-145** |
| first visible wait cursor | 6399 | `off-dense-faint-text`: `f47b84a67129…`; eligibility precedes visibility by one tick | ON cursor 6543; **-144** |
| canonical dismiss A accepted | 6561 | unchanged source segment starts at 6560; dense pixels move to the held top cursor pose, and boundary watch completes the controller at 6563 | same fixed input tick under ON; OFF waited 263 ticks after eligibility, ON fit waited 18 |
| icon-bar continuation first visible | 6588 | `off-dense-faint`: `bed66ec7ae49…`; RAM command 48 is issued at 6587 | ON first visible 6588; no shift because the fixed dismiss press is later than both eligibility edges |
| replacement becomes Pidgeotto 0→156 | 6684 | boundary watch: `opponentSpecies` 278→17, `opponentHp` 0→156 | ON RAM 6684; no shift |
| Pidgeotto visual settles | 6786 | `off-dense-switch`: `90aeaf7b5fc1…`, held through 6850; opponent switch controller completes at RAM tick 6804 | ON-fit `TURN5_PIDGEOTTO_SETTLE_TICK=6828`; **-42** visible ticks |
| resumed end-turn/Sitrus script | 6815 | boundary watch: `gBattleMainFunc=RunBattleScriptCommands_PopCallbacksStack` after the 6813/6814 end-turn transitions | ON main dispatcher was only coarsely cited; no direct like-for-like value |
| Sitrus message starts / fully prints | 6851 / 6885 | `off-dense-sitrus`: `880c1ac5140f…` onset, then `7d726abdc75f…` hold | ON-fit 7078 / 7112; **-227 / -227** |
| displayed heal 1→31 | 6953-6982 | `off-dense-sitrus`: one changing frame per HP step; frame 6982 has displayed 31/117 and blank text. RAM commits `playerHp=31` at 6984 and consumes `playerItem` at 6985 | ON-fit hp=2 at 7180 through hp=31 at 7209; **-227** at both endpoints |
| Sitrus text clear | 6982 | `off-dense-sitrus`: `e21e1e2f2d34…`, blank message box | ON-fit `TURN5_SITRUS_TEXT_CLEAR_TICK=7216`; **-234** |
| semantic turn completion | 6987→6988 | boundary watch: `BattleTurnPassed` at 6987, then `HandleTurnActionSelectionState` at 6988 | old ON RAM dossier cited the settled dispatcher at 7215; **-227** to 6988 |
| next action input handler ready | 6994 | boundary watch: controller `0x08057589`, `bg0Y=160`; input probe proves A at 6994 is ignored | ON RAM `bg0Y`/AI-tail fit reaches ready at 7221; **-227** |
| full action-menu pixels / first accepted A | **6995** | `off-dense-sitrus`: `c5bc606c9dde…`; input probe: pulse 6994 rejected, pulse 6995 returns action 0 and clears exec on that tick | ON full-menu fit 7222; **-227** |

Thus the handoff's source-semantic readiness is tick 6994 and its first
consumable input is tick 6995. The full visible menu and first legal input
coincide at 6995; the handler itself is installed one tick earlier.

## 2. Turn-5 handoff consumer: canonical turn-6 FIGHT reopen and PP

The canonical script intentionally idles long after readiness. Its action A
starts at frame 7312 and is accepted at RAM tick **7313**, 318 ticks after
the earliest accepted tick 6995. On that tick the player controller returns
action 0 (`B_ACTION_USE_MOVE`) and exec clears. The battle core emits
`CONTROLLER_CHOOSEMOVE` at **7314** with:

```text
persisted move slot: 0 (ROCK_SLIDE)
displayed/current PP: [6, 20, 19, 10]
```

At **7317**, `HandleInputChooseMove` (`0x08057bfd`) is installed and
`gBattle_BG0_Y` becomes 320. The prior action-menu framebuffer is still
visible on 7317; the first complete PP submenu is render tick **7318**,
sha `85d2bf9e8fe4…`. These facts come from the boundary watch plus
`off-dense-boundaries/manifest.json`; they directly exercise all three
`turn5Resolved` roles: next dispatcher, cumulative PP, and the later
predecessor guard.

The fixed reopen edge is unaffected by Scene mode because both profiles had
settled before frame 7312. The relevant OFF compression is upstream:

| Landmark-shaped delta (same tick coordinate) | OFF | ON fit | Compression |
| --- | ---: | ---: | ---: |
| `TURN5_SITRUS_TEXT_CLEAR - TURN5_CONFIRM_PRESS(5959)` | 1023 | 1257 | 234 |
| `TURN5_SITRUS_MENU_REDRAW - TURN5_CONFIRM_PRESS(5959)` | **1036** | 1263 | **227** |
| first accepted next action - turn-5 confirm | 1036 | 1263 | 227 |
| canonical FIGHT reopen accepted - menu redraw | 318 | 91 (7222→7313) | fixed input creates the different idle margin |

## 3. Turn 6 completion producer

Turn 6 begins from the exact PP handoff above. Its player ROCK_SLIDE PP
commits 6→5 at RAM tick 7648; Pidgeotto HP commits 156→113 at 7769. The
producer tail is:

| Boundary | OFF tick | Evidence | Legacy ON fit / delta |
| --- | ---: | --- | --- |
| held “It’s super effective!” last frame | 7869 | `off-dense-boundaries`: `846f9a5b4de3…` | ON held through 8114; **-245** |
| end-turn controller → `BattleTurnPassed` → action selection | 7867 / 7868 / 7869 | boundary watch `battleMainFunc`: `0x0803b905` / `0x0803b9bd` / `0x0803be75` | ON turn-pass/AI dossier places this family at 8114+; only the visible/ready edges below are exact like-for-like fits |
| text clear | 7870 | `off-dense-boundaries`: `a8e22ddf13b7…`, blank through 7876 | ON-fit 8115; **-245** |
| choose-action request / opponent AI done | 7872 / 7875 | boundary watch: exec 0→3 at 7872, then 3→1 at 7875 | ON AI cluster ends at 8121; presentation-relative comparison is the ready edge below |
| next action input handler ready | 7876 | controller `0x08057589`, `bg0Y=160`; A-at-7876 variant rejected | ON RAM `bg0Y` ready 8121; **-245** |
| full action-menu pixels / first accepted A | **7877** | sha `492e3816c1f0…`; pulse 7877 returns action 0 and clears exec | ON-fit full menu 8122; **-245** |

Using the legacy synthetic ROCK_SLIDE anchor 7372, the source-shaped values
are therefore:

| Landmark-shaped delta | OFF | Existing ON-fit source value | Compression |
| --- | ---: | ---: | ---: |
| `TURN6_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY` | **498** | 743 | 245 |
| `TURN6_OFF_ROCKSLIDE_ACTION_INPUT_READY_DELAY` | **504** | 749 (`bg0Y` 8121) | 245 |
| `TURN6_OFF_ROCKSLIDE_MENU_REDRAW_DELAY` | **505** | 750 | 245 |

Relative to the real confirm tick 7345 instead, those OFF values are
525/531/532; the existing ON values are 770/776/777. The synthetic-anchor
table is the one shaped like the current source constants; both coordinate
systems name the same absolute edges.

## 4. Turn-6 handoff consumer: canonical turn-7 FIGHT reopen and PP

The canonical action A starts at frame 8346 and is accepted at RAM tick
**8347**, 470 ticks after the earliest accepted tick 7877. The core emits
`CONTROLLER_CHOOSEMOVE` at **8348** with:

```text
persisted move slot: 0 (ROCK_SLIDE)
displayed/current PP: [5, 20, 19, 10]
```

`HandleInputChooseMove` and `gBattle_BG0_Y=320` become ready at **8351**;
the first complete PP submenu is render tick **8352**, sha
`383f3c6a1ec1…`. The boundary watch ends at 8355, before the turn-7 confirm
or resolution. This is the following reopen edge gated by the turn-6
completion owner, not evidence for turn 7's move window.

## 5. Handoff facts for implementation

The oracle evidence supports these immutable replacements, matching the
rank-2 handoff shape without claiming that any current staging module already
owns them:

| Completed turn | PP | Slot | Redraw | Input | Canonical consumer edge |
| ---: | --- | ---: | --- | --- | ---: |
| 5 | `[6,20,19,10]` | 0 | full action menu at 6995 | handler 6994; first accepted 6995 | FIGHT reopen accepted 7313; submenu ready 7317 |
| 6 | `[5,20,19,10]` | 0 | full action menu at 7877 | handler 7876; first accepted 7877 | FIGHT reopen accepted 8347; submenu ready 8351 |

Nothing in this evidence composes the separate FEATHER_DANCE and ROCK_SLIDE
stages into one Tier-1 owner; the audit correctly leaves that composition
question to implementation. This step only removes the previously missing
dynamic boundary/PP uncertainty.

## 6. Reproduce

Use a fresh scratch directory; all oracle calls below are OFF-only and do
not invoke the app compare:

```sh
scratch_dir=$(mktemp -d -t pokebench-turn56-off.XXXXXX)

python3 tools/run-mgba-probe.py "$scratch_dir/turn5-6-off-boundary-watch.json" -- \
  tools/probe/ram-probe.py \
  tools/probe/specs/turn5-6-off-boundary-watch.json \
  "$scratch_dir/turn5-6-off-boundary-watch.json"

python3 tools/run-mgba-probe.py "$scratch_dir/turn5-6-off-input-boundaries.json" -- \
  tools/probe/verify-turn5-6-off-input-boundaries.py \
  "$scratch_dir/turn5-6-off-input-boundaries.json"

base=tools/compare/traces/turn7-menu.json
jq '.oracleProfile="battle-scene-off" | .captureFrames=([range(6235;6386)] + [range(6548;6599)])' \
  "$base" > "$scratch_dir/off-dense-faint.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(6376;6421)]' \
  "$base" > "$scratch_dir/off-dense-faint-text.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(6670;6831)]' \
  "$base" > "$scratch_dir/off-dense-switch.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(6840;7016)]' \
  "$base" > "$scratch_dir/off-dense-sitrus.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=([range(7305;7352)] + [range(7855;7897)] + [range(8340;8397)])' \
  "$base" > "$scratch_dir/off-dense-boundaries.json"

bin/oracle run "$scratch_dir/off-dense-faint.json" -o "$scratch_dir/off-dense-faint" --quiet
bin/oracle run "$scratch_dir/off-dense-faint-text.json" -o "$scratch_dir/off-dense-faint-text" --quiet
bin/oracle run "$scratch_dir/off-dense-switch.json" -o "$scratch_dir/off-dense-switch" --quiet
bin/oracle run "$scratch_dir/off-dense-sitrus.json" -o "$scratch_dir/off-dense-sitrus" --quiet
bin/oracle run "$scratch_dir/off-dense-boundaries.json" -o "$scratch_dir/off-dense-boundaries" --quiet
```

The dense trace JSON and PNG/manifest directories are scratch evidence by
design. The committed tooling surface is limited to this dossier, the two
probe/watch specifications, and `ram-probe.py`'s optional `endTick` stop so
the canonical watch cannot drift into turn 7's resolution.
