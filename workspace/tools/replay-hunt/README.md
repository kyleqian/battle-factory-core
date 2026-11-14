# Rare-rule hunter (rrh1)

Finds a lab seed on which a stage design's `cover` code runs in the engine battle, then drives that seed on the ROM.
All commands run with cwd = `workspace/`; outputs go under `.integration/evidence/rrh1/` (ignored by git).

- `prehunt.py STAGE.json OUTDIR FIRST_SEED COUNT`: per lab seed, `soundCensusRomReplay.ts request --stage`, the lab setup
  (`soundEventProbe.py ... --setup-out`) and the engine replay under `NODE_V8_COVERAGE`; `romReplayCoverage.count_at`
  checks each `cover` marker (and the `expect` tally rows). Only a seed that ran the code goes on to
  `tools/audio/romReplayWide.sh --stage` (the ROM drive). Stops at the first seed whose drive matches and has the rows:
  `OUTDIR/found.json` is that stage file (with the seed set). `HUNT-END` ends the log.
- `huntq.py JOBS GLOB...`: prehunt for many stage files at once, JOBS at a time (at most 2 on the shared box).
- Run under `nice -n 19`; the scripts already nice their children. Never run more than two ROM drives at once.
- Format of a stage file: `docs/parity-mac/staged-battles.md`; the covered ones: `docs/parity-mac/stages/coverage/`.

## rrh2 changes

- Each `cover` entry is judged on its own marker: the key is `ran:<index>:<file>:<text[at:at+30]>`, so two entries with the same label no longer overwrite each other (rrh1: R012, R034, R045).
- `designcheck.py STAGE...` (run by `prehunt.py` and so by `huntq.py`) refuses a design before any seed: `replacements` that repeat, name more than two slots, or name the lead 0 with no switch in the script; a `cover` snippet that does not occur exactly once; a `cover` marker whose line is an error `throw`.
- `prehunt.py` stops after 3 seeds whose engine error is `... is not legal` (a script that names an unoffered slot): `DESIGN-ERROR`.
- `huntq.py --max-seeds N` caps seeds per stage; `--out DIR` (default `.integration/evidence/rrh2`).
