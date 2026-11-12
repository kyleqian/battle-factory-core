# snd182: Scene ON forced PLAYER send-in ("X was dragged out!") in production

ISSUES #146 open item 1 (`docs/snd179-scene-on-forced-player-send-in.md` is the evidence; `docs/plr162-player-forced-send-in.md` the Scene OFF half).
Presentation only: no kernel event, no gameplay RNG, no damage / turn-order change. Base: master `14bb5777c`.

## Result

| acceptance | result |
| --- | --- |
| 1. production vs ROM first-glyph frame, 27 snd179 probe cases (CASTFORM included) | before: 0 / 27 exact; after: **27 / 27 exact (0 frames off)**; ROM r1 == r2 27 / 27 |
| 2. dense Scene ON ROM windows (6, twice fresh) | next-text frame == production duration in 6 / 6; healthbox + message px 0 (CASTFORM 2 px healthbox); remaining px is the mon region (no back animation in the live renderer, predates this change) |
| 3. Tier-1 tests | `tests/snd182SceneOnForcedPlayerSendIn.test.ts`, `tests/plr162PlayerForcedSendIn.test.ts` (see below) |
| 4. census 0..999, both scenes | kernel digests identical 1000 / 1000 both scenes; OFF byte-identical (1000 / 1000 battles, 316,756 commands); ON 980 / 1000 battles byte-identical, 20 battles change, 32 commands, all forced player send-ins, 0 unattributed |
| 5. `compare:differential` (3 scenarios, base `14bb5777c`) | PASS, 641 / 641 captures identical |
| 6. re-pins | one test pin moved (sc106 Intimidate seed 6, +46); one ratchet list widened (see "Re-pins") |

## Mechanism

Scene ON: `PlayerHandleSwitchInAnim` -> `SwitchIn_CleanShinyAnimShowSubstitute` (waits for the back animation) -> `SwitchIn_HandleSoundAndEnd`
(waits for the cry) -> print. The "dragged out!" first glyph is

    message = shift + max(91, cry + 66, T_back + 70)        shift = 1 for CASTFORM (385), else 0

- `cry` = `SEND_IN_TAIL_OFF_CRY_FRAMES[species]`, `T_back` = first tick at which `BACK_SEND_OUT_REDUCERS[selectBackSendOutAnimation(species, nature)]`
  reports `WaitAnimEnd` (`backAnimWaitTick`, `src/engine/switchInTail.ts`; cached per species x nature).
- The switch-in command's `minimumFrames` is that duration minus `SWITCH_IN_WAITSTATE_HOLD_FRAMES` (11): command total == the next command's first-glyph frame.
- The forced Scene ON player command also carries the plr162 `healthboxSlideElapsed` (65, +shift) and `sendInVisualDelay` (-1, +shift); Scene ON -1 confirmed
  against the ROM (delay 0 / -2 each leave ~14k healthbox px).
- Nature = `personality % 25` of the sent-in mon, read from `incoming.field.personality` (carried by `battleCommandFieldBattlerFromPartyMember`);
  no new kernel event and no RNG consumption. (snd179 said the renderer already passed `natureId`; it does not, the nature is only reachable via personality.)
- `battleResolutionPresentation.ts`: the forced-removal marker (`returntoball BS_TARGET` on a Scene ON player) now applies to both scenes; the
  `!sceneOn` restriction is gone. Voluntary switches, faint replacements and opponent send-ins keep their calibrated tails.
- The plr162 comment that attributed the Scene ON gap to the Roar cry is replaced with a pointer to `sceneOnPlayerForcedSwitchInDuration`.

### snd179 caveat 4 (origin of `txtStart - ball`)

snd179 measured `txtStart - ball` and left open whether that origin equals the production 91 + 11 origin. The dense windows settle it: the ROM frame of the
next text, counted from the thrown-ball box anchor, equals the production command duration in 6 / 6 windows (PIDGEY 91, METAPOD 132, TORKOAL 198, CASTFORM 158,
BULBASAUR 132 / 161), so the sweep origin is the same one the old 91 + 11 used. On base the production duration is always 102 and the ROM's next text is
at 91 / 132 / 198 / 158 / 132 / 161: the difference is the duration value, not the origin.

## Acceptance 1: first-glyph frame vs ROM (27 cases)

`tools/integration/snd182Rows.ts` (receipt `fixtures/snd182/first-glyph-vs-rom.json`); frames from the send-in start, ROM = the snd179 `rom-rows-r1.json` and
`rom-rows-attackers-r1.json` probes. Before = production at `14bb5777c` (always 102 = 91 + 11), after = this change.

| case | ROM | before (delta) | after (delta) |
| --- | --- | --- | --- |
| roar PIDGEY (slide-bound) | 91 | 102 (+11) | 91 (0) |
| roar METAPOD (cry-bound) | 132 | 102 (-30) | 132 (0) |
| roar MANKEY / PRIMEAPE | 113 / 113 | 102 (-11) | 113 / 113 (0) |
| roar TORKOAL (back-anim-bound, n6 / n0 / n10) | 198 | 102 (-96) | 198 (0) |
| roar WIGGLYTUFF n6 / n0 / n10 | 134 / 135 / 184 | 102 | 134 / 135 / 184 (0) |
| roar BUTTERFREE | 157 | 102 (-55) | 157 (0) |
| roar CASTFORM (+1) | 158 | 102 (-56) | 158 (0) |
| roar PIKACHU | 126 | 102 (-24) | 126 (0) |
| roar BULBASAUR n0 / n10 | 132 / 161 | 102 | 132 / 161 (0) |
| Whirlwind PIDGEY / METAPOD / CHARIZARD / WIGGLYTUFF / TORKOAL | 107 / 132 / 198 / 135 / 198 | 102 | 107 / 132 / 198 / 135 / 198 (0) |
| other attackers (att295, TYPHLOSION, JYNX, att329) x PIDGEY / CHARIZARD / WIGGLYTUFF | 91 / 198 / 134 | 102 | 91 / 198 / 134 (0) |

Totals: 27 cases, exact before 0, exact after 27, ROM r1 == r2 27 / 27. The sweep itself (339 species, nature 6): `sceneOnPlayerForcedSwitchInDuration` is exact 339 / 339.

## Acceptance 2: dense Scene ON windows

`tools/integration/snd182Stage.py` (ROM capture, twice each, byte-identical), `snd182Compare.ts` (plr162-style dense compare: anchored on the thrown-ball box,
opponent half transplanted from the ROM, regions phb = player healthbox, mon, msg). Receipt `fixtures/snd182/compare-summary-on.json`, ROM hashes `rom-sha-on.json`.

| window | bound | duration = ROM next text (base) | rows | phb px | msg px (base) | mon px (base window) |
| --- | --- | --- | --- | --- | --- | --- |
| PIDGEY | slide | 91 = 91 (102 vs 92) | 92 | 0 | 0 (8895) | 26828 (26828) |
| METAPOD | cry | 132 = 132 (102 vs 133) | 133 | 0 | 0 (2402) | 30206 |
| TORKOAL | back-anim | 198 = 198 (102 vs 199) | 199 | 0 | 0 (2385) | 205446 |
| CASTFORM | back-anim, +1 | 158 = 158 (102 vs 158) | 158 | 2 | 0 (2381) | 80119 |
| BULBASAUR n0 | cry | 132 = 132 (102 vs 133) | 133 | 0 | 0 (2331) | 42293 |
| BULBASAUR n10 | back-anim | 161 = 161 (102 vs 162) | 162 | 0 | 0 (2331) | 63654 |

Healthbox and message regions are pixel-exact after the change (CASTFORM: 2 healthbox px, 1 px each at rows 76 and 84; present on base too, cause not investigated).
The non-text residual is the mon region: the live renderer has no player back send-out animation (the renderer does not distinguish the scene for switch-in drawing; the
player mon is the static back sprite), so while the ROM plays TORKOAL's / BULBASAUR's back animation the production sprite
is static. It **predates this change**: base `14bb5777c` already has the same mon-region residual over its own window (mon px base / final over the first ~103 rows:
PIDGEY 26828 / 26828, CASTFORM 43026 / 43026, METAPOD 21006 / 21604, TORKOAL 45088 / 46894, BULBASAUR n0 26272 / 26985, n10 28336 / 29187; the few-hundred-px
extra in the final column is at the window tail where base had already started its message, not investigated further), and the totals grow with the window
length because the longer window exposes more of the same missing animation rows. Out of scope here; the missing piece is a back send-out renderer.
Both ROM captures agree in each window (`compareR1EqualsR2`: true).

## Acceptance 3: Tier-1 tests

- `tests/snd182SceneOnForcedPlayerSendIn.test.ts`: sweep 339 / 339 against `fixtures/forced-switch/species-sweep-player-target.txt`; the ROM probe files (27 rows);
  the three bounds (PIDGEY slide 91, METAPOD cry 132, TORKOAL back-anim 198); CASTFORM +1; nature-dependent BULBASAUR (n0 132, n10 161) and
  `personality % 25`; the `switchInTiming` matrix (Scene ON forced player, Scene ON non-forced player, Scene ON opponent, Scene OFF forced).
- `tests/plr162PlayerForcedSendIn.test.ts`: Scene OFF forced player send-in unchanged (`sceneOffPlayerForcedSwitchInDuration`); Scene ON forced
  (census Roar seed 23 / Whirlwind seed 76) carries the Scene ON tail from `incoming.personality`; non-forced player send-ins keep `{minimumFrames: 91}`
  and no slide / delay; opponent send-ins keep `opponentSwitchInDuration - 11`.

## Acceptance 4: census 0..999, both scenes

`TRN178_CENSUS_JOBS=6`, `tools/integration/trn178Census.sh` on base `14bb5777c` and on this branch; `snd182CensusDelta.py` (receipts
`census-delta-on.json`, `census-delta-off.json`).

| scene | battles | kernel-event digest mismatches | commands base -> final | byte-identical battles | unattributed |
| --- | --- | --- | --- | --- | --- |
| OFF | 1000 | 0 | 316,756 -> 316,756 | 1000 / 1000 | 0 |
| ON | 1000 | 0 | 320,378 -> 320,378 | 980 / 1000 | 0 |

Scene ON: 32 changed commands in 20 battles, every one a forced player switch-in (species 26 distinct), each `minimumFrames` 91 (base, + 11 hold) -> the species value in the receipt (91 .. 190; e.g. 137 for DROWZEE, 187 for species 363),
with slide 65 and delay -1; command sequence types unchanged; total +1136 frames over the census. Budget-stalled battles 434 / 796 / 881 stall identically in both trees
(pre-existing 200k-frame input budget) in both scenes.

## Acceptance 5: differential

`npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 14bb5777c`: PASS,
641 / 641 captures identical, 3 traces (receipt `fixtures/snd182/differential.json`, run on `787b9a591`; no `src/` change since). None of the three scenarios
contains a forced player send-in, so no difference was expected and none attributed.

## Re-pins (acceptance 6)

Only moved frames, each attributed:

- `tests/sc106StatsChangeCommand.test.ts` "Intimidate (seed 6, slot 0 ...)": `statsChange` and `following` frames +46. Seed 6's route (slot 0 x 8) has the Foe
  Roar / Whirlwind the player's DROWZEE (species 96) at frame 849: forced Scene ON player send-in command 137 + 11 = 148 vs the old 91 + 11 = 102 = +46 before the
  Intimidate; the second forced send-in (frame 4197, species 281) is after the anchor. Route length and every other anchor are unchanged.
- `tests/animation/animationBoundaryRatchet.test.ts`: `src/engine/switchInTail.ts` joins the pinned `src/engine` consumers of `src/animation`
  (pure back send-out reducers, timing only). The pin comment says to widen the list only with an explicit brief-level justification: the step brief
  requires `T_back` from `selectBackSendOutAnimation` / `BACK_SEND_OUT_REDUCERS`. This file is in the animation-lane test directory; the change is a one-entry list
  addition with a comment, no ledger touched.
- No other pin moved in the full suite (see "Gates").

## Not covered

- Player faint-replacement send-in: not run (out of scope; it is not marked by `returntoball BS_TARGET`, so it keeps the 91 + 11 tail; whether it is trivially the same was not measured).
- Shiny / `CRY_MODE_WEAK` cries: unmeasured.
- The switch -> "used" print tail: out of scope.
- Back send-out animation drawing in the live renderer (mon-region pixel residual above).

## Reproduce

    source /etc/pokebench-runner.env
    node --experimental-strip-types --no-warnings tools/integration/snd182Rows.ts            # first-glyph rows vs the ROM
    /srv/pokebench/vendor/mgba-venv/bin/python tools/integration/snd182Stage.py ...          # ROM capture (see the script header)
    node --experimental-strip-types --no-warnings tools/integration/snd182Compare.ts ...      # dense compare
    TRN178_CENSUS_JOBS=6 bash tools/integration/trn178Census.sh ...                          # census, both trees
    python3 tools/integration/snd182CensusDelta.py <base-dir> <final-dir> <out.json>
    npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 14bb5777c

## Gates

See the final commit message / step report for the tested commit and tree identities and outcomes.
