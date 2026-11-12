# plr162 — the PLAYER send-in after a FORCED switch (Roar / Whirlwind on the player), ISSUES #146

Presentation timing only: no rules / RNG / damage / turn-order / facility change (census kernel-event digests identical on 2,000
battles, soak 20 / 20 OK). Base `0af818603` (src `cc58816f`). Production commit `3e2b452d0` (src `a5161d37`, unchanged after);
receipts / census / doc after.

## Results first

| rung | result |
| --- | --- |
| Model (offs152 R2, landed) | Scene OFF, player = Roar target: healthbox slide at send-in elapsed **65** (+1 CASTFORM), "X was dragged out!" at **max(91, cry + 66)** (+1 CASTFORM), with `cry` the source-derived compiled cry length (`src/data/sendInTailOff.ts`). Re-checked against `fixtures/offs152/species-sweep-player-target-off.txt` (twice fresh in offs152): slide **339 / 339**, message **339 / 339** (`tests/plr162PlayerForcedSendIn.test.ts`). SPINDA's opponent-side +1 does not apply on the player side (its y2 start / slide / message are the base values). |
| Dense-window finding | Aligned on the forced-removal row (proven ROM-exact by offs152 R0 for both attacker sides), production's player ball / emerge / fade / particle cadence (calibrated on the voluntary switch: ball from elapsed 3) runs **one frame late** on the forced path: the ROM's ball shows at elapsed 2. The forced player send-in therefore carries `sendInVisualDelay` **−1** (CASTFORM 0), so slide 65 / print max(91, cry + 66) land on the ROM rows. Aligning on the ball instead puts removal at −5 and slide / print at 66 / +1: the same one-frame offset. |
| Production | `src/engine/switchInTail.ts` `sceneOffPlayerForcedSwitchIn{VisualDelay,HealthboxSlideElapsed,Duration}`; `battleResolutionPresentation.ts`: a Scene OFF `returntoball BS_TARGET` removal marks the battler; its next player `switch-in` gets `healthboxSlideElapsed` 65 (+shift), `sendInVisualDelay` −1 (+shift) and `switchInTiming(0, species, false, name, forcedPlayer)` = duration − 11 (the 11-frame settle hold stays, so the whole command = the ROM's print row). Voluntary player switches, player faint replacements, Baton Pass and every Scene ON player send-in keep 66 / 91 + 11 (`SWITCH_IN_TIMING`). |
| Dense ROM windows (Scene OFF, 5 species, twice fresh) | `plr162Stage.py` (offs152's player-target sweep scenario `mechanic-roar-opponent-houndour-player-onix`, captures 150..489) + `plr162Compare.ts` (production render path; the opponent half transplanted from the ROM — HOUNDOUR's HP is Tackle-damaged). r1 == r2 byte-identical for all 5 (`fixtures/plr162/rom-sha-off.json`); compare r1 == r2 (`fixtures/plr162/compare-summary-off.json`). **Player healthbox + message rows 0 px on PIDGEY (slide-bound, 91), BUTTERFREE (10-glyph name, cry-bound 95), BULBASAUR (113), TYPHLOSION (174)**; CASTFORM (shift, 103): 2 px total, one pixel at (120, 111) on e 76 / 84 = the edge of the player sprite (region boundary, mon residual), message 0 px. **ROM next text == production duration 5 / 5**; pre-send-in rows (pause, hold, removal) **0 px 5 / 5**. Base controls (PIDGEY / TYPHLOSION, 66 / 102): 14 / 4 healthbox + message rows nonzero, print 11 frames late / 72 frames early. |
| Census, both scenes (`plr162Census.ts`, 0..999 × on / off, base vs final, same tool file) | 2,000 battles, **kernel-event digests identical on every battle**, 0 command-type-sequence changes; 612,024 commands, **32 changed: exactly the 32 Scene OFF forced player switch-ins** (27 species; 91 + 11 → max(91, cry + 66) + 11, slide 65, visual delay −1; net +404 frames); the **32 Scene ON** forced player switch-ins unchanged. 3 seeds (434 / 796 / 881) hit the tool's 200k-frame input-loop budget identically in both trees and both scenes (pre-existing; reported, not a change). `fixtures/plr162/census-delta.json`. |
| `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 0af818603` | **PASS, 641 / 641 captures byte-identical** (3 traces). |
| Soak vanilla 0:20 `--parallel 10` (final tree) | **20 / 20 OK** (all budget-ended; deepest carry 7, battle depth 9 — the same as offs152's receipts). `fixtures/plr162/soak-vanilla-final.json`. |

## Not landed (named)

1. **Scene ON forced player send-in.** The ON player-target sweep (`fixtures/forced-switch/species-sweep-player-target.txt`, which
   offs152 R1 showed actually ran Scene ON) has slide 65 on 338 / 339, but its "dragged out!" row matches max(91, cry + 66) on only
   134 / 339 species: the rest are 1..47+ frames later (the attacker's Roar body / cry overlaps `SwitchIn_HandleSoundAndEnd`'s
   `IsCryPlayingOrClearCrySongs` wait). That message is **not modelled**, so Scene ON stays on the calibrated 66 / 91 + 11; landing it
   needs an ON message model plus ON player-target dense windows through the Roar body render (fra151Compare-style).
2. **Player faint replacement.** Same controller (`PlayerHandleSwitchInAnim` → `SwitchIn_HandleSoundAndEnd` waits for the cry), but its
   next command is not a "dragged out!" print (the turn end / next action follows), and no sweep / ROM window measures it: unchanged.
3. **Player send-in visuals** (ball throw arc, emerge, back sprite: the `mon` region, ~65–85 nonzero rows per window, e 3..88) are the
   known player send-out animation residual — out of scope ("player back send-out animations"); production draws them one frame earlier
   now on the forced path, identical in kind to the voluntary path's residual.
4. Unmeasured inputs carried over from offs152: CRY_MODE_WEAK (a statused / low-HP incoming mon), shiny send-ins; Baton Pass (out of scope).

## Gates

- `npx vitest run tests/plr162PlayerForcedSendIn.test.ts`: 6 / 6 (model 339 / 339; `switchInTiming` split; census seeds 23 (Roar) /
  76 (Whirlwind) on the player: Scene OFF forced send-ins carry the tail, every other player send-in keeps 91 / no slide; Scene ON unchanged).
- `npm run typecheck` OK (on `3e2b452d0`); `npm run test:smoke` 448 / 448; `git diff --check 0af818603 HEAD` clean.
- Full `npm test` on `77eea4cda` (src `a5161d37` = the production commit; later commits are doc / receipts only): **1,672 files passed,
  44 skipped; 13,881 tests passed, 0 failed, 223 skipped** (1,318 s). No existing pin moved (census / soak / differential pins do not
  stage a Scene OFF Roar on the player).
- `npm run build` OK on `23286f115` (same src).

## Reproduce

```sh
python3 tools/integration/plr162Stage.py <dir>/stage 16,12,1,385,157
for r in r1 r2; do for sp in 16 12 1 385 157; do for p in a b; do
  bin/oracle --profile battle-scene-off lab <dir>/stage/roar-$sp-$p.json -o <dir>/$r/roar-$sp; done; done; done
node --experimental-strip-types --no-warnings tools/integration/plr162Compare.ts <dir>/stage/roar-16-a.json <dir>/r1/roar-16 out.json [--base]
node --experimental-strip-types --no-warnings tools/integration/plr162Census.ts --seeds=0..99 --scene=off --out=f.jsonl   # per tree
python3 tools/integration/plr162CensusDelta.py <base *.jsonl> -- <final *.jsonl>
```
