<!-- Read-only worker report (ISSUES #198 alignment scout, 2026-11-08, Sonnet 5.5, ~3 min). Saved verbatim by the supervisor; UNVERIFIED: the lead/residual join and the LIVE_MOVE_NO_PRE_ROW_SIDES rule are the scout's reading; Bind / Double Slap / Fury Swipes deltas have no committed fixture. -->

**Result: no single rule explains the classes, and the idle-lead hypothesis is falsified by the committed fixtures.** One narrow rule is worth a worker step: it moves three moves into existing classes and fixes none exactly. Nothing was edited, committed or run.

**What the evidence shows**
- The emitter's age is `phaseElapsed - seGate - pre`, with no idle lead subtracted (`battleResolutionPresentationRender.ts:1525-1527`). It fires an op at `f + 8` (`moveAnimSounds.ts:32-34,170`). So it already treats the script start as the rising edge, which is where the ROM script runs from, and the lead is not the lever.
- The pixel window is exact. Our emitter fires at window row `f + 8 - lead`, so residual = `lead - lead_true`, where `lead_true` is the real rows from script start to window row 0. That is a per-adapter property, not a script rule.
- Residual does not track lead. I joined `LIVE_MOVE_IDLE_LEAD_ROWS` (`:1417`) to every SPECS delta:

  | lead | moves and residuals |
  |---|---|
  | 0 | Slam, Swift, Slash, Quick Attack, Vice Grip, Mach Punch, Horn Drill: 0. Psybeam, Crunch, Thunderbolt, Rolling Kick, Headbutt, Ice Punch, Hidden Power: +2. Mega Drain, Giga Drain: -1 |
  | 4 | Ember, Hyper Fang, Metal Claw, Sludge: +2 |
  | 7 | Acid, Poison Fang, Poison Tail: +2. Dragon Rage, Toxic: +3. Swagger: -3 |
  | 10 | Bite: +2. Water Gun: 0. Absorb: -1 (same as Mega Drain at lead 0). Twineedle: +10 |
  | 13 | Razor Leaf: 0 |

- Slash (0) and Headbutt (+2) have identical script prefixes (`loadspritegfx; createsprite; playsewithpan`, f=3). Ember (+2) and Dragon Claw (0) share a first sprite sheet. So a script-clock rule cannot separate them. The +2 class lives in how each adapter's body start was aligned, not in the script.
- Status moves sit at -2..-6 (Haze -6, Cosmic Power / Calm Mind / Harden -5, Agility / Swords Dance / Hail / Sunny Day / Growth / Light Screen -4, Swagger / Sweet Scent / Flatter -3, Double Team / Sand Attack / Metal Sound -2). Those are mostly lead-0 or unmeasured-lead moves whose first visible change comes late. This fits "body start was aligned to visual onset", but it is a fit, not a derivation.

**The one rule the data supports**
Three moves are in `LIVE_MOVE_NO_PRE_ROW_SIDES` (`:1447`), so their `pre` is 0: Flamethrower, Bind and Double Team. The script still reaches `attackanimation` 3 rows before the rising edge on every body (comment at `:1457`), but `liveMoveSourceAge` inherits the mask. Subtracting 3 regardless of the mask gives:
- Flamethrower +5 → +2.
- Bind +6 → +3.
- Double Team -2 → -5.

All three land in existing classes (+2/+3, status -4..-5), which supports the rule without proving it.

**Still off, and why**
- Counter -16 is turn order (our second body starts 16 rows after the ROM's). It is not a clock issue.
- Twineedle +10 equals its lead of 10 exactly, so its `lead_true` is 0.
- Double Slap / Fury Swipes +9 and Bind have no committed fixture. Only `aud242a-ember-player.json` and `aud242e-counter-player.json` exist among these moves, so their deltas come from uncommitted `--fast` windows.

**Proposed worker step, al198a (≤2 h)**
1. In `liveMoveSourceAge`, subtract `LIVE_MOVE_PRE_ROWS` (3) unconditionally. Render and universal rows are unchanged.
2. Re-pin the Flamethrower specs in `tests/aud242cMoveAnimSounds.test.ts:88-89` (player and opponent) from +5 to +2. Every other SPECS delta in aud242a to aud242f must stay byte-identical, because only Flamethrower has a pre-masked fixture. Bind and Double Team have no committed fixture, so their predictions (+3, -5) go in the docs as unverified.
3. Add an offline table of ROM first-script-command frame minus our command-start frame per committed window. The aud242c+ fixtures carry the probe call log, so no emulator is needed. If the SE delta equals that gap minus 8, the lead/pre hypotheses are replaced by a measured per-move script-start table. If not, record that the residual is adapter-side only.
4. Acceptance: `npm run test:gate` green and `compare:differential` showing 0 pixel diffs (the emitter is write-only). Update the #198 text with the named deltas.

Do not fit per-move constants into the emitter. The only change that could make +2 moves exact is a per-adapter `lead_true` table, and that needs fresh ROM lead scans, which would be a separate step.
