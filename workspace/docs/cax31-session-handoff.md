# CAX31 next-session handoff — 2026-10-23

The 2026-10-22/23 CAX31 session (Opus 5.5 supervisor, Sonnet 5.5 / Opus workers) ended cleanly; see the top PROGRESS.md entry.
Any further run needs a fresh user authorization. Continue on CAX31's `master` at `/srv/pokebench/pokeemerald-factory-core/workspace`
only if the user renews it; keep the Mac supervisor stopped while CAX31 writes, commit locally, no automatic push or timers.
Import the results (master + retained `worker/*` refs + `.integration/validation/sv-20261022/` + `.codex-logs/`) before a Mac writer resumes.

## Done this session (do not repeat)

lsd194 / lsd196 / rst197 (print floor drop, Leech Seed drain rows, second-stat rows, Rest pause), lsd198 / lsd199 (Scene ON drain
animation = Move_ABSORB body, 0 px), sst200 (second-stat ROM rows), fnt201 (faint script lead, 16 / 16 cases 0), hpb202 (health bar
Q24.8 port; Shedinja KO crash fixed), tl204 (zero-tail evidence). Each folded after supervisor gates on the exact code.
tl205 (Scene ON script tail for the tl204-measured moves): see the top PROGRESS.md entry for whether it was folded.

## Next work (in order)

1. tl205 is NOT on master. Start from `worker/integration-20261023-080938` (tl206 tip `ea0846220` = master + tl205 + the 13 test
   re-pins; census both scenes and typecheck green on its src, see PROGRESS). Run the full suite + build on that exact code (check
   liveWallMoveAdapters / tl204ZeroTailRows, not rerun by tl206), then fold. Then the remaining tl204 body-window residuals (Scary Face -14, Calm Mind -4, Light Screen +2,
   Charm / Fake Tears -1) and the other 14 zero-tail moves (docs/tl204-zero-tail-rows.md).
2. The Explosion-that-broke-a-Substitute faint (+135 lead in the fnt201 census, unmeasured): one ROM scenario.
3. msg175's open edges (Toxic -21 ON / -2 OFF, Roar OFF +17, Baton Pass OFF -66, Snore +10, the Rest-route Tackle HP anchor).
4. #146 non-MAGBY forced send-in visuals, player back send-out / intro visuals, transformed-battler effects, Castform / Substitute /
   species / history variants (ISSUES.md). Audio stays deferred.

Gate recipe that worked here (serialize heavy jobs; one worker beside them at most): typecheck; `lsd194Census.sh` both scenes with
`LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4` + `tools/integration/rst197CensusDelta.py`; `compare:differential` (3 traces); full suite under
`nohup` with an exit file (~47-66 min; diff reported files against `git ls-files` if a vitest fork dies); build; soaks at wind-down.
A supervisor verification checkout made with `git worktree add` needs the `reference` symlink, `node_modules` and
`artifacts/wasm/factory_wasm.wasm` (the launcher does this for worker worktrees).

## Headless execution discipline

`tools/run-claude-supervisor.py` owns the one original campaign deadline.
Never use Monitor, ScheduleWakeup or end your turn waiting for notifications.
Retain worker PIDs/logs and poll with bounded foreground calls. If a turn
accidentally ends, the controller waits for worker completion and resumes the
same conversation; it does not reset the clock or duplicate the worker.

State lives next to the raw log in `.controller.json`. Before a genuine final
exit, commit a clean handoff and write the JSON file named by
`POKEBENCH_SUPERVISOR_STOP_FILE`, with `session_id` from
`POKEBENCH_SUPERVISOR_SESSION_ID`, `status=complete|blocked|wind_down` and a
nonempty `reason`. This is not a waiting mechanism. A stop cannot leave active
workers or a dirty checkout; wind-down is accepted only in the last 20 minutes.
Usage limits/provider failures stop the controller without automatic retries.
Use one worker at a time on this 16 GiB machine. Budget validation before
launching more production work; do not dispatch a worker whose cap exceeds
remaining campaign time. Apply the normal scoped verification/fold policy and
leave a truthful committed handoff before the cap.

## Baseline and host budget

Master production src tree `d8fda5802` (tested on `f96e8e805`; later master commits through the wind-down are docs / tools / evidence
tests unless PROGRESS says tl205 folded). Supervisor gates on that src: typecheck, census both scenes attributed, differential 641 / 641,
full suite 1,690 files / 14,051 tests 0 failed, build; soak vanilla 0:20 20 / 20; varied-RNG winning carry 0 / 14 / 28 and winning-swap
carry 0 100 / 100 each. The 0:60 soak profiles were not run (~7.5 h each here). Evidence: `.integration/validation/sv-20261022/`.

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~48 minutes. Serialize typecheck, full
suite, build and census work; use retained PID/log/status files for long jobs
and keep polling in bounded calls. Do not kill/retry a job just because its
shell tool yielded. Read CAX31 `PAPERCUTS.md`; bound any soak fan-out to free
memory and collect every per-seed result. Use host path helpers and
`/srv/pokebench/vendor/mgba-venv/bin/python`, not Mac-specific paths.

Claude Code 2.1.280 and the Opus/Sonnet model defaults remain pinned. The
controller owns one deadline and resumes the same supervisor conversation.
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. Import the results before resuming a Mac writer.
