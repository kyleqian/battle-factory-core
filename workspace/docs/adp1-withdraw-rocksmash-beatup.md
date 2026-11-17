# adp1 -- live Scene ON adapters: Withdraw (110), Rock Smash (249), Beat Up (251)

Scene ON only (`battle-scene-on`, oracle :8012). Each move was a 32-frame static placeholder; it is now a ROM-accepted `APPROX_SCRIPT` body (`src/animation/approxScript.ts`,
`ADP1_MOVE_BODY`) that `liveMoveAnimationDuration` times and `liveMoveApproximateScriptReason` no longer declines. Scope: animation modules, the adapter registration
cases and tests; shared body timing (hpd4), gameplay, RNG and playback are untouched.

## 1. Result

| Move | Body rows (ROM = ours) | Windows | Residual |
| --- | --- | --- | --- |
| Withdraw | 76 | player, opponent | 0 px, every row |
| Rock Smash | 78 (last body row 76) | player, opponent | 0 px, every row |
| Beat Up | 40 per hit (Left on even turns, Right on odd) | player + opponent, hit 0 (Left) and hit 1 (Right) | 0 px, every row |

Every window is a dense ROM window at the lab's pre-segment offset (`tools/integration/adp1Probes.sh`, scenarios `tools/battle-lab/adp1-*.json`, mechanicLab
`overrides.parties`; Beat Up has three party members). Fixtures `tools/integration/fixtures/adp1/*.json` (schema `s10a-live-adapter-fixture/v1`), ROM row digests in
`fixtures/adp1/rom-rows.json`; Tier-1 tests `tests/adp1Withdraw.test.ts`, `tests/adp1RockSmash.test.ts`, `tests/adp1BeatUp.test.ts` (sha256 of every ROM row, duration,
`liveMoveApproximateScriptReason === null`). Per-row residual tool: `tools/integration/adp1Cmp.ts`.

## 2. What the bodies are

- **Withdraw** (`Move_WITHDRAW`): the attacker's rotation task (22 steps out, a 30-step hold, 22 steps back, 1 + 74 callbacks) with the matching y2 offset, lead `WITHDRAW_LEAD = 2` rows.
- **Rock Smash** (`Move_ROCK_SMASH`): `AnimTask_ShakeMon` on the target (creation frame 16, second shake 27), `AnimBasicFistOrFoot` (visible 17..25), the alpha-blended basic hit
  splat (17..26) and eight `AnimRockFragment` rocks from age 27 (`step = trunc((d << 8) / dur)`, `offset = (k * step) >> 8`, x mirrored by the attacker side; lifetime
  duration + 1; z by screen y, equal-y ties in the measured order `ROCK_TIE_RANK`).
- **Beat Up** (`choosetwoturnanim BeatUpLeft, BeatUpRight`): two hits 10 rows apart per body (first at age 10), each a fist (`AnimBasicFistOrFoot`, 9 rows) under an
  alpha-blended splat (`gAffineAnims_HitSplat` scale index 2, 10 rows), `AnimTask_ShakeMon` x3 / 6 times; the four offset tables `BEAT_UP_LEFT_HITS` /
  `BEAT_UP_RIGHT_HITS` are the script's own arguments. The scenario has 4 uses x 3 hits = 12 bodies per side; the controller prints "<party member>'s attack!" per hit.

Facts that cost the time and are now modelled (all measured on the ROM windows, no residual masks):

1. The alpha-blended hit splat (`setalpha 12, 8`) blends with the backdrop, not with the sprites drawn before it: it hides the fist (Rock Smash) and the battlers under
   it. The engine blends the splat over a snapshot of the pre-sprite backdrop (`ApproxScriptSprite.blendOver: "backdrop"`, `battleScene.ts`). Rock Smash draws the splat
   over the fist, Beat Up under it (matrix scale index 2, fist in front).
2. `AnimTask_ShakeMon` writes x2 / y2 absolutely and ends at 0, so the opponent front sprite's settled idle x2 (Onix +1) stops applying once a shake has started
   (`ApproxScriptFrame.targetRestReset`). The persisted x2 history for later bodies (`liveBattlerX2History.ts`) takes the zeroed-target fallback for damaging moves outside the
   measured table; 249 and 251 are not in it. A Beat Up hit k > 0 needs the earlier hits as `precedingX2Events` (send-ins plus `move-body` 251 per earlier hit).
3. A hit's text box ("Primeape's attack!") is part of the window; fixtures carry `messageLines`.
4. SortSprites: equal subpriority puts the sprite lower on screen in front; ties keep the previous order.

## 3. Sounds (aud242 emitter)

No new emitter code: with a non-null `liveMoveAnimationDuration` the three moves reach the normal move-SE emitter (`emitMoveAnimSounds`, `liveMoveSourceAge` non-null), which reads
the table rows already in `anim-sound-timing.json`. ROM windows (probe step mode, Scene ON, player attacker, lab `tools/battle-lab/adp1s-*-player-on.json`, fixtures
`tools/audio/fixtures/adp1s-*-player.json`, stages in `tools/compare/appTrace.ts`, pins in `tests/adp1Sounds.test.ts`, registered in `tests/audioProbeFixtures.test.ts`):

| Window | ROM rows (frame relative to the first) | ROM minus ours |
| --- | --- | --- |
| Withdraw | 162 +0 | -4 |
| Rock Smash | 123 +0, 131 +11 | +2 on both rows |
| Beat Up (3 hits) | 123 +0 / +10, +193 / +203, +386 / +396 | 28 / 28, 89 / 89, 150 / 150 |

Withdraw's -4 and Rock Smash's +2 are constants over the window (the SE gaps are exact): the idle-lead / action-transition class (#198), like Torment's -4.

Beat Up: the two SEs of a hit are exact (10 apart) and the ids / pans match, but the engine's multi-hit loop presents each hit 61 rows faster than the ROM
(`BattleScript_BeatUpLoop`: `printstring`, the animation, `critmessage` + `waitmessage B_WAIT_TIME_LONG`, `resultmessage` + `waitmessage B_WAIT_TIME_LONG`; ROM hit-to-hit 193, ours
132) and starts the first hit 28 rows early. That is controller / message presentation, outside adp1; it is pinned in `adp1Sounds.test.ts` so a fix moves the pin. Beat Up
is DEAD in Factory Level 50 singles (`docs/issue72-reachability-triage.md`: 0/882 carriers); it is reachable only through a lab.

## 4. Census and gates

Base `e0658f6f8` (aud263 merge), final = the adp1 sound commit `07905b153` (the later commits only touch a tool import and this doc). `LSD194_CENSUS_JOBS=5`, `LSD194_SPLIT=4` (the machine is shared; five jobs instead of three only changes the wall time).

- **T1 census 0..99 Scene ON** (`soundCensusDelta.py --t1`, each arm in its own tree): exact 26,180 -> **26,181**, missing-declined 1 -> **0**, every other class unchanged (0).
- **T1 census 0..999 Scene ON**: missing-declined **5 -> 0** (Rock Smash 2, Beat Up 2, Withdraw 1, the aud251 count), extra 0, missing-gated / -other / -cry-task 0, unclassified 0, exact 269,806. The 0..999 base arm was not re-run; its 5 is the aud251 table.
- **Census 0..99, both scenes** (`rst197CensusDelta.py`, base vs final): `eventsDigest` identical, bad 0, 100 / 100 battles each. Scene OFF: 100 / 100 battles and 30,710 commands identical. Scene ON: 99 / 100
  battles identical; **the one command whose length moves is Withdraw (move 110), seed 51 (Foe CLEFABLE): 32 -> 79 rows** (`static:other:no-adapter-unscripted` -> `live`). Rock Smash and Beat Up do not occur in seeds 0..99 (the 0..99 T1 had one declined row, Withdraw).
- **Vanilla soak** 0:20 Scene ON `--parallel 3`: 20 / 20 OK (CRASH 0, HANG 0, budget 20).
- **Winning soak** 0:60 `--parallel 3`: 60 / 60 OK (CRASH 0, HANG 0, budget 60), deepest battle depth 32.
- `npm run typecheck` exit 0; `npm run test:gate` green (362 files, 2,843 tests); the 274 test files importing `approxScript` / `liveMoveAnimation` / `battleScene` / `appTrace` green (the one failure, `iss215`, was `adp1Cmp.ts` not importing `monPicPixelsInstall.ts`; fixed); `animationBoundaryRatchet` green; `npm run build` and `npm run build:lib` exit 0.
- `tests/randomRoundSoak.test.ts` and `tests/lbrd.test.ts` pass unchanged: no re-pin.
- `npm run animation:coverage`: regenerated, `ANIMATION_COVERAGE.json` has no diff. That file lists the moves proven by the source-audited "exact" evidence pipeline; the live adapters are not entries of it, so it does not move.

## 5. Remaining

- Beat Up's controller timing (hit 0 starts 28 rows early, each later hit 61 rows short, section 3): the multi-hit loop presentation, not the body or the SE rows. Dead in the Factory.
- Withdraw -4 / Rock Smash +2 SE offsets: constant per window, the #198 lead class.
- Not measured: Beat Up's opponent-side sound window (only the player attacker has a ROM SE window; the opponent body is pixel-exact).
