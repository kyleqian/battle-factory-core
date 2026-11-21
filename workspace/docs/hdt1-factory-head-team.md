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
