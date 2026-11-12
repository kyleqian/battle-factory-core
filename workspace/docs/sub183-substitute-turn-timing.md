# sub183 — Substitute turn timing (ISSUES #153)

Integration lane, 2026-10-15. Presentation only: no rule, RNG, damage, AI or turn-order change (census kernel digests identical).
Base `e0f3dd6ac`. G = the final glyph row of the "X used Y!" print (off108Rom.py / aud118); production's next command starts at G+1.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| HP command start vs the ROM's datahpupdate run (G+97) | **Before −6** (production G+91; dense: HP at dt 117 against the ROM's 123 opponent attacker, 113 against 119 player attacker). **After 0** in OFF/ON × player/opponent attacker (dt 123 / 119 = G+97) | `fixtures/sub183/dense-{before-,}{on,off}-{player,opponent}.json` |
| Body (waitanimation window) | Before 90 frames, exact rows 45 / 90 (opponent) and 41 / 90 (player). After **96 frames, 96 / 96 exact**: 4 script-lead rows + 90 body + 2 post rows | same |
| HP command | Before 44 frames, exact 1 / 44. After **47 frames, 47 / 47 exact** (44 bar + 3 tail rows) | same |
| The doll appearing (attacker-side sprite region) | Before: 90 (opponent) / 97 (player) attacker-side mismatching rows, **34,460 / 36,466 px**. After **0 rows, 0 px** | same |
| Next print ("made a substitute", first glyph) | Before **−9** (dt 161 against the ROM's 170 opponent; 157 against 166 player). After **0** | same (`romSpikes` / `prodSpikes`) |
| Next action's used print | Before −9 (267 against 276; 259 against 268). After **0** | same |
| Dense ROM window across the Substitute turn through production (`renderBattleResolutionLiveView`; used print → body → HP bar → next print → next action's used print, 291 rows each) | **4 / 4 windows, 291 / 291 rows exact, 0 px** (1,164 rows). Before: 142 / 291 and 135 / 291 rows exact, 62,123 and 64,930 px (OFF == ON in both) | `dense-*.json` |
| Second HP profile (GOLEM 187 HP → 141, ONIX opponent, OFF both sides) | ROM: datahpupdate run **48** rows from G+97, first glyph G+147. Production: HP 47 + 3 tail = 50 frames → next print at G+97+50 = G+147. Structure only (no dense window); the persian windows are the pixel evidence | `fixtures/sub183/rom-runs-golem-onix.json` |
| Tier-1 tests | `tests/sub183SubstituteTurnTiming.test.ts` (5): command timeline for the four cases (lead 4, body 96, HP start 123 / 119, tail 3, print start 170 / 166) plus a Tackle control (no lead / tail anywhere, HP durations unchanged) | — |
| Census 0..999, Scene ON and OFF (`sub183Census.sh`, base `e0f3dd6ac` vs final) | Both scenes: **1000 battles, kernel digests identical, 0 unattributed**. 47 Substitute bodies (26 battles) gain `scriptLeadFrames` 4 (+6 frames each: 4 lead + 2 post rows; all 47 live), and 47 following HP commands gain `tailFrames` 3 (+3 each): 94 changed commands per scene, +423 frames per scene. 320,378 (ON) / 316,756 (OFF) commands, 974 battles byte-identical. Budget-stalled 434 / 796 / 881 are pre-existing in both trees (no change before their budget) | `fixtures/sub183/delta-{on,off}.json`, `.integration/validation/sub183/census/` |
| Differential (`fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base e0f3dd6ac`) | **641 / 641 captures byte-identical** (no difference to attribute) | `.integration/validation/sub183/differential.log` |

## ROM mechanism (aud118 convention; fresh direct-mGBA probes, each scenario twice from fresh processes, r1 == r2 rows and RGB)

BattleScript_EffectSubstitute is `attackstring; waitstate; jumpifstatus2; setsubstitute; jumpifbyte; attackanimation; waitanimation;
healthbarupdate; datahpupdate; printfromtable; waitmessage; goto MoveEnd`. Rows by G (same in OFF and ON, player and opponent, GOLEM
and PERSIAN):

| Rows | Script | Production before | Production after |
| --- | --- | --- | --- |
| G+1 | waitstate release | next command starts (the body, with `attackanimation` taken to run at G+1) | lead row 1 |
| G+2, G+3, G+4 | jumpifstatus2, setsubstitute, jumpifbyte | not presented | lead rows 2–4 |
| G+5 | attackanimation | body pre row 1 (G+1) | body pre row 1 |
| G+6.. (90 rows) | waitanimation | 90 | 90 |
| G+96 | healthbarupdate | not presented | body post row 1 |
| waitanimation release row | — | not presented | body post row 2 (`LIVE_MOVE_POST_ROW_SIDES` 164) |
| G+97.. (bar + 2 rows) | datahpupdate (first change G+98) | HP at G+91 | HP at G+97, bar + 1 rows |
| bar + 2nd row, printfromtable, waitmessage | — | not presented | HP tail 3 |
| first glyph | "made a substitute" | −3 after the HP fix, −9 before | exact |

## Fix

- `moveAnimationScriptLeadTiming` (battleResolutionPresentation.ts): a MOVE_ANIMATION whose `STRINGID_USEDMOVE` print's
  `attackstring` is followed by `waitstate` gets `timing.scriptLeadFrames` = the kernel's instructionExecution(MOVE_ANIMATION) −
  (attackstring's + 1) = 4. The lead is a source-derived count of the script rows between the controller's release of the used print
  and `attackanimation`. A script without the `waitstate` runs those instructions while the print types, so every other move
  keeps 0 (`attackstring; waitstate` occurs only in BattleScript_EffectSubstitute). Production adds it to the live body duration as the
  first rows (age held at 0, like `seGateFrames`): `battleResolutionCommandDuration` and the effect age.
- `LIVE_MOVE_POST_ROW_SIDES` gains `[164, 3]`: the universal two post rows, measured on both sides by the four windows. The
  test-side copy (`tests/helpers/iu120Rows.ts`) gains it too (130 → 131 moves, 257 → 259 sides).
- `hpPrintTailTiming`: an HP command whose `datahpupdate` is followed by `printfromtable` and preceded by
  `healthbarupdate; waitanimation; attackanimation` gets `timing.tailFrames` = 3. This is the ROM's datahpupdate run (bar + 2 rows
  against the command's bar + 1) plus the printfromtable and waitmessage rows ahead of the first glyph. `battleResolutionCommandDuration`
  adds it to the HP duration. The HP bar itself saturates at its final value for the tail rows.

## Other moves

- The lead rows: no other move has `attackstring; waitstate`. The 164 post rows: Substitute only. The census confirms every changed
  command is a 164 body or the HP command right after one (0 unattributed, 0 on any other move).
- The tail: `datahpupdate; printfromtable` also occurs in Leech Seed's turn-end drain (BattleScript_LeechSeedTurnPrintAndUpdateHp). It is
  **not** extended: no ROM window exists for it, and the rule requires the Substitute `attackanimation; waitanimation; healthbarupdate`
  lead-in.
- The Tackle control in the same harness keeps its HP command at bar + 1 and its body timing unchanged (test + census).

## Residuals

- The tail is measured on two HP profiles (PERSIAN 172 → 129 pixel-exact; GOLEM 187 → 141 structure-exact against the ROM's run
  lengths). HP bars shorter than the 28-frame floor (small max HP) keep the pre-existing floor + 3 and are not ROM-measured.
- Leech Seed's turn-end print (same script shape) is unmeasured and unchanged.
- Out of scope, unchanged: Transform declines, doll ↔ mon switch-out swaps, the Substitute fade window.
- "Already has a substitute" uses carry no body (census: the 47 changed bodies are all the new-doll uses), so none of the new fields applies to them.

## Reproduce

```sh
source /etc/pokebench-runner.env
OUT=<fresh> sh tools/integration/sub183Probes.sh                 # four scenarios x 2 fresh runs (+ JOBS="name:off ..." for others)
python3 tools/integration/sub183RomRuns.py <rom.json>... > runs.json
node --experimental-strip-types --no-warnings tools/integration/sub183Dense.ts <rom.json> <rom.json.rgb.gz> out.json \
  --scene=on|off --side=player|opponent --attacker=PERSIAN:53:172 --other=SLOWBRO:80:202 --romUsed=43
SUB183_CENSUS_JOBS=6 sh tools/integration/sub183Census.sh <fresh-root> <base>:on <base>:off <final>:on <final>:off   # resume with SUB183_SHARDS="n .."
python3 tools/integration/sub183CensusDelta.py <base-arm> <final-arm> [out.json]
node --experimental-strip-types --no-warnings tools/integration/sub157Timing.ts --seeds=17,74 --scene=on|off
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base e0f3dd6ac
```

`sub157Timing.ts` (production, ON seeds 17 / 74, OFF the same): body 90 → 96 frames, HP command at +90 → +96 from the body start, next
print at +130 / +133 → +139 / +142.

## Gates

- `npm run typecheck` 0 (re-run after the tests importing `tools/` files), `npm run test:smoke` 448 / 448, `npm run build` OK, on the final tree.
- Full `npm test` (nohup, `POKEBENCH_VITEST_MAX_WORKERS=2`, one process, 48 min) on `bb11e4064`: 1,726 files / 14,163 tests, **1 failure**:
  `tests/animation/liveSubstituteBodyAdapter.test.ts` route 11/35 JYNX (the body command's row sequence 92 -> 96). Re-pinned in `a3337807a`
  (test file only; the file passes alone, 4 / 4). Every other file ran against the identical source and tests, and the final commits differ
  from `bb11e4064` in that one test file (plus this doc). A second full run did not fit the 140-minute cap.
