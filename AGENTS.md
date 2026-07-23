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
steps. Configuration options live in the launchers (`--help` lists them). If
your prompt says you're a bounded worker session, you are
one of those workers: this guide applies to you in full, plus the step brief
in your prompt — and `SUPERVISOR.md` is *not* for you. **No agent launches
another full session**: the launchers refuse nested calls (via the
`POKEBENCH_ROLE` env var each one exports); only the supervisor delegates,
and only via `tools/run-subagent.sh`.

## Start-of-session protocol (do this first, every session)
1. Read **`PROGRESS.md`** — the top entry is the current state and the next
   action. This is the source of truth for "where are we."
2. Read **`ROADMAP.md`** — the fixed mission brief up top, then the ordered
   stages and their oracle acceptance criteria (authored by this run's
   supervisor on iteration 0 — until then it says PLAN PENDING).
3. Read **`WORKSTREAMS.md`** — it defines the main, side, and animation
   ownership boundaries and which oracle profile each uses.
4. Skim **`ISSUES.md`** — the standing backlog of known-open bugs/debts you can pick from.
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
bin/oracle symbols gMain        # linker-map symbol addresses (RAM inspection aid)
```

Query it constantly with short, targeted traces to discover collision, timing,
NPC movement, dialogue, and exact pixels. Compare its PNGs against your app via
`npm run compare -- <trace.json>` once the roadmap's first stage wires `tools/compare/appTrace.ts`
to your engine. Compare whole windows, not just endpoint frames. **Gotcha:**
the oracle captures *only the final frame* unless your trace's `captureFrames`
lists the frames you want — request every frame you intend to compare, or
you'll fool yourself by fitting a single endpoint.

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
