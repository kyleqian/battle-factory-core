# Animation maintenance — include Open-only Outrage (2026-09-22)

- **State:** Level 50 remains **266/276 exact**, Open-only **0/1 exact**.
  The campaign accounts for **10 ready + 1 blocked** Factory moves: nine
  ready Level 50 moves, then Outrage. Helping Hand's doubles blocker remains.
- **Did:** `4a359de1b` extends derived work selection, queue/blocker/track
  validation, report, and launch policy to Factory tiers. Level 50 ready work
  always precedes Open-only; blocked Level 50 work cannot strand Outrage.
  No move receives new acceptance credit. The user reaffirmed finishing the
  current approach; consider a bounded shared-runtime comparison before any
  future non-Factory expansion, not a rewrite during this campaign.
- **Verification:** Local and Hetzner scoped gates on `4a359de1b` passed:
  **5 files / 18 tests**, typecheck, autonomy wrapper checks, launcher syntax,
  coverage, asset audit, and diff checks. Hetzner Scene-ON oracle is healthy.
  Remote receipts: `/var/lib/pokebench-autonomy/maintenance/20260922-outrage/`.
  Production code/assets/dependencies/configuration remain unchanged from
  `056e9978f`'s **1,411 files / 11,451 tests** and **821-module build** receipt.
  Reuse that baseline plus these scoped gates; only campaign/ledger docs follow.
- **Next:** Resume Extrasensory source + legal bilateral staging + dense
  evidence, then advance the ranked queue through Outrage. Use legal Open-level
  `FRONTIER_MON_DRAGONITE_5` for Outrage and preserve the existing acceptance
  bar. Open-level species geometry remains separate; the 77 outside-Factory
  moves are outside this campaign. The interrupted Extrasensory worker was
  clean at `f5df34bb2`, with no code/evidence to recover; its research log and
  a maintenance note are retained on Hetzner. Campaign end, cadence, provider
  routing, and paused Rust lane are unchanged.

# Animation maintenance — derived work queue and idle-run repair (2026-09-22)

- **State:** Coverage remains **266/276 exact**, **10 unsupported**. The work
  report now accounts for **9 ready + 1 explicitly blocked**. Prior entries
  calling the empty manual list an exhausted/unauthorized queue are superseded.
- **Did:** Commit `c94af4788` derives every unfinished Level 50 move from the
  inventory. The manual list changes priority only; accepted moves leave the
  derived queue automatically. Source-component reuse ranks candidates but
  grants no acceptance. Helping Hand alone has an evidence-backed doubles
  blocker and explicit resume condition. Unchanged, genuinely idle sessions
  now skip full gates and no-change ledger commits under the shared contract.
- **Verification:** Scoped local and Hetzner gates on `c94af4788`: **5 files /
  16 tests** pass, including queue regression cases, inventory/boundary checks,
  audit-byte isolation, and fresh bilateral Helping Hand failure-before-animation
  proof. Typecheck, runner checks, coverage, asset audit, Scene-ON oracle info,
  and diff checks pass. Logs: `/var/lib/pokebench-autonomy/maintenance/20260922/`.
  Production sources/assets/dependencies/configuration are unchanged from
  `056e9978f`'s fresh **1,411 files / 11,451 tests** and **821-module build**
  receipt. Reuse that full baseline plus this scoped tooling receipt; only
  ledger/archive docs follow `c94af4788`.
- **Next:** Dispatch **Extrasensory** (the current first ready move), initially
  source + legal bilateral staging + dense evidence in one bounded assignment.
  Its two components without an exact representative are
  `AnimTask_ExtrasensoryDistortion` and `AnimTask_TransparentCloneGrowAndShrink`;
  shared Psychic backgrounds supply source references, never inherited latch
  or framebuffer proof. Then advance the derived queue. Keep Helping Hand's
  success body unsupported until legal doubles staging exists. Nightmare's
  contest-only arm does not block singles moves. Existing campaign end,
  cadence, provider routing, and paused Rust lane remain unchanged.

# Animation supervisor wind-down — authoritative queue empty, final gates green (2026-09-22 supervisor)

- **State / orient:** Performed the required `git merge --no-edit master` (already up to date at `3f76b234d`), confirmed no open animation deferrals or leftover worker worktrees/branches, and reused the recorded same-code startup baseline because the production tree remains exactly `971233d80` and only animation ledger docs changed afterward. Battle Scene ON oracle profile v5 answers. Level 50 remains **266/276 exact**, **0 partial / 0 staged**, and **10 unsupported**; the authoritative move queue is empty, so dispatch would be filler and no worker was launched. No production, evidence, coverage, boundary, barrier, or main-program file changed.
- **Verification:** Focused inventory/boundary ratchets pass **2 files / 9 tests**. On tested tree `e42659dcc`, fresh `npm test` passed **1,411 files / 11,451 tests** with **44 / 223 skipped** in **1,672.40s**. Fresh `npm run build`/typecheck passed **821 modules** with only the inherited chunk-size warning. Fresh `npm run animation:coverage`, `npm run animation:audit`, and `git diff --check` pass.
- **Next:** Resume only when an executable profile or newly ranked move populates the authoritative queue. The explicitly unfulfilled tracks remain Helping Hand (legal doubles staging unavailable) and Nightmare (contest-only arm outside legal battle execution); do not infer either boundary. **For the main program:** nothing blocking.
