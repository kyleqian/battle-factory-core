# On hold by Kyle's word (2026-11-13): untested material of the sixth pass

Kept so nothing is lost when the Mac winds down. **None of this is tested or wired into anything.** No test, tool or
`stages/*.json` glob reads this folder. The work is on hold by Kyle's word (`STATUS.md`, "Stopped 2026-11-13").

- `designs/*.design.json`: 31 stage designs (11 of them, R001..R010 and R012, were hunted on the box on 2026-11-14 and moved to
  `../stages/coverage/`; the hunter is now `tools/replay-hunt/`, see `STATUS.md`, "Box hunt 2026-11-14 (rrh1)"; the rest below are
  as the Mac left them) for rules of the finer tally's (c) list (`../rule-coverage-c-rules.json`,
  R001..R110). Each is in the stage-file format (`../staged-battles.md`) plus `rules`, `cover` (the piece of engine code
  the rule is about), `chance` and `seeds` (the designer's guesses), and `onHold` (how many lab seeds were hunted
  before the stop). 27 were never hunted. R012 (64 seeds), R019 (20), R021 (5) and R026 (4) were hunted with no
  matching battle. For R021 the two engine errors were the design's own mistake (a replacement into a fainted slot),
  not the engine's. To use a design: check it, rename it to `.json`, and drive it with
  `tools/audio/romReplayWide.sh --stage` over several lab seeds. The 12 designs that matched the ROM are in
  `../stages/coverage/`.
- `designs/notes-g1..g4.json`: the designers' notes per group, including the rules they found no staging for (R029,
  R031, R033, R035, R040) and why. These reasons are a reading of the source, not checked.
- `designs/STAGE-BRIEF.md`: the brief the designs were written to.
- `hunter/prehunt.py`, `hunter/huntq.py`: the scratch hunter, as a file to read. Its paths are the Mac's scratch paths,
  so it does not run as it is. Per lab seed it does: `soundCensusRomReplay.ts request --stage`, the lab setup
  (`soundEventProbe.py ... --setup-out`), and the engine replay with `NODE_V8_COVERAGE`. Then
  `romReplayCoverage.count_at` checks the stage's `cover` markers. Only a seed whose engine battle ran the piece goes on
  to the full `romReplayWide.sh --stage` drive. `huntq.py` runs it for many stage files at once.
- `discovery2-793.json`: the record of discovery batch 2, stopped at 793 of 1,000 battles. Engine `b36f7b6c9`; the row
  format is that of `../../replay-batches/2026-11-13-fifth-pass.json`. 791 match, 2 reached a frame cap with no
  difference. Not added to any tally or coverage file.
