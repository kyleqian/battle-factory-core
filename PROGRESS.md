# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1066 — [supervisor, 2026-08-09 night] **Orient fold: Karate Chop checkpoint + orphan printfromtable audit; union green**

- **State:** master union is green: full suite **851 files / 8,302 passed / 1
  skipped**, production build, both oracle freshness checks PASS. The
  animation supervisor is live concurrently (Codex Sol/high, same deadline)
  and fast-forwarded `animation-main` onto the fold — benign convergence.
- **Did:** folded `animation-main` (4 commits, Karate Chop source-complete
  resume checkpoint `b67b45f6`..`9134da4a`, merge `96e3441c`; no coverage
  claim — Karate Chop stays an evidence checkpoint). Swept orphaned branches
  at orient and folded `worker/side-20260808-190940` (2026-08-08 Luna
  printfromtable family audit: doc + generated JSON + extractor + pinned
  test). Its scout-time pin (40 registered tables / 3 missing families) had
  drifted: all three families landed 2026-08-09, so the pin now records **43
  registered / 0 missing**, leaving the short `gStatUpStringIds` table (5 of
  6 rows) as the one open remainder; doc carries a STATUS note.
- **Next:** round 1 — main lane proves the **Shell Bell** family (bounded
  successful-damage census, OFF oracle receipt, Tier-1 sibling batch,
  manifest promotion); side lane authors the ranked **Gate-6 family
  worklist** regrouping the remaining 106 ability / 194 item row gaps.
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; the only test delta is the honest printfromtable re-pin.

## 1065 — [supervisor, 2026-08-09] **Damp family certified; final union green**

- **State:** final master union is green: full suite **849 files / 8,296
  passed / 1 skipped**, production build, OFF oracle info, and animation
  coverage pass. Full-policy **0:60 = 60 OK / 0 CRASH / 0 HANG** and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** accepted attacker-held Damp's generic presentation-owner repair
  (`196e0359`) and the source-bounded Explosion/Damp family (`da51e857`, merge
  `41d59741`). The two exact candidates add ability categories **346→348**
  while honestly leaving **106 ability / 195 item / 301 total** row gaps and
  **194** ability source-proven rows unchanged because Color Change already
  proved both rows.
- **Did:** twice-fresh OFF evidence is byte-identical across no-Damp,
  target-Damp, and attacker-Damp arms. Control spends PP **5→4**, self-KOs,
  damages **95→44**, and owns exactly three RNG calls; either Damp holder
  spends PP but preserves both HP values and action RNG while recording
  ability **6** at the correct battler. Folded `animation-main` through the
  bounded Poison Sting lower-carrier work (`b46f5f74`..`2628c57c`, merge
  `d6f79306`) and Karate Chop source checkpoint (`008cf4f0`, merge
  `4a2fcd59`), plus the animation-supervisor wind-down ledger (`87bc8a8c`,
  merge `6bf8eca9`); animation coverage remains **147/276 exact**.
- **Next:** continue the ordered family-level Gate-6 worklist from the verified
  **106 ability / 195 item** row-gap frontier. Shell Bell still needs its own
  bounded successful-damage census; Poison Sting and Karate Chop remain
  evidence checkpoints until their animation acceptance contracts are met.
- **Notes:** the seven-win live proof remains **56,556 frames / 4,228 renders**
  through all seven battle seams. No canonical Battle-2 window past tick
  33331, battle/turn/absolute-tick renderer branch, unsupported-barrier pin,
  round outcome, controller interface, or Scene-OFF logical outcome changed.

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
