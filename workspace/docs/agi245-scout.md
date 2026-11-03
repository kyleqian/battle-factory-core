<!-- Read-only worker scout (agi245, 2026-11-03, Sonnet); supervisor-saved. Central claim checked: the clip line is at src/engine/battleScene.ts:21369-21371 as cited. /tmp paths are scratch and may be gone. -->
# agi245 scout report: Agility clips the user's lower rows

**Result:** The ROM does not clip like this, so it is our bug. The ROM draws the full moving AIPOM copies, with only the player's healthbox covering their feet. Ours cuts them at a hard-coded row. One line at `src/engine/battleScene.ts:21369-21371` is the cause. A one-constant change gives 0 px diff on every frame for 6 opponent species. I made no edits or commits, and `git status` is clean. All scratch work is under `/tmp/agi245/`.

## 1. ROM vs ours, opponent AIPOM using Agility on ONIX

Setup: AIPOM (190) with Agility x4 on the opponent side, ONIX (95) with Splash x4 on the player side. It uses mechanicLab `overrides.parties` with seed 305419897, as the existing Agility fixtures do.

- **ROM window:** the Agility body is frames 72..158 (87 frames). The first motion is at frame 77 and the last at frame 139.
- **Frame numbering:** the HTTP oracle on :8012 and the direct-mGBA probe give pixel-identical frames, so there is no offset between them.
- **Stat-up frames:** the cyan zig-zag frames at about 168..250 are the stat-up animation that follows Agility. Ignore them.
- **Current production render:** I rendered through the production path (`liveView` with `renderBattleResolutionLiveView`) and compared per frame. Regions compared are opponent side y<88, and the player sprite x<120, y<112 on the player side. I excluded the healthbox rows because my staged HP differs from the ROM's.
  - 62 of 87 frames differ, 14,833 px in total, first at age 5 and last at age 66, at most 445 px in one frame.
  - All diffs are in rows 66 to 73 (px per row: 66: 2353, 67: 2241, 68: 2065, 69: 2041, 70: 1850, 71: 1688, 72: 1451, 73: 1144).
  - Diff columns are x=140..216.
  - Ages 0 to 4 and 67 to 86 are exact.
- **Crops:** `/tmp/agi245/AIPOM-age{14,31,60}_ROM_ours-current_ours-fixed.png` show ROM, current code, and fixed code side by side, scaled 3x. In the current-code panel the copies are sliced flat at row 66, and an isolated tail tip sits at the rest position. The fixed panel matches the ROM.
- **Other crops:** `/tmp/agi245/cmp-age{5,10,14,25}.png` show ROM, ours, and a red diff mask. `rom84.png` and `rom114.png` are plain ROM crops.

**The ROM has no clip here.** At frame 114, with copy y2 up to 12, the copies' feet reach row 71+12=83 unclipped, but ROM pixels stop at row 73. The reason is the player's healthbox sprite (OBJ priority 0), whose top edge sits at about row 74. The registers at frames 84 and 100 show no window clip (WININ and WINOUT are both 0x3f3f). BG2 is empty, and BG1 (priority 2) is the monbg layer. The ROM data also shows y2 ranging over 0..12.

## 2. Root cause in ours

- **The fault:** `src/engine/battleScene.ts:21369-21371`:
  ```
  const attackerClipY = opponentToPlayer ? attackerCorner.y + 55 : 160;
  ```
  This applies even when the live field is used (`liveField`). It is a LEDYBA calibration: LEDYBA's sprite corner row (`spriteCorner.y`, 20) plus 55 is 75. AIPOM's corner row is 43−32 = 11, so its clip lands at row 66, eight rows too high.
- **Where it applies:** the clip is passed to three calls in the opponent branch: `drawSpriteSheetClippedBelow` for the moving copy (`:21412-21416`), `eraseSpriteFootprint(..., attackerClipY)` for the rest sprite (`:21411`), and each afterimage (`:21433`, `:21445`, `:21457`).
- **Why the tail tip stays:** `eraseSpriteFootprint` (`:11203-11226`) skips rows with `y >= maxY`, so rest-art rows 66 to 71 are never erased. They remain from the earlier `drawSpriteSheet` at rest, which is the tail piece Kyle sees. The moving copy and the afterimages are all cut at the same row. It is the same clip applied three times, not a BG-versus-sprite or priority issue.
- **What is not wrong:** there is no fixed 64-row copy, and no missing tile row or palette region. The agility reducer (`src/animation/agility.ts`) is correct, since the diff is zero above row 66.
- **Sibling sites:**
  - Quick Attack (`:49505-49509`) and Aerial Ace (`:51144-51148`) use `liveField ? OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM (74) : corner.y+55`, with the constant defined at `battleSceneCanonical.ts:391`.
  - Swords Dance (`:21644`) uses 160 and notes "not terrain-clipped".
  - Agility is the only live-path hard-coded `corner.y+55` clip.
- **Why Agility's own tests pass:** the existing fixtures are LEDYBA and ONIX only.

## 3. Blast radius

- **Same mechanism:** moves that use `TraceMonBlended`, i.e. clone the attacker with a blend: Agility, Quick Attack (`:2736`), Aerial Ace (`:4355`), and Return and Frustration (`:9016`+). Only Agility has the wrong live clip. Return and Frustration render through the OAM assembler (`:26290`, `:40881`), which I did not test. Other `CloneBattlerSpriteWithBlend` users are psychic, ghost and effects code, not attacker traces.
- **Opponent side, 376 Factory species** (from `battle-frontier-mons.json`, 882 entries), computed from the front-pic art and the opponent corner row:
  - 257 have a corner row of 18 or less, so the live clip lands above row 74. These are exposed to the bug.
  - 18 have the clip at exactly row 74, and 101 have it below 74 (SUNKERN and LEDYBA are exact today).
  - 194 species have front art reaching row 55 or lower, so a stuck rest-tail piece is possible.
  - 255 have copies that can be clipped (art bottom plus 12 reaches row 55).
- **Player side:** the clip is 160 there, so it is unaffected. 131 species have back art reaching row 56 or lower.
- **Sweep species (opponent attacker vs ONIX):** FEAROW (corner row 2, front art to row 63), CROBAT (2, 63), DRAGONITE (2, 63), with AIPOM as the reported case.
- **Sweep species (player attacker vs AIPOM):** STEELIX, MEGANIUM, ONIX. They have back art to row 63 and were already exact.

| Opponent attacker vs ONIX | Current | Clip 74 | No clip (160) |
|---|---|---|---|
| AIPOM | 62 frames, 14,833 px | 0 | 0 |
| FEAROW | 62 frames, 40,177 px | 0 | 0 |
| CROBAT | 62 frames, 23,607 px | 0 | 0 |
| DRAGONITE | 62 frames, 57,055 px | 0 | 0 |
| LEDYBA | 0 | **11 px** (one pixel at row 74, x=138, in 11 frames) | 0 |
| SUNKERN | 0 | 0 | 0 |

The player-side attackers (STEELIX, MEGANIUM, ONIX) are exact today and stay exact. I did not re-verify that the 74 clip in Quick Attack and Aerial Ace is exact for species whose corner row is 20 or more. LEDYBA shows 74 is off by one for Agility, so a Quick Attack and Aerial Ace sweep on a LEDYBA-like species is worth doing as a follow-up.

## 4. Fix plan (one bounded worker step)

**Code site:** `battleScene.ts:21369-21371`. Change it to `liveField ? 160 : attackerCorner.y + 55`, so the live path is unclipped and the legacy fixture path is unchanged. Do not use `OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM` here, because it regresses LEDYBA by 11 px. The healthbox that production draws afterwards is what covers the feet, as in the ROM. I tested the equivalent change on a patched copy at `/tmp/agi245/exp/` (not in the repo) via an env switch.

**Acceptance windows (species x move x side, 87-frame Agility window, ROM vs `liveView` per-frame, 0 px):**
- Opponent attackers: AIPOM, FEAROW, CROBAT, DRAGONITE, LEDYBA, SUNKERN, each vs ONIX. All 0 px with the fix.
- Player attackers vs AIPOM: STEELIX, MEGANIUM, ONIX. All 0 px with and without the fix.
- Add a permanent opponent-side AIPOM fixture, e.g. `tools/compare/fixtures/agility-opponent-aipom-player-onix.json`, plus a receipt test next to `tests/animation/agilityEvidence.test.ts`. The harness is `tools/integration/liveAdapterFramebuffer.ts`, which already runs the probe and compares each row.

**Gates:**
- Existing: `tests/animation/agility.test.ts`, `agilityEvidence.test.ts`, `tests/ont193SceneOnTails.test.ts`, `tests/scd112StatsChangeRender.test.ts`, and the `liveAdapterFramebuffer.ts` run for both LEDYBA Agility fixtures.
- Handoff recipe (unchanged): typecheck; the `lsd194Census.sh` census on both scenes plus `rst197CensusDelta.py`; `compare:differential` (3 traces); the full suite.
- Expected census effect: any pair with an opponent attacker using Agility changes toward the ROM, and nothing else. Quick Attack and Aerial Ace are untouched.

## Probe commands I ran

All commands run from the `workspace/` directory.
- `python3 /tmp/agi245/stage.py <out.json> <opp> <plr> <cf> <ct> <step> [--pagility]` — builds the mechanicLab scenario with a Splash-using partner.
- `bin/oracle --profile battle-scene-on lab /tmp/agi245/dense2.json -o /tmp/agi245/dense2` — HTTP frames 60..175 on :8012.
- `python3 tools/run-mgba-probe.py <fresh.json> -- python3 tools/compare/agilityProbe.py <scenario> <out.json> <rgb-dir>` — the exact source window and RGB frames; I also ran it for the other species.
- `/tmp/agi245/regs.py` and `/tmp/agi245/bg2.py` — read the window, BG and OAM registers and BG masks at frames 84 and 100.
- `node --experimental-strip-types /tmp/agi245/render.ts` (production) and `render-exp.ts` (patched copy) — per-frame diffs.
- `/tmp/agi245/sweep.sh` and `sweep.ts` — the six-species and species-count sweeps. Raw output is in `sweep.out`.

I did not run `npm test`, vitest, or the census.

