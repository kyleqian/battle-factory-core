# spd2: SPINDA's spots on the rental and swap screens (2026-11-24)

Kyle's live challenge of 11-24 (engine `eb-bc9f337e6d54769f`) showed a SPINDA with no spots. Replaying his trace: on the rental
(select) screen the highlighted SPINDA's picture (personality 1984593932, frames ~900-1620) had no spots, while its summary page did.
spd1 (`docs/fcp1-frame-catcher-pictures.md` #3) had spotted only the battle field picture and the summary. Pictures only: gameplay is
unchanged.

## What the ROM does

Every front picture goes through `LoadSpecialPokePic` (`decompress.c:85-112`) -> `DrawSpindaSpots(species, personality, dest, TRUE)`
(`pokemon.c:5808-5812`), with the personality handed to `CreateMonPicSprite_HandleDeoxys(species, otId, personality, ...)`
(`trainer_pokemon_sprites.c:154-206`). In `battle_factory_screen.c`:

| picture | function | personality argument |
|---|---|---|
| rental cursor pic | `Select_CreateMonSprite` (:2014-2025) | the mon's |
| cursor pic rebuilt after a summary | `Select_ReshowMonSprite` (:2034-2053) | the mon's |
| the three chosen pics (YES/NO) | `Select_CreateChosenMonsSprites` (:2055-2075) | each mon's |
| swap screen pic, player or enemy | `Swap_CreateMonSprite` (:4294-4310) | the mon's |
| swap pic rebuilt after a summary | `Swap_ShowSummaryMonSprite` (:4075-4097) | **the OT id** (non-BUGFIX: `personality` and `otId` passed swapped) |

The last one is the ROM's bug: the spots come from the OT id's four bytes (every Factory mon's OT id is the player's trainer id,
`OT_ID_PLAYER_ID`, 416049562 here). The shiny palette reads `otId ^ personality`, which the swap does not change. Spots are drawn on the
first 64x64 frame only, which is the frame these sprites show.

## The change

- `src/engine/monPicRender.ts`: `drawMonPic`, `drawMonPicFaded` and `drawChosenMonPic` take the personality the ROM's call passes
  (`spotPersonality`); SPINDA's tileset is `spindaSpottedTileset` of it (spd1's port), cached per value. Undefined draws the plain pic.
- `src/engine/factoryDraftScreen.ts`: the cursor pic (both render paths, so the summary fades too) passes `rentals[cursorPos].personality`;
  the chosen pics pass `chosenMonPersonalities` (pick order). The decline's three-tick hold, which draws from a snapshot because the 3rd
  pick is already cleared, snapshots the personalities with the species (`confirmReveal.ts` `decliningPersonalities` /
  `monsPersonalitiesOverride`, set in `core.ts`).
- `src/engine/factorySwapRender.ts`: the pic passes the drawn mon's personality; `FactorySwapRenderView.summaryReshowOtId` (set by
  `core.ts` while the popup is the post-summary one: `summaryReturn` or `returnedFromSummary`, from the same gPlayerParty records the
  summary reads) replaces it with the OT id.
- Found while checking the other front pictures: a **Scene ON move body** drew the opponent from the plain species sheet, so an opponent
  SPINDA lost its spots during most move animations it was in (seed 28, battle 1: its FAINT ATTACK, the player's ICE BALL; its own
  DIZZY PUNCH and TEETER DANCE bodies already re-spotted it).
  `src/engine/battleScene.ts`: `renderBattleResolutionLiveView` arms `liveSpindaSpotSides.opponent` with the field art's spotted tileset
  and `liveShownFormSheets` returns it for SPINDA on the opponent side (the castform / transform pattern). Dizzy Punch and Teeter Dance's
  own re-spotting is unchanged (re-spotting is a no-op).

## ROM evidence

Frame catcher (`tools/frame-catcher/run.sh`, `KEEP=1`; mGBA in process, no oracle server) on three traces, the fixed tree against the
base (`git archive 57c549323`, `GAME=`). Compared per engine frame against the anchor-aligned ROM frames, on SPINDA's 64x64 picture
masked to its opaque pixels. Evidence and scripts: `.integration/evidence/spd2/` (traces from `makeSpinda.mjs`, a scripted driver over
the soak's RandomPlayer; `picmatch.py`, `measure.py`, `romframe.py`, catcher reports).

| path | trace, engine frames | fixed | base |
|---|---|---|---|
| cursor pic (Kyle's SPINDA) | kyle1124, 830-1700 every 5th | 175 / 175 exact | 0 / 175 (116 px off) |
| summary page (Kyle's) | kyle1124, 1800-2000 full screen | 90 / 101 exact | the same 90 / 101 (unchanged) |
| cursor pic | seed 10 draft, 284-312 | 29 / 29 | 0 / 29 (191 px) |
| summary entry fade (faded variant) | seed 10, 313-340 | 28 / 28 | 9 / 28 |
| cursor pic after the summary (`Select_ReshowMonSprite`), fade-in then settled | seed 10, 436-548 | 114 / 114 | 36 / 55 and 0 / 59 |
| chosen pics, SPINDA first (left) | seed 10, 768-829 and 936-975 | 102 / 102 | 0 (191 px) |
| decline hold (snapshot path) | seed 10, 828-829 | exact | 191 px |
| swap, enemy SPINDA (`Swap_CreateMonSprite`, accept prompt) | seed 28, 12712-12768 | 57 / 57 | 0 / 57 (168 px) |
| swap, player SPINDA, then its summary entry fade | seed 28, 25800-25890 | 91 / 91 | 15 / 91 |
| swap, after the summary (OT id spots), fade-in then settled | seed 28, 25978-26130 | 153 / 153 | 43 / 67 and 0 / 86 (216 px) |
| battle 1 move bodies, opponent SPINDA (80x72 region, unmasked) | seed 28, 3124-3361 (FAINT ATTACK), 3560-4400, 7192-7363 (TEETER DANCE) | 1,251 / 1,251 | 968 / 1,251 |
| battle 1 ICE BALL body (player's, SPINDA the target) | seed 28, 7908-7999 | 57 / 92; of the other 35, 33 differ only where an ice particle meets the sprite (no pixel where both sides draw SPINDA colours differs) and 2 (7961, 7963) show the hit shake's 3-pixel offset no nearby ROM frame has (the same in the base) | 0 / 92 |

The post-summary quirk on the ROM: the same SPINDA (personality 2945348007) shows its personality's spots before the summary (ROM frame
26591) and the OT id's after it (26835); ours draws both (`.integration/evidence/spd2/swap-evidence.png`). Every ROM pic measured had
every opaque pixel either the plain colour or the spot colour at offset (0, 0).

Catcher totals, fixed / base: kyle1124 218 / 220 picture differences (74 of 74 menus followed); seed 28 swap trace 199 / 211; seed 10 draft
trace 114 / 121.

Traces: `kyle1124.json` (Kyle's, Scene ON; did not rent SPINDA); seed 10 Scene ON draft (SPINDA in slot 4, rented first, a SUMMARY visit
before renting, NO once then YES); seed 28 Scene ON (SPINDA leads battle 1's opponent; swap 1 takes it from the enemy screen, swap 2 opens
it, its SUMMARY, back, B, quit).

## Gameplay unchanged

`tools/integration/lsd194Census.sh` (`LSD194_SHARDS=20 LSD194_SHARD_SEEDS=10`, seeds 200..209) on 57c549323 and 049e5b3ee: every
`eventsDigest` identical and the shards byte-identical, Scene ON and OFF.

## Tests

`tests/spd2RentalSwapSpindaSpots.test.ts` (fixture `tests/fixtures/spd2-spinda-traces.json`: the two scripted traces and the first 961
frames of Kyle's): ROM-measured spot rows for the four values (Kyle's, seed 10's, seed 28's personality and the OT id) against the spot
rule; the rendered cursor pic (Kyle's frame 900; seed 10 before and after the summary), chosen pics and decline hold, swap enemy / player /
post-summary pics against them; the FAINT ATTACK body frame against the ROM frame's region hash. Fails on the base (4 of 5).

Gates on this branch: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; `NODE_OPTIONS=--max-old-space-size=8192 npm test`
1,955 files / 17,165 tests passed, 0 failed (44 files / 241 tests skipped). `npm run -s build:lib`: ENGINE_BUILD `eb-bc9f337e6d54769f`
(base) -> `eb-49f4aa3056b93403`.

## Other front pictures checked

A stack-logging pass over the plain SPINDA sheet's reads (`audit.mjs`) on the seed 28 trace (both swaps, two Scene ON battles), a Scene
OFF seed 28 battle and the seed 10 draft: after this change only the spotted-sheet builders read it (battle field art, summary, these
screens). Not changed, and why:

- A transformed battler showing SPINDA (spots from `gTransformedPersonalities`): no Factory set can Transform except DITTO (set 54), and
  no Factory range reaches it (Level 50 and Open ranges start at 110 / 372).
- `renderSceneOffTurnView`: the staged ONIX / KABUTO sample only.
- The summary's second animation frame stays plain, as on the ROM (`DRAW_SPINDA_SPOTS` writes the first frame).
- The player's SPINDA in battle is a back picture (no spots).

## Seen, not fixed (pre-existing, not spots)

- After a summary visit on the swap screen the engine keeps drawing the SUMMARY/SWAP/RECHOOSE popup with its pic for the rest of the swap
  screen: `core.ts` routes every frame with `factorySwap.returnedFromSummary` (never cleared) through the summary renderer with
  `phase: "playerOptions"`. ROM closes it on B and shows the picker (seed 28: ours 26140-26230 vs ROM 26920-27010; Kyle's 11-24 swap
  19910-20340 shows NIDORINO's popup through his whole enemy pick and accept). Gameplay follows the controller and is unaffected.
- On PKMN FOR SWAP the closing popup, the species name and the arrow jump to the party's slot 0 at once (the controller resets the cursor
  for the enemy screen and the render reads `party[cursor]`); the ROM keeps the chosen mon's pic and slot until the close ends (seed 28:
  ours 12479-12487 MURKROW vs ROM 12879-12887 SEALEO).

## spd2b: the seed 28 trace re-made on master (2026-11-24)

Why: the fixture's `swapSeed28` is fixed-frame presses recorded on 57c549323. Master f4d16a36a (spd2 merged with the 11-22/23 night run:
battle timing, party menu, sound timing, press gates) desyncs it: battle 1's swap screen came at 18105, not 12295, and the swap went
another way, so the swap test and the FAINT ATTACK body test failed (2 of 5). Pictures and spots were right; only the trace was stale.

What changed: `makeSpinda.mjs` (the same driver: seed 28, Scene ON, `winning-swap`) re-made the trace on master. Same story: SPINDA
2945348007 leads battle 1's opponent and uses FAINT ATTACK, swap 1 takes it from the enemy screen, swap 2 opens it, its SUMMARY and back.
The fixture holds its first 26,089 frames (up to the popup's close). Test frames: 12740 -> 12726, 25830 -> 25789, 26080 -> 26039 (swaps),
3140 -> 3150 (FAINT ATTACK body). `ROM_SPOTS` and `ROM_BODY_REGION_SHA256` are unchanged: in the new trace's catcher run the ROM frames
equal to ours at those frames (13094, 26500, 26752; and 3320, the only ROM frame equal to ours at 3150 in the region) measure the same spot
rows, and 3320's region hashes to the same value as spd2's 3334. Kyle's and seed 10's draft traces are unchanged.

Catcher on the new trace (`KEEP=1`), fixed = master f4d16a36a, base = 6a29087e3 (master without spd2). Counts use `picmatch.py --win 80`,
which gives spd2's table above on its own trace too; at the default 12 the post-summary pic and the FAINT ATTACK body lose 6 and about 150 frames
on both traces (the ROM's menu anchor there falls mid-fade, so the aligned guess is off by more than 12; not a picture difference).

| path | new trace, engine frames | fixed | base |
|---|---|---|---|
| swap, enemy SPINDA (accept prompt) | 12698-12754 | 57 / 57 | 0 / 57 (168 px) |
| swap, player SPINDA, then its summary entry fade | 25759-25849 | 91 / 91 | 15 / 91 |
| swap, after the summary (OT id spots), fade-in then settled | 25937-26003, 26004-26089 | 67 / 67 and 86 / 86 | 43 / 67 and 0 / 86 (216 px) |
| battle 1 move bodies (80x72 region) | 3134-3371 (FAINT ATTACK), 3574-4419, 7193-7364 (TEETER DANCE) | 1,256 / 1,256 | 973 / 1,256 |
| battle 1 ICE BALL body | 7909-8000 | 72 / 92; the other 20 differ only where an ice particle meets the sprite (no pixel where both sides draw SPINDA colours differs); spd2's trace gives the same at `--win 80` | 0 / 92 |

Catcher totals, fixed / base: 194 / 214 picture differences (79 of 79 menus followed). The new test fails on base 4 of 5, as before.
Evidence: `.integration/evidence/spd2b/` (`spd-swap-s28.json`; `catch-fix`, `catch-base`, and `catch-old`, spd2's trace on 049e5b3ee,
which reproduces its 199 differences; `picmatch-all.sh`, `romregion.py`, `checkspots.py`, `swap-evidence.png`). Frame numbers in the
sections above (and in "Seen, not fixed") are the original trace's.

Gates: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; the spd2 test 5 / 5; full `npm test` 1,975 files / 17,256 tests passed, 0 failed
(44 files / 243 tests skipped).
