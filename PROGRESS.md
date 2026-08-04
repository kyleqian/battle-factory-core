# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 913 — [bounded MAIN worker, 2026-08-04 ~10:30; numbers supervisor-corrected] #73 LOSS terminal window: all three diagnosed classes fixed; only small cursor-glyph-scale residuals remain (1/236 frames fully match, was 0/236)

- **State:** master `c8cc6cd4` + this step's uncommitted-until-now docs/tools
  changes. Full `npm test` green (**703 files / 6,801 passed / 1 skipped**,
  0 failures), `npm run build` green, `compare:differential --
  battle-command-generated-off.json --base e62cc253 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** eliminated all three mismatch classes the morning's compare
  wiring (`29e5cb3d`) diagnosed at a 0/236 baseline. (A) **genuine render
  gap, fixed in `src`** (commit `c8cc6cd4`): recall
  (`VARIOUS_RETURN_OPPONENT_MON1/2` → real `CONTROLLER_RETURNMONTOBALL`,
  `battle_controller_opponent.c`'s `OpponentHandleReturnMonToBall`/
  `FreeMonSpriteAfterSwitchOutAnim`) now clears the healthbox with the
  sprite, generically distinguished from the unrelated
  `CONTROLLER_SPRITEINVISIBILITY` (Dig/Fly) receipt via the emitting
  instruction's own opcode name (`"sprite-visibility"` command's new
  `recall` flag) — red-verified, full details in the commit. (B)+(C)
  **scaffold artifacts, fixed in `tools/compare/appTrace.ts` only**: the
  antecedent "MURKROW fainted!" box and the player's all-fainted empty field
  are the same real event (MURKROW's own Explosion self-KO), now replayed
  through the real `health-bar-update -> hp-change -> faint-animation ->
  STRINGID_ATTACKERFAINTED` chain ahead of the recall/slide/win-text events,
  hand-set to `commandIndex: 4` outside real ticks. Result: `npm run compare
  -- loss-terminal-window-off --summary`: **1/236 frames fully matched**
  (frame 3231, both times — the worker's original entry inverted this as
  "235/236 matched"; supervisor-corrected), with the other 235 frames
  reduced from the ~7,700-8,300px baseline diffs to the small residual
  classes below, byte-identical across two independent runs (and a third
  supervisor rerun post-fold, run-2026-08-04-17-32-22Z-58459: 212 frames
  exactly 37px static cursor glyph, ~20 frames 56-139px glyph animation,
  and 3 frames 3034-3036 at ~587-589px — the antecedent→quote text-swap
  edge, a distinct micro-class the original entry's "only the small fixed
  region" claim missed).
- **Next:** one remaining class is itemized in ISSUES #73, not fixed: a
  generic wait-cursor (heart glyph, `battleScene.ts:34009-34017`) draws for
  every `advance: "button"` message once ready, but the oracle shows none at
  all for the `STRINGID_TRAINER1WINTEXT` quote across the full window
  (including ~174 frames after fully typed) — likely a distinct real
  printer path for terminal quotes vs. ordinary battle messages
  (`STRINGID_TARGETFAINTED` etc.), unconfirmed pending a source read. LOSS
  half of #73 is otherwise closed. WIN half stays open (side lane owns its
  ground-truth staging concurrently) and will likely hit the same
  wait-cursor finding.
- **Notes:** no `tools/battle-lab/` edits, no WIN-side ground-truth doc, no
  kernel machine file edits, no #72 work — all per this step's brief.
  `npm test`'s ~10-minute wall time both runs this session auto-backgrounded
  past the Bash tool's 120s default (known PAPERCUT class); recovered via
  `TaskOutput` polling to real completion each time, per entry 912's
  precedent.

---
## 912 — [bounded MAIN worker, 2026-08-04 ~10:20] #72 batch 8: full REACHABLE-10 hard tail landed (9 ids), only STRINGID_MAGNITUDESTRENGTH remains

- **State:** master `cf6579e9`. Full `npm test` green (**703 files /
  6,801 passed / 1 skipped**, 0 failures), `npm run build` green.
- **Did:** followed `docs/issue72-hard-tail-scout.md`'s per-id predictions
  (committed this morning) to land the entire REACHABLE-10 list except
  `STRINGID_MAGNITUDESTRENGTH` (explicitly out of scope — new RNG-roll
  capture plumbing): `STRINGID_PKMNPROTECTEDBY` (Sturdy vs. OHKO, confirmed
  deterministic not RNG-gated), `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` (Sand
  Stream, reused the end3-unblocked Tyranitar switch-in staging),
  `STRINGID_PKMNSXBLOCKSY2` (Perish Song vs. Soundproof), `STRINGID_PKMNTOOKFOE`
  + `STRINGID_PKMNLOSTPPGRUDGE` (Destiny Bond + Grudge, real 2-turn
  cast-then-counter-kill repros, player-faster speed order), `STRINGID_PKMNREGAINEDHEALTH`
  (Recover's self-heal, the cheapest of 3 labels — full `sourceLabelOf`
  3-label dispatch implemented per scout §3d, only the Recover branch tested),
  `STRINGID_PKMNHUNGONWITHX` (Focus Band, scout's `rngSeed: 62` staging
  reproduced on the first try), `STRINGID_PKMNSAFEGUARDEXPIRED` (real 5-turn
  expiry repro, not the cheaper direct-rulesContext-surgery shortcut),
  `STRINGID_PKMNTOOKATTACK` (Future Sight, real 3-turn delayed-hit repro).
  All 9 red-verified together via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (`tests/presentationStringIssue72Batch8.test.ts`,
  9 `it`s, every one threw the exact completeness-guard error pre-fix). One
  scout divergence found and corrected: §1d's Grudge staging prose had the
  caster's own move losing PP; both real source
  (`battle_script_commands.c:3016-3030`) and the scout's own §1c code sample
  agree it's the *killing* battler's own move — landed per the correct
  mechanism. Census: **48→39 UNRESOLVED** (exact −9, arithmetic-checked).
  ISSUES #72 REACHABLE trimmed to **1** (`STRINGID_MAGNITUDESTRENGTH` only).
- **Next:** `STRINGID_MAGNITUDESTRENGTH` needs new plumbing (Magnitude's 2-10
  `Random()` roll isn't captured anywhere in `rulesContext` yet) — the last
  #72 REACHABLE id, a bounded standalone follow-up. #73 rung B (oracle-pixel
  coverage over the terminal-seam presentation) remains open per entry 911.
- **Notes:** no `tools/compare/**`, kernel machine file, or `battleScene.ts`/
  `core.ts`/`postwin.ts` edits this step (out of scope per brief); no guard
  softening, no new opcodes. `npm test`'s ~10.7-minute wall time this session
  reflects heavy concurrent CPU contention from the supervisor/animation
  sessions also running — the Bash tool auto-backgrounded the run past its
  120s default timeout as in the known PAPERCUT class; recovered by polling
  the task's own output file to a real completion rather than treating the
  auto-background as data loss.

---
