# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 916 — [supervisor, 2026-08-04 ~14:35] R1 landed: #73 wait-cursor gating (LOSS 1/236 → 175/236, cap-kill salvage) + selection-rejection scout merged; R2 launching (Magnitude MAIN + antecedent-boundary probe SIDE)

- **State:** master `5e7457b1` + this docs commit. Full `npm test` 716
  files green at the salvage (1 file re-verified after the pin fix),
  `npm run build` green, differential canary 128/128 vs `b1a7bd34`.
- **Did:** (1) MAIN #73: worker ran to its full 60-min cap with ZERO
  commits but a coherent 247-line tree — supervisor verified and landed
  the salvage (`5e7457b1`): wait-cursor mechanism source-confirmed (two
  quote ids use `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS`→`TextPrinterWait`, no
  arrow; `PLAYERDEFEATEDTRAINER1` keeps its `\p` cursor — WIN-side
  load-bearing), LOSS compare 1/236 → **175/236** (worker 2×, supervisor
  1× independent). One `toEqual` pin (battleResolutionPresentation.test.ts)
  missed the new `noCursor` field — the exact gap the worker was fixing at
  cap; supervisor completed it. Residual 61 frames = held-cursor freeze
  (38) + swap-edge typing cascade (23), mechanisms itemized in the loss
  doc §6, not guess-fit. (2) SIDE scout landed+merged (`e7c58649`):
  selection-rejection subsystem mapped — 6 causes, last-true-wins,
  `printselectionstring` flashes with NO button wait; engine port has no
  mask gaps; census tool structurally blind to `printselectionstring`
  (new finding); Imprison DEAD, other 5 REACHABLE. ISSUES #72 Torment
  paragraph re-scoped accordingly; recommended slice = advisory
  `describeIllegalMoveSelection` + 4 resolver branches (supervisor to
  schedule).
- **Next:** R2 in flight — MAIN: `STRINGID_MAGNITUDESTRENGTH` (#72's last
  REACHABLE id); SIDE: RAM/pixel probe of the antecedent boundary
  (2985-3060) to give both #73 residual classes source-fidelity numbers.
  Then WIN-side compare wiring (consumes cursor findings), then the
  selection-rejection slice if budget allows. #71 Slice D still gated on
  the animation lane's rung-3 dispatcher (re-check at wind-down fold).
- **Notes:** worker was killed mid-final-suite by the cap, not by any
  error — $16.68/229 turns, high-quality forensics; cap-kill salvage
  recipe applied cleanly. Oracle-freshness FAIL remains the docs-only
  false-positive class (no restart). Play-preview rebuild still queued
  for wind-down.

---
## 915 — [supervisor orient, 2026-08-04 ~13:20] Animation fold (Steel Wing partial + rung-3 directive) → master `b1a7bd34`; union green 716/6,887; R1 launched (#73 wait-cursor MAIN + Torment-scoping SIDE scout)

- **State:** master `b1a7bd34` (fast-forward fold of `animation-main`:
  6 Steel Wing partial commits + the 2026-08-04 rung-3 dispatcher
  directive). Union verification: full `npm test` **716 files / 6,887
  passed / 1 skipped**, `npm run build` green. Animation supervisor is
  live concurrently (started 13:06, same 19:06 deadline, DeepSeek
  workers) — the rung-3 send-out dispatcher has NOT landed yet, so #71
  Slice D stays gated; re-check at the wind-down fold.
- **Did:** folded `animation-main` (clean ff — the animation supervisor
  had already merged master in at its own orient); ran the full union
  suite + build myself. Oracle freshness FAIL judged a docs-only false
  positive (harness commits since both service starts: `d47bff3`
  _template-only + `5251112` docs-only) — no restart, sibling session
  live on 8012.
- **Next:** R1 in flight — MAIN: #73 wait-cursor source read + gating
  fix + the 3-frame swap-edge micro-class (target ≥232/236 honest);
  SIDE: docs-only selection-rejection (Torment) re-scoping scout. Then
  #72 `STRINGID_MAGNITUDESTRENGTH` (brief staged), then #73 WIN-side
  compare wiring, then #71 Slice D if the dispatcher lands mid-session.
- **Notes:** play-preview worktree still serves pre-session `630bf3dc`
  on :5199 — rebuild at wind-down so the user can play today's landings.

---
## 914 — [supervisor wind-down, 2026-08-04 ~11:00, user-requested early close] R3+R4 landed: #72 REACHABLE 10→1 (batch 8, 9 ids), #73 LOSS window to cursor-only residuals + WIN ground truth banked; 7-commit animation fold; final union verification in flight

- **State:** master at the animation fold merge. Session totals: 8 workers
  (4 main + 4 side), 0 lost. Wind-down was user-requested (~10:05, "no
  rush") — both live R4 workers were allowed to finish, nothing killed.
  Final independent full `npm test` + `npm run build` result recorded in
  the wind-down commit message (running at entry-write time; the commit
  only lands if green). No open DEFERRED entries.
- **Did (this supervisor round):** (1) merged side R4 (WIN-side terminal
  fixture `win-terminal-explosion-dusclops-off.json`, twice-identical
  241/241, + `docs/terminal-seam-win-window-ground-truth.md` — key finding:
  the WIN script never recalls the opponent mon, and the terminal needs
  three serial dismiss presses); (2) **corrected entry 913's inverted
  compare fraction** (worker wrote "235/236 matched"; honest number is
  1/236 fully matched with all other frames reduced to cursor-glyph-scale
  residuals — see 913's corrected body and ISSUES #73 for the
  supervisor-measured class distribution incl. the 3-frame swap-edge
  micro-class the worker's itemization missed); (3) folded `animation-main`
  (7 commits: back shake-flash-yellow + JoltRight + red/green/blue
  shake-glow selector acceptances); (4) reran the LOSS compare post-fold
  myself (same residual classes — fold did not disturb Scene-OFF rendering).
- **Next (recommended order):** #73: wait-cursor source read (does the ROM
  terminal-quote printer ever spawn the cursor task?), the 3-frame
  swap-edge micro-class, then the WIN-side compare (wiring pattern
  established, fixture banked). #72: `STRINGID_MAGNITUDESTRENGTH` RNG-roll
  capture plumbing (last REACHABLE id). #71 Slice D: still gated on the
  animation lane's rung-3 dispatcher (not landed as of 10:40). Torment
  selection-time-rejection subsystem still needs supervisor re-scoping
  (#72 note).
- **Addendum (2026-08-04 evening, user directive via interactive session):**
  the animation lane's next bounded step is now the rung-3 send-out
  dispatcher (directive recorded as `ANIMATION_PROGRESS.md`'s top entry on
  `animation-main`, commit `420a7578`; ISSUES #71 updated in the same
  note). `animation-main` is 7 commits ahead of master (6 Steel Wing
  partial + the directive) — fold at orient per protocol. #71 Slice D
  unblocks once the dispatcher lands. On the Magnitude "Next" item above:
  the kernel already captures the roll (`rulesContext.
  battleTextBuff1ByteNumber`, `battleScriptRankedBatch1Opcode.ts:130`) —
  the remaining work is the presentation-side resolver entry (the
  HITXTIMES pattern, see `battleResolutionPresentation.ts:1648`'s own
  comment), smaller than 912's "new plumbing" phrasing suggests.
- **Notes:** main R1's launcher tee-pipeline broke mid-run producing a
  spurious exit-1 while launcher+worker were healthy (diagnosed via
  process-tree + JSONL growth; zero kills; later launches redirect with
  `>` instead of piping). One discipline slip acknowledged: a docs-only
  side merge landed while a main worker was live (no harm; rule re-affirmed).
  The animation supervisor was live concurrently earlier (~07:40-08:45);
  its nested worker worktree under `.worktrees/animation-main/` is theirs
  to clean. Play-preview worktree still serves the pre-session build
  (630bf3dc) on :5199 — rebuild it next session if the user wants to play
  today's landings. **USER-OWNED, do not clean or merge:**
  `.worktrees/deepseek-worker` (branch `codex/deepseek-worker`, 2 commits
  of launcher/profile work: DeepSeek V4 Flash worker profile + independent
  supervisor/sub-agent selection) appeared during this session — it is the
  user's own in-flight harness work, not a stale lane worktree.
