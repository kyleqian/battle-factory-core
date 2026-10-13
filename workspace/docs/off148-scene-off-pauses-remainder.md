# off148 (S10A timeline fidelity, ISSUES #167 remainder): Scene OFF no-hit pauses for the unmeasured next receipts, and Rest

Base: `d019cd6b4` (production src `b658044f4`). Production change: `src/engine/battleResolutionPresentation.ts` only
(`sceneOffNoHitPauseFrames`), final production src `9f1646ef3` (commit `6bca83b13`). Presentation timing only: no kernel, RNG, damage,
turn order or facility change; Scene ON is untouched (the function only runs for a `SCENE_OFF_ATTACK_PAUSE` receipt). Direct mGBA only (no
shared oracle), explicit lab seed 305419897 in every scenario, every probe job twice in fresh processes: **18 / 18 outputs r1 == r2**.

## 1. Results first

| Rung | Result | Evidence |
|---|---|---|
| R1 measure | 9 Scene OFF scenarios (Curse both sides, Swagger, Flatter, Agility control, Wish both sides, Roar, an opponent Baton Pass), twice fresh, r1 == r2 18 / 18. **The stat-stage-change class is one row per interpreter execution from the opener** (Curse: attackanimation G+5, statbuffchange G+41, print G+42, first glyph **G+44**; Swagger / Flatter: attackanimation G+3, statbuffchange G+39, playanimation G+42, gAnimScriptActive rise A = G+43, stats-change age 0 **G+44**), identical on both Curse sides and equal to the kernel deltas. The sprite-visibility class's next DRAWN change is outside the attack's execution or not a pause question (section 3) | `fixtures/off148/receipts/rom-r1.json`, `probe-sha256.json` |
| R2 land (stat-stage-change next) | A stat-stage-change receipt after the attack receipt draws nothing in Scene OFF: skip it and subtract its `stat` command (2 frames when the stage moves, 0 when clamped); N = the next print / STATS_CHANGE / status data / HP bar as before. **P = Δ(N) + lead(N) − D_between − 2 per moving stage = 41** on Curse / Swagger / Flatter | `sceneOffNoHitPauseFrames` |
| R3 Rest | The held print ("went to sleep!" + waitmessage, 24 + 64) and the status icon (1) break the one-frame-per-execution mapping BEFORE the attack receipt (kernel: att Δ105, ROM att G+128), but production's commands since the opener (status 38 + print 88 + icon 1 = 127) end exactly on the ROM attackanimation row (G+1+127 = G+128), and the mapping holds again from the attack receipt (kernel healthbarupdate − att = 141 − 105 = 36 = ROM 164 − 128). **P = Δ(N) − Δ(attack) + 1 + lead(N) = 37**: the hp command starts on G+165 (healthbarupdate G+164 + 1, as on the accepted hit path), the HP bar's first change on **G+166** (ROM 166). Only for Rest's command shape (status, held print, status icon); other held prints before the attack (Magnitude's "MAGNITUDE x!", a Magic Coat bounce) are unmeasured and keep no pause | off108 `receipts/rom-r1.json` (Rest), test |
| Anchor table (production command start vs ROM row, census 0..999 OFF bodies with the probe's kernel signature and side) | **5 / 5 classes at residual 0**, base −41 / −37: Curse player 94 bodies, Curse opponent 143, Swagger 81, Flatter 22, Rest 314 (section 2) | `fixtures/off148/verify.json` |
| Census 0..999 Scene OFF (off108Route, base vs final) | 37,716 / 37,716 uses, **0 use-key mismatches, 0 command mismatches** once the inserted pauses are removed, 0 existing pauses changed. **867 pauses inserted (+33,734 frames)**: Rest 466 (P 37), Curse 238 (237 at 41, 1 clamped-speed at 44), Swagger 127 (121 at 41, 6 clamped at 47), Flatter 34 (41), Tickle 2 (47) | `fixtures/off148/census-delta.json` |
| Of the supervisor's counts | stat-stage-change next (speed 238 / attack 129 / special-attack 34 on this base = 401): **401 / 401 now paused**. Rest: **466 / 466**. Sprite-visibility next: **0 / 296** (Wish 155, Roar 104, Whirlwind 23, opponent Baton Pass 14). Nothing next: **0 / 35** (a player Baton Pass: the party menu opens). Still without a pause, outside this step's classes: Magnitude no-effect 3, Scary Face 2 (STATS_CHANGE after a held print), 2 Magic-Coat-bounced status moves | same |
| Census 0..999 Scene ON | off108Route `--scene=on`: **10 / 10 shards byte-identical** (37,522 uses); liveShareCensus: runner section 5 | runner |
| Test | `tests/off148SceneOffPauses.test.ts`, 10 tests: the ROM receipts (Curse both sides, Swagger / Flatter A, Rest's att / HP rows), the rule on 6 census bodies (Curse both sides, Swagger, Flatter, Rest both sides: P and N's start == the ROM anchor), Rest's pre-attack commands end on the ROM att row, unmeasured classes keep no pause (Wish, Roar, Magnitude, Magic Coat bounce), Scene ON keeps its move-animation command. **Revert** (production file = d019cd6b4's): **6 / 10 fail** (exactly the 6 per-class rule tests) | section 4 |
| Pins moved | **1 field in 1 receipt**: `fixtures/sgl138-live-receipt.json` battle `19-off` frames 33,378 → 33,748 (+370 = that route's 10 Rest bodies × the new 37-frame pause); its 11 anchors and every other key are unchanged, Scene ON unchanged, and `sgl138Live.ts` regenerates the edited file byte-identically. No other pin moved (soak pins included) | section 4 |

## 2. Anchor table (Scene OFF; rows relative to G = the opener's final glyph; production's command after the opener starts on G + 1)

| Class | ROM attackanimation | N | ROM N executes | ROM anchor of N's command | P | census bodies (side) | base residual | final residual |
|---|---|---|---|---|---|---|---|---|
| Curse (player) | 5 | print (STRINGID_DEFENDERSSTATFELL) | 42 | first glyph 44 | 41 | 94 | −41 | **0** |
| Curse (opponent) | 5 | print | 42 | first glyph 44 | 41 | 143 | −41 | **0** |
| Swagger | 3 | STATS_CHANGE | 42 | A + 1 = 44 | 41 | 81 | −41 | **0** |
| Flatter | 3 | STATS_CHANGE | 42 | A + 1 = 44 | 41 | 22 | −41 | **0** |
| Rest | 128 | HP bar | 164 | 165 (first change 166) | 37 | 314 | −37 | **0** |
| Agility (control) | 4 | STATS_CHANGE (already paused by olnd113) | 40 | A + 1 = 42 | — | — | — | — |

Unprobed rule-consistent variants (same one-row-per-execution path, no ROM probe here): Curse with speed at −6 (no `stat` command,
print at Δ43, P 44, 1 body), Swagger at +6 attack (no banner, confusion print at Δ46, P 47, 6), Tickle (STATS_CHANGE at Δ46, P 47, 2).

## 3. Remainder (measured, NOT landed — exact reasons)

**Sprite-visibility next (296 census bodies).** The receipt is a 1-frame `sprite-visibility` command that draws nothing; the next drawn
change is elsewhere:

- **Wish (155).** ROM (both sides identical): attackanimation G+3, Pausex20 G+4..35, return 36, waitanimation 37, goto 38, moveend
  G+39 / 40..41 / 42..45 (the kernel's moveend sprite-visibility receipt is Δ40), the next action's script from G+46 (attackcanceler G+47),
  attackstring G+49, its first glyph **G+51** on both sides, its final glyph (next G) **G+70** ("Foe ONIX used TACKLE!") / **G+66** ("ONIX used
  TACKLE!"). The kernel's instructionExecution restarts with the next action (census next-use u = 1..10), so Δ cannot reach the anchor.
  Two candidate anchors disagree because production's "used" message is a 24-frame floor while the ROM's runs first glyph → final glyph
  in 20 / 16 rows: next opener's first glyph on G+51 → **P = 49** (both sides); next opener ENDING on the ROM next G (the G + 1
  convention for everything after it) → **P = 45 / 41** (depends on the next print's glyph count). Resume: decide the used-message
  duration model (the 24-frame floor vs the glyph count; also off108 §2 "other observations") — then the pause is one of those numbers.
- **Roar (104) / Whirlwind (23), opponent Baton Pass (14).** ROM Roar: attackanimation G+8, Pausex20 9..40, waitanimation 42,
  switchoutabilities 43, **returntoball 44**, the target's sprite vanishes in ONE row at **G+46** (`Cmd_returntoball` emits
  ReturnMonToBall with the skip-animation flag: no ball-return animation), switchinanim G+50, its wait G+51..112 (42 changes, first
  G+54), print G+113 (glyph 115). Kernel: att 8, sprite-visibility 44, switch 47, switch-in-animation 49 (ROM 50: switchindataupdate
  waits 2 rows), print 51 (ROM 113: the 62-row switch-in wait is not counted). Production presents a **32-frame `switch-out`** command
  from the returntoball receipt, then switch-in 91 and the print. The ROM draws no switch-out animation here, so no pause makes this
  window exact; the switch-out command's shape (both scenes: the return is skipped in the ROM regardless of the scene) is the defect to
  fix first. Opponent Baton Pass: attackanimation G+4, Pausex20 5..36, waitanimation 38, returntoball **G+43**, one screen change at
  **G+45** (inside switchindataupdate's 2-row wait; no return animation), printstring SWITCHINMON G+48 (glyphs G+50..86 while
  switchinanim waits on it), the switch-in wait G+88..181 (changes 91..148); kernel: sprite-visibility 43, switch 44, print 47,
  switch-in-animation 48; production: switch-out 32, sprite-visibility 1, the print 13, switch-in 91. ISSUES-ready draft: "the forced /
  Baton Pass switch-out draws a 32-frame return command where the ROM's `Cmd_returntoball` emits ReturnMonToBall with the skip flag
  (`battle_script_commands.c:5349`; `OpponentHandleReturnMonToBall` destroys the sprite at once): one-row removal in both scenes;
  measure Scene ON and the player side before landing".
- **Nothing next (35: a player Baton Pass).** The attack receipt is the execution's last receipt (openpartyscreen hands control to the
  party menu). Not staged here (needs party-menu input); the next drawn change is the party menu, owned by the in-battle party-menu
  presentation.

**Still not this step:** the charge-turn EMPTYSTRING3 print (main lane), the post-stats-change δ (olnd113 joint target, −1 / −2 after a
stats-change command; Swagger / Flatter's banner start is now exact, the print after it inherits that δ), the Curse messages after the
first (production print 88 + stat 2 = 90 frames vs the ROM's 89 rows from glyph to glyph: +1 per later print), Rest's status icon
(production draws it on G+127, the ROM on G+125: the 88-frame print vs the ROM's 85 rows; the total up to the attack row is exact).

## 4. Gates (final code = production src `9f1646ef3`, commit `6bca83b13`; later commits add tools / receipts / doc only)

- `npx vitest run tests/off148SceneOffPauses.test.ts`: **10 / 10**. Revert (production file = d019cd6b4's): 6 / 10 fail.
- Affected, 4 workers: olnd113SceneOffPauses, off121StatusCommand, sc106StatsChangeCommand, factoryRoundBattleOrchestrator,
  randomRoundSoak, battleResolutionPresentation, playableAnimationIntegration, off148SceneOffPauses: **8 files / 225 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- `npm run soak -- --policy vanilla --seeds 0:20 --parallel 5`: **OK 20, CRASH 0, HANG 0** (budget 20). soak111Decoupling vanilla
  seeds 0..19, base archive vs final: **decision / canonical / exact-decision sha256 identical 20 / 20, frames identical 20 / 20** (no
  first-round soak battle reaches these bodies).
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base
  d019cd6b4`: **PASS, 641 / 641 captures byte-identical** (235 + 216 + 190); nothing moved (Scene ON traces).
- Full `npm test` (4 workers, nohup, waited on the PID) on `580d3607c` (src `9f1646ef3`): 1,656 files passed, **1 failed** = the
  sgl138 `19-off` frames pin above. Re-pinned in `a9dc71feb`; `tests/sgl138SeGateLive.test.ts` 6 / 6. Full `npm test` again on
  `a9dc71feb` (src `9f1646ef3`): **1,657 files / 13,751 tests passed, 0 failed** (44 / 223 skipped), 12:46 → 13:01.
- `npm run build` on `a9dc71feb`: **green** (exit 0).
- `sh tools/integration/off148Run.sh .integration/validation/off148/run1` (final = `41e62166e`, src `9f1646ef3`), 12:16 → 12:28:
  SAME scenarios (9) / scenario-index; probes 9 / 9 r1 == r2, 18 / 18 == committed sha256; SAME rom-r1, r2 == r1; Scene ON
  liveShareCensus **20 / 20 files byte-identical**; census OFF 37,716 / 37,716 uses, 0 command mismatches, 867 inserted, ON 10 / 10
  off108Route shards byte-identical; SAME census-delta.json; off148Verify 5 / 5 at residual 0; SAME verify.json; **ALL SAME**.
- `git diff --check`: clean.

## 5. Reproduction (from workspace/)

```
sh tools/integration/off148Run.sh <fresh-out-dir-inside-the-repo> [<final-rev>]   # archives, staging, 18 probe jobs (r1 == r2), ROM receipt,
                                                                                  # census OFF / ON / liveShareCensus both trees, delta, anchors
python3 tools/integration/off148Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> off <o.json>
python3 tools/integration/off148Rom.py <probe-dir> tools/integration/fixtures/off148/scenario-index.json <rom.json>
node --experimental-strip-types --no-warnings tools/integration/off108Route.ts --seeds=A..B --scene=off|on --out=<f.jsonl>
python3 tools/integration/off148CensusDelta.py <base-off-dir> <final-off-dir> <out.json> [<base-on-dir> <final-on-dir>]
python3 tools/integration/off148Verify.py <off148-rom.json> tools/integration/fixtures/off108/receipts/rom-r1.json <base-off-dir> <final-off-dir> <out.json>
npx vitest run tests/off148SceneOffPauses.test.ts
```

Files: `tools/integration/off148{Stage,Rom,CensusDelta,Verify}.py`, `off148Run.sh`; fixtures `tools/integration/fixtures/off148/`:
`scenarios/` (9) + `scenario-index.json`, `receipts/` (rom-r1, probe sha256), `census-delta.json`, `verify.json`.
