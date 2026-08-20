# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1369 — [supervisor wind-down, 2026-08-20] **Milestone M-B bar AND stretch met: `winning` reaches carry ≥ 28 by play (seed 24, challenge-4 AI tier) once #104 (terminal record-YES dead end + cumulative soak grace) was found and fixed; soak OK/HANG redefined for continuous play; rust + animation lanes folded; #105 filed at the new depth**

- **Final gates (supervisor-independent, at the FINAL tree `2f527dcb` (code) / this docs commit`):**
  full `npm test` **1,079 files / 10,176 passed / 223 skipped** (at `bcfa69d4`-era tree incl. both lane folds; the later #105 fix `1df9dcb6` re-ran the suite itself: 1,080 files / 10,177 passed — PROGRESS 1368; supervisor reran its pin + census ratchet + seeds 40/50 → OK); `npm run build` green; soak vanilla 0:20
  **20/20 OK** (all `budget`; carry ≥ 7 20/20, ≥ 14 0/20); soak full 0:60 **60/60 OK** (all `budget`; carry ≥ 7 3/60) — both with rendering on the pre-#105 tree `e3176a05` (#105 is a carry-21 string case `full`/`vanilla` never reach; NEW semantics:
  OK = frame budget reached while still progressing / HANG = 30k frames of
  no progress); `winning` 0:60 depth (render off, `e3176a05`): **carry ≥ 7 60/60, ≥ 14 56/60, ≥ 21 13/60, ≥ 28 1/60 (seed 24, depth 28)**; 58 OK(budget) / 2 CRASH (seeds 40+50 = #105) / 0 HANG. Rust fold:
  cargo 75/75 result blocks ok, wasm rebuilt (`build-wasm.sh`, 492,691 B, sha 61f39cfe…), `POKEBENCH_ENGINE=wasm` parity suites **18 files / 803 tests green** (run from the workspace root — a core-rs cwd finds no tests). Animation fold `bcfa69d4` (10 commits, additive:
  Psybeam + Rain Dance; their session was LIVE — later commits fold next
  session).
- **Did (9 main rounds + 7 side rounds, 2 cap-kills salvaged, 0 regressions
  folded):** M-B step 1 (1357, verdict (a)); #99 found (side scout) + fixed
  (1358); step 2 levers: type-aware move choice (1359), swap decline
  (`781c8827`), true-immunity switch + HP gate (`3fa78a98`); withheld:
  draft-by-strength (`wip/mb-step2b-draft-heuristic`) and the loose switch
  rule (both measured worse at n=60); #100/#101/#103 fixed (1360/1363; #103
  ROM-byte-verified by the supervisor); #102 non-repro, its end-turn lead
  REFUTED by a pin; sweeps 0:240 (1361) and 0:480 (1365) reached carry ≥ 21
  (seed 99 first; 5/480); supervisor probe then showed the carry-21 "wall"
  was #104 (1366); #104 fixed in both halves (1367 driver, `fd30ee13`
  engine) and the soak's OK/HANG semantics redefined for continuous play
  (`f931241a`: stallFrames/--max-rounds; the pre-#104 "OK" was a cumulative-
  grace artifact since M-A); #105 (Conversion/Camouflage type-name string,
  surfaced at carry 21 by the supervisor's depth run) fixed same hour
  (`1df9dcb6`, 1368).
- **Next:** (1) re-measure depth at scale on the new semantics — `winning`
  0:240+ with `--max-rounds` or the 1M budget — to learn whether carry ≥ 28
  (challenge-4 AI tier) is reached by play; this is M-B step 3 re-run, the
  honest number is still unknown; (2) the standing `full`/`vanilla` gate
  definitions now mean "no stall/crash within the frame budget" — ROADMAP
  soak-policy block should say so (supervisor TODO next session); (3) #104
  remainder (YES-branch "battle was recorded" message needs an OFF trace);
  note seeds 40/50 now play an 84-turn battle 1 at carry 21 — long but
  progressing (PP → Struggle), not a stall; keep an eye on turn counts in
  future sweeps;
  (4) #102 stays open non-reproducing; (5) re-measure the withheld draft
  heuristic at n ≥ 180 before deciding; (6) `full` still wins ~1/60 rounds —
  its gate coverage of deep play stays thin by design.
- **Notes:** PAPERCUTS bumped (absolute-path commit + reset --hard on master
  by a side worker; pinned-line census citations incl. my own hit). Process
  lessons: inspect the END SURFACE of a sweep's deepest seeds before
  attributing depth to difficulty (three sweeps mis-attributed an instrument
  cap); an instrument fix can legitimately flip every historical "OK" — say
  so in the ledger rather than soften the instrument. DEFERRED.md: no new
  entries; none open.

---

## 1368 — [main worker, 2026-08-20] **#105 FIXED: STRINGID_PKMNCHANGEDTYPE `messageLines` case added (Conversion/Conversion 2/Camouflage); soak seed 40 now runs to an honest OK (`1df9dcb6`)**

- **State:** `src/engine/battleResolutionPresentation.ts` +
  `src/engine/factoryBattleScriptFullTurnDecision.ts` (fix),
  `tests/presentationStringIssue105.test.ts` (new), `ISSUES.md` (#105
  deleted, fully fixed). Commit `1df9dcb6`. `npm test` 1080 files/10177
  passed (44/223 skipped, unchanged), `npm run build` and `npm run
  typecheck` green.
- **Did:** `BattleScript_EffectConversion`/`Conversion2`/`Camouflage`
  (`data/battle_scripts_1.s:664,1282,2805`) all print
  `STRINGID_PKMNCHANGEDTYPE` ("{B_ATK_NAME_WITH_PREFIX} transformed\ninto
  the {B_BUFF1} type!") after their own already-ported type-change opcode
  (`battleScriptTypeChangeOpcode.ts`, which already records the chosen type
  into `rulesContext.battleTextBuff1Type`); none reassign selectorRoles, so
  BS_ATTACKER stays the move's own still-current user. Wired the
  substitution in `factoryBattleScriptFullTurnDecision.ts`'s `prepareMessage`
  ternary (`TYPE_DISPLAY_NAMES[battleTextBuff1Type]`, the same
  `gTypeNames`-derived table `STRINGID_PKMNCHANGEDTYPEWITH`/Color Change
  already uses) and added the `messageLines` case. Pinned in
  `presentationStringIssue105.test.ts` (real player CONVERSION,
  red-verified via `git stash` — reproduced the exact soak crash string
  pre-fix). **Seed 40 (original repro): OK budget, 1,000,000f, 24.9s,
  carry<=21 depth<=21** — no crash. Neighbourhood `winning --seeds 38:44`:
  **OK 6, CRASH 0, HANG 0**.
- **Sibling check:** grepped all 4 real-source `PREPARE_TYPE_BUFFER(gBattleTextBuff1,
  ...)` call sites — `Cmd_tryconversiontypechange`,
  `Cmd_settypetorandomresistance` (2 sites), `Cmd_settypetoenvironment` all
  feed `STRINGID_PKMNCHANGEDTYPE` (now fixed); Color Change's
  `ABILITYEFFECT_ON_DAMAGE` branch (`battle_util.c:2761`) feeds
  `STRINGID_PKMNCHANGEDTYPEWITH`, which already had a resolver. No
  remaining gaps.
- **Emitter seed 40 hit:** verified in a throwaway worktree at the pre-fix
  parent commit — turn 24 crashes right after the player confirms FIRE
  BLAST (move 126); the type-change move that actually triggers
  `STRINGID_PKMNCHANGEDTYPE` belongs to the AI-controlled opposing trainer
  battler for that same turn, which the driver's verbose log does not name
  (it only echoes the player's own FIGHT confirmations). Not distinguished
  between Conversion/Conversion2/Camouflage specifically, but immaterial —
  all three funnel through the identical opcode + STRINGID + fix, confirmed
  by the seed rerunning clean.
- **Next:** #104 (engine half: stub continuation for terminal
  YES/cancel) is the next highest-value open item per 1367. A full honest
  0:60/0:20/0:60 gate re-sweep is still owed once that lands.
- **Notes:** no PAPERCUT. Landed inside the 30-min cap.

---

## 1367 — [main worker, 2026-08-20] **#104 driver half FIXED: per-round grace re-arm + honest HANG reporting; unmasked finding — the terminal record-YES/cancel dead end is near-universal, not a deep-chain rarity (`428ba1c4`)**

- **State:** `tools/soak/randomRoundSoakDriver.ts`/`randomRoundSoak.ts` +
  `tests/randomRoundSoak.test.ts` changed (`428ba1c4`); no `src/`. `npm test`
  10152/10152 (223 skipped), `npm run build`, `npm run typecheck` all green.
- **Did:** `terminalGrace` now re-arms on every `graceActive` falling edge (a
  genuine re-chain) instead of counting down a single cumulative 9,000-frame
  budget shared across every chained round; expiry with no lobby reached and
  no re-chain now returns `HANG` + `hangSurface: "factoryTerminal"` + the
  decided round's own `endState`, instead of a false `OK`. New describe
  "ISSUES #104 (driver)": (a) seed 328 `winning` @ 260k frames now honestly
  reports HANG (was the silent-OK carry-21 "wall" of PROGRESS 1365/1366); (b)
  seed 34 `winning` reaches carry 14 (2 full chained round wins) before its
  own dead end, proving re-arming doesn't cap chaining depth. Retargeted the
  pre-existing ISSUES #89 seed-27 pin to `stopAtFirstRoundDecision: true` —
  it now also hits a #104 dead end at its old 80k budget, unrelated to its
  own (Baton Pass) concern.
- **Finding (big):** brief's own pin-(b) premise (seed 4/5 "finish OK" per
  `docs/soak-depth-measure-2026-08-19.md`) was FALSE once measured honestly —
  BOTH dead-end on `recordChoice` (`"cancel"`/`"yes"`) with carry 0. Widened
  to small honest samples post-fix: **`winning` 15/15 HANG@factoryTerminal
  (seeds 0:15), `vanilla` 10/10 (seeds 0:10), `full` 10/10 (seeds 0:10)** —
  reduced ranges, not the brief's full 0:60/0:20/0:60, given the 40-min cap
  (each seed now runs to ITS OWN genuine dead end or the frame budget, not a
  quick artificial cutoff). The dead end is NOT winning-policy-specific or
  win-only: `advanceFactoryTerminalRecordPrompt` is shared machinery for
  lost rounds too (loss presentation carries the same `recordChoice` field),
  and the terminal's random A/B/UP/DOWN walk (shared across all 3 policies)
  lands on YES/cancel with near certainty given enough presses across enough
  rounds. Also confirmed structurally: `lobbyFreeRoam` is architecturally
  unreachable via decline under the driver's default `generated-orchestrator`
  route (continuous-play chaining always re-chains a "no" straight into a
  fresh draft, `core.ts:~837-843`) — so every historical non-milestone,
  non-`stopAtFirstRoundDecision` "OK" sweep result, at ANY policy, was always
  a grace-expiry artifact, never a genuine reach of the Lobby. ISSUES #104
  trimmed to its (now clearly-scoped, high-value) engine-half remainder.
- **Next:** engine half of #104 (stub continuation for YES/cancel, RECORD is
  stub-only per the 2026-08-05 decision) is now the highest-value open item —
  fixing it should turn most of the sample above into genuine OKs at the
  Lobby (well, still capped by continuous-play chaining re-entering a draft
  instead — the decline path is unaffected, only yes/cancel gain a
  continuation). A full honest 0:60/0:20/0:60 gate re-sweep is still owed
  once that lands; today's reduced samples are real numbers, not a stand-in.
- **Notes:** no PAPERCUT. Time ran over the 40-min soft cap (~55 min) — the
  brief's pin-(b) seeds turned out to require live investigation (a wrong
  premise, not a typo) before an honest alternative could be written, and
  the full `npm test` run alone took ~3.3 min; landed everything green
  rather than cut the investigation short and risk a dishonest pin.

---
