# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 322 — S8 live swap-YES player-picker prefix: **GREEN — 84/84 exact**

- **State:** offer YES now enters the presentation-acknowledged swap controller;
  the explicit-OFF `battle1-swap-player-picker.json` is **84/84 exact** over
  offer/edge plus every frame from first black through the input-ready player
  picker. Tier-1 is **1175/1175** and build passes (**5.545 MB**).
- **Did:** added a relative accepted-edge adapter, source-table ball motion,
  code-native/extracted picker compositor, canonical player/offered parties,
  and live input wiring. The entry gate (+99), player-options (+79),
  enemy-picker (+199), accept (+99), mutation, and preserved NO path are
  Tier-1 pinned. No screenshots or absolute-tick render branches were added.
- **Next:** render the still-open offer-to-black frames **29603-29619**, then
  extend the same state-driven adapter through player options, party slide,
  enemy picker, accept popup, accepted exit/message, and continuation. Do not
  expose hard-coded ONIX after the accepted GROVYLE mutation.
- **Notes:** the committed exact trace intentionally does not claim the
  29603-29619 field fade, options/enemy/accept/exit pixels, or post-swap
  Battle-2 identity. Controller state already reaches accepted GROVYLE.

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
