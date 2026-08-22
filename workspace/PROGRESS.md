# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1376 — [supervisor fold, 2026-08-22 13:10] **End-turn cursor fix folded (`a6deb814`: Future Sight/Perish Song pass no longer rescans from 0 after a faint pause — timers were double-counted); #102 CLOSED (crash half fixed, end-turn lead refuted twice, adjacent cursor bug fixed); #111 fixed; driver round-identity reset salvaged; `full`/`vanilla` 0:240 re-swept — #112/#113 filed as ≤9 s live repros**

- **State:** master = merge of `worker/side-20260822-114356` (end-turn
  cursor, Opus) + `005d290f` (#111: loss zeroes `rentsCount`) + the salvaged
  driver reset (cap-killed worker, Part B verified by the supervisor: pin
  43/43, smoke 444, vanilla 0:20 below). **New shared-state fields
  (recorded per the boundary rule):** `BattleScriptRulesContext.wishPerishSongState`
  / `.wishPerishSongBattlerId` (source-named, default 0, optional on the
  input; key-shape pin moved). Full `npm test` + `npm run build` on this
  union: running in the background at this commit (result in the next entry).
- **Sweeps (`docs/soak-full-vanilla-0-240-2026-08-22.md`):** vanilla 0:240
  **240/240 OK**; full 0:240 **236/240** — seeds 110/230 are #102/#108 (now
  OK on master), seeds **108** (`resolution handoff battler 0 display does
  not match the genuine next boundary`, after a forced send-out) and **192**
  (`Cmd_openpartyscreen: unresolved battler selector BS_FAINTED` on a switch
  turn) are new → ISSUES #112/#113, side worker (Opus) on them now, based on
  the end-turn branch.
- **Docs:** ISSUES −#102 −#111 +#112 +#113 +#114 (doubles-era
  FutureAttacks inline-loop note); PAPERCUTS −driver-reset +gate6-manifest
  OOM. Cap lesson: a 35-min cap for two parts + a 0:60 before/after sweep was
  too tight (worker killed mid-suite) — give measurement briefs ≥ 50 min or
  drop the sweep.
- **Next:** verify #112/#113 result and fold; then #104 remainder (needs an
  OFF trace) or #110 cleanup as a small main step; draft heuristic n ≥ 180 if
  a side slot frees; wind-down gates (full suite, build, vanilla 0:20, full
  0:60) at ~18:30.

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
