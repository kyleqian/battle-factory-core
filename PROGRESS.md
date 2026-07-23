# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 319 — S8 Factory trainer schedule/RNG port: **GREEN — source selection live**

- **State:** the generic controller now has a source-exact, policy-driven
  Factory trainer selection strategy for battle indexes **0–6**. Tier-1 is
  **1152/1152** and build passes (**5.531 MB**); canonical pixels remain
  unchanged and intentionally unwired.
- **Did:** ported `GetRandomScaledFrontierTrainerId` plus
  `GenerateOpponentMons`' trainer retry/history loop using
  `factory-round-policy.json`: streak/7 challenge rows, battle-6 hard range,
  >7 clamp, one Gen-3 `Random()` per attempt, all-prior duplicate rejection,
  and the omitted final save-history write. Added an explicit RNG port and
  per-draw ledger, deterministic seven-trainer schedule/final-RNG tests, and
  live scenario/controller selection while preserving fixture injection.
- **Next:** stage one representative Battle 2 turn through the generic
  OFF-profile presentation seam. Unique swap-YES/loss/round-summary UI and
  later opponent-mon/rental rejection generation remain open; do not resume
  tick 33332/SAND ATTACK.
- **Notes:** commits `14e9f39`, `13652f5`; forced retries pin draw count/final
  RNG, source history stays six entries after the seventh selection, and
  presentation acknowledgements do not consume selection RNG. No oracle,
  renderer, `BUGFIX` IV-branch, or opponent-party generation work was done.

---
## 318 — S8 generic round/presentation core: **GREEN — architecture foundation landed**

- **State:** a pure scenario-driven controller now covers battle indexes
  **0–6**; the source-exact Factory round policy is also mechanically
  extracted. Tier-1 is **1146/1146** and build passes (**5.525 MB**).
  Canonical pixel behavior remains unchanged and intentionally unwired.
- **Did:** added deterministic no-repeat opponent selection, party HP/status
  healing, win/loss/swap transitions, seventh-win completion, and typed
  presentation commands with idempotent completion acknowledgements that
  cannot mutate rules/RNG. `createInitialState({ battleScenario })` exposes
  opt-in fixtures while its default remains `null`. Added reproducible
  `factory-round-policy.json` plus a cited source dossier covering trainer/
  rental rejection rules, healing, swap mutation, and terminal counters.
  Independently, the ON animation lane closed ISSUES #33 by modeling the
  one-render OBJ-VRAM lead at Murkrow's two frame-transfer boundaries.
- **Next:** wire the extracted trainer ranges/retry policy and an explicit RNG
  port into scenario generation, then stage one OFF-profile Battle 2 turn
  through the seam. Unique swap-YES/loss/round-summary UI remains open. Do not
  resume the canonical tick-33332 march.
- **Notes:** commits `3aee24e`, `bae76ea`; tests cover seven sequential wins,
  accepted/declined swaps, inter-battle healing, deterministic no-repeat
  inputs, loss at every index, invalid transitions, and presentation
  completion/RNG isolation. Source policy extraction is `2f10f68` (merged);
  it deliberately leaves retry-draw counts and the pinned `BUGFIX` IV branch
  as explicit implementation inputs. ON regressions are `turn13-switchin.json`
  **242/242** and `turn14-fly-miss.json` **185/185**; the direct seven-frame
  RAM/VRAM verifier is also 0 diff. No OFF oracle trace or renderer work was
  performed.

---
## 317 — User-directed Stage 8 reset: **READY — finite, staged completion**

- **State:** canonical Battle 2 remains exact through tick **33331** at
  `b5be9b6`; the baseline is **1128/1128** with build green (**5.522 MB**).
  S8 is now `[~]` under a finite completion contract rather than an open-ended
  battle/turn replay.
- **Did:** retired 33332/SAND ATTACK as the next milestone; defined a generic
  seven-battle round core, unique swap/end UI, and one staged OFF-profile
  Battle 2 portability proof as the only S8 gates. Added dual oracle routing
  and main/side/animation worker-lane guidance.
- **Next:** first land the `BattleScenario`/presentation seam and generic
  round-controller state model with Tier-1 tests. Then stage a representative
  Battle 2 turn under Battle Scene OFF. Do **not** resume the canonical
  turn-by-turn ladder.
- **Notes:** main + side use `battle-scene-off` (8014); optional animation work
  uses `battle-scene-on` (8012). Historical traces default ON; every new trace
  names its profile. Both profiles pass harness smoke; `turn1-cloneanim.json`
  confirms their battle presentation diverges while the anchor SHA is shared.
  `WORKSTREAMS.md` owns lane/file boundaries.
