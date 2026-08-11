# Turns 7-8 Battle Scene OFF boundary ground truth

This is the second oracle-side evidence prerequisite requested by
`docs/turn-resolved-owner-chain-audit.md` slice 0. It banks the canonical
Battle 1 turn-7 and turn-8 completion/reopen boundaries under the explicit
`battle-scene-off` bootstrap. It changes no production code, acceptance
trace, or test, and stops at turn 9's move confirmation.

## Evidence contract

The button source is `tools/compare/traces/turn9-menu.json`. Its relevant
fixed intervals are half-open (RAM ticks below are the post-`advance`
coordinate): turn-7 action-menu A `[8346,8348)`, turn-7 move-confirm A
`[8378,8380)`, turn-8 action-menu A `[9380,9382)`, cursor RIGHT
`[9412,9414)`, turn-8 BIND confirm A `[9424,9426)`, turn-9 action-menu A
`[10826,10828)`, cursor LEFT `[10858,10860)`, and turn-9 move-confirm A
`[10870,10872)`. These intervals come directly from that trace's segment
ledger; the committed watch stops at tick 10880, before turn 9 resolves.

Two committed probes own the RAM claims:

- `tools/probe/specs/turn7-8-off-boundary-watch.json`, run through
  `tools/probe/ram-probe.py`, records the unchanged canonical replay from
  ticks 8300-10880. Its generated output is named
  `turn7-8-off-boundary-watch.json` below.
- `tools/probe/verify-turn7-8-off-input-boundaries.py` moves one isolated A
  pulse across each candidate post-resolution action-input boundary while
  retaining the preceding canonical prefix byte-for-byte. Its output is
  named `turn7-8-off-input-boundaries.json` below.

The relevant source-owned controller pointers are
`0x08057589=HandleInputChooseAction`,
`0x08057bfd=HandleInputChooseMove`,
`0x0805c005=HandleChooseActionAfterDma3`, and
`0x08057505=PlayerBufferRunCommand`. `gBattle_BG0_Y=160/320` is the
action/FIGHT selection made by those handlers. `CONTROLLER_CHOOSEMOVE` is
command 20, and `ChooseMoveStruct.currentPP` occupies
`gBattleBufferA[0][12..15]`. The pointers and layouts are reproducible from
`reference/pokeemerald/pokeemerald.elf`, `battle_controller_player.c`,
`battle_controllers.c`, and `battle_controllers.h`.

Dense pixel evidence is scratch output, not a committed compare trace. All
ranges are stride 1:

| Output manifest | Dense capture frames | Owns |
| --- | --- | --- |
| `off-dense-turn7-a/manifest.json` | 8370-8625 | turn-7 confirm, FEATHER_DANCE kickoff/stat fall, harsh-fall handoff |
| `off-dense-turn7-b/manifest.json` | 8626-8881 | ROCK_SLIDE kickoff, hit/drain, super-effective text |
| `off-dense-reopens/manifest.json` | 8882-8909, 9370-9444, 10818-10879 | turn-7 clear/redraw, both following FIGHT reopens and PP submenus |
| `off-dense-turn8-a/manifest.json` | 9420-9675 | turn-8 confirm, FEATHER_DANCE kickoff/stat fall |
| `off-dense-turn8-b/manifest.json` | 9676-9874 | BIND kickoff/miss and turn-8 clear/redraw |

The exact reproduction commands are in §6.

## 1. Turn 7 producer: FEATHER_DANCE into ROCK_SLIDE

Unless a row says pixel manifest, its RAM facts come from
`turn7-8-off-boundary-watch.json`. Legacy comparisons cite the exact or
explicitly approximate Scene-ON landmarks already banked in
`docs/turn7-notes.md` and the current source constants.

| Boundary | OFF tick | Re-runnable evidence | Legacy ON fit / delta |
| --- | ---: | --- | --- |
| canonical ROCK_SLIDE confirm accepted | 8379 | watch: player controller returns to `PlayerBufferRunCommand`, exec 1→0 | same fixed input tick |
| opponent FEATHER_DANCE selected | 8385 | watch: `gCurrentMove` 0→297 | ON 8385; no shift |
| FEATHER_DANCE text begins / fully visible | 8392 / 8422 | `off-dense-turn7-a`: first glyph at 8392; full `2772abca5248…` at 8422 | ON dossier's visible range was approximate (`~8391-8396`), so no exact delta is claimed |
| Onix ATK stage 4→2; Pidgeotto PP 14→13 | 8425 / 8424 | watch: `playerAttackStage`, `opponentPp2` | ON ATK write 8425; no shift |
| “ONIX's ATTACK harshly fell!” fully visible | 8580 | `off-dense-turn7-a`: `bcf1f4152822…` | ON 8718; **-138** |
| handoff to Onix ROCK_SLIDE | 8654 | watch: attacker 1→0 and `gCurrentMove` 0→157 | ON 8792; **-138** |
| ROCK_SLIDE transition begins / text fully visible | 8661 / 8680 | `off-dense-turn7-b`: first changed frame after held stat text; `e8811187b452…` at 8680 | ON 8799 / 8818; **-138 / -138** |
| ROCK_SLIDE PP 5→4 | 8682 | watch: `playerPp0` | ON 8820; **-138** |
| Pidgeotto HP 113→82 commits | 8791 | watch: `opponentHp`; dense drain settles at `f78bcdc6f037…` by 8787 | ON RAM 9036; **-245** |
| “It's super effective!” fully visible | 8815 | `off-dense-turn7-b`: `92c9f9307078…` | ON 9060; **-245** |
| end-turn dispatcher → `BattleTurnPassed` → action selection | 8889 / 8890 / 8891 | watch `gBattleMainFunc`: `0x0803b905` / `0x0803b9bd` / `0x0803be75` | no exact like-for-like ON RAM row banked |
| text clear | 8892 | `off-dense-reopens`: first blank `d3270f177537…`, held through 8898 | ON 9137; **-245** |
| choose-action request / opponent AI done | 8894 / 8897 | watch: exec 1→3, then 3→1 | no separate ON pin |
| action handler ready | **8898** | watch: `HandleInputChooseAction`, `bg0Y=160`; isolated A at 8898 is rejected | ON `bg0Y` edge 9143; **-245** |
| full action-menu pixels / first accepted A | **8899** | `off-dense-reopens`: `15a8ef75dfb2…`; isolated A at 8899 returns action 0 and clears exec | ON-fit pixel redraw 9144; **-245** |

The Scene-OFF window therefore has two distinct compressions. The
FEATHER_DANCE-to-ROCK_SLIDE handoff is 138 ticks earlier than the legacy ON
line; skipping ROCK_SLIDE's scene animation removes another 107 ticks, so
the HP/result/redraw tail is 245 ticks earlier. Both facts are independently
present in the watch and dense manifests; neither is inferred from the final
menu alone.

Using the existing synthetic ROCK_SLIDE anchor
`TURN7_ROCKSLIDE_PRESS_TICK=8406`, the source-shaped values are:

| Landmark-shaped delta | OFF | Existing ON-fit value | Compression |
| --- | ---: | ---: | ---: |
| `TURN7_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY` | **486** | 731 | 245 |
| `TURN7_OFF_ROCKSLIDE_ACTION_HANDLER_READY_DELAY` | **492** | 737 (`bg0Y` at 9143) | 245 |
| `TURN7_OFF_ROCKSLIDE_MENU_REDRAW_DELAY` | **493** | 738 | 245 |
| first accepted next action | **493** | no isolated ON input probe; ON pixel fit is 738 | — |

These arithmetic rows use the absolute edges above from
`turn7-8-off-boundary-watch.json` and `off-dense-reopens/manifest.json`;
the ON values are the named constants and comments in `battleMenu.ts`.
Relative to the real confirm tick 8379, the OFF clear/handler/redraw values
are 513/519/520, while the legacy ON equivalents are 758/764/765.

## 2. Turn-7 handoff consumer: turn-8 FIGHT reopen and PP

The canonical action A starts at frame 9380 and is accepted at RAM tick
**9381**, 482 ticks after the first legal tick 8899. The watch shows
`CONTROLLER_CHOOSEMOVE` at **9382** with:

```text
persisted move slot: 0 (ROCK_SLIDE)
displayed/current PP: [4, 20, 19, 10]
```

`HandleInputChooseMove` and `gBattle_BG0_Y=320` become ready at **9385**.
The first complete PP submenu is render tick **9386**, sha
`c4c273d6f290…`; direct PNG inspection shows slot 0, ROCK_SLIDE, PP 4/10,
TYPE/ROCK. All numbers in this paragraph come from
`turn7-8-off-boundary-watch.json` and
`off-dense-reopens/manifest.json`.

## 3. Turn 8 producer: FEATHER_DANCE into BIND miss

| Boundary | OFF tick | Re-runnable evidence | Legacy ON fit / delta |
| --- | ---: | --- | --- |
| canonical BIND confirm accepted | 9425 | watch: player controller returns to `PlayerBufferRunCommand`, exec 1→0; persisted cursor is slot 1 | same fixed input tick |
| opponent FEATHER_DANCE selected | 9431 | watch: `gCurrentMove` 0→297 | ON 9431; no shift |
| FEATHER_DANCE text begins / fully visible | 9438 / 9468 | `off-dense-turn8-a`: first glyph then `1d79ff34cb3b…` | ON 9438 / 9468; no shift |
| Pidgeotto PP 13→12; Onix ATK stage 2→0 | 9470 / 9471 | watch: `opponentPp2`, `playerAttackStage` | ON 9470 / 9471; no shift |
| “ONIX's ATTACK harshly fell!” fully visible | 9626 | `off-dense-turn8-a`: `6599b1075f5c…` | ON 9764; **-138** |
| handoff to Onix BIND | 9700 | watch: attacker 1→0 and `gCurrentMove` 0→20 | ON 9838; **-138** |
| BIND transition begins / text fully visible | 9708 / 9721 | `off-dense-turn8-b`: held stat text ends after 9707; `fa8e70f4e678…` at 9721 | ON 9846 / 9859; **-138 / -138** |
| BIND PP 20→19 | 9723 | watch: `playerPp1`; HP remains 31/82 | ON 9861; **-138** |
| miss transition begins / “ONIX's attack missed!” fully visible | 9758 / 9777 | `off-dense-turn8-b`: BIND hold ends after 9757; `ccb600cf6919…` at 9777 | ON 9896 / 9915; **-138 / -138** |
| end-turn dispatcher → `BattleTurnPassed` → action selection | 9850 / 9851 / 9852 | watch `gBattleMainFunc`: `0x0803b905` / `0x0803b9bd` / `0x0803be75` | no exact like-for-like ON RAM row banked |
| miss text clear | 9853 | `off-dense-turn8-b`: first blank `d3270f177537…`, held through 9859 | ON 9991; **-138** |
| choose-action request / opponent AI done | 9855 / 9857 | watch: exec 1→3, then 3→1 | no separate ON pin |
| action handler ready | **9859** | watch: `HandleInputChooseAction`, `bg0Y=160`; isolated A at 9859 is rejected | ON `bg0Y` edge 9996; **-137** |
| full action-menu pixels / first accepted A | **9860** | `off-dense-turn8-b`: `15a8ef75dfb2…`; isolated A at 9860 returns action 0 and clears exec | ON-fit pixel redraw 9997; **-137** |

The BIND attempt misses: player and opponent HP stay 31 and 82 throughout
the watch, so no trap-start or residual-damage claim is banked. The PP
decrement and text path are real even on the miss.

Using the real confirm anchor `TURN8_BIND_PRESS_TICK=9425`, the current
source-constant-shaped values are:

| Landmark-shaped delta | OFF | Existing ON-fit value | Compression |
| --- | ---: | ---: | ---: |
| `TURN8_OFF_BIND_TEXT_DELAY` | **283** | 421 | 138 |
| `TURN8_OFF_MISS_TEXT_DELAY` | **333** | 471 | 138 |
| `TURN8_OFF_TEXT_CLEAR_DELAY` | **428** | 566 | 138 |
| `TURN8_OFF_ACTION_HANDLER_READY_DELAY` | **434** | 571 (`bg0Y` at 9996) | 137 |
| `TURN8_OFF_MENU_REDRAW_DELAY` | **435** | 572 | 137 |
| first accepted next action | **435** | no isolated ON input probe; ON pixel fit is 572 | — |

The 434-tick RAM readiness/reset value is the exact form of the earlier
estimate in `docs/idle-bounce-phase-attribution.md`. The visible menu and
first accepted input follow one tick later at 435. The table's one-tick
compression difference is therefore a controller/render boundary, not
measurement uncertainty.

## 4. Turn-8 handoff consumer: turn-9 FIGHT reopen and PP

The canonical action A starts at frame 10826 and is accepted at RAM tick
**10827**, 967 ticks after the first legal tick 9860. The watch emits
`CONTROLLER_CHOOSEMOVE` at **10828** with:

```text
persisted move slot: 1 (BIND)
displayed/current PP: [4, 19, 19, 10]
```

The persisted slot is `gMoveSelectionCursor=1`; the trace's later LEFT pulse
does not change it to 0 until tick 10859. `HandleInputChooseMove` and
`gBattle_BG0_Y=320` become ready at **10831**. The first complete PP submenu
is render tick **10832**, sha `87e19f2d77e8…`; direct PNG inspection shows
slot 1, BIND, PP 19/20, TYPE/NORMAL. These facts come from
`turn7-8-off-boundary-watch.json` and
`off-dense-reopens/manifest.json`.

## 5. Handoff facts and bounded remainder

| Completed turn | PP | Slot | Redraw | Input | Canonical consumer edge |
| ---: | --- | ---: | --- | --- | ---: |
| 7 | `[4,20,19,10]` | 0 | full action menu 8899 | handler 8898; first accepted 8899 | FIGHT accepted 9381; submenu ready 9385 / visible 9386 |
| 8 | `[4,19,19,10]` | 1 | full action menu 9860 | handler 9859; first accepted 9860 | FIGHT accepted 10827; submenu ready 10831 / visible 10832 |

All values in this summary are direct restatements of §§1-4. The evidence
proves that the unchanged canonical replay crosses both turn boundaries
without an RNG or state discontinuity: FEATHER_DANCE PP/stat writes,
ROCK_SLIDE/BIND PP, HP, controller, and following submenu state all occur in
one watch. It does **not** prove that the current separate TypeScript staging
modules compose into one uninterrupted Tier-1 owner; that remains an
implementation question identified by the audit. BIND's on-hit trap branch
also remains outside this canonical miss line.

## 6. Reproduce

Use a fresh scratch directory. These commands are OFF-only and never invoke
the app compare:

```sh
scratch_dir=$(mktemp -d -t pokebench-turn78-off.XXXXXX)

python3 tools/run-mgba-probe.py "$scratch_dir/turn7-8-off-boundary-watch.json" -- \
  tools/probe/ram-probe.py \
  tools/probe/specs/turn7-8-off-boundary-watch.json \
  "$scratch_dir/turn7-8-off-boundary-watch.json"

python3 tools/run-mgba-probe.py "$scratch_dir/turn7-8-off-input-boundaries.json" -- \
  tools/probe/verify-turn7-8-off-input-boundaries.py \
  "$scratch_dir/turn7-8-off-input-boundaries.json"

base=tools/compare/traces/turn9-menu.json
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(8370;8626)]' \
  "$base" > "$scratch_dir/off-dense-turn7-a.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(8626;8882)]' \
  "$base" > "$scratch_dir/off-dense-turn7-b.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=([range(8882;8910)] + [range(9370;9445)] + [range(10818;10880)])' \
  "$base" > "$scratch_dir/off-dense-reopens.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(9420;9676)]' \
  "$base" > "$scratch_dir/off-dense-turn8-a.json"
jq '.oracleProfile="battle-scene-off" | .captureFrames=[range(9676;9875)]' \
  "$base" > "$scratch_dir/off-dense-turn8-b.json"

bin/oracle run "$scratch_dir/off-dense-turn7-a.json" -o "$scratch_dir/off-dense-turn7-a" --quiet
bin/oracle run "$scratch_dir/off-dense-turn7-b.json" -o "$scratch_dir/off-dense-turn7-b" --quiet
bin/oracle run "$scratch_dir/off-dense-reopens.json" -o "$scratch_dir/off-dense-reopens" --quiet
bin/oracle run "$scratch_dir/off-dense-turn8-a.json" -o "$scratch_dir/off-dense-turn8-a" --quiet
bin/oracle run "$scratch_dir/off-dense-turn8-b.json" -o "$scratch_dir/off-dense-turn8-b" --quiet
```

The generated JSON, PNGs, and manifests remain scratch evidence by design.
Only this dossier and the two reusable probe/watch specifications are
committed.
