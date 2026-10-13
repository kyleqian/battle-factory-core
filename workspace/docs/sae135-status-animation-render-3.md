# sae135 (S10A, ISSUES #168 slice SA5): drawing the Scene ON status animations SLP, BRN and INFATUATION

Base: `7511dc63d` (production src `58fa6ec74`; master with sar131 folded). Design / prep: `docs/sar131-status-animation-render.md` (the
`status-animation` render effect and its plumbing), `docs/stq132-status-condition-render-prep.md` (the 37 dense ROM windows, the unwired
reducer, the SA5 landing recipe), `docs/stp128-status-condition-render-prep.md` §2-3. **Pixels only**: no frame, timing, kernel, RNG,
damage, turn-order or facility change; liveMoveAnimation.ts bodies, the order host / allocator, the palette host and
liveBattlerX2History.ts are untouched; statusConditionAnimations.ts is untouched (both reducer tests pass unchanged).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The wiring | `statusAnimation.ts liveStatusAnimationRow`: three new `case`s (SLP, BRN, INFATUATION) -> `statusParticles` = stq132's `statusParticleDisplayRow(animation, rel = command age, statusConditionTarget(side, battler sprite x, y))`, back-to-front (SortSprites), battler `"rest"` (x2 keep), no blend. Sprites from the existing assets: letter Z `rest.json letterZ` (affine-normal, the reducer's matrix), burn flame `battle-anim-small-ember.json` 32x32 frame `tileOffset / 16`, heart `charm.json magentaHeart`. `battleScene.ts`: `statusAnimationRenderView` passes the battler sprite's gSprites x / y (`battleCommandFieldSpriteOrigin` + 32, elevation included); the draw site calls `drawLiveStatusAnimationSprite` (an affine sprite through `drawSpriteSheetAffineRotate(…, box centre, a, b, c, d, undefined, false)` — Move_REST's call **without** its player-side 16-px `screenCenterYOffset`; others `drawSpriteSheet` as before). `STATUS_ANIMATIONS_DRAWN` += SLP / BRN / INFATUATION (own lines). | `git diff 7511dc63d -- src/` (3 files) |
| **Command age vs reducer rel** | **rel = command age** (not age + 1): stq132's rel 0 is the first gAnimScriptActive row (`act` 1 on rel 0 in every window), which is sar131's command age 0 (ROM row X + 1). stq132 / stp128 §3.1's "age + 1" predates sar131's pin. Confirmed by the ROM: 37 / 37 windows 0 px on every command row at rel = age, **0 / 37 at age + 1**; the reducer's shadow hide (rel 1 .. E + 1) equals sar131's (age 1 .. end + the next command's first row) at this offset | receipt `productionCompare`, `controls.age+1` |
| **Production comparator** (sar131's, over stq132's 37 windows: `sae135ProductionCompare.ts`, `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`, full screen, rows activation − 1 .. release + 2) | **Every command row (a = −1 .. release) 0 px on 37 / 37 windows** (2,946 rows). Per animation x side (windows, rows): SLP player 8 / 800, SLP opponent 8 / 800 (incl. 4 elevated GOLBAT), BRN player 6 / 252, BRN opponent 7 / 294 (incl. 3 elevated GOLBAT + Fire Punch's 10 % secondary), INFATUATION player 4 / 400, INFATUATION opponent 4 / 400 (incl. 2 elevated GOLBAT). **All rows incl. release + 1 / + 2: 31 / 37**; the 6 others are the residual below | `tools/integration/fixtures/sae135/production-compare.json` |
| **Residual (named, not fitted)** | The 6 **Onix-opponent SLP (4) / INFATUATION (2)** windows: exactly **1,091 px on each of the two next-command rows** (a = 97, 98), nothing else. Mechanism: the next command is an ordinary message row, and production's ordinary rows never draw the opponent's idle rest (sar131 §6's pre-existing residual: ONIX +1), while SLP / INFATUATION keep the ROM's +1 (the window's own rows draw it: `statusAnimationRenderView` places the opponent at its tracked rest). Proof: `--diag=ordinary-rest` (those rows drawn with the opponent at its tracked rest) -> **37 / 37 windows 0 px on all rows**. BRN's Onix windows are clean because Will-O-Wisp's body left Onix at x2 0. Not in this slice's grant (the ordinary-row renderer) | receipt `nextCommandRowResidual`, `diagOrdinaryRest` |
| **Controls (must fail)** | `age+1`: **0 / 37** clean. `wrong-side` (the effect on the other battler): **0 / 37**. `drop-one` (the reducer's sprite index 1 missing): **0 / 37**. `rest-y` (Rest's player-side +16 on every letter Z): **23 / 37** clean = **all 8 player-side SLP windows fail** (the offset is 0 on the opponent side by construction; the 23 = the other 29 minus the 6 residual windows). The drop-one / rest-y harness redraws production's sprites under the healthbox / message-window footprint; unmodified it equals production on **2,946 / 2,946 rows** (`redraw`) | receipt `controls`, `redrawHarness` |
| **x2 (step 3)** | sar131's rows already make the three `keep` (`LIVE_BATTLER_X2_STATUS_ANIMATION`, unchanged). Direct mGBA (sar131's stat101Probe.py pipeline over 4 stq132 Onix scenarios, `next-body-index.json`; r1 == r2 4 / 4, sha256 committed; sar131Rom.py r1 == r2): the battler's gSprites x2 on the instruction row == after the window on **13 / 13** windows (SLP / INFATUATION Onix opponent +1 -> +1, i.e. not zeroed; BRN 0 -> 0; player 0 -> 0). **Next live body: 2 / 2** windows that have one (BRN on the Onix opponent, Will-O-Wisp inflict + end-turn tick; next body = Onix's Tackle): ROM x2 on the row before the body's rise == the tracker's prediction (0) and **0 px** in the battler's 64x64 rect vs production's ordinary field; the old "status animation -> unknown" rule predicts +1 (1,091 px). The sleep / love windows have no later body in their traces (the battler sleeps / is immobilized) | `tools/integration/fixtures/sae135/next-body-x2.json` |
| **App routes** (`sar131RouteRender.ts`, Scene ON, base `7511dc63d` vs final, `sae135RouteDelta.py`) | **6 / 6 OK**: seed 34 slot 0 (player GRIMER: 3 sleep turns), 296 (player TOGETIC: 7 SLP), 277 (opponent SEALEO: 8 SLP), 124 (**elevated YANMA** + PLUSLE burned: 6 BRN, + 2 PRZ), 126 (opponent MACHOKE: 6 BRN), 18 (player PUPITAR in love: 9 INFATUATION). Identical frame count and per-frame command key / type / age on every route; every differing frame lies inside a newly drawn command (276 / 644 / 736 / 212 / 204 / 736) or is the first frame after the elevated YANMA's BRN (shadow hold, 2); **0 unexplained**, 0 bodies with a changed x2 input. Per command differing ages: SLP / INFATUATION 92 (ages 5..96: sprites from rel 5), BRN 34 (5..38), elevated BRN 38 (+ the shadow hide from age 1); PSN / PRZ / CONFUSION commands 0. Route 126 stalls at the replay's 30,001-frame cap in **both** trees (pre-existing, identical) | `tools/integration/fixtures/sae135/routes-delta.json` |
| **Census 0..999** (sar131's tools, 10 shards per tree) | **Identical**: 27,403 move / fade records, **0 key, 0 frame, 0 status, 0 liveFrames, 0 decline changes**; battleDigestExcludingFrames / battleDigest / battleFrames / commandDigest identical on 10 / 10 shards; battle frames 15,915,831 == 15,915,831; 8,063 status-animation commands in both | `tools/integration/fixtures/sae135/census-delta.json` |
| sar131's PSN / PRZ | Unchanged: `tests/sar131StatusAnimationRender.test.ts` re-renders 6 PSN / PRZ windows every row == sar131's 0 px receipt sha256 — green | section 5 |

## 2. Production files (`git diff 7511dc63d -- src/`)

- `src/animation/statusAnimation.ts`: imports (charm.json, rest.json, battle-anim-small-ember.json, statusConditionAnimations.ts),
  `LiveStatusAnimationSprite` (+ optional `affine`), `LiveStatusAnimationName` += the three, `statusParticles` / `particleSprite` /
  `smallEmberFrame`, an optional 4th parameter `battler` (gSprites x / y) on `liveStatusAnimationRow`, three `case`s. PSN / PRZ untouched.
- `src/engine/battleScene.ts`: `statusAnimationRenderView` passes the battler sprite coordinates (one line + comment), the view's sprite
  type, `drawLiveStatusAnimationSprite` (new), the one draw line calls it.
- `src/engine/battleResolutionPresentationRender.ts`: `STATUS_ANIMATIONS_DRAWN` += SLP / BRN / INFATUATION, each on its own line.
- `src/animation/statusConditionAnimations.ts`: **not modified** (its header still says "unwired"; now imported by statusAnimation.ts).

## 3. Pins moved

- `tests/sar131StatusAnimationRender.test.ts`: (1) the drawn-set pin (`PSN || PRZ` -> + SLP / BRN / INFATUATION); (2) the "undrawn
  animation" view test used BRN (drawn now) -> an animation name without a case (`WRAPPED`), so it survives SA6..SA8 too.

## 4. Tier-1 test (`tests/sae135StatusAnimationRender.test.ts`, 12 tests)

Drawn set / keep / no blend; every row of the three x both sides (ages 0..98) == the reducer's display row; first-shown rows; the
receipt (every command row 0 px, the only px = 1,091 on the residual windows' next-command rows with ROM opponent x2 1; diag 37 / 37;
redraw exact; controls); **6 windows' every-row production frame sha256 == the comparator receipt** (SLP player GOLBAT, SLP elevated
GOLBAT, BRN player ONIX, BRN Fire Punch WAILMER, INFATUATION elevated GOLBAT, INFATUATION player ONIX) and their command rows draw; the
elevated shadow ages (all three); the x2 / routes / census receipts. **Revert experiment** (the three `case`s renamed): **9 / 12 fail**
(the 3 receipt-only tests pass); restored from git, byte-identical.

## 5. Gates (final code: production src `ebd71373e`)

- Targeted (4 workers): tests/sae135StatusAnimationRender, sar131StatusAnimationRender, sa125StatusAnimationCommand,
  stq132StatusConditionReducer, stp128StatusConditionReducer, animation/statusAnimation, animation/factoryAnimationInventory,
  animation/animationBoundaryRatchet, playableAnimationIntegration: **9 files / 135 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, four shards, 4 workers each: shard 1 **413 files / 2,978 tests**, shard 2 **411 / 4,170**, shard 3 **410 / 3,259**,
  shard 4 **413 / 3,254** passed (44 files / 223 tests skipped); total **1,647 files / 13,661 tests passed, 0 failed**.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 7511dc63d`:
  **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173): the canonical traces unchanged, no capture of the app-only trace moved
  (none falls on a drawn SLP / BRN / INFATUATION frame).
- `git diff --check 7511dc63d HEAD`: clean.
- Census and routes: section 1 (run on the final production src `ebd71373e`).
- `sh tools/integration/sae135Run.sh .integration/validation/run1/out --census` (archive copies of `7511dc63d` and HEAD `359d52b47`,
  production src `ebd71373e`; 7 m 45 s): **ALL SAME** — stq132 probes 26 / 26 sha256 (r1 == r2), rom-windows SAME, r2 == r1, comparator
  r1 == r2 == committed (31 / 37 all rows, 37 / 37 command rows), diag 37 / 37, redraw 2,946 / 2,946, controls 0 / 0 / 0 / 23 of 37,
  next-body probes 4 / 4 (sha256 SAME, rom SAME, r2 == r1, next-body-x2 SAME), routes 6 / 6 OK SAME, census delta SAME (0 changes),
  receipt SAME.

## 6. Open (not in scope)

- **An invisible battler sprite.** Route 18 has one INFATUATION command with 0 differing frames: the player PUPITAR's sprite is hidden
  (a `sprite-visibility` command before; a Fly / Dig turn cancelled by the love check — `CANCELLER_IN_LOVE` calls `CancelMultiTurnMoves`,
  which clears STATUS3_SEMI_INVULNERABLE, before `BattleScript_MoveUsedIsInLove`'s `status2animation`). sar131's guard draws nothing over
  an invisible sprite; the ROM's sprite-only script most likely still draws the hearts (BATTLER_COORD based). No ROM window yet: not
  fitted, not landed.
- **SE-gated receipts** (sag130 SA2: `minimumFrames = gate + STATUS_ANIMATION_ADDED_ROWS`; 72 gated census commands, 729 frames): the
  render effect's `age` is the command's `phaseElapsed`, which counts the gate rows, while the ROM's rel 0 is the first
  gAnimScriptActive row after the gate. On those commands the particles (and sar131's PSN / PRZ alike) start `gate` rows early. The fix
  is the effect's age minus the gate (`minimumFrames − STATUS_ANIMATION_ADDED_ROWS[animation]`) in battleResolutionPresentationRender.ts
  — outside this slice's grant (only the STATUS_ANIMATIONS_DRAWN lines) and shared with PSN / PRZ. None of the 37 windows / 6 routes is
  gated (their paths print a message or carry no SE).
- The ordinary (message) rows' missing opponent idle rest (section 1 residual; sar131 §6).
- SA6..SA8 (CURSED / NIGHTMARE / CONFUSION / FRZ): the sibling slice.

## 7. Reproduction (from workspace/)

```
sh tools/integration/sae135Run.sh <fresh-out-dir-inside-the-repo> [--census]   # archive copies (base 7511dc63d, HEAD), stq132 13 probes x2
                                                                                 # (sha256 == committed), rom-windows == committed, comparator
                                                                                 # x2 (== committed), diag, redraw, 4 controls, next body (4 probes
                                                                                 # x2), 6 routes base vs final, census (--census), receipt -> ALL SAME
node --experimental-strip-types --no-warnings tools/integration/sae135ProductionCompare.ts <raw-dir> <out.json> [--neg=age+1|wrong-side|drop-one|rest-y|redraw] [--diag=ordinary-rest] [--only=<key>]
node --experimental-strip-types --no-warnings tools/integration/sae135NextBodyX2.ts <next-body-rom.json> <raw-dir> <out.json>
python3 tools/integration/sae135RouteDelta.py <base.json> <final.json> <out.json>
python3 tools/integration/sae135Receipt.py <run-dir> <receipt.json> [--census]
npx vitest run tests/sae135StatusAnimationRender.test.ts
```

`<raw-dir>` for the comparator = stq132NpzToRaw.py output (`STQ132_KEEP_RAW=1 sh tools/integration/stq132Run.sh <dir>` keeps it).
