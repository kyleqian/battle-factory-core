# bso226: battle-start intro send-outs in Battle Scene ON

Finish plan Phase 2; ISSUES #146 ("battle-start intro send-outs") and #71; continues bso225 (path C).

## Scout findings (before this step)

The generated Factory battle-start intro (`renderGeneratedBattleStartPreSendOut`, a canonical-tick replay) draws both send-outs
without any per-species animation, in both scenes:

| Side | Where | Before bso226 |
|---|---|---|
| Opponent | `drawGeneratedOpponentRelease` (`MATERIALIZE_START_OFFSET = 19` after the ball opens) | release tint + the static front pic. No `DoMonFrontSpriteAnimation`. |
| Player | `drawGeneratedPlayerMaterialize` (canonical ticks `PLAYER_MATERIALIZE_START_TICK = 1653`, settle `1664`, tint ramp `1676..1691`) | affine emerge, then the static back pic. `generatedPlayerMaterializeSettleY2` plays a RAM-derived `y2` wobble for **ONIX only** (`MATERIALIZE_SETTLE_WOBBLE_SPECIES`) and `0` for every other species. |

- ROM callbacks: `SpriteCB_OpponentMonFromBall` -> `sMonFrontAnimIdsTable` with `sMonAnimationDelayTable`; `SpriteCB_PlayerMonFromBall` ->
  `BattleAnimateBackSprite`. Both are the callbacks the mid-battle send-ins already ride, so the banked reducers (fra151 front, bso225 back:
  per-tick x2/y2, OAM matrix, `BlendPalette`) are reused unchanged.
- Scene OFF takes `SKIP_FRONT_ANIM` and genuinely plays no intro animations (ISSUES #71 user decision 2026-08-10; not reopened). The generated
  intro had no scene flag, so one was needed: `FactoryBattleStartIntroState.sceneOn` (from `config.battleScene === "on"`).
- Reachable only through the generated-orchestrator route. The two committed Scene ON generated-orchestrator traces
  (`presentation-rng-playable-live-bodies-on` / `-seeded-on`) capture frames after the intro, so no committed trace pixel moves.
- The ROM waits for the opponent's front animation to finish before it prints "Go!" and releases the player. For long front animations
  (glow families) the ROM's "Go!" / player release comes 39..98 frames after the app's fixed OFF-style timeline. That is a **timing**
  residual (out of scope: timing/clock/message frames); the harness maps it with `--lag=L@F` (app frames >= F read ROM frame f + offset + L).

## What changed (Scene ON only)

- `factoryBattleStartIntro.ts` / `factoryRoundBattleOrchestrator.ts`: `sceneOn` in the intro state.
- `battleResolutionPresentationRender.ts`: `generatedBattleStartOpponentAnimAt` / `generatedBattleStartPlayerAnimAt` evaluate the mid-battle views at an
  equivalent send-in elapsed: opponent `local + 19 - 1`, player `local + MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED + 1 + 1`
  (`GENERATED_INTRO_OPPONENT_ANIM_ELAPSED_SHIFT = -1`, `GENERATED_INTRO_PLAYER_ANIM_ELAPSED_SHIFT = 1`, fitted on the windows below; both shifts hold
  on every window, e.g. wailmer's opponent is exact with -1).
- `battleScene.ts`:
  - `drawOpponentFrontAnimSprite` (factored out of `drawMidBattleSwitchInSprite`) now also draws the generated opponent release; the settled opponent
    during the player release keeps its front animation running (`GENERATED_INTRO_OPPONENT_SETTLED_LOCAL`), since the ROM holds "Go!" until it ends.
  - `drawGeneratedPlayerMaterialize` draws the back animation once the settle starts. Glow / flash families: the release tint fade task
    (`playerMaterializeSettleTintCoeff`: hold, ramp 1/tick) rewrites the palette on the frame before and while it ramps; otherwise the glow
    `BlendPalette` shows with tint 0. Matrix families go through `drawSpriteSheetAffineRotate`, offset families through
    `drawSpriteSheetAffineTintedBlend`.
  - The ONIX-only hand-fit (`generatedPlayerMaterializeSettleY2`) is **replaced by the generic dispatcher in Scene ON** (ONIX's own V_SHAKE comes
    from the banked reducer; the window below is exact on the player mon). It stays, unchanged, for Scene OFF.
- No gameplay, RNG, kernel event or timing change.

## Staging and tools

- `tools/integration/bso226Stage.py <dir> <tag> <seed> <trainerId> <p1,p2,p3> <o1,o2,o3>`: stage a `factoryLegal` battle-lab scenario on the
  Scene ON ROM with every pre-checkpoint frame captured; writes the ROM frames, the player personalities (from the first capture) and the params.
- `tools/integration/bso226Run.ts <params> <rom-dir> <out.json> --scene=on|off --offset=N --ack=N --end=N [--lag=L@F] [--lagauto=1]
  [--auto=lo-hi] [--dump=f,f --dump-dir=D]`: replays the generated intro in the app (A pressed on app frame `ack`) and scores each app frame
  against ROM frame `offset + frame (+ lag)` per region: `opp` (x >= 120, y < 64), `pm` (x < 120, 48 <= y < 112: player mon, ball, trainer),
  `rest`. `--auto` fits offset and ack; `--lagauto` fits the lag and its split frame.
- `tools/integration/bso226Strip.py <out.png> <dump PNGs>`: ours | ROM strips (left = app, right = ROM) in
  `tools/integration/fixtures/battle-start-intro/`. `windows.json` holds the five windows' staging, alignment and residual totals (read by the unit test).

## ROM windows (Scene ON oracle, `battle-scene-on`, factoryLegal staging)

Five windows, five distinct player back families and five distinct opponent front families. "before" = `--scene=off` (what master draws; the Scene ON
ROM plays the animations, the app did not), "after" = `--scene=on`; same alignment. Residual = differing pixels summed over app frames
`ack .. end` (`end` = the first frame of the out-of-scope menu timing difference).

| Window (seed / trainer) | Player lead: back family | Opponent lead: front family | offset / ack / lag | before opp / pm | after opp / pm |
|---|---|---|---|---|---|
| yoshi (42 / 49) | GRIMER: V_STRETCH | COMBUSKEN: V_JUMPS_H_JUMPS | 1171 / 369 / - | 106,807 / 16,697 | **12 / 0** |
| wailmer (5 / 55) | WAILMER: SHAKE_GLOW_BLUE | SABLEYE: GLOW_BLACK | 1140 / 400 / 98@517 | 24,840 / 62,540 | **132 / 7,903** |
| spinda (22 / 63) | SPINDA: CIRCLE_COUNTERCLOCKWISE | RATICATE: FIGURE_8 | 1175 / 365 / 39@475 | 41,645 / 35,115 | **11 / 1,855** |
| onix (35 / 53) | ONIX: V_SHAKE | ELEKID: FLASH_YELLOW | 1157 / 383 / 45@495 | 62,261 / 48,993 | 40,787 / 14,502 |
| koffing (11 / 49) | KOFFING: GROW | BUTTERFREE: H_SLIDE_WOBBLE | 1151 / 389 / 74@505 | 42,765 / 63,669 | **12 / 97** |

Strips: `tools/integration/fixtures/battle-start-intro/<window>-<frames>.png` (opponent animation frames, then player animation frames).

### Named residuals (after)

- **yoshi**: opp 12 px at frame 444 (the first emerge frame). pm exact through 688. Frames 678..688 differ because the app's first-action menu
  appears 12 frames before the ROM's (timing; the same in Scene OFF).
- **wailmer**: opp 132 px, one frame (473). pm: frame 117 (808 px, before the intro proper), the in-flight ball 566..604 (<= 150 px/frame, ball arc / lag split), the
  ball-open sparkle particles 621..649 (<= 130 px/frame, plus 990 px on 649). The glow mon itself is exact after the release-fade palette ownership
  fix (9,806 -> 7,903 px). A constant 24 px/frame sits in `rest`.
- **spinda**: opp 11 px (frame 437). pm 1,855 px over 567..606 (<= 93 px/frame, growing as the tint fades: the Spinda spot pattern / palette, not the circle motion).
  `rest` after 621 is menu timing.
- **koffing**: opp 12 px (frame 465), pm 97 px (frame 614). From 675 on the menu timing. The GROW affine matrix is exact.
- **onix**: pm is exact from frame 482 to 674 (the V_SHAKE back animation through the 45-frame lag); 455..481 differ (14.5 kpx, the release/ball-open frames:
  alternate frames 455, 463, 465, 467 .. spike at 2-6 kpx). The opponent window is not exact: the lab ROM's Elekid is female (personality 230140939) and
  the app's generated opponent is male (the healthbox gender symbol and its colour differ on every frame; strip `onix-470-490-520-540.png`), so every
  opponent-side frame carries that, plus 130..900 px/frame through the FLASH_YELLOW (frames 454..494), 758 px on 486/489/492 and about 1,000 px on 495..510
  (not attributed beyond that). Opponent personality generation is not changed here (kernel/generation).

Not chased (named, out of scope): ball-open sparkle particle colour/position (pre-existing in both scenes), the ROM's later "Go!" (timing), the
12-frame-early command menu (timing), the opponent personality/gender of the onix window (generation).

## Reproduce

```
python3 tools/integration/bso226Stage.py /tmp/w yoshi 42 49 110,130,150 189,155,168
node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts /tmp/w/yoshi.json /tmp/w/yoshi/rom /tmp/w/yoshi-on.json \
  --scene=on --offset=1171 --ack=369 --end=688
node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts <params> <rom> <out> --scene=on --offset=1140 --ack=400 --end=698 --lag=98@517
```
(`--auto=900-1400` fits offset/ack for a new window; keep `offset + frame + lag <= 2008`, the last staged ROM frame.)

## Tests

- `tests/bso226BattleStartIntroSendOuts.test.ts`: the five windows through the live selectors (distinct families), the fitted shifts and anchors, the
  Scene ON intro identical to Scene OFF until the opponent front animation starts and different in both animation windows, and Scene OFF unchanged
  (explicit `battleScene: "off"` equals the default-config replay).
- No test was re-pinned: no committed trace or test frame moves (the generated-orchestrator Scene ON traces capture after the intro; the Scene OFF
  frames are byte-identical, `compare:differential` identical on 4 traces).

## Gates

Tested code commit `02849247b865bb5cc40d96fd5e7c83d09ec779eb` (tree `6f2d9108cb7b98688b7307e94fb24bc23f9c65ef`); later commits are documentation only. Evidence:
`.integration/validation/sv-20261029/bso226-evidence/`.

- `npm run typecheck`: exit 0 (4 min).
- Census seeds 0..999 vs the bso225 baselines (`on-/off-633d97700`): Scene OFF shards r0..r9 byte-identical; Scene ON 1,000 / 1,000 battles identical
  (`rst197CensusDelta.py`: 320,777 commands, identicalBattles 1000; python digest + error compare: 0 mismatches); static 0.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base master`: PASS, 641
  captures byte-identical (also `presentation-rng-playable-live-bodies-on`, 190/190). No capture changed: the generated-orchestrator Scene ON traces
  capture after the intro, the other traces never run the generated intro.
- Full suite `npm test` in 12 foreground `--shard=k/12` runs (workers 2): all exit 0; 1,714 files passed (44 skipped), 14,180 tests passed (223 skipped).
- `npm run build`: exit 0.
