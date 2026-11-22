# hdt1: the Factory Head's team on the frame catcher (2026-11-21)

**The catcher was wrong; the engine was right. No gameplay change:** the Head brings the same team for the same RNG as before. Only
`tools/frame-catcher/` changed. Evidence (not in git): `.integration/evidence/fix-head-team/` (`catcher*/<run>/` with the reruns,
`rom/head-build-20.json` the Random() logs, `analysis/headBuild.py` the reading below, `traces/`, `games/` the sct1 and fcr2 builds).

## The question

`fcm1-catcher-sweep.md` "Open" 1: on the ROM the Factory Head's party is built at battle start by `FillFactoryBrainParty`
(`battle_factory.c:759-826`). The catcher traps its entry, writes the engine's RNG cursor and undoes the overworld VBlank's `Random()`
while the build runs (`romRun.py` `brain_traps`, fcr2). His first two Pokemon always came out the engine's; the third did not in 3 of 5
Head battles: fcm1 `s222-on-wc` (ROM species 24 ARBOK, ours 206 DUNSPARCE), fcm1 `s94-off-wc` (387 ILLUMISE / 153 BAYLEEF), sct1's seed 9
Scene ON (312 MASQUERAIN / 287 MIGHTYENA). Either the engine's port (`src/engine/factoryBrainOpponentGeneration.ts`, its six excluded
`rentalMons`, the species / item checks, the personality loop) or the catcher's staging was wrong.

## The ROM evidence

`brain_traps` now logs every `Random()` from `FillFactoryBrainParty`'s entry to its return, with its caller and `gRngValue` before the
call, and reads `frontier.rentalMons` at the entry. The three failing Head battles were rerun with the undo held to the return (fcm1's
two on this build; sct1's seed 9 trace on the sct1 build it was made on, `87fda73e4`, because on this build seed 9 loses in round 1
since fop1), and two that matched before as controls: fcm1 `s94-on-wc` and fcr2's seed 2 Scene OFF (on its build `9a28a00fb`):

| run | entry -> return (ROM frames) | build draws | VBlank draws undone | build draws = the engine's stream, back to back | rentalMons = the engine's six | Head's three, ROM / ours |
|---|---|---|---|---|---|---|
| s222-on-wc | 274,565 -> 274,596 (31) | 161 | 31 | yes | yes (354 325 303 270 329 362) | 345 302 206 / same |
| s94-off-wc | 254,995 -> 255,026 (31) | 83 | 31 | yes | yes (371 354 291 364 369 351) | 284 322 153 / same |
| s9-on-ws21-head-v2 (sct1 build) | 291,752 -> 291,784 (32) | 43 | 32 | yes | yes (298 357 365 332 298 327) | 42 49 287 / same |
| s94-on-wc (control) | 397,383 -> 397,411 (28) | 48 | 28 | yes | yes (331 316 301 296 275 288) | 396 363 148 / same |
| s2-off-ws21-head (fcr2 build, control) | 261,076 -> 261,104 (28) | 108 | 28 | yes | yes (348 365 346 307 353 335) | 153 237 206 / same |

- The build's own draws (`GetFactoryMonId`'s set draws, labelled `FillFactoryBrainParty` in the log because the linker map does not name
  that static function, and `CreateMonWithEVSpreadNatureOTID`'s personality pairs) are exactly the engine's draws: the same count as the
  engine's draw ledger (161, 83, 43, 48, 108), each reading the value the previous one left, from the engine's cursor. Run through
  `FillFactoryBrainParty`'s loop (`analysis/headBuild.py`), they give the engine's three sets and personalities. So the port's rule
  (exclusions, species and item checks, the nature loop, no IV draws at fixed IV 15) is the ROM's; seed 2's build refuses set 306
  (DRAGONAIR, CHESTO BERRY, the item of the first Pokemon, set 285) on both sides, and seed 9's six hold set 298 twice.
- The build's timing: each Pokemon's set draw and all its personality pairs fall in one frame; building that Pokemon then takes 9 to 12
  frames before the next set draw. The third set draw came at frame +19 (s2), +20 (s94-on), +21 (s9) or +23 (s222, s94-off) after the
  entry, and the function returned 8 to 11 frames after it (28 to 32 frames after the entry).

## The cause

The old trap undid the VBlank's draw only for the 20 frames after the entry: it recorded the party and stopped (`brain["built"]`) when
all three species were set or 21 frames after the entry, whichever came first. The build is longer. When the third Pokemon's set draw
came after frame +20, the VBlank draws from frame +21 on were the ROM's own, and that draw read the engine's stream that many values
later. Reproduced exactly from the new logs (`analysis/headBuild.py NEW OLD`; the ROM cursor at the entry is the same in both runs):

| run | third set draw | VBlank draws not undone before it | it read stream value | set | its nature loop on that stream | old ROM's third |
|---|---|---|---|---|---|---|
| s222-on-wc | +23 | 3 | 159, not 156 | 322 ARBOK | personality 1802228378 | ARBOK, 1802228378 |
| s94-off-wc | +23 | 3 | 79, not 76 | 278 ILLUMISE | 3143608099 | ILLUMISE, 3143608099 |
| s9-on-ws21-head-v2 | +21 | 1 | 31, not 30 | 303 MASQUERAIN | 1236113442 | MASQUERAIN, 1236113442 |

The matched ones fit too: the third set draw of fcr2 seed 2 is at +19 and of s94-on-wc at +20, inside the window (s94-on-wc's third was
half built at +21, `[396, 363, None]`); fcm1 s14-on-ws, s118-off-wc and s186-on-ws (not rerun) had all three species set by frame +21
(16, 18 and 20 VBlank draws undone), so their draws were inside it too. On real hardware the VBlank draws do land between the build's
draws; the engine draws them back to back (#55, distribution parity, parked 2026-08-13). That is unchanged.

## The change

`tools/frame-catcher/romRun.py` `brain_traps`:

- at the entry, the return address is read from LR; a trap there marks the build's end. The VBlank undo, the Random() log and the
  party record wait for it (`plan.brain_build_state`: `building` until the return, a 300-frame guard);
- every `Random()` of the build is logged (`rom/head-build-<g>.json`: frame, caller, `gRngValue` before; caller `vblank` for
  `VBlankIntr`'s, which is undone);
- the "Factory Head party" record adds `returnedAt`, `romRngAtReturn`, `buildDraws`, `vblankDraws`, `callers`, `chainIsEngines` and
  `firstBreak` (`plan.brain_build_draws`: the build's own draws against the engine's stream), `romRentalIds`, `engineRentalIds` and
  `rentalsSame` (`plan.brain_engine_rentals`: the player's three at the Head battle and the beaten trainer's three);
- the battle-start transition trap is armed in every frame of the build: the frame's fast run, without the undo, can end the build at
  another point than the stepped run, and the transition draw follows the return in the same frame.

`README.md` says so. No `src/` change, so no Tier-1 test and no re-pins.

## Tests

- `python3 -m unittest tools/test_frame_catcher.py`: 35 tests pass (3 new: the build is `building` past the old frame +21 until its
  return; the build-draw check against the engine's stream, with a VBlank draw not undone found at its index; the engine's six).
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b`: clean. `npm run test:gate`: 360 files / 2,832 tests passed.

## Catcher before / after

| run | before (menus, stop; compare) | after |
|---|---|---|
| s222-on-wc | 894/895, stuck-at-unplanned-menu; 416 content / 473 timing stretches, 44 sound differences | 895/895, engine-trace-end; 397 / 495, 1 sound difference |
| s94-off-wc | 949/988, stuck-at-unplanned-menu; 360 / 586, 33 sound | 988/988, engine-trace-end; 353 / 632, 1 sound |
| s9-on-ws21-head-v2 (sct1 build) | 1002/1007, stuck-at-unplanned-menu; 430 / 569, 22 sound | 1007/1007, engine-trace-end; 429 / 575, 1 sound |
| s94-on-wc (control) | 1442/1442, engine-trace-end; 540 / 899, 1 sound | the same |
| s2-off-ws21-head (fcr2 build, control) | 1141/1141, engine-trace-end; 469 / 668, 7 sound | the same |

In each rerun every menu is followed to the end of the trace: through the Head battle and into the Lobby after it (s94-on-wc's trace
stops inside the Head battle at its 400,000-frame cap); no "opponent party is not the engine's" entry. Of the sound differences that went
away, all but one per run were in the Head battle (other Pokemon, other moves); the one left in each is the same as before (s222: finding
5's WILL-O-WISP in battle 18). fcm1's three traces remade on this build with their `maker` arguments are the same presses (the reruns
used the remade copies); seed 9 and seed 2 were remade on their own builds, the same presses as sct1's and fcr2's.

## Left open

- The content stretches left in the Head battles were not traced. The one looked at (seed 9, SUDOWOODO's SELFDESTRUCT against the Head's
  GOLBAT, both faint) shows the same pictures and messages on both sides, a few dozen frames apart.
- The log's caller names come from the linker map, which has no static functions (`GetFactoryMonId` shows as `FillFactoryBrainParty`).

## hdt2m: is the Head's team in ordinary play the ROM's? (post-freeze measurement, tools / docs only; 2026-11-22)

Two readings disagreed: nrv1 (20 Noland-room ROM recordings: the engine's lead differs in 40 / 40 runs, the ROM takes 269-679 extra LCG steps in the
build) against the catcher (the Head's team came out the engine's on real rounds). **Both are right; they measure different things.** Short answer: **(a)
for the team rule, with one stated limit** - the engine's `FillFactoryBrainParty` port is the ROM's (the same function of the same RNG stream), so there is
no missing-draw bug in the rule path (`battle_factory.c:759-826`); but in ordinary play the engine does not feed it the ROM's RNG, so for the same inputs the
engine's Head team is not the ROM's, by design (#55 distribution parity; `docs/parity-mac/noland-room-scenes.md` non-goal). That is a different seed, not a wrong team.

### What each harness feeds ROM and engine

| | ROM | engine's Head party | consequence |
|---|---|---|---|
| nrv1 recordings (`tools/audio/romFrontierTransition.py`, `nolandSceneEngine.ts` `nolandAskReadyStage`) | `lab.prepare` writes `gRngValue = seed`, runs the draft and the walk-up (hundreds of VBlank draws), and records from the open GO ON menu (`rngStart` = the cursor there); the lab's own rentals (`rental_plan.candidates`), nobody patches the ROM party; at battle start the ROM's `FillFactoryBrainParty` reads its live per-VBlank `gRngValue` | staged at the same menu, but the round controller starts at `rngValue: rom.rngStart` and plays six synthetic wins; the Head's team is drawn from that gameplay stream (`scheduledBrainOpponent`, `factoryRoundBattleOrchestrator.ts:860-882`), never from the room's cursor | the two streams are unrelated values: lead differs in 40 / 40 (a harness comparison of unrelated seeds, not a rule difference) |
| catcher (`tools/frame-catcher/romRun.py` `brain_traps`) | the engine drives the whole round; at `FillFactoryBrainParty`'s entry the trap writes the engine's cursor into `gRngValue` and (since hdt1) undoes the VBlank draws to the function's return | the same stream | the ROM runs its own build on the engine's stream: teams match (hdt1: 5 of 5 Head battles after the undo) |

So the catcher proves the *rule*; the recordings show that the *RNG input* differs. Neither shows that the recordings' start state is "wrong": they start
at the ROM's own GO ON menu, which the engine reproduces except for the gameplay RNG lineage.

### Decisive check: the engine's generator on the ROM's own cursor

`tools/integration/hdt2mRomCursorHeadTeam.ts ROM.json...` (run from `workspace/`; the 20 nrv1 recordings in `.integration/evidence/nrv1/`) feeds
`generateFactoryBrainOpponent` (`src/engine/factoryBrainOpponentGeneration.ts`, the six rental set ids 267-272, gold 564-566 + 270-272, as the lab and
the stage use) the ROM's recorded `gRngValue` at the frame the build starts (silver frame 1018, gold 657: the first non-one-step-per-frame frame after the room's last
input, entry cursor = the previous frame's value stepped once) and compares with the ROM's `enemyParty`:

- **Lead species: 20 / 20 equal** (12 silver Scene OFF, 3 gold, 5 Scene ON; at the build frame with the entry one step on, in every one of them; the other
  off-LCG frames give only scattered chance hits). The ROM's first Pokemon is exactly what the engine's rule draws from the ROM's cursor.
- Second and third Pokemon: with the draws back to back (what the engine does) they differ, as expected: the ROM takes one VBlank `Random()` per frame
  between one Pokemon's build and the next set draw (hdt1: 9-12 frames each). Inserting m VBlank steps after the first Pokemon and m' after the second
  and re-drawing, the ROM's second and third species are reproduced in 17 of 20 recordings (some with more than one solution), the unique solutions at
  m 8-12 and m' 7-13, which is hdt1's measured 9-12 build frames; 3 recordings (s18 Scene OFF and ON, s10) have none in 0-24: my skip model ignores the duplicate /
  item exclusion against the earlier pick; not chased).
- That is the whole of nrv1's "269-679 extra LCG steps": ~10 VBlank draws between builds, the transition draw (`battle_tower.c:2099`), and the room's frames
  before the entry - none of them a rule the engine misses, all of them the ROM's frame-timing RNG.

### Verdict

(a) **The engine's Head team is the ROM's rule on a different RNG stream.** The party build (set range, the six excluded `rentalMons`, species and item
checks, the nature loop, no IV draws at fixed IV 15) is the ROM's, shown twice: hdt1 (ROM build draws = the engine's, same cursor) and here (the engine's rule on the ROM's own
cursor gives the ROM's lead 20 / 20). In ordinary play the ROM's input to the build is the room's per-frame cursor, which depends on the exact frame count of the
player's inputs and the VBlank draws interleaved with the build; the engine's input is its round stream. The same player inputs therefore give a different Head team
on the two, with the same distribution. nrv1's 40 / 40 mismatch is that, not a missing draw. If a future step wants identical teams for identical inputs, the room's cursor
would have to become the Head's RNG: model the room's one-step-per-frame cursor into the party build and the per-VBlank draw between each Pokemon's build (about 9-12 each)
- the #55 item, not a fix of the build.

Not verified here: the exact entry cursor is the previous recorded frame stepped once (a frame-granularity recording; the match of 20 / 20 leads is the evidence); the
two exclusion cases above; no catcher round was rerun (the ROM party RAM was not read at battle start; hdt1's tables carry that).
