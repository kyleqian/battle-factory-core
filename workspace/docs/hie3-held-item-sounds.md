# hie3: General_HeldItemEffect sound effects (ISSUES #220 step 3, Scene ON)

Sound-only (no gameplay, RNG, text, command list, presentation length or frame hash change). `moveAnimSounds.ts emitGeneralAnimSounds` plays the five SEs of
`General_HeldItemEffect` for the `general-animation` command `HELD_ITEM_EFFECT`: SE_M_TAKE_DOWN (152) x3, SE_M_MORNING_SUN (228), SE_SHINY (102), pan SOUND_PAN_ATTACKER (-64
player, 63 opponent). Scene OFF has none (the ROM runs Pausex20; the command is a `move-animation` hold there).

## Anchor

The extracted table (`anim-sound-timing.json`, `General_HeldItemEffect`) holds only the first op (152 at script frame 8; the rest follow `waitforvisualfinish`). The remaining rows
are the script's spacing, measured: 152 at 8 / 40 / 72 (three 32-frame rotations), 228 at 104, 102 at 176 (`HELD_ITEM_EFFECT_LATER_SE_OPS`).

**Script frame 0 = the command's first frame + (minimumFrames - 214)** (`HELD_ITEM_EFFECT_COMMAND_FRAMES`): one rule from the command length, the same drift-free epoch as the drawn
animation (hie2b: age 0 = command start + minimumFrames - 204; the first SE is two frames before age 0). Restart (229) = frame 15, continuation (223) = 9, cure berry (192) = -22.

Cure berry: the first SE (and nothing else) falls 14 frames before the held-item command, inside the netted 32-frame `status` command that precedes it. That command lasts exactly its 32
frames, so the same script row is computed from the status command's age (`elapsed - 32 - (192 - 214)`) while it is the current command and the next one is the held-item effect. No carry state.

## Measured (step-mode probe, `tools/audio/fixtures/hie3-*-on.json`, ROM minus lab drift = engine frame)

| lab | ROM SE frames 152 / 152 / 152 / 228 / 102 | pre-segment drift (hie2b) | engine frames | first SE vs command's first frame |
|---|---|---|---|---|
| hie1-sitrus-on | 754 786 818 850 922 | +9 | 745 777 809 841 913 | +23 |
| hie2-sitrus-opp-on (pan 63) | 754 786 818 850 922 | +9 | 745 ... 913 | +23 |
| hie1-shellbell-on | 766 798 830 862 934 | +17 | 749 781 813 845 917 | +17 |
| hie1-leftovers-on | 772 804 836 868 940 | +17 | 755 787 819 851 923 | +23 |
| hie1-cheri-on | 737 769 801 833 905 | +20 | 717 749 781 813 885 | -14 |

Every site matches the ROM exactly (id, pan, frame) once the lab's own earlier-battle drift is removed; the drift is the same number hie2b measured from frame hashes, so the SE epoch and the drawn
epoch agree (five independent windows, one constant). Pinned in `tests/hie3HeldItemSounds.test.ts` (+ Scene OFF: no row).

## T2 rescore (5 Scene ON seeds 2 / 165 / 499 / 830 / 1028, ROM re-driven on the current engine; `.integration/evidence/hie3/`)

| SE | ROM-only rows before -> after | extra |
|---|---|---|
| 152 | 24 -> 0 | 0 |
| 228 | 8 -> 0 | 0 |
| 102 | 11 -> 3 | 0 |

The 3 remaining 102 rows are not HeldItemEffect (the SE_SHINY rows of seed 499; unchanged). The 8 held-item events (7 in seed 2, 1 in seed 165) match as one in-order block of five rows each, all five at the same
segment-relative delta (the lab drift, engine minus ROM): -18, -13, -11, -9, -9, -8, -2 and +48 (seed 2, one event; earlier-segment structure, not the anchor). Move-animation SE exact / offset / missing / extra
`98 / 727 / 208 / 0` -> `98 / 767 / 168 / 0` (40 rows). Other families identical.

## Neutrality

- `compare:differential` vs `5054340cf`: hie1-sitrus-on 1823 / 1823, hie1-cheri-on 1823 / 1823, hie2-sitrus-opp-on 1101 / 1101, hie1-sitrus-off 823 / 823 captures byte-identical.
- `lsd194Census.sh` seeds 0..99, Scene ON, `5054340cf` vs the change: 100 seeds, 0 errors; `sound` / `soundDigest` differ on 82; `eventsDigest`, `commands`, `soundAnim` identical on all 100.

## Residuals

- A held-item effect behind a Substitute (no command, no SE; unmeasured in the ROM), multi-print berries and elevated-opponent shadow windows are unmeasured here as in hie2.
- The SE rows inherit the lab's earlier-battle drift (-18 .. -2, one +48 in seed 2) like every other move-animation row; that is move / hit timing, not this anchor.
