# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 321 — S8 swap-YES controller prefix: **GREEN — state/mutation only**

- **State:** source-driven swap interaction and mutation are implemented as a
  pure presentation-acknowledged controller. Tier-1 is **1170/1170** and build
  passes (**5.537 MB**). Canonical pixels remain exact only through the
  already accepted swap-offer endpoint **29601**.
- **Did:** modeled player picker → option popup → enemy picker → accept YES/NO,
  cursor wrapping/display-copy separation, RECHOOSE, quit confirmation,
  accept-NO return, and non-replaced-party duplicate-species rejection.
  ONIX slot 0 → GROVYLE slot 0 matches the tick-30681 RAM rental mutation;
  copied friendship is zero, and rental metadata uses the source-exact split.
- **Next:** build the live swap compositor/transition adapter from extracted
  assets and wire offer-YES into this controller. Then generalize Battle-2
  setup/render identity beyond its hard-coded ONIX lead so accepted GROVYLE
  can continue honestly; add dense explicit-OFF traces only when green.
- **Notes:** commits `09fa56a`, `f266d1f`, `5ed10b5`. No runtime wiring, new compare
  trace, screenshot chrome, tick branch, or animation-lane change was made.

---
## 320 — S8 OFF turn portability proof: **GREEN — 16/16 exact**

- **State:** the staged Battle-2 turn resolves through a reusable logical
  event → relative Scene-OFF command → completion-ack queue, and
  `battle2-off-turn1-staged.json` is **16/16 exact**. Tier-1 is
  **1157/1157** and build passes (**5.537 MB**).
- **Did:** added a data-driven two-action turn resolver, explicit RNG ledger,
  typed text/PP/HP/stat/turn-end/menu commands, paced OFF adapter, and staged
  next-input gate. Added dev-only named `appStage` compare metadata (stripped
  before oracle replay), compact trace inheritance, and a live primitive-based
  ONIX/KABUTO OFF compositor. The trace spans confirmation text, HP drain,
  both move texts, accuracy effect/message, turn-end, and the visible menu.
- **Next:** supervisor can accept this portability gate and continue only with
  S8's unique swap-YES/loss/round-summary UI or separately scoped generation
  work. Do not extend the canonical ON tick ladder.
- **Notes:** logical result is PP **10→9 / 15→14**, KABUTO **91→63**, ONIX
  accuracy **6→5**, HP/status otherwise unchanged, with all 12 RNG values and
  final **3121225034** pinned. Early/out-of-order completion is rejected;
  1×/4× presentation pacing produces identical rules/RNG. The next controller
  is ready at confirm+405 and the staged +407 A edge is accepted.

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
