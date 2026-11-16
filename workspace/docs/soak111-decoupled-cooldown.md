# soak111: the soak RandomPlayer's press draws no longer re-roll its decisions

S10A infrastructure for ISSUES #166 slice (c) (sc106, `docs/sc106-stats-change-command.md` §3) and the banked Scene OFF pause
patch (off108). Tools, fixtures and tests only; no `src/` change.

## 1. Results

- **Change** (`tools/soak/randomRoundSoakDriver.ts`, header + `RandomPlayer`): two seeded streams per run. DECISIONS keep
  `new Rng(seed)` (salt 0 is bit-identical to the old single stream). PRESS draws come from `new Rng(seed, SOAK_PRESS_RNG_SALT)`
  (`0x50ac0111`, derived by `rng.derive(salt)`, which draws nothing from the decision stream). The press draws are: every
  `press()` cooldown gap, the message-advance mash's 6% B roll, and the terminal's random A/B/UP/DOWN buttons. Three surfaces also
  stopped spending decision draws on presses the engine drops (section 2). CLI flags, policies and output format are unchanged.
- **Decoupling proof** (`tools/integration/fixtures/soak111/decoupling-receipt.json`, `sh tools/integration/soak111Run.sh <fresh>`
  prints **ALL SAME**). Setup: full policy, first round, seeds 0..15 and 27, run on this tree and on this tree + off108
  (`patch -p1` from the repo top). Result: **17 / 17 seeds have identical decision logs, canonical logs and gameplay** (outcome,
  endState, battle, turn). Frames moved on all 17. The control (coupled base `356f2eefc` with and without off108) gives
  **0 / 17 identical** decision logs and 0 / 17 identical gameplay: that is the bug this step removes.
- **Pins moved** (`tests/randomRoundSoak.test.ts`; nothing else moved), listed in section 3. The 4 pins that were red on sc106 are
  green again. The ISSUES #89 pin moved from seed 27 to the natural **seed 226**, and it now observes the halt directly.
- **ISSUES #89 search** (section 4): 237 full-policy seeds scanned, 15 natural Baton Pass openpartyscreen halts found. 14 of them
  land in the chained round (the 9,000-frame post-decision grace window). **Seed 226** is the only one whose halt lands inside the
  first round itself (battle 4, LEDIAN, frame 54,509). The run then plays to roundLost at 63,019 with no thrown error.
- **Gates**: listed in section 5.

## 2. What else had to change (found by the proof, not guessed)

The first proof run (cooldown gaps + mash roll moved only) still diverged on **17 / 17** seeds. In every case the first divergence
was at the forced party selector. Each fix below came from the next run's first divergent line:

| Surface | Coupling | Fix (behaviour kept) |
|---|---|---|
| forced party selector (`onForcedParty`) | `advancePartySelect` drops every key until `elapsed + 1 >= PARTY_LIST_INPUT_ELAPSED`. Each dropped press re-rolled the 0.3 "A on fainted slot" draw, and the number of presses that fell into the fade depended on timing | Wait out the entry fade (`NO_BUTTONS`). Those presses were always engine no-ops |
| swap screen random buttons (`onFactorySwap`) | `handleFactorySwapInput` drops keys while `!inputReady`, and the summary detour drops keys during its transitions. Each press there is a decision draw | Press only when the press can land: `controller.inputReady`, or the open summary with no transition |
| terminal random buttons (`onTerminal`) | Pages and the menu drop keys until input-ready, so how many rolls a walk uses depends on timing | Moved to the press stream. Every RECORD answer (YES / NO / cancel) enters the same EndRecordBattle farewell (stub-only record), so these rolls never feed a later decision or gameplay |
| postwin menus (continuation, RECORD/RETIRE question, swap offer) | A fresh roll on every press attempt, including presses dropped before the menu was ready | `stickyPostwinRoll`: one roll per (menu, round, battle, turn, cursor position), re-drawn only after the cursor moves. This is the old per-press policy counted over presses that land |

How the logs are compared (`tools/integration/soak111Decoupling.ts`):

- Notes are cut at the run's reported first-round snapshot frame. The later grace-window tail is frame-defined by construction.
- "Mash" notes are the press-stream notes: `pressAdvance` labels and `terminal: <button>`. The **decision log** drops them, drops
  the frame, and collapses consecutive identical notes. A repeated identical note is a re-press of an input that was already
  decided, after its first press was dropped (for example `swap offer: YES` twice). The receipt also keeps the **exact
  uncollapsed** decision log: it is identical on 14 / 17 seeds. On seeds 2, 6 and 11 the only differences are such duplicated
  confirm notes, and their collapsed logs and gameplay are identical.
- The **canonical log** keeps every note, with mash runs collapsed to one line and terminal buttons shown as `terminal`.

## 3. Pins moved (before = sc106 base `356f2eefc` expectation, after = this tree)

| Pin | Before | After | Why |
|---|---|---|---|
| seven-win seed 21 (strong-route) | frames 37,260, renderCalls 2,671 (sc106 itself produced 37,499 / 2,679) | **37,569 / 2,679**, same 7 wins, turn 3 | frames only: press stream + the forced-selector wait |
| M-B (c) full seed 0 | 11,955, b1 t20 (sc106: 14,186 / t24) | **16,321, b1 t30**, roundLost | new decision trajectory (it is now presentation-independent) |
| M-B (c) full seed 1 | 14,345, b1 t29 (sc106: 12,272 / t23) | **25,321, b2 t9**, maxBattleDepth 1, roundLost | same |
| M-B (c) vanilla seed 0 / 1 | 8,499 / 8,550, t16 (sc106: 8,625 / 8,661) | **8,683 / 8,670**, t16 | frames only (vanilla decisions are fixed) |
| ISSUES #89 | seed 27, `frames > 30,798`, roundLost | **seed 226**: Baton Pass commit **and** the live-outgoing forced selector observed, `frames > haltFrame`, roundLost, battle 4 | see section 4 |

The ISSUES #99 "YES and NO across a fixed seed set" pin went red with the first, cooldown-only change. It is green again with the
final driver, unchanged.

Seed 27's history: on `bddc3d69c` (pre-sc106) seed 27 already committed Baton Pass **zero** times and was in postwin at frame
30,798 (measured with `soak111BatonPassSearch.ts` on an archive). Its `frames > 30,798` bound was therefore only a halt-free
assertion before sc106 existed. The test comment records this.

## 4. ISSUES #89 natural-seed search

(The scanner was removed by cln237 and restored as `tools/soak/batonPassSearch.ts` (`--seeds A:B --parallel N`, the pin's own options by default; usage in its header). The command below is the original form.)

Command: `node --experimental-strip-types --no-warnings tools/integration/soak111BatonPassSearch.ts --seeds=<lo>..<hi> --max-frames=200000 --stop-after=2 --out=<jsonl>`.
It ran as 8 nohup shards of 50 seeds over 0..399, and each shard stopped after 2 hits. Results are in
`tools/integration/fixtures/soak111/batonpass-search/s0..s7.jsonl`.

What counts as a hit: the player commits Baton Pass (move 226, through the coverage seam's `recordPlayerFightCommit`), and later
the forced party selector opens on a **still-living** outgoing slot. That is Baton Pass's own player-side openpartyscreen switch;
a faint-driven selector's outgoing slot has fainted. The tool observes through the observation-only `coverage.observe(state)`
seam and injects nothing.

| Shard | Seeds scanned | Hits (halt in first round) | Hits (halt in the chained round, inside the grace window) |
|---|---|---|---|
| s0 | 0..9 | none | 4, 9 |
| s1 | 50..65 | none | 50, 65 |
| s2 | 100..146 | none | 114, 146 |
| s3 | 150..178 | none | 162, 178 |
| s4 | 200..226 | **226** | 204 |
| s5 | 250..299 | none | none |
| s6 | 300..349 | none | 320 |
| s7 | 350..357 | none | 356, 357 |

Totals: 237 seeds, 15 hits. No seed threw and every run ended OK. The pin uses seed 226 because its halt lies before the reported
first-round snapshot, so `stopAtFirstRoundDecision`'s endState is the round that went through the halt.

## 5. Gates (code tested = `bb0e8b4cd`; later commits are docs only)

- `npx vitest run` over the 7 soak test files (randomRoundSoak, randomRoundSoakParallel, CombinedDraft, Coverage, CoverageDraft,
  CoverageFight, OracleStrength; 4 workers): **7 files / 109 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, two nohup shards run one after the other (4 workers):
  - shard 1: **814 files passed (22 skipped), 6,992 tests passed (119 skipped)**;
  - shard 2: **814 files passed (22 skipped), 6,406 tests passed (104 skipped)**. On sc106 this shard had 813 passed and 1 failed,
    with the 4 randomRoundSoak pins failing; it is now all green.
- `npm run build`: green.
- Soak gates:
  - `npm run soak -- --policy vanilla --seeds 0:20 --parallel 5`: **OK 20 / 20** (CRASH 0, HANG 0, all 20 `budget`), 605 s. I
    started the serial form and stopped it after seed 0 (OK, budget, 131.7 s), because 20 serial 600k-frame seeds (~44 min) would
    not fit the session cap. Seeds are independent `runSeed` calls, and tests/randomRoundSoakParallel.test.ts pins serial ==
    parallel.
  - `npm run soak -- --seeds 0:20 --parallel 3`: **OK 20 / 20** (CRASH 0, HANG 0, all 20 `budget`), 1,027 s.
  - `npm run soak -- --policy winning --vary-rng --first-round --start-carry 0 --seeds 0:30 --render-every 0 --parallel 2`:
    **OK 30 / 30** (CRASH 0, HANG 0, budget 0; 21 roundLost, 9 roundComplete), 25 s.
- `sh tools/integration/soak111Run.sh <fresh>` on the final tree: **ALL SAME**.
- `git diff --check`: clean.

## 6. Reproduction (from workspace/)

```
sh tools/integration/soak111Run.sh <fresh-out-dir-inside-the-repo>     # ~1 min; ALL SAME vs the committed receipt
node --experimental-strip-types --no-warnings tools/integration/soak111Decoupling.ts --policy=full --seeds=0..15,27 --logs-dir=<d> --out=<f.json>
node --experimental-strip-types --no-warnings tools/integration/soak111BatonPassSearch.ts --seeds=200..226 --max-frames=200000 --stop-after=2 --out=<f.jsonl>
npx vitest run tests/randomRoundSoak.test.ts tests/randomRoundSoakParallel.test.ts
```
