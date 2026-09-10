# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R83 — [supervised session wind-down (final), 2026-09-10 03:01–~05:30 UTC, unattended] **M80 side-status family + session close (four green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus four verified
  Sonnet worker fast-forwards this session — `b3d9cb554` M77 critcalc,
  `0bdd9dccd` M78 adjust-damage family, `5bb8fab60` M79 fixed-damage cluster
  (supervisor-repair commit), `1fe7c7104` M80 side-status family — each
  followed by its ledger commit and a successful `backup-refs.sh` push.
  Tree clean, committed, green; no worker worktree or branch left behind.
  No ABI, adapter, recovery module, canonical TS, or npm file was touched
  all session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~19 min, foreground gates per the new brief rule) ported the five-opcode
  side-status family from `battleScriptSetSideStatusOpcode.ts` (0x7E
  setreflect / 0x92 setlightscreen / 0x99 setmist / 0xB8 setsafeguard /
  0xEE removelightscreenreflect): the shared bit-setter shape (fail-if-active
  → MISSED + chooser 0 only; success → bit + 5-turn timer + battlerId +
  single-message chooser), Mist's divergences (guard on the RAW mistTimers
  value not the bit — bit-set-timer-0 succeeds, pinned — FAILED not MISSED,
  its own choosers), removelightscreenreflect's opposing-side timer-guarded
  clear with animTurn/animTargetsHit on both branches, the
  registerSingleInstruction convention (exactly-1 + 0-operands, NO
  dispatcher check — third registration convention now pinned), and the
  documented C discrepancy (double-battle message variant unmodeled; TS is
  spec). **30 behavior + 6 registration** cases; corpus sha256
  `323e4c45348f7a5d3ea5122a227da640ae01171b8dd0d3ad92c35c790aac6208`
  (163,574 bytes). Worker self-corrected one brief citation (setsafeguard
  body ends `:8668`, not `:8669`) — verified correct.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted candidates (2026-09-10): bicbyte/orbyte/bicword byte-algebra
  opcodes (heavier catalog + multi-start registration — orbyte requires ALL
  11 concrete starts, `battleScriptStatbuffchangeOpcode.ts` /
  `battleScriptSetByte.ts` / `battleScriptDamagingWeatherOpcode.ts:444`);
  JUMPIFSTATUS/JUMPIFSTATUS2. With M77's rng projection precedent, the
  bigger rng-drawing hit-chain leaves (accuracycheck, tryKO) are also now
  unblocked. Re-scout with /tmp/rust-briefs/{ts,rs}-opcodes.txt. No
  deferral is open.
- **Notes:** supervisor audit covered the shared bit-setter (fail branch
  mutates flags+chooser only), Mist's timer-vs-bit guard, opposing-side
  algebra, and both registration error texts; independent regeneration was
  byte-identical. Generated Rust **411,700 bytes**, sha256
  `0cf9d94f7353bcfb15fa6f2e154c8b5d8517560769dcac131e4a4ad81e48c28d`;
  generator **26,080 bytes**, sha256
  `210ed992fe04ae2e86eaba7e2db89aec5450837db38327d73550dca595e3f15d`.
  Final gates on `rust-main`: **1,492/1,492** native (up from 1,425 at
  orient, +67 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,497 bytes**, sha256
  `43d3e2d670482bcb73ee60db4f524b6b14e64dcd64ef0bbfe64baa8125ac3082`.
  Session-wide: four Sonnet workers (~$18), three clean landings 19-29 min,
  one cap-expiry (M79: worker ran gates as a background task and ended its
  turn — end_turn kills pending work; briefs now mandate FOREGROUND gates;
  supervisor verified + committed the finished work as a direct repair).
  12 opcodes went native this session (crit trio member + 3 adjust + 4
  fixed-damage + 5 side-status = 79 opcode names ported of 215 TS names).
  No npm gate required; no deferral or barrier added. R80 archived.
  PAPERCUT: M79 end_turn-vs-background-gates, ~15 supervisor minutes.


## R82 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M79 fixed-damage cluster folded (third green fold; supervisor-repair commit)**

- **State:** `rust-main` = master + M77 `b3d9cb554` + M78 `0bdd9dccd` + M79
  `5bb8fab60`, each verified and checkpointed (ledger commit +
  `backup-refs.sh`). The fixed-damage cluster (0x9F dmgtolevel / 0xA0
  psywavedamageeffect / 0x94 damagetohalftargethp / 0xD8
  setdamagetohealthdifference) is native. No ABI, adapter, canonical TS, or
  npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, ~21 min) wrote
  the complete module but expired waiting on its own background `cargo
  test` and committed NOTHING (correct per contract). Supervisor verified
  the uncommitted work in the worker worktree — full audit of all four
  apply bodies against TS (`hitChainOpcode.ts:1749-1762/1766-1793/2094-2125`,
  `rankedBatch1Opcode.ts:205-217`), both registration conventions
  (hit-chain find-first vs rankedBatch1 exactly-1 + dispatcher + 0-operand),
  psywave's unbounded rejection loop (%16, accept <=10) under the M77/M78
  rng projection with ordered Vec<Draw>, healthdiff's taken-branch-only
  jump resolution — plus double regeneration (byte-identical, sha
  `e6d98b465e5546c8c0860c8c1a9fd36100f37bb5980e09df1575a3caef22290d`,
  466,885 B) and all four gates in the worktree, then committed it AS the
  worker branch commit `5bb8fab60` (supervisor-repair provenance recorded
  in the commit message). **23 behavior + 9 registration** cases; corpus
  sha256 `20f30d0f4b56a7f048a61544277c63388bf7f427818e127064dbdc7f528ffc2a`.
- **Next:** possibly one more small leaf this session if the clock allows;
  otherwise wind down. Unported candidates re-scouted 2026-09-10: the
  bicbyte/orbyte/bicword byte-algebra opcodes have heavier catalog-style
  registration (`battleScriptSetByte.ts` / `battleScriptStatbuffchangeOpcode.ts`
  / `battleScriptDamagingWeatherOpcode.ts:444` — orbyte requires ALL 11
  concrete starts); JUMPIFSTATUS/JUMPIFSTATUS2 similar. No deferral is open.
- **Notes:** worker cap-expiry root cause: it launched `cargo test` as its
  own background task and ended its turn awaiting it — same end_turn
  pitfall as the Aug-31 supervisor sessions, now seen worker-side.
  Follow-up for future briefs: tell workers to run gates in the foreground.
  Gates rerun on `rust-main` post-fold: **1,479/1,479** native (+11), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,508 bytes**,
  sha256 `ccf224e71f7adbde645dbbd30de26fc51500ba36d2b9955ee10f6d894a75cd45`.
  Generator **34,428 bytes**, sha256
  `4c3d7282d4b959f4f08fdf3660c6bd240494c0326121fbe50ea86ba683527ec3`.
  Worker: 21.3 min, $5.20. No npm gate required; no deferral or barrier
  added. R79 archived. PAPERCUT: worker end_turn-vs-background-gates cost
  ~15 supervisor minutes.


## R81 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M78 adjust-damage family folded (second green fold this session)**

- **State:** `rust-main` = master + M77 `b3d9cb554` + M78 `0bdd9dccd`
  (both verified Sonnet fast-forwards, each with ledger commit +
  `backup-refs.sh` push). The adjust-damage family (0x07 adjustnormaldamage /
  0x08 adjustnormaldamage2 / 0x69 adjustsetdamage) is native: shared core
  with per-opcode wiring (variance-draw presence, requireMoveRow gating).
  First multi-draw consumer of the M77 rng projection — 0/1/2 ordered draws
  cross as `Vec<Draw>`. No ABI, adapter, canonical TS, or npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~22 min) ported the family per `battle_script_commands.c:1658-1698`,
  `:1701-1741`, `:5861-5899` + `ApplyRandomDmgMultiplier` `:1639-1651`:
  target-role-only precedence, variance draw first (reasons
  "adjustnormaldamage"/"adjustnormaldamage2"), Focus Band holder ALWAYS
  draws ("<base>-focus-band"; roll%100 < param sets the bit + native
  `record_battle_script_item_effect_reveal`), pre-existing focus_banded bit
  honored, Substitute-gated survival clamp (hp<=damage → hp-1) with
  endured-over-banded flag priority (FOE_ENDURED 1<<6 / FOE_HUNG_ON 1<<7 +
  lastUsedItem), and the false-swipe divergence pinned three ways: 0x07
  clamps on EFFECT_FALSE_SWIPE (101) and errors on unknown move, 0x08 never
  calls requireMoveRow, 0x69 (no variance draw) calls it unconditionally.
  Composed `apply_random_damage_multiplier`, `resolve_battler_hold_effect`/
  `_param` (enigma param array forwarded through the critcalc-style shim),
  and the reveal helper — nothing duplicated. **34 behavior + 4
  registration** cases; corpus sha256
  `02413888d15f9578a2cc3cba2a8add8df97e1c1f9ecf149a5062cf3e32e545ec`.
- **Next:** M79 scouted — the fixed-damage cluster as one family leaf:
  `dmgtolevel` (0x9F, `:7926-7930`), `psywavedamageeffect` (0xA0,
  `:7932-7941`, unbounded rejection-sampling draw loop — Vec<Draw> precedent
  covers it), `damagetohalftargethp` (0x94, `:7577-7584`, lives in
  `battleScriptRankedBatch1Opcode.ts:205`), `setdamagetohealthdifference`
  (0xD8, `:9366-9377`, ptr operand + fail-jump, TS
  `hitChainOpcode.ts:2098-2125`). Ground truth doc:
  `docs/fixed-damage-cluster-ground-truth.md`. No deferral is open.
- **Notes:** supervisor audit covered the shared core against both TS bodies
  (draw order/chaining, holder-always-draws incl. pre-existing-bit, clamp
  predicate + flag priority, lastUsedItem pre-mutation read, substitute bit
  0x0100_0000, per-opcode requireMoveRow wiring) and a two-draw vector's
  chaining (before₂==after₁, calls 0→2); independent regeneration was
  byte-identical. Generated Rust **478,116 bytes**, sha256
  `078338789b21aaf507537ffe76d6fd12f529328ae12ee00ac67f93b9528816d9`;
  generator **37,037 bytes**, sha256
  `6bac564d27a4f08fc1ddebac5b31da4f926be80109e6361f9c104da1f3c4fc31`.
  Gates rerun on `rust-main` post-fold: **1,468/1,468** native (+20), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,496 bytes**, sha256
  `55eed0198510d362576397cd838b90e27917c8c740b6f1b711effcb3ebac2718`.
  Worker: 22.3 min, $4.48, zero rejections. No npm gate required; no
  deferral or barrier added. R78 archived. PAPERCUT: none new.
