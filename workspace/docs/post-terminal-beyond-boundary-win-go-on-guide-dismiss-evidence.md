# WIN guide dismissal → walk → warp → Battle Room entry (Battle Scene OFF)

MAIN-LANE evidence packet, continuing
`docs/post-terminal-beyond-boundary-win-go-on-swap-offer-no-decision-evidence.md`
(which bound the generic `Right this way, please!` guide fully typed from
frame 10031 and held through the fixture endpoint 10406, **213/213 exact**,
and stopped without pressing into the walk/warp). This packet authors the
**first press past the guide**: one safely-held `A` dismissal of the generic
`EnterBattleRoom` message, then a bounded idle. Dense oracle captures bind
the message dismissal, the attendant/player walk, the warp/fade, the Battle
Factory Battle Room entry, and the first genuine stable boundary on the far
side; the app is compared through the same `win-terminal-window-off`
presentation seam.

**Headline**: the app reproduces the entire generic span byte-for-byte —
**232/232 exact through frame 10637** (guide dismissal → walk → warp fade →
room fade-in → opponent walk-in mechanics start) — with **zero src edits**:
the existing `acceptPostwinRightThisWayDismiss` → `prebattleRoom` messageClosing
→ walking → warpFade → battleRoom handoff machinery reproduced every boundary
with its current constants. Past frame 10637 the far-side opponent *content*
(sprite art + opening quote) diverges because the app's round controller
generates its own battle-2 opponent (ABBIE, trainer 73) from its modeled RNG
ledger while the real ROM generated LILIANA (trainer 9) from its actual
`gRngValue` — a documented round-RNG modeling gap, not a presentation bug
(§5).

## 1. New fixture and prefix proof

`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
is a copy of the committed
`tools/battle-lab/scratch-win-go-on-swap-offer-no-probe.json` with all 37
existing `trace.segments` preserved **byte-for-byte** (JSON-equality verified;
the top-level payload except `trace.segments`/`trace.captureFrames` is
identical). Two segments are appended — a 2-tick `A` dismissing the held
guide and a 900-frame bounded idle tail — giving 39 segments / 11308 total
frames.

The `A` therefore lands at frames 10407-10408, **one frame after** the proven
guide boundary (fully typed at 10031, held byte-identical through 10406). The
dismissal is unpressed before this point, so the whole oracle replay before
10407 is byte-for-byte the prior packet's proven prefix.

## 2. Oracle boundary ledger

`bin/oracle lab` manifest (raw framebuffer sha256, dense 10406-10500 +
4-frame grid to 10800 + sparse anchors to 11308; two dense runs
byte-identical). `bin/oracle lab` frame 0 is the post-checkpoint fixture
frame, so these are the fixture's own cumulative frames:

| frame | what's on screen | mechanism |
|---:|---|---|
| 10406 | held guide "Right this way, please!" (no cursor), byte-identical to the prior packet's endpoint | proven held boundary, unpressed |
| **10407-10408** | same (no visual change during the `A` pulse) | this fixture's **`A` press**; `closemessage` then `EventScript_WalkToBattleRoomLv50` (`scripts.inc:44-50`) |
| **10409-10488** | attendant + player walk; one visible change every frame | the shared guided walk (`prebattleRoom.ts` WALK_STEPS, 80 ticks) |
| 10489-10491 | walk frozen (3 ticks) | `waitmovement 0` settling |
| 10492-10508 | warp fade: BG/OBJ palette alternating every tick | `BeginNormalPaletteFade` darkening the frozen walk pose |
| 10508-10524 | solid black hold | pre-warp black |
| 10525-10544 | Battle Room fade-in (growing band each tick) | `FADE_IN` into `MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM` (warp `scripts.inc:50`) |
| 10544-10548 | room settled, static | the room's own scene assembly before any object motion |
| 10552-10720 | opponent walk-in (School Kid F gfx, 16px column) | `EventScript_EnterRoom`'s `Movement_OpponentEnter` (`battle-room scripts.inc:58-64`) |
| 10724 | message box appears fully formed | `msgbox gStringVar4, MSGBOX_DEFAULT` (`battle-room scripts.inc:68`) |
| 10728-10752 | "I WON'T GIVE UP / UNTIL I WIN" types 1 glyph/tick | `palace_getopponentintro` → `BufferOpponentIntroSpeech` (`battle_palace.c:160-166`) |
| **10752-11308** | fully typed quote held static through the fixture endpoint | the far-side boundary; this step stops here (no press into battle-2 setup) |

The far-side quote is LILIANA's (`gFacilityTrainers[9].speechBefore`, "I WON'T
GIVE UP / UNTIL I WIN"), confirmed by a RAM probe reading
`gTrainerBattleOpponent_A` = **9** across the whole far side
(`tools/probe/dump-guide-dismiss-far-side-trainer.py`, receipt in §5). No
red wait-cursor pixels appear in the sampled box region of the held quote
(pixel-scanned frames 10752-11308); the hold is a stable/dismiss-ready
boundary, consistent with the fixture stopping before any battle-2 input.

## 3. App reproduction (frame math)

The app's existing generic postwin clocks line up with the ledger exactly,
with no calibration:

| boundary | oracle | app (edge-relative) | match |
|---|---|---|---|
| guide dismiss edge | 10407 (first `A` tick) | `acceptPostwinRightThisWayDismiss` stores the edge at the first `A` tick (`core.ts:901-908`) | ✅ |
| walk start | 10409 (press+2) | `messageClosing` (2 ticks) then `walking` at 0 (`prebattleRoom.ts`) | ✅ |
| walk end / settle | 10488/10489 | `WALK_TICKS` 80 / hold | ✅ |
| warp fade → black | 10492-10524 | `WARP_FADE_OUT` over `WARP_FADE_TO_ROOM_ELAPSED` 37 | ✅ |
| room handoff | 10525+ | `prebattleRoom` warpFade → `battleRoom` at `WARP_FADE_TO_ROOM_ELAPSED` (`core.ts:840-849`) | ✅ |
| room settle | 10544-10548 | `INITIAL_BATTLE_2_ROOM_STATE` entering | ✅ |
| opponent walk-in start | 10552 | battleRoom opponent walk-in | ✅ (mechanics only) |

New compare spec `tools/compare/traces-groundtruth/win-go-on-swap-offer-no-guide-dismiss-off.json`
reuses the canonical `win-terminal-window-off` appStage at its canonical stage
frame 4623 and copies the new fixture's 39 segments + dense captureFrames
10406..10637 verbatim:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-go-on-swap-offer-no-guide-dismiss-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json` | 39, sum 11308 | dense 10406-10637 (232) | **232/232 exact, 0 diff** |

The exact span covers the guide dismissal, the full attendant/player walk,
the warp fade, the black hold, the Battle Room fade-in/settle, and the first
~86 frames of the opponent walk-in. The very first divergent frame is 10638
(86 px, bbox x129-142 y0-8) — the opponent sprite's top pixels becoming
visible — the start of the §5 content gap. Following the run's precedent for
un-green spans (e.g. the parked projectile renders), the committed spec's
captures stop at 10637; the far side is bound by the oracle evidence here,
not by a red compare.

## 4. Battle Index advance proof

The generic seven-battle owner advances to **battleIndex 1** exactly at the
swap-offer NO presentation handoff, not during the guide/walk/warp: the swap
command completes at the NO edge and the round reaches
`presentingBattleStart` (battleIndex 1, pending `battleStart`) through
`chooseFactoryRoundSwap` decline → `swapResolved` →
`advanceFactoryRoundPresentation`, and the room's scene handoff consumes that
pending `battleStart` at `BATTLE_2_SCENE_HANDOFF_ELAPSED`. Already Tier-1
pinned: `tests/factoryRoundBattleOrchestrator.test.ts` ("declines the swap and
asserts the round advances to `presentingBattleStart` (battleIndex 1)"),
`tests/postwin.test.ts` (guide-dismiss gate + stored edges +
`prebattleRoom` messageClosing creation), `tests/prebattleRoomFlow.test.ts`
(walk/warp phase counts), `tests/interactiveRouting.test.ts` (warpFade →
battleRoom handoff + `battleStart` consumption). No absolute frame /
battle-number / fixture branch was added or needed.

## 5. Far-side opponent content: the round-RNG modeling gap

The app's round controller generates battle 2's opponent from its own RNG
ledger; the ROM generates it from its real `gRngValue` at the start of
`AskSwapMon` (`factory_generateopponentmons`, `pre-battle-room
scripts.inc:138`). For this mechanicLab fixture:

| side | battle-2 trainer | source |
|---|---|---|
| oracle | **9 LILIANA** ("I WON'T GIVE UP / UNTIL I WIN") | `gTrainerBattleOpponent_A` = 9 from frame ≤9020 (RAM probe), deterministic from the ROM's actual `gRngValue` stream |
| app | **73 ABBIE** ("YOU TRY MY SECRET / AROMATHERAPY OK?") | `generateFactoryOpponent(config, battleIndex 1, round.rules.rngValue=9, …)` from the win-terminal scaffold's modeled terminal-battle RNG |

The app matches every pixel of the room entry and the walk-in *mechanics*
(timing, column, animation frame selection) through 10637; only the sprite
art and quote text differ from 10638. Root cause is the `win-terminal-window-off`
stage's terminal-battle RNG seed (a scaffold constant) not reproducing the
fixture's real `gRngValue` at the generation point — the round's battle-2
opponent is deterministic from that modeled seed, so no generic
source-relative round-controller/presentation change can align it to this
mechanicLab fixture's real opponent without re-seeding the scaffold (a
fixture-specific step, out of this bounded step's "generic source-relative"
remit). The generic seven-battle owner's *advancement* (battleIndex 1 + room
handoff) is exact regardless.

## 6. Reproducing the numbers

```sh
bin/oracle lab tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json  # far-side evidence (dense)
python3 tools/run-mgba-probe.py /tmp/far-side-trainer.json -- tools/probe/dump-guide-dismiss-far-side-trainer.py /tmp/far-side-trainer.json  # gTrainerBattleOpponent_A = 9
npm run compare -- win-go-on-swap-offer-no-guide-dismiss-off --summary  # 232/232 (new)
npm run compare -- win-go-on-swap-offer-no-off --summary               # 213/213 (regression)
npm run compare -- win-terminal-window-off --summary                   # 3590/3590 (regression)
npm run compare -- loss-terminal-window-off --summary                  # 1943/1943 (regression)
npm run compare -- loss-terminal-decline-continuation-off --summary    # 155/155 (regression)
npm run compare -- battle-command-generated-off --summary              # 128/128 (regression)
```

## 7. Checks

`npm run test:smoke` green, full `npm test` and `npm run build` green at the
final commit (see the committing PROGRESS entry). The unexercised WIN
boundaries past this held battle-room quote are the quote's own dismissal and
battle 2 setup (the canonical Battle-2 march is out of scope by reset) and the
RECORD/REST/RETIRE continuation choices; LOSS's record playback + free-roam
movement remain separate. PAPERCUT: none new.
