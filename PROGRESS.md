# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 784 — [SUPERVISOR 2026-07-31 round 4] M4 (rank-4 slice 1) + S5 (#58 core fix) verified and merged; round 5 dispatching

- **State:** master = M4's three commits + S5's `594442e6` merged
  (`8cc0ccaa`); union `npm test`+`npm run build` gate running at commit
  time — result in the next entry if not amended. Supervisor
  independently re-ran turn6-rockslide-a **255/255**, turn7-rockslide-b
  **256/256**, turn8-bind-a **256/256** post-M4, and the statStages +
  renamed turn67 equivalence tests **16/16** post-merge (S5 pre-verified
  34/34 in-worktree incl. ratchet before merge). Worktree/branch
  cleaned; only `animation-main` remains.
- **Headline:** rank-4 slice 1 flipped (`174cc388`) and #58's core
  threading fixed same-round (S5, 3.6 min, real-fixture pin 156→113 at
  recorded RNG). #58 trimmed to its retire-the-local-pipeline remainder;
  #39 rank-4 prose updated. M4 also fixed the same appRoute trace-gap
  class for all ten turn6/7/8 traces (`e3a7f486`, third recurrence —
  turn5 `9929caf1`, turn13 `bd1d6beb` precedents).
- **Next:** round 5 — M5 = #58 remainder retire (recipe `14c4295b`)
  then rank-4 slice 2 (stat-fall banner) as time allows; S6 = rank-5
  policy-evidence scout (Scene-OFF effect visibility for turns 9-12 —
  the inventory's blocked-work item; evidence + proposal doc,
  new-files-only, no policy decision made unilaterally).

---
## 783 — [BOUNDED MAIN WORKER 2026-07-31 ~10:10] #39 rank-4 slice 1 landed: turn-6/7 ROCK_SLIDE tails flipped

- **State:** `npx tsc --noEmit` clean; focused suite (renamed
  turn67RockSlidePresentationStagingEquivalence, executableFrontierRatchet,
  battleScene, battleMenu, battleMenuIdle, battle2CommandAdapterEquivalence,
  fightSubmenu, battleSetup, destinCanonicalReplacements,
  turn13/turn5ResolutionAdapterEquivalence) **539/539 green**, no new
  ratchet barriers, no new canonical-recording imports. Tree clean at this
  commit. Full `npm test`/`npm run build` intentionally not run (side
  worktree `side-20260731-100323` live concurrently, per brief).
- **Did (2 commits):** (1) fixed a blocking papercut: all ten turn6/7/8
  rank-4 compare traces lacked `appRoute`, same class `9929caf1` fixed for
  turn5-*.json — two (`turn6-featherdance`/`turn6-feathers`) crashed
  outright through the generated-orchestrator's own unrelated unfinished
  resolver, the rest silently mismatched; adding the field alone restored
  every trace to its expected baseline, zero source changes. (2) promoted
  `turn67RockSlidePresentationStagingPreview.ts` → `turn67RockSlide
  PresentationStaging.ts` (rank-1/2/3's own pattern) and flipped
  `battleScene.ts`'s turn-6/7 ROCK_SLIDE HP endpoints
  (`TURN6/7_PIDGEOTTO_AFTER_ROCKSLIDE_HP`, `:11038`/`:11302`) and
  attack-kickoff text (new `TURN6/7_ROCKSLIDE_ATTACK_LINE1/2`, replacing the
  shared `ROCK_SLIDE_LINE1/LINE2` hand literals at those two call sites
  only — every other turn's own ROCK_SLIDE window still reads them
  directly, untouched) onto the adapter's real staged facts.
- **All mandated pins hold exactly:** turn6-featherdance 90/90,
  turn6-feathers 235/235, turn6-rockslide-a/b 255/255 105/105,
  turn7-rockslide-a/b/c/d 256/256/256/19, turn8-bind-a/b 256/66. Insurance
  pins held: turn5-rockslide 256/256, turn5-faint 110/110, turn5-switchin
  241/241, turn5-sitrus-a/b/c/d 110/82/181/133, interactive-generated-
  intro-off 715/715, battle-command-generated-off 128/128.
- **Next:** #58 (shared helper drops `statStages`) is still open, owned by
  whoever picks it up — not touched this step (this module's own local
  pipeline workaround stays). Remaining rank-4 slices per
  `docs/rank4-prep-scout.md`: slice 2 (turn-6 stat-fall banner, §2.3's
  named blocker), slice 3 (turn-7/8's own repeat FEATHER_DANCE staging,
  two new modules), slice 5 (turn-8 BIND kickoff+miss, needs a new bridge
  shape + entry-label parameter). Then retire this module's own local
  `statStages` workaround once #58 lands (recipe `14c4295b`).
- **Notes:** no papercuts beyond the one fixed above (already banked into
  the commit, not left as friction).

---
## 782 — [SUPERVISOR 2026-07-31 round 3] M3 (#56 idle-bounce falsification banked) + S4 (rank-4 groundwork + NEW #58) verified and merged

- **State:** master = M3 (test+docs only, verified no production change;
  instrument test re-run 3/3 by supervisor) + S4's `1c015a37` merged
  (`7ddaa69c`); S4's 20 preview-equivalence tests + ratchet re-run green
  in-worktree by supervisor before merge; worktree/branch cleaned. Union
  gate for this round runs with round 4 (docs-and-new-files-only delta
  since the last green gate).
- **M3 (#56 idle-bounce):** decisive instrument = the probe doc's third
  branch — deltas UNEQUAL (+67 YOSHI vs +139 MAGNETON), flat-constant
  app bug falsified, `BATTLE_COMMAND_ACTION_ENTER_DELAY` ruled out on
  magnitude; NO production change (correct per decision rule). Banked:
  committed instrument test + a narrower reversed-order gap lead (doc Q2
  addendum). All four dense pins reconfirmed unchanged.
- **S4 (rank-4 groundwork):** turn-6/7 ROCK_SLIDE-tail preview adapter
  equivalence-proven (156→113, 113→82; attack lines via STRINGID_
  USEDMOVE). **Found #58** (filed): shared staging helper also drops
  `statStages` — live-proven 156→71 wrong damage vs real 156→113;
  same class as #57, same fix recipe.
- **Docs:** #58 filed; #56 item 2 rewritten (idle-bounce closed
  no-app-bug; 444/536 + reversed-gap lead + item-1 +6 route term remain).
- **Next:** round 4 — M4 = rank-4 slice-1 flip (consume S4's adapter);
  S5 = #58 fix (additive statStages threading + pin, existing callers
  bit-identical). Then retire the preview's local pipeline (recipe
  `14c4295b`), then remaining rank-4 slices / Gate 6 breadth.
