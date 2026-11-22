# fam1: the first use of a move animation on the website is held, not dropped (2026-11-22)

Kyle's 2026-11-22 challenge on the live site (game build eb-aeaa, core 32c233e62, Battle Scene ON) lost two move animations, both the
first time the move was used: foe Wailmer's first Whirlpool had no swirl at all (frame 5516), foe Minun's first Spark broke off
mid-animation (frame 18597). The site's event log has one contained error for each: `draw/move-animation: AnimAssetPending: animation
asset water-orb has not loaded` and `... dynamicPunch has not loaded`. Later uses animated (the miss had started the download), and the
headless replay (all animation files installed) matches the ROM picture for picture. Branch `worktree-agent-ac423778265066a5c` from master
`3dd105fbc`. Evidence (not in git): `.integration/evidence/fam1/`, `.integration/fam1/`.

## In short

- **The browser now waits for an animation file it did not prefetch, then plays the animation.** Before, the first frame that needed
  the file recorded an error and the whole animation was replaced by the still battle scene.
- **The prefetch list now knows every Factory move's files.** 45 Factory moves were missing files (Whirlpool and Spark among them); the
  list is now recorded from each move's own animation, and a test fails when a Factory move reads a file its entry does not list.
- No gameplay, RNG or timing change. The headless bundle is byte-identical (`ENGINE_BUILD` `eb-bc9f337e6d54769f` does not move).

## What broke

The website downloads 140 of the 163 move-animation files lazily (dl4, `docs/dl3-per-species-pictures.md`). Two things had to hold:

1. **A read of a file that has not arrived must reach the browser loop.** `src/lib.ts` (`drawFrame` / `drawOrHold` / `hold`) catches
   `AnimAssetPending`, starts the fetch, keeps the last frame on the canvas and draws the frame again when the file is in. But the throw
   never got there: `recordContainedPresentationError` (`src/engine/presentationContainment.ts`) let only `MonPicPending` (pictures)
   through. The draw seam (`renderBattleResolutionPresentation`) recorded `AnimAssetPending` as a presentation error and marked the
   command degraded, which is sticky: the loop did hold that one frame (the store's missed-read safety net), but every frame of the
   command after it drew the static decline path. dl4's doc said containment rethrows it; it did not.
2. **The prefetch list must name the file.** `src/assets/gen/anim-asset-moves.json` (move id -> lazy files) was derived from recorded
   soak battles: a file went to the moves whose name it carries, plus the moves every battle that read it shared. Whirlpool (250) reads
   `water-orb`, Spark (209) the hit splat in `dynamicPunch`; the soaks never used either, and neither name matches, so neither had an
   entry. The prefetch (parties' move lists, before the battle) skipped them and fact 1 turned the miss into a lost animation.

## Fix 1: containment lets a pending file through a render, not through a tick

- `presentationContainment.ts`: `withPresentationRender(draw)` counts renders in progress; `recordContainedPresentationError` rethrows
  `AnimAssetPending` while one runs (like `MonPicPending`), before it records anything. Every caller records before it marks the command
  degraded (`battleResolutionPresentationRender.ts` duration ~2101, draw ~3362 / ~3375), so a pending read never degrades a command.
- `core.ts render()` runs inside `withPresentationRender` (one wrapper; the body moved to `renderState`). `lib.ts` is unchanged: its
  `drawOrHold` already holds on the throw.
- Which seams run where. Inside a render: `renderBattleResolutionPresentation` ("draw" ~3362 / ~3375), `containedHistoryRead` ("draw"
  ~2139, called while the render view is built), `liveMoveAnimationDuration` ("adapter", `liveMoveAnimation.ts` ~1183, also called by the
  view and the live body), `drawRecord.ts` ~111 (a canonical-sample error it builds itself, never a pending read). On the tick:
  `isBattleResolutionCommandComplete` ("duration" ~2101), the tick-side views `containedBattleResolutionRenderView` /
  `containedBattleResolutionDisplayedField` ("field" ~3301 / ~3325), the command projection ("commands", `battleResolutionPresentation.ts`
  ~6744) and the host update ("order", `factoryRoundBattleOrchestrator.ts` ~2419 / ~3090). The rule is by context, not by seam: the
  render-side seams and anything else reached from `render()` let it through; a seam on the tick keeps containing it (a throw out of
  `session.tick` ends the browser game, `lib.ts tickOnce` -> `crash`), and the "adapter" / "duration" / "draw" seams do whichever applies
  to the call. That tick-side branch is never taken: no tick reads a lazy file (below), which is also why the headless bundle could
  drop it.

## Fix 2: the prefetch list is recorded per move

`tools/bundle/animAssetNeeds.ts` (the dl4 derivation is gone):

- `moves`: every move's own animation, recorded directly (`tools/bundle/animAssetMoveReads.ts`). The body is drawn through the two
  functions the live draw calls (`liveMoveAnimationPresentation`, `renderSceneOnMovePresentation`) for both attackers and every row, with
  the inputs the hosts give a battle's first body (palette, allocator, the known-entry sprite order, the body's presentation words), on
  two fields (a default pair, and the move's first Factory user on both sides: Hidden Power draws only for Unown), over a source that
  records every asset read. The request is a Proxy that records the fields the body reads, and each field it reads is varied over its
  range (turn, damage, power, friendship, multihit, rollout counter). The general animations that replay a move body are recorded under
  the move that causes them (turn-trap residuals, weather that continues, Leech Seed's drain). All 354 moves (a called move can be any
  of them): 277,695 rows drawn, 0 errors, ~3 minutes. 26 requests have a body none of whose rows draws (Frustration at a friendship
  other than 0, Hidden Power off Unown, Double Team's player side, Transform's separate renderer); every Factory move that has a body
  draws rows of it.
- `stage`: one staged battle per Factory move through the real game (the soak driver from the Level 50 draft, Scene ON, every frame
  rendered). Every Factory set's moves are replaced by the move (or the move and a helper that makes it work: a hit for the heals and
  counters, Spore for Dream Eater / Snore, Stockpile for Spit Up / Swallow...), and every set's species by Water species no move misses,
  so both sides use it and production draws its consequences. Reads during a move-animation command go to that command's move, the rest
  of the battle's reads to the staged move and its helpers, reads outside a render to `tick`. 277 battles (~13 minutes): the move animated
  on both sides in 252, on one side in 18, never in 7 (Softboiled, Attract, Return, which a Factory mon never has: the game writes
  Frustration, Mirror Coat, Swallow, Helping Hand, Recycle; the `moves` recording covers their bodies). Tick reads: none.
- `build` writes the table from both recordings; `record` / `check` replay dl4's soak recordings against it.

Before the recorder gave every body those inputs, it saw nothing for 14 moves (faithful-random bodies draw nothing without their words;
Sky Attack, Bonemerang and Flatter need a known sprite order); the staged battles found them, and the recorder now gives every body
them. Hidden Power's file was found only by the Factory-user field (the staged battles' Water species never draw it).

**The table.** 175 moves have files (was 190 entries, 349 move -> file pairs; now 202 pairs). 45 Factory moves gained files (24 had no
entry): Whirlpool `water-orb`, Spark `dynamicPunch` + `encore`, Crabhammer `water-orb`, Mega Kick / Super Fang / Focus Punch / Mega Punch
`hyperFang`, Heat Wave `sandstorm`, Pin Missile / Spike Cannon `twineedle`, Iron Tail / Metal Claw `harden`, Sheer Cold / Ice Ball
`icy-wind`, Explosion / DynamicPunch / Present `selfDestruct` and others (`tableDiff` in the evidence folder). 202 pairs were dropped: the old
intersection rule had attached files to moves that never read them (Whirlwind listed howl, metronome, sweet-kiss, synthesis). The 2 non-Factory
gains are harmless (Tackle `moonlight`: Tackle was a helper in the Wish battle, whose heal reads it).

| against recorded battles | old table | new table |
|---|---|---|
| 42 soak battles (12 seeds coverage-fight + 12 full): lazy reads not prefetched | 20 of 294 | 0 of 294 |
| 277 staged battles: lazy reads not prefetched | 51 of 204 | 0 of 204 |
| files prefetched per soak battle (mean) | 21.0 | 12.9 |

## Evidence

- **Browser, the playtest's own trace** (`_playtest-20261122/browser` harness copied, served from the scratchpad; `harness2.html` records a
  frame when the game presents it, `?delay=MS` delays every `sprites/anim/*.txt` response; `run2.mjs`; reference = the same trace replayed
  headless in this tree with all files installed, `ref.mts`; pixel compare `cmp.py`; catch-run compare `cmpCatch.py`):

  | window | master build | fix 1 only (old table) | fix 1 + 2 |
  |---|---|---|---|
  | Whirlpool 5476 -> 5700 | contained error at 5516; 117 of 224 frames differ from the reference | no error, 224 of 224 identical | water-orb prefetched at mount, no pause, 224 of 224 identical |
  | Spark 18494 -> 18890 | contained error at 18597; 44 frames differ | no error, 395 of 395 identical | dynamicPunch + encore prefetched, no pause, 395 of 395 identical |

  The fix 1 + 2 frames are also identical to the catch run's headless engine frames (`catch-site/kyle1122/engine`: 224 / 395 of 224 /
  395); sheets `browser-whirl.png` / `browser-spark.png` (before / after rows) next to `ref-*.png` (peek.py).
- **The hold** (the files of the window not in the table, every animation file delayed 1.5 s): master build, the game pauses 1.54 s at
  18595 -> 18596, then draws the static scene (44 frames wrong, the contained error). Fix 1 build: pauses 1.56 s at 5514 -> 5515 and 1.55 s
  at 18595 -> 18596, then draws the animation, every frame identical to the reference, no contained error. Final build: the files arrive
  before `ready`; no pause in either window.
- **Tests.** `tests/fam1PendingDrawHolds.test.ts`: an `AnimAssetPending` injected at Shadow Punch body age 10 leaves `render()`, nothing is
  recorded, the redrawn row and every later row equal the clean run (fails without fix 1). `tests/fam1FirstUseMoveAnimations.test.ts`:
  the containment rule, Whirlpool / Spark recorded and listed, no tick reads a lazy file (4 Scene ON soak seeds, 160,000 ticks), and a
  6,000-frame mount-loop play-through over a store that names no file to the prefetch at all draws every frame exactly as the full table
  does, with no contained error (fails without fix 1: 3 contained errors). `tests/fam1MoveAnimationReads{1..4}.test.ts`: every Factory
  move (277, both levels' pools) reads only lazy files its entry lists (44 fail on the old table).
- **Census** `lsd194Census.ts --seeds=200..219 --scene=on`, master vs branch: 20 of 20 lines identical (eventsDigest and all).

## Not done / follow-ups

- **A weather an ability starts.** Open Level Tyranitar (sets 860-869, Sand Stream) starts a sandstorm no move names; the end-turn
  `SANDSTORM_CONTINUES` reads `sandstorm`, which the prefetch does not know. With fix 1 that is a short pause the first time (no lost
  animation). Fixing it means teaching the needs scan (`src/engine/animAssetNeeds.ts`) abilities, not the move table.
- General animations not caused by a move (held items, abilities) are not recorded on their own. In the staged battles every lazy
  read outside a move body came from a move's own consequence (weather, turn traps, Wish, Knock Off, Focus Punch), and every lazy read
  of the 42 soak battles was prefetched.
