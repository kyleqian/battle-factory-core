# sub157 — Scene OFF plays the Substitute / Transform attack animations (ISSUES #153)

Main/ts lane, 2026-10-13. Presentation only: no rules, RNG or outcome change (census `battleDigestExcludingFrames` identical).

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| R1 kernel: `Cmd_attackanimation` exempts MOVE_TRANSFORM / MOVE_SUBSTITUTE from HITMARKER_NO_ANIMATIONS (`battle_script_commands.c:1748`) | **FIXED** (`ca4ea3618`). Scene OFF now emits MOVE_ANIMATION (the controller body) for both moves, not the BattleScript_Pausex20 call | `src/engine/battleScriptHitChainOpcode.ts` |
| R1 command streams, seeds 0..399 (`off108Route.ts --moves=164,144`) | All 30 OFF uses now carry **the same commands as Scene ON**: 16 Substitute bodies (40-frame pause → 32 + live request), 13 "already has a substitute" uses (unchanged), 1 Transform (39 → 32 + request). The ON routes are byte-identical | `.integration/validation/sub157/{base,r1}/` |
| R2 Scene OFF x2 rest | **FIXED** (`eec0aca08`). `BattleAnimateFrontSprite` (`pokemon.c:6805`) skips the front animation in Scene OFF, so no battler has a species idle rest. OFF bodies and the OFF fade now read both sides at x2 {0,0} (`LIVE_BATTLER_X2_SCENE_OFF_INPUT`). Other OFF commands still get no x2 input | `src/engine/factoryRoundBattleOrchestrator.ts` `withSceneOffBattlerX2Input` |
| R2 dense Scene OFF ROM windows for the Substitute body (direct mGBA, prep37Probe ×2 fresh, r1 == r2; production `renderBattleResolutionLiveView` via `liveAdapterFramebuffer.ts`, two more fresh runs) | **5 / 5 windows, 87 / 87 rows, 0 px** in both runs: PERSIAN↔SLOWBRO on both sides, GOLEM↔ONIX on both sides, plus prep37's OFF player window. Before the x2 fix, GOLEM → ONIX (player) was **94,917 px** (1,091 px/row × 87, ONIX's +1 rest) | `tools/integration/fixtures/sub157/receipt.json` |
| R2 turn timing through the production route (`sub157Timing.ts`) | The body command is **90 frames in both scenes**, matching the ROM's 90-row waitanimation. The HP command starts at G+91; the ROM's HP run starts at G+97 (first change G+98). That is **−6** (−7 in aud118's convention; it was −57). OFF == ON in production and in the ROM, so the −6 belongs to the **Scene ON route timing** (the ROM's 5 pre-attackanimation rows and its healthbarupdate row are not presented). Out of scope here | receipt `timing` |
| R2 Transform (DITTO, Factory set 54) | ROM: Move_TRANSFORM has **108 active rows from frame 67, OFF == ON** (direct mGBA ×2 fresh, r1 == r2). Production shows a **32-frame undrawn fallback in both scenes**, because no Transform live adapter exists. Remainder: −76 frames plus the mosaic / sprite-swap body. That is an animation-lane adapter, not a Scene OFF defect | receipt `transform` |
| R2 Substitute fade | The fade is already exempt in the kernel (`playanimation`). In Scene OFF, **6 census fades go from declined to live**, because the doll now shows after the body (before, they declined with "fade battler not shown as the doll"). No dense OFF fade window was run: the renderer is the same one Scene ON uses, and prep37 measured the OFF and ON fade digests identical | census below |
| R2 doll ↔ mon swaps (switch-out SUBSTITUTE_TO_MON, Baton Pass MON_TO_SUBSTITUTE) | **Not measured.** In source they are scene-independent controller special animations (`InitAndLaunchSpecialAnimation`, not gated by HITMARKER_NO_ANIMATIONS). Production presents neither one in either scene (the doll flag flips at the command boundary), so this is a shared remainder, not OFF-specific | — |
| R3 census 0..999, Scene ON (`sub157Census.sh … on`, base `bbd9c6748`) | **10 / 10 shards byte-identical** | `.integration/validation/sub157/census-{base,head}-on/` |
| R3 census 0..999, Scene OFF | **27 battles changed, all attributed**: 47 Substitute bodies fallback → live (+50 frames each), 1 Transform 39 → 32 frames, 6 fades fallback → live (same frames), and battle 881's frame-budget-stalled tail is one command shorter. `battleDigestExcludingFrames` identical. Played / terminal / stalled 1000 / 997 / 3 and player turns 20,486 unchanged. Live 29 → 82 | `census-off-attribution.txt` |
| Differential (`fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base bbd9c6748`) | **641 / 641 captures byte-identical** | `differential.log` |

## Mechanism

- **Kernel** (`createAttackanimationOpcodeHandler`): the no-animation branch now requires
  `move !== 144 && move !== 164`. The old comment claimed both moves never reach the handler. That was wrong:
  `BattleScript_EffectTransform:952` and `BattleScript_SubstituteAnim:1096` both run `attackanimation`.
- **Presentation**: unchanged. A MOVE_ANIMATION receipt already becomes a `move-animation` command with the request. The render
  path (`renderBattleResolutionLiveView`) is shared by both scenes. `applySubstituteDollCommand` already shows the doll after a
  completed 164 body.
- **x2**: Scene OFF has no x2 history host. Without an input, the live body drew an idle-rest species (ONIX, RATTATA) at its Scene ON
  rest. The OFF input zeroes both sides, but only on body / fade commands.
- **Verifier**: `liveAdapterFramebuffer.ts` gives a `battle-scene-off` scenario the same OFF input as production.

## Reproduce

```sh
sh .integration/validation/sub157/routes.sh <fresh>                                    # off108Route 164 / 144, seeds 0..399, both scenes
OUT=<fresh> sh tools/integration/prep37Probes.sh sub157-off-opponent-persian-slowbro sub157-off-player-golem-opponent-onix \
  sub157-off-opponent-golem-player-onix prep37-off-player-persian-slowbro                 # direct mGBA x2
python3 tools/integration/sub157Fixtures.py <probe dir>
POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/liveFixtureDriver.ts <summary.json> \
  tools/integration/fixtures/sub157/sub157-off-*.json
node --experimental-strip-types --no-warnings tools/integration/sub157Timing.ts --seeds=17,74,197 --scene=off
sh tools/integration/sub157Census.sh <fresh> <rev> on|off; sh tools/integration/ret88Census.sh compare <base> <head> <out>
```

Tests: `tests/sub157SceneOffSubstitute.test.ts` (5 tests). It checks the OFF == ON command streams for Substitute on both sides
and for Transform, the OFF pause control for every other move, and the OFF x2 input.
