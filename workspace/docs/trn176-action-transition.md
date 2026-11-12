# trn176 -- the action transition (ISSUES #167 (a')), evidence only

No production change (`src/` and the existing tests are untouched). Scripts: `tools/integration/trn176Predict.ts` (the rule applied to
production's kernel events), `trn176Stage.py` / `trn176Run.sh` (five new Scene OFF HIT-path scenarios, probed twice fresh). Receipts:
`tools/integration/fixtures/trn176/{scenarios,scenario-index.json,receipts/{rom-r1.json,probe-sha256.json},predict.{txt,json}}`.

## Results

**The rule.** From the last blocking row E of an action to the next action's first "used" glyph the ROM spends

    glyph = E + 1 + d + n + 6 + u

- E: the last row the previous action's final controller wait occupies. A print + `waitmessage B_WAIT_TIME_LONG`: its
  instructionExecution + 64 (the kernel counts the wait once per row); a HIT (`datahpupdate`): its instructionExecution; a status icon
  (`updatestatusicon`): its instructionExecution (its first row; production presents one frame for it, the ROM waits two rows).
- d = e1 - E - 1: rows from E to the first `moveend` (kernel: e1 = instructionExecution of the first MoveEnd sprite-visibility receipt).
  Constant per script tail: 2 after a status/stat print, 3 after a hit's effectiveness print (7 after the HP bar), 4 after Double-Edge's
  recoil, 6 after Toxic's icon.
- n = the number of MoveEnd sprite-visibility receipts (Cmd_moveend returns after MOVEEND_ATTACKER_VISIBLE and MOVEEND_TARGET_VISIBLE, each
  one controller emit): 1 if the target is the attacker, else 2. The pointer stays on `BattleScript_MoveEnd+6` for n + 1 rows.
- 6 = `end`, HandleAction_TryFinish, HandleAction_ActionFinished, HandleAction_UseMove (the pointer stays on `MoveEnd+9` for 4 rows) plus
  the script's first row (`EffectHit+0`...) so the attackstring (kernel u: Tackle 4, Rest 2) runs on row m0 + n + 5 + u, one row before its
  first glyph. In ROM terms: first glyph = (first `BattleScript_MoveEnd+6` row) + n + 6 + u, which is what `off108Rom.py`'s runs show.

**Production pause.** Production presents the n MoveEnd receipts as n one-frame `sprite-visibility` commands, so the n cancels:

    P = d + 6 + u         (frames to add between the anchor command's end and the next "used" command)

| class (OFF, ROM receipt)                        | cases | ROM-only check: E->glyph = 1+d+n+6+u | OFF residual now | after P (= production anchor-end error) |
|-------------------------------------------------|-------|--------------------------------------|------------------|------------------------------------------|
| stat (Bulk Up, Double Team, Sand-Attack)        | 3     | exact (0 rows off)                   | -12 x3           | 0, 0, 0                                  |
| protect (Protect, Detect)                       | 2     | exact                                | -12 x2           | 0, 0                                     |
| control (Agility)                               | 1     | exact                                | -12              | 0                                        |
| miss (Dynamic Punch opp / ply)                  | 2     | exact                                | -12 / -11        | 0 / +1                                   |
| failed (Snore)                                  | 1     | exact                                | -2               | +10 (print, below)                       |
| status + icon (Toxic)                           | 1     | icon anchor: P = 16 by the same d    | -18              | -2 (interior, below)                     |
| two-turn charge turn (Razor Wind, Solar Beam, Dig) | 3  | exact                                | -13, -13, -10    | 0, 0, +4 (print, below)                  |
| stat-stage (Curse ply / opp)                    | 2     | exact                                | -10 / -16        | +2 / -4 (Curse's own existing pauses)    |
| HIT-path after a hit (Rest, Roar, Scratch x2, Karate Chop, Double-Edge, Fire Punch) | 7 | exact (7 / 7) | not comparable (below) | -- |
| Baton Pass opp (switch)                         | 1     | -1 row (switch tail)                 | not comparable   | --                                       |

Totals: **21 of 22** compared OFF receipts (print / HP anchors) satisfy the source-derived row count exactly (0 rows); the 22nd (an
opponent Baton Pass, a switch) is off by 1 and out of scope. Toxic (icon anchor) is the 23rd, priced by the same d but not ROM-checked. Not comparable at all (6): Wish x2 (the anchor is the used print; msg175's own rule), Confuse Ray /
Thunder Wave / Swagger / Flatter (the kernel's RNG blocks or confuses the second action, so its next print is not a USEDMOVE where the
ROM's is). Scene ON, same rule (informational, production not changed): the same kernel inputs satisfy the ROM-only check on all 12 ON
receipts with a print / HP anchor; applying P would move the stat/protect classes from -15..-18 to -3..-6 (exactly the existing ON anchor-end error: Bulk Up -4,
Double Team -5, Sand-Attack -6, Protect/Detect -3, Rest -3, Razor Wind -1, Solar Beam 0, Dig +4).

The five new HIT-path scenarios (`tools/integration/fixtures/trn176/scenarios`: Scratch ply/opp, Karate Chop, Double-Edge, Fire Punch;
Primeape vs Onix; the HIT's next action is Onix's Tackle): Scene OFF r1 == r2 byte for byte (5 / 5; `receipts/probe-sha256.json`), each
E->glyph = 1+d+n+6+u exactly (d = 3 after the effectiveness print, 4 after Double-Edge's recoil).

## Residuals (not the transition)

`predicted residual = anchor-end error` holds for every comparable row (`anchor-end` = production's anchor command end minus the ROM's wait
release). So the transition rule is exact and what is left is the length of the preceding anchor command:

- **Snore, "But it failed!"**: production holds 88 frames, the ROM wait run is 79 rows (9 over). A message-duration (print-time) item for the
  failed-move print; independent of the transition.
- **Dig, "dug a hole!"**: 88 vs the ROM's 85 (+3, +1 from the lead row).
- **Dynamic Punch ply, "attack missed!"**: +1 (the 1-frame discrepancy): the ply print is 88 = the ROM wait run exactly where every other
  case is 1 shorter than the run (the run includes the controller's lead row); the opp print (91 vs 92) is exact. The ROM's tail
  (d = 2, n = 2, u = 4) is identical in ply and opp, so this is the miss print's own length, not the transition.
- **Toxic**: P = 16 (icon anchor); the -2 left is interior (print 90 vs the ROM's 91, plus the 2-row `status` command).
- **HIT-path production comparison**: the production kernel in `trn176Predict.ts` uses msg175's synthetic battlers (HP 260, equal stats),
  so its HP-bar length differs from the ROM scenario's real stats (Rest: 28 frames vs the ROM's 10 rows) and the raw edge cannot be compared.
  The ROM-only check (7 / 7 exact) does not depend on it, and P above does not either (it starts after the anchor's release). The production
  step should confirm the hit rows on the real battle-lab route (`off108Route.ts`), where the expected current residual is -(d + 6 + u)
  (-13 Scratch/Karate/Fire Punch, -14 Double-Edge, -15 Rest/Roar).

## Where it goes (`src/engine/battleResolutionPresentation.ts`)

`sceneOffNoHitPauseFrames` (:902) is the wrong layer for the general case: it prices a pause *before* the attack receipt, anchored on the
action's opener, and its MoveEnd branch (:949) fires only for a no-message action (Wish: the attack receipt is the used print itself).
The transition belongs at the generic `set-battler-sprite-visibility` branch (:4299), when `event.provenance.opcodeName ===
"B_SCR_OP_MOVEEND"` is the **first** MoveEnd receipt of the action (the previous kernel event of that action is not a MoveEnd receipt):

1. Scene OFF only at first (the rule is also ROM-exact in ON; see below). Require that the next kernel message is a `STRINGID_USEDMOVE`
   whose instructionExecution is u (the kernel restarts the count; `used < e1`), else do nothing (switches, end of turn, pre-move prints,
   faint stay unmeasured).
2. Find the anchor: walk back from the receipt to the last of `message` (+ its `waitmessage` operand via `BATTLE_SCRIPT_PROGRAM`
   `instructions[programCounter + 1]`, B_WAIT_TIME_LONG = 64 = `WAITMESSAGE_LONG_HOLD_FRAMES`), `hp-change`, `status-icon-update`.
   E = its instructionExecution (+ 64 for a print). d = e1 - E - 1.
3. Push one `move-animation` command with `timing: { minimumFrames: d + 6 + u }` (the same draw-nothing pause shape the :4140 branch
   uses) immediately before the first sprite-visibility command. The n sprite-visibility frames then follow, so the used print starts
   at E + 1 + d + n + 6 + u.
   Any command presented after E and before the pause (the status icon, a trailing `status`) subtracts its frames from the pause.
   Sanity values: Bulk Up 12, Sand-Attack 12, Protect 12, Toxic 16, Scratch 13, Double-Edge 14, Rest 15.
4. Wish keeps `SCENE_OFF_MOVEEND_NEXT_USED_GLYPH_ROWS = 7` (n = 1, 7 = n + 6, with d = 0 because the attack receipt is the anchor) and
   should be re-expressed through the same function.

## What it changes in Scene ON

Nothing is required to be the same: the rule's inputs (E, d, n, u) are the same kernel facts and the ROM-only check is exact on all 12 ON
receipts with a print / HP anchor. Applying it in ON moves the stat/protect/rest/two-turn edge residuals from -13..-18 to -4..+4, i.e. to the existing ON anchor
errors (live-body tails: the used/stat print starts 3-6 frames early in ON, Dig +4). Recommended: land it for OFF first (the OFF residual is
exactly what the rule removes), then take ON as a separate step so the -3..-6 body-tail items stay attributed.

## Remainder

- The production step itself (above), then re-pin the OFF frames it moves (soak seeds, sgl138 battle totals as in msg175).
- Print lengths: "But it failed!" (+9), Dig's "dug a hole!" (+3), the Dynamic Punch ply miss print (+1), Toxic interior (-2).
- Hit-path confirmation on the real-stat route; fainting targets (out of scope), switches, end-of-turn, and pre-move (paralysis,
  confusion, sleep) prints are not covered.
- Papercut: `off108Run.sh`/`off148Run.sh` hardcode the Mac venv path `../../vendor/mgba-venv/bin/python`; here
  `/srv/pokebench/vendor/mgba-venv/bin/python` (`trn176Run.sh` takes `TRN176_PY`).

Reproduce: `node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts [--scene=off|on] [--fixtures=...] [--json]`;
`sh tools/integration/trn176Run.sh <fresh-dir-inside-the-repo>`.
