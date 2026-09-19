# Animation maintenance — throughput and bookkeeping (2026-09-19)

- **State:** User requested a controlled stop, branch maintenance, and restart
  of the Hetzner animation campaign. Maintenance is complete; resume from this
  verified checkpoint. Base `8e7c8706e` already contains the independently
  reviewed Silver Wind fade worker `2eec5d465`; its recovery worktree is clean.
  Coverage remains **258/276 exact, 18 unsupported**.
- **Did:** Centralized global coverage totals; scoped move queue checks and
  evidence receipts to their own move. Added a mutation regression proving
  unrelated promotion/queue changes preserve source audit bytes while a real
  move-status regression still fails. Added `ANIMATION_VERIFICATION.md`, aligned
  supervisor/worker/campaign instructions, combined routine briefing phases,
  and archived older live-ledger entries intact.
- **Verification:** Hetzner full gates passed on code commit `cdb82a9bc`: **1,388
  files / 11,387 tests passed**, 44 files / 223 tests skipped; typecheck and
  **810-module build** passed with the service-equivalent 8 GiB heap and one
  Vitest worker. Runner dispatch/default-workspace checks, coverage, asset
  audit, Scene-ON oracle info, and diff checks passed. Durable logs are in
  `/var/lib/pokebench-autonomy/maintenance/20260919/`. Only ledger/archive docs
  follow that code commit, so reuse this green baseline unless master or the
  relevant environment changes. No production animation or pixel changed.
- **Runner:** The animation-only systemd drop-in selects this branch's
  `tools/autonomy/run-lane.sh` and `POKEBENCH_SUPERVISOR_WORKSPACE`; it loads the
  updated verification prompt. Keep the existing 5.5h cap, six-hour cadence,
  September 24 campaign end, and paused Rust lane.
- **Next:** Resume Silver Wind BUG/sparkle closure. The accepted fade/shadow
  bands are **69/69 scoped exact**, global **110/389 exact**, with **279 rows /
  2,828,934 residual pixels** left. All **389/389** component/seam/raw-RGB rows
  pass; preserve the altered live CHARIZARD/BLISSEY control. Promote only after
  complete bilateral **389/389 twice**, zero residual. Never repeat the recovery
  merge or closed source/evidence/reducer/fade work. Use the new verification
  contract and keep only three short checkpoints in this live ledger.

# Animation supervisor wind-down — Silver Wind fade worker preserved, not merged (2026-09-17 supervisor)

- **State:** `animation-main` stays on the previously verified **258/276 exact**, **0 partial / 0 staged**, **18 unsupported** checkpoint; `MOVE_SILVER_WIND` remains unsupported and all coverage/component/inventory credit is unchanged. Session baseline passed **1,387 files / 11,386 tests** and the **810-module** production build before dispatch.
- **Preserved result:** Recovered Terra/max worker commit **`2eec5d465`** is backed up at `origin/autonomy/20260913-through-20260918/workers/animation-20260917-123219`, but is deliberately **not merged**. It closes the requested opponent age-0 shadow plus bilateral fade/restore bands at **69/69 scoped rows / zero residual pixels**, improving the honest global checkpoint **41→110/389 exact** while preserving all **389/389** component/seam/raw-RGB rows and leaving **279 rows / 2,828,934 pixels** out of scope. Its full suite passed **1,387 files / 11,386 tests**.
- **Why stopped / next:** Vite hit its default **2 GB** heap after TypeScript passed and all **810 modules** transformed. The unattended memory-pressure rule stopped the immediate retry and ended dispatch. Next session should restore `2eec5d465` into one disposable animation worktree, run one fresh correctly inherited high-heap production build from a clean process group, independently review the three code/test files, then merge only if green. Afterward, continue Silver Wind with the independent BUG/sparkle body; never promote before bilateral **389/389 twice** at zero residual. **For the main program:** nothing blocking.

# MOVE_SILVER_WIND fade/shadow compositor checkpoint — recovered worker (2026-09-17)

- **State / scope:** Worker branch `worker/animation-20260917-123219` is a committed, intentionally **unmerged** checkpoint pending a fresh production build. Level 50 remains **258/276 exact**, **0 partial / 0 staged**, and **18 unsupported**; `MOVE_SILVER_WIND` remains coverage-, queue-, move-entry-, and component-track-credit absent, and `blend-battle-anim-palette-exclude` remains unfulfilled. No sibling/component/track, gameplay/controller/facility, boundary/barrier, or main-program document changed.
- **Proof:** The move-local opponent age-0 enemy-shadow `y−1` placement and bilateral fade/restore bands are **69/69 scoped rows exact with zero residual pixels**. The actual-core checkpoint remains honest globally at **110/389 exact**, with **279 out-of-scope rows / 2,828,934 residual pixels**. All **389/389** component, seam, and chronological raw-RGB rows remain exact; the material reversed CHARIZARD/BLISSEY control remains live. Focused tests pass **5 files / 11 tests** and the complete suite passes **1,387 files / 11,386 tests** with **44 files / 223 tests skipped**.
- **Build / next:** Typecheck passed, but Vite hit its default **2 GB** heap after transforming all **810 modules**; the unattended memory-pressure contract stopped the immediate high-heap retry. Next session must run one fresh `npm run build`/properly inherited high-heap build from a clean process group, review digest `e152eff2…`, then merge only if green. After merge, the next bounded Silver Wind work is the still-independent BUG/sparkle body; do not promote before bilateral **389/389 twice** at zero residual. **For the main program:** nothing blocking.
