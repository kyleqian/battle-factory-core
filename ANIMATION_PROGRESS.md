# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## Current handoff

- **State:** **11 exact / 3 partial / 262 unsupported**. FLY and BOUNCE are
  exact across both legal orientations. DRAGON_BREATH remains partial only
  because portability and its three pre-existing action-menu bounce exclusions
  are still open; ISSUES #23's compressed fire-projectile remainder is closed.
- **Did:** replaced the false eight-spawn premise with the source's eleven
  `create_dragon_breath_fire_sprite` commands and fresh RAM's 3174-3214
  every-four-tick stream. `dragonBreath.ts` parameterizes the shared
  translation/affine/frame program. Scene composition now follows
  `monbg ANIM_DEF_PARTNER` plus OAM subpriorities: embers win over the target
  BG, while player-back Onix (30) wins over ember sprites (38). The generic
  affine sampler is unchanged.
- **Evidence:** the new committed ON trace is **61/61** over every render
  3175-3235; the existing complete evidence trace remains **237/237**. A fresh
  wrapper-validated RAM dump finds 11 spawns, max 6 live, and the repaired
  sole-live verifier is 0px at compressed render 3177 and magnified render
  3232. Focused Dragon Breath/battle-scene tests are **279/279**; the full
  suite is **1668/1668**, and build/coverage are green. FLY charge/strike
  remain **213/213 + 256/256**, BOUNCE's fresh control is **24/24**, and the
  adjacent ENDEAVOR window remains **237/237**. Source batch audit:
  FLAMETHROWER, BLAZE_KICK, FIRE_BLAST, EMBER, and FIRE_SPIN share the
  small-ember asset and selected generic tasks only, but each uses distinct
  sprite templates; DRAGON_RAGE shares the translation callback family with
  different affine/geometry inputs. None is promoted.
- **Next:** prove DRAGON_BREATH portability in both required orientations
  through the shared seam, without changing Battle Lab outcomes/PP. Its three
  pre-existing action-menu bounce exclusions remain separate from the now
  exact projectile component. DIVE remains unsupported.
