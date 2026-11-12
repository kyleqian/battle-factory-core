# Bulk real-ROM replay on the Mac (top layer)

Whole census battles are played by the engine and replayed on the ROM; HP of both sides, `gRngValue` and the last moves are
compared after every turn (`workspace/docs/aud243d-rom-driver.md`). This folder runs that in bulk and sorts the mismatches.
Decision and lists: `workspace/docs/cax31-session-handoff.md` item 0d and `workspace/docs/gameplay-parity-audit-2026-11-12.md`.

Run everything with `workspace/` as the working directory. Nothing here edits the repo; all output goes to `REPLAY_OUT`.

```
export REPLAY_OUT=/abs/path/outside/the/repo/batch
# 1. drive new seeds (12 lanes: about 1,000 seeds in 34 minutes on the 16-core Mac). Launch detached for long batches:
nohup sh -c 'seq 1161 2160 | xargs -P 12 -n 1 ../tools/replay-batch/chain.sh' > "$REPLAY_OUT.log" 2>&1 < /dev/null &
# 2. per-turn events for the mismatched seeds (cards.py prints nothing for matches; list the mismatches first)
python3 ../tools/replay-batch/cards.py "$REPLAY_OUT" "$REPLAY_OUT/ev" "$REPLAY_OUT/cards.json"   # first pass: classes only
#    then: for each mismatched seed  ../tools/replay-batch/ev.sh SEED   (xargs -P 10), and run cards.py again
# 3. signatures, crossed with a re-drive of the mismatched seeds on a newer tree (RERUN_DIR may equal REPLAY_OUT)
python3 ../tools/replay-batch/tags.py "$REPLAY_OUT/cards.json" RERUN_DIR "$REPLAY_OUT/tagged.json"
```

Notes:
- A seed is a match when `engineError` is null, `divergence` is null, `matched == engineStates` and the drive stop is `outcome`.
- `rc=12` in `done.txt` is a Frontier Brain battle (`trainerId` 1022): the lab cannot stage it yet.
- macOS `xargs -I` fails over 255 bytes; use `-n 1` with a script. A tracked background shell job is cut at about 10 minutes; use `nohup`.
- The batch reads the engine from the working tree. Do not pull or switch branches while it runs.
- A signature (tags.py) names what the diverging turn contains. It is a lead, not a proven cause.
- Highest seed driven so far: 1160 (2026-11-12).
