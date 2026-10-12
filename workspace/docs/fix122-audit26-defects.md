# fix122: live audit 26's two defects, landed (S10A main lane, 2026-10-11)

Live audit 26 (`docs/aud118-live-audit-26.md`) banked two presentation defects with patches. fix122 lands both on master `d6444bd53`
(production src `530600bb1`). The final production code is `20ce9ee3f` (src `649b374d9`). Both changes are presentation-only: the census
shows 0 status changes, identical command KEYs and an identical battleDigestExcludingFrames.

## 1. Results

### DEFECT A: Struggle 165's target keeps its x2 (`liveBattlerX2History.ts`)

aud118's Struggle scenarios (`aud118Stage.py`) were re-probed fresh (direct mGBA, r1 == r2 on every window) and checked through production
(`fix122Patched.sh` = aud118Patched.sh with the rev as a parameter), on base `d6444bd53` and on base + the 165 `keep` row:

| Window | Base d6444bd53 | Final |
|---|---|---|
| `pb-aud118-ply-50-95-c2` (opp ONIX Taunt after the player's Struggle) | 136,375 px | **0 px** |
| `pb-aud118-ply-65-19-c2` (opp RATTATA Taunt after the player's Struggle) | 50,661 px | **0 px** |
| the other 38 summary lines (30 live windows at 0 px + 9 designed declines) | byte-identical | byte-identical |

Both receipts are byte-identical to aud118's (`fixtures/aud118/struggle-{base,patched}.txt`): the moved master does not change a window.
Totals (final): TAUNT 15 / 17, STRUGGLE 11 / 16, HARDEN 4 / 5, RAIN_DANCE 1 / 1. The non-0 rows are aud118's designed declines.

### DEFECT B: the Scene ON failure message after a no-effect attackanimation (`battleResolutionPresentation.ts`)

The ROM glyph is the first glyph of the failure message, in rows after the opener's ("X used Y!") final glyph. It is the same in Scene ON and
Scene OFF, measured with direct mGBA (`fix122OnStage.py`, `idle94Probe.py`), r1 == r2 26 / 26, and off108Rom r2 == r1. Production starts
the failure message `holdFrames(opener) + every command between` frames after G + 1. Residual = start − (glyph − 1), on every failing use
in `off108Route.ts` seeds 0..999.

| Move (class) | Failing ROM use | ROM glyph | Uses (0..999) | Scene ON base | **Scene ON final** | Scene OFF base = final |
|---|---|---|---|---|---|---|
| Light Screen 113 (screen, 2nd use) | T2 | 41 | 70 | −40 | **0** | 0 |
| Reflect 115 (screen, 2nd use) | T2 | 40 | 20 | −39 | **0** | 0 |
| Safeguard 219 (2nd use) | T2 | 41 | 62 | −40 | **0** | 0 |
| Rain Dance 240 (rain active) | T2 | 40 | 72 | −39 | **0** | 0 |
| Sunny Day 241 (sun active) | T2 | 41 | 16 | −40 | **0** | 0 |
| Sandstorm 201 (sandstorm active) | T2 | 41 | 83 | −40 | **0** | 0 |
| Hail 258 (hail active) | T2 | 41 | 22 | −40 | **0** | 0 |
| Protect 182 (repeated: setprotectlike fails) | T3 | 40 | 50 | −39 | **0** | 0 |
| Detect 197 (repeated) | T3 | 40 | 7 | −39 | **0** | 0 |
| Endure 203 (repeated) | T3 | 40 | 16 | −39 | **0** | 0 |
| Stockpile 254 (4th use: "can't stockpile") | T4 | 40 | 1 | −39 | **0** | 0 |
| Leech Seed 73 (already seeded: "evaded" / Grass ODDISH: "doesn't affect") | T2 / T1 | 74 | 82 + 18 | −73 | **0** | 0 |

All **519 Scene ON uses go to 0** (base: every one started at G + 1). Scene OFF routes are **byte-identical** base vs final (10 / 10
shards, 2,305 uses; already 0 through olnd113's OFF attack receipt). Every class matches the rule, so none is left on today's behaviour.

**Leech Seed and the anchor.** `pause B_WAIT_TIME_SHORT` directly follows its attackstring, so off108Rom's G (the opener run's release row
− 2) lands 31 rows after the final glyph. The pause run swallows the print: G 96, final glyph 65 on both Leech Seed scenarios. Measured
from the final glyph, which is where production's used-move hold counts from, the failure glyph is at +74 (43 rows after G). Production's
`next − used + 1` = 73 already counts both pauses (the kernel's interpreter executions). So the rule is exact, and Scene OFF's existing 0
residual on the same anchor corroborates it. For every other class G = the final glyph (shift 0).

## 2. The change

- `LIVE_BATTLER_X2_MOVE_TABLE.target.keep` gains 165 (aud118's patch verbatim). `Move_STRUGGLE` shakes its target only with the relative
  `AnimTask_ShakeMonInPlace`.
- `sourcePauseUsedMoveHoldFrames`' back-scan (three straight-line instructions before the first print, with no receipt since the attack
  string) now also returns `next − used + 1` at an attackanimation, **only at the ROM-proven sites** `NO_EFFECT_ATTACKANIMATION_HOLD_LABELS`.
  Each is the first attackanimation at or after `BattleScript_PrintReflectLightScreenSafeguardString`, `BattleScript_MoveWeatherChange`,
  `BattleScript_EffectProtect` (= `BattleScript_EffectEndure`), `BattleScript_EffectStockpile` or `BattleScript_DoLeechSeed`. Every other
  attackanimation (92 in the program) keeps the pause-only rule. aud118's generic patch gives the same 519 uses on this census. The
  allowlist keeps unmeasured sites (e.g. a no-effect damaging move, whose first message comes later anyway) out by construction.
- Scene OFF: the OFF attack receipt (SCENE_OFF_ATTACK_PAUSE) stops the scan first, so nothing changes there.

## 3. Census (Scene ON, `ret88Census.sh shards`, seeds 0..999, base d6444bd53 vs final 20ce9ee3f; `land82CensusCheck.py`)

| | base | final |
|---|---|---|
| merged report | 1000 battles, 27,427 commands, live 27,140 (98.95 %), frames 4,037,631 of 4,065,771 (99.31 %), battleDigest 5326e861968a | 1000 battles, 27,426 commands, live 27,139 (98.95 %), frames 4,037,519 of 4,065,659 (99.31 %), battleDigest 46be1da2031a |

`land82CensusCheck.py`: live 27,139 -> 27,139, live frames 4,037,519 -> 4,037,519 (99.31 % -> 99.31 %; its percentage divides by the base
arm's frame total). Command keys identical outside stalled tails; **battleDigestExcludingFrames identical**; battles played / terminal /
stalled (1000, 997, 3) both arms; **live -> non-live 0**. The same 3 FRAME_BUDGET battles stall (434, 796, 881). Battle 796's stalled tail
is a **prefix**: 185 -> 184 commands. Its last command (a live 112-frame player VILEPLUME Struggle) falls past the budget once the
failure holds add frames. That accounts for the merged totals' −1 command / −112 frames.
`fixtures/fix122/census-check.txt`.

All-move Scene ON routes (`off108Route.ts` seeds 0..999, base vs final, `aud118HoldExposure.py`, `fixtures/fix122/hold-exposure.json`):
**519 exposed uses (of 37,777 compared) in 234 battles, +23,894 frames, 0 other command changes**. Only the opener's
holdFrames of the covered failure messages change, and each changes by exactly its class's hold (section 1: −(glyph − 1) -> 0). By move: Light
Screen 70, Reflect 20, Safeguard 62, Rain Dance 72, Sunny Day 16, Sandstorm 83, Hail 22, Protect 50, Detect 7, Endure 16, Stockpile 1, Leech
Seed 82 + 18. Budget-stalled routes 434 / 796 end 2 uses earlier (590 -> 588, 626 -> 624; common prefix compared). The receipt is identical to
aud118's `hold-exposure.json` for the generic patch.

## 4. Pins

`tests/fix122AuditDefects.test.ts`: DEFECT A pins the table and the event fold, with a revert experiment (the aud118 patch reversed):
2 / 2 fail. DEFECT B covers one census battle per class (Scene ON start == ROM glyph − 1) plus a Scene OFF Rain Dance row. Revert
experiment (the hold line removed): **12 / 12 class tests fail** (start 0), and the OFF row still passes. **No existing pin moved**: no other test pins a Scene ON failure-message
start of the covered classes.

Gates (final code 20ce9ee3f + docs / tools): the targeted files (fix122, olnd113, x2-history x5, stl109, sdl119) passed before the commit.
`npm run typecheck` green. `npm run test:smoke` 8 files / 448 passed. Full suite (4 workers, shards one after the other): 1/2 819 files
passed / 22 skipped (7,035 tests), 2/2 818 / 22 (6,474 tests). `npm run build` green. `npm run compare:differential -- fight-submenu
battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base d6444bd53`: PASS, 624 / 624 captures byte-identical.
`git diff --check` clean. Because of the cap, build and differential ran during the shards (not serialized). Reproduction: the receipts
come from the pieces of `fix122Run.sh` (the same tools / copies). The runner itself was not rerun end to end inside the cap.

## 5. Reproduce (from workspace/)

```
sh tools/integration/fix122Run.sh .integration/validation/<fresh>                   # DEFECT A windows + DEFECT B ROM rows / routes
FIX122_CENSUS=1 sh tools/integration/fix122Run.sh .integration/validation/<fresh>   # + census 0..999 and all-move ON routes, base vs final
```

The runner prints `same` / `DIFF` against `tools/integration/fixtures/fix122/`. Files: `fix122Patched.sh` (DEFECT A),
`fix122OnStage.py`, `fix122OnRun.sh`, `fix122OnHold.py` (DEFECT B), `fix122Run.sh` (all). Summary receipt:
`tools/integration/fixtures/fix122-live-receipt.json`.
