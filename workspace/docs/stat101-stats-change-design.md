# stat101 (S10A, ISSUES #166 prep): General_StatsChange: ROM ground truth, consumer map, bounded slices

Base: master `a36a956ac` (production src `e3c8092c`). Evidence only, new files only, no production change. Direct mGBA only (never the shared
HTTP oracles). Explicit lab seed `305419897` in every scenario. Every probe job ran twice in fresh processes: r1 == r2 byte for byte (22 / 22
outputs). Production was read only in a git-archive copy of the base. Files: `tools/integration/stat101*.{py,ts,sh}`,
`tools/integration/fixtures/stat101/` (source table, scenarios, receipts, exposure).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| What drives the animation? | `animArg` alone picks direction (tilemap, BG1 X 64 / 0, scroll -3 / +3), palette (7 stats + gray MULTIPLE) and sharply (blend 13 / hold 30, else 10 / 20). The battler picks the mask: a frozen OBJ-window struct copy of its live sprite (position, x2 / y2, elevation, affine). Species is read but unused. Behind a Substitute the ROM plays NOTHING. Both scenes play it (`Cmd_playanimation` exempts STATS_CHANGE; `Cmd_playstatchangeanimation` never checks HITMARKER_NO_ANIMATIONS) | `fixtures/stat101/source-table.md` |
| Assets | **Already extracted**: `src/assets/gen/stat-anim-banner.json` (64 tiles, both 32x32 tilemaps, all 8 palettes incl. `multiple`; `tools/extract/extract-stat-anim.ts`). Pixel helpers exist: `battleScene.ts` `statAnimBg1PixelAt` / `drawStatIncreaseBannerForBattler` / `drawStatDecreaseBannerForBattlerPalette`. No new extraction is needed | source table section 5 |
| ROM duration | **Active 75 rows (non-sharp) / 89 (sharply), in every variant, on both sides, in both scenes.** Non-sharp is SE-bound: the task ends at rel 67, but the script's `end` waits for SE_M_STAT_INCREASE / DECREASE (battle_anim.c Cmd_end `IsSEPlaying`, <= 90 frames) until rel 75. Sharply is task-bound: the task ends on rel 89, the same row as the fall. playanimation / playstatchangeanimation -> the next script instruction = **77 / 91 rows**. With no animation (Harden behind a Substitute) it is **1 row**. So each played animation **adds 76 / 90 frames** | `receipts/stat-anim.json`, `receipts/rows/*.tsv` |
| ON == OFF | **Timing identical 11 / 11** (rel, EVA / EVB, BG1 X / Y from Step2 on, WINOUT, BLDCNT, BG1CNT from Step1 on, copy slot). **Mask-rect crop identical 9 / 10.** Memento differs: in Scene ON the Memento body leaves the opponent ONIX at x2 = 1, so the copy (and the mask) shifts 1 px. Full screens also differ off-mask on Harden / Roar (the other battler's residual x2, Harden's own BG1 leftovers before Step2), so compare the mask crop, not the screen | same, `maskCropOnEqualsOff` |
| Production today | A 2-frame `stat` command per kernel stat-stage-change (STAT_TIMING / BATTLE_RESOLUTION_STAT_CHANGE_FRAMES = 2). It draws **no pixels**: `sceneOffStatStageBannerView` samples source ages 94 / 96, before the 118 ramp start, so eva = null. The kernel's STATS_CHANGE `animation` event is ignored by the presentation builder. Exception: **Double Team's live window (230 / 240 frames) already contains the stats change** (`liveMoveAnimation.ts:3233` statsBannerStartAge 163..229). All other status stat moves' live windows are body-only | section 3 |
| Exposure (census seeds 0..999) | **4,552 STATS_CHANGE animations in 878 / 1,000 battles** (5,698 `stat` commands: Curse's stat changes have no animation, so idle98's 4,689 "groups" overcounted). 23 are behind a Substitute (no ROM animation). **4,529 play: 3,125 non-sharp + 1,404 sharply = +363,860 frames** (2.5 % of the 14.6 M census frames). By class: up1 1,439 (Double Team's arg 21 alone 948), down1 1,299, up2 715, down2 685, multiple-up1 386, multiple-down1 24, multiple-down2 4, multiple-up2 0. Player 2,186 / opponent 2,366. 321 on elevated opponents (Ninjask 85, Jumpluff 32, ...). No non-normal Castform form at a stat change | `fixtures/stat101/exposure.json` |
| Sprite slots | The OBJ-window copy takes the **lowest free gSprites slot (3 in 10 / 10) and one OAM entry**. It is freed at task state 3: rel 67 (non-sharp, 8 rows before the fall) / rel 89 (sharply, the fall row). The order host already models this as STATS_CHANGE_CLASS_1 / _2 (`spriteOrderProductionPlans.ts:307`). `spriteOrderStatAnimationPlan` returns null for 56 / 58. **Memento (58) behaves exactly like class 2** (slot 3, freed on the fall row 89) | rows TSV `slots` / `inUse` |
| **Prototype: are the existing helpers exact?** | **Yes: 0 px on 20 / 20 windows.** `stat101ProtoCompare.ts` composites with the production helpers (`drawStatIncreaseBannerForBattler` / `drawStatDecreaseBannerForBattlerPalette`: 8-bit `blendChannel`, palette from `stat-anim-banner.json`, mask = the species pic tileset). It draws over the ROM's own last pre-banner row (rel 6), with per-row EVA from the receipts and visible BG1 Y = RAM of the previous row. Result: 0 px in the OBJ-window rect on every row through E+1, for all 10 scenarios x ON / OFF (incl. Memento ON x2 = 1 and the elevated GOLBAT). Same-row BG1 Y fails on every banner row (lag is 1). A hand-written 5-bit blend fails too. **Production's `battleCommandFieldSpriteOrigin` (elevation-aware) + the battler's live x2 / y2 == the ROM mask corner 20 / 20.** The only diff: the elevated opponent's enemy shadow (x 160..191, y 65..72, 200 px, 38 in the rect) comes back on row E+2. It is hidden for the whole animation (rows 0..E+1), like move bodies (`LIVE_MOVE_OPPONENT_SHADOW_GAP_ROWS`) | `fixtures/stat101/proto-compare.json` |
| Cross-check | `docs/issue69-omniboost-off-ground-truth.md` says Scene OFF skips `playstatchangeanimation`. The receipts contradict this: Cosmic Power / Tickle / Superpower / Memento play it in OFF. issue69's own 73-frame RNG-pinned gap before the first write (210 -> 283) is that animation. Its 2-frame write -> box-clear measurement stays valid | `stat-anim.json` (OFF windows) |

### 1a. ROM receipts (`receipts/stat-anim.json`, Scene ON row shown; OFF is identical except where noted)

| Scenario (move user -> animated battler) | Variant | animArg | Active rows A..E | Span to next instr. | Pointer after launch | Stat write, rows rel A | Mask rect (x, y, w, h) | Copy slot | timing ON == OFF | mask crop ON == OFF | r1 == r2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| harden-ply-primeape-onix | up1 DEF single, player PRIMEAPE | 16 | 75 | 77 | StatUpPrintString+0 | ON -109 / OFF -38 | [40, 55, 64, 64] | 3 | yes | yes | yes |
| agility-opp-golbat-snorlax | up2 SPEED sharply, elevated opponent GOLBAT | 41 | 89 | 91 | StatUpPrintString+0 | ON -94 / OFF -38 | [144, 3, 64, 64] | 3 | yes | yes | yes |
| growl-ply-primeape-onix | down1 ATK, big opponent picture ONIX | 22 | 75 | 77 | StatDownPrintString+0 | ON -77 / OFF -38 | [144, 10, 64, 64] | 3 | yes | yes | yes |
| screech-opp-golbat-onix | down2 DEF sharply, player ONIX | 47 | 89 | 91 | StatDownPrintString+0 | ON -70 / OFF -38 | [40, 48, 64, 64] | 3 | yes | yes | yes |
| cosmic-power-ply-snorlax-golbat | multiple up1 (DEF + SPDEF), player SNORLAX | 55 | 75 | 77 | CosmicPowerDoMoveAnim+12 | +78, +169 | [40, 59, 64, 64] | 3 | yes | yes | yes |
| tickle-opp-golbat-snorlax | multiple down1 (ATK + DEF), player SNORLAX | 57 | 75 | 77 | TickleDoMoveAnim+19 | +79, +170 | [40, 59, 64, 64] | 3 | yes | yes | yes |
| superpower-opp-machamp-snorlax | multiple down1, self (secondary, AtkDefDown) | 57 | 75 | 77 | AtkDefDown+10 | +79, +174 | [144, 9, 64, 64] | 3 | yes | yes | yes |
| memento-ply-primeape-onix | multiple down2 sharply, opponent ONIX | 58 | 89 | 91 | EffectMemento+42 | +93, +193 | ON [145, 10, 64, 64] / OFF [144, ...] | 3 | yes | **no (x2 = 1)** | yes |
| icy-wind-ply-primeape-golbat | secondary SPEED -1 on the elevated opponent | 24 | 75 | 77 | StatDown+7 | -1 | [144, 3, 64, 64] | 3 | yes | yes | yes |
| roar-intimidate-ply-primeape-onix | Intimidate (Roar-forced switch-in) on the player | 22 | 75 | 77 | IntimidateActivates+73 | -3 | [40, 55, 64, 64] | 3 | yes | yes | yes |
| harden-behind-sub-ply-primeape-onix | Harden behind a Substitute (baseline) | none | 0 (no rise) | **1** | StatUpPrintString+0 | n/a | n/a | n/a | yes | n/a | yes |

Multiple +2 (56) has no Gen 3 source in singles (no move raises two stats by 2) and does not occur in the census.

### 1b. Row model (rel = rows after A, the gAnimScriptActive rise = the row playanimation / playstatchangeanimation executes; T = 10 / 13, W = 20 / 30)

| rel | State (identical across all variants except where noted) |
|---|---|
| 0..1 | nothing visible (BG1CNT / BG1 X / Y may hold the previous animation's leftovers) |
| 2 | Step1 registers visible (BLDCNT 0x3F42, WINOUT 0x3F3D, BG1CNT char base 1 / priority 0, BLDALPHA (0, 16)); the copy sprite is in gSprites slot 3 (RAM) |
| 4.. | RAM gBattle_BG1_X = 64 (down) / 0 (up); gBattle_BG1_Y = +-3 * (rel - 4) from rel 5 (up +, down -). The screen on row r shows RAM Y of row r - 1 (VBlank copy; the existing helpers call this the "+1 render lag") |
| 6 | the OBJ-window OAM entry appears (affine, 64x64, at the battler's OAM position) |
| 7 .. 5 + 2T | EVA = floor((rel - 5) / 2), EVB = 16 - EVA: the first visible row is 7 (EVA 1); T reached at rel 25 (13 sharply: rel 31) |
| 5 + 2T .. | hold at T: rel 25..46 (22 rows) / 31..62 (32 rows) |
| fade | EVA - 1 every 2 rows: last EVA 1 at rel 63-64 / 85-86, EVA 0 at 65 / 87; BG1 Y stops at +-180 / -246 |
| 67 / 89 | task state 3 (RAM): copy sprite freed, BG1 X / Y reset |
| 68 / 90 | registers restored visible (BLDCNT 0, WINOUT 0x3F3F, DISPCNT ^= OBJWIN: the XOR clears a stale OBJWIN bit too) |
| 69 / 91 | OAM entry gone |
| 75 / 89 | gAnimScriptActive falls (E) |
| 77 / 91 | the next script instruction executes (no animation: rel 1) |

Visible banner rows: rel 7..64 (58 rows) / 7..86 (80 rows). Compositing: inside the OBJ window BG1 (priority 0, TGT1) blends over whatever lies under it (TGT2 = all layers), but only where its tile pixel is opaque. Outside the window BG1 is hidden (WINOUT low byte 0x3D), so nothing else blends.

## 2. ROM ground truth: method

`stat101Probe.py` (one scenario, one scene, fresh direct mGBA, explicit lab seed) samples every row: script pointer, gAnimScriptActive, gCurrentMove,
animArg (via gBattleSpritesDataPtr), gBattle_BG1_X / Y, DISPCNT / BGxCNT / WININ / WINOUT / BLDCNT / BLDALPHA / BLDY, BG / OBJ palette RAM digests,
OBJ-window OAM entries, gSprites inUse count + OBJ-window slots + both battler sprites (x, y, x2, y2, invisible), gBattleMons statStages, the
screen sha, and inside every gAnimScriptActive window: the changed-pixel count + bbox vs the row before the rise, per-scanline CRC32 and the
OBJ-window rect crop sha (`mc`). `stat101Receipts.py` keeps the windows with StatsChangeAnimation_Step1's register signature, skipping move bodies
(idle98's pointer heuristic). It writes `stat-anim.json` (timeline, mask, slot, script span, stat writes, ON == OFF signatures) and one row
TSV per window (A-1..E+3: EVA / EVB / BG1 / WINOUT / BLDCNT / BG1CNT / OAM entry / slots / delta / screen sha / mask-crop sha). No raw RGB is
committed. `STAT101_DUMP=<dir>` writes the raw window frames (npz) to the gitignored scratch dir for a local comparator.

Scenarios (`stat101Stage.py`, from the accepted Bulk Up templates; species are internal ids; EV totals <= 510): the move user's lead takes the
move x4, the other lead keeps Tackle x4. Intimidate: the player Roars, both opponent bench mons are Intimidate GYARADOS / GRANBULL. Lab quirk:
"Foe X was dragged out!" and "The SUBSTITUTE took damage!" wait for A here, so those scenarios press A once (see PAPERCUT).

## 3. Production consumer map

| Layer | Where | Today | Change needed |
|---|---|---|---|
| Kernel event (playanimation) | `battleScriptStatbuffchangeOpcode.ts:210` (PLAYANIMATION_ANIM_TYPES, B_ANIM_STATS_CHANGE reads sB_ANIM_ARG1) | emits `animation` {animationId "STATS_CHANGE", battler, arguments [animArg]} | none (gameplay / RNG untouched) |
| Kernel event (playstatchangeanimation) | `battleScriptPlaystatchangeanimationOpcode.ts:259-276` | the same event with statAnimId (one per group, statAnimPlayed respected) | none |
| Event order (census dump, `stat101Exposure.ts` debug) | | status stat move: `stat-stage-change > MOVE_ANIMATION > STATS_CHANGE > message`; secondary: `hp-change > stat-stage-change > STATS_CHANGE > message`; Intimidate: `stat-stage-change > STATS_CHANGE`; playstatchangeanimation: `STATS_CHANGE > (stat-stage-change > message) x N`; Curse: stat changes with NO STATS_CHANGE | the new command goes at the STATS_CHANGE event position. For status moves that is AFTER the move-animation command (production presents `stat` before the body, the RAM write order) |
| Presentation builder | `battleResolutionPresentation.ts:3500-3528` (`stat`, STAT_TIMING 2) | STATS_CHANGE `animation` events fall through (no branch) | add a branch like SUBSTITUTE_FADE (`:3387` records `at: commands.length`; `:3740-3745` splices the command): a new `stats-change` command {eventSequence, battler, argument, timing {minimumFrames 76 / 90}}. Skip it when the battler is behind a Substitute: field `substituteDoll` / beforeRules STATUS2_SUBSTITUTE, or better a kernel-side behindSubstitute fact. Keep the 2-frame `stat` command as is: its write -> box-clear frames are accepted (issue69) |
| Duration | `battleResolutionPresentationRender.ts:945` (`case "stat"`), the per-type duration switch | stat = max(2, 2) | `case "stats-change"`: timing.minimumFrames (76 / 90) |
| Render ON | `battleScene.ts` `renderBattleResolutionLiveView:55235` -> non-move effects -> `renderBattleResolutionSceneOffView` | `stat` effect -> `sceneOffStatStageBannerView` (eva null at its ages: no pixels) | a `stats-change` effect drawn over the live field: banner rows rel 7..64 / 7..86 with the 1b model, mask = the battler's pic at `battleCommandFieldSpriteOrigin` (elevation) + live x2 / y2 (`liveBattlerX2History`, already "keep" for STATS_CHANGE), via the existing exact helpers (prototype 0 px); hide the elevated opponent's shadow through E+1 |
| Render OFF | the same `renderBattleResolutionSceneOffView` (OFF and ON share it for non-move commands) | as above | the same effect. OFF has no residual x2 (no move bodies) |
| Live move windows that already own it | Double Team 104 (`liveMoveAnimation.ts:3233`, 230 / 240 frames incl. the banner at ages 163..229). Sand Attack's `accuracyBanner` (ages 112..171) lies outside its 58-frame live window: never drawn live. Feather Dance's banner is skipped under liveField | | Decide in slice (c): (1) exempt the STATS_CHANGE after a LIVE Double Team body in Scene ON, or (2) trim the Double Team window to its body (script end row 157, activation row 161) and let the generic command own the banner. (2) is uniform but moves the Double Team pins. In Scene OFF there is no Double Team window, so the command is always emitted |
| Sprite order host | `liveSpriteOrderHost.ts:453` consumes STATS_CHANGE (plan via `spriteOrderStatAnimationPlan`, class 1 / 2; 56 / 58 -> null) | already advances order state per event | extend the plan to 58 (and 56) = class 2 (Memento receipt). Check that the host binds the unit to the new command's rows (rel 2 alloc, freed rel 67 / 89), not to the `stat` command |
| Allocator | `liveMoveSpriteAllocator.ts:115` lists STATS_CHANGE as a general animation | | the copy takes the lowest free slot for rows 2..66 / 2..88 |
| Presentation RNG | `presentationRngHost` ticks every frame | | the +76 / +90 frames move later Random2 (D3) draw words, as in idle98: their pixels change from the first draw age on and they stay live. No gameplay RNG is involved (AnimTask_StatsChange has no Random()) |
| Census / tests | | | **Pins:** direct `tests/battleResolutionPresentation.test.ts` (:1800, :2049-2056, :2158), `tests/battleResolutionStatsWontIncreaseInsurance.test.ts`, `tests/silverWindAllStatsUpRepro.test.ts`, `tests/battle2CommandAdapterEquivalence.test.ts`, `tests/battleTurnPortability.test.ts`. Indirect: every route-level timing pin that crosses a stat change (878 / 1,000 census battles have one). Not enumerated here: no full-suite prototype run. Slice (c) produces `pins.json` the idle98 way |

Gameplay outcomes, RNG, damage, turn order and facility state stay untouched: the change is a presentation command plus a renderer, and the
kernel events already exist.

## 4. Slice plan (each <= 60 min; run from `workspace/`; prototypes on git-archive copies, never the live checkout)

Slices (a) + (b) are de-risked by the prototype: the pixel path already exists and is exact. The new work is the per-row reducer, the
command, the mask corner (sprite origin + live x2 / y2) and the shadow hide.

**(a) Pure reducer + assets binding (no timeline change).** Add a pure module (e.g. `src/animation/statsChange.ts`):
`statsChangeParams(animArg)` -> {direction, palette key, sharply} (section 2 of the source table; 56 = multiple up2) and
`statsChangeRow(params, rel)` -> {eva, evb, bg1X, bg1YRam, bg1YVisible, copyAlive, maskOamVisible, active} (1b). Tier-1 test pinning every row of
all 20 committed TSVs (`fixtures/stat101/receipts/rows/*.tsv`: EVA / EVB / bg1x / bg1y from Step2 on / slots / act).
Acceptance: `npx vitest run tests/statsChangeReducer.test.ts`, `npm run typecheck`, `npm run test:smoke`, `npm run build`.

**(b) Dense ROM comparator on the reducer (no timeline change).** Switch `stat101ProtoCompare.ts` (already 0 px with receipt-driven
EVA / BG1) to the (a) reducer's rows and to the production corner (`battleCommandFieldSpriteOrigin` + x2 / y2) instead of the ROM rect.
Hide the elevated-opponent shadow through E+1 and compare the whole window incl. E+2.
Acceptance: `sh tools/integration/stat101Run.sh <fresh>` (dumps + comparator) -> 20 / 20 windows 0 px on every row, `proto-compare.json`
regenerated with a reducer column.

**(c) Presentation command + duration, both scenes.** `stats-change` command at the STATS_CHANGE event (SUBSTITUTE_FADE pattern), 76 / 90
frames, none behind a Substitute, Double Team decision (section 3). Tier-1: command order for the five paths (status move, secondary, Intimidate,
playstatchangeanimation, behind-Substitute = none). Anchor test: on one production route per path, the following message's first glyph
lands 76 / 90 frames later than on the base (the ROM: print instruction at A + 77 / 91 vs X + 1). Run the full suite in a patched archive copy
(its own git repo), list the moved pins (`fixtures/stat101/pins.json`, idle98 `idle98Pins.py` pattern), then move them.
Acceptance: `npm test` (patched copy: only timing pins move; then green after moving them), `npm run build`, census delta
`liveShareCensus.ts --seeds=0..999` shards: 0 status changes, inserted commands == 4,529 (+ the Double Team choice), +363,860 frames +- the Double Team
adjustment, battle digests excluding frames identical.

**(d) Live renderer wiring (ON and OFF share it).** Draw the `stats-change` effect with the (a) reducer over the live field: mask from the
battler's live art / position / residual x2 / elevation, palette and tilemap from `stat-anim-banner.json`. Acceptance: the (b) comparator
run through the production render path (`renderBattleResolutionLiveView` with a constructed field per scenario) -> 0 px on 20 / 20 windows,
including Memento ON (x2 = 1) and the elevated GOLBAT (y = 3). `npm test`, `npm run build`.

**(e) Order / allocator host effects.** Bind the STATS_CHANGE order unit to the new command rows. Extend `spriteOrderStatAnimationPlan` to
56 / 58 (class 2, Memento receipt: slot 3, freed on the fall row). Check that live order after a stats change is unchanged on the census
(no live -> declined flips). Acceptance: `npx vitest run tests/*SpriteOrder*.test.ts tests/*Allocator*.test.ts`, census live share: 0
status changes vs (c).

**(f) Census + audit.** Rerun `stat101Exposure.ts` / `stat101ExposureSummary.py` on the landed tree (played == inserted commands), the
liveShareCensus delta, and ANIMATION_VERIFICATION claims (one general animation, both scenes, dense receipts = this pack). Acceptance:
`sh tools/integration/stat101Run.sh <fresh> --census` ALL SAME on the base. On the landed tree: inserted 4,529 commands, +363,860 frames
(or the documented Double Team variant), 0 gameplay digest changes.

## 5. Risks / open decisions

- Double Team (948 census events, the largest single animArg) already presents the banner inside its live window: decide in (c).
- The non-sharp duration is SE-bound (rel 67 -> 75 waits for the stat SE). Sound volume does not matter (m4a runs regardless), so the
  constant holds whenever the SE starts (Step2 always plays it).
- The production anchor offset δ between the ROM's playanimation row and the start of the new command is assumed to be 0 (production's next
  command already starts on the ROM's baseline X + 1 row). (c)'s anchor test must confirm it per path. For status moves it depends on the
  move-animation command's post rows (idle98 universal rows, ISSUES #165 / #167).
- Scene OFF's no-hit pause (ISSUES #167) is separate: the OFF route also lacks the 35-frame Pausex20 before every status stat move's
  stats change (receipts: OFF write at -38 = Pausex20 + the instruction rows).

## 6. Reproduction (from workspace/)

```
sh tools/integration/stat101Run.sh <fresh-out-dir-inside-the-repo>            # archive copy of a36a956ac, re-stage (== committed), 22 probe jobs x2
                                                                                # (r1 == r2, == receipts/probe-sha256.txt), receipts == committed,
                                                                                # prototype (r1 dumps -> stat101ProtoCompare.ts) == proto-compare.json
sh tools/integration/stat101Run.sh <fresh-out-dir-inside-the-repo> --census   # + the census exposure (seeds 0..999, 10 shards) == exposure.json
# pieces:
python3 tools/integration/stat101Stage.py <dir>/scenarios
STAT101_PY=<mgba-venv python> sh tools/integration/stat101Job.sh <outdir> on|off <scenario.json>      # from an archive copy's workspace/
python3 tools/integration/stat101Receipts.py <probe-r1> <probe-r2> tools/integration/fixtures/stat101/scenario-index.json <out-dir>
node --experimental-strip-types --no-warnings tools/integration/stat101Exposure.ts --seeds=A..B --out=<f.jsonl>   # in the archive copy
python3 tools/integration/stat101ExposureSummary.py <exposure-dir> <out.json>
STAT101_DUMP=<dir> ... stat101Job.sh ...; python3 tools/integration/stat101NpzToRaw.py <dir> tools/integration/fixtures/stat101/receipts/stat-anim.json <raw>
node --experimental-strip-types --no-warnings tools/integration/stat101ProtoCompare.ts <raw> <out.json>                  # in the archive copy
```

Gates run: `sh tools/integration/stat101Run.sh <fresh> --census` ALL SAME twice (02:13 -> 02:15 without the prototype step, 02:17 -> 02:19
with it). `git diff --check` clean and `git status --short` = only new stat101 files at every commit (explicit paths).
