# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1062 — [supervisor, 2026-08-09] **King's Rock family and Acid Armor folded; union green**

- **State:** final master union is green: full suite **841 files / 8,271
  passed / 1 skipped**, production build, OFF oracle info, and animation
  coverage pass. Full-policy **0:60 = 60 OK / 0 CRASH / 0 HANG** and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** accepted the source-bounded King's Rock moveend family
  (`24af7df7`, `2da025b4`, merge `b6706e1a`): **106** finite Level-50 flag
  selectors, **105** promoted, all **12** roster-only candidates retained,
  and `MOVE_TICKLE` kept as the sole zero-damage exception. Item gaps move
  **300→195**; ability gaps remain **107**. A fresh supervisor rerun reproduced
  the seed-11 OFF receipt byte-identically (roll **4**, target flinch/cancel,
  target PP unchanged).
- **Did:** folded `animation-main` through exact Acid Armor (`5cfde5fa`,
  `af226799`, `84e2b78c`; merge `567956b8`). Both orientations are **119/119**
  dense frames exact twice fresh; Level-50 animation coverage is now
  **146/276 exact**.
- **Next:** continue the ordered family-level Gate-6 worklist from the verified
  **107 ability / 195 item** hook-gap frontier, then assemble the Gate-6
  close-out artifacts only after the remaining families are source-certified.
- **Notes:** the seven-win live proof remains **56,556 frames / 4,228 renders**
  through all seven battle seams. No canonical Battle-2 window past tick
  33331, battle/turn/absolute-tick renderer branch, unsupported-barrier pin,
  round outcome, or controller interface changed in this increment.

## 1061 — [supervisor, 2026-08-09] **seven-battle OFF seam proven; union green**

- **State:** final master union is green: full suite **837 files / 8,260
  passed / 1 skipped**, production build, OFF oracle info, and focused
  seven-win/Stomp **17/17** pass. Full-policy **0:60 = 60 OK / 0 CRASH / 0
  HANG** and vanilla **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** accepted the stale RECORD-NO ownership repair (`fda61672`), the
  source-complete 71-ability display-name join (`16ca008d`), and the live
  seven-win `tick`/render proof (`d21682b8`). Seed 21 earns all seven wins in
  **56,556 frames / 4,228 renders**, including forced switches, every
  inter-battle seam, and the `roundWon` default-NO record menu.
- **Did:** folded Gate-6 Synchronize **30/30** (`c791b8eb`, reconciliation
  `766414d7`) and folded `animation-main` through Super Fang (`72f112fd`),
  Disable (`8b1e192e`), and Stomp (`50674680`), verifying each union rather
  than relying on lane-local results.
- **Next:** resume the ordered family-level Gate-6 worklist from the verified
  **107 ability / 300 item** hook-gap frontier; the 0:60 soak has no remaining
  crash/hang signature to cluster.
- **Notes:** no canonical Battle-2 window past tick 33331, battle-number/
  turn-number/absolute-tick branch, or unsupported-barrier pin changed. The
  seven-win route owns **7 opponent generations + 7 battle RNG segments**;
  unknown ability IDs remain fatal.

## 1060 — [MAIN worker, 2026-08-09] **S8 seven-win live seam proven**

- **State:** committed red-first live route `d21682b8` is green at **56,556
  frames** through public `tick()` inputs with **4,228** render samples;
  focused random-soak **10/10**, orchestrator **45/45**, smoke **375/375**,
  full suite **835 files / 8,253 passed / 1 skipped**, typecheck, production
  build, and Scene-OFF oracle info all pass.
- **Did:** added an optional tools/test-only `stateFactory` plus opt-in route
  diagnostics and a CLI-inaccessible strong policy that reuses `RandomPlayer`.
  Seed 21 starts at the normal generated intro boundary with source-derived
  records 664/678/527 and follows real command, forced-switch, postwin,
  swap-decline, and terminal default-NO UI gates to seven live wins.
- **Next:** supervisor should accept this S8 audit recommendation as closed and
  resume the ordered family-level Gate-6 worklist from the verified union.
- **Notes:** terminal is `roundComplete`, battle index 6 / battle 7 turn 11,
  with **7 opponent generations + 7 battle RNG segments** and the `roundWon`
  record menu observed input-ready before NO. No `src/**`, canonical Battle-2,
  animation, unsupported-barrier pin, or CLI full/vanilla contract changed.
  Vanilla **0:20** and full-policy **0:60** are each all OK / zero crash/hang.
