# CAX31 main-session handoff — 2026-10-13

The user requested: commit, push, and start the remote session. Run the normal
main supervisor on CAX31's `master` checkout at
`/srv/pokebench/pokeemerald-factory-core/workspace`, with Opus 5.5 supervising
Sonnet 5.5 workers, headless in tmux, capped at 10 hours. The previous Mac
session stopped at its cap; keep it stopped. The launch checkpoint and the
two refs below are backed up to GitHub. This session commits locally; it does
not push automatically or enable recurring timers.

## First work: verify and fold saved workers

These branches are committed and clean, but not yet merged into main:

1. `worker/side-20261013-160913` at `09589b431`: enc160, locked + Encored
   battlers follow the source's locked `HandleAction_UseMove` arm without an
   extra retarget RNG draw (#172). Read `docs/enc160-locked-encore.md` on that
   branch; independently verify its ROM receipts and affected kernel tests.
2. `worker/integration-20261013-163536` at `ca658cd6f`: plr162, Scene OFF
   forced player switch-in healthbox/print timing. Read
   `docs/plr162-player-forced-send-in.md` on that branch; independently verify
   representative dense ROM windows and the presentation-only contract.
   Its Mac full-suite receipt is 13,881 passed / 0 failed, plus build,
   448 smoke checks, 641 differential captures and 20 soak seeds.

The branches and their committed receipts/tools are imported into this repo.
Create verification worktrees if needed; let existing launcher helpers seed
reference/node/WASM prerequisites. Verify and fold one result at a time under
`ANIMATION_VERIFICATION.md`; validate the resulting union with the required
full suite/build and gameplay checks. Update `PROGRESS.md`, `ISSUES.md` and
the integration ledger honestly. Retain both worker refs and fresh evidence.
Then continue ROADMAP's Factory finish-up: Transform's live body, Substitute
HP timing, send-in/back-animation variants, Focus Punch edge cases, charge/
used-message handoffs, Wish/Baton Pass timing and other evidenced residuals.
Audio remains deferred. Preserve the existing D3/D4 authorizations.

## Host baseline and limits

`docs/cax31-arm-runner.md` records the fresh ARM baseline: native oracle ON/OFF
hashes match the Mac; stock-ROM R1 battle/RNG receipt matches byte for byte;
all 9,550 native generated reference assets match. Typecheck, smoke, Rust/WASM,
production build and 13,878 unique non-skipped TypeScript tests passed across
the full suite and affected-file retest on the launch's unchanged game code.
Receipts live in `.integration/validation/cax31-arm-20261013/`.

Source `/etc/pokebench-runner.env`. Use two Vitest workers, four Cargo/build
jobs, one worker at a time, and serialize full tests/typecheck/build/census.
The full suite takes about 45 minutes and peaks near 14 GiB RAM plus 4 GiB
swap; the machine has 16 GiB RAM and an 8 GiB swap guard. Do not override these
limits with Mac defaults or `--parallel 10` soak runs. Reuse valid unchanged
baseline receipts under the stage policy; run new gates for production changes.

Fresh Claude Max login is complete. Claude Code 2.1.280 is pinned; both exact
model names returned successful no-tools inference probes. Oracle services
remain localhost-only at ON 8012 / OFF 8014. Do not copy provider credentials,
modify the pinned ROM/ELF/map, or provision additional infrastructure.

Commit a clean handoff before the cap. Preserve logs and refs on this VM;
import them to the Mac before resuming its writer.
