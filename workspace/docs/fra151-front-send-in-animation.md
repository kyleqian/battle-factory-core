# fra151 — Scene ON opponent send-in draws the species front animation (S10A, ISSUES #146 / #71 remainder)

Presentation only: no rules / RNG / damage / turn-order / timing / facility change (census 0..999 battle, frame and command digests
identical; 3,554 switch-in commands unchanged). Scene OFF is unchanged: OFF takes SKIP_FRONT_ANIM (`pokemon.c:6803`, ISSUES #71
Slice-D) and production passes no species to the OFF send-in. Base `84335c25a`. Code commits `e88816487` (R1), `0080847ba` (R1/R2
refinements), tests `c80c58ad5` / `d17b7a34e` (ratchet), tooling + receipts `63548a073`.

## Results first

| rung | result |
| --- | --- |
| R1 wiring | `midBattleSwitchInAt(…, frontAnimSpecies)` (`battleResolutionPresentationRender.ts`) carries `frontAnim` = { `sAnim_<Name>_1` frame, `Anim_*` x2 / y2, double-size OAM matrix, flicker visibility, glow palette } for the **Scene ON opponent** send-in (gate = the species-keyed tail snd145 sets: `healthboxSlideElapsed` present, battler 1). Frame program tick 0 renders at send-in **el 34**, the motion reducer's tick 0 at **el 35** (+ `delay − 1` for delayed species, + 1 for the install-only initializers); `drawMidBattleSwitchInSprite` (`battleScene.ts`) draws it under the release tint. After the motion, the sprite rests at the reducer terminal (ONIX / RATTATA +1). |
| R1 windows | snd145's 12 Scene ON dense windows (TAILLOW, SPHEAL, ONIX, SALAMENCE, TYPHLOSION, CASTFORM × faint replacement / Roar), real production render path (`fra151Compare.ts` = `snd145Compare.ts` + the production post-send-in x2 history): **opponent-sprite residual 0 px on every row of all 12** (was 16,339 .. 231,734 px per window). Table below. |
| R2 breadth | **57 sibling Roar windows** (Scene ON, direct mGBA, twice fresh), 51 front animIds incl. affine rotation (SPIN, TWIST, SWING_*, BOUNCE_ROTATE_*, ROTATE_UP_*, H_PIVOT, TIP_MOVE_FORWARD, FRONT_FLIP), affine scale / stretch (V_STRETCH, V_SQUISH_*, SHRINK_GROW, GROW_*, LUNGE_GROW, CIRCLE_INTO_BG, H_JUMPS_V_STRETCH*, CIRCULAR_STRETCH_TWICE), palette (GLOW_BLACK / BLUE / ORANGE, FLASH_YELLOW), FLICKER_INCREASING, and 13 delayed species (delay 10..70): **56 / 57 windows 0 px on every compared row** (all regions); PONYTA 1 row (below). With R1: 56 of the 62 Factory front animIds, 364 / 376 Factory species by animId. |
| R2 extra (r1 only, not in the runner) | The 6 animIds without a runner window, staged once (genderless species with `gender: genderless`): QUAGSIRE (H_STRETCH) and REGICE (FOUR_PETAL) **0 px**; LUNATONE (SWING_CONVEX_FAST), MAGNEMITE (TUMBLING_FRONT_FLIP_TWICE), STARYU (TWIST_TWICE) opp 0 px except STARYU rows 123..125 (2,319 px, past production's command end); SOLROCK (ROTATE_TO_SIDES_TWICE) 110 rows / 170,860 px (remainder 2). LUNATONE / MAGNEMITE / STARYU / SOLROCK also show 29 hb + msg rows: snd145's species tail is wrong for these genderless species (remainder 3). |
| R3 rest | The send-in's terminal state equals `speciesFrontIdleRestOffset` (what the live move renderers and rst139's ordinary rows read through `liveBattlerX2History`'s send-in → `idle`) **and** the ROM rest receipt `fixtures/x2-history/species-rest-x2.json` for all **376** Factory species (frame 0, no matrix, no blend) — `tests/fra151FrontSendIn.test.ts`. ONIX Roar window through el 230: 0 px opponent sprite incl. the +1 rest rows after the send-in. Live bodies after an ONIX send-in: ROM x2 +1 at activation = tracker prediction (existing receipt `fixtures/x2-history/faint-sendin-receipt.json`); the move-body renderers are untouched by fra151 (census move records identical). No new pixel window of a live body after a send-in was staged (time). |
| R3 census | `sar131Census.sh` seeds 0..999 Scene ON, base `84335c25a` vs `0080847ba`: **27,271 move records, 0 key / frame / live-frame / decline / status changes**, live 27,055 / 27,236, all 10 shards' `battleDigest`, `battleDigestExcludingFrames`, `battleFrames`, `commandDigest` identical; `snd145CensusDelta.py`: 22,583 segments, 0 changed, **3,554 switch-in commands, 0 changed** (`fixtures/fra151/census-*.json`). |
| R3 differential | `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 84335c25a`: **235 / 235, 216 / 216, 190 / 190 byte-identical** (PASS, 641). The seeded-on trace's one opponent send-in capture (3965, MURKROW el ~107) is past its animation; dense `--capture-range 3850:3970`: frames **3891..3940 differ** (418 .. 1,134 px) = MURKROW's V_SQUISH_AND_BOUNCE on the real production route (faint replacement from 3858). App-only route (the oracle cannot replay it); BRELOOM / DEWGONG windows (same / sibling animId) are its ROM proof. The canonical two did not move, so no `npm run compare` was needed. |

### R1 windows (opponent sprite region x >= 120, y < 64; rows = switch-in el 0 .. message + 2 / end of the faint hold)

| window | slide | opp px before (snd145) | opp px after | other rows (unchanged, snd145's named residuals) |
| --- | ---: | ---: | ---: | --- |
| Roar TAILLOW / SPHEAL / ONIX / SALAMENCE / TYPHLOSION / CASTFORM | 70 / 234 / 146 / 145 / 95 / 139 | 33,419 / 61,951 / 223,646 / 92,112 / 68,087 / 46,818 | **0 / 0 / 0 / 0 / 0 / 0** | none: every row of all 6 windows 0 px |
| faint TAILLOW / SPHEAL / ONIX / SALAMENCE / TYPHLOSION / CASTFORM | as Roar | 33,419 / 61,951 / 231,734 / 92,112 / 68,087 / 46,818 | **0 / 0 / 0 / 0 / 0 / 0** | e < 17 party-tray hide (15-16 rows, 367 px), the ROM blank row (TAILLOW / SPHEAL / ONIX), TYPHLOSION's slide-start lag frame (rows 96..118, D4) |

### What the ROM windows pinned (each source-derived, each confirmed on the named window)

1. **Anchors.** `StartSpriteAnim(sprite, 1)` frame on screen from el 34; `Anim_*` x2 / y2 for reducer tick N on el 35 + N (delayed:
   + delay − 1, `Task_AnimateAfterDelay`'s pre-decrement). CASTFORM's whole send-in is one frame late (snd145 `sendInVisualDelay`), the
   same elapsed shift applies.
2. **Release tint.** On this path the `Task_FadeMon_ToNormal` ramp is one frame earlier than production's calibrated opponent cadence
   (coefficient 15 at release-local 22, not 23; unique fit on TAILLOW / ONIX / SPHEAL). Applied only with the front animation (Scene
   ON). The Scene OFF control windows show the same 16 rows (snd145's OFF SPHEAL opp rows 41..56) — left to the OFF owner.
3. **Install-only initializers.** Source scan of the front `sMonAnimFunctions`: `Anim_BackAndLunge`, `Anim_FrontFlip`, `Anim_Figure8`,
   `Anim_RotateUpSlamDown` install their callback without calling it. The FRONT_FLIP reducer already models that tick; the other three
   move on tick 0, so they run one frame later (`FRONT_SEND_OUT_INITIALIZER_ONLY_TICKS`; RATICATE, GOLEM, CHARMELEON, GROWLITHE 0 px).
4. **Affine.** `HandleSetAffineData` with `sDontFlip` TRUE + BIOS `ObjAffineSet` (theta = (rotation >> 8) / 128 π, truncated, as
   `psychUp.ts`); a write-less tick keeps the last matrix (GOLEM); V_STRETCH is reduced with `dontFlip` TRUE (ARBOK). On the
   `HandleStartAffineAnim` tick the callback's matrix is overwritten by `sMonAffineAnims[0]`'s identity (`StartSpriteAffineAnim(sprite, 0)`
   arms `BeginAffineAnim`, which runs after the callback in `AnimateSprite`; KINGDRA, HERACROSS); for the install-only families that
   tick is the install frame.
5. **Palette.** A glow / flash `BlendPalette` (every frame from the callback's first tick) shows except while the release fade task
   ramps (Scene ON el 40..56), because tasks run after the sprite callbacks and rewrite the same palette from the unfaded buffer; the
   task does not write during its hold (GASTLY: plain palette = glow coefficient 0 at el 35..39 over the held tint). FLICKER_INCREASING's
   `invisible` frames hide the sprite (HAUNTER).

## Exact remainder

1. **PONYTA (GLOW_ORANGE) el 38: 616 px, rows y 42..63 only** — scanlines y < 42 show glow coefficient 1 (production), y >= 42 already
   the next frame's 2: the faded palette transfer landed partway through the frame (CPU-load / VBlank-phase class, D4). Not modelled.
2. **SOLROCK (ROTATE_TO_SIDES_TWICE, 1 Factory species)**: that reducer reports its rotation only inside `affineWrites[]`
   (`rotationU16`), which `frontSendOutAffineAtTick` does not read, so the motion draws without rotation (110 rows, 170,860 px; r1 only).
   Fix: fall back to the last `affineWrites` entry's `xScale` / `yScale` / `rotationU16` when the top-level fields are absent, then add
   SOLROCK (gender `genderless`) to the runner.
3. **Genderless species tail timing (snd145, not this step)**: LUNATONE / MAGNEMITE / STARYU / SOLROCK windows show production's
   healthbox slide / message earlier than the ROM (ROM next text el 165 / 203 / 192 vs production command end 147 / 123 / 147 for
   LUNATONE / STARYU / SOLROCK); snd145 predicted the 37 genderless species from source tables. Timing is out of this step's scope.
4. **Not covered by a twice-fresh window:** FOUR_PETAL, H_STRETCH, ROTATE_TO_SIDES_TWICE, SWING_CONVEX_FAST,
   TUMBLING_FRONT_FLIP_TWICE, TWIST_TWICE (12 Factory species; r1 results above); shiny send-ins; player-side back animations (next
   step); Scene OFF (skips the front animation; the tint-ramp row offset in item 2 above is an OFF-owner follow-up).
5. **Battle-start intro send-outs (next step):** the generated battle-start opponent release (`battleScene.ts` generated-opponent
   materialize, same release reducer and tint) does not call `midBattleSwitchInFrontAnimAt`. Wiring it needs the battle-start clock
   (the affineAnimEnded tick of `SpriteCB_OpponentMonFromBall`, `battle_main.c:2838`, measured in
   `tools/compare/fixtures/front-send-out-flight-*.json`: install on the handoff tick + 1-frame OAM latch) mapped to the same
   frame / motion anchors, the same palette / identity-start / install-only rules, and the `sendInVisualDelay`-style CASTFORM shift.
6. `snd145Run.sh`'s R4 `compare-summary.json` check now reports DIFF by design: its receipt pinned the pre-fra151 opp residual (the 12
   Scene ON windows' opp px fall to 0); its ROM digests and every other snd145 check are unaffected.

## Gates

Affected: `tests/fra151FrontSendIn.test.ts` 8 / 8 (anchors, delay, ONIX +1, affine identity / persistence / V_STRETCH sign,
install-only ticks, glow / flicker, the 376-species rest pin), `battleResolutionPresentation`, `midBattleSwitchBallFade`, `sendInTail`,
`forcedSwitchContinuation`, `kabutoSendOut` 89 / 89; `npm run typecheck` OK; `npm run test:smoke` 448 / 448. Full `npm test` on
`63548a073` (tree `dbd29961`, src `59146bc0`): 1,659 files / 13,789 tests passed, **1 failed** = `animationBoundaryRatchet` (the two
new `src/animation` imports of `battleResolutionPresentationRender.ts`); the ratchet admits that module with its justification in
`d17b7a34e` (3 / 3). Final full suite / build: see the worker report.

## Files

`src/engine/battleResolutionPresentationRender.ts` (`MidBattleSwitchInFrontAnim`, `midBattleSwitchInFrontAnimAt`, the Scene ON tint
hold, `midBattleSwitchInPalette`), `src/engine/battleScene.ts` (`drawMidBattleSwitchInSprite` front-anim branch, `bgr555ToRgb8`),
`src/animation/sendOutDispatcher.ts` (`frontSendOutAnimationDelay`, `frontSendOutInitializerTicks`, `frontSendOutAffineAtTick`,
`frontSendOutPaletteAtTick`), `tests/fra151FrontSendIn.test.ts`, `tests/animation/animationBoundaryRatchet.test.ts`. Tools:
`fra151Compare.ts`, `fra151Summary.py`, `fra151Run.sh`; receipts `tools/integration/fixtures/fra151/` (`rom-sha.json` 69 windows,
`compare-summary.{json,txt}`, `census-delta.json`, `census-commands.json`).

## Reproduce

```sh
sh tools/integration/fra151Run.sh <fresh-dir>            # R1 + R2 (69 windows x2 fresh) + R3 tests (~8-15 min, oracle load): ALL SAME
sh tools/integration/fra151Run.sh <fresh-dir> --census   # + census base 84335c25a vs HEAD (~8 min)
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 84335c25a
```
