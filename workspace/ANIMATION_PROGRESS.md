# MOVE_ERUPTION composed Warm Rock reducer + typed seam — move unsupported (2026-08-26 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION and `eruption-warm-rock` remain unsupported/unfulfilled; this step adds no framebuffer, exact, partial, staged, or sibling credit.
- **Did:** Composed the already-banked launch/falling Warm Rock sprites, paired HorizontalShake tasks, two simple-palette programs, and Eruption-exclusive loopsewithpan audio into one immutable source-relative reducer. Added typed `SceneOnEruptionConfig`/`sceneOnEruptionView` wiring with generic live species/sides/geometry and an explicit deferred compositor branch; no compositor or RGB/framebuffer lookup was added.
- **Verified:** Dense Battle Scene ON reducer/seam audit retains complete **476 player-back + 494 opponent-front** rows for source cursor/args, tasks, sprites, allocator scan order, source/painter order, palettes, resources, audio, latches, immutable gameplay, gameplay RNG, animation RNG, and cleanup. Checks include the pre-supplied plain OAM/palette RAM+1, affine/OAM and BG3 task edges, paired shake rows, audio separation, and independent Earthquake/Fissure/Luster Purge/Sky Attack/Magnitude/Explosion/Self Destruct controls; production framebuffer remains **0 rows**.
- **Next:** Keep Eruption unsupported until the compositor and complete twice-fresh bilateral core framebuffer acceptance are independently proven; then update only the move acceptance/coverage bookkeeping.
- **Notes:** Coverage counts and boundary/barrier lists are unchanged. No gameplay/status/damage/RNG/controller/turn/round/facility ownership, canonical-recording production import, absolute tick, species/evidence-pair gate, coordinate/RGB fitting, or framebuffer lookup was added.

# MOVE_ERUPTION loopsewithpan audio component banked — move unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION and `eruption-warm-rock` remain unsupported/unfulfilled; this audio component grants no move, framebuffer, or sibling credit.
- **Did:** Added a pure typed source-relative reducer for only `loopsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET, 16, 12`: ordinary attacker/target-side panning, command cursor/args, `Task_LoopAndPlaySE` slot/data/counter/play-count cadence, 12 SE1 starts, sound-task teardown, song/status/track lifecycle, and final inactivity. The prior Explosion commands and all visuals/gameplay remain separate.
- **Verified:** The source-pinned strict Battle Scene ON audit checks every **476 player-back + 494 opponent-front row**. Player audio begins at age **239** with pan **+63**, opponent at **257** with pan **-63**; each task owns **186 rows**, starts 12 times through relative age **186**, tears down on the final start, stays audibly active through relative age **235**, and reaches first inactive audio at **236**. All task data, sound counts, song identity, track flags/status/pan, immutable gameplay, and gameplay RNG pass.
- **Next:** Keep Eruption unsupported until the typed seam, compositor, and complete bilateral framebuffer acceptance are independently proven.
- **Notes:** No `battleScene.ts`/`core.ts`, launch/falling/shake/palette/asset, boundary/barrier, coverage counts, gameplay/RNG/controller, canonical-recording production import, absolute-tick/species/evidence gate, or RGB/framebuffer lookup changed.

# MOVE_ERUPTION HorizontalShake component banked — move unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION and `eruption-warm-rock` remain unsupported/unfulfilled; the shake task alone grants no move, framebuffer, or sibling credit.
- **Did:** Added a pure typed source-relative reducer for only Eruption's paired `AnimTask_HorizontalShake` calls: platform `(5,8,60)` then all-visible-battlers `(4,8,60)`, captured live args `(4,8,60,70,1)`, task slots 0/1, full data/state/callback cadence, source/display OAM lag, ordinary bilateral geometry, cleanup, and RNG/resource pass-through. Launch/falling rocks, palette, audio, seam, and compositor remain separate.
- **Verified:** Strict Battle Scene ON audit checks every **476 player-back + 494 opponent-front row**: task lifetimes **239..438 / 257..456** (200 rows each), first cleanup **439 / 457**, 400 task-data rows per side, 404 source/OAM geometry rows per side, OAM predecessor transfer **475/475 + 493/493**, and all RNG/resource rows through final Warm Rock free **475 / 493**. Source tokens and focused Tier-1 audit are green.
- **Next:** Keep Eruption unsupported until audio, typed seam, compositor, and complete bilateral framebuffer acceptance are independently proven.
- **Notes:** No `battleScene.ts`/`core.ts`, launch/falling/palette/asset, latch, coverage counts, boundary/barrier, gameplay/RNG/controller, canonical-recording production import, absolute-tick/species/evidence gate, or RGB/framebuffer lookup changed.

# MOVE_ERUPTION falling-rock sprite component banked — move unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION and `eruption-warm-rock` remain unsupported/unfulfilled; falling-rock work adds no move, framebuffer, or sibling credit.
- **Did:** Added a pure typed source-relative reducer for only `sprite:gEruptionFallingRockSpriteTemplate`: six literal calls, fixed allocator slots, creation callback/first-step convention, `data[0/1/2/3/6/7]` state, integer source `y += 8` motion and `y2` bounce, Warm Rock cell offsets, OAM attributes, source cursor phases, animation-RNG pass-through, resource lifetime, destruction, and first inactive cleanup. Launch task/Q8.8 reducer, palette reducer, and asset remain separate.
- **Verified:** Strict Battle Scene ON audit replays every **476 player-back + 494 opponent-front row**, including six births at **215/233**, slots **3/4/5/7/9/10**, tile offsets `0/16/32/48/0/16`, all 12 lifecycles, source phases `153/187/204`, resources through ages **475/493**, and OAM predecessor transfer **475/475 + 493/493**. The source/asset/Tier-1 audit is green; Eruption remains unsupported.
- **Next:** Keep Eruption unsupported until `AnimTask_HorizontalShake`, audio, typed seam, compositor, and complete bilateral framebuffer acceptance are separately proven.
- **Notes:** No `battleScene.ts`/`core.ts`, banked launch/palette/Warm Rock asset, latch, boundary/barrier, coverage counts, gameplay/RNG/controller, canonical-recording import, absolute-tick/species/evidence gate, or RGB/framebuffer lookup changed.

# MOVE_ERUPTION Warm Rock asset banked — move unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION remains unsupported and `eruption-warm-rock` remains unfulfilled; this banks only `asset:ANIM_TAG_WARM_ROCK` with no move or sibling credit.
- **Did:** Added a deterministic dev-time extractor and self-contained `src/animation/assets/eruption-warm-rock.json`: the complete **32×168, 84-tile / 0x0a80-byte 4bpp** sheet, all 16 palette colors, source/tag/symbol/hash metadata, and exact source-template layouts. The asset records the four 32×32 falling cells at offsets `0/16/32/48` and five 16×16 launch cells at `64/68/72/76/80`, including the launch cells' contiguous native tile-memory order across each 4-tile source-sheet row.
- **Verified:** Fresh isolated extraction is byte-identical. Focused source/asset tests pin source PNG `c44f8ed1…`, indexed sheet `56f6431c…`, packed 4bpp `e07569d2…`, and palette `9e48c2c5…`; they decode every indexed/RGBA cell and prove the retained player-back and opponent-front OAM observations use the launch/falling offsets, 16×16/32×32 shapes, normal priority, and Warm Rock palette slot. No framebuffer claim is made.
- **Next:** Keep Eruption unsupported until separate launch/falling state reducers, HorizontalShake, audio, typed seam, compositor, and complete bilateral framebuffer work are proven; the asset alone does not satisfy any of those components.
- **Notes:** No `battleScene.ts`/`core.ts`, palette reducer, latch, boundary/barrier, gameplay/RNG/controller, canonical-recording import, absolute tick/species/evidence gate, or RGB/framebuffer lookup changed.

# MOVE_ERUPTION simple-palette component banked — move unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION remains unsupported and `eruption-warm-rock` remains unfulfilled; only its two `visualCommand:simple_palette_blend` programs and palette-transfer lifecycle are banked.
- **Did:** Added a narrow pure reducer for the opening `(31,2,0,4,RGB_RED)` and closing `(31,4,4,0,RGB_RED)` commands. Typed source ages, geometry, sprite slots, battler identities, and palette snapshots feed source cursor/wait/args, selector-derived BG/OBJ banks, invisible palette-sprite lifetime, stock BG/OBJ alternating fade cadence, `gPlttBufferUnfaded`/software-faded/hardware-predecessor arrays, and Warm Rock palette tag allocation/free.
- **Verified:** The focused audit iterates all **476 player-back + 494 opponent-front rows** through first inactive cleanup and matches both command windows, both palette-sprite lifecycles, selected mask `0x0003000e` (banks 1/2/3/16/17), Warm Rock tag 10201 in slot 7 / OBJ bank 23, every palette array, and palette/OAM predecessor transfers (**475/475 + 493/493**). Scary Face remains an independent exact palette control. No framebuffer or move acceptance is claimed.
- **Next:** Keep Eruption unsupported until separately bounded rock launch/fall, HorizontalShake, audio, seam, compositor, and complete bilateral framebuffer work are proven; do not infer sibling credit from the banked palette command.
- **Notes:** No `battleScene.ts`/`core.ts`, latch, boundary/barrier, gameplay/RNG/controller, production asset/draw path, canonical-recording import, absolute tick/species/evidence gate, or RGB/framebuffer lookup changed.

# MOVE_ERUPTION bilateral dense display-latch evidence checkpoint — unsupported (2026-08-25 worker)

- **State:** Level 50 remains **211/276 exact, 0 partial / 0 staged, 65 unsupported**. MOVE_ERUPTION remains unsupported; `eruption-warm-rock` is still unfulfilled and conveys no sibling credit.
- **Did:** Retained complete consecutive pointer windows from the legal set-346 CAMERUPT_2 stages: player-back **476 rows, frames 234..709** and opponent-front **494 rows, frames 221..714**, each through first inactive cleanup. Committed compressed dense state, chronological raw RGB888 archives, normalized change maps, and a strict verifier; each orientation reproduced twice fresh byte-identically.
- **Verified:** Both orientations pin two 81/90-row `EruptionLaunchRocks` waves (14 launch-rock allocations total), all six falling-rock lifecycles, two 60-row explosion programs, two 200-row `(8,60)` platform/all-battler `HorizontalShake` tasks, two simple palette blends, the rock-throw program, and cleanup. Hardware OAM and palettes are preceding software/faded on **475/475** player and **493/493** opponent rows; matrix fits are **383/475** and **401/493**. Gameplay RNG has zero transitions; animation RNG changes on every edge. Focused source/evidence tests are **6/6** and independent Earthquake/Fissure/Luster Purge/Sky Attack/Magnitude statuses are unchanged.
- **Next:** Keep Eruption evidence-only. Do not add a reducer, typed seam, compositor, draw wiring, exact/partial/staged credit, sibling credit, boundary/barrier changes, or gameplay ownership.
- **Notes:** Added one precise `ANIMATION_LATCHES.md` row for Eruption's distinct `(8,60)` HorizontalShake argument set; existing plain OAM/palette predecessor, Fissure `(10,50)`, and Luster Purge `(5,14)` rows remain independent. No coordinate/RGB fitting, framebuffer lookup, absolute tick, pair gate, or canonical recording import was added.

# MOVE_INGRAIN bilateral exact production presentation (2026-08-25 worker)

- **State:** Level 50 advances **210→211/276 exact**, remains **0 partial / 0 staged**, and drops **66→65 unsupported**. MOVE_INGRAIN alone promotes and `ingrain-roots-orbs` is fulfilled; Absorb, Mega Drain, Dream Eater, and Giga Drain retain independent exact status with no sibling credit.
- **Did:** Deterministically extracted and hash-pinned the 32x128 ROOTS and 16x48 ORBS indexed art/palettes. Added the ordinary shared Scene-ON compositor through the existing typed seam using generic live visual species/sides/battle-position geometry/subpriority, root cells/hFlip/flicker, orb cells/wave paths, source allocation/OAM painter order, field chrome, audio lifecycle, ordinary RAM+1 transfer, and cleanup. The retained mechanic stage's semantic Lileep override follows already-live Cacturne visual buffers; the config supplies that typed evidence fact without specializing the compositor.
- **Verified:** Player-back frames **205..368** and opponent-front **293..456** each pass **164/164** retained source/component/seam/raw-RGB and actual `core.ts → renderSceneOnMovePresentation` framebuffer rows through first inactive cleanup: **328/328 total, zero residual pixels**, repeated in two deterministic production-render passes. OAM/matrices/palettes remain RAM+1 **163/163** per orientation; gameplay state/RNG stay invariant, animation RNG changes **163** times, and registers remain unchanged. Retained dense/raw sequences stay `159dc54a…` / `e680d6b1…` player and `0799cd68…` / `712043b5…` opponent. Focused source/evidence/reducer/framebuffer/control, inventory/coverage/boundary/frontier ratchets, typecheck, and animation audit are green; the full suite is **1,135 files / 10,491 passed / 224 skipped**, and the production build is green at **720 modules**.
- **Next:** Select the next bounded unsupported move/component track; do not infer sibling acceptance from shared ORBS art.
- **Notes:** `ANIMATION_LATCHES.md` is unchanged because Ingrain confirms the ordinary predecessor-transfer and OAM painter mechanisms. No animation boundary/unsupported barrier, gameplay rooting/healing/switch/status/damage/RNG/controller/turn/round/facility ownership, pair gate, recording/RGB/framebuffer lookup, coordinate/RGB fitting, or absolute tick was added.

# MOVE_INGRAIN bilateral source/reducer evidence checkpoint — unsupported (2026-08-25 worker)

- **State:** Level 50 remains **210/276 exact, 0 partial / 0 staged, 66 unsupported**. MOVE_INGRAIN receives no exact or sibling credit; the four-component `ingrain-roots-orbs` track is explicitly unfulfilled.
- **Did:** Pinned the exclusive `0x082d40e0..<0x082d4191` body, ROOTS/ORBS assets, OAM/animation programs, callbacks, audio, macro-expanded graph, and set-140 Lileep carrier. Added legal complete three-mon bilateral Scene-ON stages, source-relative root/orb reducer, typed seam, dense probe/evidence verifier, raw-RGB archives, and change maps—with no engine/core draw path.
- **Verified:** Player-back frames **205..368** and opponent-front **293..456** retain **164** consecutive rows each through first inactive cleanup and repeat byte-identically fresh (dense `159dc54a…` / `0799cd68…`; RGB sequences `e680d6b1…` / `712043b5…`). Both orientations fit every root/orb row, allocation/order, callback/frame/flicker lifecycle, tags, audio, source-pointer parity, and source reducer/seam state. OAM, matrices, and faded palettes are RAM+1 **163/163**; gameplay state/RNG are invariant, animation RNG changes **163** times, and registers do not change.
- **Next:** Deterministically extract the ordinary ROOTS/ORBS assets and implement the generic source-derived compositor/draw wiring, then require twice-fresh bilateral live framebuffer equality before independent Ingrain promotion.
- **Notes:** `ANIMATION_LATCHES.md`, animation import/unsupported barriers, `battleScene.ts`, and `core.ts` are unchanged. Focused audit/evidence/reducer/ratchet checks, typecheck, animation audit/coverage, full **1,134-file / 10,489-test** suite, and **719-module** build are green.

# MOVE_RECYCLE bilateral exact production presentation (2026-08-25 worker)

- **State:** Level 50 advances **209→210/276 exact**, remains **0 partial / 0 staged**, and drops **67→66 unsupported**. MOVE_RECYCLE alone promotes and `recycle-arrow` is fulfilled; Super Fang and all other siblings retain independent status.
- **Did:** Deterministically extracted the pinned 64x64 `ANIM_TAG_RECYCLE` indexed art/palette. Extended the typed Scene-ON production seam with generic live species/sides/geometry, front/back atlas lookup, affine-normal ObjBlend sampling, live BLDALPHA over the monbg copy, predecessor OAM/matrix/palette transfers, the full `BlendMonInAndOut` white ramp, ordinary battler/chrome layers, and cleanup—without gameplay item/RNG/damage/controller ownership, pair gates, recordings, absolute ticks, or coordinate/RGB fitting.
- **Verified:** Both legal Porygon/Sitrus versus Gyarados orientations pass **203/203** retained source/component/seam/raw-RGB and actual `core.ts → renderSceneOnMovePresentation` framebuffer rows through first inactive cleanup: **406/406 total, zero residual pixels**, repeated in two deterministic production-render passes against retained twice-fresh byte-identical sequences. OAM/palette/ongoing matrices remain RAM+1 **202/202** each; age 10 is blank and the fresh affine first paints at age 11. Gameplay RNG remains invariant, animation RNG changes **200** times, and a non-carrier ARON/GROVYLE geometry control renders through the same generic seam.
- **Next:** Select the next bounded unsupported move/component track; do not infer sibling acceptance from Recycle's shared commands.
- **Notes:** `ANIMATION_LATCHES.md` and the animation import/unsupported barriers are unchanged. Super Fang remains the exact `BlendMonInAndOut` control. Focused source/reducer/evidence/framebuffer/control, typecheck, audit/coverage, and diff checks are green; full suite is **1,131 files / 10,484 passed / 224 skipped**, and build is green at **718 modules**.

# MOVE_SMELLING_SALT bilateral exact production presentation (2026-08-25 worker)

- **State:** Level 50 advances **208→209/276 exact**, remains **0 partial / 0 staged**, and drops **68→67 unsupported**. MOVE_SMELLING_SALT alone promotes and `smelling-salt-hand-squish-effect` is fulfilled; Encore, Helping Hand, Facade, Screech, and Metal Sound retain independent exact status with no sibling credit.
- **Did:** Deterministically extracted the exclusive SMELLINGSALT_EFFECT art/palette and byte-checked the reused TAG_HAND tiles 16..31 against Encore instead of duplicating them. Added the narrow typed Scene-ON seam and ordinary generic live-species compositor with source positions, front/back geometry, OAM painter order/hFlip, two target squishes, short ShakeMon2, exclamation visibility, generic shadow/chrome/healthboxes, and cleanup. No pair/evidence gate, production recording/RGB lookup, absolute battle tick, or gameplay/damage/RNG/controller/turn/round/facility ownership was added.
- **Verified:** Player-back and opponent-front each pass **121/121** retained source/reducer/seam/raw-RGB/normalized-change-map and actual `core.ts → renderSceneOnMovePresentation` framebuffer rows through first inactive cleanup: **242/242 total, zero residual pixels**. A third fresh Scene-ON replay per orientation is byte-identical for all dense state and **121/121** per-row raw RGB hashes. OAM/palette RAM+1 remain **120/120** each; complete affine matrices and task-owned squish state fit RAM+2 **119/119 eligible**.
- **Next:** Select the next bounded unsupported move/component track; do not infer acceptance from TAG_HAND or ShakeMon2 reuse.
- **Notes:** `ANIMATION_LATCHES.md` stays unchanged because the measured prepared-affine split confirms its existing class. Source/evidence/reducer/seam/framebuffer/control/boundary/inventory, typecheck, animation audit/coverage, full tests, build, and diff checks are green at handoff.

# MOVE_SMELLING_SALT bilateral source/reducer evidence checkpoint — unsupported (2026-08-25 worker)

- **State:** Level 50 remains **208/276 exact, 0 partial / 68 unsupported**. MOVE_SMELLING_SALT receives no exact or move-acceptance credit; Encore, Helping Hand, Facade, Screech, and Metal Sound retain their independent statuses.
- **Did:** Pinned the six-component source graph and true lowest Level-50 carrier, set 376 GRANBULL_1. Added complete legal three-mon bilateral stages, a narrow generic dense probe wrapper, raw-RGB archives, a twice-fresh receipt, and a pure source-age reducer for both hand callbacks, the two SmellingSaltsSquish affine passes, exact short ShakeMon2 source schedule, exclamation blinks, and cleanup.
- **Verified:** Player-back and opponent-front both retain frames **218..338 (121/121)** through first inactive cleanup and reproduce byte-identically twice fresh. Reducer/component acceptance is **121/121 each**. OAM and palette are RAM+1 **120/120**; complete matrices are RAM+2 **119/119 eligible** (RAM+1 only 96/120). Gameplay RNG/state are invariant; animation RNG changes **120/120**.
- **Next:** Deterministically extract `smellingsalt_effect.png` while reusing and byte-checking Encore's TAG_HAND tiles 16..31, add the typed Scene-ON seam and ordinary generic live-species compositor, generate normalized bilateral change maps, and require actual `core.ts -> renderSceneOnMovePresentation` **242/242 zero-residual** rows twice fresh before promotion.
- **Notes:** `ANIMATION_LATCHES.md` is unchanged: the prepared-affine RAM+2 plus ordinary OAM/palette RAM+1 split confirms the existing Defense Curl class rather than establishing a new mechanism. No boundary/barrier widening, production recording import, absolute tick/pair gate, or gameplay ownership was added.

# Animation supervisor session — four exact promotions, clean handoff (2026-08-25)

- **State:** Level 50 advances **204→208/276 exact**, remains **0 partial / 0 staged**, and drops **72→68 unsupported**. MOVE_SWEET_SCENT, MOVE_DEFENSE_CURL, MOVE_MEAN_LOOK, and MOVE_SCREECH each have independent complete bilateral production acceptance; no sibling credit was inferred.
- **Did:** Merged current master at session start, rebuilt the stale gitignored Rust WASM prerequisite, then dispatched, independently audited, and merged one bounded Animation worker at a time. Sweet Scent, Defense Curl, and Mean Look each landed evidence plus exact-production rounds; Screech landed one capped but clean three-commit exact round after independent supervisor verification. All disposable worker worktrees and branches are removed.
- **Verified:** Final merged `npm test` passes **1,122 files / 10,452 tests** with 44 files / 223 tests skipped; `npm run build` passes **714 modules**. Coverage is **208 exact / 68 unsupported**. Fresh Scene-ON evidence reproduces Mean Look's **342/342** and Screech's **126/126** zero-residual core framebuffer acceptance; focused controls, typecheck, audit, coverage, inventory, ratchets, and diff checks are green.
- **Next:** Start one bounded MOVE_SMELLING_SALT increment: it is the smallest ranked unsupported Level-50 body at **14 source lines / 4 new components** (`ANIM_TAG_SMELLINGSALT_EFFECT`, `gSmellingSaltExclamationSpriteTemplate`, `gSmellingSaltsHandSpriteTemplate`, `AnimTask_SmellingSaltsSquish`). Require complete bilateral dense evidence and ordinary zero-residual production acceptance before credit.
- **Notes:** No animation boundary or unsupported-barrier widening, canonical-recording production import, absolute-tick/evidence-pair gate, gameplay/RNG/controller/turn/round/facility ownership, main-program doc edit, or animation deferral was added.

# MOVE_SCREECH bilateral exact production presentation (2026-08-25 worker)

- **State:** Level 50 advances **207→208/276 exact**, remains **0 partial / 0 staged**, and drops **69→68 unsupported**. MOVE_SCREECH alone promotes; the `purple-ring-screech` track is fulfilled. MOVE_SUPERSONIC and MOVE_METAL_SOUND remain independent exact controls.
- **Did:** Audited the complete `Move_SCREECH` interval **0x082c9a19..<0x082c9a66** (77 bytes), its five-component graph, and lowest legal Level-50 carrier set **115 FRONTIER_MON_VOLTORB**. Added deterministic Purple Ring extraction, a pure source-age reducer, typed Scene-ON seam, and ordinary generic front/back compositor with both source rings, Screech's own ShakeMon2/SwayMon schedules, source painter order, live species/sides/geometry/health chrome, and the generic elevated-opponent pointer-entry shadow. No gameplay, RNG, turn, round, facility, pair-gate, recording, RGB/framebuffer lookup, or absolute-tick ownership changed.
- **Verified:** Twice-fresh Scene-ON legal-party receipts retain player-back **72..134** and opponent-front **76..138**, **63 consecutive rows each** through first inactive cleanup. Dense/raw sequence receipts are player `ee7b444d…` / `9bad150c…`, opponent `55b1638c…` / `67428ea0…`. Each move-owned hardware OAM, affine-matrix, and palette row equals the preceding source buffer on **62/62** comparable rows; gameplay RNG is invariant and animation RNG changes **62/62**. Retained component/seam/raw-RGB and actual `core.ts → renderSceneOnMovePresentation` output are **126/126**, zero residual pixels. Source audit, extraction, focused Screech plus Supersonic/Metal Sound controls, typecheck, animation audit/coverage, full tests, build, and diff check are green.
- **Next:** Select the next bounded unsupported move; do not infer acceptance from Screech's purple-ring or shared task components.
- **Notes:** `ANIMATION_LATCHES.md` is unchanged: Screech independently confirms the existing ordinary RAM+1 OAM/matrix/palette transfer and generic opponent elevated-shadow pointer-entry behavior, but proves no new latch class.

# MOVE_MEAN_LOOK bilateral exact production presentation (2026-08-25 worker)

- **State:** Level 50 advances **206→207/276 exact** and **70→69 unsupported**. MOVE_MEAN_LOOK alone promotes; the `mean-look-eye` track is fulfilled. Perish Song and Confuse Ray remain independent exact controls.
- **Did:** Completed the ordinary shared Scene-ON compositor through the typed seam using source EYE art, live species/sides/geometry, generic front/back battlers, target monbg copy/clear, whole-field F_PAL_BG ramps, eye affine/visibility/wobble/alpha, source painter priority, field chrome, and cleanup. The reducer records source-relative field/BLDALPHA display edges; no pair gate, recording/RGB lookup, absolute tick, or gameplay ownership was added.
- **Verified:** Retained player-back **71..241 (171/171)** and opponent-front **75..245 (171/171)** rows match actual `core.ts → renderSceneOnMovePresentation` output: **342/342 total, zero residual pixels** through first inactive cleanup. Source/evidence/extractor, direct framebuffer, controls, boundary/frontier/inventory, typecheck, animation audit/coverage, full tests, build, and diff-check are green. Fresh Scene-ON probe receipts remain player `f7fbe24c…` / `cda741ed…`, opponent `c76f2d61…` / `4cde21d0…`.
- **Next:** Select the next bounded animation component track; do not infer sibling credit from Mean Look's shared compositor.
- **Notes:** OAM and whole affine matrices are RAM+1 **170/170**; palette is RAM+1 **169/170** with age-4 monbg setup as the sole same-row exception. BLDALPHA's source-relative opaque interval and measured transition edges are preserved in `ANIMATION_LATCHES.md`. No boundary/barrier widening or main-program docs changed.

# MOVE_DEFENSE_CURL bilateral exact production presentation (2026-08-24 worker)

- **State:** Level 50 advances **205→206/276 exact**, remains **0 partial / 0 staged**, and **71→70 unsupported**. MOVE_DEFENSE_CURL alone promotes; `defense-curl-source-component` is fulfilled. Perish Song, Iron Tail, and Poison Tail retain independent exact control status.
- **Did:** Added the pure `defenseCurlAtAge` reducer and typed Scene-ON seam, then the ordinary shared framebuffer path using source ECLIPSING_ORB art/cells/hFlip, typed live species/sides/picture coordinates/geometry, generic battle-mon art, grayscale/original palette, source painter order, chrome, tags, audio lifecycle, and cleanup. The live deformer uses source `MON_PIC_HEIGHT - 2*y_offset` math and the move's RAM+2 affine/matrix/y2 handoff; ordinary OAM flags and palette use RAM+1.
- **Verified:** Actual `core.ts -> renderSceneOnMovePresentation` equality is **100/100 player-back + 100/100 opponent-front = 200/200**, zero residual pixels, through first inactive cleanup. Retained source/evidence/extractor, reducer/seam, direct framebuffer, palette controls, and generic ARON→GROVYLE geometry tests pass. Fresh local mGBA probes via `run-mgba-probe.py` reproduce player dense/raw `0a249e0ff986db699a58759bfcd92b7959e4915cedebfc3bb8e0c5ba179462eb` / `9aae1f9082f39518d325e0aec6299caba7cedc2cbd37692f39129ead9f52966e` twice and opponent `f66fcbd36ff3a23c315ba1a6237494a14a3a072bcef236e24df0b6751e1aa988` / `bac309f561304b7c4795210e89d667529c6b28d72320ce92d201bc10389600ad` twice.
- **Next:** Defense Curl is complete; select the next bounded Animation coverage component without inferring sibling acceptance.
- **Notes:** Existing evidence/latch checkpoint and `ANIMATION_LATCHES.md` row remain intact. No animation boundary/unsupported-barrier widening, canonical recording import, absolute-tick/evidence-pair gate, or gameplay/RNG/controller/turn/round/facility ownership changed.

# MOVE_DEFENSE_CURL bilateral dense evidence/latch checkpoint — remains unsupported (2026-08-24 worker)

- **State:** Coverage remains **205/276 Level-50 exact, 0 partial, 0 staged, 71 unsupported**. Defense Curl receives no reducer, seam, compositor, framebuffer, exact, or sibling credit; its new component track is explicitly unfulfilled. Perish Song, Iron Tail, and Poison Tail remain exact controls with no coverage change.
- **Did:** Added complete legal set-120 PHANPY three-mon Scene-ON stages and retained player-back **214..313 (100 rows)** plus opponent-front **215..314 (100 rows)** through first inactive cleanup, twice fresh byte-identically. Dense archives retain raw RGB, full software/hardware OAM and matrices, faded/unfaded/hardware palettes, tasks/sprites/tags/registers/audio, parties/engine/immutable state, gameplay RNG, and animation RNG; normalized bilateral change maps and a deterministic ECLIPSING_ORB extractor are banked. The pointer interval is **0x082cb37c..<0x082cb3b5 (57 bytes)** with observed even+odd pointers.
- **Measured:** Both sides have deform-task RAM ages **4..54**, orb RAM ages **56..97**, first inactive age **99**, OAM+affine flags RAM+1 **99/99**, palette RAM+1 **99/99**, and complete matrix RAM+2 **98/98**. Matrix source/display edges are first deform **4/6**, neutral return **53/55**; affine flags clear source/display **55/56**. Gameplay state/RNG are invariant; animation RNG changes **99/99**; SE_M_TRI_ATTACK begins at age 4 and its loop task ends at 41.
- **Next:** Implement the pure source-age reducer, typed Scene-ON seam, and ordinary compositor using live battlers/source art, then require **200/200 zero-residual production framebuffer rows** twice fresh before Defense Curl alone promotes.
- **Notes:** Dense JSON hashes are player `0a249e0f…`, opponent `f66fcbd3…`; raw RGB sequences `9aae1f90…` / `bac309f5…`; normalized maps `015b4b5a…` / `bc68baef…`. No animation boundary, unsupported barrier, engine draw case, canonical recording import, or gameplay owner changed.

# MOVE_SWEET_SCENT bilateral exact production presentation (2026-08-24 worker)

- **State:** Level 50 advances **204→205/276 exact**, remains **0 partial**, and **72→71 unsupported**. MOVE_SWEET_SCENT alone promotes and the one-move `pink-petal-sweet-scent` track is fulfilled; Confuse Ray and Stun Spore receive no credit.
- **Did:** Added deterministic source extraction for the exact PINK_PETAL gfx/palette and wired the existing pure reducer/typed seam into the ordinary shared Scene-ON framebuffer. The narrow draw case consumes typed live species/sides/geometry, generic front/back battle-mon art, source picture coordinates, field chrome, all 24 source allocation slots and OAM painter order, four 8-tick cells with hFlip/vFlip, side-relative paths/audio, the measured delay-1 defender palette cycle (including BlendColorCycle's forced final return to zero), tags, and cleanup. It adds no carrier-pair gate, recording/RGB/framebuffer lookup, absolute tick, or gameplay/RNG/controller/turn/round/facility ownership.
- **Verified:** Retained player-back and opponent-front frames **222..396** pass the actual `core.ts -> renderSceneOnMovePresentation` production framebuffer **175/175 each, 350/350 total, zero residual pixels** through first inactive cleanup. The existing twice-fresh dense/raw evidence, **166/166** reducer/typed-seam effect windows, 24 creations, 13-petal peak, first RAM/display rows **4/5**, **174/174** OAM/matrix/palette predecessor latches, no-monbg result, invariant gameplay RNG/state, and **174/174** animation-RNG changes remain pinned.
- **Checks:** Focused source extraction, evidence, framebuffer, boundary/frontier and coverage tests; direct 350-row verifier, typecheck, animation audit/coverage, full `npm test`, production build, and `git diff --check` pass. Supervisor review corrected the exported timing descriptor so its source-forced zero target is on the fifth/final leg (production already used the separately pinned exact schedule), then reran the merged gates. `ANIMATION_LATCHES.md`, animation boundary/unsupported-barrier lists, canonical-recording imports, and named controls remain unchanged.

# MOVE_SWEET_SCENT bilateral dense Scene-ON evidence/latch checkpoint — partial (2026-08-24 worker)

- **State:** Level 50 remains **204/276 exact, 0 partial, 72 unsupported**; MOVE_SWEET_SCENT receives no exact, coverage, or sibling credit. The pink-petal track remains partial and non-promoting.
- **Did:** Retained complete pointer-owned Battle Scene ON windows **175/175 each**, player-back and opponent-front frames **222..396**, twice fresh and byte-identical through the first inactive script row. The full dense rows include script/task/sprite/software+hardware OAM/matrix/faded+hardware palette/tags/registers/audio/battler/party/immutable/gameplay-RNG/animation-RNG state, raw RGB archives, and normalized change maps. The source-relative petal effect subwindow is local rows **4..169 = 166/166 each**; reducer and typed seam both replay **166/166 per orientation**.
- **Measured:** Both orientations create **24 petals**, peak at **13**, show the first petal in RAM at local row **4** and first own RGB display edge at local row **5**. Hardware OAM, matrices, and palette equal preceding software/faded rows **174/174**; no same-row palette exception and no `monbg` command occur in the assigned graph. Gameplay RNG/state remain invariant; animation RNG changes **174/174**.
- **Next:** Source-art extraction, ordinary shared compositor wiring, and bilateral framebuffer comparison/zero-residual checks remain for a later promotion round. Do not promote MOVE_SWEET_SCENT or claim sibling credit.
- **Notes:** `ANIMATION_LATCHES.md` is unchanged: the measured all-row RAM+1 OAM/palette transfer agrees with existing latch classes; Sweet Scent has no task-driven axis or monbg handoff to extend the ledger. Evidence is source/latch only, not framebuffer acceptance.

# MOVE_SWEET_SCENT source/reducer + bilateral Scene-ON staging checkpoint — partial (2026-08-23 worker)

- **State:** Level 50 remains **204/276 exact, 0 partial, 72 unsupported** in the move ledger; MOVE_SWEET_SCENT receives no exact or coverage credit. A new non-exclusive `pink-petal-sweet-scent` track records this bounded partial only; no sibling credit is claimed.
- **Did:** Added the source-relative `sweetScent.ts` reducer and typed `sceneOnSweetScentView` seam for the four assigned components: `ANIM_TAG_PINK_PETAL`, `gSweetScentPetalSpriteTemplate`, `SweetScentEffect`, and `blend_color_cycle`. The reducer models the source's 24 expanded edge-to-edge petals, side-relative callback motion, 8-frame animation, blend legs, audio, tags, resource cleanup, and 166-row first-inactive boundary without species-pair gates, absolute ticks, gameplay/RNG/controller/turn/round/facility state, or production recordings.
- **Verified:** The authoritative interval is `0x082d4c86..<0x082d4d70` (**234 bytes**); the lowest legal Level-50 carrier is set **165 WEEPINBELL_1**. Complete bilateral three-mon Scene-ON parties are staged in both orientations. The first probe observes a 13-petal peak and the reducer pins **166 source-relative rows / first inactive age 165**; source, carrier, seam, and staged-party tests pass.
- **Remainder:** This is intentionally an honest reusable checkpoint, not exact acceptance. Dense consecutive script/task/sprite/OAM/matrix/palette/tag/register/audio/immutable/RNG rows, raw RGB/change maps, a second fresh run, reproducible source art, ordinary shared compositor wiring, and zero-residual bilateral framebuffer comparison remain. The checkpoint explicitly records `coverageCredit:false`, `productionFramebufferCompared:false`, and `zeroResidual:false`.
- **Checks:** Supervisor verified the 24-create source expansion, set-165 Weepinbell carrier, carrier-named bilateral fixtures, non-crediting coverage semantics, and generic probe extension. Focused source/reducer/seam/boundary/frontier tests, typecheck, animation audit, full **10,278-test** suite, and **707-module** build pass. No boundary list, unsupported barrier, latch ledger, engine draw case, or sibling status changed. **Next:** retain the complete dense bilateral window and measure all display latches before any production promotion.

# MOVE_BELLY_DRUM bilateral production-framebuffer exact (2026-08-23 worker)

- **State:** Level 50 advances **203→204/276 exact**, **1→0 partial**, remains **72 unsupported**, and the move queue is empty. MOVE_BELLY_DRUM alone promotes; MOVE_SING, MOVE_TEETER_DANCE, MOVE_FAKE_TEARS, and MOVE_GRASS_WHISTLE remain independent exact controls and receive no sibling credit.
- **Production:** Added reproducibly extracted `ANIM_TAG_MUSIC_NOTES` rainbow palettes and `ANIM_TAG_PURPLE_HAND_OUTLINE` art, plus the ordinary shared Scene-ON draw case. It consumes typed live species/sides/geometry, generic front/back art, all six source hand/note paths, persistent note allocation order, runtime palette rows, source panned audio, field chrome, inactive cleanup, and `AnimTask_ShakeMon`'s measured source +8 y displacement at display RAM+1. There is no species-pair gate, embedded carrier art, absolute tick, recording import, gameplay HP/stat/damage/status/RNG/controller/turn/round/facility ownership, boundary widening, or new barrier/latch.
- **Evidence:** The strict offline verifier reads both committed 110-row dense/raw banks, validates every lifecycle, normalized change map, archive/row/sequence hash, OAM/matrix/palette RAM+1 transfer, typed seam, and the actual `core.ts -> renderSceneOnMovePresentation` production framebuffer. Player-back **231..340** and opponent-front **211..320** pass **110/110 each, 220/220 total, zero residual pixels** through first inactive cleanup. A third fresh local-mGBA run per orientation is byte-identical to the committed dense/raw archives. The checkpoint's raw sequence receipt convention was corrected to actual concatenated RGB888 hashes `12c5b3de…` / `91196f4e…`; archive contents were already identical and were not replaced or thinned.
- **Checks:** Focused Belly Drum reducer/evidence/framebuffer **8/8**, named music-note sibling + boundary/frontier controls **61/61**, all changed coverage ratchets **124/124**, typecheck, deterministic source extractor/audit, animation audit, direct **220/220** framebuffer verification, coverage **204 exact / 0 partial / 72 unsupported**, and `git diff --check` pass. Full `npm test` passes **1,107 files / 10,274 passed / 44 files and 223 tests skipped**; production build passes **706 modules**.

# MOVE_BELLY_DRUM bilateral dense source/component checkpoint — partial (2026-08-23 worker)

- **State:** Level 50 is **203/276 exact, 1 partial, 72 unsupported**. MOVE_BELLY_DRUM alone is queued; MOVE_SING, MOVE_TEETER_DANCE, MOVE_FAKE_TEARS, and MOVE_GRASS_WHISTLE retain independent statuses. No exact or compositor claim is made.
- **Evidence:** Complete legal Poliwrath set 367 (the lowest legal Level-50 Belly Drum carrier) plus complete legal three-mon parties retain Scene-ON player-back **231..340** and opponent-front **211..320**, **110 consecutive rows each** through first inactive cleanup. Both orientations repeat twice fresh byte-identically. Raw-RGB sequence hashes are player `5f65aa09…` and opponent `076634b8…`; normalized maps and dense state/raw-RGB archives are banked.
- **Source/reducer:** The pointer-bounded interval is `0x082cf4d9..<0x082d15ac` (**8403 bytes**, SHA-256 `545ca529…e33455e`). The source audit pins all nine graph components, six alternating hand/note hits, six `AnimTask_ShakeMon` tasks, six slow-note argument tuples, attacker-pan cues, rainbow blend/clear, allocation/cleanup, and SE id 185. `src/animation/bellyDrum.ts` plus the typed `sceneOnBellyDrumView` seam cover the complete source-relative reducer window without HP cost, stat stages, damage/status, battle/controller/turn/round/facility state, or gameplay RNG ownership.
- **Latches:** Ordinary created-sprite OAM and faded-palette transfer are RAM+1; `AnimTask_ShakeMon` is RAM+1. No distinct Belly Drum latch was found, so `ANIMATION_LATCHES.md` is unchanged.
- **Remainder / next:** The ordinary shared compositor and framebuffer comparator are intentionally not claimed. The precise remainder is source-derived hand/music-note art, runtime rainbow palette hardware transfer, live battler/chrome draw wiring, and bilateral production residuals for all 220 rows. Do not promote Belly Drum or alter sibling/component-track credit until those rows pass zero residual twice fresh.
- **Checks:** Supervisor independently reproduced both fresh windows and raw-RGB sequence hashes, then passed the source audit, all retained reducer/latch rows, named music-note siblings, boundary/frontier ratchets, coverage, and animation audit. Worker and post-merge finish gates are green: typecheck, **10,271 passed / 223 skipped**, and build **705 modules**.

# MOVE_TEETER_DANCE bilateral exact production presentation (2026-08-23 worker)

- **State:** Level 50 advances **202→203/276 exact**, **1→0 partial**, and remains **73 unsupported**. MOVE_TEETER_DANCE alone promotes; the `music-notes` track is fulfilled by its accepted representatives. MOVE_SING, MOVE_BELLY_DRUM, MOVE_FAKE_TEARS, and MOVE_GRASS_WHISTLE retain their independent pre-existing statuses.
- **Corrective evidence:** The prior fixture mislabeled numeric species **327** as Spinda; pinned Emerald source defines `SPECIES_SPINDA=308` and `SPECIES_CRAWDAUNT=327`, and its raw framebuffers visibly contained Crawdaunt. Both legal set-145 fixtures now inject 308, retain live personality, and were regenerated twice per orientation through `tools/run-mgba-probe.py`. Player-back dense/raw hashes are `933ed0c5…` / `ccd393f0…`; opponent-front hashes are `e37d7247…` / `8fd824fa…`; both pairs are byte-identical fresh.
- **Verified:** The source/reducer facts remain **169/169 per orientation**, **235/235** note/OAM/matrix rows, and **168/168** preceding palette transfers. The strict reusable comparator verifies every raw-row SHA, both sequence hashes, both normalized change maps, and the shared production framebuffer at **169/169 player-back + 169/169 opponent-front = 338/338**, zero residual pixels through inactive cleanup. Both fresh run pairs independently rerun the same comparator at **338/338, residual 0**.
- **Presentation fixes:** `AnimTask_TeeterDanceMovement` live-battler writes scan out at source age−2; fast notes remain ordinary age−1 OAM/current transferred affine. Subpriority-2 notes paint ahead of both live attacker orientations. Opponent-front Spinda reuses the existing source-derived `DrawSpindaSpots` port with typed live personality and generic catalog art; no species-pair/evidence gate, recorded framebuffer, gameplay state, boundary, or unsupported barrier was added.
- **Checks:** Focused Teeter/named sibling/boundary tests, source/reducer/framebuffer audits, twice-fresh probes and comparisons, typecheck, coverage/audit, smoke, full `npm test`, production build, and diff-check pass. `ANIMATION_LATCHES.md` records only Teeter Dance's own age−2 live-battler task finding.

# MOVE_TEETER_DANCE bilateral dense source/component checkpoint — partial (2026-08-22 worker)

- **State:** Level 50 is **202/276 exact, 1 partial, 73 unsupported**. MOVE_TEETER_DANCE is the sole queued increment; its music-notes component track is partial. MOVE_SING, MOVE_BELLY_DRUM, MOVE_FAKE_TEARS, and MOVE_GRASS_WHISTLE retain their independent pre-existing statuses.
- **Did:** Added a source-relative `teeterDance.ts` reducer, typed Scene-ON seam, reproducible MUSIC_NOTES/DUCK and carrier-art extraction, legal bilateral fixtures, source audit, and a generic Battle Scene ON draw case. The reducer ports the five fast-note paths, signed side geometry, two-slot reuse, affine program, five attacker-pan cues, live-battler TeeterDance task phases, preceding transfer latches, and inactive cleanup without gameplay/status/RNG/turn/facility ownership. Supervisor review removed carrier-specific production art selection and silent Onix fallback; all production battler art now comes from typed live species or fails explicitly.
- **Verified:** The exact source interval is `0x082ce78d..<0x082ce7f8` (107 bytes, SHA-256 `5dd532744b7f9bff1f8a88567122573d7da66e956961db734f56119247b21572`), carried by SPINDA set 145. Complete retained rows are **169/169 player-back** (`227..395`) and **169/169 opponent-front** (`222..390`), and both orientations reproduce twice-fresh byte-identically: dense `2054b48b…` / `b9ce33a2…`, raw RGB `5087f54b…` / `8e25beb6…`. The committed `teeterDanceReducerAudit.ts` independently replays all **338/338** reducer rows plus **235/235** relevant note/OAM/matrix rows and **168/168** faded-palette transfers per orientation; normalized change maps are banked.
- **Remainder:** The ordinary compositor seam is wired, but production framebuffer comparison has not yet run. The next action is to replay both complete retained orientations through the app twice fresh and require **169/169 + 169/169 zero-residual** framebuffers before promotion. No boundary, unsupported barrier, latch file, or sibling status changed.
- **Checks:** Focused Teeter/named-control/boundary/frontier gates pass (including **23** post-review reducer/inventory/boundary tests), the affected ledger tests pass (**33 tests**), smoke passes (**444 tests**), coverage/audit and source extraction are green, `npm run typecheck` passes, full `npm test` passes (**1,103 files / 10,260 passed / 223 skipped**), and `npm run build` passes (**704 modules**). No barrier or boundary list changed.

# MOVE_SPIKES bilateral exact production presentation (2026-08-22 worker)

- **State:** Level 50 advances **201→202/276 exact**, **1→0 partial**, and remains **74 unsupported**. MOVE_SPIKES alone promotes; `spikes-target-arc` is fulfilled. MOVE_MEGAHORN and MOVE_SPIKE_CANNON remain independent controls.
- **Did:** Added the pure source-relative `spikes.ts` reducer, narrow typed `SceneOnSpikesConfig` seam, reproducible ANIM_TAG_SPIKES extraction, and generic Battle Scene ON compositor. It models cursor/RNG, all three source target arcs, affine-off OAM, tags/palette transfer, monbg/update/cleanup tasks, audio, source painter order, chrome, and inactive cleanup without hazard gameplay or recorded-framebuffer lookup.
- **Verified:** Existing twice-fresh Scene-ON evidence remains byte-identical: player-back **67..180** and opponent-front **71..184**, **114/114** each. Reducer/seam and shared production framebuffer each pass **114/114 + 114/114 = 228/228**, with **zero residual pixels** through inactive age 113. Predecessor OAM/matrix latches remain **113/113** per side; palette remains **112/113** plus only the age-4 monbg same-row handoff.
- **Checks:** Focused Spikes/Spike Cannon/ledger/boundary/executable-frontier gates pass (**40 tests**); coverage reports **202/276 exact, queue empty** and animation audit passes. `npm run typecheck`, full `npm test` (**1,102 files / 10,254 passed / 223 skipped**), `npm run build` (**702 modules**), and `git diff --check` pass. `ANIMATION_LATCHES.md`, boundary lists, unsupported barriers, and gameplay ownership are unchanged. Production and coverage-ratchet commits are `03e50ee0` and `ad086223`.

# MOVE_WISH exact acceptance rehabilitated — complete bilateral Scene-ON proof (2026-08-22 worker)

- **State:** Coverage remains **201/276 Level-50 exact**, 0 partial, 0 staged, and 75 unsupported because Wish already had a premature historical `exact` row while its component-track contract still named it unsupported. MOVE_WISH alone now genuinely satisfies that row, and `sparkle-2-granting-stars` is fulfilled; Synthesis, Heal Bell, Refresh, Aromatherapy, and Cosmic Power retain independent existing credit only.
- **Did:** Removed the forbidden Illumise/Onix production gate and embedded Illumise art, switching Wish to typed live species/sides/geometry plus shared generic front/back art and chrome. Expanded the v2 probe to retain complete task/sprite/software+hardware-OAM/matrix/palette/tag/BG/register/audio/party/engine/gameplay-RNG/animation-RNG state, and banked bilateral normalized change maps. The pure source reducer still owns one WishStar, 21 mini stars, two GrantingStars, both F_PAL_BG black ramps, side-relative audio, tags, and cleanup without delayed-heal/gameplay/controller/turn/round/facility ownership.
- **Verified:** Twice-fresh complete player-back **65..335 (271/271)** and opponent-front **69..339 (271/271)** runs pass reducer/source-component/typed-seam/raw-RGB/shared-production-framebuffer equality with zero residual pixels through first inactive cleanup (**542/542 per fresh pass**). Dense hashes are `6693ded4…` / `b1ec1f23…`, raw RGB remains `2f82ec07…` / `f858c38f…`, and maps are `8fc52ed8…` / `e13e9ebf…`. Gameplay RNG and battle state are invariant; animation RNG transitions 270 times; OAM, matrices, and palette are each preceding-row **270/270** bilaterally.
- **Checks:** Wish source/assets/evidence/reducer/generalized-framebuffer checks, all five named sibling controls (**50/50 focused**), boundary/forbidden-import/unsupported-branch ratchets, animation coverage/audit, typecheck, `git diff --check`, full `npm test` (**1,099 files / 10,243 passed / 223 skipped**), and production build (**700 modules**) pass. No new or contradictory latch was found, so `ANIMATION_LATCHES.md` remains unchanged.

# MOVE_HAIL bilateral exact production presentation (2026-08-22 worker)

- **State:** Coverage advances **200→201/276 Level-50 exact**, **1→0 partial**, and remains **75 unsupported**. MOVE_HAIL alone promotes, the queue is empty, and `hail-weather` alone is fulfilled; Rain Dance, Ice Punch, Blizzard/Icy Wind, Crabhammer, Haze, and Tri Attack remain independent controls with no new credit.
- **Did:** Added reproducible ANIM_TAG_HAIL extraction and the ordinary shared Battle Scene ON compositor behind `sceneOnHailView`, reusing the existing source-composed ICE_CRYSTALS sheet. It consumes typed live species/sides/OAM-derived geometry, generic back/front art, Hail's own 157/157 preceding OAM/matrix/palette latches, F_PAL_BG-only blending, allocator/y/slot painter order, affine matrices, field chrome, audio timing, and cleanup without framebuffer/RGB lookup, species/evidence gates, absolute ticks, or gameplay weather/status/damage/RNG/turn/round/facility ownership.
- **Verified:** Complete equality is **158/158 player-back + 158/158 opponent-front = 316/316 component/seam/raw-RGB/shared-production-framebuffer rows**, zero residual pixels through inactive age 157. Two fresh legal post-implementation Scene-ON probes per orientation reproduce player probe/raw hashes `266af0b2…` / `344ce985…` and opponent `0f933dd9…` / `2941da68…`, each **158/158 / residual 0**. Source interval stays `0x082cdc76..<0x082cdcae`; lifecycle stays 30 particles, four impacts, peak six falling/eight total; blend 7..32 + 130..155 and audio 34..113 remain exact.
- **Checks:** Hail source/evidence/reducer/framebuffer/asset/fresh verifiers, focused Hail + sibling-control + ratchet tests, animation coverage/audit, boundary/forbidden-import/unsupported-branch ratchets, typecheck, full `npm test`, production build, and diff-check pass. `ANIMATION_LATCHES.md` and boundary lists remain unchanged.

# MOVE_HAIL source-relative reducer + typed Scene-ON seam — partial (2026-08-22 worker)

- **State:** Coverage remains **200/276 Level-50 exact** and **1 partial / 75 unsupported**. MOVE_HAIL remains queued; `hail-weather` is now a non-exclusive partial track with no sibling or latch credit. `framebufferCompared` remains false.
- **Did:** Added `src/animation/hail.ts` and the narrow `SceneOnHailConfig`/`sceneOnHailView` seam. The reducer ports the source cursor/waits/args, animation RNG, both delayed palette ramps, Hail task state/data, looped sound task, ten three-affine particle groups, four impact-crystal callbacks, ascending OAM/matrix allocation/reuse, tags, software/hardware transfer latches, audio lifetime, and inactive cleanup without weather/status/damage/gameplay RNG/turn/round/facility ownership.
- **Verified:** `tools/compare/verifyHailReducer.ts` and `tests/animation/hailReducer.test.ts` pass **158/158 reducer + 158/158 typed-seam rows per orientation (316/316 total)** against the retained Scene-ON dense rows, including exact software OAM/affine matrices/palettes and first inactive age 157. Lifecycle is **30 particles, 4 impact crystals, peak 6 falling / 8 total effects**. Existing source/evidence/raw-RGB hashes and 157/157 latch facts remain unchanged; `ANIMATION_LATCHES.md` needs no edit.
- **Remainder:** Only ordinary source-derived compositor/draw wiring and twice-fresh complete **316/316 zero-residual production framebuffer equality** remain before Hail can promote. Rain Dance and Blizzard/Icy Wind remain controls only; no production import or framebuffer lookup was added.

# MOVE_OCTAZOOKA bilateral exact production presentation (2026-08-20 worker)

- **State:** Coverage advances **199→200/276 Level-50 exact**, **1→0 partial**, and remains **76 unsupported**. MOVE_OCTAZOOKA alone promotes, the queue is empty, and `octazooka-ball-smoke` alone is fulfilled; Mist, Smokescreen, siblings, and latches receive no new credit.
- **Did:** Added reproducible BLACK_BALL/GRAY_SMOKE source extraction and the ordinary shared Battle Scene ON compositor behind `sceneOnOctazookaView`. It uses typed live battler species/sides/OAM-derived geometry, generic back/front art lookup, preceding software OAM, source five-frame smoke animation, visibility and allocation/painter order, field chrome, audio timing, and cleanup without an Octillery/Onix gate, recorded RGB/framebuffer lookup, absolute ticks, or gameplay/status/damage/RNG/turn/round/facility ownership.
- **Verified:** Complete equality is **80/80 player-back + 80/80 opponent-front = 160/160 component/seam/raw-RGB/shared-framebuffer rows**, zero residual pixels through first inactive cleanup. Fresh legal post-implementation Scene ON probes and fresh framebuffer comparisons reproduce player evidence/raw hashes `24a4ec80…` / `5e0c8304…` and opponent `67294109…` / `81ea0024…`, each **80/80 / residual 0**. The ARON→GROVYLE geometry control renders generically; Mist and Smokescreen remain negative/regression controls.
- **Checks:** Source/evidence/reducer/framebuffer/asset validators, **28/28** focused move/control/ratchet tests, animation coverage/audit, boundary/forbidden-import ratchets, typecheck, full `npm test` (**1,080 files / 10,161 tests; 44 / 223 skipped**), `npm run build` (**698 modules**), and diff-check pass. `ANIMATION_LATCHES.md` and boundary lists remain unchanged.

# MOVE_OCTAZOOKA reducer + typed Scene-ON seam — partial (2026-08-20 worker)

- **State:** Coverage remains **199/276 Level-50 exact**, with **1 partial / 76 unsupported**. MOVE_OCTAZOOKA remains the sole queue item and `octazooka-ball-smoke` remains unfulfilled; no sibling or exact credit changes.
- **Did:** Added a pure source-relative reducer plus narrow `SceneOnOctazookaConfig`/`sceneOnOctazookaView` seam. It ports all **160 retained component rows**: cursor/waits/args, 20-step BLACK_BALL linear/followup/destroy lifecycle, four delayed 15-display GRAY_SMOKE lifecycles, allocator slots/order, source OAM/neutral matrices, tagged palette transfers, target/attacker-panned audio, animation RNG, and cleanup. It owns no blindness/status, damage, gameplay RNG, controller, turn, round, facility, species-pair, absolute tick, recording, or compositor behavior.
- **Verified:** Source interval remains `0x082d2b83..<0x082d2be9`, **102 bytes / `1c86b2d6…c0a9`**. Reducer and typed seam both pass **80/80 player-back + 80/80 opponent-front**; all three hardware latches remain **79/79** per orientation. Mist and Smokescreen reject the seam explicitly; an ARON→GROVYLE reversed-side/altered-geometry control activates from typed inputs. Existing twice-fresh evidence/raw hashes remain player `24a4ec80…` / `5e0c8304…`, opponent `67294109…` / `81ea0024…`. Source/evidence/reducer validators, focused controls, coverage/audit, boundary/forbidden-import ratchets, typecheck, full `npm test` (**1,079 files / 10,158 tests; 44 / 223 skipped**), and `npm run build` pass.
- **Remainder:** Only ordinary source-derived compositor/draw wiring and twice-fresh complete **160/160** production-framebuffer equality remain. `framebufferCompared` stays false; no draw wiring, framebuffer lookup/replay, promotion, boundary widening, or latch change was added.

# MOVE_OCTAZOOKA bilateral dense evidence checkpoint — partial (2026-08-20 worker)

- **State:** Coverage remains **199/276 Level-50 exact** and moves **0→1 partial / 77→76 unsupported**. MOVE_OCTAZOOKA alone is queued; the non-exclusive `octazooka-ball-smoke` track is evidence-only and unfulfilled. Existing latch/track credit and every sibling status remain unchanged.
- **Evidence:** Complete legal challenge-1 set-256 Octillery/Shell Bell parties with distinct held items and durable max-HP/max-SpDef Onix targets pass Scene-ON player-back **218..297** and opponent-front **217..296**, **80 consecutive rows each / 160 total** through first inactive cleanup. Each orientation repeats twice fresh byte-identically: probe hashes player `24a4ec80…` and opponent `67294109…`; raw-RGB sequences `5e0c8304…` / `81ea0024…`; change maps `f4d0b96f…` / `dc280a2f…`.
- **Source/runtime:** Exact half-open ROM interval `0x082d2b83..<0x082d2be9` is **102 bytes**, SHA-256 `1c86b2d6fc47a5825cd0e3f63d74c413d524eb025e09676de1e4d1851863c0a9`, with both pointer parities. Both sides pin exactly **1 ball + 4 smoke creates/destructs**, empty visual-task topology, `AnimTranslateLinear_WithFollowup`/`AnimSpriteOnMonPos`/`DestroyAnimSprite`, BLACK_BALL/GRAY_SMOKE tags, `SE_M_MEGA_KICK2` 141 and `SE_M_SELF_DESTRUCT` 177, **79/79** preceding OAM/matrix/palette latches, zero gameplay-RNG transitions, 79 animation-RNG transitions, immutable gameplay fields, and cleanup.
- **Checks:** Source/evidence validators, Octazooka + Smokescreen sibling controls, coverage/component/boundary/forbidden-import ratchets, animation audit, typecheck, and diff-check pass. Full `npm test` is green (**1,078 files passed / 44 skipped; 10,154 tests passed / 223 skipped**) and `npm run build` passes (**696 modules**).
- **Remainder:** Evidence only: **0/160 reducer, typed-seam, and production-framebuffer rows**. Add the source-relative reducer and narrow Scene-ON seam next, then the ordinary compositor and twice-fresh complete framebuffer equality before Octazooka alone may promote. No production import, gameplay/status/damage ownership, sibling credit, or exact claim was added.

# MOVE_LOVELY_KISS bilateral exact production presentation (2026-08-20 worker)

- **State:** Coverage advances **198→199/276 Level-50 exact**, **1→0 partial**, and remains **77 unsupported**. MOVE_LOVELY_KISS alone promotes, the queue is empty, and `devil-pink-heart-lovely-kiss` is fulfilled; Sweet Kiss, Attract, and sleep-family controls receive no credit or latch change.
- **Did:** Added reproducible source extraction for DEVIL and PINK_HEART art/palettes and the ordinary shared Battle Scene ON draw case behind `sceneOnLovelyKissView`. It uses typed live species/sides/battler geometry, generic back/front art lookup, the preceding software-OAM latch, source visibility, signed-y/allocation painter order, field chrome, and inactive cleanup without a Jynx/Onix gate, replay/RGB/framebuffer lookup, absolute ticks, or gameplay/status/RNG/turn/round/facility ownership.
- **Verified:** Complete shared-framebuffer equality is **153/153 player-back + 153/153 opponent-front = 306/306**, alongside **306/306 component/seam/raw-RGB rows**, with zero residual pixels through first inactive cleanup. Fresh legal post-implementation Scene-ON probes reproduce player probe/raw hashes `d7039abf…`/`6236f7e9…` and opponent `3687165a…`/`5b6f13eb…` byte-for-byte. An ARON→GROVYLE geometry control activates generically; Sweet Kiss, Attract, Sleep Powder, Sleep Talk, and Yawn remain independent controls.
- **Checks:** Lovely Kiss source/evidence/reducer/framebuffer validators and **27/27** focused move/control tests, animation coverage/audit, animation-boundary/forbidden-import/unsupported-branch ratchets, and typecheck pass. Full `npm test` is green (**1,077 files passed / 44 skipped; 10,151 tests passed / 223 skipped**) and the production build passes (**696 modules**). `ANIMATION_LATCHES.md` and boundary lists remain unchanged.

# MOVE_LOVELY_KISS reducer + typed Scene-ON seam — partial (2026-08-20 worker)

- **State:** Coverage remains **198/276 Level-50 exact, 1 partial, 77 unsupported**. MOVE_LOVELY_KISS stays the sole queue item; `devil-pink-heart-lovely-kiss` remains non-exclusive and unfulfilled, with no sibling credit or latch change.
- **Did:** Added `lovelyKissAtAge` and the narrow `SceneOnLovelyKissConfig`/`sceneOnLovelyKissView` seam. The source-relative reducer ports the full 153-row script cursor, one Devil plus four Pink Heart allocator/callback lifecycles, Q8.8 geometry, per-heart `Random2` phases, sprite OAM/neutral affine state, full palette/tag transfer state, target-panned audio, animation RNG, and cleanup without sleep/status, gameplay RNG, damage, turn, round, facility, species-pair, or broad-family ownership.
- **Verified:** Direct reducer + typed seam equality is **153/153 player-back + 153/153 opponent-front = 306/306 retained component rows** through first inactive cleanup. Sweet Kiss, Attract, and Sleep Powder are explicit negative controls. The twice-fresh raw-RGB evidence remains retained but `framebufferCompared` stays false.
- **Checks:** Lovely Kiss source/evidence/reducer validators, focused sibling controls, animation audit/coverage, animation-boundary/forbidden-import/unsupported-branch ratchets, typecheck, full `npm test` (**1,076 files passed / 44 skipped; 10,148 passed / 223 skipped**), production build (**695 modules**), and `git diff --check` pass.
- **Remainder/next:** Add only the ordinary source-derived compositor/draw wiring, then require complete twice-fresh **306/306 zero-residual framebuffer rows** before Lovely Kiss alone can promote. No exact promotion, framebuffer claim, sibling promotion, boundary widening, or gameplay ownership in this step.

# MOVE_LOVELY_KISS bilateral dense evidence checkpoint — partial (2026-08-20 worker)

- **State:** Coverage remains **198/276 Level-50 exact, 1 partial, 77 unsupported**. MOVE_LOVELY_KISS is the sole queue item; the new `devil-pink-heart-lovely-kiss` track is non-exclusive and unfulfilled. No sibling credit or latch change.
- **Did:** Added complete legal challenge-3 set-377 Jynx↔Onix Scene-ON parties, source audit, and an evidence-only probe. The pointer-bounded interval is **0x082d4035..0x082d407c (71 bytes)** with exactly four components: `ANIM_TAG_DEVIL`, `ANIM_TAG_PINK_HEART`, `gDevilSpriteTemplate`, and `gPinkHeartSpriteTemplate`; callbacks are `AnimDevil`, `AnimPinkHeart`, `AnimPinkHeart_Step`, with target-panned `SE_M_PSYBEAM2` then `SE_M_ATTRACT`.
- **Verified:** Player-back **73..225 (153 rows)** and opponent-front **77..229 (153 rows)** each rerun twice fresh with byte-identical dense state and raw RGB. Retained state covers source/task/sprite/OAM/affine/palette/tag/BG/register/audio/party/engine/immutable/RNG/cleanup; lifecycle is 1 Devil + 4 Pink Hearts, visual tasks remain empty, gameplay RNG has 0 transitions, animation RNG has 152 transitions, and OAM/matrix/palette latches are 152/152 per orientation. Evidence/raw/map digests are pinned in the fixture and direct verifier.
- **Remainder/next:** This is evidence-only: no reducer, typed seam, production compositor, framebuffer equality, or move-specific acceptance. Sweet Kiss, Attract, and sleep animations are source-neighbor controls only; do not infer Lovely Kiss or sibling promotion.
- **Checks:** Source/evidence verifiers, focused evidence/boundary/import/unsupported-branch ratchets, typecheck, full `npm test` (**1,075 files passed / 44 skipped; 10,145 passed / 223 skipped**), production build (**694 modules**), and `git diff --check` pass. Successful probe scratch directories were cleaned; the worktree is ready for the evidence-only commit.

# MOVE_RAIN_DANCE bilateral exact production presentation (2026-08-20 worker)

- **State:** Coverage advances **197→198/276 Level-50 exact**, **1→0 partial**, and remains **78 unsupported**. MOVE_RAIN_DANCE alone promotes, the queue is empty, and `rain-drops-rain-dance` is fulfilled. Haze and Detect remain independent exact regression controls; Hail remains distinct unsupported, with no sibling credit.
- **Did:** Added a reproducible source extractor for the seven-frame Rain Drops sheet/palette and the ordinary shared Battle Scene ON compositor behind `sceneOnRainDanceView`. It renders source five-bit palette blends across BG and typed attacker/target battlers, RNG-derived drop geometry, side-selected back/front art, supplied OAM-derived sprite corners, side-driven order/healthboxes/text, software-to-hardware OAM transfer timing and reverse draw order, the sourcePass-0 pre-VRAM blank, background, and inactive cleanup without a species/set/evidence-pair gate, absolute battle ticks, replay tables, framebuffer lookup, gameplay RNG, weather/outcomes, damage, turn, round, or facility ownership.
- **Verified:** Stored production equality is **187/187 player-back + 187/187 opponent-front = 374/374 raw-RGB rows with zero residual pixels** and `framebufferCompared: true`. Four genuinely fresh mGBA-backed probes through `tools/run-mgba-probe.py` reproduce each orientation twice byte-identically and pass the same compositor for **748/748 fresh rows total**, also with zero residual pixels. The source/evidence/reducer/typed-seam verifiers remain **374/374**.
- **Checks:** Focused Rain Dance/Haze/Detect tests plus an ARON→GROVYLE no-gate regression (not pixel acceptance), animation coverage, animation-boundary/forbidden-import/unsupported-branch ratchets, typecheck, full `npm test` (**1,074 files passed / 44 skipped; 10,142 passed / 223 skipped**), production build (**694 modules**), and diff-check pass. No boundary list, unsupported barrier, production recording import, or Scene OFF/gameplay owner widened; `ANIMATION_LATCHES.md` remains unchanged.

# MOVE_RAIN_DANCE bilateral reducer/typed seam — partial (2026-08-20 worker)

- **State:** Coverage remains **197/276 Level-50 exact, 1 partial, 0 staged, 78 unsupported**. MOVE_RAIN_DANCE remains the sole queue item and `rain-drops-rain-dance` remains unfulfilled; Haze/Detect are regression controls only, Hail remains distinct unsupported, and no sibling/component credit is awarded.
- **Did:** Added `rainDanceAtAge`, a pure 187-row source reducer, and `SceneOnRainDanceConfig`/`sceneOnRainDanceView`. The port models both CreateRaindrops tasks, source `Random2` geometry and lowest-free-slot reuse, all 80 creates/destroys and peak 14, callback/animation/OAM state, the preceding-row OAM/matrix/palette transfers, both BlendBattleAnimPal ramps, all 512 palette colors, resource/audio lifetime, and cleanup without gameplay RNG, weather/outcomes, damage, turn, round, or facility ownership.
- **Verified:** The direct verifier and typed seam reproduce **187/187 player-back + 187/187 opponent-front = 374/374 retained component-state rows**. Source interval **0x082d050a..0x082d0555**, task ages 18..135 / 4..16 / 172..184, palette edges 1/8/11/14/17/176/179/182/185, 186/186 hardware latches, bilateral two-frame outer shift, and inactive age 186 remain pinned.
- **Remainder/next:** Still partial: no production compositor/draw case, no framebuffer comparison, and no exact promotion. `battleScene.ts`, `core.ts`, `ANIMATION_LATCHES.md`, and boundary lists are unchanged. Next implement the ordinary compositor and prove all 374 rows at zero residual pixels.
- **Checks:** Direct source/evidence/reducer verification, focused Rain Dance + Haze + Detect tests, animation coverage, boundary/forbidden-import/unsupported-branch ratchets, typecheck, full **10,139-test** suite, build, and diff-check pass.

# MOVE_PSYBEAM bilateral exact production presentation (2026-08-20 worker)

- **State:** Coverage advances **196→197/276 Level-50 exact**, **1→0 partial**, and remains **79 unsupported**. MOVE_PSYBEAM alone promotes, the manual queue is empty, and `gold-ring-psybeam` is fulfilled. Hypnosis, Shadow Ball, Confusion, and Psychic remain independent exact controls with no new credit.
- **Did:** Added the source-derived ordinary Battle Scene ON compositor behind `sceneOnPsybeamView`: reused Psychic background, GoldRing art/palette, source-loaded Crawdaunt picture/name chrome for the legal Spinda carrier, Onix art, healthboxes, and existing OAM/affine/palette/register infrastructure by source identity. It renders target SwayMon, all eleven source-age rings, the two-leg target palette cycle, bilateral OAM order, BG rotation/darkening, healthboxes/text, and inactive cleanup without absolute battle ticks, replay tables, framebuffer lookup, gameplay, damage, confusion, RNG, turn, round, or facility ownership.
- **Verified:** Retained production equality is **160/160 player-back + 160/160 opponent-front = 320/320 raw-RGB rows with zero residual pixels**. The same ordinary framebuffer path reproduced **twice fresh per orientation** through `tools/run-mgba-probe.py`, including first inactive cleanup. Focused Psybeam component/seam/framebuffer tests and exact sibling controls pass.
- **Checks:** Animation audit/coverage reports **197 exact, 0 partial, 79 unsupported**; typecheck; full `npm test` (**1,071 files passed / 44 skipped; 10,134 passed / 223 skipped**); and production build (**692 modules**) pass. The worker handoff records the final `git diff --check` and clean-commit result.
- **Notes:** The compositor preserves the established RAM+1 script-sprite/plain-OAM, palette, BG palette/BLDY display behavior, species idle x2 draw input, and zero orientation shift. No new evidence contradicts or refines a latch, so `ANIMATION_LATCHES.md` is unchanged; animation boundary lists are unchanged.

# MOVE_PSYBEAM source-relative reducer + typed Scene-ON seam — partial (2026-08-20 worker)

- **State:** Coverage remains **196/276 Level-50 exact, 1 partial, 79 unsupported**. MOVE_PSYBEAM remains the sole queued partial; its production compositor/draw wiring and exact promotion are intentionally still open. No sibling or component credit was added.
- **Did:** Added src/animation/psybeam.ts with source-relative Move_PSYBEAM, PsybeamRings, AnimTask_SwayMon, psychic BG fade/rotation, source cursor/task payloads, bilateral Q8.8 ring geometry, resource/register cleanup, and explicit RAM+1 display helpers. Added the narrow typed sceneOnPsybeamView seam; battleScene.ts, core.ts, shared compositor, framebuffer, gameplay, damage, confusion, RNG, and facility state remain untouched.
- **Verified:** tools/compare/psybeamReducerAudit.ts exhaustively replays **160/160 player-back + 160/160 opponent-front = 320/320 retained source/component rows** for source owner/wait/args, all task data, every GoldRing OAM/matrix/callback row, BG registers, task counts, target Sway x2, and GoldRing tags. framebufferCompared is explicitly false. Focused reducer/evidence/boundary tests and the four exact sibling controls pass.
- **Checks:** Animation audit/coverage, typecheck, full `npm test` (**1,070 files passed / 44 skipped; 10,133 passed / 223 skipped**), production build (**692 modules**), and `git diff --check` pass.
- **Next / Notes:** Add only the source-derived production compositor/draw case, then require twice-fresh **320/320 zero-residual shared-framebuffer rows** before promoting Psybeam. Hypnosis, Shadow Ball, Confusion, and Psychic remain independent regression controls. No new evidence contradicted a latch, so ANIMATION_LATCHES.md is unchanged.

# MOVE_PSYBEAM complete bilateral dense evidence checkpoint — partial (2026-08-20 worker)

- **State:** Coverage is **196/276 Level-50 exact, 1 partial, 79 unsupported**. MOVE_PSYBEAM alone is queued partial; no reducer, typed seam, compositor/draw wiring, exact promotion, or sibling/component credit was added.
- **Did:** Added complete legal set-145 SPINDA↔ONIX Scene-ON scenarios and an even-pointer-bounded probe retaining task/sprite data, software+hardware OAM/matrices, faded+unfaded+hardware palettes/tags, BG/window/blend registers, raw audio, battlers/parties/engine, gameplay+animation RNG, immutable state, and raw RGB. Four local-mGBA runs reproduce byte-for-byte: player-back **213..372 (160 rows)** `8c1969fa…` / RGB `63cea8ca…`; opponent-front **213..372 (160)** `9e3f5f2e…` / RGB `2ffb82a8…`. Normalized map hashes are player `d341bd88…`, opponent `782f8e68…`.
- **Measured:** Eleven rings create at ages **42/48/54/60/66/72/78/84/90/96/102**; GoldRing lives 42..115, LoopSEAdjustPanning 42..88, SwayMon 54..116, BlendColorCycle 54..112, cleanup 159. Whole OAM/matrix/palette preceding-buffer fits are **159/159 per orientation**; BLDY has 65 edges and restores at 157. This verifies the existing RAM+1 create/x2/plain-OAM and palette/BG-rotation classes. Player-front ONIX owns the x2=1 idle draw hold; opponent-back ONIX is x2=0. Orientation timing shift is **0**. No new/contradictory latch, so `ANIMATION_LATCHES.md` is unchanged.
- **Checks:** Hermetic Psybeam verifier, focused evidence and ledger ratchets, animation audit/coverage, typecheck, full `npm test` (**1,069 files passed / 44 skipped; 10,128 passed / 223 skipped**), production build (**691 modules**), and `git diff --check` pass.
- **Next / Notes:** Add only a source-relative reducer, typed seam, and production compositor, then require **320/320** twice-fresh zero-residual framebuffer rows before Psybeam alone can promote. Hypnosis, Shadow Ball, Confusion, and Psychic remain independent exact controls. Scene-ON info/capabilities passed; freshness FAIL was the documented harness-HEAD/docs-only false positive, and the worker did not touch oracle lifecycle.

# MOVE_SOFT_BOILED bilateral exact production presentation (2026-08-16 worker)

- **State:** Coverage advances **195→196/276 Level-50 exact**, 0 partial, 0 staged, and **81→80 unsupported**. MOVE_SOFT_BOILED alone promotes: player-back **272/272** plus opponent-front **272/272**, **544/544 total component/reducer/typed-seam/raw-RGB/shared-framebuffer rows with zero residual pixels**, through first inactive cleanup and backed by twice-fresh retained evidence.
- **Did:** Added a reproducible bounded extractor for BREAKING_EGG, THIN_RING, BLUE_STAR, and legal set-332 Chansey art; source-identity tests pin exact reuse against Milk Drink and Metronome assets while shared exact Onix art remains reused. The shared Scene-ON compositor draws both affine egg bodies in source OAM order, ShakeMon/monbg and chrome, two rings, four target-side HealingEffect2 stars, BG/register state, the age-144 mixed BG-current/OBJ-preceding palette latch, resources/audio lifecycle, cleanup, and bilateral geometry. No absolute tick, framebuffer lookup, fitted RGB/coordinates, baked sprite, gameplay, damage, RNG, AI, controller, turn, round, or facility ownership was added.
- **Verified:** Direct source, twice-fresh legal stage, dense evidence, reducer, asset, and framebuffer verifiers pass; focused Soft Boiled/Recover/Milk Drink/control/boundary/inventory tests **30/30**, animation audit/coverage, typecheck, full `npm test` (**1,065 files passed / 44 skipped; 10,004 passed / 223 skipped**), production build (**691 modules**), and `git diff --check` pass. Recover, Milk Drink, and every sibling remain independent controls; `ANIMATION_LATCHES.md` and animation boundaries remain unchanged.
- **Next:** Reorient after the next inbound `master` merge, rerun coverage, and choose one bounded independent move acceptance from the remaining 80 only when source/latch evidence supports a concrete brief. The current report has an empty move queue and no source component without an exact representative, so no filler worker was dispatched.
- **Notes:** Supervisor independently replayed the twice-fresh legal stage and all **544/544** source/reducer/seam/raw-RGB/framebuffer rows, then reran the merged full suite and build at `c0110884`. The worker branch/worktree is removed; no animation deferral or main-program finding was created.

# MOVE_SOFT_BOILED pure source-age reducer + typed Scene-ON seam — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **195/276 Level-50 exact**, 0 partial, 0 staged, and **81 unsupported**. MOVE_SOFT_BOILED remains unsupported: no compositor/draw wiring, production framebuffer claim, coverage entry/promotion, or sibling credit.
- **Evidence:** The twice-fresh retained Scene-ON windows remain player-back **227..498 (272 rows)** (`b3fd865e… / b67418dc…`) and opponent-front **228..499 (272 rows)** (`74b2317a… / ba40c156…`). The evidence fixture now records the reducer/seam checkpoint while retaining all source/task/sprite/OAM/matrix/palette/allocator/BG/audio/RNG/RGB/cleanup state.
- **Reducer/seam:** `src/animation/softBoiled.ts` and `sceneOnSoftBoiledView` replay **272/272 reducer + 272/272 typed-seam rows per orientation (544/544 total)**. The direct verifier matches the source owner/wait schedule, both egg callback/affine lifecycles, source OAM order, bilateral coordinates, ShakeMon and monbg/clear tasks, two rings, target-side HealingEffect2 stars, mixed age-144 palette transfer latch, blend/register/BG state, audio/pan, tag lifetimes, animation-RNG hold, and first inactive cleanup. The same-side target exception is scoped to Soft Boiled's source `MOVE_TARGET_USER` behavior.
- **Checks / next:** Source audit, twice-fresh legal stage verifier, dense evidence verifier, reducer verifier, animation audit/coverage, typecheck, and full `npm test` (**1,063 files passed / 44 skipped; 10,001 passed / 223 skipped**) pass. **Exact compositor next action:** add only the source-relative production compositor/draw case for the egg pair, thin-ring pair, and target-side blue stars, honoring the reducer's source OAM order, affine matrices, resource tags, BG/register/palette latches, and bilateral geometry; then require twice-fresh zero-residual framebuffer equality for all **544** rows before any promotion. Keep gameplay/damage/RNG/AI/controller/turn/round/facility ownership and sibling credit separate.

# MOVE_SOFT_BOILED authoritative-source + legal bilateral Scene-ON staging checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **195/276 Level-50 exact**, 0 partial, 0 staged, and **81 unsupported**. MOVE_SOFT_BOILED receives no dense evidence, reducer, typed seam, compositor/renderer, latch conclusion, coverage entry, promotion, or sibling credit.
- **Did:** Added a hermetic source audit pinning the complete root **0x082d3cb2..0x082d3d34 (130 bytes, `1e681d45…`)**, called **HealingEffect2** **0x082d7a28..0x082d7a71 (73 bytes, `26dd4029…`)**, egg affine/callback state machine, ShakeMon/palette/position callbacks, three assets, all visual commands/audio/side dependencies, component graph, and the earliest legal Level-50 **FRONTIER_MON_CHANSEY_2** (set 332, challenge-2 range 267–371). Recover and Milk Drink are explicitly only BLUE_STAR/thin-ring controls.
- **Verified:** Capture-free complete-party Scene-ON stages use ordinary A input and stock AI limited only by four legal move slots. Twice-fresh player-back is frame **934** `3e30a569…`, Soft Boiled PP **[9,10,10,10]**; opponent-front is frame **934** `59c86cd5…`, **[10,10,9,10]**. Both restore Chansey to **325/325 HP**, consume one opposing Tackle, retain all six valid checksums, and finish outcome 0; focused source/staging **4/4**, direct source/stage audits, animation audit/coverage, and typecheck pass.
- **Verified / Next:** Direct source/stage audits, animation audit/coverage, typecheck, full `npm test` (**1,061 files passed / 44 skipped; 9,996 passed / 223 skipped**), production build (**689 modules**), and `git diff --check` pass. Keep Soft Boiled unsupported: a future move-specific step needs a complete twice-fresh dense bilateral Scene-ON window through first cleanup, measured display latches, a source-relative reducer, typed seam, production compositor, and zero-residual framebuffer acceptance before MOVE_SOFT_BOILED alone can promote.

# MOVE_ROLLOUT bilateral exact production presentation (2026-08-16 worker)

- **State:** Coverage advances **194→195/276 Level-50 exact**, 0 partial, 0 staged, and **82→81 unsupported**. MOVE_ROLLOUT alone promotes and `task-animtask-rollout` is fulfilled: production raw-RGB equality is **793/793 player-back + 793/793 opponent-front = 1,586/1,586 rows, zero residual pixels**. MOVE_ICE_BALL remains independently unsupported; Defense Curl gameplay state receives no ownership or visual claim.
- **Did:** Retained full-state evidence identifies every former age-0 strip as hardware OAM slot 11's source-owned **32×8 enemy shadow**, not a field tilemap. Pinned `SpriteCB_EnemyShadow` hides software OAM while an animation is active, and the established one-display transfer latch preserves the preceding shadow in hardware OAM; Voltorb's source elevation is 10. The shared compositor now draws the extracted 200-pixel mask through a reusable species/center-relative helper below battlers and effects, with no rectangle, RGB patch, absolute tick, screenshot lookup, or gameplay branch.
- **Verified:** All five counter bodies and cleanup replay **793/793 reducer + typed-seam + shared-framebuffer rows per orientation**. The source callback/elevation, extracted mask, five opponent-front hardware-shadow rows, and age-1 latch are pinned in focused tests; every previously exact Rollout row and relevant Sand Attack/Ancient Power, field, renderer, control, boundary, and inventory regression remains green.
- **Checks:** Direct Rollout source/evidence/reducer/framebuffer verifiers; all animation tests; animation audit/coverage; typecheck; full `npm test` (**1,060 files passed / 44 skipped; 9,992 passed / 223 skipped**); production build (**689 modules**); and `git diff --check` pass. No animation boundary, unsupported barrier, canonical-recording production import, or gameplay/facility owner changed; retained source/state evidence was sufficient, so no new mGBA probe or deferred entry was needed.

# MOVE_ROLLOUT source-relative reducer + typed Scene-ON seam — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **194/276 Level-50 exact**, 0 partial, 0 staged, and **82 unsupported**. MOVE_ROLLOUT remains unsupported: this step adds the source-relative reducer and narrow typed seam only; it adds no production compositor/draw wiring, coverage entry, or sibling credit. Sand Attack and Ancient Power remain independent exact controls; Ice Ball remains an independent unsupported escalating sibling.
- **Evidence:** Legal Voltorb↔Onix Scene-ON battles naturally progress all five locked Rollout hits with no transient state injection. Player-back seed `305420102` retains bodies **75..241 (167), 575..741 (167), 1079..1239 (161), 1578..1730 (153), 2074..2218 (145)**; opponent-front seed `305420104` retains **79..245, 1010..1176, 1580..1740, 2120..2272, 2660..2804** with the same lengths. Total retained evidence is **793 rows/side, 1,586 rows**, each body through its first inactive cleanup. Two fresh runs per orientation are byte-identical for dense JSON and every raw RGB frame. Dense/raw hashes: player `78b134e9… / 4b9f1c6c…`; opponent `29e1ba8d… / 7451551f…`. Banked map hashes: player `02d9e909…`; opponent `b91085be…`.
- **Reducer/seam:** `src/animation/rollout.ts` and the typed Scene-ON seam replay **793/793 reducer + 793/793 seam rows per orientation (1,586/1,586 total)**. The verifier matches source cursor/waits, counter/timer/power inputs, rollout and power-shake task data, particle schedules/slots/axes/lifetimes, audio cues, monbg/clear tasks, target scanout +1, registers, resource tags, task counts, and first inactive cleanup. No gameplay, damage, RNG, AI, controller, turn, round, facility, or compositor ownership is added.
- **Next:** Implement the source-derived production compositor/draw case for all five bodies. Require twice-fresh zero-residual production framebuffer equality for all **1,586** retained rows before MOVE_ROLLOUT alone may promote. Do not infer Ice Ball acceptance or reuse its counter selection.
- **Checks:** Focused reducer/source/evidence/control/boundary suites **15/15**, direct reducer verifier (**1,586/1,586**), animation audit, coverage (**194/276 exact; 82 unsupported**), typecheck, full `npm test` (**1,059 files passed / 44 skipped; 9,990 passed / 223 skipped**), production build (**688 modules**), and `git diff --check` pass.

# MOVE_ROLLOUT authoritative-source + legal bilateral Scene-ON staging checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **194/276 Level-50 exact**, 0 partial, 0 staged, and **82 unsupported**. The new non-exclusive `task-animtask-rollout` track names **MOVE_ROLLOUT only**; it creates no move coverage entry or sibling credit.
- **Did:** Added a hermetic audit pinning the complete root **0x082cd75e..0x082cd79f (65 bytes, `c2750d78…`)**, all Rollout task/callback/template/arc/power-shake pointers, IMPACT/MUD_SAND/ROCKS resource bytes, audio constants, command order, 1–5 counter/dynamic-power/Defense-Curl branches, source counter fallback, and player/opponent side dependencies. The generated graph proves `task:AnimTask_Rollout` is a singleton Level-50 component. Sand Attack and Ancient Power remain independently exact MUD_SAND and ROCKS/IMPACT controls; Ice Ball remains an unsupported escalating-move control.
- **Verified:** Lowest legal Level-50 carrier is challenge-0 **FRONTIER_MON_VOLTORB** (set 115; Docile/Lax Incense/HP+SpAtk). Capture-free complete-party Scene-ON stages with ordinary A input replayed twice fresh byte-identically: player-back frame **934** `aae08a47…`, Rollout PP `[19,20,20,20]`; opponent-front frame **934** `7095b4dd…`, `[20,20,19,20]`; all six party checksums are valid. Focused source/staging test **4/4**, direct audit, animation audit/coverage, typecheck, full `npm test` (**1,057 files / 9,982 passed / 223 skipped**), production build (**688 modules**), and `git diff --check` pass.
- **Next:** Retain complete twice-fresh dense player-back and opponent-front windows through the shared presentation seam, then measure Rollout-owned banked change maps (including any affine allocations) before any latch conclusion or implementation/coverage claim. `ANIMATION_LATCHES.md` remains unchanged; no Rollout latch is inferred.

# MOVE_FIRE_BLAST bilateral exact production presentation (2026-08-16 worker)

- **State:** Coverage advances **193→194/276 Level-50 exact**, 0 partial, 0 staged, and **83→82 unsupported**. Fire Blast alone promotes; Dragon Breath, Flamethrower, Blaze Kick, Ember, Fire Spin, and every other sibling remain independent exact controls.
- **Did:** Reused the exact generated SMALL_EMBER sheet/palette and wired the pure source-relative reducer/typed seam into the shared Scene-ON framebuffer. The compositor renders all **15 rings + 45 crosses** with source allocation and stable OAM order, correct frames/palette, bilateral geometry, target ShakeMon, both F_PAL_BG black fades, battle mons/chrome, GBA OBJ/palette transfer behavior, and first-inactive resource/register cleanup. It owns no gameplay, damage, RNG, AI, controller, turn, round, or facility state.
- **Verified:** Retained player-back **197/197** and opponent-front **197/197** rows pass production raw-RGB equality through first inactive cleanup: **394/394 total, zero residual pixels**. Twice-fresh evidence/raw-RGB hashes remain player `cb238202… / f36e165d…` and opponent `a5a45685… / 4376d40d…`; framebuffer verifier `f986979c…`, reused SMALL_EMBER asset `63f1fc43…`.
- **Checks:** Focused Fire Blast source/evidence/reducer/assets/framebuffer, sibling controls, boundary and inventory tests; typecheck, animation audit/coverage, full `npm test` (**1,055 files / 9,958 passed / 223 skipped**), production build (**688 modules**), and `git diff --check` pass. `ANIMATION_LATCHES.md`, shared animation boundaries, unsupported barriers, and canonical-recording production imports remain unchanged.

# MOVE_FIRE_BLAST pure reducer + typed seam exact checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **193/276 Level-50 exact**, 0 partial, 0 staged, and **83 unsupported**. Fire Blast remains unsupported and receives no compositor/draw wiring, framebuffer acceptance, coverage promotion, latch edit, or sibling/component credit.
- **Verified:** The source-relative 197-age reducer and narrow typed Scene-ON seam each match **394/394 retained bilateral rows** through first inactive cleanup: root command/wait cursor, **3×5 rings + 9×5 crosses**, callbacks/positions/frames/slots/allocation order/destruction, target ShakeMon, both F_PAL_BG black tasks and coefficient state, SMALL_EMBER tag lifetime, hard-coded attacker→target sound sweep/pan, neutral matrices/registers, task/resource counts, and cleanup. Each side independently reports **197/197 reducer + 197/197 seam**, 15 ring and 45 cross creations, and preceding-buffer OAM/matrix/palette latches **196/196**.
- **Receipts / next:** Reducer `f91c0a70…`, verifier `b2a83db8…`, fixture `6587dbf9…`; retained JSON/raw-RGB hashes remain player `cb238202… / f36e165d…`, opponent `a5a45685… / 4376d40d…`. Remaining gap is explicit: extract only the required art, wire a source-relative production compositor/draw case, and prove twice-fresh **zero-residual 394-row framebuffer equality** before Fire Blast alone can promote. Dragon Breath, Flamethrower, Blaze Kick, Ember, Fire Spin, and other fire siblings remain independent exact regression controls.
- **Checks:** Focused Fire Blast/source/evidence/sibling/boundary suites, typecheck, animation audit/coverage, full `npm test` (**1,054 files / 9,956 passed / 223 skipped**), production build (**688 modules**), and `git diff --check` pass. No animation boundary, unsupported barrier, canonical-recording production import, coverage, or latch ratchet changed.

# MOVE_FIRE_BLAST complete bilateral dense evidence checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **193/276 Level-50 exact**, 0 partial, 0 staged, and **83 unsupported**. Fire Blast has complete retained evidence but no reducer, typed seam, compositor/draw wiring, framebuffer acceptance, coverage promotion, latch edit, or sibling/component credit.
- **Evidence:** Four fresh local-mGBA runs through `tools/run-mgba-probe.py` are byte-identical per orientation. Player-back **215..411 (197 rows)** JSON/raw-RGB `cb238202… / f36e165d…`; opponent-front **1147..1343 (197 rows)** `a5a45685… / 4376d40d…`. All **394** rows retain source owner/waits, 3×5 rings, 9×5 crosses, callback/order, software+hardware OAM/matrices/palettes, F_PAL_BG tasks, BG/registers, tag allocation/unload, sound tasks/audio, battler/chrome, semantic state, both RNG domains, raw RGB, and first inactive cleanup. The opponent staging receipt's post-selection text is advanced only by the probe's ordinary sparse A input before the source pointer starts.
- **Measured:** Exact creation ages are rings **4/11/18** and crosses **113/118/123/128/133/138/143/148/153**, five sprites each; ring/cross lifetimes span ages **4..90 / 113..168**, target ShakeMon **113..150**, hard-coded sound task **4..120**, and the two black-fade tasks collectively **51..194**. Whole hardware OAM, matrices, and palette equal preceding source buffers **196/196 per orientation**; gameplay RNG is invariant while animation RNG has **197/197 distinct rows**. `ANIMATION_LATCHES.md` is unchanged because this exactly matches existing transfer rules.
- **Next:** Implement the pure source-relative ring/cross/task/palette/audio reducer and narrow typed seam, require **394/394** retained-row replay, then separately implement the production compositor and require twice-fresh zero-residual framebuffer equality before Fire Blast alone can promote. Dragon Breath, Flamethrower, Blaze Kick, Ember, and Fire Spin remain independent exact controls only.

# MOVE_FIRE_BLAST authoritative-source + legal bilateral Scene-ON staging checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **193/276 Level-50 exact**, 0 partial, 0 staged, and **83 unsupported**. Fire Blast receives no reducer, typed seam, production compositor/renderer, coverage, latch, or sibling credit.
- **Source:** Hermetic audit pins ROM/ELF and 16 source/generated hashes; the full root **0x082c9f55..0x082c9fe9 (148 bytes, `7a777dbd…`)**, `FireBlastRing` **0x082c9fe9..0x082ca02d (68 bytes, `2a09bd0c…`)**, and `FireBlastCross` **0x082ca02d..0x082ca083 (86 bytes, `938790f5…`)**; all 3×5 ring spawns, 9×5 cross bursts, waits, target ShakeMon, F_PAL_BG black fades, Small Ember asset/OAM lifecycle, ring/cross callbacks, side coordinate dependencies, and hard-coded attacker→target SoundTask timing. The complete generated graph has eight components. Dragon Breath, Flamethrower, Blaze Kick, Ember, Fire Spin, and shared fire projectile primitives remain independent exact controls only.
- **Carrier/stages:** Earliest legal Level-50 Factory carrier is challenge-2 **FRONTIER_MON_OCTILLERY_2** (index 361, range 267–371), source-pinned as Quirky/Lax Incense/HP+Def+SpDef. Capture-free three-complete-party Scene-ON stages reran twice fresh byte-identically: player-back frame 934 `1545e05e…`, Fire Blast PP `[4,5,5,5]` (slot 0); opponent-front `bedfdd49…`, `[5,4,5,5]` (slot 1); every constructed party checksum is valid.
- **Next:** Collect a complete dense bilateral Fire Blast window through the shared presentation seam, including full source/OAM/palette/register/audio/resource lifecycle and post-cleanup, measure move-owned display latches, then (only if zero-residual production framebuffer evidence succeeds) consider Fire Blast alone for promotion.

# MOVE_HEAL_BELL bilateral exact production presentation (2026-08-16 worker)

- **State:** Coverage advances **192→193/276 Level-50 exact**, 0 partial, 0 staged, and **84→83 unsupported**. Heal Bell alone promotes; Perish Song, Aromatherapy, Synthesis, Refresh, and every other sibling remain independent controls.
- **Did:** Added reproducible BELL, all five MUSIC_NOTES_2 palette rows, THIN_RING, SPARKLE_2, and Chimecho art; generalized stable source-OAM ordering; and wired the existing pure reducer/typed seam into the shared framebuffer. The source-relative draw case renders all twelve mirrored note paths with the three runtime palette allocations, three normal affine rings, SparklingStars, the final ObjBlend ring, palette tasks, GBA OBJ/affine/blend/scanline limits, allocator reuse, healthboxes/text, and cleanup. It owns no gameplay, RNG, controller, turn, round, or facility state.
- **Verified:** Complete player-back frames **209..469 pass 261/261** and opponent-front **210..470 pass 261/261** through component/reducer/typed-seam/raw-RGB/shared-production-framebuffer equality: **522/522 total, zero residual pixels**, including both first inactive cleanup rows. Dense/raw-archive hashes are player `179cf071… / d0794423…`, opponent `aed2169e… / 3b74295b…`; framebuffer verifier `0e7b21d9…`, generated asset `2ef40949…`, extractor receipt `bd8c0851…`.
- **Checks:** Strict source, dense evidence, and framebuffer verifiers; focused Heal Bell assets/source/evidence/framebuffer, sibling controls, animation boundary, and inventory tests; typecheck, animation audit/coverage, full `npm test` (**1,051 files / 9,947 passed / 223 skipped**), production build (**687 modules**), and `git diff --check` pass. `ANIMATION_LATCHES.md`, animation boundary/barrier ratchets, canonical-recording production imports, and gameplay owners remain unchanged.

# MOVE_HEAL_BELL bilateral dense evidence + pure reducer/typed seam checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **192/276 Level-50 exact**, 0 partial, 0 staged, and **84 unsupported**. Heal Bell has no compositor/draw wiring, framebuffer acceptance, coverage entry, latch change, or sibling credit.
- **Evidence:** Complete legal Scene-ON windows reproduce twice fresh byte-for-byte: player-back **209..469 (261 rows)** JSON/raw-RGB `01e2b6a3… / ad03fd91…`; opponent-front **210..470 (261 rows)** `480c25cc… / b69aca35…`. All **522** rows retain source/task/sprite/OAM/order/matrix/palette/allocator/register/audio/semantic/RNG/raw-RGB state through first inactive cleanup. Each side proves existing preceding-source hardware OAM/matrix/palette transfer **260/260**.
- **Reducer/seam:** Pure age-relative code passes **522/522 reducer + typed-seam rows** for all 44 root commands, three HealBellRing groups, 12 side-mirrored Q8.8 notes and three palette variants, BELL/MUSIC_NOTES_2/THIN_RING unload, SPARKLE_2 reuse, final ObjBlend ring/palette work, five audio cues with bilateral pan, allocator slot reuse, and cleanup. Perish Song and Aromatherapy remain exact controls only and gain no Heal Bell/component credit.
- **Next:** Implement the shared production framebuffer compositor/draw case and require twice-fresh **261/261 + 261/261 zero-residual** equality before promoting Heal Bell alone. No absolute battle tick, lookup framebuffer, gameplay/RNG/controller/turn/round/facility branch, coverage/latch/boundary/barrier change, or canonical-recording production import was added.

# MOVE_HEAL_BELL authoritative-source + legal bilateral Scene-ON staging checkpoint — remains unsupported (2026-08-16 worker)

- **State:** Coverage remains **192/276 Level-50 exact**, 0 partial, 0 staged, and **84 unsupported**. Heal Bell receives no component-track, latch, renderer, or coverage credit; MUSIC_NOTES_2, SPARKLE_2 / GrantingStars, thin-ring, and palette-task siblings remain independent controls.
- **Did:** Added a hermetic source auditor/test/fixture pinning the complete root **0x082d3d34..0x082d3ef8 (452 bytes, `01091fd7…`)** and `HealBellRing` **0x082d3ef8..0x082d3f2e (54 bytes, `a01a131d…`)**, all 44 root commands, three palette-task/ring groups, 12 distinct note paths, BELL/MUSIC_NOTES_2/THIN_RING/SPARKLE_2 assets and palette lifecycle, callbacks/templates, source-side mirroring, audio, component graph, and the legal challenge-2 `FRONTIER_MON_CHIMECHO_2` carrier. It explicitly separates Perish Song’s MUSIC_NOTES_2 body and SparklingStars from GrantingStars controls.
- **Oracle:** Capture-free legal `overrides.parties` stages use three complete source-correct Chimecho (**species 411**) or Onix records per side and ordinary A input. Scene-ON player-back endpoint frame **1234** is `1056d533…` with Heal Bell PP **[4,5,5,5]**; opponent-front is `ea78b2b4…` with constrained stock-AI PP **[5,5,5,4]**; all six constructed party checksums are valid. No dense capture or pixel claim was made.
- **Checks/next:** Focused source/staging test **4/4**, direct source audit, `npm run typecheck`, `npm run animation:audit`, `npm run animation:coverage`, full `npm test`, `npm run build`, and `git diff --check` pass. Later work needs complete twice-fresh dense bilateral source/OAM/palette/audio/raw-RGB evidence, measured latches, a pure reducer, typed seam, compositor, and zero-residual framebuffer equality before Heal Bell alone may promote.

# MOVE_BLIZZARD bilateral exact production presentation (2026-08-16 worker)

- **State:** Coverage advances **191→192/276 Level-50 exact**, 0 partial, 0 staged, and **85→84 unsupported**. Blizzard alone promotes; Icy Wind remains an independent exact regression control and no sibling receives credit.
- **Did:** Added the source-relative production scheduler and shared-framebuffer compositor for legal Pelipper↔Onix Scene-ON windows. It ports the high-speed fade/scroll/restore, partner monbg, bilateral battle-mon/chrome, all **14** snowballs, **14** traveling large crystals, and **11** affine/flickering impact crystals, including persistent allocator topology, stable BuildOamBuffer order, shared 1210-cycle GBA OBJ scanline evaluation, registers, palettes, resources, audio-visible state, and cleanup.
- **Verified:** Complete player-back **214..585 (372/372)** and opponent-front **213..573 (361/361)** windows pass all **733/733** component/reducer/typed-seam/OAM-topology/raw-RGB/shared-production-framebuffer rows with zero residual pixels. OAM/matrix/palette transfer remains **371/371 + 360/360**; source audit and retained receipts replay exactly, and Icy Wind remains independently exact.
- **Checks:** Focused Blizzard/Icy Wind/assets/framebuffer/boundary and coverage-ratchet tests, source audit, retained verifier, typecheck, animation audit/coverage, and `git diff --check` pass. Full `npm test` passes **1,047 files / 9,935 tests / 223 skipped** and production build passes **685 modules**. `ANIMATION_LATCHES.md`, boundary/barrier ratchets, canonical-recording imports, gameplay state, and controller/facility ownership remain unchanged.

# MOVE_YAWN bilateral exact production presentation — 2026-08-16 worker

- **State:** Coverage advances **190→191/276 Level-50 exact**, 0 partial, staged unchanged, and **86→85 unsupported**. Yawn alone promotes; Howl remains an independent exact DeepInhale regression control and the `pink-cloud-yawn-deep-inhale` track is fulfilled.
- **Did:** Added a pure source-relative Yawn reducer, typed Scene-ON seam, generated PINK_CLOUD asset, and Togetic/Gengar bilateral compositor. The implementation derives the observable 17-callback cloud affine cycle, source picture-offset heights **48/46/54**, side-specific cloud endpoints **(176,49)→(72,97)** for opponent-front, and BuildOamBuffer Y tie ordering. It owns no gameplay, damage, RNG, controller, turn, round, or facility state.
- **Verified:** Retained complete player-back **250..462 (213 rows)** and opponent-front **254..466 (213 rows)** windows pass **426/426 reducer/source-component/typed-seam/raw-RGB/shared-production-framebuffer rows** with zero residual pixels through first inactive cleanup. Source audit, twice-fresh probe/RGB/change-map hashes, legal-party staging, and existing OAM/palette/cloud-matrix latch gates remain pinned; no new latch mechanism was needed.
- **Checks/next:** Yawn reducer, framebuffer, evidence, Howl, and boundary tests; typecheck, animation audit/coverage, full `npm test`, and production build are required before handoff. `ANIMATION_LATCHES.md` and boundary/barrier ratchets remain unchanged; supervisor may select the next unsupported move after merge.

# MOVE_PAIN_SPLIT bilateral exact production presentation (2026-08-15 worker)

- **State:** Coverage advances **189→190/276 Level-50 exact**, with 0 partial, 0 staged, and **87→86 unsupported**. MOVE_PAIN_SPLIT alone promotes and the `pain-split-projectile-affine` track is fulfilled; no sibling receives credit.
- **Did:** Added a pure source-relative reducer for all six ballistic projectiles and three paired `AnimTask_PainSplitMovement` phases, reproducible literal PAIN_SPLIT gfx/palette extraction, a narrow typed Scene-ON seam, and source-derived bilateral Misdreavus/Gengar field compositor. It models callback bounce/frame geometry, side-specific front/back pic-coordinate offsets, affine/x2 phases, three centered `SE_M_SWAGGER2` restarts, tags, field chrome, and cleanup without gameplay ownership.
- **Verified:** The retained complete player-back **445..525 (81/81)** and opponent-front **446..526 (81/81)** windows pass **162/162** component/reducer/typed-seam/raw-RGB/shared-production-framebuffer rows with zero residual pixels. Ordinary OAM/palette remains RAM+1; each affine setup displays RAM+1 and each neutral reset RAM+2. Source/evidence/change-map digests remain pinned twice fresh, the literal asset regenerates byte-for-byte, and the boundary ratchet is unchanged.
- **Checks/next:** Focused evidence/framebuffer/boundary/count checks **42/42**, typecheck, animation audit/coverage, `git diff --check`, full `npm test` (**1,040 files / 9,890 passed / 224 skipped**), and production build (**682 modules**) pass. Resume the next supervisor-selected unsupported move; do not infer acceptance from Pain Split's shared affine/resource mechanisms.

# MOVE_PAIN_SPLIT bilateral source/staging/evidence checkpoint — remains unsupported (2026-08-15 worker)

- **State:** Coverage remains **189/276 Level-50 exact**, 0 partial, 0 staged, and **87 unsupported**. Pain Split has no reducer, typed seam, compositor, production draw/wiring, framebuffer acceptance, or coverage entry. Added the non-exclusive `pain-split-projectile-affine` evidence track; no sibling credit exists.
- **Source/staging:** The exclusive odd body is **0x082cb739..0x082cb7e1 (168 bytes, `176594e2…`)**. Audit pins all six projectile creates, three paired `AnimTask_PainSplitMovement` phases, literal 228-byte gfx / 40-byte palette / 16-byte animation / 24-byte template / 8-byte OAM records, three `SE_M_SWAGGER2` cues, callback/task teardown, tag unload, and no GPU-register ownership. Lowest Level-50 carrier is set **374 `FRONTIER_MON_MISDREAVUS_1`**. Complete bilateral challenge-2 parties use ordinary A input and stock AI; a faster Gengar's real Night Shade creates **117 vs 156 HP** before the slower Misdreavus uses Pain Split—no transient state or legacy battler injection.
- **Fresh evidence:** Four local-mGBA runs through `tools/run-mgba-probe.py` are byte-identical per orientation. Player-back **445..525 (81 rows)** has probe `f3af15c6…`, raw RGB `137d9e03…`, map `229aac9f…`; opponent-front **446..526 (81 rows)** has `6a7e5771…`, `e2804b16…`, `6351650f…`. All **162** rows retain task/sprite/software+hardware-OAM/matrix/palette/tag/register/audio/battler/party/engine/gameplay-RNG/animation-RNG/raw-RGB state and compact change maps through first inactive cleanup.
- **Measured:** Projectile pairs start at ages **4/29/54**; paired movement tasks and Swagger2 restarts at **16/41/66**. Whole OAM and palette are preceding-source **80/80** bilaterally. Both live affine setups write at source **16/41/66** and display **17/42/67 (RAM+1)**; resets write **28/53/78** and display **30/55/80 (RAM+2)**, a new non-contradictory task-specific latch recorded in `ANIMATION_LATCHES.md`. Pain Split tag **10239** is live ages 1..79 and absent at inactive age 80; gameplay RNG is invariant while animation RNG advances every comparable row.
- **Checks/next:** Focused source/staging/evidence/boundary **8/8**, typecheck, animation audit, coverage, `git diff --check`, full `npm test` (**1,038 files / 9,885 passed / 224 skipped**), and production build (**680 modules**) pass. Implement a pure source-relative reducer, narrow Scene-ON seam, and bilateral compositor later; require complete twice-fresh **162/162** production framebuffer equality before promoting Pain Split alone.

# MOVE_LEECH_SEED bilateral main+natural-residual exact (2026-08-15 worker)

- **State:** Coverage advances **188→189/276 Level-50 exact**, with 0 partial, 0 staged, and **88→87 unsupported**. MOVE_LEECH_SEED alone promotes; exact MOVE_ABSORB remains an independent regression control and outside-Factory MOVE_BULLET_SEED receives no credit. The `seed-projectile-leech-seed` track is fulfilled.
- **Did:** Added a pure source-relative two-body reducer, narrow typed `body` seam, literal reproducible SEED asset, and shared Scene-ON draw case. Main derives all three arcs, hidden waits, sprout animation/lifecycle, audio, tags and cleanup from callbacks; natural residual independently owns General ages 0..1, measured seeder/seeded roles, nested Move_ABSORB/AbsorbEffect/HealingEffect ages, 8 orbs, 4 stars and cleanup. Source BuildOamBuffer screen-Y ties and nested post-OAM creation passes are modeled without absolute oracle ticks or recordings.
- **Verified:** Complete production acceptance closes with zero residual pixels: player-back main **246..386 = 141/141**, residual **485..691 = 207/207**; opponent-front main **245..385 = 141/141**, residual **480..686 = 207/207**; **696/696 total** component/reducer/typed-seam/raw-RGB/shared-framebuffer rows. Literal asset extraction reproduces byte-for-byte. MOVE_ABSORB complete focused tests remain exact; boundary lists, unsupported barriers, recording allowlists, gameplay outcomes, RNG, AI, controller/round/facility state are unchanged.
- **Next:** Resume the next supervisor-selected unsupported Level-50 move/component track; do not infer Leech Seed acceptance for Bullet Seed or another drain body.

# MOVE_LEECH_SEED bilateral main+residual evidence checkpoint — remains unsupported (2026-08-15 worker)

- **State:** Coverage remains **188/276 Level-50 exact**, with 0 partial, 0 staged, and **88 unsupported**. MOVE_LEECH_SEED now has complete twice-fresh bilateral main+natural-residual evidence, but no reducer, typed seam, compositor, production draw/wiring, or coverage entry; exact MOVE_ABSORB remains a regression control only, and outside-Factory MOVE_BULLET_SEED receives no credit.
- **Did:** Added the non-exclusive `seed-projectile-leech-seed` track and a deterministic source audit. It pins the odd exclusive `Move_LEECH_SEED` body **0x082ca083..0x082ca0d9 (86 bytes, `a57a0f53…`)**, all three literal projectile arguments, sounds/waits, the 112+56+56-byte callback chain, 24-byte sprite template/animation/OAM contract, compressed SEED gfx/palette literals, and the 14-byte `General_LeechSeedDrain -> AnimTask_GetBattlersFromArg -> Move_ABSORB` graph plus `BattleScript_LeechSeedTurnDrain`. Lowest legal Level-50 carrier is set **112 `FRONTIER_MON_EXEGGCUTE`** in range 110..849.
- **Fresh evidence:** Four local-mGBA runs through `tools/run-mgba-probe.py` are byte-identical per orientation. Player-back main **246..386 (141)** / residual **485..691 (207)** has JSON `c90f08b1…` and raw RGB `a3610494…` / `d124f639…`; opponent-front main **245..385 (141)** / residual **480..686 (207)** has JSON `9a59920b…` and raw RGB `83e9553e…` / `f5b256e9…`. All **696** retained rows bank task/sprite/OAM/matrix/palette/tag/register/audio/party/engine/gameplay-RNG/animation-RNG/raw RGB and compact change maps. Natural stages use ordinary controller/stock AI, retain `leechSeededBy` provenance, reduce Leech Seed PP **10→9**, and drain Onix **110→97 HP**, with no transient state or legacy battler override.
- **Measured:** Each main window creates seeds at ages **4/14/24**, hides after the 35-tick arcs at **39/49/59**, runs sprout callbacks at **50/60/70**, first displays looping sprouts at **51/61/71**, reaches destroy callbacks at **112/122/132**, and cleans inactive at **140**. Main hardware OAM/matrices/palette are preceding software/faded **140/140** in both orientations. Residual owners are General **0..1**, Move_ABSORB **2..44**, AbsorbEffect **45..92**, Move **93..139**, HealingEffect **140..175**, Move/cleanup **176..206**; it creates 8 orbs and 4 stars. Residual OAM is RAM+1 **206/206**, palette is **205/206** with age-11 monbg same-row exception. At first observable General offset 9, roles are already seeder→seeded Onix in both orientations, proving the source task swap against concurrent provenance. Enemy shadow is already `SpriteCB_SetInvisible` throughout; no entry/teardown edge is claimed. No new or contradictory latch mechanism, so `ANIMATION_LATCHES.md` is unchanged.
- **Checks:** Focused Leech Seed + Absorb + boundary checks pass **17/17**; source audit, twice-fresh evidence replay, typecheck, animation audit, coverage, and `git diff --check` pass. The first full-suite attempt exposed only the absent gitignored WASM prerequisite; after `core-rs/build-wasm.sh` restored `factory_wasm.wasm` (`8b489813…`, 496,864 bytes), full `npm test` passes **1,035 files / 9,874 tests / 224 skipped** and `npm run build` passes **678 modules**.
- **Next:** Implement the pure source-relative main and residual reducers, narrow typed Scene-ON seam, Exeggcute/Onix compositor, and production draw/wiring; require all **696/696** retained rows to pass reducer/component/seam/raw-RGB/shared-framebuffer equality twice fresh with zero residual pixels before promoting Leech Seed alone.

# MOVE_DREAM_EATER exact — bilateral Scene-ON promotion (2026-08-15 worker)

- **State:** Coverage advances **187→188/276 Level-50 exact**, with 0 partial, 0 staged, and **89→88 unsupported**. Dream Eater alone promotes; Absorb, Mega Drain, and Giga Drain remain independent regression controls.
- **Did:** Added the pure odd-pointer source-relative reducer, narrow typed presentation seam, persistent ORBS/BLUE_STAR order, and Wigglytuff↔Onix compositor. It ports Set/UnsetPsychicBackground, both ShakeMon tasks, ScaleMonAndRestore, 24 literal Swagger absorption orbs, HealingEffect, monbg/splitbgprio_foes, 8:8→12:8 alpha, audio, palettes, field chrome, and cleanup without gameplay ownership.
- **Verified:** The complete twice-fresh evidence banks replay through reducer/seam and the shared production framebuffer at **533/533 zero-residual rows**: player-back **1308..1573, 266/266** (`5d7abe61…` / RGB `728a437b…`) and opponent-front **2146..2412, 267/267** (`ecac5fee…` / RGB `6866c7ce…`). The compositor honors ordinary OAM/palette RAM+1, target affine RAM+2, psychic-BG RAM+1, the distinct ShakeMon live-OAM versus mon-BG callback order, and orientation-specific equal-priority target/orb OAM overlap. Both windows enter with enemy shadow already invisible; no teardown edge is claimed and `ANIMATION_LATCHES.md` is unchanged.
- **Controls:** Mega Drain remains **436/436** and Giga Drain **460/460** production/evidence exact; Absorb focused checks remain green. No sibling promotion, gameplay/RNG ownership, animation-boundary widening, unsupported-branch barrier, or canonical-recording production import was added.
- **Next:** Supervisor verifies and merges this Dream Eater-only promotion; the next unsupported move remains a separate acceptance unit.

# MOVE_DREAM_EATER bilateral dense evidence checkpoint — remains unsupported (2026-08-15 worker)

- **State:** Coverage remains **187/276 Level-50 exact**, with 0 partial, 0 staged, and **89 unsupported**. This round adds evidence only: no Dream Eater reducer, typed seam, compositor, production draw/wiring, coverage entry, boundary/barrier change, or visual acceptance claim.
- **Corrective postflight (supervisor rejection):** The shared probe no longer emits Dream-only song symbols for Mega/Giga. Six direct fresh mGBA runs reproduce the banked JSON byte-for-byte — Mega `f8a37a18…` / `754755b6…`, Giga `18439dec…` / `54989251…`, Dream `5d7abe61…` / `ecac5fee…` — and Dream's raw-RGB sequences remain `728a437b…` / `6866c7ce…`; no evidence bank or coverage claim changed.
- **Evidence:** The corrected legal Wigglytuff↔Onix Scene-ON stages now reproduce byte-for-byte twice fresh through first inactive cleanup: player-back **1308..1573 (266 rows)**, probe `5d7abe61…`, raw-RGB sequence `728a437b…`, change map `2e18f3ce…`; opponent-front **2146..2412 (267 rows)**, probe `ecac5fee…`, raw-RGB sequence `6866c7ce…`, change map `f5cb7a03…`. All **533** rows retain source pointer/owner, complete task/sprite/OAM/matrix/palette/tag/BG/register/audio, party/engine/immutable state, animation RNG, and raw RGB; both orientations end at raw pointer **0x082d2e50** (Move_DREAM_EATER offset 105), inactive with zero visual/sound tasks, ORBS, or BLUE_STAR sprites.
- **Measured body:** Pointer owners are Move ages 0..9, SetPsychicBackground 10..47, Move 48..77, DreamEaterAbsorb 78..125, Move 126..172, HealingEffect 173..208, Move 209..226, UnsetPsychicBackground 227..264/265, then the inactive Move row. Audio starts at ages **10** Psybeam, **48** Minimize, Swagger at **78/84/90/96/102/108/114/120**, and Absorb2 at **173**, with bilateral attacker/target pans. Literal creates are **24 ORBS** (three at each Swagger age) and four healing stars at **173/182/191/200**.
- **Latches:** Whole hardware OAM and hardware palette equal the preceding software/faded buffers on **265/265 + 266/266** comparable rows, proving plain createsprite, x2/ShakeMon, default-visible, and palette RAM+1. The live target affine matrix equals source age−2 on **264/264 + 265/265** rows: source scale ages 48..77 display 50..79. Psychic BG offsets also equal preceding source on every comparable row. Both windows enter with the enemy-shadow slot already invisible (`SpriteCB_SetInvisible`), so Dream Eater does not independently exercise the outgoing-shadow teardown edge; age 1 does prove the ordinary whole-OAM catch-up. Age-99 equal-subpriority ObjBlend ORBS sort by descending y in stable `sSpriteOrder`, and hardware age 100 equals that software order, confirming the existing lower-hardware-rank overlap input. No new or contradictory mechanism, so `ANIMATION_LATCHES.md` is unchanged.
- **Controls:** Focused Dream Eater/source/Absorb/Mega Drain/Giga Drain/boundary checks pass **38/38**. The shared drain probe extension leaves Mega Drain and Giga Drain portable/framebuffer evidence green after their probe-source SHA pins move; Absorb, Mega Drain, and Giga Drain receive zero new credit and remain independently exact.
- **Next:** Implement a pure source-relative Dream Eater reducer, narrow typed Scene-ON seam, and source-derived Wigglytuff/Onix compositor from these maps; require **533/533** reducer/seam/component and twice-fresh production framebuffer equality through cleanup before promoting Dream Eater alone.

# MOVE_DREAM_EATER source/staging checkpoint — remains unsupported (2026-08-14 worker)

- **Corrective legality postflight:** Supervisor verification rejected the original handoff because five of its six setup IDs were outside challenge 2's legal **267..371** range, and live service runs then showed that the claimed controller routes selected Brick Break on the player side and stopped before Dream Eater on the opponent side. The fixtures now use the bilateral source/generated-inventory selection `[312,313,314]` ↔ `[267,268,269]`; the audit pins all six exact constants, source roster entries, generated records, and `sInitialRentalMonRanges[2]`. The player cursor now selects SING then DREAM EATER. The opponent stage uses only Wigglytuff set 312's source SING/DREAM EATER moves duplicated across its legal slots so stock AI—not an injected decision—chooses the route under seed `305419899`.
- **State:** Coverage remains **187/276 Level-50 exact**, with 0 partial, 0 staged, and **89 unsupported**. Dream Eater has no coverage entry, dense oracle receipt, reducer, seam, compositor, or visual claim; Absorb, Mega Drain, and Giga Drain remain exact controls only.
- **Did:** Added a deterministic source audit and capture-free complete bilateral Scene-ON `mechanicLab` stages. The raw data-pointer interval is the genuinely odd **0x082d2de7..0x082d2e51** (106 bytes), followed by 409-byte `DreamEaterAbsorb`; the audit pins the exact five-script structure (`Move_DREAM_EATER`, `SetPsychicBackground`, `DreamEaterAbsorb`, `HealingEffect`, `UnsetPsychicBackground`), 8×3 (**24**) Swagger ORBS, psychic BG / monbg / split-priority / 8:8→12:8 alpha, target ShakeMon+ScaleMonAndRestore, blue-star healing, cleanup, and the battle-script `STATUS1_SLEEP` gate. The lowest legal Level-50 carrier is set **312 `FRONTIER_MON_WIGGLYTUFF_2`**. Both orientations retain complete three-Pokémon `overrides.parties`, ordinary controller input, and no transient state or legacy battler override.
- **Verified:** Both corrected fixtures are accepted by `bin/oracle --profile battle-scene-on lab` with `rangeIndex: 2`, `sourceInitialized: true`, and `customPartiesBuiltBeforeBattle: true`. Player-back seed `305419897` proves SING PP **15→14**, DREAM EATER PP **15→14**, Onix **110→50 HP** asleep, and Wigglytuff restored to **215/215 HP**. Opponent-front seed `305419899` proves stock AI's duplicated source-set SING slots **15→14 each**, DREAM EATER slot 3 **15→14**, Onix **110→51 HP** asleep, and Wigglytuff restored to **215/215 HP**. These are semantic service outcomes only; no captures are committed and no visual acceptance is claimed. The source/Tier-1 checkpoint pins the corrected fixture SHAs. No reducer, production seam/compositor, coverage promotion, latch measurement, boundary/barrier change, or sibling credit was added.
- **Next:** A later visual round must obtain Dream Eater’s own twice-fresh dense bilateral windows through first inactive cleanup and measure its separate OAM/palette/ShakeMon, affine scale, psychic-BG/monbg, shadow, and SortSprites/OAM latches before any reducer, seam, compositor, or acceptance claim.

# MOVE_GIGA_DRAIN exact — bilateral Scene-ON promotion (2026-08-14 worker)

- **Corrective postflight (Sol/high):** Supervisor verification rejected the Luna handoff despite its green claim. Sol/high repaired the two `unknown` item type errors, proved the shared probe's Mega Drain branch remains semantically unchanged before updating its pinned hash, restored Mega Drain's 436/436 portable and framebuffer controls, updated stale Giga/Metal Sound/Mist Ball/source-audit assertions, and advanced only genuine coverage ratchets to 187 exact / 89 unsupported; no animation behavior, evidence window, latch, boundary, barrier, or sibling coverage changed.
- **State:** Coverage advances **186→187/276 Level-50 exact**, with 0 partial, 0 staged, and **90→89 unsupported**. Giga Drain alone promotes; Absorb and Mega Drain remain independent controls, and Dream Eater remains unsupported.
- **Did:** Added the pure source-relative reducer, narrow typed Scene-ON seam, persistent source `SortSprites` order, and Roselia↔Onix compositor. The implementation owns the even **0x082d1242..0x082d12b1** root, 409-byte `GigaDrainAbsorbEffect`, animation-0 IMPACT, eight literal three-orb groups (**24** variable-amplitude ORBS), shared HealingEffect, eight `SE_M_GIGA_DRAIN` restarts, +5 ShakeMon windows, monbg/split-priority/12:8 alpha, green blend **0→12→0**, and cleanup. It owns no damage, HP/healing outcome, RNG, status, turn, controller, round, or facility state.
- **Evidence:** Fresh Scene-ON runs reproduce byte-for-byte twice per orientation through the first inactive cleanup: player-back **214..443 (230 rows)** and opponent-front **214..443 (230 rows)**. Full task/sprite/OAM/matrix/palette/tag/BG/register/audio/party/engine/gameplay-RNG/animation-RNG/raw-RGB state is retained. Hardware OAM/matrices/BG offsets are preceding-source **229/229**; palette is preceding-faded **228/229**, with measured monbg same-row exception age 10. Portable evidence and shared production framebuffer both pass **460/460**; framebuffer residual is zero in every row.
- **Oracle provenance:** `tools/check-oracle-freshness.sh` still reports both shared ports older than harness HEAD `b4097e84`. This worker did not restart or stop the shared service under the worker lifecycle contract; direct Scene-ON probes were run through `tools/run-mgba-probe.py` twice fresh per orientation and are byte-identical, and `bin/oracle --profile battle-scene-on info` answered normally.
- **Controls:** `MOVE_ABSORB` and `MOVE_MEGA_DRAIN` receive no inherited acceptance or latch credit; `MOVE_DREAM_EATER` remains independently unsupported. No boundary/barrier or latch ledger change was needed.
- **Next:** Supervisor verifies and merges this Giga Drain-only promotion; final focused/full tests, typecheck, audit/coverage, and build are green. No sibling promotion.

# MOVE_MEGA_DRAIN exact — bilateral Scene-ON promotion (2026-08-14 worker)

- **State:** Coverage advances **185→186/276 Level-50 exact**, with 0 partial, 0 staged, and **91→90 unsupported**. Mega Drain alone promotes; Absorb remains a source-identity control, while Dream Eater and Giga Drain remain independently unsupported.
- **Did:** Added a pure source-relative Mega Drain reducer, narrow typed Scene-ON seam, persistent `SortSprites` painter-order reducer, and production compositor. It owns animation-1 IMPACT, the 16 literal paired target-to-attacker ORBS, Bubble3 restarts, own ShakeMon cadence, `simple_palette_blend` 0→8→0, monbg/split priority/12:8 alpha, shared HealingEffect, source cleanup, and the one initial opponent elevated-shadow OAM row—never damage, HP/healing, RNG, status, turn, or facility state.
- **Verified:** Complete legal Skiploom→Onix windows pass production shared-framebuffer RGB with zero residual: player-back **75..292 (218/218)** and opponent-front **79..296 (218/218)**, **436/436** total. Four new mGBA probe runs through `tools/run-mgba-probe.py` were byte-identical per orientation (player JSON `f8a37a18…`; opponent `754755b6…`); both fresh production RGB banks close 218/218 at concatenated SHA-256 `e8ddd3a6…` / `30559dd5…`. The committed portable and framebuffer verifiers remain 436/436.
- **Latches:** No `ANIMATION_LATCHES.md` update: the one leading opponent shadow is the existing `SpriteCB_EnemyShadow`/one-display OAM teardown rule, and Mega Drain otherwise proves the established ordinary RAM+1 OAM, matrix, palette, BG, and ShakeMon transfer behavior.
- **Next:** No sibling receives coverage from this move. Dream Eater and Giga Drain retain their own full-body evidence/acceptance work.

# MOVE_MEGA_DRAIN source/staging checkpoint — remains unsupported (2026-08-14 worker)

- **State:** Coverage stays **185/276 Level-50 exact**, with 0 partial, 0 staged, and **91 unsupported**. Mega Drain has no coverage entry or dynamic evidence; Absorb remains the exact control and Dream Eater/Giga Drain remain independent unsupported controls.
- **Did:** Added deterministic `megaDrainSourceAudit.ts` plus Tier-1 staging tests. It pins the exclusive even-pointer body **0x082d10b2..0x082d1121** (111 bytes), `MegaDrainAbsorbEffect` (289 bytes), shared `HealingEffect` (73 bytes), `AnimTask_ShakeMon`, absorption/palette callbacks, ORBS/IMPACT/BLUE_STAR assets, register/monbg/split-priority/cleanup paths, and all eight paired source groups (**16** total orbs). The legal lowest Level-50 Factory carrier is `FRONTIER_MON_SKIPLOOM` set 129; added complete capture-free player-back and opponent-front Skiploom→Onix `mechanicLab` stages. The manual acceptance queue was stale (`DRAGON_BREATH` and `BIND` were already exact), so it now names only unsupported `MOVE_MEGA_DRAIN`.
- **Verified:** Standalone source audit succeeds with ROM + stage SHA pins; focused new source/staging, existing Absorb, boundary, and manual-queue coverage tests pass **20/20**. `npm run animation:audit`, `npm run animation:coverage` (**185/276 exact, 91 unsupported**), and `npm run typecheck` pass. After rebuilding the gitignored local WASM prerequisite (`08436ef1…`, 509,475 bytes), full `npm test` passes **1,020 files / 9,812 tests / 223 skipped** and `npm run build` passes (**672 modules**). No oracle command or capture was run under the stale-service constraint.
- **Next:** After a **fresh Scene-ON restart**, take a **twice-fresh complete bilateral capture** through the shared seam, bank Mega Drain’s own per-orientation change maps, and measure plain sprite OAM/palette, `AnimTask_ShakeMon`, and default-visible events before any reducer/seam/compositor or coverage claim.
- **Notes:** No `ANIMATION_LATCHES.md` change: the supplied plain-sprite/palette and `AnimTask_ShakeMon` RAM+1 plus default-visible one-frame expectations are unmeasured Mega Drain hypotheses, not inheritable Absorb latches. No reducer, typed seam, compositor, framebuffer/pixel lookup, gameplay state, boundary widening, unsupported barrier, or sibling promotion was added.

# MOVE_LUSTER_PURGE exact — corrected Latios bilateral promotion (2026-08-14 worker)

- **State:** Coverage advances **184→185/276 Level-50 exact**, with 0 partial, 0 staged, and **92→91 unsupported**. Luster Purge alone promotes; all named component siblings remain independent.
- **Did:** Added the narrow internal-species-408 LATIOS typed seam, reproducibly extracted WHITE_CIRCLE_OF_LIGHT asset, and a source-derived compositor for psychic/white BG fades, monbg, Exclude/particle ramps, affine circle, six controller-supplied visual-RNG hitsplats and panned sounds, target `(5,14)` HorizontalShake, restore, chrome, and cleanup. The compositor derives `SortSprites` descending-y/stable-creation order and owns no damage, effect, gameplay RNG, outcome, turn, controller, round, or facility state.
- **Verified:** Corrected player-back **78..410** and opponent-front **82..414** each pass **333/333 reducer/component/typed-seam/raw-RGB/production-framebuffer rows** twice fresh, **666/666** total with zero residual pixels. Immutable gameplay/RNG state remains stable; state/raw/map receipts remain player `4bdc1cbd… / ff5ac134… / 9f30efc3…`, opponent `b2493b91… / 9ffb3355… / 4cc4bf0a…`.
- **Latches:** OAM/matrices/BG offsets use preceding source **332/332** per orientation; palette is preceding faded **331/332** with age-45 monbg setup as the only exception. Corrected map coordinates are player BG2 `[-40,-51]→[472,461]` and opponent BG1 `[-144,-4]→[368,508]`, contradicting the prior stale `-58/-19` labels; both clear at 295. BLDCNT/BLDALPHA/BLDY changes remain 6/2/64 and finish at 331.
- **Sibling/control:** DRAGON_CLAW, COSMIC_POWER, CALM_MIND, EARTHQUAKE, and FISSURE remain independently exact after **30/30** focused tests. SKY_ATTACK, RETURN, FLATTER, DESTINY_BOND, HEAL_BELL, SILVER_WIND, MAGNITUDE, and ERUPTION remain unsupported in the generated source graph; no sibling receives Luster Purge acceptance.
- **Checks:** Compatibility receipt `deef4206` replaces the unsupported ES2023 `toSorted`/`toReversed` calls with non-mutating `slice().sort`/`slice().reverse`, retaining stable creation ties and reverse paint order. Focused Luster source/evidence/reducer/boundary **20/20**, source audit, portable **666/666 twice**, and production framebuffer **666/666 twice with zero residual pixels** pass; `npm run typecheck`, full `npm test`, `npm run build`, and `npm run animation:audit` are green. Coverage remains **185/276 exact, 91 unsupported**. No animation boundary, unsupported barrier, canonical production import, framebuffer lookup, or gameplay ownership widened.
- **Next:** Supervisor merges the Luster Purge promotion plus compatibility receipt; next coverage action is `water-orb-hydro-pump-whirlpool`, proving `MOVE_HYDRO_PUMP` first and then independently auditing `MOVE_WHIRLPOOL` (no inherited acceptance).

# MOVE_LUSTER_PURGE corrected Latios evidence checkpoint — remains unsupported (2026-08-14 worker)

- **State:** The attempted compositor promotion was rejected because both prior mechanicLab scenarios staged internal species **381 = Relicanth**, despite Latios labels. Corrected both complete legal bilateral parties to internal species **408 = Latios**; coverage remains **184/276 Level-50 exact**, 0 partial, 0 staged, and **92 unsupported**.
- **Did:** Fresh Scene-ON probes now prove the active staged carrier is Latios: species 408, Dragon/Psychic types `[16,14]`, Levitate `26`, stats `{attack:99, defense:100, speed:130, spAttack:188, spDefense:130}`, HP 176/176, active sprite data species 408, `gMultiuseSpriteTemplate`, source `FRONTIER_MON_LATIOS_4`, Latios art, healthbox templates, and source name text. Player-back **78..410 (333 rows)** repeats byte-identically with probe `89a1306e…`, dense `4bdc1cbd…`, raw RGB `ff5ac134…`, map `9f30efc3…`; opponent-front **82..414 (333 rows)** repeats byte-identically with probe `d30bf9ad…`, dense `b2493b91…`, raw RGB `9ffb3355…`, map `4cc4bf0a…`.
- **Verified:** Corrected reducer/portable replay passes **666/666** retained rows. Both orientations latch hardware OAM/matrices to preceding software **332/332**, hardware palette to preceding faded **331/332**, and active BG offsets to preceding source **332/332** (`BG2 [-40,-58]→[472,454]` player; `BG1 [-144,-19]→[368,493]` opponent), clearing at relative row 295; `BLDCNT` transitions end at relative row 331, with 6 changes, 2 `BLDALPHA`, and 64 `BLDY` changes. No seam/compositor/framebuffer acceptance or coverage credit was added.
- **Next:** Latios-only typed presentation seam and source-derived compositor acceptance, with twice-fresh complete framebuffer equality; preserve all siblings and the 184/276 + 92 unsupported gates.

# MOVE_LUSTER_PURGE pure reducer checkpoint — remains unsupported (2026-08-14 worker)

- **State:** Coverage remains **184/276 Level-50 exact**, 0 partial, 0 staged, and **92 unsupported**. Luster Purge has a pure source-relative reducer only; typed seam/framebuffer acceptance remains **0/665** and no sibling receives credit.
- **Did:** Modeled the full retained script/task/sprite/resource/palette-task/GPU/audio topology for player-back and opponent-front, including psychic/white fades, circle affine lifecycle, both palette blends, six explicitly supplied visual-`Random2()` hitsplats, six panned sound starts, HorizontalShake, monbg, restore, and cleanup. The portable verifier matches **333/333 + 332/332 = 665/665** retained rows and pins immutable gameplay state/RNG. Follow-up `3833ab05` removes the rejected unused local, derives every retained public state field from raw rows or pinned source semantics (phase, palette-task summaries, Solar Beam SE2 start/pan and Hyper Beam SE1 starts/pans), and removes the unobservable `impactBlend` summary.
- **Next:** Add the narrow typed presentation seam and source-derived compositor, then require twice-fresh complete production framebuffer equality before promoting Luster Purge alone.
- **Notes:** The original `5bb930f7` handoff was rejected solely for `TS6133` on its unused `restore`; `3833ab05` fixes it without behavior change. Supervisor verification is focused source/evidence/reducer/boundary **17/17**, portable **665/665**, animation audit/coverage (**184/276 exact**), typecheck, post-merge `npm test` **1,061 files / 9,974 passed / 1 skipped**, and build **669 modules**. No framebuffer or audio-sample equality is claimed. No coverage/latch ledger, animation boundary, unsupported barrier, canonical recording import, gameplay/RNG/turn/controller/facility state, absolute-tick/frame/hash/RGB lookup, fitting, or sibling status changed.

# MOVE_LUSTER_PURGE bilateral dense Scene-ON evidence checkpoint — remains unsupported (2026-08-14 worker)

- **State:** Coverage remains **184/276 Level-50 exact**, 0 partial, 0 staged, and **92 unsupported**. This is an evidence-only checkpoint: Luster Purge has `coverageCredit: false`; Mist Ball, Flail, Heat Wave, Calm Mind, and every shared-component sibling remain independent controls.
- **Did:** Audited the exclusive even-pointer-bounded `Move_LUSTER_PURGE` body **0x082ce517..0x082ce62e** (normalized first pointer **0x082ce516**) plus `UnsetPsychicBackground` **0x082d7cdd..0x082d7ce5**, source ROM digests, the generated **19-node** graph, `FRONTIER_MON_LATIOS_4` (set 799, species 381, Modest) carrier, IMPACT/WHITE_CIRCLE_OF_LIGHT assets, circle template, FadeScreenToWhite, excluded palette/particle tasks, HorizontalShake, psychic/white BG/monbg/alpha/restore/cleanup, six panned sound calls, six random hitsplats, and **12** fixed-animation visual `Random2()` placement draws. Added complete legal three-Pokemon parties in both orientations; no transient HP/status/stages/weather/outcome was staged.
- **Verified:** Fresh Scene-ON runs reproduce byte-for-byte twice per orientation through first inactive cleanup: player-back **frames 301..633 (333 rows)**, dense-state `b122421f…`, probe `38e6af96…`, raw RGB sequence `111e05ee…`, normalized map `e52ca59a…`; opponent-front **frames 302..633 (332 rows)**, dense-state `3ab721a8…`, probe `f8b35477…`, raw RGB sequence `52cad34f…`, normalized map `aa08aefd…`. Every row retains tasks/data, sprites/callbacks/data, software+hardware OAM, 32 software+hardware matrices, faded/unfaded/hardware palettes, tags, 20 BG/window/blend registers, BG tiles/map, scanline buffers, audio, battlers/parties/engine, immutable gameplay state/RNG, animation RNG, and raw RGB; state, battlers, parties, and engine are each stable across all retained rows.
- **Latches:** Hardware OAM = preceding software, matrices = preceding software, and hardware palette = preceding faded on **332/332** player and **331/331** opponent comparable rows. The active target BG follows the preceding source row on **BG2 332/332** player rows (`[-40,-58] → [472,454]`) and **BG1 331/331** opponent rows (`[-144,-19] → [368,493]`); both clear at relative row 295. `BLDCNT` changes **6** times, `BLDALPHA` **2**, and `BLDY` **64**; exact transition rows are pinned in `luster-purge-evidence.json` and the Tier-1 test.
- **Next:** Derive a source-relative reducer, typed presentation seam, and source-derived compositor from this receipt, then require twice-fresh complete reducer/seam/framebuffer equality before any Luster Purge promotion. No production animation, framebuffer lookup, coverage entry, boundary/barrier, or latch-ledger change was made.
- **Notes:** Reproducible probe is `tools/compare/lusterPurgeProbe.py`; full state/raw-RGB/change-map artifacts and source/scenario SHA gates are committed. No damage, gameplay RNG, AI, SpDef effect, turn, controller, round, facility, absolute-tick, coordinate/RGB fitting, or sibling ownership was added. No new non-contradictory mechanism required an `ANIMATION_LATCHES.md` update.

# MOVE_FLAIL exact — all six power bands bilateral (2026-08-14 worker)

- **State:** Coverage advances **183→184/276 Level-50 exact**, 0 partial, 0 staged, and **93→92 unsupported**. Flail alone promotes; Luster Purge remains independently unsupported.
- **Did:** Ported `AnimTask_FlailMovement` into a pure source-relative reducer, added a narrow typed seam carrying immutable move power, target baseline, hitsplat anchor, and the two visual `Random2()` inputs, and composed source-derived KRABBY/ONIX art through the shared Scene-ON renderer. The compositor applies the live attacker's callback-written offset and matrix at RAM+2; fixed hitsplat, power shake, monbg/alpha, healthboxes, text, and cleanup remain relative to move age.
- **Verified:** Retained natural powers **40/80/100/150/200** pass **1,140/1,140** source/reducer/seam/raw-RGB/production-framebuffer rows across both orientations. Full-band power 20 was regenerated twice fresh per orientation and passes **456/456** rows with zero residuals; raw sequences exactly retain player `dcad7a27…` and opponent `c0eb1a48…`. The relied-on latch contract is exactly: **“Whole hardware OAM is preceding software; the live-attacker rotation matrix is RAM+2; the fixed-animation random hitsplat uses ordinary OAM RAM+1 plus fresh-affine paint RAM+2 and teardown RAM+1; hardware palette is preceding faded, with same-row monbg setup at age 4.”** Every retained natural branch map pins that contract, and both full-band branch receipts agree.
- **Next:** Supervisor merges this Flail-only promotion. Luster Purge still needs its own complete audit, bilateral evidence, reducer, seam, compositor, and acceptance.
- **Notes:** The visual RNG seam consumes no RNG and gameplay RNG/state remain immutable. Production imports no recording and adds no absolute battle tick, per-age/frame/hash/RGB/coordinate lookup, capture thinning, damage/HP calculation, AI, turn, controller, round/facility ownership, boundary widening, or unsupported barrier. No new contradictory latch mechanism was found, so `ANIMATION_LATCHES.md` is unchanged.

# MOVE_FLAIL natural HP/power bilateral evidence checkpoint — remains unsupported (2026-08-14 worker)

- **State:** Coverage remains **183/276 Level-50 exact**, 0 partial, 0 staged, and **93 unsupported**. Natural power **40/80/100/150/200** is now evidence-complete in both orientations, but every branch has `coverageCredit: false`; full-HP power 20 remains in the prior checkpoint. Flail and Luster Purge remain independent unsupported moves.
- **Did:** Added complete legal Scene-ON three-Pokemon parties whose real Super Fang turns stage Krabby HP **137→69→35→18→9→5** with no transient-state injection, and extended the pointer-bounded probe with expected-power selection. Retained one 114-row source window through first inactive cleanup for each power/orientation, twice fresh, with compressed state, 114-frame raw-RGB, and normalized change-map receipts.
- **Verified:** **10 branch/orientation pairs × 2 runs × 114 rows = 2,280 captured rows** (1,140 unique-window rows), all task/sprite/OAM/matrix/palette/tag/register/audio/battler/party/engine/gameplay-RNG/animation-RNG/raw-RGB fields complete and byte-stable. Source windows are player **429..542, 1863..1976, 3314..3427, 4040..4153, 4769..4882** and opponent **429..542, 1863..1976, 2580..2693, 3306..3419, 4035..4148** for powers 40/80/100/150/200. Whole OAM is preceding software **113/113** and live-attacker matrix **RAM+2 (112/112)** every branch; palette is preceding faded **112/113** at power 40 and **113/113** at powers 80/100/150/200, with same-row monbg setup age 4. Full SHAs and branch-local HP, shake, hitsplat, RNG, state, RGB, and map gates are machine-pinned in `flail-natural-hp-evidence.json`.
- **Next:** None for evidence. A future worker must derive the pure source-relative reducer, immutable visual-RNG seam, and KRABBY/ONIX compositor, then require twice-fresh zero-residual acceptance for every required branch before promoting Flail alone. Luster Purge receives no Flail reducer, receipt, or coverage credit.
- **Notes:** Existing `ANIMATION_LATCHES.md` Flail mechanism remains consistent across all ten branches; no new or contradictory latch was measured, so that ledger is unchanged. No damage/HP calculation, gameplay RNG, AI, turn/controller/round/facility state, boundary/barrier, canonical import, absolute tick, per-frame/hash/RGB/coordinate lookup, production framebuffer, or sibling status changed.

# MOVE_ROCK_TOMB exact — bilateral Scene-ON promotion (2026-08-14 worker)

- **State:** Coverage advances **182→183/276 Level-50 exact**, with 0 partial, 0 staged, and 93 unsupported. Rock Tomb alone promotes; Hyper Voice remains independently unsupported.
- **Did:** Added the typed source-relative four-fall/platform/Red-X/ShakeMon reducer, narrow Scene-ON seam, and source-derived GRIMER/ONIX + ROCKS/X_SIGN compositor. The reducer and seam compare every retained player-back **217..390 (174)** and opponent-front **229..402 (174)** row; production owns no damage, Speed drop, RNG, AI, turn, controller, or facility state.
- **Verified:** Two fresh Battle Scene ON runs pass **348/348 reducer, 348/348 seam, 346/346 OAM, 346/346 matrices, 346/346 palettes, 10/10 audio, 348/348 immutable state, 348/348 raw RGB, and 348/348 production framebuffer rows**, with zero residual ages in both orientations. State/raw-RGB-archive/change-map digests are player `a480b906… / 0f0b9a2b… / 58e21ab1…`, opponent `f2e7f0ca… / bd5bc48b… / e967063d…`.
- **Latches:** Whole hardware OAM/matrices/palettes and BG3 transfers use the preceding software/faded source row on 173/173 comparable rows per orientation. Rock Tomb's move-local late ShakeMon transfer and fourth-rock OAM tie order are pinned in `ANIMATION_LATCHES.md`.
- **Next:** Supervisor merges this Rock Tomb-only promotion. Hyper Voice needs its own complete audit, bilateral evidence, reducer, seam, compositor, and acceptance.
- **Notes:** Scene-ON v5 was fresh and reachable; the coarse freshness gate remains failed only because the service predates doc-only harness commits, while the path-scoped material-freshness proof is empty/clean. No gameplay/RNG/outcome/controller/turn/round/facility state, boundary/barrier, canonical import, absolute-frame/hash/RGB/coordinate lookup, or sibling acceptance changed.

# MOVE_MEMENTO exact — bilateral static-monbg scanline compositor (2026-08-14 worker)

- **State:** Coverage advances **181→182/276 Level-50 exact**, 0 partial, 0 staged, and **95→94 unsupported**. Memento alone moves; Dig remains independently unsupported.
- **Did:** Added the narrow typed Memento Scene-ON seam and production compositor for InitMementoShadow, both attacker/target scanline phases, MementoHandleBg, static monbg/clear, window/blend/palette/priority lifecycle, black copied battler art, alpha, and cleanup. The compositor reuses source-derived WEEZING/ONIX, healthbox, background, and battle-window assets; no recorded pixels enter production.
- **Verified:** Player-back frames **70..247** pass **178/178 reducer/seam/raw-RGB/production framebuffer**, and opponent-front frames **74..248** pass **175/175**, twice fresh with zero residual rows/px. Digests remain player `3f423ec8… / a9604de7… / adb0e7cf…`, opponent `224db6ea… / c115ea0c… / f5086737…`; OAM/matrix transfer is **177/177 + 174/174**, palette **175/177 + 172/174** with the retained age-4 and static-monbg exceptions.
- **Next:** Supervisor merges this Memento-only promotion. MOVE_DIG inherits no seam, receipt, latch, or acceptance.
- **Notes:** New bilateral display rule: copied mon/scanline bank uses the preceding source row; current hardware window/blend gates it; BG1 begins at scanline 1 while BG2 can affect scanline 0. No gameplay/RNG/outcome/controller/turn/round/facility state, boundary list, unsupported barrier, canonical import, absolute-tick/frame/hash/RGB lookup, coordinate fit, or sibling promotion changed.

# MOVE_MEMENTO pure reducer checkpoint — remains unsupported (2026-08-14 worker)

- **State:** Coverage remains **181/276 Level-50 exact**, 0 partial, 0 staged, and 95 unsupported. Memento and Dig remain independently unsupported; explicit source/reducer equality is **178/178 + 175/175**, while seam/framebuffer acceptance remains **0/178 + 0/175**.
- **Did:** Added a pure source-relative reducer for the complete Memento task/data topology: attacker and target phases, `DoMementoShadowEffect` scanline control and both 320-entry banks, battler priority, static-monbg/register/alpha lifecycle, cleanup, and first inactive row. Portable and Tier-1 acceptance now compare every projected row explicitly, including monbg state, and fail closed under source-surface mutation; gameplay/RNG/outcome inputs remain immutable.
- **Verified:** Bilateral portable replay passes twice at **178/178 + 175/175**. State/raw/map digests remain player `3f423ec8… / a9604de7… / adb0e7cf…`, opponent `224db6ea… / c115ea0c… / f5086737…`; retained OAM/matrix transfer is **177/177 + 174/174** and palette transfer **175/177 + 172/174**, including age-4 same-row transfer and the player-age-91/opponent-age-90 monbg exceptions. Source audit, focused reducer/source/boundary **11/11**, animation audit/coverage, typecheck, smoke **375/375**, full suite **1,048 files / 9,869 passed / 1 skipped**, and the **664-module** build are green; the full run used the rebuilt pinned **509,805-byte `d415fea6…`** gitignored WASM prerequisite.
- **Next:** Add the narrow typed bilateral presentation seam and source-derived compositor, then require complete twice-fresh production framebuffer equality before promoting Memento alone.
- **Notes:** No coverage/latch ledger, animation boundary, unsupported barrier, canonical production import, gameplay/RNG/turn/controller/facility state, absolute-tick/frame/hash/RGB lookup, coordinate fitting, capture thinning, or Dig reducer/seam/receipt/promotion changed.

# MOVE_MEMENTO bilateral dense evidence checkpoint — remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **181/276 Level-50 exact**, 0 partial, 0 staged, and 95 unsupported. Memento and Dig remain independently unsupported; reducer/seam/framebuffer acceptance is **0/178 + 0/175**.
- **Did:** Added the complete real-label-pointer-bounded Scene-ON probe and retained set-501 WEEZING/ONIX bilateral state/RGB archives and normalized maps. Player-back frames **70..247 (178/178)** and opponent-front frames **74..248 (175/175)** reproduce byte-for-byte twice fresh through first inactive cleanup, retaining every live task/data word, both scanline buffers, battlers/parties, software+hardware OAM/matrices, faded/unfaded/hardware palettes, BG/window/blend registers, audio, tags, gameplay/RNG/outcome state, and raw RGB.
- **Verified:** Standalone source audit and bilateral portable pass twice. Full prior software→hardware OAM/matrix transfer is **177/177 + 174/174**; preceding faded→hardware palette is **175/177 + 172/174**, with independently measured age-4 same-row transfer and one known-class monbg exception at player age 91 / opponent age 90. State/raw/map digests are player `3f423ec8… / a9604de7… / adb0e7cf…`, opponent `224db6ea… / c115ea0c… / f5086737…`. Focused/boundary **7/7**, post-WASM parity/focused **141/141**, smoke **375/375**, animation audit/coverage, typecheck, and the **664-module** build are green.
- **Next:** Derive the pure source-relative attacker/target/scanline/register reducer from these complete rows, then add the narrow typed bilateral seam and compositor; require complete twice-fresh production framebuffer equality before promoting Memento alone.
- **Notes:** The coarse freshness gate fails because Scene-ON started **12:50:32** before harness `39ca5d64`; path-scoped `oracle/`, `bootstrap/`, and `tools/` diff is empty and that commit changes only the four named workspace planning ledgers, so the service is materially fresh under the recorded precedent. The initial full suite entered the known long recursive CGB4 tail and exposed only the missing gitignored WASM prerequisite before being stopped for cap; rebuilt pinned **509,805-byte `d415fea6…`** WASM and all 10 parity files then pass, but cap prevented a second complete `npm test`. No coverage/latch ledger, gameplay/RNG/outcome/controller/facility state, boundary/barrier, canonical import, fitting/lookup, or Dig receipt/promotion changed.

# MOVE_MEMENTO source-complete checkpoint — Scene-ON capture blocked, remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **181/276 Level-50 exact**, 0 partial, 0 staged, and 95 unsupported. Memento and Dig remain independently unsupported; no reducer, seam, compositor, dense oracle receipt, or production-framebuffer claim was added.
- **Did:** Strengthened the retained source receipt from v1→v2: exact all-**22-command** script order including delays/audio/waits; **14** contiguous ROM intervals for the script, attacker/target init+step, scanline reducer, battler-priority helper, InitShadow/HandleBg, static-monbg/clear task, setalpha, and blendoff; and SHA-256 for both complete bilateral set-501 WEEZING/ONIX fixtures (`46e86371…`, `bf85f269…`). Dig is still a distinct 17-component two-turn dirt/movement/hitsplat/ShakeMon body sharing only static monbg/clear.
- **Verified:** Source audit and focused source/boundary tests pass **6/6**; animation audit/coverage, typecheck, smoke **375/375**, and the **664-module** build are green. The initial full run passed **1,036 files / 9,090 tests** and failed only 19 tests across six files because the gitignored WASM prerequisite was missing; after building the pinned **509,805-byte `d415fea6…`** artifact, all affected files pass **21/21**. Cap pressure prevented a second 26.5-minute full run. Freshness rejected selected port 8012 (start **12:50:32**) as older than harness HEAD `438d06ba` (**20:45:03**), so no stale oracle result was accepted.
- **Next:** Supervisor must restart the Scene-ON service, then capture both complete real-even-pointer-bounded Memento windows twice fresh through first inactive cleanup with the full requested task/scanline/buffer/OAM/matrix/palette/register/audio/resource/gameplay/RGB/map surface. Only after that evidence may a reducer, typed seam, compositor, latch entry, or Memento-only promotion be considered.
- **Notes:** Source-ROM anchors include script `d90fcaf2…`, attacker init/step `58196e99…`/`9b837f75…`, target init/step `03bca87f…`/`9b00c913…`, scanline `756a5493…`, InitShadow/HandleBg `ed9bc69a…`/`4f7b93f5…`, static monbg/clear `6fcb0324…`/`2a883ace…`. No `ANIMATION_COVERAGE.json` or `ANIMATION_LATCHES.md` change, gameplay/RNG/outcome/controller/facility ownership, boundary/barrier, canonical import, lookup/fitting, or sibling promotion.

# MOVE_ICY_WIND exact — bilateral generic OBJ scanline closure (2026-08-13 worker)

- **State:** Level-50 coverage advances **180→181/276 exact**, 0 partial, 0 staged, and unsupported falls **96→95**. Icy Wind alone is promoted; Blizzard remains independently unsupported.
- **Did:** Replaced unlimited snowball painting with the shared generic 1210-cycle GBA OBJ scanline evaluator. The staged compositor now derives persistent source allocator slots and stable `BuildOamBuffer` order for nine healthbox parts, battlers/monbg visibility, spikes, and snowballs; the side-specific spike slots reproduce the opponent slot-13 collision during late creation. No move-specific pixel mask or age/frame/RGB lookup was added.
- **Verified:** Twice-fresh complete Scene-ON frames **220..506** are byte-identical per orientation: player JSON/raw-RGB `31aa7cb8… / 07b0434b…`, opponent `ded4eceb… / aa229485…`. Both pass **287/287** source reducer, typed seam, OAM topology, raw RGB, change map, and production framebuffer rows with no residuals; retained transfer gates remain **286/286** OAM+matrix and **285/286 + age-7** palette. All **10** snowballs, **320** Step2 rows, and **13** spikes remain pinned.
- **Sibling/control:** Blizzard reruns unchanged at **448/448 Step2 rows per side** and **371/371 + 360/360** OAM/matrix transfers; it inherits no Icy Wind topology, seam, compositor, receipt, or promotion.
- **Checks:** Focused Icy Wind/assets/evidence/generic-compositor/Blizzard/boundary/coverage tests **26/26**, standalone bilateral verifier, source audit, animation audit/coverage, typecheck, full suite, and production build are green. No animation-boundary list, unsupported barrier, gameplay/damage/RNG/controller/turn/round/facility state, or sibling coverage changed.
- **Next:** None for Icy Wind.

# MOVE_ICY_WIND source-exact seam/compositor checkpoint — remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **180/276 Level-50 exact**, 0 partial, 0 staged, and 96 unsupported. Icy Wind is not promoted; coverage counts and `ANIMATION_COVERAGE.json` are unchanged.
- **Did:** Added the complete source-relative linear/Step1/pre-increment signed-shift Step2/End snowball reducer, thirteen-spike wave, BG_ICE/monbg, both palette ramps, blend-register and cleanup lifecycles; added reproducibly extracted BG_ICE/spike assets, SWINUB/ONIX bilateral typed seam, and production compositor. No Blizzard ages, receipts, seam, or compositor are inherited.
- **Verified:** Both retained 287-row orientations pass **287/287 reducer + typed seam**, all **10** snowballs / **320** Step2 rows / **13** spikes, immutable state, audio/tags/registers, **286/286** OAM+matrix and **285/286 + age-7** palette transfers, raw RGB/change maps, and cleanup. Production framebuffer reaches player **209/287** and opponent **281/287**; exact residuals are player ages **93, 100..176** (78 rows, 2..44 px) and opponent ages **129,136,144,149,150,158** (6 rows, 2..18 px), isolated to overlapping snowball pixels under the GBA scanline OBJ evaluator. Backgrounds, battlers, ramps, spikes, chrome, text, and all other rows are exact. Receipts remain player `f9825553… / 07b0434b… / ce477d78…`, opponent `0f356e88… / aa229485… / 20f6f7ae…`.
- **Sibling/control:** Blizzard's committed verifier remains unchanged at **448/448 Step2 rows per side** and **371/371 + 360/360** transfers. No sibling promotion or coverage inheritance.
- **Next:** Port the source OAM scanline evaluation budget for the staged battler/healthbox object topology, replace the current unlimited raster snowball paint with that generic evaluator, then require twice-fresh **287/287 + 287/287** framebuffer equality before promoting Icy Wind alone.
- **Notes:** Honest partial only: no per-age RGB/framebuffer/hash table, absolute battle tick, coordinate/RGB fitting, capture thinning, gameplay/damage/RNG/controller/facility state, boundary widening, or coverage change.

# MOVE_ICY_WIND bilateral dense evidence checkpoint — remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **180/276 Level-50 exact**, 0 partial, 0 staged, and 96 unsupported. Icy Wind and Blizzard remain independently unpromoted; Icy Wind production seam/framebuffer acceptance is **0/287 + 0/287**.
- **Did:** Added complete legal Scene-ON set-31 species-220 SWINUB versus ONIX parties and natural bilateral controller traces, plus a pointer-bounded probe over both owned intervals through first inactive cleanup. Player-back and opponent-front frames **220..506** each reproduce twice fresh byte-for-byte and retain full state plus raw RGB. The verifier proves all **10** snowballs through linear/Step1/**320/320 Step2**/End, all **13** `AnimWaveFromCenterOfTarget` spikes (**455** callback rows), BG_ICE/monbg, both BlendBattleAnimPal ramps, faded/unfaded/hardware palettes, OAM/matrices, tags, registers, four audio commands, immutable battle state/RNG, and cleanup.
- **Latches/evidence:** Both orientations pass **286/286** preceding-software OAM and matrix transfers. Hardware palette passes **285/286** preceding-faded rows plus the independently observed age-7 same-row monbg transfer; this agrees with existing latch classes, so `ANIMATION_LATCHES.md` gains no new mechanism. State/RGB/map receipts are player `f9825553… / 07b0434b… / ce477d78…` and opponent `0f356e88… / aa229485… / 20f6f7ae…`; all **287/287** archived RGB rows and normalized maps replay exactly.
- **Sibling/control:** Blizzard's retained verifier reruns unchanged at **448/448** Step2 rows and **371/371 + 360/360** OAM/matrix transfers. Icy Wind inherits no Blizzard ages, latches, seam, compositor, receipt, or acceptance.
- **Next:** Add a typed bilateral Icy Wind presentation seam and source-derived compositor, then require complete twice-fresh **287/287 + 287/287** production framebuffer equality through cleanup before promoting Icy Wind alone. Blizzard keeps its independent residuals.
- **Notes:** Honest evidence checkpoint only. No `ANIMATION_COVERAGE.json` count/status, production renderer, battle logic/damage/RNG ownership, controller/round/facility state, boundary list, unsupported barrier, canonical recording, absolute-tick/framebuffer lookup, coordinate/RGB fitting, or sibling promotion changed.

# MOVE_ICY_WIND source/component sibling checkpoint — remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **180/276 Level-50 exact**, 0 partial, 0 staged, and 96 unsupported. Icy Wind and Blizzard remain independently unpromoted; no dense oracle capture or compositor was added.
- **Did:** Audited the complete generated graph and exclusive ROM intervals: `Move_ICY_WIND` + `IcyWindSwirlingSnowballs` **0x82cc250..0x82cc310 (192 bytes, `2730d7d4…`)**, and `IceSpikesEffectLong` **0x82d78f8..0x82d79b4 (188 bytes, `55c6515e…`)**. Pinned exact root call order/arguments, both 5-snowball batches, thirteen spikes, callbacks, assets, BG/palette/audio effects, cleanup, and lowest legal Level-50 carrier set **31**, internal species **220 SWINUB**.
- **Shared boundary:** Only the selected `ANIM_TAG_ICE_CRYSTALS` / `gSwirlingSnowballSpriteTemplate` component reuses Blizzard's source-derived 32-write Step2 math. Icy Wind inherits no Blizzard ages, latches, receipts, seam, compositor, or acceptance; ICE_SPIKES/`AnimWaveFromCenterOfTarget`, BG_ICE, palette schedule, and audio are exclusive.
- **Next:** Capture complete bilateral Icy Wind Scene-ON source windows; prove linear/Step1/Step2/End and spike OAM/animation/palette/BG/register/audio latches; add a typed seam and source-derived compositor; require complete twice-fresh dense production framebuffer equality through cleanup before promoting Icy Wind alone.
- **Notes:** Focused Icy Wind + Blizzard **9/9** and standalone source audit pass. No gameplay/RNG/controller/facility state, boundary widening, coverage ledger, production renderer, absolute-tick/framebuffer lookup, coordinate/RGB fitting, or sibling promotion changed.

# MOVE_BLIZZARD corrective evidence checkpoint — remains unsupported (2026-08-13 worker)

- **State:** Coverage remains **180/276 Level-50 exact**, 0 partial, 0 staged, and 96 unsupported. Blizzard and Icy Wind remain independently unpromoted; seam/framebuffer acceptance is **0/372 + 0/361**.
- **Did:** Corrected `AnimSwirlingSnowball_Step2` to compute x2/y2 from the pre-increment angle with signed C `>> 8`, and narrowed the reducer to the 32 writes reconstructible from each captured Step1 row. Added a strict retained-evidence verifier; removed invented linear/Step1/End and duplicate-fresh claims.
- **Verified:** Player-back **214..585** and opponent-front **213..573** replay **448/448 Step2 sprite rows** each, complete pointer windows (**312/372 + 301/361** rows inside the pinned ROM interval), immutable battle state/topology/source offsets/cleanup, and exact one-frame software→hardware OAM/matrix transfer (**371/371 + 360/360**). All **372 + 361** archived RGB members pass per-frame and aggregate SHA plus regenerated change maps; all scenario/state/RGB/map receipt SHAs pass.
- **Next:** A production Blizzard seam/compositor and all unresolved snowball linear/Step1/End, large-snowball, impact-crystal, background, palette, and audio phases remain required before promotion. Icy Wind requires its own complete acceptance.
- **Notes:** Numeric set **318**, species **310 PELIPPER**, four Blizzard choices, and complete legal parties remain pinned. No gameplay/RNG/controller/facility state, boundary widening, coverage ledger, latch ledger, production renderer, absolute-tick/framebuffer lookup, RGB fitting, or sibling promotion changed.

# MOVE_ANCIENT_POWER audit correction — bilateral exact gate strengthened (2026-08-13 worker)

- **State:** Level-50 coverage remains **180/276 exact**, 0 partial, 0 staged, and 96 unsupported. Ancient Power alone remains promoted; ROCK_THROW and ROCK_SLIDE remain independent exact controls.
- **Did:** Replaced unconditional reducer counting with fresh source-state agreement. The probe now retains battler bindings/offsets, `sSpriteOrder`, live `gBattle_BG3_*`, BG scroll/BLD registers, and resolved SE headers; the verifier checks both ShakeMon2 and slide bodies, every owned helper/task including monbg cleanup, ROCKS/IMPACT tags, immutable battle state, audio pan/timing, and complete OAM/matrix/palette transfers. Replaced the compositor's `state.age===11`/`<=13` rock branches with source-seeded stable `SortSprites` OAM rank and inverse painter order.
- **Verified:** Both fresh runs of both player-back and opponent-front source frames **225..352** pass **128/128 reducer, seam, component, raw-RGB, change-map, and production framebuffer** rows; full transfer acceptance remains **127/127**, with only age 7's current-row monbg palette transfer and preceding software OAM/matrices/palette otherwise. Fresh receipts are player `1d57cb97…/bd59ebbf…/b0d3c51f…`, opponent `2d5adc9d…/32d27b5f…/b6106425…`.
- **Next:** None for Ancient Power. Shared ROCKS/IMPACT/ShakeMon2/slide code does not promote another move.
- **Notes:** Presentation-only. Fail-closed Tier-1 source-surface mutations cover battler/register/OAM-order mismatches. No damage, stat boost, RNG, turn/controller/facility state, boundary widening, canonical recording import, absolute-tick/framebuffer lookup, coordinate/RGB fitting, or sibling coverage changed.

# MOVE_ANCIENT_POWER dense Scene-ON evidence checkpoint — superseded (2026-08-13 worker)

- **State:** Level-50 coverage remains **179/276 exact**, 0 partial, 0 staged, and 97 unsupported. Ancient Power is not promoted; ROCK_THROW and ROCK_SLIDE remain independent controls.
- **Did:** Added the source-relative ten-rock `AnimRaiseSprite` reducer and focused component tests for the assigned 12-component track. Added a pointer-bounded Scene-ON probe and retained complete state/raw-RGB receipts for actual numeric species **318 BALTOY**, source metadata set **75**, with complete legal Level-50 party records in both player-back and opponent-front orientations. Committed those two reproducible scenarios under `tools/battle-lab`, pinned their SHA-256 values in the receipt/test, and corrected `ANCIENT_POWER_COMPONENTS` to the generated source graph exactly.
- **Verified:** Twice-fresh direct mGBA runs are byte-identical per orientation over source frames **225..352 (128/128)**. Player state/raw digests are `fabfdb19…` / `bd59ebbf…`; opponent state/raw digests are `cad96a74…` / `32d27b5f…`. Dense topology includes `gAncientPowerRockSpriteTemplate`, `gBasicHitSplatSpriteTemplate`, both slide helpers, `AnimTask_ShakeMon2`, `monbg`/`setalpha`/`clearmonbg`/`blendoff`, and full software/hardware OAM, matrices, palettes, registers, tasks, audio, and immutable state.
- **Next:** Build the typed Baltoy bilateral Scene-ON seam and compositor, then independently fit the attacker `(1,0,30,1)` and target `(3,0,6,1)` ShakeMon2 creation/body/teardown latches plus rock OAM/palette transfer before any exact claim.
- **Notes:** Honest evidence checkpoint only. No source/reducer-to-production framebuffer parity, exact latch proof, per-age lookup, absolute-tick branch, coordinate/RGB fit, gameplay/damage/RNG/controller/facility ownership, boundary change, or sibling coverage change.

# MOVE_COSMIC_POWER corrective exact postflight — actual species-348 bilateral 241/241 (2026-08-13 worker)

- **State:** The **178→179/276 exact** promotion is retained after replacing the rejected carrier evidence with actual internal species 348 LUNATONE. Cosmic Power alone is exact; GrantingStars, palette, BG, audio, and named sibling acceptance remains independent.
- **Did:** Corrected all six carrier-side party records to source set 222 semantics: `SPECIES_LUNATONE=348`, Quiet, HP/Defense EVs, Sitrus Berry, Levitate slot 0, genderless, and four constrained Cosmic Power choices. Removed the false Electrike presentation type/seam; re-derived LUNATONE front/back corners `(144,4)/(40,53)`, animation centers `(176,36)/(72,93)`, 173/177 HP chrome, and the opponent-front elevated-shadow entry row. Replaced every full-state/raw-RGB/change-map archive and fixture receipt.
- **Verified:** Pointer-bounded mGBA probes reproduce twice fresh per orientation at actual frames **294..534**. Player probe/raw/map receipts are `03d5f944… / 84ed15d1… / 185baa8e…`; opponent receipts are `65c13d86… / f2333255… / 3f323b42…`. Both pass **241/241 source/reducer/seam/component/raw-RGB/change-map/production-framebuffer** rows, **240/240 software+hardware OAM/matrix/palette** transfers, plus tags/register/audio/immutable-state. Focused source/species/sibling/boundary controls pass **39/39**; animation audit/coverage, typecheck, full suite **1,020 files / 9,723 passed / 1 skipped**, and the **660-module** production build are green.
- **Next:** None for Cosmic Power. `MOVE_SYNTHESIS`, `MOVE_HEAL_BELL`, `MOVE_WISH`, `MOVE_REFRESH`, `MOVE_AROMATHERAPY`, `MOVE_METEOR_MASH`, and every play-SE sibling retain independent acceptance and receive no inherited promotion.
- **Notes:** The superseded candidate below was rejected because it injected species 337 Electrike while labeling the carrier as Lunatone. No gameplay/damage/stat/RNG/turn/controller/facility state, boundary, barrier, canonical recording, absolute-tick branch, per-age framebuffer/hash/RGB lookup, coordinate fitting, or sibling coverage changed.

# REJECTED MOVE_COSMIC_POWER candidate — wrong species identity (2026-08-13 worker)

- **State:** Superseded by the corrective postflight above; its exact result was invalid evidence and must not be used.
- **Did:** The rejected scenarios injected internal species 337, which source defines as Electrike, despite labeling set 222 as Lunatone. The resulting 74..314 / 78..318 windows and their receipts were discarded and replaced.
- **Notes:** Preserved only as failure history. Set 222 is `FRONTIER_MON_LUNATONE_1`, internal species 348.

# MOVE_SWALLOW exact — all-six dense compositor acceptance (2026-08-12 worker)

- **State:** Level-50 coverage advances **177→178/276 exact**, 0 partial, 0 staged, and unsupported falls **99→98**. Only Swallow is promoted; Reversal and every other sibling remain independent.
- **Did:** Closed the source-derived selected-latch and compositor contract: Pelipper deform uses affine-double rendering with the age-2 matrix/display transfer; BLUE_ORB/BLUE_STAR use the age-1 hardware OAM/palette transfer; both ShakeMon2 phases follow their task display schedule, including the second initializer's age-48 zero-offset row. Preserved the opponent age-0 elevated shadow and corrected the opponent-three post-switch target from an assumed Numel to source-proved internal species 322 **Sableye**.
- **Verified:** Twice fresh, all six complete natural windows pass source/reducer/seam/component, selected OAM/matrix/palette latch, and production framebuffer at player **163/163, 178/178, 193/193** and opponent **161/161, 176/176, 191/191**. Raw-RGB receipts remain `1723b6d6…`, `f864b72c…`, `f4e2c8b3…`; `62ac89c0…`, `be8e2bd5…`, `002662dc…`. Whole preceding-buffer equality remains diagnostic only at **115/162, 130/177, 145/192; 113/160, 128/175, 143/190**. Focused source/reducer/boundary tests **12/12**, typecheck, animation audit, and coverage are green.
- **Next:** None for Swallow. Shared BLUE_ORB/BLUE_STAR code does not promote any sibling; each still requires its own dense acceptance.
- **Notes:** Stockpile count remains immutable caller input. No healing calculation, stockpile mutation, damage, RNG, turn/controller/facility/Rust/main-doc state, boundary ratchet, unsupported barrier, canonical recording import, per-age framebuffer/hash table, absolute tick, or coordinate/RGB fit was added.

# MOVE_SWALLOW source/component-exact staged compositor — remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **177/276 Level-50 exact**, 0 partial, 0 staged, and **99 unsupported**. Swallow is not promoted; exact Reversal and all siblings remain unchanged.
- **Did:** Ported a pure explicit-Stockpile-count reducer for 5/10/15 BLUE_ORB lifecycles, attacker affine deformation, both ShakeMon2 phases, shared four-star HealingEffect, audio/tags/register non-ownership, and cleanup. Added the narrow Scene-ON seam, Pelipper/Delcatty compositor plus the naturally required opponent-three Numel switch variant, and a direct-mGBA portable verifier. Corrected the evidence carrier label: internal species 316/set 162 is **Delcatty**, not Gulpin.
- **Verified:** Twice fresh, all six complete natural windows pass source/reducer/seam/component/raw-RGB at **163/163, 178/178, 193/193** player and **161/161, 176/176, 191/191** opponent with the pinned raw digests unchanged. Production framebuffer is player **97/163, 112/178, 127/193**, with common residual ages **8..27, 30, 48..90, 93..94** (peak 1,563 px); opponent one/two are **93/161, 108/176**, residual **0, 8..27, 30, 48..91, 93..94** (peak 1,464 px). Opponent-three is **0/191** (peak 3,432 px): its prior real switch leaves a distinct Pelipper/front-field baseline not yet represented. Preceding-buffer whole-row latch equality is respectively **115/162, 130/177, 145/192; 113/160, 128/175, 143/190**, so no exact latch claim is made. Focused source/reducer/boundary tests **12/12** and typecheck pass.
- **Next:** Resolve the deform/ShakeMon2 display transfer and orb painter ages, the two opponent baseline rows, and the opponent-three post-switch Pelipper/front-field baseline; derive the mixed latch rule and require complete twice-fresh six-branch framebuffer+latch equality before promoting only Swallow.
- **Notes:** Honest staged checkpoint only. Stockpile count is immutable caller input; no healing calculation, stockpile mutation, damage, RNG, turn/controller/facility/Rust/main-doc state, boundary ratchet, unsupported barrier, canonical recording import, per-age framebuffer/hash table, absolute tick, or coordinate/RGB fit was added.

# MOVE_SWALLOW six-branch natural source matrix — remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **177/276 Level-50 exact**, 0 partial, 0 staged, and **99 unsupported**. Swallow is not promoted; exact Reversal remains unchanged.
- **Did:** Added five complete legal Scene-ON party/controller scenarios and generalized the probe from a fixed one-Stockpile receipt to source-observed `animTurn`/attacker/target topology. Every trace earns Stockpile through real moves; the opponent three-stockpile setup uses real Imprison, five weak attacks, and a normal switch before the ROM chooses Swallow—no transient state is injected.
- **Verified:** Twice-fresh byte-stable source-only receipts cover player-back **1/2/3** at **1247..1409/163 `1723b6d6…`**, **2174..2351/178 `f864b72c…`**, **2999..3191/193 `f4e2c8b3…`**, and opponent-front **1/2/3** at **1140..1300/161 `62ac89c0…`**, **2066..2241/176 `be8e2bd5…`**, **6979..7169/191 `002662dc…`**. Each pins 5/10/15 BLUE_ORB, four BLUE_STAR, one deform, two shakes, audio, tag unload, no owned blend/mosaic registers, topology, and task-free cleanup; fixture bytes repeat `c863ac1b…/d15231b8…/357fddee…; 09a04f0f…/c546ad61…/9fb266c2…`. Focused Swallow **5/5**, source audit, animation audit/coverage, typecheck, full `npm test`, and production build pass.
- **Next:** Implement a source-relative reducer, typed presentation seam, and compositor; require complete twice-fresh bilateral component/latch/raw-RGB/production-framebuffer equality for all six windows before promoting only Swallow.
- **Notes:** Honest evidence checkpoint only: no reducer/seam/compositor or production framebuffer claim. No healing calculation, stockpile mutation, damage, RNG, turn/controller/facility state, animation boundary, unsupported barrier, canonical recording import, per-frame framebuffer/hash table, absolute tick, coordinate/RGB fitting, or sibling coverage changed.

# MOVE_HYDRO_PUMP current Scene-ON receipt refresh (2026-08-12 worker)

- **State:** Level-50 coverage remains **177/276 exact**, 0 partial, 0 staged, and **99 unsupported**. Hydro Pump remains exact; Whirlpool remains an independent exact sibling with no coverage-count change.
- **Did:** Revalidated the selected Hydro Pump representative against the Battle Scene ON oracle and refreshed only the two stale serialized evidence digests. Source-relative reducer, typed seam, compositor, legal Masquerain carrier, complete source interval, and raw-RGB receipts are unchanged.
- **Verified:** Twice fresh, player-back and opponent-front each pass **141/141 component and 141/141 production framebuffer** rows. Current evidence/raw digests are `a5b1f983…/360d0d72…` and `1ac9a23b…/ff315fb5…`; focused Hydro/Whirlpool/source/boundary tests pass **14/14**.
- **Next:** No Hydro Pump implementation work remains. Whirlpool receives no inherited acceptance; supervisor may fold this receipt-only refresh.
- **Notes:** Presentation-only. No gameplay, damage, RNG, turn/controller/facility state, animation boundary, unsupported barrier, canonical recording import, absolute-tick lookup, coordinate/RGB fitting, or sibling promotion changed.

# MOVE_FISSURE exact — bilateral 254/254 promotion (2026-08-12 worker)

- **State:** Level-50 coverage advances **176→177/276 exact**, 0 partial, 0 staged, and unsupported falls **100→99**. Only Fissure is promoted; Dig remains an independent audit-only sibling.
- **Did:** Closed both staged compositor residuals with source-derived mechanisms. BG_FISSURE's 512x256 text map is two contiguous 32x32 GBA screenblocks, now normalized to the renderer's 64x32 row-major contract. The four equal-subpriority dirt OBJs now replay `BuildOamBuffer`'s stable descending-screen-Y order from creation and paint its inverse, preserving prior OAM order at arc-crossing ties.
- **Verified:** Twice freshly per orientation, player-back **72..325** and opponent-front **76..329** pass **254/254 reducer/seam/component/framebuffer**, **253/253** software→hardware OAM/matrix/palette latches, complete state/RGB/map gates, and byte-stable receipts (`fafd5619…/67cadfd5…/23a4e2a2…`; `c52ac9f9…/55b75e4f…/1d38281d…`). Focused Fissure/evidence/boundary **14/14**, animation audit/coverage, typecheck, full suite **999 files / 9,617 passed / 1 skipped**, and the **657-module** build are green after rebuilding the gitignored WASM prerequisite.
- **Next:** None for Fissure. Dig still needs its own complete two-turn dirt-mound/movement/static-monbg/hitsplat/shake evidence and implementation before any acceptance.
- **Notes:** Presentation-only. No OHKO/accuracy/damage/RNG/turn/controller/facility state, boundary, unsupported barrier, canonical recording import, absolute tick, per-age framebuffer/hash lookup, coordinate/RGB fitting, or sibling coverage changed.

# MOVE_FISSURE staged production checkpoint — component exact, remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **176/276 Level-50 exact**, 0 partial, 0 staged, and **100 unsupported**. Fissure is not promoted; Dig remains an independent audit-only sibling.
- **Did:** Extracted source `BG_FISSURE`, reused source-derived `ANIM_TAG_MUD_SAND`, and added a pure 254-age Fissure reducer, narrow typed seam, Dugtrio/Onix compositor, and portable direct-mGBA verifier. The reducer covers all three dirt groups, target/platform HorizontalShake, both complex palette pulses, side-relative BG hold, fade/register phases, audio-visible events, tag lifecycle, and first inactive cleanup without owning OHKO or battle state.
- **Verified:** Twice freshly per orientation, player-back **72..325** and opponent-front **76..329** pass **254/254 reducer/seam/component** rows, **253/253** software→hardware OAM/matrix/palette latches, and byte-stable full-state/raw-RGB/change-map receipts (`fafd5619…/67cadfd5…/23a4e2a2…`; `c52ac9f9…/55b75e4f…/1d38281d…`). Production framebuffer is symmetrically **166/254**: the only residual rows are ages **50..59, 61, 64** (at most 12 dirt/target overlap pixels) and **155..230** (BG_FISSURE target-priority footprint, 935..1,023 pixels). Focused/boundary **27/27**, animation audit/coverage, typecheck, full suite **999 files / 9,615 passed / 1 skipped**, and the **657-module** build are green after rebuilding the gitignored WASM prerequisite.
- **Next:** Resolve the move-owned dirt OAM painter overlap and BG_FISSURE/target priority semantics, then require **254/254** framebuffer rows twice fresh bilaterally before promoting only Fissure. Dig receives no inherited acceptance.
- **Notes:** Presentation-only staged checkpoint. No OHKO/accuracy/damage/RNG/turn/controller/facility state, animation boundary, unsupported barrier, canonical recording import, absolute tick, per-age framebuffer/hash lookup, coordinate/RGB fitting, or sibling coverage changed.

# MOVE_CONFUSE_RAY exact — bilateral Scene-ON dense acceptance (2026-08-12 worker)

- **State:** Coverage advances **175→176/276 Level-50 exact**, 0 partial, 0 staged, and unsupported falls **101→100**. Only Confuse Ray is promoted; Will-O-Wisp remains unsupported.
- **Did:** Extracted source YELLOW_BALL and legal CHINCHOU back/front art, reused the source-derived BG_GHOST, and ported the complete source-age bounce/spiral affine bodies, BG fade/restore, monbg, palette cycle, alpha registers, side-relative `SoundTask_AdjustPanningVar`, typed seam, and compositor. The move-owned painter preserves opaque bounce versus OBJ_BLEND spiral behavior and current-row palette/register transfer without importing recordings or fitting pixels.
- **Verified:** Player-back source frames **76..345** and opponent-front **80..349** each pass **270/270** reducer/component and production framebuffer rows twice fresh through first inactive cleanup. Complete OAM/matrix latches pass **269/269** per side; palette passes the preceding-buffer rule on **268/269** with the monbg age-4 same-row exception. Fresh full-state hashes repeat `2a9fde46…` / `83d95bef…`, and all task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/change-map gates retain their committed evidence.
- **Next:** Confuse Ray is complete. Will-O-Wisp remains an independent audit-only sibling: its WISP_FIRE/WISP_ORB, split-bg, ShakeMon2, and distinct body need complete bilateral evidence before promotion.
- **Notes:** Presentation-only. No confusion/accuracy/damage/RNG/turn/controller/facility state, animation boundary, unsupported barrier, canonical recording import, absolute tick, per-age framebuffer/hash lookup, coordinate/RGB fit, or sibling coverage changed.

# MOVE_FISSURE dense bilateral evidence checkpoint — remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **175/276 Level-50 exact**, 0 partial, 0 staged, and **101 unsupported**. Fissure and Dig are not promoted.
- **Did:** Source-derived the natural equal-level OHKO gate (`Random() % 100 + 1 < 30`) and added a narrow mGBA seed scout. The smallest scenario correction changes only player-back seed `0x12345679→0x12345678`; opponent-front retains `0x12345679`. Both complete legal parties now enter `Move_FISSURE` naturally at frames **72/76**. Ran the pointer-bounded probe twice freshly per side and retained complete compressed state, 254 raw-RGB frames, and normalized change maps through first inactive cleanup.
- **Verified:** Player-back source **72..325** and opponent-front **76..329** are **254 frames** each. Both fresh runs are byte-identical per side (state `fafd5619…` / `c52ac9f9…`, raw RGB `67cadfd5…` / `55b75e4f…`). Hardware OAM, matrices, and palette equal the preceding software buffers on **253/253** comparable rows bilaterally. Three four-sprite dirt groups have source ages **14..37, 48..71, 82..105**; both horizontal tasks live **4..199**; BG_FISSURE/restore BLDY and side-relative BG3 holds are fully pinned through cleanup. Immutable outcome/weather/side state stays constant; SE1/SE2 and animation RNG are retained.
- **Next:** Port source-relative MUD_SAND/BG_FISSURE assets, reducer, typed seam, and compositor; require twice-fresh bilateral all-frame component/hardware/raw-RGB/change-map/production framebuffer equality before promoting only Fissure. Dig remains an independent audit-only sibling.
- **Notes:** Honest dense checkpoint only: no reducer/seam/compositor or production framebuffer comparison exists. No gameplay/OHKO/accuracy/damage/RNG/controller/turn/facility state, animation boundary, unsupported barrier, canonical recording, per-frame lookup, absolute tick, coordinate/RGB fit, or Dig coverage changed.

# MOVE_CONFUSE_RAY dense bilateral evidence checkpoint — remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **175/276 Level-50 exact**, 0 partial, 0 staged, and **101 unsupported**. Confuse Ray and Will-O-Wisp are not promoted.
- **Did:** Fixed `tools/run-mgba-probe.py` so either its auto-routed or an explicit harness `mgba-venv` interpreter receives the paired sibling `libmgba-py` checkout without a global install or hardcoded path. Ran the pointer-bounded Confuse Ray probe twice freshly in both orientations and retained complete compressed full-state JSON, 270 raw-RGB frames, and normalized change maps through first inactive cleanup.
- **Verified:** Player-back source **76..345** and opponent-front **80..349** are **270 frames** each. Both fresh runs are byte-identical per side (state `2a9fde46…` / `83d95bef…`, raw RGB `17183f79…` / `e97f8c9d…`). Hardware OAM and matrices equal the preceding software buffer on **269/269** comparable rows; hardware palette does so on **268/269**, with monbg setup age 4 the sole same-row transfer. Bounce displays ages **47..120**, clears 121; spiral displays **167..225**, clears 226; BG BLDY edges are same-row. Opponent absolute start is +4; relative schedules align except panning duration/direction (**62** captured player rows −64→+63, **61** opponent rows +63→−63).
- **Next:** Port source-relative YELLOW_BALL/GHOST-BG assets, reducer, typed seam, and compositor; require twice-fresh bilateral all-frame component/hardware/raw-RGB/change-map/production framebuffer equality before promoting only Confuse Ray. Will-O-Wisp remains an independent audit-only control.
- **Notes:** Honest dense checkpoint only: no reducer/seam/compositor or production framebuffer comparison exists. No gameplay/damage/accuracy/confusion/RNG/turn/controller/facility state, animation boundary, unsupported barrier, canonical recording, per-frame lookup, absolute tick, coordinate/RGB fit, or sibling coverage changed.

# MOVE_CONFUSE_RAY source/staging checkpoint — dense probe blocked, remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **175/276 Level-50 exact**, 0 partial, 0 staged, and **101 unsupported**. Confuse Ray and Will-O-Wisp are not promoted.
- **Did:** Pinned Confuse Ray's exclusive **0x082cbe91..0x082cbee4** interval, exact 12-component graph, source callbacks/assets/GHOST-BG symbols, lowest legal Level-50 carrier **set 116 CHINCHOU**, complete legal bilateral Scene-ON parties, and a pointer-bounded full-state probe mode. The sibling audit pins Will-O-Wisp's **10** components and exact three-component intersection (`SoundTask_AdjustPanningVar`, `monbg`, `clearmonbg`); its WISP sprites, split-bg transitions, and ShakeMon2 body remain independent.
- **Verified:** Scene-ON bootstrap v5 is reachable. `check-oracle-freshness.sh` is the documented false positive: 8012 predates a documentation-only harness HEAD and `git -C "$POKEBENCH_HARNESS_ROOT" log --since='2026-08-11 21:51:36' -- oracle/ bin/ run-oracle.sh` is empty. Legal endpoints reached frame 834 at `276079d7…` / `5c9ea0c7…`. The direct dense probe was attempted only through `tools/run-mgba-probe.py` and failed before emulation because the configured mGBA venv has no importable `mgba` module. Therefore no source window, latch, change map, reducer/seam, or framebuffer claim is made.
- **Next:** Restore the harness-managed mGBA Python binding, run the banked pointer-bounded probe twice in both orientations through first inactive cleanup, derive complete maps/latches, then implement the source-relative reducer/assets/seam/compositor. Require twice-fresh all-frame component/hardware/raw-RGB/change-map/production equality before promoting only Confuse Ray.
- **Notes:** Presentation-only checkpoint; no damage, accuracy/confusion, RNG, turn/controller/facility state, animation boundary, unsupported barrier, canonical recording, per-frame lookup, absolute tick, coordinate fit, or Will-O-Wisp coverage changed. No latch row was added because no rendering mechanism was measured.

# MOVE_FISSURE source/staging checkpoint — dense probe blocked, remains unsupported (2026-08-12 worker)

- **State:** Coverage remains **175/276 Level-50 exact**, 0 partial, 0 staged, and **101 unsupported**. Fissure and Dig are not promoted.
- **Did:** Pinned Fissure's exclusive **0x082ccb7e..0x082ccca1** interval, exact 12-component graph, source callbacks/assets/BG symbols, lowest legal Level-50 carrier **set 564 DUGTRIO_3**, and complete legal bilateral Scene-ON parties. The sibling audit pins Dig's **17** components and the exact two-component intersection (`ANIM_TAG_MUD_SAND`, `gDirtPlumeSpriteTemplate`); its mound/movement/static-monbg body remains independent. Added a Fissure mode to the existing full-state pointer-bounded probe and banked an explicit unsupported receipt.
- **Verified:** Scene-ON bootstrap v5 and the documented byte-identical service provenance were confirmed; both legal staging scenarios ran through frame 834 with endpoint hashes `bf92e5c3…` / `c631d944…`. The direct dense probe was attempted only through `tools/run-mgba-probe.py` and failed before emulation because the configured gitignored `vendor/mgba-venv` has no importable `mgba` module. Therefore no window, latch, change-map, reducer/seam, or framebuffer claim is made. Focused source/boundary **5/5** is green.
- **Next:** Restore the harness-managed mGBA Python binding, run the banked pointer-bounded probe twice in both orientations, derive complete change maps/latches through first inactive cleanup, then implement the source-relative reducer/assets/seam/compositor. Require twice-fresh all-frame component/hardware/raw-RGB/change-map/production equality before promoting only Fissure.
- **Notes:** Presentation-only checkpoint; no gameplay/OHKO/accuracy/damage/RNG/controller/turn/facility state, animation boundary, unsupported barrier, canonical recording, per-frame lookup, absolute tick, coordinate fit, or Dig coverage changed.

# MOVE_METEOR_MASH exact — bilateral Scene-ON dense acceptance (2026-08-12 worker)

- **State:** Coverage advances **174→175/276 Level-50 exact**; unsupported falls **102→101**. Only Meteor Mash is promoted.
- **Did:** Reclassified the existing source-relative reducer/seam/compositor after the stale freshness heuristic was disproved for this service: `check-oracle-freshness.sh` sees 8012 predating a documentation-only harness HEAD, while `git -C "$POKEBENCH_HARNESS_ROOT" log --since='2026-08-11 21:51:36' -- oracle/ bin/ run-oracle.sh` is empty.
- **Verified:** Strict fresh portable receipts repeat player-back **214/214** and opponent-front **215/215** with all listed source/reducer/seam/task/sprite/OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map/framebuffer gates exact and stable `ed028a16…/309e0ea2…/c1b452de…` plus `367dda53…/05e1a334…/d6ac27b1…`; move-owned ShakeMon2, opaque IMPACT, mini lifecycle, and painter latches remain directly verified. Focused/boundary **69/69**, smoke **375/375**, typecheck, full suite **993 files / 9,591 passed / 1 skipped**, and the **653-module** build are green.
- **Next:** Meteor Mash is complete; every sibling remains an independent acceptance unit.
- **Notes:** Presentation-only; no gameplay/RNG/controller/facility state, boundary, unsupported barrier, canonical recording, absolute-tick lookup, coordinate/RGB fitting, or sibling promotion changed.

# MOVE_METEOR_MASH production framebuffer exact; remains unsupported on stale freshness (2026-08-11 worker)

- **State:** Coverage remains **174/276 Level-50 exact**, 0 partial, 0 staged, and **102 unsupported**. Meteor Mash now passes complete production framebuffer at **214/214 player-back + 215/215 opponent-front**, but is not promoted because the shared Scene-ON services remain older than current harness `649098e9` (and the assigned `627a2e06` baseline).
- **Did:** Ported `BuildOamBuffer`'s source ordering into the move-owned painter: fixed-subpriority-5 minis paint ahead of target-relative parents, spinning hand, and hitsplat; equal-family sprites use descending hardware OAM y (software back-to-front smaller top-y first) with the persistent source-slot tie. This closes the entire former ages **121..155** hand/hitsplat footprint and every early mini-star residual without coordinate/RGB fitting.
- **Verified:** Two consecutive strict portable runs pass direct-mGBA source/reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map and production framebuffer at **214/214 + 215/215**, with zero residual phases and unchanged digests (`ed028a16…` / `309e0ea2…` / `c1b452de…`; `367dda53…` / `05e1a334…` / `d6ac27b1…`). Focused source/reducer/evidence/boundary tests **10/10**, animation audit/coverage, typecheck, smoke **375/375**, full suite **974 files passed / 2 skipped; 8,792 tests passed / 643 skipped**, and the **653-module** production build pass. Freshness reports ports 8014/8012 started before current harness `649098e9`; the services were not restarted and no fresh receipt is claimed.
- **Next:** Do not promote until the shared Battle Scene ON freshness gate is valid and both complete production windows repeat twice fresh; no sibling inherits this move's acceptance.
- **Notes:** Presentation-only. No gameplay/damage/stat/RNG/turn/controller/facility state, boundary, unsupported barrier, canonical import, per-age framebuffer/RGB/hash lookup, absolute tick branch, or sibling coverage changed.

# MOVE_METEOR_MASH target/shake/hitsplat checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **174/276 Level-50 exact**, 0 partial, 0 staged, and **102 unsupported**. Meteor Mash is not promoted: production framebuffer is **161/214 player-back** and **153/215 opponent-front**, with the remaining large target region and shake tail closed but complete equality/fresh promotion still open.
- **Did:** Derived the target monbg/OBJ screen displacement from complete software+hardware OAM: creation is held, the live body inverts task x2, and the terminal negative phase persists through two transfer rows. Closed shake-tail ages **157/159/161/163**. Corrected IMPACT from an inherited 12:8 blend to source-accurate opaque presentation because this script leaves BLDCNT target-2 and BLDALPHA zero. Ages **121..155** narrow from player **37,551→802px** and opponent **30,760→293px** total mismatch; residuals are confined to the hand/hitsplat affine footprint (peak **78/61px**).
- **Verified:** Direct-mGBA windows remain **214/214 + 215/215** source/reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map exact with stable evidence/raw/map digests (`ed028a16…` / `309e0ea2…` / `c1b452de…`; `367dda53…` / `05e1a334…` / `d6ac27b1…`). Focused Meteor Mash/evidence/boundary tests **10/10**, animation audit/coverage, typecheck, smoke **375/375**, full suite **974 files passed / 2 skipped; 8,792 tests passed / 643 skipped**, and the **653-module** production build pass. The shared freshness gate still reports both services older than harness `627a2e06`; no fresh promotion receipt is claimed.
- **Next:** Resolve the remaining spinning-hand double-affine sampling/painter residual at ages **121..155**, then the small mini-star phases (player 60..89; opponent 51..107). Require complete **214/214 + 215/215 production framebuffer twice fresh** before promotion.
- **Notes:** Presentation-only. No gameplay/damage/stat/RNG/turn/controller/facility state, boundary, unsupported barrier, canonical import, per-age framebuffer/RGB/hash lookup, absolute tick branch, coordinate fit, or sibling coverage changed.

# MOVE_METEOR_MASH mini lifecycle/compositor checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **174/276 Level-50 exact**, 0 partial, 0 staged, and **102 unsupported**. Meteor Mash is not promoted: production framebuffer improved to **157/214 player-back** and **149/215 opponent-front**, but complete equality and a valid twice-fresh oracle receipt remain open.
- **Did:** Reproduced `CreateSprite`'s lowest-free-slot allocation for all **48** mini stars, including occupied parents/effects, below-parent one-callback initialization delay, source local ages/two-phase visibility, and terminal survival through age 193. Corrected the 16x16 parent, 8x8 mini, and spinning-hand source tile selection; preserved the move-specific target idle/shake composition. The portable now proves every mini's slot/init/local-age/position/tile/visibility and reports bounded mismatch phases, bboxes, and peak pixel counts.
- **Verified:** Two pinned direct-mGBA reproductions pass player frames **298..511 = 214/214** and opponent **231..445 = 215/215** source/reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map with unchanged evidence/raw/map digests (`ed028a16…` / `309e0ea2…` / `c1b452de…`; `367dda53…` / `05e1a334…` / `d6ac27b1…`). Focused **9/9**, boundary/source tests, animation audit/coverage, typecheck, smoke **375/375**, full suite **974 files / 8,792 passed / 2 skipped**, and build **653 modules** pass. The shared Scene-ON oracle freshness gate was stale, so these are not claimed as fresh promotion receipts.
- **Next:** Resolve small mini painter mismatches (player ages 60..89; opponent 51..107), then the bilateral target/hand/hitsplat/BG_COSMIC painter mismatch at ages **121..155** plus target-shake tails **157/159/161/163**. Require all **214/214 + 215/215 framebuffer twice fresh** before promotion.
- **Notes:** Commit `3d25b9a4` is presentation-only. No gameplay/damage/RNG/turn/controller/facility state, boundary, unsupported barrier, canonical import, per-frame pixel/hash/RGB lookup, absolute tick, coordinate fit, or sibling promotion changed.

# MOVE_METEOR_MASH corrected bilateral evidence checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **174/276 Level-50 exact**, 0 partial, 0 staged, and **102 unsupported**. Meteor Mash is not promoted: its complete source/hardware gate is exact, but production framebuffer is only **52/214 player-back** and **84/215 opponent-front**.
- **Did:** Corrected the staged carrier from National-Dex `375` (Emerald `GOREBYSS`) to source `SPECIES_METANG=399` and genderless healthboxes; completed all **48** Random2 mini-star variants and local-age **0..60** flicker reducer; pinned BG_COSMIC/BLDY/BLDCNT restore schedules, RAM+1 OAM/matrix/palette transfers, legal bilateral fixtures, portable verifier, raw RGB and normalized maps. The staged compositor now paints minis and hardware darkening but is deliberately not claimed exact.
- **Verified:** Twice fresh player frames **298..511** pass **214/214** source/reducer/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/map (evidence/raw/map `ed028a16…` / `309e0ea2…` / `c1b452de…`); opponent **231..445** passes **215/215** (`367dda53…` / `05e1a334…` / `d6ac27b1…`). Focused **10/10**, portable bilateral, boundary, source audit, typecheck, coverage, smoke, full suite, and build are green at handoff.
- **Next:** Resolve the remaining production-framebuffer mini OAM order/initialization, BG fade/palette composition, spinning-hand/hitsplat overlap and cleanup; require **214/214 + 215/215 framebuffer twice fresh** before promoting only Meteor Mash.
- **Notes:** No gameplay/damage/RNG/turn/controller/facility state, boundary, unsupported barrier, canonical import, per-frame pixel/hash/RGB lookup, absolute tick, coordinate fit, or sibling promotion changed.

# MOVE_METEOR_MASH staged implementation checkpoint — remains unsupported (2026-08-11 supervisor)

- **State:** Coverage remains **174/276 Level-50 exact**, 0 partial, 0 staged, and **102 unsupported**. `MOVE_METEOR_MASH` is not promoted: source/legal staging, dense evidence plumbing, reducer/assets, typed seam, a narrow Metang/Onix compositor, shake latch, and healthbox staging are banked, but the complete production-framebuffer acceptance gate is still open.
- **Did:** Pinned the exclusive source interval **0x082d56aa..0x082d5731**, complete legal bilateral parties using lowest Level-50 carrier set **311 METANG_2**, and a 214-frame source-relative reducer. Added a pointer-bounded Meteor Mash probe/source audit, source-derived assets, typed Scene-ON presentation seam, staged compositor, and move-owned latch rows for `ShakeMon2(ANIM_TARGET,5,0,20,1)` plus the twinkling-star parent lifecycle.
- **Verified:** Worker full suite passed **956 files / 8,709 tests / 1 skipped**, with build, typecheck, smoke, focused source/reducer tests, boundary audit, and coverage green. Supervisor independently confirmed the branch was animation-only and clean, reran the source audit plus focused **12/12** tests and typecheck, then fast-forwarded commits `49ebabb8..3b7603ba`. Coverage and gameplay state are unchanged.
- **Next:** Finish the source-owned mini-twinkling-star/OAM/palette lifecycle, BG/fade/register/audio state, portable bilateral fixtures/verifier, normalized change maps, and complete production framebuffer. Require twice-fresh bilateral all-frame equality before promoting only Meteor Mash.
- **Notes:** The current compositor is intentionally staged, not exact. No damage, accuracy/stat outcome, RNG, controller/turn/round/facility state, animation boundary, unsupported-branch barrier, canonical recording import, per-frame RGB/hash lookup, absolute-tick branch, coordinate fit, or sibling promotion changed.

# MOVE_FURY_SWIPES exact — bilateral Scene-ON dense acceptance (2026-08-11 worker)

- **State:** Coverage advances **173→174/276 Level-50 exact**, 0 partial, 0 staged, and **103→102 unsupported**; only `MOVE_FURY_SWIPES` moves.
- **Did:** Pinned the exclusive `Move_FURY_SWIPES` interval **0x082d407c..0x082d40e0**, four-component SWIPE/HorizontalLunge/ShakeMon2 graph, source four-cell/hFlip asset, and lowest Level-50 carrier set **142 AIPOM**. Added legal complete bilateral AIPOM/ONIX parties, a pure reducer, typed Scene-ON seam, source-derived asset/compositor, portable verifier, and normalized maps.
- **Verified:** Player-back frames **83..130** and opponent-front frames **87..134** pass **48/48 reducer/seam/component, software+hardware OAM/matrix/palette/tag/register/audio, immutable-state, raw-RGB/map, and production-framebuffer** gates twice fresh. Stable receipts: player evidence/raw/map `a54e4d2c…` / `f0ea9b5c…` / `26504c1b…`; opponent `c7bc934f…` / `0667282a…` / `33b0fc80…`. DIZZY_PUNCH remains **69/69** and CRUSH_CLAW **69/69**, both orientations twice fresh.
- **Next:** Supervisor merges this animation-only promotion; MOVE_DIZZY_PUNCH and MOVE_CRUSH_CLAW remain independent exact controls.
- **Notes:** Commits `12c14168`, `a62658cd`, and `3262234b` carry the source contract, reducer/compositor, and dual ShakeMon2 latch. No gameplay/state ownership, animation boundary, unsupported-branch barrier, or canonical-import allowlist changed; no per-frame lookup, absolute tick, capture/hash/RGB lookup, coordinate fit, or sibling promotion.

# MOVE_GUILLOTINE exact — bilateral Scene-ON dense acceptance (2026-08-11 worker)

- **State:** Coverage advances **172→173/276 Level-50 exact**, 0 partial, 0 staged, and **104→103 unsupported**; only `MOVE_GUILLOTINE` moves.
- **Did:** Ported the complete source-relative Guillotine reducer, typed seam, source-extracted orientation BG, CUT/IMPACT reuse, GLIGAR/ONIX compositor, mirrored pincer programs, target and complex palette tasks, both ShakeMon2 schedules, hitsplat, audio, fade/restore, hardware painter, and cleanup. The move-owned maps establish RAM+1 for both `(2,0,23,1)` and `(4,0,8,1)` live target schedules, including creation and teardown.
- **Verified:** Player-back frames **74..238** pass **165/165** reducer/seam/component and framebuffer, opponent-front frames **78..241** pass **164/164**, twice fresh with byte-stable evidence/raw/map receipts (`49f55f7f…` / `e52f5331…` / `ab5c9b5a…`; `59054f50…` / `16d58dcb…` / `dc296a41…`). VICE_GRIP remains **42/42** and MEGA_PUNCH **160/160**, twice fresh in both orientations; LEER/SWORDS_DANCE probe modes remain source-pinned. Boundary ratchet, animation audit/coverage, typecheck, full `npm test` (**951 files / 8,697 passed / 1 skipped**), and production build (**648 modules**) are green.
- **Next:** Supervisor merges this animation-only promotion; no sibling inherits Guillotine acceptance or its move-owned painter/latch rules.
- **Notes:** Presentation only: no gameplay/OHKO/accuracy/damage/RNG/controller/turn/round/facility, boundary, or unsupported-branch barrier change; no sibling promotion, canonical recording import, per-frame RGB table, capture/hash lookup, absolute tick, coordinate fit, or framebuffer lookup.

# MOVE_LEER exact — bilateral Scene-ON dense acceptance (2026-08-11 worker)

- **State:** Coverage advances **171→172/276 Level-50 exact**, 0 partial, 0 staged, and **105→104 unsupported**; only `MOVE_LEER` moves.
- **Did:** Ported the source-relative nine-component LEER reducer, orientation-aware eye asset/OAM, typed seam, and Dragonair/Onix compositor. The measured latches are eye OAM RAM+1, live ScaleMonAndRestore affine matrix RAM+2, long target ShakeMon2 RAM+2, and monbg/register cleanup from the move's own maps.
- **Verified:** Player-back **212..281** and opponent-front **75..144** each pass **70/70 source/component/seam and 70/70 production framebuffer**, twice fresh, with byte-stable probe/raw-RGB/change-map receipts. CONFUSION remains **140/140** twice in both orientations; SWORDS_DANCE portable remains **70/70** twice in both orientations and its source/evidence tests pass **5/5**. Boundary ratchet, animation audit/coverage, typecheck, full `npm test` (**949 files / 8,691 passed / 1 skipped**), and production build (**646 modules**) are green.
- **Next:** Supervisor merges this animation-only checkpoint; do not infer LEER's measured latch split for a sibling without sibling-owned dense evidence.
- **Notes:** Commits `c3484859` (implementation/verifier), `61005d0a` (coverage/latch/progress/receipt promotion), and `87617d7e` (promotion count ratchets). **For the main program:** presentation-only; no damage, defense-stage outcome, RNG, controller, turn, round, facility, boundary, or unsupported-barrier changes; no per-frame/absolute-tick/capture/hash/RGB lookup or coordinate fit.

# MOVE_METAL_SOUND exact — corrected ARON live-OAM latch closed (2026-08-11 worker)

- **State:** Coverage advances **170→171/276 Level-50 exact**, 0 partial, 0 staged, and **106→105 unsupported**. `MOVE_METAL_SOUND` alone moves; no boundary or unsupported-branch pin changes.
- **Did:** Derived the unresolved live-attacker display from the source scheduler and move-owned software/hardware OAM: the positive `ShakeMon2(2,0,8,1)` creation write reaches display at creation+1, then the sequence body follows RAM+2. The compositor now also respects the hardware OAM painter split (player-back ARON ahead of waves, opponent-front behind), with the rule carried through the narrow typed seam and pure Tier-1 pins.
- **Verified:** Twice fresh, player **291..376** passes **86/86 source/component/seam + framebuffer** and opponent **291..375** passes **85/85 + 85/85** with unchanged probe/raw/map digests (`7d3fd802…` / `509317b4…` / `6db141ff…`; `9cd4b2b1…` / `5f2f8646…` / `23f552d7…`). Supersonic remains **51/51 component + framebuffer twice fresh in both orientations**. Animation boundary/audit/coverage, typecheck, full suite, build, and diff check are green.
- **Next:** Supervisor selects the next independent acceptance unit; do not infer this live-OAM schedule without move-owned evidence.
- **Notes:** For the main program: Metal Sound changes presentation only; damage, RNG, turn/controller/facility state, shared boundary, and unsupported barriers are unchanged. No per-frame table, absolute tick, recording/hash lookup, or coordinate/RGB fit was introduced.

# MOVE_METAL_SOUND corrected-ARON checkpoint — eight bilateral latch frames remain (2026-08-11 worker)

- **State:** Coverage remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported; `MOVE_METAL_SOUND` is not promoted.
- **Did:** Fixed the generic-state/Metal-Sound typed seam so the real build succeeds; corrected both complete legal carriers from mislabeled species 304 TAILLOW to set-122 species 382 ARON; re-measured the pointer-bounded windows, ARON geometry/HP/healthboxes, wave affine/OAM, and normalized maps; and repaired the Supersonic verifier's post-layout Python path.
- **Verified:** Twice-fresh strict corrected evidence is byte-stable at player **291..376 = 86/86 source/component/seam, 78/86 framebuffer** (`7d3fd802…` / raw `509317b4…` / map `6db141ff…`) and opponent **291..375 = 85/85 source/component/seam, 77/85 framebuffer** (`9cd4b2b1…` / raw `5f2f8646…` / map `23f552d7…`). Every remaining diff is one of eight alternating `ShakeMon2(attacker,2,0,8,1)` live-battler display frames; wave geometry, affine/OAM and all other frames are exact.
- **Next:** Resolve the eight-frame move-owned live-battler OAM transfer schedule without a per-frame table; require 86/86 + 85/85 production framebuffer twice fresh before promotion.
- **Notes:** Corrected evidence changes the old mechanism record: Metal Sound wave affine/OAM is reducer age−1, while the short ShakeMon2 display latch remains unresolved. No gameplay/RNG/controller/facility, boundary, barrier, canonical recording, absolute tick, capture/hash lookup, coordinate/RGB fit, or other move promotion changed.

# MOVE_METAL_SOUND implementation checkpoint — component exact, framebuffer blocked (2026-08-11 worker)

- **State:** Coverage intentionally remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported; `MOVE_METAL_SOUND` is not promoted.
- **Did:** Added the source-relative four-wave reducer, narrow typed Scene-ON seam, source-extracted `ANIM_TAG_METAL_SOUND_WAVES` asset, and ARON/ONIX presentation compositor plus a fresh portable verifier. The reducer preserves the +4 orientation shift, wave/plain OAM RAM+1, fresh affine dual-lag, and Metal Sound's local `ShakeMon2(2,0,8,1)` age+1 anchor without changing gameplay state.
- **Verified:** Live Scene-ON component gates pass player-back **86/86** at frames **76..161** and opponent-front **85/85** at **80..164**. The committed Supersonic control independently remains **51/51 component + framebuffer** in both orientations. Metal Sound production framebuffer is **0/86** and **0/85**: the committed lab files encode species ID **304 = TAILLOW**, while this assigned compositor is explicitly ARON/ONIX; the oracle RGB/message therefore cannot equal an ARON render without violating the source-derived species seam. Focused **11/11**, animation audit, coverage, and typecheck pass.
- **Next:** Resolve the canonical ARON scenario/species-ID mismatch (or supply a source window whose live framebuffer is actually ARON/ONIX), then rerun both dense production gates twice fresh before promoting. No coverage or latch ledger change is claimed.
- **Notes:** Commits `27848457` (reducer/asset/seam) and `91772735` (compositor/verifier). No boundary widening, unsupported barrier, canonical recording import, capture/hash lookup, coordinate/RGB fitting, absolute-tick render, or gameplay/controller/facility change.

# Supervisor wind-down — MOVE_METAL_SOUND bilateral dense evidence checkpoint (2026-08-11)

- **State:** Coverage remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported. `MOVE_METAL_SOUND` remains unsupported; no production framebuffer claim was made.
- **Did:** Folded current `master`, established a green baseline, and merged complete legal bilateral ARON/ONIX Scene-ON scenarios, a Metal-Sound-specific pointer-bounded probe, compact receipts, normalized change maps, a focused evidence test, and the move-owned display-latch row. The probe covers the source pointer, tasks/sprites, software+hardware OAM/matrices, palettes/tags/registers/audio, immutable battle state, and raw RGB through first inactive cleanup.
- **Verified:** Player-back **76..161 = 86/86** and opponent-front **80..164 = 85/85** reproduce twice fresh and byte-stably. Probe/raw/map digests are player `b368c1aa…` / `54ad351b…` / `72913fba…`, opponent `6ce39502…` / `39a6fab9…` / `9b6d338a…`; supervisor fresh runs independently reproduce both probe hashes. The maps measure a **+4** orientation shift, wave affine dual-lag, wave/plain OAM RAM+1, the exact `ShakeMon2(ANIM_ATTACKER,2,0,8,1)` creation anchor, palette RAM+1, and side-relative BG/audio. Supersonic remains bilaterally **51/51 component + framebuffer ×2** exact. Final focused/full-suite/build gates are green.
- **Next:** Port Metal Sound's source-relative reducer and typed Scene-ON seam, then independently gate its compositor and production framebuffer twice fresh before promotion.
- **Notes:** No gameplay/stat outcome, RNG/controller/facility state, engine boundary, unsupported barrier, canonical capture import, or production renderer changed. **For the main program:** this checkpoint is animation-only dev-time evidence plus a latch reference; no production seam changed.

# MOVE_METAL_SOUND authoritative source checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported. `MOVE_METAL_SOUND` is not promoted.
- **Did:** Added a focused source audit/test pinning exclusive `Move_METAL_SOUND` **0x082d59b7..0x082d5a07** (`0x50` bytes), its complete eight-component generated graph, and true lowest legal Level-50 carrier set **122 `FRONTIER_MON_ARON`**; set 108 MAGNEMITE is outside the Level-50 range. Exact `MOVE_SUPERSONIC` reruns as the shared-component control only.
- **Verified:** Supervisor reran the focused Metal Sound/Supersonic contract **5/5**, source audit, coverage ratchet, full `npm test` (**921 files / 8,561 passed / 1 skipped**), and production build (**642 modules**) after merging the worker checkpoint.
- **Next:** Missing gate: complete legal bilateral Scene-ON parties with natural Metal Sound selection plus a Metal-Sound-specific pointer-bounded dense probe through first inactive cleanup twice fresh (JSON/raw-RGB hashes), then Supersonic control rerun; only after full reducer/seam/maps/production-framebuffer equality may Metal Sound be promoted.
- **Notes:** Source-only checkpoint: no oracle dense window, production renderer, coverage/deferred ledger, gameplay/outcomes/RNG/controller state, engine boundary, barrier, canonical capture import, coordinate/RGB fitting, or absolute-tick rendering changed. `panse SE_M_SCREECH`, `monbg ANIM_DEF_PARTNER`, `splitbgprio_foes ANIM_TARGET`, and the Metal Wave asset remain evidence, not inherited behavior.

# MOVE_GUILLOTINE bilateral 329/329 dense evidence checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported. `MOVE_GUILLOTINE` is not promoted: its complete bilateral dense windows reproduce twice fresh, but no Guillotine reducer, typed seam, compositor, normalized change maps, or production-framebuffer gate exists yet.
- **Did:** Independently pinned exclusive `Move_GUILLOTINE` **0x082cb829..0x082cb8b5** (`0x8c` bytes), the complete 14-component CUT/IMPACT/dual-pincer/background/palette/ShakeMon2/hitsplat graph, and true lowest Level-50 carrier set **315 `FRONTIER_MON_GLIGAR_2`**. Added complete legal bilateral Scene-ON parties with natural input and a backward-compatible Guillotine mode in the existing dense hardware probe.
- **Verified:** Player-back frames **74..238** capture **165/165** and opponent-front **78..241** capture **164/164** source-relative frames through first inactive cleanup twice fresh with byte-identical JSON and raw RGB. Evidence/raw digests are player `49f55f7f…` / `e52f5331…`, opponent `59054f50…` / `16d58dcb…`; topology includes both pincer paths, palette blend, both ShakeMon2 schedules, basic hitsplat, fade/restore background, monbg, alpha, and cleanup. The backward-compatibility control reproduces LEER's prior bilateral `e9e89adb…` / `d0cf03af…` evidence exactly.
- **Next:** Port the pure 165/164-age orientation-aware Guillotine reducer and typed Scene-ON seam; implement the CUT/IMPACT assets, mirrored pincer motion, Guillotine background and palette/alpha/fade compositor, then bank bilateral normalized change maps and require component/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable/raw-RGB/production-framebuffer equality twice fresh before promoting only Guillotine to 171/276.
- **Notes:** `ANIMATION_COVERAGE.json` is intentionally unchanged. No OHKO outcome, accuracy/RNG, controller/turn/round/facility state, engine boundary, unsupported barrier, canonical import, capture/hash lookup, RGB table, coordinate fit, absolute-tick rendering, or production renderer changed.

# MOVE_LEER bilateral 70/70 dense evidence checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **170/276 Level-50 exact**, 0 partial, 0 staged, and 106 unsupported. `MOVE_LEER` is not promoted: its complete bilateral dense oracle windows reproduce twice fresh, but no LEER reducer, typed seam, compositor, normalized change maps, or production-framebuffer gate exists yet.
- **Did:** Independently pinned exclusive `Move_LEER` **0x082d2d90..0x082d2de7** (`0x57` bytes), the nine-component LEER/ScaleMonAndRestore/ShakeMon2/monbg/splitbgprio/8:8-alpha graph plus audio, and sole Level-50 carrier set **201 `FRONTIER_MON_DRAGONAIR_1`**. Added complete legal bilateral Scene-ON parties, natural controller traces, a source contract audit, and a narrow LEER mode in the existing dense source/hardware probe.
- **Verified:** Player-back frames **212..281** and opponent-front **75..144** each capture **70/70** source-relative frames through first inactive cleanup twice fresh with byte-identical JSON and raw RGB. Evidence/raw digests are player `e9e89adb…` / `7f2420c2…`, opponent `d0cf03af…` / `0087f64d…`; topology includes `gLeerSpriteTemplate`, `AnimTask_ScaleMonAndRestore_Step`, both `AnimTask_ShakeMon2_Step` instances, and monbg update/clear tasks. Focused **6/6**, animation audit, coverage, typecheck, full `npm test` (**919 files / 8,556 passed / 1 skipped**), and production build (**642 modules**) pass.
- **Next:** Port the pure 70-age LEER reducer and typed Scene-ON seam, preserving its five-cell eye sprite and source-equivalent scale/shake/monbg latches; bank bilateral normalized change maps and require component/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable/raw-RGB/production-framebuffer equality twice fresh before promoting only LEER to 171/276.
- **Notes:** `ANIMATION_COVERAGE.json` is intentionally unchanged. No defense-stage outcome, accuracy/RNG, controller/turn/round/facility state, engine boundary, unsupported barrier, canonical import, capture/hash lookup, RGB table, coordinate fit, or absolute-tick rendering changed.

# MOVE_SWORDS_DANCE exact — bilateral 70/70 flash/blade promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **169→170/276 exact**, 0 partial, 0 staged, and **107→106 unsupported**. Only `MOVE_SWORDS_DANCE` moved; no animation-boundary or unsupported-barrier widening.
- **Did:** Independently pinned exclusive `Move_SWORDS_DANCE` **0x082caaa4..0x082caaea** (`0x46` bytes), the eight-component SWORD/blade/ellipse/flash/monbg/alpha/cleanup graph, and lowest legal Level-50 carrier set **137 `FRONTIER_MON_FARFETCHD`**. Complete legal bilateral LEDIAN/ONIX stages feed a pure 70-age reducer, typed seam, narrow compositor, deterministic source/asset audits, dense receipts, and normalized change maps.
- **Verified:** Player-back frames **74..143** and opponent-front **78..147** each pass **70/70 reducer/seam/component, software+hardware OAM/matrix/palette/tag/register/audio, immutable-state/raw-RGB/map, and production-framebuffer** gates twice fresh. Agility remains bilateral **87/87** and Comet Punch all **333/333** bilateral frames twice fresh. Animation audit, coverage, typecheck, full `npm test` (**918 files / 8,553 passed / 1 skipped**), and production build (**642 modules**) pass.
- **Next:** Supervisor may fold only Swords Dance's independent exact claim. `HYPER_BEAM` and `CONVERSION` retain distinct bodies and remain unsupported despite the new exact `flash_anim_tag_with_color` representative.
- **Notes:** Evidence/raw digests are player `1da50d13…` / `1f7e5238…`, opponent `f067ec78…` / `994d7895…`. No stat-stage outcome, damage, RNG, turn/controller/round/facility state, canonical import, capture/hash lookup, per-frame RGB table, coordinate fitting, or absolute tick was added.

# MOVE_COMET_PUNCH exact — bilateral natural 333/333 promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **168→169/276 exact**, 0 partial, 0 staged, and **108→107 unsupported**. Only `MOVE_COMET_PUNCH` moved; no animation-boundary or unsupported-barrier widening.
- **Did:** Pinned exclusive `Move_COMET_PUNCH` **0x082ca2c3..0x082ca33b** (`0x78` bytes), both `choosetwoturnanim` routes, IMPACT/HANDS_AND_FEET/basic-hitsplat/fist/ShakeMon/monbg/12:8 alpha/audio graph, and sole Level-50 carrier set **159 `FRONTIER_MON_LEDIAN`**. Added legal bilateral three-mon stages, pure reducer, typed seam, narrow LEDIAN/ONIX compositor, source and asset audits, dense probe, portable receipts, and nine normalized maps.
- **Verified:** Natural controller windows pass twice fresh at player-back **84..120 / 188..224 / 373..409 / 477..513** and opponent-front **88..124 / 192..228 / 297..333 / 401..437 / 505..541**: every **37/37** reducer/seam/component/hardware/raw-RGB/map/framebuffer gate (**148 + 185 = 333** bilateral). Double Slap, Double Kick, and Mega Punch independent portables remain exact. Final `animation:audit`, coverage, typecheck, `npm test` (**916 files / 8,548 passed / 1 skipped**), and production build pass.
- **Next:** Supervisor may fold only Comet Punch’s independent exact claim; do not transfer it to another multi-hit/basic-fist script.
- **Notes:** Comet’s own maps confirm ordinary fist/OAM and `AnimTask_ShakeMon` RAM+1 plus a fresh affine matrix one display later; this matches existing latch rows, so `ANIMATION_LATCHES.md` is unchanged. No hit count, accuracy, damage, RNG, controller, turn, round/facility state, canonical import, capture lookup, absolute tick, or per-frame RGB table was added.

# MOVE_DOUBLE_SLAP exact — bilateral natural three-hit 204/204 promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **167→168/276 exact**, 0 partial, 0 staged, and **109→108 unsupported**. Only `MOVE_DOUBLE_SLAP` moved; no animation-boundary or unsupported-barrier widening.
- **Did:** Pinned the exclusive `Move_DOUBLE_SLAP` interval **0x082c93c9..0x082c941c** (`0x53` bytes), both `choosetwoturnanim` routes, IMPACT/basic-hitsplat/ShakeMon/monbg/alpha/audio graph, and sole Level-50 carrier set **155 `FRONTIER_MON_POLIWHIRL`**. Complete legal bilateral parties let the real controller naturally select three hits (`moveTurn 0/1/2`, left/right/left); a pure reducer, typed seam, narrow compositor, deterministic asset/source audits, dense probe, receipts/maps, and portable gate every invocation.
- **Verified:** Player-back **86..119 / 187..220 / 288..321** and opponent-front **90..123 / 191..224 / 292..325** each pass **34/34** reducer/seam/component, software+hardware OAM/matrix/palette/tag/register/audio, immutable-state/raw-RGB/change-map, and production-framebuffer frames twice fresh: **102/102 per orientation, 204/204 bilateral**. Evidence/raw digests are player `49d2b4ef…` / `388f2040…`, opponent `f921ecdb…` / `91c7adc1…`. Triple Kick remains **222/222**, Double Kick **36/36** bilateral twice fresh, and Counter **88/88** bilateral. Final animation audit, coverage, typecheck, full `npm test` (**913 files / 8,541 passed / 1 skipped**), and build (**639 modules**) pass.
- **Next:** Supervisor selects the next independent move. Do not transfer acceptance to another multi-hit/basic-hitsplat script.
- **Notes:** No hit count, accuracy, damage, RNG, controller, turn, round/facility state, canonical import, per-frame RGB table, capture lookup, or absolute battle tick was added.

# MOVE_TRIPLE_KICK exact — bilateral three-branch 222/222 promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **166→167/276 exact**, 0 partial, 0 staged, and **110→109 unsupported**. Only `MOVE_TRIPLE_KICK` moved; no animation-boundary or unsupported-barrier widening.
- **Did:** Added a portable verifier that runs all three controller-supplied `moveTurn` branches twice fresh per orientation and gates reducer/seam, branch/task/sprite topology, software+hardware OAM/matrices/palettes/tags/registers/audio, immutable battle state, raw RGB, normalized maps, and the production framebuffer. Banked six durable maps and exact receipts. The source-derived compositor now preserves the initial message/front-idle x2 only for `moveTurn 0`; continuations retain blank window chrome and the prior ShakeMon x2 overwrite.
- **Verified:** Player-back **225..261 / 354..390 / 483..519** and opponent-front **226..262 / 436..472 / 565..601** each pass **37/37** on every gate twice fresh: **111/111 per orientation, 222/222 bilateral per run**. Independent Double Kick remains **36/36** bilaterally twice fresh and Counter remains **88/88** bilaterally. Current audit, coverage **167/276**, focused **18/18**, typecheck, full `npm test` (**910 files / 8,534 passed / 1 skipped**), and build (**638 modules**) pass.
- **Next:** Supervisor selects the next independent move acceptance unit; do not transfer Triple Kick acceptance to another multi-hit or foot/hitsplat script without its own complete dense proof.
- **Notes:** No hit count, accuracy, damage/rising power, RNG, controller, turn, round/facility state, canonical import, per-frame RGB table, capture lookup, or absolute battle tick was added.

# MOVE_TRIPLE_KICK bilateral three-branch evidence checkpoint — remains unsupported (2026-08-11 worker)

- **State:** Coverage remains **166/276 Level-50 exact**, 0 partial, 0 staged, and **110 unsupported**. `MOVE_TRIPLE_KICK` is not promoted: all six complete branch windows reproduce twice fresh and the pure reducer/typed seam/compositor are implemented, but production-framebuffer and normalized change-map equality have not yet passed a portable all-frame gate.
- **Did:** Pinned the complete exclusive `Move_TRIPLE_KICK` interval **0x082d2293..0x082d235a** (`0xc7` bytes), all `jumpifmoveturn` routes and the full wide-foot/basic-hitsplat/ShakeMon/assets graph, plus sole/lowest Level-50 carrier set 236 `FRONTIER_MON_HITMONTOP_1`. Added complete legal challenge-1 bilateral parties, a pointer-bounded probe, pure 37-age branch reducer, narrow typed Scene-ON seam, and presentation-only HITMONTOP/ONIX compositor. The controller—not the port—supplies moveTurn 0/1/2.
- **Verified:** Twice fresh, player-back moveTurns 0/1/2 capture **37/37** frames at **225..261 / 354..390 / 483..519**, evidence `278548e0…`, raw RGB `9d0c6cec…`; opponent-front captures **37/37** at **226..262 / 436..472 / 565..601**, evidence `1d08579d…`, raw RGB `56de0099…`. Focused source/reducer/evidence/boundary tests, current `animation:audit`, coverage, typecheck, full `npm test`, and production build pass.
- **Next:** Add the portable per-frame reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/register/audio/immutable-state/raw-RGB/change-map/production-framebuffer verifier; resolve any framebuffer differences, rerun Double Kick and Counter controls, and promote only if all **222/222** bilateral branch frames pass twice fresh.
- **Notes:** Exact unresolved gate is specifically the portable production framebuffer plus normalized change maps, not branch reproducibility. No hit count, accuracy, damage/rising power, RNG, turn order, controller, round/facility state, coverage, boundary, unsupported barrier, canonical import, absolute tick, or framebuffer lookup changed.

# MOVE_DOUBLE_KICK exact — bilateral 36/36 source-body promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **165→166/276 exact**, 0 partial, 0 staged, and **111→110 unsupported**. Only `MOVE_DOUBLE_KICK` moved; no animation-boundary or unsupported-barrier widening.
- **Did:** Pinned `Move_DOUBLE_KICK` **0x082d2261..0x082d2293** (`0x32` bytes), both source assets/palettes and callback graph, and lowest legal Level-50 carrier set 146 `FRONTIER_MON_NIDORINA`. Added complete legal bilateral NIDORINA/ONIX parties, a pure source-relative reducer, narrow typed Scene-ON seam, compositor, deterministic asset audit, normalized change maps, and a portable twice-fresh probe/verifier. Caller-supplied Random2 words drive the presentation; the port never advances RNG or owns multi-hit/gameplay state.
- **Verified:** Player-back and opponent-front oracle frames **227..262** each pass **36/36 reducer/seam/component, software+hardware OAM/matrix/palette/tag/register/audio, immutable-state/raw-RGB/change-map, and production framebuffer** twice fresh. Evidence/raw/map digests are player `e1072af7…` / `435f47a1…` / `46609836…`, opponent `83b37252…` / `9a4ed4ea…` / `8a94f506…`. Fist/child and `AnimTask_ShakeMon(4,0,6,1)` display at RAM+1; source monbg palette transfer is same-display. Independent Thrash, Sleep Powder, and Stun Spore acceptance remains green. Final `npm test` passes **907 files / 8,528 passed / 1 skipped**; typecheck and production build pass with **637 modules** transformed.
- **Next:** Supervisor selects the next independent move acceptance unit; do not transfer Double Kick acceptance to another multihit or fist/foot script without its own complete dense proof.
- **Notes:** No damage, hit-count mechanic, RNG advancement, turn order, controller, round/facility state, canonical recording import, absolute-tick framebuffer lookup, or per-frame pixel/RGB table was added.

# MOVE_POISON_POWDER source/classification checkpoint — assignment mis-scoped (2026-08-11 worker)

- **State:** Coverage remains **165/276 Level-50 exact**, 0 partial, 0 staged, and **111 unsupported**. `MOVE_POISON_POWDER` is not promoted: the source-derived inventory classifies it as `outsideFactory` (**0 Factory carriers**) rather than one of the 276 Level-50 moves, so the assigned **165→166/276** delta and “lowest Level-50 Factory carrier” do not exist without falsifying generated data or widening scope.
- **Did:** Pinned the full `Move_POISON_POWDER` interval **0x082c941c..0x082c954d** (`0x131` bytes), the generated three-component graph (`ANIM_TAG_POISON_POWDER`, loaded-but-unused `ANIM_TAG_POISON_BUBBLE`, and `gPoisonPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step` with `gPowderParticlesAnimCmds`), all graphics/palette symbol identities, and the absence of the move from every Factory mon. The lowest source-legal species is Bulbasaur (learns it at level 15), but that is outside the Factory acceptance tier.
- **Next:** Supervisor must either select an actual unsupported Level-50 move for the 166/276 promotion, or explicitly re-scope this unit to the outside-Factory tier (which would leave Level-50 at 165/276 and advance outside-Factory 0→1/77). Do not relabel Poison Powder as a Factory move.
- **Notes:** No oracle stage, reducer, compositor, latch, coverage entry, engine/controller/gameplay state, boundary, unsupported barrier, generated inventory, canonical import, or framebuffer branch changed. Existing Stun/Sleep Powder exactness is untouched.

# MOVE_SLEEP_POWDER exact — bilateral 194/194 promotion (2026-08-11 worker)

- **State:** Level-50 coverage advances **164→165/276 exact**, 0 partial, 0 staged, and **112→111 unsupported**. Only `MOVE_SLEEP_POWDER` moved; `MOVE_POISON_POWDER` remains an independent unsupported move. No boundary or unsupported barrier widened.
- **Did:** Pinned `Move_SLEEP_POWDER` **0x082c967b..0x082c97a9** (`0x12e` bytes), `gSleepPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step` with `gPowderParticlesAnimCmds`, the distinct tag/palette, and lowest Level-50 carrier set 226 `FRONTIER_MON_VENOMOTH_1`. Added complete legal HOPPIP/ONIX bilateral stages, deterministic Sleep Powder palette extraction, a pure source-identity-preserving reducer/config, narrow typed seam, and a shared Stun/Sleep powder compositor.
- **Verified:** Twice fresh, player-back frames **380..573** and opponent-front **385..578** pass **194/194** reducer/seam/component, displayed powder latch/order, prior software→hardware OAM/matrix/palette, tags/register/audio, immutable battle state, raw RGB/change-map, and production-framebuffer gates. Player evidence/raw/map: `207ffeb9…` / `e90bba35…` / `642c7ebc…`; opponent: `f353a36c…` / `63ebdc38…` / `bd82e785…`. The independent STUN_SPORE control remains bilateral **194/194** twice fresh under the stricter portable.
- **Next:** Supervisor selects the next independent acceptance unit. Do not promote Poison Powder from the callback identity.
- **Notes:** Sleep Powder independently confirms, without changing `ANIMATION_LATCHES.md`, the existing powder rule: `loadspritegfx` visible at window entry, callback position at RAM+1, current displayed animation cell, and source-persistent hardware OAM order. No sleep outcome, damage, accuracy/RNG, turn/controller/round/facility state, canonical import, absolute-tick branch, or framebuffer lookup was added.

# MOVE_STUN_SPORE exact — bilateral 194/194 promotion (2026-08-10 worker)

- **State:** Level-50 coverage advances **163→164/276 exact**, 0 partial, 0 staged, and **113→112 unsupported**. Only `MOVE_STUN_SPORE` moved; `MOVE_SLEEP_POWDER` and `MOVE_POISON_POWDER` remain independent unsupported moves.
- **Did:** Added the pure source-relative 194-age powder reducer, narrow typed Scene-ON seam, deterministic STUN_SPORE asset extraction, HOPPIP/ONIX production compositor, source audit, legal bilateral three-mon stages, and committed raw-RGB change maps. The source interval is `Move_STUN_SPORE` `0x082c954d..0x082c967b` (`0x12e` bytes); graph is `gStunSporeParticleSpriteTemplate -> AnimMovePowderParticle_Step` with `gPowderParticlesAnimCmds`; lowest Factory Level-50 carrier is Gloom set 167, while dense evidence uses legal Hoppip 187.
- **Verified:** Player-back frames **380..573** and opponent-front **385..578** pass **194/194** reducer/seam/component, software+hardware OAM/matrix/palette/tag/register/audio, immutable state, raw RGB, change map, and shared production framebuffer twice fresh. Stable receipts: player evidence/raw/map `e1842c7c…` / `0adc53f2…` / `b97cb47f…`; opponent `3b7c9ad5…` / `b7dbe084…` / `e3ebc54f…`.
- **Next:** Supervisor selects the next independent acceptance unit. Do not promote Sleep Powder or Poison Powder from the shared callback shape.
- **Notes:** Measured powder callback OAM position is RAM+1 while the current source-age animation cell is displayed; `loadspritegfx` latches at the first window frame. No damage/status outcome, RNG, turn, controller, round/facility state, boundary list, unsupported barrier, canonical recording import, absolute-tick branch, or per-frame framebuffer lookup changed.

# MOVE_THRASH exact — bilateral 103/103 promotion (2026-08-10 worker)

- **State:** Level-50 coverage advances **162→163/276 exact**, 0 partial, 0 staged, and **114→113 unsupported**. Only `MOVE_THRASH` is promoted; `MOVE_DOUBLE_KICK` remains independently unsupported.
- **Did:** Added the pure source-relative 103-age reducer, narrow typed TAUROS/ONIX Scene-ON presentation seam, and production compositor. The implementation ports the three random-position fist/foot scripts, child hitsplats, source allocator/OAM ordering, vertical and horizontal affine tasks, both ShakeMonInPlace programs, tags/palettes/registers/audio, +4 opponent orientation shift, and first-inactive cleanup without mutating battle state.
- **Verified:** Twice-fresh player-back frames **72..174** and opponent-front frames **76..178** pass **103/103** reducer, typed seam, task/sprite, software/hardware OAM/matrix/palette/tag/register/audio, immutable-state, raw-RGB/change-map, and production-framebuffer gates. Thrash's own rows confirm plain fist/foot + hitsplats and vertical OAM at RAM+1; horizontal affine and all three ShakeMonInPlace schedules at RAM+2, with target-outline witnesses **94.2–98.1%** at RAM+2 versus **60.5–70.6%** at RAM+1. The independent Counter shared fist/hitsplat/shake control also passes **88/88** twice fresh bilaterally. Focused tests, smoke **375/375**, typecheck, full `npm test`, production build, coverage, and diff check pass.
- **Next:** Supervisor selects a new independent move; do not promote `MOVE_DOUBLE_KICK` from this shared component work.
- **Notes:** No damage, rampage/confusion, RNG, turn order, controller/round/facility state, animation boundary, unsupported barrier, canonical recording import, absolute-tick branch, per-age framebuffer lookup, or sibling coverage changed.

# Animation supervisor wind-down — Heat Wave + Mist Ball exact; Thrash implementation-ready (2026-08-10)

- **State:** This session advances Level-50 coverage **160→162/276 exact**, 0 partial, 0 staged, and **116→114 unsupported**. `MOVE_HEAT_WAVE` and `MOVE_MIST_BALL` are newly exact; `MOVE_THRASH` remains unsupported with complete bilateral evidence and every move-owned display latch resolved. `MOVE_SANDSTORM` and `MOVE_FEATHER_DANCE` remain exact independent controls.
- **Did:** Merged the starting `master`, then independently audited, reproduced, and folded five bounded animation worker chains: Heat Wave's 168-age flying-dirt implementation; Mist Ball's 213-frame evidence checkpoint and exact fog-pipeline implementation; Thrash's 103-frame source/evidence handoff; and its focused three-schedule pixel-latch diagnostic. Move-owned evidence pins Heat Wave target motion at RAM+2, Mist Ball's fog/palette/projectile rules, and Thrash fist/child OAM + vertical position at RAM+1, horizontal affine at RAM+2, and both `(4,0,7,1)` plus `(8,0,16,1)` `ShakeMonInPlace` schedules at RAM+2.
- **Verified:** Twice fresh, Heat Wave passes **168/168** complete bilateral reducer/seam/hardware/raw-RGB/framebuffer gates with Sandstorm unchanged at **168/168**; Mist Ball passes **213/213** complete bilateral gates with Feather Dance unchanged at **400/400**; Thrash reproduces **103/103** dense evidence frames bilaterally and its six target-outline witnesses select RAM+2 at **94.2–98.1%** versus RAM+1's **60.5–70.6%**. Final integrated `npm test` is green at **895 files / 8,486 passed / 1 skipped**; `npm run build` transforms **631 modules**; coverage is **162/276 exact**. All animation worker branches/worktrees are removed.
- **Next:** Implement the pure 103-age `MOVE_THRASH` reducer, narrow typed TAUROS/ONIX Scene-ON seam, and production compositor directly from the committed rows/latches. Require twice-fresh bilateral **103/103 reducer/seam/hardware/raw-RGB/production-framebuffer** equality; keep `MOVE_DOUBLE_KICK` an independent acceptance unit.
- **Notes:** For the main program: all merged changes are presentation assets/timelines/compositors or animation evidence. No damage, status/confusion/rampage outcome, gameplay RNG, turn order, controller, round/facility state, main-program ledger, canonical import allowlist, animation boundary, unsupported barrier, or absolute-tick framebuffer branch changed. No animation deferral is open.

# MOVE_THRASH three-schedule display-latch diagnostic — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **162/276 exact**, 0 partial, 0 staged, **114 unsupported**. THRASH and DOUBLE_KICK remain unsupported; no reducer, typed seam, compositor, production source, boundary, barrier, or gameplay state changed.
- **Did:** Added a focused move-owned displayed-pixel verifier over the existing complete legal set-408 TAUROS/set-394 ONIX Scene-ON checkpoint. It derives the target's nontransparent OBJ-palette outline from the first dense frame, excludes each invocation's complete source/OAM-derived 32x32 fist/hitsplat painter bounds, and tests RAM+0/+1/+2 independently through each task's terminal display. Both `(4,0,7,1)` calls and the `(8,0,16,1)` call resolve to **RAM+2** in both orientations.
- **Verified:** Player-back RAM+2 target-pixel agreement is **21,262/22,572**, **17,790/18,853**, and **39,632/40,715**; opponent-front is **20,271/21,130**, **23,365/24,363**, and **44,402/45,251**. RAM+2 spans **94.2-98.1%** versus RAM+1's **60.5-70.6%**. Twice-fresh evidence/raw/change-map hashes remain unchanged: player `16832a54...` / `23f6c807...` / `0a305072...`; opponent `e1317010...` / `eac38716...` / `056021bd...`. Focused source/evidence/boundary tests **6/6**, the twice-fresh portable, smoke **375/375**, typecheck, full `npm test` **895 files / 8,486 passed / 1 skipped**, production build **631 modules**, coverage, Scene-ON oracle info, and diff check pass.
- **Next:** Implement the pure 103-age THRASH reducer, narrow typed TAUROS/ONIX seam, and production compositor in a later implementation step; require twice-fresh bilateral reducer/seam/hardware/raw-RGB/production-framebuffer equality. DOUBLE_KICK remains an independent acceptance unit.
- **Notes:** Hardware OAM still equals prior software OAM, but that fact is only supporting evidence: the latch verdict comes from actual target-outline pixels after excluding painter bounds. Existing horizontal affine RAM+2, vertical position RAM+1, plain fist/child RAM+1, and +4 orientation shift remain unchanged.

# MOVE_THRASH bilateral dense evidence checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **162/276 exact**, 0 partial, 0 staged, **114 unsupported**. `MOVE_THRASH` and sibling audit control `MOVE_DOUBLE_KICK` remain independent unsupported moves; no reducer, typed seam, production compositor, framebuffer claim, animation boundary, unsupported barrier, or gameplay/controller state changed.
- **Did:** Pinned the real exclusive script-data `Move_THRASH` interval **0x082cc981..0x082cca00** (0x7f bytes; byte 0x082cc980 belongs to HornDrillInContest), all six source components, sole Level-50 carrier set **408 `FRONTIER_MON_TAUROS_1`**, and DOUBLE_KICK's distinct 11-carrier monbg/alpha/ShakeMon body. Added complete legal challenge-3 TAUROS/ONIX three-Pokemon parties in both orientations plus a pointer-bounded probe/portable covering complete callback/task topology and data, live battlers, sprite allocation/OAM/order/matrices, software+hardware buffers, palettes/tags/registers/audio, immutable parties/battlers/outcome state, raw RGB, normalized maps, and cleanup.
- **Verified:** Twice fresh, player-back frames **72..174** and opponent-front **76..178** each reproduce **103/103 dense evidence frames**. Evidence/raw/map digests are player `16832a54…` / `23f6c807…` / `0a305072…`, opponent `e1317010…` / `eac38716…` / `056021bd…`. Both maps pin plain fist/foot and child OAM plus vertical position at RAM+1, horizontal affine at RAM+2, and the +4 orientation shift; `ShakeMonInPlace` remains unknown because each schedule overlaps fist/hitsplat pixels. Focused source/evidence/boundary tests **6/6**, smoke **375/375**, typecheck, full `npm test` **895 files / 8,486 passed / 1 skipped**, production build **631 modules**, coverage, and diff check pass.
- **Next:** Implement a pure 103-age THRASH reducer only after independently isolating all three `ShakeMonInPlace` schedules in both orientations; then add the narrow typed seam and TAUROS/ONIX compositor and require twice-fresh bilateral reducer/seam/hardware/raw-RGB/production-framebuffer equality. DOUBLE_KICK must earn its own dense gates separately.
- **Notes:** No damage, confusion/rampage, gameplay or presentation RNG ownership, turn order, controller/round/facility state, capture lookup, per-age framebuffer table, absolute tick, canonical recording import, boundary widening, unsupported barrier, or sibling coverage changed.

# MOVE_MIST_BALL exact — bilateral 213/213 fog-pipeline promotion (2026-08-10 worker)

- **State:** Level-50 coverage advances **161→162/276 exact**, 0 partial, 0 staged, **115→114 unsupported**. `MOVE_MIST_BALL` alone moves; exact `MOVE_FEATHER_DANCE` remains its mandatory independent sibling control.
- **Did:** Added a pure complete 213-age source-relative reducer, narrow typed LATIAS/REGISTEEL Scene-ON seam, deterministic source asset extractor, and production compositor for SMALL_BUBBLES plus loaded-but-unused WHITE_FEATHER, the 30-tick projectile and real visual wait, both ShakeMon programs, background and target palette ramps, complete BG1 fog load/ramp/hold/fade/scroll/cleanup, audio, species idle, orientation-specific painter order, and first inactive cleanup. No recording or per-age framebuffer data enters production.
- **Verified:** Twice fresh, player-back **75..287** and opponent-front **79..291** each pass **213/213 reducer/seam/task/sprite/software+hardware OAM/matrix/palette/tag/BG1/audio/immutable-state/raw-RGB/normalized-map/production-framebuffer** frames. Probe/raw/map hashes remain player `cbdb661c…` / `0324bfaf…` / `7dc1852f…`, opponent `882e3de5…` / `4729defc…` / `e9309993…`. Mist Ball's own maps pin both ShakeMon calls and plain OAM at RAM+1, palette transfer at RAM+1, BG tiles at age 44, first tilemap/fog pixels at 47, scroll −121, opaque fog palette index zero, the 16-sum fade, and bilateral projectile order. Exact FEATHER_DANCE reruns at unchanged **400/400**, hashes `d1a3188e7709bedf` / `94ba815e85f10605`. Focused tests, smoke, typecheck, full suite, build, coverage, and diff check are green.
- **Next:** Supervisor selects the next independent move. Do not infer acceptance from Mist Ball's loaded-but-unused feather resource or transfer its fog/painter rules without move-owned evidence.
- **Notes:** No gameplay, damage, secondary-effect, RNG, turn/controller/round/facility state, capture lookup, absolute battle tick, canonical production recording, animation boundary, unsupported barrier, or sibling coverage changed.

# MOVE_HEAT_WAVE exact bilateral acceptance — flying-dirt track complete (2026-08-10 worker)

- **State:** Level-50 coverage advances **160→161/276 exact**, 0 partial, 0 staged, **116→115 unsupported**. `MOVE_HEAT_WAVE` alone is promoted; `MOVE_SANDSTORM` keeps its existing exact claim.
- **Did:** Added the pure 168-age source reducer, narrow typed NINETALES/ONIX Scene-ON seam, and production compositor for red particle/BG palette blends, mirrored ±6/−1 sandstorm scroll, alpha registers, full pan, four-state target motion, seven signed-Q8.8 crescents, species geometry/idle, hardware transfer latches, and cleanup. Heat Wave's own maps pin `AnimTask_MoveHeatWaveTargets` at RAM+2 (a task-specific contradiction to the default plain-OAM expectation), while crescent creation remains RAM+1; mirrored subsprites use parent-relative −16/−48 placement and signed negative floor. These measured rules are recorded in `ANIMATION_LATCHES.md`.
- **Verified:** Twice-fresh Scene-ON player-back frames **78..245** and opponent-front **82..249** each pass **168/168** source/component/typed-seam/task/sprite/software+hardware OAM+matrices/palette+tags/register/audio/immutable-state/raw-RGB/normalized-map/production-framebuffer gates. `MOVE_SANDSTORM` reruns twice fresh at **168/168** bilaterally after shared drawing changes; its raw RGB remains unchanged, while its integrated JSON receipts refresh to `a06847b…` player / `29e51b9…` opponent after the merged probe-state shape. Focused animation and boundary tests, smoke **375/375**, typecheck, full `npm test` (**893 files / 8,476 passed / 1 skipped**), production build (**629 modules**), coverage, and diff check pass.
- **Next:** None for this acceptance unit. Keep Heat Wave and Sandstorm independent controls; do not infer coverage for other FLYING_DIRT users.
- **Notes:** No capture lookup, per-age pixel/RGB table, absolute battle tick, canonical recording import, damage/burn/accuracy/RNG, turn/controller/round/facility state, animation boundary, unsupported barrier, or sibling coverage claim changed.

# Animation supervisor wind-down — six exact promotions plus Heat Wave evidence (2026-08-10)

- **State:** This session advances Level-50 coverage **154→160/276 exact**, 0 partial, 0 staged, and **122→116 unsupported**. `MOVE_SPITE`, `MOVE_NIGHT_SHADE`, `MOVE_PIN_MISSILE`, `MOVE_HI_JUMP_KICK`, `MOVE_LEAF_BLADE`, and `MOVE_FLAME_WHEEL` are newly exact. `MOVE_HEAT_WAVE` remains unsupported with a complete bilateral evidence checkpoint.
- **Did:** Merged the starting `master` once, then independently reviewed, verified, and folded each animation-only worker chain. The final audit caught Flame Wheel's additive `spriteOrder` probe field invalidating its v1 receipt before merge; the corrective worker explicitly versioned both evidence contracts to v2, regenerated stable JSON receipts while preserving raw-RGB/change-map hashes, and made the portable itself require two fresh probes per orientation. The last bounded step pinned Heat Wave's complete source/carrier graph and banked its move-owned 168-frame Scene-ON evidence without adding a reducer, seam, compositor, or coverage claim.
- **Verified:** Flame Wheel passes **170/170** source/component/seam/hardware/raw-RGB/production-framebuffer frames twice fresh in both orientations; its BLAZE_KICK, DRAGON_RAGE, SUPER_FANG, and SUPERSONIC controls remain exact bilaterally. Heat Wave independently reproduces **168/168** dense evidence frames twice fresh in both orientations. Final integrated `npm test` is green at **886 files / 8,428 passed / 1 skipped**; `npm run build` transforms **628 modules**; coverage is **160/276 exact**. All animation worker branches/worktrees are removed and the branch is clean apart from this ledger handoff.
- **Next:** Implement Heat Wave's pure source-relative 168-age reducer, narrow typed Scene-ON seam, and Ninetales/Onix compositor from its committed bilateral rows; require complete twice-fresh **168/168 reducer/seam/hardware/raw-RGB/production-framebuffer** equality and rerun exact SANDSTORM bilaterally before promoting only Heat Wave.
- **Notes:** No damage/status outcome, RNG, turn order, controller, round/facility state, main-program ledger, canonical import allowlist, animation boundary, unsupported-branch barrier, or absolute-tick framebuffer branch changed.

# MOVE_HEAT_WAVE bilateral dense evidence checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **160/276 exact**, 0 partial, 0 staged, **116 unsupported**. `MOVE_HEAT_WAVE` is not promoted; no reducer, typed seam, production compositor, framebuffer claim, animation boundary, unsupported barrier, or gameplay/controller state changed.
- **Did:** Pinned `Move_HEAT_WAVE` **0x082cdbc6..0x082cdc76** (0xb0 bytes), its complete red BlendParticle/BlendBackground + mirrored sandstorm BG + pan sweep + target-motion + seven-crescent graph, and sole/lowest Level-50 carrier set **526 `FRONTIER_MON_NINETALES_2`** (first legal challenge 4 range 468..563). Added complete legal three-Pokémon Scene-ON parties in both orientations and a pointer-bounded probe/portable covering all live tasks/sprites, software+hardware OAM/matrices, palettes/tags/registers/audio, immutable battle state, raw RGB, normalized change maps, and first inactive cleanup.
- **Verified:** Twice fresh, player-back frames **78..245** and opponent-front **82..249** each reproduce **168/168 dense evidence frames**. Evidence/raw/map digests are player `0a9e7a22…` / `a22b496d…` / `29c4abde…`, opponent `71fc59d1…` / `5050e7a3…` / `840d4f8b…`. Focused source/evidence/boundary tests **6/6**, smoke **375/375**, typecheck, full `npm test` (**886 files / 8,428 passed / 1 skipped**), production build, coverage, and diff check pass.
- **Next:** Implement a pure source-relative 168-age Heat Wave reducer and narrow typed Scene-ON seam from these move-owned rows; then add the Ninetales/Onix compositor for red particle/background palettes, mirrored scrolling BG, target displacement, all seven crescents, transfer latches, and cleanup. Require twice-fresh bilateral **168/168 reducer/seam/hardware/raw-RGB/production-framebuffer** acceptance and rerun exact SANDSTORM bilaterally before promoting only Heat Wave.
- **Notes:** Sandstorm supplies no Heat Wave acceptance; it remains only a later shared-component control. No damage/burn/accuracy/RNG, turn order, controller, round/facility state, capture lookup, absolute-tick branch, canonical import, boundary list, or unsupported barrier changed.

# MOVE_FLAME_WHEEL exact — bilateral 170/170 source-relative promotion (2026-08-10 worker)

- **State:** Coverage advances **159→160/276 exact**, 0 partial, 0 staged, **117→116 unsupported**. `MOVE_FLAME_WHEEL` alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Added the pure 170-age reducer, narrow typed Scene-ON seam, and Quilava/Onix production compositor. The port covers all seven staggered fixed-point outward spirals, source-persistent sprite allocation/OAM ordering, attacker slide out/return, target ShakeMon and red BlendMonInAndOut, seven FireSpread sprites, monbg/split-BG priority, SMALL_EMBER tag, audio/register/palette lifecycles, prior-transfer display latches, and cleanup without gameplay state ownership or recorded-frame lookup.
- **Verified:** Twice fresh, player-back oracle frames **78..247** and opponent-front **82..251** each pass **170/170 reducer/seam/component, task/sprite/software+hardware OAM/matrices, palettes/tags/registers/audio/immutable-state/raw-RGB, and production framebuffer**. After shared draw/order changes, bilateral controls pass twice fresh: BLAZE_KICK **78/78**, DRAGON_RAGE **150/150**, SUPER_FANG **200/200**, SUPERSONIC **51/51**. Focused Flame Wheel/evidence/boundary tests, smoke, typecheck, full `npm test` (**885 files / 8425 passed / 1 skipped**), production build, coverage, and diff check pass.
- **Next:** Supervisor selects the next independent move acceptance unit; do not transfer Flame Wheel acceptance to fire or split-BG siblings without their own complete dense proof.
- **Notes:** No damage, burn, RNG, turn order, controller, round/facility state, absolute tick, per-age pixel/RGB table, capture lookup, unsupported-branch barrier, canonical import allowlist, or boundary list changed.

# MOVE_FLAME_WHEEL bilateral dense evidence checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **159/276 exact**, 0 partial, 0 staged, **117 unsupported**. `MOVE_FLAME_WHEEL` is not promoted; `ANIMATION_COVERAGE.json`, the animation boundary, unsupported barrier, gameplay/controller state, and shared component implementations are unchanged.
- **Did:** Pinned source interval **`Move_FLAME_WHEEL` 0x082c9a66..`Move_PIN_MISSILE` 0x082c9b60**, its complete script/component graph, and real Level-50 set-181 `FRONTIER_MON_QUILAVA_1` carrier. Added complete legal three-Pokemon Scene-ON parties in both orientations plus a pointer-bounded dense probe/portable covering all live tasks/sprites, software+hardware OAM/matrices, palettes/tags/registers/audio, immutable battle state, raw RGB, and normalized change maps through first inactive cleanup.
- **Verified:** Twice fresh, player-back **78..247** and opponent-front **82..251** are each byte-stable **170/170 source/hardware/raw-RGB evidence frames**. Evidence/raw/map digests are player `c3bcc206…` / `09da9b0d…` / `03f52387…`, opponent `3af5d76c…` / `ca7f0d7a…` / `e5fd577c…`. The observed graph includes seven outward spirals, both slide templates, seven FireSpread sprites, `AnimTask_ShakeMon`, `AnimTask_BlendMonInAndOut`, split-BG setup, audio, and cleanup. Exact shared controls remain bilateral: BLAZE_KICK **78/78**, DRAGON_RAGE **150/150**, SUPER_FANG **200/200**, and SUPERSONIC **51/51**, component plus framebuffer.
- **Next:** Implement a pure 170-age FLAME_WHEEL reducer from its own rows: measure creation/display latches for the seven staggered spirals, attacker slide-out/return, target ShakeMon and palette ramp, FireSpread ordering, split-BG priority, audio, and cleanup; add the narrow typed seam and Quilava/ONIX compositor; then require every bilateral source/component/seam/hardware/raw-RGB/production-framebuffer frame exact twice fresh before promoting only FLAME_WHEEL.
- **Notes:** No capture/frame/RGB lookup, per-age pixel table, absolute battle tick, damage/burn/RNG/turn order, controller/facility state, boundary widening, unsupported barrier, or sibling coverage changed.

# MOVE_LEAF_BLADE exact — bilateral 224/224 seven-arc promotion (2026-08-10 worker)

- **State:** Coverage advances **158→159/276 exact**, 0 partial, 0 staged, **118→117 unsupported**. `MOVE_LEAF_BLADE` alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Reconciled the apparent oracle drift to the additive empty `preCheckpointCaptures` transport field while preserving the original semantic receipt audit, then completed the pure seven-arc `AnimTask_LeafBlade` reducer, typed Scene-ON seam, hardened v2 probe/portable, normalized change maps, and narrow legal set-453 SCEPTILE/ONIX production compositor. The port covers all 77 trail spawns, primary blade, source stable priority/Y OAM ordering and slot reuse, three short plus one monbg ShakeMon2 schedules, LEAF/CROSS_IMPACT, 12:8 blend, audio, target monbg, and cleanup without capture/frame/RGB lookup or gameplay/controller changes.
- **Verified:** Twice fresh per orientation, player-back **76..299** and opponent-front **80..303** each pass **224/224 reducer/component/seam, live battlers, software+hardware OAM/matrices, palettes/tags/registers/audio/immutable-state/raw-RGB/normalized-map, and production framebuffer**. Evidence/raw/map are player `5dcb5555…` / `6ba2d80f…` / `ec5984b0…`; opponent `c2a599b0…` / `b85563f6…` / `8a776614…`. Independent `MOVE_CROSS_CHOP` remains twice-fresh bilateral **88/88 component + framebuffer** exact with its committed receipts. Focused tests, smoke, typecheck, full `npm test` (**883 files / 8420 passed / 1 skipped**), foreground build, final coverage, and diff check pass.
- **Next:** Supervisor selects the next independent animation acceptance unit. Do not generalize Leaf Blade's split child/OAM, short-shake, monbg-scroll, or stable-sort latches without move-owned evidence.
- **Notes:** Source confirms **seven** arcs at cases 0/2/4/6/8/10/12. No damage, RNG, turn order, controller, facility state, canonical production recording, boundary widening, unsupported barrier, or sibling promotion changed.

# MOVE_LEAF_BLADE receipt-drift diagnosis — transport schema only (2026-08-10 worker)

- **State:** Coverage remains **158/276 exact**, 0 partial, 0 staged, **118 unsupported**. The Leaf Blade compositor/framebuffer proof is still open; no move, boundary, barrier, or gameplay state changed.
- **Did:** Root-caused the apparent Leaf Blade and exact CROSS_CHOP receipt drift to the oracle's 2026-07-30 additive `preCheckpointCaptures: []` member in `BattleLab.prepare()` (harness commit `8251953`). The four move probes now assert that the field is empty and omit this transport-only value from their original semantic receipt schema; no committed hash was rewritten.
- **Verified:** Current ROM/ELF/map are `a9dec84d…` / `cd28ec67…` / `27c5f864…`; oracle profile is Scene-ON bootstrap v5. Deleting only that empty setup field from untouched fresh outputs reproduces all four old evidence hashes byte-for-byte. Twice-fresh Leaf Blade raw RGB remains exactly the committed player `6ba2d80f…` and opponent `b85563f6…` (the prior checkpoint's `37610724…` / `cfc0fabf…` were a different aggregation, not the portable raw-RGB receipt). Leaf Blade receipts return to committed `e3fea9bd…` / `ae787ec4…`; exact CROSS_CHOP returns to bilateral **88/88 source/component/framebuffer** with committed evidence/raw hashes twice fresh.
- **Next:** Add Leaf Blade's move-owned OAM/transfer checks and compositor, measure its own display latches, and require bilateral twice-fresh **224/224 source/component/seam/hardware/state/raw-RGB/production-framebuffer** before promotion.

# MOVE_LEAF_BLADE source reducer + typed seam checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **158/276 exact**, 0 partial, 0 staged, **118 unsupported**. `MOVE_LEAF_BLADE` is not promoted; `ANIMATION_COVERAGE.json`, the animation boundary, unsupported barrier, gameplay/controller state, and shared CROSS_IMPACT compositor are unchanged.
- **Did:** Added a pure source-relative `AnimTask_LeafBlade` reducer and narrow typed Scene-ON seam. The port derives all source states `0..13/0xFF`, the source's **seven** horizontal-arc calls (the step brief said six, but the pinned C body has cases 0/2/4/6/8/10/12), Q8.8 truncated endpoints, five-counter inter-arc pauses, animation/subpriority changes, 77 source child spawns, alternating initial blink phases, child-count cleanup, all four move-owned ShakeMon2 tasks, CROSS_IMPACT duration, monbg/alpha, audio, tags, and first inactive age without fixture/capture/frame/RGB lookups or per-age pixel exceptions. Strengthened the source audit to pin those bodies and animation cells.
- **Verified:** The original strict portable was rerun first and failed before code edits: its committed player receipt `e3fea9bd… / 6ba2d80f…` no longer matches the current shared Scene-ON ROM/emulator. Independent direct reruns then proved twice-fresh stable current receipts in both orientations without changing the committed pins: player frames **76..299**, evidence `f95e410f…`, raw `37610724…`; opponent frames **80..303**, evidence `05d83ea9…`, raw `cfc0fabf…`. Source-window-only normalized change maps are also twice identical (`119a723a…` / `1c46f5a5…`). The reducer/seam independently matches **224/224 + 224/224** current software task state/child count, every logical blade/trail callback/animation/position/subpriority/blink datum, script offsets, ShakeMon2 offsets, CROSS_IMPACT state, and cleanup. Focused **6/6** and typecheck pass.
- **Next:** First reconcile the current shared-oracle receipt drift without weakening/replacing the committed evidence merely to fit code; the exact `MOVE_CROSS_CHOP` control currently fails the same immutable-receipt gate (player current `24141cf7… / 3a4541e7…` vs committed `7be7a5bb… / 9d38ec15…`). Then add move-owned OAM-slot/order and software→hardware transfer checks, measure Leaf Blade/trail/ShakeMon2/cross-impact display latches from the stable maps, implement the narrow Sceptile/Leaf compositor, and require 224/224 bilateral production framebuffer plus exact CROSS_CHOP before promoting only Leaf Blade.

# MOVE_HI_JUMP_KICK exact — bilateral 91/91 source-foot promotion (2026-08-10 worker)

- **State:** Coverage advances **157→158/276 exact**, 0 partial, 0 staged, **119→118 unsupported**. `MOVE_HI_JUMP_KICK` alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Corrected the legal carrier to set/index 373 `FRONTIER_MON_MEDICHAM_1` (species 357), added complete legal three-mon Scene-ON parties in both orientations, and added a pointer-bounded dense probe through first inactive cleanup. The pure reducer/seam/compositor independently ports `gJumpKickSpriteTemplate`/`AnimJumpKick`, source-relative slides/travel, animation-1 hitsplat, target `ShakeMonInPlace(3,0,11,1)`, HANDS_AND_FEET/IMPACT, monbg/alpha, target-panned audio, Medicham/ONIX art, and cleanup.
- **Verified:** The strict portable regenerates both fixtures twice fresh: player-back **79..169** and opponent-front **83..173**, each **91/91** source/reducer/seam, software+hardware OAM/matrices, palettes/tags/registers/audio/state/raw-RGB, committed change map, and production framebuffer. Evidence/raw/map digests are player `6089e28d…` / `5fcea580…` / `6d8be6f9…`; opponent `252a8f6d…` / `29af27b0…` / `afab1870…`. HJK's own maps resolve this invocation's `ShakeMonInPlace` display at RAM+1 in both orientations; the older DOUBLE_EDGE conflict remains explicitly open.
- **Next:** Supervisor selects the next independent animation acceptance unit. Do not generalize HJK's `ShakeMonInPlace(3,0,11,1)` latch, Medicham geometry, or its frame-stage timing to another move without its own dense evidence.
- **Notes:** No damage, accuracy, recoil, RNG, turn order, controller/facility state, canonical recording, boundary, unsupported barrier, or sibling promotion changed.

# MOVE_PIN_MISSILE exact — bilateral 93/93 source-arc promotion (2026-08-10 worker)

- **State:** Coverage advances **156→157/276 exact**, 0 partial, 0 staged, **120→119 unsupported**. `MOVE_PIN_MISSILE` alone moves; no boundary, unsupported-barrier, gameplay, controller, or shared-state change.
- **Did:** Added a pure source-relative reducer, narrow typed Scene-ON seam, and production compositor for the already-banked legal set-211 QWILFISH/ONIX evidence. The port transcribes the ROM's Q8.8 double-advance horizontal arc, integer BIOS `ArcTan2`, affine matrix behavior, side-relative target-X inversion, initial invisible callback, three missile/impact allocations, Pin-specific ShakeMon2 schedule, monbg/split priority, alpha/register/audio schedule, and cleanup using the existing NEEDLE/IMPACT art.
- **Verified:** `pinMissilePortable.ts` freshly regenerates both committed fixtures twice and passes **93/93 source/reducer, typed seam, tasks/sprites, software+hardware OAM/matrices/palettes/tags/registers/audio/immutable-state/raw-RGB, and production framebuffer** per run. Player-back **86..178** retains probe/raw/map `e42138dc…` / `d5611174…` / `627ffeb1…`; opponent-front **90..182** retains `715d16f6…` / `888244d8…` / `d6ffb0e1…`. Pin's own maps prove live arc display at reducer age−1, one terminal affine teardown display at age−2, and its three short ShakeMon2 bursts at RAM+1. LICK remains bilateral **73/73**; SPIKE_CANNON remains bilateral **84/84 twice fresh** for source/component, committed raw RGB, and framebuffer (its older aggregate JSON receipt hashes alone are stale and were not changed). Focused tests, smoke **375/375**, typecheck, full `npm test` **880 files / 8,406 passed / 1 skipped**, build, coverage, and diff check pass.
- **Next:** Supervisor selects the next independent acceptance unit. Do not infer Pin Missile's double-advance arc, terminal affine display, or short ShakeMon2 latch for another move without its own evidence.

# Animation coverage

## MOVE_NIGHT_SHADE exact — bilateral 228/228 clone/ghost promotion (2026-08-10 worker)

- **State:** Coverage advances **155→156/276 exact**, 0 partial, 0 staged, **121→120 unsupported**. `MOVE_NIGHT_SHADE` alone moves; no boundary or unsupported-branch pin changes.
- **Did:** Added complete legal set-160 ARIADOS versus set-156 ONIX Scene-ON parties, pointer-bounded bilateral probes, raw-RGB receipts/change maps, a pure source-relative reducer, typed seam, and narrow compositor. The port reuses the exact ghost BG while independently covering Night Shade's PSYBEAM/LEER audio, monbg/split priority, 85-tick live-attacker clone, queued alpha, target ShakeMon2/black blend cycle, restore, and cleanup.
- **Verified:** Twice fresh, player-back **217..444** and opponent-front **218..445** each pass **228/228 reducer/seam, task/software-sprite, hardware OAM/matrix/palette/tag/register/audio/state/raw-RGB, and production framebuffer**. Probe/raw/map digests are player `6e829d73…` / `d49490af…` / `0bf3f916…`, opponent `de630b2a…` / `e7832cfd…` / `8af77a2a…`. Spite and Lick controls remain exact. Focused tests, smoke, typecheck, the full suite (**878 files / 8,400 passed / 1 skipped**), build, coverage, and diff check are green.
- **Next:** Supervisor selects the next independent move. Do not infer this task's split initial-versus-Step2 affine latch or audio/register schedule for another live-battler task.

## MOVE_SPITE exact — bilateral queued-BLDALPHA 221/221 promotion (2026-08-10 worker)

- **State:** Coverage advances **154→155/276 exact**, 0 partial, 0 staged, **122→121 unsupported**. `MOVE_SPITE` alone moves; shared ghost-background sibling `MOVE_NIGHT_SHADE` remains unsupported.
- **Did:** Replaced the paired-age alpha approximation with a source-relative scanout model using the existing buffered GPU-register queue and audio-workload scheduler. A narrow bilateral register probe pins the distinct pointer-zero audio anchors and proves Spite's task writes remain queued after VBlank; the typed seam now publishes the hardware-displayed alpha word to the compositor. Receipt, raw-RGB, and change-map digests are unchanged.
- **Verified:** Without checkpoint mode, twice fresh, player-back **1000..1220** and opponent-front **1004..1224** each pass **221/221 reducer, seam, register/hardware/audio, and production framebuffer**. Checkpoint mode reports the same exact totals. Focused queue/Spite/inventory/boundary tests and typecheck pass; BATON_PASS **53/53**, HAZE **202/202 twice fresh**, and ACID_ARMOR **119/119 twice fresh** remain exact bilaterally. Full `npm test` is green at **876 files / 8,396 passed / 1 skipped**, and the production build passes.
- **Next:** Supervisor selects the next independent move. Do not infer Night Shade acceptance or Spite's audio anchor from the shared ghost background.

## MOVE_SPITE bilateral live-compositor checkpoint — 193/221 each, coverage unchanged (2026-08-10 worker)

- **State:** Coverage remains **154/276 exact**, 0 partial, 0 staged, 122 unsupported. `MOVE_SPITE` and its shared ghost-background sibling `MOVE_NIGHT_SHADE` both remain unsupported; `ANIMATION_COVERAGE.json` is intentionally unchanged.
- **Did:** Corrected the pointer/task alignment from Spite's own receipt (pointer age 43 is reducer age 1 after two synchronous Step1 calls), fixed retained alternating `BLDALPHA` task state, and added a narrow typed-seam compositor for the real ghost BG, bilateral HAUNTER/ONIX art, fade/restore, attacker palette cycle, affine target clone, copied-BG tint, source-phase scanline wave, target hide/reappearance, chrome, and cleanup. Added compact fixtures and a portable that regenerates and checks the complete reducer/seam/task/sprite/OAM/matrix/palette/tag/scanline/register/audio/state/RGB/framebuffer window twice fresh.
- **Verified:** Both player-back **1000..1220** and opponent-front **1004..1224** reproduce their committed probe/raw/map digests twice fresh. Reducer, typed seam, hardware evidence, and immutable state pass **221/221** in each orientation; production framebuffer equality is **193/221** in each. The same 28 pointer ages (`51,53,57,59,63,65,69,73,75,79,85,89,95,105,119,129,135,139,145,149,151,155,159,161,165,167,171,173`) differ only on target pixels during the alternating alpha pulse.
- **Next:** Resolve the remaining per-scanout `BLDALPHA` transition from the GPU register queue/audio workload rather than selecting a whole-frame coefficient. Exact mode intentionally fails until both orientations reach **221/221**; rerun BATON_PASS or GROWTH, HAZE, and ACID_ARMOR if that fix changes a shared latch/helper, then promote only Spite.
- **Notes:** Spite independently re-proves the fresh-affine dual-lag class: clone allocation is blank at pointer age 43, first paints at 44, and teardown retains the stale hardware display before clearing. No capture lookup, absolute tick, gameplay outcome, RNG, turn/controller/facility state, shared boundary, unsupported barrier, or sibling coverage changed.

## MOVE_SPITE bilateral dense Scene-ON evidence checkpoint — coverage unchanged (2026-08-10 worker)

- **State:** Coverage remains **154/276 exact**, 0 partial, 0 staged, 122 unsupported; `ANIMATION_COVERAGE.json` is intentionally unchanged. `MOVE_SPITE` is not promoted and `MOVE_NIGHT_SHADE` remains independently unsupported.
- **Did:** Extended both complete legal set-179 HAUNTER orientations with a real first turn in which the target set-156 ONIX uses TACKLE, followed by the normal controller selection of SPITE. Upgraded `spiteProbe.py` to pointer-bound dense source/task/clone, all live logical sprites, software+hardware OAM/matrices, palette buffers/tags, scanline state+both buffers, BG/GPU registers, audio, immutable battlers, and raw RGB through first inactive cleanup. Banked bilateral change maps.
- **Verified:** Twice-fresh byte-stable windows are player-back **1000..1220 (221/221)** and opponent-front **1004..1224 (221/221)**. JSON receipts are identical per orientation; raw RGB concatenates are stable (`8dc2eee7…` player, `7f49cb0c…` opponent). Maps are deterministic and committed as `tools/compare/evidence/spite-changemap-{player,opponent}.txt` (digests `9ca49a5a…` / `1a89deb6…`). The maps directly show the existing palette RAM+1 transfer in both orientations. No new reusable latch is added: clone, scanline, copied-BG enable, alpha, target-hide, and teardown latches remain unproven and are reported honestly.
- **Next:** Use this receipt and its own maps to measure each Spite display edge, then implement the narrow source-relative compositor/seam only if both orientations can pass complete hardware/OAM/palette/register/audio/raw-RGB and production framebuffer equality. Keep Night Shade unsupported unless its own independent evidence closes.
- **Notes:** The 4-frame orientation shift is measured from Spite's own pointer windows, not inherited. No gameplay, damage, RNG, turn order, controller/facility state, shared boundary, unsupported barrier, canonical recording, sibling coverage, or absolute-tick framebuffer branch changed.

## Supervisor wind-down — seven promotions plus Spite resume checkpoint (2026-08-10)

- **State:** This session advanced Level-50 coverage **147→154/276 exact**, 0 partial, 0 staged, and **129→122 unsupported**. `KARATE_CHOP`, `BATON_PASS`, `MAGIC_COAT`, `PROTECT`, `ROLE_PLAY`, `DRILL_PECK`, and `SUBMISSION` are newly exact; Spite remains honestly unsupported.
- **Did:** Independently verified every accepted worker chain, rejected and repaired one false-green Submission handoff, folded current `master`, and removed every worker branch/worktree. The final bounded round added Spite's source-complete reducer/typed seam plus legal bilateral set-179 Haunter stages and a pointer probe without claiming visual acceptance.
- **Next:** Resume Spite by staging a real prior target move so `Cmd_tryspiteppreduce` reaches `Move_SPITE`; then bank bilateral dense change maps, measure clone/scanline/BG latches, and require full component/seam/hardware/raw-RGB/framebuffer equality before promotion.
- **Notes:** Final coverage remains **154/276 exact** with no open animation deferral. **For the main program:** all production changes are presentation-only; no damage/status outcome, accuracy/critical/RNG, turn order, controller, round/facility state, canonical-recording allowlist, shared animation boundary, or unsupported-branch barrier changed.

## MOVE_SPITE source/reducer + legal staging checkpoint — coverage unchanged (2026-08-10 worker)

- **State:** Coverage remains **154/276 exact**, 0 partial, 0 staged; `ANIMATION_COVERAGE.json` is intentionally unchanged. `MOVE_SPITE` is not promoted and `NIGHT_SHADE` remains unsupported.
- **Did:** Added the pure source-age `AnimTask_SpiteTargetShadow` reducer and typed Scene-ON Spite seam in commit `ba89e509`. Added complete legal Level-50 three-mon parties in both orientations using lowest carrier set **179 / HAUNTER (species 93)**, with only the active carrier constrained to SPITE, plus a pointer-bounded Scene-ON staging probe for source/tasks/sprites/OAM/registers/raw RGB.
- **Verified:** Focused reducer/boundary tests **5/5**, typecheck, and both `bin/oracle --profile battle-scene-on lab` staging runs are green. The first Spite action has no prior target `gLastMoves`, so `Cmd_tryspiteppreduce` takes its failure route: `sBattleAnimScriptPtr` stayed out of `Move_SPITE` bounds and the staging receipt contains **0 visual-body frames** in both orientations. No component/seam/framebuffer promotion was claimed.
- **Next:** Stage a real prior target move, then capture and measure a dense pointer-bounded Spite window through first inactive cleanup (including scanline/BG latches and change maps) before considering a compositor or promotion.
- **Notes:** No gameplay, damage, RNG, turn, controller, facility, shared boundary, or absolute-tick rendering changes.

## MOVE_SUBMISSION exact — bilateral 124/124 Scene-ON promotion (2026-08-10 worker)

- **State:** Coverage advances **153→154/276 exact**, 0 partial, 0 staged, **123→122 unsupported**. Only Submission moved.
- **Did:** Added the source-age `Move_SUBMISSION`/`SubmissionHit` reducer, typed relative seam, narrow POLIWRATH/LICKITUNG compositor, legal lowest-carrier set **262** bilateral parties, pointer-bounded probe, exact fixture receipts, and change maps. The port covers all nine affine IMPACT allocations/slot reuse, literal -18/+18 elliptical tasks, monbg, 12:8 alpha, audio receipts, and cleanup.
- **Verified:** `submissionEvidence.ts` passes both **124/124** player-back **79..202** and opponent-front **83..206** windows twice fresh for component, seam, software+hardware OAM/matrix/palette/register/audio/state/raw-RGB, and production framebuffer equality. Stable evidence/raw/map digests are player `73674bbf…` / `de3d3e17…` / `1bc873ce…`, opponent `a6871943…` / `a19a891…` / `88013df2…`. Exact STEEL_WING remains bilateral **197/197**, twice fresh.
- **Next:** Supervisor selects the next independent acceptance unit. Do not promote a sibling from these shared commands/components.
- **Notes:** Submission's own maps split the latches: affine IMPACT and target ellipse display RAM+1, attacker ellipse RAM+2; `Task_UpdateMonBg` overlaps `Task_ClearMonBg` through clear age 104. No gameplay/damage/RNG/turn/controller/facility state, shared boundary, canonical recording, barrier, sibling coverage, or absolute-tick framebuffer branch changed.

## MOVE_DRILL_PECK exact — bilateral 91/91 Scene-ON promotion (2026-08-10 worker)

- **State:** Coverage advances **152→153/276 exact**, 0 partial, 0 staged, **124→123 unsupported**; only Drill Peck moved.
- **Did:** Completed the pure source-relative `drillPeckAtAge` reducer, typed `sceneOnDrillPeckView` seam, and narrow FEAROW/ONIX compositor. The port covers all three Bow phases, eight flashing IMPACT splats with source slot reuse/order, target ShakeMon2, looped HORN_ATTACK, loaded-but-unused WHIRLWIND_LINES, six-tick return slide, side-relative matrices/translation, tags, elevated-Fearow shadow receipt, healthboxes, text, and cleanup.
- **Verified:** `drillPeckEvidence.ts` ran both legal Scene-ON fixtures twice fresh: player-back **74..164** and opponent-front **78..168**, each **91/91** pointer/task/sprite/software+hardware OAM/matrix/palette/register/audio/state/raw-RGB, reducer, typed-seam, and production framebuffer frames. Stable digests remain player `3dfa1176…` / `8e4bab34…` / `2904db85…`, opponent `48356792…` / `ab2adf5f…` / `ada68549…`. Focused tests, smoke, typecheck, coverage, and diff check are green.
- **Next:** Supervisor selects the next independent animation acceptance unit. HEADBUTT remains bilateral exact; WHIRLWIND/SLAM stale control receipt metadata remains untouched because no nonvisual-drift proof was needed for this step.
- **Notes:** No damage/RNG/turn/controller/round/facility state, canonical recording, shared animation boundary, unsupported barrier, sibling coverage, or absolute-tick framebuffer branch changed.

## MOVE_DRILL_PECK bilateral dense Scene-ON evidence checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **152/276 exact**, 0 partial, 0 staged, **124 unsupported**. `ANIMATION_COVERAGE.json` is intentionally unchanged: Drill Peck has no reducer, typed seam, production compositor, or framebuffer acceptance.
- **Did:** Pinned the complete even script interval `0x082cafc8..0x082cb020`, all six generated components, and lowest legal Level-50 carrier set **375 `FRONTIER_MON_FEAROW_1`**. Added complete legal challenge-3 FEAROW/ONIX three-mon parties in both orientations, constraining only the active Fearow slots to Drill Peck; a pointer-bounded Scene-ON probe captures source entry through first inactive cleanup, tasks/logical sprites, software/hardware OAM/matrices/palettes/tags, registers/audio, immutable battlers, raw RGB, and change maps.
- **Verified:** Twice-fresh, byte-stable windows are player-back **74..164** and opponent-front **78..168**, **91/91** each. Probe/raw/map digests: player `3dfa1176…` / `8e4bab34…` / `2904db85…`; opponent `48356792…` / `ab2adf5f…` / `ada68549…`. The verifier independently pins the three Bow phases, eight flashing IMPACT splats, no Whirlwind line sprites despite its loaded tag, six-tick original-position slide, DrillPeckHitSplats/ShakeMon2/loop-audio lifecycles, tags/cleanup, side geometry, receipts, raw RGB, and no outcome mutation within the visual body. HEADBUTT remains bilateral **48/48** twice fresh for all Bow phases. Existing WHIRLWIND and SLAM portables currently stop before frame checks on their pre-existing evidence-digest pins (`55890fc6… != 173be414…`; `58aba5af… != 8f520d75…`), so neither sibling was rebased or promoted. Focused **22/22**, typecheck, smoke, full `npm test`, build, coverage, and diff check are green.
- **Next:** Implement a pure source-relative Drill Peck reducer, narrow typed presentation seam, and compositor; require complete bilateral component + seam + hardware + raw-RGB + framebuffer equality twice fresh before promotion. Resolve the unrelated Whirlwind/SLAM receipt drift and rerun them alongside HEADBUTT after any shared draw-path change.
- **Notes:** No damage, RNG, turn order, controller/round/facility state, canonical recording, shared animation boundary, unsupported barrier, sibling coverage, or absolute-tick/framebuffer fitting changed.

## MOVE_ROLE_PLAY exact — bilateral 147/147 target-silhouette promotion (2026-08-10 worker)

- **State:** Coverage advances **151→152/276 exact**, 0 partial, 0 staged, **125→124 unsupported**. Role Play alone moves; boundary, barrier, and latch pins are unchanged.
- **Did:** Added complete legal set-169 KADABRA/set-156 ONIX bilateral stages, a real-even-pointer-bounded Scene-ON probe for `0x082d4fae..0x082d500a`, 147-frame dense receipts/change maps, pure reducer, typed seam, portable verifier, and production compositor. The port covers monbg, target-white and BG-black ramps, TRI_ATTACK plus delayed DETECT audio, the target-species additional-mon resource/OAM/alpha/affine lifecycle, blend teardown, and cleanup. The portable receipt now directly verifies the additional ONIX's software OAM entry and scanout transfer/teardown, fresh matrix lag, and both resource tags.
- **Verified:** Twice fresh, player-back frames **70..216** and opponent-front **74..220** each pass **147/147 component + typed-seam + OAM/hardware + raw-RGB + framebuffer**. Player probe/raw/map: `612259ab…` / `58bdc5f4…` / `2e0cb80c…`; opponent: `5f34b6e4…` / `137ab8f7…` / `f5b413ac…`. MEGA_PUNCH remains bilateral **160/160** twice fresh.
- **Next:** Supervisor selects the next independent move; do not promote REFRESH or another sibling from shared commands.
- **Notes:** The additional ONIX is back art at player x−20 and front art at opponent x+20; its affine matrix follows the established fresh-allocation two-display lag, so `ANIMATION_LATCHES.md` stays unchanged. No ability outcome, damage/status/RNG, controller/facility state, boundary/barrier, sibling, or absolute-tick branch changed.

## MOVE_ROLE_PLAY source + bilateral legal-staging checkpoint — remains unsupported (2026-08-10 worker)

- **State:** Coverage remains **151/276 exact**, 0 partial, 0 staged, **125 unsupported**. Role Play has no reducer, typed seam, compositor, dense hardware/raw-RGB evidence, or promotion.
- **Did:** Pinned the exact even ROM interval `0x082d4fae..0x082d500a` (0x5c bytes), all 13 commands, the five-component generated graph, shared exact MEGA_PUNCH intersection, `AnimTask_RolePlaySilhouette` and additional-mon source lifecycles, success-route boundary, and sole/lowest Level-50 carrier set 169 KADABRA. Added complete legal bilateral set-169 KADABRA/set-156 ONIX Scene-ON parties; only active KADABRA is constrained to ROLE_PLAY and both benches plus ONIX's legal moves remain intact.
- **Verified:** Both orientations run twice fresh with byte-stable endpoint hashes. KADABRA starts Synchronize (28) and finishes Rock Head (69), proving legal successful staging without giving presentation ownership of ability-copy semantics. The receipt pins source-derived target personality/OT identity, back/front art choice, and ±20 offset hypotheses but explicitly records that endpoint staging is not dense acceptance. Focused source/staging + animation-boundary tests pass.
- **Next:** Build a pointer-bounded dense probe from first in-bounds script frame through first inactive cleanup; capture script/tasks, additional-mon software/hardware OAM/matrix/palette/resource lifetime, monbg, both palette tasks, registers/audio, immutable state, raw RGB, and change maps twice fresh per orientation. Then implement the pure reducer, typed seam, and compositor; rerun MEGA_PUNCH and, if an affine/additional-mon helper changes, MINIMIZE or BATON_PASS. Promote only after complete bilateral equality.
- **Notes:** `ANIMATION_LATCHES.md` is unchanged: endpoint staging cannot establish the additional-mon sprite's display latch. No engine, boundary, gameplay/controller/facility state, canonical recording, unsupported barrier, REFRESH, sibling coverage, or absolute-tick branch changed.

## MOVE_PROTECT exact — bilateral 123/123 sliding OBJ-blend shield promotion (2026-08-10 worker)

- **State:** Coverage advances **150→151/276 exact**, 0 partial, 0 staged, **126→125 unsupported**. Protect alone moves; boundary, unsupported-barrier, and latch pins are unchanged.
- **Did:** Added complete legal set-119 HOUNDOUR/set-156 ONIX bilateral stages, a real-even-pointer-bounded Scene-ON probe, receipts/change maps, deterministic Houndour/PROTECT extraction, source audit, pure 123-age reducer, typed seam, portable verifier, and narrow compositor. The proof covers side priority, leftward Q8.8 drift, seven-color rotation, alpha lifecycle, attacker monbg/split/clear, audio, hardware transfers, and cleanup.
- **Verified:** Twice fresh, player-back frames **68..190** and opponent-front **72..194** each pass **123/123 component+seam+hardware+raw-RGB+framebuffer**. Player probe/raw/map: `e2769d16…` / `a1d64592…` / `7bea1a4b…`; opponent: `cc2bc15a…` / `e4837821…` / `dcf82d6b…`. BARRIER stays bilateral **76/76** twice fresh as the isolated 64x64 OBJ-blend/palette/register/monbg control.
- **Next:** Supervisor selects the next independent move; do not promote Detect or another sibling from shared components.
- **Notes:** The ROM body is the even interval `0x082cb3b4..0x082cb3d1`; `nm` exposes odd `Move_PROTECT` `0x082cb3b5`. No Protect outcome, damage/status/RNG, turn/controller/round/facility state, canonical import, boundary widening, barrier, or absolute-tick branch changed.

## MOVE_MAGIC_COAT exact — bilateral 76/76 orange defensive-wall promotion (2026-08-10 worker)

- **State:** Coverage advances **149→150/276 exact**, 0 partial, 0 staged, **127→126 unsupported**. Magic Coat alone moves; boundary, unsupported-barrier, and latch pins are unchanged.
- **Did:** Added complete legal set-121 SPOINK/ONIX bilateral stages that preserve ONIX's real moves, a pointer-bounded dense Scene-ON probe, receipts/change maps, deterministic Spoink/orange-wall extraction, a pure parameterized defensive-wall reducer, typed seam, and narrow compositor. Magic Coat independently pins its orange tag/palette, 40px offset, BARRIER wait audio, no-sparkle body, BG-copy/hide/reset, alpha/palette rotation, hardware transfer, and cleanup.
- **Verified:** Twice fresh, player-back frames **69..144** and opponent-front **73..148** each pass **76/76 component+seam+hardware+raw-RGB+framebuffer**. Player probe/raw/map: `c71bd1e2…` / `6b173491…` / `a2f6f128…`; opponent: `340502f8…` / `378e362c…` / `dd3063a3…`. BARRIER stays bilateral **76/76** twice fresh. Mandatory MIRROR_COAT stays bilateral **75/75** twice fresh with unchanged raw RGB; its full-probe receipt was refreshed to current stable metadata.
- **Next:** Supervisor selects the next independent move; do not promote Protect or another defensive-wall sibling from shared code.
- **Notes:** The ROM-inclusive body is `0x082d6c5c..0x082d6c79`; `nm` exposes the odd data symbol `0x082d6c5d` and exclusive `Move_WATER_PULSE` at `0x082d6c7a`. No new latch was observed. No gameplay flag/bounce target, damage/status/RNG, turn/controller/round/facility state, canonical import, boundary widening, barrier, or absolute-tick branch changed.

## MOVE_BATON_PASS exact — bilateral 53/53 Poké Ball/blend promotion (2026-08-09 worker)

- **State:** Coverage advances **148→149/276 exact**, 0 partial, 0 staged, **128→127 unsupported**. Baton Pass alone moves; boundary and unsupported-barrier pins are unchanged.
- **Did:** Added complete legal set-142 AIPOM/ONIX bilateral stages, a pointer-bounded Scene-ON probe, immutable receipts/change maps, pure 53-age reducer, typed seam, deterministic Poké Ball extraction, and a narrow compositor for `AnimBatonPassPokeball`, live attacker affine/hide/reset, and the already-exact `blend_color_cycle` command.
- **Verified:** Twice fresh, player-back frames **69..121** and opponent-front **73..125** each pass **53/53 source+seam+software/hardware+raw-RGB+framebuffer**. Player evidence/raw/map: `6894725b…` / `9a482453…` / `1b420949…`; opponent: `84a2ebae…` / `e6723a95…` / `8fe18196…`; maps regenerate byte-identically. GROWTH stays bilateral **63/63** twice fresh.
- **Next:** Supervisor selects the next independent acceptance unit. Do not promote a sibling from the shared blend command.
- **Notes:** Baton Pass directly confirms plain Poké Ball OAM and palette transfer at RAM+1 and adds the distinct direct-callback live-battler matrix RAM+1/invisible-OAM-removal latch. No switching/stat transfer, RNG, turn/controller/round/facility state, canonical import, barrier, boundary widening, or absolute-tick branch changed.

## MOVE_KARATE_CHOP exact — bilateral 49/49 HANDS_AND_FEET/IMPACT promotion (2026-08-09 worker)

- **State:** Coverage advances **147→148/276 exact**, 0 partial, 0 staged, **129→128 unsupported**. Karate Chop alone moves; boundary and unsupported-barrier pins are unchanged.
- **Did:** Finished the committed set-232 PRIMEAPE/ONIX reducer + typed seam with a narrow source-age compositor and portable proof. The move independently ports HANDS_AND_FEET animation 3, animation-2 affine IMPACT, target `AnimTask_ShakeMon`, monbg/12:8 alpha, audio, hardware transfer, and cleanup while reusing source-identical established art.
- **Verified:** Twice fresh, player-back frames **77..125** and opponent-front **81..129** each pass **49/49 component/hardware/raw-RGB/framebuffer**; evidence/raw/map digests remain `757e70d9…`/`89c829e0…`/`4d1eb29b…` and `fb8697fb…`/`f7762e1e…`/`10e22bae…`. Regenerated maps are byte-identical. LOW_KICK stays bilateral **33/33** and MEGA_PUNCH **160/160**, twice fresh.
- **Next:** Supervisor selects the next independent animation acceptance unit; do not promote Karate Chop siblings from shared HANDS_AND_FEET/IMPACT code.
- **Notes:** Own bilateral maps confirm RAM+1 for hand OAM and ShakeMon displacement; IMPACT independently confirms the dual-lag class (software spawn hidden/neutral, following affine scanout, one stale teardown display, then clear), consistent with `ANIMATION_LATCHES.md`; no latch edit. No gameplay/damage/critical/accuracy/RNG, turn/controller/round/facility state, canonical import, or absolute-tick branch changed.

## MOVE_KARATE_CHOP reducer + typed Scene-ON seam checkpoint — coverage unchanged (2026-08-09 worker)

- **State:** Coverage remains **147/276 exact**, 0 partial, 0 staged, **129 unsupported**. No production framebuffer compositor or exactness claim was added.
- **Did:** Added the pure complete 49-age `Move_KARATE_CHOP` reducer and narrow typed presentation seam. Both committed bilateral fixtures now carry resolved Primeape/Onix geometry and compact source-contract arrays; Tier-1 pins every age's script offset, asset lifetime, monbg/alpha interval, directional hand translation, animation-2 IMPACT, exact `AnimTask_ShakeMon` tuple/offset, target-panned audio, seam equality, and inactive cleanup.
- **Verified:** Focused Karate Chop/source/boundary/LOW_KICK tests **17/17**, smoke **375/375**, typecheck, full `npm test`, production build, coverage, and diff check pass. LOW_KICK remains twice-fresh bilateral **33/33 semantic + 33/33 framebuffer exact** with unchanged receipts.
- **Next:** Implement the narrow source-relative `battleScene.ts` compositor and require twice-fresh **49/49 framebuffer equality in both orientations** before promotion. Rerun LOW_KICK plus a HANDS_AND_FEET/IMPACT control after that draw-path change.
- **Notes:** No damage, critical/accuracy/RNG, turn order, controller/round/facility state, shared animation boundary, canonical import, unsupported barrier, or coverage entry changed.

## MOVE_KARATE_CHOP bilateral dense evidence checkpoint — coverage unchanged (2026-08-09 worker)

- **State:** Coverage remains **147/276 exact**, 0 partial, 0 staged, **129 unsupported**. No reducer, typed seam, production compositor, framebuffer claim, boundary, gameplay, controller, or facility state changed.
- **Did:** Added complete legal challenge-1 set-232 `FRONTIER_MON_PRIMEAPE_1` versus ONIX parties in both orientations, constraining only the active Primeape's four staged move slots. Extended the Scene-ON dense probe with `arm-none-eabi-nm -a` bounds `Move_KARATE_CHOP` **0x082d20b3..0x082d2105**, capture from entry through first inactive cleanup, script offsets, full software/hardware OAM and matrices/palettes/registers, HANDS_AND_FEET/animation-2 IMPACT sprite metadata/data, exact `AnimTask_ShakeMon` tuples, both audio events, battlers, and immutable fields.
- **Verified:** Twice-fresh player-back **77..125 = 49 frames** and opponent-front **81..129 = 49 frames** are byte-identical. Player evidence/raw/map: `757e70d9…` / `89c829e0…` / `4d1eb29b…`; opponent: `fb8697fb…` / `f7762e1e…` / `10e22bae…`. Fresh change maps reproduce byte-for-byte. LOW_KICK remains bilateral **33/33 component + framebuffer exact** twice fresh with unchanged receipts after the shared probe extension. Focused source/evidence/boundary tests are **8/8**.
- **Next:** Implement the pure 49-age reducer and narrow typed Scene-ON seam, validate every age against the committed source contract, then add the production compositor and require twice-fresh **49/49 bilateral framebuffer equality**. Rerun LOW_KICK bilateral and a HANDS_AND_FEET/IMPACT control before promotion; until then Karate Chop remains honestly unsupported.
- **Notes:** Player visible events begin at frame 88; opponent at 92. `AnimTask_ShakeMon` software state spans player frames 99..108 with exact tuples and the raw maps separately expose the display schedule. No damage, critical/accuracy/RNG, turn order, round/facility state, shared animation boundary, canonical import, unsupported barrier, or coverage entry changed.

## Supervisor wind-down — seven Level-50 promotions and two bounded checkpoints (2026-08-09)

- **State:** This session advanced Level-50 coverage **140→147/276 exact**, 0 partial, 0 staged, and **136→129 unsupported**. `SLEEP_TALK`, `FIRE_SPIN`, `SUPER_FANG`, `DISABLE`, `STOMP`, `ACID_ARMOR`, and `VICE_GRIP` are newly exact.
- **Did:** Verified each worker branch independently, strengthened DISABLE/ACID_ARMOR/VICE_GRIP/POISON_STING evidence where audits found gaps, merged only green commits, and removed every animation worker branch/worktree. The completed set-3 WEEDLE `POISON_STING` implementation stays outside the Level-50 ledger because the authoritative inventory classifies it `outsideFactory`; `KARATE_CHOP` now has a source-complete resume checkpoint without an exactness claim.
- **Verified:** Every promoted move passed complete twice-fresh bilateral pointer-bounded component, typed-seam, hardware, raw-RGB, and production-framebuffer acceptance with its named shared controls. The final current-master fold, full suite, production build, coverage report, and clean-tree checks pass.
- **Next:** Resume `KARATE_CHOP` from `tools/compare/karateChopSourceAudit.ts`: add complete set-232 PRIMEAPE/ONIX bilateral stages, dense pointer evidence, reducer/seam/compositor, and LOW_KICK plus HANDS_AND_FEET/IMPACT controls before promotion. Do not reclassify `POISON_STING` into the Level-50 denominator without changing the authoritative inventory contract.
- **Notes:** For the main program: all production changes are presentation-only. No damage, status resolution, accuracy/critical/RNG, turn order, controller, round/facility state, shared animation boundary, canonical-recording allowlist, or unsupported-branch barrier changed. No animation deferral is open.

## MOVE_KARATE_CHOP authoritative source checkpoint — coverage unchanged (2026-08-09 worker)

- **State:** Coverage remains **147/276 exact**, 0 partial, 0 staged, **129 unsupported**. The move has no pre-existing probe, fixture, reducer, seam, or compositor; exact promotion could not truthfully fit the bounded session.
- **Did:** Pinned the `arm-none-eabi-nm -a` script interval `Move_KARATE_CHOP` **0x082d20b3..0x082d2105** (exclusive, 0x52 bytes), the full script/component body, `gKarateChopSpriteTemplate`/`AnimSlideHandOrFootToTarget`/`AnimTravelDiagonally`, animation-2 IMPACT affine body, and exact `AnimTask_ShakeMon` source lifecycle. The generated inventory plus authoritative Factory source prove challenge-appropriate set **232 `FRONTIER_MON_PRIMEAPE_1`** is the sole and lowest Level-50 carrier; set 81 Mankey lies below the Level-50 range.
- **Next:** Stage complete legal Primeape/Onix parties with all four active moves constrained only in party staging; write a pointer-bounded Scene-ON probe and independently measure complete player-back/opponent-front windows through first inactive cleanup. Then implement the pure age reducer, typed seam, narrow compositor, and require twice-fresh component+seam+hardware OAM/matrix/palette/register/audio+raw-RGB+framebuffer equality. Rerun LOW_KICK bilaterally twice fresh plus the closest portable HANDS_AND_FEET/IMPACT control (prefer MEGA_PUNCH) before promotion.
- **Notes:** No coverage, production seam, boundary, gameplay/damage/critical/accuracy/RNG, controller/round/facility state, canonical import, barrier, or absolute-tick branch changed.

## MOVE_POISON_STING set-3 Weedle bilateral exact checkpoint — coverage unchanged (2026-08-09 worker)

- **State:** The Weedle replacement is complete and exact, but coverage remains **147/276 exact**, 0 partial, 0 staged, **129 unsupported**. The generated source inventory classifies POISON_STING as `outsideFactory`, while the assigned promotion requires it to change the Level-50 276-move tier; no out-of-scope inventory/tier change was made.
- **Did:** Replaced the obsolete set-4 Wurmple checkpoint with the true lowest carrier, legal challenge-0 `FRONTIER_MON_WEEDLE` set 3, and independently measured bilateral art, geometry, stats, chrome, timing, latches, and receipts. Strengthened the portable to pin fixture contract, pointer bounds, sprite category/callback/animation/subpriority/OAM painter metadata, exact software-to-hardware OAM/matrix/palette transfer, ShakeMon2, tags/registers/audio, immutability, raw RGB, and cleanup.
- **Verified:** Twice fresh, player-back **244..356** and opponent-front **232..344** each pass **113/113 component+seam+hardware+raw-RGB+framebuffer**. Player evidence/raw/map: `3ed85c2f…` / `13d161ae…` / `2c38ddb3…`; opponent: `890c7d9d…` / `a97b8d7f…` / `379c44a5…`. TWINEEDLE remains bilateral **37/37** and POISON_FANG bilateral **104/104**, twice fresh.
- **Next:** Supervisor resolves the brief/inventory tier mismatch before promotion. If POISON_STING is intentionally reclassified into the Level-50 denominator, add its exact coverage entry and update the inventory ratchet together; otherwise retain this exact implementation as an outside-tier checkpoint.
- **Notes:** No damage, poison/accuracy/RNG, controller, turn/facility state, animation boundary, canonical recording import, unsupported barrier, or absolute-tick branch changed.

## MOVE_VICE_GRIP exact — bilateral 42/42 CUT-pincer promotion (2026-08-09 worker)

- **State:** Coverage advances **146→147/276 exact**, 0 partial, 0 staged, **130→129 unsupported**. VICE_GRIP alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Added complete legal set-249 CRAWDAUNT/ONIX bilateral stages, a Move_VICE_GRIP..Move_GUILLOTINE pointer-bounded Scene-ON probe, raw-RGB receipts/change maps, pure source-relative reducer, typed seam, and narrow compositor. It reuses only AERIAL_ACE's source-identical CUT sheet/palette while independently porting both flipped pincer animations/callbacks, animation-2 IMPACT, target ShakeMon2, monbg/alpha, target-panned audio, hardware latches, painter order, and cleanup; existing generated catalogs pin CRAWDAUNT front/back art.
- **Verified:** Twice fresh, player-back and opponent-front frames **212..253** each pass **42/42 component+seam+hardware+raw-RGB+framebuffer**. Player evidence/raw/map: `9610089d…` / `2b6d3fe4…` / `9241bca1…`; opponent: `f40729e4…` / `247f3004…` / `09282a7d…`. AERIAL_ACE remains bilateral **236/236 + 232/232** twice fresh and TWINEEDLE bilateral **37/37** twice fresh with stable receipts. Focused tests and the animation boundary pass.
- **Next:** Supervisor selects the next independent animation acceptance unit. Do not infer VICE_GRIP's age−1 ShakeMon2 latch or lower-OAM-slot semi-transparent painter order for another move.
- **Notes:** No damage, critical/accuracy, RNG, turn order, controller/facility state, main ledger, boundary, canonical recording, or barrier changed.

## MOVE_ACID_ARMOR exact — bilateral 119/119 scanline-DMA promotion (2026-08-09 worker)

- **State:** Coverage advances **145→146/276 exact**, 0 partial, 0 staged, **131→130 unsupported**. ACID_ARMOR alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Added complete legal set-110 GRIMER/ONIX bilateral stages, a pointer-bounded Scene-ON probe, committed raw-RGB change maps, source audit, pure four-state `AnimTask_AcidArmor` reducer, typed seam, and narrow live compositor. The implementation covers both persistent scanline buffers and source/scanout phase, player BG2 vs opponent BG1 HOFS/VOFS DMA, alpha fade-out/hold/fade-in, monbg palette/OAM transfer, attacker-panned audio, and cleanup while reusing established GRIMER/ONIX art and chrome.
- **Verified:** Twice fresh, player-back **214..332** and opponent-front **226..344** each pass **119/119 component+seam+scanline+hardware+raw-RGB+framebuffer** frames. Player evidence/raw/map: `a94ccd90…` / `e7ddd013…` / `b1763e4f…`; opponent: `67183490…` / `5092275e…` / `486f39c1…`. MINIMIZE stays bilateral **153/153** twice fresh and SLUDGE bilateral **102/102** twice fresh. Focused tests **15/15**, smoke **375/375**, typecheck/build and coverage pass.
- **Next:** Supervisor selects the next independent animation acceptance unit. Do not infer Acid Armor's battler-priority BG choice or scanline-buffer staleness for another move without its own dense evidence.
- **Notes:** No Acid Armor defense stage, accuracy, damage, RNG, turn order, controller/facility state, main ledger, boundary, canonical-recording allowlist, or barrier changed.

## MOVE_STOMP exact — bilateral 67/67 production promotion (2026-08-09 worker)

- **State:** Coverage advances **144→145/276 exact**, 0 partial, 0 staged, **132→131 unsupported**. STOMP alone moves; no animation-boundary or unsupported-barrier change.
- **Did:** Added set-144 LOUDRED/ONIX complete legal bilateral stages, pointer-bounded mGBA probe, immutable raw-RGB receipts/change maps, source audit, pure Stomp reducer, typed Scene-ON seam, and narrow live compositor. It reuses source-identical Howl Loudred art and established HANDS_AND_FEET/IMPACT paths while independently porting `gStompFootSpriteTemplate` / `AnimStompFoot`, animation-1 hitsplat, target `AnimTask_ShakeMon`, monbg, 12:8 alpha, audio, OAM/matrix/palette latches, and cleanup.
- **Verified:** Twice fresh, each orientation is **67/67 component+seam+hardware+raw-RGB+framebuffer** exact for frames **215..281**. Player evidence/raw/map: `09f5e153…` / `20fefcf1…` / `231ee382…`; opponent: `e99ef777…` / `9771a53a…` / `88fc9e26…`. Mandatory HOWL control is bilateral **102/102** twice fresh after a metadata-only full-probe receipt refresh (raw RGB unchanged); MEGA_KICK remains bilateral **160/160** twice fresh. Focused Stomp/source/evidence tests are **7/7**; smoke is **375/375**; typecheck/build pass; final `npm test` is **834 files / 8,239 passed / 1 established skip**; coverage reports **145/276** and `git diff --check` is clean.
- **Next:** Supervisor selects the next independent animation acceptance unit. Do not use Stomp's unique foot callback or its copied-ONIX handoff as evidence for another move.
- **Notes:** The renderer is source-age-relative and never looks up captures, absolute ticks, or gameplay outcomes. No damage/flinch/minimize, RNG, turn order, controller/facility state, main ledger, PAPERCUTS, canonical-recording allowlist, boundary, or barrier changed.

## MOVE_DISABLE exact — bilateral 113/113 sparkle-4-grow-grayscale promotion (2026-08-09 worker)

- **State:** Coverage advances **143→144/276 exact**, 0 partial, 0 staged, **133→132 unsupported**. DISABLE alone moves; animation-boundary and unsupported-barrier pins remain unchanged.
- **Did:** Added source-bounded legal set-114 DROWZEE/ONIX bilateral stages, dense mGBA probe/receipts/change maps, source audit, pure source-relative reducer, typed Scene-ON seam, and narrow compositor. It reuses valid BARRIER Drowzee/ONIX art and the shared sparkle-4 sheet, while independently porting `AnimTask_GrowAndGrayscale`, target monbg/OBJ blend/grayscale, and cleanup.
- **Verified:** Twice fresh, player-back **697..809** and opponent-front **214..326** each pass **113/113 source component, seam, hardware, raw-RGB, and production framebuffer** frames. The final measured OAM tail remains scaled with restored original palette for one display, then neutralizes. BARRIER stays bilateral **76/76** twice fresh; DETECT stays **110/110** player-back and **109/109** opponent-front twice fresh as the required shared controls. Focused tests, smoke, typecheck, and build are green.
- **Next:** Supervisor selects the next independent move acceptance unit. Do not infer Disable's target scanout tail, first-turn staging, or target grayscale blend for another move without its own dense evidence.
- **Notes:** No Disable gameplay effect, selection/accuracy/RNG, turn order, controller/facility state, main ledger, PAPERCUTS, boundary, or canonical-recording allowlist changed.

## MOVE_SUPER_FANG exact — bilateral 200/200 production promotion (2026-08-09 worker)

- **State:** Coverage advances **142→143/276 exact**, 0 partial, 0 staged, **134→133 unsupported**. SUPER_FANG alone moves; animation-boundary and unsupported-barrier pins remain unchanged.
- **Did:** Added pointer-bounded Scene-ON set-302 RATICATE/ONIX probes, bilateral fixtures/change maps, pure source-relative reducer, typed seam, and narrow compositor. It reuses `hyperFang.json` Raticate/front-back and fang art plus shared shakes/lunge, while independently implementing `gSuperFangSpriteTemplate`, BlendMonInAndOut, BG-only complex blend, and measured task display handoffs.
- **Verified:** Twice fresh, player-back **75..274** and opponent-front **79..278** each pass **200/200 source-component and raw-RGB framebuffer** equality through cleanup. HYPER_FANG stays bilateral **107/107** and KNOCK_OFF bilateral **59/59** twice fresh. Focused tests, smoke, typecheck, production build, full `npm test`, and coverage report pass.
- **Next:** Supervisor selects the next independent acceptance unit. Do not infer Super Fang’s unique sprite callback, palette targets, or task latches for another move.

## MOVE_FIRE_SPIN exact — bilateral 104/104 production promotion (2026-08-09 worker)

- **State:** Coverage advances **141→142/276 exact**, 0 partial, 0 staged, **135→134 unsupported**. FIRE_SPIN alone moves; the animation boundary and unsupported-barrier pins remain unchanged.
- **Did:** Added legal set-175 CHARMELEON versus ONIX Scene-ON stages, a pointer-bounded dense probe, bilateral fixtures/portable, and the pure source-relative Fire Spin reducer. The typed seam and narrow compositor reuse the source-identical Dragon Claw ember/vortex component and cover all 18 sprites, `AnimTask_ShakeMon`, source OAM-Y ordering, target-side sound pan, and the measured task-creation display transient.
- **Verified:** Twice fresh, player-back frames **80..183** and opponent-front **84..187** each pass **104/104 component and raw-RGB framebuffer** equality through cleanup. DRAGON_CLAW remains a twice-fresh **137/137** bilateral shared-component control. Focused **9/9**, smoke **375/375**, typecheck, production build, full `npm test`, and final coverage report pass.
- **Next:** Supervisor selects the next independent acceptance unit. Do not infer FIRE_SPIN's target-display latch or emitter ordering for another ember move.

## MOVE_SLEEP_TALK exact — bilateral 186/189 production promotion (2026-08-09 worker)

- **State:** Coverage advances **140→141/276 exact**, 0 partial, 0 staged, **136→135 unsupported**. Sleep Talk alone moves; the animation boundary and unsupported barrier remain unchanged.
- **Did:** Added the narrow source-relative Scene-ON compositor for SEAKING front/back, all nine `gLetterZSpriteTemplate` sprites, source affine/OAM/subpriority/slot order, side-specific `AnimTask_SwayMon`, LETTER_Z art, field chrome, and cleanup. Independently measured Letter-Z at software age−1, SwayMon at task age−2, and the source `gMonBackPicCoords` placement; extended the existing portable with production framebuffer checks.
- **Verified:** Twice fresh, player-back frames **1356..1541 = 186/186** and opponent-front **4570..4758 = 189/189** pass source/hardware/seam/raw-RGB/framebuffer equality. REST remains bilateral **110/110** twice fresh; its metadata receipts refresh to `747ad02e…` / `2004fa6c…` after the shared probe gained Sleep Talk fields, while raw RGB stays byte-identical. Focused **27/27**, smoke **375/375**, typecheck, full `npm test` **828 files / 8,218 passed / 1 skipped**, production build, and final coverage report pass.
- **Next:** Supervisor selects the next independent move. Do not infer Sleep Talk's distinct latches or `gLetterZSpriteTemplate` affine body for REST or another move.

## MOVE_SLEEP_TALK reducer + typed Scene-ON seam checkpoint — remains unsupported (2026-08-09 worker)

- **State:** Coverage remains **140/276 exact**, 0 partial, 0 staged, **136 unsupported**; no compositor, framebuffer claim, boundary, barrier, gameplay, controller, or facility state changed.
- **Did:** Added the source-relative 186/189-age reducer for all nine `gLetterZSpriteTemplate`/`AnimLetterZ` lifecycles, side-specific `AnimTask_SwayMon`, affine/OAM transfer, tags/registers/audio, cleanup, and the narrow typed Scene-ON seam. Added a no-pixel dense comparator covering every receipt age and both orientations.
- **Verified:** Fresh Scene-ON receipts pass player-back **186/186** and opponent-front **189/189** twice, including software sprites/tasks, hardware OAM/matrices, tags/registers/audio, seam state, cleanup, and raw-RGB receipt hashes; focused reducer/evidence/REST tests and typecheck pass.
- **Next:** A later worker may add the narrow production compositor and require complete bilateral framebuffer acceptance before promotion; keep MOVE_REST exact and Sleep Talk unsupported.

## MOVE_SLEEP_TALK bilateral evidence checkpoint — remains unsupported (2026-08-09 worker)

- **State:** Coverage remains **140/276 exact**, 0 partial, 0 staged, **136 unsupported**. SLEEP_TALK is not promoted; no production compositor, typed seam, animation boundary, gameplay, controller, or facility state changed.
- **Did:** Audited the complete set-333 SEAKING body, `gLetterZSpriteTemplate` OAM/animation/affine table, `AnimLetterZ` through side-dependent offscreen destruction, and shared `AnimTask_SwayMon`. Added complete legal Scene-ON parties that stage sleep through real REST, a pointer-bounded dense probe, twice-fresh bilateral receipts, and deterministic raw-RGB change maps.
- **Verified:** Player-back frames **1356..1541 = 186 frames**, evidence `4badf2d5…`, raw RGB `24c97994…`, map `922a9996…`; opponent-front frames **4570..4758 = 189 frames**, evidence `df68a90c…`, raw RGB `5e603acf…`, map `478ac35a…`. Each has nine independently latched Letter-Z lifecycles, all task/software-sprite/hardware OAM+matrix/palette/register/audio/raw-RGB fields, and first inactive cleanup; two fresh runs per orientation are byte-identical. Focused source/evidence/REST control/boundary/inventory tests are **17/17**, smoke **375/375**, and typecheck pass.
- **Next:** Build the pure 186/189-age source-relative reducer and typed Scene-ON seam, then implement the narrow SEAKING/Letter-Z/SwayMon compositor. Require twice-fresh **186/186 + 189/189 reducer/seam/hardware/framebuffer equality** and rerun REST 110/110 bilaterally before promotion.

## MOVE_HAZE exact — bilateral pointer-bounded 202/202 promotion (2026-08-09 worker)

- **State:** Coverage advances **139→140/276 exact**, 0 partial, 0 staged, **137→136 unsupported**. HAZE alone moves; the animation boundary and unsupported-branch pins remain unchanged.
- **Did:** Audited the complete script/task body, literal `sHazeBlendAmounts`, fog tiles/tilemap/palette, BG1 scroll/blend setup and BG1/BG2/register cleanup, independent bilateral battler-black ramps, `SE_M_HAZE`, and sole legal set-127 KOFFING carrier. Added complete legal KOFFING/ONIX parties, a pointer-bounded dense probe, raw-RGB receipts/change maps, reproducible fog extraction, a pure source-relative reducer, typed Scene-ON seam, and the narrow BG1 compositor. KOFFING art is reused from SMOKESCREEN only through source-identical species assets; the opponent-front enemy-shadow latch was independently measured.
- **Verified:** Twice fresh, player-back frames **201..402** and opponent-front **289..490** each pass **202/202 source/reducer, seam, relevant hardware/register/palette/audio, and production framebuffer**. Probe/raw/map receipts are player `be17962f…` / `8acb434e…` / `56d3daf4…`, opponent `6d6514bc…` / `8a719e86…` / `4bc33da6…`. SUBSTITUTE remains bilateral **87/87** twice fresh as the earlier exact BG/palette control. Focused HAZE/coverage/source/extraction/boundary checks are **15/15**, smoke **375/375**, typecheck, full `npm test` **823 files / 8,187 passed / 1 skipped**, production build, and final coverage report are green.
- **Next:** Supervisor selects the next independent move. Do not infer HAZE's BG1 X/register latches, bilateral palette-transfer latch, or one-frame elevated enemy shadow for another fog/background task.

## MOVE_BARRIER exact — bilateral pointer-bounded 76/76 promotion (2026-08-09 worker)

- **State:** Coverage advances **138→139/276 exact**, 0 partial, 0 staged, **138→137 unsupported**. BARRIER alone moves; the animation boundary and unsupported-branch pins remain unchanged.
- **Did:** Audited the isolated eight-command body, gray wall palette/table, shared source-identical `AnimDefensiveWall` callback through destroy, BG-copy/OAM/blend path, and independent `SE_M_BARRIER` timing. Added complete legal set-114 DROWZEE versus ONIX parties, pointer-bounded bilateral probes, raw-RGB receipts/change maps, a pure source-relative reducer, typed seam, deterministic Drowzee/gray-wall assets, and the narrow shared-wall compositor.
- **Verified:** Twice fresh, player-back frames **215..290** and opponent-front **216..291** each pass **76/76 reducer/seam, relevant software+hardware+audio, and production framebuffer**. Probe/raw/map receipts are player `2ad5e1dc…` / `12ac1d1…` / `4a0d48b9…`, opponent `1e4d8c97…` / `a3d5047f…` / `baf4be08…`. REFLECT remains **208/208** and **211/211** bilateral twice fresh; LIGHT_SCREEN raw RGB/framebuffers remain **115/115** and **119/119** twice fresh, while its pre-existing metadata-only probe hash drift was not rebaselined. Focused coverage/source/asset/boundary checks are **22/22**, smoke **375/375**, typecheck, full `npm test` **821 files / 8,181 passed / 1 skipped**, production build, and final coverage report are green.
- **Next:** Supervisor selects the next independent move. Do not infer BARRIER's pointer-to-wall lead-in or independent no-sparkle/audio schedule for another wall move.

## MOVE_SUBSTITUTE exact — bilateral 87/87 source/seam/framebuffer promotion (2026-08-09 worker)

- **State:** Coverage advances **137→138/276 exact**, 0 partial, 0 staged, **139→138 unsupported**. SUBSTITUTE alone moves; the animation boundary and unsupported-branch pins remain unchanged.
- **Did:** Added the narrow source-relative compositor behind the typed Scene-ON seam. It reuses the generated GOLEM/ONIX catalogs and source-extracted doll front/back sheets and palette to render the nine affine shrink callbacks, hide/reset and graphics swap, offscreen drop, side-relative reveal, both bounce legs, sounds, and cleanup. The framebuffer uses the measured task-to-display age-2 latch; the source horizontal threshold uses `GetSubstituteSpriteDefault_Y` 97 player / 56 opponent.
- **Verified:** Twice fresh, player-back frames **291..377** and opponent-front frames **311..397** each pass **87/87 source/reducer, seam, hardware/palette/audio, and production framebuffer** with the committed probe/RGB/change-map receipts. Corrected FAKE_OUT remains **86/86** in both orientations twice fresh after the shared affine compositor edit. Focused **28/28**, smoke **375/375**, typecheck, full `npm test` **818 files / 8,166 passed / 1 skipped**, production build, and final coverage report pass. No damage, Substitute HP/result rule, RNG, controller, turn/facility state, boundary, or barrier changed.
- **Next:** Supervisor selects the next independent acceptance unit. Do not infer SUBSTITUTE's two-display task-to-framebuffer latch or side-specific doll reveal threshold for another task.

## MOVE_SUBSTITUTE bilateral evidence/reducer/seam checkpoint — remains unsupported (2026-08-09 worker)

- **State:** Coverage remains **137/276 exact, 0 partial, 0 staged, 139 unsupported**. SUBSTITUTE is not promoted; the animation boundary, unsupported barrier, gameplay, controller, and facility state are unchanged.
- **Did:** Audited the complete three-line `Move_SUBSTITUTE` body, `AnimTask_MonToSubstitute`/`AnimTask_MonToSubstituteDoll`, and `BattleLoadSubstituteOrMonSpriteGfx`; added legal set-498 GOLEM versus ONIX Scene-ON parties in both orientations, a pointer-bounded dense probe, raw-RGB receipts, bilateral change maps, a pure 87-age reducer, typed presentation seam, and deterministic front/back substitute-doll extraction.
- **Verified:** Two fresh runs per orientation are byte-identical. Player-back frames **291..377** and opponent-front frames **311..397** each provide **87/87** task/software-sprite, hardware OAM/matrix/palette, audio, immutable-state, and raw-RGB evidence through first inactive cleanup. Probe/RGB/map digests are player `fcfa2d1c…` / `0bf9b472…` / `78d6ac7a…`; opponent `30ef7a08…` / `e31e3d01…` / `62e3d72e…`. Focused reducer/assets/evidence/boundary/inventory tests are **15/15** and typecheck passes.
- **Next:** Implement the narrow source-relative GOLEM-to-doll affine/swap/bounce compositor, measure its software-to-scanout latches from the committed change maps, and require complete **87/87 framebuffer equality twice fresh in both orientations** before promotion. Rerun FAKE_OUT **86/86** both orientations after any shared compositor edit.

## MOVE_FAKE_OUT exact — corrected legal species + bilateral 86/86 promotion (2026-08-09 worker)

- **State:** Coverage advanced **136→137/276 exact**, 0 partial, 0 staged, **140→139 unsupported**. FAKE_OUT alone moved; commits `e5d263cd` and `87492e0a` contain the implementation and inventory-pin follow-up.
- **Did:** Corrected both inherited “MAKUHITA” mechanicLab parties from Emerald internal species 296 (actually LOMBRE) to 335 (MAKUHITA), refreshed dense evidence/change maps, and added the narrow source-derived compositor. It applies the WIN0H/WIN0V BG3 shutter/darken, BG white transition/restore, and SHUCKLE affine-double display through the typed seam. The measured first affine setup carries ShakeMon2 x2 at RAM+1; subsequent x2/y2/matrix displays are RAM+2. The animation boundary and unsupported-branch pins did not move.
- **Verified:** Twice fresh per orientation, player-back **78..163** and opponent-front **82..167** each pass **86/86 source/reducer, seam, relevant hardware, and framebuffer**. Player probe/RGB/map: `38f74114fad7195ea26da329214ba837b2c48da39470a08b2ef700880a3fe76e` / `e43d4eb00b1a46961d227ebab82df7555d71d48410905da8cfb2034156673c9f` / `65db300ac18fc2118181d930920a600bfe4cd1055453f4a09218372f5d1b8082`; opponent: `1f4de9e3e5eacc224becd0df4cc37288cb570918699b0c76f79da928e1c43d74` / `890d46b5c77926c0ffcaac17f529a33f4023dddc555b620f92ae676cce12a39e` / `b0e573a5d3bafa389aa4d9cb5f6b88920027bd5ef0d0c770ac57016b5be1f629`. ASTONISH remains twice-fresh bilateral **63/63 source/seam/hardware/framebuffer** (raw `ad5dcf52…` / `ba9b56fe…`). Focused **19/19**, smoke **375/375**, typecheck, full `npm test` **813 files / 8146 passed / 1 skipped**, foreground build, and final coverage report all pass.
- **Next:** Supervisor selects the next ranked independent move/component track. Preserve FAKE_OUT's corrected internal-species scenarios and complete bilateral portable; do not infer ShakeMon2/affine latches for another move from this one.

## MOVE_FAKE_OUT bilateral evidence/reducer/seam checkpoint — remains unsupported (2026-08-08 worker)

- **State:** Coverage stays **136/276 exact, 0 partial, 0 staged, 140 unsupported**. FAKE_OUT was not promoted; no inventory pin, boundary, gameplay, controller, or shared helper changed.
- **Did:** Added complete legal set-22-derived MAKUHITA versus SHUCKLE Scene-ON scenarios, the pointer-bounded dense mGBA probe, bilateral receipts/change maps, a pure 86-age source reducer, typed presentation seam, portable receipt verifier, and focused Tier-1 pins. The reducer ports FakeOut's software/display WIN0H shutter, darken/lighten registers, BG white restore, audio, cleanup, and reuses source-proven ShakeMon2 beneath the two-leg StretchTargetUp transform.
- **Verified:** Two fresh runs per orientation are byte-identical. Both complete windows are **86 frames**: player-back **76..161**, probe/RGB/map `9c63faf7…` / `7112a4bb…` / `0d14f730…`; opponent-front **80..165**, `cd528530…` / `4357b0dd…` / `bff06d35…`. The portable reports **86/86 source/reducer** both ways; measured FakeOut WIN display is RAM+1, while SHUCKLE target picture offsets are front 9 / back 11. ASTONISH remains **63/63 source/seam/hardware/framebuffer** both ways, twice fresh, with unchanged raw RGB; its metadata-only probe hashes were refreshed. Supervisor verification added MAKUHITA to the Scene-ON battler type, passed focused FAKE_OUT + ASTONISH/boundary/inventory **22/22**, full `npm test` **813 files / 8144 passed / 1 skipped**, and typecheck.
- **Next:** Implement the narrow `battleScene.ts` window-mask/shutter + target-affine compositor, then require **86/86 framebuffer** in both orientations twice fresh before promotion. Measure the target affine display latch from these change maps; do not infer it from ASTONISH. Run ASTONISH's 63/63 bilateral portable after any shared edit.
- **Notes:** Exactness did not fit this bounded round, so FAKE_OUT truthfully remains unsupported. No shared helper or unsupported-branch barrier changed; production framebuffer matching remains 0/86 by definition until the compositor exists.

## MOVE_GLARE exact — bilateral 213/213 source/seam/framebuffer promotion (2026-08-08 worker)

- **State:** Level-50 coverage advanced **135→136/276 exact**, 0 partial, 0 staged, **141→140 unsupported**. Only GLARE moved; TRI_ATTACK remains unsupported.
- **Did:** Added the narrow source-relative `battleScene.ts` compositor and source-extracted SMALL_RED_EYE art. It composes all 13 dot pairs, both sparkles, Scary Face BG/shake, BG-only black ramps, hardware battler offsets, source OAM/subpriority order, field chrome, and first inactive cleanup through the typed seam. Fresh pixels corrected the palette hardware coefficient and pinned asymmetric dot creation/destruction latches plus the sparkle creation latch.
- **Verified:** Twice-fresh player-back **74..286** and opponent-front **78..290** windows each pass **213/213 component+seam and 213/213 framebuffer**; evidence/raw RGB are player `67acdfad…` / `676cc2a4…`, opponent `2aa1e8a7…` / `eb5d27ea…`. Both fresh change maps byte-match committed maps. THUNDER remains **262/262** bilateral and SCARY_FACE **190/190** bilateral as fresh controls. Focused GLARE/boundary/inventory is **17/17**, smoke **375/375**, typecheck and build are green.
- **Next:** Continue the ranked queue. Do not promote TRI_ATTACK without independent complete dense acceptance.
- **Notes:** Final `npm test` is **811 files / 8,138 passed / 1 established skip** and the production build is green. No gameplay, damage, RNG, turn order, controller/facility state, shared animation boundary, or unsupported-barrier change.

## Supervisor wind-down — THUNDER exact; GLARE bilateral evidence + executable reducer/seam (2026-08-08)

- **State:** This session advanced Level-50 coverage **134→135/276 exact**, 0 partial, 0 staged, **142→141 unsupported**. `MOVE_THUNDER` alone was promoted. `MOVE_GLARE` remains unsupported because it has no framebuffer compositor or pixel acceptance; `MOVE_TRI_ATTACK` remains independently unsupported.
- **Did:** Folded master throughout; promoted THUNDER through its typed Scene-ON compositor; then banked complete bilateral GLARE evidence and made it load-bearing through a pure 213-age reducer plus typed Scene-ON seam. GLARE now models the 13 dot pairs, two sparkles, ScaryFace/shake tasks, both palette blends, registers, audio, logical/hardware battler offsets, and cleanup without drawing GLARE-specific pixels.
- **Verified:** Supervisor-fresh THUNDER probes pass **262/262 component + framebuffer frames** in both orientations, with THUNDER_PUNCH controls **104/104** both ways. GLARE passes **213/213 reducer + seam frames**, twice fresh in both orientations: player evidence/RGB `67acdfad…` / `676cc2a4…`, opponent `2aa1e8a7…` / `eb5d27ea…`. Final integrated `npm test` is **811 files / 8,135 passed / 1 established skip**; post-final-master-fold smoke and build are green.
- **Next:** Implement GLARE's narrow source-relative compositor and require complete bilateral framebuffer acceptance before promotion. Preserve THUNDER and SCARY_FACE as controls; do not couple TRI_ATTACK acceptance.
- **Notes:** For the main program: animation changes are presentation-only; no gameplay, damage, RNG, turn order, facility state, shared barrier, or main-ledger contract changed. No animation deferral is open and no animation worker branch/worktree remains.

## MOVE_GLARE bilateral Scene-ON evidence checkpoint — remains unsupported (2026-08-08 worker)

- **State:** Coverage remains **135/276 exact**, 0 partial, 0 staged, **141 unsupported**. GLARE was not promoted; no reducer, compositor, engine, boundary, gameplay, controller, or sibling behavior changed.
- **Did:** Added complete legal set-200 DUNSPARCE versus SHUCKLE scenarios in both orientations, a dense source-window mGBA probe, deterministic receipts/change maps, a source/component audit, and hermetic Tier-1 pins. The probe records script offsets/waits, every active task and logical sprite with data, hardware OAM/matrices, all palette buffers/tags, registers, audio state, and raw RGB.
- **Verified:** Two fresh runs per orientation are byte-identical. Both complete windows are **213 frames** through first inactive cleanup: player-back **74..286**, evidence `67acdfad…`, RGB `676cc2a4…`; opponent-front **78..290**, evidence `2aa1e8a7…`, RGB `eb5d27ea…`. The audit distinguishes 13 `gGlareEyeDotSpriteTemplate` pairs from the two `gEyeSparkleSpriteTemplate` instances, `AnimTask_ScaryFace`, `AnimTask_ShakeTargetInPattern`, and the separate 0→16 / 16→0 BG palette blends. Focused ratchets are **13/13**, smoke **375/375**, full `npm test` **810 files / 8,130 passed / 1 established skip**, build, and final coverage report are green.
- **Next:** A later bounded round may implement and prove the production reducer/seam/compositor. Until then GLARE remains unsupported; SCARY_FACE and THUNDER stay independently exact and TRI_ATTACK independently unsupported.

## MOVE_THUNDER exact — bilateral Scene-ON promotion (2026-08-08 worker)

- **State:** Coverage advanced **134→135/276 exact**, 0 partial, 0 staged, **142→141 unsupported**. Only `MOVE_THUNDER` moved; GLARE and TRI_ATTACK remain unsupported.
- **Did:** Wired the staged source-relative reducer and BG_THUNDER art into the narrow typed Scene-ON compositor; added the hardware-OAM shake display schedule, source one-display enemy-shadow handoff, complete portable verifier, exact receipts, and focused Tier-1 pins. Renamed Lightning's `priority` field to the source-accurate `sourceSubpriorityOffset` before wiring.
- **Verified:** Twice-fresh bilateral probes pass source/software/typed seam, tasks, Lightning and battler hardware OAM, palette/register/audio state, raw RGB, and shared framebuffer: player-back **76..337 = 262/262**, evidence `e2cbab66…`, raw RGB `bb5b5dff…`; opponent-front **80..341 = 262/262**, evidence `45a17da4…`, raw RGB `f6d879f0…`. THUNDER_PUNCH controls remain **104/104 component + framebuffer** in both orientations. Focused tests **20/20**, typecheck, full `npm test` (**809 files, 8084 passed, 1 established skip**), and `npm run build` pass.
- **Next:** Continue the ranked queue. Do not promote GLARE or TRI_ATTACK without independent complete dense evidence.
- **Notes:** No gameplay, RNG, controller, facility, shared-boundary, unsupported-barrier, or master-ledger change.

## MOVE_MAGICAL_LEAF exact — bilateral Scene-ON promotion (2026-08-08 worker, round B)

- **State:** Coverage advanced **133→134/276 exact**, 0 partial, 0 staged, **143→142 unsupported**. Only `MOVE_MAGICAL_LEAF` moved; no gameplay, controller, boundary, or unsupported-barrier change.
- **Did:** Added the narrow live `battleScene.ts` compositor, `magicalLeafPortable.ts`, bilateral exact receipts, and a Tier-1 evidence pin. The draw path uses the staged source-relative reducer, exact Razor Leaf leaf/cutter art, legal Roselia/Onix art, source OAM order, target-BG/alpha behavior, and explicit one-display latches.
- **Verified:** Two fresh `tools/run-mgba-probe.py` runs per orientation pass the complete windows through first inactive cleanup: player-back **77..258** and opponent-front **81..262**, each **182/182 source components + typed seam** and **182/182 full framebuffers**. Stable evidence/raw-RGB receipts are `d8250aae…` / `f4574567…` and `cc7fd481…` / `1e700815…`; regenerated change maps byte-match the committed maps. Razor Leaf control: both legal orientations pass **139/139** source/seam and framebuffer frames twice fresh after the new compositor.
- **Next:** Continue the ranked animation queue; Secret Power, Leaf Blade, and Twister remain independent acceptance units.

## MOVE_MEGA_KICK exact — dual-orientation Scene-ON promotion (2026-08-08 worker, round B)

- **State:** Coverage advanced **132→133/276 exact**, 0 partial, 0 staged, **144→143 unsupported**. No boundary, controller, gameplay-state, or unsupported-barrier change.
- **Did:** Added the narrow parameterized Punch/Kick compositor, variant-1 foot selection, two portable fixtures, `megaKickPortable.ts`, and the Tier-1 receipt test.
- **Verified:** Fresh probes via `tools/run-mgba-probe.py` twice each: player-back **379..538** and opponent-front **297..456** are **160/160 component and framebuffer exact**. Foot matrix is RAM+1, target monbg hardware 7..113, restore fade first visible RAM+2; player-side effect subpriority is 38 versus opponent 28. Mega Punch remained **160/160** in both orientations twice fresh as the shared-body control.

## MOVE_CRABHAMMER exact — full dual-orientation Scene-ON promotion (2026-08-08 worker, round B)

- **State:** Coverage is now **132/276 exact, 0 partial, 0 staged, 144 unsupported**. `MOVE_CRABHAMMER` alone moved; no controller/battle state, boundary, unsupported-barrier, or sibling change.
- **Did:** Added the narrow `battleScene.ts` compositor, both portable receipts, `crabHammerPortable.ts`, and the Tier-1 evidence pin. It renders WATER_IMPACT over the target-BG backdrop, scoped F_PAL_BG|F_PAL_BATTLERS blend, source OAM painter order, ONIX front-idle x2=1/back-idle x2=0, both target slides, ShakeMon, and all eight ICE_CRYSTALS bubble pairs.
- **Verified:** Fresh probes run **twice per orientation** through `tools/run-mgba-probe.py`: player-back **212..316** and opponent-front **302..406**, each **105/105 component and 105/105 framebuffer exact**. Stable evidence excluding only the controller-selected identical PP slot remains `13518a8a…` / `54694fc0…`; full raw-RGB hashes remain `92c0bd6…` / `e6cf436…`. Each visible splat/slide/bubble/ShakeMon/palette edge uses its measured RAM+1 latch; monbg/setalpha/cleanup remain RAM-only.
- **Audit:** Representative components are ICE_CRYSTALS, WATER_IMPACT, both slide templates, gSmallBubblePair, gWaterHitSplat, AnimTask_ShakeMon, complex_palette_blend, monbg, setalpha, clearmonbg, and blendoff. WATERFALL, SECRET_POWER’s underwater branch, DIVE, and WATER_SPOUT remain independent unsupported move bodies.

## Supervisor wind-down — SLASH, LICK, COUNTER and DOUBLE_EDGE all exact, 127→131; DOUBLE_EDGE closed after three prior failures; the display latch is per-TASK, not per-category (2026-08-08 animation session)

- **State:** coverage advanced **127→131/276 exact**, 0 partial, 0 staged, 145
  unsupported. `animation-main` is committed and green with no worker worktrees
  or branches left behind. 9 worker launches, 9 productive, 3 cap-kills (all
  salvaged in full). `ANIMATION_DEFERRED.md` remains empty.
- **Did:** promoted **MOVE_SLASH** (46/46 both orientations), **MOVE_LICK**
  (73/73 both), **MOVE_COUNTER** (88/88 both) and **MOVE_DOUBLE_EDGE** (141/141
  both) — the last after **three failed promotion rounds on 2026-08-07** and a
  day spent as 340 lines of dead code that nothing imported and no test pinned.
  Normalized `ANIMATION_COVERAGE.json` back to its canonical one-space
  serialization after one promotion drifted it.
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report — both portables per move, fresh, plus an **earlier move's portable as a
  control every time** (CRUNCH held at 142/142 twice with its committed hashes;
  LICK held at 73/73 and SLASH at 46/46 after later draw cases landed). All eight
  change maps re-derived by the supervisor from independent fresh probe runs and
  diffed byte-for-byte against the committed files — **8/8 identical**. Both new
  asset extractors re-run: byte-for-byte regeneration confirmed. The DOUBLE_EDGE
  reducer validated field-by-field against the supervisor's own probe **twice** —
  once at staging and again after the promotion round edited it — matching every
  offset and **all 141 frames × 2 orientations × 4 affine-matrix fields with zero
  mismatches** both times. Final integrated `npm test` **786 files / 7630 passed /
  1 established skip** and `npm run build` exit 0 on the merged tree.
- **Next:** the remaining moves ranked by TOTAL unit size — anim-script lines
  PLUS the lines of C in any new component, which is the number that actually
  predicted round cost across this session and the last. Zero-new-component
  first: **CRABHAMMER** (35 script lines), **MEGA_KICK** (23 lines but 22
  components across several blocks), **MAGICAL_LEAF** (42), **THUNDER** (56).
  Then the small one-new-component moves: **SUBSTITUTE** (3 script lines + 39 C,
  but it needs the substitute-doll gfx and a mon-sprite swap, so the line count
  understates it), **FAKE_OUT** (9 + 47), **BARRIER** (8 + 59, new
  ANIM_TAG_GRAY_LIGHT_WALL asset), **HAZE** (8 + 86). **Avoid MOVE_DOUBLE_KICK
  and MOVE_THRASH** despite their small size: `AnimFistOrFootRandomPos` makes
  four `Random2()` calls and this lane does not model the Random2 stream.
  Caveat from experience: a low total is necessary but not sufficient —
  DOUBLE_EDGE scored 31 and still failed three rounds, because composing nine
  already-exact components across a 141-frame window is its own kind of hard.
  Prefer a small script AND few components together.
- **Notes — the headline mechanism finding: the display latch is per-TASK, and
  the lane's working rule was wrong.** Before this session the lane believed
  "sprite-driven displays one frame after RAM, task-driven displays two." That
  generalization is FALSE and MOVE_COUNTER falsified it inside a single window:
  `AnimTask_TranslateMonEllipticalRespectSide` displays at **RAM+2** while
  `AnimTask_ShakeMon` displays at **RAM+1** — same move, same frames. Meanwhile
  `AnimTask_ShakeMon2` displays at **RAM+2** (SLASH, LICK, TAKE_DOWN), and
  `AnimTask_RotateMonSpriteToSide` measures **RAM+2** (DOUBLE_EDGE). ShakeMon and
  ShakeMon2 are different source tasks and they latch differently. **Measure the
  lag per task, per move, from the change map — never inherit it.** Sprite-driven
  events have been RAM+1 in every move measured so far.
- **Notes — the orientation shift is not a lane constant either.** It came out
  **+4** (CRUNCH, SLASH, DOUBLE_EDGE), **−1** (LICK) and **+0** (COUNTER) — three
  different values in one session. Every brief this session told the worker to
  measure both windows separately, and that was the right call. Related: the two
  orientations do NOT have matching changed-pixel counts even when their timing
  lines up, because the target is ONIX's *front* sprite in one orientation and
  its *back* sprite in the other — a ~20% footprint difference on SLASH.
- **Notes — a second measured painter rule.** For equal-subpriority
  semi-transparent overlaps the **lower OAM slot** wins the PPU's one-selected-OBJ
  blend, NOT creation order. COUNTER's three hitsplats land on slots 3/5/4 (the
  allocator cycles 3,4,5 and reuses), measured from probe hardware OAM at the
  frame-247 and frame-255 overlaps; it cost two portable iterations to pin. SLASH
  found the same rule from the other side: its two equal-subpriority slices
  resolve in allocator order, the reverse of CRUNCH's "later slot wins" reading.
- **Notes — the DOUBLE_EDGE retry, and why it worked this time.** DOUBLE_EDGE
  failed three consecutive promotion rounds on 2026-08-07, one with zero file
  writes, and left `src/animation/doubleEdge.ts` behind: 340 lines that nothing
  imported and no test pinned. All three failures predate
  `tools/compare/frame-changemap.py`. The retry brief ordered the change maps
  FIRST, before any TypeScript, and told the worker to treat the existing reducer
  as an unverified hypothesis rather than a staged asset. That round was
  cap-killed but committed its green state; the supervisor's own validation then
  showed the corrected reducer exact on every affine field. **The premise held:
  the missing artifact was the change map, not the difficulty of the move.**
  A follow-up round made the reducer load-bearing (pins + seam) so it cannot rot
  as dead code again. The promotion round that followed was also cap-killed, with
  the draw case, portable and both fixtures committed and two test files left
  uncommitted; the supervisor salvaged those two files unchanged, verified both
  portables at **141/141 component and framebuffer, exit 0, both orientations**
  with `counterPortable` held as a control at 88/88, re-validated the reducer
  against its own probe after the worker's edits, and then wrote the coverage
  entry and moved the inventory pin itself. **Three of this session's nine
  launches were cap-killed and all three were salvaged in full** — the pattern
  that makes that cheap is workers committing green intermediate state rather
  than holding one big change.
- **Notes — briefs that pre-supply mechanical facts keep paying.** Every round
  this session got script-pointer bounds from `arm-none-eabi-nm` (these labels are
  NOT in the linker map; `bin/oracle symbols` returns null), the move id, the
  carrying Factory set, and a named scenario pair to copy. Three of the four moves
  needed **no scenario authoring at all** — SLASH copied CRUNCH's pair, LICK
  copied the existing SLAM pair (set 164 LICKITUNG legally carries both), and
  COUNTER copied the DOUBLE_EDGE pair (set 341 HITMONTOP legally carries both).
  Checking which existing scenario's species already carries the target move is
  the cheapest minute available in this lane.
- **Notes — worker self-correction worth recording.** The SLASH promotion round
  was told in its brief that the `AnimTask_ShakeMon2` creation-frame write is a
  same-frame transient that never reaches pixels. It checked the framebuffer
  instead of believing the brief, and the brief was wrong: the write reaches
  exactly one displayed frame. The LICK round then refined it further — that same
  write is a real one-frame step for ONIX's *back* sprite but idle-coincident, and
  therefore invisible, for its *front* sprite. Both rounds reported the correction
  explicitly rather than silently working around it.
- **Notes — two duplicated closed forms, deliberately pinned rather than
  refactored.** SLASH and LICK each re-derived `AnimTask_ShakeMon2` as a closed
  form instead of calling `src/animation/shakeMon2.ts`. They agree with the shared
  port on every observable age (they differ only at the creation index, a
  same-frame transient), so rather than rewrite proven draw cases, each carries a
  Tier-1 pin asserting equivalence with the shared port over the observable range.
  COUNTER and DOUBLE_EDGE do import their shared ports (`slideMon.ts`,
  `shakeMon.ts`, `shakeMonInPlace.ts`) directly, which is the preferred shape.
- **Notes — the honest non-result got settled, and the answer was neither
  candidate.** The pin round recorded `AnimTask_ShakeMonInPlace`'s display lag as
  **NOT DETERMINED**: its window is fully overlapped by DOUBLE_EDGE's forward
  rotation and BG white-blend ramp, the best fit was RAM+1, and that fit explained
  every player-back frame but contradicted one opponent-front toggle. Refusing to
  guess was the right call, because the promotion round then measured a rule that
  is neither RAM+1 nor RAM+2: **the shake displays PAIR-ALIGNED.** Its RAM writes
  come in two-frame pairs at the even ages 80..100, the odd-age writes never reach
  a displayed frame at all, so the displayed value at display age A is the RAM
  pair containing A-1 (each value holding two displayed frames) and the RAM
  age-101 restore shows at displayed age 103. That rule is exact on BOTH
  orientations, and it is pinned in `tests/animation/doubleEdge.test.ts` via the
  exported `doubleEdgeRamShakeX2` / `doubleEdgeDisplayedShakeX2` pair. A guessed
  RAM+1 would have shipped a draw case that was wrong on one orientation.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened. Engine contact stayed inside
  `src/engine/battleScene.ts` animation draw cases plus the
  `src/animation/sceneOnPresentation.ts` seam; every engine diff this session was
  purely additive with zero deletions.
  `tests/animation/factoryAnimationInventory.test.ts` now pins **131 exact / 145
  unsupported** — that pin moves on every promotion, so a fold that resolves
  `ANIMATION_COVERAGE.json` must re-run it. One housekeeping note for whoever
  edits that file next: it is serialized at **one space per nesting level**
  (`json.dumps(..., indent=1)`); a promotion this session drifted two entries to
  four-space and the supervisor re-serialized it in a separate whitespace-only
  commit.

## MOVE_DOUBLE_EDGE pinned and wired — stays unsupported, 130/276 exact unchanged (2026-08-08 worker, pin round)

- **State:** DOUBLE_EDGE stays **unsupported**. Coverage unchanged at **130/276
  exact, 0 partial, 0 staged, 146 unsupported**. Nothing promoted; no pin
  moved; no boundary widening; no shared-helper edit. This is the pin round —
  the 340-line dead reducer is now load-bearing; promotion to exact (both
  orientations, a portable at full-window exact) is the NEXT round's job.
- **Did:** wrote `tests/animation/doubleEdge.test.ts` (11 pins, modelled on
  counter.test.ts — the shared elliptical lunge, the two gSlideMonTo* slides
  and a basic hitsplat) and added `SceneOnDoubleEdgeConfig` /
  `SceneOnDoubleEdgeView` / `sceneOnDoubleEdgeView` to
  `src/animation/sceneOnPresentation.ts` following
  `SceneOnCounterConfig`/`sceneOnCounterView` exactly (same config shape, same
  union memberships in `SceneOnMoveConfig` and `createSceneOnMovePresentation`,
  same view shape). HITMONTOP was already in the presentation species union
  (COUNTER added it), so no species work. No engine file touched.
- **Measured (from the banked change maps + the supervisor's validated probe
  facts, no new oracle run):** window **141 frames both orientations** —
  player-back **80..220**, opponent-front **84..224**, an **orientation shift of
  +4**. The pins lock: the 18/6/**2**/4 two-loop lunge (via the shared `wrap.ts`
  port, both orientations incl. the mirrored width), the attacker slide +20 and
  target slide -32 as REUSE pins against `slideMon.ts` (the opponent-side target
  holds **+31, not -32** — the shared port's truncating Q8.8 division; the
  player-side target holds exactly -32), the `ShakeMonInPlace(4,0,12,1)` x2 as a
  REUSE pin against `shakeMonInPlace.ts` (the shake is added to BOTH battlers'
  x2 over ages 80-100 — this is what makes the change-map bbox span both
  battlers), the `RotateMonSpriteToSide` matrices at their boundary ages
  (forward span 256..2048, reversal 2304..3840, identity reset with the
  persistent y2=12), the rotation-derived y2 applying only to the player-side
  battler (dead-code correction #1), the hitsplat ages 70-78 at the mirrored
  target-relative anchor, and the attacker-white (10 at 4-7/13-18) + BG-white
  (16 at 63-82, ramping to 0 at 111) blend curves. The **ONIX front-idle
  exclusion is pinned explicitly**: player-back `targetOffset.x2` reads 0 for
  ages 0-69 while the probe reads 1 (ONIX front idle hold) — a species-idle
  property the draw case supplies, not a reducer bug (TAKE_DOWN/SLASH/LICK/
  COUNTER convention); opponent-front has no such hold (ONIX back rests at x2=0)
  and mismatches zero fields.
- **Next (exactly what a promotion round still needs):** the MOVE_DOUBLE_EDGE
  draw case in `battleScene.ts` (must split the display latch per the two lags
  below), a `tools/compare/doubleEdgePortable.ts` at full-window exact (141
  frames x 2 axes x 2 orientations), the two fixtures, the evidence test
  (`tests/animation/doubleEdgeEvidence.test.ts`), the coverage entry and the
  inventory pin 130 -> 131 exact / 146 -> 145 unsupported. The ellipse task was
  per-move-profiled (`wrap.ts` port, two loops vs COUNTER's one) — a promotion
  round must verify ITS display latch, not inherit COUNTER's +2.
- **Notes — the two display lags read off the banked change maps (first time
  either is measured in this lane), one line each:** **`AnimTask_RotateMonSpriteToSide`
  is TASK-driven and renders RAM + 2** — isolated restore-phase window: static
  frames 193-200, first pixel change 201 = RAM 119 + 2, seven consecutive
  change frames for the seven restore steps (119-125), identity reset at RAM 126
  landing with the attacker origin slide at 208, confirmed in both orientations
  (opponent restore 119-125 -> changes 205-211). **`AnimTask_ShakeMonInPlace` is
  NOT DETERMINED from the change maps** — its window (RAM ages 80-100) is fully
  overlapped in both orientations by the forward rotation (80-87) and the BG
  white-blend ramp (83-111); its 2-frame toggle cadence reads clearly in the
  clean half (odd displayed frames) and the best fit (RAM + 1 with the task's
  tick 0 at RAM age 80) explains the player-back map on every frame, but the
  opponent-front frame 185 (the last toggle) is static, so no single lag
  reproduces both maps byte-for-byte — reported honestly as not determined
  rather than guessed (a fresh single-axis probe is that round's first job).
- **Notes — `npm test` green on the targeted set (doubleEdge 11/11, counter
  9/9, boundary ratchet 3/3, inventory 6/6 at 130/146) at commit time; the
  full-suite + build verification is this round's finish step.** No boundary
  widening, no new unsupported-branch barrier, no shared-helper edit; the only
  engine contact will be the promotion round's draw case.

## MOVE_COUNTER promoted to exact — 130/276, both orientations at 88/88 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **129→130/276 exact**, 0 partial, 0 staged,
  **147→146 unsupported**. COUNTER was staged last round and is now proven by an
  exact move in both orientations through the shared seam. `counterPortable.ts`
  exits 0 at **COUNTER component 88/88; framebuffer 88/88** (player-back,
  frames 207-294) and **component 88/88; framebuffer 88/88** (opponent-front,
  frames 207-294), fresh evidence hashes player `aeb600cd…`/RGB `858b9e0f…`,
  opponent `d6c0b68a…`/RGB `85cab93f…`, reproduced fresh four times each (twice
  standalone + twice via the portable). The inventory pin moved **129→130 exact
  / 147→146 unsupported**.
- **Did:** the MOVE_COUNTER draw case in `battleScene.ts` — HITMONTOP
  back/front and ONIX front/back (shared battle back/front bundles), the three
  opaque fists (subpriority 27, `subTileset(handsAndFeet,0,4)` painter) and
  three basic hitsplats (subpriority 28, identity matrix, blended 12/8 over the
  field+target backdrop, BODY_SLAM convention) at the mirrored target-relative
  anchors, the target always visible as the monbg BG1 copy that tracks the
  sprite x2 (`Task_UpdateMonBg`, battle_anim.c:813-837), and the split display
  latch (below). Wrote `tools/compare/counterPortable.ts` (modelled on
  crunchPortable.ts, probe move 68) + the two fixtures, the evidence test
  (`tests/animation/counterEvidence.test.ts`), the coverage entry, and moved
  the inventory pin.
- **Measured (fresh, deterministic, twice-fresh hashes pinned): the display
  latch is split THREE ways — the first move in the lane where "task-driven
  means +2" is FALSE as a blanket rule.** `AnimTask_TranslateMonEllipticalRespectSide`
  (attacker lunge) is TASK-driven and renders **RAM + 2** (RAM 217 → pixels 219,
  peak x2 18 at RAM 220 → pixels 222, rest RAM 231 → pixels 233). **`AnimTask_ShakeMon`
  is TASK-driven but renders RAM + 1** — the RAM flips land on odd ages and the
  change-map events are the following even ages (244,246,…,290) — **NOT the +2
  the lane's ShakeMon2 rounds (SLASH/LICK/TAKE_DOWN) measured; ShakeMon and
  ShakeMon2 are different source tasks and latch differently, the most reusable
  fact this move teaches.** Both `gSlideMonTo*` dummies and all three
  fist/hitsplat pairs are SPRITE-driven at **RAM + 1** (first hitsplat RAM 238 →
  pixels 239, first fist RAM 241 → pixels 242). The target rests at the ONIX
  front-idle x2=1 through display 241, drops to 0 at 242 (shake creation write),
  then toggles 5/0 every two frames through the 0 restore at display 290 — the
  ONIX x2 never returns to 1, and because the target stays visible (the BG copy
  tracks the sprite x2) the shake IS visible moving pixels, unlike a hidden-OBJ
  assumption would suggest. monbg/setalpha 12,8 (BLDCNT 0x3f40, empty target-1,
  no pixel step)/clearmonbg/blendoff are RAM-truth only, exactly like
  CRUNCH/CRUSH_CLAW.
- **Notes — the orientation-shift trap did NOT bite, but the painter-order trap
  DID, and it was the equal-subpriority semi-transparent overlap, not the
  target-front-vs-back.** The orientations line up **+0 on every frame** (one
  age-indexed reducer serves both; only the battler geometry and the mirrored x
  differ). The changed-pixel counts differ because the target is ONIX's front
  sprite in one and its back sprite in the other — expected. The real finding:
  within the equal-subpriority 28 hitsplat pair the ROM's OAM allocator REUSES
  slots (hitsplats land on 3/5/4, fists on 4/3/5), and the LOWER OAM slot wins
  the PPU's one-selected-OBJ semi-transparent blend (probe-measured at the
  frame-247 hitsplat1/hitsplat2 and frame-255 hitsplat2/hitsplat3 overlaps) —
  so `counter.ts` now reports each hitsplat's OAM slot and the draw paints
  descending. Blind creation-order painting cost this round two portable
  iterations (247 then 255); slot order, not creation order, is the rule.
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; COUNTER adds no new unproven components (the lunge task was
  per-move-profiled, the slides/shake are the shared `slideMon.ts`/`shakeMon.ts`
  ports, fists/hitsplats/monbg/setalpha are all already exact elsewhere).
- **Notes — no boundary widening, no new unsupported-branch barrier, no
  shared-helper edit.** The only engine contacts are the COUNTER draw case in
  `battleScene.ts` and the already-landed `sceneOnCounterView` seam; the only
  src/animation change is exporting `SLIDE_ORIGIN_DURATION` and adding the
  hitsplat `slot` field in `counter.ts`. The coverage entry is flipped LAST,
  after both portables exited 0 at full-window exact (88/88 each).
- **Notes — `npm test`, `npm run typecheck` and `npm run build` green on the
  final tree.** The coverage entry was inserted with `json.dumps(indent=1)`
  serialization (one space per nesting level) — re-serialized the file rather
  than hand-indent an entry, so no whitespace drift.

## MOVE_COUNTER staged — both orientations isolated at 88 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** COUNTER stays **unsupported**. Coverage unchanged at **129/276 exact, 0
  partial, 0 staged, 147 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (HITMONTOP `SPECIES_HITMONTOP`
  237 — FRONTIER_MON_HITMONTOP_2, set 341, item Focus Band 196, nature ADAMANT 3,
  EV spread HP|DEFENSE = 255/255, all four active slots COUNTER 68, vs legal ONIX
  95; player-back `mechanic-counter-player-hitmontop-opponent-onix.json` and
  opponent-front `mechanic-counter-opponent-hitmontop-player-onix.json` — exact
  copies of the DOUBLE_EDGE pair with only HITMONTOP's four move slots changed
  38→68, byte-identical otherwise, both verified to run with currentMove 68) and
  `tools/compare/counterProbe.py` — a dense probe copied from `crunchProbe.py`
  with script-pointer isolation to `Move_COUNTER` (0x082d2422)..`Move_VITAL_THROW`
  (0x082d24f1) capturing every `gFistFootSpriteTemplate` fist (all three, with
  animation number, position and data words — `AnimBasicFistOrFoot`/
  `WaitAnimForDuration`), every `gBasicHitSplatSpriteTemplate` hitsplat (all
  three, `AnimHitSplatBasic`), both `gSlideMonToOffsetSpriteTemplate`/
  `gSlideMonToOriginalPosSpriteTemplate` dummy sprites, the
  `AnimTask_TranslateMonEllipticalRespectSide` attacker-lunge task and the
  `AnimTask_ShakeMon` target-shake task (each with its arguments/state), the
  monbg/setalpha/blendoff machinery (BLDCNT/BLDALPHA/BLDY), both battlers'
  sprites, all 512 palettes, software + hardware OAM and matrices, per-frame raw
  RGB + sha256. NOTE: keeps the TRUE sprite offsets `0x2a`/`0x2b`/`0x2c` for
  animNum/animCmdIndex/animDelayCounter (never `0x18`/`0x19`). Probe run:
  `python3 tools/run-mgba-probe.py <out.json> -- python3 tools/compare/counterProbe.py
  <scenario.json> <out.json> <rgb-dir> 68`. Plus the displayed-timing change
  maps banked under `tools/compare/evidence/counter-changemap-player.txt` /
  `counter-changemap-opponent.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 88
  frames each — player-back 207..294, opponent-front 207..294** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 207 / opponent frame 207 are
  pixel-identical to their next 4 frames, no move sprites, no move tasks (the
  `loadspritegfx` prefix is 12 frames of static screen; the monbg invisible flip
  at RAM 214 and the setalpha BLDCNT write at RAM 217 are both RAM-truth-only —
  the BG copy shows identical pixels). **The orientations line up EXACTLY 0 on
  every frame — NOT the +4 of CRUNCH/SLASH, NOT the -1 of LICK** — the reducer
  can be a single age-indexed shape with only the battler geometry differing.
  Determinism: each orientation re-run from scratch is byte-identical (player
  sha seq first/last `5260a0e4…`/`3167d803…`, opponent `79c0de89…`/`79c0de89…`);
  software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is identical frame-for-frame, only
  mirrored):** **Elliptical lunge** `AnimTask_TranslateMonEllipticalRespectSide
  (ANIM_ATTACKER,18,6,1,4)` — task slot 0, width 18, height 6, loops 1,
  wavePeriod 1<<4=16; attacker x2/y2 over RAM 217-230:
  (6,1),(12,2),(16,4),(18,6),(16,9),(12,11),(6,12),(0,12),(-7,12),(-13,11),(-17,9),
  (-18,6),(-17,4),(-13,2), then task destroyed RAM 231 (x2=y2=0). **Slide-to-offset
  dummy** `gSlideMonToOffsetSpriteTemplate(0,20,0,0,4)` at (176,42) = target
  X_2/Y_PIC, invisible, RAM 232-236 driving attacker x2 5,10,15,20,20 (data[1]=
  1280, accumulator 1280/2560/3840/5120), destroyed 237. **Fist/hitsplat triplets**
  at target-relative offsets (mirrored by `SetAnimSpriteInitialXOffset` for the
  player-side target): hitsplat1 (161,60)=(176−15,42+18) RAM 238-246, fist1
  (161,60) RAM 241-248 (data[0] 7..0 = WaitAnimForDuration 8), hitsplat2 (176,38)
  RAM 246-254, fist2 RAM 249-256, hitsplat3 (191,51) RAM 254-262, fist3 RAM
  257-264 — all animNum 0/animCmd 0 static, fists subpriority 27, hitsplats 28
  (both IN FRONT of the target's 40). **`AnimTask_ShakeMon(ANIM_TARGET,5,0,25,1)`**
  task slot 0 created RAM ~240, first observed RAM 241 (data[1]=24); x2 toggles
  5/0 in same-value pairs, flips at odd RAM frames 243,245,…,287 (x2=5 on
  243-244, 0 on 245-246, …), task destroyed RAM 289 (x2=0). **Slide-to-original
  dummy** `gSlideMonToOriginalPosSpriteTemplate(0,0,5)` (currentX2 20) RAM
  264-268 driving attacker x2 16,12,8,4,0 (data[4]=−1024 = −20<<8/5), destroyed
  269. **monbg ANIM_DEF_PARTNER** hides the target sprite RAM 214; **setalpha
  12,8** (BLDCNT 0x3f40 / BLDALPHA 0x080c) RAM 217; **clearmonbg + blendoff**
  restore it RAM 290 (RAM-truth only — the change map is static after 290, no
  blend pixel step, like CRUNCH's setalpha/blendoff). SE_M_VITAL_THROW (122)
  plays once at the lunge start, SE_M_VITAL_THROW2 (123) three times at the
  fist/hitsplat triplets (SE1). No palette/BG-map changes at all (no fadetobg).
- **Displayed-timing mapping (player-back; opponent-front identical on every
  frame; the change map wins):** **the elliptical lunge is TASK-driven and
  displays TWO frames after its RAM state (RAM 217 → pixels 219; the peak x2 18
  at RAM 220 → pixels 222, back-to-rest RAM 231 → pixels 233)** — the LICK/
  SLASH/TAKE_DOWN case. **The ShakeMon x2, by contrast, displays ONE frame after
  its RAM state (RAM flips at odd frames → change-map events at even frames
  270,272,…,290; the first clean region 269-290 shows the 5/0 toggle reaching
  pixels at 270) — NOT the +2 the lane's ShakeMon2 rounds measured.** **Both
  slides are SPRITE-driven and display RAM+1** (slide-back: RAM 264→pixels 265,
  268→269; slide-to-offset starts at pixels 233). First fist/hitsplat displayed
  239 (hitsplat1 RAM 238 +1), first fist 242 (RAM 241 +1). The two task-driven
  motions therefore do NOT share one lag number — the reducer/draw case must
  split them, exactly as the brief warned. The ONIX front-idle x2=1 rest (player
  frame 207-213) flips to 0 when the shake task's creation write lands and stays
  0 after the task restores it (the shake restore to 0 at RAM 289 displays at
  290, outside the moving window; the ONIX x2 does NOT return to 1).
- **Next:** promote COUNTER to exact. Build `src/animation/counter.ts` (RAM-truth
  reducer at the ages above: the 18/6/1/4 elliptical lunge as the phase
  16..240/step-16 one-cycle wave with the +2 latch, the slide-to-offset (20,0,4)
  + slide-to-original (20,0,5) via the shared `slideMon.ts` helpers, the three
  fist/hitsplat triplets at the target-relative anchors with the mirrored x, the
  ShakeMon 5/0 2-frame-toggle via `shakeMonSequence(5,0,25,1)`, the monbg/
  setalpha/blendoff machinery, no palette work) + Tier-1
  `tests/animation/counter.test.ts`; `SceneOnCounterConfig`/View seam in
  `sceneOnPresentation.ts`; the COUNTER draw case in `battleScene.ts` (fist art
  from `src/assets/gen/battle-anim-hands-and-feet.json`, hitsplat from
  `battle-anim-hitsplat.json`, HITMONTOP/ONIX via existing species art); a
  `counterPortable.ts` at full-window exact (88 frames × 2 axes, both first
  frames kept); the fixtures, the coverage entry and the inventory pin
  129->130 exact / 147->146 unsupported.
- **Notes — zero new components.** Every component is already exact elsewhere:
  `sprite:gFistFootSpriteTemplate`/`AnimBasicFistOrFoot` = FIRE_PUNCH/SHADOW_PUNCH
  (`shadowPunch.ts` fist painter); `sprite:gBasicHitSplatSpriteTemplate` =
  IRON_TAIL/TAKE_DOWN/BODY_SLAM; `sprite:gSlideMonToOffsetSpriteTemplate`/
  `gSlideMonToOriginalPosSpriteTemplate` = the shared `slideMon.ts` helpers
  (reuse, do not re-port); `task:AnimTask_ShakeMon` = IRON_TAIL/POISON_TAIL/
  MUD_SHOT (`shakeMon.ts`); `task:AnimTask_TranslateMonEllipticalRespectSide` =
  per-move-profiled (`faintAttack.ts`'s `faintAttackAttackerOffset` is the same
  task with speed 3 instead of 4 — the ellipseAngleStep/wavePeriod differ and
  must be re-derived, not inherited); monbg/setalpha/clearmonbg/blendoff =
  BODY_SLAM/FAINT_ATTACK. Assets ANIM_TAG_IMPACT (`battle-anim-hitsplat.json`)
  and ANIM_TAG_HANDS_AND_FEET (`battle-anim-hands-and-feet.json`) already
  extracted — no asset work at all. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.
- **Notes — stretch items 4-5 landed early.** `src/animation/counter.ts`
  (RAM-truth reducer at the RAM ages above) + `tests/animation/counter.test.ts`
  (9 pins, incl. the shared-helper reuse pins asserting the slides equal
  `slideMonToOffsetAtTick(..., 0..3)` and the shake equals
  `shakeMonOffsetAtTick(5, 0, 25, 1, age - 33)` for every age 34..82) are
  committed and exhaustively verified against the probe: **0 mismatches across
  all 88 frames x 2 orientations** for attacker x2/y2, target x2, and fist/
  hitsplat counts. The `SceneOnCounterConfig`/View seam in
  `sceneOnPresentation.ts` follows `SceneOnCrunchConfig`/`sceneOnCrunchView`
  exactly, plus HITMONTOP added to the presentation species union (no draw case —
  that is the promotion round's job). The two measured correction points the
  Tier-1 pins lock in: the elliptical lunge's negated-width floor is
  `-sin(phase,18) = -7` at phase 16 (not -6 — C and JS `>>` both floor toward
  -inf), and the fist sprites' `WaitAnimForDuration` keeps the final data[0]=0
  frame one extra age (9-age lifetime, so the fists OVERLAP like the hitsplats).
  Remaining for promotion: the draw case in `battleScene.ts` (must split the
  display latch — two-age lunge, one-age shake, one-age slides), a
  `counterPortable.ts`, the fixtures, the coverage entry and the inventory pin
  129->130 exact / 147->146 unsupported.
- **Notes — the orientation-shift trap did NOT bite: measured, not inherited.**
  COUNTER came out at opponent-front = player-back **+0** on every frame (both
  windows 207..294, all RAM events and all change-map events frame-aligned),
  against CRUNCH/SLASH's +4 and LICK's −1. The two orientations' changed-pixel
  counts still differ on the moving frames because the target is ONIX's front
  sprite in one and its back sprite in the other (player-back ONIX front x2 rest
  1, opponent-front ONIX back rest 0). A brief that had carried LICK's −1 (or
  CRUNCH's +4) forward would have produced a wrong reducer.

## MOVE_LICK promoted to exact — 129/276, both orientations at 73/73 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **128→129/276 exact**, 0 partial, 0 staged,
  **148→147 unsupported**. LICK was staged last round and is now proven by an
  exact move in both orientations through the shared seam. `lickPortable.ts`
  exits 0 at **LICK component 73/73; framebuffer 73/73** (player-back, frames
  214-286) and **component 73/73; framebuffer 73/73** (opponent-front, frames
  213-285), fresh evidence hashes player `72c763d6…`/RGB `86239977…`,
  opponent `2c8a668d…`/RGB `65f7c595…`, reproduced twice fresh. The inventory
  pin moved **128→129 exact / 148→147 unsupported**.
- **Did:** the MOVE_LICK draw case in `battleScene.ts` — LICKITUNG back/front
  (reusing the SLAM art) and ONIX front/back, the 16x32 lick sprite from
  `src/assets/gen/battle-anim-lick.json` (its OWN embedded palette,
  ObjNormal, `gOamData_AffineOff_ObjNormal_16x32`, 5 frames of 8 tiles) drawn
  at `lick.x - 8` / `lick.y - 16` (center-anchored OAM, change-map bbox
  byte-exact), and the split display latch (below). Wrote
  `tools/compare/lickPortable.ts` (modelled on slashPortable.ts, probe move
  122) + the two fixtures, the evidence test
  (`tests/animation/lickEvidence.test.ts`), the coverage entry, and moved the
  inventory pin.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the 16x32
  lick sprite displays ONE frame after its RAM state (creation RAM 235 →
  pixels 236, cmd transitions all at +1, `AnimLick_Step` invisible ramp
  blinks 246/248/249/…/285, gone 286), while the task-driven ShakeMon2 target
  x2 renders the shared sequence at display age − 22 — which lands its tick-0
  creation write (+1) on exactly one displayed frame: a real one-frame pixel
  step for the opponent-front ONIX back (idle x2=0, change-map 235 = RAM 234
  + 1) that coincides with the idle hold for the player-back ONIX front
  (x2=1, change-map first shake frame 237 = RAM 235 + 2). The target rests at
  its ONIX front-idle x2=1 through display age 21 and stays 0 after (the RAM
  restore at age 51 displays at 267 player / 266 opponent). **The orientations
  line up MINUS 1 (opponent-front = player-back − 1 on every frame), not +4 —
  a single age-indexed reducer serves both, only the battler geometry differs.**
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; LICK adds no new unproven components (the lick sprite =
  CUT-shape art with its own palette + ObjNormal 16x32, ShakeMon2 already
  exact via DRAGON_BREATH/SLASH, the target-anchored painter = SLASH).
- **Notes — the orientation trap did NOT bite this round, but the reason is
  probe-measured, not assumed.** The lick sprite's subpriority (38
  player-back / 28 opponent-front) sits IN FRONT of the ONIX front/back
  (40/30) in BOTH orientations, so it paints after the target every time; the
  two orientations' changed-pixel counts differ because the target is ONIX's
  front sprite in one and its back sprite in the other. **The creation-write
  question the SLASH round raised was answered from the pixels for LICK:**
  `AnimTask_ShakeMon2`'s tick-0 +1 creation write DOES reach exactly one
  displayed frame (the opponent-front 235 step), so the draw drives the shake
  from the shared `shakeMon2OffsetAtTick(1, 0, 16, 1, state.age - 22)` sequence
  directly, not the reducer's RAM truth. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contacts
  are the LICK draw case in `battleScene.ts` and the already-landed
  `sceneOnLickView` seam.
- **Notes — `npm test` (782 files / 7603 passed / 1 established skip),
  `npm run typecheck` and `npm run build` all green on the final tree.** The
  coverage entry was inserted with `json.dumps(indent=1)` serialization (one
  space per nesting level) — re-serialized the file rather than hand-indent an
  entry, so no whitespace drift.


## MOVE_LICK staged — both orientations isolated at 73 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** LICK stays **unsupported**. Coverage unchanged at **128/276 exact, 0
  partial, 0 staged, 148 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (LICKITUNG 108 —
  FRONTIER_MON_LICKITUNG_1, set 164, all four active slots LICK 122, item Sitrus
  Berry 142, nature QUIRKY 19, EV spread ATTACK|HP = 255/255, vs legal ONIX 95;
  player-back `mechanic-lick-player-lickitung-opponent-onix.json` and
  opponent-front `mechanic-lick-opponent-lickitung-player-onix.json` — exact
  copies of the SLAM pair with only LICKITUNG's four move slots changed 21→122,
  both verified to run with currentMove 122) and `tools/compare/lickProbe.py` — a
  dense probe copied from `crunchProbe.py` with script-pointer isolation to
  `Move_LICK` (0x082d36a8)..`Move_FOCUS_ENERGY` (0x082d36cf) capturing the
  `gLickSpriteTemplate` sprite (position, animNum/animCmdIndex/animDelayCounter
  at the TRUE 0x2a/0x2b/0x2c offsets, invisible, data words, subpriority, OAM),
  the `AnimTask_ShakeMon2` task and its state, both battlers' sprites, all 512
  palettes, software + hardware OAM and matrices, per-frame raw RGB + sha256.
  Probe run: `python3 tools/run-mgba-probe.py <out.json> -- python3
  tools/compare/lickProbe.py <scenario.json> <out.json> <rgb-dir> 122`. Plus the
  displayed-timing change maps banked under
  `tools/compare/evidence/lick-changemap-player.txt` /
  `lick-changemap-opponent.txt`. New standalone asset extractor
  `tools/extract/extract-lick-sprite.ts` (PAPERCUT-dodge) →
  `src/assets/gen/battle-anim-lick.json` with the Tier-1 byte-for-byte regen pin
  `tests/lickSpriteAsset.test.ts`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window
  73 frames each — player-back 214..286, opponent-front 213..285** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 214 / opponent frame 213 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 1,
  no move sprites, no move tasks (the `loadspritegfx` prefix is 21 frames of
  static screen). Determinism: each orientation re-run from scratch is
  byte-identical (player sha seq first/last `89b2f9c6…`/`b3ca9e95…`, opponent
  `f9c87bc9…`/`f9c87bc9…`); software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is every frame −1 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** **LICK** (gLickSpriteTemplate, gOamData_AffineOff_ObjNormal_16x32, 5 frames
  of 8 tiles, 2 ticks each, no loop, subpriority 38) created RAM 21 at
  (176,42) = target center (opponent-front (72,88) = ONIX back center; no
  mirroring needed — both sides at target). Anim cmds: cmd0 21, cmd1 22-23,
  cmd2 24-25, cmd3 26-27, cmd4 28-30, animEnded 31. **The flicker ladder IS the
  move** — from RAM 31 the sprite is forced invisible then toggles on the
  data[0]/data[1]/data[2] counter ladder (battle_anim_ghost.c:468
  `AnimLick_Step`): case 0 flips invisible every 2 ticks (visible at 33, 36, 39,
  42, 45), case 1 every 4 ticks (visible at 50, 55, 60, 65, 70), then
  DestroyAnimSprite RAM 71. **AnimTask_ShakeMon2(ANIM_TARGET, 1, 0, 16, 1)**
  created RAM 21 (task slot 0, spriteId 8 = target), drives the target sprite's
  x2 ∓1, toggling every 2 frames: x2 = −1 at 21, +1 at 23, −1 at 25, …, −1 at
  49, task destroyed RAM 51 and x2 restored to 0 (pre-shake ONIX front rest was
  x2=1, so the ONIX x2 does NOT return to 1 — it stays 0). No palette/BG changes
  at all: no monbg, no fadetobg, no setalpha/blendoff — BLDCNT/BLDALPHA/BLDY all
  0 the whole window (the only palette write is the LICK asset load in the
  static prefix, subpal 23 = 368-375, constant after frame 215). SE_M_LICK
  (song header 0x088fc25c) plays once at RAM 21 (SE1).
- **Displayed-timing mapping (player-back; opponent-front is every frame −1):
  ** the 16x32 LICK sprite first visible 236 (RAM 21 + 1, sprite-driven — the
  change map's 220px event); anim frame changes each display RAM+1 (cmd1→pixels
  237, cmd2→239, cmd3→241, cmd4→243); animEnded + invisible-ramp → the flicker
  blinks display at 246, 248, 249, 251, 252, 254, 255, 257, 258, 260, 261, 265,
  266, 270, 271, 275, 276, 280, 281, 285 (+1 from every invisible toggle RAM
  31-70) and the sprite is gone from pixels at 286 (destroy RAM 71 + 1). **The
  shake x2 is TASK-driven and displays TWO frames late (RAM 21 → pixels 237),
  the same TAKE_DOWN WindUpLunge / SLASH case — the measured change-map events
  are at 237, 239, 241, …, 267 (odd frames), exactly the 16 x2 toggles at RAM
  21, 23, …, 51 shifted +2.** Change map and RAM agree on every frame; the
  ledger defers to the change map.
- **Next:** promote LICK to exact. Build `src/animation/lick.ts` (RAM-truth
  reducer at the ages above: the 5-frame/2-tick 16x32 sprite at target center
  with the 5+5-step invisible flicker ladder and destroy at 71, the ShakeMon2
  x2 ∓1 2-frame toggle with the +2 display latch) + Tier-1
  `tests/animation/lick.test.ts`; `SceneOnLickConfig`/View seam in
  `sceneOnPresentation.ts`; the LICK draw case in `battleScene.ts` (lick art
  from `src/assets/gen/battle-anim-lick.json`, ONIX via existing species art); a
  `lickPortable.ts` at full-window exact (73 frames × 2 axes, both first frames
  kept); the fixtures, the coverage entry and the inventory pin 128->129 exact /
  148->147 unsupported.
- **Notes — stretch items 5-6 landed.** `src/animation/lick.ts` (RAM-truth
  reducer at the RAM ages above: the 5-frame/2-tick 16x32 sprite at target
  center with the 5+5-step invisible flicker ladder and destroy at 71, the
  ShakeMon2 x2 ∓1 2-frame toggle) + `tests/animation/lick.test.ts` (8 pins,
  incl. the shake-vs-shared-port pin asserting the closed form equals
  `shakeMon2OffsetAtTick(1, 0, 16, 1, age - 20).x2` for every age 21..51 and
  documenting the +1 creation write at age 20 as the same-frame transient,
  exactly the SLASH convention) are committed. `SceneOnLickConfig`/View seam
  in `sceneOnPresentation.ts` follows `SceneOnSlashConfig`/`sceneOnSlashView`
  exactly. Remaining for promotion: the draw case in `battleScene.ts` (must
  split the display latch — one-age lick sprite/flicker, two-age task-driven
  shake), a `lickPortable.ts`, the fixtures, the coverage entry and the
  inventory pin 128->129 exact / 148->147 unsupported. No boundary widening,
  no new unsupported-branch barrier, no shared-helper edit.
- **Notes — two new components, both staged.** `asset:ANIM_TAG_LICK` is a brand
  new asset extracted standalone (`tools/extract/extract-lick-sprite.ts`,
  deliberately NOT folded into the bulk `extract-battle-anim-assets.ts` which has
  the known silent-drop bug, PAPERCUTS.md) into
  `src/assets/gen/battle-anim-lick.json` with a Tier-1 regen pin
  (`tests/lickSpriteAsset.test.ts`): lick.png is 16x160, 4bpp, colortype 3 — 5
  stacked 16x32 frames of 8 tiles (0x0500 bytes = 40 tiles), own embedded
  palette. `sprite:gLickSpriteTemplate` is new: OAM is
  `gOamData_AffineOff_ObjNormal_16x32` (16x32 NOT 32x32, NOT ObjBlend, NOT
  affine — confirmed against the struct literal in src/data/battle_anim.h:142).
  `task:AnimTask_ShakeMon2` is already exact (DRAGON_BREATH/SLASH etc.) — reuse
  the existing implementation, do not re-port it. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.


## MOVE_SLASH promoted to exact — 128/276, both orientations at 46/46 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **127→128/276 exact**, 0 partial, 0 staged, **149→148
  unsupported**. SLASH was staged last round and is now proven by an exact move
  in both orientations through the shared seam. `slashPortable.ts` exits 0 at
  **SLASH component 46/46; framebuffer 46/46** (player-back, frames 73-118) and
  **component 46/46; framebuffer 46/46** (opponent-front, frames 77-122), fresh
  evidence hashes player `b1e38fbc…`/RGB `df7ff7a8…`, opponent `b23785fb…`/RGB
  `a08c6c22…`, reproduced twice fresh. The inventory pin moved **127→128 exact /
  149→148 unsupported**.
- **Did:** built `SceneOnSlashConfig`/`sceneOnSlashView` in
  `sceneOnPresentation.ts` (following the CRUNCH seam exactly) and the MOVE_SLASH
  draw case in `battleScene.ts` — CHARMELEON back/front and ONIX front/back, the
  two 32x32 slash slices from `src/assets/gen/battle-anim-slash-slice.json` (its
  OWN embedded palette, ObjNormal not ObjBlend, `gOamData_AffineOff_ObjNormal_32x32`)
  drawn at `slice.x - 16 / slice.y - 16` (center-anchored OAM), the ONIX
  front-idle x2=1 hold through display age 10, and the split display latch
  (below). Wrote `tools/compare/slashPortable.ts` (modelled on crunchPortable.ts,
  probe move 163) + the two fixtures, the evidence test
  (`tests/animation/slashEvidence.test.ts`), the coverage entry, the extra
  Tier-1 shake-vs-shared-port pin in `tests/animation/slash.test.ts`, and moved
  the inventory pin 127→128 exact / 149→148 unsupported.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the two slice
  sprites display one frame after their RAM state (slice1 created RAM age 4 →
  pixels 78, slice2 age 10 → pixels 84, cmd transitions all at +1, slice1 gone
  from pixels at 112, slice2 at 118, teardown blinks 96/98/…/116), while the
  task-driven ShakeMon2 target x2 displays TWO frames after its RAM write (RAM
  83 → pixels 85; change-map events 85, 87, 89, …, 117 vs RAM 83, 85, …, 115).
  **The creation write at RAM age 9 (+4) is a same-frame transient the reducer
  leaves at 0, but it DOES reach exactly one displayed frame (pixel 84)** — so
  the draw drives the shake from the shared `shakeMon2OffsetAtTick(4, 0, 18, 1,
  age - 11)` sequence directly, not from the reducer's RAM truth. The target
  rests at the ONIX front-idle x2=1 through display age 10 and stays 0 after
  (the RAM restore to 0 at age 44 displays at 46, outside the window — the ONIX
  x2 never returns to 1).
- **Notes — the painter order was the round's one trap, and it was NOT the
  "slice behind the target" one.** Lower subpriority wins in both orientations
  (slices 38/28 sit IN FRONT of the ONIX front/back 40/30 — measured by the
  slice's frame-0 sliver overwriting opaque ONIX pixels), so the slices paint
  after the target. The genuine flip is WITHIN the equal-subpriority pair:
  slice 1 (slot 3) paints ON TOP of slice 2 (slot 4) — the earlier OAM entry
  wins for equal priority AND equal Y (measured: the oracle's frame-3 slice-1
  pixels at 181,34 win over slice-2's frame-2 value there), opposite to the
  CRUNCH teeth/hitsplat rule where the later slot wins. Painter is
  target → slice2 → slice1 → attacker.
- **Notes — deliverable #4 landed as specified, with a correction to the brief's
  parenthetical.** The extra Tier-1 pin asserts `slash.ts`'s target-shake values
  equal `shakeMon2OffsetAtTick(4, 0, 18, 1, age - 9).x2` for every age 10..45
  (they agree on every RAM age the hardware reaches a frame) and documents that
  the shared sequence's index 0 (+4) is the same-frame creation transient —
  but that transient IS displayed (pixel 84), so the draw case special-cases it
  rather than the reducer. `shakeMon2.ts` untouched, `slash.ts` still duplicates
  the closed form; the pin keeps the two in sync.
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; SLASH adds no new unproven components (the slash slice = CUT's
  cutting-slice shape with its own palette + ObjNormal, ShakeMon2 already exact
  via DRAGON_BREATH, the slicing-seam painter = AERIAL_ACE/CUT).
- **Notes — no boundary widening, no new unsupported-branch barrier, no
  shared-helper edit.** The only engine contacts are the SLASH draw case in
  `battleScene.ts` (plus the `slashSliceFrameTileset` helper) and the
  `sceneOnSlashView` seam in `sceneOnPresentation.ts`. The coverage entry is
  flipped LAST, after both portables exited 0 at full-window exact.


## MOVE_SLASH staged — both orientations isolated at 46 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** SLASH stays **unsupported**. Coverage unchanged at **127/276 exact, 0
  partial, 0 staged, 149 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (CHARMELEON `SPECIES_CHARMELEON`
  5 — FRONTIER_MON_CHARMELEON_1, set 175, all four active slots SLASH 163, item
  Scope Lens 198, nature NAUGHTY, EV spread ATTACK|HP = 255/255, vs legal ONIX 95
  with the CRUNCH file's ONIX blocks unchanged; player-back
  `mechanic-slash-player-charmeleon-opponent-onix.json` and opponent-front
  `mechanic-slash-opponent-charmeleon-player-onix.json`, both verified to run with
  currentMove 163) and `tools/compare/slashProbe.py` — a dense probe copied from
  `crunchProbe.py` with script-pointer isolation to `Move_SLASH`
  (0x082cd3db)..`Move_STRUGGLE` (0x082cd415), capturing both
  `gSlashSliceSpriteTemplate` slice sprites (position, animNum, animCmdIndex,
  animDelayCounter, invisible, data words, subpriority, OAM), the
  `AnimTask_ShakeMon2`/`AnimTask_ShakeMon2_Step` target-shake task, both battlers'
  sprites, all 512 palettes, software + hardware OAM and matrices, per-frame raw
  RGB + sha256. NOTE: keeps the TRUE sprite offsets `0x2a`/`0x2b`/`0x2c` for
  animNum/animCmdIndex/animDelayCounter (never `0x18`/`0x19`). Probe run:
  `python3 tools/run-mgba-probe.py <out.json> -- python3 tools/compare/slashProbe.py
  <scenario.json> <out.json> <rgb-dir> 163`. Plus the displayed-timing change
  maps banked under `tools/compare/evidence/slash-changemap-player.txt` /
  `slash-changemap-opponent.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 46
  frames each — player-back 73..118, opponent-front 77..122** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 73 / opponent frame 77 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 2,
  no move sprites, no move tasks (the `loadspritegfx` prefix is 4-5 frames of
  static screen; the hw OAM shows the same one-frame-stale vblank quirk as CRUNCH
  at the very first frame but renders zero pixels). Determinism: player re-run
  byte-identical sha256 sequence (first/last `2f99ba4d`/`930d04ef`), opponent
  (`afcf16a2`/`f8213ef2`); software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is every frame +4 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** slice1 (gSlashSlice OAM ObjNormal 32x32, subpriority 38, animNum 0 =
  gSlashSliceAnimCmds1: 4 frames of 16 tiles, 4 ticks each, no loop) created RAM
  77 at (168,42) = target X_2 center (176) - 8; slice2 created RAM 83 at
  (184,42) = center + 8. (Y_PIC_OFFSET 42, so no mirroring needed — the ±8 is
  script args, both sides at target.) Slices' anim cmd transitions: slice1
  cmd0 77-79, cmd1 80-83, cmd2 84-87, cmd3 88-91, END 92; slice2 cmd0 83-85,
  cmd1 86-89, cmd2 90-93, cmd3 94-97, END 98. Anim end → RunStoredCallbackWhenAnimEnds
  → AnimFalseSwipeSlice_Step3 (battle_anim_effects_1.c:4756): data[0] counts
  every frame, invisible toggles every 2 frames, data[1] counts to 8 then
  DestroyAnimSprite. slice1 destroyed RAM 111 (last visible 110), slice2
  destroyed RAM 117 (last visible 116). SE_M_RAZOR_WIND (song header 0x088fe984)
  plays at slice1 and slice2 creation (SE1 tracks pan 14/-15 — pan X tracked, not
  the sound player's constant pan). **AnimTask_ShakeMon2(ANIM_TARGET, 4, 0, 18,
  1)**: created RAM 83 (task slot 0, spriteId 8 = target), drives target sprite
  x2 ∓4, toggling every 2 frames (data[3] interval 1): x2 = 1 (rest) → -4 at 83,
  4 at 85, -4 at 87, ..., -4 at 115, task destroyed RAM 117 and x2 restored to 0
  (117-118; pre-shake rest was x2=1, so the ONIX x2 does NOT return to 1 — it
  stays 0). No palette/BG changes at all: no monbg, no fadetobg, no setalpha, no
  blendoff — BLDCNT/BLDALPHA/BLDY untouched the whole window.
- **Displayed-timing mapping (player-back; opponent-front identical +4 on every
  frame): ** slice1 first visible 78, slice2 first visible 84 (both sprite-driven
  = RAM+1); slice anim frame changes each display RAM+1 (slice1 cmd0→cmd1 at 78-79
  boundary → pixels 81; slice2's cmd frames at 84/88/92 etc. all +1). **The shake
  x2 is TASK-driven and displays TWO frames late (RAM 83 → pixels 85), the
  TAKE_DOWN WindUpLunge case — the measured change-map events are at 85, 87, 89,
  ..., 117, one frame later than the sprite-driven +1 rule would place them.
  Slice teardown blinks (Step3 invisible toggles) display at 96, 98, 100, ...,
  116 (+1 from their RAM 95, 97, ... toggles); slice1 gone from pixels at 112
  (RAM 111 +1), slice2 gone at 118 (RAM 117 +1); shake's final x2→0 restore at
  RAM 117 displays at 119 (outside the 118 window, net-zero on screen). Change
  map and RAM agree on every frame; the ledger defers to the change map.
- **Next:** promote SLASH to exact. Build `src/animation/slash.ts` (RAM-truth
  reducer at the ages above: two slice sprites at target X_2∓8 with the 4-frame/
  4-tick cmds1 anim + the Step3 blink teardown, the ShakeMon2 x2 ∓4 2-frame
  toggle on the target sprite with the +2 display latch, no palette work) +
  Tier-1 `tests/animation/slash.test.ts`; `SceneOnSlashConfig`/View seam in
  `sceneOnPresentation.ts`; the SLASH draw case in `battleScene.ts` (slash art
  from `src/assets/gen/battle-anim-slash-slice.json`, ONIX via existing species
  art); a `slashPortable.ts` at full-window exact (46 frames × 2 axes, both
  first frames kept); the fixtures, the coverage entry and the inventory pin
  127->128 exact / 149->148 unsupported.
- **Notes — two new components, both staged.** `asset:ANIM_TAG_SLASH` is a brand
  new asset extracted standalone (`tools/extract/extract-slash-slice.ts`,
  deliberately NOT folded into the bulk `extract-battle-anim-assets.ts` which has
  the known silent-drop bug, PAPERCUTS.md) into
  `src/assets/gen/battle-anim-slash-slice.json` with a Tier-1 regen pin
  (`tests/slashSliceAsset.test.ts`). `sprite:gSlashSliceSpriteTemplate` is new
  but structurally identical to the already-exact `gCuttingSliceSpriteTemplate`
  (same 32x128 4-frame sheet, same 16-tile frames) EXCEPT: slash.png carries its
  OWN embedded palette (gBattleAnimSpritePal_Slash, unlike CUT which shares
  Impact's), and the OAM is ObjNormal not ObjBlend — the two differences the
  reducer must not conflate. `task:AnimTask_ShakeMon2` is already exact
  (DRAGON_BREATH etc.) — reuse the existing implementation, do not re-port it.
  No boundary widening, no new unsupported-branch barrier, no shared-helper
  edit; the only engine contact will be the promotion round's draw case.
- **Notes — stretch item 5 landed early.** `src/animation/slash.ts` (RAM-truth
  reducer at the RAM ages above) + `tests/animation/slash.test.ts` (8 pins) are
  committed this round, exhaustively verified against the probe: all 46 slice
  states (presence, position, tileOffset, invisible) byte-identical across the
  full window, and `targetX2` matches for the shake ages 10-43. The pre-shake
  x2=1 (ages 0-9) is the ONIX front-idle hold — a species-idle property the draw
  case supplies (TAKE_DOWN convention), NOT the move's state, so the reducer
  leaves it 0. **The shake x2 displays TWO frames late** (RAM age 10 → pixels
  window+12, every 2-frame toggle at +2; confirmed by change-map events 85, 87,
  ..., 117 vs RAM 83, 85, ..., 115) — the TAKE_DOWN WindUpLunge case, so the
  promotion draw case must split the display latch (one-age slices, two-age
  shake). Remaining for promotion: the `SceneOnSlashConfig`/View seam, the draw
  case, the portable, fixtures, coverage entry + inventory pin.

## Supervisor wind-down — IRON_TAIL, CRUSH_CLAW, TAKE_DOWN and CRUNCH all exact, 123→127; the change-map tool is the session's real output (2026-08-07 night animation session)

- **State:** coverage advanced **123→127/276 exact**, 0 partial, 0 staged, 149
  unsupported. `animation-main` is committed and green with no worker worktrees
  or branches left behind. 7 worker launches, 6 productive, 1 cap-kill (salvaged
  in full). `ANIMATION_DEFERRED.md` remains empty.
- **Did:** promoted **MOVE_IRON_TAIL** (135/135 both orientations),
  **MOVE_CRUSH_CLAW** (69/69 both), **MOVE_TAKE_DOWN** (98/98 player-back, 97/97
  opponent-front) and **MOVE_CRUNCH** (142/142 both). Added
  **`tools/compare/frame-changemap.py`**. Corrected two probes' sprite offsets
  and one shared-helper off-by-one (below).
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report — both portables per move, fresh, reproducing each fixture's pinned
  evidence and raw-RGB hashes, with an earlier move's portable as a control each
  time. Both CRUSH_CLAW and CRUNCH change maps re-derived from the probe output
  by the supervisor and diffed byte-for-byte against the committed files; CRUNCH's
  two independent fresh probe runs are identical. Final integrated `npm test`
  **776 files / 7342 passed / 1 established skip** and `npm run build` exit 0 on
  the merged tree.
- **Next:** the remaining zero-new-component moves by script size — COUNTER 31,
  DOUBLE_EDGE 32 (already staged), CRABHAMMER 36, MEGA_KICK 42, MAGICAL_LEAF 43,
  THUNDER 57. **Use the two-round cadence this session settled into:** round A
  stages (scenarios → dense probe → `frame-changemap.py` on both orientations →
  RAM-truth reducer + Tier-1 pins → seam), round B promotes (draw case →
  portable + fixtures → iterate to full-window exact → coverage entry + inventory
  pin + evidence test + ledger). Round B ran in 14-45 minutes every time the
  change map existed.
- **Notes — the change map is the unit of work that made this session fast.**
  `python3 tools/compare/frame-changemap.py <rgb-dir>` diffs every captured
  framebuffer against its predecessor and prints only the frames that changed,
  with pixel count and bbox, collapsing the rest into `static` runs. **That table,
  not the RAM trace, is the reducer's specification.** Measured effect: the first
  IRON_TAIL round spent a full 45-minute cap and wrote zero files trying to
  reconcile RAM frame numbers with pixels; once the map existed, the same move
  closed in 55 minutes, CRUSH_CLAW's promotion round took **14 minutes**, and
  every round since has hit its floor. Bank one per orientation under
  `tools/compare/evidence/` as part of staging — it is cheap, mechanical, and it
  is what a promotion round consumes.
- **Notes — the display-lag rule, now measured on five moves.** Every visible
  event displays exactly **one frame** after the RAM state that causes it — move
  sprites, palette writes and sprite-driven `x2` alike — with one measured
  exception: TAKE_DOWN's **task-driven** WindUpLunge `x2` displays **two** frames
  late (RAM 221 → pixels 223, confirmed independently by the change map and by
  hardware OAM x 40→38). A shared one-display latch therefore drifts by one on a
  task-driven axis; TAKE_DOWN's draw case splits the latch. Separately, some RAM
  transitions never reach pixels at all and must be modelled as RAM truth only:
  IRON_TAIL's third metallic-shine sweep (`ClearBattleAnimBg` already ran),
  CRUSH_CLAW's `setalpha`/`blendoff`, TAKE_DOWN's `blendoff`, CRUNCH's
  `setalpha`/`blendoff`.
- **Notes — write the staging entry in DISPLAYED frames, or label the column RAM.**
  The IRON_TAIL staging entry printed RAM frames under a heading that said
  "displayed". The worker could not make the reducer fit, correctly refused to
  write code it believed was wrong, and burned its whole cap. That is the single
  most expensive mistake available in this lane. TAKE_DOWN's entry then
  contradicted *itself* on the same point (claimed one frame, gave a two-frame
  example); the promotion brief called the contradiction out explicitly and the
  round landed clean. **When a ledger and a change map disagree, the change map
  wins.**
- **Notes — a brief that pre-supplies the mechanical facts buys a whole phase.**
  Script-pointer bounds come from `arm-none-eabi-nm reference/pokeemerald/pokeemerald.elf`
  (`Move_<NAME>` and the next label — these labels are NOT in the linker map and
  `bin/oracle symbols` returns null for them). Move ids, the species set carrying
  the move, and a species already referenced in this lane (so its geometry is
  known) are all one query each. Every round that got these in its brief hit its
  floor; the one that didn't, didn't.
- **Notes — two evidence defects found and fixed, neither load-bearing.**
  (1) `detectProbe.py` and `ironTailProbe.py` read `animNum`/`animCmdIndex`/
  `animDelayCounter` at 0x18/0x19/0x1a; `struct Sprite` puts them at 0x2a/0x2b/0x2c
  and 0x18 is `subspriteTables`, so all three were pointer bytes. Neither portable
  compared those fields, so no acceptance depended on them — re-running all four
  portables after the fix reproduced the same results with new twice-fresh
  deterministic hashes, re-pinned in the fixtures, the evidence tests, the
  coverage JSON and the ledger. (`dragonClawProbe`/`metalClawProbe` read 0x2b
  under the name `animNum`: a naming defect only — their portables compare it
  against the app's `animationFrame`, which IS the anim command index. Left alone
  deliberately.) (2) The TAKE_DOWN round ported `windUpLunge`'s sine and added a
  correction subtracting 1 from negative products that are not multiples of 256.
  `trig.c:517` defines `Sin` as an arithmetic `>> 8`, which floors — and JS `>>`
  floors identically, so the correction made 630 of 635 negative products off by
  one. Latent (TAKE_DOWN never reaches the negative half of the wave, and
  SPIKE_CANNON/BRICK_BREAK use amplitude zero), fixed before it could bite.
- **Notes — verification that earned its keep.** Re-running each portable myself
  caught nothing dishonest this session (a change from last session, when two of
  five fixture pairs lied), but re-reading each diff did: both defects above came
  from reading the diff, not from a failing test. Diffs were purely additive for
  every promotion except the inventory pin, so no sibling-regression surface
  existed — worth checking every time, because the one round that touched a shared
  helper is the one that introduced a bug.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened. Engine contact stayed inside
  `src/engine/battleScene.ts` animation draw cases plus the
  `src/animation/sceneOnPresentation.ts` seam.
  `tests/animation/factoryAnimationInventory.test.ts` now pins **127 exact / 149
  unsupported** — that pin moves on every promotion, so a fold that resolves
  `ANIMATION_COVERAGE.json` must re-run it.

## MOVE_CRUNCH staged — both orientations isolated at 142 frames; scenarios + dense probe + change maps banked (2026-08-08 worker)

- **State:** CRUNCH stays **unsupported**. Coverage unchanged at **126/276 exact, 0
  partial, 0 staged, 150 unsupported**. Nothing promoted; no pin moved. This is the
  staging round; promotion to exact (both orientations, a portable at full-window
  exact) is the NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (HOUNDOUR `SPECIES_HOUNDOUR` 228 —
  FRONTIER_MON_HOUNDOUR, set 119, all four active slots CRUNCH 242, vs legal ONIX
  95; player-back `mechanic-crunch-player-houndour-opponent-onix.json` and
  opponent-front `mechanic-crunch-opponent-houndour-player-onix.json`, both verified
  to run with currentMove 242) and `tools/compare/crunchProbe.py` — a dense probe
  copied from `takeDownProbe.py` with script-pointer isolation to
  `Move_CRUNCH` (0x082d05b3)..`Move_CLAMP` (0x082d0663) capturing every
  `gSharpTeethSpriteTemplate` bite sprite (all four, with affine animation number,
  position, velocity and data words — `AnimBite`/`_Step1`/`_Step2`), both
  `gBasicHitSplatSpriteTemplate` hitsplats, both `AnimTask_ShakeMon`/`_Step`
  target-shake tasks, the `fadetobg`/`restorebg` machinery (`Task_FadeToBg` +
  `gPaletteFade` struct + BLDCNT/BLDALPHA/BLDY + BG palettes — CRUNCH's dark fade is
  a real palette/BG change), both battlers' sprites, all 512 palettes, software +
  hardware OAM and matrices, per-frame raw RGB + sha256. NOTE: keeps the TRUE sprite
  offsets `0x2a`/`0x2b`/`0x2c` for animNum/animCmdIndex/animDelayCounter like
  takeDownProbe (never `0x18`/`0x19`). Probe run: `python3 tools/run-mgba-probe.py
  <out.json> -- python3 tools/compare/crunchProbe.py <scenario.json> <out.json>
  <rgb-dir> 242`. Plus the displayed-timing change maps banked under
  `tools/compare/evidence/crunch-changemap-*.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 142
  frames each — player-back 74..215, opponent-front 78..219** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 74 / opponent frame 78 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 2,
  hw OAM slots 11+ off-screen y=160, no shadow sprite. (The only quirk: hw OAM
  slots 9/10 show one-frame-stale content at the first frame — the hw OAM lags the
  software OAM by one vblank — but it renders zero pixels; the first ~10 frames of
  each window are the `loadspritegfx` prefix and byte-identical on screen. No
  `skipProbeFrames` needed, unlike TAKE_DOWN's opponent-front.) Determinism: player
  re-run byte-identical sha256 sequence (first/last `9c2b60a26f70`/`b54fa1b31c69`).
- **RAM timeline (player-back; opponent-front is every frame +4 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** monbg ANIM_TARGET (target→BG1, sprite invisible) RAM 81; `fadetobg BG_DARK`
  Task_FadeToBg + palette fade 0→16 RAM 84-100, BG_DARK load 102, fade-in 16→0 RAM
  103-119, done 121; `setalpha 12,8` (BLDCNT 0x3f40 / BLDALPHA 0x080c) RAM 122,
  cleared by `blendoff` RAM 171 (RAM-truth only — no blend pixel step, like
  CRUSH_CLAW); SE_M_BITE RAM 122 and 148 (rounds 1/2). **Teeth** (gSharpTeeth
  ANIM_TAG_SHARP_TEETH, 64x64 affine, subpriority 28): round 1 created RAM 122 at
  target-center ∓32 with xVel +819/+819 and −819/−819 (script animation 1 / 5),
  converge x2 3..31 over RAM 122-131, retract to 3 over 132-140, destroyed 141;
  round 2 created RAM 148 (x=+32,−32 anim 7 vel −819/+819 and x=−32,+32 anim 3 vel
  +819/−819), destroyed 167. The script `animation` arg is the `gAffineAnims_Bite`
  rotation: anim1 {181,−181,181,181} 45°, anim5 {−181,181,−181,−181} 225°, anim7
  {181,181,−181,181} −45°, anim3 {−181,−181,181,−181} 135° (256·cos/sin). **Basic
  hitsplats** (ANIM_TAG_IMPACT, static anim cmdIndex 0, matrix 303 scale):
  created RAM 134 at target center x=−8 (168,42) / round 2 RAM 160 x=+8 (184,42),
  destroyed 144 / 170. The x offset **mirrors for the player-side target**
  (opponent-front round 1 at (80,88)=72+8, round 2 at (64,88)=72−8 — BODY_SLAM
  convention). **AnimTask_ShakeMon(0, 7/8, 5/4, 2)** on the target sprite: round 1
  task RAM 134-146, y2=7 blocks at [134], [138-140], [144-146] (0 elsewhere),
  destroyed 147; round 2 task RAM 160-169, y2=8 blocks at [160], [164-166],
  destroyed 170 (num=4 makes the final toggle net-zero). `restorebg` (FadeToBg
  bgId=−1) RAM 176, fade out 176-193 / in 196-213, done 214, `end` cleanup 215.
- **Displayed-timing mapping (player-back; opponent-front identical +4 on every
  frame; EVERY event displays exactly ONE frame after its RAM cause — no TAKE_DOWN
  windup two-frame case): ** fade-out 86-101, fully-dark static 102-104, fade-in
  105-120; teeth round 1 displayed 123-141, gone 142; hitsplat 1 displayed 135-144,
  gone 145; shake round 1 y2=7 displayed 135, 139-141, 145-147 (isolated change-map
  events at 145 = shake 0→7 + hitsplat1 gone, and 148 = shake 7→0 & destroy); teeth
  round 2 displayed 149-168, gone 168 (teeth RAM 167 + shake RAM 167 combined);
  hitsplat 2 displayed 161-170, gone 171 (the 413px change-map event); shake round 2
  y2=8 displayed 161, 165-167 (final RAM 169 toggle is net-zero → static);
  teardown fade 178-193 + static 194-197 + fade-in 198-213, static tails 214-215.
  Change map and hw OAM agree on every frame; the ledger defers to the change map.
- **Next:** promote CRUNCH to exact. Build `src/animation/crunch.ts` (RAM-truth
  reducer at the ages above: the fade-out/static/fade-in palette darken, monbg
  invisible, setalpha/blendoff, the two teeth pairs' x2/y2 + rotation matrices,
  the two hitsplats with the mirrored anchor, the ShakeMon y2 1/3-frame block
  pattern) + Tier-1 `tests/animation/crunch.test.ts`; `SceneOnCrunchConfig`/View
  seam in `sceneOnPresentation.ts`; the CRUNCH draw case in `battleScene.ts` (dark
  bg via the existing `faintAttackBgState`/`faintAttackDarkBg`, sharp-teeth via the
  BITE art); a `crunchPortable.ts` at full-window exact (142 frames × 2 axes, both
  first frames kept); the fixtures, the coverage entry and the inventory pin
  126->127 exact / 150->149 unsupported.
- **Notes — zero new components.** Every component is already exact elsewhere:
  `gSharpTeethSpriteTemplate`/`AnimBite` = MOVE_BITE/`bite.ts` and MOVE_SECRET_POWER;
  `fadetobg BG_DARK`/`waitbgfadein`/`restorebg` = MOVE_FAINT_ATTACK (the
  `faintAttackBgState`/`faintAttackDarkBg` machinery already wired in
  `battleScene.ts` — reuse it, do not build a second dark-BG path); basic hitsplat =
  IRON_TAIL/TAKE_DOWN/BODY_SLAM; `AnimTask_ShakeMon` = IRON_TAIL/POISON_TAIL/MUD_SHOT;
  monbg/setalpha/clearmonbg/blendoff = BODY_SLAM/FAINT_ATTACK. No boundary widening,
  no new unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.

## MOVE_TAKE_DOWN promoted to exact — 126/276, both orientations at 98/98 and 97/97 portable-exact (2026-08-08 worker)

- **State:** coverage advanced **125→126/276 exact**, 0 partial, 0 staged, **151→150
  unsupported**. TAKE_DOWN was staged last round and is now proven by an exact move
  in both orientations through the shared seam. `takeDownPortable.ts` exits 0 at
  **TAKE DOWN component 98/98; framebuffer 98/98** (player-back) and
  **component 97/97; framebuffer 97/97** (opponent-front), fresh evidence hashes
  player `5dcaff8f…`/RGB `ebe70e6c…`, opponent `79807540…`/RGB `ad9b74ed…`,
  reproduced twice fresh.
- **Did:** built `SceneOnTakeDownConfig`/`sceneOnTakeDownView` in
  `sceneOnPresentation.ts` (SWABLU added to the presentation species union) and the
  TAKE_DOWN draw case in `battleScene.ts` — SWABLU back/front and ONIX front/back,
  the F_PAL_BG|F_PAL_BATTLERS black coeff-10 darken on the battlers + field
  (healthboxes/message/hitsplat outside the mask), the semi-transparent 12/8 basic
  hitsplat over the target-2 backdrop snapshot (BODY_SLAM convention), the ONIX
  front-idle x2=1 hold until the push displays, and the split display latch (below).
  Wrote `tools/compare/takeDownPortable.ts` + the two fixtures (opponent window via
  `skipProbeFrames: 1` / `ageOffset: 1` like DETECT), the evidence test, the
  coverage entry, and moved the inventory pin 125→126 exact / 151→150 unsupported.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the windup ramp
  displays 223-245, hold 246-255, lunge-out 256-265; palette darken 259-261,
  restore 262; hitsplat 259-267, teardown at 268; target slide-to-offset 262-265;
  shake 269-290 (269 first toggle, 290 final release); attacker slide-back
  295-299; target slide-back 300-306. **The two-frame windup latch HELD:** the
  task-driven WindUpLunge x2/y2 render exactly two ages after their RAM write
  (RAM 221 → display 223, change map + hw OAM x 40→38 agree), while every
  sprite-driven event renders one age after its RAM cause — the draw case splits
  the latch and flips the attacker back to the one-age rule at
  SLIDE_BACK_ATTACKER_AGE. `blendoff` clears BLDCNT at RAM 307 with no pixel step
  (RAM truth only, like CRUSH_CLAW).
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; TAKE_DOWN adds no new components to unproven leverage (windup
  = SPIKE_CANNON/BRICK_BREAK, slides = BODY_SLAM/STEEL_WING, ShakeMonInPlace =
  BODY_SLAM/SLAM, complex_palette_blend + basic hitsplat = REVERSAL/AERIAL_ACE/
  BLAZE_KICK/EARTHQUAKE/IRON_TAIL).
- **Notes — reducer correction found during promotion.** The staged reducer only
  modelled the opponent-side target: `Math.max(push, 0)` clamped the player-side
  SlideMonToOffset push (−16) to 0, the two slide-backs hardcoded `currentX2: 16`
  (the +16 arithmetic-shift rounding does not negate cleanly for the −16/−17
  player/opponent bases), and the lunge's sine-tail y2 1 was cut at age 50 even
  though the last task write holds on the sprite through the return slide. All
  fixed in `src/animation/takeDown.ts` with the Tier-1 pins extended to cover both
  orientations (still 10 tests); verified 0 RAM mismatches across both fresh probes.
  Also fixed the slideToOffsetCount to the dummy's real 5-age lifetime. No shared
  helper changed this round (the shared windUpLunge nonzero-sine branch was fixed
  by the supervisor last round); SPIKE_CANNON/BRICK_BREAK Tier-1 untouched. No
  boundary widening, no new unsupported-branch barrier; the only engine contacts
  are the TAKE_DOWN draw case in `battleScene.ts` and the one/two-frame seam.
