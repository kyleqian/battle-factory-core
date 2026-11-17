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

CENSUS_PLACEHOLDER
