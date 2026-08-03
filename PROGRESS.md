# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 893 — [bounded MAIN worker, 2026-08-03 ~13:05] Same-day crash FIXED (STRINGID_PKMNFELLFORTAUNT + sibling) + ISSUES #72 filed (107-id census, blind-spot class beyond #70)

- **State:** master `a6d533a7`. Full `npm test`: **660 files / 6,558 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base 78fb4ef0
  --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** Fixed the same-day user-reported crash (live preview `3a1e1d8b`:
  opponent MURKROW's TAUNT threw battleStringResolver's completeness guard
  on `{B_DEF_NAME_WITH_PREFIX}`). Mapped `STRINGID_PKMNFELLFORTAUNT` in
  `messageLines` (`battleResolutionPresentation.ts`) — Taunt's own
  `Cmd_settaunt` operates on `gBattlerTarget` directly, so B_DEF is the
  move's own defender, same shape as `STRINGID_PKMNSUBJECTEDTOTORMENT`.
  While staging a real repro (MURKROW's real Factory rental set,
  `FRONTIER_MON_MURKROW_1`), found and fixed a **sibling gap in the same
  turn**: `STRINGID_PKMNCANTUSEMOVETAUNT` (the taunted battler's own blocked
  status-move action, printed by the attack canceler instead of
  STRINGID_USEDMOVE) — sourced from the frozen action snapshot's
  attacker/currentMove, not `lastMoveAttacker` (no used-move message
  precedes a canceled action). `tests/presentationStringTaunt.test.ts`: full
  production-kernel repro, red-verified via `git stash` on the engine file
  (threw the exact reported error pre-fix).
  **Root cause of why #70 missed both:** #70's sweep grepped `src/engine/
  *.ts` for `STRINGID_` TS literals; these two ids are emitted purely by the
  generic `printstring` opcode handler reading the operand straight out of
  the parsed battle-script program — no TS code ever names them, so the
  grep-based method structurally cannot see this class. Wrote
  `tools/report/printstring-literal-census.ts` (regenerable,
  `docs/printstring-literal-census.md`) to enumerate it properly: **207**
  unique literal `printstring` STRINGID operands in the parsed program, 13
  already explicit + 87 generic-fallback-safe, **107 UNRESOLVED**
  (syntactic upper bound, not per-id reachability-traced like #70's own
  method — many are structurally dead, e.g. Battle Arena/link-battle-only
  ids). Filed as **ISSUES #72** with the full list and the 7
  highest-suspicion same-family next picks (PKMNALREADYASLEEP/CONFUSED/
  HASBURN/POISONED/ISALREADYPARALYZED, PKMNCANTUSEMOVETORMENT/SEALED) —
  per the step's own outcome rule (longer tail → file, don't chase).
- **Next:** ISSUES #72's 7 highest-suspicion ids (same "already-status"/
  "can't-use-move-X" family as the just-fixed Taunt pair, same fix idiom);
  the rest of #72's 107-id list needs #70-style per-id reachability triage
  before fixing (many are dead paths, not real gaps); ISSUES #71 remaining
  (Slice D gated on animation lane's rung-3 dispatcher; the
  `drawGeneratedPlayerMaterialize` ONIX-back latent bug from entry 891);
  typeref slice-2 re-scope.
- **Notes:** no PAPERCUT this step. `npm test` auto-backgrounded past the
  harness's 120s default Bash timeout (suite takes ~11min); resolved by
  polling the background output file in a single blocking foreground Bash
  call with an explicit longer timeout, per this run's "never actually
  background a verification" discipline — worth remembering the fix
  pattern rather than re-deriving it next time a full-suite run exceeds
  120s.

---
## 892 — [supervisor wind-down, 2026-08-03 ~12:40] #70 CLOSED + dossier CLOSED + #71 hookup slices A/B/C landed + typeref slice 1; animation fold; final union green

- **State:** master `3a1e1d8b` = supervisor fold of animation-main
  `32415c02` (18 commits: back-family send-out reducers begin —
  `backSendOutAnim.ts`, 5 families with twice-fresh evidence — plus shrink-
  grow/spring/vibrate/slide docs) onto `98b2287a`. Final independent full
  `npm test`: **659 files / 6,557 passed / 1 skipped**, `npm run build` green
  (the session's ONE supervisor full-suite run per today's new
  judicious-suite directive). DEFERRED.md: no entries. Play-preview rebuilt
  at `3a1e1d8b`, serving :5199.
- **Session (8 workers: 5 main + 3 side, 0 lost, ~4h):**
  1. **ISSUES #70 CLOSED** (was: 47-id presentation-string sweep debt).
     Batch 3 final 12 ids (`8489ca18`), then the INTROSENDOUT extractor gap:
     side-banked hand-mapped intro table `battleIntroStrings.ts` ids 0/1/2/5
     (`a76bb338`) wired into `messageLines` (`49b8c323`) with new
     `introBattler`/`introHpScale`/`introOutcome` event fields. Every
     STRINGID the engine can print now resolves; the crash class from the
     2026-08-02 user playtest is fully retired.
  2. **Species-dossier program CLOSED** (7/7): capstone slice 4 via side
     lane (`90e5a2b2`), differential 144/144.
  3. **Typeref slice 1 landed** (`7ca03a17`, 72 of 144 refs cut,
     differential 7,466/7,466); slice 2 honestly blocked — real shape is
     bigger than the design doc row (9+ Family-R call sites + an HP-overlay
     turn-1 exclusion nuance), documented in ISSUES #39 for re-scoping.
  4. **User directives adopted mid-session:** (a) judicious full-suite
     cadence (SUPERVISOR.md verify step updated; memory banked); (b) #71
     send-out hookup = MAIN lane's job, reprioritized ahead of remaining
     typeref slices (ISSUES #71 sequencing updated; memory banked).
  5. **ISSUES #71 hookup begun — Slices A+B+C landed** on the banked scout
     doc `docs/send-out-live-wiring-consumer-map.md` (`9c6de475`):
     front terminal rest offsets wired at all 5 live settle hooks with the
     real fieldView species threaded (`2ef1c9d8`), RAM-probe-confirmed vs
     the ROM incl. a RATTATA positive case (`32af4030`, `0dce7d73` tests);
     back-side hand-fits documented + loud-guarded, KABUTO 4th hand-fit
     included (`e5bd18dd`). Supervisor-verified scout finding: only
     ONIX+RATTATA of 386 species have nonzero terminal offsets.
  6. **Real latent bug found (NOT yet fixed, next session's top pick):**
     `drawGeneratedPlayerMaterialize` applies ONIX-only offset/tint tables
     to ANY player species on the generated route — reachable today
     (KADABRA lead in `factoryBattleStartIntro.test.ts` at elapsed
     710/714). Details + candidate fix in ISSUES #71. The fold's new
     back-family reducers (`backSendOutAnim.ts`) may supersede the
     candidate fix — re-check that surface before briefing (the scout doc's
     "back surface absent" §3 is now stale).
- **Next (ordered):** (1) the generated-route ONIX-back latent bug;
  (2) #71 remaining: §1e 56-site patch retirement, Slice D + per-tick
  playback (gated on animation-lane rung-3 dispatcher — cross-lane ask in
  ISSUES #71; back reducers now partially banked); (3) typeref slice-2
  re-scope + slices 3/4a/4b/5 (behind #71 per user directive).
- **Notes:** harness repo got a NOTES.md commit (`8850261`, anti-cheat/
  server-stepped-simulation summary, user request) — the oracle freshness
  checker will now flag services older than harness HEAD; it is the KNOWN
  docs-only false positive, no restart needed. animation-main folded at
  `32415c02`; the animation supervisor was still live at fold (same 14:13
  deadline) — any commits it lands after `32415c02` are next session's
  boring fold. PAPERCUTS: +1 new entry (mechanicLab send-out probes inert
  under battle-scene-off). Ledger repair: entry 887 was appended out of
  order by its worker; reordered in `4fe0e206`.
---
## 891 — [bounded MAIN worker, 2026-08-03] ISSUES #71 Slice C LANDED — back-side hand-fit consumers documented + loud-guarded; one real latent bug found, NOT fixed (reported)

- **State:** master `e5bd18dd`. Full `npm test`: **649 files / 6,495 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base
  b7dbbe01 --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** `docs/send-out-live-wiring-consumer-map.md` §5 Slice C — no
  dispatcher exists yet (animation lane's rung 3/4), so nothing is deleted
  or retired. At each of the 3 back-side consumer sites, added a code
  comment naming the exact species(+nature) the hand-fit is valid for
  (citing the doc) plus a throw-guard matching the existing §1e pattern:
  `drawPlayerMaterializeSettle` (ONIX back, legacy) guards on `encounter`
  (destin/jenson only — neither it nor its 2 callers carry a species
  value); `drawKabutoHSlideWobble` (KABUTO front, §2's uncatalogued 4th
  hand-fit — treated the same way since it's equally guardable) guards on
  `encounter` too, jenson-only; `drawTurn15ForcedSwitchRelease` (MAGBY
  back, forced-switch) guards on a real `species` param — all 4 current
  call sites already resolve "MAGBY" (3 fixed Turn-15 content, the 4th
  generated-route caller already gated on `view.field.player.name ===
  "MAGBY"`). All three were module-private; exported (Slice A precedent)
  for direct testability.
- **Tests:** 3 new Tier-1 cases in `tests/battleScene.test.ts`, one per
  guard — valid input draws unchanged (repeat calls / both valid encounters
  byte-identical), invalid input throws the named error.
- **Real latent bug found, NOT fixed (per the step's explicit STOP
  instruction):** `drawGeneratedPlayerMaterialize` (ONIX back, **generated**
  route, §1b) applies the same ONIX-only `playerMaterializeSettleY2`/
  `TintCoeff` tables regardless of the real per-round player species —
  confirmed this is reachable **today**, not just hypothetically: the
  already-green `factoryBattleStartIntro.test.ts` "renders every lifecycle
  phase..." case drives a KADABRA-led player party through this exact
  branch at elapsed 710/714. A naive throw guard there would crash that
  passing test. Left documented in place (comment citing this finding),
  deliberately un-guarded — guarding without fixing the underlying
  wrong-table application would only convert a silent bug into a crash on
  ordinary generated-round play. **Needs a real decision/fix, not a guard**
  — candidate: thread `art.speciesSymbol` and skip/zero the ONIX-only
  offsets for non-ONIX species until a real per-species back hand-fit
  exists (mirrors how the already-generic sibling call site at
  `battleScene.ts:34450` handles this via its `canonicalIncoming` check).
- **Next:** ISSUES #71 remaining: fix the `drawGeneratedPlayerMaterialize`
  latent bug above (new, not previously tracked); Slice D (per-tick front
  playback, gated on animation lane's rung-3 dispatcher); §1e's 56/58
  move-window patch-site retirement. Cross-lane dispatcher ask stays open.
- **Notes:** no PAPERCUT this step beyond the reachability analysis time
  itself (worth it — it caught a real bug before a guard would have shipped
  a crash).

---
