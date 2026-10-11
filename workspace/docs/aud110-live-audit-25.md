# aud110 — live audit 25 (S10A main lane, 2026-10-11): the Taunt / Harden windows stg107 flagged, re-checked with aligned windows

Evidence only, new files only (`aud110*` prefix). Fixed base **master `5c050b765`** (production src `14d1be159`). Every production number is
the PRODUCTION live renderer (`renderBattleResolutionLiveView` through audit20Check.ts / audit21Check.ts) on a git-archive copy of the base
(+ stg107's Struggle diff so later Struggle bodies have adapters; the flagged bodies precede any Struggle). Direct mGBA only, lab seed
305420349, species are internal ids, every probe = two fresh mGBA processes (r1 == r2), windows aligned with `aud110Align.py`
(audit21Align.py's method for the moves it does not list).

## Results

**The two flagged windows are ARTIFACTS: 29.5k px (Taunt 269) and 9.3k..15.9k px (Harden 106) were checker window alignment, 0 px once aligned.**
The widened sweep then found **three real DEFECTS** (new, none in stg107's routes' flagged first bodies); each has a source mechanism and a
banked patch proven 0 px on every flagged and widened window.

| # | Window class | Unaligned (stg107's view) | Aligned, base 5c050b765 | Verdict | Aligned + patches |
|---|---|---|---|---|---|
| 1 | Taunt 269, stg107 routes, player Taunter (6 windows: Snorlax / Onix / Golbat / Jolteon -> Snorlax / Onix / Shedinja / Golbat) | 29.5k..29.9k px, ages 0..48, 16..19 exact rows of 135 | 125 / 125 rows, **0 px** | **ARTIFACT** | 0 px |
| 2 | Taunt 269, stg107 routes, opponent Taunter, 3 windows (Shedinja -> Snorlax, Snorlax -> Shuckle x2: first + later body) | 29.5k..29.7k px | **0 px** | **ARTIFACT** | 0 px |
| 3 | Taunt 269, opponent Golbat -> player Onix / Shedinja (stg107 ply-95-42 #1 / #2, ply-303-42) | 29.6k px | **216 / 216 / 283 px** (ages 75..123 / 107..123) | **DEFECT A** (below) after the artifact is removed | **0 px** |
| 4 | Harden 106, stg107 routes (opp-143-42-sub x3, opp-pp x6, ply-pp x6; Snorlax / Dusclops / Onix) | 9.3k..15.9k px, ages 3..62, 56..60 exact rows of 102 | 101 / 101 rows, **0 px** | **ARTIFACT** | 0 px |
| 5 | Mean Look 212 (stg107 PP routes + 2 widened) | 0 px (171 rows) | 0 px | clean | 0 px |
| 6 | Substitute 164 (stg107 doll route + 2 widened) | 0 px (87 rows) | 0 px | clean | 0 px |
| 7 | Widened Taunt: Kingler -> Crobat (elevated opp target), Alakazam -> Snorlax (big), Haunter -> Onix; opp Crobat (elevated) -> Kingler, Dusclops -> Shuckle, Onix (big) -> Golbat | n/a | 4 of 6 **0 px**; Crobat -> Kingler **568 px**, Onix -> Golbat **304 px** | **DEFECT A** | 0 px |
| 8 | Widened Harden (both Harden x4, both orientations, first + later bodies): Kingler / Crobat (elevated), Snorlax (big) / Dusclops, Haunter / Onix | n/a | 10 of 12 **0 px**; opponent ONIX Harden (c1, c3) **109,067 px** (101 rows, every row 1,091 px) | **DEFECT B** | 0 px |
| 9 | Widened Swagger 207 (extra: not in stg107's parties): Alakazam -> Snorlax, opp Crobat -> Kingler, Rattata <-> Onix (regression pair) | n/a | Rattata pairs **0 px**; Alakazam **65,847 px**, Crobat **75,383 px** (ages 3..45+, 116..120 of 161 rows exact) | **DEFECT C** | 0 px (8 / 8 windows) |

Totals (`fixtures/aud110/c-aligned-patched.txt`, the CHAIN lend through the production renderer): **Taunt 19 / 19, Harden 35 / 35, Mean Look 4 / 4,
Substitute 3 / 3, Swagger 8 / 8 windows 0 px, r1 == r2 on all 69**. Base (`b-aligned-base.txt`): Taunt 14 / 19, Harden 33 / 35, Swagger 4 / 8,
Mean Look and Substitute all clean. Struggle bodies (25 here) are stg107's, not listed. Entry-lend control px (`entry=`) is the doll /
sprite-order variant and equals the chain px everywhere a chain defect exists.

## 1. Alignment (verdict 1, 2, 4)

audit20Fixtures.py windows start at the ROM activation (gAnimScriptActive's rising edge) and span the probe body; production's accepted window
starts later, `LIVE_MOVE_IDLE_LEAD_ROWS` (land97) rows into the body and lasts `liveMoveAnimationDuration` rows:

| Move | Lead N | Production rows D | audit20 rows (activation..) | Aligned window |
|---|---|---|---|---|
| Taunt 269 | 10 | 125 (`case 269: return 125; // 76..200 / 80..204; script activation is 10 frames earlier`) | 135 | activation + 10 .. + 134 |
| Harden 106 | 1 | 101 | 102 | activation + 1 .. + 101 |
| Swagger 207 | 7 | 161 | 168 | activation + 7 .. + 167 |

Rendering production age k against the ROM frame `activation + k` therefore compared age k with the ROM image N rows too early: 29.5k px for
Taunt, ~10k px for Harden. `tools/integration/aud110Align.py` writes the aligned fixtures (`denseWindow` start + N, D rows, `bodyStartFrame` /
`bodyEndFrame` keep the probe body; audit21Check.ts renders them). Swagger's alignment is also the measured best one (a sweep of the start offset
0, 3, 5, 7, 9, 11 on one fixture gave 22, 27, 57, **120**, 55, 25 exact rows). `a-unaligned-stg107.txt` reproduces stg107's flagged numbers
exactly (29,521..29,892 px Taunt, 9,354 / 10,412 / 15,918 px Harden).

## 2. The three defects

**A. Taunt 269: the anger marks are drawn BEHIND the player battler when the target is the player** (`src/engine/battleScene.ts` TAUNT branch).
ROM: `Move_TAUNT` creates `gAngerMarkSpriteTemplate` with `ANIM_TARGET, 2`, and `ScriptCmd_createsprite` (battle_anim.c:384-392) gives it
subpriority `GetBattlerSpriteSubpriority(target) - 2`: target opponent (40) -> 38, behind the player battler (30); target player (30) -> **28, in
front of the player battler**. The branch hard-coded "anger = 38" (the staged player -> Murkrow/Shuckle order) and drew the marks between the opponent
and the player battler for both orientations. Pixels: 3..12 px per row on the two anger-mark rows (ROM 0xff3108 red, live the target's own gray) where the
mark overlaps the target (Onix, Shedinja: 216..568 px; Snorlax / Shuckle targets do not overlap: 0 px). Patch
`fixtures/aud110/aud110-taunt-anger-front.diff`: draw the marks after the player battler (and after the bubble, 29 > 28) when the target is
the player. The Swagger branch draws its marks after everything for both orientations; it shares the same source rule and no overlap residual was seen
(Swagger's anger rows are inside its separate residual C; **not** audited for the mark order here: a note, not a verdict).

**B. Harden 106: an OPPONENT attacker's front idle rest is not applied** (`battleScene.ts` HARDEN branch). The branch applies `sceneOnBattlerFrontIdleRest`
to the target only (`view.target.geometry.side === "opponent"`), the attacker is drawn at `spriteCorner` plain. Opponent ONIX (rest x2 = 1) is drawn 1 px
left of the ROM on every row: shifting the live frame by one px matches the ROM except 39 px (the Harden shine); 1,091 px per row x 101 rows. This is the same
class as altspecies S2 (docs/altspecies-live-evidence.md: Sandstorm ONIX, "opponent-attacker front-idle rest offset missing"). Patch
`aud110-harden-opponent-attacker-idle.diff`: the attacker corner (also the metallic-shine mask corner) adds the attacker's rest when it is the opponent.

**C. Swagger 207: the grow-and-shrink uses the Rattata picture height 38 / 32 for every species** (`src/animation/swagger.ts`, `battlerHeight = side === "player" ? 38 : 32`).
ROM: `SetBattlerSpriteYOffsetFromYScale` (battle_anim_mons.c:1873) uses `MON_PIC_HEIGHT - 2 * GetBattlerYDeltaFromSpriteId` = the attacker's pic-coords y_offset
(`64 - 2 * yOffset`). Bulk Up already receives `battlerHeight: attackerAnchors.pictureHeight`; Swagger never did. Rattata is the pair the 38 / 32 came from (0 px
base and patched). Patch `aud110-swagger-picture-height.diff` (3 files): optional `battlerHeight` on `SceneOnSwaggerConfig`, passed from `attackerAnchors.pictureHeight`
in `liveMoveAnimation.ts` (default unchanged for the staged Rattata pair). Not a timing phase: the alignment is the measured best and every row after the first
squash differs.

No TIMING-PHASE (D4-class) verdict anywhere: in all 69 windows the aligned rows are exact or the residual is a drawn-shape residual above.

## 3. Census exposure (base 5c050b765, seeds 0..999, `ret88Census.sh shards`: 27,515 commands; `fixtures/aud110/exposure-base-5c050b765.json`)

The census counts every one of these bodies as **live** today (live = by status, not px-exact).

| Body | Commands | Live | Exposed to the defect |
|---|---|---|---|
| Taunt 269 | 28 | 28 | A: **18 commands in 11 battles** have an opponent Taunter (Murkrow x14, Mightyena x4) whose mark can overlap the player target; the overlap (so the px) depends on the target's picture: 216..568 px on Onix / Shedinja / Kingler / Golbat targets, 0 px on Snorlax / Shuckle |
| Harden 106 | 38 | 38 | B: **0**: all 16 opponent Harden commands are RELICANTH (rest x2 = y2 = 0) |
| Swagger 207 | 127 | 127 | C: **100 commands in 59 battles** have an attacker whose `64 - 2 * yOffset` differs from 38 / 32 (5 more attacker symbols not looked up by this tool's name match) |
| Mean Look 212 / Substitute 164 | 27 / 47 | all live | none found |

The census was not re-run on a patched tree: a patch is banked, but each is presentation-only and the budget was spent on the windows; a land step should run
`ret88Census.sh compare` as usual (frames and keys cannot move; the three patches change no timing).

## 4. Banked patches (apply to a git-archive copy of `5c050b765`; nothing is applied to the live tree)

| Patch | Defect | Scope |
|---|---|---|
| `fixtures/aud110/aud110-taunt-anger-front.diff` | A | `battleScene.ts` |
| `fixtures/aud110/aud110-harden-opponent-attacker-idle.diff` | B | `battleScene.ts` |
| `fixtures/aud110/aud110-swagger-picture-height.diff` | C | `swagger.ts`, `sceneOnPresentation.ts`, `liveMoveAnimation.ts` |

Land step (not done here): apply the three (they touch disjoint hunks; `git apply` of all three on the base is what arm C does), then add pins: Taunt opponent -> Onix
rows 75..91 / 107..123, Harden ONIX opponent rest, Swagger Alakazam / Crobat (rows from `c-aligned-patched.txt`), and extend the Swagger / Taunt branch test pairs beyond the staged
Rattata / Murkrow. Gates not run (new files only, no tracked file changed): `npm test` / `npm run build` are unaffected by this step.

## 5. Reproduce (from workspace/)

```
sh tools/integration/aud110Run.sh .integration/validation/<fresh>                  # A unaligned (stg107's view), B aligned base, C aligned + 3 patches (~7 min); `same` / `DIFF` vs the fixtures
AUD110_CENSUS=1 sh tools/integration/aud110Run.sh .integration/validation/<fresh>  # + census 0..999 on the base -> exposure receipt (~5 more min)
```

Files: `aud110Run.sh` (runner), `aud110Patched.sh` (scenarios -> probes -> fixtures -> check on an archive copy), `aud110Align.py`, `aud110Stage.py` (17 widened scenarios on stg107Stage's
member / base), `aud110Summary.py`, `aud110Exposure.ts`; fixtures `a-unaligned-stg107.txt`, `b-aligned-base.txt`, `c-aligned-patched.txt`, `exposure-base-5c050b765.json`, the three diffs.
