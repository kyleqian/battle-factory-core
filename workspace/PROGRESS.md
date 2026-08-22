# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1377 — [main worker, 2026-08-22] **ISSUES #104 CLOSED: YES branch now shows EventScript_SaveBattle's own "battle was recorded" message before the shared farewell**

- **State:** `src/engine/factoryTerminalPresentation.ts` +
  `src/engine/factoryTerminalRender.ts` (fix, `f04519bd`/`e72292fe`),
  `tests/factoryTerminalRecordIssue104.test.ts` (YES sub-test rewritten, red
  paste in the commit body), new trace
  `tools/compare/traces/loss-terminal-record-yes-off.json` +
  `tools/battle-lab/scratch-loss-record-yes-probe.json` (`fa7d5215`), new
  doc `docs/factory-terminal-record-yes-ground-truth.md`. `npm test`
  **10,208 passed / 223 skipped**, `npm run build` green, smoke 444/444,
  `executableFrontierRatchet.test.ts` unchanged.
- **Did:** oracle-derived the YES trace from the existing NO-path probe
  (one appended UP + the same confirm A + two new dismiss A's; run via
  `bin/oracle lab`, not `bin/oracle run`). `declineFarewellReleaseAge` still
  arms on confirm for all three answers; for YES it doubles as the new
  message's own edge (`recordSavedTextClearDelay=21`/`TextFirstDelay=22`/
  `InputDelay=70`, oracle-measured — `frontier_savebattle`'s own latency)
  until that message's own dismiss re-arms it, at which point the existing
  farewell mechanics drive unmodified. `npm run compare --summary`:
  **133/133** over the dense window. NO/B-cancel pins untouched.
- **Next:** #110 cleanup as a small main step; draft heuristic n ≥ 180 if a
  slot frees; `full`/`vanilla` soak re-sweeps still outstanding (carried).
- **Notes:** PAPERCUT: the record-menu cursor-move (`UP`) renders 1 tick
  earlier in the app than the oracle (`drawRecordPrompt`, pre-existing,
  out of scope) — worth a future look, ~5 min lost isolating it from #104.

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
