# Turn 13 Battle Scene OFF ground truth

This is the oracle-side evidence prerequisite requested by
`docs/turn-resolved-owner-chain-audit.md` slice 0. It banks the canonical
Battle 1 turn-12 completion/turn-13 reopen, the turn-13
SAND_ATTACK -> DRAGON_BREATH -> PIDGEOTTO-faint lifecycle, the real
opponent-faint dismiss edge, a +30-frame delayed dismiss, MURKROW's
continuation, and the turn-14 FIGHT reopen under the explicit
`battle-scene-off` bootstrap. It changes no production code, acceptance
trace, or test.

## Evidence contract

The unchanged canonical source is
`tools/compare/traces/turn14-fly-miss.json` for the boundary watch and dense
continuation. Its relevant fixed input intervals are turn-12 confirm
`A` at `[14372,14374)`, turn-13 FIGHT `A` at `[15374,15376)`, turn-13
`DOWN` at `[15406,15408)`, DRAGON_BREATH confirm `A` at
`[15418,15420)`, faint-dismiss `A` at `[16820,16822)`, turn-14 FIGHT `A`
at `[17722,17724)`, and the following DRAGON_BREATH confirm at
`[17754,17756)`. Trace-frame intervals are half-open; RAM ticks below are
the post-`advance` coordinate, so a segment beginning at frame 16820 first
presents A on RAM tick 16821.

Two committed probes own the RAM and input claims:

- `tools/probe/specs/turn13-off-boundary-watch.json`, run through
  `tools/probe/ram-probe.py`, records the unchanged canonical replay from
  tick 14000 through 17765. Its generated output is named
  `turn13-off-boundary-watch.json` below.
- `tools/probe/verify-turn13-off-input-boundaries.py` moves one isolated A
  pulse across the adjacent readiness candidates after turns 12 and 13 and
  at the faint-text gate. It also preserves the canonical prefix through
  tick 16820 and replays the two-frame dismiss either there or after exactly
  30 additional idle frames. Its output is named
  `turn13-off-input-boundaries.json`.

The source-owned controller pointers are
`0x08057589=HandleInputChooseAction`,
`0x08057bfd=HandleInputChooseMove`,
`0x080597b5=CompleteOnInactiveTextPrinter2`,
`0x0805c005=HandleChooseActionAfterDma3`, and
`0x08057505=PlayerBufferRunCommand`. The turn-tail main functions are
`0x0803e019=RunBattleScriptCommands_PopCallbacksStack`,
`0x0803b905=HandleEndTurn_ContinueBattle`,
`0x0803b9bd=BattleTurnPassed`, and
`0x0803be75=HandleTurnActionSelectionState` (`arm-none-eabi-nm -an
reference/pokeemerald/pokeemerald.elf`). `CONTROLLER_CHOOSEMOVE` is command
20, and `ChooseMoveStruct.currentPP` is `gBattleBufferA[0][12..15]`.

Dense pixels are scratch oracle output, not committed compare traces. The
output names cited here are:

| Output manifest | Dense capture frames | Owns |
| --- | --- | --- |
| `off-turn13-boundaries/manifest.json` | 14758-14781, 15370-15385, 15886-15916, 16818-16850, 16940-16949, 17070-17090, 17718-17733 | both reopen/readiness edges, faint text/cursor, canonical freeze/icon onset, MURKROW/action menu, PP submenus |
| `off-turn13-delay30/manifest.json` | 16840-16885, 16964-16987, 17092-17125 | delayed live-cursor phase, captured freeze, shifted icon/switch/menu continuation |

Every range is stride 1. Reproduction commands are in section 6.

## 1. Turn-12 completion and the turn-13 FIGHT reopen

The turn-12 tail reaches `HandleInputChooseAction` with `gBattle_BG0_Y=160`
at RAM tick **14768**. The isolated pulse at 14768 is rejected; 14769 is the
first consumed action A. The full action-menu framebuffer first appears at
render tick **14769**, sha `882e3c818195...`. The legacy ON pixel fit first
showed this menu at 14799, so Scene OFF compresses this boundary by **30
ticks**.

The canonical replay intentionally waits until its FIGHT A is accepted at
**15375**. `CONTROLLER_CHOOSEMOVE` is emitted at **15376** with persisted
`gMoveSelectionCursor=0` and PP:

```text
[0, 19, 19, 10]
```

`HandleInputChooseMove` and `gBattle_BG0_Y=320` are ready at **15379**. The
first complete submenu is render tick **15380**, sha
`41067e0b8723...`; direct PNG inspection shows ROCK_SLIDE selected at
0/10. The fixed canonical input occurs after both profiles have settled, so
these controller edges do not shift from the legacy ON route.

The source-shaped turn-12 completion deltas are therefore:

| Landmark-shaped delta from turn-12 confirm tick 14373 | OFF | Legacy ON fit | Compression |
| --- | ---: | ---: | ---: |
| action handler installed | 395 (14768) | no isolated ON input probe | -- |
| full menu / first accepted action | **396 (14769)** | **426 (14799)** | **30** |
| canonical FIGHT accepted | 1002 (15375) | 1002 | 0 (fixed late input) |

## 2. Turn 13 resolution and the settled faint cursor

The unchanged watch proves one uninterrupted semantic chain. Pidgeotto's
SAND_ATTACK becomes `gCurrentMove=28` at 15425 and consumes its PP 15->14
at 15463. Onix's DRAGON_BREATH becomes `gCurrentMove=225` at **15673** and
consumes PP 19->18 at **15703**. Pidgeotto's HP commits 16->0 at **15797**.
The latter two ON dossier boundaries were 15701 and 15887, so Scene OFF
compresses them by 28 and 90 ticks respectively as the skipped presentation
work accumulates.

The healthbox is gone at render 15887 (`02e2544a49ca...`). The faint line's
first glyph appears at **15889**, it is fully printed at **15909**
(`ec24a93b4f4b...`), and the isolated input probe establishes the controller
boundary exactly:

- A at RAM tick **15909** is rejected and the text controller remains live.
- A at RAM tick **15910** is accepted; the controller completes at 15912.
- The first visible settled wait cursor is render tick **15911**, sha
  `99f977da6802...`.

Thus the first accepted input precedes the first visible cursor by one tick,
the same controller/render boundary seen in the turn-5 OFF evidence. The
legacy ON pixel fit placed the first cursor at 16001, so the visible settled
cursor is **90 ticks earlier** under OFF. No isolated ON first-A probe was
banked, so this dossier does not invent an ON eligibility tick.

| Boundary | OFF tick | Legacy ON fit / delta |
| --- | ---: | --- |
| DRAGON_BREATH selected as current move | 15673 | ON 15701; **-28** |
| DRAGON_BREATH PP 19->18 | 15703 | ON exact PP-write tick not separately cited |
| PIDGEOTTO HP 16->0 | 15797 | ON 15887; **-90** |
| faint text first glyph / fully printed | 15889 / 15909 | ON 15979 / 15999; **-90 / -90** |
| first dismiss-eligible A | **15910** | no isolated ON input probe |
| first visible settled cursor | **15911** | ON 16001; **-90** |

## 3. The captured dismiss edge and +30 delayed route

The canonical trace waits 811 ticks past the first legal A. Its two-frame
dismiss starts at trace frame 16820, first presents A on RAM tick **16821**,
and completes the text controller at **16823**. The boundary watch then
issues opponent command 48 (party-status/icon bar) at **16847**; the first
visible icon-bar frame is **16848**, sha `9cd5f8b264b2...`.

The cursor is live before the press, but the accepted edge freezes the pose:
the canonical capture becomes `633ba603de70...` at frame 16820 and remains
that exact framebuffer through 16847. This is the dynamic fact consumed by
the `battleScene.ts:14152-14174` path: eligibility time is not an equivalent
substitute for the real edge.

The verifier's delayed variant inserts exactly 30 idle frames before the
same two-frame A. The live cursor changes to `99f977da6802...` at frame
16847; the A interval is `[16850,16852)`, first press tick **16851**, and
controller completion is **16853**. That different cursor pose then remains
byte-identical through frame 16877. Opponent command 48 is issued at
**16877**, and the first visible icon bar is **16878**, sha
`6a32f60c27d7...`.

Every probed continuation boundary shifts by exactly +30:

| Boundary | Canonical OFF | +30 delayed OFF | Shift |
| --- | ---: | ---: | ---: |
| first A input tick | 16821 | 16851 | +30 |
| text-controller completion | 16823 | 16853 | +30 |
| icon-bar command 48 | 16847 | 16877 | +30 |
| first visible icon bar | 16848 | 16878 | +30 |
| PIDGEOTTO->MURKROW species/HP commit | 16944 | 16974 | +30 |
| sent-out text first glyph | 16947 | 16977 | +30 |
| next-action handler | 17084 | 17114 | +30 |
| full next action menu | 17085 | 17115 | +30 |

**Delayed-route answer:** Scene OFF does **not** change the
dismiss-to-icon-bar latency relative to the legacy ON fit. Both use 26 ticks
from first A input to command 48 and 27 ticks from first A input to the first
visible icon-bar frame. Scene mode does shorten later MURKROW entrance work;
that is a separate post-icon boundary, not dismiss latency.

## 4. MURKROW continuation and the turn-14 handoff

On the canonical route, the watch records PIDGEOTTO->MURKROW and HP 0->142
at **16944**, sent-out text controller dispatch at 16946, and its first glyph
at **16947**. The switch-in controller completes at 17067. The battle tail
then crosses `RunBattleScriptCommands_PopCallbacksStack` at 17074,
`HandleEndTurn_ContinueBattle` at 17076, `BattleTurnPassed` at 17077, and
`HandleTurnActionSelectionState` at 17078.

The next `HandleInputChooseAction` is installed at **17084**. The isolated A
at 17084 is rejected; 17085 is the first consumed action input and the first
full action-menu framebuffer (`5e6a26f6f342...`). The legacy ON chrome
reveal is 17112, so MURKROW's Scene-OFF entrance reaches the same boundary
**27 ticks earlier**. The +30 delayed route reaches the corresponding
handler/menu at 17114/17115, preserving the entire edge-relative lifecycle.

The canonical replay waits again. Its turn-14 FIGHT A is accepted at
**17723**, `CONTROLLER_CHOOSEMOVE` is emitted at **17724**, and the buffer
contains:

```text
persisted gMoveSelectionCursor: 2 (DRAGON_BREATH)
displayed/current PP: [0, 19, 18, 10]
```

`HandleInputChooseMove` and `gBattle_BG0_Y=320` are ready at **17727**. The
first complete submenu is render tick **17728**, sha
`a0f37a67c387...`; direct PNG inspection shows DRAGON_BREATH selected at
18/20 and TYPE/DRAGON. These are the post-turn-13 facts owned by the typed
handoff, not the following FLY owner's later 17/20 receipt.

| Completed turn | PP | Slot | Redraw | Input | Canonical consumer edge |
| ---: | --- | ---: | --- | --- | ---: |
| 12 | `[0,19,19,10]` | 0 | full action menu 14769 | handler 14768; first accepted 14769 | FIGHT 15375; submenu ready 15379 / visible 15380 |
| 13 | `[0,19,18,10]` | 2 | full action menu 17085 | handler 17084; first accepted 17085 | FIGHT 17723; submenu ready 17727 / visible 17728 |

## 5. Bounded interpretation

The evidence closes both dynamic gaps named by the owner-chain audit:

1. `turn12Resolved`'s replacement can own post-turn-12 PP
   `[0,19,19,10]`, slot 0, settled redraw, and ready input without borrowing
   the later turn-13 handoff.
2. An opponent-faint presentation owner must retain the actual variable
   dismiss edge. The +30 route freezes a different cursor pose and rebases
   every continuation boundary, while its dismiss-to-icon-bar latency itself
   remains profile-invariant.

This is oracle evidence only. It does not prove a particular TypeScript owner
implementation, and it does not alter any acceptance surface.

## 6. Reproduce

Use a fresh scratch directory. These commands are OFF-only and never invoke
the app compare:

```sh
scratch_dir=$(mktemp -d -t pokebench-turn13-off.XXXXXX)

python3 tools/run-mgba-probe.py "$scratch_dir/turn13-off-boundary-watch.json" -- \
  tools/probe/ram-probe.py \
  tools/probe/specs/turn13-off-boundary-watch.json \
  "$scratch_dir/turn13-off-boundary-watch.json"

python3 tools/run-mgba-probe.py "$scratch_dir/turn13-off-input-boundaries.json" -- \
  tools/probe/verify-turn13-off-input-boundaries.py \
  "$scratch_dir/turn13-off-input-boundaries.json"

base=tools/compare/traces/turn14-fly-miss.json
jq '.oracleProfile="battle-scene-off" | .captureFrames=([range(14758;14782)] + [range(15370;15386)] + [range(15886;15917)] + [range(16818;16851)] + [range(16940;16950)] + [range(17070;17091)] + [range(17718;17734)])' \
  "$base" > "$scratch_dir/off-turn13-boundaries.json"
bin/oracle run "$scratch_dir/off-turn13-boundaries.json" \
  -o "$scratch_dir/off-turn13-boundaries" --quiet

base=tools/compare/traces/turn13-menu.json
jq '.oracleProfile="battle-scene-off" | .segments[105].frames += 30 | .captureFrames=([range(16840;16886)] + [range(16964;16988)] + [range(17092;17126)])' \
  "$base" > "$scratch_dir/off-turn13-delay30.json"
bin/oracle run "$scratch_dir/off-turn13-delay30.json" \
  -o "$scratch_dir/off-turn13-delay30" --quiet
```

The generated JSON, PNGs, and manifests remain scratch evidence by design.
Only this dossier and the reusable watch/input specifications are committed.
