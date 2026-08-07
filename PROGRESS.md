# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 969 — [supervisor WIND-DOWN, 2026-08-06] Session summary: 6 workers / 3 rounds — #78 switch window CLOSED 221/221, #80 rank 5 bound, postwin RECORD/RETIRE bound 204/204+211/211 incl. the YES/NO window, #81 freeze question ANSWERED (route-dependent), #82 filed

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **754 files / 7141 passed / 1 skipped** (+9 tests today),
  `npm run build` green.
  Compare specs re-verified by supervisor this session:
  `mid-battle-switch-dense-a-off` **221/221** (was 95), `postwin-record-off`
  **204/204** (new), `postwin-retire-off` **211/211** (new),
  `battle-command-generated-off` **128/128**, `win-go-on-scout-off`
  **143/143**, `party-menu-status-item-off` banked red baseline
  9234-9306px/frame. `animation-main`: nothing to fold at orient or
  wind-down. No worker worktrees/branches left. DEFERRED.md: no open
  entries. Oracle-freshness FAIL at orient was again the documented
  docs-only false positive.
- **Did (6 DeepSeek workers: 3 main, 3 side; 4 cap-kills, all salvaged to
  zero loss):** MAIN — (967) #80 rank 5: status + held-item icons per the
  banked §7 plan, target bboxes glyph-exact, level-text suppression;
  (968a `fdb49a4d`) postwin RECORD/RETIRE question branches
  (dismiss=default-NO re-ask, cursor handoff, specs initially 192/188 with
  the question-hold excluded); (968b `2f579d21`+`8286ba97`) the exclusion
  was explained: the oracle DRAWS a held YES/NO window (supervisor
  pixel-check vs doc §3's over-general "not visible" claim) — bound by
  reusing the Lobby prompt machinery, specs extended to FULL coverage, and
  the during-hold UP+A probe proved YES IS REACHABLE (RECORD-YES →
  SaveBattle; RETIRE-YES → WarpToLobbyLost; ground truth banked, nothing
  bound). SIDE — (#78) two-worker chain: salvage `c8aecf8c` (particle
  destroy-tick model + emerge acc-58 render gate) then `490197ab`+
  `87165ead`+`7dc9cfff`: ball-throw window byte-exact (RAM throw table +
  spin matrix + 1-tick lag + terrain clip), particle alive-set boundary +
  stolen-tick freeze, spec widened 95→221 all-match; (#81 probe
  `505fca40`) battle-1 freeze schedule measured RAM+pixel cross-validated:
  verdict (b) ROUTE-DEPENDENT (battle-1 = 0-frame opening / 2-frame
  submenu-open / two 1-frame B-close freezes — not torment's 4/1/1), so
  the shared constant stays; verify script PASS twice + supervisor rerun.
- **Supervisor corrections this session:** PROGRESS 965/966's #78 residual
  lists were understated (the 1140-1185 ball-throw band was red and
  unlisted — fresh differential-vs-stash measurement before rebriefing);
  ISSUES #80 item (5) was marked CLOSED in place by a worker (now
  removed); doc §3's "no YES/NO window" over-generalization corrected in
  place (§3a). Legacy `compare:factory-terminal-loss` family found
  desynced 0/210 wholesale — proven pre-existing (identical at
  session-start commit), filed as **ISSUES #82** (superseded by modern
  specs; retarget-or-retire is a bounded future step).
- **Next (ordered):** (1) #81's 3 phase-boundary frames via a route-scoped
  freeze schedule per the probe doc (+ the 2 message-pacing frames);
  (2) postwin RECORD-YES/RETIRE-YES binds from the banked `8286ba97`
  ground truth (RETIRE-YES reuses the existing loss-lobby flow per the
  standing user decision); (3) #80 rank 6 (cursor/ball/selection + fade;
  note the cursor-open rule + Lv50 ink findings in PROGRESS 967);
  (4) lobby walkable + REST guard (scout brief drafted this session, not
  launched); (5) #78's 1256-1407 fight-menu window (overlaps #81 pacing).
- **Notes:** DeepSeek cap economics this session: 60-min caps were killed
  at the suite/docs tail 4-of-5 times while the work itself was green and
  committed — the standing salvage recipes (verify-from-JSONL + fresh
  reruns; commit-tail suite-run) recovered all four at ~10-20 min each.
  Consider 45-min caps with an explicit "no full suite, supervisor runs
  it" clause for DeepSeek next session. Vitest contention: my background
  full suite overlapped a worker's own suite once and pushed it past its
  10-min shell timeout — keep supervisor suites off the box while any
  worker is in its finish phase. No DEFERRED entries; no PAPERCUTS added.

## 968 — [bounded MAIN worker, 2026-08-06] postwin RECORD/RETIRE question window bound 204/204 + 211/211; during-hold YES ground truth banked

Covers the prior step (fdb49a4d, its PROGRESS entry was lost to a cap-kill)
plus this step (2f579d21 + 8286ba97).

- **State:** master `8286ba97`, clean. Typecheck green; `npm run test:smoke`
  **347/347**. `postwin-record-off` **204/204**, `postwin-retire-off`
  **211/211** (both extended from 192/192 / 188/188 to the full fixture
  capture sets), `win-go-on-scout-off` **143/143** — all unchanged regressions.
- **Did (fdb49a4d, prior step):** bound the postwin RECORD/RETIRE question
  branches (dismiss = default-NO re-ask) — continuation cursor one-VBlank
  display handoff, question phase at 1 glyph/tick from edge+5 with
  wait-cursor/YES-NO hold, dismiss-A resolves default NO and re-enters the
  ReadyFor2ndOpponent reprint. Tier-1 pins in `tests/postwin.test.ts`.
  Specs green at 192/192 / 188/188 **excluding** the question-hold frames
  (record 6711-6722, retire 6712-6734) because the app drew no YES/NO window.
- **Did (this step, Part 1 — `2f579d21`):** measured the held window on the
  oracle (compare `--capture-range`): appears **fully-formed in one frame** at
  canonical **6711** (record) / **6712** (retire), bbox **(161,65)-(206,110)**
  = the Lobby record prompt's 4×4 std-window at tile (20,8), cursor on **NO**
  (default), **1828 px/frame stable**; teardown clears with the message box
  (record gone 6723, retire gone 6735). Reused that shared machinery in
  `renderPostwinState` (`drawStandardWindowFrame(fb,160,64,4,4)` + YES/NO text
  + cursor at 168,89) gated on `postwinQuestionWindowVisible` with teardown
  `dDelay<=1` — the app's existing `POSTWIN_QUESTION_WINDOW_DELAYS` constants
  already land on the oracle's appear frames. Extended both specs to the full
  fixture sets: **204/204 + 211/211**. New Tier-1 render pin (window appears
  with cursor on NO; dismiss clears it) red-verified via stash.
- **Did (this step, Part 2 — `8286ba97`, ground truth only, no binding):**
  two scratch probes (`scratch-postwin-{record,retire}-up-a-probe.json`):
  verbatim prefixes + UP ~4 frames into the hold + A two frames later, dense
  captures over ~125 frames, **each twice-run byte-identical**. Verdict: **UP
  during the hold DOES move the cursor to YES** (record visible 6717, retire
  6718); **A-on-YES takes a genuinely new path** — RECORD → `SaveBattle`
  (save-SE hold 6721-6741, then "{PLAYER}'s battle was recorded / on the
  FRONTIER PASS."), RETIRE → `WarpToLobbyLost` (fade-to-black 6724-6738,
  black hold, lobby arrival typing the LostChallenge "Thank you for
  participating!" chain = the LOSS-ending flow the app already renders).
- **Docs:** `docs/postwin-record-retire-ground-truth.md` §3 gains a dated
  correction subsection (§3a): the window IS visible during the hold
  (over-generalization corrected; §3's no-window claim holds only
  post-dismiss), citing the measured appear/teardown frames + the probe
  verdict. ISSUES.md untouched (supervisor owns the related trims).
- **Next:** the RECORD YES (save) and RETIRE YES (lobby warp) routes are now
  ground-truthed but unbound — decide whether to bind them (RETIRE YES
  converges on the existing LOSS lobby flow); then per PROGRESS 966's ordered
  list: #80 rank 6 cursor/ball/fade, lobby walkable + REST guard.
- **Notes:** full `npm test` + `npm run build` NOT run this step (cap); smoke
  + typecheck + the three specs are the last verified tiers. PAPERCUT: none.

## 967 — [bounded MAIN worker, 2026-08-06] #80 rank 5 bound: in-battle party-menu status + held-item icons (spec 0/251->0/251 with 453px/frame off, all target bboxes glyph-exact)

- **State:** master `3e1d718e`, clean. Typecheck green; full `npm test`
  **754 files / 7132 passed / 1 skipped**; `npm run build` green.
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **95/95**, `fight-menu-chrome-torment-off` **52/57** — all unchanged.
- **Did (per `docs/party-menu-status-item-ground-truth.md` §7, one commit per
  rung):** (1) compare spec + app stage
  `party-menu-status-item-off` landed (mirrors `midBattleSwitchDenseOffStage`
  with the fixture's items 200/217/183 + opponent THUNDER_WAVE x4); oracle
  runs 251/251 twice-stable, app baseline 9687-9759px/frame (status glyphs
  rendered as Lv50 text). (2) `BattlePartySelectRow` + both state builders
  thread `item` (source party record) + `primaryStatusFromStatus1` (variant
  names poison|paralyzed|sleep|frozen|burn; Toxic collapses to poison;
  sleep-over-paralysis precedence) — forced-party projection threads them via
  `PartySelectMember` (sourced from the corpus rental record, so the canonical
  constant's items synced to 142/221/179). (3) `drawHeldItemIcon` (banked
  `party-menu-held-item.json` frames.item 8x8 at `heldItem` centers
  (20,50)/(108,28)/(108,52), hidden for ITEM_NONE) + `drawStatusIcon` (banked
  `party-menu-content.json` statusIcons 32x8 frame at `status` centers,
  drawn only for non-none) via a shared center-based `blitIconFrame`; Lv50
  gated on `status === null` (mirrors `DisplayPartyPokemonLevelCheck`).
  Draw order per sPartyMenuSpriteCoords: icon, heldItem, status, pokeball.
- **Oracle/acceptance:** frame-2150 target bboxes glyph-exact — status
  x40-59/y48-55 + x126-145/y23-30 (156/156 glyph pixels per the doc's own
  template measure) and item x17-23/y47-53, x105-111/y25-31, x105-111/y49-55
  (slot 2 fully byte-exact). Slot 2 keeps Lv50; slots 0/1 show the PRZ glyph
  and no level text (level-rect ink counts match the oracle 208/208 and
  137/137). Per-frame diffs 2050-2300 drop to **9234-9306px**, `<=` the
  rung-1 baseline on all 251 frames (0 frames worse; max reduction 453px).
  Residual classes (all pre-existing, out of scope): (a) the rank-6 cursor
  selected/unselected wash + card-text swap (~2180px; oracle cursor sits on
  slot 0, app on slot 1), incl. the 4 corner pixels per status bbox + 2 per
  item bbox; (b) the staged-RATTATA mon-icon/box palette class (~4-5kpx);
  (c) Lv50/HP-text ink class (~1.2kpx, app prints Lv50 blue vs oracle's
  white). Tier-1 pins: 4 new in `tests/inbattlePartyMenuVisualBind.test.ts`
  (item-on/off centers, variant selection paralyzed-vs-sleep, Lv50
  suppression via pixel (141,29), status1->variant mapping), all 3 pixel
  pins red-verified (3 failed with the draw change stashed).
- **Next:** #80 rank 6 (cursor/ball/selection + party-menu fade pixels),
  then the RECORD/RETIRE binds and lobby walkable + REST guard per PROGRESS
  966's ordered list.
- **Notes:** the app's party-menu-open cursor rule (active mon) differs from
  the oracle's (slot 0) — rank-6 cursor scope, flagged not fixed. The oracle
  prints Lv50 in white vs the app's card-text ink — pre-existing
  `drawRowText` color class, deliberately not changed this step (would risk
  the pinned 128/128). PAPERCUT: none new.
