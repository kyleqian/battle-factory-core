# pokeemerald-factory run — agent guide

A native-TypeScript browser reproduction of **Pokémon Emerald's Battle
Factory**: the rental-draft + 7-battle challenge loop of the Battle Frontier
facility, matching the real game's pixels and behavior frame-by-frame. This
directory is one **run** — a
persistent, incrementally developed workspace nested inside the
pokeemerald-factory harness (`../../`). You work on top of what exists in
THIS run and leave it better and green. Several runs may exist in parallel;
never touch a sibling run.

## Running / resuming
Launch (or relaunch) a work session with **`./run-agent.sh`** from the run
root: it ensures the shared oracle service is up, then starts a Claude Code
agent pointed at this guide. Run it again any time — each session resumes
from `PROGRESS.md` where the last one left off. State lives in git +
`PROGRESS.md`, never in a running process. **By default the run is autonomous
and headless** (`claude -p --dangerously-skip-permissions`), hard-capped at
~3h (`--cap-hours N` to change); a session can end at that cap, so keep
committing and keep `PROGRESS.md` current so the next session resumes
cleanly. Use `./run-agent.sh --interactive` for a user-driven session with no
cap (`--help` lists the flags).

**Supervised alternative:** **`./run-supervisor.sh`** runs the two-level flow:
a supervisor plans one increment at a time, delegates it to a capped
disposable worker via `tools/run-subagent.sh`, and verifies the result between
steps. Use `./run-supervisor.sh --hybrid` for a Claude Fable supervisor
(interactive sessions are available through Claude Remote Control) routing
each step to an appropriate Codex Terra, Luna, or Sol worker (the supervisor
guides carry the routing rubric); it otherwise follows
the same supervised contract. The temporary `./run-supervisor.sh -D` profile
keeps the Claude Fable supervisor but fixes every worker at DeepSeek V4 Flash
through headless OpenCode. Configuration options live in the launchers
(`--help` lists them). If your prompt says you're a bounded worker session,
you are one of those workers: this guide applies to you in full, plus the step
brief in your prompt — and `SUPERVISOR.md` is *not* for you. **No agent
launches another full session**: the launchers refuse nested calls (via the
`POKEBENCH_ROLE` env var each one exports); only the supervisor delegates, and
only via `tools/run-subagent.sh`.

## Worker lanes

This is the stable ownership contract; current state remains in `PROGRESS.md`.

| Lane | Oracle | Owns | Must not own |
| --- | --- | --- | --- |
| **Main** | Battle Scene OFF | `BattleScenario`, round/battle core, facility progression, presentation seam | Another canonical Battle 2 turn/window after tick 33331 |
| **Side** | Battle Scene OFF | Source extraction, generated data, staged fixtures, file-disjoint tests | Shared controller interfaces or supervisor ledgers |
| **Animation** | Battle Scene ON | Move timelines, particles, sprites, presentation assets and traces | Damage, RNG, turn order, round advancement, or facility state |

- Main defines shared interfaces before another lane depends on them.
- Scene mode may change presentation timing, never logical outcomes or RNG.
- Animation's handoff is `ANIMATION_PROGRESS.md`; coverage and non-exclusive
  component tracks live in `ANIMATION_COVERAGE.json`. Level 50 moves come
  first, then Open-only, then the rest.
- A move is the acceptance unit; a source component is the implementation
  unit. `npm run animation:coverage` ranks dependencies from
  `battle-animation-components.json`. Pick a bounded component track, prove
  one representative, then batch-check its siblings. Shared components do not
  waive each move's dense oracle acceptance.
- Add side/species variants only when source or oracle evidence shows a
  dependency.
- The supervisor/solo launcher owns oracle lifecycle; workers only validate
  their selected profile and never start or stop a shared oracle.
- Side and animation use separate worktrees and do not edit `PROGRESS.md` or
  `ISSUES.md`; animation owns its two animation ledgers, and the supervisor
  verifies and merges worktrees one at a time.
- Parallel capacity is optional: launch only bounded, independent work.

## Start-of-session protocol (do this first, every session)
1. Read **`PROGRESS.md`** — the top entry is the current state and the next
   action. This is the source of truth for "where are we."
2. Read **`ROADMAP.md`** — the fixed mission brief up top, then the ordered
   stages and their oracle acceptance criteria (authored by this run's
   supervisor on iteration 0 — until then it says PLAN PENDING).
3. Skim **`ISSUES.md`** — the standing backlog of known-open bugs/debts you can pick from.
4. Animation workers also read **`ANIMATION_PROGRESS.md`** and run
   `npm run animation:coverage`.
5. Confirm the baseline is green: `npm test` and `npm run build` pass, and
   `bin/oracle info` answers. If not, fixing that is the next action.

## Commit often & survive interruption (important)
You are one of a series of short-lived agents. **You can be stopped at any moment.**
The only things the next agent inherits are the repo's committed history and the
top entry of `PROGRESS.md` — uncommitted work is lost work.

- **Commit after every green step** — a passing test, a working extractor, a
  behavior verified against the oracle. Many small commits, not one big one. Never
  sit on a large uncommitted change.
- Keep the tree green at each commit (`npm test` + `npm run build` pass) so *every*
  commit is a safe resume point. Say in the message what changed and how you
  verified it.
- **Keep `PROGRESS.md` current:** update its top entry whenever you finish a
  meaningful chunk, and *always* before you stop — State / Did / Next / Notes, with
  oracle-diff numbers — so a fresh agent can resume from that entry alone. Tick
  finished items in `ROADMAP.md`. **Keep the ledger lean:** entries stay short
  (a screenful max — headline numbers and verdicts, not a re-narration of the
  commit message), and only the ~3 most recent live here; move older ones to
  `PROGRESS-archive.md` (git keeps the full history regardless). The top entry
  is the only load-bearing one.
- **Keep `ISSUES.md` pruned:** when you fix an entry, **delete it** (or trim a
  partial fix to its still-open remainder) in the same docs commit that records
  the fix in `PROGRESS.md` — never leave it marked CLOSED/FIXED in place. Git
  keeps every removed entry's forensic history; issue numbers are never reused.
- Running low on room? Stop at a green commit and leave `PROGRESS.md` pointing at
  the exact next action. Don't start something you can't land and commit.
- **Flag papercuts** (dev-loop friction, not game bugs — see `PAPERCUTS.md`'s
  litmus): if a tooling/workflow annoyance cost you time this session, or you
  worked around a known one, say so in one line of your final report
  (`PAPERCUT: <what>, ~<minutes lost>`). Supervised workers never edit
  `PAPERCUTS.md` themselves; solo `run-agent.sh` sessions append/bump it
  directly.

## Tests (two tiers)
- **Tier 1 — `tests/*.test.ts` (vitest), the `npm test` suite.** Pure engine
  logic through the public API, asserting **state, not pixels**. Deterministic
  and hermetic — **no oracle, no emulator, no network** — so the suite stays
  fast and green. Colocate in `tests/`, name `<area>.test.ts`, import from
  `../src/...` with the `.ts` extension.
- **Tier 2 — `tools/compare/` (the oracle comparison aid).** Pixel/behavior
  parity against the real game over the oracle HTTP service. It is **not**
  part of `npm test`; run it manually/densely while building.
- **When you fix or add pure engine logic, pin it with a Tier-1 test** — reserve
  Tier 2 for parity that genuinely needs the emulator or exact pixels.
- **Typecheck with `npm run typecheck`, never bare `tsc`/`npx tsc --noEmit`.**
  Typechecking this project peaks at ~4.5 GB — over Node's 4 GB default heap —
  so a bare invocation dies with a confusing out-of-memory crash. The script
  (like `npm run build`) sets `--max-old-space-size=8192`. Most of that heap is
  the ~46 MB of generated JSON under `src/` that `resolveJsonModule` types
  literally; if the peak ever approaches the ceiling again, the cheapest relief
  is moving test-only fixtures out of the `src` type graph (measured: the three
  largest, ~9.5 MB, are worth ~650 MB).
- **Mid-step sanity checks: `npm run test:smoke`** (~25 s) runs a curated
  subset — the frontier/census ratchets, kernel decision boundary, a full
  kernel turn, the round controller, and `battleScene` — instead of the full
  ~5-7 min suite. It never substitutes for the full `npm test` a finish
  requirement or acceptance demands.
- **Two ratchets in `tests/executableFrontierRatchet.test.ts` will fail your
  step deliberately.** (1) No production module may import a canonical
  recording (`src/data/gen/*-{dump,probe,watch,boundaries}.json`) — derive
  behaviour from ported source instead; the four existing imports are tracked
  debt (ISSUES #41) and the allowlist only shrinks. (2) Per-module
  `unsupported-branch` barrier counts are pinned — adding a barrier is allowed
  but must be deliberate and named in your final message. Neither is a lint
  you should route around; if a pin genuinely must move, move it and say why.

## The oracle is ground truth
The oracle is the source-built Pokémon Emerald ROM running headless in mGBA
behind local HTTP services shared by all runs of this harness. The main and
side lanes use **Battle Scene OFF** at `http://127.0.0.1:8014`; the animation
lane and legacy traces use **Battle Scene ON** at
`http://127.0.0.1:8012`. Every trace replays from its profile's canonical
snapshot — see `bin/oracle info` for the selected main contract, or pass
`--profile battle-scene-on` for the animation contract.

```sh
bin/oracle info                 # main Battle Scene OFF contract
bin/oracle --profile battle-scene-on info
bin/oracle example > t.json     # example trace
bin/oracle run t.json -o ref/   # run a trace; writes PNG captures + manifest
bin/oracle lab tools/battle-lab/factory-varied.json -o ref-lab/
bin/oracle symbols gMain        # linker-map symbol addresses (RAM inspection aid)
```

Query it constantly with short, targeted traces to discover collision, timing,
NPC movement, dialogue, and exact pixels. Compare its PNGs against your app via
`npm run compare -- <trace.json>` once the roadmap's first stage wires `tools/compare/appTrace.ts`
to your engine. A unique trace filename works as shorthand. Compare whole
windows, not just endpoint frames. **Gotcha:**
the oracle captures *only the final frame* unless your trace's `captureFrames`
lists the frames you want — request every frame you intend to compare, or
you'll fool yourself by fitting a single endpoint. For investigation, the
`npm run compare` command (not `bin/oracle`) accepts `--capture-range START:END`
to replace the trace's capture list and `--summary` to print only mismatches
plus the final result.

For battle mechanics, use the semantic battle lab documented in
`tools/battle-lab/README.md` and `../../oracle/BATTLE_LAB.md`. `factoryLegal`
accepts legal trainer/set IDs and lets the ROM build a real Factory matchup.
`mechanicLab`'s preferred contract is `overrides.parties`: build **three
complete legal Pokémon per side** (species, level, nature, six IVs, six EVs,
moves, PP Ups, item, `abilitySlot`, friendship, gender, shiny, optional exact
personality) before `CB2_InitBattle`, so the stock ROM derives types, ability,
stats, HP, and PP and runs entry hooks (Intimidate, Drought, Trace…) at their
real time. Benched records survive, so switching and switch-in hooks are
testable; giving all four opponent slots the same move constrains the Factory
AI to one legal choice without injecting a decision. The legacy
`overrides.battlers` active-loadout form is for old traces only, is mutually
exclusive with `overrides.parties`, and does **not** replay missed entry hooks.
Neither mode may inject transient battle state (HP, status, stages, weather,
side conditions, outcomes) — stage those as real moves. In both modes, the
nested trace is normal controller input and the stock ROM—not the staging
API—calculates every outcome.

Run mGBA-backed Python probes through
`python3 tools/run-mgba-probe.py <fresh-output.json> -- <probe command>`.
It captures emulator log spew and accepts the known teardown SIGSEGV only when
the newly written output parses as JSON.

New compare traces set `"oracleProfile": "battle-scene-off"` or
`"battle-scene-on"` explicitly. Historical traces without that field remain
ON-profile traces so their established frame contract does not silently
change. The selected worker lane exports both named URLs and makes
`POKEBENCH_ORACLE_URL` point at its own profile.

**Oracle specifics worth knowing**
- Screen is **240×160**; buttons are `A B SELECT START RIGHT LEFT UP DOWN R L`.
- `sha256` in captures is over the **raw RGB888 framebuffer**, not the PNG file.
- Colors are mGBA's 15→24-bit expansion — match your renderer to the oracle's
  actual PNG output (sample it; don't assume a `<<3` expansion is right).
- The service serializes trace runs; long traces (20k frames) take ~10-15s.

## Reference material (read-only, dev-time only)
- `reference/pokeemerald/` — the pinned pret/pokeemerald source + built
  `pokeemerald.gba` + `pokeemerald.map` + `pokeemerald.elf`. Extract map
  layouts, tilesets, collision, object events, and scripts from here — for
  the Battle Factory start at `src/battle_factory.c` (rental generation,
  swaps, opponent styles), `src/battle_factory_screen.c` (draft/swap UI),
  `src/data/battle_frontier/` (rental mon + frontier trainer data),
  `data/maps/BattleFrontier_Factory*/`, and the core battle engine under
  `src/battle_*.c` + `data/battle_scripts_1.s`.
  This is the cheap half of the work — it's literate C and JSON.
- Extraction happens at **dev time** into `src/data/gen/` and `src/assets/gen/`.
  The production build must stay self-contained: **never bundle or load the ROM,
  emulator, oracle, or `reference/` at runtime.**

## On-disk prerequisites (gitignored — must exist to run)
- `reference/` (symlink into the harness's vendor checkout) and
  `node_modules/`. If missing after a fresh clone: re-run
  `../../initialize-run.sh --relink <this-run>` or `npm install`.

## App contract (keep these true)
- One `data-testid="game-surface"` element; renders at exactly **240×160** CSS
  px under `?pokebench=1`, scaled for normal play otherwise.
- Controls: arrows + WASD to move, Enter = Start, Shift = Select, Z = A,
  X/Esc = B, Q = L, E = R.
- `window.__POKEBENCH__ = { reset(), advance(segments) }` under `?pokebench=1`,
  deterministic and synchronous.
- `npm run dev` opens a playable demo; no console errors. `npm run build` and
  `npm test` must pass.

## Working style
- Output-oriented: match the oracle's behavior and pixels for arbitrary traces.
- Work the roadmap top-down; land one stage's acceptance criteria before moving on.
- The engine architecture is yours to choose — but keep it testable (pure
  tick/render split), keep the test ABI honest, and pin every pure-logic fix
  with a Tier-1 test.
- After the first-battle vertical slice, prefer deterministic staged battle
  scenarios, controlled seeds, source-derived state, and short targeted oracle
  windows. Repeated Battles 2–7 are controller/data coverage, not seven
  canonical input replays.
- Never add another battle-number/turn-number/absolute-tick rendering branch to
  extend the retired Battle 2 march. Generalize the mechanism or leave a
  bounded evidence checkpoint.
