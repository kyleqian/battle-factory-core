# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 931 — [supervisor wind-down, 2026-08-04 ~19:55] Session close: #74 closed + WIN window 389/389 + selection-rejection slice landed & ROM-verified + post-terminal ground truth banked; final union 724 files / 6,954 green

- **State:** master `fd8910a5` + this docs commit. Final independent union:
  full `npm test` **724 files / 6,954 passed / 1 skipped**, `npm run build`
  green. Windows: WIN **389/389**, LOSS **236/236**, YOSHI **700/751** /
  MAGNETON **703/751** (baselines restored). Play-preview worktree advanced
  to `fd8910a5`, rebuilt, serving 200 on :5199. Working tree clean. **No
  open DEFERRED entries.** Worktrees: only the permanent `animation-main`
  (whose own live session has a worker at `animation-20260804-193008` —
  theirs to clean) and the intentional `play-preview`.
- **Session totals:** 3 rounds, 6 workers (3 main / 3 side), 0 lost, all
  landed. #74 CLOSED (`MATERIALIZE_Y2_TABLE` 11-of-12 tail-tick, RAM-
  confirmed, prediction-pinned exact restore). #73: WIN 65/65→389/389
  (pure data; quote hold + real dismiss), scaffold party-identity crash
  fixed generically (`hp:0`), and the REAL remaining blocker mapped —
  post-`finishBattle` presentation timing (probe doc §6). #72 fully
  settled: option-(b) advisory slice (six-cause resolver, 4 STRINGIDs,
  20 red-verified tests) + 3 of 4 causes ROM-verified byte-for-byte
  (Torment, Choice Band, no-PP; PKMNHASNOMOVESLEFT staging cost
  documented). Post-terminal return ground truth banked
  (`docs/post-terminal-return-to-lobby-ground-truth.md`): mid-streak WIN
  → PreBattleRoom (not Lobby), 108-tick shared fade/warp sequence,
  5-slice implementation plan. TWO animation folds (STEEL_WING 108/276,
  TAIL_WHIP 109/276 exact) — second fold resolved the
  `factoryAnimationInventory` pin conflict to the coverage-JSON side
  (109), after R3 caught the STEEL_WING fold's stale pin (107→108).
- **Next session (recommended order):** (1) post-terminal presentation:
  the scout's 5-slice plan — slice 1 (shared 108-tick fade/warp machinery)
  proves on BOTH windows from one implementation; slice 4's `postwin.ts`
  creation-gate investigation (`core.ts:577-604`) unlocks WIN. (2) #73
  window extensions ride on those slices. (3) #71 §1e + coordinated
  hand-fit retirements. Standing: #39, #55.
- **Notes:** animation-fold verification now needs
  `tests/animation/factoryAnimationInventory.test.ts` explicitly (stale
  coverage-summary pin is a 2-occurrence class). Never merge into the main
  tree while a suite runs there (killed my own background suite before the
  TAIL_WHIP fold). Oracle-freshness FAIL at orient was the docs-only
  false-positive class again. PAPERCUTS: line-pin census entry added;
  full-suite timeout entry bumped to Hits: 6.

---
## 930 — [bounded MAIN worker, 2026-08-04 ~19:45] ISSUES #72 oracle-verification gap closed for NOPPLEFT + ITEMALLOWSONLYYMOVE; PKMNHASNOMOVESLEFT skipped (documented)

- **State:** master + this docs commit. `npm test` green (see final gate
  below), `npm run build` green. No `src/` changes — both resolvers already
  matched the real ROM.
- **Did:** staged two `mechanicLab overrides.parties` battle-scene-off
  traces (`tools/battle-lab/mechanic-selection-reject-{choice-band,no-pp}-
  off.json`) and read the captured PNG text directly, cross-checked against
  the manifest's semantic `pp` state to confirm the staged precondition.
  **ITEMALLOWSONLYYMOVE:** CHANSEY holds Choice Band, turn 1 TACKLE
  (locks), turn 2 attempts GROWL — ROM prints "CHOICE BAND allows the / use
  of only TACKLE!" byte-for-byte matching the resolver and its existing
  Tier-1 pin. **NOPPLEFT:** CHANSEY's SUNNY DAY (5 PP, the cheapest
  depletable move short of Sketch) genuinely exhausted 5→0 PP over 5 real
  turns (`overrides.parties` can't inject PP — it's always ROM-derived from
  base PP × PP Ups), then reselected with TACKLE still legal so the menu
  stayed open — ROM prints "There's no PP left for / this move!"
  byte-for-byte matching the resolver. Both MATCH, no src fix needed.
  Receipts banked: `docs/probes/selection-rejection-oracle-verification/`
  (README + both PNGs). ISSUES #72's oracle-verified paragraph extended in
  place. **PKMNHASNOMOVESLEFT not attempted** — needs all four move slots
  at 0 PP simultaneously (4×5=20 turns via the cheap-status-move vehicle, or
  a riskier 4-turn Sketch path gated on an unverified speed-ordering
  argument); documented precisely in the probe doc's closing section for a
  future step with more headroom.
- **Next:** #72's settled record is now fully oracle-verified except
  PKMNHASNOMOVESLEFT (open, low-priority — advisory-only text, never
  reachable through this engine's own `submitBattleDecision` boundary
  today). Next candidate: verify a speed-ordering fixture (player IVs/nature
  vs. a slow opponent) once, then stage the 4-Sketch-turn NOPPLEFT-shaped
  trace for PKMNHASNOMOVESLEFT.
- **Notes:** confirmed the Torment probe from `05d7dccf` never banked its
  trace/PNGs to disk (checked `docs/probes/`, git history, and
  `tools/battle-lab/` — nothing matches its BUTTERFREE/MURKROW scenario);
  this step's own two receipts are the first banked selection-rejection
  oracle evidence on disk. `PAPERCUT:` none new this step — the flagged
  `BattleScriptPartyMemberInput.moves`-defaults-PP-to-0 papercut didn't
  apply here (that's the bench-party-member override path; `overrides.
  parties`' active-battler PP derivation used throughout this step is a
  different, already-correct code path).

---
## 929 — [supervisor, 2026-08-04 ~19:10] R2 both lanes landed + animation STEEL_WING fold; #72 fully closed (retitled settled record); R3 launched (post-terminal timing scout + no-PP/Choice-lock oracle verification)

- **State:** master `5993ff41` + this docs commit. Union checks post-merge:
  `win-terminal-window-off` **389/389**, `loss-terminal-window-off`
  **236/236**, smoke 347/347, `steelWingEvidence` 2/2, new
  `battleScriptSelectionRejection` 20/20. Workers' own full-suite gates:
  MAIN 722 files / 6,947 passed / 1 skipped (run twice) at `05d7dccf`;
  SIDE 721 files / 6,927 at `5ef59e60`. Build green both.
- **Did:** (1) verified + kept R2-MAIN's selection-rejection advisory slice
  (#72 remainder: shared six-cause resolver mirroring
  `TrySetCantSelectMoveBattleScript` incl. two source asymmetries the
  bitmask lacks; `rejectionReasonBySlot`; 4 STRINGIDs; Torment
  oracle-verified byte-for-byte; boundary contract untouched). Retitled
  #72 to a settled record (FATAL-guard user decision + the probe's
  button-gated dismiss-timing correction retained for future option-(a)).
  (2) verified + merged R2-SIDE (`5ef59e60`): terminal-scaffold party
  identity reconciled generically (`hp:0`), §5 crash closed, windows hold
  389/389 + 236/236; NEW blocker documented in probe doc §6 — the
  post-`finishBattle` return-to-lobby presentation has no real timing
  model (WIN phase renders black; LOSS races to lobby in 28 ticks vs
  oracle 800+). (3) folded `animation-main` (STEEL_WING exact, 108/276
  exact, no main-program ask in its top entry). (4) PAPERCUTS: added
  line-pin census entry (R2 worker flag); R1's suspected-slow `npm test`
  was load, not a regression — not filed.
- **Next:** R3 in flight — SIDE: read-only dense-probe scout of the
  post-terminal span (WIN 5012+, LOSS 3232+) producing the
  return-to-lobby ground-truth timeline + consumer map (docs only, arms
  the next session's implementation). MAIN: stage the two skipped
  oracle-verification traces for `NOPPLEFT`/`ITEMALLOWSONLYYMOVE` (and
  `PKMNHASNOMOVESLEFT` if stageable) against the real ROM. Then
  wind-down: fold re-check, ONE full union suite, preview rebuild.
- **Notes:** #73's next implementation step is the §6 subsystem (src work,
  next session's headline candidate). Deadline 21:17 holds comfortably.
