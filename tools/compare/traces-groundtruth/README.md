# Ground-truth traces (not parity fixtures)

Traces here are **oracle ground truth for stages the engine doesn't
implement yet**, committed so future sessions don't have to re-derive
timings from scratch. Unlike `tools/compare/traces/`, these are **not**
runnable through `npm run compare`'s parity expectation — there is no
engine code to compare against yet for the frames they cover. Use
`bin/oracle run tools/compare/traces-groundtruth/<name>.json -o <dir>`
to regenerate the reference PNGs directly from the oracle.
