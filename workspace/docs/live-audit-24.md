**DEFECT (land97): an elevated opponent attacker's first lead row misses the enemy shadow, 200 px on row 0 of every such lead command (Shadow Punch HAUNTER, Bite CROBAT, Sludge Bomb GOLBAT measured; 19 of the 40 lead moves have an elevated Factory user). Temp patch `tools/integration/fixtures/audit-24/audit24-lead-row0.diff`: 0 px on every lead row of all 18 lead windows.**

# Live audit 24: the two timing folds (land97 idle lead rows, fp100 Focus Punch age-131 lag)

Evidence only, new files only (`audit24*` tools, `tools/integration/fixtures/audit-24/`, this doc). Master `ae0eb8ed3` (production src
`8706d10c`). Fresh direct mGBA (`ctl95Probe.py`, 40-row RGB tail), explicit lab seed in every lab (305419897 / 38177486), every lab
twice, **r1 == r2 on 24 / 24** (`receipts/probe-sha256-s1.json`). Production renders are production code as committed (or the temp
patch on a git-archive copy).

## 1. Results first

| Question | Answer |
|---|---|
| land97: are the N rows before production's age 0 the static age-0 image, 0 px against the lead rows production now draws? | **Yes on 14 / 18 windows; NO on row 0 of the 4 elevated-opponent windows (3 moves; 200 px: the enemy shadow).** Direct dense ROM vs production, every row, both runs (idle94 had this by transitivity only). The ROM's activation row A still shows the pre-activation field: its sha equals A-1. The RAM hide (`shadow.invisible`) is set on row A, but the OAM change shows from A+1 (stat102's `enemyShadowHidden` rows 1 .. E+1). Production's lead row 0 draws the age-0 image, with the shadow already hidden |
| ... and is the body after the lead unchanged? | **Yes.** Body rows N .. N+D-1 are 0 px on 12 / 18 windows. The other 6 are all Shadow Punch: rows 91..106 (+109) in the age-90 lag phase (4 windows, TIMING-PHASE, below), the GENGAR off-Factory pair (opponent rows 109..112) and the trail row 113 (ARTIFACT). None of them is a lead row or a land97 effect |
| Substitute-swap route of a lead move | **Bite 44 (lead 10), RATICATE behind a Substitute, 3 bodies per side: composite 126 / 122 rows at 0 px, swap tails k+1 / k+2 at 0 px** (`attdollLiveCheck.ts`, production's composite). Production's lead on the doll field is **0** (on the plain field it is 10) |
| Scene OFF unchanged | Census battle 38 (CROBAT Bite x3, Sludge Bomb, Scary Face, Knock Off): **OFF 8,226 frames, 231 commands, every row identical** in pre-land97 (`64f0ae997`), master, and master + temp patch. ON: 10,350 -> 10,426 (the lead rows), the same command key sequence |
| fp100: 10 more Focus Punch bodies (4 new species pairs, both sides) | **Lag phase (`event`, a lag at 131): 5 / 5 windows 0 px on all 155 rows. No-lag phase: 5 / 5 windows differ on rows 132..147 ONLY** (HITMONLEE opponent 18,238 px/row, POLIWRATH opponent 17,587, POLIWRATH player 17,676). Exactly fp100's documented residual |
| fp100 phase counts | Player 3 : 1 (event : no-event), which agrees with fp100. **Opponent 2 : 4: in these labs the no-lag phase is the majority, and body 0 does not lag.** This weakens fp100's "bodies 0 and 1 lag in every lab". Pooled with fp100: opponent **16 : 7**, player **12 : 6**, so the policy (event) stays dominant on both sides |
| New, not in either fold | **Shadow Punch 325 has an fp100-style optional lag at body age 90**, in 4 / 6 fresh bodies (HAUNTER 3 / 4). `restorebg` runs `LoadDefaultBg` on that frame. In the lag phase the fade-in rows 91..106 are one BLDY step darker (~17.5k px/row). For the elevated opponent, row 109 (shadow return) also differs, 200 px. Production renders the no-lag phase, which is the phase of the accepted HAUNTER-ONIX fixtures. A D4 candidate; flagged, not fixed |

## 2. Verdicts per window

Window = ROM activation A .. A+N+D-1. Production row j = effect age max(0, j - N), as at `battleResolutionPresentationRender.ts:1453`.
N and D come from production (`liveMoveIdleLeadRows`, `liveMoveAnimationDuration`). px are r1 / r2 (equal everywhere).
"field" = the temp patch's row 0 (no move effect on lead row 0).

| Window (attacker -> foe, side) | N / D | lead px (prod / patch) | body | Verdict |
|---|---|---|---|---|
| Bite RATICATE -> SKARMORY, ply | 10 / 26 | 0 / 0 | 0 px | EXACT |
| Bite RATICATE -> SKARMORY, opp | 10 / 26 | 0 / 0 | 0 px | EXACT |
| **Bite CROBAT -> LAPRAS, opp (elevation 6, Factory set)** | 10 / 26 | **200 (row 0)** / 0 | 0 px | **DEFECT** |
| **Sludge Bomb GOLBAT -> SNORLAX, opp (elevation 8, Factory set)** | 4 / 160 | **200 (row 0)** / 0 | 0 px | **DEFECT** |
| Razor Leaf VENUSAUR -> QUAGSIRE, ply / opp | 13 / 139 | 0 / 0 | 0 px (152 / 152 rows) | EXACT x2 |
| Dizzy Punch KANGASKHAN -> STEELIX, ply / opp | 13 / 69 | 0 / 0 | 0 px (82 / 82) | EXACT x2 |
| Harden KINGLER -> SNORLAX, ply / opp (1-row lead) | 1 / 101 | 0 / 0 | 0 px (102 / 102) | EXACT x2 |
| Ember NINETALES -> SNORLAX, ply / opp | 4 / 63 | 0 / 0 | 0 px (67 / 67) | EXACT x2 |
| Shadow Punch HAUNTER -> LAPRAS, ply | 8 / 106 | 0 / 0 | rows 91..106 (lag at 90) | TIMING-PHASE |
| Shadow Punch HAUNTER -> SKARMORY, ply | 8 / 106 | 0 / 0 | row 113 only, 1,451 px | ARTIFACT (trail) |
| **Shadow Punch HAUNTER -> LAPRAS, opp (elevation 4)** | 8 / 105 | **200 (row 0)** / 0 | rows 91..106 + 109 (lag at 90) | **DEFECT** (row 0) + TIMING-PHASE |
| **Shadow Punch HAUNTER -> SKARMORY, opp** | 8 / 105 | **200 (row 0)** / 0 | rows 91..106 + 109 (lag at 90) | **DEFECT** (row 0) + TIMING-PHASE |
| Shadow Punch GENGAR -> LAPRAS, ply (off-Factory pair) | 8 / 106 | 0 / 0 | rows 91..106 (lag at 90) | TIMING-PHASE |
| Shadow Punch GENGAR -> LAPRAS, opp (off-Factory pair) | 8 / 105 | 0 / 0 | rows 109..112, 74 px | ARTIFACT (latent, below) |
| Substitute-swap Bite RATICATE, ply x3 / opp x3 | lead 0 (doll field) | composite 0 px, 126 / 122 rows + tails | — | EXACT x6 |
| Focus Punch, 5 lag-phase bodies (opp HITMONLEE b1, POLIWRATH b1; ply HITMONLEE b0 b1, POLIWRATH b0) | — | 155 / 155 rows 0 px | — | EXACT x5 |
| Focus Punch, 5 no-lag bodies (opp HITMONLEE b0 b2, POLIWRATH b0 b2; ply POLIWRATH b1) | — | rows 132..147 only | — | TIMING-PHASE x5 (fp100's documented other phase) |

Focus Punch phase table: `receipts/fp-phase.tsv` (lag ages per body from the gRng2Value repeats; every body also lags at 30 and 151 / 152).

### DEFECT: lead row 0 of an elevated opponent attacker

- **Mechanism.** On the ROM, row A (the activation, `gAnimScriptActive`'s rising edge) is scanned out as the pre-activation field:
  - its sha equals A-1 (`receipts/rowdiff-shadow-punch.txt`: shas A-2..A shared, A+1.. the age-0 image);
  - the shadow's RAM `invisible` flips on row A, but the OAM change shows one row later.
  - production's lead row 0 is effect age 0, whose image has the shadow hidden (stat102's `enemyShadowHidden` rows 1 .. E+1 in body terms);
  - so row 0 differs by the 32x8 shadow (bbox 160,65..191,72, 200 px).
  - For a non-elevated attacker (no shadow), the pre-activation field and the age-0 image are the same image, so idle94's 20 / 20 (all PRIMEAPE) and the other 14 windows here could not show it.
- **File:line.** `src/engine/battleResolutionPresentationRender.ts:1450-1453` (the move effect is presented on phaseElapsed 0 with age `max(0, 0 - N)` = 0).
- **Reach.** 19 of the 40 lead moves have an elevated Factory frontier user (`battle-frontier-mons.json` x `enemy-mon-elevations.json`), among them Bite (CROBAT, AERODACTYL), Shadow Ball (GOLBAT, CROBAT, LATIAS...), Psychic, Toxic, Swagger, Sludge Bomb, Dragon Claw, Confusion. In a 60-battle census shard (seeds 0..59) the elevated opponent lead commands were battles 4, 10, 14, 21, 31, 34, 36, 38, 53 (18 commands). The full census count was not run.
- **Fix shape (temp patch `audit24-lead-row0.diff`, +4 / -1, one file).** Present no move effect on phaseElapsed 0 of a lead > 0 command: the ordinary field draws the shadow (`drawGeneratedOpponentShadow`, `postBodyShadowHidden` is false on a move-animation command). Before / after:
  - **dense ROM** (`--lead0=age0` vs `--lead0=field`): the 4 elevated windows go 200 -> **0 px**, and the 14 others stay 0 px on every lead row;
  - **4 census routes** (`receipts/route/route-check.json`, `idle94RouteRender.ts` on master and master + patch): the command timeline and total frames are identical (10,426 / 6,366 / 10,686 / 11,290), every rendered row after row 0 is identical (sha and age), and row 0 changes only on the elevated-opponent routes. Bulk Up player (b154) row 0 is byte-identical;
  - Scene OFF b38 is identical.
- **Fold cost (measured, not resolved).** The first row of every lead command now has no effect. So:
  - `liveShareCensus.ts`'s per-row rule (`status = live` iff every row is live) would count every lead command `partial`. On the 4 routes, 23 command-first-row `live` flags flip;
  - the ordinary-route tests that assert "adapter active every age" or the land97 row sequences would move. The patched-copy `npm test` list is in section 4.
  - A fold either counts lead row 0 as a live idle row (census + pins) or keeps the effect and adds a "pre-activation row" flag that draws the shadow. The second option is invasive per adapter.

### TIMING-PHASE: Shadow Punch 325's optional lag at age 90 (new)

| body (fresh) | lag ages (gRng2Value repeats) | ROM body rows | phase |
|---|---|---|---|
| HAUNTER -> LAPRAS ply | 27, 70, 71, **90** | 109 | lag |
| HAUNTER -> SKARMORY ply | 27, 70, 71 | 108 | no lag (production's phase) |
| HAUNTER -> LAPRAS opp | 27, 70, 71, **90** | 109 | lag |
| HAUNTER -> SKARMORY opp | 27, 70, 71, **90** | 109 | lag |
| GENGAR -> LAPRAS ply | 27, 70, 71, **90** | 109 | lag |
| GENGAR -> LAPRAS opp | 27, 70, 71 | 108 | no lag |

- `Move_SHADOW_PUNCH` ends `clearmonbg; blendoff; restorebg; waitbgfadein`, the same tail as Focus Punch and Faint Attack: `LoadDefaultBg` overruns VBlank, one main-loop pass is lost, and the 16-step fade-in comes one row later.
- In the lag phase, rows 91..106 are one BLDY step darker on the ROM, about 17.5k px per row (e.g. ROM 112,111,111 vs production 128,127,127 at age 90). For the elevated opponent HAUNTER the shadow also returns one row later (row 109, 200 px), like fp100's GOLBAT row 154.
- Counts: fresh 4 lag : 2 no-lag (HAUNTER 3 : 1). The accepted fixtures `shadow-punch-{player,opponent}-haunter-*-onix` are in the no-lag phase, which is production's. Pooled, that is 4 : 4 with the GENGAR off-Factory pair, 3 : 3 HAUNTER-only.
- **Not decidable from 8 bodies**, so not a defect. A D4 `optional-lag-age` entry (fp100 precedent) needs an fp100-style phase census first.

### ARTIFACT (latent): Shadow Punch's live shadow return ignores the attacker's elevation

- `src/engine/battleScene.ts:51502` draws `battleAnimGhostBg.opponentShadow` for ANY opponent attacker at age >= 101. It is HAUNTER's shadow return (elevation 4).
- GENGAR has no elevation, so the ROM shows the ground (rows 109..112, 74 px: 189,189,156 vs 82,107,99).
- Unreachable in the Factory: **HAUNTER is the only frontier mon with Shadow Punch** (1 set). That makes it an ARTIFACT of the off-Factory lab pair.
- Fix shape if ever needed: gate on `enemyMonElevation(view.attacker.species) > 0` (`battleScene.ts:5038`).

### ARTIFACT: Shadow Punch trail row (HAUNTER -> SKARMORY ply, row 113)

- Production's window runs 5 rows past the ROM's first inactive row (the known idle94 trail -5).
- In the no-lag phase, row 113 = E+5, where the ROM has already started its next output: 1,451 px in the opponent healthbox region (bbox 13,16..112,44).
- This is not a lead or body row. It belongs to idle94's "post + trail" follow-up.

## 3. Coverage

| Target | Moves | Sides | Species pairs | Windows / bodies | Note |
|---|---|---|---|---|---|
| land97 lead moves not in idle94's 4 routes | Shadow Punch 325 (N 8), Bite 44 (10), Razor Leaf 75 (13), Dizzy Punch 146 (13), Harden 106 (1), Ember 52 (4), + Sludge Bomb 188 (4) | ply + opp (Sludge Bomb opp) | 10 | 18 | Factory frontier sets: HAUNTER Shadow Punch, CROBAT Bite, KANGASKHAN Dizzy Punch, GOLBAT Sludge Bomb; the others are species-generic adapter pairs (the move x side is Factory-live) |
| land97 Substitute-swap | Bite 44 | ply + opp | RATICATE -> SLOWBRO | 6 bodies | lead 0, composite exact |
| land97 Scene OFF | battle 38 | — | — | 1 route x 3 trees x {OFF, ON} | OFF identical |
| land97 temp patch on routes | Bite, Sludge Bomb, Bulk Up, Dragon Claw | opp x3, ply | census b38 / b4 / b154 / b31 | 4 routes x 2 trees | timeline identical |
| fp100 Focus Punch 264 | 264 | ply + opp | HITMONLEE -> SKARMORY / STEELIX, POLIWRATH -> QUAGSIRE / LAPRAS | 4 labs, 10 bodies | 5 event 0 px, 5 no-event rows 132..147 only |

## 4. Gates

- `git diff --check` clean, and no tracked file outside the `audit24` set modified at any commit.
- **Runner.** Pass 1 crashed (a missing scratch `route` dir, fixed).
  - Pass 2 (fresh dirs): SAME on scenarios (24), fp.json, fp-phase.tsv, route-check.json, rowdiff, swap-attdoll.json and swap-lead.json; probes r1 == r2 24 / 24.
  - Its two DIFFs are explained. (1) The probe JSON records the scenario path, and the frame rows are identical to the session probes 24 / 24; the receipt now hashes the frame rows. (2) scene-off-b38.json's tree label changed from HEAD to ae0eb8ed3 (same runs).
  - Pass 2's output is the committed receipt set. **Pass 3 into fresh dirs: `audit24Run: ALL SAME`.** All 22 / 22 receipts are SAME, probes r1 == r2 byte for byte 24 / 24 (`fixtures/audit-24/runner-pass3.log`).
- `npm test` / `npm run build`: final message.
- **Patched-copy `npm test`** (`git archive 93d77a403` + the temp patch; `receipts/patched-npm-test.json`): 23 files / 49 tests failed, 1,599 files / 12,472 tests passed.
  - 7 files / 20 tests are environment-only: `factory-wasm artifact not found` (the archive has no `artifacts/wasm` build). These are the 6 `factoryAi*Parity` / `factoryTrainerScheduleParity` files, plus `livePrep9MoveAdapters` (classified by its message; recheck).
  - **16 files / 29 tests moved by the patch**: the land97 ordinary-route age / row-sequence pins (`liveAnchor*`, `liveNext5`, `livePrep2/5/6/7`, `liveHBufferS1`, `liveOrderConsumer`, `land97IdleLeadRows`), and also `liveSpriteOrderHost`, `spriteOrderPolicyGaps`, `playerfaintLend`, `battleResolutionPresentation` ("hides the elevated shadow for the post-body hide rows") and `cf78CastformForm` (live count 9 -> 7).
  - So an effect-less row 0 also reaches the sprite-order lend tracking and the census live counts. **The temp patch proves the mechanism and the pixels. It is not fold-ready.** The fold shape is option (b) above: keep the move effect on lead row 0 and draw the pre-activation shadow there.

## 5. Reproduce (from workspace/)

```
sh tools/integration/audit24Run.sh .integration/validation/<fresh-receipts> .integration/validation/<fresh-scratch>
```
The runner restages the scenarios (diff with the committed ones) and runs fresh probes x2 (r1 == r2). It then runs the dense lead check
(production and patch row 0), the swap composite, Focus Punch, the base / patched / pre-land97 copies (routes, Scene OFF), and cmp's every
receipt with `tools/integration/fixtures/audit-24/receipts/`.
