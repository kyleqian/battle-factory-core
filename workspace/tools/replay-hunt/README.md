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

## rrh3 changes

- `designcheck.py` also refuses a set id outside the challenge's range, a species twice on one side or on both sides, and a held item twice on one side (each makes the lab setup fail on every seed; rrh3 lost 3 minutes to a duplicate Lum Berry).
- `prehunt.py` prints `STALL-WARNING` when the engine battle hits the frame budget or has `PREHUNT_STALL_DECISIONS` (default 100) or more decisions (the ROM drive stops near 115 states), and when the ROM drive matched fewer states than the engine ran; `STALL-ABORT` after 3 stalled seeds. A ROM-side stop is not an engine difference.

## luckHunt (luck1)

`tools/replay-hunt/luckHunt.sh` hunts the luck-only rules without a person: it goes round and round over the designs in
`tools/replay-hunt/luck-designs/*.json` (`LUCK_HUNT_DESIGNS` can name other globs), one fresh lab seed per design per round. Per seed it runs
`prehunt.py DESIGN WORK SEED 1` (engine first; the ROM drive only when a `cover` marker ran), and on a marker hit the ROM drive
(`romReplayWide.sh --stage`) is recorded as match, stopped (the drive ended before a real difference; not an engine difference) or differ.
A design that has matched or differed is done and leaves the round; a design with 6 lab or engine failures in a row is disabled.
A design whose rule ids all have a stage file in `docs/parity-mac/stages/coverage/` (`R<id>-*.json`, the promoted hits, guarded by the nightly replay)
is not hunted: it is logged once as `covered` in `hunt.log`, listed under "Designs skipped" in `summary.md` and in `summary.json` `coveredDesigns`.
(Promote a hit's stage file and the next day's seeds go to the rules still open.) Never mind the file names of the designs: the check is the rule id.
It is started from `workspace/` (the day job does this under `nice -n 19`) and needs no git: it writes nothing outside `LUCK_HUNT_OUT`.

| env | meaning |
|---|---|
| `LUCK_HUNT_OUT` | required, absolute: every file goes here (also `TMPDIR` of the children) |
| `LUCK_HUNT_DEADLINE_EPOCH` | no new seed starts after it; running seeds finish (a seed takes 15 s to about 2 min, with the drive up to 5); exit 0 (default: start + 1 hour) |
| `LUCK_HUNT_JOBS` | seeds at a time (default 3); at most 2 ROM drives at once however many jobs (flock slots in `OUT/locks`, `PREHUNT_DRIVE_SLOTS`) |
| `LUCK_HUNT_SEED_TIMEOUT` | seconds before one seed is killed (default 1500) |
| `LUCK_HUNT_DAY` | override the UTC day (`YYYYMMDD`), for tests |

Outputs in `LUCK_HUNT_OUT`: `summary.json` and `summary.md` (rewritten after every seed and at the end: per rule seeds tried, marker hits, ROM
match / differ / stopped, and `stageFilesReady`, the stage files to promote), `hits/<design>/<seed>/` (stage file with the seed set,
`rom.summary.json`, `prehunt.log`), `seeds.jsonl` (one line per seed), `hunt.log`, `logs/<design>.log`, `state.json` (the seed counter).
SIGTERM or SIGINT stops it cleanly with a valid summary. A ROM DIFFERENCE is listed in `summary.md` with its seed and stage file; do not fix
the engine from the hunter.

**Seed rule: a seed is never used on two days.** Seed = `1,000,000 + 20,000 * (UTC days since 2026-11-16) + k`, where `k` is a counter in
`OUT/state.json` (a restart with the same OUT continues it; a day gives at most 20,000 seeds). So each day has its own block, and the lab
seeds of the other hunts (below 1,000,000) are never reused. Do not pass a different OUT for the same day expecting the same seeds again:
use `LUCK_HUNT_DAY` only in tests.

Test (no ROM drive): `tools/replay-hunt/test-luckHunt.sh` (a deadline in the past exits 0 at once with a valid summary and no seed; a
deadline 15 s ahead ends within one seed's time; a design whose rule already has a coverage stage file is skipped and logged once, and a run with only
covered designs ends at once with no seed).

## luck5 changes

- Seven new designs in `luck-designs/` (R058 R073 R078 R079 R082 R096 R101): the player's Clefable 389 calls Metronome ten times against Shuckle 528 in challenge 7. One design per rule, as before; no weighting and no change to the env interface or the seed rule. R073 is now covered (`stages/coverage/R073-*.json`), so the hunter skips it.
- `PREHUNT_CALLS=1 prehunt.py ...` prints, per seed, the Metronome calls of the engine battle (`[player-side-flag, MOVE_NAME]`; `NONE` = a call that ended without a move). Use it to estimate a chance per seed.
- A shared-battle trial: write one stage whose `cover` lists the markers of every rule the battle reaches (`coverAny`) and run `prehunt.py` once; the hit's `ran:<i>` key names the rule.

## luck6 changes

- `makeLuck6.py` writes the luck6 designs (`python3 tools/replay-hunt/makeLuck6.py [OUTDIR]`; the files in `luck-designs/` are its output, markers read from `rule-coverage-c-rules.json`). Designs: R050 R051 R052 R053 (the AI's Clefable 389 against a passive Shuckle 528; one battle, four markers), R100 (the same AI Clefable against Golduck 418, Cloud Nine), R091 R063 R064 R099 (challenge 1: the player's Chansey 227 against Banette 237 / Wigglytuff 207 / Minun 187 / Wartortle 176). R051, R052 and R053 are covered (`stages/coverage/`) so the hunter skips them.
- Stall fix: every Clefable battle now ends with Salamence 753 playing Aerial Ace (slot 2) instead of Snorlax 826, because Aerial Ace never misses and so a foe's Double Team stack cannot hold the battle until the frame budget. The seven luck5 designs were patched the same way (0 stalls on the 17 seeds 920200-920216 where 3 had stalled; one stall in 14 for the AI-Clefable shape).
- Order: the round-robin is unchanged (one fresh seed per open design per round), so no design starves; the chances differ by about 10x (see `rule-coverage.md` "luck6"), the hunter does not weight them.

