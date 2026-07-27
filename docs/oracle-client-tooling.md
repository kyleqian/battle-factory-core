# Oracle client tooling

These commands improve the local development loop without changing or
restarting the shared, intentionally serialized Oracle services.

## Quiet capture output

`bin/oracle run` and `bin/oracle lab` accept `--quiet` (`-q`). Captures and
`manifest.json` are still written normally; only the full manifest on stdout
is suppressed.

```sh
bin/oracle run trace.json -o /tmp/oracle-capture --quiet
```

## Safe mGBA probes

Run direct mGBA-backed probes through `tools/run-mgba-probe.py`. A bare
`python`, `python3`, or relative `.py` probe is automatically routed through
the harness's `vendor/mgba-venv` interpreter. An explicit executable remains
untouched, and `POKEBENCH_MGBA_PYTHON` can override auto-detection.

The wrapper accepts the known native-binding teardown SIGSEGV only when the
requested output path was fresh and now contains valid JSON. Missing or invalid
JSON is always a failure.

## Serialized comparison batches

Run several ordinary comparisons without racing on
`tools/compare/out/latest`:

```sh
npm run compare:batch -- anchor draft-menu summary-info-onix
```

The batch runner:

- resolves trace shorthand before starting;
- runs exactly one comparison child at a time;
- gives every trace its own indexed output directory;
- writes `batch.json` before and after every attempt;
- continues after mismatches and exits nonzero if any trace failed.

It prints the unique batch output root at startup. Resume an interrupted batch
from that directory:

```sh
npm run compare:batch -- --resume tools/compare/out/batch-...
```

Passed entries are skipped. Failed, interrupted (`running`), and pending
entries are attempted again. Output is compact by default; pass `--verbose`
on the initial or resumed command for per-frame comparison lines.

For the frame/input numbering shared by the Oracle and app comparator, see
`docs/oracle-frame-semantics.md`.
