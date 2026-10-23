# sst200: second-stat print rows vs the ROM

Question: does production's lsd196 `stat` command between two stat prints
(`statBetweenPrintsFrames`, `src/engine/battleResolutionPresentation.ts`) match
the ROM for every multi-stat move, in Scene OFF and Scene ON?

Conclusion: yes. Every stat-to-stat gap and every post-chain "Foe ONIX used
TACKLE!" gap has residual 0 (26 cases). No source change, no pin moved. The one
non-zero residual is outside the stat rule (Memento's "fainted!" print, below).

## Method

- `tools/integration/sst200Stage.py` writes one mechanicLab scenario per move
  (`tools/integration/fixtures/sst200/scenarios/`): PRIMEAPE lead using the move
  against ONIX, every ONIX slot Tackle, lab seed 11, 994 captured frames. Four
  extra "foe" scenarios have ONIX use Tickle / Superpower / Calm Mind / Curse
  on PRIMEAPE.
- `tools/integration/lsd194Probes.sh` (run with `bash`) runs each scenario
  twice in fresh direct-mGBA probes (`tools/run-mgba-probe.py` +
  `sub183RomFrames.py`), per scene. r1 == r2 for rows and RGB in all 26 jobs
  (`fixtures/sst200/rom/r1-r2-identity.txt`).
- `tools/integration/sst200RomRows.py` extracts print runs from the per-frame
  trace: hold-64 `waitmessage` stat prints give F = run frame + first screen
  change; the foe's "used" print is typed during later instructions, so its
  first glyph is found with a typed-burst rule (8 changes in 12 rows).
- `tools/integration/sst200Compare.ts` runs production on the same move (seed
  search until the chain length matches; Silver Wind and AncientPower proc at
  lab seed 11 in the ROM and at kernel seed 61 in production). Production
  message commands start at the first glyph, so the production gap is
  start(msg2) - start(msg1), the ROM gap F2 - F1.
- `tests/sst200SecondStatRows.test.ts` pins production against
  `fixtures/sst200/rom-rows.json` (Tier 1, 27 tests).

## Table (rows: ROM / production / residual)

Stat-to-stat gaps in chain order, then the first message after the chain.
Scene ON equals Scene OFF in every case.

| Move | Scene | Stat gaps | Next print |
| --- | --- | --- | --- |
| Tickle | OFF, ON | 92/92/0 | Foe used TACKLE! 101/101/0 |
| Superpower | OFF, ON | 92/92/0 | Foe used TACKLE! 102/102/0 |
| Silver Wind (all-up proc) | OFF, ON | 90/90/0, 91/91/0, 89/89/0, 91/91/0 | Foe used TACKLE! 102/102/0 |
| AncientPower (all-up proc) | OFF, ON | 90/90/0, 91/91/0, 89/89/0, 91/91/0 | Foe used TACKLE! 102/102/0 |
| Calm Mind | OFF, ON | 92/92/0 | Foe used TACKLE! 100/100/0 |
| Dragon Dance | OFF, ON | 91/91/0 | Foe used TACKLE! 98/98/0 |
| Cosmic Power | OFF, ON | 92/92/0 | Foe used TACKLE! 100/100/0 |
| Curse | OFF, ON | 89/89/0, 90/90/0 | Foe used TACKLE! 100/100/0 |
| Memento | OFF, ON | 100/100/0 | PRIMEAPE fainted!: OFF 181/116/-65, ON 181/147/-34 |
| Foe Tickle | OFF, ON | 92/92/0 | none (turn ends) |
| Foe Superpower | OFF, ON | 92/92/0 | none |
| Foe Calm Mind | OFF, ON | 92/92/0 | none |
| Foe Curse | OFF, ON | 89/89/0, 90/90/0 | none |

## Memento "fainted!" (not fixed)

ROM puts the "PRIMEAPE fainted!" first glyph 181 rows after the second stat
print in both scenes; production gives 116 (OFF) and 147 (ON). Localised to
`BattleScript_FaintAttacker` in `data/battle_scripts_1.s`:
`playfaintcry; pause B_WAIT_TIME_LONG; dofaintanimation; cleareffectsonfaint;
printstring`. Production does not present the 64-row `pause` after the faint
cry (plus 1 row); Scene ON also differs in a 32-frame `status` command. Ordinary
target KOs show the same absence, so this is the faint script rather than the
stat rule. Faints are unmeasured in ISSUES; this is out of scope for sst200 and
left unchanged.

## Result

- Source: unchanged. Pins: none moved (acceptance item 3 did not trigger, so
  the neighbouring test files were not re-run).
- Open: faint script presentation (Memento above and ordinary KOs).
