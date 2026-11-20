# pkm1: "PKMN BREEDER" prints the ROM's PK MN glyph pair (2026-11-20)

The fix for finding 3 of the frame catcher sweep (`docs/fcs1-catcher-sweep.md`, "'PKMN BREEDER' in plain letters with stray spaces").

## What was wrong

- The ROM spells three trainer classes with the brace code `{PKMN}`: `_("{PKMN} BREEDER")`, `_("{PKMN} RANGER")`,
  `_("{PKMN} TRAINER")` (`src/data/text/trainer_class_names.h:6`, `:54`, `:2`). charmap.txt:51 makes `{PKMN}` the two glyph codes
  0x53 0x54, the font's small "PK" and "MN" glyphs (8 px wide each, `gFontNormalLatinGlyphWidths`, `src/fonts.c:148`).
  `BattleStringExpandPlaceholders` copies the class name for `{B_TRAINER1_CLASS}` (`battle_message.c:2525-2533`), and the text
  printer draws those two bytes in two frames.
- Ours kept the source spelling ("{PKMN} BREEDER", `src/data/gen/facility-class-lookups.json`) as the class name, and `drawText`
  drew it letter by letter: "{" and "}" have no glyph and advanced a space (3 px) each, so the line read " PKMN  BREEDER" in
  ordinary capitals, 14 px wider (33 px for "{PKMN} " against the ROM's 19), and the printer spent 6 frames on it instead of 2.
- In the Factory, 24 of the 300 trainers have such a class: 12 PKMN BREEDERs, 12 PKMN RANGERs (no Factory trainer is a PKMN
  TRAINER). The class name reaches the screen in every battle message that names the trainer: "... would like to battle!"
  (`sText_Trainer1WantsToBattle`, :385), "... sent out X!" (:388, :390), "... withdrew X!" (:407) and "Player defeated ...!"
  (:371). The sweep saw 28 such messages in 8 of 26 rounds.

## ROM evidence

Seed 13 Scene ON, battle 4, "PKMN BREEDER RAFAEL sent / out WAILMER!": ROM frame 49,874 against ours 47,174 (the sweep's
`final/r13-on-ws`, `curated/f3-pkmn-breeder-text.png`). On the ROM frame the PK glyph starts at x 16, MN at x 24, and "B" at
x 35 (= 16 + 8 + 8 + 3); ours had "B" at x 49. Line 1's ink spans x 16-142 on the ROM, x 19-156 on ours.

## The change

One rule for every text caller (`src/engine/font.ts`):

- A named glyph run of charmap.txt's Latin section (`ROM_NAMED_GLYPH_CODES`: `PKMN`, `PK`, `POKEBLOCK`, `LV`, the arrows, ...) is
  carried in display text as one private-use character per glyph, U+E000 + glyph code (`{PKMN}` = U+E053 U+E054), the convention
  the draft and swap screens already used for their own `{PKMN}` strings. `expandRomGlyphCodes(source)` does the conversion and
  leaves placeholders and control codes alone.
- `codeForChar` resolves U+E000-U+E0F6 to the glyph code for every charmap, so `measureText`, `drawText`, the cursor position after
  a line, `slice` for letter-by-letter printing and every printer's length (one glyph per frame) are right with no per-caller case.

Where such source strings enter display:

- `factoryTrainerPresentation.ts`: the trainer class name (every battle message above, through every printer: the battle-start
  presentation, the resolution messages, the terminal "Player defeated").
- `factoryDraftScreen.ts`, `factorySwapRender.ts`: "Can't select same {PKMN}.", "{PKMN} FOR SWAP", "Same {PKMN} in party already."
  now come from their source spelling; the two per-module `charmap.set` lines are gone (the shared rule covers them).
- `factoryRentalPresentation.ts` item names and `battleStringResolver.ts` control segments: `{POKEBLOCK}` ("{POKEBLOCK} CASE",
  `STRINGID_THREWPOKEBLOCKATPKMN`). Neither can show in the Factory; they keep the rule complete.

Checked and not changed: the party menu's "Do what with this {PKMN}?" already draws glyph codes 83 84 172
(`DO_WHAT_WITH_MON_TAIL_CODES`), and the summary / party `{LV}`, `{NO}` are drawn as glyph codes by their own screens. No other
generated data that reaches the screen carries a brace code (battle-frontier-trainers, species, moves, items apart from the one
above; the battle room, pre-battle room, Lobby and terminal texts have none). The battle message templates' `{B_...}`
placeholders, `{WAIT_SE}` and `{PAUSE_UNTIL_PRESS}` are substitutions and controls, handled as before.

The ROM's printer spends one frame per glyph, so a message naming a PKMN BREEDER or RANGER now prints 4 frames sooner (2 glyphs, not
6 letters), as on the ROM. That is presentation timing only: replaying the sweep's seed 13 trace on this build gives the same
session digest as before (`5aa32eaa4599cd0d`, the hash of every battle's kernel events), the trace made afresh from seed 13 on this
build plays the same 100 battle-text entries (moves, damage, faints, wins) with the same digest, and the soak pins
(`tests/randomRoundSoak.test.ts`) did not move.

## Pixel check

`.integration/evidence/fix-pkmn/render_message.mts` draws the message with the engine's battle printer
(`drawBattleMessageTextLines`, the class name from `getFactoryTrainerPresentationByName("RAFAEL")`), and `compare_text.py` compares
both text lines (x 16-224, y 121-152) with ROM frame 49,874: 0 of 6,688 pixels differ (the old frame 47,174: 905, all on line 1).
Both lines' ink extents match the ROM (x 16-142, x 16-81).

## Tests

`tests/pkm1PkmnGlyphs.test.ts` (Tier 1): the named-glyph table against charmap.txt itself; "{PKMN} BREEDER" as glyph codes
83 84 0 B R E E D E R, 61 px wide, "B" 19 px in (the ROM's x 35); the 24 Factory trainers' class names; the full message printed
in 34 glyphs and drawn into a framebuffer, the PK MN glyphs and the space after them pixel for pixel against ROM frame 49,874
(rows 121-135, x 16-34) and both lines' ink extents; `{POKEBLOCK}` in a battle string.

Results: `tsc -b` clean (the `npm run typecheck` script needs `flock`, missing on this Mac, so the same command was run without the
lock); the 36 test files importing the changed modules (plus `randomRoundSoak`) 446/446; `npm run test:gate` 360 files, 2,832/2,832.

## Catcher before / after

Evidence in `.integration/evidence/fix-pkmn/` (not in git).

- **The sweep's trace replayed as it is** (`catcher-oldtrace/`): a fixed-frame trace made on the old build. "sent out WAILMER!"
  prints 4 frames sooner now, so the action menu opens on frame 47,547, not 47,551: the trace's A on 47,547 (before the menu, in the
  old run) now picks FIGHT, and its A on 47,552 the move on the fight menu's first frame (same choices, same digest). The engine never
  waits at that fight menu, the catcher loses its anchor, and the ROM driver stops at battle 4's next menu (179 of 289 menus,
  `stuck-at-unplanned-menu`). Up to there it shows the message: our two text lines equal the ROM's
  (its frame 49,877, identical to the sweep's 49,874) on all 320 engine frames the full message is up (47,119-47,438); in the before
  run on none (905 pixels apart at best; `find_message.py`).
- **The trace made afresh from seed 13 on this build** (`makeTrace.mjs --seed 13 --scene on --policy winning-swap --battles 7
  --max-frames 170000`, cut in the Lobby like the sweep's, `traces/r13-on-ws.json`), compared with the sweep's report
  `final/r13-on-ws/report.md`:

| | before (sweep, master `869b52918`) | after (this branch) |
|---|---|---|
| frames ours / ROM | 95,324 / 100,981 | 95,278 / 101,208 |
| menus followed | 290 of 290, engine-trace-end | 290 of 290, engine-trace-end |
| stretches content / timing | 141 / 148 | 142 / 147 |
| picture differences | 336 + 245 small | 300 + 205 small |
| sound differences | 0 | 0 |
| battle 4 message-window differences from the class name | 9 (`battle4-message-rows.txt`) | 0 |
| ROM message windows with the PK MN glyphs (battle 4: the intro, "sent out PUPITAR!", "sent out WAILMER!", "Player defeated"), shown pixel for pixel by ours | 0 of 82 | 81 of 82 |

  The nine differences gone: ours-only " PKMN  BREEDER RAFAEL sent" (engine 45,688, 45,695, 47,086, 47,087, 47,183), the ROM-only PK MN
  line (ROM 48,347, 49,780), ours-only " PKMN  BREEDER RAFAEL!" (52,039) and its ROM-only line (55,218). The one window left
  (`pk-pictures.txt`, ROM 55,471-55,524) is the ROM's prompt cursor after "Player defeated / PKMN BREEDER RAFAEL!" in its next bob
  phase: ours shows the cursor at the same place for one frame (ROM 55,462 = ours 52,031, pixel for pixel) and the trace's A takes it
  there, while the replayed A reaches the ROM about 56 frames later. The one stretch that turned "content" (177, battle 4) is the
  player sprite's box (x 40 y 60, 59x52, 3 ROM frames at the stretch's start) that the before report already has in 33 stretches
  each way (#11, #12), here past the comparator's window after the shifted presses; one more rescue A (ROM 52,230, at "IVYSAUR fainted!") is the same press-replay drift.

## Left open

- The trace lines that `makeTrace.mjs` writes now carry U+E053 U+E054 where they said `{PKMN}` (grep for those, or read them as
  `{PKMN}`); traces made on the old build replay with drifted presses past the first PKMN message (above).
- Not checked: after the A on "Player defeated ...!" ours keeps the text, without the cursor, until the lose text; this run gave the
  ROM its A later, so it does not show whether the ROM clears the window at that A.
