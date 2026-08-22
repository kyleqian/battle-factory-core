# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1375 — [main worker, 2026-08-22] **ISSUES #108 CLOSED: 2/5 fixed (`STRINGID_PKMNRAGEBUILDING`, `STRINGID_PKMNSNATCHEDMOVE`), 3/5 reclassified DEAD on re-trace (Pay Day, Drizzle, Drought) — the #106/#107 census's reachability claims were wrong for all three**

- **State:** `src/engine/battleResolutionPresentation.ts` +
  `src/engine/factoryBattleScriptFullTurnDecision.ts` (fix),
  `tests/presentationStringIssue108.test.ts` (new, both pins red-verified via
  `git stash`), `ISSUES.md` (#108 deleted). `npm test` **10,204 passed / 223
  skipped**, `npm run build` green, smoke 444/444,
  `executableFrontierRatchet.test.ts` unchanged (no new production import,
  no barrier-count change).
- **Did:** **Rage**: plain `requireMoveDefender`, no plumbing —
  `executeRage`'s own `target` is already the hit Rage-holder. **Snatch**:
  `requireMoveDefender` is WRONG here (a self-targeted victim move makes
  `snatchsetbattlers` alias `selectorRoles.attacker` to the snatcher too) —
  added `targetBattler` (`selectorRoles.target`, uniformly the snatcher) to
  `prepareMessage`'s Intimidate-family allowlist instead. **Pay Day**:
  re-traced `Cmd_givepaydaymoney`'s only call site — its
  `jumpifnotbattletype BATTLE_TYPE_TRAINER` guard (`battle_scripts_1.s:
  3027-3028`) is dead on every path that reaches it (`battle_main.c:
  4967-4972` only enters with that flag SET) — prior census misread the
  jump polarity. **Drizzle/Drought**: Kyogre/Groudon are the sole Gen 3
  carriers and neither is a `FRONTIER_MON_*` rental — confirmed by
  `summary-info.json`'s ability table having no entry for either id. All
  three left OUT of `messageLines` (DEAD-carrier precedent, same as
  `STRINGID_PKMNCANTUSEMOVESEALED`).
- **Next:** #111 (+ driver papercut) as one small side step; #104 remainder;
  #109/#110 (side findings, unclaimed); `full`/`vanilla` 0:240 soak
  re-sweeps still outstanding (1370's note, carried forward).
- **Notes:** no PAPERCUT this step.

---

## 1374 — [supervisor fold, 2026-08-22 12:05] **#102 crash half FIXED + folded (`5cc52595`: `OpponentHandleChoosePokemon` PARTY_SIZE fallback; seed 138 OK); #106/#107 fixed (1373); 4M-frame depth probe: 7/7 OK, carry ceiling 28 = challenge-5 AI tier, NOT an instrument cap; #109–#111 filed**

- **State:** master `41866a9c`+docs. Merged-tree checks: the four string/#102
  pins 7/7, smoke 444/444 (full suite: worker-run 10,198 at `880a8bb8`
  + side-run 10,200 at `5cc52595`; supervisor full suite at wind-down).
  ISSUES: #102 trimmed to its open end-turn half (side lane, in flight on
  Opus, base `5cc52595`); #108 (5 reachable string gaps) filed by 1373 →
  next ts brief; #109/#110 (side worker findings) and #111 (`rentsCount`
  not reset on loss — source `battle_factory.c:208-212`) filed. PAPERCUTS +2
  (driver reset-on-battleIndex; thin switch-in throws) + freshness bump.
- **Probe (`docs/soak-deep-sweep-2026-08-22-4M.md`):** the 7 carry-28 seeds
  at `--max-frames 4000000` → 7/7 OK, 0 crash/hang, max carry 28 everywhere:
  no seed wins even battle 1 at challengeNum 4 (full
  CHECK_BAD_MOVE|TRY_TO_FAINT|CHECK_VIABILITY tier). End surface = ordinary
  7- and 20-turn losses. 1370's "instrument ceiling" caveat withdrawn; the
  `winning` ceiling is the AI tier. CAVEAT recorded: every seed's first round
  drafts from the pinned anchor pool, so "carry ≥ 7 100%" is anchor-biased.
  Determinism re-checked (seed 63, four ways, identical).
- **In flight:** `full` + `vanilla` 0:240 re-sweeps on the new semantics
  (clean `df60c00a` worktree, background); side = #102 end-turn cursor.
- **Next:** ts = #108; then #111 (+ the driver papercut) as one small side
  step; #104 remainder; draft heuristic n ≥ 180 if time.

---

## 1373 — [main worker, 2026-08-22] **#106 + #107 FIXED (`STRINGID_PKMNATTACK`/`STRINGID_PKMNSUBSTITUTEFADED`); soak seed 203 now runs to an honest OK; full sibling census done — 5 more confirmed-reachable gaps filed as #108, ~15 confirmed unreachable and recorded**

- **State:** `src/engine/battleResolutionPresentation.ts` +
  `src/engine/factoryBattleScriptFullTurnDecision.ts` (fix),
  `tests/presentationStringIssue106.test.ts` +
  `tests/presentationStringIssue107.test.ts` (new, both red-verified via
  `git stash`), `ISSUES.md` (#106/#107 deleted; #108 filed with the sibling
  census). Commits `e0995774`, `880a8bb8`. `npm test` **1,088 files / 10,198
  passed / 223 skipped**, `npm run build` green (the build's `tsc -b` caught
  two tuple-widening typecheck errors vitest's untyped run missed — fixed in
  the second commit, no behavior change). `executableFrontierRatchet.test.ts`
  pins unchanged (no new production import, no barrier-count change).
- **Did:** census methodology (not soak-driven): cross `battle-message-
  templates.json`'s placeholder table against every `printstring` site in
  `battle-script-program.json`, then against `messageLines`' explicit-case
  list plus its generic fallback (`B_LAST_ITEM`/`B_ATK_NAME_WITH_PREFIX`/
  `B_EFF_NAME_WITH_PREFIX`/`B_SCR_ACTIVE_NAME_WITH_PREFIX` only — notably
  **not** `B_DEF_NAME_WITH_PREFIX`, the single biggest gap source). 213
  distinct printed STRINGIDs; 37 initial gap candidates; 5 already covered by
  a sibling resolver function invisible to a `messageLines`-only grep
  (`resolveMoveSelectionRejectionMessageLines`/`resolveNoMovesLeftMessageLines`,
  Torment/Choice-item/no-moves-left selection rejections); ~15 ruled
  unreachable in Factory L50 singles by reading the actual source branch
  (doubles-only, wild-only, tag-battle-only, link-only, Local-not-Frontier,
  Arena-not-Factory, or an unported effect); **7 confirmed reachable +
  missing a resolver** — #106, #107 (both fixed this step) plus 5 more filed
  as **#108** (Rage, Pay Day, Drizzle, Drought, Snatch — not fixed, time-
  boxed). Full table (STRINGID / placeholders / reachable? / fixed? / pin)
  is in the commit body and `ISSUES.md` #108's entry, not repeated here.
  **#106** (`"{B_BUFF1}'s attack!"`, `BattleScript_BeatUpLoop`):
  `Cmd_trydobeatup` (`battleScriptBeatUpOpcode.ts`) already recorded the
  looping party member as `battleTextBuff1MonNick {battler, partyIndex}`
  (the same carrier `STRINGID_PKMNTRACED` uses) — needed a
  `prepareMessage` substitution (full `rules.party` access, since the
  looping member need not be the active battler) plus a `messageLines`
  case. Staged Beat Up **directly** (not via Metronome): a real 3-member
  healthy player party, confirms all 3 conscious members print in turn.
  **#107** (`"{B_DEF_NAME_WITH_PREFIX}'s SUBSTITUTE faded!"`,
  `BattleScript_SubstituteFade`): plain `requireMoveDefender` idiom, no
  `prepareMessage` change needed. Staged a real trainer Substitute (patched
  to 1 HP directly on the constructed `rulesContext` — no config field
  exposes `substituteHP` yet) broken by a real player attack.
  **Seed 203** (original #106 repro): now **OK budget, 1,000,000f, 24.4s,
  carry≤14 depth≤18** — no crash (previously crashed at frame 490300).
- **Next:** fix #108's five siblings (same house pattern, no new
  investigation needed — root cause and call sites are already documented
  there); #102 (side lane, concurrent, not this lane's file set); the
  `full`/`vanilla` 0:240 soak re-sweeps still outstanding (1370's note,
  carried forward).
- **Notes:** no PAPERCUT beyond the build-vs-vitest typecheck gap already
  documented above (cost ~5 min, not a tooling defect — `npm test` alone
  would have shipped a build-breaking test file).

---
