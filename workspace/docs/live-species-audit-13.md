# Live adapter species audit 13 (S10A side lane, 2026-10-08): the defender doll, the attacker doll swaps, Ice Ball counters 1..4

This audit swaps species in the evidence scenarios of the three Substitute-era features merged at master 821cdc031 (production src tree
ccde138a), then compares the PRODUCTION live view with fresh direct-mGBA frames. The features are:
- the DEFENDER shown as the doll (`LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS`, prep38 / dolldef-live);
- the ATTACKER doll swaps (`LIVE_SUBSTITUTE_SWAP_BODY_IDS` = Headbutt 29, Body Slam 34, Leech Seed 73);
- Ice Ball counters 1..4 through the deferred order lend (prep40 / lend-live).

The window, HP, gender, status, preceding bodies and personalities come from each swapped scenario's **own** two fresh probe runs, which must
agree. All runs were direct mGBA only, and no shared oracle was touched. Every source patch was env-gated, applied in place and reverted, and
`git status src` was clean at every commit. Evidence is in `tools/integration/fixtures/species-audit-13/`.

**Totals: 330 defender-doll windows + 67 swap scenarios (134 runs) + 28 Ice Ball counter windows.**
- Every receipt is identical over its 2 fresh mGBA runs.
- A second full checker pass is byte-identical for all three sets (Ice Ball: a second d4aTimingCheck pass with 2 more fresh runs each).

Results:
- 2 SPECIES-DEFECT classes, **both proven 0 px by a reverted patch**:
  - (1) an idle-rest opponent ATTACKER is drawn without its front-idle rest by Ice Beam, Thunderbolt and Sludge Bomb, both with and without the doll;
  - (2) a shiny ATTACKER of the doll swaps is drawn in its normal palette on the swap rows and the body.
- 1 new **LAG FRAME** D4 case, with counter evidence: Crunch and Psychic each have an optional lag that is not in the policy.
- Elevated opponent attackers leave 200 px on row 0. This is doll-neutral (the doll-free control has the same residual) and documented.
- The UNRESOLVED rows are listed below.
- **The defender doll itself is exact for every defender species tested**:
  - tall / large (STEELIX, WAILORD, TYRANITAR);
  - small (PICHU);
  - elevated / levitating (GOLBAT, FLYGON, WEEZING);
  - idle rest (ONIX, RATTATA);
  - shiny STEELIX.

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| Ice Beam 58, Thunderbolt 85, Sludge Bomb 188 (doll on the defender, **and doll-free**) | **idle-rest ONIX as the OPPONENT attacker** (`s13-atkonix-{ice-beam,thunderbolt,sludge-bomb}-opponent`; doll-free + doll pairs `s13-nodfonix-*`) | Ice Beam 221,473 -> **0**; Thunderbolt 258,567 -> **0**; Sludge Bomb 182,849 (doll) / 182,839 (doll-free) -> **0**. The residual is 1,091 px on **every** row, in the bbox of the opponent sprite (149..204 x 12..71). The doll-free CONTROL body (first body, no doll) has the same residual, and the patch takes it to 0 too. Controls under the patch: `ctl-*` both sides, GOLBAT attacker, ONIX / RATTATA *defender* doll rows all stay 0 | The ROM draws the attacker at its front-idle rest (`x2` = 1 at activation, prep38Probe). None of these bodies writes the attacker's x2, so the rest holds for the whole window. These three renderers draw the attacker OBJ at `spriteCorner` with no rest term. `sceneOnBattlerFrontIdleRest` (species rest or the #148 tracked override) is never applied to the attacker. `opponent-attacker-rest-env.diff` (`S13_REST=1`) adds `sceneOnBattlerFrontIdleRest(view.attacker)` for an opponent attacker, and the rows go to 0 px | `src/engine/battleScene.ts:15801-15802` (Ice Beam `drawAttacker`), `:27537-27538` (Thunderbolt attacker item), `:41309-41310` (Sludge Bomb `drawGrimer`) | Add the opponent attacker's `sceneOnBattlerFrontIdleRest(view.attacker)` x2 / y2 to the attacker OBJ position in these three renderers (as Curse / Attract's `liveIdle`). Or decline on a non-zero tracked attacker rest, as Eruption `liveMoveAnimation.ts` (prep36 s1.4) and Overheat do. This is the altspecies-live-evidence "S2" class (CONFIRMED there for Sandstorm). Receipts: `patch-receipts/opp-rest{,-nodf}/`, `patch-receipts-opp-rest.txt` | **SPECIES-DEFECT, proven 0 px** (3 moves: 3 defender-doll rows + 3 doll-free / doll pairs) |
| Substitute swaps (Headbutt 29, Body Slam 34, Leech Seed 73): the swap composite | **shiny STEELIX as the subbed ATTACKER**, both sides (`s13swap-shinysteelix-*`, 6 scenarios, 15 windows) | Body Slam opponent 256,915 -> **0** (5 windows); player 243,663 -> **0** (2); Leech Seed opponent 322,374 -> **0**, player 307,546 -> **0**; Headbutt opponent 141,163 -> **1,156** and player 133,589 -> **133**. Each Headbutt remainder equals its NON-shiny STEELIX row exactly (swap rows 0 px; the body residual is the doll-free Headbutt control's, see the non-defect table). Controls under the patch: the non-shiny STEELIX and ONIX swaps stay 0 | Production engages the swap with `S13_ATTACKER_PERSONALITY` = the ROM's shiny personality (read by `speciesAudit13Personality.py`), and draws the mon in its normal palette. The swap-in / swap-back rows render the ordinary Scene OFF field (`renderBattleResolutionLiveView` -> `renderBattleResolutionSceneOffView`, field art from `createBattleCommandFieldArtView`, which has no shiny palette). The body renders from `liveSceneOnBattlerArt` (also normal palette). The ROM shows the shiny palette on all of them: **the mon comes back from the doll in its shiny palette**, and production does not. `swap-shiny-palette-env.diff` (`S12_SHINY=STEELIX`) = audit 12's `subst-shiny-palette-env.diff` + the same STEELIX `shiny.pal` in `battleCommandFieldArt.ts`. With it the rows are 0 px (Headbutt: the non-shiny remainder). With the audit-12 patch alone the swap rows stay 48,202 / 49,106 px | `src/engine/liveSubstituteSwap.ts:104-111` (`liveSubstituteSwapApplies`: no shiny gate); `src/engine/battleCommandFieldArt.ts:118-122` (pic palette only); `battleScene.ts:14894` (`liveSceneOnBattlerArt`) | Add `liveBattlerIsShiny(attacker personality)` to `liveSubstituteSwapApplies` (decline), as the other S10A adapters gate shiny. Note that the decline fallback (static Scene OFF field) also has no shiny palette. The faithful fix is shiny palettes in the field art and the live art (the patch's route). The sibling INTEGRATION worker's widened swap list inherits this | **SPECIES-DEFECT, proven 0 px** (6 scenarios) |

### LAG FRAME (a CPU phase NOT in the D4 policy: new D4 cases)

| Move | Rows | Counter evidence (`counters.txt`: `issue151Counters.sh`, 2 fresh runs each, identical digests) | Residual |
|---|---|---|---|
| **Crunch 242** (defender doll, both sides) | **13 of 30** windows are **141** rows, against the policy / accepted 142: STEELIX, WAILORD, TYRANITAR, PICHU, ONIX, RATTATA and shiny STEELIX as the doll, and GOLBAT / AERODACTYL as the attacker | The 142-row windows (`ctl` both sides, STEELIX opponent) lag at **[98, 99, 121]**. The 141-row windows (ONIX player, PICHU opponent, GOLBAT attacker) lag at **[98, 99]**: the lag at age **121** is absent | ages **123..138 only** (16 rows), 291,312..305,296 px, max 18,207..19,081 px/row, full field (0..239 x 0..111). This is the shape of a 1-row phase on the closing fade. Production's fixed duration is 142 (`liveMoveAnimation.ts:928`), so every 141-row body shows this residual |
| **Psychic 94** (defender doll) | **2 of 28** windows are **144** rows, against the accepted 145 (ONIX as the player-side doll, RATTATA as the opponent-side doll) | The 145-row windows (`ctl` both sides) lag at **[101, 102, 124]**. The 144-row windows lag at **[101, 102]**: the lag at age **124** is absent | ages **126..141 only** (16 rows), 291,312 / 292,352 px, full field |

Neither is doll- or species-specific in mechanism: it is an optional main-loop lag whose presence varies with the scenario (same class as Skill Swap's optional lag). **D4 option (b) applies**: record the dominant phase (142 / 145) and document the other phase with these ages, as for Skill Swap 285 and Extrasensory. Not probed: whether doll-free Crunch / Psychic bodies also take the short phase (no doll-free Crunch / Psychic control was staged).

### Non-defect table

| Row(s) | Residual | Evidence | Verdict |
|---|---|---|---|
| Elevated OPPONENT attacker (GOLBAT, AERODACTYL) with the doll on the player defender: Psychic, Flamethrower, Sludge Bomb (6 rows) | **200 px on row 0 only**, bbox 160..191 x 65..72 (the 32x8 enemy shadow) | The doll-free CONTROL body of the same scenario (`s13-nodfgolbat-{psychic,flamethrower,sludge-bomb}-opponent-control`) has the **same 200 px on row 0**, and its doll TEST body too. This matches the documented `claimedDocumentedResidual` prep38-df-psychic-haunter-kadabra-opponent (200 px, age 0) and issue151-diagnosis ("golbatA keep 200 px, the age-0 shadow"). These moves have a negative age shift (-5 / -15 / -4), so row 0 precedes live age 0 and the #142 shadow-row hook (`LIVE_MOVE_OPPONENT_SHADOW_ROW`) does not cover it | **DOLL-NEUTRAL, documented class (ISSUES #142 / #152)**. Not a doll defect. Not patched here |
| Substitute swaps, Headbutt body residual with non-shiny swapped attackers: AERODACTYL opp 1,838; STEELIX opp 1,156 / player 133; TYRANITAR opp 686 / player 571; WAILORD player 25; ONIX player 473. Leech Seed FLYGON player 32 (age 83) | swap rows **0 px** in every one; body rows only | Each body residual has the **same `bodyPerRowDigest`** as the doll-free `--plain` control of the same species (`swap-plain-receipts/s13plain-*`, 13 scenarios, 2 fresh runs, identical). The accepted GOLEM player Headbutt is the same pattern (92 px, documented) | **DOLL-NEUTRAL**: the swap is exact. The Headbutt / Leech Seed base adapters have species residuals of their own (UNRESOLVED for those adapters, outside this audit's scope) |
| Ice Ball target swaps that the ROM ends early | — | The player-attacker chains with LUNATONE, WEEZING, STEELIX, GOLBAT (counter 4) and RATTATA / ONIX (counter 3) end with the target KO'd before the body: the replacement slot is `[6, 5]`, and the deferred lend declines there. The opponent GLALIE chains **reset** (gDynamicBasePower 30, 60, 30, 60, 120), so only counter 1 is a chain body | correct ROM behaviour; not written (`iceball-derive.txt`) |

### UNRESOLVED (label only; the named probe ran but does not explain the residual)

| Row | Residual | Probe / evidence |
|---|---|---|
| Defender doll, **ONIX opponent attacker**: Body Slam 40,241 (ages 0..36), Brick Break 85,098 (0..77), Flamethrower 8,728 (0..7), Attract 6,546 (0..5) | 1,091 px/row on the rows **before** the body's first absolute attacker x2 write, bbox 149..204 x 12..71 | The doll-free CONTROL (`s13-nodfonix-*-control`) has the identical residual. After an earlier own body (`-test`, rest zeroed) Body Slam / Brick Break / Flamethrower are **0 px**. This is the same signature as the proven Ice Beam / Thunderbolt / Sludge Bomb defect, but these renderers already track an attacker offset. **Body Slam probe** `bodyslam-attacker-rest-env.diff` (`S13_REST2=1`, reverted): add the rest until the reducer's attacker offset first returns to 0. It gives 40,241 -> **17,456 px** (doll and doll-free control alike; ages 0..20 now exact, **21..36 remain**), and the controls (`ctl` both sides, GOLBAT / AERODACTYL / STEELIX attackers, the ONIX doll, the post-own-body test) stay 0 (`patch-receipts-bodyslam-rest.txt`). So the rest explains rows 0..20, and the ROM keeps it through age 36, past the reducer's return to 0, until an absolute x2 write at 37. Not a 0-px proof. **Presumed same class**; the fix needs the source's absolute-write age |
| Ice Ball counters 1..2, **idle-rest opponent TARGET** ONIX (48,017 / 78,804 px) and RATTATA (30,686 / 44,870 px) | ages **8..57** (counter 1) / **8..65** (counter 2), max 2,015 / 981..1,202 px/row | d4aTimingCheck reports phase no-event = policy, so it is not a lag. Ice Ball (`liveMoveAnimation.ts:3642`) has **no** target-rest gate. Same signature as the audit-9 Mach Punch / audit-6 Curse idle-rest TARGET rows, which were declined there |
| Ice Ball, TYRANITAR target: player-side target counter 1 (2 px, age 39); opponent-side target counter 1 (40 px, ages 40..41) and counter 3 (11 px, ages 39..41) | ≤ 20 px/row | No lag (phase = policy). This is the TYRANITAR (Sand Stream) pattern of audits 11 / 12, unprobed |
| Attract, defender doll: AERODACTYL player attacker (19,081 px, row 405); RATTATA opponent-side defender (18,207 px, row 421) | one full-field row each | Counters equal to the 0-px controls ([158, 159, 160, 430, 431]). The ROM row equals production's **next** age (shift +1 on that row = 0 px). This is a one-row early palette step, not a lag frame. It needs a VBlank-write probe (candidate D4 VBlank-phase case) |
| Attract, **shiny STEELIX** player-side defender doll (opponent attacker) | 49 px on row 119 (bbox 65..78 x 80..91) | The ROM frame at row 119 differs from the NON-shiny STEELIX scenario's only there, and only in heart-sprite pixels (ff2939 / d62939 / b52939 / ff8c84 moved). gRng2Value is identical in both, at activation and at row 119. Not a palette effect of the shiny defender (the doll has no shiny palette, and every other row is 0 px) |

### Decline confirmations / shiny defender

- **Shiny DEFENDER shown as the doll (the brief's question).** The production view was given the defender's ROM personality (`targetPersonality`, shiny in the ROM and by `liveBattlerIsShiny`). It **engages on every cell**: 16 of the 18 rows (9 moves x 2 sides) are 0 px. The other two are Crunch player (the 141-row LAG FRAME phase, as the non-shiny dolls) and Attract opponent (the 1-row 49 px above). The doll has no shiny palette in the ROM either. No doll-path cell declines on a shiny defender, and none needs to.
  - Ice Ball's own shiny gate (`:3653`) covers both battlers. It was not exercised here (no shiny Ice Ball row).
- **No defender-doll cell declined.** All 310 + 20 windows are `liveEngaged: true`. Decline rows: none to confirm.
- Not staged (correct ROM behaviour, no `attackanimation`):
  - Earthquake on GOLBAT / FLYGON / WEEZING (Flying / Levitate);
  - Psychic on TYRANITAR (Dark);
  - Sludge Bomb on STEELIX (Steel);
  - Thunderbolt on STEELIX / ONIX / FLYGON (Ground).

## 2. Coverage

### Defender doll (`coverage-grid.txt`, 310 windows; "ok" = 0 px, 2 fresh runs identical)
Recipe: DEFENDER-FIRST prep38 (`speciesAudit13Stage.py`). The fast defender subs on turn 1. The slow attacker's move is the battle's second body and hits the doll. The age shift is the move's calibrated prep38 doll-free control.

| Move (both sides) | Defender swaps (shown as the doll) | Attacker swaps |
|---|---|---|
| Earthquake | STEELIX, WAILORD, TYRANITAR, PICHU, ONIX, RATTATA, shiny STEELIX: ok | ONIX, GOLBAT, AERODACTYL, STEELIX: ok |
| Psychic | all 8 + shiny ok, except ONIX (player) / RATTATA (opponent): LAG FRAME | ONIX, STEELIX ok; GOLBAT / AERODACTYL opponent: row-0 shadow (doll-neutral) |
| Surf | all 9 + shiny: ok | all 4: ok |
| Attract | all 9 + shiny ok, except RATTATA (opponent) 1 row and shiny STEELIX (opponent) 49 px: UNRESOLVED | GOLBAT, STEELIX ok; AERODACTYL player 1 row (UNRESOLVED); ONIX opponent rows 0..5 (UNRESOLVED, rest class) |
| Brick Break | all 9 + shiny: ok | ONIX opponent: UNRESOLVED (rest class, rows 0..77); others ok |
| Sludge Bomb | 8 (no STEELIX): ok | ONIX opponent: **DEFECT, 0 px under the patch**; GOLBAT / AERODACTYL opponent: row-0 shadow; STEELIX ok |
| Crunch | 17 of 30 ok; 13 are the 141-row LAG FRAME phase (see table) | as left |
| Body Slam | all 9 + shiny: ok | ONIX opponent: UNRESOLVED (rest class, rows 0..36); others ok |
| Flamethrower | all 9 + shiny: ok | ONIX opponent: UNRESOLVED (rows 0..7); GOLBAT / AERODACTYL opponent: row-0 shadow |
| Ice Beam | all 9 + shiny: ok | ONIX opponent: **DEFECT, 0 px under the patch**; others ok |
| Thunderbolt | 6 (no STEELIX / ONIX / FLYGON): ok | ONIX opponent: **DEFECT, 0 px under the patch**; others ok |

### Attacker doll swaps (`swap-summary.txt`; 54 swapped scenarios + 13 doll-free controls)
Bases are the accepted swap scenarios: Body Slam PERSIAN -> SLOWBRO, Leech Seed PERSIAN -> SLOWBRO, Headbutt GOLEM -> ONIX (opponent) and ZIGZAGOON -> ONIX (player). Each was staged, on its own side, with these subbed attackers: AERODACTYL and FLYGON (elevated on the opponent side), STEELIX, WAILORD, TYRANITAR (tall / large), PICHU (small), ONIX, RATTATA (idle-rest species; on the opponent side they rest, on the player side they are the brief's player-side idle-rest attacker) and shiny STEELIX.
- **Body Slam / Leech Seed: every non-shiny window is 0 px, swap rows included, both sides** (incl. the elevated AERODACTYL / FLYGON and the resting ONIX / RATTATA opponent attackers). The one exception is FLYGON player Leech Seed: 32 px on one body row, equal to its doll-free control.
- Headbutt: swap rows 0 px everywhere. The body residuals equal the doll-free controls.
- Shiny: DEFECT (above).
- **Not reached (the ROM gives no swap window; probes recorded no `Special_SubstituteToMon` body):**
  - PICHU in 4 of 6 scenarios: the player Body Slam, both Leech Seeds and the opponent Headbutt;
  - FLYGON / WAILORD opponent Headbutt.
  - Not re-staged.

### Ice Ball counters 1..4 (`iceball-summary.txt`; d4aTimingCheck, policy phase selected on all 28)

Side = the target's side (opp = player GLALIE / SPHEAL attacker; player = opponent GLALIE attacker).

| Target (side) | Counters reached | Result |
|---|---|---|
| LUNATONE (levitating, opp), WEEZING (opp), GOLBAT (elevated, opp; SPHEAL chain) | 1..3 | 0 px |
| STEELIX | opp 1..3, player 1 | 0 px |
| WAILORD | opp 1..4, player 1 | 0 px, incl. counter 4 (133 rows, event phase = policy) |
| TYRANITAR | opp 1..4, player 1 | opp: counters 2 and 4 0 px, counters 1 / 3 UNRESOLVED 40 / 11 px; player-side: counter 1 UNRESOLVED 2 px |
| RATTATA (idle rest) | opp 1..2, player 1 | opp: UNRESOLVED; player-side: 0 px |
| ONIX (idle rest) | opp 1..2 | UNRESOLVED |

Counter 4 was reached only with WAILORD / TYRANITAR. Elevated targets reached counters 1..3. The ROM KO'd the target before counter 4.

**Not reached overall:**
- a 0-px patch proof for the Body Slam / Brick Break / Flamethrower / Attract rest rows (Body Slam: partial probe, 40,241 -> 17,456) and for the Ice Ball idle-rest target rows;
- doll-free Crunch / Psychic controls for the LAG FRAME phases;
- Ice Ball counters 2..4 with the opponent attacker (the GLALIE chain resets in the ROM);
- a shiny Ice Ball row;
- a VBlank-write probe for the two one-row Attract rows.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
W=tools/integration/fixtures/species-audit-13
# defender doll: stage (byte-identical to $W/scenarios*), probe twice fresh, derive, production checker -> <receipt dir>/{main,nodf}
sh tools/integration/speciesAudit13Run.sh /tmp/s13/probes /tmp/s13/probesn /tmp/s13/rec 14
# shiny defender personalities (already committed): $W/personality.tsv  <- speciesAudit13Personality.py <scenario> <stem>
# defect 1 proof (reverted by trap): opponent idle-rest attacker
sh tools/integration/speciesAudit13Patch.sh $PWD/$W/opponent-attacker-rest-env.diff /tmp/s13/probes /tmp/s13/p-rest S13_REST=1 \
  $W/derived/s13-atkonix-{ice-beam,thunderbolt,sludge-bomb}-opponent-test.json $W/derived/s13-ctl-*-{ice-beam,thunderbolt,sludge-bomb}*-test.json
# LAG FRAME counters
sh tools/integration/issue151Counters.sh /tmp/s13/counters 14 $W/derived/s13-{ctl,defonix}-crunch-player-test.json  # full list: counters.txt
# attacker doll swaps (+ doll-free --plain controls); one probe dir holds both
python3 tools/integration/speciesAudit13SwapStage.py /tmp/s13/swsc && diff -r /tmp/s13/swsc $W/swap-scenarios
OUT=/tmp/s13/swp SC=$W/swap-scenarios JOBS=15 sh tools/integration/speciesAudit13SwapProbes.sh
sh tools/integration/speciesAudit13SwapRun.sh /tmp/s13/swp /tmp/s13/swrec 14
# defect 2 proof: apply $W/swap-shiny-palette-env.diff, S12_SHINY=STEELIX POKEBENCH_LIVE_ORDER_INPUT=none S13_ATTACKER_PERSONALITY=<swap-personality.tsv>
#   node --experimental-strip-types --no-warnings tools/integration/speciesAudit13SwapCheck.ts --out=... <probe.json:rgb-dir>; git checkout src
# Ice Ball
python3 tools/integration/speciesAudit13IceBallStage.py /tmp/s13/ibsc && diff -r /tmp/s13/ibsc $W/iceball-scenarios
OUT=/tmp/s13/ibp SC=$W/iceball-scenarios JOBS=15 sh tools/integration/speciesAudit13IceBallProbes.sh
python3 tools/integration/speciesAudit13IceBallFixtures.py /tmp/s13/ibp $W/iceball-scenarios /tmp/s13/ibder
sh tools/integration/speciesAudit13IceBallRun.sh /tmp/s13/ibrec 10 /tmp/s13/ibder/*.json
```
Timings: about 8 min for the 620 defender probes (15 jobs), 70 s per defender checker pass, 3 min for the swap probes and 1.5 min for the Ice Ball windows.

## 4. Gates
`npm test` passed on 535fbe268: 1565 files passed / 44 skipped, 12,888 tests passed / 223 skipped, 569.7 s. `npm run build` passed. `git diff --check 821cdc031..HEAD` is clean. The commit range adds new files only (`git diff --diff-filter=AM --name-status` = A only). `git status src` was clean at every commit.
