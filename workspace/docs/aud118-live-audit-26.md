# aud118: live audit 26 (S10A main lane, evidence only, 2026-10-11)

An independent audit of today's new live presentation against the ROM: Struggle 165 (stg107 / stl109 / sdl119), the `stats-change` banner
in both scenes (sc106 / scd112), and the Scene OFF no-hit pauses and used-move holds (olnd113). It samples species, histories and routes
beyond the landed proofs. The **FIXED base is master `396308f86`** (production src `377ed0c48`). Every production render or route runs in a
git-archive copy of that base (plus a banked patch where stated). Direct mGBA only, with explicit lab seeds (Struggle 305420349, stat / OFF
305419897) and INTERNAL species ids. Every probe job ran twice in fresh processes (r1 == r2). Windows are aligned to production's accepted
start (`aud110Align.py`), and every row goes through the production renderer (`audit21Check.ts` / `scd112ProductionCompare.ts`). No
existing tracked file was edited.

## 1. Results: verdict table

| # | Area / window set | Windows | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Struggle, 6 new pairs, both orientations: player BIG Steelix -> elevated Butterfree, opp elevated Butterfree -> SMALL Diglett, player Diglett -> BIG Steelix, opp Steelix -> Wailord, opp elevated Ledian -> Alakazam, player Steelix -> Shedinja (KO) | 11 live Struggle windows (T2 / T4, each after live Taunt / Harden bodies = lend chains) | **OK**: 11 / 11 at 0 px, r1 == r2 | `fixtures/aud118/struggle-base.txt` |
| 2 | Struggle KO + switch-in: player Steelix's Struggle KOs Shedinja, the opponent's Chansey switches in, 4 later Harden bodies | 1 Struggle + 4 Harden | **OK**: 5 / 5 at 0 px | same, `pb-aud118-ply-208-303-c*` |
| 3 | Taunt / Rain Dance bodies of the same battles (the lend chains before / between the Struggles) | 13 Taunt + 1 Rain Dance (live, no Struggle-x2 history) | **OK**: 14 / 14 at 0 px | same |
| 4 | **Struggle onto an opponent with a non-zero front idle rest (ONIX, RATTATA), then that opponent's next live body** | Taunt after the Struggle: opp ONIX **136,375 px**, opp RATTATA **50,661 px** (full window, every row) | **DEFECT A** (x2 tracker, mechanism from source) -> banked patch: **0 / 0 px** | `struggle-base.txt` vs `struggle-patched.txt` |
| 5 | Those Struggle bodies themselves (a later Struggle with a non-zero rest on the field) | 4 | DECLINE by design (stg107's gate: a later Struggle only with zero idle rests), not live | `decline=unclassified (case-local gate)` |
| 6 | Castform in a weather form: the player Golduck's T1 Rain Dance turns the opponent CASTFORM rainy, and it struggles on T3 | 1 Struggle + 2 Taunt + 1 Harden | DECLINE by design (cast83, ISSUES #143: a weather-form Castform body is not ROM-proven). Rain Dance 0 px. Kyogre (Drizzle) can't be staged: production has no Kyogre battle pic, and Factory never shows one | `pb-aud118-opp-385-55-rain-c*` |
| 7 | stats-change banner, 9 new scenarios x Scene ON / OFF: Dragon Dance (player Dragonite), Calm Mind (ELEVATED opp Crobat), Bulk Up (opp RATTATA), Leer onto opp CASTFORM, Superpower self drop right after its own x2 body (opp ONIX, rest kept: corner 145 ON / 144 OFF == ROM), Swords Dance (opp ONIX), Screech onto opp RATTATA, Intimidate FROM elevated Masquerain, Intimidate ONTO elevated opp Crobat (the opponent Roars the player's Intimidate bench in) | 18 (rows A-1 .. E+2, 79 / 93 each) | **OK**: 18 / 18 at 0 px, rect and full screen. Production corner == ROM mask rect on all 18. r1 == r2 for the probes (18 / 18) and the comparator | `banner-compare.txt`, `banner-stat-anim.json` |
| 8 | Banner: the next message's first glyph (print path) | 10 print-path windows | **TIMING-PHASE (known)**: the glyph lands **1 row early** (E+2, 321..430 px, message box band only). This is sc106 / olnd113's documented post-stats-change δ. The 8 playstatchangeanimation windows are 0 px at E+2 | `banner-compare.txt` `next rows` |
| 9 | Scene OFF pause, 8 new classes: Swords Dance, Agility (stat self), Leer, Screech (stat target), Light Screen, Reflect, Haze, Spore (sleep) | 8 classes vs production census uses (seeds 0..399; 6..106 uses each) | **OK**: 8 / 8 at 0 residual against the landed anchor. The 4 stat classes are +1 against off108's raw anchor, which is exactly olnd113's lead(STATS_CHANGE) = 1: an anchor-convention ARTIFACT, not a residual | `off-verify.txt`, `off-classes.tsv` |
| 10 | Scene OFF hold: "But it failed!" after a repeated Light Screen / Reflect / Rain Dance | 3 classes (33 + 2 + 39 production uses) | **OK** in Scene OFF: 0 / 0 / 0 | `off-hold.txt`, `off-verify.txt` |
| 11 | **Scene ON: the same "But it failed!" hold** | Light Screen 33 uses, Reflect 2, Rain Dance 39 (seeds 0..399) | **DEFECT B** (timing, mechanism from source): production starts the message **40 / 39 / 39 frames early** -> banked patch: **0 / 0 / 0**. The OFF routes are byte-identical with the patch | `off-hold.txt` |
| 12 | Scene OFF: the stat message's first glyph after pause + stats-change command (joint target) | 4 new stat classes | **TIMING-PHASE (known)**: **−1** on all 4. This is olnd113's documented print-path δ | `off-verify.txt` `joint` |
| 13 | Scene OFF Substitute | 16 production uses (seeds 0..399) | **KNOWN DEFECT (ISSUES #153)**, quantified here. The ROM plays the Substitute body in Scene OFF: a 90-row waitanimation with 40 screen changes, HP bar G+98, message glyph G+140. Production gives a 40-frame plain pause: HP bar **−57**, message **−71** frames, and no doll body | `off-substitute.json` |
| 14 | Scene OFF Mist | ROM only | **NOT MEASURABLE**: 0 production uses in seeds 0..999 (the 400..999 shards are empty). ROM: Pausex20 at G+4, glyph G+40 | `off-rom-r1.json`, runner |

**Totals.** Struggle-battle windows: 41. 30 are live at 0 px on the base. The 2 DEFECT A windows go to 0 with the patch, which makes **32 / 32 live windows 0 px** (the other 9 decline by design). Banner: 18 / 18 OK. Scene OFF:
11 / 11 classes OK. One new presentation timing defect in Scene ON (B). No alignment ARTIFACT among the rendered windows, because every
window is aligned (`aud110Align.py`). The only anchor ARTIFACT is the stats-change lead convention in row 9.

## 2. DEFECT A: Struggle's target x2 (the x2 tracker's fallback)

- **Mechanism (source).** `Move_STRUGGLE` (`data/battle_anim_scripts.s`) shakes both battlers only with `AnimTask_ShakeMonInPlace`. That
  task is relative: it returns to the start x2. So an opponent ONIX / RATTATA (front idle rest x2 = 1) **keeps x2 = 1** after being hit.
  `liveBattlerX2History.ts` has no row for 165. Its documented fallback for a damaging move (power 50 > 0) marks the target `zeroed`. The
  next live body that reads that battler's x2 then draws it 1 px off. Here that is the opponent's own Taunt (attacker anchors) on every row.
- **Windows.** `pb-aud118-ply-50-95-c2` (opp ONIX Taunt) 136,375 px. `pb-aud118-ply-65-19-c2` (opp RATTATA Taunt) 50,661 px. r1 == r2.
- **Patch** `tools/integration/fixtures/aud118/aud118-struggle-target-x2-keep.diff` (`git apply` at the workspace root): adds 165 to
  `LIVE_BATTLER_X2_MOVE_TABLE.target.keep`, plus a one-line comment. The flagged windows go to **0 px**. All other 39 summary lines are byte-identical
  base vs patched, including every 0 px window and every decline (`struggle-base.txt` / `struggle-patched.txt`). The attacker role
  needs nothing, because its fallback is already `keep`.
- **Census exposure** (base 396308f86, `ret88Census.sh` seeds 0..999, `aud118Exposure.ts`): **0**. That census has 1,001 Struggle
  commands (895 live), and in none of them does the player struggle onto an opponent with a non-zero rest. The defect is still reachable in
  Factory: ONIX appears on both sides of that census (64 opponent-attacker commands). `exposure-base-396308f86.json`.

## 3. DEFECT B: Scene ON "But it failed!" after a no-effect attackanimation

- **Mechanism (source).** A repeated Light Screen / Reflect fails in `setlightscreen` / `setreflect` (MOVE_RESULT_MISSED). It then runs
  `BattleScript_PrintReflectLightScreenSafeguardString`: `attackanimation`, `waitanimation`, `printfromtable`. A repeated Rain Dance fails
  in `setrain` and runs the same three instructions in `BattleScript_MoveWeatherChange`. `Cmd_attackanimation`
  (`battle_script_commands.c:1793-1797`) takes its MOVE_RESULT_NO_EFFECT branch and pushes `BattleScript_Pausex20` **in Scene ON too**,
  with no controller command. So the ROM shows "X used LIGHT SCREEN!" until the "But it failed!" glyph at **G+41** (Reflect G+40), the same
  in both scenes; Rain Dance G+40 (`off-rom-r1.json`, the -twice scenarios' second use). Scene OFF is exact, because its kernel emits SCENE_OFF_ATTACK_PAUSE and
  olnd113's pause fires. In Scene ON there is no receipt. olnd113's used-move hold (`sourcePauseUsedMoveHoldFrames`) only recognises a
  literal `pause B_WAIT_TIME_SHORT` within the three instructions before the print. So production starts the message at G+1:
  **−40 (Light Screen, 33 / 33 uses), −39 (Reflect, 2 / 2), −39 (Rain Dance, 39 / 39)**.
- **Patch** `tools/integration/fixtures/aud118/aud118-on-noeffect-attackanimation-hold.diff`: the same back-scan also accepts
  `B_SCR_OP_ATTACKANIMATION`. Reaching it with no attack receipt in between means the NO_EFFECT branch ran, and the hold is
  Δ(print) + 1, as for a source pause. Scene ON goes to **0 / 0 / 0**. Scene OFF routes are **byte-identical** with the patch (4 / 4 shards), because the
  OFF attack receipt stops the scan first.
- **Census exposure** (Scene ON `off108Route.ts` seeds 0..999 in the base / patched copies, `aud118HoldExposure.py`,
  `hold-exposure.json`): the patch changes **519 of 37,777 compared uses in 234 battles** (+23,894 frames). Only the used-move
  message's holdFrames change: **0 other command changes**. By move and first message: Light Screen 70, Reflect 20, Rain Dance 72,
  Sunny Day 16, Sandstorm 83, Hail 22, Safeguard 62, Protect 50, Detect 7, Endure 16 ("But it failed!"), Stockpile 1 (can't stockpile),
  Leech Seed 82 (evaded) + 18 (doesn't affect). Light Screen / Reflect / Rain Dance are ROM-proven to 0 here. The others take the same
  source branch (a failed set* followed within three instructions by attackanimation / waitanimation / print) but are **not ROM-proven
  per class**. Leech Seed also has an earlier `pause B_WAIT_TIME_SHORT`, so it deserves its own probe before a landing. Two
  FRAME_BUDGET-stalled battles (seeds 434 / 796, the olnd113 set) end 2 uses earlier with the patch (590 -> 588, 626 -> 624).
- **Siblings, unmeasured.** A damaging move with no effect on an immune target takes the same branch, but its first message comes several
  instructions later (resultmessage, after a play-se receipt), so the patch does not touch it.

## 4. Method

- **Struggle** (`aud118Stage.py`): stg107's TAUNT route on new pairs. The faster side Taunts, and the struggler (Harden x4) has no usable
  move on T2 / T4. The rain job's player uses Rain Dance on T1 (slot 2), then goes back LEFT to Taunt, because the move cursor remembers
  the slot. The KO job's benches know Harden (Tackle has no production live adapter). `aud118Patched.sh` = `fix114Patched.sh` on the fixed base,
  without stg107's diff, because Struggle is landed. `aud118Summary.py` lists every move.
- **Banner** (`aud118StatStage.py`, `aud118StatRun.sh`): stat101's staging and probe (`stat101Probe.py`, ON / OFF, r1 / r2),
  `stat101Receipts.py` / `stat101NpzToRaw.py`, then `scd112ProductionCompare.ts` unchanged. Inside the copy only, its
  `fixtures/stat101` is replaced by this run's scenarios and receipts. The comparator's x2 history replays the probe's bodies through the
  production tracker, so in Scene ON the earlier Tackle / Screech zeroes and Superpower's kept rest are part of the check.
- **Scene OFF** (`aud118OffStage.py`, `aud118OffRun.sh`): off108's staging, `idle94Probe.py` ON / OFF x r1 / r2 (24 / 24 r1 == r2),
  `off108Rom.py`, and `off108Route.ts` OFF seeds 0..399 (Mist 400..999), ON 0..399 (Light Screen / Reflect). Then `aud118Classes.py`
  (off108Classes.py's rule table with a new CASES list), `off108Verify.py`, `aud118Verify.py` (olnd113Verify.py with the new stat SCEN +
  the #153 row) and `aud118OnHold.py`. The Scene ON hold is measured on ON routes of the same moves, because the off108 class matcher
  keys on the OFF attack receipt, which Scene ON does not emit there (`off-verify.txt`'s "on" rows are empty by construction).

## 5. Reproduce (from workspace/)

```
sh tools/integration/aud118Run.sh .integration/validation/<fresh>                   # Struggle base + patched, banner, Scene OFF / ON hold (~8 min)
AUD118_CENSUS=1 sh tools/integration/aud118Run.sh .integration/validation/<fresh>   # + census 0..999 (base) -> Struggle exposure, ON hold exposure
```

Every receipt prints `same` / `DIFF` against `tools/integration/fixtures/aud118/`. Reproduction status: one fresh end-to-end run
(`worker-scratch/R1`) printed `same` for the Struggle (base + patched), banner and Scene OFF / ON hold receipts (section 6). The census
receipts (`exposure-base-396308f86.json`, `hold-exposure.json`) were produced by the census arm's exact tools and copies
(`ret88Census.sh shards` -> `aud118Exposure.ts`; `off108Route.ts --scene=on` 0..999 in the base / patched copies ->
`aud118HoldExposure.py`), but the census arm was not rerun end to end inside the 60-minute cap.

Files: `aud118Stage.py`, `aud118Patched.sh`, `aud118Summary.py` (Struggle); `aud118StatStage.py`, `aud118StatRun.sh` (banner);
`aud118OffStage.py`, `aud118OffRun.sh`, `aud118Classes.py`, `aud118Verify.py`, `aud118OnHold.py` (Scene OFF / ON hold);
`aud118Exposure.ts`, `aud118HoldExposure.py` (census); `aud118Run.sh` (all). Patches and receipts are in `tools/integration/fixtures/aud118/`.

## 6. Reproduction run (fresh, 19:00 -> 19:10, `sh tools/integration/aud118Run.sh .integration/validation/aud118-20261011/worker-scratch/R1`)

```
same struggle-base.txt
same struggle-patched.txt
TOTAL HARDEN 4/5 (r1==r2 5)  RAIN_DANCE 1/1 (r1==r2 1)  STRUGGLE 11/16 (r1==r2 16)  TAUNT 15/17 (r1==r2 17)
stat probes r1 == r2: 18 / 18
SAME comparator r1 == r2
production path, rect + full screen 0 px windows (rows A-1 .. E+2): 18 / 18
same banner-compare.txt
same banner-stat-anim.json
off probes: 26 / 26 r1 == r2
SAME rom r2 == r1
same OFF routes off-0 (patched)  ... off-3 (patched)
same off-rom-r1.json
same off-classes.tsv
same off-verify.txt
same off-substitute.json
same off-hold.txt
```

(The TOTAL line is the patched arm. Its non-0 counts are the 9 designed declines of rows 5 / 6. The base arm has TAUNT 13 / 17: DEFECT A.)

Gates (archive copy of `f43e580a5`, the tools-only tip before the receipts / doc): `npm run test:smoke` 8 files / 448 tests passed. The
directory-scanning tests (`gate6CoverageManifest`, `aud56GeneralAnimationAllocator`, `land75WallRoutes`) 3 files / 32 passed.
`npm run build` green. The full `npm test` was not run, because the brief forbids the full suite on the live checkout. No `src/` or `tests/`
file changed, so the suite's inputs are 396308f86's. `git diff --check` clean.

**Master moved during the audit** (scf117 + shp116 merged; scf117 adds source-derived x2 tracker rows and the post-stats-change message
alignment, which targets the known TIMING-PHASE rows 8 / 12). On the tip `3c4fdd598`, neither DEFECT is fixed by source: the x2 tracker
has no 165 row, and `sourcePauseUsedMoveHoldFrames` has no attackanimation case. Both banked patches pass `git apply --check` on that tip's
`src/`. All measurements above are on the fixed base 396308f86. The tip was not re-probed.
