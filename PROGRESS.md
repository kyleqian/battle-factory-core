# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1067 — [MAIN worker, 2026-08-09 night] **Shell Bell source audit landed; census/receipt/promotion still open (honest partial)**

- **State:** tree is green: full suite **852 files / 8,305 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  is untouched and still reads **195 item join gaps / 106 ability join gaps**
  (unchanged from entry 1066 — this step added a doc only, no census/manifest
  edit, so there is no before/after delta to report yet).
- **Did:** `docs/shell-bell-moveend-ground-truth.md` re-derives the
  `HOLD_EFFECT_SHELL_BELL` arm of `ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL)`
  (`battle_util.c:3787-3806`), the four `shellBellDmg` recording sites inside
  `Cmd_datahpupdate` (`battle_script_commands.c:1870-1983`), and the two
  explicit `IGNORE_SHELL_BELL` suppression sites (`Cmd_painsplitdmgcalc`
  `battle_script_commands.c:8063`; delayed Future Sight/Doom Desire
  `HandleWishPerishSongOnTurnEnd` `battle_util.c:1816`) — all with exact
  file:line citations, no prose glosses. Confirmed
  `src/engine/battleScriptMoveEndOpcode.ts:883-969`'s `HOLD_EFFECT_SHELL_BELL`
  arm is a faithful line-for-line port of source (same eight ordered guards,
  same `max(1, floor(shellBellDmg/holdEffectParam))` heal, same reset-to-0,
  same `BattleScript_ItemHealHP_Ret` jump) — **no engine fix was needed**, so
  this step stayed pure proof work. Derived the finite selector: Shell Bell's
  is *not* a `moves.json` flag (unlike King's Rock's `FLAG_KINGS_ROCK_AFFECTED`)
  — it's "does the move reach a successful `datahpupdate BS_TARGET`", the same
  route property this run already source-proved for the Color Change ON_DAMAGE
  family (`power != 0` selector, 183 candidates / 182 proven / 1 Future Sight
  exception). The doc shows Shell Bell's own Future Sight exclusion reason
  (`battle_util.c:1816` explicit poison) is **not** the same as Color Change's
  (`moveendfromto` state-3 skip) — state 12 is inside Future Sight's delayed
  `[11,14]` moveend range, so this is a genuinely distinct citation, not an
  inferred analogy.
- **Next:** the remaining three deliverables are real implementation work,
  not proof-reading, and did not fit this session's cap: (1) wire
  `coverage.hookCatalogs.item.shellBell` into
  `tools/extract/extract-level50-move-parameterization.ts` by transforming the
  already-computed `colorChangeRouteEvidenceByMove` witnesses (182 rows) into
  Shell Bell witnesses retargeted at `MOVEEND_KINGSROCK_SHELLBELL`/state 12
  (reuse the routes, don't recompute them — `kingsRockRouteEvidence` is the
  shape to match); (2) a Battle Scene OFF receipt (three-party `mechanicLab`
  fixture, Shell Bell holder vs. no-item control, run twice for byte-identity)
  named like the King's Rock set (`tools/battle-lab/mechanic-shell-bell-heal-off.json`,
  `tools/probe/probe-shell-bell-heal-off.py`,
  `tools/probe/receipts/shell-bell-heal-off.json`); (3)
  `tests/shellBellHookJoinBatch.test.ts` + `tests/shellBellOracleEvidence.test.ts`
  and the matching `gate6-coverage-manifest.ts` promotion (its per-move
  hook-join validator hard-couples any `hooks.item.status` change to family
  evidence, so census and manifest wiring cannot be split — do both together).
  Do not promote rows to `source-proven-family` without the real receipt.
- **Notes:** no engine, controller, round outcome, barrier pin, generated
  JSON, or canonical window changed. `docs/shell-bell-moveend-ground-truth.md`
  is standalone and doesn't yet feed the manifest — the manifest's 195/106 gap
  counts are exactly what they were at entry 1066.

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
