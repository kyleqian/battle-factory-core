# mvs1: Will-O-Wisp's orb, METRONOME's called moves and Scene OFF Substitute / Transform sounds (2026-11-21)

fcm1 findings 5, 6 and 7 (`docs/fcm1-catcher-sweep.md`). Branch `fix/called-move-sounds` (from `trial-fix-20261121`). Sound only: no picture,
timing, gameplay or RNG change (the remade catcher traces are byte-identical to fcm1's, and every engine picture of the three runs is unchanged).
Evidence (not in git): `.integration/evidence/fix-called-moves/`.

## What was wrong

1. **Will-O-Wisp (finding 5)**: the first orb plays SE_M_FLAME_WHEEL itself. `AnimWillOWispOrb_Step` (`battle_anim_fire.c:1166-1186`) calls
   `PlaySE12WithPanning(SE_M_FLAME_WHEEL, gAnimCustomPanning)` on each translate call whose `data[5]` (0 at the Step's entry, +4 & 0xFF a call) was 0
   or above 196 and is now above 0, for the orb with `data[7] = gBattleAnimArgs[2] = 0` only. The Step runs |target X - x| = 104 calls in singles,
   so the SE plays on Step calls 1, 51..63 and 65: 15 times. The sound timing extractor only knew the script's own `playsewithpan`s; aud260 had
   left the orb's rows "unmodelled: ROM-only rows". The picture was already drawn (s17-on-wc: nine body rows sampled from 20 to 180 equal the
   ROM's at 0 px, shifted; see Open).
2. **A move METRONOME calls (finding 6)**: the general path is right. The called move's MOVE_ANIMATION carries `gCurrentMove` (the called move),
   and every called move with an adapter is drawn and plays its sounds (fcm1: s89-on-wc FALSE SWIPE, RECOVER, OCTAZOOKA, ABSORB, SMELLINGSALT;
   s100-on-wc SHADOW PUNCH, FLAME WHEEL, WATER PULSE, FACADE, SMOG, DYNAMICPUNCH; s94-on-wc HOWL, HYPER VOICE, RETURN, SECRET POWER, CURSE,
   REVERSAL: no ROM-only sound row). AEROBLAST (177) and LEECH LIFE (141) are two of the 65 moves with no adapter at all
   (`docs/phy1m-nonlive-bodies.md`): no Factory set has them, so only METRONOME reaches them. Such a body shows the static field for 32 rows,
   and `liveMoveSourceAge` gave it no sound clock, so it was silent. The ROM draws its animation (s89-on-wc picture difference #2: the
   sky background and the darkened field, 377 ROM-only frames) and plays its script's SEs.
   Other move-calling moves: SLEEP TALK is in 8 Factory sets (333, 379, 397, 432, 576, 584, 822, 839; all inside 110-849): it calls the user's
   own moves, which all have adapters, through the same `gCurrentMove` path. ASSIST (set 16), MIRROR MOVE (37) and NATURE POWER (none) are in no
   Factory set (110-849), so only METRONOME reaches them, and they have no adapter either (the s44-on-ws METRONOME -> ASSIST -> PSYCH UP).
3. **Scene OFF Substitute (finding 7)**: it is drawn. `Cmd_attackanimation` (`battle_script_commands.c:1748`) skips the animation under
   HITMARKER_NO_ANIMATIONS except for MOVE_TRANSFORM and MOVE_SUBSTITUTE, tested on `gCurrentMove` (the called move under METRONOME). The kernel
   already did so (sub157), and the METRONOME-called Substitute is drawn like a direct one (s36-off-ws: ROM shrink rows 115399-115407 and the
   doll's drop 115430-115450; ours 109245-109253 and 109276-109296: the same 9 and 31-row shape after the used print). But `emitMoveAnimSounds`
   returned for every body under HITMARKER_NO_ANIMATIONS, so a Scene OFF Substitute or Transform played nothing. The ROM's controller runs the
   whole script, sounds included (`DoMoveAnim`, no scene test). In both scenes Substitute was also missing its two SE_M_BUBBLE2, which
   `AnimTask_MonToSubstituteDoll` (`battle_anim_effects_3.c:4823-4865`) plays when the doll lands (task calls 42 and 67).
4. **The sound clock of these bodies**: the generic move-body clock (script row = body age - 1 - 7, calibrated on bodies whose lead is not
   presented) put Substitute's SEs 7 rows late. Substitute's lead is presented as `scriptLeadFrames`, so its body is drawn on the ROM's rows. It
   also put Transform's SEs 5 rows late and Will-O-Wisp's 1 row early (aud260 had pinned that 1 as a constant offset). On the ROM, for all five
   bodies measured, script row 0 is the command's row (seGate +) lead + 4. The lead is the kernel instructions between the used print and
   `attackanimation`: Leech Life and Aeroblast 5, Substitute 4, Transform 2, Will-O-Wisp 8.

## ROM evidence

| case | ROM (frame) | ours before | ours after |
|---|---|---|---|
| s17-on-wc Will-O-Wisp (fcm1 catcher), relative to the used print's last glyph (ROM 86145, ours 82013) | EMBER +22 / +32, FLAME_WHEEL +54, +104..+116, +118 (pans 63, 11 .. -13, -17), FLAME_WHEEL2 +174 | EMBER +21 / +31, no FLAME_WHEEL | equal (82035, 82067, 82117..82129, 82131) |
| `aud260-willowisp-{player,opponent}` labs (soundEventProbe) | player 75, 85, 107, 157..169, 171, 228 (pans -64, -12 .. 12, 16) | 1 row early, no FLAME_WHEEL | equal, frames and pans |
| s36-off-ws METRONOME -> SUBSTITUTE (fcm1 catcher), the used print's last glyph ROM 115388 / ours 109234 | SE_M_ATTRACT 115397 (2 rows before the first shrink row 115399), SE_M_BUBBLE2 115438, 115463 | nothing | 109243 (2 before our shrink 109245), 109284, 109309 |
| `mvs1-substitute-{player,opp}-{on,off}` labs | player 62 / 103 / 128, opp 66 / 107 / 132, both scenes; oracle capture (player ON): last glyph 53, first shrink 64 | ON: SE_M_ATTRACT only, 68 (opp 72); OFF: nothing | 61 / 102 / 127 (opp 65 / 106 / 131): one row early because this stage's print and body are (last glyph 52, shrink 63; see Open); SE 2 rows before the shrink as on the ROM |
| `mvs1-transform-{player,opp}-{on,off}` labs | SE_M_TELEPORT / SE_M_MINIMIZE player 61 / 109, opp 65 / 113, both scenes | ON 66 / 114; OFF nothing | equal |
| s89-on-wc METRONOME -> LEECH LIFE (fcm1 catcher), last glyph ROM 220631 / ours 208307 | SE_M_ABSORB 220676, SE_M_CRABHAMMER 220708 + 6k (x8), SE_M_ABSORB_2 220803 | nothing | 208352, 208384 + 6k, 208479: equal relative to the print |
| s89-on-wc METRONOME -> AEROBLAST, last glyph ROM 239433 / ours 226049 | SE_M_JUMP_KICK 239490 + 5k (x20), SE_M_RAZOR_WIND 239609 | nothing | 226106 + 5k, 226225: equal relative to the print |
| census seed 197 METRONOME -> TRANSFORM, both scenes (no ROM run; the labs' rows) | command rows 9 / 57 (the labs: command start 52, SEs 61 / 109) | ON 14 / 62; OFF nothing | 9 / 57 in both scenes |

The labs: `tools/integration/mvs1Labs.py` writes `tools/battle-lab/mvs1-<move>-<side>-<scene>.json` (a Lv50 Rattata with the move x4 against a
Lv25 Rattata with Seismic Toss x4). The app stages of the same names are `tools/compare/appTrace.ts` `mvs1Stages`, and the ROM fixtures are
`tools/audio/fixtures/mvs1-*.json` (`soundEventProbe.py ... lab ... --frames 200 --compact`, stepping mode).

## The change

- `tools/extract/extract-anim-sound-timing.ts`:
  - Will-O-Wisp: `willOWispOrbSeCalls` emits one `sprite_willowisp_orb` op per orb SE. Its `times` is the number of calls the second
    `SoundTask_AdjustPanningVar` (attacker -> target, +-2 a call, created on script row 66) has run before the SE. An SE at iteration I reads
    it after I - 66 + 1 calls, and 0 means the orb's own constant pan task. `src/data/gen/anim-sound-timing.json` is regenerated: 1,501 -> 1,535
    ops. Only Move_WILL_O_WISP, Move_SUBSTITUTE and General_SubstituteAppear change (the extractor reproduced the committed table byte for byte
    before the change).
  - Substitute: `monToSubstituteSeCalls` (calls 42, 67) emits the two SE_M_BUBBLE2 rows.
- `src/engine/moveAnimSounds.ts`:
  - `willOWispOrbRows` steps the pan task (`KeepPanInRange`, ends on the target).
  - Under HITMARKER_NO_ANIMATIONS only Transform and Substitute bodies play.
  - Transform, Substitute and Will-O-Wisp use the script clock: row 0 on the command row seGate + `moveAnimationScriptStartRow`.
  - A no-adapter body plays its table rows on the same clock (`emitStaticMoveAnimSounds`, Scene ON). The rows after the 32-row static command
    form a sound-only tail (`scheduleAfter`), like aud260's tails. This is in its own commit, so it can be reverted alone if silence is
    preferred until the bodies are drawn (see Open).
- `src/engine/battleResolutionPresentationRender.ts`:
  - `moveAnimationScriptStartRow`: the lead + 4, read from the kernel's instruction provenance of the used print and the MOVE_ANIMATION receipt.
  - `staticMoveSourceRow`: no-adapter bodies only (`liveMoveAnimationDurationCaseMissing`). It is not used for a declined body that has an
    adapter, or for an attacker shown as a doll (the ROM swaps first).
  - The field inputs are shared with `liveMoveSourceAge` (`moveSourceFieldInputs`, unchanged values).

## Tests

- `tests/mvs1CalledMoveSounds.test.ts` (19 tests):
  - The table rows and the orb's pans (equal to the ROM's on both sides).
  - The labs: Will-O-Wisp's 18 body SEs on the ROM's frames and pans, Transform equal in both scenes and on both sides, and Substitute's
    three SEs with the one-row stage offset. Our first shrink row is 2 rows after SE_M_ATTRACT, as on the ROM.
  - The s36-off-ws case (METRONOME -> SUBSTITUTE): drawn live, SEs on command rows 8 / 49 / 74 and the shrink on row 10 (the ROM's rows,
    counted from the command start). First replayed with the seeded test player. On the combined trial tree the player no longer reaches that
    turn (other fixes moved its press timing), so mvs1-2 stages it instead, in both scenes: `mvs1-metronome-substitute-player-{off,on}`
    (`tools/compare/appTrace.ts`), a Rattata with METRONOME whose kernel seed 412 calls SUBSTITUTE. That is the only one of seeds 1..3000,
    and it is engine-only: no ROM lab rolls the same call.
  - (mvs1 also had s89-on-wc METRONOME -> LEECH LIFE / AEROBLAST, static, script start 9. That test went out with the trial's revert of the
    no-adapter sound path.)
  - Census seed 197 METRONOME -> TRANSFORM and seed 17's direct Substitute, both scenes.
- `tests/aud260MoveAnimSounds.test.ts`: the Will-O-Wisp table now has the orb rows, and the lab offset is 0 (was 1).
- `tests/audioProbeFixtures.test.ts`: the 8 new fixtures listed.
- `tests/aud242aMoveAnimSounds.test.ts` agility-player: the foe's Tackle has no adapter (outside the Factory sets). It was a named ROM-only row
  (391) and is now emitted 24 rows after its print's last glyph, as on the ROM (ROM 367 -> 391, ours 365 -> 389). The print itself is 2 rows
  early in that lab (oracle capture: ROM glyphs 345..367, ours 343..365), so the test pins it with `rowDelta` +2.

Runs: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean. The 149 test files that import a changed module (1,425 tests; the one failure,
aud242a's Tackle above, was fixed and re-run green) and the 69 other sound test files (2,864 passed, 26 skipped) are green. `npm run test:gate`: 360 files, 2,832 tests passed. `tests/randomRoundSoak.test.ts`:
green, no re-pin (no frame moved).

## Catcher before / after

The three traces were remade on this build with their `maker` arguments (`makeTrace.mjs --seed 89|36|17 --scene on|off|on --policy
winning-coverage|winning-swap|winning-coverage --battles 21 --lobby-tail 120 --max-frames 400000`). They are byte-identical to fcm1's and still
show the cases (`.lines.txt`: s89 207964 LEECH LIFE, 225606 AEROBLAST; s36 109107 SUBSTITUTE; s17 81539 WILL-O-WISP). Run:
`KEEP=1 JOBS=3 tools/frame-catcher/run.sh .integration/evidence/fix-called-moves/catcher ...` (ROM driver: every menu followed, as before).
The engine pictures are identical to fcm1's on every frame of the three runs (`scripts/samepics.py`). The engine sound logs differ only by the
added SEs: s89 +31 (Aeroblast 21, Leech Life 10); s36 +3; s17 +15 orb SEs, with the body's three other SEs one frame later.

| run | sound differences before -> after | the case's stretch (sounds) | content stretches |
|---|---|---|---|
| s17-on-wc | 5 -> 4: SE_M_FLAME_WHEEL x15 gone; left: battle 3's WHITE HERB (finding 1) and the Lobby's SE_WALL_HIT, as before | 252: content -> timing | 181 -> 180 |
| s36-off-ws | 3 -> 1: SE_M_ATTRACT and SE_M_BUBBLE2 x2 gone; left: the draft YES/NO SE_SELECT (catcher limit) | 533: content -> timing | 180 -> 179 |
| s89-on-wc | 5 -> 5: Leech Life's four rows (ABSORB, CRABHAMMER x8, ABSORB_2) gone. Aeroblast: 10 of the 20 SE_M_JUMP_KICKs and its SE_M_RAZOR_WIND are now "ours in stretches 877 / 878, the ROM's in 876" | 788 (Leech Life): content -> timing; 876 (Aeroblast): content, and 877 (the next action menu) timing -> content | 547 -> 548 |

Aeroblast's split is the static-body problem in Open. Its body is 32 rows on ours and about 180 on the ROM, so our next action menu opens
(226152) while its SEs still run (to 226225). On the ROM the menu comes after the animation.

## Open

- **The no-adapter bodies are still not drawn.** Aeroblast, Leech Life and the other 63 moves only METRONOME reaches (`docs/phy1m-nonlive-bodies.md`
  section 2) show the static field for 32 rows. The ROM's bodies are far longer: Leech Life's hit comes 237 rows after its script start, and
  Aeroblast's SEs run to row 166. The hit, HP bar and next message therefore come early, and the body's later SEs now play over them. Drawing
  them takes new adapters (an animation-lane job). These are the first two with ROM frames (s89-on-wc, opponent side only). Holding the static
  field for the ROM's body length instead would line the timing up but changes frames (soak pins) and was not done. If the overlap sounds
  worse than silence, revert the second commit alone.
- The lead + 4 clock is applied to the five measured bodies only. The other bodies keep the generic clock their aud242+ ROM windows pinned.
- Will-O-Wisp's body picture is drawn 8 rows before the ROM's, relative to its print and its sounds, which now match the ROM's. In s17-on-wc
  engine frame e equals ROM frame e + 4140 at 0 px, while the two prints end 4132 apart (the 7-row shift in "What was wrong" was measured
  against the old, one-row-early sounds). This is the unaudited body lead class (`docs/phy1m-nonlive-bodies.md` section 5). Transform's mosaic starts 2 rows early in the lab (ours 62, ROM 64 with the print
  aligned).
- Will-O-Wisp's Status_Burn SE (a separate status animation) stays 3 rows early (`STATUS_ANIMATION_SCRIPT_AGE` comment, known).
- Substitute's used print is one row early on our side: `BattleScript_EffectSubstitute` runs `ppreduce` before `attackstring`. In the labs, our
  print, body and SEs are all one row before the ROM's. In s36-off-ws the comparison is relative to the print, which is all a catcher run can
  show.
