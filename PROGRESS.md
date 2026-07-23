# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 316 — S8 Battle 2 turn 1 ROCK SLIDE: **GREEN — through 33331**

- **State:** `battle2-turn1-rockslide.json` is **191/191 exact** through the
  last ONIX-owned frame 33331. Tier-1 is **1126/1126**; build passes
  (**5.522 MB**). S8 remains `[ ]`.
- **Did:** stored A 33071, resolved ONIX first, committed PP 10→9 and the
  three-call accuracy/spread/non-flinch RNG stream, rendered the full shared
  ROCK SLIDE animation on live ONIX/KABUTO, and drained/committed KABUTO
  91→63. Pure tests pin 19→28 noncrit damage and the 33331/33332 boundary.
- **Next:** resume exactly at **33332**, where KABUTO becomes attacker with
  current move SAND ATTACK. That handoff and everything later are unclaimed.
- **Notes:** captures include every frame 33115-33181 and 33270-33331 plus
  sparse mid-animation anchors. Battle-2 action/menu/send-outs/intro/
  transition/rooms remain exact; Battle-1 send-out remains **255/256**
  (#18 only). No framebuffer lookup, harvest, fitting, or thinning.

---
## 315 — S8 Battle 2 turn 1 33030-prefix probe: **GREEN — evidence only**

- **State:** oracle-only Battle 2 first-turn evidence is committed; no
  runtime engine/test/accepted-trace changes. Baseline remains **1118/1118**
  and build green.
- **Did:** normalized `battle2-turn1.json` to the exact action-menu prefix
  ending 33030 (never inherits the later DOWN/B round trip), then fresh
  twice-ran oracle/RAM/task/bar/AI probes. Edges are A 33031 (open) and A
  33071 (confirm ROCK SLIDE); ROCK SLIDE hits KABUTO 91→63, KABUTO uses
  SAND ATTACK (ONIX accuracy 6→5, no damage), next menu reveals/input-ready
  at 33614. 169 capture manifest is twice-run identical to 33671.
- **Next:** S8 stays `[ ]`; do not implement this turn from this worker
  checkpoint without a separately assigned engine step.
- **Notes:** trace `tools/compare/traces-groundtruth/battle2-turn1.json`,
  source/RAM ledger `docs/battle2-opening-notes.md`; no fitting, harvest,
  absolute-tick lookup, capture thinning, or second-turn input.
