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
