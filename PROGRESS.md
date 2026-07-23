# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 320 — S8 OFF turn portability seam: **GREEN — logic/staging checkpoint**

- **State:** the staged Battle-2 turn now resolves through a reusable logical
  event → relative Scene-OFF command → completion-ack queue. Tier-1 is
  **1156/1156** and build passes (**5.535 MB**). Pixel acceptance is not yet
  claimed.
- **Did:** added a data-driven two-action turn resolver, explicit RNG ledger,
  typed text/PP/HP/stat/turn-end/menu commands, paced OFF adapter, and staged
  next-input gate. Added dev-only named `appStage` compare metadata (stripped
  before oracle replay) and injected the source/RAM-pinned ONIX/KABUTO state
  immediately before confirm.
- **Next:** add the staged OFF renderer/timing profile, commit a short explicit
  OFF app trace only once every selected capture is exact, and verify
  confirm+407 input readiness. Do not extend the canonical ON tick ladder.
- **Notes:** logical result is PP **10→9 / 15→14**, KABUTO **91→63**, ONIX
  accuracy **6→5**, HP/status otherwise unchanged, with all 12 RNG values and
  final **3121225034** pinned. Early/out-of-order completion is rejected;
  1×/4× presentation pacing produces identical rules/RNG.

---
## 319 — S8 Factory trainer schedule/RNG port: **GREEN — source selection live**

- **State:** the generic controller now has a source-exact, policy-driven
  Factory trainer selection strategy for battle indexes **0–6**. Tier-1 is
  **1152/1152** and build passes (**5.531 MB**); canonical pixels remain
  unchanged and intentionally unwired. The staged Battle-2 OFF target is now
  banked through its next input-ready menu.
- **Did:** ported `GetRandomScaledFrontierTrainerId` plus
  `GenerateOpponentMons`' trainer retry/history loop using
  `factory-round-policy.json`: streak/7 challenge rows, battle-6 hard range,
  >7 clamp, one Gen-3 `Random()` per attempt, all-prior duplicate rejection,
  and the omitted final save-history write. Added an explicit RNG port and
  per-draw ledger, deterministic seven-trainer schedule/final-RNG tests, and
  live scenario/controller selection while preserving fixture injection.
  Added an explicit OFF-profile oracle fixture and RAM ledger for ONIX ROCK
  SLIDE / KABUTO SAND ATTACK from confirm through the next menu.
- **Next:** stage one representative Battle 2 turn through the generic
  OFF-profile presentation seam. Unique swap-YES/loss/round-summary UI and
  later opponent-mon/rental rejection generation remain open; do not resume
  tick 33332/SAND ATTACK.
- **Notes:** commits `14e9f39`, `13652f5`; forced retries pin draw count/final
  RNG, source history stays six entries after the seventh selection, and
  presentation acknowledgements do not consume selection RNG. OFF ground
  truth is 179 deterministic captures, confirm+407 input-ready, ONIX 117,
  KABUTO 91→63, ONIX accuracy 6→5, and 12 RNG calls. No renderer, `BUGFIX`
  IV-branch, or opponent-party generation work was done. The ON animation
  probe also isolated ISSUES #34's seven FLY-up frames to the affine sampler.

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
