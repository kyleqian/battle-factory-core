# Live adapter species audit 14 (S10A side lane, 2026-10-08): the widened subbed-ATTACKER swap cells and the Substitute fade

This audit swaps species in the evidence scenarios of two features on master 0f3671fc3 (production src tree d15bc413):
- the subbed-ATTACKER swap cells widened tonight (`LIVE_SUBSTITUTE_SWAP_BODY_CELLS`, `LIVE_SUBSTITUTE_SWAP_BODY_FRAMING` in
  `src/engine/liveSubstituteSwap.ts`; attdoll evidence, prep40 scenarios);
- the Substitute fade (`src/engine/liveSubstituteFade.ts`; fade-live evidence, prep37 / prep39 scenarios).

The method is audit 13's (docs/live-species-audit-13.md). Each window's HP, status, genders, preceding bodies and D3 activation value come
from the swapped scenario's **own** probe rows. The production live view is compared with fresh direct-mGBA frames. Every scenario ran twice
from fresh processes, and r1 == r2 byte-identical is the gate. All runs were direct mGBA only, and no shared oracle was touched. Every source
patch was env-gated, applied in place and reverted, and `git status src` was clean at every commit. Evidence is in
`tools/integration/fixtures/species-audit-14/`.

**Totals:**
- 219 swapped scenarios: 565 checked windows, of which 453 are swap composites.
- 80 doll-free control scenarios: 276 windows.
- 28 fade scenarios: 34 fade windows.
- 16 lag-counter windows.
- Every scenario's two fresh runs are byte-identical, and every receipt's per-row digests agree over r1 / r2.
- A second full swap checker pass is byte-identical (219 / 219 receipts).

Results:
- **The swap composite is exact for every non-shiny attacker species on every presented cell.** 418 of 430 presented composites are 0 px on
  every row.
  - The other 12 are a TIMING phase (11: Crunch, Confuse Ray) and one doll-neutral Attract row.
  - The tail rows are exact on all 430: k+1 (the latch row) and k+2 (the settled doll).
  - This includes the tall / large (STEELIX, WAILORD, TYRANITAR), small (PICHU), elevated / levitating (GOLBAT, FLYGON, WEEZING) and idle-rest
    (ONIX, RATTATA) attackers, on both sides.
  - It includes the three framing classes (Earthquake 208:0, Flamethrower 210:-15, Bite 41:-10) with non-accepted species.
  - **The audit-13 idle-rest defect (Ice Beam / Thunderbolt / Sludge Bomb) does not reach the swap.** The ONIX / RATTATA opponent swap rows
    are 0 px, because the mon returns from the doll with no rest. The doll-free controls still show it (KNOWN).
- 3 SPECIES-DEFECT classes, **all proven 0 px by a reverted patch**:
  - (1) **the fade** with an elevated opponent as the OTHER battler: row 0 shadow;
  - (2) **Confuse Ray** and (3) **Bite**: an idle-rest opponent attacker on its first body, doll-free. These are adapter-own, not the swap.
    They are audit 13's defect-1 class on two more moves.
- 1 new **LAG FRAME** D4 case, with counter evidence: **Confuse Ray**.
  - Crunch's audit-13 LAG FRAME phase also reaches the swap composite and the doll-free body. This answers audit 13's open question.

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| **Substitute fade** (General_SubstituteFade) | player fading (PERSIAN), **elevated OPPONENT as the other battler**: GOLBAT, FLYGON (`s14fade-other-{golbat,flygon}-prep37-on-player-persian-slowbro@2400`) | **200 -> 0** (row 0 only, bbox 160..191 x 65..72 = the 32x8 enemy shadow). Under the patch all **34 / 34** windows are policy-exact (`patch-fade-r{1,2}.txt`, line digests r1 == r2). The 32 controls stay 0: the tall / small / idle-rest player fading battler; the ONIX / RATTATA other; the opponent fading GOLBAT-base, FLYGON, WEEZING, AERODACTYL, STEELIX, WAILORD, TYRANITAR, PICHU, ONIX; and Scene OFF | `SpriteCB_EnemyShadow` hides the shadow only after it observes gAnimScriptActive. With the one-frame display lag, the ROM still shows a non-doll opponent's shadow on the fade's activation row (the #142 `LIVE_MOVE_OPPONENT_SHADOW_ROW` mechanism for move bodies). `substituteFadeRenderView` sets `postBodyShadowHidden` from age 0. When the opponent is the fading doll, the shadow is hidden anyway (behind a substitute), so the accepted GOLBAT-fading window is 0 px and never exercised this | `src/engine/liveSubstituteFade.ts:155` | `postBodyShadowHidden: effect.age < substituteFadeScriptRows(side) + 2 && !(effect.age === 0 && side === "player")`: the other (opponent) battler's shadow shows on age 0. Patch `fade-shadow-row0-env.diff` (`S14_FADE_SHADOW=1`) | **SPECIES-DEFECT, proven 0 px** |
| **Confuse Ray 109** (doll-free body; the swap composite is exact) | **idle-rest OPPONENT attacker on its first body**: ONIX, RATTATA (`s14plain-{onix,rattata}-confuse-ray-opponent`, first window) | ONIX **294,419 -> 0** (1,091 px on every row 0..269, bbox of the opponent sprite); RATTATA **110,700 -> 0** (410 px/row). Controls under the patch (`patch-receipts/confuse-ray-rest*/`): all 20 Confuse Ray swap windows, both sides and 9 species, are unchanged (0 px, or the LAG FRAME rows below); the GOLBAT / FLYGON doll-free bodies stay 0; the later RATTATA body keeps only its LAG FRAME rows | The ROM draws the attacker at its front-idle rest (no body has written its x2 yet). The renderer's `drawAttacker` uses `spriteCorner` with no rest term, although the same renderer applies `sceneOnBattlerFrontIdleRest` to the TARGET | `src/engine/battleScene.ts:44053-44054` | Add `sceneOnBattlerFrontIdleRest(view.attacker)` x2 / y2 for an opponent attacker (as Curse / Attract's `liveIdle`), or decline on a non-zero tracked attacker rest (Eruption / Overheat pattern). Patch `confuse-ray-attacker-rest-env.diff` (`S14_REST=1`) | **SPECIES-DEFECT, proven 0 px** |
| **Bite 44** (doll-free body; the swap composite is exact) | **idle-rest OPPONENT attacker on its first body**: RATTATA (`s14plain-rattata-bite-opponent@75`), ONIX | RATTATA **10,660 -> 0** (410 px on each of the 26 adapter rows); ONIX (`s14plain-onix-bite-opponent@72`) **28,366 -> 0** (1,091 x 26). Both measured at the calibrated shift -10 (`speciesAudit14PlainShift.ts`). Controls under the patch (`patch-receipts/bite-rest/`): all 36 Bite swap windows stay 0 px on swap and body rows; the GOLBAT / FLYGON doll-free bodies stay 0; the later RATTATA bodies stay 0; PICHU both sides stays 0 | as Confuse Ray: Bite's `drawAttacker` (the MEOWTH slot) uses `spriteCorner` with no rest term | `src/engine/battleScene.ts:28709-28710` | as Confuse Ray. Patch `bite-attacker-rest-env.diff` (`S14_REST=1`) | **SPECIES-DEFECT, proven 0 px** |

**KNOWN (audit 13; the sibling INTEGRATION worker's fix), not re-proved.** These rows are the same defect on the doll-free controls, never on the swap:
- Ice Beam, ONIX opponent first body: 221,473 px (audit 13's exact number);
- Thunderbolt, RATTATA: 97,170 px (410 / row);
- Sludge Bomb, ONIX: 173,020 px and RATTATA: 65,550 px, at the calibrated shift.

The shiny swap decline was not staged; it is KNOWN.

### TIMING-PHASE / LAG FRAME (counter evidence: `counters.txt`, `issue151Counters.sh` on `counter-fixtures/`, 2 fresh runs each, identical digests)

| Move | Rows | Counter evidence | Residual |
|---|---|---|---|
| **Crunch 242** (audit-13 LAG FRAME, now in the **swap composite** and the **doll-free** body) | 10 of 33 presented composites: STEELIX / WAILORD player bodies 2-3, ONIX player 2-3 and opponent 3, TYRANITAR opponent 1-2 and player 2. 5 doll-free bodies: PICHU player 3467, plus the STEELIX player, WAILORD player and TYRANITAR opponent (2) controls. **ROM body 140 rows**, against 141 | Body 1 of `s14swap-steelix-crunch-player` (141 rows, 0 px) lags at **[98, 99, 121]**. Its bodies 2 / 3 (140 rows) lag at **[98, 99]**: the lag at 121 is absent. The same holds for ONIX opp, TYRANITAR opp and PICHU doll-free. It is turn-dependent within one scenario and one species, so it is **not a species effect** | body ages **123..138** (16 full-field rows, the closing fade). In the composite, the swap-back rows are one row early (composite 183..201 / 208..221 opp, 185..205 / 210..225 player; ~300k px). The production body is fixed at 142 rows. **D4 option (b)**: record the dominant phase, document this one |
| **Confuse Ray 109** (**NEW D4 case**; not in `liveMoveTimingPolicy.ts`) | 1 of 14 presented composites (ONIX opponent, `@3448`), plus 2 doll-free bodies (PICHU player `@1771`, RATTATA opponent `@3411`). **ROM body 268 rows**, against 269 | The 269-row bodies (STEELIX opp `@3451`, PICHU `@5167`) lag at **[26, 229, 230, 249]**. ONIX `@3448` lags at **[26, 229, 230]**: the lag at 249 is absent. PICHU `@1771` lags at [26, 229, 230, **250**]. Also turn-dependent (PICHU: 268 then 269) | body ages **251..266** (16 full-field rows, max 17,036..18,358 px). In the composite, the swap-back rows are one row early (composite 292..307, 311..329, 336..349; 305,949 px). The production duration is fixed at 270 (`CONFUSE_RAY_FRAME_COUNT`, `liveMoveAnimation.ts:867`). D4 option (b) as Crunch |

### Non-defect table

| Row(s) | Residual | Evidence | Verdict |
|---|---|---|---|
| Psychic 94, **opponent** subbed attacker, all 9 species (23 windows) | `presented=false`; the declined fallback differs from the ROM's composite | The cell is player-only (`LIVE_SUBSTITUTE_SWAP_BODY_CELLS`: "opponent: the doll-free control's own 9 px"). The doll-free GOLBAT / FLYGON / RATTATA bodies at the calibrated shift show exactly that **9 px on body row 100** | **DECLINE confirmed**, consistent for every species |
| Doll-free ("plain") bodies of the framed moves Bite / Flamethrower / Sludge Bomb / Toxic / Psychic in `attdollLiveCheck.ts` (PICHU / RATTATA bodies after the doll broke, and the `s14plain-*` controls) | 40k..2.6M px from row 0..1 | `attdollLiveCheck.ts` measures a plain body from the activation row with age shift 0. Re-measured at the calibrated shift (`speciesAudit14PlainShift.ts`, `plain-shift*.json`, 2 runs identical), **93 windows: 72 are 0 px**. The other 21 are the Psychic opponent 9 px (18) and the idle-rest first bodies (3: the Bite defect, KNOWN Sludge Bomb x2). The ROM body rows equal framing rows - 1 (Bite 40, Flamethrower 209, Sludge Bomb 168, Toxic 230, Psychic 144). Earthquake (shift 0) plain bodies are 0 px unshifted | **ARTIFACT** (checker alignment) |
| `SANDSTORM` windows in every TYRANITAR scenario (Sand Stream; 60 + control windows) | 164k..595k px, all rows | The end-of-turn weather animation runs the `Move_SANDSTORM` script, and the checker's body detector takes it as a doll-free body of the attacker. TYRANITAR's moves are [164, X, X, X], with no Sandstorm. The swap composites of the same scenarios are 0 px | **ARTIFACT** (not a body of the move); out of scope |
| Attract 213, GOLBAT opponent attacker | **one full-field row**, 18,492 px (composite age 442 = body age 401) | Counters [158, 159, 160, 430, 431] equal the 0-px STEELIX control's. The doll-free GOLBAT control has the **same 18,492 px on one row** (body age 417). The FLYGON / WEEZING / STEELIX opponents are 0 px | **DOLL-NEUTRAL**; UNRESOLVED: audit 13's one-row Attract class (19,081 / 18,207 px there). It needs the VBlank-write probe |
| Double-Edge 38, RATTATA / ONIX opponent doll-free first body | 410 / 1,091 px on body row 33 only | No lag probe. The px is the RATTATA rest offset on one row, presumably the rest kept until an absolute x2 write (audit-13 Body Slam probe) | UNRESOLVED (rest class) |
| Attract (2,460 px, ages 0..5) and Brick Break (31,980 px, 0..77): RATTATA opponent doll-free first body | 410 px/row before the first absolute x2 write | Same signature as audit 13's ONIX rows (6,546 / 85,098) | KNOWN UNRESOLVED (audit 13) |

### Fade (`fade-receipts/`; fadeLiveCheck.ts, the production view as committed)

**34 windows over 28 scenarios.** r1 and r2 produce identical per-window line sets (`0d42b23ecc82e86e` both). The three negatives (age+1, no-fade, no-x2) all FAIL.

| Fading battler | Other battler | Result |
|---|---|---|
| player WAILORD, PICHU (Tackle breaker); STEELIX, TYRANITAR (3 fades), ONIX (Earthquake breaker): 7 windows | SLOWBRO | 0 px, policy-exact |
| player PICHU | idle-rest ONIX | 0 px |
| player PERSIAN | idle-rest RATTATA | 0 px |
| player PERSIAN | **elevated GOLBAT, FLYGON** | **200 px on row 0: DEFECT (above)**, 0 under the patch |
| opponent FLYGON, WEEZING (levitating), WAILORD, PICHU (4 fades); STEELIX (3), TYRANITAR (3), ONIX (4) (Earthquake breaker); AERODACTYL (4) (Surf breaker): 21 windows | SLOWBRO | 0 px, policy-exact |
| **Scene OFF**: player PICHU, STEELIX (Earthquake breaker) | SLOWBRO | 0 px |

## 2. Coverage

### Swap grid (`coverage-grid.md`): exact composites / swap windows, `+Ndf` = doll-free bodies the ROM ran after the doll broke

| move | side | STEELIX | WAILORD | TYRANITAR | PICHU | ONIX | RATTATA | GOLBAT | FLYGON | WEEZING |
|---|---|---|---|---|---|---|---|---|---|---|
| EARTHQUAKE | player | 3/3 | 2/2 +1df | 3/3 | 0/0 +3df | 3/3 |  |  |  |  |
| EARTHQUAKE | opponent | 3/3 | 3/3 | 3/3 | 1/1 +1df | 3/3 | 2/2 | 3/3 | 3/3 | 3/3 |
| SURF | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| SURF | opponent | 3/3 | 3/3 | 3/3 | 1/1 | 3/3 | 1/1 +2df | 3/3 | 3/3 | 3/3 |
| PSYCHIC | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| PSYCHIC | opponent (declined) | 0/3 | 0/3 | 0/3 | 0/1 | 0/3 | 0/1 +2df | 0/3 | 0/3 | 0/3 |
| ICE_BEAM | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| ICE_BEAM | opponent | 3/3 | 3/3 | 3/3 | 1/1 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| THUNDERBOLT | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| THUNDERBOLT | opponent | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 | 2/2 | 3/3 | 3/3 | 3/3 |
| DOUBLE_EDGE | player | 3/3 | 2/2 +1df | 3/3 | 0/0 +3df | 3/3 |  |  |  |  |
| DOUBLE_EDGE | opponent | 3/3 | 3/3 | 3/3 | 1/1 +1df | 3/3 | 1/1 +2df | 3/3 | 3/3 | 3/3 |
| ATTRACT | player | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |  |  |  |  |
| ATTRACT | opponent | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 0/1 (1 row) | 1/1 | 1/1 |
| BRICK_BREAK | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| BRICK_BREAK | opponent | 3/3 | 3/3 | 3/3 | 1/1 | 3/3 | 1/1 +2df | 3/3 | 3/3 | 3/3 |
| SLUDGE_BOMB | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| SLUDGE_BOMB | opponent | 3/3 | 3/3 | 2/2 | 1/1 | 3/3 | 1/1 +2df | 3/3 | 3/3 | 3/3 |
| CRUNCH | player | 1/3 | 1/3 | 1/2 | 0/0 +2df | 1/3 |  |  |  |  |
| CRUNCH | opponent | 3/3 | 3/3 | 0/2 | 0/0 +2df | 2/3 | 2/2 | 3/3 | 3/3 | 3/3 |
| FLAMETHROWER | player | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 |  |  |  |  |
| FLAMETHROWER | opponent | 3/3 | 3/3 | 3/3 | 1/1 | 3/3 | 2/2 +1df | 3/3 | 3/3 | 3/3 |
| TOXIC | player | 1/1 | 1/1 | 1/1 | 0/0 +1df | 1/1 |  |  |  |  |
| TOXIC | opponent | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 0/0 +1df | 1/1 | 1/1 | 1/1 |
| THUNDER_WAVE | player | 1/1 | 1/1 | 1/1 | 0/0 +1df | 1/1 |  |  |  |  |
| THUNDER_WAVE | opponent | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| CONFUSE_RAY | player | 1/1 | 1/1 | 2/2 | 0/0 +2df | 1/1 |  |  |  |  |
| CONFUSE_RAY | opponent | 1/1 | 1/1 | 1/1 | 1/1 | 0/1 (LAG) | 1/1 | 1/1 | 1/1 | 1/1 |
| ROCK_SLIDE | opponent | 2/2 | 2/2 | 2/2 | 1/1 | 2/2 | 0/0 +1df | 2/2 | 2/2 | 2/2 |
| BITE | player | 3/3 | 3/3 | 3/3 | 0/0 +3df | 3/3 |  |  |  |  |
| BITE | opponent | 3/3 | 3/3 | 3/3 | 0/0 +2df | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

Every residual composite is explained above: all CRUNCH non-exact composites are the LAG FRAME phase, and so is the CONFUSE_RAY ONIX row; the
Attract GOLBAT composite is the one doll-neutral row.

Tail latch (`tail-latch.txt`): on all **430 / 430** presented composites, row k+1 (production's `substituteSwapTailFieldArt` latch) and row
k+2 (the settled doll) are 0 px on both runs. Without the latch, every k+1 row is non-zero, so the latch is needed on every species.

Doll-free controls:
- `plain-summary.txt` (16 scenarios): the residual swap rows' species and the framing classes. STEELIX Earthquake / Flamethrower player,
  GOLBAT Earthquake, WAILORD Flamethrower, TYRANITAR / FLYGON Bite.
- `wide-summary.txt` (48 scenarios): RATTATA / GOLBAT / FLYGON opponent attackers x all 16 moves.
- `onix-summary.txt` (16 scenarios, 53 windows, r1 == r2): ONIX opponent x all 16 moves. These reproduce audit 13's numbers exactly:
  Ice Beam 221,473 and Thunderbolt 258,567 (KNOWN); Attract 6,546 (0..5) and Brick Break 85,098 (0..77) (KNOWN UNRESOLVED); Sludge Bomb
  173,020 at the shift (KNOWN). They add Confuse Ray 294,419 and Bite 28,366 (DEFECTS) and Double-Edge 1,091 px on row 33 (UNRESOLVED, as
  RATTATA). The doll-free Flamethrower first body is 0 px at the calibrated shift; audit 13's ONIX Flamethrower rows 0..7 fall before adapter
  age 0, outside the compared rows.
- The doll-free bodies are exact for every elevated / levitating opponent attacker on every move, at the calibrated shift. The one exception is
  the KNOWN Psychic opponent 9 px.

**Not reached:**
- PICHU as the PLAYER subbed attacker: the doll broke before the move in 14 of 15 player cells, so the ROM ran doll-free bodies (the "df"
  entries; Attract is the one composite). The same applies to RATTATA opponent Toxic / Rock Slide, and PICHU opponent Thunderbolt / Crunch /
  Bite. Not re-staged with a weaker breaker.
- WEEZING doll-free controls (GOLBAT / FLYGON stood for the elevated class).
- Legality filtering (no "legal users only" pass).
- A shiny row (KNOWN, sibling worker).
- The Attract one-row VBlank-write probe, and a Double-Edge row-33 probe.
- The fade: STEELIX fading against the idle-rest ONIX other. The Tackle breaker never broke the Steel doll, so there was no fade in the trace.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
W=tools/integration/fixtures/species-audit-14
# swap grid: stage (sha256 = $W/swap-scenarios.sha256), probe twice fresh (r1 == r2 cmp), production check (attdollLiveCheck.ts unchanged)
python3 tools/integration/speciesAudit14SwapStage.py /tmp/s14/sc && (cd /tmp/s14/sc && shasum -a 256 -c $PWD/$W/swap-scenarios.sha256)
OUT=/tmp/s14/p SC=/tmp/s14/sc JOBS=15 sh tools/integration/speciesAudit14SwapProbes.sh          # ~11 min at 15 jobs
sh tools/integration/speciesAudit14SwapRun.sh /tmp/s14/p /tmp/s14/sc /tmp/s14/rec 14            # -> /tmp/s14/rec/summary.txt (= $W/swap-summary.txt)
python3 tools/integration/speciesAudit14Coverage.py /tmp/s14/rec /tmp/s14/sc/list.tsv
# doll-free controls (stems from $W/plain-list.tsv / $W/wide-list.tsv), framed plain bodies at the calibrated shift
python3 tools/integration/speciesAudit14SwapStage.py /tmp/s14/wsc --plain $(cut -f1 $W/wide-list.tsv | sed 's/^s14plain-/s14swap-/')
OUT=/tmp/s14/wp SC=/tmp/s14/wsc sh tools/integration/speciesAudit14SwapProbes.sh && sh tools/integration/speciesAudit14SwapRun.sh /tmp/s14/wp /tmp/s14/wsc /tmp/s14/wrec 14
node --experimental-strip-types --no-warnings tools/integration/speciesAudit14PlainShift.ts --out=/tmp/s14/ps.json /tmp/s14/wp /tmp/s14/wsc <stem>@<activation> ...
# lag counters
sh tools/integration/issue151Counters.sh /tmp/s14/counters 14 $W/counter-fixtures/*.json
# defect proofs (env-gated, reverted by trap; git status src clean after)
sh tools/integration/speciesAudit14Patch.sh $W/confuse-ray-attacker-rest-env.diff /tmp/s14/wp /tmp/s14/wsc /tmp/s14/crp S14_REST=1 s14plain-rattata-confuse-ray-opponent s14plain-golbat-confuse-ray-opponent s14plain-flygon-confuse-ray-opponent
#   Bite: git apply $W/bite-attacker-rest-env.diff; S14_REST=1 speciesAudit14PlainShift.ts on the s14plain-*-bite-opponent windows + SwapRun on the bite stems; git checkout src
# fade: stage, probe twice fresh (json cmp + rgb diff), check r1 and r2 + negatives; proof with S14_FADE_SHADOW=1 after git apply $W/fade-shadow-row0-env.diff
python3 tools/integration/speciesAudit14FadeStage.py /tmp/s14/fsc && OUT=/tmp/s14/fp SC=/tmp/s14/fsc sh tools/integration/speciesAudit14FadeProbes.sh
sh tools/integration/speciesAudit14FadeRun.sh /tmp/s14/fp /tmp/s14/fsc /tmp/s14/frec
```

## 4. Papercuts
- `attdollLiveCheck.ts` measures a doll-free ("plain") body with age shift 0. For the framed moves (`LIVE_SUBSTITUTE_SWAP_BODY_FRAMING` shift
  != 0) every plain window shows a large false residual. `speciesAudit14PlainShift.ts` re-measures them.
- `attdollLiveCheck.ts` takes the Sand Stream weather animation (`Move_SANDSTORM` script) as a body of the attacker.
- `attdollLiveCheck.ts` reads scenarios from a hard-coded prep40 path. `speciesAudit14SwapCheck.ts` redirects that path:
  `fs.readFileSync` + `syncBuiltinESMExports`.
- The `speciesAudit13Swap*` tools use prep37Probe.py, which has no gRng2Value / status1. The widened cells need prep40Probe.py
  (`speciesAudit14SwapProbes.sh`).

## 5. Gates
- `npm test` passed on eb5373d97 + the totals doc commit (0beacd784): 1567 files passed / 44 skipped, 12,902 tests passed / 223 skipped,
  543.6 s.
- `npm run build` passed.
- `git diff --check 0f3671fc3..HEAD` is clean, and the commit range adds new files only (`--diff-filter=AM` = A only).
- `git status src` was clean at every commit.
