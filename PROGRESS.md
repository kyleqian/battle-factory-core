# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1064 — [MAIN worker, 2026-08-09] **Damp presentation owner snapshot fixed**

- **State:** committed `196e0359` is green: focused **12/12**, smoke **8
  files / 375 passed**, full suite **845 files / 8,283 passed / 1 skipped**,
  production build, and Battle Scene OFF oracle info all pass.
- **Did:** source `BattleScript_DampStopsExplosion` prints
  `STRINGID_PKMNPREVENTSUSAGE` after `Cmd_tryexplosion` redirects
  `gBattlerTarget` to its Damp holder. The full-turn message receipt now
  freezes that target for this one id, and presentation resolves
  `B_DEF_NAME_WITH_PREFIX` from it. Public-path tests pin target-held and
  attacker-held Damp, ordinary defender naming, and unchanged unrelated
  `STRINGID_USEDMOVE` event shape.
- **Next:** return to the ordered family-level Gate-6 worklist from the
  verified **106 ability / 195 item** hook-gap frontier; Shell Bell remains
  separately scoped.
- **Notes:** no oracle compare trace was needed for this source-backed text
  owner fix. No Damage/PP/HP/RNG, selector mutation, controller/facility
  state, animation, generated artifact, unsupported barrier, or canonical
  Battle-2 window changed.

## 1063 — [supervisor, 2026-08-09] **Attract/Oblivious and Vice Grip folded; union green**

- **State:** final master union is green: full suite **845 files / 8,282
  passed / 1 skipped**, production build, OFF oracle info, and animation
  coverage pass. Full-policy **0:60 = 60 OK / 0 CRASH / 0 HANG** and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** accepted the one-row source-bounded Attract/Oblivious family
  (`9c9a75f9`, merge `b36f2a75`): ability gaps move **107→106**, total hook
  gaps **302→301**, item gaps remain **195**, ability source-proven rows become
  **194**, and joined categories become **346**. A fresh supervisor OFF probe
  reproduced Oblivious ability reveal **12**, target `status2=0`, and Attract
  PP **15→14**; its Own Tempo control wrote `0x20000` with PP **15→14**.
- **Did:** folded `animation-main` through exact Vice Grip (`4f56ec54`,
  `469019b9`, `b686df3d`, `b26c90fd`; merge `a23250a5`). Both orientations are
  **42/42** dense frames exact twice fresh; Level-50 animation coverage is now
  **147/276 exact**.
- **Next:** continue the ordered family-level Gate-6 worklist from the verified
  **106 ability / 195 item** hook-gap frontier; Shell Bell still needs its own
  bounded successful-damage census and must not be inferred from MOVEEND state
  12 sharing.
- **Notes:** the seven-win live proof remains **56,556 frames / 4,228 renders**
  through all seven battle seams. No canonical Battle-2 window past tick
  33331, battle/turn/absolute-tick renderer branch, unsupported-barrier pin,
  round outcome, controller interface, or Scene-OFF logical state changed.

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
